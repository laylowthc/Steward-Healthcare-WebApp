import React, { useState } from 'react';
import { Star, Send, Heart, ShieldAlert, CheckCircle, Mail, Phone, Lock, Calendar, ClipboardCheck, ArrowLeft, Copy, User } from 'lucide-react';
import BrandedLogo from './BrandedLogo';
import { FamilyFeedback, Staff } from '../types';

interface FamilyPortalProps {
  onBackToLogin: () => void;
  onSubmitFeedback: (feedback: Omit<FamilyFeedback, 'id' | 'dateSubmitted' | 'status'>) => void;
  staffList: Staff[];
}

export default function FamilyPortal({ onBackToLogin, onSubmitFeedback, staffList }: FamilyPortalProps) {
  // Form state
  const [clientName, setClientName] = useState('');
  const [familyRepresentative, setFamilyRepresentative] = useState('');
  const [relation, setRelation] = useState('');
  const [caregiverAssigned, setCaregiverAssigned] = useState('');
  const [category, setCategory] = useState<'Compliment' | 'Suggestion' | 'Concern' | 'General Inquiry'>('Compliment');
  
  // Custom star ratings
  const [ratingCareQuality, setRatingCareQuality] = useState(5);
  const [ratingCommunication, setRatingCommunication] = useState(5);
  const [ratingPunctuality, setRatingPunctuality] = useState(5);
  
  const [feedbackComments, setFeedbackComments] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [hasContactRequest, setHasContactRequest] = useState(false);
  const [contactEmailOrPhone, setContactEmailOrPhone] = useState('');
  
  // Submission success feedback view
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Copy-shareable portal link helper
  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#family`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Please state the patient/client name to ensure we can assign the feedback correctly.');
      return;
    }

    const payload: Omit<FamilyFeedback, 'id' | 'dateSubmitted' | 'status'> = {
      clientName: clientName.trim(),
      familyRepresentative: anonymous ? 'Anonymous Family Representative' : familyRepresentative.trim() || 'Family Representative',
      relation: anonymous ? 'Relative' : relation || 'Spouse/Child',
      caregiverAssigned: caregiverAssigned || 'General Steward Care Team',
      ratingCareQuality,
      ratingCommunication,
      ratingPunctuality,
      feedbackComments: feedbackComments.trim(),
      anonymous,
      category,
      hasContactRequest,
      contactEmailOrPhone: hasContactRequest ? contactEmailOrPhone.trim() : undefined
    };

    onSubmitFeedback(payload);
    
    // Generate simulated reference ID
    const mockRefId = `SHC-FB-${Math.floor(100000 + Math.random() * 900000)}`;
    setSubmittedId(mockRefId);
  };

  const handleResetForm = () => {
    setClientName('');
    setFamilyRepresentative('');
    setRelation('');
    setCaregiverAssigned('');
    setCategory('Compliment');
    setRatingCareQuality(5);
    setRatingCommunication(5);
    setRatingPunctuality(5);
    setFeedbackComments('');
    setAnonymous(false);
    setHasContactRequest(false);
    setContactEmailOrPhone('');
    setSubmittedId(null);
  };

  // Render Star Picker Helper
  const StarPicker = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="font-extrabold text-slate-700 uppercase tracking-wide">{label}</span>
          <span className="text-purple-900 font-bold font-mono">
            {value === 5 ? 'Excellent (5/5)' : value === 4 ? 'Good (4/5)' : value === 3 ? 'Satisfactory (3/5)' : value === 2 ? 'Needs Improvement (2/5)' : 'Poor (1/5)'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((starIdx) => (
            <button
              key={starIdx}
              type="button"
              onClick={() => onChange(starIdx)}
              className="p-1 hover:scale-110 transition-transform cursor-pointer"
            >
              <Star
                className={`w-6 h-6 ${
                  starIdx <= value ? 'fill-amber-400 text-amber-500 font-black' : 'text-slate-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="family-feedback-root">
      
      {/* Background radial soft lights */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50 transform translate-x-10 -translate-y-10"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-100 rounded-full blur-3xl opacity-50 transform -translate-x-10 translate-y-10"></div>

      {/* HEADER BAR */}
      <div className="max-w-xl mx-auto w-full z-15 flex flex-col items-center">
        <div className="mb-4">
          <BrandedLogo layout="vertical" size="md" />
        </div>
        
        <div className="text-center space-y-1 mb-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-850">
            Family & Client Care Hub
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-normal font-sans">
            Submit real-time caregiver feedback and care quality surveys directly to our National Quality Assurance team.
          </p>
        </div>
      </div>

      {/* PORTAL MAIN AREA */}
      <div className="max-w-xl mx-auto w-full z-10" id="family-main-layout">
        
        {submittedId ? (
          <div className="bg-white p-8 border border-slate-100 rounded-2xl shadow-xl text-center space-y-6 animate-fade-in">
            <div className="inline-flex p-3.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-150">
              <CheckCircle className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 font-sans">Thank you! Survey Submitted</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Your feedback was delivered instantly to the Steward QA Management terminal. We actively analyze all feedback to praise top carers and update clinical support strategies.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2 inline-block w-full">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Survey Receipt Reference</p>
              <p className="text-base font-mono font-black text-slate-750">{submittedId}</p>
              <div className="flex justify-center text-[10px] text-slate-500 items-center space-x-1">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Reviewed by clinical lead within 24 hours.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleResetForm}
                className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-750 text-xs font-bold rounded-lg cursor-pointer transition-all"
              >
                Submit another survey
              </button>
              
              <button
                onClick={onBackToLogin}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-900 to-rose-700 hover:opacity-90 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Login
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-xl border border-slate-100 rounded-2xl overflow-hidden animate-fade-in">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-rose-700 p-4.5 px-6 text-white flex justify-between items-center">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase font-bold text-pink-200 tracking-wider">SECURE FEEDBACK LINK</p>
                <span className="text-sm font-black flex items-center">
                  Care Quality Sentiment Survey 📝
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                {copiedLink ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 w-3" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Portal URL'}</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Patient / Client Name</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Margaret Vance"
                    className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Your Assigned Caregiver (Optional)</label>
                  <select
                    value={caregiverAssigned}
                    onChange={(e) => setCaregiverAssigned(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                  >
                    <option value="">-- Let QA match or select carer --</option>
                    {staffList.map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name} ({member.role})
                      </option>
                    ))}
                    <option value="General Steward Care Team">Steward On-Call Team</option>
                  </select>
                </div>
              </div>

              {/* Anonymity Controls */}
              <div className="p-4 bg-[#f8f9fc] border border-[#e8eaee] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center">
                    <Lock className="w-3.5 h-3.5 mr-1 text-purple-600" /> Anonymity settings
                  </span>
                  
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-900"></div>
                  </label>
                </div>

                {anonymous ? (
                  <p className="text-[10px] text-purple-950 font-bold leading-normal">
                    🤐 You have chosen to remain fully anonymous. Your comments and stats will be logged purely for clinical QA metrics, with your representative details kept masked.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <input
                        type="text"
                        required={!anonymous}
                        value={familyRepresentative}
                        onChange={(e) => setFamilyRepresentative(e.target.value)}
                        placeholder="Representative full name (e.g. Richard Vance)"
                        className="block w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required={!anonymous}
                        value={relation}
                        onChange={(e) => setRelation(e.target.value)}
                        placeholder="Relationship (e.g. Son, Daughter, Guardian)"
                        className="block w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Category Selector */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Feedback Classification</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1 font-sans">
                  {['Compliment', 'Suggestion', 'Concern', 'General Inquiry'].map((catType) => (
                    <button
                      key={catType}
                      type="button"
                      onClick={() => setCategory(catType as any)}
                      className={`p-2 rounded-lg text-center text-[10px] uppercase font-bold tracking-wide border transition-all cursor-pointer ${
                        category === catType 
                          ? 'bg-purple-900 border-purple-900 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {catType === 'Compliment' ? '🌟 Compliment' : catType === 'Concern' ? '⚠️ Concern' : catType === 'Suggestion' ? '💡 Suggest' : '💬 Inquiry'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Survey Sliders */}
              <div className="space-y-4 pt-1 bg-white border border-slate-150 rounded-xl p-4 shadow-inner">
                <StarPicker label="1. Quality of hands-on Clinical Care" value={ratingCareQuality} onChange={setRatingCareQuality} />
                <StarPicker label="2. Communication Clarity & Updates" value={ratingCommunication} onChange={setRatingCommunication} />
                <StarPicker label="3. Carer Punctuality & Attitude" value={ratingPunctuality} onChange={setRatingPunctuality} />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Tell us more detail</label>
                <textarea
                  required
                  rows={3}
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  placeholder={`Share any specific moments, compliments, or details. (We share compliments with caregivers to praise their noble hard work!)`}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-600 focus:border-purple-600 bg-white"
                />
              </div>

              {/* Callback Option */}
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-rose-950 uppercase tracking-wider flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-1 text-[#be185d]" /> Do you require a callback?
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasContactRequest}
                      onChange={(e) => setHasContactRequest(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#be185d]"></div>
                  </label>
                </div>

                {hasContactRequest ? (
                  <div className="space-y-2 animate-fade-in pt-1">
                    <p className="text-[10px] text-rose-900 leading-normal font-sans">
                      Our Registered Nurse Clinical Director or Operations Lead will call or email you on high priority.
                    </p>
                    <input
                      type="text"
                      required={hasContactRequest}
                      value={contactEmailOrPhone}
                      onChange={(e) => setContactEmailOrPhone(e.target.value)}
                      placeholder="Enter contact Phone number or Email address"
                      className="block w-full border border-rose-300 rounded-lg p-2 text-xs bg-white"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Toggle this on if you want our agency management team to schedule an internal session or discuss a particular aspect of care.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="order-last sm:order-first px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer text-center"
                >
                  Back to Hub Login
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex justify-center items-center space-x-1.5 py-2.5 bg-gradient-to-r from-purple-900 via-purple-800 to-rose-700 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer text-center transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Real-time Feedback & Ratings</span>
                </button>
              </div>

            </form>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mt-8 text-[11px] text-slate-400">
        <p className="font-semibold">Steward Health Care QA Agency Panel © 2026</p>
        <p className="text-[10px] mt-0.5">Secure clinical SSL feedback channel adhering to Care Quality Commission (CQC) regulatory standards.</p>
      </div>

    </div>
  );
}
