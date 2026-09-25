'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Sparkles,
  UploadCloud,
  FileText,
  X,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Layers,
  Users,
  Globe2,
  Tags,
  Radar,
  RefreshCw,
  Save,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Mail,
  Key,
  Send,
  Lock,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { StructuredBusinessProfile } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';

const EmailConfigurationGuide: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/80 rounded-xl border border-indigo-200/90 p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
            <Key className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              How to Configure Google App Password (4 Simple Steps)
            </h4>
            <p className="text-[10.5px] text-slate-500">
              Required by Google for automated SMTP inbox delivery without exposing personal passwords
            </p>
          </div>
        </div>
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold shadow-2xs transition-all hover:border-indigo-300 cursor-pointer"
        >
          <span>Open Google App Passwords</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-start gap-2.5 bg-white/95 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
            1
          </span>
          <div>
            <strong className="text-slate-800 text-[11px] block">Turn ON 2-Step Verification</strong>
            <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
              Open{' '}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 underline font-medium"
              >
                Google Security
              </a>{' '}
              and confirm 2-Step Verification is active on your Google account.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-white/95 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
            2
          </span>
          <div>
            <strong className="text-slate-800 text-[11px] block">Go to App Passwords Page</strong>
            <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
              Visit{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 underline font-bold"
              >
                myaccount.google.com/apppasswords
              </a>
              .
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-white/95 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
            3
          </span>
          <div>
            <strong className="text-slate-800 text-[11px] block">
              Create Password for &ldquo;Sales Agent&rdquo;
            </strong>
            <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
              Under <em>App name</em>, enter{' '}
              <code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-slate-800 font-bold">
                Sales Agent
              </code>{' '}
              and click <strong>Create</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-white/95 p-3 rounded-lg border border-slate-200/80 shadow-2xs">
          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
            4
          </span>
          <div>
            <strong className="text-slate-800 text-[11px] block">Copy & Paste 16-Letter Code</strong>
            <p className="text-slate-500 text-[10.5px] leading-relaxed mt-0.5">
              Copy the yellow box 16-letter code (e.g.{' '}
              <span className="font-mono font-bold text-slate-700">abcd efgh ijkl mnop</span>) and paste
              it into the password field below.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10.5px] text-slate-600 bg-white/70 px-3 py-2 rounded-lg border border-slate-200/60">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>
          <strong>Why not standard password?</strong> Google blocks third-party automated logins with{' '}
          <em>535 BadCredentials</em>. The 16-letter App Password ensures emails land safely in
          customers&apos; primary inboxes.
        </span>
      </div>
    </div>
  );
};

export default function BusinessProfilePage() {
  const { updateUser } = useAuth();

  // Form Inputs
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [calendlyUrl, setCalendlyUrl] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [productsServices, setProductsServices] = useState('');
  const [targetIndustries, setTargetIndustries] = useState('');
  const [targetLocations, setTargetLocations] = useState('');
  const [idealCustomerProfile, setIdealCustomerProfile] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [profile, setProfile] = useState<StructuredBusinessProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<StructuredBusinessProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Real Email Dispatch Testing State
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showEmailGuide, setShowEmailGuide] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTestEmail = async () => {
    const target = testEmailTarget.trim() || editForm?.sender_email || profile?.sender_email || 'jiyacrafthub@gmail.com';
    setIsTestingEmail(true);
    setTestEmailResult(null);
    try {
      const res = await api.testEmailConnection({
        recipient_email: target,
        sender_email: editForm?.sender_email || profile?.sender_email,
        smtp_password: editForm?.smtp_password || profile?.smtp_password,
        smtp_port: editForm?.smtp_port || profile?.smtp_port || 465,
        smtp_host: editForm?.smtp_host || profile?.smtp_host || 'smtp.gmail.com',
      });
      setTestEmailResult(res);
      if (res.success) {
        api.getStructuredBusinessProfile().then((data) => {
          if (data) setProfile(data);
        });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'SMTP connection failed.' });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Load existing profile on mount
  useEffect(() => {
    api.getStructuredBusinessProfile().then((data) => {
      setProfile(data);
      setEditForm(data);
      if (data?.sender_email) {
        setCompanyEmail(data.sender_email);
        updateUser({ email: data.sender_email, company_name: data.company_name });
      }
      if (data?.calendly_url) {
        setCalendlyUrl(data.calendly_url);
      }
    });
  }, []);

  // Pre-fill sample input for Siyarang Bandhej
  const handlePreFillDemo = () => {
    setCompanyName('Siyarang Bandhej');
    setCompanyWebsite('https://siyarangbandhej.com');
    setCompanyEmail('sales@siyarangbandhej.com');
    setCalendlyUrl('https://calendly.com/siyarang-bandhej/wholesale-consultation');
    setBusinessDescription(
      'Heritage artisan manufacturer of authentic Kutch and Jamnagar Bandhani, handcrafted pure Gaji silk sarees, traditional tie-dye dupattas, and bridal lehenga fabrics. Supplying premium ethnic wear retail chains, luxury boutiques, and global export houses.'
    );
    setProductsServices(
      'Pure Gaji Silk Bandhani Sarees, Handcrafted Georgette Bandhej Dupattas, Artisanal Bridal Lehenga Fabrics, Bulk Wholesale Tie-Dye Dress Materials'
    );
    setTargetIndustries('Ethnic Wear Retail Chains, Luxury Bridal Boutiques, Fashion Apparel Brands, Textile Wholesalers & Exporters');
    setTargetLocations('India (Mumbai, Delhi, Ahmedabad, Kolkata, Bangalore), UAE, UK, North America');
    setIdealCustomerProfile(
      'Leading ethnic fashion retail chains (such as Fabindia, Manyavar, Westside Samoh, Jaypore) and luxury bridal boutiques seeking authentic hand-tied Bandhani with reliable bulk manufacturing and seasonal delivery capacity.'
    );
  };

  // Handle file selections
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Trigger AI Business Understanding
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !businessDescription.trim()) {
      alert('Please provide at least a Company Name and Business Description.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Ingesting company information & collateral documents...');

    const stepTimer1 = setTimeout(() => {
      setAnalysisStep('Synthesizing value propositions & target personas...');
    }, 800);

    const stepTimer2 = setTimeout(() => {
      setAnalysisStep('Generating buying signals & ICP qualification criteria...');
    }, 1600);

    try {
      const formData = new FormData();
      formData.append('company_name', companyName);
      formData.append('company_website', companyWebsite);
      formData.append('business_description', businessDescription);
      formData.append('products_services', productsServices);
      formData.append('target_industries', targetIndustries);
      formData.append('target_locations', targetLocations);
      formData.append('ideal_customer_profile', idealCustomerProfile);
      formData.append('sender_email', companyEmail);
      formData.append('sender_name', companyName);
      formData.append('calendly_url', calendlyUrl);

      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const result = await api.analyzeBusiness(formData);
      setProfile(result);
      setEditForm(result);
      if (result.sender_email) {
        updateUser({ email: result.sender_email, company_name: result.company_name });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Save edits
  const handleSaveEdit = async () => {
    if (!editForm) return;
    setIsSaving(true);
    try {
      const updated = await api.updateStructuredBusinessProfile(editForm);
      setProfile(updated);
      setIsEditing(false);
      if (updated.sender_email) {
        updateUser({ email: updated.sender_email, company_name: updated.company_name });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white border border-indigo-100 shadow-sm p-1 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Business Profile" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Step 2: Business Understanding Engine
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Feed your company details and collateral into the AI engine to generate an actionable B2B intelligence profile.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreFillDemo}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pre-fill Demo Scenario</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Business profile successfully analyzed and updated across the sales pipeline!</span>
        </div>
      )}

      {/* Main Grid: Input Form & Extracted Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Business Knowledge Input</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your core product offering details and upload sales collateral.
            </p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Siyarang Bandhej"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Company Website *
              </label>
              <input
                type="url"
                required
                placeholder="https://siyarangbandhej.com"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                <span>Company Email (Outbound Sender)</span>
                <span className="text-[10px] text-indigo-600 font-normal normal-case">Used for lead outreach</span>
              </label>
              <input
                type="email"
                placeholder="e.g. sales@siyarangbandhej.com or info@yourcompany.com"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Any company can enter their email here. AI will send outreach emails to prospective leads from this address.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Calendly Booking URL</span>
                </span>
                <span className="text-[10px] text-indigo-600 font-normal normal-case">For in-call human handoffs</span>
              </label>
              <input
                type="url"
                placeholder="https://calendly.com/your-team/30min"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                When a lead asks to speak with a human during AI voice calls, Gemini will share this Calendly link to book a timeslot.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Business Description *
              </label>
              <textarea
                required
                rows={3}
                placeholder="What does your company manufacture or do, and what value do you deliver?"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Products / Services
              </label>
              <input
                type="text"
                placeholder="e.g. Pure Silk Bandhani Sarees, Bridal Lehengas, Handloom Dupattas"
                value={productsServices}
                onChange={(e) => setProductsServices(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Target Industries
                </label>
                <input
                  type="text"
                  placeholder="Ethnic Retail, Fashion, Boutiques, Wholesale"
                  value={targetIndustries}
                  onChange={(e) => setTargetIndustries(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Target Locations
                </label>
                <input
                  type="text"
                  placeholder="India, UAE, UK, North America"
                  value={targetLocations}
                  onChange={(e) => setTargetLocations(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Ideal Customer Profile (ICP)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. National ethnic fashion chains and premium bridal boutiques requiring authentic hand-tied Bandhani"
                value={idealCustomerProfile}
                onChange={(e) => setIdealCustomerProfile(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Document Upload Area (PDF, DOCX, TXT) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Sales Collateral & Case Studies (PDF, DOCX, TXT)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 rounded-xl p-4 text-center cursor-pointer transition-all"
              >
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <div className="text-xs font-semibold text-slate-700">
                  Click to upload collateral files
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Supports .PDF, .DOCX, and .TXT</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Uploaded Files Chips */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-slate-100 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate text-slate-800 font-medium">{file.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzing ? 'Analyzing Business Knowledge...' : 'Understand My Business'}</span>
              </button>
            </div>

            {isAnalyzing && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0" />
                <span>{analysisStep}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: AI-Generated Understanding Display (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {profile ? (
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs space-y-6">
              {/* Header & Status */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-bold text-slate-900">{profile.company_name}</span>
                    <a
                      href={profile.company_website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 font-mono flex items-center gap-1 hover:underline"
                    >
                      <span>{profile.company_website}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={profile.is_demo_mode ? 'purple' : 'success'} size="sm">
                      <Sparkles className="w-3 h-3 mr-1 inline" />
                      <span>{profile.is_demo_mode ? 'AI Extraction (Demo Mode)' : 'AI Extraction (Live LLM)'}</span>
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      Last Updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditForm({ ...profile });
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* 1. Company Summary */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Company Summary & Value Proposition</span>
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium">
                  {profile.company_summary}
                </div>
              </div>

              {/* 2. Products & Services */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Extracted Products & Services ({profile.products_services.length})</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {profile.products_services.map((prod, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white rounded-lg border border-slate-200/90 text-xs font-semibold text-slate-800 flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span>{prod}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Target Customers & Personas */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Target Buyer Personas</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.target_customers.map((cust, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium"
                    >
                      {cust}
                    </span>
                  ))}
                </div>
              </div>

              {/* 4. Industries & Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Target Industries</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.target_industries.map((ind, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Target Locations</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.target_locations.map((loc, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Ideal Customer Profile */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ideal Customer Profile (ICP Definition)</span>
                </h3>
                <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
                  {profile.ideal_customer_profile}
                </div>
              </div>

              {/* 6. High-Intent Buying Signals */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5 text-rose-600" />
                  <span>Monitored Buying Signals</span>
                </h3>
                <div className="space-y-2">
                  {profile.buying_signals.map((sig, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-rose-50/40 border border-rose-100 text-xs text-slate-800 flex items-start gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{sig}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. Search Keywords */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Tags className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Search & Intent Keywords</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium font-mono"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* 8. Outbound Email & Direct Dispatch Configuration */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Outbound Email Dispatch Settings (Real Inbox Delivery)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmailGuide(!showEmailGuide)}
                      className="text-[11px] text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded border border-slate-200 transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{showEmailGuide ? 'Hide Setup Steps' : 'How to Configure?'}</span>
                      {showEmailGuide ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm({ ...profile });
                        setIsEditing(true);
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Configure Email
                    </button>
                  </div>
                </div>
                {showEmailGuide && (
                  <EmailConfigurationGuide className="mb-3" />
                )}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Sender Email Address</span>
                      <span className="font-mono font-bold text-slate-800">
                        {profile.sender_email || 'Not configured'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Sender Display Name</span>
                      <span className="font-semibold text-slate-800">
                        {profile.sender_name || profile.company_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">SMTP Server</span>
                      <span className="font-mono text-slate-700">
                        {profile.smtp_host || 'smtp.gmail.com'}:{profile.smtp_port || 465}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Password Status</span>
                      <span className={profile.smtp_password ? 'text-emerald-700 font-bold' : 'text-amber-700 font-medium'}>
                        {profile.smtp_password ? '✓ Configured for Direct Live Dispatch' : '⚠️ Google App Password Required'}
                      </span>
                    </div>
                    <div className="sm:col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Calendly In-Call Scheduling URL</span>
                      {profile.calendly_url ? (
                        <a
                          href={profile.calendly_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-indigo-600 hover:underline flex items-center gap-1.5 font-semibold text-xs mt-0.5 truncate"
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">{profile.calendly_url}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Not configured (Gemini will use default scheduling link)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              No profile analyzed yet. Enter details on the left and click "Understand My Business".
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && editForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Edit Business Intelligence Profile</h2>
                <p className="text-xs text-slate-500">Fine-tune the AI-generated profile and saved parameters.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Summary</label>
                <textarea
                  rows={4}
                  value={editForm.company_summary}
                  onChange={(e) => setEditForm({ ...editForm, company_summary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Products & Services (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.products_services.join(', ')}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      products_services: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Customers / Buyer Personas (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.target_customers.join(', ')}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      target_customers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ideal Customer Profile (ICP)</label>
                <textarea
                  rows={2}
                  value={editForm.ideal_customer_profile}
                  onChange={(e) => setEditForm({ ...editForm, ideal_customer_profile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Buying Signals to Monitor (comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={editForm.buying_signals.join(', ')}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      buying_signals: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={editForm.keywords.join(', ')}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Calendly Scheduling Link</span>
                </label>
                <input
                  type="url"
                  placeholder="https://calendly.com/your-team/30min"
                  value={editForm.calendly_url || ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      calendly_url: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Shared dynamically by Gemini AI during calls when leads request to speak with a human.
                </span>
              </div>

              {/* Outbound Email & SMTP Settings */}
              <div className="pt-3 border-t border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Outbound Email Dispatch Settings (Real Inbox Delivery)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Configure your sender email address and Google App Password so emails are sent directly to customer inboxes in real time.
                </p>

                {/* Step-by-Step Configuration Guide */}
                <EmailConfigurationGuide />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sender Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. jiyacrafthub@gmail.com"
                      value={editForm.sender_email || ''}
                      onChange={(e) => setEditForm({ ...editForm, sender_email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Sender Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g. SiyaRang Bandhej Sourcing"
                      value={editForm.sender_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, sender_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>Google App Password (16-letters)</span>
                        {(() => {
                          const len = (editForm.smtp_password || '').replace(/\s+/g, '').length;
                          if (len === 0) return null;
                          return (
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                              len === 16 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {len} / 16 letters
                            </span>
                          );
                        })()}
                      </div>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>Generate 16-Letter Password</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </label>
                    <input
                      type="password"
                      placeholder="16-letter password e.g. abcd efgh ijkl mnop"
                      value={editForm.smtp_password || ''}
                      onChange={(e) => setEditForm({ ...editForm, smtp_password: e.target.value })}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-mono transition-all ${
                        (editForm.smtp_password || '').replace(/\s+/g, '').length === 16
                          ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          : (editForm.smtp_password || '').replace(/\s+/g, '').length > 0
                          ? 'border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                          : 'border-slate-200'
                      }`}
                    />
                    {(() => {
                      const cleanLen = (editForm.smtp_password || '').replace(/\s+/g, '').length;
                      if (cleanLen === 0) {
                        return (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>Follow the 4 steps above to generate and paste your 16-letter App Password.</span>
                          </div>
                        );
                      }
                      if (cleanLen === 16) {
                        return (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>✓ Exact 16-letter App Password format. Ready for direct inbox delivery!</span>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-normal space-y-1">
                          <div className="font-bold flex items-center gap-1 text-amber-800">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Currently {cleanLen} characters (Needs exactly 16 letters)</span>
                          </div>
                          <p className="text-[10.5px] text-amber-800">
                            Normal Gmail login passwords trigger <strong>535 BadCredentials</strong>. Please copy the 16-letter App Password from Step 4 above.
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">SMTP Port</label>
                    <input
                      type="number"
                      value={editForm.smtp_port || 465}
                      onChange={(e) => setEditForm({ ...editForm, smtp_port: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Quick Test Connection Box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[11px] font-bold text-slate-700 block">Test Email Dispatch</span>
                    <input
                      type="email"
                      placeholder="Enter email to test (e.g. jiyacrafthub@gmail.com)"
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      className="mt-1 w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isTestingEmail}
                    onClick={handleTestEmail}
                    className="self-end px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-1"
                  >
                    {isTestingEmail ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Test Send</span>
                  </button>
                </div>

                {testEmailResult && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium border ${
                      testEmailResult.success
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {testEmailResult.message}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-200"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Edits'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
