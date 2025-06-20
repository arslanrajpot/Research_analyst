from sqlalchemy import create_engine, Column, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL
import uuid

Base = declarative_base()

class ResearchSession(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query = Column(Text)
    report = Column(Text)
    chat_history = Column(Text)

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)

def save_state(state: dict):
    with SessionLocal() as session:
        session_state = ResearchSession(
            id=state.get("session_id", str(uuid.uuid4())),
            query=state["query"],
            report=state.get("report", ""),
            chat_history=str(state["chat_history"])
        )
        session.add(session_state)
        session.commit()
        return session_state.id

def get_state(session_id: str):
    with SessionLocal() as session:
        return session.query(ResearchSession).filter_by(id=session_id).first()