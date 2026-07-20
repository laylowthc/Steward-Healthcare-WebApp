import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, Award, PenTool, Check, FileText, X, Download, Printer, Lock, 
  User, CreditCard, BookOpen, AlertCircle, Undo, CheckSquare, Plus, 
  Trash2, Clock, ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react';
import { Document, Staff } from '../types';

interface InteractiveDocumentFillerProps {
  document: Document;
  staffMember: Staff;
  readOnly?: boolean;
  onClose: () => void;
  onSaveSignature: (filledData: Record<string, any>) => void;
}

export default function InteractiveDocumentFiller({
  document,
  staffMember,
  readOnly = false,
  onClose,
  onSaveSignature
}: InteractiveDocumentFillerProps) {
  const isPreviouslySigned = document.status === 'Signed' || readOnly;
  
  // State variables for form fields depending on document category
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (document.filledData) {
      return document.filledData;
    }
    // Set default empty templates
    return {
      // General Identity
      fullname: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      address: staffMember.address,
      role: staffMember.role || 'Healthcare Assistant',
      designation: staffMember.role || 'Healthcare Assistant / Support Worker',
      branch: 'Hertfordshire Care Hub',
      title: 'Mr',
      alsoKnownAs: '',
      niNumber: '',
      birthDate: '',
      gender: 'Male',
      contractType: 'Permanent',

      // Signoff parameters
      signDate: new Date().toISOString().split('T')[0],
      signatureType: 'draw', // 'draw' | 'type'
      typedSignatureName: staffMember.name,
      typedSignatureFont: 'font-serif italic text-purple-900',
      clinicalComplianceSworn: false,

      // APPENDIX D / New Starter Information
      appD_relatedToEmployee: 'No',
      appD_relatedDetails: '',
      appD_workedPreviously: 'No',
      appD_previousDetails: '',
      appD_hrLegalityCheck: true,
      appD_hrPrevEmployment: true,
      appD_hrConditionalSent: true,
      appD_hrAllEntered: true,
      appD_hrCovidVaccine: true,

      // PAY 1 B details
      payB_bankName: '',
      payB_accountHolderName: staffMember.name,
      payB_branchAddress: '',
      payB_sortCode: '',
      payB_accountNumber: '',
      payB_buildingSocietyNo: '',
      payB_taxStatement: 'Statement_A', // Statement_A | Statement_B | Statement_C
      payB_studentLoanFlag: 'No',
      payB_studentLoanDirect: 'No',
      payB_studentLoanPlan: 'Plan 1',
      payB_studiesEndDate: '',
      payB_emergencyName: '',
      payB_emergencyRelation: '',
      payB_emergencyAddress: '',
      payB_emergencyPhone: '',
      payB_emergencyMobile: '',
      payB_kinName: '',
      payB_kinRelation: '',
      payB_kinAddress: '',
      payB_kinPhone: '',
      payB_kinMobile: '',
      payB_ethnicOrigin: 'White: British',
      payB_registeredDisabled: 'No',

      // EMPLOYMENT CONTRACT
      contract_probationMonths: '3',
      contract_hoursPerWeek: '37.5',
      contract_startTime: '08:00',
      contract_endTime: '20:00',
      contract_hourlyRate: '16.50',
      contract_holidayDays: '28',
      contract_witnessName: '',
      contract_witnessSignature: '',
      contract_witnessDate: '',

      // WEEKLY TIMESHEET
      timesheet_workerRef: 'SHC-' + staffMember.id.split('_')[1]?.toUpperCase() || 'SHC-RN04',
      timesheet_clientName: 'Steward Care Home Division',
      timesheet_clientRef: 'STW-HERTS',
      timesheet_siteLocation: 'Letchworth Care Center',
      timesheet_postcode: 'SG6 1GJ',
      timesheet_weekEnding: '',
      timesheet_shifts: [
        { day: 'Mon', date: '', type: 'AM', start: '08:00', end: '20:00', breakHrs: '1.0', total: 11, clientSign: true },
        { day: 'Tue', date: '', type: 'PM', start: '08:05', end: '20:05', breakHrs: '1.0', total: 11, clientSign: true },
        { day: 'Wed', date: '', type: 'Night', start: '20:00', end: '08:00', breakHrs: '1.0', total: 11, clientSign: true },
        { day: 'Thu', date: '', type: 'None', start: '', end: '', breakHrs: '0', total: 0, clientSign: false },
        { day: 'Fri', date: '', type: 'None', start: '', end: '', breakHrs: '0', total: 0, clientSign: false },
        { day: 'Sat', date: '', type: 'None', start: '', end: '', breakHrs: '0', total: 0, clientSign: false },
        { day: 'Sun', date: '', type: 'None', start: '', end: '', breakHrs: '0', total: 0, clientSign: false },
      ],
      timesheet_expenses: [
        { date: '', type: 'Mileage', desc: 'Hertfordshire Patient Community Travel', qty: '50 miles', cost: '0.45', total: 22.50 }
      ],
      timesheet_clientAuthoriser: 'Manager/Authoriser',

      // SUPERVISION RECORD
      supervision_actions: [
        { discussion: 'Medication administration compliance audits.', actions: 'To read and re-confirm the MAR sheet training checklist in Appendix E.', target: 'Next shift check' },
        { discussion: 'CQC Care logs real-time updates feedback.', actions: 'To update the Care Coordination digital platform immediately following patient visits.', target: 'Ongoing' }
      ],

      // JOB DESCRIPTION checklist responses
      dutiesAccepted: [] as string[],

      // APPLICATION FOR EMPLOYMENT
      app_eligibleUK: 'Yes',
      app_recentEmployer: 'Greenfield Nursing Center',
      app_recentRole: 'Senior Support Worker',
      app_recentDates: 'June 2023 - Present',
      app_recentSalary: '£29,500',
      app_recentNotice: '4 weeks',
      app_recentLeaveReason: 'Seeking career expansion inside Steward Health Care platform',
      app_recentDuties: 'Delivering person-centered primary care, administering prescribed pharmaceutical compounds, managing shifts rosters',
      app_prevHistory: [
        { from: '2021', to: '2023', employer: 'Apex Healthcare Limited', role: 'Support Worker & Care Assistant' }
      ],
      app_referee1Name: 'Dr. Arthur Pendelton',
      app_referee1Role: 'Clinical Director',
      app_referee1Org: 'NHS Trust Herts',
      app_referee1Email: 'a.pendelton@nhs-herts.net',
      app_referee1Tel: '01462 888771',
      app_referee2Name: 'Clara Oswald',
      app_referee2Role: 'Senior Care Coordinator',
      app_referee2Org: 'Greenfield Nursing Center',
      app_referee2Email: 'c.oswald@greenfieldhcare.org',
      app_referee2Tel: '07722100455',
      app_educationHistory: [
        { year: '2021', institution: 'University of Hertfordshire', course: 'BSc Adult Nursing (Hons)', result: 'First Class' }
      ],
      app_hasConvictions: 'No',
      app_convictionDetails: '',
      app_personalStatement: 'A highly compassionate, dedicated caregiver registered nurse and support specialist. I endeavor to maintain absolute safety standards, respect service users dignity, and uphold regulatory guidelines as enforced by the Care Quality Commission.',
      app_genderIdentification: 'Female',
      app_ageBand: '22-40',

      // PERSONNEL CHECKLIST
      chkListItems: {
        'Application form': { init: 'BG', date: '21/04/2025', comments: 'Fully compiled' },
        'Interview paperwork': { init: 'BG', date: '22/04/2025', comments: 'Grade C Pass' },
        'Reference 1': { init: 'BG', date: '24/04/2025', comments: 'Satisfactory verified' },
        'Reference 2': { init: 'BG', date: '24/04/2025', comments: 'Satisfactory verified' },
        'Fitness Certificate': { init: 'BG', date: '25/04/2025', comments: 'Medically Clear' },
        'Legality to work documents': { init: 'BG', date: '21/04/2025', comments: 'Biometric Card & Passport' },
        'Record of DBS certificate': { init: 'BG', date: '21/04/2025', comments: 'No matches found' },
        'Pay 1 B': { init: 'BG', date: '', comments: 'Needs signature' },
        'Recent Photograph': { init: 'BG', date: '21/04/2025', comments: 'Digital snapshot attached' }
      }
    };
  });

  const [activeTab, setActiveTab] = useState<number>(1); // For paging multi-sheet documents (Contract, Application)
  const [discussionInput, setDiscussionInput] = useState({ discussion: '', actions: '', target: '' });

  // Duties items for Job Description
  const documentDuties = document.category === 'Job Description' && staffMember.role?.toLowerCase().includes('coordinator') ? [
    { id: 'duty_1', label: 'To conduct initial and ongoing assessments of service users\' needs, contributing to development/review of individualized care plans.' },
    { id: 'duty_2', label: 'To plan, coordinate, and manage rotas for healthcare assistants/support workers, matching staff skills to service user requirements.' },
    { id: 'duty_3', label: 'To ensure all care visits are completed on time and to the required standard, taking immediate corrective actions for any gaps.' },
    { id: 'duty_4', label: 'To act as the main point of contact for service users, families, and external agencies (GPs, social workers, district nurses).' },
    { id: 'duty_5', label: 'To monitor service user wellbeing and staff performance, documenting and reporting any changes or safeguarding concerns to the Manager.' },
    { id: 'duty_6', label: 'To assist with medication audits, risk assessments, and compliance quality assurance checks in accordance with CQC policy.' },
    { id: 'duty_7', label: 'To participate in the on-call rota to provide out-of-hours support and problem-solving for care staff and service users.' },
    { id: 'duty_8', label: 'To maintain accurate, legible, and up-to-date records, including care plans, visit logs, handover notes, and staff communications.' },
    { id: 'duty_9', label: 'To ensure all services are delivered in accordance with Steward Health Care guidelines of Quality Assurance and continuous improvement.' },
    { id: 'duty_10', label: 'To support the induction, supervision, and ongoing training of care staff, ensuring they are competent in their roles.' }
  ] : [
    { id: 'duty_1', label: 'To assist in the provision of personal, physical, social and emotional care and support promoting independence and respecting dignity.' },
    { id: 'duty_2', label: 'To ensure that at all times the privacy, dignity, and confidentiality of all service users is carefully maintained.' },
    { id: 'duty_3', label: 'To advise, assist with, or perform personal care duties including washing, bathing, showering, oral/dental care, shaving, dressing.' },
    { id: 'duty_4', label: 'To observe, monitor and report on the condition of service users, noting and reporting any changes to the Care Co-ordinator / Manager.' },
    { id: 'duty_5', label: 'To assist with preparation and serving of meals and drinks, taking into account dietary requirements and cultural preferences.' },
    { id: 'duty_6', label: 'To collect prescriptions and assist with administration of medication strictly in accordance with Steward Medication Policy.' },
    { id: 'duty_7', label: 'To assist with household tasks such as bed making, tidying, dusting, polishing, cleaning bathrooms and doing laundry.' },
    { id: 'duty_8', label: 'To accompany service users on outings and social activities, and provide companionship/emotional support with extreme benevolence.' },
    { id: 'duty_9', label: 'To maintain accurate records and documentation as required by Steward Health Care, including daily logs, plan updates, and incident logs.' },
    { id: 'duty_10', label: 'To comply fully with all health and safety regulations and legislation, including COSHH, fire safety, and infection control procedures.' }
  ];

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureImage, setSignatureImage] = useState<string | null>(formData.signatureImage || null);

  // Initialize Canvas
  useEffect(() => {
    if (canvasRef.current && !isPreviouslySigned && formData.signatureType === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#310d59'; // royal purple ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [formData.signatureType, isPreviouslySigned]);

  // Clean timesheet total hours computation
  const computeShiftHours = (start: string, end: string, breakHrs: string): number => {
    if (!start || !end) return 0;
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins < 0) diffMins += 24 * 60; // Over-night shift
      const breakMins = parseFloat(breakHrs || '0') * 60;
      const netMins = Math.max(0, diffMins - breakMins);
      return Math.round((netMins / 60) * 100) / 100;
    } catch {
      return 0;
    }
  };

  const handleShiftChange = (idx: number, field: string, val: string) => {
    const updatedShifts = [...formData.timesheet_shifts];
    updatedShifts[idx] = { ...updatedShifts[idx], [field]: val };
    
    // Auto recalculate row total
    const row = updatedShifts[idx];
    if (row.type !== 'None') {
      row.total = computeShiftHours(row.start, row.end, row.breakHrs);
      row.clientSign = true;
    } else {
      row.total = 0;
      row.clientSign = false;
    }

    handleInputChange('timesheet_shifts', updatedShifts);
  };

  const addSupervisionRow = () => {
    if (!discussionInput.discussion) return;
    const newList = [...formData.supervision_actions, discussionInput];
    handleInputChange('supervision_actions', newList);
    setDiscussionInput({ discussion: '', actions: '', target: '' });
  };

  const removeSupervisionRow = (idx: number) => {
    const newList = formData.supervision_actions.filter((_: any, i: number) => i !== idx);
    handleInputChange('supervision_actions', newList);
  };

  // Handle Canvas Drawing events
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isPreviouslySigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    setIsDrawing(true);
    const pos = getEventPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isPreviouslySigned) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault();
    const pos = getEventPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current && hasDrawn) {
      const imgUrl = canvasRef.current.toDataURL('image/png');
      setSignatureImage(imgUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureImage(null);
  };

  const getEventPos = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleInputChange = (field: string, val: any) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleDutyToggle = (dutyId: string) => {
    const activeDuties = formData.dutiesAccepted || [];
    if (activeDuties.includes(dutyId)) {
      handleInputChange('dutiesAccepted', activeDuties.filter((d: string) => d !== dutyId));
    } else {
      handleInputChange('dutiesAccepted', [...activeDuties, dutyId]);
    }
  };

  const handleChkListChange = (itemKey: string, field: string, value: string) => {
    const current = { ...formData.chkListItems };
    current[itemKey] = { ...current[itemKey], [field]: value };
    handleInputChange('chkListItems', current);
  };

  const handleSubmitSignature = (e: React.FormEvent) => {
    e.preventDefault();

    // Specific field validations to ensure legal binding and prevent accidental empty submittals
    if (document.category === 'Employment Contract' || document.category.toLowerCase().includes('contract')) {
      if (!formData.niNumber) {
        alert('National Insurance number is highly mandatory for HMRC payroll registration.');
        return;
      }
    }

    if (document.category === 'Job Description' || document.category.toLowerCase().includes('description')) {
      const activeDuties = formData.dutiesAccepted || [];
      if (activeDuties.length < documentDuties.length / 2) {
        alert(`Please read and acknowledge at least 5 of the key clinical duties listed inside your ${staffMember.role} Job Description scope.`);
        return;
      }
    }

    if (!formData.clinicalComplianceSworn) {
      alert('You must check the CQC & HMRC registration sworn compliance declaration box on the bottom of the page to apply stamp.');
      return;
    }

    // Capture final signature details
    const finalData = {
      ...formData,
      signatureImage: formData.signatureType === 'draw' ? signatureImage : null,
      submittedAt: new Date().toISOString()
    };

    onSaveSignature(finalData);
  };

  const downloadPrintFriendly = () => {
    window.print();
  };

  // Determine standard file categories mapping for UI themes
  const getSubTitleText = () => {
    if (document.category.toLowerCase().includes('contract')) return 'Employment Agreement & Statement of Main Terms';
    if (document.category.toLowerCase().includes('timesheet')) return 'Weekly Timesheet & Care Service Disbursal';
    if (document.category.toLowerCase().includes('supervision')) return 'Supervision and Care Audit Record Log';
    if (document.category.toLowerCase().includes('starter') || document.category.toLowerCase().includes('append')) return 'APPENDIX D — New Starter Demographic Sheet';
    if (document.category.toLowerCase().includes('pay 1 b') || document.category.toLowerCase().includes('pay1b')) return 'PAY 1 B — Income Tax & Bank Account Declaration';
    if (document.category.toLowerCase().includes('checklist')) return 'Compliance Checklist and Personnel Records Audit';
    if (document.category.toLowerCase().includes('interview')) return 'Structured Competency Interview Assessment Profile';
    if (document.category.toLowerCase().includes('description')) return 'CQC Care-Service Core Job Description Scope';
    if (document.category.toLowerCase().includes('application')) return 'Application for Employment & Background Dossier';
    return 'CQC Standards Clinical Conformity Policy';
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1e1135]/75 backdrop-blur-md overflow-y-auto flex items-center justify-center p-2 md:p-6 font-sans">
      <div className="bg-[#fbfcff] w-full max-w-5xl rounded-2xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col max-h-[96vh] animate-fade-in relative">
        
        {/* UPPER TOOLBAR */}
        <div className="bg-white border-b border-purple-100 p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-900 text-white rounded-xl">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase flex flex-wrap items-center gap-2 leading-tight">
                <span>{document.category}</span>
                <span className={`text-[10px] p-0.5 px-2.5 rounded-full border font-black tracking-wider ${
                  isPreviouslySigned ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-rose-50 text-rose-800 border-rose-250 animate-pulse'
                }`}>
                  {isPreviouslySigned ? '✓ Archived Electronic Specimen' : '✏️ Awaiting Registrant Pen'}
                </span>
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-1 font-semibold leading-none">
                Assignee: <span className="font-extrabold text-slate-700">{staffMember.name}</span> ({staffMember.role})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadPrintFriendly}
              className="p-1 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-705 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-sm"
              title="Prints standard compliance hardcopy"
            >
              <Printer className="w-3.5 h-3.5 text-purple-900" />
              <span>Full Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-105 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* COMPLIANCE CORE PAPER SHEETS WRAPPER */}
        <div className="overflow-y-auto p-4 md:p-8 flex-1 print:p-0 bg-slate-900/10">
          <div className="max-w-4xl mx-auto bg-white p-4 md:p-10 border-4 border-double border-purple-950 rounded shadow-lg relative print:shadow-none print:border-none">
            
            {/* OFFICIAL REGULATORY CQC WATERMARK BADGES */}
            <div className="absolute right-6 top-6 opacity-[0.09] flex flex-col items-center border-2 border-purple-900 p-2 text-[9px] font-black uppercase text-purple-950 font-serif tracking-widest select-none pointer-events-none text-center">
              <Award className="w-8 h-8 text-purple-900 mb-1" />
              <span>STEWARD HEALTH</span>
              <span>247 Professionals</span>
              <span>REGULATED CO.</span>
            </div>

            {/* BRAND HEADER STATIONARY */}
            <div className="text-center border-b-2 border-purple-900 pb-5 mb-6">
              <div className="inline-flex items-center space-x-2.5 text-purple-950 font-serif mb-1 font-black tracking-widest">
                {/* S2 logo symbol emulation redrawn with simple tailwind */}
                <div className="w-9 h-9 rounded-full bg-purple-900 text-white flex items-center justify-center font-bold tracking-tighter text-base border-2 border-white font-sans shadow-md">
                  S2
                </div>
                <div className="text-left">
                  <h1 className="text-lg font-black leading-none text-purple-950">Steward Health Care</h1>
                  <h2 className="text-[12px] font-extrabold tracking-widest text-[#a21caf] leading-none mt-1">247 Professionals</h2>
                </div>
              </div>
              <p className="text-[10px] text-slate-505 font-mono uppercase tracking-wide mt-1.5 font-bold">Redefining Care — National Clinical Staffing Portal</p>
              <p className="text-[9px] text-slate-400 font-mono mt-1">Devonshire Business Centre, Letchworth Garden City • CQC Registered Provider • manager@stewardhealthcare.co.uk</p>
              
              <div className="mt-4 bg-[#310d59] p-2 text-white font-black text-xs uppercase tracking-wider rounded">
                {getSubTitleText()}
              </div>
            </div>

            <form onSubmit={handleSubmitSignature} className="space-y-6 text-xs text-slate-800">
              
              {/* DOCUMENT GENERAL DISCLOSURE LEGAL FRAMEWORK */}
              <div className="bg-purple-50/50 p-2.5 rounded-lg border-l-4 border-[#310d59] flex items-start gap-2 text-[10.5px]">
                <Shield className="w-4 h-4 text-purple-900 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-sans text-slate-655">
                  <span className="font-extrabold text-purple-950">clinical compliance notice:</span> This electronic onboarding instrument is audited directly under standard <span className="font-semibold text-slate-800">Care Quality Commission (Hertfordshire County Registry)</span> audit files and the Health and Social Care Act 2014. By appending your secure verified signature signature block, you declare this information is legal, authentic, and subject to direct compliance checks.
                </p>
              </div>

              {/* DYNAMIC FORMS ACCORDING TO USER'S INDIVIDUAL SCREENSHOT ATTACHMENTS */}

              {/* ----------------- FORM 1: APPENDIX D — NEW STARTER INFORMATION ----------------- */}
              {(document.category.toLowerCase().includes('append') || document.category.toLowerCase().includes('new starter info') || document.category.toLowerCase().includes('appendix d')) && (
                <div className="space-y-4">
                  <div className="bg-[#faf8fd] p-4 border border-purple-200 rounded-xl space-y-4 font-sans text-[11px]">
                    <h3 className="font-extrabold text-xs text-[#310d59] border-b pb-1 flex items-center uppercase">
                      <User className="w-4 h-4 mr-1 text-[#310d59]" /> 1. Candidate Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Place of Work (Branch)</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.branch}
                          onChange={(e) => handleInputChange('branch', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Title (Mr / Mrs / Miss / Ms / Other)</label>
                        <select
                          disabled={isPreviouslySigned}
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          className="mt-1 block w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="Mr">Mr</option>
                          <option value="Mrs">Mrs</option>
                          <option value="Miss">Miss</option>
                          <option value="Ms">Ms</option>
                          <option value="Dr">Dr</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Also Known As</label>
                        <input
                          type="text"
                          disabled={isPreviouslySigned}
                          placeholder="e.g. Nickname"
                          value={formData.alsoKnownAs}
                          onChange={(e) => handleInputChange('alsoKnownAs', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">First Name</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.fullname.split(' ')[0]}
                          onChange={(e) => handleInputChange('fullname', e.target.value + ' ' + (formData.fullname.split(' ')[1] || ''))}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white font-extrabold text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Surname</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.fullname.split(' ').slice(1).join(' ')}
                          onChange={(e) => handleInputChange('fullname', (formData.fullname.split(' ')[0] || '') + ' ' + e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white font-extrabold text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[9px]">Full Postal Address</label>
                      <input
                        type="text"
                        required
                        disabled={isPreviouslySigned}
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Mobile Phone No.</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Email Address</label>
                        <input
                          type="email"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">National Insurance (NI) Number</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          placeholder="e.g. QQ123456A"
                          maxLength={11}
                          value={formData.niNumber}
                          onChange={(e) => handleInputChange('niNumber', e.target.value.toUpperCase())}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono uppercase font-black"
                        />
                      </div>
                    </div>

                    <h3 className="font-extrabold text-[#310d59] text-xs pt-2 border-t uppercase flex items-center">
                      <CreditCard className="w-4 h-4 mr-1 text-[#310d59]" /> 2. Employment Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Role Applied For</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Contract Type</label>
                        <select
                          disabled={isPreviouslySigned}
                          value={formData.contractType}
                          onChange={(e) => handleInputChange('contractType', e.target.value)}
                          className="mt-1 block w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                        >
                          <option value="Quantum Flexi">Quantum Flexi</option>
                          <option value="Permanent">Permanent</option>
                          <option value="Fixed Term (Temporary)">Fixed Term (Temporary)</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Date of Birth</label>
                        <input
                          type="date"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.birthDate}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          className="mt-1 block w-full p-1.5 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                    </div>

                    <h3 className="font-extrabold text-[#310d59] text-xs pt-2 border-t uppercase">3. Declarations</h3>
                    <div className="space-y-2">
                      <div className="bg-white p-3 border rounded-xl space-y-2">
                        <p className="font-semibold text-slate-700">Is the candidate personally related to any current Steward Health 247 Professionals employee or service user?</p>
                        <div className="flex gap-4">
                          <label className="inline-flex items-center gap-1.5 font-bold">
                            <input type="radio" disabled={isPreviouslySigned} name="appD_relatedToEmployee" checked={formData.appD_relatedToEmployee === 'Yes'} onChange={() => handleInputChange('appD_relatedToEmployee', 'Yes')} /> Yes
                          </label>
                          <label className="inline-flex items-center gap-1.5 font-bold">
                            <input type="radio" disabled={isPreviouslySigned} name="appD_relatedToEmployee" checked={formData.appD_relatedToEmployee === 'No'} onChange={() => handleInputChange('appD_relatedToEmployee', 'No')} /> No
                          </label>
                        </div>
                        {formData.appD_relatedToEmployee === 'Yes' && (
                          <input
                            type="text"
                            disabled={isPreviouslySigned}
                            placeholder="Please give details..."
                            value={formData.appD_relatedDetails}
                            onChange={(e) => handleInputChange('appD_relatedDetails', e.target.value)}
                            className="mt-1 block w-full p-2 border border-slate-300 rounded text-xs bg-white"
                          />
                        )}
                      </div>

                      <div className="bg-white p-3 border rounded-xl space-y-2">
                        <p className="font-semibold text-slate-700">Has the candidate worked for Steward Health Care previously (including as agency temp)?</p>
                        <div className="flex gap-4">
                          <label className="inline-flex items-center gap-1.5 font-bold">
                            <input type="radio" disabled={isPreviouslySigned} name="appD_workedPreviously" checked={formData.appD_workedPreviously === 'Yes'} onChange={() => handleInputChange('appD_workedPreviously', 'Yes')} /> Yes
                          </label>
                          <label className="inline-flex items-center gap-1.5 font-bold">
                            <input type="radio" disabled={isPreviouslySigned} name="appD_workedPreviously" checked={formData.appD_workedPreviously === 'No'} onChange={() => handleInputChange('appD_workedPreviously', 'No')} /> No
                          </label>
                        </div>
                        {formData.appD_workedPreviously === 'Yes' && (
                          <input
                            type="text"
                            disabled={isPreviouslySigned}
                            placeholder="Please give details..."
                            value={formData.appD_previousDetails}
                            onChange={(e) => handleInputChange('appD_previousDetails', e.target.value)}
                            className="mt-1 block w-full p-2 border border-slate-300 rounded text-xs bg-white"
                          />
                        )}
                      </div>
                    </div>

                    <h3 className="font-extrabold text-[#310d59] text-xs pt-2 border-t uppercase text-center bg-purple-100 p-1 rounded">5. For Use by Human Resources ONLY</h3>
                    <div className="border p-3 rounded-lg bg-yellow-50/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input type="checkbox" checked={formData.appD_hrLegalityCheck} onChange={(e) => handleInputChange('appD_hrLegalityCheck', e.target.checked)} className="rounded" />
                        <span>Legality to work in UK check completed satisfactorily</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input type="checkbox" checked={formData.appD_hrPrevEmployment} onChange={(e) => handleInputChange('appD_hrPrevEmployment', e.target.checked)} className="rounded" />
                        <span>Previous employment record check verified</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input type="checkbox" checked={formData.appD_hrConditionalSent} onChange={(e) => handleInputChange('appD_hrConditionalSent', e.target.checked)} className="rounded" />
                        <span>Conditional offer sent and scanned to home</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                        <input type="checkbox" checked={formData.appD_hrCovidVaccine} onChange={(e) => handleInputChange('appD_hrCovidVaccine', e.target.checked)} className="rounded" />
                        <span>Mandatory training & health certifications audited</span>
                      </label>
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- FORM 2: PAY 1 B — NEW STARTER INFORMATION ----------------- */}
              {(document.category.toLowerCase().includes('pay 1 b') || document.category.toLowerCase().includes('pay1b')) && (
                <div className="space-y-4">
                  <div className="bg-[#faf8fd] p-4 border border-purple-200 rounded-xl space-y-4 font-sans text-[11px]">
                    
                    <h3 className="font-extrabold text-xs text-[#310d59] border-b pb-1 flex items-center uppercase">
                      <CreditCard className="w-4 h-4 mr-1 text-[#310d59]" /> Part One: Bank / Building Society Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Bank/Building Society Name</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          placeholder="e.g. Barclays, HSBC..."
                          value={formData.payB_bankName}
                          onChange={(e) => handleInputChange('payB_bankName', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Account Holder Name</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.payB_accountHolderName}
                          onChange={(e) => handleInputChange('payB_accountHolderName', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Sort Code</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          maxLength={8}
                          placeholder="e.g. 20-40-60"
                          value={formData.payB_sortCode}
                          onChange={(e) => handleInputChange('payB_sortCode', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Account Number</label>
                        <input
                          type="text"
                          required
                          disabled={isPreviouslySigned}
                          maxLength={10}
                          placeholder="8 Digit Account No."
                          value={formData.payB_accountNumber}
                          onChange={(e) => handleInputChange('payB_accountNumber', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono font-bold animate-pulse-once"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Building Society Roll Number (If applicable)</label>
                        <input
                          type="text"
                          disabled={isPreviouslySigned}
                          placeholder="Roll Number"
                          value={formData.payB_buildingSocietyNo}
                          onChange={(e) => handleInputChange('payB_buildingSocietyNo', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded bg-white text-xs font-mono"
                        />
                      </div>
                    </div>

                    <h3 className="font-extrabold text-xs text-[#310d59] border-b pb-1 flex items-center uppercase">
                      <HelpCircle className="w-4 h-4 mr-1 text-[#310d59]" /> Part Two: Income Tax Details (HMRC declarations)
                    </h3>
                    <p className="text-[10px] text-slate-500 italic">Please select the statement below (A, B or C) that applies strictly to you:</p>

                    <div className="space-y-2">
                      <label className="flex items-start gap-2.5 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          disabled={isPreviouslySigned}
                          name="payB_taxStatement"
                          checked={formData.payB_taxStatement === 'Statement_A'}
                          onChange={() => handleInputChange('payB_taxStatement', 'Statement_A')}
                          className="mt-0.5 text-purple-900 border-slate-300"
                        />
                        <div>
                          <p className="font-extrabold text-slate-800">A. This is my first job since last 6 April</p>
                          <p className="text-[10px] text-slate-500 leading-tight">And I have not been receiving taxable Jobseeker\'s Allowance, Employment Support Allowance, taxable Incapacity Benefit, State or Occupational Pension.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          disabled={isPreviouslySigned}
                          name="payB_taxStatement"
                          checked={formData.payB_taxStatement === 'Statement_B'}
                          onChange={() => handleInputChange('payB_taxStatement', 'Statement_B')}
                          className="mt-0.5 text-purple-900 border-slate-300"
                        />
                        <div>
                          <p className="font-extrabold text-slate-800">B. This is now my only job</p>
                          <p className="text-[10px] text-slate-500 leading-tight">But since last 6 April I have had another job, or received taxable Jobseeker\'s Allowance or taxable Incapacity support. I do not receive State or Pension funds.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input
                          type="radio"
                          disabled={isPreviouslySigned}
                          name="payB_taxStatement"
                          checked={formData.payB_taxStatement === 'Statement_C'}
                          onChange={() => handleInputChange('payB_taxStatement', 'Statement_C')}
                          className="mt-0.5 text-purple-900 border-slate-305"
                        />
                        <div>
                          <p className="font-extrabold text-slate-800">C. As well as my new job, I have another job or pension</p>
                          <p className="text-[10px] text-slate-500 leading-tight">I receive another active salary or direct state pension benefits.</p>
                        </div>
                      </label>
                    </div>

                    <h3 className="font-extrabold text-xs text-[#310d59] border-b pb-1 flex items-center uppercase">
                      <BookOpen className="w-4 h-4 mr-1 text-[#310d59]" /> Part Three: Student Loan Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 border rounded-xl">
                      <div>
                        <p className="font-bold text-slate-705">Do you have a Student Loan which is not fully repaid?</p>
                        <div className="flex gap-4 mt-1">
                          <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                            <input type="radio" disabled={isPreviouslySigned} name="payB_studentLoanFlag" checked={formData.payB_studentLoanFlag === 'Yes'} onChange={() => handleInputChange('payB_studentLoanFlag', 'Yes')} /> Yes
                          </label>
                          <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                            <input type="radio" disabled={isPreviouslySigned} name="payB_studentLoanFlag" checked={formData.payB_studentLoanFlag === 'No'} onChange={() => handleInputChange('payB_studentLoanFlag', 'No')} /> No
                          </label>
                        </div>
                      </div>

                      {formData.payB_studentLoanFlag === 'Yes' && (
                        <div>
                          <p className="font-bold text-slate-705">Select Plan Tier:</p>
                          <div className="flex gap-4 mt-1">
                            <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                              <input type="radio" disabled={isPreviouslySigned} name="payB_studentLoanPlan" checked={formData.payB_studentLoanPlan === 'Plan 1'} onChange={() => handleInputChange('payB_studentLoanPlan', 'Plan 1')} /> Plan 1 (Pr-2012 courses)
                            </label>
                            <label className="inline-flex items-center gap-1.5 font-bold cursor-pointer">
                              <input type="radio" disabled={isPreviouslySigned} name="payB_studentLoanPlan" checked={formData.payB_studentLoanPlan === 'Plan 2'} onChange={() => handleInputChange('payB_studentLoanPlan', 'Plan 2')} /> Plan 2 (Post-2012 courses)
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="font-extrabold text-xs text-[#310d59] border-b pb-1 uppercase">Part Four: Emergency & Next of Kin Support</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Emergency Contact */}
                      <div className="border p-3 rounded-lg bg-slate-50 space-y-2">
                        <p className="font-extrabold text-purple-950 uppercase text-[9px] border-b">Emergency Contact Details</p>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase">Full Name</label>
                          <input type="text" disabled={isPreviouslySigned} required value={formData.payB_emergencyName} onChange={(e) => handleInputChange('payB_emergencyName', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white mt-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase">Relationship</label>
                          <input type="text" disabled={isPreviouslySigned} required value={formData.payB_emergencyRelation} onChange={(e) => handleInputChange('payB_emergencyRelation', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white mt-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase">Telephone (Emergency)</label>
                          <input type="tel" disabled={isPreviouslySigned} required value={formData.payB_emergencyPhone} onChange={(e) => handleInputChange('payB_emergencyPhone', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white mt-1 text-xs font-mono" />
                        </div>
                      </div>

                      {/* Next of Kin */}
                      <div className="border p-3 rounded-lg bg-slate-50 space-y-2">
                        <p className="font-extrabold text-purple-950 uppercase text-[9px] border-b">Next of Kin Details (if different)</p>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase">Full Name</label>
                          <input type="text" disabled={isPreviouslySigned} value={formData.payB_kinName} onChange={(e) => handleInputChange('payB_kinName', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white mt-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase">Relationship</label>
                          <input type="text" disabled={isPreviouslySigned} value={formData.payB_kinRelation} onChange={(e) => handleInputChange('payB_kinRelation', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white mt-1 text-xs" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-450 uppercase">Next of Kin Mobile</label>
                          <input type="tel" disabled={isPreviouslySigned} value={formData.payB_kinMobile} onChange={(e) => handleInputChange('payB_kinMobile', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded bg-white mt-1 text-xs font-mono" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- FORM 3: EMPLOYMENT CONTRACT (3 PAGES IN METRIC) ----------------- */}
              {(document.category.toLowerCase().includes('contract') || document.category.toLowerCase().includes('employment contract')) && (
                <div className="space-y-4">
                  
                  {/* TABBED PAGER SHEET */}
                  {!isPreviouslySigned && (
                    <div className="flex justify-between items-center bg-[#fafdfd] border border-purple-200 p-2 rounded-xl text-xs font-bold font-sans">
                      <button type="button" onClick={() => setActiveTab(t => Math.max(1, t - 1))} disabled={activeTab === 1} className="p-1 px-3 bg-white border rounded disabled:opacity-50">Back Page</button>
                      <span>Showing Page {activeTab} of 3 (Official Terms Document)</span>
                      <button type="button" onClick={() => setActiveTab(t => Math.min(3, t + 1))} disabled={activeTab === 3} className="p-1 px-3 bg-white border rounded disabled:opacity-50">Next Page</button>
                    </div>
                  )}

                  <div className="bg-[#fafbfd] p-5 border border-purple-200 rounded-xl space-y-4 font-sans text-[11px] leading-relaxed">
                    
                    {/* Page 1 */}
                    {(activeTab === 1 || isPreviouslySigned) && (
                      <div className="space-y-4">
                        <h4 className="border-b font-extrabold text-sm text-purple-950 pb-1">Page 1: Statement of Main Terms</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10.5px]">
                          <div className="p-2 border rounded-lg bg-slate-50">
                            <span className="font-extrabold uppercase text-[8px] text-slate-400 block">Employer Designation</span>
                            <span className="font-bold text-slate-800">Steward Healthcare 247 Professionals Ltd.</span>
                            <span className="block text-[9.5px] mt-1 text-slate-500 font-mono">Unit 43, Devonshire Business Centre, SG6 1GJ</span>
                          </div>
                          <div className="p-2 border rounded-lg bg-purple-50">
                            <span className="font-extrabold uppercase text-[8px] text-purple-400 block">Employee details</span>
                            <span className="font-bold text-purple-950 block">{staffMember.name}</span>
                            <span className="text-[9.5px] text-slate-650">{formData.address || staffMember.address}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="font-bold text-slate-500 uppercase text-[9px]">1. Job Title</label>
                            <input type="text" disabled={isPreviouslySigned} required value={formData.role} onChange={(e) => handleInputChange('role', e.target.value)} className="w-full p-2 border rounded bg-white mt-1 font-bold text-xs" />
                          </div>
                          <div>
                            <label className="font-bold text-slate-500 uppercase text-[9px]">2. Probation Period (months)</label>
                            <input type="text" disabled={isPreviouslySigned} required value={formData.contract_probationMonths} onChange={(e) => handleInputChange('contract_probationMonths', e.target.value)} className="w-full p-2 border rounded bg-white mt-1 text-xs" />
                          </div>
                          <div>
                            <label className="font-bold text-slate-500 uppercase text-[9px]">3. Hours of Work (Weekly)</label>
                            <input type="text" disabled={isPreviouslySigned} required value={formData.contract_hoursPerWeek} onChange={(e) => handleInputChange('contract_hoursPerWeek', e.target.value)} className="w-full p-2 border rounded bg-white mt-1 text-xs" />
                          </div>
                        </div>

                        <div className="space-y-1.5 p-1 text-slate-600 font-serif">
                          <p className="font-sans font-bold text-[#310d59] text-[11px] uppercase">4. Scope & Place of Work</p>
                          <p>The Registrant is normally required to conduct duties within registered care-homes, NHS trust hospitals, primary clinics and domiciliary residential properties contracted through the Hertfordshire branch and surrounding regional zones.</p>
                          <p className="font-sans font-bold text-[#310d59] text-[11px] uppercase pt-1">5. Hourly Remuneration Scale</p>
                          <p>Your primary starting base rate is set at <span className="font-sans font-bold text-[#a21caf]">£{formData.contract_hourlyRate} per hour</span>. Pay scale details are governed weekly of timesheets. Shift enhancements apply for Sundays, statutory bank holidays and specific night call routines.</p>
                        </div>
                      </div>
                    )}

                    {/* Page 2 */}
                    {(activeTab === 2 || isPreviouslySigned) && (
                      <div className="space-y-3">
                        <h4 className="border-b font-extrabold text-sm text-purple-950 pb-1">Page 2: Standard Work & Compliance Clauses</h4>
                        
                        <div className="space-y-2.5 font-serif text-slate-655 text-[11px] leading-relaxed pl-1.5">
                          <p><span className="font-sans font-bold uppercase text-[10px] text-purple-900 block font-bold">6. Collective Care Agreements</span> No specific collective nursing agreements directly apply. Shift allocation rules are detailed inside the Employee Handbook.</p>
                          <p><span className="font-sans font-bold uppercase text-[10px] text-purple-900 block font-bold">7. Employee Benefits Plan</span> Steward Health 247 provides necessary personal protective equipment (PPE), agency badges, client-stationery access, and specialized training credits.</p>
                          <p><span className="font-sans font-bold uppercase text-[10px] text-purple-900 block font-bold">8. Annual Leave entitlement</span> You are entitled to a maximum of <span className="font-sans font-bold">{formData.contract_holidayDays} days</span> paid vacation per complete employment year (including public and statutory bank holidays).</p>
                          <p><span className="font-sans font-bold uppercase text-[10px] text-purple-900 block font-bold">9. Sick Leave & Medical Disability</span> Any shift absence is governed by the Statutory Sick Pay (SSP) legal guidelines. Doctor certification notes are required for any period exceeding 3 consecutive calendar days.</p>
                          <p><span className="font-sans font-bold uppercase text-[10px] text-purple-900 block font-bold">10. Pension Enrollment</span> You will be automatically enrolled into the National Employment Savings Trust (NEST) workplace pension fund in full compliance with the Pensions Act 2008.</p>
                        </div>
                      </div>
                    )}

                    {/* Page 3 */}
                    {(activeTab === 3 || isPreviouslySigned) && (
                      <div className="space-y-4">
                        <h4 className="border-b font-extrabold text-sm text-purple-950 pb-1">Page 3: Executions and Optional Witness Block</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Employer execution block */}
                          <div className="p-3 border rounded-xl bg-purple-50/55 space-y-2">
                            <span className="font-black text-[#310d59] block uppercase text-[8.5px]">Signed on behalf of Steward Care Ltd:</span>
                            <p className="font-bold">Authorized Representative</p>
                            <p className="text-[10px] text-slate-500">Title: Director & Branch Coordinator</p>
                            <div className="border border-dashed h-12 bg-white flex items-center justify-center font-mono text-[9px] text-slate-400">
                              [ELECTRONIC APPROVED SIGNATURE]
                            </div>
                          </div>

                          {/* Witness block */}
                          <div className="p-3 border rounded-xl bg-slate-50 space-y-2">
                            <span className="font-black text-slate-500 block uppercase text-[8.5px]">Optional Witness Sign-Off:</span>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <label className="block text-[8px] uppercase text-slate-400">Witness Name</label>
                                <input type="text" disabled={isPreviouslySigned} placeholder="Full Name" value={formData.contract_witnessName} onChange={(e) => handleInputChange('contract_witnessName', e.target.value)} className="w-full p-1.5 border rounded mt-1 bg-white" />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase text-slate-400">Witness Date</label>
                                <input type="date" disabled={isPreviouslySigned} value={formData.contract_witnessDate} onChange={(e) => handleInputChange('contract_witnessDate', e.target.value)} className="w-full p-1 border rounded mt-1 bg-white" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[8px] uppercase text-slate-400">Witness Signature/Initials</label>
                              <input type="text" disabled={isPreviouslySigned} placeholder="Type Witness Seal" value={formData.contract_witnessSignature} onChange={(e) => handleInputChange('contract_witnessSignature', e.target.value)} className="w-full p-1.5 border rounded mt-1 bg-white font-serif italic" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* ----------------- FORM 4: WEEKLY TIMESHEET ----------------- */}
              {(document.category.toLowerCase().includes('timesheet') || document.category.toLowerCase().includes('weekly timesheet')) && (
                <div className="space-y-4">
                  <div className="bg-[#fbfcff] border border-purple-200 rounded-xl p-4 space-y-4 font-sans text-[11px]">
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase">Worker Name</label>
                        <input type="text" disabled value={staffMember.name} className="w-full p-2 border rounded bg-slate-100 font-extrabold" />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase">Worker Reference</label>
                        <input type="text" disabled={isPreviouslySigned} value={formData.timesheet_workerRef} onChange={(e) => handleInputChange('timesheet_workerRef', e.target.value)} className="w-full p-2 border rounded bg-white text-xs font-mono font-bold" />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase">Role/Job Title</label>
                        <input type="text" disabled value={staffMember.role} className="w-full p-2 border rounded bg-slate-100 mt-1 font-bold" />
                      </div>
                      <div>
                        <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase">Week Ending Date</label>
                        <input type="date" required disabled={isPreviouslySigned} value={formData.timesheet_weekEnding} onChange={(e) => handleInputChange('timesheet_weekEnding', e.target.value)} className="w-full p-1.5 border border-purple-300 rounded bg-white mt-1 text-xs font-mono font-bold" />
                      </div>
                    </div>

                    <h4 className="font-extrabold uppercase text-[#310d59] border-b pb-1">Care Shift Daily Entries</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left border">
                        <thead>
                          <tr className="bg-purple-900 text-white text-[9px] uppercase font-bold text-center">
                            <th className="p-2 border">Day</th>
                            <th className="p-2 border">Date</th>
                            <th className="p-2 border">Shift Type</th>
                            <th className="p-2 border">Start Time (24h)</th>
                            <th className="p-2 border">End Time (24h)</th>
                            <th className="p-2 border">Break (hrs)</th>
                            <th className="p-2 border">Total Hours</th>
                            <th className="p-2 border">Client Signature</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.timesheet_shifts.map((row: any, idx: number) => (
                            <tr key={row.day} className="border-b hover:bg-slate-50 text-center font-semibold text-slate-705">
                              <td className="p-1 px-2 border font-bold bg-slate-50">{row.day}</td>
                              <td className="p-1 border">
                                <input type="text" disabled={isPreviouslySigned} placeholder="e.g. 21/04" value={row.date} onChange={(e) => handleShiftChange(idx, 'date', e.target.value)} className="w-full p-1 text-center text-xs font-mono border-0 rounded bg-transparent" />
                              </td>
                              <td className="p-1 border">
                                <select disabled={isPreviouslySigned} value={row.type} onChange={(e) => handleShiftChange(idx, 'type', e.target.value)} className="p-1 border rounded bg-white text-[10px]">
                                  <option value="AM">AM</option>
                                  <option value="PM">PM</option>
                                  <option value="Night">Night</option>
                                  <option value="Sleep In">Sleep In</option>
                                  <option value="None">Off (No shift)</option>
                                </select>
                              </td>
                              <td className="p-1 border">
                                <input type="text" disabled={isPreviouslySigned || row.type === 'None'} placeholder="08:00" value={row.start} onChange={(e) => handleShiftChange(idx, 'start', e.target.value)} className="w-full p-1 text-center font-mono text-xs border bg-transparent rounded" />
                              </td>
                              <td className="p-1 border">
                                <input type="text" disabled={isPreviouslySigned || row.type === 'None'} placeholder="20:00" value={row.end} onChange={(e) => handleShiftChange(idx, 'end', e.target.value)} className="w-full p-1 text-center font-mono text-xs border bg-transparent rounded" />
                              </td>
                              <td className="p-1 border">
                                <input type="text" disabled={isPreviouslySigned || row.type === 'None'} placeholder="1.0" value={row.breakHrs} onChange={(e) => handleShiftChange(idx, 'breakHrs', e.target.value)} className="w-full p-1 text-center font-mono text-xs border bg-transparent rounded" />
                              </td>
                              <td className="p-1 border font-bold text-xs text-purple-900 bg-purple-50">
                                {row.total || 0}
                              </td>
                              <td className="p-1 border">
                                <input type="checkbox" disabled checked={row.clientSign} className="rounded text-emerald-600 focus:ring-0" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Automatic sum output log */}
                    <div className="flex justify-between items-center bg-purple-900 text-white rounded-lg p-3 font-extrabold shadow">
                      <span>SHIFT SUMMARY:</span>
                      <span className="text-sm font-mono tracking-wide">
                        Cumulative Net Payable Care Hours: {formData.timesheet_shifts.reduce((acc: number, r: any) => acc + (parseFloat(r.total) || 0), 0)} Hours
                      </span>
                    </div>

                    <h4 className="font-extrabold uppercase text-[#a21caf] border-b pb-1 pt-1.5 flex items-center">
                      <CreditCard className="w-4 h-4 mr-1" /> Expenses Claims Ledger
                    </h4>
                    <div className="border p-3 rounded-lg bg-slate-50 grid grid-cols-1 md:grid-cols-5 gap-2">
                      <div className="md:col-span-2">
                        <label className="text-[8px] uppercase font-bold text-slate-400 block">Description (e.g. travel, parking)</label>
                        <input type="text" disabled={isPreviouslySigned} placeholder="e.g. Mileage reimbursement" value={formData.timesheet_expenses[0]?.desc} onChange={(e) => {
                          const ex = [...formData.timesheet_expenses];
                          ex[0].desc = e.target.value;
                          handleInputChange('timesheet_expenses', ex);
                        }} className="w-full p-1.5 border rounded bg-white text-xs" />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400 block">Quantity</label>
                        <input type="text" disabled={isPreviouslySigned} placeholder="50 miles" value={formData.timesheet_expenses[0]?.qty} onChange={(e) => {
                          const ex = [...formData.timesheet_expenses];
                          ex[0].qty = e.target.value;
                          handleInputChange('timesheet_expenses', ex);
                        }} className="w-full p-1.5 border rounded bg-white text-xs" />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400 block">Unit Cost (£)</label>
                        <input type="text" disabled={isPreviouslySigned} placeholder="0.45" value={formData.timesheet_expenses[0]?.cost} onChange={(e) => {
                          const ex = [...formData.timesheet_expenses];
                          ex[0].cost = e.target.value;
                          ex[0].total = Math.round((parseFloat(e.target.value || '0') * parseFloat(ex[0].qty || '0') || 0) * 100) / 100;
                          handleInputChange('timesheet_expenses', ex);
                        }} className="w-full p-1.5 border rounded bg-white text-xs font-mono" />
                      </div>
                      <div>
                        <label className="text-[8px] uppercase font-bold text-slate-400 block font-bold">Total Expenses Claimed</label>
                        <div className="p-2 border rounded bg-[#f5f3ff] text-purple-950 font-bold font-mono text-center">
                          £{formData.timesheet_expenses[0]?.total || 0}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- FORM 5: SUPERVISION RECORD ----------------- */}
              {(document.category.toLowerCase().includes('supervision') || document.category.toLowerCase().includes('supervision record')) && (
                <div className="space-y-4">
                  <div className="bg-[#fbfcff] border border-purple-200 rounded-xl p-4 space-y-4 font-sans text-[11px]">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Registrant Name</label>
                        <input type="text" disabled value={staffMember.name} className="p-2 border rounded w-full bg-slate-100 font-extrabold" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Supervisor/Manager</label>
                        <input type="text" disabled value="Authorized Representative" className="p-2 border rounded w-full bg-slate-100 font-bold" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-500 uppercase text-[9px]">Date of Supervision Audit</label>
                        <input type="date" required disabled={isPreviouslySigned} value={formData.signDate} onChange={(e) => handleInputChange('signDate', e.target.value)} className="p-1.5 border border-purple-300 rounded w-full bg-white font-mono font-bold" />
                      </div>
                    </div>

                    <div className="p-3 border rounded-lg bg-slate-50">
                      <p className="font-extrabold text-[10px] uppercase text-[#310d59] border-b pb-1">Supervision Agenda</p>
                      <ul className="list-decimal pl-4 space-y-0.5 text-[10px] text-slate-600 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <li>Previous Action audits</li>
                        <li>Incidents & medicine compliance</li>
                        <li>CQC Care logs real-time updates</li>
                        <li>Professional dressing/Uniform</li>
                        <li>Continuing education and competencies</li>
                        <li>Service user feedback reviews</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="font-extrabold text-[10px] uppercase text-[#310d59] border-b pb-1">Discussion & Agreed Corrective Actions Table</p>
                      
                      <table className="w-full border text-left">
                        <thead>
                          <tr className="bg-purple-900 text-white font-bold text-[9px] uppercase">
                            <th className="p-2 border">Discussion Notes</th>
                            <th className="p-2 border">Actions Agreed</th>
                            <th className="p-2 border">Target Date</th>
                            {!isPreviouslySigned && <th className="p-2 border shrink-0 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {formData.supervision_actions.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="border-b text-[10.5px]">
                              <td className="p-2 border font-semibold text-slate-800">{row.discussion}</td>
                              <td className="p-2 border text-slate-600 font-serif">{row.actions}</td>
                              <td className="p-2 border font-mono text-purple-900">{row.target}</td>
                              {!isPreviouslySigned && (
                                <td className="p-1 border text-center">
                                  <button type="button" onClick={() => removeSupervisionRow(rIdx)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Add dynamic logs parameters */}
                      {!isPreviouslySigned && (
                        <div className="p-3 border rounded-lg bg-purple-50/50 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                          <div>
                            <label className="text-[8px] uppercase font-bold">Discussion Summary</label>
                            <input type="text" placeholder="e.g. Punctuality or Dress code" value={discussionInput.discussion} onChange={(e) => setDiscussionInput(p => ({ ...p, discussion: e.target.value }))} className="w-full p-1.5 border rounded bg-white text-xs mt-1" />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase font-bold">Corrective Action</label>
                            <input type="text" placeholder="e.g. Recheck MAR standards" value={discussionInput.actions} onChange={(e) => setDiscussionInput(p => ({ ...p, actions: e.target.value }))} className="w-full p-1.5 border rounded bg-white text-xs mt-1" />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-[8px] uppercase font-bold">Target Deadline</label>
                              <input type="text" placeholder="e.g. Immediate" value={discussionInput.target} onChange={(e) => setDiscussionInput(p => ({ ...p, target: e.target.value }))} className="w-full p-1.5 border rounded bg-white text-xs mt-1" />
                            </div>
                            <button type="button" onClick={addSupervisionRow} className="p-2 px-3 bg-purple-900 text-white rounded font-bold text-xs flex items-center shrink-0">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* ----------------- FORM 6: JOB DESCRIPTION ----------------- */}
              {(document.category.toLowerCase().includes('job description') || document.category.toLowerCase().includes('description')) && (
                <div className="space-y-4">
                  <div className="bg-[#fbfcff] border border-purple-200 rounded-xl p-4 space-y-4 font-sans text-[11px]">
                    
                    <div className="p-3 border rounded-lg bg-purple-50 flex items-center justify-between text-xs font-bold font-sans">
                      <div>
                        <span className="text-slate-500 uppercase text-[9px] block">RESPONSIBLE CONTACT TO:</span>
                        <span className="text-purple-950 font-extrabold block">Home Manager / Care Co-ordinator / Branch Director</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 uppercase text-[9px] block">EMPLOYMENT CADENCE TYPE:</span>
                        <span className="text-purple-950 font-extrabold block">Permanent Clinical Placement / Flexi contract</span>
                      </div>
                    </div>

                    <h4 className="font-extrabold text-[#310d59] uppercase border-b pb-1 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-[#310d59]" /> Core Caregiver Duties Checklist (Check Off Each Row)
                    </h4>
                    <p className="text-[10px] text-slate-500 italic">Newly onboarded clinical staff must review, verify, and check off every regulatory task within their practice boundary:</p>

                    <div className="space-y-2">
                      {documentDuties.map((duty, idx) => {
                        const isChecked = (formData.dutiesAccepted || []).includes(duty.id);
                        return (
                          <div
                            key={duty.id}
                            onClick={() => !isPreviouslySigned && handleDutyToggle(duty.id)}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-purple-50/70 border-purple-300 text-slate-800'
                                : 'bg-white hover:bg-slate-50 border-slate-222 text-slate-600'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              <div className={`w-4- h-4 w-4 h-4 rounded border flex items-center justify-center font-bold ${
                                isChecked ? 'bg-purple-900 border-purple-900 text-white' : 'border-slate-350 bg-white'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                            <div>
                              <span className="font-bold text-[9.5px] text-purple-900 block font-mono">DUTY #{idx+1}</span>
                              <span className="text-[11px] leading-relaxed font-semibold block mt-0.5">{duty.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <h4 className="font-extrabold text-[#310d59] uppercase border-b pb-1 pt-1.5">Code of Professional Conduct Declarations</h4>
                    <ul className="list-decimal pl-4 text-[10px] font-medium text-slate-650 leading-relaxed space-y-1.5 pl-5">
                      <li><span className="font-black text-slate-750">Safety Audit:</span> You must ensure the absolute comfort, safeguarding, and health standards of clients at all times, immediate reporting any neglect hints.</li>
                      <li><span className="font-black text-slate-750">Gift Restrictions:</span> You are strictly forbidden from accepting any monetary personal gifts, tips, or loans from clients.</li>
                      <li><span className="font-black text-slate-750">Professional Outfit:</span> You are required to wear complete Clean Uniforms, official agency ID badge lanyard, and proper protective clinical gloves.</li>
                      <li><span className="font-black text-slate-750">Confidentiality compliance:</span> Absolute compliance with GDPR and information security. Care logs data must never leave the primary client facilities systems.</li>
                    </ul>

                  </div>
                </div>
              )}

              {/* ----------------- FALLBACK FOR OTHER GENERAL DOCUMENTS (Privacy, Handbook, etc.) ----------------- */}
              {!['Appendix D', 'New Starter Information', 'Pay 1 B', 'Employment Contract', 'Weekly Timesheet', 'Supervision Record', 'Job Description'].some(tag => 
                document.category.toLowerCase().includes(tag.toLowerCase())
              ) && (
                <div className="space-y-4">
                  <div className="bg-[#faf8fd] p-4 border border-purple-200 rounded-xl space-y-3 font-sans">
                    <p className="font-extrabold text-[12px] text-purple-950 uppercase border-b pb-1">Policy Review & Comprehension Statement</p>
                    <p className="font-serif leading-relaxed text-slate-650 text-xs">
                      I hereby certify that I have read this document, {document.category}, in its entirety and fully understand the regulatory rules, clinical guidelines, and administrative policies set forth by Steward Health Care 247 Professionals. 
                    </p>
                    <p className="font-serif leading-relaxed text-slate-650 text-xs">
                      I further acknowledge that compliance violations or failures to abide by the standard codes of care coordination may lead to immediate suspension from our clinical placement rosters. All details filled in this system are subject to direct audits by CQC officers.
                    </p>
                  </div>
                </div>
              )}

              {/* SECTION: LEGAL DEED OF EXECUTION & SIGNATURE WIDGET */}
              <div className="border-t-2 border-purple-900 pt-5 space-y-4">
                <h4 className="text-xs font-black uppercase bg-purple-50 text-purple-900 border-l-4 border-purple-900 p-2 py-1">
                  II. Execution & E-Signature Seal
                </h4>

                <p className="font-serif text-slate-600 pl-1 leading-relaxed text-[10.5px]">
                  By executing this digital document, I represent and declare that (a) I have read and accepted the policies described in this file; (b) I consent to secure record archiving under regulatory audits; and (c) the electronic signature drawn or set below serves as a legal seal of execution matching a physical script signature under standard legal conventions.
                </p>

                {/* Switcher draw vs type script */}
                {!isPreviouslySigned && (
                  <div className="flex bg-[#fafafc] border border-slate-200 p-1 rounded-xl w-64 max-w-full shadow-inner font-sans text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleInputChange('signatureType', 'draw')}
                      className={`w-1/2 p-1.5 rounded-lg transition-all text-center cursor-pointer ${formData.signatureType === 'draw' ? 'bg-white shadow text-purple-950 font-black' : 'text-slate-500'}`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('signatureType', 'type')}
                      className={`w-1/2 p-1.5 rounded-lg transition-all text-center cursor-pointer ${formData.signatureType === 'type' ? 'bg-white shadow text-purple-950 font-black' : 'text-slate-500'}`}
                    >
                      Choose Type font
                    </button>
                  </div>
                )}

                {/* SIGNATURE AREA DISPLAY */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch font-sans">
                  
                  {/* Left block: The interactive signature box */}
                  <div className="md:col-span-8 space-y-2">
                    <label className="block text-[9.5px] font-black text-slate-450 uppercase tracking-wider">Digital Signature Chamber</label>
                    
                    {isPreviouslySigned ? (
                      /* Read-Only Signature Box */
                      <div className="border border-purple-200 rounded-xl bg-purple-50/20 p-5 flex items-center justify-center min-h-[120px] relative select-none">
                        <div className="absolute top-1 left-2 text-[8px] uppercase tracking-widest text-[#9c1f60] font-bold bg-[#faf1f5] px-1.5 rounded border border-[#fad1db] mt-1.5">
                          ✓ Signed Electronic Record
                        </div>
                        {formData.signatureImage ? (
                          <img src={formData.signatureImage} alt="Digital Signature File" className="max-h-[105px] pointer-events-none filter brightness-95 opacity-90" />
                        ) : (
                          <span className={`text-2xl font-serif text-[#4c1d95] select-none ${formData.typedSignatureFont || 'font-serif italic'}`}>
                            {formData.typedSignatureName || staffMember.name}
                          </span>
                        )}
                        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-400">
                          Date: {formData.signDate} • IP Certified 
                        </div>
                      </div>
                    ) : (
                      /* Active Signature Writing Box */
                      <div className="space-y-1.5">
                        {formData.signatureType === 'draw' ? (
                          <div className="relative border-2 border-purple-300 rounded-xl bg-slate-50 overflow-hidden flex flex-col focus-within:border-purple-600">
                            <canvas
                              ref={canvasRef}
                              width={480}
                              height={110}
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                              className="w-full h-28 cursor-crosshair touch-none bg-slate-50"
                            />
                            <div className="flex justify-between items-center p-2 border-t border-slate-200 bg-white">
                              <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                                <PenTool className="w-3 h-3 text-purple-700 animate-pulse" /> Draw/Stylus sign inside bounds.
                              </span>
                              <button
                                type="button"
                                onClick={clearSignature}
                                className="p-1 px-2 hover:bg-rose-50 text-rose-700 border border-transparent hover:border-rose-100 rounded text-[9.5px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Undo className="w-3 h-3" /> Clear Ink
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 text-[10.5px] font-sans">
                              <div>
                                <label className="block text-[8.5px] font-bold text-slate-500 uppercase">Type Signature text</label>
                                <input
                                  type="text"
                                  value={formData.typedSignatureName}
                                  onChange={(e) => handleInputChange('typedSignatureName', e.target.value)}
                                  className="mt-1 block w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[8.5px] font-bold text-slate-500 uppercase">Select Handwriting style</label>
                                <select
                                  value={formData.typedSignatureFont}
                                  onChange={(e) => handleInputChange('typedSignatureFont', e.target.value)}
                                  className="mt-1 block w-full p-1.5 border border-slate-300 rounded text-xs bg-white text-slate-850"
                                >
                                  <option value="font-serif italic text-purple-950 font-medium font-serif">Elegant Cursive</option>
                                  <option value="font-serif tracking-widest text-[#a61956] font-semibold font-serif">Prestige Script</option>
                                  <option value="font-sans font-black italic tracking-tight text-slate-900">Modern Sign</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="border border-slate-350 rounded-xl p-4 bg-slate-50/50 flex justify-center items-center h-20 select-none">
                              <span className={`text-xl ${formData.typedSignatureFont || 'font-serif'}`}>
                                {formData.typedSignatureName || staffMember.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right block: Sign Off date, seal verification */}
                  <div className="md:col-span-4 flex flex-col justify-between font-sans">
                    <div className="space-y-2">
                      <label className="block text-[9.5px] font-black text-slate-450 uppercase tracking-wider">Date of execution</label>
                      <input
                        type="date"
                        required
                        disabled={isPreviouslySigned}
                        value={formData.signDate}
                        onChange={(e) => handleInputChange('signDate', e.target.value)}
                        className="p-1.5 border border-slate-300 rounded w-full text-xs bg-white text-slate-800 font-mono font-bold"
                      />
                    </div>

                    <div className="bg-[#f0edf5] border border-purple-150 p-2.5 rounded-xl flex flex-col mt-2 justify-center items-center text-center">
                      <div className="p-0.5 px-2.5 bg-[#4c1d95] text-white rounded-full text-[8px] font-black uppercase tracking-wider mb-1 flex items-center gap-1 scale-90">
                        <Shield className="w-3 h-3 text-[#d97706] fill-[#d97706]" /> Secure E-Sign
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium leading-tight">SHA-256 Registered Hash securely stamped in compliance with UK eIDAS requirements.</p>
                    </div>
                  </div>

                </div>

                {/* COMPLIANCE UNDERTAKEN BOX REQUIRED BY HMRC/CQC */}
                <div className="mt-4 bg-[#fdf5f7] border border-rose-150 rounded-xl p-3">
                  <div className="flex items-start space-x-3 text-[10.5px] font-sans">
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        id="clinicalComplianceSworn"
                        required
                        disabled={isPreviouslySigned}
                        checked={formData.clinicalComplianceSworn}
                        onChange={(e) => handleInputChange('clinicalComplianceSworn', e.target.checked)}
                        className="rounded border-slate-333 text-purple-900 focus:ring-purple-700 w-4 h-4"
                      />
                    </div>
                    <div>
                      <label htmlFor="clinicalComplianceSworn" className="font-extrabold text-slate-850 block cursor-pointer">
                        HMRC & CQC Registration Sworn Undertaking (Mandatory Core Checklist)
                      </label>
                      <span className="text-[10px] text-slate-500 leading-normal block mt-1 font-sans">
                        I hereby swear, under clinical audit and penalty of NMC/HMRC regulatory actions, that the payroll, clinical competency checkmarks, and electronic signature entered in this document are true, complete, and legally correct.
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION: SUBMIT BUTTONS IF ACTIVE */}
              {!isPreviouslySigned && (
                <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs bg-white hover:bg-slate-55 transition cursor-pointer"
                  >
                    Cancel Draft
                  </button>
                  <button
                    type="submit"
                    className="p-1 px-5 rounded-xl bg-purple-900 border border-purple-950 text-white font-extrabold hover:bg-purple-950 transition shadow-sm text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Apply Signature & Compliance Seal</span>
                  </button>
                </div>
              )}

            </form>

            {/* LOWER BACKGROUND DESIGNATION NOTES */}
            <div className="mt-6 border-t border-dashed border-slate-200 pt-3 text-center text-[9px] text-slate-400 font-medium bg-slate-50 p-2 rounded">
              This contract registration archive is compiled digitally. Steward Health Care maintains cloud storage of e-signatures under maximum administrative safety guidelines. Secure reference: {document.id}
            </div>

          </div>
        </div>

        {/* SECURE SUBMIT TIMESTEP BANNER */}
        <div className="bg-[#4c1d95] p-2.5 px-6 shrink-0 text-white text-[9.5px] flex justify-between items-center font-mono select-none">
          <span className="font-sans font-extrabold flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-rose-500" /> 256-BIT SECURE ENCRYPTION TUNNEL
          </span>
          <span className="text-slate-200">
            System Hash ID: SHC-VAULT-{document.id.toUpperCase()}
          </span>
        </div>

      </div>
    </div>
  );
}
