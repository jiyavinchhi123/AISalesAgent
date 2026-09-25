import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=True)
    industry = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    employee_count = Column(String(100), nullable=True)
    revenue_estimate = Column(String(100), nullable=True)
    requirement_title = Column(String(500), nullable=False)
    requirement_description = Column(Text, nullable=True)
    source_platform = Column(String(255), nullable=True)
    source_url = Column(String(1000), nullable=True)
    intent_level = Column(String(50), default="High")
    match_score = Column(Integer, default=90)
    matched_offering = Column(String(255), nullable=True)
    status = Column(String(50), default="New")  # New, Contacted, Interested, Opportunity, Closed
    notes = Column(Text, nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    preferred_language = Column(String(50), default="English")
    created_at = Column(DateTime, default=datetime.utcnow)
