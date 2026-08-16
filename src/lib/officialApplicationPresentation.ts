import { RoleTemplate } from '../types';
import { OfficialApplicationData } from '../types/officialApplication';
import { findRole, hasRequirement } from './roleEngine';

export const nmcPresentation = (application: OfficialApplicationData, templates: RoleTemplate[]) => {
  const role = findRole(templates, application.roleId, application.positionApplied);
  const required = hasRequirement(role, ['nmc_registration_information', 'nmc_pin', 'nmc_expiry', 'nmc_registration_valid']);
  const hasSubmittedData = Boolean(application.nmcPin.trim() || application.rna.trim() || application.nmcExpiryDate.trim());
  return { required, hasSubmittedData, historicalOnly: hasSubmittedData && !required };
};
