import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, FileCheck2, FolderOpen, Search, ShieldCheck, UserRound } from 'lucide-react';
import { Applicant, Document, RoleTemplate, Staff } from '../types';
import { loadComplianceCase } from '../lib/complianceRepository';
import { loadHrOnboardingForms } from '../lib/hrOnboardingRepository';
import { loadCurrentJobDescription, loadJobDescriptionAcknowledgements } from '../lib/jobDescriptionRepository';
import { loadOfficialApplication } from '../lib/officialApplicationRepository';
import { derivePersonnelFile, summarisePersonnelFile } from '../lib/personnelFile';
import { getSubjectDocuments } from '../lib/profileState';
import { findRole } from '../lib/roleEngine';
import { PersonnelChecklistItem, PersonnelFileCategory, PersonnelFileStatus, PersonnelSourceRoute } from '../types/personnelFile';

interface PersonnelSubject {
  key: string;
  userId: string;
  name: string;
  roleId?: string;
  roleName: string;
  lifecycle: string;
  accountStatus: string;
  applicant?: Applicant;
  staff?: Staff;
}

const categories: PersonnelFileCategory[] = ['Recruitment', 'Identity / Pre-employment', 'HR Onboarding', 'Employment Documents', 'Ongoing Staff Record'];
const statusClass: Record<PersonnelFileStatus, string> = {
  Complete: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Exception Approved': 'bg-indigo-50 text-indigo-800 border-indigo-200',
  'Not Required': 'bg-slate-50 text-slate-600 border-slate-200',
  'Not Applicable': 'bg-slate-50 text-slate-500 border-slate-200',
  Outstanding: 'bg-rose-50 text-rose-800 border-rose-200',
  'Not Recorded': 'bg-rose-50 text-rose-800 border-rose-200',
  'Awaiting Applicant': 'bg-amber-50 text-amber-800 border-amber-200',
  'Awaiting SHC Review': 'bg-blue-50 text-blue-800 border-blue-200',
  'Verification Required': 'bg-blue-50 text-blue-800 border-blue-200',
  'Returned for Correction': 'bg-amber-50 text-amber-800 border-amber-200',
  'In Progress': 'bg-amber-50 text-amber-800 border-amber-200',
  Expiring: 'bg-amber-50 text-amber-800 border-amber-200',
  Expired: 'bg-rose-50 text-rose-800 border-rose-200',
  'Concern / Review Required': 'bg-rose-50 text-rose-800 border-rose-200',
};

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '';

export default function PersonnelFile({ applicants, staff, documents, templates, initialUserId, onNavigate }: {
  applicants: Applicant[];
  staff: Staff[];
  documents: Document[];
  templates: RoleTemplate[];
  initialUserId?: string;
  onNavigate: (route: PersonnelSourceRoute, subject: PersonnelSubject) => void;
}) {
  const subjects = useMemo<PersonnelSubject[]>(() => {
    const seen = new Set<string>();
    const result: PersonnelSubject[] = [];
    staff.forEach(member => {
      if (!member.userId) return;
      const applicant = applicants.find(entry => entry.id === member.applicantId || entry.userId === member.userId);
      seen.add(member.userId);
      result.push({ key: `staff-${member.id}`, userId: member.userId, name: member.name, roleId: member.roleId || applicant?.roleId, roleName: member.role, lifecycle: 'Approved Staff', accountStatus: member.accountStatus || 'Active', applicant, staff: member });
    });
    applicants.forEach(applicant => {
      if (!applicant.userId || seen.has(applicant.userId)) return;
      result.push({ key: `applicant-${applicant.id}`, userId: applicant.userId, name: applicant.name, roleId: applicant.roleId, roleName: applicant.position, lifecycle: `Applicant - ${applicant.status}`, accountStatus: 'Applicant', applicant });
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [applicants, staff]);
  const [selectedKey, setSelectedKey] = useState(subjects[0]?.key || '');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PersonnelChecklistItem[]>([]);
  const [deploymentEligible, setDeploymentEligible] = useState(false);
  const [complianceStatus, setComplianceStatus] = useState('Not recorded');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selected = subjects.find(subject => subject.key === selectedKey) || subjects[0];
  const visibleSubjects = subjects.filter(subject => `${subject.name} ${subject.roleName} ${subject.lifecycle}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const requested = initialUserId ? subjects.find(subject => subject.userId === initialUserId) : undefined;
    setSelectedKey(current => requested?.key || (subjects.some(subject => subject.key === current) ? current : subjects[0]?.key || ''));
  }, [initialUserId, subjects]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const role = findRole(templates, selected.roleId, selected.roleName);
        const subjectDocuments = getSubjectDocuments(documents, { userId: selected.userId, applicantId: selected.applicant?.id, staffProfileId: selected.staff?.id });
        const [application, hrForms, acknowledgements, compliance, jd] = await Promise.all([
          loadOfficialApplication(selected.userId),
          loadHrOnboardingForms(selected.userId),
          loadJobDescriptionAcknowledgements(selected.userId),
          loadComplianceCase(selected.userId, true, role?.id),
          role?.id ? loadCurrentJobDescription(role.id) : Promise.resolve(null),
        ]);
        if (!active) return;
        setItems(derivePersonnelFile({ role, applicant: selected.applicant, staff: selected.staff, application, documents: subjectDocuments, hrForms, currentJobDescription: jd, acknowledgements, compliance }));
        setDeploymentEligible(Boolean(compliance.complianceCase?.deploymentEligible));
        setComplianceStatus(compliance.complianceCase?.overallStatus || 'Not recorded');
      } catch (reason: any) {
        if (active) setError(reason.message || 'Personnel file could not be loaded.');
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [selectedKey, selected?.userId, selected?.roleId, selected?.applicant?.id, selected?.staff?.id, templates, documents]);

  const summary = useMemo(() => summarisePersonnelFile(items), [items]);
  if (!subjects.length) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><FolderOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" /><h2 className="font-bold text-slate-900">No personnel files yet</h2><p className="mt-1 text-xs text-slate-500">Personnel files appear when an applicant or approved staff record has a persisted user identity.</p></div>;

  return <div className="space-y-5" id="shc-personnel-file">
    <div><h2 className="text-xl font-bold text-slate-900">Personnel Files</h2><p className="text-xs font-medium leading-5 text-slate-500">Find an applicant or approved staff member, then review the live file derived from recruitment, compliance, HR and document records.</p></div>
    <label className="sticky top-16 z-20 block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Personnel record</span>
      <select value={selected?.key || ''} onChange={event => setSelectedKey(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900">
        {subjects.map(subject => <option key={subject.key} value={subject.key}>{subject.name} — {subject.roleName || 'Role not assigned'} ({subject.lifecycle})</option>)}
      </select>
    </label>
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:block">
        <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a personnel file" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-purple-400" /></div>
        <div className="max-h-[70vh] space-y-1 overflow-y-auto">
          {visibleSubjects.map(subject => <button key={subject.key} onClick={() => setSelectedKey(subject.key)} className={`w-full rounded-xl px-3 py-3 text-left transition ${selected?.key === subject.key ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
            <span className="block truncate text-xs font-bold">{subject.name}</span><span className={`mt-1 block truncate text-[10px] ${selected?.key === subject.key ? 'text-slate-300' : 'text-slate-500'}`}>{subject.roleName || 'Role not assigned'} - {subject.lifecycle}</span>
          </button>)}
          {!visibleSubjects.length && <p className="p-4 text-center text-xs text-slate-500">No matching records.</p>}
        </div>
      </aside>
      <main className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="shrink-0 rounded-xl bg-purple-50 p-3 text-purple-800"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{selected?.name}</h3><p className="text-xs leading-5 text-slate-500">{selected?.roleName || 'Role not assigned'} · {selected?.lifecycle} · Account {selected?.accountStatus}</p></div></div><div className="rounded-xl bg-slate-50 px-4 py-3 text-left sm:text-right"><div className="text-2xl font-black text-slate-900">{summary.percentage}%</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Required file controls</div></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Required" value={summary.required} /><Metric label="Complete" value={summary.complete} tone="green" /><Metric label="Awaiting verification" value={summary.awaitingVerification} tone="blue" /><Metric label="Outstanding" value={summary.outstanding} tone="red" /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><StateCard label="Compliance clearance" value={complianceStatus} ok={complianceStatus === 'Satisfied'} /><StateCard label="Deployment readiness" value={deploymentEligible ? 'Eligible' : 'Restricted'} ok={deploymentEligible} /></div>
          <p className="mt-3 text-[11px] text-slate-500">Personnel-file completeness, compliance clearance and deployment readiness are separate controls.</p>
        </section>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">{error}</div>}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">Loading authoritative personnel records...</div> : categories.map(category => {
          const categoryItems = items.filter(entry => entry.category === category);
          const categorySummary = summary.categories.find(entry => entry.category === category);
          if (!categoryItems.length) return null;
          return <section key={category} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:px-5"><div className="min-w-0"><h3 className="text-sm font-bold text-slate-900">{category}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{categorySummary?.required ? `${categorySummary.complete} of ${categorySummary.required} applicable required controls complete` : 'No currently applicable required controls'}</p></div><FileCheck2 className="h-5 w-5 shrink-0 text-slate-400" /></div>
            <div className="divide-y divide-slate-100">{categoryItems.map(entry => <div key={entry.key} className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-bold text-slate-900">{entry.displayName}</h4>{entry.blocking && <span className="text-[9px] font-bold uppercase text-rose-600">Required</span>}</div><p className="mt-1 text-xs leading-5 text-slate-600">{entry.reason}</p><p className="mt-2 break-words text-[10px] leading-4 text-slate-400">Source: {entry.source.workflow}{entry.source.timestamp ? ` · ${formatDate(entry.source.timestamp)}` : ''} · {entry.derivation}</p><p className="mt-1 text-[10px] leading-4 text-slate-400">Next action: {entry.responsibleParty === 'applicant' ? 'Applicant / employee' : 'SHC office'}{entry.source.evidenceId ? ' · controlled evidence linked' : ''}</p></div><div className="flex shrink-0 flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass[entry.status]}`}>{entry.status}</span>{entry.derivation !== 'future-workflow' && <button type="button" onClick={() => onNavigate(entry.source.route, selected!)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50">Open <ArrowRight className="h-3 w-3" /></button>}</div></div></div>)}</div>
          </section>;
        })}
        {!loading && summary.blockers.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" /><h3 className="text-xs font-bold">Top outstanding controls</h3></div><ul className="mt-3 space-y-2">{summary.blockers.map(blocker => <li key={blocker.key} className="text-xs text-amber-900"><strong>{blocker.displayName}:</strong> {blocker.reason}</li>)}</ul></section>}
      </main>
    </div>
  </div>;
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'green' | 'blue' | 'red' }) {
  const tones = { slate: 'bg-slate-50 text-slate-900', green: 'bg-emerald-50 text-emerald-900', blue: 'bg-blue-50 text-blue-900', red: 'bg-rose-50 text-rose-900' };
  return <div className={`rounded-xl p-3 ${tones[tone]}`}><div className="text-lg font-black">{value}</div><div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div></div>;
}

function StateCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3"><div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div><div className="text-xs font-bold text-slate-800">{value}</div></div>{ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldCheck className="h-5 w-5 text-amber-600" />}</div>;
}
