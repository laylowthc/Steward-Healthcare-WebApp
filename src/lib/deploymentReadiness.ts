import { RoleRequirement, RoleTemplate, Staff } from '../types';
import { ComplianceCaseBundle, ComplianceRecord, ComplianceRequirementStatus } from '../types/preEmploymentCompliance';
import { DeploymentReadinessReason, DeploymentReadinessResult, DeploymentReadinessSource } from '../types/deploymentReadiness';
import { StaffTrainingRecord } from '../types/trainingCredentials';
import { activeRequirements } from './roleEngine';
import { deriveTrainingCredentials, isTrainingCredentialRequirement } from './trainingCredentials';

const SATISFIED_COMPLIANCE = new Set<ComplianceRequirementStatus>([
  'Verified',
  'Waived / Exception Approved',
  'Not Required',
  'Expiring',
]);

const todayUtc = (now: Date) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const dateUtc = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00Z`).getTime();

const expiryState = (value: string | undefined, warningDays: number, now: Date) => {
  if (!value) return 'current' as const;
  const days = Math.ceil((dateUtc(value) - todayUtc(now)) / 86_400_000);
  if (days < 0) return 'expired' as const;
  if (days <= warningDays) return 'expiring' as const;
  return 'current' as const;
};

const sourceFor = (requirement: RoleRequirement): DeploymentReadinessSource =>
  requirement.metadata?.verification_source === 'training' || isTrainingCredentialRequirement(requirement)
    ? 'training'
    : 'compliance';

const safeMessage = (key: string, displayName: string, status?: string) => {
  switch (key) {
    case 'dbs_verification': return 'Your DBS clearance requires SHC review. SHC will contact you if any action is needed.';
    case 'right_to_work_verification': return 'Your Right to Work clearance is not currently complete.';
    case 'references_completed': return 'SHC has not yet completed the required reference checks.';
    case 'fitness_suitability': return 'Your fitness and role-suitability clearance is awaiting SHC completion.';
    case 'nmc_registration_valid': return 'Your professional registration has not yet been verified as current by SHC.';
    case 'manager_clearance': return 'Registered Manager pre-employment clearance has not yet been recorded.';
    default: return `${displayName} is ${status ? status.toLowerCase() : 'outstanding'}.`;
  }
};

const reason = (
  requirement: Pick<RoleRequirement, 'requirementKey' | 'displayName'>,
  message: string,
  source: DeploymentReadinessSource,
  expiryDate?: string,
): DeploymentReadinessReason => ({
  key: requirement.requirementKey,
  displayName: requirement.displayName,
  reason: message,
  staffMessage: source === 'training'
    ? message
    : safeMessage(requirement.requirementKey, requirement.displayName, message),
  source,
  expiryDate,
});

const complianceRecordFor = (records: ComplianceRecord[], requirement: RoleRequirement) =>
  records.find(record => record.roleRequirementId === requirement.id)
  || records.find(record => record.requirementKey === requirement.requirementKey);

const isTrainingRequirement = (requirement: RoleRequirement) =>
  isTrainingCredentialRequirement(requirement)
  || requirement.requirementKey === 'mandatory_training'
  || requirement.metadata?.verification_source === 'training';

export interface DeploymentReadinessInput {
  staff: Staff;
  role?: RoleTemplate;
  compliance?: ComplianceCaseBundle;
  trainingRecords?: StaffTrainingRecord[];
  now?: Date;
}

export const deriveDeploymentReadiness = ({
  staff,
  role,
  compliance,
  trainingRecords = [],
  now = new Date(),
}: DeploymentReadinessInput): DeploymentReadinessResult => {
  const blockers: DeploymentReadinessReason[] = [];
  const warnings: DeploymentReadinessReason[] = [];
  const deploymentRequirements = activeRequirements(role, 'deployment');
  const managerRequirement = deploymentRequirements.find(item => item.requirementKey === 'manager_clearance');
  const managerClearanceRecorded = compliance?.complianceCase?.managerClearanceStatus === 'Cleared';

  if (staff.accountRole !== 'staff') {
    blockers.push({
      key: 'approved_staff_lifecycle',
      displayName: 'Approved Staff lifecycle',
      reason: 'The person is not in the approved Staff account lifecycle.',
      staffMessage: 'Deployment readiness becomes available after SHC approves the Staff lifecycle.',
      source: 'staff',
    });
  }
  if (staff.status === 'Suspended' || staff.accountStatus === 'Suspended') {
    blockers.push({
      key: 'staff_suspension',
      displayName: 'Employment status',
      reason: 'The Staff account or employment record is suspended.',
      staffMessage: 'Your employment account is currently suspended. Contact SHC management.',
      source: 'staff',
    });
  }
  if (!role) {
    blockers.push({
      key: 'role_configuration',
      displayName: 'Role configuration',
      reason: 'No active configured role could be resolved for this Staff record.',
      staffMessage: 'SHC must confirm your current role before deployment readiness can be determined.',
      source: 'staff',
    });
  }

  if (managerRequirement?.required && !managerClearanceRecorded) {
    blockers.push(reason(
      managerRequirement,
      compliance?.complianceCase
        ? `Registered Manager clearance is ${compliance.complianceCase.managerClearanceStatus.toLowerCase()}.`
        : 'No current-role pre-employment compliance case and manager clearance are recorded.',
      'compliance',
    ));
  }

  const complianceRecords = compliance?.records || [];
  deploymentRequirements
    .filter(requirement => requirement.required && requirement.requirementKey !== 'manager_clearance' && !isTrainingRequirement(requirement))
    .forEach(requirement => {
      const record = complianceRecordFor(complianceRecords, requirement);
      if (!record) {
        blockers.push(reason(requirement, 'No authoritative compliance decision is recorded.', sourceFor(requirement)));
        return;
      }
      const currentExpiry = expiryState(record.expiryDate, Number(requirement.metadata?.expiry_warning_days || 45), now);
      if (currentExpiry === 'expired' || record.status === 'Expired') {
        blockers.push(reason(requirement, `${requirement.displayName} expired on ${record.expiryDate || 'the recorded expiry date'}.`, sourceFor(requirement), record.expiryDate));
        return;
      }
      if (!SATISFIED_COMPLIANCE.has(record.status)) {
        blockers.push(reason(requirement, `${requirement.displayName} is ${record.status}.`, sourceFor(requirement), record.expiryDate));
        return;
      }
      if (currentExpiry === 'expiring' || record.status === 'Expiring') {
        warnings.push(reason(requirement, `${requirement.displayName} expires soon${record.expiryDate ? ` on ${record.expiryDate}` : ''}.`, sourceFor(requirement), record.expiryDate));
      }
    });

  const trainingItems = deriveTrainingCredentials({ role, records: trainingRecords, complianceRecords, now });
  trainingItems
    .filter(item => item.mandatory && item.deploymentBlocking)
    .forEach(item => {
      if (item.status === 'Valid') return;
      if (item.status === 'Expiring Soon') {
        warnings.push(reason(item.requirement, item.reason, 'training', item.record?.expiryDate));
        return;
      }
      blockers.push(reason(item.requirement, item.reason, 'training', item.record?.expiryDate));
    });

  const unique = (items: DeploymentReadinessReason[]) => Array.from(
    new Map(items.map(item => [item.key, item])).values(),
  );
  const finalBlockers = unique(blockers);
  const finalWarnings = unique(warnings).filter(item => !finalBlockers.some(blocker => blocker.key === item.key));

  return {
    status: finalBlockers.length ? 'Deployment Restricted' : 'Ready for Deployment',
    ready: finalBlockers.length === 0,
    blockers: finalBlockers,
    warnings: finalWarnings,
    managerClearanceRecorded,
  };
};
