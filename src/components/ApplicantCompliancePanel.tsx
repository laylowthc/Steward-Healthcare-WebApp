import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { loadComplianceCase } from '../lib/complianceRepository';
import { ComplianceCaseBundle, ComplianceRequirementStatus } from '../types/preEmploymentCompliance';

const statusStyle = (status: ComplianceRequirementStatus) => {
  if (['Verified', 'Waived / Exception Approved', 'Not Required'].includes(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (['Concern / Review Required', 'Expired', 'Failed / Unsatisfactory'].includes(status)) return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
};
const applicantStatus = (status: ComplianceRequirementStatus, officeOwned: boolean) =>
  officeOwned && ['Evidence Received', 'Awaiting Review', 'Verification In Progress'].includes(status)
    ? 'Received — awaiting SHC verification'
    : status;

export default function ApplicantCompliancePanel({ userId, roleId }: { userId: string; roleId?: string }) {
  const [bundle, setBundle] = useState<ComplianceCaseBundle | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBundle(null);
    setError('');
    loadComplianceCase(userId, false, roleId)
      .then(result => active && setBundle(result))
      .catch(reason => active && setError(reason.message || 'Compliance status could not be loaded.'));
    return () => { active = false; };
  }, [userId, roleId]);

  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  if (!bundle) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your pre-employment checks…</div>;
  if (!bundle.schemaAvailable) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Pre-employment checks are not enabled in this environment.</strong><p className="mt-1">Your existing application and onboarding records are unchanged.</p></div>;
  if (!bundle.complianceCase) return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600"><ShieldCheck className="mb-2 h-5 w-5 text-purple-700" /><strong>No office compliance case has been opened yet.</strong><p className="mt-1">SHC will open this checklist when your application reaches pre-employment review.</p></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-black text-slate-900">Pre-employment checks</h2><p className="mt-1 text-sm text-slate-600">Evidence and office verification are tracked separately so you can see who needs to act next.</p></div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${bundle.complianceCase.deploymentEligible ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{bundle.complianceCase.deploymentEligible ? 'Manager cleared' : 'Not yet cleared'}</span>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {bundle.records.map(record => (
          <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-slate-900">{record.displayName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{record.stage} · {record.responsibleParty === 'administrator' ? 'SHC office' : 'Applicant'}</p></div><span className={`max-w-48 shrink-0 rounded-full border px-2 py-1 text-center text-[10px] font-black ${statusStyle(record.status)}`}>{applicantStatus(record.status, record.responsibleParty === 'administrator')}</span></div>
            <div className="mt-3 flex gap-2 text-xs text-slate-600">{['Verified', 'Waived / Exception Approved', 'Not Required'].includes(record.status) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : record.responsibleParty === 'administrator' ? <Clock3 className="h-4 w-4 shrink-0 text-amber-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />}<p>{record.applicantMessage || (record.responsibleParty === 'administrator' ? 'Received — awaiting SHC verification.' : 'Please complete this requirement.')}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}
