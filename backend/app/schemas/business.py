from typing import List, Optional, Union
from pydantic import BaseModel, Field


class ProductOffering(BaseModel):
    id: str
    name: str
    category: str
    tagline: str
    description: str
    key_features: List[str] = Field(default_factory=list)
    target_pain_points: List[str] = Field(default_factory=list)
    pricing_tier: str
    ideal_customer_size: str
    proof_point: Optional[str] = None


class TargetPersona(BaseModel):
    id: str
    title: str
    seniority: str
    department: str
    key_priorities: List[str] = Field(default_factory=list)
    common_objections: List[str] = Field(default_factory=list)


class BusinessProfile(BaseModel):
    id: str
    company_name: str
    domain: str
    industry: str
    headline: str
    description: str
    value_propositions: List[str] = Field(default_factory=list)
    differentiators: List[str] = Field(default_factory=list)
    products: List[ProductOffering] = Field(default_factory=list)
    target_personas: List[TargetPersona] = Field(default_factory=list)
    collateral_docs: List[str] = Field(default_factory=list)


class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    headline: Optional[str] = None
    description: Optional[str] = None
    value_propositions: Optional[List[str]] = None
    differentiators: Optional[List[str]] = None


# --- STEP 2: Business Understanding Schemas ---

class BusinessAnalyzeInput(BaseModel):
    company_name: str
    company_website: str
    business_description: str
    products_services: Optional[str] = ""
    target_industries: Optional[str] = ""
    target_locations: Optional[str] = ""
    ideal_customer_profile: Optional[str] = ""
    sender_email: Optional[str] = ""
    sender_name: Optional[str] = ""
    calendly_url: Optional[str] = ""


class StructuredBusinessProfile(BaseModel):
    company_name: str
    company_website: str
    company_summary: str
    products_services: List[str] = Field(default_factory=list)
    target_customers: List[str] = Field(default_factory=list)
    target_industries: List[str] = Field(default_factory=list)
    target_locations: List[str] = Field(default_factory=list)
    ideal_customer_profile: str
    keywords: List[str] = Field(default_factory=list)
    buying_signals: List[str] = Field(default_factory=list)
    is_demo_mode: bool = True
    source_files: List[str] = Field(default_factory=list)
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 465
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    calendly_url: Optional[str] = None
    updated_at: str = ""
