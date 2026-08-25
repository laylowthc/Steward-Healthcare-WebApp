import { type ReactNode, useMemo } from 'react';
import { BookOpen, Clock, FileText, Shield } from 'lucide-react';
import { Document, RoleTemplate, Staff, Timesheet } from '../types';
import { useDeploymentReadiness } from '../lib/useDeploymentReadiness';
import { DeploymentReadinessBadge, DeploymentReadinessDetails } from './DeploymentReadiness';
import { getSubjectDocuments } from '../lib/profileState';

interface Props {
  currentUser: Staff;
  documents: Document[];
  timesheets: Timesheet[];
  templates: RoleTemplate[];
  onNavigate: (tab: string) => void;
}

export default function StaffDashboard({ currentUser, documents, timesheets, templates, onNavigate }: Props) {
  const staffList = useMemo(() => [currentUser], [currentUser]);
  const ownDocuments = useMemo(() => getSubjectDocuments(documents, { userId: currentUser.userId, applicantId: currentUser.applicantId, staffProfileId: currentUser.id }), [documents, currentUser]);
  const { readiness, loading, error } = useDeploymentReadiness(staffList, templates);
  const result = readiness[currentUser.id]?.result;
  const pendingDocuments = ownDocuments.filter(document => document.status === 'Awaiting Review').length;
  const pendingTimesheets = timesheets.filter(timesheet => timesheet.approvalStatus === 'Pending').length;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-sm">
      <div className="relative z-10"><DeploymentReadinessBadge result={result} loading={loading} /><h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Welcome back, {currentUser.name.split(' ')[0]}!</h2><p className="mt-1 text-xs text-slate-300">Employment status: <strong>{currentUser.status}</strong>. Deployment readiness is recalculated from SHC's current verified records.</p></div>
    </section>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">{error}</div>}
    {result && <DeploymentReadinessDetails result={result} staffSafe onNavigate={source => onNavigate(source === 'training' ? 'training' : 'profile')} />}

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Documents awaiting SHC review</p><p className="mt-2 text-3xl font-black text-slate-900">{pendingDocuments}</p><p className="mt-1 text-xs text-slate-500">Uploaded evidence remains pending until SHC verifies it.</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Pending timesheets</p><p className="mt-2 text-3xl font-black text-slate-900">{pendingTimesheets}</p><p className="mt-1 text-xs text-slate-500">Only persisted timesheet records are included.</p></div>
    </div>

    <h3 className="pl-1 text-xs font-black uppercase tracking-wider text-slate-800">Self-Service Actions</h3>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Action icon={<Shield className="h-6 w-6 text-indigo-500" />} title="My Compliance" description="View records and documents" onClick={() => onNavigate('profile')} />
      <Action icon={<Clock className="h-6 w-6 text-emerald-500" />} title="Timesheets" description="Upload and view status" onClick={() => onNavigate('staff_timesheets')} />
      <Action icon={<FileText className="h-6 w-6 text-purple-500" />} title="My Documents" description="Review controlled records" onClick={() => onNavigate('profile')} />
      <Action icon={<BookOpen className="h-6 w-6 text-amber-500" />} title="My Training & Credentials" description="Evidence, verification and expiry" onClick={() => onNavigate('training')} />
    </div>
  </div>;
}

function Action({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-300 hover:shadow-md">{icon}<h4 className="mt-2 text-xs font-bold text-slate-800">{title}</h4><p className="mt-1 text-[10px] text-slate-500">{description}</p></button>;
}
