import { OfficialApplicationData } from "../types/officialApplication";

export const isNursingRole = (role: string) =>
  /nurse|nursing|registered nurse|rn\b/i.test(role);

export const validateOfficialApplication = (form: OfficialApplicationData) => {
  const missing: string[] = [];
  const req = (value: any, name: string) => {
    if (value === null || value === undefined || String(value).trim() === "") missing.push(name);
  };
  req(form.positionApplied, "Position Applied For");
  req(form.forenames, "Forenames");
  req(form.surname, "Surname");
  req(form.address, "Address");
  req(form.postcode, "Postcode");
  req(form.mobile, "Mobile Number");
  req(form.personalEmail, "Personal Email Address");
  if (!/^\S+@\S+\.\S+$/.test(form.personalEmail)) missing.push("Valid Personal Email Address");
  if (form.eligibleToWorkUk === null) missing.push("Eligible to work in the UK");
  if (isNursingRole(form.positionApplied)) {
    req(form.nmcPin, "NMC PIN");
    req(form.rna, "RNA");
    req(form.nmcExpiryDate, "NMC Expiry Date");
  }
  if (form.recentEmployerDateFrom && form.recentEmployerDateTo && form.recentEmployerDateFrom > form.recentEmployerDateTo)
    missing.push("Present employer date range");
  form.employmentHistory.forEach((employer, index) => {
    if (employer.dateFrom && employer.dateTo && employer.dateFrom > employer.dateTo)
      missing.push(`Previous Employer ${index + 1} date range`);
  });
  form.professionalReferences.slice(0, 2).forEach((reference, index) => {
    req(reference.fullName, `Referee ${index + 1} name`);
    req(reference.email, `Referee ${index + 1} email`);
  });
  if (!form.refereesAgreedToContact) missing.push("Reference declaration");
  if (form.knowsConnectedPerson === null) missing.push("SHC connection answer");
  if (form.knowsConnectedPerson && !form.connectedPersonDetails.trim()) missing.push("SHC connection details");
  if (form.hasUnprotectedCriminalRecord === null) missing.push("Criminal record answer");
  if (form.hasUnprotectedCriminalRecord && !form.criminalRecordDetails.trim()) missing.push("Criminal record details");
  if (!form.declarationConfirmed || !form.referencesAndChecksAuthorised || !form.satisfactoryChecksAcknowledged || !form.dataProtectionConsent)
    missing.push("All applicant declarations");
  req(form.signatureValue, "Electronic signature");
  req(form.printedName, "Print Name");
  return Array.from(new Set(missing));
};
