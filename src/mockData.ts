import { Applicant, Staff, Document, Timesheet, RoleTemplate, ActivityLog, FamilyFeedback } from './types';

export const initialApplicants: Applicant[] = [
  {
    id: 'app_1',
    name: 'Eleanor Vance',
    email: 'e.vance@nhs.net',
    phone: '+44 7700 900077',
    position: 'Nurse',
    status: 'Applied',
    dateCreated: '2026-06-15',
    notes: 'Registered general nurse with 4 years NHS experience. Relocating to Manchester.'
  },
  {
    id: 'app_2',
    name: 'Marcus Brody',
    email: 'm.brody92@gmail.com',
    phone: '+44 7700 900143',
    position: 'Care Assistant',
    status: 'Screening',
    dateCreated: '2026-06-14',
    notes: 'Prior experience in home care, standard NVQ Level 2. Excellent references.'
  },
  {
    id: 'app_3',
    name: 'Aisha Rahman',
    email: 'aisha.r@stewardhealth.co.uk',
    phone: '+44 7700 900259',
    position: 'Senior Care Assistant',
    status: 'Interview',
    dateCreated: '2026-06-10',
    notes: 'NVQ Level 3 candidate. Passionate about elderly care. Standard interview scheduled.'
  },
  {
    id: 'app_4',
    name: 'Liam Neeson',
    email: 'liam.n@careco.org.uk',
    phone: '+44 7700 900482',
    position: 'Deputy Manager',
    status: 'Compliance',
    dateCreated: '2026-05-28',
    notes: 'Experienced care manager. Waiting for final DBS update and reference verification.'
  },
  {
    id: 'app_5',
    name: 'Olivia Colman',
    email: 'olivia.c@actorguild.co.uk',
    phone: '+44 7700 900615',
    position: 'Care Assistant',
    status: 'Active',
    dateCreated: '2026-05-20',
    notes: 'All induction modules completed. Moved to active staff roster.'
  },
  {
    id: 'app_6',
    name: 'David Tennant',
    email: 'tardis.doctor@mac.com',
    phone: '+44 7700 900888',
    position: 'Nurse',
    status: 'Rejected',
    dateCreated: '2026-06-01',
    notes: 'PIN verification failed due to registration lapse. Encouraged to reapply once reinstated.'
  }
];

export const initialStaff: Staff[] = [
  {
    id: 'staff_1',
    name: 'Blessing Gurure',
    email: 'clara.oswald@shc247.co.uk',
    phone: '+44 7700 955301',
    address: 'Flat 4B, Baker St, London NW1 6XE',
    role: 'Nurse',
    status: 'Active',
    nmcPin: '15E1234E',
    nmcExpiry: '2027-02-15',
    dbsStatus: 'Compliant',
    dbsNumber: '00156942031',
    dbsExpiry: '2028-09-10',
    rightToWork: 'Compliant',
    rightToWorkExpiry: '2029-05-20',
    trainingStatus: 'Compliant',
    trainingExpiry: '2027-04-12',
    joinedDate: '2025-03-10'
  },
  {
    id: 'staff_2',
    name: 'Sarah Jane Smith',
    email: 'sarah.jane@shc247.co.uk',
    phone: '+44 7700 900512',
    address: '13 Bannerman Road, Ealing, London W13 0AA',
    role: 'Senior Care Assistant',
    status: 'Active',
    dbsStatus: 'Expiring',
    dbsNumber: '00148593402',
    dbsExpiry: '2026-07-20', // Expiring within 35 days!
    rightToWork: 'Compliant',
    rightToWorkExpiry: '2028-01-15',
    trainingStatus: 'Compliant',
    trainingExpiry: '2026-11-20',
    joinedDate: '2024-08-15'
  },
  {
    id: 'staff_3',
    name: 'Robert Tyler',
    email: 'rob.tyler@shc247.co.uk',
    phone: '+44 7700 900941',
    address: '42 Powell Street, Cardiff CF10 1FG',
    role: 'Care Assistant',
    status: 'Non-Compliant',
    dbsStatus: 'Non-Compliant',
    dbsNumber: '00119283401',
    dbsExpiry: '2026-05-15', // Expired!
    rightToWork: 'Compliant',
    rightToWorkExpiry: '2029-04-03',
    trainingStatus: 'Non-Compliant', // Expired training too
    trainingExpiry: '2026-06-10',
    joinedDate: '2023-11-01'
  },
  {
    id: 'staff_4',
    name: 'Martha Jones',
    email: 'martha.jones@stub.nhs.uk',
    phone: '+44 7700 900762',
    address: '33 Royal Heights, Leeds LS1 4DY',
    role: 'Nurse',
    status: 'Active',
    nmcPin: '02F4321E',
    nmcExpiry: '2026-07-10', // NMC Expiring soon!
    dbsStatus: 'Compliant',
    dbsNumber: '00139485023',
    dbsExpiry: '2027-10-15',
    rightToWork: 'Compliant',
    rightToWorkExpiry: '2030-08-11',
    trainingStatus: 'Compliant',
    trainingExpiry: '2026-12-05',
    joinedDate: '2025-01-20'
  },
  {
    id: 'staff_5',
    name: 'Jack Harkness',
    email: 'j.harkness@shc247.co.uk',
    phone: '+44 7700 900609',
    address: 'The Hub, Cardiff Bay, CF10 4FF',
    role: 'Deputy Manager',
    status: 'Active',
    dbsStatus: 'Compliant',
    dbsNumber: '00122938461',
    dbsExpiry: '2029-01-30',
    rightToWork: 'Compliant',
    rightToWorkExpiry: '2029-01-30',
    trainingStatus: 'Compliant',
    trainingExpiry: '2027-02-28',
    joinedDate: '2024-05-01'
  },
  {
    id: 'staff_6',
    name: 'Donna Noble',
    email: 'donna.n@shc247.co.uk',
    phone: '+44 7700 904321',
    address: '22 Chiswick High Rd, London W4 1PP',
    role: 'Care Assistant',
    status: 'Active',
    dbsStatus: 'Compliant',
    dbsNumber: '00159493821',
    dbsExpiry: '2028-04-11',
    rightToWork: 'Expiring', // Right to work expiring soon
    rightToWorkExpiry: '2026-08-01',
    trainingStatus: 'Expiring',
    trainingExpiry: '2026-07-14',
    joinedDate: '2025-09-12'
  }
];

export const initialDocuments: Document[] = [
  {
    id: 'doc_1',
    name: 'Blessing_Oswald_Passport.pdf',
    category: 'Passport',
    staffId: 'staff_1',
    staffName: 'Blessing Gurure',
    uploadDate: '2025-03-09',
    expiryDate: '2029-05-20',
    status: 'Approved',
    size: '1.8 MB'
  },
  {
    id: 'doc_2',
    name: 'Blessing_Oswald_DBS_Certificate.pdf',
    category: 'DBS',
    staffId: 'staff_1',
    staffName: 'Blessing Gurure',
    uploadDate: '2025-03-09',
    expiryDate: '2028-09-10',
    status: 'Approved',
    size: '2.4 MB'
  },
  {
    id: 'doc_3',
    name: 'Sarah_Jane_DBS_Renewal_Draft.pdf',
    category: 'DBS',
    staffId: 'staff_2',
    staffName: 'Sarah Jane Smith',
    uploadDate: '2026-06-17',
    expiryDate: '2029-06-17',
    status: 'Awaiting Review',
    size: '1.2 MB'
  },
  {
    id: 'doc_4',
    name: 'Donna_Noble_Utility_Bill.pdf',
    category: 'Utility Bill',
    staffId: 'staff_6',
    staffName: 'Donna Noble',
    uploadDate: '2026-06-18',
    status: 'Awaiting Review',
    size: '950 KB'
  },
  {
    id: 'doc_5',
    name: 'Martha_Jones_NMC_Card.pdf',
    category: 'Right To Work',
    staffId: 'staff_4',
    staffName: 'Martha Jones',
    uploadDate: '2025-01-19',
    expiryDate: '2026-07-10',
    status: 'Approved',
    size: '1.4 MB'
  },
  // Assigned documents requiring E-Signature
  {
    id: 'doc_assigned_1',
    name: 'SHC_Employment_Contract_2026.pdf',
    category: 'Employment Contract',
    staffId: 'staff_1',
    staffName: 'Blessing Gurure',
    uploadDate: '2026-06-15',
    status: 'Pending Signature',
    assignedByAdmin: true,
    size: '420 KB'
  },
  {
    id: 'doc_assigned_2',
    name: 'Job_Description_Registered_Nurse.pdf',
    category: 'Job Description',
    staffId: 'staff_1',
    staffName: 'Blessing Gurure',
    uploadDate: '2026-06-15',
    status: 'Signed',
    assignedByAdmin: true,
    size: '310 KB'
  },
  {
    id: 'doc_assigned_3',
    name: 'SHC_Staff_Handbook_Acknowledgement.pdf',
    category: 'Staff Handbook',
    staffId: 'staff_2',
    staffName: 'Sarah Jane Smith',
    uploadDate: '2026-06-10',
    status: 'Pending Signature',
    assignedByAdmin: true,
    size: '1.5 MB'
  }
];

export const initialTimesheets: Timesheet[] = [
  {
    id: 'time_1',
    staffName: 'Blessing Gurure',
    role: 'Nurse',
    weekEnding: '2026-06-14',
    uploadDate: '2026-06-15',
    approvalStatus: 'Approved',
    hoursWorked: 37.5,
    fileUrl: 'timesheet_clara_14_06.pdf'
  },
  {
    id: 'time_2',
    staffName: 'Sarah Jane Smith',
    role: 'Senior Care Assistant',
    weekEnding: '2026-06-14',
    uploadDate: '2026-06-15',
    approvalStatus: 'Pending',
    hoursWorked: 42.0,
    fileUrl: 'timesheet_sjsmith_14_06.pdf'
  },
  {
    id: 'time_3',
    staffName: 'Donna Noble',
    role: 'Care Assistant',
    weekEnding: '2026-06-14',
    uploadDate: '2026-06-16',
    approvalStatus: 'Pending',
    hoursWorked: 24.5,
    fileUrl: 'timesheet_dnoble_14_06.pdf'
  }
];

export const initialRoleTemplates: RoleTemplate[] = [
  {
    role: 'Nurse',
    salaryRange: '£32.00 - £45.00 / hour',
    description: 'Responsible for administering medication, assessing patient conditions, maintaining clinical logs, and supervising care teams in nursing environments.',
    responsibilities: [
      'Administer prescription medications and perform wound care.',
      'Document comprehensive clinical histories and care plans.',
      'Lead and mentor Care Assistants and Support Workers during shifts.',
      'Coordinate with GPs, medical leads, and family members concerning patient status.'
    ],
    requiredCredentials: [
      'Active NMC Registration Sub-Part 1',
      'Enhanced DBS (on the Update Service)',
      'Valid Right to Work in the UK',
      'Level 3 Safeguarding Adults & Children'
    ]
  },
  {
    role: 'Care Assistant',
    salaryRange: '£14.50 - £18.00 / hour',
    description: 'Provides daily living support, emotional accompaniment, mobility care, and general personal care in nursing homes and supported living structures.',
    responsibilities: [
      'Assist residents with personal hygiene, washing, and dressing.',
      'Support mobility transfers employing active hoists or sliders safely.',
      'Facilitate nutritional intake and engage patients with physical/mental activities.',
      'Report any health or behavioral alterations quickly to the Senior on duty.'
    ],
    requiredCredentials: [
      'Enhanced Adult & Child DBS Check',
      'Right to Work verification',
      'Core Care Certificate or NVQ level 2',
      'Manual Handling and Basic Life Support training'
    ]
  },
  {
    role: 'Senior Care Assistant',
    salaryRange: '£18.50 - £23.00 / hour',
    description: 'Senior lead managing duty rotas, medication administration audits, and general personal care guidance for junior assistants.',
    responsibilities: [
      'Supervise on-duty care assistant staff and organize mealtime/hygiene flows.',
      'Administer MAR chart medication under leadership verification.',
      'Draft daily logs, incident reports, and update key risk management assessments.',
      'Support managers with clinical onboarding and safety procedure checks.'
    ],
    requiredCredentials: [
      'NVQ/QCF Level 3 in Health & Social Care',
      'Enhanced DBS check on Update Service',
      'Medication Administration competency certificate',
      'First Aid & Fire Marshal Certifications'
    ]
  },
  {
    role: 'Deputy Manager',
    salaryRange: '£26.00 - £35.00 / hour',
    description: 'Assistant clinical or home manager overseeing duty assignments, compliance logs, regulatory files (CQC prep) and client invoicing coordination.',
    responsibilities: [
      'Support home manager with daily staff scheduling and CQC standard preps.',
      'Review incident logs and audit clinical training update timelines.',
      'Liaise directly with local councils, CCGs, and corporate agency contacts.',
      'Draft performance appraisals and host disciplinary reviews when appropriate.'
    ],
    requiredCredentials: [
      'NVQ Level 4/5 in Leadership and Management',
      'Active NMC PIN preferred but not essential',
      'Enhanced DBS with barring checklist search',
      'Right to Work in the UK with continuous validity'
    ]
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'act_1',
    action: 'New applicant Eleanor Vance registered online',
    timestamp: '2 hours ago',
    user: 'System Bot',
    type: 'applicant'
  },
  {
    id: 'act_2',
    action: 'DBS Certificate draft uploaded by Sarah Jane Smith',
    timestamp: '4 hours ago',
    user: 'Sarah Jane Smith',
    type: 'document'
  },
  {
    id: 'act_3',
    action: 'Compliance audit: Donna Noble marked Expiring (Training)',
    timestamp: '1 day ago',
    user: 'Automated Shield',
    type: 'compliance'
  },
  {
    id: 'act_4',
    action: 'Registered General Nurse Blessing Gurure approved for Active shift roster',
    timestamp: '1 day ago',
    user: 'Agency Admin (Blessing)',
    type: 'status'
  },
  {
    id: 'act_5',
    action: 'Job Description signed electronically by Blessing Gurure',
    timestamp: '2 days ago',
    user: 'Blessing Gurure',
    type: 'document'
  },
  {
    id: 'act_6',
    action: 'Staff Timesheet submitted for week ending 2026-06-14',
    timestamp: '3 days ago',
    user: 'Donna Noble',
    type: 'timesheet'
  }
];

export const initialFamilyFeedbacks: FamilyFeedback[] = [
  {
    id: 'fb_1',
    clientName: 'Arthur Vance',
    familyRepresentative: 'Eleanor Vance',
    relation: 'Daughter',
    caregiverAssigned: 'Blessing Gurure',
    ratingCareQuality: 5,
    ratingCommunication: 5,
    ratingPunctuality: 5,
    feedbackComments: "Carer Blessing Gurure has been an absolute godsend for my father Arthur. Her clinical expertise and warm attitude have completely transformed his day-to-day spirit. She arrives exactly on time with a warm cheer!",
    anonymous: false,
    dateSubmitted: '2026-06-18T09:30:00Z',
    status: 'Awaiting Action',
    category: 'Compliment',
    hasContactRequest: false
  },
  {
    id: 'fb_2',
    clientName: 'Margaret Rutherford',
    familyRepresentative: 'Giles Rutherford',
    relation: 'Son',
    caregiverAssigned: 'Sarah Jane Smith',
    ratingCareQuality: 4,
    ratingCommunication: 5,
    ratingPunctuality: 4,
    feedbackComments: 'We are very happy with the care from Sarah Jane. She is very professional and keeps us fully updated on medications. Our only suggestion is to verify if we can receive the shift summary reports via email rather than just paper copies.',
    anonymous: false,
    dateSubmitted: '2026-06-17T11:15:00Z',
    status: 'Reviewed',
    category: 'Suggestion',
    hasContactRequest: false
  },
  {
    id: 'fb_3',
    clientName: 'William Noble',
    familyRepresentative: 'Donna Noble',
    relation: 'Granddaughter',
    caregiverAssigned: 'Robert Tyler',
    ratingCareQuality: 3,
    ratingCommunication: 2,
    ratingPunctuality: 4,
    feedbackComments: "The actual hands-on support is decent, but communication could be improved. We did not receive updates on the last shift notes and the caregiver was a bit rushed. Please give us a callback to align on the monthly scheduler.",
    anonymous: false,
    dateSubmitted: '2026-06-16T15:45:00Z',
    status: 'Awaiting Action',
    category: 'Concern',
    hasContactRequest: true,
    contactEmailOrPhone: 'donna.noble@shcgmail.co.uk'
  }
];

