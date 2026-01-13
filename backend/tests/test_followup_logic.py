import pytest
from unittest.mock import MagicMock, patch
from app.graph import workflow, InterviewState
from app.models import Evaluation, Question, DifficultyEnum

# Mock LLM Client
@pytest.fixture
def mock_llm():
    with patch("app.graph.llm_client") as mock:
        yield mock

def test_followup_trigger_logic(mock_llm):
    # Setup initial state
    state = InterviewState(
        current_question={"id": "q_1", "text": "What is REST?", "expected_points": [], "topic": "API", "kind": "main"},
        answer_history=[{"question_id": "q_1", "text": "It is an API style."}],
        eval_history=[],
        question_history=[], # Legacy
        transcript=[{"role": "interviewer", "text": "What is REST?"}],
        asked_main_questions=1,
        followup_count_for_current=0,
        max_followups_per_question=1,
        total_questions=5,
        is_finished=False,
        resume_text="", resume_summary={}, role="SDE1", difficulty="Easy",
        final_report=None
    )

    # Mock Evaluation response to trigger followup
    mock_eval = Evaluation(
        question_id="q_1",
        correctness_score=4, 
        depth_score=3,
        structure_score=5,
        communication_score=5,
        missing_points=["Constraints", "Methods"],
        feedback_text="Too brief.",
        followup_needed=True,
        followup_reason="Missing core concepts"
    )
    
    # Mock Follow-up Question generation
    mock_followup_q = Question(
        id="q_1_f1",
        text="Can you explain the constraints?",
        topic="API",
        expected_points=[],
        difficulty=DifficultyEnum.EASY,
        kind="followup"
    )

    # Configure mock side effects for sequential calls
    # Since we manually added eval to state, the NEXT call to generate_structured 
    # will come from generate_followup node.
    mock_llm.generate_structured.side_effect = [mock_followup_q]

    # Run Graph from 'evaluate_answer'
    app = workflow.compile()
    
    # Run 1: Evaluate Answer
    # We invoke expecting the router to send us to 'generate_followup' node
    # Note: LangGraph invoke runs strictly?
    # We can test the router function 'decide_next_step' directly for unit testing logic
    
    from app.graph import decide_next_step
    
    # 1. Simulate Evaluate Node Output
    state["eval_history"].append(mock_eval.model_dump())
    
    # 2. Test Router
    next_node = decide_next_step(state)
    assert next_node == "generate_followup", "Should route to generate_followup when needed and count < max"

    # 3. Test Generate Followup Node
    from app.graph import node_generate_followup
    state = node_generate_followup(state)
    
    assert state["current_question"]["kind"] == "followup"
    assert state["current_question"]["id"] == "q_1_f1"
    assert state["followup_count_for_current"] == 1
    assert state["asked_main_questions"] == 1 # Should NOT increment
    
    # 4. Test Router again (Max reached)
    # If we evaluate this followup and it's still bad, we shouldn't followup again (max=1)
    state["eval_history"].append(mock_eval.model_dump()) # Append another bad eval
    next_node_2 = decide_next_step(state)
    assert next_node_2 == "generate_main_question", "Should move to next main question if max followups reached"
