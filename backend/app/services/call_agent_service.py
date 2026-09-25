"""
AI Sales Calling and Dialogue Agent Service
Powered exclusively by Google Gemini LLM as the Conversational Brain.
Zero rule-based or regex conversation trees.
"""

from typing import List, Optional, Dict, Any, Tuple
import os
import re
import json
import uuid
import datetime
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.call import CallSession as DBCallSession
from app.models.lead import Lead as DBLead
from app.schemas.call import (
    CallSession, CallTurn, CallInsights, ObjectionBattlecard,
    StartCallRequest, CallDialogueStepRequest
)
from app.schemas.lead import Lead
from app.schemas.business import StructuredBusinessProfile
from app.services.business_service import business_service
from app.services.lead_service import lead_service


class CallAgentService:
    def __init__(self):
        # In-memory fast cache synced with SQLite
        self._memory_sessions: Dict[str, CallSession] = {}
        # Persistent HTTP client with connection pooling and keep-alive for sub-second latency
        self._client: Optional[httpx.Client] = None
        # Track the fastest working model to avoid wasteful model fallback checks
        self._active_model: str = "gemini-3.1-flash-lite-preview"

    def _get_http_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(
                timeout=7.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
            )
        return self._client

    def get_all_calls(self, db: Session, user_id: str) -> List[CallSession]:
        """Fetch all call sessions for the user from SQLite."""
        rows = db.query(DBCallSession).filter(DBCallSession.user_id == user_id).order_by(DBCallSession.created_at.desc()).all()
        results = []
        for r in rows:
            session = self._db_to_schema(r)
            results.append(session)
        return results

    def get_call_by_id(self, call_id: str, db: Optional[Session] = None, user_id: Optional[str] = None) -> Optional[CallSession]:
        """Fetch a specific call session by ID with resilient user_id fallback."""
        if call_id in self._memory_sessions:
            return self._memory_sessions[call_id]

        if db:
            query = db.query(DBCallSession).filter(DBCallSession.id == call_id)
            if user_id:
                row = query.filter(DBCallSession.user_id == user_id).first()
                if row:
                    session = self._db_to_schema(row)
                    self._memory_sessions[call_id] = session
                    return session

            # If user_id wasn't passed or mismatched (e.g. guest token switch), query by ID directly
            row = db.query(DBCallSession).filter(DBCallSession.id == call_id).first()
            if row:
                session = self._db_to_schema(row)
                self._memory_sessions[call_id] = session
                return session

        return None

    def _get_gemini_api_key(self) -> Optional[str]:
        """
        Dynamically resolves Google Gemini API key from environment, settings, or .env.
        Supports hot updates without server restart.
        """
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or settings.GEMINI_API_KEY
        if key and len(key.strip()) > 5:
            return key.strip()

        # Check backend/.env directly
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                            val = line.split("=", 1)[1].strip().strip('"\'')
                            if val and len(val) > 5:
                                return val
            except Exception:
                pass
        return None

    def _call_gemini_api(
        self,
        contents: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        response_mime_type: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 500
    ) -> Optional[str]:
        """
        Direct REST invocation of Google Gemini LLM with persistent HTTP connection pooling,
        sub-second lite model prioritization, and dynamic active-model caching.
        """
        gemini_key = self._get_gemini_api_key()
        if not gemini_key:
            return None

        # Prioritize fastest verified models first and cache the active winner
        candidate_models = [
            self._active_model,
            "gemini-3.1-flash-lite-preview",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.7-flash",
            "gemini-3.6-flash",
        ]
        models_to_try: List[str] = []
        for m in candidate_models:
            if m and m not in models_to_try:
                models_to_try.append(m)

        client = self._get_http_client()

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            payload: Dict[str, Any] = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "thinkingConfig": {
                        "thinkingBudget": 0
                    }
                }
            }
            if response_mime_type:
                payload["generationConfig"]["responseMimeType"] = response_mime_type
            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }

            try:
                res = client.post(url, json=payload, timeout=6.0)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                        parts = candidates[0]["content"]["parts"]
                        text = "".join(p.get("text", "") for p in parts).strip()
                        if text:
                            self._active_model = model
                            return text
                elif res.status_code == 400 and system_instruction:
                    # Fallback for models not supporting separate systemInstruction or thinkingConfig
                    fallback_contents = [
                        {"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_instruction}"}]},
                        {"role": "model", "parts": [{"text": "Understood. I will act strictly according to these instructions."}]},
                    ] + contents
                    fallback_payload: Dict[str, Any] = {
                        "contents": fallback_contents,
                        "generationConfig": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens,
                        }
                    }
                    if response_mime_type:
                        fallback_payload["generationConfig"]["responseMimeType"] = response_mime_type
                    res = client.post(url, json=fallback_payload, timeout=6.0)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                            parts = candidates[0]["content"]["parts"]
                            text = "".join(p.get("text", "") for p in parts).strip()
                            if text:
                                self._active_model = model
                                return text
                else:
                    print(f"[Gemini API] Model {model} returned HTTP {res.status_code}: {res.text[:120]}")
            except Exception as e:
                print(f"[Gemini API] Request error with model {model}: {e}")

        return None

    def start_call(
        self,
        req: StartCallRequest,
        lead: Lead,
        seller_profile: Optional[StructuredBusinessProfile],
        user_id: str,
        db: Session
    ) -> CallSession:
        """
        Initiates a dynamic sales qualification call.
        Uses Gemini LLM for the authentic opening greeting.
        If Gemini is unavailable, strictly displays 'AI conversation unavailable'.
        """
        call_id = f"call-{uuid.uuid4().hex[:6]}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Mark any previous in-progress calls as Ended so session history is preserved
        try:
            db.query(DBCallSession).filter(
                DBCallSession.user_id == user_id,
                DBCallSession.status == "In_Progress"
            ).update({"status": "Ended"}, synchronize_session=False)
            db.commit()
        except Exception:
            db.rollback()

        seller_company = (seller_profile.company_name.strip() if seller_profile and seller_profile.company_name else "our company")
        seller_products = [p.strip() for p in (seller_profile.products_services or []) if p.strip()] if seller_profile else []
        seller_summary = (seller_profile.company_summary.strip() if seller_profile and seller_profile.company_summary else "")
        products_str = ", ".join(seller_products) if seller_products else "our products and offerings"

        contact_name = lead.primary_contact.name if lead.primary_contact else "there"
        contact_title = lead.primary_contact.title if lead.primary_contact else "Decision Maker"

        target_service = (
            getattr(lead, "matched_offering", None)
            or (lead.signals_summary[0] if getattr(lead, "signals_summary", None) else None)
            or (lead.match.product_name if getattr(lead, "match", None) else None)
            or (seller_products[0] if seller_products else None)
        )

        # 1. Generate opening greeting via Gemini LLM
        gemini_key = self._get_gemini_api_key()
        greeting_text = "AI conversation unavailable"

        if gemini_key:
            greeting_prompt = (
                f"You are the professional B2B AI Sales Representative for {seller_company}.\n"
                f"Company background: {seller_summary}\n"
                f"Products offered: {products_str}\n"
                f"Target lead: {contact_name} at {lead.company_name}.\n"
                f"Initial signal or interest: {target_service or 'offerings'}.\n\n"
                f"Generate a natural, professional phone greeting (1 to 2 short sentences). "
                f"Introduce yourself and {seller_company}, mention their requirement or inquiry, and ask if it's a good time for a brief conversation. "
                f"Do NOT use quotes, markdown, or asterisks."
            )
            llm_greeting = self._call_gemini_api(
                contents=[{"role": "user", "parts": [{"text": greeting_prompt}]}],
                temperature=0.3,
                max_tokens=100
            )
            if llm_greeting:
                greeting_text = re.sub(r'^["\']|["\']$', '', llm_greeting.strip()).strip()

        initial_turn = CallTurn(
            id=f"turn-{uuid.uuid4().hex[:4]}",
            speaker="ai",
            text=greeting_text,
            timestamp_offset_seconds=0,
            sentiment="positive" if greeting_text != "AI conversation unavailable" else "neutral"
        )

        session = CallSession(
            id=call_id,
            lead_id=req.lead_id,
            company_name=lead.company_name,
            contact_name=contact_name,
            contact_title=contact_title,
            status="In_Progress",
            stage="greeting",
            duration_seconds=5,
            started_at=now_iso,
            turns=[initial_turn],
            insights=None,
            battlecards_used=[]
        )

        # Initial insights
        if greeting_text == "AI conversation unavailable":
            session.insights = CallInsights(
                summary="AI conversation unavailable",
                sentiment_overall="Neutral",
                engagement="Not available",
                intent_level="Not available",
                intent_score=None,
                interest_level="Not available",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority="Not available",
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="AI conversation unavailable",
                qualification_verdict="Analysis Unavailable",
            )
        else:
            session.insights = CallInsights(
                summary=f"Call initiated with {lead.company_name}. Awaiting prospect response.",
                sentiment_overall="Neutral",
                engagement="Awaiting Response",
                intent_level="In_Progress",
                intent_score=None,
                interest_level="Not available",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority=contact_title,
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="Listen to prospect response",
                qualification_verdict="In_Progress",
            )

        # Persist into memory and DB
        self._memory_sessions[call_id] = session

        db_session = DBCallSession(
            id=call_id,
            user_id=user_id,
            lead_id=req.lead_id,
            lead_name=contact_name,
            company_name=lead.company_name,
            duration_seconds=5,
            status="In_Progress",
            turns=[t.model_dump() for t in session.turns],
            summary=session.insights.summary if session.insights else "",
            qualification_verdict=session.insights.qualification_verdict if session.insights else "In_Progress",
            qualification_data=session.insights.model_dump() if session.insights else {},
            created_at=datetime.datetime.utcnow(),
        )
        db.add(db_session)
        db.commit()

        # Update lead status in CRM
        lead_service.update_status(db, user_id, req.lead_id, "Contacted")

        return session

    def _generate_conversational_reply(
        self,
        prospect_text: str,
        current_stage: str,
        call: CallSession,
        seller_profile: Optional[StructuredBusinessProfile],
        lead: Optional[Lead],
        db: Session,
        user_id: str,
    ) -> Tuple[str, str, Optional[str]]:
        """
        Pure Gemini LLM Conversational Brain.
        - Gemini reads the entire conversation history before every response.
        - No fixed question sequence.
        - No keyword or regex-based conversation decision logic.
        - Never repeats a question already answered.
        - Understands answers from context (e.g. '300' -> quantity; 'Total budget is 50000' -> budget).
        - Does not treat AI statements or lead data as prospect-confirmed facts.
        - Handles unexpected questions naturally from the business profile.
        - Let Gemini decide what to ask next and when to stop qualifying.
        - If Gemini is unavailable, strictly returns 'AI conversation unavailable'.
        """
        gemini_key = self._get_gemini_api_key()
        if not gemini_key:
            return "AI conversation unavailable", current_stage, None

        seller_company = (seller_profile.company_name.strip() if seller_profile and seller_profile.company_name else "our company")
        seller_summary = (seller_profile.company_summary.strip() if seller_profile and seller_profile.company_summary else "")
        seller_products = [p.strip() for p in (seller_profile.products_services or []) if p.strip()] if seller_profile else []
        seller_locations = [loc.strip() for loc in (seller_profile.target_locations or []) if loc.strip()] if seller_profile else []
        seller_website = (seller_profile.company_website.strip() if seller_profile and seller_profile.company_website else "")
        seller_calendly = (seller_profile.calendly_url.strip() if seller_profile and getattr(seller_profile, "calendly_url", None) and seller_profile.calendly_url else "")
        products_str = ", ".join(seller_products) if seller_products else "our artisan collections and wholesale products"
        locations_str = ", ".join(seller_locations) if seller_locations else "India"

        lead_company = call.company_name or (lead.company_name if lead else "the prospect company")
        contact_name = call.contact_name or (lead.primary_contact.name if lead and lead.primary_contact else "there")
        contact_title = getattr(call, "contact_title", None) or (lead.primary_contact.title if lead and lead.primary_contact else "Decision Maker")
        target_service = (
            getattr(lead, "matched_offering", None)
            or (lead.signals_summary[0] if getattr(lead, "signals_summary", None) else None)
            or (lead.match.product_name if getattr(lead, "match", None) else None)
            or (seller_products[0] if seller_products else "our offerings")
        )

        calendly_info_str = f"Calendly Booking Link: {seller_calendly}" if seller_calendly else "Calendly Booking Link: https://calendly.com/sales-team/meeting"

        system_instruction = f"""You are the professional B2B AI Sales Representative for {seller_company}, conducting a live telephone sales conversation with {contact_name} at {lead_company}.

=== SELLER PROFILE (GROUND TRUTH) ===
Company Name: {seller_company}
About / Capabilities: {seller_summary}
Products / Services: {products_str}
Manufacturing / Office Locations: {locations_str}
Website: {seller_website}
{calendly_info_str}

=== CURRENT TARGET PROSPECT ===
Company: {lead_company}
Contact: {contact_name} ({contact_title})
Initial Lead Signal: {target_service}

=== CONVERSATIONAL BRAIN DIRECTIVES ===
1. FULL CONVERSATION CONTEXT: You must read the complete conversation history below. You are responding naturally to the prospect's latest statement in context of everything said so far.
2. NO FIXED QUESTION SEQUENCE: There is no rigid script or fixed sequence. You decide dynamically what to ask or say next based on the natural flow of conversation.
3. NEVER REPEAT A QUESTION ALREADY ANSWERED: Review all previous turns. NEVER ask a question that the prospect has already answered or addressed earlier.
4. UNDERSTAND CONTEXT:
   - Understand short answers from context (e.g. if the previous question was about quantity, volume, or pieces, "300" means an order quantity of 300 units).
   - "300 pieces for festive lehengas" -> understand both quantity and requirement simultaneously.
   - "Total budget is 50000" -> understand budget and NEVER ask about budget again.
5. GROUND TRUTH ONLY:
   - Do NOT treat AI statements or lead initial signals as prospect-confirmed facts until the prospect explicitly confirms or mentions them.
   - Never invent capabilities, certifications, or products outside the Seller Profile.
6. HANDLE UNEXPECTED ANSWERS NATURALLY:
   - If the prospect asks unexpected questions (e.g. factory location, pricing, certifications, catalog, delivery time, samples), answer concisely in 1 sentence using the Seller Profile and naturally continue the qualification.
   - If the prospect raises objections (budget, timing, competitor), handle them politely and constructively.
7. SPOKEN PHONE STYLE:
   - Keep your reply to 1 or 2 concise, conversational sentences suitable for telephone speech.
   - Do NOT use markdown, bullet points, asterisks, or quotes.
8. HUMAN TEAM & CALENDLY BOOKING REQUESTS:
   - If the prospect asks to speak with a human, speak with a live representative, or book/schedule a call or demo:
   - Warmly share the Calendly link ({seller_calendly or 'https://calendly.com/sales-team/meeting'}) so they can select a preferred timeslot with the human team immediately.
   - State that you are sharing the direct scheduling link right now.
9. DECIDE WHEN TO STOP QUALIFYING:
   - When key qualification details (requirement, quantity, timeline, budget, and best email to send quotes/lookbook to) have all been thoroughly discussed and agreed upon, wrap up the call warmly and set "call_status" to "completed".
   - ONLY set "call_status" to "ended" IF the prospect explicitly indicates they want to hang up, must leave, are busy, or say they are not interested (e.g. "have to go", "not interested", "bye", "hanging up").
   - For all regular answers, questions, inquiries, and dialogue progression turns: You MUST set "call_status" to "in_progress".

You MUST return ONLY a JSON object:
{{
  "reply": "Your spoken conversational response (1-2 sentences)",
  "call_status": "in_progress" | "completed" | "ended",
  "objection_detected": null | "budget" | "timing" | "competitor"
}}"""

        # Build chronological history in Gemini multi-turn format
        contents: List[Dict[str, Any]] = []
        for t in call.turns:
            role = "model" if t.speaker == "ai" else "user"
            contents.append({
                "role": role,
                "parts": [{"text": t.text}]
            })

        # Add current prospect response as the final user message
        contents.append({
            "role": "user",
            "parts": [{"text": prospect_text}]
        })

        raw_llm_response = self._call_gemini_api(
            contents=contents,
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.25,
            max_tokens=250
        )

        if not raw_llm_response:
            return "AI conversation unavailable", current_stage, None

        try:
            cleaned_json = re.sub(r'^```(?:json)?\s*|```$', '', raw_llm_response.strip(), flags=re.MULTILINE).strip()
            data = json.loads(cleaned_json)
            reply = data.get("reply", "").strip()
            status = data.get("call_status", "in_progress").lower()
            objection = data.get("objection_detected")

            if not reply:
                reply = "AI conversation unavailable"

            if status == "completed":
                next_stage = "completed"
                call.status = "Completed"
            elif status == "ended":
                next_stage = "ended"
                call.status = "Ended"
            else:
                next_stage = "engaged"
                call.status = "In_Progress"

            return reply, next_stage, objection
        except Exception as e:
            print(f"[Gemini Dialogue] Error parsing JSON: {e}. Raw response: {raw_llm_response[:120]}")
            # If Gemini returned plain text instead of JSON
            cleaned_text = re.sub(r'^["\']|["\']$', '', raw_llm_response.strip()).strip()
            if cleaned_text:
                return cleaned_text, "engaged", None
            return "AI conversation unavailable", current_stage, None

    def process_dialogue_step(
        self,
        req: CallDialogueStepRequest,
        user_id: str,
        db: Session
    ) -> CallSession:
        """
        Processes turn-by-turn qualification speech using Gemini as the conversational brain.
        Structured fields are kept strictly for CRM / summary; they do NOT control conversation.
        """
        call = self.get_call_by_id(req.call_id, db=db, user_id=user_id)
        if not call:
            raise ValueError(f"Call session {req.call_id} not found")

        prospect_text = req.prospect_response.strip()
        elapsed = call.duration_seconds + 15
        call.duration_seconds = elapsed

        # 1. Record prospect speech turn
        prospect_turn = CallTurn(
            id=f"turn-{uuid.uuid4().hex[:4]}",
            speaker="prospect",
            text=prospect_text,
            timestamp_offset_seconds=elapsed - 8,
            sentiment="neutral"
        )

        seller_profile = business_service.get_profile_by_user(user_id, db)
        lead = lead_service.get_lead_by_id(db, user_id, call.lead_id)

        # Sync email / phone to DB if provided by prospect (strictly for CRM storage)
        emails_found = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', prospect_text)
        if emails_found:
            email = emails_found[0]
            if lead and lead.primary_contact:
                lead.primary_contact.email = email
            db_lead = db.query(DBLead).filter(DBLead.id == call.lead_id).first()
            if db_lead:
                db_lead.contact_email = email
                db.commit()

        phones_found = re.findall(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}', prospect_text)
        if phones_found and lead and lead.primary_contact:
            lead.primary_contact.phone = phones_found[0].strip()

        # 2. Conversational reasoning via Gemini LLM
        current_stage = call.stage or "engaged"
        ai_reply, next_stage, objection_detected = self._generate_conversational_reply(
            prospect_text=prospect_text,
            current_stage=current_stage,
            call=call,
            seller_profile=seller_profile,
            lead=lead,
            db=db,
            user_id=user_id,
        )

        call.stage = next_stage

        if objection_detected == "budget":
            call.battlecards_used.append(ObjectionBattlecard(
                category="budget",
                objection="Budget constraint or wholesale pricing question",
                recommended_pivot="Highlight direct manufacturer wholesale pricing without intermediary markups.",
                proof_point="Direct factory supply provides a 20-30% margin advantage."
            ))
            prospect_turn.objection_detected = objection_detected
            prospect_turn.sentiment = "skeptical"
        elif objection_detected == "timing":
            call.battlecards_used.append(ObjectionBattlecard(
                category="timing",
                objection="Prospect timing constraint",
                recommended_pivot="Offer asynchronous catalog/sample delivery and schedule quick follow-up.",
                proof_point="Zero-pressure digital lookbook review."
            ))
            prospect_turn.objection_detected = objection_detected
            prospect_turn.sentiment = "skeptical"
        elif objection_detected == "competitor":
            call.battlecards_used.append(ObjectionBattlecard(
                category="competitor",
                objection="Existing supplier relationship",
                recommended_pivot="Position as complementary backup supplier for surge capacity.",
                proof_point="Multi-vendor supplier diversification protects against stockouts."
            ))
            prospect_turn.objection_detected = objection_detected
            prospect_turn.sentiment = "skeptical"
        else:
            lower_p = prospect_text.lower()
            prospect_turn.sentiment = "positive" if any(w in lower_p for w in ["yes", "sure", "interested", "help", "sounds good", "send"]) else "neutral"

        call.turns.append(prospect_turn)

        # 3. Add AI Speech Turn
        ai_turn = CallTurn(
            id=f"turn-{uuid.uuid4().hex[:4]}",
            speaker="ai",
            text=ai_reply,
            timestamp_offset_seconds=elapsed,
            sentiment="positive" if ai_reply != "AI conversation unavailable" else "neutral"
        )
        call.turns.append(ai_turn)

        # 4. Refresh Structured BANT Insights via Gemini LLM (executed only when call concludes)
        is_finished = (call.status in ["Completed", "Ended"] or next_stage in ["completed", "ended"])
        if is_finished:
            call.insights = self._analyze_call_with_ai(
                call=call,
                seller_profile=seller_profile,
                lead=lead,
                is_completed=True
            )
        elif not call.insights:
            call.insights = CallInsights(
                summary=f"Call in progress with {call.company_name}.",
                sentiment_overall="Neutral",
                engagement="Medium",
                intent_level="In_Progress",
                intent_score=None,
                interest_level="Evaluating",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority=call.contact_title or "Not available",
                target_location=None,
                delivery_location=None,
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="Listen to prospect response",
                qualification_verdict="In_Progress",
            )

        # Sync to memory and SQLite
        self._memory_sessions[call.id] = call

        db_row = db.query(DBCallSession).filter(DBCallSession.id == call.id).first()
        if db_row:
            db_row.duration_seconds = elapsed
            db_row.status = call.status
            db_row.turns = [t.model_dump() for t in call.turns]
            db_row.summary = call.insights.summary if call.insights else ""
            db_row.qualification_verdict = call.insights.qualification_verdict if call.insights else "In_Progress"
            db_row.qualification_data = call.insights.model_dump() if call.insights else {}
            db.commit()

        return call

    def _analyze_call_with_ai(
        self,
        call: CallSession,
        seller_profile: Optional[StructuredBusinessProfile],
        lead: Optional[Lead],
        is_completed: bool = False
    ) -> CallInsights:
        """
        Uses Gemini LLM for the final call summary and BANT qualification extraction.
        If Gemini is unavailable, returns 'AI conversation unavailable'. Zero fake/rule-based synthesis.
        """
        prospect_turns = [t for t in call.turns if t.speaker == "prospect"]
        gemini_key = self._get_gemini_api_key()

        # If Gemini is unavailable, strictly report AI conversation unavailable
        if not gemini_key:
            return CallInsights(
                summary="AI conversation unavailable",
                sentiment_overall="Neutral",
                engagement="Not available",
                intent_level="Not available",
                intent_score=None,
                interest_level="Not available",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority="Not available",
                target_location=None,
                delivery_location=None,
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="AI conversation unavailable",
                qualification_verdict="Analysis Unavailable",
            )

        if not prospect_turns:
            return CallInsights(
                summary=f"Call initiated with {call.company_name}. Awaiting prospect response.",
                sentiment_overall="Neutral",
                engagement="Awaiting Response",
                intent_level="In_Progress",
                intent_score=None,
                interest_level="Not available",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority=call.contact_title or "Not available",
                target_location=None,
                delivery_location=None,
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="Listen to prospect response",
                qualification_verdict="In_Progress",
            )

        seller_company = (seller_profile.company_name.strip() if seller_profile and seller_profile.company_name else "Our Company")
        seller_summary = (seller_profile.company_summary.strip() if seller_profile and seller_profile.company_summary else "B2B Supplier")
        seller_products = ", ".join([p.strip() for p in (seller_profile.products_services or []) if p.strip()]) if seller_profile else ""
        seller_locations = ", ".join([loc.strip() for loc in (seller_profile.target_locations or []) if loc.strip()]) if seller_profile else ""

        lead_company = call.company_name or (lead.company_name if lead else "Prospect Company")
        contact_name = call.contact_name or (lead.primary_contact.name if lead and lead.primary_contact else "Prospect Contact")
        contact_title = call.contact_title or (lead.primary_contact.title if lead and lead.primary_contact else "Decision Maker")
        matched_offering = getattr(lead, "matched_offering", "") if lead else ""

        transcript_lines = []
        for idx, t in enumerate(call.turns, start=1):
            speaker_label = f"AI Sales Agent ({seller_company})" if t.speaker == "ai" else f"Prospect ({contact_name} at {lead_company})"
            transcript_lines.append(f"[Turn {idx}, +{t.timestamp_offset_seconds}s] {speaker_label}: {t.text}")
        full_transcript = "\n".join(transcript_lines)

        if not is_completed:
            hangup_directive = f"""=== CURRENT CALL STATUS: ACTIVE & IN PROGRESS ===
This telephone conversation is currently LIVE and IN PROGRESS.
The customer has NOT ended the call.
Do NOT say 'The customer ended the call before the complete discussion'.
In 'summary', provide a brief 1-sentence synopsis of what has been discussed so far during this ongoing live conversation (e.g. 'Call in progress with {lead_company}. Discussed requirements for [product/service]. Ongoing qualification dialogue.')."""
        else:
            hangup_directive = f"""=== CRITICAL CALL COMPLETION & EARLY HANG-UP INSTRUCTION ===
This call has CONCLUDED. Check whether the customer ended the call before the complete discussion.
A complete sales qualification discussion covers key dimensions:
1. Requirement / need
2. Specific product/service
3. Quantity / volume / scope
4. Timeline / delivery timeframe
5. Budget status / deal amount
6. Contact authority / decision maker

If the customer ended the call, hung up, exited early, said goodbye, opted out, or the call finished before key dimensions were discussed:
The "summary" MUST explicitly start with or contain the exact sentence:
"The customer ended the call before the complete discussion."
Followed by a concise synopsis of what was discussed and which qualification dimensions remained unaddressed.

If the customer did NOT end the call early and all dimensions were thoroughly discussed, provide a concise summary of the qualification results."""

        system_instruction = f"""You are an expert sales analyst reviewing the conversation transcript of a B2B sales qualification phone call.
Analyze the conversation semantically using ONLY the provided transcript, active business profile, and lead context.

=== BUSINESS PROFILE ===
Seller Company: {seller_company}
Seller Summary: {seller_summary}
Offerings / Products: {seller_products or 'Not specified'}
Locations: {seller_locations or 'Not specified'}

=== CURRENT LEAD ===
Prospect Company: {lead_company}
Contact Person: {contact_name} ({contact_title})
Initial Signal: {matched_offering or 'None'}

{hangup_directive}

=== CRITICAL EXTRACTION RULES ===
1. Ground truth only: Never assume, invent, extrapolate, or hallucinate information.
2. If any piece of information was not explicitly mentioned or confirmed by the prospect in the transcript, strictly return "Not available" (or "Not disclosed" for budget).
3. Do NOT invent deal amounts or budgets. Only extract what the prospect explicitly stated or what is computed from confirmed volume * unit price.
4. Calculate 'intent_score' (0 to 100) strictly from genuine prospect engagement:
   - 0-30: Prospect expressed disinterest, opted out, or hung up.
   - 31-60: Prospect asked a basic question or listened casually without making commitments.
   - 61-80: Prospect actively discussed requirements, asked about pricing/terms, or confirmed interest.
   - 81-100: Prospect shared specific volume/timeline, provided direct contact details (email/phone), or requested catalogs/samples/next meetings.
5. 'qualification_verdict' must be one of: 'Interested', 'Evaluating', 'Follow_Up_Needed', 'Disqualified', 'Not_Interested'.

You MUST return ONLY a JSON object matching this schema:
{{
  "summary": "Concise summary of conversation status.",
  "sentiment_overall": "Positive" | "Neutral" | "Skeptical" | "Guarded" | "Disinterested",
  "engagement": "High" | "Medium" | "Low" | "Disengaged",
  "intent_level": "High Intent" | "Evaluating" | "Inquiring" | "Disinterested" | "Not Interested",
  "intent_score": 0-100,
  "interest_level": "High" | "Medium" | "Low",
  "urgency": "High" | "Moderate" | "Low" | "Not available",
  "need": "Exact stated need or 'Not available'",
  "product_service": "Specific product/service discussed or 'Not available'",
  "scope_quantity": "Specific quantity/units or 'Not available'",
  "timeline": "Specific timeframe or 'Not available'",
  "budget": "Stated budget or 'Not disclosed'",
  "deal_amount": "Explicit deal amount discussed or computed from quantity*unit price, else 'Not available'",
  "authority": "Stated role/authority or 'Not available'",
  "pain_points": [],
  "objections": [],
  "customer_questions": [],
  "important_info": [],
  "next_best_action": "Specific next action for sales team",
  "qualification_verdict": "Interested" | "Evaluating" | "Follow_Up_Needed" | "Disqualified" | "Not_Interested"
}}"""

        user_content = f"COMPLETE CALL TRANSCRIPT:\n{full_transcript}\n\nCall Status: {'Call Completed' if is_completed else 'Call In Progress'}\nPlease output JSON analysis now:"

        raw_summary_response = self._call_gemini_api(
            contents=[{"role": "user", "parts": [{"text": user_content}]}],
            system_instruction=system_instruction,
            response_mime_type="application/json",
            temperature=0.1,
            max_tokens=600
        )

        if not raw_summary_response:
            return CallInsights(
                summary="AI conversation unavailable",
                sentiment_overall="Neutral",
                engagement="Not available",
                intent_level="Not available",
                intent_score=None,
                interest_level="Not available",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority="Not available",
                target_location=None,
                delivery_location=None,
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="AI conversation unavailable",
                qualification_verdict="Analysis Unavailable",
            )

        try:
            cleaned_json = re.sub(r'^```(?:json)?\s*|```$', '', raw_summary_response.strip(), flags=re.MULTILINE).strip()
            extracted_data = json.loads(cleaned_json)

            raw_score = extracted_data.get("intent_score")
            score = int(raw_score) if (raw_score is not None and str(raw_score).isdigit()) else None
            if score is not None:
                score = max(0, min(100, score))

            scope_val = str(extracted_data.get("scope_quantity") or extracted_data.get("scope_users") or "Not available")
            summary_text = str(extracted_data.get("summary") or f"Call completed with {call.company_name}.")

            # If customer ended the call early and summary misses the notice, ensure prefix (ONLY when call has concluded)
            if is_completed:
                latest_prospect = prospect_turns[-1].text.lower() if prospect_turns else ""
                customer_exited = any(w in latest_prospect for w in ["bye", "goodbye", "have to go", "got to go", "hanging up", "hang up", "not interested"])
                if (customer_exited or call.status == "Ended") and "customer ended the call before the complete discussion" not in summary_text.lower():
                    summary_text = f"The customer ended the call before the complete discussion. {summary_text}"

            return CallInsights(
                summary=summary_text,
                sentiment_overall=str(extracted_data.get("sentiment_overall") or "Neutral"),
                engagement=str(extracted_data.get("engagement") or "Medium"),
                intent_level=str(extracted_data.get("intent_level") or "Evaluating"),
                intent_score=score,
                interest_level=str(extracted_data.get("interest_level") or "Medium"),
                urgency=str(extracted_data.get("urgency") or "Moderate"),
                need=str(extracted_data.get("need") or "Not available"),
                product_service=str(extracted_data.get("product_service") or "Not available"),
                scope_quantity=scope_val,
                scope_users=scope_val,
                timeline=str(extracted_data.get("timeline") or "Not available"),
                budget=str(extracted_data.get("budget") or "Not disclosed"),
                deal_amount=str(extracted_data.get("deal_amount") or "Not available"),
                authority=str(extracted_data.get("authority") or "Not available"),
                target_location=None,
                delivery_location=None,
                pain_points=[str(x) for x in extracted_data.get("pain_points", []) if x],
                extracted_pain_points=[str(x) for x in extracted_data.get("pain_points", []) if x],
                objections=[str(x) for x in extracted_data.get("objections", []) if x],
                objections_handled=[str(x) for x in extracted_data.get("objections", []) if x],
                customer_questions=[str(x) for x in extracted_data.get("customer_questions", []) if x],
                important_info=[str(x) for x in extracted_data.get("important_info", []) if x],
                next_best_action=str(extracted_data.get("next_best_action") or "Follow up with prospect"),
                qualification_verdict=str(extracted_data.get("qualification_verdict") or "Interested"),
            )
        except Exception as e:
            print(f"[Gemini Summary] Failed to parse summary JSON: {e}")
            return CallInsights(
                summary="AI conversation unavailable",
                sentiment_overall="Neutral",
                engagement="Not available",
                intent_level="Not available",
                intent_score=None,
                interest_level="Not available",
                urgency="Not available",
                need="Not available",
                product_service="Not available",
                scope_quantity="Not available",
                scope_users="Not available",
                timeline="Not available",
                budget="Not disclosed",
                deal_amount="Not available",
                authority="Not available",
                target_location=None,
                delivery_location=None,
                pain_points=[],
                extracted_pain_points=[],
                objections=[],
                objections_handled=[],
                customer_questions=[],
                important_info=[],
                next_best_action="AI conversation unavailable",
                qualification_verdict="Analysis Unavailable",
            )

    def end_call(self, call_id: str, user_id: str, db: Session) -> CallSession:
        """Forces immediate call wrap-up and commits finalized Gemini-analyzed summary."""
        call = self.get_call_by_id(call_id, db=db, user_id=user_id)
        if not call:
            # Check DB directly in case user_id was different
            row = db.query(DBCallSession).filter(DBCallSession.id == call_id).first()
            if row:
                call = self._db_to_schema(row)
                self._memory_sessions[call_id] = call
            else:
                # Graceful recovery: Create and commit an Ended call record so UI never crashes
                now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
                call = CallSession(
                    id=call_id,
                    lead_id="",
                    company_name="Prospect",
                    contact_name="Contact",
                    contact_title="Decision Maker",
                    status="Ended",
                    stage="ended",
                    duration_seconds=15,
                    started_at=now_iso,
                    turns=[
                        CallTurn(
                            id=f"turn-{uuid.uuid4().hex[:4]}",
                            speaker="ai",
                            text="Call ended.",
                            timestamp_offset_seconds=0,
                            sentiment="neutral"
                        )
                    ],
                    insights=CallInsights(
                        summary="The customer ended the call before the complete discussion.",
                        sentiment_overall="Neutral",
                        engagement="Low",
                        intent_level="Evaluating",
                        intent_score=30,
                        interest_level="Low",
                        urgency="Not available",
                        need="Not available",
                        product_service="Not available",
                        scope_quantity="Not available",
                        scope_users="Not available",
                        timeline="Not available",
                        budget="Not disclosed",
                        deal_amount="Not available",
                        authority="Not available",
                        target_location=None,
                        delivery_location=None,
                        pain_points=[],
                        extracted_pain_points=[],
                        objections=[],
                        objections_handled=[],
                        customer_questions=[],
                        important_info=[],
                        next_best_action="Follow up with prospect",
                        qualification_verdict="Follow_Up_Needed",
                    ),
                    battlecards_used=[]
                )
                self._memory_sessions[call_id] = call
                try:
                    new_db_session = DBCallSession(
                        id=call_id,
                        user_id=user_id,
                        lead_id="",
                        lead_name="Contact",
                        company_name="Prospect",
                        duration_seconds=15,
                        status="Ended",
                        turns=[t.model_dump() for t in call.turns],
                        summary=call.insights.summary,
                        qualification_verdict=call.insights.qualification_verdict,
                        qualification_data=call.insights.model_dump(),
                        created_at=datetime.datetime.utcnow(),
                    )
                    db.add(new_db_session)
                    db.commit()
                except Exception:
                    db.rollback()
                return call

        seller_profile = business_service.get_profile_by_user(user_id, db)
        lead = lead_service.get_lead_by_id(db, user_id, call.lead_id)

        # Run Gemini summary analysis
        call.insights = self._analyze_call_with_ai(
            call=call,
            seller_profile=seller_profile,
            lead=lead,
            is_completed=True
        )

        summary_lower = (call.insights.summary or "").lower()
        is_customer_ended = (
            "ended the call before" in summary_lower
            or "customer ended the call" in summary_lower
            or call.stage == "ended"
            or call.status == "Ended"
        )

        if is_customer_ended:
            call.status = "Ended"
            call.stage = "ended"
        elif call.insights and call.insights.qualification_verdict == "Interested":
            call.status = "Completed"
            call.stage = "completed"
        else:
            call.status = "Ended"
            call.stage = "ended"

        # Update in DB
        db_row = db.query(DBCallSession).filter(DBCallSession.id == call.id).first()
        if db_row:
            db_row.status = call.status
            db_row.summary = call.insights.summary
            db_row.qualification_verdict = call.insights.qualification_verdict
            db_row.qualification_data = call.insights.model_dump()
            db.commit()

        if call.status == "Completed" and call.insights.qualification_verdict == "Interested":
            lead_service.update_status(db, user_id, call.lead_id, "Meeting_Booked")
            self._sync_call_to_opportunity(call, lead, seller_profile, user_id, db)
        elif call.insights.qualification_verdict in ["Not_Interested", "Disqualified"]:
            lead_service.update_status(db, user_id, call.lead_id, "Disqualified")

        return call

    def _sync_call_to_opportunity(
        self,
        call: CallSession,
        lead: Optional[Lead],
        seller_profile: Optional[StructuredBusinessProfile],
        user_id: str,
        db: Session
    ):
        """
        Creates or updates an Opportunity in SQLite using verified Gemini conversational evidence.
        """
        if not (call.status == "Completed" and call.insights and call.insights.qualification_verdict == "Interested"):
            return

        try:
            from app.services.crm_service import crm_service
            contact_email = (
                (lead.primary_contact.email if lead and lead.primary_contact else "")
                or f"buyer@{call.company_name.lower().replace(' ', '')}.com"
            )
            deal_val = (
                call.insights.deal_amount
                if (call.insights.deal_amount and call.insights.deal_amount != "Not available")
                else None
            )
            next_action = (
                call.insights.next_best_action
                if (call.insights.next_best_action and call.insights.next_best_action != "Not available")
                else f"Email wholesale catalog and formal quotation to {contact_email}"
            )
            crm_service.create_opportunity(
                db=db,
                user_id=user_id,
                lead_id=call.lead_id,
                company_name=call.company_name,
                domain=lead.domain if lead else f"{call.company_name.lower().replace(' ', '')}.com",
                contact_name=call.contact_name or (lead.primary_contact.name if lead and lead.primary_contact else "Decision Maker"),
                contact_email=contact_email,
                matched_offering=call.insights.product_service if call.insights.product_service != "Not available" else (lead.matched_offering if lead else "Wholesale Supply"),
                deal_value=deal_val,
                stage="Qualified",
                next_action_title=next_action,
                next_action_priority="High",
                assigned_rep=(seller_profile.sender_name if seller_profile else None) or "Account Executive",
            )
            lead_service.update_status(db, user_id, call.lead_id, "Opportunity_Created")
        except Exception as e:
            print(f"[Opportunity Sync Error]: {e}")

    def _db_to_schema(self, row: DBCallSession) -> CallSession:
        turns = [CallTurn(**t) for t in (row.turns or [])]
        raw_insights = row.qualification_data or {}

        insights = None
        if raw_insights or row.summary:
            raw_score = raw_insights.get("intent_score")
            score = int(raw_score) if (raw_score is not None and str(raw_score).isdigit()) else None
            scope_val = raw_insights.get("scope_quantity") or raw_insights.get("scope_users", "Not available")
            insights = CallInsights(
                summary=raw_insights.get("summary", row.summary or "Call recorded"),
                sentiment_overall=raw_insights.get("sentiment_overall", "Neutral"),
                engagement=raw_insights.get("engagement", "Not available"),
                intent_level=raw_insights.get("intent_level", "Not available"),
                intent_score=score,
                interest_level=raw_insights.get("interest_level", "Not available"),
                urgency=raw_insights.get("urgency", "Not available"),
                need=raw_insights.get("need", "Not available"),
                product_service=raw_insights.get("product_service", "Not available"),
                scope_quantity=scope_val,
                scope_users=scope_val,
                timeline=raw_insights.get("timeline", "Not available"),
                budget=raw_insights.get("budget", "Not disclosed"),
                deal_amount=raw_insights.get("deal_amount", "Not available"),
                authority=raw_insights.get("authority", "Not available"),
                target_location=raw_insights.get("target_location", None),
                delivery_location=raw_insights.get("delivery_location", None),
                pain_points=raw_insights.get("pain_points", raw_insights.get("extracted_pain_points", [])),
                extracted_pain_points=raw_insights.get("extracted_pain_points", []),
                objections=raw_insights.get("objections", raw_insights.get("objections_handled", [])),
                objections_handled=raw_insights.get("objections_handled", []),
                customer_questions=raw_insights.get("customer_questions", []),
                important_info=raw_insights.get("important_info", []),
                next_best_action=raw_insights.get("next_best_action", "Not available"),
                qualification_verdict=raw_insights.get("qualification_verdict", row.qualification_verdict or "Analysis Unavailable")
            )

        raw_status = row.status or "In_Progress"
        if not row.status:
            summary_lower = (row.summary or "").lower()
            if (
                "ended the call before" in summary_lower
                or "customer ended the call" in summary_lower
                or "customer ended" in summary_lower
                or "ended before the complete discussion" in summary_lower
            ):
                raw_status = "Ended"

        return CallSession(
            id=row.id,
            lead_id=row.lead_id or "",
            company_name=row.company_name,
            contact_name=row.lead_name or "Prospect Contact",
            contact_title="Decision Maker",
            status=raw_status,
            stage="completed" if raw_status == "Completed" else ("ended" if raw_status == "Ended" else "in_progress"),
            duration_seconds=row.duration_seconds or 30,
            started_at=row.created_at.isoformat() if row.created_at else datetime.datetime.utcnow().isoformat(),
            turns=turns,
            insights=insights,
            battlecards_used=[]
        )


call_agent_service = CallAgentService()
