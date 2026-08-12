import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, FileText, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { hrFormDefinitions } from '../lib/hrOnboarding';
import {
  loadHrOnboardingForms,
  loadHrOnboardingVersions,
  reviewHrOnboardingForm,
} from '../lib/hrOnboardingRepository';
import { HrOnboardingForm, HrOnboardingFormVersion, HrOnboardingStatus } from '../types/hrOnboarding';

const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, value => value.toUpperCase());

function Value({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-400">Not provided</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (Array.isArray(value)) return <div className="space-y-2">{value.map((item, index) => <div key={item.policyKey || index} className="rounded-lg border bg-slate-50 p-2"><Value value={item} /></div>)}</div>;
  if (typeof value === 'object') return <dl className="space-y-1">{Object.entries(value).map(([key, nested]) => <div key={key} className="grid grid-cols-[minmax(110px,0.8fr)_1.2fr] gap-2"><dt className="font-bold text-slate-500">{humanize(key)}</dt><dd className="break-words"><Value value={nested} /></dd></div>)}</dl>;
  return <span className="break-words">{String(value)}</span>;
}

const tone: Record<string, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700',
  Submitted: 'border-amber-200 bg-amber-50 text-amber-900',
  'Returned for Correction': 'border-rose-200 bg-rose-50 text-rose-900',
  Approved: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  Rejected: 'border-rose-300 bg-rose-100 text-rose-950',
};

export default function HrOnboardingReview({ userId }: { userId?: string }) {
  const [forms, setForms] = useState<HrOnboardingForm[]>([]);
  const [selected, setSelected] = useState<HrOnboardingForm | null>(null);
  const [versions, setVersions] = useState<HrOnboardingFormVersion[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!userId) { setForms([]); setLoading(false); return; }
    setLoading(true);
    try { setForms(await loadHrOnboardingForms(userId)); }
    catch (reason: any) { setError(reason.message || 'Unable to load HR onboarding forms.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [userId]);

  const open = async (form: HrOnboardingForm) => {
    setSelected(form);
    setNotes(form.reviewerNotes || '');
    setVersions(form.id ? await loadHrOnboardingVersions(form.id) : []);
  };

  const review = async (status: Extract<HrOnboardingStatus, 'Approved' | 'Returned for Correction' | 'Rejected'>) => {
    if (!selected?.id) return;
    if (status === 'Returned for Correction' && !notes.trim()) {
      setError('Reviewer notes are required when returning a form.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await reviewHrOnboardingForm(selected.id, status, notes);
      setForms(current => current.map(form => form.id === updated.id ? updated : form));
      setSelected(updated);
    } catch (reason: any) { setError(reason.message || 'Review action failed.'); }
    finally { setSaving(false); }
  };

  return (
    <section className="space-y-3">
      <div><h4 className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-900"><ShieldCheck className="h-3.5 w-3.5" />HR onboarding review</h4><p className="mt-1 text-[10px] text-slate-500">Sensitive HR details are opened only within this authorised review panel.</p></div>
      {loading && <p className="text-xs text-slate-500">Loading HR forms…</p>}
      {!loading && forms.length === 0 && <div className="rounded-xl border border-dashed p-3 text-xs text-slate-500">No HR onboarding forms have been started.</div>}
      <div className="space-y-2">
        {forms.map(form => (
          <button key={form.id || form.formType} type="button" onClick={() => void open(form)} className="w-full rounded-xl border bg-white p-3 text-left hover:border-purple-300">
            <div className="flex items-start justify-between gap-2"><span className="text-xs font-bold text-slate-900">{hrFormDefinitions[form.formType].title}</span><span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${tone[form.status]}`}>{form.status}</span></div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-slate-500"><span>Revision {form.revision}</span><span>{form.submittedAt ? `Submitted ${new Date(form.submittedAt).toLocaleDateString()}` : 'Not submitted'}</span><span>{form.signatureValue ? 'Signature recorded' : 'No signature required/recorded'}</span><span>{form.reviewedAt ? `Reviewed ${new Date(form.reviewedAt).toLocaleDateString()}` : 'Not reviewed'}</span>{form.reviewedBy && <span className="col-span-2">Reviewer: {form.reviewedBy}</span>}</div>
          </button>
        ))}
      </div>

      {selected && <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2"><div><h5 className="text-sm font-black text-purple-950">{hrFormDefinitions[selected.formType].title}</h5><p className="text-[10px] text-slate-500">Revision {selected.revision} · {selected.status}</p></div><button type="button" onClick={() => setSelected(null)} className="text-slate-400"><XCircle className="h-4 w-4" /></button></div>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border bg-slate-50 p-3 text-[10px]"><Value value={selected.formData} /></div>
        {selected.signatureValue && <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><p className="font-bold">Signed by {selected.signerName} · {selected.signedAt ? new Date(selected.signedAt).toLocaleString() : 'timestamp unavailable'}</p>{selected.signatureType === 'drawn' ? <img src={selected.signatureValue} alt="Applicant drawn signature" className="mt-2 max-h-20 rounded bg-white" /> : <p className="mt-2 font-serif text-xl italic">{selected.signatureValue}</p>}</div>}
        {selected.reviewerNotes && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs"><b>Reviewer notes:</b> {selected.reviewerNotes}</div>}
        {selected.status === 'Submitted' && <div className="mt-4 space-y-2"><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} placeholder="Reviewer notes (required when returning)" className="w-full rounded-xl border p-3 text-xs" /><div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => void review('Approved')} className="flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><CheckCircle className="h-3.5 w-3.5" />Approve</button><button type="button" disabled={saving} onClick={() => void review('Returned for Correction')} className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white"><RotateCcw className="h-3.5 w-3.5" />Return</button><button type="button" disabled={saving} onClick={() => void review('Rejected')} className="flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white"><XCircle className="h-3.5 w-3.5" />Reject</button></div></div>}
        <div className="mt-4 border-t pt-3"><h6 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500"><Clock className="h-3 w-3" />Immutable submissions</h6>{versions.length ? <div className="mt-2 space-y-1">{versions.map(version => <div key={version.id} className="rounded-lg bg-slate-50 px-3 py-2 text-[10px]">Revision {version.revision} · submitted {new Date(version.submittedAt).toLocaleString()} · {version.signatureValue ? 'signed' : 'unsigned'}</div>)}</div> : <p className="mt-1 text-[10px] text-slate-400">No archived submission yet.</p>}</div>
      </div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">{error}</div>}
    </section>
  );
}
