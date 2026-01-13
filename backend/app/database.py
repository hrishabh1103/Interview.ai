from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# robust default to sqlite if no URL provided
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./interviewer.db")

# Basic check: if it looks like a postgres URL but we want to use sqlite for local driver issues, 
# sometimes users change their mind. But here we trust the env var.
# If using sqlite, check for thread check requirement
connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
