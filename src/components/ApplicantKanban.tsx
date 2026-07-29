import React, { useState } from 'react';
import { Applicant, ApplicantStatus, RoleTemplate, CVData } from '../types';
import { Plus, Mail, Phone, Calendar, ArrowRight, ArrowLeft, Trash, ChevronRight, X, ShieldCheck, ClipboardList, Clock, CheckCircle, FileBadge } from 'lucide-react';
import CVBuilder from './CVBuilder';

interface ApplicantKanbanProps {
  applicants: Applicant[];
  onUpdateApplicantStatus: (id: string, newStatus: ApplicantStatus) => void;
  onAddApplicant: (applicant: Omit<Applicant, 'id' | 'dateCreated'>) => Promise<string>;
  templates: RoleTemplate[];
  onUpdateApplicantCompliance: (applicantId: string, complianceChecked: Record<string, 'Compliant' | 'Awaiting Review' | 'Missing'>) => void;
  onUpdateApplicantDetails: (id: string, fields: Partial<Applicant>) => void;
  onUploadDocument?: (file: File, category: string, staffId: string, staffName: string) => void;
  onSaveCVData?: (applicantId: string, cvData: CVData) => void;
  onGenerateCVPdf?: (applicantId: string, pdfBlob: Blob) => void;
  onDeleteApplicant?: (id: string) => void;
}

export default function ApplicantKanban({
  applicants,
  onUpdateApplicantStatus,
  onAddApplicant,
  templates,
  onUpdateApplicantCompliance,
  onUpdateApplicantDetails,
  onUploadDocument,
  onSaveCVData,
  onGenerateCVPdf,
  onDeleteApplicant
}: ApplicantKanbanProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showCVBuilder, setShowCVBuilder] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New applicant form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPos, setNewPos] = useState<string>(templates[0]?.role || 'Care Assistant');
  const [newNotes, setNewNotes] = useState('');

  // Define Kanban status list order
  const statuses: ApplicantStatus[] = ['Applied', 'Screening', 'Interview', 'Compliance', 'Accepted', 'Rejected'];

  const handleCreateApplicant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPhone) return;

    const newId = await onAddApplicant({
      name: newName,
      email: newEmail,
      phone: newPhone,
      position: newPos,
      status: 'Applied',
      notes: newNotes
    });

    // Reset form
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPos('Care Assistant');
    setNewNotes('');
    setShowAddModal(false);
    
    // Auto-select the newly registered candidate to trigger document upload prompts
    const newlyCreated = {
      id: newId,
      name: newName,
      email: newEmail,
      phone: newPhone,
      position: newPos,
      status: 'Applied' as ApplicantStatus,
      dateCreated: new Date().toISOString().split('T')[0],
      notes: newNotes
    };
    setSelectedApplicant(newlyCreated);
  };

  const getStatusColor = (status: ApplicantStatus) => {
    switch (status) {
      case 'Applied': return 'border-t-2 border-t-indigo-500 bg-indigo-50/50';
      case 'Screening': return 'border-t-2 border-t-amber-500 bg-amber-50/30';
      case 'Interview': return 'border-t-2 border-t-purple-500 bg-purple-50/30';
      case 'Compliance': return 'border-t-2 border-t-rose-500 bg-rose-50/30';
      case 'Accepted': return 'border-t-2 border-t-emerald-500 bg-emerald-50/40';
      case 'Rejected': return 'border-t-2 border-t-slate-500 bg-slate-100/50';
    }
  };

  // State movement helpers
  const moveRight = (id: string, currentStatus: ApplicantStatus) => {
    const currentIndex = statuses.indexOf(currentStatus);
    if (currentIndex < statuses.length - 1) {
      onUpdateApplicantStatus(id, statuses[currentIndex + 1]);
    }
  };

  const moveLeft = (id: string, currentStatus: ApplicantStatus) => {
    const currentIndex = statuses.indexOf(currentStatus);
    if (currentIndex > 0) {
      onUpdateApplicantStatus(id, statuses[currentIndex - 1]);
    }
  };

  return (
    <div className="space-y-6" id="shc-kanban-view">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Registered Recruitment Pipeline</h2>
          <p className="text-xs text-slate-500 font-medium">Click on cards to inspect history, select next stages, or add new files dynamically.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-900 to-rose-700 hover:from-purple-950 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Applicant</span>
        </button>
      </div>

      {/* Kanban Grid Scroll Workspace */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin">
        <div className="flex space-x-4 min-w-[1240px]">
          {statuses.map((stage) => {
            const stageApplicants = applicants.filter(a => a.status === stage);
            return (
              <div key={stage} className="w-80 shrink-0 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex flex-col min-h-[500px]">
                {/* Column Headers */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">{stage}</span>
                    <span className="text-[10px] font-extrabold p-1 px-2.5 bg-slate-200/80 text-slate-700 rounded-full">
                      {stageApplicants.length}
                    </span>
                  </div>
                </div>

                {/* Candidate Cards Stream */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] scrollbar-none">
                  {stageApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all relative ${getStatusColor(applicant.status)}`}
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => setSelectedApplicant(applicant)}
                      >
                        <span className="text-[10px] font-bold text-purple-900 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                          {applicant.position}
                        </span>
                        <h4 className="font-bold text-slate-900 mt-2 text-sm group-hover:text-purple-600">
                          {applicant.name}
                        </h4>
                        
                        <div className="mt-3 space-y-1 text-slate-600 text-[11px] font-medium leading-normal">
                          <p className="flex items-center">
                            <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                            <span className="truncate">{applicant.email}</span>
                          </p>
                          <p className="flex items-center">
                            <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                            <span>{applicant.phone}</span>
                          </p>
                          <p className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                            <span>Applied: {applicant.dateCreated}</span>
                          </p>
                        </div>
                        
                        {applicant.interviewMeetUrl && (
                          <div className="mt-2.5 p-2 bg-indigo-50 border border-indigo-150 rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-[10px] text-indigo-950 font-bold max-w-[70%]">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="truncate font-sans text-[10px] text-indigo-900 leading-normal font-semibold">
                                {applicant.interviewTime ? new Date(applicant.interviewTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Google Meet'}
                              </span>
                            </div>
                            <a
                              href={applicant.interviewMeetUrl}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              rel="noreferrer"
                              className="text-[9px] font-black text-[#be185d] hover:text-pink-800 flex items-center bg-white p-1 px-2 border border-slate-250 rounded shadow-sm hover:shadow"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Join Meet
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Direction Shift Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          disabled={applicant.status === 'Applied'}
                          onClick={() => moveLeft(applicant.id, applicant.status)}
                          className="p-1 px-2 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 text-[10px] font-bold flex items-center cursor-pointer transition-all"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 mr-0.5" />
                          <span>Prev</span>
                        </button>

                        <button
                          disabled={applicant.status === 'Rejected'}
                          onClick={() => {
                            if (applicant.status === 'Accepted') {
                              // If shifting active, mark rejected
                              onUpdateApplicantStatus(applicant.id, 'Rejected');
                            } else if (applicant.status === 'Applied') {
                              // Require checklist completed before moving to screening
                              const template = templates.find(t => t.role === applicant.position);
                              const reqs = template?.requiredCredentials || [];
                              const allCompliant = reqs.length > 0 && reqs.every(req => applicant.complianceChecked && applicant.complianceChecked[req] === 'Compliant');
                              
                              if (!allCompliant && reqs.length > 0) {
                                alert("Documentation incomplete. Please open the applicant's profile to upload documents and complete the compliance checklist first.");
                                setSelectedApplicant(applicant); // Open the profile to prompt upload
                                return;
                              }
                              moveRight(applicant.id, applicant.status);
                            } else {
                              moveRight(applicant.id, applicant.status);
                            }
                          }}
                          className="p-1 px-2 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 text-[10px] font-bold flex items-center cursor-pointer transition-all"
                        >
                          <span>{applicant.status === 'Accepted' ? 'Reject' : 'Next'}</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {stageApplicants.length === 0 && (
                    <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-center p-3 text-xs text-slate-400 font-medium bg-white/50">
                      <span>No candidates in draft</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Candidate Registration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Register Candidate Profile</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApplicant} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 label-required">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Eleanor Vance"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-500"
                    placeholder="e.vance@nhs.net"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Phone Code</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-500"
                    placeholder="+44 7700 900077"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Position Target</label>
                <select
                  value={newPos}
                  onChange={(e) => setNewPos(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-purple-500"
                >
                  {templates.map(t => (
                    <option key={t.role} value={t.role}>{t.role} ({t.salaryRange})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Registration Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs h-20 focus:ring-1 focus:ring-purple-500"
                  placeholder="Insert specialized credentials, prior references, or agency interview requirements..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirm Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Candidate Detail Sidebar Modal */}
      {selectedApplicant && (() => {
        // Find matching job template
        const jobTemplate = templates.find(t => t.role.toLowerCase() === selectedApplicant.position.toLowerCase()) || templates[0];
        const statusChecklist = selectedApplicant.complianceChecked || {};

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
            <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-100">
              <div className="overflow-y-auto flex-1">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                      {selectedApplicant.position}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-2">{selectedApplicant.name}</h3>
                  </div>
                  <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Contact Card</h4>
                    <div className="mt-2 space-y-2 text-xs font-medium text-slate-800 font-sans">
                      <p className="flex justify-between">
                        <span className="text-slate-500">Email Address:</span>
                        <a href={`mailto:${selectedApplicant.email}`} className="text-purple-700 hover:underline">{selectedApplicant.email}</a>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Mobile Direct:</span>
                        <span>{selectedApplicant.phone}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-500">Registered Date:</span>
                        <span>{selectedApplicant.dateCreated}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => setShowCVBuilder(true)}
                      className="w-full flex items-center justify-center space-x-2 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition-colors"
                    >
                      <FileBadge className="w-4 h-4" />
                      <span>Manage & Generate CV</span>
                    </button>
                  </div>

                  {/* job description autolink section */}
                  {jobTemplate && (
                    <div className="pt-4 border-t border-slate-100 space-y-2.5">
                      <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-wider flex items-center">
                        <ClipboardList className="w-3.5 h-3.5 mr-1" /> Linked Designation Brief
                      </h4>
                      <div className="p-3 bg-purple-50/40 border border-purple-100 rounded-xl space-y-2">
                        <p className="text-[11px] font-extrabold text-purple-950 flex justify-between">
                          <span>SLA Target Pay:</span>
                          <span>{jobTemplate.salaryRange}</span>
                        </p>
                        <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                          {jobTemplate.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* interactive required document checklist */}
                  {jobTemplate && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-wider flex items-center">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Statutory compliance checklists
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-normal -mt-1.5">
                        Verify and declare certification status. Updates synchronize with compliance dashboards.
                      </p>
                      <div className="space-y-2">
                        {jobTemplate.requiredCredentials.map((cred) => {
                          const currentStatus = statusChecklist[cred] || 'Missing';
                          return (
                            <div key={cred} className="p-2.5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-800 leading-snug">{cred}</span>
                                <span className={`p-0.5 px-2 text-[9px] font-black uppercase rounded-full border ${
                                  currentStatus === 'Compliant'
                                    ? 'bg-emerald-50 text-emerald-850 border-emerald-200'
                                    : currentStatus === 'Awaiting Review'
                                    ? 'bg-amber-50 text-amber-850 border-amber-250'
                                    : 'bg-rose-50 text-rose-850 border-rose-200'
                                }`}>
                                  {currentStatus}
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-1 font-sans mt-1">
                                <label className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 transition">
                                  + Upload Document
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".pdf,image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file && onUploadDocument) {
                                        onUploadDocument(file, cred, selectedApplicant.id, selectedApplicant.name);
                                      }
                                      
                                      const nextChecklist = { ...statusChecklist, [cred]: 'Awaiting Review' };
                                      onUpdateApplicantCompliance(selectedApplicant.id, nextChecklist);
                                      setSelectedApplicant({ ...selectedApplicant, complianceChecked: nextChecklist });
                                    }} 
                                  />
                                </label>
                                <div className="flex gap-1 border-l pl-2 border-slate-200">
                                  {(['Missing', 'Awaiting Review', 'Compliant'] as const).map(opt => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        const nextChecklist = { ...statusChecklist, [cred]: opt };
                                        onUpdateApplicantCompliance(selectedApplicant.id, nextChecklist);
                                        setSelectedApplicant({
                                          ...selectedApplicant,
                                          complianceChecked: nextChecklist
                                        });
                                      }}
                                      className={`px-2 py-1 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${
                                        currentStatus === opt
                                          ? opt === 'Compliant'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : opt === 'Awaiting Review'
                                            ? 'bg-amber-500 text-slate-900 shadow-sm'
                                            : 'bg-rose-600 text-white shadow-sm'
                                          : 'bg-white text-slate-600 hover:bg-slate-100 border'
                                      }`}
                                    >
                                      {opt === 'Awaiting Review' ? 'Review' : opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Google Meet virtual interviews */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-[10px] font-black text-[#5e2290] uppercase tracking-wider flex items-center">
                      <span className="text-sm mr-1.5">🎥</span> virtual interviews & Google Meet
                    </h4>
                    
                    {selectedApplicant.interviewMeetUrl ? (
                      <div className="p-3 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] uppercase font-black text-fuchsia-900 leading-normal">Active Meet Space Connected</p>
                            <p className="text-xs text-slate-700 font-bold mt-1">
                              Time: {selectedApplicant.interviewTime ? new Date(selectedApplicant.interviewTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not Scheduled'}
                            </p>
                          </div>
                          <span className="p-0.5 px-2 text-[9px] font-black uppercase rounded-full border bg-emerald-50 text-emerald-800 border-emerald-250 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Provisioned</span>
                          </span>
                        </div>

                        <div className="flex gap-2 font-sans mt-2">
                          <a
                            href={selectedApplicant.interviewMeetUrl}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            rel="noreferrer"
                            className="flex-1 text-center py-1.5 bg-gradient-to-r from-purple-900 to-rose-700 hover:opacity-90 text-white text-[10px] font-bold rounded-lg shadow-sm"
                          >
                            Launch Meet Room
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateApplicantDetails(selectedApplicant.id, {
                                interviewMeetUrl: undefined,
                                interviewTime: undefined
                              });
                              setSelectedApplicant({
                                ...selectedApplicant,
                                interviewMeetUrl: undefined,
                                interviewTime: undefined
                              });
                            }}
                            className="px-2.5 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl space-y-3">
                        <p className="text-[11px] text-slate-550 font-medium leading-relaxed">
                          Schedule a custom virtual recruitment interview space instantly using Google Meet.
                        </p>
                        
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wide">Interview Target Time</label>
                          <input
                            type="datetime-local"
                            id="interview-datetime-input"
                            defaultValue={new Date(Date.now() + 86400000).toISOString().slice(0, 16)} // Defaults to tomorrow
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-500 bg-white shadow-inner font-sans"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const dateInput = document.getElementById('interview-datetime-input') as HTMLInputElement;
                            const schedTime = dateInput?.value || new Date().toISOString();
                            
                            // Check if a workspace token is available in sessionStorage
                            const token = sessionStorage.getItem('shc_google_access_token');
                            
                            if (!token) {
                              alert('Google Workspace is not connected. Connect a valid Workspace account before creating an interview space.');
                              return;
                            }

                            try {
                              const response = await fetch('https://meet.googleapis.com/v2/spaces', {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({})
                              });
                              
                              if (!response.ok) {
                                throw new Error('Google Meet API rejected the request.');
                              }

                              const data = await response.json();
                              const meetUrl = data.meetingUri;
                              if (!meetUrl) {
                                throw new Error('Google Meet API did not return a meeting URL.');
                              }

                              onUpdateApplicantDetails(selectedApplicant.id, {
                                interviewMeetUrl: meetUrl,
                                interviewTime: schedTime
                              });
                              setSelectedApplicant({
                                ...selectedApplicant,
                                interviewMeetUrl: meetUrl,
                                interviewTime: schedTime
                              });
                              alert(`Successfully reserved live Google Meet space via Google API:\n\n${meetUrl}`);
                            } catch (err: any) {
                              console.error('Error creating Google Meet space:', err);
                              alert(err.message || 'Error creating Google Meet space.');
                            }
                          }}
                          className="w-full py-2 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"
                        >
                          Generate Google Meet Space
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Notes</h4>
                    <p className="mt-2 text-xs leading-relaxed text-slate-705 bg-slate-100/50 p-3 rounded-lg border border-slate-150">
                      {selectedApplicant.notes || 'No review notes has been registered for this candidate yet.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stage Progression Selection</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {statuses.map(stg => (
                        <button
                          key={stg}
                          onClick={() => {
                            onUpdateApplicantStatus(selectedApplicant.id, stg);
                            setSelectedApplicant({ ...selectedApplicant, status: stg });
                          }}
                          className={`p-2 rounded-xl text-center text-xs font-semibold border transition-all cursor-pointer ${
                            selectedApplicant.status === stg
                              ? 'bg-purple-900 text-white border-purple-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {stg}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col space-y-3">
                {showDeleteConfirm ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-left">
                    <p className="text-[11px] font-black text-rose-900 uppercase">⚠️ Warning: Ultimate Deletion</p>
                    <p className="text-[10px] text-rose-800 leading-normal font-semibold">
                      This will permanently purge this applicant's entire profile, document vault files, timesheet claims, and historical logs from the system database. This action is irreversible.
                    </p>
                    <div className="flex space-x-2 pt-1.5">
                      <button
                        onClick={async () => {
                          if (onDeleteApplicant) {
                            await onDeleteApplicant(selectedApplicant.id);
                          }
                          setShowDeleteConfirm(false);
                          setSelectedApplicant(null);
                        }}
                        className="flex-1 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-[10px] font-bold rounded-lg shadow-sm"
                      >
                        Yes, Delete Everything
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 border border-slate-350 bg-white text-slate-700 text-[10px] font-bold rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    {onDeleteApplicant && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2.5 border border-rose-200 hover:bg-rose-50 text-rose-750 hover:text-rose-800 text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1 shrink-0"
                        title="Delete Applicant Permanently"
                      >
                        <Trash className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedApplicant(null);
                        setShowDeleteConfirm(false);
                      }}
                      className="w-full text-center py-2.5 border border-slate-350 text-slate-705 bg-white hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Close Profile
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CV Builder Modal */}
      {showCVBuilder && selectedApplicant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            <button 
              onClick={() => setShowCVBuilder(false)} 
              className="absolute top-4 right-4 z-10 text-slate-500 hover:text-slate-800 bg-white p-1 rounded-full shadow-sm"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex-1 overflow-y-auto">
              <CVBuilder 
                applicant={selectedApplicant} 
                onSaveCVData={(id, data) => onSaveCVData && onSaveCVData(id, data)}
                onGeneratePDF={(id, blob) => onGenerateCVPdf && onGenerateCVPdf(id, blob)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
