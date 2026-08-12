import { supabase } from './supabase';
import {
  HrOnboardingForm,
  HrOnboardingFormVersion,
  HrOnboardingStatus,
} from '../types/hrOnboarding';

const fromRow = (row: any): HrOnboardingForm => ({
  id: row.id,
  userId: row.user_id,
  applicantId: row.applicant_id,
  roleId: row.role_id || undefined,
  formType: row.form_type,
  status: row.status,
  formData: row.form_data || {},
  revision: Number(row.current_revision || 1),
  signatureType: row.signature_type || undefined,
  signatureValue: row.signature_value || undefined,
  signerUserId: row.signer_user_id || undefined,
  signerName: row.signer_name || undefined,
  signedAt: row.signed_at || undefined,
  submittedAt: row.submitted_at || undefined,
  reviewedBy: row.reviewed_by || undefined,
  reviewedAt: row.reviewed_at || undefined,
  reviewerNotes: row.reviewer_notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRow = (form: HrOnboardingForm) => ({
  user_id: form.userId,
  applicant_id: form.applicantId,
  role_id: form.roleId || null,
  form_type: form.formType,
  status: form.status,
  form_data: form.formData,
  current_revision: form.revision,
  signature_type: form.signatureType || null,
  signature_value: form.signatureValue || null,
  signer_user_id: form.signerUserId || null,
  signer_name: form.signerName || null,
  signed_at: form.signedAt || null,
});

export async function loadHrOnboardingForms(userId: string) {
  const { data, error } = await supabase
    .from('hr_onboarding_forms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function saveHrOnboardingDraft(form: HrOnboardingForm) {
  const query = form.id
    ? supabase.from('hr_onboarding_forms').update(toRow(form)).eq('id', form.id)
    : supabase.from('hr_onboarding_forms').insert(toRow(form));
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return fromRow(data);
}

export async function submitHrOnboardingForm(form: HrOnboardingForm) {
  if (!form.id) throw new Error('Save the form draft before submitting.');
  const { data, error } = await supabase
    .from('hr_onboarding_forms')
    .update({ ...toRow({ ...form, status: 'Submitted' }), status: 'Submitted' })
    .eq('id', form.id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function reviewHrOnboardingForm(
  id: string,
  status: Extract<HrOnboardingStatus, 'Approved' | 'Returned for Correction' | 'Rejected'>,
  notes: string,
) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('hr_onboarding_forms')
    .update({
      status,
      reviewer_notes: notes.trim() || null,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function loadHrOnboardingVersions(formId: string) {
  const { data, error } = await supabase
    .from('hr_onboarding_form_versions')
    .select('*')
    .eq('form_id', formId)
    .order('revision', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any): HrOnboardingFormVersion => ({
    id: row.id,
    formId: row.form_id,
    revision: Number(row.revision),
    status: row.status,
    snapshot: row.snapshot,
    signatureType: row.signature_type || undefined,
    signatureValue: row.signature_value || undefined,
    signerUserId: row.signer_user_id || undefined,
    signerName: row.signer_name || undefined,
    signedAt: row.signed_at || undefined,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
  }));
}
