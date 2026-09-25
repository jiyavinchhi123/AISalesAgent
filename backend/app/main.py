"""
AI Sales Agent — Signal to Opportunity
FastAPI Backend Application Entry Point
"""

from typing import Optional, List
from fastapi import FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.core.security import get_optional_current_user
from app.models.user import User
import app.models  # Register all models with SQLAlchemy Base
from app.api.v1.api import api_router
from app.api.v1.endpoints import auth, business, discovery, leads, analytics
from app.schemas.discovery import DiscoveredOpportunity, DiscoveryFilters
from app.services.discovery.engine import discovery_engine

from sqlalchemy import text

# Initialize SQLite database schema
Base.metadata.create_all(bind=engine)

# Safe SQLite schema evolution for new columns
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE company_profiles ADD COLUMN calendly_url VARCHAR(500)"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE call_sessions ADD COLUMN language VARCHAR(50) DEFAULT 'English'"))
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute(text("ALTER TABLE leads ADD COLUMN preferred_language VARCHAR(50) DEFAULT 'English'"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="End-to-End AI Sales Platform: Signal Detection, Lead Enrichment, Matching, Intent Scoring, AI Calling, and CRM Handoff.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for hackathon local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Explicit GET /api/leads/discover mapping (must be mounted before /api/leads path params)
@app.get("/api/leads/discover", response_model=List[DiscoveredOpportunity], tags=["Leads Discovery Direct"])
async def direct_discover_leads(
    location: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    requirement_type: Optional[str] = Query(None),
    recency: Optional[str] = Query(None),
    intent_level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Direct alias for GET /api/leads/discover as specified in prompt."""
    filters = DiscoveryFilters(
        location=location,
        industry=industry,
        requirement_type=requirement_type,
        recency=recency,
        intent_level=intent_level,
        search=search
    )
    user_id = current_user.id if current_user else None
    return await discovery_engine.discover(filters, user_id=user_id, db=db)

# Direct Route Mounts per User Convenience
app.include_router(auth.router, prefix="/api/auth", tags=["Auth Direct"])
app.include_router(business.router, prefix="/api/business", tags=["Business Understanding Direct"])
app.include_router(discovery.router, prefix="/api/discovery", tags=["Discovery Direct"])
app.include_router(leads.router, prefix="/api/leads", tags=["Leads Direct"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics Direct"])



@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "platform": settings.PROJECT_NAME,
        "mode": "Demo / Active" if settings.DEMO_MODE else "Production",
        "version": "1.0.0"
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to AI Sales Agent — Signal to Opportunity API",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
