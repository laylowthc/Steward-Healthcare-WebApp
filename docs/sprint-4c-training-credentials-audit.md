# Sprint 4C training and credentials source audit

This audit records historical SHC evidence only. It contains no applicant or employee data.

## Files reviewed

- Personnel Checklist
- SHC Pre-employment Checklist
- SHC Nurse Profile Template
- SHC Carer Profile
- Healthcare Assistant / Support Worker Job Description
- Supervision Record
- Application for Employment variants
- SHC Business Plan

## Authoritative controls found

| Source | Historical control | Sprint 4C treatment |
| --- | --- | --- |
| Personnel Checklist | Induction training documents | Configured per role, required for personnel-file completeness, not deployment-blocking by default |
| Personnel Checklist | Care Certificate | Configured per role, required for personnel-file completeness, not deployment-blocking by default |
| Personnel Checklist | Qualifications | Optional credential with evidence; SHC confirmation required before making mandatory |
| Personnel Checklist | Other training certificates | Represented by administrator-configurable role requirements |
| Nurse Profile | Mandatory training | Individual records replace the coarse summary; no validity period inferred |
| Nurse Profile | NMC registration and expiry | Reuses Sprint 4A NMC verification; no duplicate source of truth |
| Healthcare Assistant Job Description | Medication tasks only after appropriate training | Medication training candidate; SHC confirmation required |
| Healthcare Assistant Job Description | Fire safety, infection control, health and safety, safeguarding | Candidate role requirements; SHC confirmation required |
| Healthcare Assistant Job Description | Attend mandatory training and ongoing development | Supports a role-configured register, not a fixed hardcoded curriculum |
| Supervision Record | Training and development discussion | Deferred to Sprint 6 supervision workflow; not duplicated here |
| SHC service/role material | Moving and handling, dementia care | Candidate requirements; SHC confirmation required |

## SHC confirmation required

SHC must confirm which roles require each candidate course, whether it is mandatory, whether evidence is required, whether expiry applies, and whether absence/expiry blocks deployment. No validity period is inferred from historical paperwork.

Candidate controls prepared for configuration are Moving & Handling, Safeguarding Adults, Medication Administration / Management, Infection Prevention & Control, Basic Life Support, Fire Safety, Health & Safety, Dementia Awareness and Mental Capacity Act.

## Deliberate exclusions

- No course content, lessons, quizzes or LMS functions.
- No automatic renewal workflow.
- No invented expiry duration.
- No duplicate NMC record.
- No migration of legacy aggregate `staff_profiles.training_status` into fabricated individual achievements.
