from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, END
from .models import ResumeSummary, Question, Evaluation, FinalReport, RoleEnum, DifficultyEnum
from .llm import llm_client
from .prompts.templates import (
    SUMMARIZE_SYSTEM_PROMPT, SUMMARIZE_USER_PROMPT,
    GENERATE_QUESTION_SYSTEM_PROMPT, GENERATE_QUESTION_USER_PROMPT,
    EVALUATE_ANSWER_SYSTEM_PROMPT, EVALUATE_ANSWER_USER_PROMPT,
    REPORT_SYSTEM_PROMPT, REPORT_USER_PROMPT
)

# Define the State TypedDict for LangGraph
class InterviewState(TypedDict):
    resume_text: str
    resume_summary: Optional[Dict] # serialized ResumeSummary
    role: str
    difficulty: str
    total_questions: int
    
    question_history: List[Dict] # serialized Question
    answer_history: List[Dict] # serialized Answer (includes question_id)
    eval_history: List[Dict] # serialized Evaluation
    
    current_question: Optional[Dict] # serialized Question
    current_step: int # question counter
    
    final_report: Optional[Dict] # serialized FinalReport
    
    # Flags
    is_finished: bool

# --- Nodes ---

def node_summarize_resume(state: InterviewState) -> InterviewState:
    print("--- Node: Summarize Resume ---")
    text = state.get("resume_text", "")
    
    summary = llm_client.generate_structured(
        system_prompt=SUMMARIZE_SYSTEM_PROMPT,
        user_prompt=SUMMARIZE_USER_PROMPT.format(resume_text=text),
        response_model=ResumeSummary
    )
    
    state["resume_summary"] = summary.model_dump()
    return state

def node_generate_question(state: InterviewState) -> InterviewState:
    print("--- Node: Generate Question ---")
    idx = state.get("current_step", 1)
    
    # Determine topic based on index/random/logic
    # For MVP: simple round robin or random logic implied in prompt
    current_topic = "General/Projects"
    if idx > 1:
        current_topic = "Technical Deep Dive"
    
    q_hist = [q['text'] for q in state.get("question_history", [])]
    summary_dict = state.get("resume_summary", {})
    
    # Generate
    question = llm_client.generate_structured(
        system_prompt=GENERATE_QUESTION_SYSTEM_PROMPT.format(
            role=state["role"],
            difficulty=state["difficulty"],
            topic=current_topic
        ),
        user_prompt=GENERATE_QUESTION_USER_PROMPT.format(
            resume_summary=str(summary_dict),
            question_history=str(q_hist),
            question_index=idx
        ),
        response_model=Question
    )
    
    # Force ID consistency or logic
    question.id = f"q_{idx}"
    
    state["current_question"] = question.model_dump()
    # We don't append to history yet; we wait until answered or we can append now.
    # Usually we append now to show "asked".
    
    # If we append now, we must be careful not to duplicate if we cycle back.
    # But usually we move to WAIT_FOR_INPUT state after this.
    
    return state

def node_evaluate_answer(state: InterviewState) -> InterviewState:
    print("--- Node: Evaluate Answer ---")
    cur_q = state.get("current_question")
    # The answer should have been injected into state['answer_history'] mostly recently 
    # OR passed in via some transient input.
    # LangGraph state persists, so we assume the API handler appended the user's answer to answer_history 
    # BEFORE invoking the graph runner for this step.
    
    last_answer = state["answer_history"][-1]
    
    evaluation = llm_client.generate_structured(
        system_prompt=EVALUATE_ANSWER_SYSTEM_PROMPT,
        user_prompt=EVALUATE_ANSWER_USER_PROMPT.format(
            question=cur_q["text"],
            expected_points=str(cur_q["expected_points"]),
            answer=last_answer.get("text", "[Audio Answer]")
        ),
        response_model=Evaluation
    )
    
    # Link IDs
    evaluation.question_id = cur_q["id"]
    
    # Update History
    evals = state.get("eval_history", [])
    evals.append(evaluation.model_dump())
    state["eval_history"] = evals
    
    # Update question history now that it's done? 
    # Actually we should add question to history when it's generated? 
    # Let's say question_history tracks *completed* questions? 
    # Or we track all generated questions.
    # Let's append current question to history now that it's evaluated.
    q_hist = state.get("question_history", [])
    q_hist.append(cur_q)
    state["question_history"] = q_hist
    
    state["current_question"] = None # Reset for next
    state["current_step"] += 1
    
    return state

def node_generate_report_json(state: InterviewState) -> InterviewState:
    print("--- Node: Generate Report ---")
    
    # Summarize history for context
    history_summary = ""
    qs = state.get("question_history", [])
    ans = state.get("answer_history", [])
    evals = state.get("eval_history", [])
    
    for i in range(len(qs)):
        q = qs[i] if i < len(qs) else {}
        a = ans[i] if i < len(ans) else {}
        e = evals[i] if i < len(evals) else {}
        history_summary += f"Q{i+1}: {q.get('text')}\nA: {a.get('text')}\nScore: {e.get('correctness_score')}/10\n\n"
        
    report = llm_client.generate_structured(
        system_prompt=REPORT_SYSTEM_PROMPT,
        user_prompt=REPORT_USER_PROMPT.format(
            role=state["role"],
            difficulty=state["difficulty"],
            history_summary=history_summary
        ),
        response_model=FinalReport
    )
    
    state["final_report"] = report.model_dump()
    state["is_finished"] = True
    return state

# --- Conditional Edges ---

def decide_next_step(state: InterviewState) -> str:
    # If we just summarized resume -> generate first question
    if not state.get("question_history") and not state.get("current_question"):
        return "generate_question"
    
    # If we just evaluated
    if state["current_question"] is None:
        # Check limits
        if state["current_step"] > state["total_questions"]:
            return "generate_report"
        else:
            return "generate_question"
            
    return END

# --- Graph Construction ---

workflow = StateGraph(InterviewState)

workflow.add_node("summarize_resume", node_summarize_resume)
workflow.add_node("generate_question", node_generate_question)
workflow.add_node("evaluate_answer", node_evaluate_answer)
workflow.add_node("generate_report", node_generate_report_json)

# We need to define entry point.
# Actually, the graph is stateful. We might start different nodes based on where we are.
# But LangGraph usually runs from start or resumes.
# For API usage, we will likely call `app.invoke(current_state)` and let it figure out next node?
# Or more precisely, we define the flow:

# Flow 1: Start Session
# START -> summarize_resume -> generate_question -> END (Wait for user)

# Flow 2: User Answers
# (User Input injected) -> evaluate_answer -> CHECK (More Qs?) -> generate_question -> END
#                                            (No) -> generate_report -> END

# We can wire this as:


# Let's redesign edges using conditional logic or compiled graph reuse.
# Ideally:
# 1. summarize -> generate_q -> END
# 2. (resume with answer) -> evaluate -> condition -> [generate_q, generate_report]

# We will handle the "resume with answer" by manually setting the entry point when invoking in api?
# LangGraph allows `app.invoke(input, config={"configurable": {"start_node": ...}})` potentially, 
# or we just rely on state.
# But simpler: The graph defines the *whole* logic, but we can execute it step by step.
# Or separate graphs?
# Let's use a single graph but careful with edges.

# If we use `compile()`, we get a Runnable.
# If we run it, it goes until it hits END or an interrupt.
# We want to interrupt after `generate_question` to wait for user.

workflow.add_edge("generate_report", END)

# Conditional from evaluate
def after_evaluation(state: InterviewState):
    if state["current_step"] > state["total_questions"]:
        return "generate_report"
    return "generate_question"

workflow.add_conditional_edges(
    "evaluate_answer",
    after_evaluation,
    {
        "generate_question": "generate_question",
        "generate_report": "generate_report"
    }
)

# How to stop after generate_question?
# We can make generate_question a node that ends.
# But if summarize -> generate -> then we want to stop.
# If evaluate -> generate -> then we want to stop.
# So `generate_question` should point to END?
# Yes. The user will trigger the next run by calling "answer". 
# The "answer" endpoint will inject the answer invoke "evaluate_answer".

workflow.add_edge("summarize_resume", "generate_question")
workflow.add_edge("generate_question", END)

# Entry points:
# We might need to handle the "re-entry" for evaluation specially.
# Standard LangGraph starts at entry_point.
# If we want to start at "evaluate_answer", we can't easily jump middle unless we use checkpoints/interrupts.
# MVP Simpler Approach: 
# We don't use the graph for *everything* in one mega-run. 
# We use helper functions for nodes and orchestrate in the API? 
# OR we define a graph that decides what to do based on state flags.
#
# Let's try the "Router" pattern at start.
def router(state: InterviewState):
    # If we have an answer that needs evaluation (and no current score for it)
    if state.get("answer_history") and len(state["answer_history"]) > len(state.get("eval_history", [])):
        print("Routing to: evaluate_answer")
        return "evaluate_answer"
    
    # If we have no summary
    if not state.get("resume_summary"):
        print("Routing to: summarize_resume")
        return "summarize_resume"

    # If we have summary but no current question (and not finished)
    if not state.get("current_question") and not state.get("is_finished"):
         # Check if we should actually be finished?
         if state["current_step"] > state["total_questions"]:
             return "generate_report"
         return "generate_question"
    
    # If explicitly finished (e.g. via /end endpoint) but no report yet
    if state.get("is_finished") and not state.get("final_report"):
        print("Routing to: generate_report (Explicit End)")
        return "generate_report"
         
    return END

# This is a "State Machine" where we just call `app.invoke(state)` and it does ONE transition block.
# Since LangGraph enforces a graph structure, let's use a "router_node" as entry.

workflow.add_node("router_node", lambda x: x) # Passthrough
workflow.set_entry_point("router_node")

workflow.add_conditional_edges(
    "router_node",
    router,
    {
        "summarize_resume": "summarize_resume",
        "evaluate_answer": "evaluate_answer",
        "generate_question": "generate_question",
        "generate_report": "generate_report",
        END: END
    }
)

app = workflow.compile()
