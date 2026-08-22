import React, { useEffect, useState } from 'react';
import { FilePlus2, Save } from 'lucide-react';
import { JobDescription } from '../types/jobDescription';
import { loadJobDescriptionsForRole, saveJobDescription } from '../lib/jobDescriptionRepository';
import JobDescriptionDocument from './JobDescriptionDocument';

const emptyDraft = (roleId: string, roleName: string): Omit<JobDescription, 'id' | 'createdAt' | 'updatedAt'> => ({
  roleId, title: `${roleName} Job Description`, version: '', effectiveDate: '',
  content: { organisation: 'Steward Health Care 247 Professionals', documentStatus: 'Controlled HR Document', professionalRequirement: '', summary: '', reportsTo: '', duties: [], conduct: [], acknowledgementText: '' }, active: false,
});

export default function JobDescriptionAdmin({ roleId, roleName }: { roleId?: string; roleName: string }) {
  const [items, setItems] = useState<JobDescription[]>([]);
  const [draft, setDraft] = useState<(Omit<JobDescription, 'createdAt' | 'updatedAt'> & { id?: string }) | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    if (!roleId) return setItems([]);
    setItems(await loadJobDescriptionsForRole(roleId));
  };
  useEffect(() => { reload().catch(error => setMessage(error.message)); setDraft(null); }, [roleId]);

  const select = (item: JobDescription) => setDraft({ ...item, content: { ...item.content, duties: [...item.content.duties], conduct: [...item.content.conduct] } });
  const save = async () => {
    if (!draft) return;
    if (!draft.title.trim() || !draft.version.trim()) return setMessage('Title and version are required.');
    if (draft.active && (!draft.effectiveDate || !draft.content.organisation.trim() || !draft.content.documentStatus.trim() || !draft.content.summary.trim() || !draft.content.reportsTo.trim() || draft.content.duties.length === 0 || draft.content.conduct.length === 0 || !draft.content.acknowledgementText.trim())) return setMessage('A published controlled Job Description requires an organisation, document status, effective date, role purpose, reporting line, duties, conduct and acknowledgement wording.');
    setSaving(true); setMessage('');
    try {
      const saved = await saveJobDescription(draft);
      await reload(); select(saved);
      setMessage(saved.active ? 'Published as the current Job Description.' : 'Job Description draft saved.');
    } catch (error: any) { setMessage(error.message || 'Job Description could not be saved.'); }
    finally { setSaving(false); }
  };

  if (!roleId) return <div className="rounded-xl border border-dashed p-4 text-xs text-slate-500">Save this role before assigning a Job Description.</div>;
  return <section className="space-y-4 border-t pt-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">Controlled Job Descriptions</h3><p className="text-[11px] text-slate-500">Create versions and publish one current document for this role. Signed content is locked.</p></div><button type="button" onClick={() => setDraft(emptyDraft(roleId, roleName))} className="inline-flex items-center gap-1 rounded-lg border border-purple-300 px-3 py-2 text-xs font-bold text-purple-900"><FilePlus2 className="h-4 w-4" /> New Version</button></div>
    {message && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">{message}</div>}
    <div className="flex flex-wrap gap-2">{items.map(item => <button type="button" key={item.id} onClick={() => select(item)} className={`rounded-lg border px-3 py-2 text-left text-[10px] ${draft?.id === item.id ? 'border-purple-800 bg-purple-50' : 'border-slate-200'}`}><b>{item.title}</b><span className="block">v{item.version} · {item.active ? 'Current' : 'Inactive / Draft'}</span></button>)}</div>
    {draft && <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
      <div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-bold">Title<input value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-xs font-bold">Version<input value={draft.version} onChange={event => setDraft({ ...draft, version: event.target.value })} className="mt-1 w-full rounded-lg border p-2" placeholder="e.g. 1.0" /></label><label className="text-xs font-bold">Effective date<input type="date" value={draft.effectiveDate || ''} onChange={event => setDraft({ ...draft, effectiveDate: event.target.value })} className="mt-1 w-full rounded-lg border p-2" /></label></div>
      <div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold">Organisation<input value={draft.content.organisation} onChange={event => setDraft({ ...draft, content: { ...draft.content, organisation: event.target.value } })} className="mt-1 w-full rounded-lg border p-2" /></label><label className="text-xs font-bold">Document status<input value={draft.content.documentStatus} onChange={event => setDraft({ ...draft, content: { ...draft.content, documentStatus: event.target.value } })} className="mt-1 w-full rounded-lg border p-2" /></label></div>
      <label className="block text-xs font-bold">Role purpose<textarea rows={3} value={draft.content.summary} onChange={event => setDraft({ ...draft, content: { ...draft.content, summary: event.target.value } })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block text-xs font-bold">Reports to<input value={draft.content.reportsTo} onChange={event => setDraft({ ...draft, content: { ...draft.content, reportsTo: event.target.value } })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block text-xs font-bold">Professional requirement <span className="font-normal text-slate-500">(if applicable)</span><input value={draft.content.professionalRequirement} onChange={event => setDraft({ ...draft, content: { ...draft.content, professionalRequirement: event.target.value } })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block text-xs font-bold">Duties and responsibilities <span className="font-normal text-slate-500">(one per line)</span><textarea rows={8} value={draft.content.duties.join('\n')} onChange={event => setDraft({ ...draft, content: { ...draft.content, duties: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) } })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block text-xs font-bold">Professional conduct <span className="font-normal text-slate-500">(one per line)</span><textarea rows={5} value={draft.content.conduct.join('\n')} onChange={event => setDraft({ ...draft, content: { ...draft.content, conduct: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) } })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block text-xs font-bold">Acknowledgement wording<textarea rows={4} value={draft.content.acknowledgementText} onChange={event => setDraft({ ...draft, content: { ...draft.content, acknowledgementText: event.target.value } })} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} /> Publish as current version</label>
      <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-purple-950 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Job Description'}</button>
      {draft.content.duties.length > 0 && <details><summary className="cursor-pointer text-xs font-black text-purple-900">Preview controlled document</summary><div className="mt-3"><JobDescriptionDocument title={draft.title} roleName={roleName} version={draft.version || 'Draft'} effectiveDate={draft.effectiveDate} content={draft.content} /></div></details>}
    </div>}
  </section>;
}
