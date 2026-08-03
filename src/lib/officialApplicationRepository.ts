import { supabase } from './supabase';
import { EqualOpportunitiesData, OfficialApplicationData, OfficialApplicationStatus, OfficialApplicationVersion } from '../types/officialApplication';

const toRow = (data: OfficialApplicationData) => ({
  user_id: data.userId, applicant_id: data.applicantId, position_applied: data.positionApplied,
  vacancy_reference_location: data.vacancyReferenceLocation, source_of_advertisement: data.sourceOfAdvertisement,
  title: data.title, forenames: data.forenames, surname: data.surname, address: data.address, postcode: data.postcode,
  telephone: data.telephone, mobile: data.mobile, personal_email: data.personalEmail,
  national_insurance_number: data.nationalInsuranceNumber, eligible_to_work_uk: data.eligibleToWorkUk,
  nmc_pin: data.nmcPin, rna: data.rna, nmc_expiry_date: data.nmcExpiryDate || null,
  right_to_work: data.rightToWork, enhanced_dbs: data.enhancedDbs, dbs_issue_date: data.dbsIssueDate || null,
  recent_employer_name_address: data.recentEmployerNameAddress, recent_employer_postcode: data.recentEmployerPostcode,
  recent_employer_telephone: data.recentEmployerTelephone, recent_employer_date_from: data.recentEmployerDateFrom || null,
  recent_employer_date_to: data.recentEmployerDateTo || null, recent_employer_position_title: data.recentEmployerPositionTitle,
  recent_employer_primary_responsibilities: data.recentEmployerPrimaryResponsibilities,
  recent_employer_salary: data.recentEmployerSalary, recent_employer_notice_period: data.recentEmployerNoticePeriod,
  recent_employer_reason_for_leaving: data.recentEmployerReasonForLeaving,
  employment_history: data.employmentHistory, professional_references: data.professionalReferences,
  referees_agreed_to_contact: data.refereesAgreedToContact, personal_statement: data.personalStatement,
  knows_connected_person: data.knowsConnectedPerson, connected_person_details: data.connectedPersonDetails,
  has_unprotected_criminal_record: data.hasUnprotectedCriminalRecord, criminal_record_details: data.criminalRecordDetails,
  declaration_confirmed: data.declarationConfirmed, references_checks_authorised: data.referencesAndChecksAuthorised,
  satisfactory_checks_acknowledged: data.satisfactoryChecksAcknowledged, data_protection_consent: data.dataProtectionConsent,
  signature_type: data.signatureType, signature_value: data.signatureValue, printed_name: data.printedName,
  signature_date: data.signatureDate || null, current_step: data.currentStep, status: data.status,
  revision: data.revision, reviewer_notes: data.reviewerNotes || null,
  submitted_at: data.submittedAt || null, reviewed_at: data.reviewedAt || null, reviewed_by: data.reviewedBy || null
});

const fromRow = (r: any): OfficialApplicationData => ({
  id:r.id,userId:r.user_id,applicantId:r.applicant_id,positionApplied:r.position_applied||'',vacancyReferenceLocation:r.vacancy_reference_location||'',sourceOfAdvertisement:r.source_of_advertisement||'',title:r.title||'',forenames:r.forenames||'',surname:r.surname||'',address:r.address||'',postcode:r.postcode||'',telephone:r.telephone||'',mobile:r.mobile||'',personalEmail:r.personal_email||'',nationalInsuranceNumber:r.national_insurance_number||'',eligibleToWorkUk:r.eligible_to_work_uk,nmcPin:r.nmc_pin||'',rna:r.rna||'',nmcExpiryDate:r.nmc_expiry_date||'',rightToWork:r.right_to_work||'',enhancedDbs:r.enhanced_dbs||'',dbsIssueDate:r.dbs_issue_date||'',recentEmployerNameAddress:r.recent_employer_name_address||'',recentEmployerPostcode:r.recent_employer_postcode||'',recentEmployerTelephone:r.recent_employer_telephone||'',recentEmployerDateFrom:r.recent_employer_date_from||'',recentEmployerDateTo:r.recent_employer_date_to||'',recentEmployerPositionTitle:r.recent_employer_position_title||'',recentEmployerPrimaryResponsibilities:r.recent_employer_primary_responsibilities||'',recentEmployerSalary:r.recent_employer_salary||'',recentEmployerNoticePeriod:r.recent_employer_notice_period||'',recentEmployerReasonForLeaving:r.recent_employer_reason_for_leaving||'',employmentHistory:r.employment_history||[],professionalReferences:r.professional_references||[],refereesAgreedToContact:!!r.referees_agreed_to_contact,personalStatement:r.personal_statement||'',knowsConnectedPerson:r.knows_connected_person,connectedPersonDetails:r.connected_person_details||'',hasUnprotectedCriminalRecord:r.has_unprotected_criminal_record,criminalRecordDetails:r.criminal_record_details||'',declarationConfirmed:!!r.declaration_confirmed,referencesAndChecksAuthorised:!!r.references_checks_authorised,satisfactoryChecksAcknowledged:!!r.satisfactory_checks_acknowledged,dataProtectionConsent:!!r.data_protection_consent,signatureType:r.signature_type||'typed',signatureValue:r.signature_value||'',printedName:r.printed_name||'',signatureDate:r.signature_date||'',currentStep:r.current_step||1,status:r.status||'Draft',revision:r.revision||1,reviewerNotes:r.reviewer_notes||'',submittedAt:r.submitted_at,reviewedAt:r.reviewed_at,reviewedBy:r.reviewed_by,createdAt:r.created_at,updatedAt:r.updated_at
});

export async function loadOfficialApplication(userId:string){
  const {data,error}=await supabase.from('employment_applications').select('*').eq('user_id',userId).order('revision',{ascending:false}).limit(1).maybeSingle();
  if(error) throw error; return data?fromRow(data):null;
}
export async function saveOfficialApplication(data:OfficialApplicationData){
  const row=toRow(data); const query=data.id?supabase.from('employment_applications').update(row).eq('id',data.id):supabase.from('employment_applications').upsert(row,{onConflict:'user_id'});
  const {data:saved,error}=await query.select('*').single(); if(error) throw error; return fromRow(saved);
}
export async function saveEqualOpportunities(applicationId:string,userId:string,data:EqualOpportunitiesData){
  const {error}=await supabase.from('employment_application_equal_opportunities').upsert({application_id:applicationId,user_id:userId,vacancy_reference_number:data.vacancyReferenceNumber,gender_identification:data.genderIdentification,age_band:data.ageBand,disability_declaration:data.disabilityDeclaration,ethnic_origin:data.ethnicOrigin},{onConflict:'application_id'}); if(error) throw error;
}
export async function loadEqualOpportunities(applicationId:string){
  const {data,error}=await supabase.from('employment_application_equal_opportunities').select('*').eq('application_id',applicationId).maybeSingle(); if(error) throw error;
  return data?{vacancyReferenceNumber:data.vacancy_reference_number||'',genderIdentification:data.gender_identification||'',ageBand:data.age_band||'',disabilityDeclaration:data.disability_declaration||'',ethnicOrigin:data.ethnic_origin||''}:null;
}
export async function reviewOfficialApplication(id:string,status:OfficialApplicationStatus,notes:string){
  const {data:{user}}=await supabase.auth.getUser(); const {error}=await supabase.from('employment_applications').update({status,reviewer_notes:notes,reviewed_at:new Date().toISOString(),reviewed_by:user?.id||null}).eq('id',id); if(error) throw error;
}

export async function loadOfficialApplicationVersions(applicationId:string):Promise<OfficialApplicationVersion[]>{
  const {data,error}=await supabase.from('employment_application_versions').select('*').eq('application_id',applicationId).order('revision',{ascending:false});
  if(error) throw error;
  return (data||[]).map((row:any)=>({
    id:row.id,
    applicationId:row.application_id,
    revision:row.revision,
    status:row.status,
    snapshot:fromRow(row.snapshot||{}),
    createdAt:row.created_at,
    createdBy:row.created_by
  }));
}
