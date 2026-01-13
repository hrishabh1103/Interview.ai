from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, UUID4, ConfigDict
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator
import json
import uuid
from datetime import datetime
from .database import Base

# --- SQLAlchemy Models ---

class JSONType(TypeDecorator):
    """
    SQLite-compatible JSON type.
    Stores as TEXT in SQLite, assumes native JSON in Postgres (if we used pg dialect specifically, 
    but here we use generic Types for maximum portablity or conditional).
    For MVP simplicity with one codebase, we will just use Text and serialize/deserialize manually 
    in the repo layer or use a TypeDecorator if we want transparency.
    Let's use a simple TypeDecorator for transparency.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(value)

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    role = Column(String)
    difficulty = Column(String)
    # The entire LangGraph state is stored here
    state_json = Column(JSONType, nullable=True) 
    state_version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)


# --- Pydantic Models (Domain/API) ---

class RoleEnum(str, Enum):
    SDE1 = "SDE1"
    PRODUCT_MANAGER = "Product Manager"
    MARKETING_MANAGER = "Marketing Manager"

class DifficultyEnum(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class ResumeSummary(BaseModel):
    skills: List[str] = []
    projects: List[str] = []
    achievements: List[str] = []
    keywords: List[str] = []
    raw_text_snippet: Optional[str] = None # safety: only keep snippet or filtered text if needed

class Question(BaseModel):
    id: str
    text: str
    topic: str
    expected_points: List[str]
    difficulty: DifficultyEnum
    time_limit_sec: int = 60

class Answer(BaseModel):
    question_id: str
    text: Optional[str] = None
    audio_url: Optional[str] = None # for later

class Evaluation(BaseModel):
    question_id: str
    correctness_score: int = Field(..., ge=0, le=10)
    depth_score: int = Field(..., ge=0, le=10)
    structure_score: int = Field(..., ge=0, le=10)
    communication_score: int = Field(..., ge=0, le=10)
    missing_points: List[str] = []
    feedback_text: str
    followup_needed: bool = False
    followup_question: Optional[str] = None

class FinalReport(BaseModel):
    overall_score: int
    category_scores: Dict[str, int]
    strengths: List[str]
    weaknesses: List[str]
    improvement_plan_7_days: List[str]
    improved_answers: List[Dict[str, str]] # question_id -> better answer

# --- Request/Response Schemas ---

class StartSessionRequest(BaseModel):
    role: RoleEnum
    difficulty: DifficultyEnum
    num_questions: int = 5
    voice_enabled: bool = False
    # resume file is uploaded via multipart form, not json body usually, 
    # but we will likely handle it in a unified endpoint or separate.
    # We'll use a specific endpoint that takes Form data + File.

class AnswerRequest(BaseModel):
    text: str

class SessionStateResponse(BaseModel):
    session_id: str
    current_question: Optional[Question]
    progress: str # "2/5"
    messages: List[Dict[str, Any]] # simplified for chat UI
    scores: Optional[Evaluation] # most recent evaluation

class ReportResponse(BaseModel):
    report: FinalReport
