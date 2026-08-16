# Sprint 4B personnel checklist source audit

This audit translates the controls found in the original SHC paperwork into authoritative StaffHub sources. It does not reproduce the legacy checklist as a second manual form and contains no applicant data.

## Archive material inspected

- Personnel Checklist
- Appendix H — Pre-employment Checklist
- Appendix D / PAY 1A — New Starter Information
- Appendix G / PAY 1B — New Starter Information
- Application for Employment (all three supplied versions)
- Healthcare Assistant / Support Worker Job Description
- Nurse Profile and Carer Profile
- Employment Contract / Statement of Main Terms
- Care Coordinator and Support Worker interview forms
- Supervision Record
- Weekly Timesheet
- training and profile material referenced by the checklists

## Control mapping

| Legacy control | Authoritative StaffHub source | Mode | Classification |
|---|---|---|---|
| Application form | Approved immutable Official Application revision | Derived | Already represented |
| Employment/education history and gaps | Continuous-history validator over the application revision | Derived | Already represented |
| Referee details | Official Application | Derived | Already represented |
| References received and independently verified | Sprint 4A reference verification records | Derived | Already represented |
| Shortlisting paperwork | Sprint 4A manual compliance control until recruitment workflow exists | Admin-recorded | Sprint 5 |
| Interview paperwork | Sprint 4A manual compliance control until interview workflow exists | Admin-recorded | Sprint 5 |
| Recruitment decision | Recruitment lifecycle plus application review | Derived | Sprint 4B control surface |
| Recent photograph | Persisted Profile Photo document | Derived | Sprint 4B control surface |
| Right to Work | Sprint 4A RTW evidence and office verification | Derived | Already represented |
| Enhanced DBS / disclosure review | Sprint 4A DBS check and risk-assessment decision | Derived | Already represented |
| Nurse registration | Role-configured Sprint 4A professional-registration verification | Derived | Already represented |
| Fitness declaration / OH clearance | Sprint 4A fitness/suitability record | Derived | Already represented |
| Registered Manager sign-off | Sprint 4A manager-clearance gate | Derived | Already represented |
| PAY 1A / starter information | Approved HR onboarding form | Derived | Already represented |
| PAY 1B / PAYE declaration | Approved HR onboarding form | Derived | Already represented |
| Bank details | Approved secure HR onboarding form; values never appear in checklist | Derived | Already represented |
| Next of kin / emergency contact | Approved HR onboarding form | Derived | Already represented |
| Working-time declaration | Approved HR onboarding form | Derived | Already represented |
| Policy acknowledgements | Approved HR onboarding form | Derived | Already represented |
| Job Description | Current role JD acknowledgement and immutable signed version | Derived | Already represented |
| Conditional offer / appointment letter | Controlled Document Vault record | Derived | Sprint 4B control surface |
| Employment contract | Controlled Document Vault record | Derived | Sprint 4B; richer issue/sign workflow deferred to Sprint 6 |
| Variation of terms | Controlled Document Vault record | Derived | Sprint 4B; controlled workflow deferred to Sprint 6 |
| Payroll Pay 2 / Pay 3 records | No current dedicated workflow | Future | Sprint 6 |
| Induction, Care Certificate, qualifications and training certificates | Role-configured credential/training architecture | Future | Sprint 4C |
| NMC renewal, professional indemnity and immunisation evidence | Role-configured credential architecture | Future | Sprint 4C |
| Probation reviews, supervision and appraisal | No current dedicated workflow | Future | Sprint 6 |
| Sickness, return-to-work and Occupational Health records | No broad personnel workflow; sensitive controls must remain restricted | Future | Sprint 6 |
| Disciplinary, grievance and general file notes | No current dedicated workflow | Future | Sprint 6 |
| Weekly timesheets | Existing operational timesheet module | Future integration | Sprint 7 |

## Policy confirmation required

- The legacy mandatory COVID vaccination-passport control should not become a blocker without current SHC policy confirmation.
- Historic branch/home, cost-code and salary-point terminology needs confirmation before becoming structured employment fields.
- Optional equality questions in PAY 1B require a confirmed purpose, retention period and access policy before further digitisation.
- Paper/email/scanning instructions are obsolete delivery mechanisms; the underlying evidence-retention controls are preserved digitally.
- “Fitness certificate” wording has been modernised to declaration/OH clearance states without collecting diagnoses.

## Sprint 4B implementation boundary

The Personnel Files view derives supported facts at read time and links administrators to the authoritative workflow. Missing legacy evidence is shown as **Not Recorded** or **Outstanding**; it is never fabricated. Personnel-file completeness remains separate from compliance clearance and deployment readiness.
