# Sprint 4A source audit and roadmap map

This audit was completed against the original `SHC Web.zip` archive before Sprint 4A implementation. No source document or production record was modified.

## Documents inspected

- SHC Pre-employment Checklist (Appendix H)
- New Starter Information (Appendix D / PAY 1A)
- New Starter Information (Appendix G / PAY 1B)
- Personnel Checklist
- Application for Employment (all three archive variants, including the privacy insert)
- Healthcare Assistant / Support Worker Job Description
- SHC Nurse Profile
- SHC Carer Profile
- Support Worker Interview Assessment
- Care Coordinator Interview Assessment
- Employee Training and Development Record
- Employment contract, timesheet, supervision and appraisal material where relevant to classification

## Legacy-to-StaffHub gap map

| Legacy SHC control | Existing StaffHub source | Audit result before 4A | Sprint 4A digital control |
|---|---|---|---|
| Completed application | Versioned Official Application | Complete | Derived; approved/received state is shown with its source |
| Full history and explained gaps | Structured continuous history validator | Complete | Derived; no duplicate office checkbox |
| Two referee details | Official Application references | Complete as applicant evidence | Derived evidence, separate from office verification |
| References requested/received/reviewed | None | Missing | Two structured admin verification records |
| Telephone verification | None | Missing | Required independent-verification flag, verifier and date |
| Shortlisting record retained | Recruitment status only | Partial | Role-configured office verification control |
| Two-person interview record | Meet scheduling/notes only | Partial | Role-configured office verification control; full interview workflow deferred to Sprint 5 |
| Fitness declaration | No equivalent | Missing | Narrow fitness/suitability control with optional OH status; no diagnosis questionnaire |
| Right to Work chain | Application answer, document, flat staff field | Partial | Evidence, check and final verification are distinct |
| Enhanced DBS chain | Application answer, document, flat staff field | Partial | Request/evidence/check/outcome plus disclosure risk-assessment status |
| Registered Manager sign-off | None | Missing | Explicit database-enforced final clearance gate |
| Recent photograph | Persisted Profile Photo document | Complete | Derived from the real document and its review state |
| Job Description | Versioned JD acknowledgement | Complete | Derived from the current signed version |
| PAY 1A starter details | Sprint 3C starter form | Mostly complete | Added place/base, prior-SHC and related-person declarations, AKA and optional inclusive identity field |
| PAY 1B starter declarations | Sprint 3C PAYE/bank/next-of-kin | Mostly complete | Added course-completion date; payroll office fields remain separately scoped |
| Nurse NMC | Applicant data and flat staff field | Partial | Applicant information remains separate from office registration verification |
| Training | Flat aggregate status and documents | Partial | Supported as a role requirement; granular matrix deferred to Sprint 4C |

## Policy decisions not encoded as blockers

- The legacy “mandatory COVID vaccination passport” is not activated. Management/policy confirmation is required before any contemporary vaccination control is configured.
- Historical branch/home terminology needs SHC confirmation. The modern form uses “Place of work / base”.
- The archive’s binary gender wording is not reproduced. The field is optional and uses inclusive wording.
- No legal or clinical suitability decision is automated from a DBS disclosure or health/OH status.
- No historical paper-email routing or obsolete HR-manual instruction is recreated.

## Personnel checklist roadmap classification

| Classification | Archive controls |
|---|---|
| Sprint 4A | Application/history derivation; two references; RTW; DBS and disclosure review; fitness declaration/OH status; photo; JD/HR derivation; manager clearance |
| Sprint 4B | Evidence request/collection refinements and credential-document workflow enhancements that are outside this case engine |
| Sprint 4C | Care Certificate; Moving & Handling; Safeguarding Adults; Medication Administration/Management; Infection Prevention & Control; Basic Life Support; Fire Safety; Food Hygiene; Health & Safety; Dementia Awareness; Mental Capacity Act; qualification/certificate expiry matrix |
| Sprint 5 | Advertising evidence; shortlisting artefact; structured two-interviewer assessment; offer/decision workflow |
| Sprint 6 | Employee number; home/base ownership; weekly hours; salary point/rate; cost code; contract/variations; parental records; Pay 2/Pay 3; probation, supervision, appraisal, sickness/OH documents, disciplinary/grievance/file notes |
| Sprint 7 | Timesheet and operational deployment records |
| Policy / obsolete | COVID vaccination passport; old branch vocabulary; paper-only email/photocopy/stamp instructions; duplicated training label in the Carer Profile |

The training list above is evidence for Sprint 4C discovery, not a globally hardcoded Sprint 4A requirement set.
