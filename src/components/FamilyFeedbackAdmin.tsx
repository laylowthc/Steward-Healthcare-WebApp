import React, { useState } from 'react';
import { Heart, Star, Check, Trash2, Filter, AlertCircle, MessageSquare, PhoneCall, CheckCircle, ShieldAlert, Award, Inbox } from 'lucide-react';
import { FamilyFeedback } from '../types';

interface FamilyFeedbackAdminProps {
  feedbacks: FamilyFeedback[];
  onUpdateStatus: (id: string, newStatus: 'Awaiting Action' | 'Reviewed' | 'Resolved') => void;
  onDeleteFeedback: (id: string) => void;
  onAddLog: (action: string, type: 'recruitment' | 'staff' | 'document' | 'compliance' | 'timesheet') => void;
}

export default function FamilyFeedbackAdmin({
  feedbacks,
  onUpdateStatus,
  onDeleteFeedback,
  onAddLog
}: FamilyFeedbackAdminProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Calculates real-time average metrics
  const totalCount = feedbacks.length;
  
  const avgCareQuality = totalCount > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.ratingCareQuality, 0) / totalCount).toFixed(1) 
    : '0.0';
    
  const avgCommunication = totalCount > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.ratingCommunication, 0) / totalCount).toFixed(1) 
    : '0.0';
    
  const avgPunctuality = totalCount > 0 
    ? (feedbacks.reduce((sum, f) => sum + f.ratingPunctuality, 0) / totalCount).toFixed(1) 
    : '0.0';

  // Overall satisfaction percentage (4 or 5 stars on Care Quality)
  const highQualityCount = feedbacks.filter(f => f.ratingCareQuality >= 4).length;
  const satisfactionRate = totalCount > 0 
    ? Math.round((highQualityCount / totalCount) * 100) 
    : 100;

  // Filter feedbacks
  const filteredFeedbacks = feedbacks.filter(f => {
    const matchCat = filterCategory === 'all' || f.category === filterCategory;
    const matchStatus = filterStatus === 'all' 
      ? true 
      : filterStatus === 'callback' 
        ? f.hasContactRequest 
        : f.status === filterStatus;
    return matchCat && matchStatus;
  });

  const getCategoryColor = (cat: FamilyFeedback['category']) => {
    switch (cat) {
      case 'Compliment': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Concern': return 'bg-rose-50 text-rose-850 border-rose-200';
      case 'Suggestion': return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const getStatusColor = (status: FamilyFeedback['status']) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Reviewed': return 'bg-amber-100 text-amber-850 border-amber-300';
      default: return 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-300 animate-pulse';
    }
  };

  // Render Star display
  const StarsDisplay = ({ count }: { count: number }) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((idx) => (
          <Star
            key={idx}
            className={`w-3.5 h-3.5 ${
              idx <= count ? 'fill-amber-400 text-amber-500 font-bold' : 'text-slate-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6" id="family-feedback-admin-panel">
      {/* HEADER BANNER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-850 uppercase tracking-tight flex items-center">
            <Heart className="w-5 h-5 mr-2 text-rose-500 fill-rose-500" /> Family Surveys & Real-time Feedback
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-sans leading-normal">
            Listen to families and care representatives directly. Audited in compliance with Care Quality Commission Regulation 17 (Good Governance).
          </p>
        </div>

        <div className="flex bg-[#fafafc] border border-slate-200 p-1 rounded-xl self-start md:self-auto shrink-0 shadow-inner">
          <a
            href="#family"
            target="_blank"
            rel="noreferrer"
            className="p-1.5 px-3.5 bg-gradient-to-r from-purple-900 to-rose-700 hover:opacity-90 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>Open Survey Link</span>
            <span className="text-[10px] bg-white/20 p-0.5 px-1.5 rounded">#family</span>
          </a>
        </div>
      </div>

      {/* METRIC CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl">
            <Heart className="w-6 h-6 fill-rose-500 text-rose-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Representative Satisfaction</p>
            <p className="text-2xl font-black text-slate-800">{satisfactionRate}%</p>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">{highQualityCount} / {totalCount} rated 4+ stars</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-purple-50 text-purple-700 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clinical Care Index</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{avgCareQuality}</span>
              <span className="text-xs text-slate-500">/ 5.0</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold font-sans">Hands-on care rating</p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-2xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Clarity & Communication</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{avgCommunication}</span>
              <span className="text-xs text-slate-500">/ 5.0</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold font-sans">Shift updating clarity</p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 text-amber-700 rounded-2xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Carer Punctuality</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-2xl font-black text-slate-800">{avgPunctuality}</span>
              <span className="text-xs text-slate-500">/ 5.0</span>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold font-sans">On-time care tracking</p>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-150 shadow-sm flex flex-wrap items-center justify-between gap-3 font-sans">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Filter Responses:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Classification Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-1.5 px-2 bg-white"
            >
              <option value="all">All Classifications</option>
              <option value="Compliment">Compliments 🌟</option>
              <option value="Suggestion">Suggestions 💡</option>
              <option value="Concern">Concerns ⚠️</option>
              <option value="General Inquiry">General Inquiries 💬</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Action Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-1.5 px-2 bg-white"
            >
              <option value="all">All Progress Statuses</option>
              <option value="Awaiting Action">Awaiting Action</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Resolved">Resolved</option>
              <option value="callback">Callback Requested 📞</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN DATA LIST */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="feedback-admin-data-pool">
        {filteredFeedbacks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/20">
            <Inbox className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
            <p className="text-xs text-slate-500 font-bold">No family feedback responses match current filters</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm font-sans leading-relaxed">
              Clear your filters or share the secure hashtag `#family` portal link with client advocates to collect responses.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFeedbacks.map((item) => (
              <div key={item.id} className="p-5 hover:bg-slate-50/40 transition-all space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2 text-xs">
                      <span className={`p-0.5 px-2 text-[9px] uppercase font-black tracking-wider border rounded-full ${getCategoryColor(item.category)}`}>
                        {item.category}
                      </span>
                      <span className={`p-0.5 px-2 text-[9px] uppercase font-black tracking-wider border rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Submitted: {new Date(item.dateSubmitted).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    <h3 className="text-xs font-black text-slate-900 leading-normal font-sans">
                      Patient/Client: <span className="text-purple-900">{item.clientName}</span>
                    </h3>
                  </div>

                  {/* Rating Stars Grid */}
                  <div className="bg-white p-2 rounded-xl border border-slate-150 grid grid-cols-3 gap-3 self-start shrink-0 text-[10px] font-sans">
                    <div className="space-y-0.5 px-1">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Care Quality</p>
                      <StarsDisplay count={item.ratingCareQuality} />
                    </div>
                    <div className="space-y-0.5 border-l border-slate-150 px-2">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Updates</p>
                      <StarsDisplay count={item.ratingCommunication} />
                    </div>
                    <div className="space-y-0.5 border-l border-slate-150 px-2">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">Punctual</p>
                      <StarsDisplay count={item.ratingPunctuality} />
                    </div>
                  </div>
                </div>

                {/* Feedback comment body */}
                <div className="bg-slate-100/50 p-3 px-4 border border-slate-150 rounded-xl">
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">{item.feedbackComments}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-600 font-medium">
                    Advocate: <span className="text-slate-900 font-bold">{item.anonymous ? '🤐 Anonymous Representative' : `${item.familyRepresentative} (${item.relation})`}</span>
                    {item.caregiverAssigned && (
                      <span className="ml-1.5 pl-1.5 border-l border-slate-300">
                        Carer: <span className="text-rose-800 font-bold font-sans">{item.caregiverAssigned}</span>
                      </span>
                    )}
                  </div>

                  {/* Callback Requested */}
                  <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
                    {item.hasContactRequest && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-1 px-3 rounded-lg text-[10px] font-black uppercase flex items-center space-x-1 shrink-0">
                        <PhoneCall className="w-3.5 h-3.5 animate-bounce text-rose-600" />
                        <span>Callback Requested: {item.contactEmailOrPhone || 'Contact Provided'}</span>
                      </div>
                    )}

                    {/* Progress Mutation triggers */}
                    {item.status !== 'Resolved' && (
                      <button
                        onClick={() => {
                          const nextStatus = item.status === 'Awaiting Action' ? 'Reviewed' : 'Resolved';
                          onUpdateStatus(item.id, nextStatus);
                          onAddLog(`Marked family survey for ${item.clientName} as '${nextStatus}'`, 'compliance');
                        }}
                        className="p-1 px-2.5 bg-purple-50 hover:bg-purple-100 text-[#5e2290] border border-purple-200 hover:border-purple-300 text-[10px] font-bold rounded cursor-pointer transition-all"
                      >
                        {item.status === 'Awaiting Action' ? '✓ Mark Reviewed' : '✓ Resolve Issue'}
                      </button>
                    )}

                    {item.status === 'Resolved' && (
                      <span className="p-1 px-2.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200">
                        Resolved
                      </span>
                    )}

                    <button
                      onClick={() => {
                        if (confirm('Delete feedback record permanently?')) {
                          onDeleteFeedback(item.id);
                          onAddLog(`Removed family feedback registry ID: ${item.id}`, 'compliance');
                        }
                      }}
                      className="p-1.5 text-slate-450 hover:text-rose-700 hover:bg-rose-50 rounded transition-all cursor-pointer border border-transparent hover:border-rose-100"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
