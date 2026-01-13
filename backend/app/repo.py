from sqlalchemy.orm import Session as DbSession
from .models import Session, SessionStateResponse
import json
from typing import Dict, Any, Optional

class SessionRepo:
    def __init__(self, db: DbSession):
        self.db = db

    def create_session(self, role: str, difficulty: str, state: Dict[str, Any]) -> Session:
        db_session = Session(
            role=role, 
            difficulty=difficulty, 
            state_json=state,
            state_version=1
        )
        self.db.add(db_session)
        self.db.commit()
        self.db.refresh(db_session)
        return db_session

    def get_session(self, session_id: str) -> Optional[Session]:
        return self.db.query(Session).filter(Session.id == session_id).first()

    def update_session_state(self, session_id: str, new_state: Dict[str, Any]):
        session = self.get_session(session_id)
        if session:
            session.state_json = new_state
            session.state_version += 1
            self.db.commit()
            self.db.refresh(session)
        return session
    
    def end_session(self, session_id: str):
        session = self.get_session(session_id)
        if session:
            session.is_active = False
            self.db.commit()
