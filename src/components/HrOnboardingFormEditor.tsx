import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Save, Send, X } from 'lucide-react';
import { Applicant, RoleTemplate } from '../types';
import { OfficialApplicationData } from '../types/officialApplication';
import { HrFormDefinition, HrOnboardingForm, HrSignatureType } from '../types/hrOnboarding';
import { saveHrOnboardingDraft, submitHrOnboardingForm } from '../lib/hrOnboardingRepository';
import { validateHrForm } from '../lib/hrOnboarding';
import HrSignatureInput from './HrSignatureInput';
import BrandedLogo from './BrandedLogo';

interface Props {
  definition: HrFormDefinition;
  existing?: HrOnboardingForm;
  applicant: Applicant;
  authenticatedUserId: string;
  role?: RoleTemplate;
  application?: OfficialApplicationData | null;
  onSaved: (form: HrOnboardingForm) => void;
  onClose: () => void;
}

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 disabled:bg-slate-100';

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block text-[10px] font-bold uppercase tracking-wide text-slate-600 ${wide ? 'md:col-span-2' : ''}`}>{label}{children}</label>;
}

const initialData = (
  definition: HrFormDefinition,
  applicant: Applicant,
  role?: RoleTemplate,
  application?: OfficialApplicationData | null,
) => {
  if (definition.type === 'starter_information') return {
    fullLegalName: `${application?.forenames || ''} ${application?.surname || ''}`.trim() || applicant.name,
    address: application?.address || applicant.cvData?.personalDetails?.address || '',
    postcode: application?.postcode || '', telephone: application?.telephone || '', mobile: application?.mobile || applicant.phone,
    personalEmail: application?.personalEmail || applicant.email, dateOfBirth: applicant.cvData?.personalDetails?.dob || '',
    nationalInsuranceNumber: application?.nationalInsuranceNumber || '', jobRole: role?.role || applicant.position,
    placeOfWork: '', alsoKnownAs: '', genderIdentity: '', relatedToShcPerson: '', relatedToShcPersonDetails: '', previouslyWorkedForShc: '', previousShcWorkDetails: '',
    intendedStartDate: '', employmentType: '', emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
  };
  if (definition.type === 'bank_details') return { accountHolderName: applicant.name, bankName: '', sortCode: '', accountNumber: '', buildingSocietyNumber: '', payrollDeclaration: false };
  if (definition.type === 'paye_declaration') return { starterStatement: '', studentLoanOutstanding: '', studentLoanPlan: '', studentLoanDirectDebit: '', studyCompletionDate: '' };
  if (definition.type === 'next_of_kin') return { fullName: '', relationship: '', telephone: '', address: '', alternativeName: '', alternativeTelephone: '' };
  if (definition.type === 'working_time_declaration') return { workingTimeChoice: '', declarationRead: false };
  return {
    acknowledgements: (definition.policies || []).map(policy => ({
      policyKey: policy.key, policyName: policy.name, policyVersion: policy.version, acknowledged: false, acknowledgedAt: null,
    })),
  };
};

export default function HrOnboardingFormEditor({
  definition,
  existing,
  applicant,
  authenticatedUserId,
  role,
  application,
  onSaved,
  onClose,
}: Props) {
  const [form, setForm] = useState<HrOnboardingForm>(() => existing || ({
    userId: authenticatedUserId,
    applicantId: applicant.id,
    roleId: role?.id,
    formType: definition.type,
    status: 'Draft',
    formData: initialData(definition, applicant, role, application),
    revision: 1,
    signatureType: 'typed',
    signatureValue: '',
    signerName: applicant.name,
  }));
  const [lastSaved, setLastSaved] = useState(form.updatedAt || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const loaded = useRef(false);
  const timer = useRef<number>();
  const editable = form.status === 'Draft' || form.status === 'Returned for Correction';

  const changeData = (key: string, value: any) => {
    if (!editable) return;
    setForm(current => ({
      ...current,
      formData: { ...current.formData, [key]: value },
      ...(current.status === 'Returned for Correction' ? {
        signatureValue: '', signedAt: undefined, signerUserId: undefined,
      } : {}),
    }));
  };

  const persist = async (candidate = form) => {
    if (!editable) return candidate;
    setSaving(true);
    setError('');
    try {
      const saved = await saveHrOnboardingDraft(candidate);
      setForm(saved);
      onSaved(saved);
      setLastSaved(saved.updatedAt || new Date().toISOString());
      return saved;
    } catch (reason: any) {
      setError(reason.message || 'Draft could not be saved.');
      throw reason;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    if (!editable) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist().catch(() => undefined), 900);
    return () => window.clearTimeout(timer.current);
  }, [form.formData, form.signatureType, form.signatureValue, form.status]);

  const submit = async () => {
    window.clearTimeout(timer.current);
    const validation = validateHrForm(form.formType, form.formData, definition);
    if (validation.length) {
      setError(`Please complete: ${validation.join(', ')}.`);
      return;
    }
    if (definition.signatureRequired && !form.signatureValue?.trim()) {
      setError('Please add your electronic signature before submitting.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const signed = {
        ...form,
        signerUserId: definition.signatureRequired ? authenticatedUserId : undefined,
        signerName: definition.signatureRequired ? applicant.name : undefined,
        signedAt: definition.signatureRequired ? new Date().toISOString() : undefined,
      };
      const draft = signed.id ? await saveHrOnboardingDraft(signed) : await saveHrOnboardingDraft(signed);
      const submitted = await submitHrOnboardingForm(draft);
      setForm(submitted);
      onSaved(submitted);
    } catch (reason: any) {
      setError(reason.message || 'Form submission failed.');
    } finally {
      setSaving(false);
    }
  };

  const text = (key: string, type = 'text') => <input type={type} disabled={!editable} value={form.formData[key] || ''} onChange={event => changeData(key, event.target.value)} className={inputClass} />;
  const yesNo = (key: string) => <select disabled={!editable} value={form.formData[key] || ''} onChange={event => changeData(key, event.target.value)} className={inputClass}><option value="">Select</option><option>Yes</option><option>No</option></select>;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="mx-auto my-4 max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b bg-slate-50 p-5">
          <div><BrandedLogo layout="horizontal" size="xs" /><h2 className="mt-3 text-lg font-black text-slate-950">{definition.title}</h2><p className="mt-1 text-xs text-slate-500">Revision {form.revision} · {form.status}</p></div>
          <button type="button" aria-label="Close form" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-200"><X className="h-5 w-5" /></button>
        </header>
        <main className="space-y-5 p-5 md:p-7">
          {form.status === 'Returned for Correction' && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900"><b>Returned for correction:</b> {form.reviewerNotes || 'SHC requested changes.'} Your previous submitted revision remains archived.</div>}
          {!editable && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900">This form is read-only while its status is {form.status}.</div>}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {definition.type === 'starter_information' && <>
              <Field label="Full legal name">{text('fullLegalName')}</Field><Field label="Date of birth">{text('dateOfBirth', 'date')}</Field>
              <Field label="Address" wide>{text('address')}</Field><Field label="Postcode">{text('postcode')}</Field><Field label="Telephone">{text('telephone')}</Field>
              <Field label="Mobile">{text('mobile')}</Field><Field label="Personal email">{text('personalEmail', 'email')}</Field>
              <Field label="National Insurance number">{text('nationalInsuranceNumber')}</Field><Field label="Job role">{text('jobRole')}</Field>
              <Field label="Place of work / base">{text('placeOfWork')}</Field><Field label="Also known as (optional)">{text('alsoKnownAs')}</Field>
              <Field label="Gender identity (optional)"><select disabled={!editable} value={form.formData.genderIdentity || ''} onChange={event => changeData('genderIdentity', event.target.value)} className={inputClass}><option value="">Prefer not to say / not provided</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Self-describe</option></select></Field>
              <Field label="Intended start date">{text('intendedStartDate', 'date')}</Field><Field label="Employment type"><select disabled={!editable} value={form.formData.employmentType || ''} onChange={event => changeData('employmentType', event.target.value)} className={inputClass}><option value="">Select</option><option>Permanent</option><option>Fixed term</option><option>Bank / casual</option><option>Part time</option></select></Field>
              <Field label="Related to an SHC employee or service user?">{yesNo('relatedToShcPerson')}</Field>{form.formData.relatedToShcPerson === 'Yes' && <Field label="Relationship details">{text('relatedToShcPersonDetails')}</Field>}
              <Field label="Previously worked for SHC, including agency work?">{yesNo('previouslyWorkedForShc')}</Field>{form.formData.previouslyWorkedForShc === 'Yes' && <Field label="Previous SHC work details">{text('previousShcWorkDetails')}</Field>}
              <Field label="Emergency contact name">{text('emergencyContactName')}</Field><Field label="Relationship">{text('emergencyContactRelationship')}</Field><Field label="Emergency contact telephone">{text('emergencyContactPhone')}</Field>
            </>}
            {definition.type === 'bank_details' && <>
              <div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Confidential payroll record. It is visible only to you and authorised SHC administrators.</div>
              <Field label="Account holder name">{text('accountHolderName')}</Field><Field label="Bank / building society">{text('bankName')}</Field>
              <Field label="Sort code">{text('sortCode')}</Field><Field label="Account number">{text('accountNumber')}</Field><Field label="Building society number (optional)">{text('buildingSocietyNumber')}</Field>
              <label className="md:col-span-2 flex items-start gap-2 rounded-xl border p-3 text-xs"><input type="checkbox" disabled={!editable} checked={Boolean(form.formData.payrollDeclaration)} onChange={event => changeData('payrollDeclaration', event.target.checked)} />I confirm that these details are correct and authorise SHC to use them for payroll payments.</label>
            </>}
            {definition.type === 'paye_declaration' && <>
              <div className="md:col-span-2 space-y-2 rounded-xl border p-4 text-xs"><b>Select the statement that applies:</b>
                {[
                  ['A', 'This is my first job since last 6 April and I have not received taxable Jobseeker’s Allowance, Employment and Support Allowance, Incapacity Benefit, or a pension.'],
                  ['B', 'This is now my only job, but since last 6 April I have had another job or received taxable benefits or a pension.'],
                  ['C', 'As well as my new job, I have another job or receive a State or Occupational Pension.'],
                ].map(([value, label]) => <label key={value} className="flex gap-2"><input type="radio" disabled={!editable} name="starterStatement" checked={form.formData.starterStatement === value} onChange={() => changeData('starterStatement', value)} /><span><b>{value}.</b> {label}</span></label>)}
              </div>
              <Field label="Student loan not fully repaid?">{yesNo('studentLoanOutstanding')}</Field>
              {form.formData.studentLoanOutstanding === 'Yes' && <><Field label="Student loan plan"><select disabled={!editable} value={form.formData.studentLoanPlan || ''} onChange={event => changeData('studentLoanPlan', event.target.value)} className={inputClass}><option value="">Select</option><option>Plan 1</option><option>Plan 2</option><option>Plan 4</option><option>Postgraduate Loan</option></select></Field><Field label="Repaying by Direct Debit?">{yesNo('studentLoanDirectDebit')}</Field><Field label="Study completion date">{text('studyCompletionDate', 'date')}</Field></>}
            </>}
            {definition.type === 'next_of_kin' && <>
              <Field label="Full name">{text('fullName')}</Field><Field label="Relationship">{text('relationship')}</Field><Field label="Telephone / mobile">{text('telephone')}</Field><Field label="Address">{text('address')}</Field>
              <Field label="Alternative contact name">{text('alternativeName')}</Field><Field label="Alternative telephone">{text('alternativeTelephone')}</Field>
            </>}
            {definition.type === 'working_time_declaration' && <div className="md:col-span-2 space-y-4 text-xs">
              <div className="rounded-xl border bg-slate-50 p-4 leading-5">The Working Time Regulations normally limit average weekly working time to 48 hours. You may voluntarily agree to work more than this average and may withdraw that agreement by giving SHC written notice.</div>
              <label className="flex gap-2"><input type="radio" disabled={!editable} name="workingTimeChoice" checked={form.formData.workingTimeChoice === 'opt_out'} onChange={() => changeData('workingTimeChoice', 'opt_out')} />I voluntarily agree to opt out of the 48-hour average weekly limit.</label>
              <label className="flex gap-2"><input type="radio" disabled={!editable} name="workingTimeChoice" checked={form.formData.workingTimeChoice === 'do_not_opt_out'} onChange={() => changeData('workingTimeChoice', 'do_not_opt_out')} />I do not agree to opt out of the 48-hour average weekly limit.</label>
              <label className="flex gap-2"><input type="checkbox" disabled={!editable} checked={Boolean(form.formData.declarationRead)} onChange={event => changeData('declarationRead', event.target.checked)} />I have read and understood this declaration.</label>
            </div>}
            {definition.type === 'policy_acknowledgement' && <div className="md:col-span-2 space-y-3">
              {(definition.policies || []).map(policy => {
                const acknowledgements = Array.isArray(form.formData.acknowledgements) ? form.formData.acknowledgements : [];
                const acknowledged = acknowledgements.some((item: any) => item.policyKey === policy.key && item.policyVersion === policy.version && item.acknowledged);
                return <label key={`${policy.key}-${policy.version}`} className="block rounded-xl border p-4 text-xs"><span className="font-black text-purple-950">{policy.name} · Version {policy.version}</span><span className="mt-2 block leading-5 text-slate-600">{policy.statement}</span><span className="mt-3 flex gap-2 font-bold"><input type="checkbox" disabled={!editable} checked={acknowledged} onChange={event => changeData('acknowledgements', acknowledgements.filter((item: any) => item.policyKey !== policy.key).concat({ policyKey: policy.key, policyName: policy.name, policyVersion: policy.version, acknowledged: event.target.checked, acknowledgedAt: event.target.checked ? new Date().toISOString() : null }))} />I acknowledge this policy</span></label>;
              })}
            </div>}
          </section>

          {definition.signatureRequired && <HrSignatureInput type={(form.signatureType || 'typed') as HrSignatureType} value={form.signatureValue || ''} signerName={applicant.name} disabled={!editable} onTypeChange={signatureType => setForm(current => ({ ...current, signatureType }))} onChange={signatureValue => setForm(current => ({ ...current, signatureValue }))} />}
          {form.signedAt && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"><CheckCircle className="h-4 w-4" />Signed by {form.signerName} on {new Date(form.signedAt).toLocaleString()}</div>}
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">{error}</div>}
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 p-5">
          <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" />{saving ? 'Saving…' : lastSaved ? `Last saved ${new Date(lastSaved).toLocaleString()}` : 'Draft not saved yet'}</span>
          {editable && <div className="flex gap-2"><button type="button" disabled={saving} onClick={() => void persist().catch(() => undefined)} className="flex items-center gap-1 rounded-lg border px-4 py-2 text-xs font-bold"><Save className="h-3.5 w-3.5" />Save draft</button><button type="button" disabled={saving} onClick={() => void submit()} className="flex items-center gap-1 rounded-lg bg-purple-900 px-4 py-2 text-xs font-bold text-white"><Send className="h-3.5 w-3.5" />Submit to SHC</button></div>}
        </footer>
      </div>
    </div>
  );
}
