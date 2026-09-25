'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
  Calendar,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Database,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CallSession, Lead, StructuredBusinessProfile, Opportunity } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

export default function AICallingPage() {
  const [sessions, setSessions] = useState<CallSession[]>([]);
  const [activeSession, setActiveSession] = useState<CallSession | null>(null);
  const [prospectInput, setProspectInput] = useState('');
  const [loadingStep, setLoadingStep] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sellerProfile, setSellerProfile] = useState<StructuredBusinessProfile | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [creatingOpp, setCreatingOpp] = useState(false);
  const [syncingCRM, setSyncingCRM] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Audio & Voice State (100% Browser-Native SpeechSynthesis API en-IN)
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Indian English (en-IN)');
  const [speakingRate, setSpeakingRate] = useState<number>(1.08);
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const liveChatContainerRef = useRef<HTMLDivElement>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Helper to discover and attach the most natural Indian English female voice
  const resolveIndianVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Filter to find best Indian English natural voice, prioritizing female conversational tone
    const scored = voices.map((v) => {
      let score = 0;
      const lang = (v.lang || '').replace('_', '-').toLowerCase();
      const name = (v.name || '').toLowerCase();

      // Check locale match: en-IN
      const isIndianLang = lang === 'en-in' || lang.startsWith('en-in');
      if (isIndianLang) score += 60;
      else if (name.includes('india') || name.includes('hindi')) score += 35;

      // Female conversational voice preference: Heera, Neerja, Swara, Kalpana, Veena, Lekha, etc.
      const isFemale = [
        'heera',
        'neerja',
        'swara',
        'kalpana',
        'veena',
        'lekha',
        'kavya',
        'female',
        'woman',
        'girl',
        'zira',
      ].some((k) => name.includes(k));

      if (isFemale) score += 50;

      // Prefer high-fidelity Natural / Online models
      if (name.includes('natural')) score += 30;
      if (name.includes('online')) score += 15;

      // Other Indian voices if female not directly detected (Ravi, Prabhat, etc.)
      const isKnownIndianVoice = ['ravi', 'prabhat', 'rishi'].some((k) => name.includes(k));
      if (isKnownIndianVoice) score += 20;

      return { voice: v, score };
    });

    // Sort by highest score descending
    scored.sort((a, b) => b.score - a.score);
    const topMatch = scored[0]?.voice;

    if (topMatch) {
      selectedVoiceRef.current = topMatch;
      setSelectedVoiceName(topMatch.name || 'Indian English (en-IN)');
    }
  };

  // Check Web Speech API Support on Client & Bind Indian Accent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        setSpeechSupported(true);
        resolveIndianVoice();
        window.speechSynthesis.onvoiceschanged = resolveIndianVoice;
      }
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setRecognitionSupported(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-IN'; // Indian English acoustic language model

        recog.onresult = (event: any) => {
          const spokenText = event.results[0][0].transcript;
          setProspectInput(spokenText);
          setIsListening(false);
        };

        recog.onerror = () => {
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const fetchOpportunities = async () => {
    try {
      const opps = await api.getOpportunities();
      setOpportunities(opps);
    } catch (err) {
      console.error('Failed to load opportunities:', err);
    }
  };

  // Load Sessions, Leads, Opportunities, and Profile on Mount
  useEffect(() => {
    api.getCallSessions().then((data) => {
      setSessions(data);
      if (data.length > 0) setActiveSession(data[0]);
    });
    api.getLeads().then((data) => {
      setLeads(data);
    });
    api.getStructuredBusinessProfile().then((profile) => {
      setSellerProfile(profile);
    });
    fetchOpportunities();
  }, []);

  // Auto-scroll transcript when turns change and transcript is visible
  useEffect(() => {
    if (showTranscript && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.turns, showTranscript]);

  const TEST_VOICE_PROMPT =
    "Hello, am I speaking with the right person? I'm calling to understand your requirements and see how we can help.";

  // Test native voice playback with user test prompt
  const handleTestVoice = () => {
    if (isMuted) setIsMuted(false);
    speakAITurn(TEST_VOICE_PROMPT);
  };

  // Browser-native SpeechSynthesis: natural conversational pacing, en-IN voice, rate 1.08, pitch 1.0, zero pause lag
  const speakAITurn = (text: string) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Immediately cancel previous utterance to prevent queuing delays or long pauses
    window.speechSynthesis.cancel();

    // Ensure speech synthesis is in active running state (fixes Chromium idle pause bug)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    if (!selectedVoiceRef.current) {
      resolveIndianVoice();
    }

    // Clean text to enforce short, natural conversational pauses and professional delivery
    const cleanText = text
      .replace(/[*_~`#]/g, '') // remove markdown artifacts
      .replace(/\.{2,}/g, '.') // collapse ellipses (...) to single dot to prevent long pauses
      .replace(/[—–]/g, ', ') // replace dashes with comma for brief, natural pause
      .replace(/;\s*/g, ', ') // replace semicolons with comma
      .replace(/:\s*/g, ', ') // replace colons with comma
      .replace(/\s+/g, ' ') // collapse multi-spaces and newlines into single spaces
      .trim();

    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Voice requirements:
      // Speed: around 1.05–1.10 (default 1.08)
      // Pitch: 1.0 (natural)
      // Style: professional + conversational
      // Pauses: short and natural
      utterance.rate = speakingRate;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';

      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }

      // Retain utterance reference to prevent Chromium garbage collection cutting off audio
      activeUtteranceRef.current = utterance;
      utterance.onend = () => {
        activeUtteranceRef.current = null;
      };
      utterance.onerror = (e) => {
        console.warn('Speech synthesis playback error:', e);
        activeUtteranceRef.current = null;
      };

      // Native browser speech delivery
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  // Toggle Microphone Listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech recognition error:', err);
      }
    }
  };

  // Start Call on Lead
  const handleStartCall = async (leadId: string) => {
    try {
      const newSession = await api.startCall(leadId);
      setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
      setActiveSession(newSession);

      // Speak opening greeting
      if (newSession.turns && newSession.turns.length > 0) {
        speakAITurn(newSession.turns[0].text);
      }
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  };

  // Send Prospect Step Response
  const handleSendResponse = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : prospectInput).trim();
    if (!activeSession || !textToSend) return;

    setLoadingStep(true);
    try {
      const updated = await api.stepCall(activeSession.id, textToSend);
      setActiveSession(updated);
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setProspectInput('');

      // Speak latest AI turn
      const lastTurn = updated.turns[updated.turns.length - 1];
      if (lastTurn && lastTurn.speaker === 'ai') {
        speakAITurn(lastTurn.text);
      }
    } catch (err) {
      console.error('Failed step:', err);
    } finally {
      setLoadingStep(false);
    }
  };

  // End Call & Commit BANT Summary
  const handleEndCall = async () => {
    if (!activeSession) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    try {
      const finalized = await api.endCall(activeSession.id);
      setActiveSession(finalized);
      setSessions((prev) =>
        prev.map((s) => (s.id === finalized.id ? finalized : s))
      );
      await fetchOpportunities();
    } catch (err) {
      console.warn('Handling call wrap-up on error:', err);
      // Ensure the UI transitions safely to ended state
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              status: 'Ended',
              stage: 'ended',
              insights: prev.insights || {
                summary: 'The customer ended the call before the complete discussion.',
                qualification_verdict: 'Follow_Up_Needed',
              } as any,
            }
          : null
      );
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, status: 'Ended', stage: 'ended' }
            : s
        )
      );
    }
  };

  // 1-Click Promote Call to Opportunity in SQLite
  const handleCreateOpportunity = async () => {
    if (!activeSession) return;
    setCreatingOpp(true);
    setActionMessage(null);
    try {
      const newOpp = await api.createOpportunityFromCall(activeSession.id);
      await fetchOpportunities();
      setActionMessage(`✓ Opportunity created for ${newOpp.company_name} in SQLite!`);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to create opportunity:', err);
      setActionMessage(`Error creating opportunity: ${err.message || 'Failed'}`);
    } finally {
      setCreatingOpp(false);
    }
  };

  // 1-Click Push to CRM
  const handleExportCRM = async (oppId: string) => {
    setSyncingCRM(true);
    setActionMessage(null);
    try {
      await api.exportToCRM(oppId, 'HubSpot');
      await fetchOpportunities();
      setActionMessage('✓ Successfully synced opportunity with HubSpot CRM!');
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to sync CRM:', err);
      setActionMessage(`CRM sync error: ${err.message || 'Failed'}`);
    } finally {
      setSyncingCRM(false);
    }
  };

  const activeOpportunity = opportunities.find(
    (o) =>
      (activeSession?.lead_id && o.lead_id === activeSession.lead_id) ||
      (activeSession?.company_name && o.company_name.toLowerCase() === activeSession.company_name.toLowerCase())
  );

  // Dynamic quick responses tailored to qualification dialogue
  const currentStage = activeSession?.stage || 'greeting';
  const lastAITurn =
    activeSession?.turns
      ?.slice()
      ?.reverse()
      ?.find((t) => t.speaker === 'ai') || null;

  // Helper to determine status category of any call session: 'in_progress', 'ended', or 'completed'
  const getCallSessionStatus = (s?: CallSession | null): 'in_progress' | 'ended' | 'completed' => {
    if (!s) return 'in_progress';

    const normalizedStatus = (s.status || '').toLowerCase();
    const normalizedStage = (s.stage || '').toLowerCase();

    // 1. Explicit in-progress calls stay in-progress
    if (normalizedStatus === 'in_progress' && normalizedStage !== 'ended' && normalizedStage !== 'completed') {
      return 'in_progress';
    }

    // 2. Explicit ended calls
    if (normalizedStatus === 'ended' || normalizedStage === 'ended') {
      return 'ended';
    }

    // 3. Explicit completed calls
    if (normalizedStatus === 'completed' || normalizedStage === 'completed') {
      return 'completed';
    }

    // 4. Fallback for legacy calls without explicit status
    const summary = (s.insights?.summary || '').toLowerCase();
    if (
      summary.includes('ended the call') ||
      summary.includes('ended before the complete discussion') ||
      summary.includes('customer ended')
    ) {
      return 'ended';
    }

    return 'in_progress';
  };

  const activeStatusType = getCallSessionStatus(activeSession);
  const isCallActive = activeStatusType === 'in_progress';

  // Scroll strictly inside the inner chat container only — never scroll the whole window/page down
  useEffect(() => {
    if (liveChatContainerRef.current) {
      liveChatContainerRef.current.scrollTop = liveChatContainerRef.current.scrollHeight;
    }
  }, [activeSession?.turns?.length]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-indigo-600" />
            <span>AI Calling & Sales Qualification Console</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browser-based AI voice agent: turn-by-turn BANT qualification, real-time objection handling, and automated meeting scheduling.
          </p>
        </div>

        {/* Audio Mode Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Browser Voice Engine: Ready (TTS & Speech Recognition)</span>
          </div>
        </div>
      </div>

      {/* Main Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Lead Launcher & Call Sessions (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Launch on Active Pipeline Leads */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Launch Outreach to Pipeline Leads</span>
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                No active leads in pipeline. Discover leads in Step 3 to launch calls.
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3 rounded-xl border border-slate-200/80 hover:border-indigo-300 flex items-center justify-between hover:bg-slate-50/80 transition-all text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{lead.company_name}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {lead.matched_offering || lead.industry || 'Technology'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartCall(lead.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs shrink-0 transition-all text-xs"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Call</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past & Active Call Sessions History */}
          <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Call Sessions ({sessions.length})</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No call sessions recorded yet.
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = activeSession?.id === s.id;
                  const statusType = getCallSessionStatus(s);

                  return (
                    <div
                      key={s.id}
                      onClick={() => setActiveSession(s)}
                      className={`p-3.5 cursor-pointer text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate">{s.company_name}</span>
                        {statusType === 'in_progress' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            ● Live Call
                          </span>
                        ) : statusType === 'ended' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-semibold">
                            Ended
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Completed
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-1">
                        Contact: {s.contact_name} ({s.contact_title})
                      </div>
                      {s.insights?.need && s.insights.need !== 'Not available' && (
                        <div className="text-indigo-700 font-medium text-[11px] mt-1 truncate">
                          Need: {s.insights.need}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Call Screen / Post-Call Summary (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeSession ? (
            <div className="space-y-6">
              {/* SPECIFICATION UI: Call Screen Box */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 relative overflow-hidden">
                {/* Top Status Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-indigo-100 shadow-xs bg-white shrink-0">
                      <img src="/logo.png" alt="AI Sales Agent" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-600">
                      AI SALES AGENT
                    </span>
                  </div>

                  {/* Connected Status Indicator */}
                  {activeStatusType === 'in_progress' ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>● CALL CONNECTED</span>
                    </div>
                  ) : activeStatusType === 'ended' ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-300 text-xs font-bold">
                      <PhoneOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>CALL ENDED</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>CALL COMPLETED</span>
                    </div>
                  )}
                </div>

                {/* Main Call Subject / Current Turn Banner */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-6 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="relative w-16 h-16 rounded-2xl p-1 bg-white shadow-md border border-indigo-100 flex items-center justify-center">
                      <img src="/logo.png" alt="AI Agent Voice" className="w-full h-full object-cover rounded-xl" />
                      {isCallActive && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {isCallActive ? 'AI Sales Agent Speaking' : activeStatusType === 'ended' ? 'Call Ended' : 'Call Completed'}
                  </div>
                  <div className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed max-w-2xl mx-auto">
                    &ldquo;{lastAITurn?.text || (activeStatusType === 'ended' ? 'Call ended.' : 'Connecting call...')}&rdquo;
                  </div>

                  {/* Listening Indicator */}
                  {isCallActive && (
                    <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      <span>🎙 {isListening ? 'Listening to your microphone...' : 'Awaiting Prospect Response...'}</span>
                    </div>
                  )}
                </div>

                {/* Call Action Bar: Mute / End Call / Voice controls */}
                {isCallActive && (
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-700">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Voice: {selectedVoiceName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestVoice}
                        title="Test with: Hello, am I speaking with the right person? I'm calling to understand your requirements and see how we can help."
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Test Voice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSpeakingRate((prev) => {
                            if (prev === 1.08) return 1.05;
                            if (prev === 1.05) return 1.10;
                            return 1.08;
                          });
                        }}
                        title="Click to adjust voice speed (1.05x, 1.08x, 1.10x)"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{speakingRate}x Speed</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMuted((prev) => {
                            const next = !prev;
                            if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                            }
                            return next;
                          });
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                          isMuted
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                        }`}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isMuted ? 'Muted' : 'Voice On'}</span>
                      </button>

                      {recognitionSupported && (
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                            isListening
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                          }`}
                        >
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isListening ? 'Listening...' : 'Speak Mic'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleEndCall}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 transition-all"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>End Call</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Prospect Response Input */}
                {isCallActive && (
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type prospect response or speak with microphone..."
                        value={prospectInput}
                        onChange={(e) => setProspectInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendResponse()}
                        className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendResponse()}
                        disabled={loadingStep || !prospectInput.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-all shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{loadingStep ? 'Responding...' : 'Send'}</span>
                      </button>
                    </div>

                    {/* Quick Qualification Response Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Quick Prompts:</span>
                      {[
                        "We need 500 pieces of Modal Silk Sarees",
                        "Delivery by next month",
                        "Our target price is ₹750 per piece",
                        "Can I speak with a human or schedule a meeting?",
                        "I am the store owner and buyer",
                        "Send catalog to info@boutique.com",
                        "Where is your factory located?",
                        "Sorry, I have to go now, bye",
                      ].map((promptText, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleSendResponse(promptText)}
                          disabled={loadingStep}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                            promptText.includes("bye")
                              ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                              : promptText.includes("human") || promptText.includes("schedule")
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-semibold"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                          }`}
                        >
                          {promptText}
                        </button>
                      ))}
                    </div>

                    {/* LIVE CHAT CONVERSATION DIRECTLY AFTER QUICK PROMPTS DURING CALL */}
                    {activeSession.turns && activeSession.turns.length > 0 && (
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              Live Conversation
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10.5px] font-bold border border-indigo-100">
                              {activeSession.turns.length} Turn{activeSession.turns.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            Updates automatically as dialogue progresses
                          </span>
                        </div>

                        <div
                          ref={liveChatContainerRef}
                          className="space-y-3 max-h-[340px] overflow-y-auto pr-2 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80"
                        >
                          {activeSession.turns.map((t, index) => {
                            const isAI = t.speaker === 'ai';
                            const hasCalendlyMention =
                              isAI &&
                              (t.text.toLowerCase().includes('calendly') ||
                               t.text.toLowerCase().includes('booking link') ||
                               t.text.toLowerCase().includes('schedule') ||
                               t.text.toLowerCase().includes('timeslot'));

                            return (
                              <div
                                key={t.id || index}
                                className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}
                              >
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">
                                  {isAI && (
                                    <div className="w-4 h-4 rounded-full overflow-hidden border border-indigo-200 shrink-0">
                                      <img src="/logo.png" alt="AI" className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <span>{isAI ? 'AI Sales Agent' : (activeSession.contact_name || 'Prospect')}</span>
                                  <span>•</span>
                                  <span>+{t.timestamp_offset_seconds}s</span>
                                </div>
                                <div
                                  className={`p-3 rounded-2xl max-w-lg text-xs leading-relaxed ${
                                    isAI
                                      ? 'bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-2xs'
                                      : 'bg-indigo-600 text-white rounded-tr-none shadow-2xs'
                                  }`}
                                >
                                  <div>{t.text}</div>

                                  {/* Interactive Calendly Card if AI shared link */}
                                  {hasCalendlyMention && (
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 bg-indigo-50/70 -mx-1 -mb-1 p-2.5 rounded-xl border border-indigo-100">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                          <Calendar className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-slate-900 text-[11px]">Book Human Team Meeting</div>
                                          <div className="text-[10px] text-slate-500 truncate">Choose a live timeslot</div>
                                        </div>
                                      </div>
                                      <a
                                        href={sellerProfile?.calendly_url || 'https://calendly.com/siyarang-bandhej/wholesale-consultation'}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-2xs shrink-0 transition-all cursor-pointer"
                                      >
                                        <span>Open Calendly</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* POST-CALL SUMMARY CARD (AI-Based Semantic Analysis) */}
              {activeSession.insights && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs font-bold tracking-widest uppercase text-slate-400">
                        AI CALL ANALYSIS & QUALIFICATION
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                        {activeSession.company_name} — Qualification Verdict
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${
                          activeSession.insights.qualification_verdict === 'Interested'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : activeSession.insights.qualification_verdict === 'Evaluating' || activeSession.insights.qualification_verdict === 'Follow_Up_Needed'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : activeSession.insights.qualification_verdict === 'Not_Interested' || activeSession.insights.qualification_verdict === 'Disqualified'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {activeSession.insights.qualification_verdict || 'Analysis Unavailable'}
                      </span>
                    </div>
                  </div>

                  {/* BANT Qualification Metric Badges */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Intent Score
                      </span>
                      {activeSession.insights.intent_score !== null && activeSession.insights.intent_score !== undefined ? (
                        <span
                          className={`text-lg font-bold mt-0.5 block ${
                            activeSession.insights.intent_score >= 80
                              ? 'text-emerald-600'
                              : activeSession.insights.intent_score >= 50
                              ? 'text-indigo-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {activeSession.insights.intent_score}/100
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 mt-1 block">
                          N/A (No LLM key)
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Need / Requirement
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                        {activeSession.insights.need || 'Not available'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Quantity / Scope
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                        {activeSession.insights.scope_quantity || activeSession.insights.scope_users || 'Not available'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Timeline
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                        {activeSession.insights.timeline || 'Not available'}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Details: Product, Budget, Deal Amount, Authority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Product / Service:</div>
                      <div className="text-slate-900 font-bold truncate">
                        {activeSession.insights.product_service || 'Not available'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Budget Status:</div>
                      <div className="text-slate-900 font-mono font-medium truncate">
                        {activeSession.insights.budget || 'Not disclosed'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Deal Amount:</div>
                      <div className="text-slate-900 font-mono font-medium truncate">
                        {activeSession.insights.deal_amount || 'Not available'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Contact Authority:</div>
                      <div className="text-slate-900 font-medium truncate">
                        {activeSession.insights.authority || 'Not available'}
                      </div>
                    </div>
                  </div>

                  {/* Extracted Customer Questions & Objections if present */}
                  {((activeSession.insights.customer_questions && activeSession.insights.customer_questions.length > 0) ||
                    (activeSession.insights.objections && activeSession.insights.objections.length > 0) ||
                    (activeSession.insights.important_info && activeSession.insights.important_info.length > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      {activeSession.insights.customer_questions && activeSession.insights.customer_questions.length > 0 && (
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="font-bold text-slate-700">Questions Asked by Prospect:</div>
                          <ul className="space-y-1 text-slate-600 list-disc list-inside">
                            {activeSession.insights.customer_questions.map((q, i) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeSession.insights.objections && activeSession.insights.objections.length > 0 && (
                        <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                          <div className="font-bold text-amber-900">Objections / Concerns:</div>
                          <ul className="space-y-1 text-amber-800 list-disc list-inside">
                            {activeSession.insights.objections.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeSession.insights.important_info && activeSession.insights.important_info.length > 0 && (
                        <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-2 md:col-span-2">
                          <div className="font-bold text-blue-900">Important Information & Notes:</div>
                          <ul className="space-y-1 text-blue-800 list-disc list-inside">
                            {activeSession.insights.important_info.map((info, i) => (
                              <li key={i}>{info}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next Best Action */}
                  <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider">Next Best Action:</div>
                      <div className="text-emerald-800 font-semibold text-sm mt-0.5 flex items-center gap-1.5">
                        <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{activeSession.insights.next_best_action || 'Not available'}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Call Overview Note */}
                  <div
                    className={`text-xs p-4 rounded-xl border leading-relaxed ${
                      activeSession.insights.summary?.toLowerCase().includes('customer ended the call before the complete discussion')
                        ? 'bg-amber-50/80 border-amber-300/80 text-amber-950'
                        : 'bg-slate-50 border-slate-200/80 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {activeSession.insights.summary?.toLowerCase().includes('customer ended the call before the complete discussion') && (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-0.5"></span>
                      )}
                      <span className={activeSession.insights.summary?.toLowerCase().includes('customer ended the call before the complete discussion') ? 'text-amber-900' : 'text-slate-800'}>
                        AI Call Summary:
                      </span>
                    </div>
                    <span>{activeSession.insights.summary}</span>
                  </div>

                  {/* ACTION STATUS TOAST */}
                  {actionMessage && (
                    <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{actionMessage}</span>
                      </div>
                      <button
                        onClick={() => setActionMessage(null)}
                        className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* CRM OPPORTUNITY STATUS & ACTION CARD */}
                  <div className="border-t border-slate-100 pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                            SQLite CRM Pipeline & Opportunity
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {activeOpportunity
                              ? 'Active opportunity record confirmed in database'
                              : 'Qualified call ready for promotion into sales pipeline'}
                          </p>
                        </div>
                      </div>

                      {activeOpportunity ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Opportunity Created
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Not in Pipeline
                        </span>
                      )}
                    </div>

                    {activeOpportunity ? (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Deal Value</span>
                            <span className="font-bold text-slate-900 font-mono text-sm mt-0.5 block">
                              {activeOpportunity.deal_value_estimate ||
                                (activeOpportunity.deal_value
                                  ? `₹${activeOpportunity.deal_value.toLocaleString()}`
                                  : 'Not available')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Stage</span>
                            <span className="font-bold text-indigo-700 text-xs mt-0.5 block">
                              {activeOpportunity.stage}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Rep</span>
                            <span className="font-medium text-slate-800 text-xs mt-0.5 block truncate">
                              {activeOpportunity.assigned_rep || 'Account Executive'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">CRM Handoff</span>
                            <span className="text-xs font-semibold mt-0.5 block">
                              {activeOpportunity.crm_synced ? (
                                <span className="text-emerald-700 font-bold">
                                  ✓ Synced ({activeOpportunity.crm_target || 'HubSpot'})
                                </span>
                              ) : (
                                <span className="text-amber-700 font-medium">Pending Sync</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {activeOpportunity.next_action && (
                          <div className="text-xs pt-1 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <span className="text-slate-500">
                              Next: <strong className="text-slate-800">{activeOpportunity.next_action.title}</strong>
                            </span>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200/60 flex-wrap">
                          <div className="text-[11px] text-slate-500 font-mono">
                            Record ID: {activeOpportunity.id}{' '}
                            {activeOpportunity.crm_record_id && `• CRM: #${activeOpportunity.crm_record_id}`}
                          </div>

                          {!activeOpportunity.crm_synced ? (
                            <button
                              type="button"
                              onClick={() => handleExportCRM(activeOpportunity.id)}
                              disabled={syncingCRM}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{syncingCRM ? 'Syncing to HubSpot...' : 'Push to HubSpot CRM'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 border border-emerald-300 px-3 py-1 rounded-lg flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Synced with {activeOpportunity.crm_target}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-center justify-between gap-4 flex-wrap">
                        <div className="text-xs text-slate-600 max-w-md">
                          {activeSession.insights.qualification_verdict === 'Interested' ? (
                            <span>
                              The prospect indicated buying interest and requirements. Click below to register an
                              official Opportunity record in SQLite.
                            </span>
                          ) : (
                            <span>
                              Promote this prospect directly to a qualified Opportunity in SQLite for CRM tracking.
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleCreateOpportunity}
                          disabled={creatingOpp}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>{creatingOpp ? 'Creating Opportunity...' : 'Create CRM Opportunity'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Turn-by-Turn Conversation Transcript (Shown at the LAST when call completed or ended, so user can check again) */}
              {!isCallActive && activeSession.turns && activeSession.turns.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setShowTranscript((prev) => !prev)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50/80 transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <span>Full Conversation Transcript</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            {activeSession.turns.length} Turns
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {showTranscript ? 'Click to collapse conversation history' : 'Click to check and review the complete turn-by-turn chat history'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        Duration: {activeSession.duration_seconds}s
                      </span>
                      <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all">
                        <span>{showTranscript ? 'Hide Chat' : 'Check Chat Again'}</span>
                        {showTranscript ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                    </div>
                  </button>

                {showTranscript && (
                  <div className="border-t border-slate-100 p-6 pt-4 space-y-4 bg-slate-50/30">
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 pt-1">
                      {activeSession.turns.map((t, index) => {
                        const isAI = t.speaker === 'ai';
                        return (
                          <div
                            key={t.id || index}
                            className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-1">
                              {isAI && (
                                <div className="w-4 h-4 rounded-full overflow-hidden border border-indigo-200 shrink-0">
                                  <img src="/logo.png" alt="AI" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <span>{isAI ? 'AI Sales Agent' : activeSession.contact_name}</span>
                              <span>•</span>
                              <span>+{t.timestamp_offset_seconds}s</span>
                            </div>
                            <div
                              className={`p-3.5 rounded-2xl max-w-xl text-xs leading-relaxed ${
                                isAI
                                  ? 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/80'
                                  : 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                              }`}
                            >
                              {t.text}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={transcriptEndRef} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50/50 border border-indigo-100 p-2 mx-auto mb-3 flex items-center justify-center shadow-xs">
                <img src="/logo.png" alt="AI Sales Agent" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="font-bold text-slate-700 text-sm">No Call Session Selected</div>
              <div className="text-slate-500 mt-1">
                Select an active lead from the left column and click &ldquo;Call&rdquo; to begin a dynamic qualification demo.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
