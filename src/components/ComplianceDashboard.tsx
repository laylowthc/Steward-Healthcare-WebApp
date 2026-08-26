import { type ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Search, ShieldAlert } from 'lucide-react';
import { Applicant, RoleTemplate, Staff } from '../types';
import { isApprovedStaffProfile } from '../lib/complianceState';
import { useDeploymentReadiness } from '../lib/useDeploymentReadiness';
import { DeploymentReadinessBadge, DeploymentReadinessDetails } from './DeploymentReadiness';
import { DeploymentReadinessSource } from '../types/deploymentReadiness';

interface Props {
  staff: Staff[];
  applicants: Applicant[];
  templates: RoleTemplate[];
  onSelectStaff: (staffId: string) => void;
  onSelectApplicant: (applicantId: string) => void;
  onOpenTraining: () => void;
}

export default function ComplianceDashboard({ staff, applicants, templates, onSelectStaff, onSelectApplicant, onOpenTraining }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const approvedStaff = useMemo(() => staff.filter(isApprovedStaffProfile), [staff]);
  const monitoredApplicants = useMemo(() => {
    const approvedUserIds = new Set(approvedStaff.map(member => member.userId).filter(Boolean));
    const approvedApplicantIds = new Set(approvedStaff.map(member => member.applicantId).filter(Boolean));
    return applicants.filter(applicant => applicant.status !== 'Accepted' && applicant.status !== 'Rejected'
      && !approvedUserIds.has(applicant.userId) && !approvedApplicantIds.has(applicant.id));
  }, [applicants, approvedStaff]);
  const { readiness, loading, error } = useDeploymentReadiness(approvedStaff, templates);
  const filtered = approvedStaff.filter(person => person.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const readyCount = approvedStaff.filter(person => readiness[person.id]?.result.ready).length;
  const restrictedCount = approvedStaff.filter(person => readiness[person.id]?.result.ready === false).length;
  const warningCount = approvedStaff.filter(person => (readiness[person.id]?.result.warnings.length || 0) > 0).length;
  const navigateSource = (person: Staff, source: DeploymentReadinessSource) => {
    if (source === 'training') return onOpenTraining();
    const applicant = applicants.find(entry => entry.id === person.applicantId || (person.userId && entry.userId === person.userId));
    if (applicant) return onSelectApplicant(applicant.id);
    onSelectStaff(person.id);
  };

  return <div className="space-y-6" id="shc-compliance-view">
    <header><h2 className="text-xl font-bold text-slate-900">Compliance</h2><p className="text-xs font-medium text-slate-500">Current deployment readiness for approved Staff, with candidate checks kept as a separate pre-employment population.</p></header>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Candidate compliance cases</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">Review evidence, office verification and Registered Manager clearance in Recruitment.</p></div><span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-800">{monitoredApplicants.length} candidate{monitoredApplicants.length === 1 ? '' : 's'}</span></div>
      {monitoredApplicants.length ? <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{monitoredApplicants.map(applicant => <button key={applicant.id} onClick={() => onSelectApplicant(applicant.id)} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-purple-300 hover:bg-purple-50/40"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-extrabold text-slate-900">{applicant.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{applicant.position || 'Role not selected'}</p></div><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">{applicant.status}</span></div><p className="mt-2 text-[10px] font-bold text-purple-800">Review compliance case →</p></button>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">No candidate compliance cases require monitoring.</div>}
    </section>

    <div className="grid gap-4 md:grid-cols-3"><Metric icon={<CheckCircle2 className="h-6 w-6" />} label="Ready for Deployment" value={readyCount} tone="emerald" /><Metric icon={<ShieldAlert className="h-6 w-6" />} label="Deployment Restricted" value={restrictedCount} tone="rose" /><Metric icon={<AlertTriangle className="h-6 w-6" />} label="Expiry Warnings" value={warningCount} tone="amber" /></div>

    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-bold text-slate-900">Approved Staff readiness</h3><p className="mt-1 text-[10px] font-semibold text-slate-500">Employment approval is retained even when current deployment is restricted.</p></div><label className="relative block w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><span className="sr-only">Search approved Staff</span><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search approved Staff" className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs" /></label></div>
      {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</div>}
      <div className="mt-4 hidden overflow-x-auto md:block"><table className="min-w-full divide-y divide-slate-100 text-xs"><thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Employment</th><th className="px-4 py-3">Deployment</th><th className="px-4 py-3">Blockers / warnings</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(person => { const result = readiness[person.id]?.result; return <tr key={person.id}><td className="px-4 py-4 font-bold text-slate-900">{person.name}</td><td className="px-4 py-4 text-slate-600">{person.role}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">Approved Staff</span></td><td className="px-4 py-4"><DeploymentReadinessBadge result={result} loading={loading} /></td><td className="px-4 py-4 text-slate-600">{result ? `${result.blockers.length} blocker${result.blockers.length === 1 ? '' : 's'}${result.warnings.length ? ` · ${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}` : ''}` : 'Checking…'}</td><td className="px-4 py-4 text-right"><button onClick={() => setExpandedId(expandedId === person.id ? null : person.id)} className="font-bold text-purple-800">{expandedId === person.id ? 'Close reasons' : 'View reasons'}</button></td></tr>; })}</tbody></table></div>
      <div className="mt-4 grid gap-3 md:hidden">{filtered.map(person => { const result = readiness[person.id]?.result; return <article key={person.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-slate-900">{person.name}</h4><p className="text-[11px] text-slate-500">{person.role} · Approved Staff</p></div><DeploymentReadinessBadge result={result} loading={loading} /></div><button onClick={() => setExpandedId(expandedId === person.id ? null : person.id)} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-bold text-purple-800">{expandedId === person.id ? 'Hide reasons' : 'View reasons'} <ExternalLink className="h-3 w-3" /></button>{expandedId === person.id && result && <div className="mt-3"><DeploymentReadinessDetails result={result} onNavigate={source => navigateSource(person, source)} /></div>}</article>; })}</div>
      {expandedId && <div className="mt-4 hidden md:block">{(() => { const person = approvedStaff.find(item => item.id === expandedId); const result = person && readiness[person.id]?.result; return person && result ? <DeploymentReadinessDetails result={result} onNavigate={source => navigateSource(person, source)} /> : null; })()}</div>}
      {!loading && !filtered.length && <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">No approved Staff match this search.</div>}
    </section>
  </div>;
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: 'emerald' | 'rose' | 'amber' }) {
  const colours = { emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800', rose: 'border-rose-200 bg-rose-50 text-rose-800', amber: 'border-amber-200 bg-amber-50 text-amber-800' };
  return <div className={`flex items-center gap-4 rounded-2xl border p-5 ${colours[tone]}`}><div>{icon}</div><div><p className="text-[10px] font-black uppercase tracking-wide">{label}</p><p className="mt-1 text-2xl font-black">{value} Staff</p></div></div>;
}
