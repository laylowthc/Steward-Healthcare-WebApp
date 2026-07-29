import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Applicant, Staff, Document, Timesheet, ActivityLog, RoleTemplate, FamilyFeedback, SystemUserProfile } from '../types';
import { 
  Users, 
  FileText, 
  CheckCircle, 
  ShieldAlert, 
  Clock, 
  ChevronRight, 
  Bell, 
  AlertTriangle, 
  ClipboardCheck, 
  X, 
  Plus, 
  Settings, 
  Trash2, 
  Heart, 
  Cloud 
} from 'lucide-react';


interface DashboardProps {
  applicants: Applicant[];
  staff: Staff[];
  documents: Document[];
  timesheets: Timesheet[];
  activityLogs: ActivityLog[];
  onNavigate: (tabId: string) => void;
  onSelectStaff: (staffId: string) => void;
  templates: RoleTemplate[];
  currentUser?: Staff;
  currentUserProfile?: SystemUserProfile | null;
  currentRole?: string;
  visibleCards: string[];
  onToggleCard: (cardId: string, visible?: boolean) => void;
  onClearActivityLogs: () => void;
  familyFeedbacks: FamilyFeedback[];
}

export default function Dashboard({
  applicants,
  staff,
  documents,
  timesheets,
  activityLogs,
  onNavigate,
  onSelectStaff,
  templates,
  currentUser,
  currentUserProfile,
  currentRole,
  visibleCards,
  onToggleCard,
  onClearActivityLogs,
  familyFeedbacks
}: DashboardProps) {
  const [isCardSelectorOpen, setIsCardSelectorOpen] = useState(false);
  
  // Calculate dynamic stats from application state
  const totalApplicants = applicants.filter(a => a.status !== 'Accepted' && a.status !== 'Rejected').length;
  const activeStaff = staff.filter(s => s.status === 'Active').length;
  const awaitingReviewDocs = documents.filter(d => d.status === 'Awaiting Review').length;
  const complianceAlerts = staff.filter(
    s => s.status === 'Non-Compliant' || 
    s.dbsStatus === 'Expiring' || s.dbsStatus === 'Non-Compliant' ||
    s.rightToWork === 'Expiring' || s.rightToWork === 'Non-Compliant' ||
    s.trainingStatus === 'Expiring' || s.trainingStatus === 'Non-Compliant'
  ).length;
  const expiringDBS = staff.filter(s => s.dbsStatus === 'Expiring').length;

  // Compliance percentage widget
  const compliantStaffCount = staff.filter(s => s.status === 'Active' && s.dbsStatus === 'Compliant' && s.rightToWork === 'Compliant' && s.trainingStatus === 'Compliant').length;
  const compliancePercentage = staff.length > 0 ? Math.round((compliantStaffCount / staff.length) * 100) : 100;

  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const displayName = currentUserProfile?.fullName || currentUser?.name || 'Authenticated User';
  const displayId = currentUser?.id || currentUserProfile?.id;
  const displayStatus = currentUserProfile?.status || currentUser?.status || 'Active';

  // Calculates Family feedback metrics
  const avgCareQuality = familyFeedbacks.length > 0 
    ? (familyFeedbacks.reduce((sum, f) => sum + f.ratingCareQuality, 0) / familyFeedbacks.length).toFixed(1) 
    : '0.0';

  const satisfactionRate = familyFeedbacks.length > 0 
    ? Math.round((familyFeedbacks.filter(f => f.ratingCareQuality >= 4).length / familyFeedbacks.length) * 100) 
    : 0;

  // Helper variables to assess column layout content empty states
  const hasLeftCards = visibleCards.includes('health_index') || 
                       visibleCards.includes('recruiting_targets') || 
                       visibleCards.includes('pending_timesheets') ||
                       visibleCards.includes('workspace_sync');

  const hasRightCards = visibleCards.includes('recent_activity') || 
                        visibleCards.includes('quick_actions') ||
                        visibleCards.includes('family_surveys');

  return (
    <div className="space-y-6" id="shc-dashboard-view">
      {/* Web-ID Card */}
      <div 
        className="relative h-[160px] w-full max-w-md" 
        style={{ perspective: 1000 }}
        onMouseEnter={() => setIsCardFlipped(true)}
        onMouseLeave={() => setIsCardFlipped(false)}
        id="shc-welcome-banner"
      >
        <motion.div
          className="w-full h-full relative rounded-2xl shadow-sm border border-slate-200"
          animate={{ rotateX: isCardFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div className="absolute inset-0 bg-[#2D0B31] rounded-2xl p-6 text-white" style={{ backfaceVisibility: "hidden" }}>
            <div className="flex items-center space-x-5 h-full">
              {/* Profile Picture */}
              <div className="relative">
                {(currentUser as any)?.photoUrl ? (
                  <img
                    src={(currentUser as any).photoUrl}
                    alt={currentUser.name || 'User Profile'}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-purple-100 text-purple-900 border-4 border-white shadow-sm flex items-center justify-center font-bold text-2xl uppercase">
                    {displayName.substring(0, 2)}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm block"></span>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">
                  {displayName}
                </h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="p-0.5 px-2.5 rounded-full bg-white/10 text-white text-xs font-bold">
                    Role: {currentRole === 'admin' ? 'System Administrator' : currentUser?.role || 'Staff'}
                  </span>
                  <span className="p-0.5 px-2.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    {currentRole === 'admin' ? 'User ID' : 'Staff ID'}: {displayId || 'Unavailable'}
                  </span>
                  <span className="p-1 px-2.5 rounded-full bg-white/10 text-xs font-bold text-slate-350">
                    Status: {displayStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Back */}
          <div 
            className="absolute inset-0 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-center" 
            style={{ backfaceVisibility: "hidden", transform: "rotateX(180deg)" }}
          >
            <div className="flex items-center space-x-4">
              {currentRole === 'admin' ? (
                <>
                  <div className="flex items-center bg-white/5 p-3 rounded-xl border border-slate-800 shadow-sm flex-1">
                    <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Type</p>
                      <p className="text-sm font-bold text-white">Administrator</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-white/5 p-3 rounded-xl border border-slate-800 shadow-sm flex-[2] min-w-0">
                    <ShieldAlert className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                    <div className="ml-3 min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed-in Account</p>
                      <p className="text-sm font-bold text-white truncate">{currentUserProfile?.email || currentUser?.email || 'Unavailable'}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
              <div className="flex items-center bg-white/5 p-3 rounded-xl border border-slate-800 shadow-sm flex-1">
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Joined Date</p>
                  <p className="text-sm font-bold text-white">12 Aug 2024</p>
                </div>
              </div>
              <div className="flex items-center bg-white/5 p-3 rounded-xl border border-slate-800 shadow-sm flex-1">
                <ShieldAlert className="w-6 h-6 text-indigo-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clearance</p>
                  <p className="text-sm font-bold text-white">Enhanced DBS</p>
                </div>
              </div>
              <div className="flex items-center bg-white/5 p-3 rounded-xl border border-slate-800 shadow-sm flex-1">
                <ClipboardCheck className="w-6 h-6 text-rose-450 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Certifications</p>
                  <p className="text-sm font-bold text-white">RGN, BLS, ILS</p>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Summary KPI Cards Grid (Fixed, consistent top section) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-cards-grid">
        {/* Card 1: Total Applicants */}
        <button
          onClick={() => onNavigate('recruitment')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg hover:border-purple-200 text-left transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recruitment Pipeline</span>
            <span className="p-2 bg-purple-50 rounded-xl text-purple-700 group-hover:bg-purple-100 transition-colors">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 block tracking-tight">{totalApplicants}</span>
            <span className="text-[11px] font-semibold text-purple-700 mt-1 block">Active candidates in pipeline →</span>
          </div>
        </button>

        {/* Card 2: Active Staff */}
        <button
          onClick={() => onNavigate('staff')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg hover:border-purple-200 text-left transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Staff</span>
            <span className="p-2 bg-emerald-50 rounded-xl text-emerald-700 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 block tracking-tight">{activeStaff}</span>
            <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">Ready to deploy roster →</span>
          </div>
        </button>

        {/* Card 3: Compliance Alerts */}
        <button
          onClick={() => onNavigate('compliance')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg hover:border-purple-200 text-left transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Compliance Alerts</span>
            <span className={`p-2 rounded-xl group-hover:opacity-90 transition-opacity ${complianceAlerts > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
              <ShieldAlert className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 block tracking-tight">{complianceAlerts}</span>
            <span className="text-[11px] font-semibold text-amber-700 mt-1 block flex items-center">
              Requires urgent inspection →
            </span>
          </div>
        </button>

        {/* Card 4: Documents Awaiting Review */}
        <button
          onClick={() => onNavigate('vault')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg hover:border-purple-200 text-left transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Docs Pending Review</span>
            <span className="p-2 bg-indigo-50 rounded-xl text-indigo-700 group-hover:bg-indigo-100 transition-colors">
              <FileText className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900 block tracking-tight">{awaitingReviewDocs}</span>
            <span className="text-[11px] font-semibold text-indigo-700 mt-1 block font-medium">Under processing review →</span>
          </div>
        </button>

        {/* Card 5: Expiring DBS Checks */}
        <button
          onClick={() => onNavigate('compliance')}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-md hover:shadow-lg hover:border-purple-200 text-left transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">CRITICAL Expiring DBS</span>
            <span className={`p-2 rounded-xl group-hover:opacity-90 transition-opacity ${expiringDBS > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-rose-700 block tracking-tight">{expiringDBS}</span>
            <span className="text-[11px] font-semibold text-rose-700 mt-1 block flex items-center">
              DBS &lt; 35 days remaining →
            </span>
          </div>
        </button>
      </div>

      {/* Dynamic Customizable Layout Panels Placeholder if everything hidden */}
      {visibleCards.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 text-center rounded-2xl my-4 max-w-xl mx-auto">
          <Settings className="w-10 h-10 text-slate-350 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Your Dashboard contains no custom cards</h3>
          <p className="text-xs text-slate-500 mt-1">Use the "Add Card" button next to/after the last card to pin active modules back to your space.</p>
        </div>
      )}

      {/* Two Columns Dashboard Content */}
      {visibleCards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Main Dashboard panels */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Recruitment Stream Tracker */}
            {visibleCards.includes('health_index') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group">
                <button
                  onClick={() => onToggleCard('health_index', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove health index"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between mb-4 pr-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Compliance & Registry Health Index</h3>
                    <p className="text-xs text-slate-500">Global audit of all Steward Health Care 247 on-call staff credentials</p>
                  </div>
                  <button
                    onClick={() => onNavigate('compliance')}
                    className="text-xs font-bold text-purple-700 hover:text-purple-600 flex items-center space-x-1"
                  >
                    <span>Full Audit Sheet</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  {/* Circular KPI progress using custom SVG */}
                  <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-3">
                      {/* Background SVG Circle */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="8" fill="transparent" />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          stroke="#8B5CF6" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * compliancePercentage) / 100}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-slate-800">{compliancePercentage}%</span>
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">COMPLIANT</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-700">{compliantStaffCount} of {staff.length} staff</span> members hold fully pristine, valid credentials.
                    </div>
                  </div>

                  {/* Categorized Status Meters */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Valid DBS Certificates</span>
                        <span className="font-bold text-slate-800">
                          {staff.filter(s => s.dbsStatus === 'Compliant').length}/{staff.length}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-800 h-full rounded-full transition-all duration-500"
                          style={{ width: `${staff.length > 0 ? (staff.filter(s => s.dbsStatus === 'Compliant').length / staff.length) * 100 : 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>NMC Registrations (Nurses)</span>
                        <span className="font-bold text-slate-800">
                          {staff.filter(s => s.role === 'Nurse' && s.status === 'Active').length}/{staff.filter(s => s.role === 'Nurse').length}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(staff.filter(s => s.role === 'Nurse' && s.status === 'Active').length / (staff.filter(s => s.role === 'Nurse').length || 1) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-650 mb-1">
                        <span>Mandatory Training Sign-off</span>
                        <span className="font-bold text-slate-800">
                          {staff.filter(s => s.trainingStatus === 'Compliant').length}/{staff.length}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${staff.length > 0 ? (staff.filter(s => s.trainingStatus === 'Compliant').length / staff.length) * 100 : 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Designation Framework & Compliance Requirements Matrix */}
            {visibleCards.includes('recruiting_targets') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group">
                <button
                  onClick={() => onToggleCard('recruiting_targets', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove designation matrix"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between mb-4 pr-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Designation Framework & Recruiting Targets</h3>
                    <p className="text-xs text-slate-500">Required credentials and dynamic candidate registrations mapped per active job template</p>
                  </div>
                  <button
                    onClick={() => onNavigate('templates')}
                    className="text-xs font-bold text-purple-750 hover:text-purple-650 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Edit Job Templates</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((tpl) => {
                    const pipelinesTargeting = applicants.filter(a => a.position.toLowerCase() === tpl.role.toLowerCase() && a.status !== 'Accepted' && a.status !== 'Rejected').length;
                    return (
                      <div key={tpl.role} className="p-4 bg-slate-55 border border-slate-150 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all animate-fade-in">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase text-indigo-850 bg-indigo-55 border border-indigo-100 px-2 py-0.5 rounded-full">
                              {tpl.salaryRange}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {tpl.requiredCredentials.length} Requirements
                            </span>
                          </div>
                          <h4 className="font-extrabold text-[#2D0B31] text-xs mt-2.5">{tpl.role}</h4>
                          <p className="text-[11px] text-slate-655 mt-1 line-clamp-2 leading-relaxed">
                            {tpl.description}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-150 flex justify-between items-center text-[10px] font-bold text-slate-600">
                          <span className="font-semibold text-slate-550">Pipeline Targeted:</span>
                          <span className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full font-extrabold">
                            {pipelinesTargeting} Candidate{pipelinesTargeting === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timesheets Quick Inspection */}
            {visibleCards.includes('pending_timesheets') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group">
                <button
                  onClick={() => onToggleCard('pending_timesheets', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-55 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove timesheets list"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between mb-4 pr-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Pending Timesheet Submissions</h3>
                    <p className="text-xs text-slate-500">Hours awaiting healthcare agency validation & pay processing</p>
                  </div>
                  <button
                    onClick={() => onNavigate('timesheets')}
                    className="text-xs font-bold text-purple-700 hover:text-purple-650 flex items-center space-x-1"
                  >
                    <span>All Timesheets</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                      <tr className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-55 rounded-lg">
                        <th className="px-4 py-3 rounded-l-md">Staff Name</th>
                        <th className="px-4 py-3">Role Type</th>
                        <th className="px-4 py-3">Week Ending</th>
                        <th className="px-4 py-3">Claimed Hours</th>
                        <th className="px-4 py-3 text-right rounded-r-md">Action Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {timesheets.filter(t => t.approvalStatus === 'Pending').map((timesheet) => (
                        <tr key={timesheet.id} className="hover:bg-slate-5 border-b border-transparent">
                          <td className="px-4 py-3 font-semibold text-slate-900">{timesheet.staffName}</td>
                          <td className="px-4 py-3 text-slate-650">{timesheet.role}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{timesheet.weekEnding}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{timesheet.hoursWorked} hrs</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => onNavigate('timesheets')}
                              className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold transition-all text-[11px] cursor-pointer"
                            >
                              Approve/Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                      {timesheets.filter(t => t.approvalStatus === 'Pending').length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-medium">
                            ✓ Excellent! All timesheet submissions have been fully audited.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Google Workspace Summary Card */}
            {visibleCards.includes('workspace_sync') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group animate-fade-in text-xs text-slate-700">
                <button
                  onClick={() => onToggleCard('workspace_sync', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove workspace view"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between mb-4 pr-6 border-b border-slate-50 pb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5-tight">
                      <Cloud className="w-5 h-5 text-indigo-650 inline-block mr-1.5" />
                      <span>Google Workspace Integration</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Secure folders, Spreadsheet synchronizers and Meets log</p>
                  </div>
                  <button
                    onClick={() => onNavigate('workspace')}
                    className="text-xs font-bold text-purple-700 hover:text-purple-600 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Liaison Sync</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-indigo-800 font-extrabold uppercase">Liaison Connected</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-slate-850">Steward Sandbox online</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Direct API live integration operational.</p>
                  </div>
                  <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-105">
                    <span className="text-[10px] text-purple-800 font-extrabold uppercase">Google Meet Schedules</span>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs font-bold text-slate-800">2 Interviews Active</p>
                      <span className="text-[9px] bg-purple-200 text-purple-800 px-1.5 rounded font-extrabold">Syncing</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Interlinked with dynamic candidate streams.</p>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Column 3: Recent Activity Feed & Quick Actions */}
          <div className="space-y-6">
            
            {/* Recent Activity Feed */}
            {visibleCards.includes('recent_activity') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group">
                <button
                  onClick={() => onToggleCard('recent_activity', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-55 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove activity logs"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between mb-4 pr-6 border-b border-slate-50 pb-2">
                  <div className="flex items-center space-x-2 animate-pulse-slow">
                    <Bell className="w-5 h-5 text-purple-800 animate-bounce-slow" />
                    <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearActivityLogs();
                      }}
                      className="inline-flex items-center space-x-1 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition cursor-pointer"
                      title="Clear live feed activity logs"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear Feed</span>
                    </button>
                    <span className="p-1 px-2 text-[10px] bg-slate-100 rounded-full font-bold text-slate-650">LIVE</span>
                  </div>
                </div>

                <div className="flow-root" id="activity-logs">
                  <ul className="-mb-8">
                    {activityLogs.slice(0, 5).map((log, logIdx) => {
                      let badgeColor = 'bg-gray-100 text-gray-500';
                      if (log.type === 'applicant') badgeColor = 'bg-blue-50 text-blue-700 border-blue-100 border';
                      if (log.type === 'document') badgeColor = 'bg-purple-50 text-purple-700 border-purple-100 border';
                      if (log.type === 'compliance') badgeColor = 'bg-rose-50 text-rose-700 border-rose-100 border';
                      if (log.type === 'timesheet') badgeColor = 'bg-amber-50 text-amber-700 border-amber-100 border';
                      if (log.type === 'status') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100 border';

                      return (
                        <li key={log.id}>
                          <div className="relative pb-8">
                            {logIdx !== activityLogs.slice(0, 5).length - 1 ? (
                              <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-extrabold ${badgeColor}`}>
                                  {log.type.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pt-1.5Packed font-medium">
                                <p className="text-xs text-slate-800 font-semibold">{log.action}</p>
                                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                  <span>By: {log.user}</span>
                                  <span className="font-semibold text-slate-500">{log.timestamp}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {activityLogs.length === 0 && (
                      <li className="py-6 text-center text-slate-400 text-xs font-semibold">
                        No recent activities in feed. Dynamic events will pop up here.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Quick Shortcuts / Actions list */}
            {visibleCards.includes('quick_actions') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group">
                <button
                  onClick={() => onToggleCard('quick_actions', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-55 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove quick actions"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="text-lg font-bold text-slate-900 mb-3 pr-6">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => onNavigate('recruitment')}
                    className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50 flex items-center justify-between transition-all font-semibold text-xs text-slate-800 cursor-pointer"
                  >
                    <span>➕ Add New Applicant to Stream</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => onNavigate('vault')}
                    className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50 flex items-center justify-between transition-all font-semibold text-xs text-slate-800 cursor-pointer"
                  >
                    <span>📤 Send Contract for Electronic Signature</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => onNavigate('templates')}
                    className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50 flex items-center justify-between transition-all font-semibold text-xs text-slate-800 cursor-pointer"
                  >
                    <span>📋 Review Job Role Templates</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Family Satisfaction Rating Card */}
            {visibleCards.includes('family_surveys') && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md relative group animate-fade-in text-xs text-slate-700">
                <button
                  onClick={() => onToggleCard('family_surveys', false)}
                  className="absolute top-4 right-4 p-1 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer z-10"
                  title="Remove family Surveys"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between mb-4 pr-6 border-b border-slate-50 pb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                      <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500 animate-pulse mr-1 inline-block" />
                      <span>Family Satisfaction</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Steward Realtime client survey feedbacks QA</p>
                  </div>
                  <button
                    onClick={() => onNavigate('family_feedback')}
                    className="text-xs font-bold text-purple-700 hover:text-purple-600 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>QA Hub</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-rose-800 font-extrabold uppercase uppercase-spaced">Care Quality Rating</span>
                      <p className="font-extrabold text-slate-800 mt-0.5"><span className="text-lg text-rose-600 font-black">{avgCareQuality}</span> / 5.0 stars</p>
                    </div>
                    <span className="text-xs font-bold text-[#2D0B31] bg-white p-1 px-2 rounded-lg border border-slate-200">98% positive</span>
                  </div>
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-105 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-purple-800 font-extrabold uppercase">CQC QA Standard</span>
                      <p className="text-xs font-bold text-slate-850 mt-0.5">Compliant (Regulation 17)</p>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 font-bold">Good</span>
                  </div>
                </div>
              </div>
            )}

            {/* Customize Dashboard Add Card Control */}
            <div className="flex justify-end pt-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCardSelectorOpen(!isCardSelectorOpen)}
                  className="inline-flex items-center space-x-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-[#2D0B31] font-extrabold text-[11px] px-3 py-2 rounded-xl transition cursor-pointer shadow-sm"
                  title="Add deleted or custom cards back to your dashboard grid"
                >
                  <Plus className="w-3.5 h-3.5 text-[#2D0B31]" />
                  <span>Add Card</span>
                </button>

                {isCardSelectorOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs text-slate-705 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <span className="font-extrabold text-[#2D0B31] tracking-tight uppercase text-[9px]">Dashboard Modules</span>
                      <button 
                        onClick={() => setIsCardSelectorOpen(false)} 
                        className="text-slate-400 hover:text-slate-605 font-bold p-1 hover:bg-slate-50 rounded"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                      {[
                        { id: 'health_index', label: 'Compliance & Registry Health Index', desc: 'Dynamic circular progress chart & status meters' },
                        { id: 'recruiting_targets', label: 'Designation & Recruiting Targets', desc: 'Job role criteria checklists & registrations' },
                        { id: 'pending_timesheets', label: 'Pending Timesheet Submissions', desc: 'Awaiting healthcare agency hours validation' },
                        { id: 'recent_activity', label: 'Recent Activity Feed', desc: 'Real-time live audit flow logs' },
                        { id: 'quick_actions', label: 'Quick Operations Shortcuts', desc: 'Direct links to primary platform workflows' },
                        { id: 'workspace_sync', label: 'Google Workspace Sync', desc: 'Connected folders, spreadsheet export and meets' },
                        { id: 'family_surveys', label: 'Family Feedback Surveys', desc: 'Steward Client satisfaction indexes & comments' }
                      ].map((card) => {
                        const isVisible = visibleCards.includes(card.id);
                        return (
                          <div key={card.id} className="flex items-start justify-between p-1.5 hover:bg-slate-50 rounded-xl transition text-left">
                            <div className="flex-1 pr-2">
                              <p className="font-bold text-slate-800 text-xs">{card.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{card.desc}</p>
                            </div>
                            <button
                              onClick={() => {
                                onToggleCard(card.id, !isVisible);
                              }}
                              className={`self-center px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                                isVisible 
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                              }`}
                            >
                              {isVisible ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
