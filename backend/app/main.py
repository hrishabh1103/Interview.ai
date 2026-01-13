from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Annotated
from sqlalchemy.orm import Session as DbSession

from .models import (
    Base, SessionStateResponse, AnswerRequest, ReportResponse, 
    RoleEnum, DifficultyEnum, Evaluation
)
from .database import engine, get_db
from .repo import SessionRepo
from .services.resume import parse_resume_pdf
from .services.report import generate_report_pdf
from .services.voice import check_voice_availability, transcribe_audio, synthesize_speech, get_available_voices
from .graph import app as graph_app
from .models import FinalReport, SpeakRequest
from pydantic import BaseModel


# Create DB Tables (Auto-migration for MVP)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Interviewer.AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper ---
def get_repo(db: DbSession = Depends(get_db)):
    return SessionRepo(db)

def run_graph_and_update(session_id: str, current_state: dict, repo: SessionRepo):
    """
    Runs the graph logic on current_state until it pauses (at user input or completion).
    Updates DB with new state.
    """
    # LangGraph 'invoke' runs until it hits an interrupt or END.
    # Our graph is designed to do one "turn" or "block" generally.
    # We pass the state dict.
    
    new_state = graph_app.invoke(current_state)
    
    # Save to DB
    repo.update_session_state(session_id, new_state)
    return new_state

def map_state_to_response(session_id: str, state: dict) -> SessionStateResponse:
    # Construct progress string
    curr = state.get("asked_main_questions", 1) # usage of new counter
    total = state.get("total_questions", 5)
    progress = f"{min(curr, total)}/{total}"
    
    # Construct messages list for UI from Transcript
    messages = []
    
    # Use new transcript if available, otherwise fallback to legacy history
    if "transcript" in state and state["transcript"]:
        for turn in state["transcript"]:
            messages.append({"role": turn["role"], "content": turn["text"]})
    else:
        # Fallback for old sessions or if transcript missing
        q_hist = state.get("question_history", [])
        a_hist = state.get("answer_history", [])
        max_len = max(len(q_hist), len(a_hist))
        for i in range(max_len):
            if i < len(q_hist):
                messages.append({"role": "interviewer", "content": q_hist[i]['text']})
            if i < len(a_hist):
                messages.append({"role": "candidate", "content": a_hist[i]['text']})
        # Add current Q if not in history
        curr_q = state.get("current_question")
        if curr_q:
             messages.append({"role": "interviewer", "content": curr_q['text']})

    # Most recent evaluation
    last_eval = None
    e_hist = state.get("eval_history", [])
    if e_hist:
        last_eval = Evaluation(**e_hist[-1])
        
    curr_q_obj = state.get("current_question")
    # Identify if followup
    is_f = False
    if curr_q_obj and curr_q_obj.get("kind") == "followup":
        is_f = True

    return SessionStateResponse(
        session_id=session_id,
        current_question=curr_q_obj,
        is_followup=is_f,
        progress=progress,
        messages=messages,
        scores=last_eval,
        interview_complete=state.get("is_finished", False),
        report_available=bool(state.get("final_report"))
    )

# --- Endpoints ---

@app.get("/voice/status")
async def get_voice_status():
    """
    Returns whether the backend has voice capabilities configured.
    """
    return {"enabled": check_voice_availability()}

@app.post("/speech/transcribe")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Deprecated. STT is now client-side.
    """
    raise HTTPException(status_code=400, detail="Client-side STT required.")

@app.get("/voice/options")
async def get_voice_options():
    """Returns list of supported voices."""
    return get_available_voices()

@app.post("/speech/speak")
async def text_to_speech_endpoint(request: SpeakRequest): 
    # Use robust SpeakRequest
    if not check_voice_availability():
        raise HTTPException(status_code=503, detail="Voice mode disabled")
        
    try:
        audio_bytes = await synthesize_speech(
            text=request.text,
            voice_name=request.voice,
            rate=request.rate,
            pitch=request.pitch
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
         print(f"TTS Error: {e}")
         raise HTTPException(status_code=500, detail=str(e))

@app.post("/session/start", response_model=SessionStateResponse)
async def start_session(
    role: RoleEnum = Form(...),
    difficulty: DifficultyEnum = Form(...),
    num_questions: int = Form(5),
    voice_enabled: bool = Form(False),
    resume: UploadFile = File(...),
    repo: SessionRepo = Depends(get_repo)
):
    # 1. Parse Resume
    content = await resume.read()
    resume_text = parse_resume_pdf(content)
    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not parse PDF")

    # 2. Init State
    initial_state = {
        "resume_text": resume_text,
        "resume_summary": None,
        "role": role.value,
        "difficulty": difficulty.value,
        "total_questions": num_questions,
        "question_history": [],
        "answer_history": [],
        "eval_history": [],
        "current_question": None,
        "current_step": 1,
        "final_report": None,
        "is_finished": False
    }

    # 3. Create Session DB
    session = repo.create_session(role.value, difficulty.value, initial_state)

    # 4. Run Graph (Summarize -> First Q)
    final_state = run_graph_and_update(session.id, initial_state, repo)
    
    return map_state_to_response(session.id, final_state)

@app.post("/session/{session_id}/answer", response_model=SessionStateResponse)
async def answer_question(
    session_id: str, 
    request: AnswerRequest,
    repo: SessionRepo = Depends(get_repo)
):
    session = repo.get_session(session_id)
    if not session or not session.is_active:
        raise HTTPException(status_code=404, detail="Session not found or finished")

    state = session.state_json
    
    # 1. Inject Answer
    # We must ensure there is a current question pending
    if not state.get("current_question"):
        raise HTTPException(status_code=400, detail="No pending question to answer")
        
    ans_entry = {
        "question_id": state["current_question"]["id"],
        "text": request.text
    }
    state["answer_history"].append(ans_entry)
    
    # 2. Run Graph (Evaluate -> [Next Q OR Report])
    # The graph router should see we have an answer > evaluation count and trigger evaluation
    final_state = run_graph_and_update(session_id, state, repo)
    
    return map_state_to_response(session_id, final_state)

@app.post("/session/{session_id}/end")
async def end_session(session_id: str, repo: SessionRepo = Depends(get_repo)):
    session = repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # 1. Mark as finished in state
    state = session.state_json
    state["is_finished"] = True
    
    # 2. Run Graph (this will trigger generate_report via the router logic we just added)
    # We update the state first so the router sees is_finished=True
    repo.update_session_state(session_id, state)
    run_graph_and_update(session_id, state, repo)

    # 3. Mark DB session as inactive
    repo.end_session(session_id)
    return {"status": "ended"}

@app.get("/session/{session_id}/state", response_model=SessionStateResponse)
async def get_state(session_id: str, repo: SessionRepo = Depends(get_repo)):
    session = repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return map_state_to_response(session.id, session.state_json)

@app.get("/session/{session_id}/report", response_model=ReportResponse)
async def get_report_json(session_id: str, repo: SessionRepo = Depends(get_repo)):
    session = repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    state = session.state_json
    if not state.get("final_report"):
         # Optionally trigger generation if missing?
         # For now assume it's generated at end of flow
         raise HTTPException(status_code=400, detail="Report not ready yet")
         
    return ReportResponse(report=state["final_report"])

@app.get("/session/{session_id}/report.pdf")
async def get_report_pdf(session_id: str, repo: SessionRepo = Depends(get_repo)):
    session = repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    state = session.state_json
    if not state.get("final_report"):
        raise HTTPException(status_code=400, detail="Report not ready yet")
        
    report_data = FinalReport(**state["final_report"])
    
    # Use new reportlab service which returns path
    try:
        pdf_path = generate_report_pdf(report_data, session_id, state.get("messages", []))
        
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
            
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        print(f"PDF Gen Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")
