import {
  BusinessProfile,
  StructuredBusinessProfile,
  DiscoveredOpportunity,
  DiscoveryFilters,
  BuyingSignal,
  Lead,
  CallSession,
  Opportunity,
  DashboardOverview,
  OfferingMatch,
  IntentScore,
  EmailDraftResponse,
  SendEmailResponse,
  SubscriptionData,
  SubscriptionTier,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sales_agent_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const authHeaders = getAuthHeaders();

  const isFormData = options?.body instanceof FormData;
  const mergedHeaders = isFormData
    ? {
        ...(authHeaders.Authorization ? { Authorization: authHeaders.Authorization } : {}),
        ...(options?.headers || {}),
      }
    : {
        ...authHeaders,
        ...(options?.headers || {}),
      };

  const res = await fetch(url, {
    ...options,
    headers: mergedHeaders,
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return await res.json();
}

export const api = {
  // Health
  checkHealth: async () => {
    try {
      return await request<{ status: string; platform: string; mode: string }>('/health');
    } catch {
      return { status: 'offline', platform: 'AI Sales Agent', mode: 'Local' };
    }
  },

  // Analytics & Dashboard (100% Dynamic)
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    try {
      return await request<DashboardOverview>('/analytics/overview');
    } catch (err) {
      // Safe clean empty state if not connected
      return {
        kpis: {
          active_buying_signals: 0,
          high_urgency_signals: 0,
          total_leads: 0,
          grade_a_leads: 0,
          ai_calls_conducted: 0,
          meetings_secured: 0,
          qualified_opportunities: 0,
          pipeline_value_estimate: '$0',
          average_response_rate: '0%',
          ai_qualification_rate: '0%',
        },
        funnel: [
          { stage: 'Signals Ingested', count: 0, percentage: 0 },
          { stage: 'Leads Enriched', count: 0, percentage: 0 },
          { stage: 'AI Match & Scored', count: 0, percentage: 0 },
          { stage: 'AI Outreach / Called', count: 0, percentage: 0 },
          { stage: 'Interested / Qualified', count: 0, percentage: 0 },
          { stage: 'CRM Opportunities', count: 0, percentage: 0 },
        ],
        top_buying_signals: [],
        high_priority_leads: [],
        recent_opportunities: [],
      };
    }
  },

  // Business Profile (Step 2 Dynamic Profile)
  getStructuredBusinessProfile: async (): Promise<StructuredBusinessProfile | null> => {
    try {
      const data = await request<StructuredBusinessProfile | null>('/business/profile');
      return data;
    } catch {
      return null;
    }
  },

  analyzeBusiness: async (formData: FormData): Promise<StructuredBusinessProfile> => {
    const url = `${API_BASE}/business/analyze`;
    const authHeaders = getAuthHeaders();
    const headers: Record<string, string> = {};
    if (authHeaders.Authorization) {
      headers['Authorization'] = authHeaders.Authorization;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let msg = 'Failed to analyze business';
      try {
        const err = await res.json();
        if (err.detail) msg = err.detail;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  },

  updateStructuredBusinessProfile: (data: StructuredBusinessProfile) =>
    request<StructuredBusinessProfile>('/business/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  testEmailConnection: (
    payload: { recipient_email: string; sender_email?: string; smtp_password?: string; smtp_port?: number; smtp_host?: string } | string
  ): Promise<{ success: boolean; message: string }> => {
    const body = typeof payload === 'string' ? { recipient_email: payload } : payload;
    return request<{ success: boolean; message: string }>('/business/test-email', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Step 3: Lead & Buying Requirement Discovery
  discoverLeads: async (filters?: DiscoveryFilters): Promise<DiscoveredOpportunity[]> => {
    const query = new URLSearchParams();
    if (filters?.location) query.set('location', filters.location);
    if (filters?.industry) query.set('industry', filters.industry);
    if (filters?.requirement_type) query.set('requirement_type', filters.requirement_type);
    if (filters?.recency) query.set('recency', filters.recency);
    if (filters?.intent_level) query.set('intent_level', filters.intent_level);
    if (filters?.search) query.set('search', filters.search);

    try {
      return await request<DiscoveredOpportunity[]>(`/discovery/discover?${query.toString()}`);
    } catch {
      return [];
    }
  },

  convertDiscoveredOpportunity: (opportunityId: string): Promise<Lead> =>
    request<Lead>(`/discovery/convert-discovered/${opportunityId}`, {
      method: 'POST',
    }),

  // Leads (100% Dynamic from SQLite)
  getLeads: async (params?: { status?: string; grade?: string; search?: string }): Promise<Lead[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.grade) query.set('grade', params.grade);
    if (params?.search) query.set('search', params.search);

    try {
      return await request<Lead[]>(`/leads?${query.toString()}`);
    } catch {
      return [];
    }
  },

  getLead: (leadId: string): Promise<Lead> =>
    request<Lead>(`/leads/${leadId}`),

  updateLeadStatus: (leadId: string, status: string): Promise<Lead> =>
    request<Lead>(`/leads/${leadId}/status?status=${encodeURIComponent(status)}`, {
      method: 'PUT',
    }),

  // AI Email Outreach
  getEmailDraft: (leadId: string, tone: string = 'direct', customInstructions?: string): Promise<EmailDraftResponse> =>
    request<EmailDraftResponse>(`/leads/${leadId}/email-draft`, {
      method: 'POST',
      body: JSON.stringify({ tone, custom_instructions: customInstructions }),
    }),

  sendLeadEmail: (
    leadId: string,
    data: { recipient_email: string; subject: string; body: string; method?: string; recipient_name?: string }
  ): Promise<SendEmailResponse> =>
    request<SendEmailResponse>(`/leads/${leadId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI Calling
  getCallSessions: async (): Promise<CallSession[]> => {
    try {
      return await request<CallSession[]>('/calling/sessions');
    } catch {
      return [];
    }
  },

  getCallSession: (callId: string): Promise<CallSession> =>
    request<CallSession>(`/calling/sessions/${callId}`),

  startCall: (leadId: string, voiceTone?: string, language?: string): Promise<CallSession> =>
    request<CallSession>('/calling/start', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, voice_tone: voiceTone, language }),
    }),

  stepCall: (callId: string, prospectResponse: string, voiceTone?: string, language?: string): Promise<CallSession> =>
    request<CallSession>('/calling/step', {
      method: 'POST',
      body: JSON.stringify({
        call_id: callId,
        prospect_response: prospectResponse,
        voice_tone: voiceTone,
        language,
      }),
    }),

  endCall: (callId: string): Promise<CallSession> =>
    request<CallSession>(`/calling/end/${callId}`, {
      method: 'POST',
    }),

  // Opportunities & CRM
  getOpportunities: async (): Promise<Opportunity[]> => {
    try {
      return await request<Opportunity[]>('/opportunities');
    } catch {
      return [];
    }
  },

  createOpportunityFromLead: (leadId: string): Promise<Opportunity> =>
    request<Opportunity>(`/opportunities/create-from-lead/${leadId}`, {
      method: 'POST',
    }),

  createOpportunityFromCall: (callId: string): Promise<Opportunity> =>
    request<Opportunity>(`/opportunities/create-from-call/${callId}`, {
      method: 'POST',
    }),

  exportToCRM: (oppId: string, targetCrm: string = 'HubSpot'): Promise<Opportunity> =>
    request<Opportunity>('/opportunities/crm-export', {
      method: 'POST',
      body: JSON.stringify({ opportunity_id: oppId, target_crm: targetCrm }),
    }),

  // SaaS Subscription & Quotas
  getSubscription: (): Promise<SubscriptionData> =>
    request<SubscriptionData>('/subscription'),

  upgradeSubscription: (
    planTier: SubscriptionTier,
    billingCycle: 'monthly' | 'yearly' = 'monthly'
  ): Promise<SubscriptionData> =>
    request<SubscriptionData>('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan_tier: planTier, billing_cycle: billingCycle }),
    }),
};
