import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Printer } from 'lucide-react';
import { Applicant, RoleTemplate } from '../types';
import { HrSignatureType } from '../types/hrOnboarding';
import { JobDescription, JobDescriptionAcknowledgement } from '../types/jobDescription';
import { currentJobDescriptionComplete, jobDescriptionAcknowledgementText, jobDescriptionStatus } from '../lib/jobDescriptions';
import { loadCurrentJobDescription, loadJobDescriptionAcknowledgements, signJobDescription } from '../lib/jobDescriptionRepository';
import HrSignatureInput from './HrSignatureInput';
import JobDescriptionDocument from './JobDescriptionDocument';
import SHCLoader from './SHCLoader';

interface Props {
  applicant: Applicant;
  authenticatedUserId: string;
  role?: RoleTemplate;
  onStateChange?: (current: JobDescription | null, acknowledgements: JobDescriptionAcknowledgement[]) => void;
}

export default function JobDescriptionApplicant({ applicant, authenticatedUserId, role, onStateChange }: Props) {
  const [current, setCurrent] = useState<JobDescription | null>(null);
  const [acknowledgements, setAcknowledgements] = useState<JobDescriptionAcknowledgement[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [signatureType, setSignatureType] = useState<HrSignatureType>('typed');
  const [signatureValue, setSignatureValue] = useState('');
  const [signerName, setSignerName] = useState(applicant.name);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      role?.id ? loadCurrentJobDescription(role.id) : Promise.resolve(null),
      loadJobDescriptionAcknowledgements(authenticatedUserId),
    ]).then(([description, signed]) => {
      if (!active) return;
      setCurrent(description);
      setAcknowledgements(signed);
      onStateChange?.(description, signed);
    }).catch(error => {
      if (active) setMessage(error.message || 'The Job Description could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authenticatedUserId, role?.id]);

  const signedCurrent = useMemo(
    () => acknowledgements.find(item => item.jobDescriptionId === current?.id),
    [acknowledgements, current?.id],
  );
  const status = jobDescriptionStatus(current, acknowledgements);

  const sign = async () => {
    if (!current || !role?.id) return;
    if (!confirmed) return setMessage('Confirm that you have read and understood the complete Job Description.');
    if (!signerName.trim() || !signatureValue.trim()) return setMessage('Enter your signer name and electronic signature.');
    setSaving(true); setMessage('');
    try {
      const signed = await signJobDescription({ jobDescriptionId: current.id, userId: authenticatedUserId, applicantId: applicant.id, roleId: role.id, signerName, signatureType, signatureValue });
      const next = [signed, ...acknowledgements];
      setAcknowledgements(next);
      onStateChange?.(current, next);
      setMessage('Your Job Description acknowledgement has been signed and permanently recorded.');
    } catch (error: any) {
      setMessage(error.message || 'The Job Description could not be signed.');
    } finally { setSaving(false); }
  };

  if (loading) return <SHCLoader variant="inline" text="Loading your Job Description…" />;
  if (!role?.id) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-900">Select and save your role before viewing a Job Description.</div>;
  if (!current) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950"><p className="flex items-center gap-2 font-black"><AlertCircle className="h-4 w-4" />No published Job Description is available for {role.role}.</p><p className="mt-1">SHC must publish the controlled role wording before you can sign it.</p></div>;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3"><div><p className="text-[9px] font-black uppercase text-slate-500">Acknowledgement status</p><p className="text-sm font-black text-purple-950">{status}</p></div><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"><Printer className="h-3.5 w-3.5" /> Print</button></div>
    <JobDescriptionDocument title={signedCurrent?.jdTitle || current.title} roleName={signedCurrent?.roleName || role.role} version={signedCurrent?.jdVersion || current.version} effectiveDate={signedCurrent?.jdEffectiveDate || current.effectiveDate} content={signedCurrent?.contentSnapshot || current.content} acknowledgement={signedCurrent ? { text: signedCurrent.acknowledgementText, signerName: signedCurrent.signerName, signatureType: signedCurrent.signatureType, signatureValue: signedCurrent.signatureValue, signedAt: signedCurrent.signedAt } : undefined} />
    {!signedCurrent && <section className="space-y-4 rounded-2xl border border-purple-200 bg-purple-50 p-5"><label className="flex items-start gap-3 text-xs font-bold text-purple-950"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5" /><span>{jobDescriptionAcknowledgementText}</span></label><label className="block text-xs font-bold text-slate-700">Signer full legal name<input value={signerName} onChange={event => setSignerName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5" /></label><HrSignatureInput type={signatureType} value={signatureValue} signerName={signerName} onTypeChange={setSignatureType} onChange={setSignatureValue} /><button type="button" disabled={saving} onClick={sign} className="w-full rounded-xl bg-purple-950 px-4 py-3 text-xs font-black text-white disabled:opacity-60">{saving ? 'Recording signature…' : 'Acknowledge & Sign Job Description'}</button></section>}
    {message && <div className={`rounded-xl border p-3 text-xs font-bold ${currentJobDescriptionComplete(current, acknowledgements) ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{message}</div>}
    {acknowledgements.filter(item => item.jobDescriptionId !== current.id).length > 0 && <section className="rounded-xl border bg-white p-4"><h3 className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500"><Clock className="h-3.5 w-3.5" /> Previous signed Job Descriptions</h3><div className="mt-2 space-y-2">{acknowledgements.filter(item => item.jobDescriptionId !== current.id).map(item => <div key={item.id} className="flex justify-between rounded-lg bg-slate-50 p-2 text-[10px]"><span className="font-bold">{item.roleName} · v{item.jdVersion}</span><span><CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-600" />{new Date(item.signedAt).toLocaleDateString()}</span></div>)}</div></section>}
  </div>;
}
