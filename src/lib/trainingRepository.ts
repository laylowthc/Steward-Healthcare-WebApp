import { supabase } from './supabase';
import { StaffTrainingRecord } from '../types/trainingCredentials';

const schemaUnavailable = (error: any) =>
  ['PGRST205', '42P01'].includes(error?.code)
  || /staff_training_records.*schema cache|relation .* does not exist/i.test(error?.message || '');

const mapRecord = (row: any): StaffTrainingRecord => ({
  id: row.id,
  userId: row.user_id,
  staffProfileId: row.staff_profile_id,
  roleRequirementId: row.role_requirement_id,
  provider: row.provider || '',
  issueDate: row.issue_date || undefined,
  expiryDate: row.expiry_date || undefined,
  evidenceDocumentId: row.evidence_document_id || undefined,
  verificationStatus: row.verification_status,
  verifiedBy: row.verified_by || undefined,
  verifiedAt: row.verified_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function loadTrainingRecords(userId?: string): Promise<{ records: StaffTrainingRecord[]; schemaAvailable: boolean }> {
  let query = supabase.from('staff_training_records').select('*').order('updated_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) {
    if (schemaUnavailable(error)) return { records: [], schemaAvailable: false };
    throw error;
  }
  return { records: (data || []).map(mapRecord), schemaAvailable: true };
}

export async function saveTrainingRecord(record: StaffTrainingRecord): Promise<StaffTrainingRecord> {
  const payload = {
    user_id: record.userId,
    staff_profile_id: record.staffProfileId,
    role_requirement_id: record.roleRequirementId,
    provider: record.provider.trim(),
    issue_date: record.issueDate || null,
    expiry_date: record.expiryDate || null,
    evidence_document_id: record.evidenceDocumentId || null,
    ...(record.id ? {} : { verification_status: 'Awaiting Verification' }),
  };
  const { data, error } = await supabase
    .from('staff_training_records')
    .upsert(payload, { onConflict: 'staff_profile_id,role_requirement_id' })
    .select('*')
    .single();
  if (error) throw error;
  return mapRecord(data);
}

export async function verifyTrainingRecord(recordId: string, verified: boolean): Promise<StaffTrainingRecord> {
  const { data, error } = await supabase.rpc('admin_verify_training_record', {
    target_record_id: recordId,
    next_verified: verified,
  });
  if (error) throw error;
  return mapRecord(data);
}
