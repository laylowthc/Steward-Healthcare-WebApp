import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { Applicant, Document, RoleTemplate } from '../types';
import { loadOfficialApplication } from '../lib/officialApplicationRepository';
import { loadHrOnboardingForms } from '../lib/hrOnboardingRepository';
import { loadCurrentJobDescription, loadJobDescriptionAcknowledgements } from '../lib/jobDescriptionRepository';
import {
  ensureComplianceCase,
  loadComplianceCase,
  saveReferenceVerification,
  saveVerificationDetails,
  setManagerClearance,
  updateComplianceDecision,
} from '../lib/complianceRepository';
import { canManagerClear, complianceSummary, deriveComplianceChecklist } from '../lib/preEmploymentCompliance';
import { findRole } from '../lib/roleEngine';
import { ComplianceCaseBundle, ComplianceRequirementStatus, ComplianceVerificationDetails, ReferenceVerification } from '../types/preEmploymentCompliance';
import { OfficialApplicationData } from '../types/officialApplication';
import { getSubjectDocuments } from '../lib/profileState';

const statuses: ComplianceRequirementStatus[] = ['Not Started','Awaiting Applicant','Evidence Received','Awaiting Review','Verification In Progress','Verified','Concern / Review Required','Expiring','Expired','Failed / Unsatisfactory','Waived / Exception Approved','Not Required'];
const emptyBundle: ComplianceCaseBundle = { complianceCase: null, records: [], details: [], references: [], events: [], schemaAvailable: true };
const emptyDetails = (recordId: string): ComplianceVerificationDetails => ({ complianceRecordId: recordId, evidenceType: '', evidenceReference: '', checkPerformed: false, outcome: '', concernPresent: false, shareCodeReference: '', certificateNumber: '', registrationBody: '', registrationType: '', internalNotes: '' });
const dateValue = (value?: string) => value ? value.slice(0, 10) : '';

export default function PreEmploymentComplianceReview({ applicant, templates, documents }: { applicant: Applicant; templates: RoleTemplate[]; documents: Document[] }) {
  const role = findRole(templates, applicant.roleId, applicant.position);
  const [application, setApplication] = useState<OfficialApplicationData | null>(null);
  const [bundle, setBundle] = useState<ComplianceCaseBundle>(emptyBundle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState('');
  const [decisionReason, setDecisionReason] = useState<Record<string, string>>({});
  const [applicantMessages, setApplicantMessages] = useState<Record<string, string>>({});
  const [draftDetails, setDraftDetails] = useState<Record<string, ComplianceVerificationDetails>>({});
  const [draftReferences, setDraftReferences] = useState<ReferenceVerification[]>([]);
  const subjectDocuments = useMemo(
    () => getSubjectDocuments(documents, { userId: applicant.userId, applicantId: applicant.id }),
    [documents, applicant.userId, applicant.id],
  );

  const refresh = useCallback(async (sync = false) => {
    if (!applicant.userId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [app, forms, acknowledgements, currentBundle, jd] = await Promise.all([
        loadOfficialApplication(applicant.userId),
        loadHrOnboardingForms(applicant.userId),
        loadJobDescriptionAcknowledgements(applicant.userId),
        loadComplianceCase(applicant.userId, true, role?.id),
        role?.id ? loadCurrentJobDescription(role.id) : Promise.resolve(null),
      ]);
      setApplication(app);
      if (!currentBundle.schemaAvailable) { setBundle(currentBundle); return; }
      const derived = deriveComplianceChecklist({ role, application: app, documents: subjectDocuments, hrForms: forms, currentJobDescription: jd, jobDescriptionAcknowledgements: acknowledgements, persistedRecords: currentBundle.records, referenceVerifications: currentBundle.references });
      if (sync && role?.id) {
        await ensureComplianceCase({ userId: applicant.userId, applicantId: applicant.id, roleId: role.id, lifecycleState: applicant.status, requirements: derived });
        const reloaded = await loadComplianceCase(applicant.userId, true, role.id);
        setBundle(reloaded);
        setDraftDetails(Object.fromEntries(reloaded.details.map(item => [item.complianceRecordId, item])));
        setDraftReferences(reloaded.references);
      } else {
        setBundle(currentBundle);
        setDraftDetails(Object.fromEntries(currentBundle.details.map(item => [item.complianceRecordId, item])));
        setDraftReferences(currentBundle.references);
      }
    } catch (reason: any) { setError(reason.message || 'Compliance case could not be loaded.'); }
    finally { setLoading(false); }
  }, [applicant.id, applicant.status, applicant.userId, role, subjectDocuments]);

  useEffect(() => { refresh(false); }, [refresh]);

  const checklist = useMemo(() => deriveComplianceChecklist({ role, application, documents: subjectDocuments, persistedRecords: bundle.records, referenceVerifications: bundle.references }), [role, application, subjectDocuments, bundle.records, bundle.references]);
  const summary = complianceSummary(checklist);

  const saveDecision = async (recordId: string, status: ComplianceRequirementStatus, applicantMessage: string, evidenceDocumentId?: string, expiryDate?: string) => {
    setSaving(recordId); setError('');
    try { await updateComplianceDecision({ recordId, status, applicantMessage, evidenceDocumentId, expiryDate, reason: decisionReason[recordId] || '' }); await refresh(false); }
    catch (reason: any) { setError(reason.message || 'The compliance decision could not be saved.'); }
    finally { setSaving(''); }
  };

  const referenceDraft = (number: 1 | 2): ReferenceVerification => draftReferences.find(item => item.referenceNumber === number) || {
    complianceCaseId: bundle.complianceCase?.id || '', referenceNumber: number, applicationReferenceIndex: number - 1,
    refereeNameSnapshot: application?.professionalReferences[number - 1]?.fullName || '', refereeOrganisationSnapshot: application?.professionalReferences[number - 1]?.organisation || '',
    employmentDatesConfirmed: false, reasonForLeavingConfirmed: false, signerName: '', signerRole: '', telephoneVerified: false, outcome: 'Pending', internalNotes: '',
  };
  const updateReference = (number: 1 | 2, patch: Partial<ReferenceVerification>) => setDraftReferences(current => [...current.filter(item => item.referenceNumber !== number), { ...referenceDraft(number), ...patch }]);

  if (loading) return <div className="rounded-xl border border-slate-200 p-4 text-xs text-slate-500">Loading pre-employment compliance…</div>;
  if (!applicant.userId) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">This candidate must have a linked account before an auditable compliance case can be opened.</div>;
  if (!bundle.schemaAvailable) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><strong>Sprint 4A schema is not installed in this environment.</strong><p className="mt-1">No production data was changed. Apply the prepared migration to an isolated Supabase branch to test office decisions.</p></div>;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="flex items-center text-xs font-black uppercase tracking-wide text-purple-900"><ShieldCheck className="mr-1.5 h-4 w-4" />Pre-employment compliance</h4><p className="mt-1 text-[11px] text-slate-500">Live controls derived from existing records plus office verification.</p></div><button onClick={() => refresh(true)} className="rounded-lg bg-purple-700 px-3 py-2 text-[10px] font-black text-white hover:bg-purple-800"><RefreshCw className="mr-1 inline h-3 w-3" />{bundle.complianceCase ? 'Refresh derived checks' : 'Open compliance case'}</button></div>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
      <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-slate-50 p-2"><strong className="block text-lg text-slate-900">{summary.total}</strong><span className="text-[9px] font-bold uppercase text-slate-500">Required</span></div><div className="rounded-lg bg-emerald-50 p-2"><strong className="block text-lg text-emerald-800">{summary.satisfied}</strong><span className="text-[9px] font-bold uppercase text-emerald-700">Satisfied</span></div><div className="rounded-lg bg-amber-50 p-2"><strong className="block text-lg text-amber-800">{summary.outstanding}</strong><span className="text-[9px] font-bold uppercase text-amber-700">Outstanding</span></div></div>
      {!bundle.complianceCase && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Review the derived checklist below, then open the compliance case to persist office-controlled checks and their audit trail.</p>}
      <div className="space-y-2">
        {checklist.map(item => {
          const record = bundle.records.find(candidate => candidate.requirementKey === item.requirementKey);
          const details = record ? draftDetails[record.id] || emptyDetails(record.id) : null;
          const open = expanded === item.requirementKey;
          return <article key={item.requirementKey} className="rounded-xl border border-slate-200 bg-white">
            <button className="flex w-full items-start justify-between gap-2 p-3 text-left" onClick={() => setExpanded(open ? '' : item.requirementKey)}><div><p className="text-xs font-extrabold text-slate-900">{item.displayName}</p><p className="mt-1 text-[9px] font-bold uppercase text-slate-400">{item.stage} · {item.responsibleParty === 'administrator' ? 'SHC office' : 'Applicant'} · {item.sourceKind}</p><p className="mt-1 text-[11px] text-slate-600">{item.reason}</p></div><div className="flex shrink-0 items-center gap-1"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${item.status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : item.status.includes('Concern') || item.status.includes('Failed') || item.status === 'Expired' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div></button>
            {open && <div className="space-y-3 border-t border-slate-100 p-3">
              {record && item.sourceKind !== 'derived' && <><div className="grid gap-2 sm:grid-cols-2"><label className="text-[10px] font-bold text-slate-600">Status<select value={record.status} onChange={event => saveDecision(record.id, event.target.value as ComplianceRequirementStatus, applicantMessages[record.id] ?? record.applicantMessage, record.evidenceDocumentId, record.expiryDate)} disabled={saving === record.id} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs">{statuses.map(status => <option key={status}>{status}</option>)}</select></label><label className="text-[10px] font-bold text-slate-600">Linked evidence<select value={record.evidenceDocumentId || ''} onChange={event => saveDecision(record.id, record.status, applicantMessages[record.id] ?? record.applicantMessage, event.target.value || undefined, record.expiryDate)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs"><option value="">No linked document</option>{subjectDocuments.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select></label><label className="text-[10px] font-bold text-slate-600">Expiry / renewal date<input type="date" value={dateValue(record.expiryDate)} onChange={event => saveDecision(record.id, record.status, applicantMessages[record.id] ?? record.applicantMessage, record.evidenceDocumentId, event.target.value || undefined)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs" /></label><label className="text-[10px] font-bold text-slate-600">Decision reason<input value={decisionReason[record.id] || ''} onChange={event => setDecisionReason(current => ({ ...current, [record.id]: event.target.value }))} placeholder="Required for concern, failure or exception" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs" /></label><label className="text-[10px] font-bold text-slate-600 sm:col-span-2">Message visible to applicant<input value={applicantMessages[record.id] ?? record.applicantMessage} onChange={event => setApplicantMessages(current => ({ ...current, [record.id]: event.target.value }))} onBlur={event => { if (event.target.value !== record.applicantMessage) void saveDecision(record.id, record.status, event.target.value, record.evidenceDocumentId, record.expiryDate); }} placeholder="Explain what is complete or what action is required" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs" /></label></div>
              {details && ['dbs_verification','right_to_work_verification','nmc_registration_valid','fitness_suitability'].includes(item.requirementKey) && <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-[10px] font-black uppercase text-slate-500">Confidential office verification</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input placeholder="Evidence type" value={details.evidenceType} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, evidenceType: e.target.value } }))} className="rounded-lg border p-2 text-xs"/>
                  <input placeholder={item.requirementKey === 'dbs_verification' ? 'Certificate number' : item.requirementKey === 'nmc_registration_valid' ? 'Registration number' : 'Evidence reference'} value={item.requirementKey === 'dbs_verification' ? details.certificateNumber : details.evidenceReference} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, ...(item.requirementKey === 'dbs_verification' ? { certificateNumber: e.target.value } : { evidenceReference: e.target.value }) } }))} className="rounded-lg border p-2 text-xs"/>
                  <input type="date" title="Check date" value={dateValue(details.checkDate)} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, checkDate: e.target.value } }))} className="rounded-lg border p-2 text-xs"/>
                  <input placeholder="Verification outcome" value={details.outcome} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, outcome: e.target.value } }))} className="rounded-lg border p-2 text-xs"/>
                  <label className="flex items-center gap-2 rounded-lg border bg-white p-2 text-[10px] font-bold"><input type="checkbox" checked={details.checkPerformed} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, checkPerformed: e.target.checked } }))}/>Office check performed</label>
                  {item.requirementKey === 'right_to_work_verification' && <input placeholder="Share code / check reference" value={details.shareCodeReference} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, shareCodeReference: e.target.value } }))} className="rounded-lg border p-2 text-xs"/>}
                  {item.requirementKey === 'nmc_registration_valid' && <><input placeholder="Registration body" value={details.registrationBody} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, registrationBody: e.target.value } }))} className="rounded-lg border p-2 text-xs"/><input placeholder="Registration type" value={details.registrationType} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, registrationType: e.target.value } }))} className="rounded-lg border p-2 text-xs"/></>}
                  {item.requirementKey === 'dbs_verification' && <><label className="flex items-center gap-2 rounded-lg border bg-white p-2 text-[10px] font-bold"><input type="checkbox" checked={details.concernPresent} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, concernPresent: e.target.checked, riskAssessmentStatus: e.target.checked ? 'Required' : 'Not Required' } }))}/>Disclosure / concern present</label><select value={details.riskAssessmentStatus || 'Not Required'} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, riskAssessmentStatus: e.target.value as any } }))} className="rounded-lg border p-2 text-xs"><option>Not Required</option><option>Required</option><option>In Progress</option><option>Suitable</option><option>Unsuitable</option></select></>}
                  {item.requirementKey === 'fitness_suitability' && <select value={details.occupationalHealthStatus || 'Declaration Received'} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, occupationalHealthStatus: e.target.value as any } }))} className="rounded-lg border p-2 text-xs"><option>Declaration Received</option><option>Referral Required</option><option>Clearance Pending</option><option>Cleared</option><option>Restrictions / Adjustments Recorded</option></select>}
                  <textarea placeholder="Confidential notes" value={details.internalNotes} onChange={e => setDraftDetails(current => ({ ...current, [record.id]: { ...details, internalNotes: e.target.value } }))} className="min-h-16 rounded-lg border p-2 text-xs sm:col-span-2"/>
                </div>
                <button onClick={async () => { setSaving(record.id); try { await saveVerificationDetails(details); await refresh(false); } catch (reason: any) { setError(reason.message); } finally { setSaving(''); } }} className="mt-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-[10px] font-black text-purple-800">Save verification details</button>
              </div>}</>}
              {!record && <p className="text-xs text-slate-500">Open the compliance case before recording office decisions.</p>}
            </div>}
          </article>;
        })}
      </div>
      {bundle.complianceCase && <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4"><h5 className="text-xs font-black uppercase text-purple-900">Independent reference verification</h5><div className="mt-3 grid gap-3 lg:grid-cols-2">{([1,2] as const).map(number => { const draft = referenceDraft(number); return <div key={number} className="space-y-2 rounded-lg bg-white p-3"><p className="text-xs font-extrabold">Referee {number}: {draft.refereeNameSnapshot || 'Not supplied'}</p><div className="grid grid-cols-2 gap-2"><label className="text-[10px]">Requested<input type="date" value={dateValue(draft.requestedAt)} onChange={e => updateReference(number, { requestedAt: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })} className="mt-1 w-full rounded border p-1.5 text-xs"/></label><label className="text-[10px]">Received<input type="date" value={dateValue(draft.receivedAt)} onChange={e => updateReference(number, { receivedAt: e.target.value ? `${e.target.value}T00:00:00Z` : undefined })} className="mt-1 w-full rounded border p-1.5 text-xs"/></label></div><input placeholder="Reference signer name" value={draft.signerName} onChange={e => updateReference(number, { signerName: e.target.value })} className="w-full rounded border p-1.5 text-xs"/><input placeholder="Signer role" value={draft.signerRole} onChange={e => updateReference(number, { signerRole: e.target.value })} className="w-full rounded border p-1.5 text-xs"/><label className="block text-[10px]"><input type="checkbox" checked={draft.employmentDatesConfirmed} onChange={e => updateReference(number, { employmentDatesConfirmed: e.target.checked })}/> Employment dates confirmed</label><label className="block text-[10px]"><input type="checkbox" checked={draft.reasonForLeavingConfirmed} onChange={e => updateReference(number, { reasonForLeavingConfirmed: e.target.checked })}/> Reason for leaving confirmed</label><label className="block text-[10px]"><input type="checkbox" checked={draft.telephoneVerified} onChange={e => updateReference(number, { telephoneVerified: e.target.checked })}/> Independently verified by telephone</label><select value={draft.outcome} onChange={e => updateReference(number, { outcome: e.target.value as ReferenceVerification['outcome'] })} className="w-full rounded border p-1.5 text-xs"><option>Pending</option><option>Satisfactory</option><option>Concern Identified</option><option>Unsatisfactory</option></select><select value={draft.supportingDocumentId || ''} onChange={e => updateReference(number, { supportingDocumentId: e.target.value || undefined })} className="w-full rounded border p-1.5 text-xs"><option value="">No supporting file linked</option>{subjectDocuments.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select><textarea placeholder="Confidential verification notes" value={draft.internalNotes} onChange={e => updateReference(number, { internalNotes: e.target.value })} className="w-full rounded border p-1.5 text-xs"/><button onClick={async () => { setSaving(`ref-${number}`); try { await saveReferenceVerification(draft); await refresh(true); } catch (reason: any) { setError(reason.message); } finally { setSaving(''); } }} className="rounded bg-purple-700 px-3 py-2 text-[10px] font-black text-white">Save referee {number}</button></div>; })}</div></div>}
      {bundle.complianceCase && <div className={`rounded-xl border p-4 ${canManagerClear(checklist) ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex gap-2">{canManagerClear(checklist) ? <CheckCircle2 className="h-5 w-5 text-emerald-700"/> : <AlertTriangle className="h-5 w-5 text-amber-700"/>}<div><h5 className="text-xs font-black uppercase text-slate-900">Registered Manager clearance</h5><p className="mt-1 text-xs text-slate-700">{canManagerClear(checklist) ? 'All blocking requirements are satisfied. An authorised manager may confirm deployment eligibility.' : `${summary.outstanding} blocking requirement${summary.outstanding === 1 ? '' : 's'} remain outstanding. Clearance cannot be recorded.`}</p></div></div><button disabled={!canManagerClear(checklist) || bundle.complianceCase.managerClearanceStatus === 'Cleared'} onClick={async () => { setSaving('manager'); try { await setManagerClearance(bundle.complianceCase!.id, 'Cleared'); const managerRecord = bundle.records.find(record => record.requirementKey === 'manager_clearance'); if (managerRecord) await updateComplianceDecision({ recordId: managerRecord.id, status: 'Verified', applicantMessage: 'Registered Manager clearance recorded.', reason: 'All mandatory pre-employment requirements satisfied.' }); await refresh(false); } catch (reason: any) { setError(reason.message); } finally { setSaving(''); } }} className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{bundle.complianceCase.managerClearanceStatus === 'Cleared' ? 'Manager cleared' : 'Record manager clearance'}</button></div>}
      {bundle.events.length > 0 && <details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-black text-slate-700">Audit trail ({bundle.events.length})</summary><ol className="mt-3 space-y-2">{bundle.events.map(event => <li key={event.id} className="text-[10px] text-slate-600"><strong>{new Date(event.createdAt).toLocaleString()}</strong> — {event.action}{event.previousState || event.newState ? ` (${event.previousState || '—'} → ${event.newState || '—'})` : ''}{event.reason ? ` — ${event.reason}` : ''}</li>)}</ol></details>}
    </section>
  );
}
