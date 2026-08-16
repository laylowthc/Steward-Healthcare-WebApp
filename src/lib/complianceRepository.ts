import { supabase } from './supabase';
import {
  ComplianceCase,
  ComplianceCaseBundle,
  ComplianceEvent,
  ComplianceRecord,
  ComplianceRequirementStatus,
  ComplianceVerificationDetails,
  ReferenceVerification,
} from '../types/preEmploymentCompliance';
import { DerivedComplianceRequirement } from './preEmploymentCompliance';

const schemaUnavailable = (error: any) =>
  ['PGRST205', '42P01'].includes(error?.code)
  || /compliance_(cases|records).*schema cache|relation .* does not exist/i.test(error?.message || '');

const mapCase = (row: any): ComplianceCase => ({
  id: row.id,
  userId: row.user_id,
  applicantId: row.applicant_id || undefined,
  staffProfileId: row.staff_profile_id || undefined,
  roleId: row.role_id,
  lifecycleState: row.lifecycle_state,
  overallStatus: row.overall_status,
  managerClearanceStatus: row.manager_clearance_status,
  deploymentEligible: Boolean(row.deployment_eligible),
  managerClearedBy: row.manager_cleared_by || undefined,
  managerClearedAt: row.manager_cleared_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRecord = (row: any): ComplianceRecord => ({
  id: row.id,
  complianceCaseId: row.compliance_case_id,
  roleRequirementId: row.role_requirement_id || undefined,
  requirementKey: row.requirement_key,
  displayName: row.display_name,
  stage: row.stage,
  responsibleParty: row.responsible_party,
  sourceKind: row.source_kind,
  status: row.status,
  evidenceDocumentId: row.evidence_document_id || undefined,
  evidenceReceivedAt: row.evidence_received_at || undefined,
  verifiedBy: row.verified_by || undefined,
  verifiedAt: row.verified_at || undefined,
  expiryDate: row.expiry_date || undefined,
  blocking: Boolean(row.is_blocking),
  applicantMessage: row.applicant_message || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapDetails = (row: any): ComplianceVerificationDetails => ({
  complianceRecordId: row.compliance_record_id,
  evidenceType: row.evidence_type || '',
  evidenceReference: row.evidence_reference || '',
  checkPerformed: Boolean(row.check_performed),
  checkDate: row.check_date || undefined,
  outcome: row.outcome || '',
  concernPresent: Boolean(row.concern_present),
  riskAssessmentStatus: row.risk_assessment_status || undefined,
  occupationalHealthStatus: row.occupational_health_status || undefined,
  shareCodeReference: row.share_code_reference || '',
  certificateNumber: row.certificate_number || '',
  issueDate: row.issue_date || undefined,
  registrationBody: row.registration_body || '',
  registrationType: row.registration_type || '',
  internalNotes: row.internal_notes || '',
  updatedBy: row.updated_by || undefined,
  updatedAt: row.updated_at || undefined,
});

const mapReference = (row: any): ReferenceVerification => ({
  id: row.id,
  complianceCaseId: row.compliance_case_id,
  referenceNumber: row.reference_number,
  applicationReferenceIndex: row.application_reference_index ?? undefined,
  refereeNameSnapshot: row.referee_name_snapshot || '',
  refereeOrganisationSnapshot: row.referee_organisation_snapshot || '',
  requestedAt: row.requested_at || undefined,
  receivedAt: row.received_at || undefined,
  employmentDatesConfirmed: Boolean(row.employment_dates_confirmed),
  reasonForLeavingConfirmed: Boolean(row.reason_for_leaving_confirmed),
  signerName: row.signer_name || '',
  signerRole: row.signer_role || '',
  telephoneVerified: Boolean(row.telephone_verified),
  verifiedBy: row.verified_by || undefined,
  verifiedAt: row.verified_at || undefined,
  outcome: row.outcome || 'Pending',
  supportingDocumentId: row.supporting_document_id || undefined,
  internalNotes: row.internal_notes || '',
});

const mapEvent = (row: any): ComplianceEvent => ({
  id: row.id,
  complianceCaseId: row.compliance_case_id,
  complianceRecordId: row.compliance_record_id || undefined,
  actorUserId: row.actor_user_id || undefined,
  action: row.action,
  previousState: row.previous_state || undefined,
  newState: row.new_state || undefined,
  reason: row.reason || '',
  createdAt: row.created_at,
});

export async function loadComplianceCase(userId: string, includeAdminDetails = false, roleId?: string): Promise<ComplianceCaseBundle> {
  let caseQuery = supabase.from('compliance_cases').select('*').eq('user_id', userId);
  if (roleId) caseQuery = caseQuery.eq('role_id', roleId);
  const caseResult = await caseQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (caseResult.error) {
    if (schemaUnavailable(caseResult.error)) return { complianceCase: null, records: [], details: [], references: [], events: [], schemaAvailable: false };
    throw caseResult.error;
  }
  if (!caseResult.data) return { complianceCase: null, records: [], details: [], references: [], events: [], schemaAvailable: true };
  const complianceCase = mapCase(caseResult.data);
  const recordsResult = await supabase.from('compliance_records').select('*').eq('compliance_case_id', complianceCase.id).order('created_at');
  if (recordsResult.error) throw recordsResult.error;
  if (!includeAdminDetails) return { complianceCase, records: (recordsResult.data || []).map(mapRecord), details: [], references: [], events: [], schemaAvailable: true };
  const recordIds = (recordsResult.data || []).map((row: any) => row.id);
  const [detailsResult, referencesResult, eventsResult] = await Promise.all([
    recordIds.length ? supabase.from('compliance_verification_details').select('*').in('compliance_record_id', recordIds) : Promise.resolve({ data: [], error: null } as any),
    supabase.from('reference_verifications').select('*').eq('compliance_case_id', complianceCase.id).order('reference_number'),
    supabase.from('compliance_events').select('*').eq('compliance_case_id', complianceCase.id).order('created_at', { ascending: false }).limit(100),
  ]);
  const error = detailsResult.error || referencesResult.error || eventsResult.error;
  if (error) throw error;
  return {
    complianceCase,
    records: (recordsResult.data || []).map(mapRecord),
    details: (detailsResult.data || []).map(mapDetails),
    references: (referencesResult.data || []).map(mapReference),
    events: (eventsResult.data || []).map(mapEvent),
    schemaAvailable: true,
  };
}

export async function ensureComplianceCase(input: {
  userId: string;
  applicantId?: string;
  staffProfileId?: string;
  roleId: string;
  lifecycleState: string;
  requirements: DerivedComplianceRequirement[];
}): Promise<ComplianceCase> {
  const { data: caseRow, error: caseError } = await supabase.from('compliance_cases').upsert({
    user_id: input.userId,
    applicant_id: input.applicantId || null,
    staff_profile_id: input.staffProfileId || null,
    role_id: input.roleId,
    lifecycle_state: input.lifecycleState,
  }, { onConflict: 'user_id,role_id' }).select('*').single();
  if (caseError) throw caseError;
  const complianceCase = mapCase(caseRow);
  const rows = input.requirements.map(requirement => ({
    compliance_case_id: complianceCase.id,
    role_requirement_id: requirement.roleRequirementId || null,
    requirement_key: requirement.requirementKey,
    display_name: requirement.displayName,
    stage: requirement.stage,
    responsible_party: requirement.responsibleParty,
    source_kind: requirement.sourceKind,
    status: requirement.sourceKind === 'derived' || requirement.sourceKind === 'document' || requirement.requirementKey === 'references_completed'
      ? requirement.status
      : requirement.persistedRecord?.status || requirement.status,
    is_blocking: requirement.blocking,
    applicant_message: requirement.reason,
  }));
  if (rows.length) {
    const { error } = await supabase.from('compliance_records').upsert(rows, { onConflict: 'compliance_case_id,requirement_key' });
    if (error) throw error;
  }
  if (complianceCase.overallStatus === 'Not Started') {
    const { error } = await supabase.from('compliance_cases').update({ overall_status: 'In Progress' }).eq('id', complianceCase.id);
    if (error) throw error;
  }
  return complianceCase;
}

export async function updateComplianceDecision(input: {
  recordId: string;
  status: ComplianceRequirementStatus;
  applicantMessage: string;
  evidenceDocumentId?: string;
  expiryDate?: string;
  reason: string;
}): Promise<ComplianceRecord> {
  const { data, error } = await supabase.rpc('admin_update_compliance_record', {
    target_record_id: input.recordId,
    next_status: input.status,
    next_applicant_message: input.applicantMessage,
    next_evidence_document_id: input.evidenceDocumentId || null,
    next_expiry_date: input.expiryDate || null,
    change_reason: input.reason,
  });
  if (error) throw error;
  return mapRecord(data);
}

export async function saveVerificationDetails(details: ComplianceVerificationDetails) {
  const { error } = await supabase.from('compliance_verification_details').upsert({
    compliance_record_id: details.complianceRecordId,
    evidence_type: details.evidenceType || null,
    evidence_reference: details.evidenceReference || null,
    check_performed: details.checkPerformed,
    check_date: details.checkDate || null,
    outcome: details.outcome || null,
    concern_present: details.concernPresent,
    risk_assessment_status: details.riskAssessmentStatus || null,
    occupational_health_status: details.occupationalHealthStatus || null,
    share_code_reference: details.shareCodeReference || null,
    certificate_number: details.certificateNumber || null,
    issue_date: details.issueDate || null,
    registration_body: details.registrationBody || null,
    registration_type: details.registrationType || null,
    internal_notes: details.internalNotes,
    updated_by: (await supabase.auth.getUser()).data.user?.id || null,
  });
  if (error) throw error;
}

export async function saveReferenceVerification(reference: ReferenceVerification) {
  const currentUser = (await supabase.auth.getUser()).data.user?.id;
  const verified = reference.telephoneVerified && reference.outcome === 'Satisfactory';
  const { error } = await supabase.from('reference_verifications').upsert({
    compliance_case_id: reference.complianceCaseId,
    reference_number: reference.referenceNumber,
    application_reference_index: reference.applicationReferenceIndex ?? null,
    referee_name_snapshot: reference.refereeNameSnapshot,
    referee_organisation_snapshot: reference.refereeOrganisationSnapshot,
    requested_at: reference.requestedAt || null,
    received_at: reference.receivedAt || null,
    employment_dates_confirmed: reference.employmentDatesConfirmed,
    reason_for_leaving_confirmed: reference.reasonForLeavingConfirmed,
    signer_name: reference.signerName,
    signer_role: reference.signerRole,
    telephone_verified: reference.telephoneVerified,
    verified_by: verified ? currentUser : null,
    verified_at: verified ? new Date().toISOString() : null,
    outcome: reference.outcome,
    supporting_document_id: reference.supportingDocumentId || null,
    internal_notes: reference.internalNotes,
  }, { onConflict: 'compliance_case_id,reference_number' });
  if (error) throw error;
}

export async function setManagerClearance(caseId: string, status: ComplianceCase['managerClearanceStatus']) {
  const { error } = await supabase.from('compliance_cases').update({ manager_clearance_status: status }).eq('id', caseId);
  if (error) throw error;
}
