"""
Dynamic Business Profile Service with Database Persistence & LLM Extraction.
Zero static demo defaults. Data is 100% dynamic per user.
"""

import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session

from app.models.business import CompanyProfile
from app.schemas.business import (
    BusinessAnalyzeInput, StructuredBusinessProfile, BusinessProfile
)
from app.utils.document_parser import extract_text_from_file
from app.utils.llm_extractor import extract_business_profile_with_llm


class BusinessService:
    def get_profile_by_user(self, user_id: str, db: Session) -> Optional[StructuredBusinessProfile]:
        """Fetch the dynamic business profile for a specific user from SQLite."""
        row = db.query(CompanyProfile).filter(CompanyProfile.user_id == user_id).first()
        if not row:
            return None
        return self._to_schema(row)

    def save_or_update_profile(
        self, user_id: str, profile_data: StructuredBusinessProfile, db: Session
    ) -> StructuredBusinessProfile:
        """Persist or update the dynamic business profile for a user in SQLite."""
        row = db.query(CompanyProfile).filter(CompanyProfile.user_id == user_id).first()
        now = datetime.datetime.utcnow()

        if row:
            row.company_name = profile_data.company_name
            row.company_website = profile_data.company_website
            row.company_summary = profile_data.company_summary
            row.products_services = profile_data.products_services
            row.target_customers = profile_data.target_customers
            row.target_industries = profile_data.target_industries
            row.target_locations = profile_data.target_locations
            row.ideal_customer_profile = profile_data.ideal_customer_profile
            row.keywords = profile_data.keywords
            row.buying_signals = profile_data.buying_signals
            if profile_data.sender_email is not None:
                row.sender_email = profile_data.sender_email
            if profile_data.sender_name is not None:
                row.sender_name = profile_data.sender_name
            if profile_data.smtp_host is not None:
                row.smtp_host = profile_data.smtp_host
            if profile_data.smtp_port is not None:
                row.smtp_port = profile_data.smtp_port
            if profile_data.smtp_username is not None:
                row.smtp_username = profile_data.smtp_username
            if profile_data.smtp_password is not None:
                row.smtp_password = profile_data.smtp_password
            if profile_data.calendly_url is not None:
                row.calendly_url = profile_data.calendly_url
            row.updated_at = now
        else:
            row = CompanyProfile(
                user_id=user_id,
                company_name=profile_data.company_name,
                company_website=profile_data.company_website,
                company_summary=profile_data.company_summary,
                products_services=profile_data.products_services,
                target_customers=profile_data.target_customers,
                target_industries=profile_data.target_industries,
                target_locations=profile_data.target_locations,
                ideal_customer_profile=profile_data.ideal_customer_profile,
                keywords=profile_data.keywords,
                buying_signals=profile_data.buying_signals,
                sender_email=profile_data.sender_email,
                sender_name=profile_data.sender_name,
                smtp_host=profile_data.smtp_host or "smtp.gmail.com",
                smtp_port=profile_data.smtp_port or 465,
                smtp_username=profile_data.smtp_username,
                smtp_password=profile_data.smtp_password,
                calendly_url=profile_data.calendly_url,
                created_at=now,
                updated_at=now,
            )
            db.add(row)

        # Dynamically sync the User's display email and company_name with the business profile
        from app.models.user import User
        user_row = db.query(User).filter(User.id == user_id).first()
        if user_row:
            if profile_data.sender_email and profile_data.sender_email.strip():
                user_row.email = profile_data.sender_email.strip()
            if profile_data.company_name and profile_data.company_name.strip():
                user_row.company_name = profile_data.company_name.strip()

        db.commit()
        db.refresh(row)

        # Re-align default testing lead immediately to match the newly saved business profile
        from app.services.lead_service import lead_service
        try:
            lead_service.ensure_demo_lead(db, user_id)
        except Exception:
            pass

        return self._to_schema(row)

    async def analyze_and_save_business(
        self,
        input_data: BusinessAnalyzeInput,
        user_id: str,
        db: Session,
        uploaded_files: Optional[List[Tuple[str, bytes]]] = None,
    ) -> StructuredBusinessProfile:
        """
        Parses text from uploaded collateral (PDF, DOCX, TXT), runs LLM extraction,
        and saves the dynamic profile to the user's database record.
        """
        combined_doc_text = ""
        source_files_names = []

        if uploaded_files:
            for fname, fbytes in uploaded_files:
                text, _ = extract_text_from_file(fname, fbytes)
                if text:
                    combined_doc_text += f"\n--- File: {fname} ---\n{text}\n"
                    source_files_names.append(fname)

        extracted = await extract_business_profile_with_llm(
            company_name=input_data.company_name,
            company_website=input_data.company_website,
            business_description=input_data.business_description,
            products_services=input_data.products_services or "",
            target_industries=input_data.target_industries or "",
            target_locations=input_data.target_locations or "",
            ideal_customer_profile=input_data.ideal_customer_profile or "",
            document_text=combined_doc_text,
            source_files=source_files_names,
        )

        extracted.source_files = source_files_names
        extracted.is_demo_mode = False
        if input_data.sender_email:
            extracted.sender_email = input_data.sender_email
        if input_data.sender_name:
            extracted.sender_name = input_data.sender_name
        elif input_data.company_name:
            extracted.sender_name = input_data.company_name
        if input_data.calendly_url:
            extracted.calendly_url = input_data.calendly_url

        # Save to database
        return self.save_or_update_profile(user_id, extracted, db)

    def _to_schema(self, row: CompanyProfile) -> StructuredBusinessProfile:
        return StructuredBusinessProfile(
            company_name=row.company_name or "",
            company_website=row.company_website or "",
            company_summary=row.company_summary or "",
            products_services=row.products_services or [],
            target_customers=row.target_customers or [],
            target_industries=row.target_industries or [],
            target_locations=row.target_locations or [],
            ideal_customer_profile=row.ideal_customer_profile or "",
            keywords=row.keywords or [],
            buying_signals=row.buying_signals or [],
            sender_email=getattr(row, "sender_email", None),
            sender_name=getattr(row, "sender_name", None),
            smtp_host=getattr(row, "smtp_host", "smtp.gmail.com") or "smtp.gmail.com",
            smtp_port=getattr(row, "smtp_port", 465) or 465,
            smtp_username=getattr(row, "smtp_username", None),
            smtp_password=getattr(row, "smtp_password", None),
            calendly_url=getattr(row, "calendly_url", None),
            is_demo_mode=False,
            source_files=[],
            updated_at=row.updated_at.isoformat() if row.updated_at else "",
        )


business_service = BusinessService()
