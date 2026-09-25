from typing import List, Optional
from pydantic import BaseModel, Field


class CallTurn(BaseModel):
    id: str
    speaker: str  # "ai" or "prospect"
    text: str
    timestamp_offset_seconds: int
    sentiment: Optional[str] = "neutral"  # positive, neutral, skeptical, negative
    objection_detected: Optional[str] = None


class ObjectionBattlecard(BaseModel):
    category: str  # "budget", "timing", "competitor", "authority", "security_review"
    objection: str
    recommended_pivot: str
    proof_point: str


class CallInsights(BaseModel):
    summary: str
    sentiment_overall: str = "Neutral"
    engagement: str = "Not available"  # High, Medium, Low, Disengaged, Not available
    intent_level: str = "Not available"  # High Intent, Evaluating, Inquiring, Disinterested, Not available
    intent_score: Optional[int] = Field(default=None, ge=0, le=100)
    interest_level: str = "Not available"
    urgency: str = "Not available"
    need: Optional[str] = "Not available"
    product_service: Optional[str] = "Not available"
    scope_quantity: Optional[str] = "Not available"
    scope_users: Optional[str] = "Not available"
    timeline: Optional[str] = "Not available"
    budget: Optional[str] = "Not disclosed"
    deal_amount: Optional[str] = "Not available"
    authority: Optional[str] = "Not available"
    target_location: Optional[str] = None
    delivery_location: Optional[str] = None
    pain_points: List[str] = Field(default_factory=list)
    extracted_pain_points: List[str] = Field(default_factory=list)
    objections: List[str] = Field(default_factory=list)
    objections_handled: List[str] = Field(default_factory=list)
    customer_questions: List[str] = Field(default_factory=list)
    important_info: List[str] = Field(default_factory=list)
    next_best_action: str = "Not available"
    qualification_verdict: str = "Analysis Unavailable"  # Interested, Evaluating, Disqualified, Not_Interested, Analysis Unavailable


class CallSession(BaseModel):
    id: str
    lead_id: str
    company_name: str
    contact_name: str
    contact_title: str
    language: str = "English"
    status: str = "In_Progress"  # In_Progress, Completed, Failed, Scheduled
    stage: str = "greeting"  # greeting, need, scope, timeline, closing, completed
    duration_seconds: int = 0
    started_at: str
    turns: List[CallTurn] = Field(default_factory=list)
    insights: Optional[CallInsights] = None
    battlecards_used: List[ObjectionBattlecard] = Field(default_factory=list)


class StartCallRequest(BaseModel):
    lead_id: str
    voice_tone: Optional[str] = "Consultative & Empathetic"  # Assertive, Consultative, Direct, Friendly
    focus_offering_id: Optional[str] = None
    language: Optional[str] = "English"


class CallDialogueStepRequest(BaseModel):
    call_id: str
    prospect_response: str
    voice_tone: Optional[str] = "Consultative & Empathetic"
    language: Optional[str] = None
