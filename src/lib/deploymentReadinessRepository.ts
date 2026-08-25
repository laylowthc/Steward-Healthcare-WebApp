import { RoleTemplate, Staff } from '../types';
import { DeploymentReadinessResult } from '../types/deploymentReadiness';
import { loadComplianceCase } from './complianceRepository';
import { deriveDeploymentReadiness } from './deploymentReadiness';
import { findRole } from './roleEngine';
import { loadTrainingRecords } from './trainingRepository';

export interface LoadedDeploymentReadiness {
  result: DeploymentReadinessResult;
  complianceSchemaAvailable: boolean;
  trainingSchemaAvailable: boolean;
}

export async function loadStaffDeploymentReadiness(
  staff: Staff,
  templates: RoleTemplate[],
): Promise<LoadedDeploymentReadiness> {
  const role = findRole(templates, staff.roleId, staff.role);
  const [compliance, training] = await Promise.all([
    staff.userId ? loadComplianceCase(staff.userId, false, role?.id) : Promise.resolve(undefined),
    staff.userId ? loadTrainingRecords(staff.userId) : Promise.resolve({ records: [], schemaAvailable: true }),
  ]);
  return {
    result: deriveDeploymentReadiness({ staff, role, compliance, trainingRecords: training.records }),
    complianceSchemaAvailable: compliance?.schemaAvailable ?? true,
    trainingSchemaAvailable: training.schemaAvailable,
  };
}

export async function loadDeploymentReadinessMatrix(
  staff: Staff[],
  templates: RoleTemplate[],
): Promise<Record<string, LoadedDeploymentReadiness>> {
  const entries = await Promise.all(staff.map(async member => [member.id, await loadStaffDeploymentReadiness(member, templates)] as const));
  return Object.fromEntries(entries);
}

