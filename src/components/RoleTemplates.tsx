import React, { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import {
  RequirementStage,
  RequirementType,
  ResponsibleParty,
  RoleRequirement,
  RoleTemplate
} from '../types';
import { slugifyRole } from '../lib/roleEngine';
import SHCLoader from './SHCLoader';
import JobDescriptionAdmin from './JobDescriptionAdmin';

interface RoleTemplatesProps {
  templates: RoleTemplate[];
  onSaveRole: (role: RoleTemplate) => Promise<void>;
}

const emptyRequirement = (sortOrder = 10): RoleRequirement => ({
  requirementKey: '',
  displayName: '',
  stage: 'application',
  requirementType: 'information_field',
  responsibleParty: 'applicant',
  required: true,
  sortOrder,
  metadata: {},
  active: true
});

const emptyRole = (): RoleTemplate => ({
  role: '',
  slug: '',
  description: '',
  salaryRange: '',
  responsibilities: [],
  requiredCredentials: [],
  active: true,
  requirements: []
});

const stageLabels: Record<RequirementStage, string> = {
  application: 'Application',
  onboarding: 'HR Onboarding',
  deployment: 'Deployment'
};

const requirementTypes: RequirementType[] = [
  'information_field',
  'document',
  'hr_form',
  'acknowledgement_signature',
  'office_verification',
  'professional_registration'
];

export default function RoleTemplates({ templates, onSaveRole }: RoleTemplatesProps) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id || '');
  const [draft, setDraft] = useState<RoleTemplate>(templates[0] || emptyRole());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const selected = useMemo(
    () => templates.find(role => role.id === selectedId),
    [templates, selectedId]
  );

  useEffect(() => {
    if (selected) setDraft(structuredClone(selected));
  }, [selected]);

  useEffect(() => {
    if (!selectedId && templates[0]?.id) setSelectedId(templates[0].id);
  }, [templates, selectedId]);

  const updateRequirement = (index: number, patch: Partial<RoleRequirement>) => {
    setDraft(role => ({
      ...role,
      requirements: role.requirements.map((requirement, current) =>
        current === index ? { ...requirement, ...patch } : requirement
      )
    }));
  };

  const save = async () => {
    if (!draft.role.trim()) return setMessage('Role name is required.');
    if (!draft.requirements.length) return setMessage('Add at least one requirement.');
    if (draft.requirements.some(requirement => !requirement.requirementKey.trim() || !requirement.displayName.trim())) {
      return setMessage('Every requirement needs a key and display name.');
    }
    const duplicateKeys = new Set<string>();
    if (draft.requirements.some(requirement => {
      const key = requirement.requirementKey.trim();
      if (duplicateKeys.has(key)) return true;
      duplicateKeys.add(key);
      return false;
    })) return setMessage('Requirement keys must be unique within a role.');

    setSaving(true);
    setMessage('');
    try {
      await onSaveRole({
        ...draft,
        role: draft.role.trim(),
        slug: draft.slug || slugifyRole(draft.role),
        requirements: draft.requirements.map(requirement => ({
          ...requirement,
          requirementKey: requirement.requirementKey.trim(),
          displayName: requirement.displayName.trim()
        }))
      });
      setMessage('Role configuration saved. Applicant requirements now use this configuration.');
    } catch (error: any) {
      setMessage(error.message || 'Role configuration could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="shc-templates-view">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Roles & Requirement Engine</h2>
          <p className="text-xs font-medium text-slate-500">
            Configure who completes each requirement and the stage at which it applies.
          </p>
        </div>
        <button
          onClick={() => { setSelectedId(''); setDraft(emptyRole()); setMessage(''); }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2D0B31] px-4 py-2 text-xs font-bold text-white"
        >
          <Plus className="h-4 w-4" /> New Role
        </button>
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-xs font-bold ${message.includes('saved') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2">
          {templates.map(role => (
            <button
              key={role.id || role.role}
              onClick={() => setSelectedId(role.id || '')}
              className={`w-full rounded-xl border p-3 text-left ${selectedId === role.id ? 'border-purple-900 bg-purple-950 text-white' : 'border-slate-200 bg-white text-slate-800'}`}
            >
              <span className="block text-xs font-black">{role.role}</span>
              <span className={`mt-1 block text-[10px] ${selectedId === role.id ? 'text-purple-200' : 'text-slate-500'}`}>
                {role.active === false ? 'Inactive' : 'Active'} · {role.requirements.filter(req => req.active !== false).length} requirements
              </span>
            </button>
          ))}
        </aside>

        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Role name
              <input
                value={draft.role}
                onChange={event => setDraft(role => ({ ...role, role: event.target.value, slug: role.id ? role.slug : slugifyRole(event.target.value) }))}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                placeholder="e.g. Nurse"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Status
              <select
                value={draft.active === false ? 'inactive' : 'active'}
                onChange={event => setDraft(role => ({ ...role, active: event.target.value === 'active' }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700 md:col-span-2">
              Description
              <textarea
                value={draft.description}
                onChange={event => setDraft(role => ({ ...role, description: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                rows={3}
              />
            </label>
          </div>

          <div className="flex items-center justify-between border-t pt-5">
            <div>
              <h3 className="text-sm font-black text-slate-900">Role Requirements</h3>
              <p className="text-[11px] text-slate-500">Keys connect configuration to form fields and verification records.</p>
            </div>
            <button
              onClick={() => setDraft(role => ({
                ...role,
                requirements: [...role.requirements, emptyRequirement((role.requirements.length + 1) * 10)]
              }))}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-300 px-3 py-2 text-xs font-bold text-purple-900"
            >
              <Plus className="h-3.5 w-3.5" /> Add Requirement
            </button>
          </div>

          <div className="space-y-3">
            {draft.requirements.map((requirement, index) => (
              <div key={requirement.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Requirement name
                    <input value={requirement.displayName} onChange={event => updateRequirement(index, { displayName: event.target.value })} className="mt-1 w-full rounded-lg border p-2 text-xs normal-case text-slate-900" />
                  </label>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Stable key
                    <input value={requirement.requirementKey} onChange={event => updateRequirement(index, { requirementKey: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') })} className="mt-1 w-full rounded-lg border p-2 font-mono text-xs normal-case text-slate-900" />
                  </label>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Stage
                    <select value={requirement.stage} onChange={event => updateRequirement(index, { stage: event.target.value as RequirementStage })} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs normal-case text-slate-900">
                      {(Object.keys(stageLabels) as RequirementStage[]).map(stage => <option key={stage} value={stage}>{stageLabels[stage]}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Requirement type
                    <select value={requirement.requirementType} onChange={event => updateRequirement(index, { requirementType: event.target.value as RequirementType })} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs normal-case text-slate-900">
                      {requirementTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                    </select>
                  </label>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Responsible party
                    <select value={requirement.responsibleParty} onChange={event => updateRequirement(index, { responsibleParty: event.target.value as ResponsibleParty })} className="mt-1 w-full rounded-lg border bg-white p-2 text-xs normal-case text-slate-900">
                      <option value="applicant">Applicant</option>
                      <option value="administrator">SHC office / administrator</option>
                    </select>
                  </label>
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Sort order
                    <input type="number" value={requirement.sortOrder} onChange={event => updateRequirement(index, { sortOrder: Number(event.target.value) })} className="mt-1 w-full rounded-lg border p-2 text-xs normal-case text-slate-900" />
                  </label>
                  <label className="flex items-center gap-2 pt-5 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={requirement.required} onChange={event => updateRequirement(index, { required: event.target.checked })} /> Required
                  </label>
                  <div className="flex items-center justify-end pt-4">
                    <button onClick={() => setDraft(role => ({ ...role, requirements: role.requirements.filter((_, current) => current !== index) }))} className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                      <Trash2 className="h-3.5 w-3.5" /> Disable/remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t pt-4">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-purple-950 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60">
              {saving ? <SHCLoader variant="inline" text="Saving…" /> : <><Save className="h-4 w-4" /> Save Role Configuration</>}
            </button>
          </div>

          {!draft.requirements.length && (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-500">
              <Check className="mx-auto mb-2 h-5 w-5 text-slate-400" /> Add the first staged requirement for this role.
            </div>
          )}

          <JobDescriptionAdmin roleId={draft.id} roleName={draft.role || 'Role'} />
        </section>
      </div>
    </div>
  );
}
