import { RoleTemplate } from '../types';
import { activeRequirements, hasRequirement } from './roleEngine';
import { OfficialApplicationData } from '../types/officialApplication';

export const validateOfficialApplication = (
  form: OfficialApplicationData,
  role?: RoleTemplate,
) => {
  const missing: string[] = [];
  const req = (value: any, name: string) => {
    if (value === null || value === undefined || String(value).trim() === '') missing.push(name);
  };
  const applicationRequirements = activeRequirements(role, 'application')
    .filter(requirement => requirement.required && requirement.responsibleParty === 'applicant');
  const configured = (key: string) => applicationRequirements.some(requirement => requirement.requirementKey === key);

  if (!role || !form.roleId) missing.push('Position Applied For');

  if (configured('official_application')) {
    req(form.forenames, 'Forenames');
    req(form.surname, 'Surname');
    req(form.address, 'Address');
    req(form.postcode, 'Postcode');
    req(form.mobile, 'Mobile Number');
    req(form.personalEmail, 'Personal Email Address');
    if (!/^\S+@\S+\.\S+$/.test(form.personalEmail)) missing.push('Valid Personal Email Address');
    if (form.eligibleToWorkUk === null) missing.push('Eligible to work in the UK');
  }

  if (configured('employment_history')) {
    const hasRecentEmployer = Boolean(form.recentEmployerNameAddress.trim() && form.recentEmployerPositionTitle.trim());
    const hasPreviousEmployer = form.employmentHistory.some(employer =>
      employer.employerNameAddress.trim() && employer.positionHeld.trim()
    );
    if (!hasRecentEmployer && !hasPreviousEmployer) missing.push('Employment history');
  }

  if (hasRequirement(role, 'nmc_registration_information')) {
    req(form.nmcPin, 'NMC PIN');
    req(form.rna, 'NMC registration information');
  }
  if (hasRequirement(role, 'nmc_pin')) req(form.nmcPin, 'NMC PIN');
  if (hasRequirement(role, 'nmc_expiry')) req(form.nmcExpiryDate, 'NMC Expiry Date');

  if (form.recentEmployerDateFrom && form.recentEmployerDateTo && form.recentEmployerDateFrom > form.recentEmployerDateTo)
    missing.push('Present employer date range');
  form.employmentHistory.forEach((employer, index) => {
    if (employer.dateFrom && employer.dateTo && employer.dateFrom > employer.dateTo)
      missing.push(`Previous Employer ${index + 1} date range`);
  });

  if (configured('professional_references')) {
    const requirement = applicationRequirements.find(item => item.requirementKey === 'professional_references');
    const minimum = Number(requirement?.metadata?.minimum || 2);
    form.professionalReferences.slice(0, minimum).forEach((reference, index) => {
      req(reference.fullName, `Referee ${index + 1} name`);
      req(reference.email, `Referee ${index + 1} email`);
    });
    if (!form.refereesAgreedToContact) missing.push('Reference declaration');
  }

  if (configured('official_application')) {
    if (form.knowsConnectedPerson === null) missing.push('SHC connection answer');
    if (form.knowsConnectedPerson && !form.connectedPersonDetails.trim()) missing.push('SHC connection details');
    if (form.hasUnprotectedCriminalRecord === null) missing.push('Criminal record answer');
    if (form.hasUnprotectedCriminalRecord && !form.criminalRecordDetails.trim()) missing.push('Criminal record details');
  }

  if (configured('declaration_signature')) {
    if (!form.declarationConfirmed || !form.referencesAndChecksAuthorised || !form.satisfactoryChecksAcknowledged || !form.dataProtectionConsent)
      missing.push('All applicant declarations');
    req(form.signatureValue, 'Electronic signature');
    req(form.printedName, 'Print Name');
  }

  return Array.from(new Set(missing));
};
