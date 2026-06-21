import { useState } from 'react';
import { Staff, Applicant, Document, Timesheet } from '../types';
import { Database, Play, Code, Network, AlertCircle, FileJson, Cpu, Zap } from 'lucide-react';

interface DeveloperConsoleProps {
  staff: Staff[];
  applicants: Applicant[];
  documents: Document[];
  timesheets: Timesheet[];
}

export default function DeveloperConsole({ staff, applicants, documents, timesheets }: DeveloperConsoleProps) {
  const [activeConsoleTab, setActiveConsoleTab] = useState<'erd' | 'components' | 'apis'>('erd');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET_STAFF');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Live REST Mock Response Generator
  const triggerApiMockCall = (endpointKey: string) => {
    setLoading(true);
    setApiResponse('');
    
    setTimeout(() => {
      setLoading(false);
      switch (endpointKey) {
        case 'GET_STAFF':
          setApiResponse(JSON.stringify({
            status: 200,
            message: 'Successfully retrieved active staff credentials. Authed scope: HSE_AGENCY_READ',
            total_count: staff.length,
            timestamp: new Date().toISOString(),
            data: staff
          }, null, 2));
          break;
        case 'GET_APPLICANTS':
          setApiResponse(JSON.stringify({
            status: 200,
            message: 'Successfully fetched active recruitment pool',
            total_count: applicants.length,
            timestamp: new Date().toISOString(),
            data: applicants
          }, null, 2));
          break;
        case 'POST_DOCUMENT_ASSIGN':
          setApiResponse(JSON.stringify({
            status: 201,
            message: 'Document successfully assigned and locked for e-signature',
            timestamp: new Date().toISOString(),
            assigned_document: {
              id: "doc_assigned_999",
              name: "SHC_Employment_Contract_2026.pdf",
              category: "Employment Contract",
              staffId: "staff_1",
              staffName: "Blessing Gurure",
              status: "Pending Signature",
              assignedByAdmin: true,
              size: "420 KB"
            }
          }, null, 2));
          break;
        case 'PUT_TIMESHEET_APPROVE':
          setApiResponse(JSON.stringify({
            status: 200,
            message: 'Timesheet successfully cleared and queued for BACS payroll dispatch',
            timestamp: new Date().toISOString(),
            payout_summary: {
              timesheet_id: "time_2",
              staff_name: "Sarah Jane Smith",
              role_reference: "Senior Care Assistant",
              verified_hours: 42.0,
              hourly_billing_rate: "£21.00",
              payroll_release_gross: "£882.00"
            }
          }, null, 2));
          break;
        default:
          setApiResponse('{"error": "Unknown API call triggered"}');
      }
    }, 400);
  };

  return (
    <div className="space-y-6" id="shc-developer-portal">
      {/* Dev Header */}
      <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-900 rounded-xl text-purple-200">
            <Cpu className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono">System Architecture Console</h2>
            <p className="text-xs text-slate-400 mt-1">Steward Health Care StaffHub MVP Blueprints & Backend Sandbox Models</p>
          </div>
        </div>

        {/* Inner Console Nav */}
        <div className="flex space-x-2 mt-5 border-t border-slate-800 pt-4 text-xs font-semibold">
          <button
            onClick={() => setActiveConsoleTab('erd')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 font-mono transition ${
              activeConsoleTab === 'erd' ? 'bg-purple-900 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Schema (ERD)</span>
          </button>

          <button
            onClick={() => setActiveConsoleTab('components')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 font-mono transition ${
              activeConsoleTab === 'components' ? 'bg-purple-900 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>React App Hierarchy</span>
          </button>

          <button
            onClick={() => setActiveConsoleTab('apis')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1 font-mono transition ${
              activeConsoleTab === 'apis' ? 'bg-purple-900 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Mock API Sandbox</span>
          </button>
        </div>
      </div>

      {/* Main Console Tab Workspace */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* TAB 1: Database entity relationships (ERD) */}
        {activeConsoleTab === 'erd' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-6" id="erd-tab">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-550 border-b pb-2 tracking-wider">
                Relational Database Entity Relationships (PostgreSQL Blueprints)
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Technical schema design showing principal relation paths and relational mapping criteria.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs text-slate-700">
              
              {/* Table 1: Staff */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:shadow-md transition">
                <div className="bg-purple-950 text-white p-2.5 font-bold flex justify-between">
                  <span>staff_members</span>
                  <span className="text-[10px] text-purple-300">TABLE</span>
                </div>
                <div className="p-3 space-y-1 bg-white leading-normal text-[11px]">
                  <p className="font-bold text-purple-900 flex justify-between">
                    <span>🔑 id</span>
                    <span>VARCHAR [PK]</span>
                  </p>
                  <p className="flex justify-between"><span>name</span> <span>VARCHAR(100)</span></p>
                  <p className="flex justify-between"><span>email</span> <span>VARCHAR(150) [UQ]</span></p>
                  <p className="flex justify-between"><span>phone</span> <span>VARCHAR(30)</span></p>
                  <p className="flex justify-between"><span>address</span> <span>TEXT</span></p>
                  <p className="flex justify-between"><span>role</span> <span>ENUM('Nurse', 'HCA', 'SCA')</span></p>
                  <p className="flex justify-between"><span>nmc_pin</span> <span>VARCHAR(50) [NULL]</span></p>
                  <p className="flex justify-between"><span>nmc_expiry</span> <span>DATE [NULL]</span></p>
                  <p className="flex justify-between"><span>dbs_status</span> <span>VARCHAR(30)</span></p>
                  <p className="flex justify-between"><span>dbs_expiry</span> <span>DATE</span></p>
                  <p className="flex justify-between"><span>joined_date</span> <span>DATE</span></p>
                </div>
              </div>

              {/* Table 2: Applicants */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:shadow-md transition">
                <div className="bg-rose-900 text-white p-2.5 font-bold flex justify-between">
                  <span>recruitment_pool</span>
                  <span className="text-[10px] text-rose-300">TABLE</span>
                </div>
                <div className="p-3 space-y-1 bg-white leading-normal text-[11px]">
                  <p className="font-bold text-rose-900 flex justify-between">
                    <span>🔑 id</span>
                    <span>VARCHAR [PK]</span>
                  </p>
                  <p className="flex justify-between"><span>full_name</span> <span>VARCHAR(100)</span></p>
                  <p className="flex justify-between"><span>email</span> <span>VARCHAR(150)</span></p>
                  <p className="flex justify-between"><span>phone</span> <span>VARCHAR(30)</span></p>
                  <p className="flex justify-between"><span>target_role</span> <span>VARCHAR(50)</span></p>
                  <p className="flex justify-between"><span>pipeline_stage</span> <span>VARCHAR(40)</span></p>
                  <p className="flex justify-between"><span>date_created</span> <span>DATE</span></p>
                  <p className="flex justify-between"><span>interview_grade</span> <span>INTEGER</span></p>
                </div>
              </div>

              {/* Table 3: Documents */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:shadow-md transition">
                <div className="bg-slate-800 text-white p-2.5 font-bold flex justify-between">
                  <span>documents_vault</span>
                  <span className="text-[10px] text-slate-400">TABLE</span>
                </div>
                <div className="p-3 space-y-1 bg-white leading-normal text-[11px]">
                  <p className="font-bold text-slate-800 flex justify-between">
                    <span>🔑 id</span>
                    <span>VARCHAR [PK]</span>
                  </p>
                  <p className="font-bold text-indigo-700 flex justify-between">
                    <span>🔗 staff_id</span>
                    <span>VARCHAR {"[FK -> staff.id]"}</span>
                  </p>
                  <p className="flex justify-between"><span>file_title</span> <span>VARCHAR(250)</span></p>
                  <p className="flex justify-between"><span>category_type</span> <span>VARCHAR(80)</span></p>
                  <p className="flex justify-between"><span>status_index</span> <span>VARCHAR(40)</span></p>
                  <p className="flex justify-between"><span>upload_timestamp</span> <span>TIMESTAMP</span></p>
                  <p className="flex justify-between"><span>expiry_date</span> <span>DATE [NULL]</span></p>
                  <p className="flex justify-between"><span>assigned_by_admin</span> <span>BOOLEAN</span></p>
                </div>
              </div>

              {/* Table 4: Timesheets */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:shadow-md transition">
                <div className="bg-indigo-900 text-white p-2.5 font-bold flex justify-between">
                  <span>weekly_timesheets</span>
                  <span className="text-[10px] text-indigo-300">TABLE</span>
                </div>
                <div className="p-3 space-y-1 bg-white leading-normal text-[11px]">
                  <p className="font-bold text-indigo-900 flex justify-between">
                    <span>🔑 id</span>
                    <span>VARCHAR [PK]</span>
                  </p>
                  <p className="font-bold text-indigo-700 flex justify-between">
                    <span>🔗 staff_id</span>
                    <span>VARCHAR {"[FK -> staff.id]"}</span>
                  </p>
                  <p className="flex justify-between"><span>week_ending_date</span> <span>DATE</span></p>
                  <p className="flex justify-between"><span>hours_logged</span> <span>NUMERIC(5,2)</span></p>
                  <p className="flex justify-between"><span>billing_rate_hourly</span> <span>NUMERIC(5,2)</span></p>
                  <p className="flex justify-between"><span>payout_gross</span> <span>NUMERIC(8,2)</span></p>
                  <p className="flex justify-between"><span>approval_status</span> <span>VARCHAR(30)</span></p>
                  <p className="flex justify-between"><span>upload_date</span> <span>DATE</span></p>
                </div>
              </div>

              {/* Table 5: Job Descriptions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:shadow-md transition">
                <div className="bg-emerald-900 text-white p-2.5 font-bold flex justify-between">
                  <span>role_templates</span>
                  <span className="text-[10px] text-emerald-300">TABLE</span>
                </div>
                <div className="p-3 space-y-1 bg-white leading-normal text-[11px]">
                  <p className="font-bold text-emerald-900 flex justify-between">
                    <span>🔑 role_key</span>
                    <span>VARCHAR [PK]</span>
                  </p>
                  <p className="flex justify-between"><span>salary_bracket_range</span> <span>VARCHAR(100)</span></p>
                  <p className="flex justify-between"><span>duties_checklist</span> <span>TEXT[]</span></p>
                  <p className="flex justify-between"><span>accreditations_list</span> <span>TEXT[]</span></p>
                </div>
              </div>

              {/* Connections indicator and keys explanation */}
              <div className="p-5 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-col justify-center leading-normal">
                <h4 className="text-xs font-black text-purple-950 uppercase mb-2 flex items-center">
                  <Zap className="w-4 h-4 mr-1 text-purple-700 shrink-0" /> ERD Relationships Key
                </h4>
                <div className="space-y-1.5 text-xs text-slate-700 font-sans">
                  <p className="flex items-center">
                    <span className="font-mono font-bold text-purple-800 mr-2">[PK]</span>
                    <span>Primary Key: Unique index for row selection.</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-mono font-bold text-indigo-700 mr-2">[FK]</span>
                    <span>Foreign Key: Correlates tables together.</span>
                  </p>
                  <p className="pt-2 border-t font-semibold">
                    Relation: `staff_members` (1) ───&lt; (N) `documents_vault` where document records link directly via the `staff_id` path.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: React Component Hierarchy Map */}
        {activeConsoleTab === 'components' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-6" id="components-tab">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-550 border-b pb-2 tracking-wider">
                React Component Architecture Tree Directory
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Functional component routing and global layout tree showing React dependencies.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border font-mono text-[11px] text-slate-850 leading-relaxed overflow-x-auto space-y-1 select-none">
              <p className="text-purple-900 font-bold">&lt;App /&gt; — [Handles login verification, role routing, and localStorage state syncing]</p>
              <p className="pl-6 text-slate-450 font-bold">├── &lt;Login /&gt; — [Credential checks, triggers demo views]</p>
              <p className="pl-6 text-slate-450 font-bold">└── &lt;DashboardLayout /&gt; — [Admin console wrapping sidebar and main canvas]</p>
              <p className="pl-12 text-blue-800 font-semibold">├── &lt;Sidebar /&gt; — [Primary side menu navigation tabs, state selectors]</p>
              <p className="pl-12 text-blue-800 font-semibold">├── &lt;Header /&gt; — [Logged-in role identifiers, notifications, role switcher buttons]</p>
              <p className="pl-12 text-indigo-805">├── &lt;Dashboard /&gt; — [Calculates KPI counts, visual meters, live audits overview]</p>
              <p className="pl-12 text-indigo-805">├── &lt;ApplicantKanban /&gt; — [Pool boards, transition switches, candidate notes modal]</p>
              <p className="pl-12 text-indigo-805">├── &lt;StaffDirectory /&gt; — [Search matrices, column grid lists, click routing to profiles]</p>
              <p className="pl-12 text-indigo-805">├── &lt;StaffProfile /&gt; — [Accreditations, interactive DBS overriding checkers, files uploader]</p>
              <p className="pl-12 text-indigo-805">├── &lt;DocumentVault /&gt; — [Cabinet files search tables, template assignment selectors]</p>
              <p className="pl-12 text-indigo-805">├── &lt;ComplianceDashboard /&gt; — [Red/Amber/Green alerts feeds, registration checkers]</p>
              <p className="pl-12 text-indigo-805">├── &lt;RoleTemplates /&gt; — [Designation brief parameters, hourly SLA guidelines]</p>
              <p className="pl-12 text-indigo-805">├── &lt;TimesheetManager /&gt; — [Approved cost calculators, timesheet billing tables, hours creator]</p>
              <p className="pl-12 text-indigo-805">└── &lt;DeveloperConsole /&gt; — [You are here: Schema viewer, props mapping, mock endpoints testing]</p>
            </div>
          </div>
        )}

        {/* TAB 3: Mock Backend server API sandbox */}
        {activeConsoleTab === 'apis' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-6" id="apis-tab">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-550 border-b pb-2 tracking-wider">
                Interactive Mock Backend API Playground (FastAPI Specs)
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">Trigger simulated API requests against the active client memory. View headers, parameters, and live JSON outputs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Endpoints directory */}
              <div className="md:col-span-5 space-y-3.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Available REST Endpoints</span>
                
                <button
                  onClick={() => { setSelectedEndpoint('GET_STAFF'); setApiResponse(''); }}
                  className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition text-xs font-semibold ${
                    selectedEndpoint === 'GET_STAFF' ? 'bg-slate-100 border-purple-500' : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="flex items-center">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded mr-2 text-[10px]">GET</span>
                    <span className="font-mono">/api/staff_directory</span>
                  </p>
                  <p className="text-[10px] text-slate-550 mt-1 class">Retrieves staff members credentials matching filters.</p>
                </button>

                <button
                  onClick={() => { setSelectedEndpoint('GET_APPLICANTS'); setApiResponse(''); }}
                  className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition text-xs font-semibold ${
                    selectedEndpoint === 'GET_APPLICANTS' ? 'bg-slate-100 border-purple-500' : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="flex items-center">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded mr-2 text-[10px]">GET</span>
                    <span className="font-mono">/api/recruitment_pipeline</span>
                  </p>
                  <p className="text-[10px] text-slate-550 mt-1">Retrieves candidates in applied, screening stages.</p>
                </button>

                <button
                  onClick={() => { setSelectedEndpoint('POST_DOCUMENT_ASSIGN'); setApiResponse(''); }}
                  className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition text-xs font-semibold ${
                    selectedEndpoint === 'POST_DOCUMENT_ASSIGN' ? 'bg-slate-100 border-purple-500' : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="flex items-center">
                    <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 rounded mr-2 text-[10px]">POST</span>
                    <span className="font-mono">/api/documents/assign</span>
                  </p>
                  <p className="text-[10px] text-slate-550 mt-1">Assigns manual templates to specific caregivers.</p>
                </button>

                <button
                  onClick={() => { setSelectedEndpoint('PUT_TIMESHEET_APPROVE'); setApiResponse(''); }}
                  className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition text-xs font-semibold ${
                    selectedEndpoint === 'PUT_TIMESHEET_APPROVE' ? 'bg-slate-100 border-purple-500' : 'bg-white border-slate-200'
                  }`}
                >
                  <p className="flex items-center">
                    <span className="bg-amber-100 text-amber-800 font-bold px-1.5 rounded mr-2 text-[10px]">PUT</span>
                    <span className="font-mono">/api/timesheets/:id/approve</span>
                  </p>
                  <p className="text-[10px] text-slate-550 mt-1">Approves staff weekly logged hours for payment dispatch.</p>
                </button>
              </div>

              {/* Right Output logs sandbox */}
              <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 flex flex-col justify-between text-slate-300 min-h-[350px]">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Express Server Port 3000 (Sandboxed)</span>
                    </div>
                    
                    <button
                      onClick={() => triggerApiMockCall(selectedEndpoint)}
                      disabled={loading}
                      className="p-1 px-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs flex items-center shadow-md disabled:opacity-40 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 mr-1 text-purple-200" /> {loading ? 'Fetching...' : 'Send Request'}
                    </button>
                  </div>

                  <div className="font-mono text-xs text-slate-400 space-y-1">
                    <p className="text-slate-500 flex items-center">
                      <Zap className="w-3 h-3 text-purple-400 mr-2 shrink-0" /> Authorization Bearer HSE_SECRET_TOKEN_SHC2026
                    </p>
                    <p className="text-slate-505">Access-Control-Allow-Origin: *</p>
                    <p className="text-slate-505">Content-Type: application/json</p>
                  </div>

                  <div className="mt-4 flex-1 font-mono text-[10px] leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-850 h-56 overflow-y-auto max-h-56 scrollbar-thin scrollbar-thumb-slate-800">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <span className="animate-spin text-lg mb-1">⏳</span>
                        <span>Requesting credentials mapping vectors...</span>
                      </div>
                    ) : apiResponse ? (
                      <pre className="text-purple-305">{apiResponse}</pre>
                    ) : (
                      <span className="text-slate-600 italic">Click "Send Request" to trigger a simulated backend REST output.</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Server latency: ~45ms</span>
                  <span>Payload Encoding: UTF-8</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
