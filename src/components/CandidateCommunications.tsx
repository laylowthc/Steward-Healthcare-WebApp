import { useEffect, useState } from 'react';
import { Check, Mail, RefreshCw, Send, UserPlus } from 'lucide-react';
import { Applicant, RoleTemplate } from '../types';
import {
  GmailContact,
  OUTREACH_TEMPLATES,
  sendGmailOutreach,
  syncGmailContacts,
  updateLocalContactStatus
} from '../lib/gmailService';

interface CandidateCommunicationsProps {
  googleToken: string;
  roles: RoleTemplate[];
  onAddApplicant: (applicant: Omit<Applicant, 'id' | 'dateCreated'>) => void;
  onAddLog: (action: string, type: 'recruitment' | 'staff' | 'document' | 'compliance' | 'timesheet') => void;
}

export default function CandidateCommunications({ googleToken, roles, onAddApplicant, onAddLog }: CandidateCommunicationsProps) {
  const [contacts, setContacts] = useState<GmailContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<GmailContact | null>(null);
  const [templateId, setTemplateId] = useState('temp_onboarding');
  const [position, setPosition] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setMessage(null);
    try {
      setContacts(await syncGmailContacts(googleToken));
    } catch {
      setMessage('Candidate messages could not be loaded. Reconnect the authorised Google account and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [googleToken]);

  useEffect(() => {
    if (!selected) return;
    const template = OUTREACH_TEMPLATES.find(item => item.id === templateId);
    if (!template) return;
    setSubject(template.subject.replace(/{name}/g, selected.name).replace(/{position}/g, position));
    setBody(template.body.replace(/{name}/g, selected.name).replace(/{position}/g, position));
  }, [selected, templateId, position]);

  const importCandidate = (contact: GmailContact) => {
    if (!window.confirm(`Add ${contact.name} (${contact.email}) to Recruitment?`)) return;
    onAddApplicant({
      name: contact.name,
      email: contact.email,
      phone: '',
      position: '',
      status: 'Applied',
      notes: `Imported from authorised candidate communications. Subject: ${contact.subject}`
    });
    updateLocalContactStatus(contact.id, 'Imported');
    setContacts(current => current.map(item => item.id === contact.id ? { ...item, status: 'Imported' } : item));
    onAddLog(`Candidate communications: added ${contact.name} to Recruitment.`, 'recruitment');
  };

  const send = async () => {
    if (!selected || !window.confirm(`Send this email to ${selected.name} (${selected.email})?`)) return;
    setSending(true);
    setMessage(null);
    try {
      await sendGmailOutreach(googleToken, selected.email, subject, body);
      updateLocalContactStatus(selected.id, 'Contacted');
      setContacts(current => current.map(item => item.id === selected.id ? { ...item, status: 'Contacted' } : item));
      onAddLog(`Candidate communications: sent “${subject}” to ${selected.name}.`, 'recruitment');
      setSelected(null);
      setMessage('Email sent successfully.');
    } catch {
      setMessage('The email could not be sent. Check the Google account connection and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Candidate Communications</h3>
          <p className="mt-1 text-xs text-slate-500">Review recruitment-related Gmail messages, send approved templates, and add genuine enquiries to Recruitment.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {message && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-700">{message}</p>}
      {!loading && contacts.length === 0 ? (
        <div className="py-12 text-center">
          <Mail className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">No candidate messages found</p>
          <p className="mt-1 text-xs text-slate-500">No recent recruitment-related messages matched the connected mailbox.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {contacts.map(contact => (
            <article key={contact.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{contact.name}</p><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">{contact.status}</span></div>
                  <p className="truncate text-[10px] text-slate-500">{contact.email}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-800">{contact.subject}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{contact.snippet}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => setSelected(contact)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-indigo-700"><Mail className="h-3 w-3" /> Email</button>
                  {contact.status !== 'Imported' && <button onClick={() => importCandidate(contact)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"><UserPlus className="h-3 w-3" /> Add</button>}
                  {contact.status === 'Imported' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><Check className="h-3 w-3" /> In Recruitment</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b p-4"><div><h4 className="font-bold text-slate-900">Email {selected.name}</h4><p className="text-[10px] text-slate-500">{selected.email}</p></div><button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-500">Cancel</button></div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Template<select value={templateId} onChange={event => setTemplateId(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs">{OUTREACH_TEMPLATES.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Role<select value={position} onChange={event => setPosition(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs"><option value="">Select role</option>{roles.filter(role => role.active !== false).map(role => <option key={role.id || role.role} value={role.role}>{role.role}</option>)}</select></label></div>
              <label className="block text-xs font-bold text-slate-600">Subject<input value={subject} onChange={event => setSubject(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-xs" /></label>
              <label className="block text-xs font-bold text-slate-600">Message<textarea value={body} onChange={event => setBody(event.target.value)} rows={10} className="mt-1 w-full rounded-lg border p-3 text-xs" /></label>
            </div>
            <div className="flex justify-end border-t bg-slate-50 p-4"><button onClick={() => void send()} disabled={sending || !subject.trim() || !body.trim()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send Email'}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
