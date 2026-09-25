import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_optional_current_user
from app.models.user import User
from app.schemas.business import (
    BusinessAnalyzeInput, StructuredBusinessProfile
)
from app.services.business_service import business_service

router = APIRouter()


def _get_user_id(current_user: Optional[User], db: Session) -> str:
    if current_user:
        return current_user.id
    first_user = db.query(User).first()
    if first_user:
        return first_user.id
    guest = User(
        email="user@salesagent.ai",
        hashed_password="",
        full_name="Sales Leader",
        company_name="My Company"
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest.id


@router.get("/profile", response_model=Optional[StructuredBusinessProfile])
def get_structured_business_profile(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the AI-extracted structured business profile for the user."""
    user_id = _get_user_id(current_user, db)
    return business_service.get_profile_by_user(user_id, db)


@router.put("/profile", response_model=StructuredBusinessProfile)
def update_structured_business_profile(
    profile: StructuredBusinessProfile,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Update and persist edits to the structured business profile in SQLite."""
    user_id = _get_user_id(current_user, db)
    return business_service.save_or_update_profile(user_id, profile, db)


@router.post("/analyze", response_model=StructuredBusinessProfile)
async def analyze_business(
    company_name: str = Form(...),
    company_website: str = Form(...),
    business_description: str = Form(...),
    products_services: Optional[str] = Form(""),
    target_industries: Optional[str] = Form(""),
    target_locations: Optional[str] = Form(""),
    ideal_customer_profile: Optional[str] = Form(""),
    sender_email: Optional[str] = Form(""),
    sender_name: Optional[str] = Form(""),
    calendly_url: Optional[str] = Form(""),
    files: Optional[List[UploadFile]] = File(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyzes company info and uploaded collateral (PDF, DOCX, TXT)
    using LLM extraction and saves dynamic profile to user DB.
    """
    if not company_name.strip():
        raise HTTPException(status_code=400, detail="Company Name is required.")
    if not business_description.strip():
        raise HTTPException(status_code=400, detail="Business Description is required.")

    uploaded_files_data = []
    if files:
        for f in files:
            if f.filename:
                content = await f.read()
                uploaded_files_data.append((f.filename, content))

    input_data = BusinessAnalyzeInput(
        company_name=company_name,
        company_website=company_website,
        business_description=business_description,
        products_services=products_services or "",
        target_industries=target_industries or "",
        target_locations=target_locations or "",
        ideal_customer_profile=ideal_customer_profile or "",
        sender_email=sender_email or "",
        sender_name=sender_name or "",
        calendly_url=calendly_url or "",
    )

    user_id = _get_user_id(current_user, db)
    return await business_service.analyze_and_save_business(
        input_data, user_id, db, uploaded_files_data
    )


@router.post("/analyze-json", response_model=StructuredBusinessProfile)
async def analyze_business_json(
    input_data: BusinessAnalyzeInput,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """JSON alternative for analyzing business info without file attachments."""
    user_id = _get_user_id(current_user, db)
    return await business_service.analyze_and_save_business(input_data, user_id, db, [])


from pydantic import BaseModel


class TestEmailRequest(BaseModel):
    recipient_email: str
    sender_email: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None


@router.post("/test-email")
def test_email_connection(
    req: TestEmailRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Test SMTP connection and send a test email to the specified address."""
    user_id = _get_user_id(current_user, db)
    profile = business_service.get_profile_by_user(user_id, db)

    sender_email = (req.sender_email or (profile.sender_email if profile else None) or "").strip()
    smtp_password = (req.smtp_password or (profile.smtp_password if profile else None) or "").strip()
    smtp_host = (req.smtp_host or (profile.smtp_host if profile else "smtp.gmail.com") or "smtp.gmail.com").strip()
    smtp_port = req.smtp_port or (profile.smtp_port if profile else 465) or 465
    company_name = (profile.company_name if profile else "AI Sales Agent")
    sender_name = (profile.sender_name if profile else company_name) or company_name

    if not sender_email or not smtp_password:
        raise HTTPException(
            status_code=400,
            detail="Sender Email and Google App Password must be provided."
        )

    clean_pwd = smtp_password.replace(" ", "").strip()
    if len(clean_pwd) != 16 and "gmail" in sender_email.lower():
        raise HTTPException(
            status_code=400,
            detail=(
                f"Google App Passwords must be exactly 16 letters (you entered {len(clean_pwd)} characters). "
                "Normal Gmail login passwords cannot be used with SMTP. "
                "Please generate a 16-letter App Password at https://myaccount.google.com/apppasswords"
            )
        )

    from app.services.lead_service import lead_service
    success, err_or_msg = lead_service._send_smtp_email(
        host=smtp_host,
        port=smtp_port,
        username=sender_email,
        password=clean_pwd,
        sender_email=sender_email,
        sender_name=sender_name,
        recipient_email=req.recipient_email,
        subject=f"Verification Test Email from {company_name}",
        body=(
            f"Hello,\n\n"
            f"This is a verification test email from your AI Sales Agent platform.\n\n"
            f"Your outbound email dispatch is verified and working properly for {sender_email}!\n\n"
            f"Best regards,\n{company_name}"
        )
    )
    if not success:
        raise HTTPException(status_code=400, detail=f"SMTP Error: {err_or_msg}")

    # If test succeeded, persist the verified credentials to database
    from app.models.business import CompanyProfile
    prof_row = db.query(CompanyProfile).filter(CompanyProfile.user_id == user_id).first()
    if prof_row:
        prof_row.sender_email = sender_email
        prof_row.smtp_password = clean_pwd
        prof_row.smtp_host = smtp_host
        prof_row.smtp_port = smtp_port
        db.commit()

    return {"success": True, "message": f"Real test email successfully delivered to {req.recipient_email}!"}
