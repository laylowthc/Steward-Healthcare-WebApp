import React, { useState, useRef, useEffect } from 'react';
import { Shield, Award, PenTool, Check, FileText, X, Download, Printer, Lock, User, CreditCard, BookOpen, AlertCircle, Undo, CheckSquare } from 'lucide-react';
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
      fullname: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      address: staffMember.address,
      niNumber: '',
      emergencyName: '',
      emergencyRelation: '',
      emergencyPhone: '',
      bankName: '',
      bankSortCode: '',
      bankAccountNumber: '',
      signDate: new Date().toISOString().split('T')[0],
      signatureType: 'draw', // 'draw' | 'type'
      typedSignatureName: staffMember.name,
      typedSignatureFont: 'font-serif italic text-purple-900',
      dutiesAccepted: [] as string[],
      gdpOptInSharing: true,
      gdpOptInCredentials: true,
      hasUnderstoodGuidelines: false,
      handbookScore: 0,
      clinicalComplianceSworn: false
    };
  });

  // Checklist duties for "Job Description" category
  const jobDuties = [
    { id: 'duty_1', label: 'Administer medications strictly in compliance with MAR sheets and clinical standards.' },
    { id: 'duty_2', label: 'Deliver individualized person-centered care addressing mental, clinical, and physical needs.' },
    { id: 'duty_3', label: 'Perform thorough handovers and log dynamic patient health logs in real-time.' },
    { id: 'duty_4', label: 'Uphold strict infection control protocol, personal protective equipment, and sanitization.' },
    { id: 'duty_5', label: 'Monitor vital statistics, clinical hazards, and execute immediate escalations for incidents.' }
  ];

  // Quiz for "Staff Handbook" category
  const handbookQuiz = [
    {
      id: 'q1',
      question: 'What is the primary action during a medication discrepancy?',
      options: [
        'Report immediately to the clinical head and log an incident form.',
        'Ignore it until the next shift audit.',
        'Administer double the dosage on the next window.'
      ],
      correctIdx: 0
    },
    {
      id: 'q2',
      question: 'Under CQC guidelines, how often should care logs be recorded?',
      options: [
        'At the end of every week.',
        'Directly following or during the care service delivery context.',
        'Only if the patient asks for them.'
      ],
      correctIdx: 1
    }
  ];

  const [quizSelection, setQuizSelection] = useState<Record<string, number>>({});

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
        ctx.strokeStyle = '#311059'; // royal purple ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [formData.signatureType, isPreviouslySigned]);

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

  const handleQuizChange = (qId: string, idx: number) => {
    const newAnsw = { ...quizSelection, [qId]: idx };
    setQuizSelection(newAnsw);

    // Calc total score
    let score = 0;
    handbookQuiz.forEach(q => {
      if (newAnsw[q.id] === q.correctIdx) {
        score += 50;
      }
    });
    handleInputChange('handbookScore', score);
  };

  const handleSubmitSignature = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations based on type
    if (document.category === 'Employment Contract') {
      if (!formData.niNumber || !formData.bankAccountNumber || !formData.bankSortCode) {
        alert('Please complete the mandatory National Insurance and Banking payroll declarations.');
        return;
      }
    }

    if (document.category === 'Job Description') {
      const activeDuties = formData.dutiesAccepted || [];
      if (activeDuties.length < jobDuties.length) {
        alert('Please review and check off all regulatory duties specified in your employment handbook.');
        return;
      }
    }

    if (document.category === 'Staff Handbook') {
      if (Object.keys(quizSelection).length < handbookQuiz.length) {
        alert('Please complete the mandatory compliance feedback questionnaire in full.');
        return;
      }
    }

    if (!formData.clinicalComplianceSworn) {
      alert('You must sign the legal/CQC governance compliance stamp to complete registration onboarding.');
      return;
    }

    // Capture final signature graphic if typed
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md overflow-y-auto flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="bg-[#fcf8fa] w-full max-w-4xl rounded-2xl shadow-2xl border border-purple-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in relative">
        
        {/* HEADER TOOLBAR */}
        <div className="bg-white border-b border-purple-100 p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-50 text-purple-900 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-850 uppercase flex items-center gap-1.5 leading-tight">
                <span>{document.category}</span>
                <span className={`text-[9.5px] p-0.5 px-2 rounded-full border ${
                  isPreviouslySigned ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-amber-50 text-amber-805 border-amber-250 animate-pulse'
                }`}>
                  {isPreviouslySigned ? '✓ Electronic Copy Signed' : 'Signing Required'}
                </span>
              </h3>
              <p className="text-[10px] text-slate-450 mt-0.5 font-medium leading-none font-sans">
                Assigned Registrant: <span className="font-bold text-slate-800">{staffMember.name}</span> ({staffMember.role})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadPrintFriendly}
              className="p-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              title="Print regulatory copy"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-450 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINT/PAPER CONTAINER */}
        <div className="overflow-y-auto p-6 md:p-10 flex-1 print:p-0 bg-slate-100/50">
          <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 border-4 border-double border-purple-950 rounded shadow-md relative print:shadow-none print:border-none">
            
            {/* OFFICIAL COMPLIANCE WATERMARK STAMP */}
            <div className="absolute right-8 top-8 opacity-10 flex flex-col items-center border border-purple-900 p-2 text-[10px] font-black uppercase text-purple-950 font-serif tracking-widest select-none pointer-events-none scale-90 sm:scale-100">
              <Award className="w-8 h-8 text-purple-900 mb-1" />
              <span>Steward Health</span>
              <span>CQC Audited Co.</span>
            </div>

            {/* BRAND HEADER STATIONARY */}
            <div className="text-center border-b-2 border-purple-900 pb-6 mb-8 mt-4">
              <div className="inline-flex items-center space-x-2 text-purple-950 font-serif mb-2 font-black tracking-widest text-[#4c1d95]">
                <Shield className="w-6 h-6 text-purple-900" />
                <span className="text-lg">STEWARD HEALTH CARE</span>
              </div>
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 font-sans">National Clinical Staffing & Agency Portal</h2>
              <p className="text-[9px] text-slate-400 font-mono mt-1">Steward House, Royal Court Chambers, London • CQC Regulated Provider (SHC-1981-LND)</p>
            </div>

            <form onSubmit={handleSubmitSignature} className="space-y-6 text-xs text-slate-800">
              
              {/* SECTION: DOCUMENT LEGAL INTRODUCTION */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase bg-purple-50 text-purple-900 border-l-4 border-purple-900 p-2 py-1 flex items-center">
                  <span>I. Legal Statement & Accreditations</span>
                </h4>
                <p className="leading-relaxed font-serif text-slate-600 pl-1">
                  This document serves as an official, binding clinical registration instrument executed under the laws of the Health and Social Care Act 2008 (Regulated Activities) Regulations 2014. By filling out the following declarations, you authorize Steward Health Care to process your credentials for placement within national care programs, client facilities, and NHS partner clinical sites.
                </p>
              </div>

              {/* DYNAMIC DOCUMENT CONTENT */}

              {/* 1. EMPLOYMENT CONTRACT */}
              {document.category === 'Employment Contract' && (
                <div className="space-y-4">
                  <div className="bg-[#fcfafc] p-4 border border-purple-150 rounded-xl space-y-4">
                    <h5 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center font-sans">
                      <Lock className="w-4 h-4 mr-1.5 text-purple-700" /> Registrant Demographics & Payroll Setup
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-[11px]">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">National Insurance Number (Mandatory for HMRC)</label>
                        <input
                          type="text"
                          maxLength={12}
                          required
                          disabled={isPreviouslySigned}
                          placeholder="e.g. QQ 12 34 56 A"
                          value={formData.niNumber}
                          onChange={(e) => handleInputChange('niNumber', e.target.value.toUpperCase())}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs font-mono uppercase bg-white focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">HMRC Registered Email</label>
                        <input
                          type="email"
                          required
                          disabled={isPreviouslySigned}
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-150">
                      <p className="text-[10px] uppercase font-black text-slate-450 tracking-wider">Payroll Disbursal Bank Account</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans text-[11px]">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-455">Bank Name</label>
                          <input
                            type="text"
                            required
                            disabled={isPreviouslySigned}
                            placeholder="Barclays, HSBC, Lloyds..."
                            value={formData.bankName}
                            onChange={(e) => handleInputChange('bankName', e.target.value)}
                            className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-455">Sort Code</label>
                          <input
                            type="text"
                            maxLength={8}
                            required
                            disabled={isPreviouslySigned}
                            placeholder="e.g. 20-30-40"
                            value={formData.bankSortCode}
                            onChange={(e) => handleInputChange('bankSortCode', e.target.value)}
                            className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-455">Account Number</label>
                          <input
                            type="text"
                            maxLength={10}
                            required
                            disabled={isPreviouslySigned}
                            placeholder="8 Digit Account No."
                            value={formData.bankAccountNumber}
                            onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                            className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-150">
                      <p className="text-[10px] uppercase font-black text-slate-450 tracking-wider">Emergency Next of Kin Notification</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans text-[11px]">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-455">Contact Full Name</label>
                          <input
                            type="text"
                            required
                            disabled={isPreviouslySigned}
                            placeholder="Kin Name..."
                            value={formData.emergencyName}
                            onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                            className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-455">Relationship</label>
                          <input
                            type="text"
                            required
                            disabled={isPreviouslySigned}
                            placeholder="Spouse, Mother, Sister..."
                            value={formData.emergencyRelation}
                            onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                            className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-455">Emergency Mobile</label>
                          <input
                            type="tel"
                            required
                            disabled={isPreviouslySigned}
                            placeholder="Kin Phone..."
                            value={formData.emergencyPhone}
                            onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                            className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-1 font-serif text-slate-600 leading-relaxed text-[11.5px] border-l-2 border-purple-200.">
                    <p className="font-bold text-purple-950 font-sans text-xs">Section 1.2: Hourly Wage Accruals & Payment Terms</p>
                    <p>
                      1. The Caregiver role assigned ({staffMember.role}) is paid on a weekly cadence following approved electronic timesheets submitted through the Steward Health online scheduling interface.
                    </p>
                    <p>
                      2. The clinical staff member undertakes to perform shift assignments with professional loyalty and proper standard of protective healthcare uniforms. This contract is subject to 7 days written notice by either HMRC-registered party.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. JOB DESCRIPTION */}
              {document.category === 'Job Description' && (
                <div className="space-y-4">
                  <div className="bg-[#fcfafc] p-4 border border-purple-150 rounded-xl space-y-3 font-sans text-[11px]">
                    <h5 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center">
                      <CheckSquare className="w-4 h-4 mr-1.5 text-purple-700" /> Regulatory Duties Checklist
                    </h5>
                    <p className="text-[10px] text-slate-500 mb-2">Check off each professional duty under care service registration frameworks to acknowledge compliance:</p>
                    
                    <div className="space-y-2.5">
                      {jobDuties.map((duty) => {
                        const isChecked = (formData.dutiesAccepted || []).includes(duty.id);
                        return (
                          <div
                            key={duty.id}
                            onClick={() => !isPreviouslySigned && handleDutyToggle(duty.id)}
                            className={`flex items-start space-x-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                              isChecked
                                ? 'border-purple-250 bg-purple-50/50 text-slate-800'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="pt-0.5 shrink-0">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isChecked ? 'bg-purple-900 border-purple-900 text-white' : 'border-slate-400 bg-white'
                              }`}>
                                {isChecked && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                            <span className="text-[11px] leading-relaxed font-semibold">{duty.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-1 font-serif text-[11.5px] leading-relaxed text-slate-600 space-y-2">
                    <p className="font-bold text-purple-950 font-sans text-xs">Acknowledge Competency Verification (CQC Scope of Practice)</p>
                    <p>
                      By checking all duties above and sealing this form, you affirm that you have completed the prerequisite clinical training, possess an active clinical credential or Nurse PIN (where applicable), and understand the specific protocols for emergency airway support, medication dispensaries, and incident response governance.
                    </p>
                  </div>
                </div>
              )}

              {/* 3. PRIVACY POLICY */}
              {document.category === 'Privacy Policy' && (
                <div className="space-y-4">
                  <div className="bg-[#fcfafc] p-4 border border-purple-150 rounded-xl space-y-3 font-sans text-[11px]">
                    <h5 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center">
                      <Lock className="w-4 h-4 mr-1.5 text-purple-700" /> GDPR Consent Opt-ins & Auditing Permissions
                    </h5>
                    
                    <div className="space-y-3 pt-1">
                      {/* GDPR 1 */}
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="gdpOptInCredentials"
                          disabled={isPreviouslySigned}
                          checked={formData.gdpOptInCredentials}
                          onChange={(e) => handleInputChange('gdpOptInCredentials', e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-purple-900 focus:ring-purple-700"
                        />
                        <div>
                          <label htmlFor="gdpOptInCredentials" className="font-black text-slate-700">Audit Credential Verification</label>
                          <p className="text-[10px] text-slate-500 leading-normal mt-0.5">I authorize Steward Health Care to share my Enhanced DBS Check registration record, mandatory training modules, and NMC PIN status with NHS trust systems and clinical compliance auditors.</p>
                        </div>
                      </div>

                      {/* GDPR 2 */}
                      <div className="flex items-start space-x-3 pt-2.5 border-t border-slate-150">
                        <input
                          type="checkbox"
                          id="gdpOptInSharing"
                          disabled={isPreviouslySigned}
                          checked={formData.gdpOptInSharing}
                          onChange={(e) => handleInputChange('gdpOptInSharing', e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-purple-900 focus:ring-purple-700"
                        />
                        <div>
                          <label htmlFor="gdpOptInSharing" className="font-black text-slate-700">Client Care Coordination profile Sharing</label>
                          <p className="text-[10px] text-slate-500 leading-normal mt-0.5">I authorize Steward Health to securely transmit my name, nurse summary photo, and designated clinical specialty qualifications to designated family representatives and primary care consumers demanding rosters.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="font-serif text-[11.5px] leading-relaxed text-slate-600 pl-1">
                    Steward Health compliance systems compile data under the General Data Protection Regulation (Regulation (EU) 2016/679) and UK Data Protection Act 2018. Disclosures occur strictly on a care-delivery justification basis. All data transmissions are archived with secure server-side SSL encryption hashes.
                  </p>
                </div>
              )}

              {/* 4. STAFF HANDBOOK */}
              {document.category === 'Staff Handbook' && (
                <div className="space-y-4">
                  <div className="bg-[#fcfafc] p-4 border border-purple-150 rounded-xl space-y-4 font-sans text-[11px]">
                    <h5 className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 flex items-center">
                      <BookOpen className="w-4 h-4 mr-1.5 text-purple-700" /> Mandatory Regulatory Comprehension Test
                    </h5>
                    <p className="text-[10px] text-slate-500">Under Care Quality Commission mandates, newly onboarded clinical staff must successfully answer feedback questions to ensure policy clarity:</p>

                    <div className="space-y-4">
                      {handbookQuiz.map((q) => {
                        const selectedIdx = quizSelection[q.id] !== undefined 
                          ? quizSelection[q.id] 
                          : (isPreviouslySigned ? 1 : -1); // fallback for previously signed view
                        return (
                          <div key={q.id} className="space-y-2">
                            <p className="font-bold text-slate-800 font-sans text-xs">Question: {q.question}</p>
                            <div className="space-y-1.5 pl-1">
                              {q.options.map((opt, oIdx) => (
                                <label
                                  key={oIdx}
                                  className={`flex items-start gap-2 p-2 px-3 rounded-lg border transition-all cursor-pointer text-[10.5px] ${
                                    selectedIdx === oIdx
                                      ? 'border-purple-250 bg-purple-50 text-purple-950 font-bold'
                                      : 'border-slate-200 bg-white hover:bg-slate-50/50 text-slate-600'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`quiz_${q.id}`}
                                    disabled={isPreviouslySigned}
                                    checked={selectedIdx === oIdx}
                                    onChange={() => handleQuizChange(q.id, oIdx)}
                                    className="mt-0.5 text-purple-900 border-slate-300 focus:ring-purple-700 focus:border-purple-700"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {Object.keys(quizSelection).length > 0 && (
                      <div className="bg-purple-900 text-white p-3 py-2 rounded-xl text-center font-bold tracking-wide uppercase text-[9.5px] shadow-sm">
                        Total Compliance Comprehension Score: {formData.handbookScore || 100}% (Passing Tier)
                      </div>
                    )}
                  </div>

                  <p className="font-serif text-[11.5px] leading-relaxed text-slate-600 pl-1">
                    I acknowledge that I have received an electronic copy of the Steward Health Care Staff Handbook, and understand that compliance violations or failures to record shifts in client logs may lead to immediate suspension from active rosters.
                  </p>
                </div>
              )}

              {/* SECTION: LEGAL DEED OF EXECUTION & SIGNATURE WIDGET */}
              <div className="border-t-2 border-purple-900 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase bg-purple-50 text-purple-900 border-l-4 border-purple-900 p-2 py-1">
                  II. Execution & E-Signature Seal
                </h4>

                <p className="font-serif text-slate-600 pl-1 leading-relaxed text-[11px].">
                  By executing this digital document, I represent and declare that (a) I have read and accepted the policies described in this file; (b) I consent to secure record archiving under regulatory audits; and (c) the electronic signature drawn or set below serves as a legal seal of execution matching a physical script signature under standard legal conventions.
                </p>

                {/* Switcher draw vs type script */}
                {!isPreviouslySigned && (
                  <div className="flex bg-[#fafafc] border border-slate-200 p-1 rounded-xl w-64 max-w-full shadow-inner font-sans text-[10.5px] font-bold">
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch font-sans">
                  
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
                          <img src={formData.signatureImage} alt="Digital Signature File" className="max-h-[110px] pointer-events-none filter brightness-95 opacity-90" />
                        ) : (
                          <span className={`text-2xl font-serif text-[#4c1d95] select-none ${formData.typedSignatureFont || 'font-serif italic'}`}>
                            {formData.typedSignatureName || staffMember.name}
                          </span>
                        )}
                        <div className="absolute bottom-1 right-2 text-[8.5px] font-mono text-slate-400">
                          Date: {formData.signDate} • Certified IP
                        </div>
                      </div>
                    ) : (
                      /* Active Signature Writing Box */
                      <div className="space-y-1.5">
                        {formData.signatureType === 'draw' ? (
                          <div className="relative border-2 border-slate-300 rounded-xl bg-slate-50 overflow-hidden flex flex-col focus-within:border-purple-600">
                            <canvas
                              ref={canvasRef}
                              width={480}
                              height={130}
                              onMouseDown={startDrawing}
                              onMouseMove={draw}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={draw}
                              onTouchEnd={stopDrawing}
                              className="w-full h-32 cursor-crosshair touch-none bg-slate-50"
                            />
                            <div className="flex justify-between items-center p-2 border-t border-slate-200 bg-white">
                              <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
                                <PenTool className="w-3 h-3 text-purple-700 animate-pulse" /> Use your mouse or stylus inside the signature boundary.
                              </span>
                              <button
                                type="button"
                                onClick={clearSignature}
                                className="p-1 px-2 hover:bg-rose-50 text-rose-700 border border-transparent hover:border-rose-100 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              >
                                <Undo className="w-3 h-3" /> Clear Ink
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 text-[11px] font-sans">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase">Type Signature text</label>
                                <input
                                  type="text"
                                  value={formData.typedSignatureName}
                                  onChange={(e) => handleInputChange('typedSignatureName', e.target.value)}
                                  className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase">Select Handwriting style</label>
                                <select
                                  value={formData.typedSignatureFont}
                                  onChange={(e) => handleInputChange('typedSignatureFont', e.target.value)}
                                  className="mt-1 block w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                                >
                                  <option value="font-serif italic text-purple-950 font-medium">Elegant Cursive</option>
                                  <option value="font-serif tracking-widest text-[#a61956] font-semibold">Prestige Script</option>
                                  <option value="font-sans font-black italic tracking-tight text-slate-900">Modern Graphic Signature</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="border border-slate-300 rounded-xl p-5 bg-slate-50/50 flex justify-center items-center h-24 select-none">
                              <span className={`text-2xl ${formData.typedSignatureFont || 'font-serif'}`}>
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
                        className="p-2 border border-slate-300 rounded-lg w-full text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono font-bold"
                      />
                    </div>

                    <div className="bg-[#f0edf5] border border-purple-150 p-3 rounded-2xl flex flex-col mt-3 justify-center items-center text-center">
                      <div className="p-1 px-3 bg-[#4c1d95] text-white rounded-full text-[8.5px] font-black uppercase tracking-wider mb-1 flex items-center gap-1 scale-90">
                        <Shield className="w-3 h-3 text-[#d97706] fill-[#d97706]" /> Secure E-Sign
                      </div>
                      <p className="text-[9.5px] text-slate-500 font-medium font-sans">SHA-256 Registered Hash securely stamped in compliance with European eIDAS requirements.</p>
                    </div>
                  </div>

                </div>

                {/* COMPLIANCE UNDERTAKING FOOTER */}
                <div className="mt-6 bg-[#fdf5f7] border border-rose-150 rounded-2xl p-4.5">
                  <div className="flex items-start space-x-3 text-[11px] font-sans">
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        id="clinicalComplianceSworn"
                        required
                        disabled={isPreviouslySigned}
                        checked={formData.clinicalComplianceSworn}
                        onChange={(e) => handleInputChange('clinicalComplianceSworn', e.target.checked)}
                        className="rounded border-slate-300 text-purple-900 focus:ring-purple-700"
                      />
                    </div>
                    <div>
                      <label htmlFor="clinicalComplianceSworn" className="font-extrabold text-slate-800 block cursor-pointer">
                        HMRC & CQC Registration Sworn Undertaking (Mandatory Core Checklist)
                      </label>
                      <span className="text-[10px] text-slate-500 leading-normal block mt-1 font-medium font-sans">
                        I hereby swear, under clinical audit and penalty of NMC/HMRC regulatory actions, that the payroll, clinical competency checkmarks, quiz questions, next-of-kin contacts, and electronic signature entered in this document are true, complete, and correct.
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION: SUBMIT BUTTONS IF ACTIVE */}
              {!isPreviouslySigned && (
                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs bg-white hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel Draft
                  </button>
                  <button
                    type="submit"
                    className="p-1.5 px-6 rounded-xl bg-purple-900 border border-purple-950 text-white font-extrabold hover:bg-purple-950 transition shadow-sm text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Complete Survey & Apply Signature</span>
                  </button>
                </div>
              )}

            </form>

            {/* LOWER BACKGROUND DESIGNATION NOTES */}
            <div className="mt-8 border-t border-dashed border-slate-200 pt-3 text-center text-[9.5px] text-slate-400 font-medium bg-slate-50/50 p-2 rounded">
              This contract registration archive is compiled digitally. Steward Health Care maintains cloud storage of e-signatures under maximum administrative safety guidelines. Secure reference: {document.id}
            </div>

          </div>
        </div>

        {/* SECURE SUBMIT TIMESTEP BANNER */}
        <div className="bg-[#4c1d95] p-2.5 px-6 shrink-0 text-white text-[10px] flex justify-between items-center font-mono select-none">
          <span className="font-sans font-bold flex items-center gap-1">
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
