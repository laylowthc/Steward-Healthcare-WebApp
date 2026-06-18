import { Applicant, Staff, Document, Timesheet, ActivityLog, RoleTemplate } from '../types';
import { Users, FileText, CheckCircle, ShieldAlert, Clock, ChevronRight, Bell, AlertTriangle, ClipboardCheck } from 'lucide-react';

interface DashboardProps {
  applicants: Applicant[];
  staff: Staff[];
  documents: Document[];
  timesheets: Timesheet[];
  activityLogs: ActivityLog[];
  onNavigate: (tabId: string) => void;
  onSelectStaff: (staffId: string) => void;
  templates: RoleTemplate[];
}

export default function Dashboard({
  applicants,
  staff,
  documents,
  timesheets,
  activityLogs,
  onNavigate,
  onSelectStaff,
  templates
}: DashboardProps) {
  
  // Calculate dynamic stats from application state
  const totalApplicants = applicants.filter(a => a.status !== 'Active' && a.status !== 'Rejected').length;
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
  const compliancePercentage = Math.round((compliantStaffCount / staff.length) * 100);

  return (
    <div className="space-y-6" id="shc-dashboard-view">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-rose-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden" id="shc-welcome-banner">
        <div className="absolute right-0 top-0 w-80 h-full opacity-10 transform translate-x-12 pointer-events-none">
          <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full text-white">
            <path d="M50 0 L100 50 L50 100 L0 50 Z" />
          </svg>
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Steward Health Care StaffHub</h1>
          <p className="mt-2 text-sm text-purple-100 font-medium">
            Your single pane of glass for UK nurse registrations, enhanced DBS clearances, mandatory healthcare training indices, and timesheet approvals.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="p-1 px-2.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
              Role: System Administrator
            </span>
            <span className="p-1 px-2.5 rounded-full bg-emerald-500/35 text-xs font-bold border border-emerald-400/50 backdrop-blur-sm text-emerald-200">
              Agency Active
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
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

      {/* Two Columns Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Main Dashboard panels */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Recruitment Stream Tracker */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
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
                      style={{ width: `${(staff.filter(s => s.dbsStatus === 'Compliant').length / staff.length) * 100}%` }}
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
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                    <span>Mandatory Training Sign-off</span>
                    <span className="font-bold text-slate-800">
                      {staff.filter(s => s.trainingStatus === 'Compliant').length}/{staff.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(staff.filter(s => s.trainingStatus === 'Compliant').length / staff.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Designation Framework & Compliance Requirements Matrix */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
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
                const pipelinesTargeting = applicants.filter(a => a.position.toLowerCase() === tpl.role.toLowerCase() && a.status !== 'Active' && a.status !== 'Rejected').length;
                return (
                  <div key={tpl.role} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between hover:shadow-sm transition-all">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase text-indigo-850 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                          {tpl.salaryRange}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {tpl.requiredCredentials.length} Requirements
                        </span>
                      </div>
                      <h4 className="font-extrabold text-[#2D0B31] text-xs mt-2.5">{tpl.role}</h4>
                      <p className="text-[11px] text-slate-650 mt-1 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-150 flex justify-between items-center text-[10px] font-bold text-slate-600">
                      <span className="font-semibold text-slate-500">Pipeline Targeted:</span>
                      <span className="bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full font-extrabold">
                        {pipelinesTargeting} Candidate{pipelinesTargeting === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timesheets Quick Inspection */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pending Timesheet Submissions</h3>
                <p className="text-xs text-slate-500">Hours awaiting healthcare agency validation & pay processing</p>
              </div>
              <button
                onClick={() => onNavigate('timesheets')}
                className="text-xs font-bold text-purple-700 hover:text-purple-600 flex items-center space-x-1"
              >
                <span>All Timesheets</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-50 rounded-lg">
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
                      <td className="px-4 py-3 text-slate-600">{timesheet.role}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{timesheet.weekEnding}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{timesheet.hoursWorked} hrs</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onNavigate('timesheets')}
                          className="px-2.5 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold transition-all text-[11px]"
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
        </div>

        {/* Column 3: Recent Activity Feed & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Activity Feed */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-purple-800" />
                <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              </div>
              <span className="p-1 px-2 text-[10px] bg-slate-100 rounded-full font-bold text-slate-600">LIVE</span>
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
              </ul>
            </div>
          </div>

          {/* Quick Shortcuts / Actions list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => onNavigate('recruitment')}
                className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50 flex items-center justify-between transition-all font-semibold text-xs text-slate-800"
              >
                <span>➕ Add New Applicant to Stream</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('vault')}
                className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50 flex items-center justify-between transition-all font-semibold text-xs text-slate-800"
              >
                <span>📤 Send Contract for Electronic Signature</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('templates')}
                className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50 flex items-center justify-between transition-all font-semibold text-xs text-slate-800"
              >
                <span>📋 Review Job Role Templates</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
