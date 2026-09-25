export interface User {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ProductOffering {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  key_features: string[];
  target_pain_points: string[];
  pricing_tier: string;
  ideal_customer_size: string;
  proof_point?: string;
}


export interface TargetPersona {
  id: string;
  title: string;
  seniority: string;
  department: string;
  key_priorities: string[];
  common_objections: string[];
}

export interface BusinessProfile {
  id: string;
  company_name: string;
  domain: string;
  industry: string;
  headline: string;
  description: string;
  value_propositions: string[];
  differentiators: string[];
  products: ProductOffering[];
  target_personas: TargetPersona[];
  collateral_docs: string[];
}

export interface BusinessAnalyzeInput {
  company_name: string;
  company_website: string;
  business_description: string;
  products_services?: string;
  target_industries?: string;
  target_locations?: string;
  ideal_customer_profile?: string;
  calendly_url?: string;
}

export interface StructuredBusinessProfile {
  company_name: string;
  company_website: string;
  company_summary: string;
  products_services: string[];
  target_customers: string[];
  target_industries: string[];
  target_locations: string[];
  ideal_customer_profile: string;
  keywords: string[];
  buying_signals: string[];
  is_demo_mode: boolean;
  source_files: string[];
  sender_email?: string;
  sender_name?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  calendly_url?: string;
  updated_at?: string;
}

// --- STEP 3: Lead Discovery Models ---
export interface Company {
  name: string;
  domain: string;
  industry: string;
  location: string;
  employee_count: string;
  revenue_estimate?: string;
}

export interface Requirement {
  title: string;
  description: string;
  requirement_type: string;
  urgency: 'High' | 'Medium' | 'Low' | string;
  budget_hint?: string;
}

export interface Source {
  platform: string;
  original_url: string;
  verified_public: boolean;
  confidence_score: number;
}

export interface DiscoveredOpportunity {
  id: string;
  company: Company;
  requirement: Requirement;
  source: Source;
  detected_date: string;
  intent_level: 'High' | 'Medium' | 'Low' | string;
  match_score: number;
  matched_offering: string;
  match_rationale: string;
  status: 'New' | 'Saved' | 'Converted' | string;
}

export interface DiscoveryFilters {
  location?: string;
  industry?: string;
  requirement_type?: string;
  recency?: string;
  intent_level?: string;
  search?: string;
}

export interface BuyingSignal {
  id: string;
  company_name: string;
  domain: string;
  signal_type: 'funding' | 'hiring_surge' | 'leadership_hire' | 'tech_stack_change' | 'expansion' | 'compliance_deadline' | 'pain_point' | string;
  title: string;
  summary: string;
  source: string;
  detected_at: string;
  confidence_score: number;
  urgency_level: 'High' | 'Medium' | 'Low';
  urgency_score: number;
  raw_data?: Record<string, any>;
  processed: boolean;
  lead_id?: string;
}

export interface LeadContact {
  name: string;
  title: string;
  role_level: string;
  email: string;
  phone?: string;
  linkedin_url?: string;
  decision_authority: string;
}

export interface OfferingMatch {
  product_id: string;
  product_name: string;
  fit_score: number;
  match_tier: 'Strong' | 'Moderate' | 'Low';
  reasoning: string;
  aligned_features: string[];
  suggested_pitch: string;
}

export interface IntentScore {
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  urgency_component: number;
  fit_component: number;
  authority_component: number;
  timing_component: number;
  buying_readiness: string;
  key_drivers: string[];
}

export interface Lead {
  id: string;
  company_name: string;
  domain: string;
  industry: string;
  employee_count: string;
  estimated_revenue: string;
  location: string;
  tech_stack: string[];
  signals_count: number;
  signals_summary: string[];
  contacts: LeadContact[];
  primary_contact?: LeadContact;
  match?: OfferingMatch;
  matched_offering?: string;
  intent?: IntentScore;
  status: string;
  preferred_language?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface CallTurn {
  id: string;
  speaker: 'ai' | 'prospect';
  text: string;
  timestamp_offset_seconds: number;
  sentiment?: string;
  objection_detected?: string;
}

export interface ObjectionBattlecard {
  category: string;
  objection: string;
  recommended_pivot: string;
  proof_point: string;
}

export interface CallInsights {
  summary: string;
  sentiment_overall?: string;
  engagement?: string;
  intent_level?: string;
  intent_score?: number | null;
  interest_level?: string;
  urgency?: string;
  need?: string;
  product_service?: string;
  scope_quantity?: string;
  scope_users?: string;
  timeline?: string;
  budget?: string;
  deal_amount?: string | null;
  authority?: string;
  target_location?: string | null;
  delivery_location?: string | null;
  pain_points?: string[];
  extracted_pain_points?: string[];
  objections?: string[];
  objections_handled?: string[];
  customer_questions?: string[];
  important_info?: string[];
  next_best_action?: string;
  qualification_verdict: string;
}

export interface CallSession {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name: string;
  contact_title: string;
  language?: string;
  status: string;
  stage?: string;
  duration_seconds: number;
  started_at: string;
  turns: CallTurn[];
  insights?: CallInsights;
  battlecards_used: ObjectionBattlecard[];
}

export interface NextBestAction {
  id: string;
  lead_id: string;
  action_type: string;
  title: string;
  rationale: string;
  priority: 'Urgent' | 'High' | 'Medium';
  suggested_email_or_script: string;
  completed: boolean;
}

export interface Opportunity {
  id: string;
  lead_id: string;
  company_name: string;
  domain: string;
  contact_name: string;
  contact_email: string;
  matched_offering: string;
  deal_value?: number | null;
  deal_value_estimate: string;
  stage: string;
  win_probability: number;
  assigned_rep: string;
  next_action?: NextBestAction;
  crm_synced: boolean;
  crm_target?: string;
  crm_record_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversionRates {
  signal_to_lead: number;
  lead_to_opportunity: number;
  overall_conversion: number;
  counts: {
    signals: number;
    leads: number;
    outreach: number;
    opportunities: number;
  };
}

export interface BuyingSignalItem {
  id: string;
  company_name: string;
  source: string;
  category?: string;
  requirement: string;
  product?: string | null;
  intent_level?: string | null;
  status: string;
  lead_id?: string | null;
  detected_at?: string | null;
}

export interface BuyingSignalsSummary {
  total_active_signals: number;
  signals: BuyingSignalItem[];
}

export interface OpportunityRecord {
  id: string;
  company_name: string;
  stage: string;
  deal_value?: number | null;
  formatted_deal_value?: string | null;
  assigned_rep?: string;
  next_action_title?: string;
  next_action_priority?: string;
  crm_synced?: boolean;
  crm_target?: string;
  created_at?: string;
}

export interface OpportunitySummary {
  total_count: number;
  has_real_values: boolean;
  pipeline_value?: number | null;
  formatted_pipeline_value?: string | null;
  stage_breakdown: Array<{ stage: string; count: number }>;
  opportunities: OpportunityRecord[];
}

export interface DashboardOverview {
  conversion_rates?: ConversionRates;
  funnel: Array<{
    stage: string;
    label?: string;
    count: number;
    percentage: number;
    dropoff_percentage?: number;
    description?: string;
  }>;
  buying_signals_summary?: BuyingSignalsSummary;
  opportunity_summary?: OpportunitySummary;
  kpis: {
    active_buying_signals: number;
    high_urgency_signals: number;
    total_leads: number;
    grade_a_leads: number;
    ai_calls_conducted: number;
    meetings_secured: number;
    qualified_opportunities: number;
    pipeline_value_estimate: string;
    average_response_rate: string;
    ai_qualification_rate: string;
  };
  top_buying_signals?: any[];
  high_priority_leads?: Lead[];
  recent_opportunities?: any[];
}

export interface EmailDraftResponse {
  lead_id: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body: string;
  tone: string;
  matched_offering: string;
  company_name: string;
}

export interface SendEmailResponse {
  success: boolean;
  real_sent?: boolean;
  lead_id: string;
  recipient_email: string;
  subject: string;
  status: string;
  timestamp: string;
  message: string;
}

// --- SaaS Subscription Architecture ---
export type SubscriptionTier = 'Starter' | 'Growth' | 'Enterprise';

export interface PlanTierDefinition {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  currency_symbol: string;
  price_inr_monthly: number;
  price_inr_yearly: number;
  voice_minutes: number;
  leads_count: number;
  seats: number;
  is_popular: boolean;
  badge?: string;
  features: string[];
}

export interface SubscriptionData {
  id: string;
  plan_tier: SubscriptionTier;
  status: 'active' | 'trial' | 'past_due';
  billing_cycle: 'monthly' | 'yearly';
  voice_minutes_used: number;
  voice_minutes_limit: number;
  voice_minutes_percentage: number;
  leads_used: number;
  leads_limit: number;
  leads_percentage: number;
  seats_used: number;
  seats_limit: number;
  available_tiers: PlanTierDefinition[];
}

