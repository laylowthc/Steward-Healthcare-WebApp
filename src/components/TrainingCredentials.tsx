import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, FileUp, Filter, Search, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { Document, RoleRequirement, RoleTemplate, Staff } from '../types';
import { loadComplianceCase } from '../lib/complianceRepository';
import { findRole, slugifyRole } from '../lib/roleEngine';
import {
  deriveTrainingCredentials,
  isTrainingCredentialRequirement,
  trainingCredentialCounts,
  trainingDeploymentSatisfied,
} from '../lib/trainingCredentials';
import { loadTrainingRecords, saveTrainingRecord, verifyTrainingRecord } from '../lib/trainingRepository';
import { getSubjectDocuments } from '../lib/profileState';
import { ComplianceRecord } from '../types/preEmploymentCompliance';
import { StaffTrainingRecord, TrainingCredentialItem, TrainingCredentialStatus } from '../types/trainingCredentials';

const statusClass: Record<TrainingCredentialStatus, string> = {
  'Not Recorded': 'border-rose-200 bg-rose-50 text-rose-800',
  'Awaiting Verification': 'border-blue-200 bg-blue-50 text-blue-800',
  Valid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Expiring Soon': 'border-amber-200 bg-amber-50 text-amber-800',
  Expired: 'border-rose-200 bg-rose-50 text-rose-800',
  'Not Required': 'border-slate-200 bg-slate-50 text-slate-600',
};

const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
  : 'Not recorded';

const trainingDocumentOptions = (documents: Document[], member: Staff) =>
  getSubjectDocuments(documents, { userId: member.userId, applicantId: member.applicantId, staffProfileId: member.id })
    .filter(document => document.category === 'Training Certificate' || document.category === 'Nurse Profile');

const emptyTrainingRequirement = (name: string, sortOrder: number): RoleRequirement => ({
  requirementKey: `training_${slugifyRole(name).replaceAll('-', '_')}`,
  displayName: name.trim(),
  stage: 'deployment',
  requirementType: 'document',
  responsibleParty: 'applicant',
  required: false,
  sortOrder,
  active: true,
  metadata: {
    training_credential: true,
    evidence_required: true,
    expiry_applicable: false,
    deployment_blocking: false,
    policy_status: 'SHC CONFIRMATION REQUIRED',
  },
});

export default function TrainingCredentials({
  mode,
  staff,
  templates,
  documents,
  currentStaff,
  onSaveRole,
  onUploadDocument,
}: {
  mode: 'admin' | 'staff';
  staff: Staff[];
  templates: RoleTemplate[];
  documents: Document[];
  currentStaff?: Staff | null;
  onSaveRole?: (role: RoleTemplate) => Promise<void>;
  onUploadDocument: (doc: Omit<Document, 'id' | 'uploadDate'>, file?: File) => Promise<Document | void>;
}) {
  const visibleStaff = mode === 'staff' ? (currentStaff ? [currentStaff] : []) : staff;
  const [records, setRecords] = useState<StaffTrainingRecord[]>([]);
  const [complianceByUser, setComplianceByUser] = useState<Record<string, ComplianceRecord[]>>({});
  const [schemaAvailable, setSchemaAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(currentStaff?.id || visibleStaff[0]?.id || '');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TrainingCredentialStatus | 'all'>('all');
  const [drafts, setDrafts] = useState<Record<string, Partial<StaffTrainingRecord>>>({});
  const [savingKey, setSavingKey] = useState('');
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [configurationRoleId, setConfigurationRoleId] = useState(templates[0]?.id || '');
  const [configurationDraft, setConfigurationDraft] = useState<RoleTemplate | null>(null);
  const [newRequirementName, setNewRequirementName] = useState('');

  const reload = async () => {
    setLoading(true); setError('');
    try {
      const targetUserId = mode === 'staff' ? currentStaff?.userId : undefined;
      const result = await loadTrainingRecords(targetUserId);
      setRecords(result.records);
      setSchemaAvailable(result.schemaAvailable);
      const complianceEntries = await Promise.all(visibleStaff.filter(member => member.userId).map(async member => {
        const role = findRole(templates, member.roleId, member.role);
        const bundle = await loadComplianceCase(member.userId!, false, role?.id);
        return [member.userId!, bundle.records] as const;
      }));
      setComplianceByUser(Object.fromEntries(complianceEntries));
    } catch (reason: any) {
      setError(reason.message || 'Training records could not be loaded.');
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, [mode, currentStaff?.userId, templates, staff]);
  useEffect(() => {
    if (!selectedStaffId || !visibleStaff.some(member => member.id === selectedStaffId)) setSelectedStaffId(visibleStaff[0]?.id || '');
  }, [visibleStaff, selectedStaffId]);
  useEffect(() => {
    const role = templates.find(entry => entry.id === configurationRoleId);
    setConfigurationDraft(role ? structuredClone(role) : null);
  }, [configurationRoleId, templates]);

  const rows = useMemo(() => visibleStaff.flatMap(member => {
    const role = findRole(templates, member.roleId, member.role);
    return deriveTrainingCredentials({
      role,
      records: records.filter(record => record.staffProfileId === member.id),
      complianceRecords: complianceByUser[member.userId || ''] || [],
    }).map(item => ({ member, role, item }));
  }), [visibleStaff, templates, records, complianceByUser]);

  const filteredRows = rows.filter(({ member, role, item }) => {
    const haystack = `${member.name} ${member.role} ${item.requirement.displayName}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (roleFilter === 'all' || role?.id === roleFilter)
      && (statusFilter === 'all' || item.status === statusFilter);
  });
  const selected = visibleStaff.find(member => member.id === selectedStaffId) || visibleStaff[0];
  const selectedItems = selected ? rows.filter(row => row.member.id === selected.id).map(row => row.item) : [];
  const counts = trainingCredentialCounts(selectedItems);

  const draftFor = (member: Staff, item: TrainingCredentialItem): StaffTrainingRecord => {
    const key = `${member.id}:${item.requirement.id}`;
    const stored = item.record;
    return {
      id: stored?.id,
      userId: member.userId || '',
      staffProfileId: member.id,
      roleRequirementId: item.requirement.id || '',
      provider: '',
      verificationStatus: stored?.verificationStatus || 'Awaiting Verification',
      ...stored,
      ...drafts[key],
    };
  };

  const updateDraft = (member: Staff, item: TrainingCredentialItem, patch: Partial<StaffTrainingRecord>) => {
    const key = `${member.id}:${item.requirement.id}`;
    setDrafts(current => ({ ...current, [key]: { ...(current[key] || {}), ...patch } }));
  };

  const save = async (member: Staff, item: TrainingCredentialItem) => {
    if (!schemaAvailable) return setMessage('The Sprint 4C database migration must be applied before records can be saved.');
    if (!member.userId || !item.requirement.id) return setMessage('This staff record is missing a persistent user or role-requirement identifier.');
    const next = draftFor(member, item);
    if (item.evidenceRequired && !next.evidenceDocumentId) return setMessage('Link or upload evidence before saving this requirement.');
    if (item.expiryApplicable && next.expiryDate && next.issueDate && next.expiryDate < next.issueDate) return setMessage('Expiry date cannot be before the issue date.');
    const key = `${member.id}:${item.requirement.id}`;
    setSavingKey(key); setMessage('');
    try {
      await saveTrainingRecord(next);
      setDrafts(current => { const clone = { ...current }; delete clone[key]; return clone; });
      setMessage('Training record saved. SHC verification remains separate.');
      await reload();
    } catch (reason: any) { setMessage(reason.message || 'Training record could not be saved.'); }
    finally { setSavingKey(''); }
  };

  const uploadEvidence = async (member: Staff, item: TrainingCredentialItem, file?: File) => {
    if (!file) return;
    const uploaded = await onUploadDocument({
      name: file.name,
      category: 'Training Certificate',
      staffId: member.id,
      staffName: member.name,
      status: 'Awaiting Review',
    }, file);
    if (uploaded && uploaded.id) updateDraft(member, item, { evidenceDocumentId: uploaded.id });
  };

  const verify = async (item: TrainingCredentialItem, verified: boolean) => {
    if (!item.record?.id) return;
    setSavingKey(item.record.id); setMessage('');
    try {
      await verifyTrainingRecord(item.record.id, verified);
      setMessage(verified ? 'Evidence verified by SHC.' : 'Verification removed; the record now awaits review.');
      await reload();
    } catch (reason: any) { setMessage(reason.message || 'Verification could not be updated.'); }
    finally { setSavingKey(''); }
  };

  const updateConfigurationRequirement = (index: number, patch: Partial<RoleRequirement>) => setConfigurationDraft(current => current ? ({
    ...current,
    requirements: current.requirements.map((requirement, currentIndex) => currentIndex === index ? { ...requirement, ...patch } : requirement),
  }) : current);

  const saveConfiguration = async () => {
    if (!configurationDraft || !onSaveRole) return;
    setSavingKey('configuration'); setMessage('');
    try {
      await onSaveRole(configurationDraft);
      setMessage('Role training requirements saved. The matrix now uses this configuration.');
    } catch (reason: any) { setMessage(reason.message || 'Role training requirements could not be saved.'); }
    finally { setSavingKey(''); }
  };

  const addRequirement = () => {
    if (!configurationDraft || !newRequirementName.trim()) return;
    const requirement = emptyTrainingRequirement(newRequirementName, Math.max(200, ...configurationDraft.requirements.map(entry => entry.sortOrder + 10)));
    if (configurationDraft.requirements.some(entry => entry.requirementKey === requirement.requirementKey)) return setMessage('That requirement already exists for this role.');
    setConfigurationDraft({ ...configurationDraft, requirements: [...configurationDraft.requirements, requirement] });
    setNewRequirementName('');
  };

  if (!visibleStaff.length) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><Award className="mx-auto mb-3 h-8 w-8 text-slate-300" /><h2 className="font-bold text-slate-900">No approved staff records</h2><p className="mt-1 text-xs text-slate-500">Training records become available after a person has entered the approved staff lifecycle.</p></div>;

  return <div className="space-y-6" id="shc-training-credentials">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 className="text-xl font-bold text-slate-900">{mode === 'admin' ? 'Training & Credentials' : 'My Training & Credentials'}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Role requirements, evidence and SHC verification are shown separately. Missing legacy data is reported as Not Recorded.</p></div>
      {mode === 'admin' && <button type="button" onClick={() => setConfigurationOpen(open => !open)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800"><Settings2 className="h-4 w-4" /> Requirement settings</button>}
    </header>
    {!schemaAvailable && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">Preview mode: the Sprint 4C migration has not been applied to this Supabase environment. Requirements render from role configuration, but record writes are disabled.</div>}
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">{error}</div>}
    {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs font-semibold text-blue-900">{message}</div>}
    {loading && <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-medium text-slate-500">Loading authoritative training and credential records...</div>}

    {mode === 'admin' && configurationOpen && configurationDraft && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-sm font-bold text-slate-900">Role requirement settings</h3><p className="mt-1 text-[11px] text-slate-500">Only confirmed mandatory or deployment-blocking items should be enabled as such.</p></div><label className="text-[10px] font-bold uppercase text-slate-500">Role<select value={configurationRoleId} onChange={event => setConfigurationRoleId(event.target.value)} className="mt-1 block min-w-56 rounded-lg border border-slate-300 bg-white p-2 text-xs normal-case text-slate-900">{templates.filter(role => role.active !== false).map(role => <option key={role.id} value={role.id}>{role.role}</option>)}</select></label></div>
      <div className="space-y-3">{configurationDraft.requirements.map((requirement, index) => isTrainingCredentialRequirement(requirement) && <div key={requirement.id || requirement.requirementKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0 flex-1"><input value={requirement.displayName} onChange={event => updateConfigurationRequirement(index, { displayName: event.target.value })} aria-label="Requirement name" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-900" /><p className="mt-1 text-[10px] text-slate-500">{requirement.metadata?.policy_status || requirement.metadata?.source || 'Configured by SHC'}</p></div><div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-700 sm:grid-cols-4"><label className="flex items-center gap-2"><input type="checkbox" checked={requirement.required} onChange={event => updateConfigurationRequirement(index, { required: event.target.checked })} /> Mandatory</label><label className="flex items-center gap-2"><input type="checkbox" checked={requirement.metadata?.evidence_required !== false} onChange={event => updateConfigurationRequirement(index, { metadata: { ...requirement.metadata, evidence_required: event.target.checked } })} /> Evidence</label><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(requirement.metadata?.expiry_applicable)} onChange={event => updateConfigurationRequirement(index, { metadata: { ...requirement.metadata, expiry_applicable: event.target.checked } })} /> Expiry</label><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(requirement.metadata?.deployment_blocking)} onChange={event => updateConfigurationRequirement(index, { metadata: { ...requirement.metadata, deployment_blocking: event.target.checked } })} /> Blocks deployment</label></div></div></div>)}</div>
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row"><input value={newRequirementName} onChange={event => setNewRequirementName(event.target.value)} placeholder="Add a training or credential requirement" className="min-h-10 flex-1 rounded-xl border border-slate-300 px-3 text-xs" /><button type="button" onClick={addRequirement} className="min-h-10 rounded-xl border border-purple-300 px-4 text-xs font-bold text-purple-900">Add to role</button><button type="button" onClick={saveConfiguration} disabled={savingKey === 'configuration'} className="min-h-10 rounded-xl bg-purple-950 px-5 text-xs font-bold text-white disabled:opacity-60">Save requirements</button></div>
    </section>}

    {mode === 'admin' && <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px]"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search staff or requirement" className="min-h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs" /></label><label className="relative"><Filter className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className="min-h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs"><option value="all">All roles</option>{templates.filter(role => role.active !== false).map(role => <option key={role.id} value={role.id}>{role.role}</option>)}</select></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as TrainingCredentialStatus | 'all')} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs"><option value="all">All statuses</option>{Object.keys(statusClass).map(status => <option key={status} value={status}>{status}</option>)}</select></section>}

    {mode === 'admin' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="hidden overflow-x-auto md:block"><table className="min-w-full divide-y divide-slate-100 text-left text-xs"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Requirement</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3 text-right">Record</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredRows.map(({ member, item }) => <tr key={`${member.id}:${item.requirement.requirementKey}`}><td className="px-4 py-3"><span className="block font-bold text-slate-900">{member.name}</span><span className="text-[10px] text-slate-500">{member.role}</span></td><td className="px-4 py-3"><span className="font-semibold text-slate-800">{item.requirement.displayName}</span>{item.deploymentBlocking && <span className="ml-2 text-[9px] font-bold uppercase text-rose-700">Deployment</span>}</td><td className="px-4 py-3"><Status value={item.status} /></td><td className="px-4 py-3 text-slate-600">{formatDate(item.record?.expiryDate)}</td><td className="px-4 py-3 text-right"><button onClick={() => setSelectedStaffId(member.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-700">Open</button></td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 md:hidden">{filteredRows.map(({ member, item }) => <button key={`${member.id}:${item.requirement.requirementKey}`} onClick={() => setSelectedStaffId(member.id)} className="block w-full p-4 text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-900">{member.name}</p><p className="mt-1 text-[11px] font-semibold text-slate-700">{item.requirement.displayName}</p><p className="mt-1 text-[10px] text-slate-500">{member.role} · {formatDate(item.record?.expiryDate)}</p></div><Status value={item.status} /></div></button>)}</div>{!filteredRows.length && <p className="p-8 text-center text-xs text-slate-500">No training records match these filters.</p>}</section>}

    <section className="space-y-5">
      {mode === 'admin' && <label className="sticky top-16 z-10 block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Individual training record</span><select value={selected?.id || ''} onChange={event => setSelectedStaffId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900">{visibleStaff.map(member => <option key={member.id} value={member.id}>{member.name} — {member.role}</option>)}</select></label>}
      {selected && <><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-purple-50 p-3 text-purple-900"><UserRound className="h-5 w-5" /></div><div><h3 className="font-bold text-slate-900">{selected.name}</h3><p className="text-xs text-slate-500">{selected.role}</p></div></div><div className="grid grid-cols-3 gap-2 text-center"><Metric label="Valid" value={counts.valid} tone="green" /><Metric label="Review" value={counts.awaiting} tone="blue" /><Metric label="Expired" value={counts.expired} tone="red" /></div></div><div className="mt-4 flex items-center gap-2 text-[11px] text-slate-600">{trainingDeploymentSatisfied(selectedItems) ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldCheck className="h-4 w-4 text-amber-600" />}Training requirements do not replace the separate SHC compliance and manager-clearance gates.</div></div>
      <div className="grid gap-4 xl:grid-cols-2">{selectedItems.map(item => <CredentialCard key={item.requirement.requirementKey} member={selected} item={item} draft={draftFor(selected, item)} documents={trainingDocumentOptions(documents, selected)} isAdmin={mode === 'admin'} saving={savingKey === `${selected.id}:${item.requirement.id}` || savingKey === item.record?.id} onDraft={patch => updateDraft(selected, item, patch)} onSave={() => save(selected, item)} onUpload={file => uploadEvidence(selected, item, file)} onVerify={verified => verify(item, verified)} />)}</div>
      {!loading && !selectedItems.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">No active training or credential requirements are configured for this role.</div>}</>}
    </section>
  </div>;
}

function CredentialCard({ member, item, draft, documents, isAdmin, saving, onDraft, onSave, onUpload, onVerify }: { key?: React.Key; member: Staff; item: TrainingCredentialItem; draft: StaffTrainingRecord; documents: Document[]; isAdmin: boolean; saving: boolean; onDraft: (patch: Partial<StaffTrainingRecord>) => void; onSave: () => void; onUpload: (file?: File) => void; onVerify: (verified: boolean) => void }) {
  const lockedToCompliance = item.source === 'existing_compliance';
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-slate-900">{item.requirement.displayName}</h4><div className="mt-1 flex flex-wrap gap-2 text-[9px] font-bold uppercase"><span className="text-slate-500">{item.mandatory ? 'Mandatory' : 'Optional'}</span>{item.deploymentBlocking && <span className="text-rose-700">Deployment-blocking</span>}{item.requirement.metadata?.policy_status && <span className="text-amber-700">SHC confirmation required</span>}</div></div><Status value={item.status} /></div><p className="mt-2 text-[11px] leading-5 text-slate-600">{item.reason}</p></div>
    {lockedToCompliance ? <div className="p-4 text-xs text-slate-600"><p>NMC verification remains in the existing professional-registration workflow. No duplicate credential record is created here.</p><p className="mt-2 text-[10px] text-slate-500">Manage this item from Compliance.</p></div> : <div className="space-y-4 p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-[10px] font-bold uppercase text-slate-500">Provider<input value={draft.provider} onChange={event => onDraft({ provider: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal normal-case text-slate-900" placeholder="Training provider" /></label><label className="text-[10px] font-bold uppercase text-slate-500">Completion / issue date<input type="date" value={draft.issueDate || ''} onChange={event => onDraft({ issueDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal normal-case text-slate-900" /></label>{item.expiryApplicable && <label className="text-[10px] font-bold uppercase text-slate-500">Expiry date<input type="date" value={draft.expiryDate || ''} onChange={event => onDraft({ expiryDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs font-normal normal-case text-slate-900" /></label>}<label className="text-[10px] font-bold uppercase text-slate-500">Linked evidence<select value={draft.evidenceDocumentId || ''} onChange={event => onDraft({ evidenceDocumentId: event.target.value || undefined })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-normal normal-case text-slate-900"><option value="">No evidence linked</option>{documents.map(document => <option key={document.id} value={document.id}>{document.name}</option>)}</select></label></div><div className="flex flex-col gap-2 sm:flex-row"><label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-[10px] font-bold text-slate-700"><FileUp className="h-3.5 w-3.5" /> Upload evidence<input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={event => { onUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label><button type="button" onClick={onSave} disabled={saving} className="min-h-9 rounded-lg bg-slate-900 px-4 text-[10px] font-bold text-white disabled:opacity-60">Save record</button>{isAdmin && item.record?.id && <button type="button" onClick={() => onVerify(item.record?.verificationStatus !== 'Verified')} disabled={saving} className="min-h-9 rounded-lg border border-emerald-300 px-4 text-[10px] font-bold text-emerald-800 disabled:opacity-60">{item.record.verificationStatus === 'Verified' ? 'Remove verification' : 'Verify evidence'}</button>}</div>{item.record?.verifiedAt && <p className="text-[10px] text-slate-500">Verified by SHC on {formatDate(item.record.verifiedAt)}. Internal user identifiers are not displayed.</p>}</div>}
  </article>;
}

function Status({ value }: { value: TrainingCredentialStatus }) { return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold ${statusClass[value]}`}>{value}</span>; }
function Metric({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'red' }) { const classes = { green: 'bg-emerald-50 text-emerald-900', blue: 'bg-blue-50 text-blue-900', red: 'bg-rose-50 text-rose-900' }; return <div className={`min-w-16 rounded-lg p-2 ${classes[tone]}`}><div className="text-base font-black">{value}</div><div className="text-[8px] font-bold uppercase tracking-wide">{label}</div></div>; }
