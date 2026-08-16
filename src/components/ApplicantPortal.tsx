import React, { useState, useEffect } from 'react';
import { Applicant, RoleTemplate, Document } from '../types';
import { 
  Upload, FileText, CheckCircle, Clock, Eye, ExternalLink, X,
  PenTool, ShieldCheck, UserCheck, BookOpen, AlertCircle, Sparkles, CheckSquare
} from 'lucide-react';
import OnlineApplicationForm from './OnlineApplicationForm';
import PassportPhotoUpload from './PassportPhotoUpload';
import HrOnboardingFormEditor from './HrOnboardingFormEditor';
import JobDescriptionApplicant from './JobDescriptionApplicant';
import BrandedLogo from './BrandedLogo';
import { getSignedUrlForDocument } from '../lib/supabase';
import { getSubjectDocuments, resolveAvatarUrl, resolveDisplayAvatarUrl, resolvePreferredAvatarUrl } from '../lib/profileState';
import SHCLoader from './SHCLoader';
import { loadOfficialApplication } from '../lib/officialApplicationRepository';
import { OfficialApplicationStatus } from '../types/officialApplication';
import { OfficialApplicationData } from '../types/officialApplication';
import {
  activeRequirements,
  findRole,
  requirementDocumentCategories,
  requirementProgress
} from '../lib/roleEngine';
import { configuredHrForms, isHrOnboardingComplete } from '../lib/hrOnboarding';
import { loadHrOnboardingForms } from '../lib/hrOnboardingRepository';
import { HrFormDefinition, HrOnboardingForm } from '../types/hrOnboarding';
import { JobDescription, JobDescriptionAcknowledgement } from '../types/jobDescription';
import { loadCurrentJobDescription, loadJobDescriptionAcknowledgements } from '../lib/jobDescriptionRepository';
import { currentJobDescriptionComplete, jobDescriptionStatus } from '../lib/jobDescriptions';
import ApplicantCompliancePanel from './ApplicantCompliancePanel';

interface ApplicantPortalProps {
  applicant: Applicant;
  authenticatedUserId: string;
  templates: RoleTemplate[];
  documents: Document[];
  onUploadDocument: (file: File, category: string) => Promise<void> | void;
  onLogout: () => void;
  onUpdateRole: (role: RoleTemplate) => Promise<void> | void;
  onSaveCVData?: (applicantId: string, cvData: any) => void;
  onSaveDocument?: (doc: Document) => void;
}

export default function ApplicantPortal({
  applicant,
  authenticatedUserId,
  templates,
  documents,
  onUploadDocument,
  onLogout,
  onUpdateRole,
  onSaveCVData,
  onSaveDocument
}: ApplicantPortalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'application_form' | 'hr_documents' | 'job_description' | 'pre_employment'>('overview');
  const [applicationStatus, setApplicationStatus] = useState<OfficialApplicationStatus | 'Not Started' | 'Loading' | 'Unavailable'>('Loading');
  const [applicationData, setApplicationData] = useState<OfficialApplicationData | null>(null);
  const [hrForms, setHrForms] = useState<HrOnboardingForm[]>([]);
  const [hrFormsLoading, setHrFormsLoading] = useState(true);
  const [activeHrDefinition, setActiveHrDefinition] = useState<HrFormDefinition | null>(null);
  const [currentJobDescription, setCurrentJobDescription] = useState<JobDescription | null>(null);
  const [jobDescriptionAcknowledgements, setJobDescriptionAcknowledgements] = useState<JobDescriptionAcknowledgement[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState(applicant.roleId || '');
  const [savingRole, setSavingRole] = useState(false);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [resolvedViewingUrl, setResolvedViewingUrl] = useState<string | null>(null);
  const [isLoadingViewing, setIsLoadingViewing] = useState(false);

  // Profile avatar photo url state
  const applicantIdentity = { userId: authenticatedUserId, applicantId: applicant.id };
  const applicationAvatarUrl = applicant.cvData?.personalDetails?.avatarUrl;
  const resolvedAvatarUrl = resolvePreferredAvatarUrl(
    applicationAvatarUrl,
    resolveAvatarUrl(documents, applicantIdentity)
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(resolvedAvatarUrl || '');

  useEffect(() => {
    let active = true;
    resolveDisplayAvatarUrl(resolvedAvatarUrl).then(url => {
      if (active) setAvatarUrl(url || '');
    });
    return () => {
      active = false;
    };
  }, [resolvedAvatarUrl]);

  useEffect(() => {
    let active = true;
    setApplicationStatus('Loading');
    loadOfficialApplication(authenticatedUserId)
      .then(application => {
        if (!active) return;
        setApplicationData(application);
        setApplicationStatus(application?.status || 'Not Started');
        if (!selectedRoleId && application?.roleId) setSelectedRoleId(application.roleId);
      })
      .catch(error => {
        console.error('Unable to load the official application status:', error);
        if (active) setApplicationStatus('Unavailable');
      });
    return () => { active = false; };
  }, [authenticatedUserId, activeTab]);

  useEffect(() => {
    let active = true;
    setHrFormsLoading(true);
    loadHrOnboardingForms(authenticatedUserId)
      .then(forms => { if (active) setHrForms(forms); })
      .catch(error => console.error('Unable to load HR onboarding forms:', error))
      .finally(() => { if (active) setHrFormsLoading(false); });
    return () => { active = false; };
  }, [authenticatedUserId]);

  useEffect(() => {
    setSelectedRoleId(applicant.roleId || selectedRoleId);
  }, [applicant.roleId]);

  useEffect(() => {
    let active = true;
    if (viewingFileUrl) {
      setIsLoadingViewing(true);
      getSignedUrlForDocument(viewingFileUrl).then(url => {
        if (active) {
          setResolvedViewingUrl(url);
          setIsLoadingViewing(false);
        }
      }).catch(err => {
        console.error("Error resolving viewing URL in applicant portal:", err);
        if (active) setIsLoadingViewing(false);
      });
    } else {
      setResolvedViewingUrl(null);
    }
    return () => {
      active = false;
    };
  }, [viewingFileUrl]);

  const jobTemplate = findRole(templates, selectedRoleId, applicant.position);
  const configuredOnboardingForms = configuredHrForms(jobTemplate);
  const availableRoles = templates.filter(role => role.active !== false);
  const uploadOptions = requirementDocumentCategories(jobTemplate);

  useEffect(() => {
    let active = true;
    Promise.all([
      jobTemplate?.id ? loadCurrentJobDescription(jobTemplate.id) : Promise.resolve(null),
      loadJobDescriptionAcknowledgements(authenticatedUserId),
    ]).then(([description, acknowledgements]) => {
      if (!active) return;
      setCurrentJobDescription(description);
      setJobDescriptionAcknowledgements(acknowledgements);
    }).catch(error => console.error('Unable to load Job Description status:', error));
    return () => { active = false; };
  }, [authenticatedUserId, jobTemplate?.id]);

  // Documents for this applicant
  const applicantDocs = getSubjectDocuments(documents, applicantIdentity);

  const handleRoleChange = async (role: RoleTemplate) => {
    const previousRoleId = selectedRoleId;
    setSelectedRoleId(role.id || '');
    setSavingRole(true);
    try {
      await onUpdateRole(role);
      setApplicationData(current => current ? {
        ...current,
        roleId: role.id,
        positionApplied: role.role
      } : current);
    } catch (error: any) {
      setSelectedRoleId(previousRoleId);
      alert(error.message || 'Role selection could not be saved.');
      throw error;
    } finally {
      setSavingRole(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadCategory) {
      alert("Please select a file and document category.");
      return;
    }

    setIsUploading(true);
    try {
      await onUploadDocument(uploadFile, uploadCategory);
      setUploadFile(null);
      setUploadCategory('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveApplicationForm = async (applicantId: string, formData: Record<string, any>) => {
    // Save to the dedicated applications table via App's handler
    if (onSaveCVData) {
      onSaveCVData(applicantId, {
        personalDetails: {
          address: formData.address,
          dob: formData.dob,
          nationality: formData.nationality,
          title: formData.title,
          gender: formData.gender,
          niNumber: formData.niNumber,
          rightToWorkStatus: formData.rightToWorkStatus,
          emergencyName: formData.emergencyName,
          emergencyRelation: formData.emergencyRelation,
          emergencyPhone: formData.emergencyPhone,
        },
        employmentHistory: formData.employmentHistory,
        qualifications: formData.educationHistory,
        mandatoryTraining: formData.mandatoryTrainings,
        skills: formData.skills,
        references: formData.references
      });
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <BrandedLogo layout="horizontal" size="xs" />
            <div>
              <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black uppercase rounded">
                Candidate Portal
              </span>
              <span className="text-xs text-slate-500 font-semibold">• Position: {jobTemplate?.role || 'Not selected'}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-1">{applicant.name}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex max-w-full gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'overview' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Overview & Compliance
              </button>
              <button
                onClick={() => setActiveTab('application_form')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'application_form' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Application Form
              </button>
              <button
                onClick={() => setActiveTab('hr_documents')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'hr_documents' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. HR Onboarding Forms
              </button>
              <button
                onClick={() => setActiveTab('job_description')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'job_description' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                4. Job Description
              </button>
              <button
                onClick={() => setActiveTab('pre_employment')}
                className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'pre_employment' ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                5. Pre-employment Checks
              </button>
            </nav>

            <button
              onClick={onLogout}
              className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        <section className={`rounded-2xl border p-5 shadow-sm ${jobTemplate ? 'border-purple-200 bg-white' : 'border-amber-300 bg-amber-50'}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Role you are applying for</h2>
              <p className="mt-1 text-xs text-slate-600">
                Your application, onboarding and deployment checklist updates from SHC’s role configuration.
              </p>
            </div>
            <select
              value={jobTemplate?.id || ''}
              disabled={savingRole}
              onChange={event => {
                const role = templates.find(item => item.id === event.target.value);
                if (role) void handleRoleChange(role).catch(() => undefined);
              }}
              className="min-w-64 rounded-xl border border-purple-300 bg-white px-3 py-2.5 text-sm font-bold text-purple-950 disabled:opacity-60"
              required
            >
              <option value="">Select Nurse or Care Assistant</option>
              {availableRoles.map(role => (
                <option key={role.id || role.role} value={role.id}>{role.role}</option>
              ))}
            </select>
          </div>
          {savingRole && <p className="mt-2 text-[11px] font-bold text-purple-800">Saving role selection…</p>}
          {!jobTemplate && <p className="mt-3 text-xs font-bold text-amber-900">Select a role before completing or submitting the application.</p>}
        </section>

        {/* TAB 1: OVERVIEW & COMPLIANCE */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Onboarding Stage Tracker */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-700" />
                Candidate Onboarding Workflow Journey
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { title: '1. Register Account', status: 'Done', desc: 'Account Created' },
                  { title: '2. Admin Activated', status: 'Done', desc: 'Active Candidate' },
                  { title: '3. Application Form', status:
                    applicationStatus === 'Loading' ? 'Loading' :
                    applicationStatus === 'Unavailable' ? 'Unavailable' :
                    applicationStatus === 'Not Started' ? 'Not Started' :
                    applicationStatus === 'Draft' ? 'In Progress' :
                    applicationStatus === 'Returned for Correction' ? 'Returned' :
                    applicationStatus,
                    desc: applicationStatus },
                  { title: '4. HR Onboarding', status: isHrOnboardingComplete(jobTemplate, hrForms) ? 'Done' : hrForms.length ? 'In Progress' : 'Pending', desc: 'Persistent HR forms' },
                  { title: '5. Job Description', status: currentJobDescriptionComplete(currentJobDescription, jobDescriptionAcknowledgements) ? 'Done' : currentJobDescription ? 'In Progress' : 'Pending', desc: jobDescriptionStatus(currentJobDescription, jobDescriptionAcknowledgements) }
                ].map((step, idx) => {
                  const isDone = step.status === 'Done' || step.status === 'Approved';
                  const isCurrent = step.status === 'In Progress' || step.status === 'Returned';
                  return (
                    <div key={idx} className={`p-3 rounded-xl border text-left ${
                      isDone ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' :
                      isCurrent ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold' :
                      'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <span className="text-[10px] uppercase font-black tracking-wider block">Step {idx + 1}</span>
                      <div className="text-xs font-bold mt-0.5">{step.title}</div>
                      <span className={`text-[9px] font-extrabold mt-1 block px-1.5 py-0.5 rounded w-fit ${
                        isDone ? 'bg-emerald-200/60 text-emerald-900' :
                        isCurrent ? 'bg-purple-200/60 text-purple-900' :
                        'bg-slate-200/60 text-slate-600'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Passport Photo Upload Component */}
            <PassportPhotoUpload
              currentPhotoUrl={avatarUrl}
              userId={authenticatedUserId}
              applicantId={applicant.id}
              userName={applicant.name}
              onPhotoUploaded={url => {
                setAvatarUrl(url);
                onSaveCVData?.(applicant.id, {
                  ...(applicant.cvData || {}),
                  personalDetails: {
                    ...(applicant.cvData?.personalDetails || {}),
                    avatarUrl: url
                  }
                });
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role-driven requirements checklist */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    {jobTemplate ? `${jobTemplate.role} Requirements` : 'Role Requirements'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Applicant actions and SHC office checks are shown separately so office verification is not treated as your error.
                  </p>
                </div>

                {jobTemplate ? (
                  <div className="space-y-5">
                    {([
                      ['application', 'Application'],
                      ['onboarding', 'HR Onboarding'],
                      ['deployment', 'Deployment / Office Verification']
                    ] as const).map(([stage, title]) => (
                      <div key={stage}>
                        <h3 className="mb-2 text-[10px] font-black uppercase tracking-wider text-purple-900">{title}</h3>
                        <div className="space-y-2">
                          {activeRequirements(jobTemplate, stage).map(requirement => {
                            const status = requirementProgress(requirement, applicationData, applicantDocs, hrForms, currentJobDescriptionComplete(currentJobDescription, jobDescriptionAcknowledgements));
                            return (
                              <div key={requirement.id || requirement.requirementKey} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <span className="text-xs font-bold text-slate-800">{requirement.displayName}</span>
                                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                      {requirement.responsibleParty === 'administrator' ? 'SHC office responsible' : 'Applicant responsible'}
                                      {!requirement.required && ' · Optional'}
                                    </span>
                                  </div>
                                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase ${
                                    status === 'Complete' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
                                    status === 'Pending SHC Verification' || status === 'In Progress' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                                    'border-rose-200 bg-rose-50 text-rose-800'
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900">
                    Select a role to load its requirements.
                  </div>
                )}
              </section>

              {/* Upload Widget */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Upload Compliance Document
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Attach PDF or image file (DBS, Passport, Right to Work, Training).
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Document Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                    >
                      <option value="">-- Choose Category --</option>
                      {uploadOptions.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                      <option value="Passport">Passport / Photo ID</option>
                      <option value="DBS Certificate">DBS Certificate</option>
                      <option value="Right to Work">Right to Work Proof</option>
                      <option value="Training Certificate">Training Certificate</option>
                      <option value="Reference">Professional Reference</option>
                      <option value="Other">Other Document</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select File (PDF or Image)</label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-xl file:border-0
                        file:text-xs file:font-bold
                        file:bg-purple-50 file:text-purple-900
                        hover:file:bg-purple-100 cursor-pointer border border-slate-200 rounded-xl p-1"
                    />
                  </div>

                  <button
                    onClick={handleUpload}
                    disabled={!uploadFile || !uploadCategory || isUploading}
                    className="w-full py-2.5 bg-purple-900 hover:bg-purple-800 text-white text-xs font-extrabold rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? <SHCLoader text="Uploading document…" className="text-white [&_.shc-loader__text]:text-white" /> : 'Confirm & Save Document'}
                  </button>
                </div>
              </section>
            </div>

            {/* Submitted Documents Vault */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Submitted Candidate Documents Archive
              </h2>

              {applicantDocs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No compliance documents have been submitted yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {applicantDocs.map(doc => (
                    <div key={doc.id} className="p-3.5 border border-slate-200 rounded-xl bg-white flex flex-col justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-black text-purple-900 uppercase tracking-wider">{doc.category}</span>
                        <h3 className="text-xs font-bold text-slate-800 mt-1 truncate" title={doc.name}>{doc.name}</h3>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                        <span className="text-slate-400 font-semibold">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1.5">
                          {doc.fileUrl && (
                            <button
                              onClick={() => setViewingFileUrl(doc.fileUrl)}
                              className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded font-bold border border-purple-200 transition cursor-pointer flex items-center gap-0.5"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          )}
                          <span className={`px-2 py-0.5 rounded-full font-extrabold ${
                            doc.status === 'Approved' || doc.status === 'Signed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            doc.status === 'Awaiting Review' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: ONLINE APPLICATION FORM */}
        {activeTab === 'application_form' && (
          <div className="animate-in fade-in duration-200">
            <OnlineApplicationForm
              applicant={applicant}
              authenticatedUserId={authenticatedUserId}
              templates={templates}
              onRoleChange={handleRoleChange}
              onCancel={() => setActiveTab('overview')}
            />
          </div>
        )}

        {/* TAB 3: HR ONBOARDING DOCUMENTS */}
        {activeTab === 'hr_documents' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-[10px] uppercase font-black tracking-widest text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                Digital HR Paperwork
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Mandatory HR Onboarding Forms</h2>
              <p className="text-xs text-slate-500 mt-1">Fill, save, sign and submit the forms configured for your role. Drafts and review status persist securely in Supabase.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hrFormsLoading && <div className="rounded-xl border bg-white p-5 text-xs text-slate-500">Loading your HR forms…</div>}
              {!hrFormsLoading && configuredOnboardingForms.map((definition) => {
                const existing = hrForms.find(form => form.formType === definition.type);
                const status = existing?.status || 'Not Started';

                return (
                  <div key={definition.type} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          {definition.signatureRequired ? 'Electronic signature' : 'Secure HR record'}
                        </span>
                        <span className={`text-[10px] font-extrabold border px-2.5 py-0.5 rounded-full ${status === 'Approved' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : status === 'Returned for Correction' ? 'text-rose-800 bg-rose-50 border-rose-200' : 'text-amber-800 bg-amber-50 border-amber-200'}`}>{status}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 mt-2">{definition.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{definition.description}</p>
                      {existing?.updatedAt && <p className="mt-2 text-[10px] text-slate-400">Last saved {new Date(existing.updatedAt).toLocaleString()} · revision {existing.revision}</p>}
                      {existing?.reviewerNotes && status === 'Returned for Correction' && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] font-bold text-rose-900">SHC note: {existing.reviewerNotes}</p>}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => setActiveHrDefinition(definition)}
                        className="w-full py-2 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 bg-purple-900 hover:bg-purple-800 text-white"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>{existing && !['Draft', 'Returned for Correction'].includes(existing.status) ? 'View form' : existing ? 'Continue form' : 'Start form'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {!hrFormsLoading && jobTemplate && configuredOnboardingForms.length === 0 && <div className="rounded-xl border border-dashed bg-white p-5 text-xs text-slate-500">No digital HR forms are currently configured for this role.</div>}
            </div>
          </div>
        )}

        {/* TAB 4: JOB DESCRIPTION */}
        {activeTab === 'job_description' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <span className="text-[10px] uppercase font-black tracking-widest text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                Role Signoff
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                Job Description & Duties Acknowledgement ({applicant.position})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Read, review duties, and electronically sign the official job description for your assigned role.
              </p>
            </div>

            <div className="mx-auto max-w-4xl">
              <JobDescriptionApplicant
                applicant={applicant}
                authenticatedUserId={authenticatedUserId}
                role={jobTemplate}
                onStateChange={(description, acknowledgements) => {
                  setCurrentJobDescription(description);
                  setJobDescriptionAcknowledgements(acknowledgements);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'pre_employment' && (
          <ApplicantCompliancePanel userId={authenticatedUserId} roleId={jobTemplate?.id} />
        )}

      </main>

      {activeHrDefinition && (
        <HrOnboardingFormEditor
          definition={activeHrDefinition}
          existing={hrForms.find(form => form.formType === activeHrDefinition.type)}
          applicant={applicant}
          authenticatedUserId={authenticatedUserId}
          role={jobTemplate}
          application={applicationData}
          onSaved={saved => setHrForms(current => current.some(form => form.id === saved.id)
            ? current.map(form => form.id === saved.id ? saved : form)
            : [...current, saved])}
          onClose={() => setActiveHrDefinition(null)}
        />
      )}

      {/* Document Viewer Modal */}
      {viewingFileUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-900" />
                <h3 className="font-bold text-slate-800 text-sm">Document Viewer</h3>
              </div>
              <div className="flex items-center space-x-2">
                {resolvedViewingUrl && (
                  <a
                    href={resolvedViewingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 px-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1 font-bold text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in New Tab</span>
                  </a>
                )}
                <button
                  onClick={() => setViewingFileUrl(null)}
                  className="p-1 px-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors flex items-center gap-1 font-bold text-xs"
                >
                  <span>Close</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200/50 p-4">
              {isLoadingViewing ? (
                <SHCLoader variant="page" text="Generating secure document link…" className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200" />
              ) : resolvedViewingUrl ? (
                viewingFileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <div className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-4">
                    <img
                      src={resolvedViewingUrl}
                      alt="Document Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <iframe
                    src={resolvedViewingUrl}
                    className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200"
                    title="Document Viewer"
                  />
                )
              ) : (
                <div className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center p-4 text-slate-500 font-semibold text-xs">
                  Failed to generate secure viewing URL.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
