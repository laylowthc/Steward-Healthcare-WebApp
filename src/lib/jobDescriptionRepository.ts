import { supabase } from './supabase';
import { HrSignatureType } from '../types/hrOnboarding';
import { JobDescription, JobDescriptionAcknowledgement, JobDescriptionContent } from '../types/jobDescription';

const contentFromRow = (value: any): JobDescriptionContent => ({
  summary: String(value?.summary || ''),
  reportsTo: String(value?.reports_to || value?.reportsTo || ''),
  duties: Array.isArray(value?.duties) ? value.duties.map(String) : [],
  conduct: Array.isArray(value?.conduct) ? value.conduct.map(String) : [],
});

const contentToRow = (value: JobDescriptionContent) => ({
  summary: value.summary,
  reports_to: value.reportsTo,
  duties: value.duties,
  conduct: value.conduct,
});

export const mapJobDescriptionRow = (row: any): JobDescription => ({
  id: row.id,
  roleId: row.role_id,
  title: row.title,
  version: row.version,
  effectiveDate: row.effective_date || undefined,
  content: contentFromRow(row.content),
  active: row.active !== false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapJobDescriptionAcknowledgementRow = (row: any): JobDescriptionAcknowledgement => ({
  id: row.id,
  jobDescriptionId: row.job_description_id,
  userId: row.user_id,
  applicantId: row.applicant_id,
  roleId: row.role_id,
  roleName: row.role_name,
  jdTitle: row.jd_title,
  jdVersion: row.jd_version,
  jdEffectiveDate: row.jd_effective_date || undefined,
  contentSnapshot: contentFromRow(row.content_snapshot),
  acknowledgementText: row.acknowledgement_text,
  acknowledgementVersion: row.acknowledgement_version,
  signatureType: row.signature_type,
  signatureValue: row.signature_value,
  signerUserId: row.signer_user_id,
  signerName: row.signer_name,
  signedAt: row.signed_at,
  createdAt: row.created_at,
});

export async function loadCurrentJobDescription(roleId: string) {
  if (!roleId) return null;
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('role_id', roleId)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapJobDescriptionRow(data) : null;
}

export async function loadJobDescriptionsForRole(roleId: string) {
  if (!roleId) return [];
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapJobDescriptionRow);
}

export async function loadJobDescriptionAcknowledgements(userId: string) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('job_description_acknowledgements')
    .select('*')
    .eq('user_id', userId)
    .order('signed_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapJobDescriptionAcknowledgementRow);
}

export async function signJobDescription(input: {
  jobDescriptionId: string;
  userId: string;
  applicantId: string;
  roleId: string;
  signerName: string;
  signatureType: HrSignatureType;
  signatureValue: string;
}) {
  const { data, error } = await supabase
    .from('job_description_acknowledgements')
    .insert({
      job_description_id: input.jobDescriptionId,
      user_id: input.userId,
      applicant_id: input.applicantId,
      role_id: input.roleId,
      role_name: '', jd_title: '', jd_version: '', content_snapshot: {}, acknowledgement_text: '',
      signature_type: input.signatureType,
      signature_value: input.signatureValue,
      signer_user_id: input.userId,
      signer_name: input.signerName,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapJobDescriptionAcknowledgementRow(data);
}

export async function saveJobDescription(input: Omit<JobDescription, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const row = {
    role_id: input.roleId,
    title: input.title.trim(),
    version: input.version.trim(),
    effective_date: input.effectiveDate || null,
    content: contentToRow(input.content),
    active: input.active,
  };
  const query = input.id
    ? supabase.from('job_descriptions').update(row).eq('id', input.id)
    : supabase.from('job_descriptions').insert(row);
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return mapJobDescriptionRow(data);
}
