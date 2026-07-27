import React, { useState } from 'react';
import { Applicant } from '../types';
import { 
  FileText, User, Mail, Phone, Home, Briefcase, GraduationCap, 
  Award, Shield, CheckCircle, Save, PenTool, Plus, Trash2, Check,
  AlertCircle, ChevronRight, ChevronLeft
} from 'lucide-react';

interface OnlineApplicationFormProps {
  applicant: Applicant;
  onSaveApplication: (applicantId: string, formData: Record<string, any>) => void;
  onCancel?: () => void;
}

export default function OnlineApplicationForm({
  applicant,
  onSaveApplication,
  onCancel
}: OnlineApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form State initialized with applicant values or defaults
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const existing = applicant.cvData?.personalDetails as any || {};
    return {
      // Personal Info
      title: existing.title || 'Mr',
      fullName: applicant.name || '',
      alsoKnownAs: existing.alsoKnownAs || '',
      dob: existing.dob || '',
      gender: existing.gender || 'Male',
      nationality: existing.nationality || 'British',
      niNumber: existing.niNumber || '',
      rightToWorkStatus: existing.rightToWorkStatus || 'UK/Irish Citizen',

      // Contact & Emergency
      email: applicant.email || '',
      phone: applicant.phone || '',
      address: existing.address || '',
      postcode: existing.postcode || '',
      emergencyName: existing.emergencyName || '',
      emergencyRelation: existing.emergencyRelation || '',
      emergencyPhone: existing.emergencyPhone || '',
      emergencyAddress: existing.emergencyAddress || '',

      // Employment History
      employmentHistory: applicant.cvData?.employmentHistory || [
        {
          employer: '',
          role: '',
          startDate: '',
          endDate: '',
          duties: '',
          reasonForLeaving: '',
          noticePeriod: ''
        }
      ],

      // Education & Qualifications
      educationHistory: applicant.cvData?.qualifications || [
        {
          institution: '',
          course: '',
          year: '',
          grade: ''
        }
      ],

      // Mandatory Training & Skills
      mandatoryTrainings: applicant.cvData?.mandatoryTraining || [
        'Moving & Handling',
        'Safeguarding Adults',
        'Basic Life Support & First Aid'
      ],
      skills: applicant.cvData?.skills || ['Patient Care', 'Medication Administration', 'Dementia Care'],

      // Professional Registrations
      registrationBody: existing.registrationBody || '',
      nmcPin: applicant.cvData?.personalDetails ? (applicant as any).nmcPin || '' : '',
      nmcExpiry: existing.nmcExpiry || '',

      // References
      references: applicant.cvData?.references || [
        {
          name: '',
          role: '',
          organization: '',
          email: '',
          phone: '',
          relationship: 'Line Manager'
        },
        {
          name: '',
          role: '',
          organization: '',
          email: '',
          phone: '',
          relationship: 'Clinical Supervisor'
        }
      ],

      // Declarations & Signatures
      hasConvictions: 'No',
      convictionDetails: '',
      agreedCqcCompliance: true,
      agreedSwornDeclaration: true,
      signatureName: applicant.name || '',
      signatureDate: new Date().toISOString().split('T')[0]
    };
  });

  const availableTrainings = [
    'Moving & Handling',
    'Safeguarding Adults',
    'Safeguarding Children',
    'Basic Life Support & First Aid',
    'Medication Administration',
    'Food Safety & Hygiene',
    'Infection Prevention & Control',
    'Fire Safety Awareness',
    'Mental Capacity Act & DoLS',
    'Dementia Care Awareness',
    'Health & Safety at Work'
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmploymentChange = (index: number, field: string, value: string) => {
    const list = [...formData.employmentHistory];
    list[index] = { ...list[index], [field]: value };
    setFormData(prev => ({ ...prev, employmentHistory: list }));
  };

  const addEmploymentRow = () => {
    setFormData(prev => ({
      ...prev,
      employmentHistory: [
        ...prev.employmentHistory,
        { employer: '', role: '', startDate: '', endDate: '', duties: '', reasonForLeaving: '', noticePeriod: '' }
      ]
    }));
  };

  const removeEmploymentRow = (index: number) => {
    if (formData.employmentHistory.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      employmentHistory: prev.employmentHistory.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const list = [...formData.educationHistory];
    list[index] = { ...list[index], [field]: value };
    setFormData(prev => ({ ...prev, educationHistory: list }));
  };

  const addEducationRow = () => {
    setFormData(prev => ({
      ...prev,
      educationHistory: [
        ...prev.educationHistory,
        { institution: '', course: '', year: '', grade: '' }
      ]
    }));
  };

  const removeEducationRow = (index: number) => {
    if (formData.educationHistory.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      educationHistory: prev.educationHistory.filter((_: any, i: number) => i !== index)
    }));
  };

  const handleReferenceChange = (index: number, field: string, value: string) => {
    const list = [...formData.references];
    list[index] = { ...list[index], [field]: value };
    setFormData(prev => ({ ...prev, references: list }));
  };

  const toggleTraining = (training: string) => {
    const current = formData.mandatoryTrainings || [];
    if (current.includes(training)) {
      handleChange('mandatoryTrainings', current.filter((t: string) => t !== training));
    } else {
      handleChange('mandatoryTrainings', [...current, training]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert("Please fill in required fields (Name, Email, Phone).");
      return;
    }

    if (!formData.agreedSwornDeclaration) {
      alert("Please confirm the sworn accuracy declaration before submitting.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSaveApplication(applicant.id, formData);
      setIsSubmitting(false);
      setSubmittedSuccess(true);
    }, 1000);
  };

  const steps = [
    { num: 1, title: 'Personal Info' },
    { num: 2, title: 'Contact & Next of Kin' },
    { num: 3, title: 'Employment History' },
    { num: 4, title: 'Education & Training' },
    { num: 5, title: 'References & Reg' },
    { num: 6, title: 'Declaration & Signature' }
  ];

  if (submittedSuccess) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-emerald-100 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Application Form Submitted</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Your official Steward Health Care Application Form has been saved persistently in Supabase. Our compliance and administration team will review your details.
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <button
            onClick={() => setSubmittedSuccess(false)}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
          >
            Edit Application
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-purple-900 text-white text-xs font-bold rounded-xl hover:bg-purple-800 transition"
            >
              Return to Overview
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden my-4">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-2 py-0.5 rounded text-purple-200">
              Official Application Form
            </span>
            <h2 className="text-2xl font-bold mt-1">Steward Health Care Candidate Application</h2>
            <p className="text-xs text-purple-200 mt-1">
              Complete all sections accurately. All data persists securely in Supabase.
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition"
            >
              Close
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-6 gap-2 mt-6">
          {steps.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setCurrentStep(s.num)}
              className={`p-2 rounded-xl text-left transition ${
                currentStep === s.num
                  ? 'bg-white text-purple-950 font-bold shadow-md'
                  : currentStep > s.num
                  ? 'bg-purple-800/60 text-purple-200 font-semibold'
                  : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
              }`}
            >
              <div className="text-[10px] font-mono font-black uppercase">Step {s.num}</div>
              <div className="text-xs truncate">{s.title}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* STEP 1: Personal Info & Right to Work */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-purple-700" />
              1. Personal Details & Right to Work
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <select
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Miss">Miss</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold"
                  placeholder="First name and surname"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Also Known As (AKA)</label>
                <input
                  type="text"
                  value={formData.alsoKnownAs}
                  onChange={(e) => handleChange('alsoKnownAs', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="Maiden name or preferred alias"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) => handleChange('dob', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nationality *</label>
                <input
                  type="text"
                  required
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="British, Irish, Nigerian, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">National Insurance (NI) Number</label>
                <input
                  type="text"
                  value={formData.niNumber}
                  onChange={(e) => handleChange('niNumber', e.target.value.toUpperCase())}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                  placeholder="QQ 12 34 56 A"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">UK Right to Work Status *</label>
                <select
                  value={formData.rightToWorkStatus}
                  onChange={(e) => handleChange('rightToWorkStatus', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="UK/Irish Citizen">UK / Irish Citizen</option>
                  <option value="EU Settled Status">EU Settled / Pre-Settled Status</option>
                  <option value="Skilled Worker Visa">Skilled Worker Visa (Sponsorship)</option>
                  <option value="Student Visa">Student Visa (20 hrs limit)</option>
                  <option value="Indefinite Leave to Remain">Indefinite Leave to Remain (ILR)</option>
                  <option value="Other Valid Visa">Other Valid Work Visa</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Contact & Emergency Contact */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Phone className="w-4 h-4 text-purple-700" />
              2. Contact Information & Emergency Contact
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                  placeholder="candidate@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                  placeholder="07123 456789"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Postal Address *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="Street address, town, city"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Postcode *</label>
                <input
                  type="text"
                  required
                  value={formData.postcode}
                  onChange={(e) => handleChange('postcode', e.target.value.toUpperCase())}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono"
                  placeholder="SG6 1GJ"
                />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-800 border-t pt-4 mt-4">Emergency Contact & Next of Kin</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Next of Kin Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.emergencyName}
                  onChange={(e) => handleChange('emergencyName', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="Contact Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={formData.emergencyRelation}
                  onChange={(e) => handleChange('emergencyRelation', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="Spouse, Parent, Sibling, Child"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.emergencyPhone}
                  onChange={(e) => handleChange('emergencyPhone', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="07... or 01..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Address</label>
                <input
                  type="text"
                  value={formData.emergencyAddress}
                  onChange={(e) => handleChange('emergencyAddress', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                  placeholder="Address if different"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Employment History */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-700" />
                3. Employment History (Most Recent First)
              </h3>
              <button
                type="button"
                onClick={addEmploymentRow}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Employer
              </button>
            </div>

            {formData.employmentHistory.map((emp: any, idx: number) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-purple-900 uppercase">
                    Employer #{idx + 1} {idx === 0 && '(Current / Most Recent)'}
                  </span>
                  {formData.employmentHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmploymentRow(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Employer / Company Name</label>
                    <input
                      type="text"
                      required
                      value={emp.employer}
                      onChange={(e) => handleEmploymentChange(idx, 'employer', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Organization Name"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Job Title / Role</label>
                    <input
                      type="text"
                      required
                      value={emp.role}
                      onChange={(e) => handleEmploymentChange(idx, 'role', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="e.g. Care Assistant / Nurse"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Start Date</label>
                    <input
                      type="text"
                      value={emp.startDate}
                      onChange={(e) => handleEmploymentChange(idx, 'startDate', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="MM/YYYY or Year"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">End Date (or Present)</label>
                    <input
                      type="text"
                      value={emp.endDate}
                      onChange={(e) => handleEmploymentChange(idx, 'endDate', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="MM/YYYY or Present"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Summary of Duties & Responsibilities</label>
                  <textarea
                    rows={2}
                    value={emp.duties}
                    onChange={(e) => handleEmploymentChange(idx, 'duties', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="Key responsibilities and care provision duties..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Reason for Leaving</label>
                    <input
                      type="text"
                      value={emp.reasonForLeaving}
                      onChange={(e) => handleEmploymentChange(idx, 'reasonForLeaving', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Career growth, relocation, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Notice Period Required</label>
                    <input
                      type="text"
                      value={emp.noticePeriod}
                      onChange={(e) => handleEmploymentChange(idx, 'noticePeriod', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Immediate, 1 week, 4 weeks"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 4: Education & Mandatory Training */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-700" />
                4. Education & Mandatory Training
              </h3>
              <button
                type="button"
                onClick={addEducationRow}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-100 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Education
              </button>
            </div>

            {formData.educationHistory.map((edu: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Institution / School</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => handleEducationChange(idx, 'institution', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="College or University"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Course / Qualification</label>
                  <input
                    type="text"
                    value={edu.course}
                    onChange={(e) => handleEducationChange(idx, 'course', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="NVQ Level 2 / BSc Nursing"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Year</label>
                  <input
                    type="text"
                    value={edu.year}
                    onChange={(e) => handleEducationChange(idx, 'year', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="2022"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Grade / Result</label>
                    <input
                      type="text"
                      value={edu.grade}
                      onChange={(e) => handleEducationChange(idx, 'grade', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Pass / First"
                    />
                  </div>
                  {formData.educationHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEducationRow(idx)}
                      className="text-rose-600 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <h4 className="text-xs font-bold text-slate-800 border-t pt-4 mt-4">Mandatory Healthcare Certifications Held</h4>
            <p className="text-[11px] text-slate-500">Select all mandatory training modules you have completed:</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {availableTrainings.map((t) => {
                const isChecked = (formData.mandatoryTrainings || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTraining(t)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                      isChecked
                        ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t}</span>
                    {isChecked ? <Check className="w-4 h-4 text-purple-700" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Professional Registrations & References */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-700" />
              5. Professional Registrations & References
            </h3>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Professional Body Registration (If applicable, e.g., Nurse NMC)</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Registration Body</label>
                  <input
                    type="text"
                    value={formData.registrationBody}
                    onChange={(e) => handleChange('registrationBody', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    placeholder="e.g. NMC / HCPC / SSSC"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">PIN / Registration Number</label>
                  <input
                    type="text"
                    value={formData.nmcPin}
                    onChange={(e) => handleChange('nmcPin', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                    placeholder="e.g. 12A3456E"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Expiry / Revalidation Date</label>
                  <input
                    type="date"
                    value={formData.nmcExpiry}
                    onChange={(e) => handleChange('nmcExpiry', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-800 pt-2">Professional References (At least 2 required)</h4>
            <p className="text-[11px] text-slate-500">Referees must be line managers or supervisors from healthcare employers.</p>

            {formData.references.map((ref: any, idx: number) => (
              <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-black text-purple-900 uppercase">
                  Referee #{idx + 1} ({idx === 0 ? 'Current Employer' : 'Previous Employer'})
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Referee Full Name *</label>
                    <input
                      type="text"
                      required
                      value={ref.name}
                      onChange={(e) => handleReferenceChange(idx, 'name', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Manager Name"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Job Title / Position *</label>
                    <input
                      type="text"
                      required
                      value={ref.role}
                      onChange={(e) => handleReferenceChange(idx, 'role', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="e.g. Clinical Director / Care Manager"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Organization / Hospital *</label>
                    <input
                      type="text"
                      required
                      value={ref.organization}
                      onChange={(e) => handleReferenceChange(idx, 'organization', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Care Home or NHS Trust"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={ref.email}
                      onChange={(e) => handleReferenceChange(idx, 'email', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="referee@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={ref.phone}
                      onChange={(e) => handleReferenceChange(idx, 'phone', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="01... or 07..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Relationship</label>
                    <input
                      type="text"
                      value={ref.relationship}
                      onChange={(e) => handleReferenceChange(idx, 'relationship', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      placeholder="Line Manager, Supervisor"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 6: Declarations & E-Signature */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-purple-700" />
              6. Declarations & Electronic Signature
            </h3>

            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-3 text-xs text-slate-700">
              <h4 className="font-bold text-purple-900 text-sm">Sworn Legal Statement & CQC Declaration</h4>
              <p>
                I hereby declare that the information provided in this application form is true, complete, and accurate to the best of my knowledge. I understand that any false statement or omission may result in disqualification or dismissal.
              </p>
              
              <div className="space-y-2 pt-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreedSwornDeclaration}
                    onChange={(e) => handleChange('agreedSwornDeclaration', e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-900 rounded border-slate-300 focus:ring-purple-900"
                  />
                  <span className="font-semibold text-slate-800">
                    I confirm that all details supplied are true and accurate. I consent to reference checks and DBS vetting.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreedCqcCompliance}
                    onChange={(e) => handleChange('agreedCqcCompliance', e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-purple-900 rounded border-slate-300 focus:ring-purple-900"
                  />
                  <span className="font-semibold text-slate-800">
                    I agree to comply with Care Quality Commission (CQC) regulations, clinical codes of conduct, and Steward Health Care operational guidelines.
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Electronic Signature (Type Full Legal Name) *</label>
                <input
                  type="text"
                  required
                  value={formData.signatureName}
                  onChange={(e) => handleChange('signatureName', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-serif italic text-purple-900 font-bold bg-purple-50/30"
                  placeholder="e.g. Johnathan Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Signature</label>
                <input
                  type="date"
                  required
                  value={formData.signatureDate}
                  onChange={(e) => handleChange('signatureDate', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="flex justify-between items-center border-t pt-4 mt-6">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.min(6, prev + 1))}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center gap-1 shadow"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving to Supabase...' : 'Submit Official Application'}</span>
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
