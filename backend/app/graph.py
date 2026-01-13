from typing import Dict, Any, List, TypedDict, Optional, Literal
from langgraph.graph import StateGraph, END
from .models import ResumeSummary, Question, Evaluation, FinalReport, RoleEnum, DifficultyEnum
from .llm import llm_client
from .prompts.templates import (
    SUMMARIZE_SYSTEM_PROMPT, SUMMARIZE_USER_PROMPT,
    GENERATE_QUESTION_SYSTEM_PROMPT, GENERATE_QUESTION_USER_PROMPT,
    GENERATE_FOLLOWUP_SYSTEM_PROMPT, GENERATE_FOLLOWUP_USER_PROMPT,
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
    current_step: int # Legacy counter, synced to main questions
    
    # New Fields for Logic
    transcript: List[Dict] # {role: "interviewer"|"candidate", text: str}
    asked_main_questions: int
    followup_count_for_current: int
    max_followups_per_question: int
    pending_followup: Optional[Dict] # serialized Question
    
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
    # Init new fields if missing
    state.setdefault("transcript", [])
    state.setdefault("asked_main_questions", 0)
    state.setdefault("followup_count_for_current", 0)
    state.setdefault("max_followups_per_question", 1) # Cap at 1 follow-up per main question
    state.setdefault("question_history", [])
    state.setdefault("answer_history", [])
    state.setdefault("eval_history", [])
    return state

def node_generate_main_question(state: InterviewState) -> InterviewState:
    print("--- Node: Generate Main Question ---")
    
    # Prepare history for context
    transcript_text = ""
    for turn in state.get("transcript", [])[-6:]: # Last 3ish QA pairs
        transcript_text += f"{turn['role'].upper()}: {turn['text']}\n"
    
    summary_dict = state.get("resume_summary", {})
    idx = state.get("asked_main_questions", 0) + 1
    
    # Topic Logic
    current_topic = "General/Intro"
    if idx > 1: current_topic = "Technical Deep Dive"
    if idx > 3: current_topic = "System Design / Architecture"
    
    question = llm_client.generate_structured(
        system_prompt=GENERATE_QUESTION_SYSTEM_PROMPT.format(
            role=state["role"],
            difficulty=state["difficulty"],
            topic=current_topic
        ),
        user_prompt=GENERATE_QUESTION_USER_PROMPT.format(
            resume_summary=str(summary_dict),
            transcript_history=transcript_text,
            question_index=idx
        ),
        response_model=Question
    )
    
    question.id = f"q_{idx}"
    question.kind = "main"
    
    state["current_question"] = question.model_dump()
    state["asked_main_questions"] = idx
    state["followup_count_for_current"] = 0 # Reset for new main question
    state["current_step"] = idx # Sync legacy
    
    # Add to transcript
    tr = state.get("transcript", [])
    tr.append({"role": "interviewer", "text": question.text})
    state["transcript"] = tr
    
    return state

def node_generate_followup(state: InterviewState) -> InterviewState:
    print("--- Node: Generate Follow-up ---")
    
    # Context
    last_q = state.get("current_question")
    last_ans = state.get("answer_history", [])[-1]
    last_eval = state.get("eval_history", [])[-1]
    
    question = llm_client.generate_structured(
        system_prompt=GENERATE_FOLLOWUP_SYSTEM_PROMPT,
        user_prompt=GENERATE_FOLLOWUP_USER_PROMPT.format(
            original_question=last_q['text'],
            last_answer=last_ans['text'],
            feedback=last_eval['feedback_text'],
            missing_points=str(last_eval.get('missing_points', []))
        ),
        response_model=Question
    )
    
    # ID logic: q_1_f1
    # ensure we don't nest IDs too deep q_1_f1_f1 if we allowed multiple chains
    parent_id = last_q['id'].split('_f')[0] 
    f_idx = state.get("followup_count_for_current", 0) + 1
    question.id = f"{parent_id}_f{f_idx}"
    question.kind = "followup"
    question.topic = last_q['topic']
    
    state["current_question"] = question.model_dump()
    state["followup_count_for_current"] = f_idx
    
    # Add to transcript
    tr = state.get("transcript", [])
    tr.append({"role": "interviewer", "text": question.text})
    state["transcript"] = tr
    
    return state

def node_evaluate_answer(state: InterviewState) -> InterviewState:
    print("--- Node: Evaluate Answer ---")
    cur_q = state.get("current_question")
    # The answer should have been injected into state['answer_history'] mostly recently 
    last_answer = state["answer_history"][-1]
    
    # Add candidate answer to transcript if not already last item
    transcript = state.get("transcript", [])
    if not transcript or transcript[-1]['role'] != "candidate":
         transcript.append({"role": "candidate", "text": last_answer['text']})
         state["transcript"] = transcript
    else:
         # Update text if it was placeholder? (Unlikely)
         pass

    evaluation = llm_client.generate_structured(
        system_prompt=EVALUATE_ANSWER_SYSTEM_PROMPT,
        user_prompt=EVALUATE_ANSWER_USER_PROMPT.format(
            question=cur_q["text"],
            expected_points=str(cur_q["expected_points"]),
            answer=last_answer["text"]
        ),
        response_model=Evaluation
    )
    
    # Store
    evaluation.question_id = cur_q["id"]
    state.setdefault("eval_history", []).append(evaluation.model_dump())
    
    return state

def node_generate_report_json(state: InterviewState) -> InterviewState:
    print("--- Node: Generate Report ---")
    
    # Re-build complete history from transcript for the report
    history_text = "\n".join([f"{t['role'].upper()}: {t['text']}" for t in state.get("transcript", [])])
    
    report = llm_client.generate_structured(
        system_prompt=REPORT_SYSTEM_PROMPT,
        user_prompt=REPORT_USER_PROMPT.format(
            role=state["role"],
            difficulty=state["difficulty"],
            history_summary=history_text
        ),
        response_model=FinalReport
    )
    
    state["final_report"] = report.model_dump()
    state["is_finished"] = True
    return state

# --- Router ---

def decide_next_step(state: InterviewState) -> Literal["generate_followup", "generate_main_question", "generate_report"]:
    
    # 1. Check if finished flag
    if state.get("is_finished"):
        return "generate_report"
        
    # 2. Check last evaluation for follow-up
    evals = state.get("eval_history", [])
    if evals:
        last_eval = evals[-1]
        
        # Check if we should followup
        if last_eval.get("followup_needed") and \
           state.get("followup_count_for_current", 0) < state.get("max_followups_per_question", 1):
               return "generate_followup"
    
    # 3. Check if we reached total MAIN questions
    if state.get("asked_main_questions", 0) >= state.get("total_questions", 5):
        return "generate_report"
        
    return "generate_main_question"

# --- Entry Router ---
def node_router_start(state: InterviewState) -> Literal["summarize_resume", "generate_report", "evaluate_answer", "generate_main_question", "generate_followup"]:
    print("--- Node: Router Start ---")
    
    # 1. New Session?
    if not state.get("resume_summary"):
        return "summarize_resume"
        
    # 2. Finished?
    if state.get("is_finished"):
        # If report already exists, we are done-done. 
        # But if is_finished=True and report is None, we generate.
        if state.get("final_report"):
            return END
        return "generate_report"
        
    # 3. Pending Answer? 
    # If we have more answers than evaluations, we need to evaluate.
    # (Assuming the API added the answer just before invoking)
    ans_len = len(state.get("answer_history", []))
    eval_len = len(state.get("eval_history", []))
    if ans_len > eval_len:
        return "evaluate_answer"
        
    # 4. Otherwise, standard flow check (router)
    # Check if we have a pending question that needs answering -> END (wait for input)
    # Actually if we are here, and have equal Q/A/Eva, we need next Q.
    # UNLESS we are waiting for input.
    # How do we know if we are waiting? 
    # If we just generated a question, answer_history count == eval_count == question_count - 1 
    # (assuming we added to history? No, main logic adds to valid transcript/history upon generation?)
    
    # Let's rely on decide_next_step logic mostly, but we need to know if we are "in between" turns
    return decide_next_step(state)

# --- Graph Construction ---

workflow = StateGraph(InterviewState)

# Add nodes
workflow.add_node("router_start", node_router_start) # Virtual node acting as router? 
# LangGraph nodes must return state updates OR we use conditional_entry_point.
# Let's use set_conditional_entry_point instead of a node if possible.
# Actually, LangGraph supports conditional entry points directly.

workflow.add_node("summarize_resume", node_summarize_resume)
workflow.add_node("generate_main_question", node_generate_main_question)
workflow.add_node("generate_followup", node_generate_followup)
workflow.add_node("evaluate_answer", node_evaluate_answer)
workflow.add_node("generate_report", node_generate_report_json)

# Entry point logic
workflow.set_conditional_entry_point(
    node_router_start,
    {
        "summarize_resume": "summarize_resume",
        "generate_report": "generate_report",
        "evaluate_answer": "evaluate_answer",
        "generate_main_question": "generate_main_question",
        "generate_followup": "generate_followup",
        END: END
    }
)

# Edges
workflow.add_edge("summarize_resume", "generate_main_question")

# Conditional Routing after Evaluate
workflow.add_conditional_edges(
    "evaluate_answer",
    decide_next_step,
    {
        "generate_followup": "generate_followup",
        "generate_main_question": "generate_main_question",
        "generate_report": "generate_report"
    }
)

# New questions go to END (to wait for user input)
workflow.add_edge("generate_main_question", END)
workflow.add_edge("generate_followup", END)

# Report goes to END
workflow.add_edge("generate_report", END)

app = workflow.compile()
