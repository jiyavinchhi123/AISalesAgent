import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from app.core.database import Base


class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    lead_id = Column(String(36), nullable=True)
    lead_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=False)
    language = Column(String(50), default="English")
    duration_seconds = Column(Integer, default=0)
    status = Column(String(50), default="Completed")
    turns = Column(JSON, default=list)
    summary = Column(Text, nullable=True)
    qualification_verdict = Column(String(100), default="Qualified")
    qualification_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
