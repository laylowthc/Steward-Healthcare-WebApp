import { RoleRequirement, RoleTemplate } from '../types';
import { ComplianceRecord } from '../types/preEmploymentCompliance';
import { StaffTrainingRecord, TrainingCredentialItem, TrainingCredentialStatus } from '../types/trainingCredentials';
import { activeRequirements } from './roleEngine';

export const NMC_REQUIREMENT_KEY = 'nmc_registration_valid';

export const isTrainingCredentialRequirement = (requirement: RoleRequirement) =>
  requirement.metadata?.training_credential === true;

export const roleTrainingRequirements = (role?: RoleTemplate) =>
  (() => {
    const active = activeRequirements(role);
    const configured = active.filter(isTrainingCredentialRequirement);
    return (configured.length ? configured : active.filter(requirement => requirement.requirementKey === 'mandatory_training'))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
  })();

const dateOnly = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00Z`);

export const daysUntil = (value: string, now = new Date()) => {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((dateOnly(value).getTime() - today) / 86_400_000);
};

export const statusFromVerifiedDates = (
  expiryDate?: string,
  expiryApplicable = false,
  warningDays = 45,
  now = new Date(),
): TrainingCredentialStatus => {
  if (!expiryApplicable || !expiryDate) return 'Valid';
  const remaining = daysUntil(expiryDate, now);
  if (remaining < 0) return 'Expired';
  if (remaining <= warningDays) return 'Expiring Soon';
  return 'Valid';
};

const trainingRecordStatus = (
  requirement: RoleRequirement,
  record?: StaffTrainingRecord,
  now = new Date(),
): TrainingCredentialStatus => {
  if (!record) return 'Not Recorded';
  if (record.verificationStatus !== 'Verified') return 'Awaiting Verification';
  return statusFromVerifiedDates(
    record.expiryDate,
    Boolean(requirement.metadata?.expiry_applicable),
    Number(requirement.metadata?.expiry_warning_days || 45),
    now,
  );
};

const nmcStatus = (
  requirement: RoleRequirement,
  complianceRecord?: ComplianceRecord,
  now = new Date(),
): TrainingCredentialStatus => {
  if (!complianceRecord) return 'Not Recorded';
  if (complianceRecord.status === 'Expired') return 'Expired';
  if (complianceRecord.status === 'Expiring') return 'Expiring Soon';
  if (complianceRecord.status !== 'Verified') return 'Awaiting Verification';
  return statusFromVerifiedDates(
    complianceRecord.expiryDate,
    Boolean(requirement.metadata?.expiry_applicable),
    Number(requirement.metadata?.expiry_warning_days || 45),
    now,
  );
};

export const deriveTrainingCredentials = ({
  role,
  records = [],
  complianceRecords = [],
  now = new Date(),
}: {
  role?: RoleTemplate;
  records?: StaffTrainingRecord[];
  complianceRecords?: ComplianceRecord[];
  now?: Date;
}): TrainingCredentialItem[] => roleTrainingRequirements(role).map(requirement => {
  const isNmc = requirement.requirementKey === NMC_REQUIREMENT_KEY
    && requirement.metadata?.credential_source === 'existing_compliance';
  const record = records.find(entry => entry.roleRequirementId === requirement.id);
  const complianceRecord = complianceRecords.find(entry => entry.requirementKey === requirement.requirementKey);
  const status = isNmc
    ? nmcStatus(requirement, complianceRecord, now)
    : trainingRecordStatus(requirement, record, now);
  const source = isNmc ? 'existing_compliance' : 'training_record';
  const reason = status === 'Not Recorded'
      ? 'No authoritative training or credential record is held.'
      : status === 'Awaiting Verification'
        ? 'Evidence or registration information is recorded and awaits SHC verification.'
        : status === 'Expired'
          ? `The recorded credential expired on ${record?.expiryDate || complianceRecord?.expiryDate || 'the recorded expiry date'}.`
          : status === 'Expiring Soon'
            ? `The verified credential expires on ${record?.expiryDate || complianceRecord?.expiryDate}.`
            : source === 'existing_compliance'
              ? 'Verified through the existing SHC professional-registration control.'
              : 'Training evidence has been verified by SHC.';
  return {
    requirement,
    record,
    status,
    mandatory: requirement.required !== false,
    evidenceRequired: requirement.metadata?.evidence_required !== false,
    expiryApplicable: Boolean(requirement.metadata?.expiry_applicable),
    deploymentBlocking: Boolean(requirement.metadata?.deployment_blocking),
    source,
    reason,
  };
});

export const trainingDeploymentSatisfied = (items: TrainingCredentialItem[]) =>
  items
    .filter(item => item.deploymentBlocking && item.mandatory)
    .every(item => item.status === 'Valid' || item.status === 'Expiring Soon');

export const trainingCredentialCounts = (items: TrainingCredentialItem[]) => ({
  total: items.length,
  valid: items.filter(item => item.status === 'Valid').length,
  expiring: items.filter(item => item.status === 'Expiring Soon').length,
  expired: items.filter(item => item.status === 'Expired').length,
  awaiting: items.filter(item => item.status === 'Awaiting Verification').length,
  missing: items.filter(item => item.status === 'Not Recorded').length,
});
