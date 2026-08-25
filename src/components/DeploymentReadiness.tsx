import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DeploymentReadinessResult, DeploymentReadinessSource } from '../types/deploymentReadiness';

export function DeploymentReadinessBadge({ result, loading = false }: {
  result?: DeploymentReadinessResult;
  loading?: boolean;
}) {
  if (loading || !result) return <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">Checking readiness…</span>;
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${result.ready ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{result.status}</span>;
}

export function DeploymentReadinessDetails({ result, staffSafe = false, onNavigate }: {
  result: DeploymentReadinessResult;
  staffSafe?: boolean;
  onNavigate?: (source: DeploymentReadinessSource) => void;
}) {
  if (result.ready && !result.warnings.length) {
    return <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900"><CheckCircle2 className="h-4 w-4 shrink-0" /><p>All currently configured deployment-blocking requirements are satisfied.</p></div>;
  }
  return <div className="space-y-3">
    {result.blockers.length > 0 && <section className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="flex items-center gap-2 text-rose-900"><ShieldAlert className="h-4 w-4" /><h4 className="text-xs font-black">{result.blockers.length} deployment blocker{result.blockers.length === 1 ? '' : 's'}</h4></div><ul className="mt-3 space-y-3">{result.blockers.map(blocker => <li key={blocker.key} className="flex items-start justify-between gap-3 text-xs text-rose-900"><div><strong>{blocker.displayName}</strong><p className="mt-0.5 leading-5">{staffSafe ? blocker.staffMessage : blocker.reason}</p></div>{onNavigate && blocker.source !== 'staff' && <button type="button" onClick={() => onNavigate(blocker.source)} className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 text-[10px] font-bold text-rose-800">Open <ArrowRight className="h-3 w-3" /></button>}</li>)}</ul></section>}
    {result.warnings.length > 0 && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-4 w-4" /><h4 className="text-xs font-black">Current expiry warning{result.warnings.length === 1 ? '' : 's'}</h4></div><ul className="mt-3 space-y-2">{result.warnings.map(warning => <li key={warning.key} className="text-xs leading-5 text-amber-900"><strong>{warning.displayName}:</strong> {staffSafe ? warning.staffMessage : warning.reason}</li>)}</ul></section>}
  </div>;
}

