import React, { useEffect, useState } from 'react';
import { Clock, FileSignature, Printer } from 'lucide-react';
import { JobDescriptionAcknowledgement } from '../types/jobDescription';
import { loadJobDescriptionAcknowledgements } from '../lib/jobDescriptionRepository';
import JobDescriptionDocument from './JobDescriptionDocument';

export default function JobDescriptionReview({ userId }: { userId?: string }) {
  const [items, setItems] = useState<JobDescriptionAcknowledgement[]>([]);
  const [selected, setSelected] = useState<JobDescriptionAcknowledgement | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    if (!userId) { setItems([]); setSelected(null); return; }
    loadJobDescriptionAcknowledgements(userId).then(data => { if (active) { setItems(data); setSelected(data[0] || null); } }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [userId]);
  return <section className="space-y-3"><div className="flex items-center justify-between"><div><h4 className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-900"><FileSignature className="h-3.5 w-3.5" /> Signed Job Descriptions</h4><p className="mt-1 text-[10px] text-slate-500">Immutable role and version snapshots.</p></div>{selected && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold"><Printer className="h-3 w-3" /> Print</button>}</div>
    {message && <p className="text-xs font-bold text-rose-700">{message}</p>}
    {!items.length ? <div className="rounded-xl border border-dashed p-4 text-xs text-slate-500">No signed Job Description acknowledgement.</div> : <><div className="flex flex-wrap gap-2">{items.map(item => <button type="button" key={item.id} onClick={() => setSelected(item)} className={`rounded-lg border px-3 py-2 text-left text-[10px] ${selected?.id === item.id ? 'border-purple-700 bg-purple-50' : 'border-slate-200'}`}><b>{item.roleName} · v{item.jdVersion}</b><span className="mt-1 block"><Clock className="mr-1 inline h-3 w-3" />{new Date(item.signedAt).toLocaleString()}</span></button>)}</div>{selected && <JobDescriptionDocument title={selected.jdTitle} roleName={selected.roleName} version={selected.jdVersion} effectiveDate={selected.jdEffectiveDate} content={selected.contentSnapshot} acknowledgement={{ text: selected.acknowledgementText, signerName: selected.signerName, signatureType: selected.signatureType, signatureValue: selected.signatureValue, signedAt: selected.signedAt }} />}</>}
  </section>;
}
