import React, { useState, useRef } from 'react';
import { Applicant, CVData } from '../types';
import { FileText, Plus, Trash2, Download, Save, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CVBuilderProps {
  applicant: Applicant;
  onSaveCVData: (applicantId: string, cvData: CVData) => void;
  onGeneratePDF: (applicantId: string, pdfBlob: Blob) => void;
}

export default function CVBuilder({ applicant, onSaveCVData, onGeneratePDF }: CVBuilderProps) {
  const [data, setData] = useState<CVData>(applicant.cvData || {
    personalDetails: { address: '', dob: '', nationality: '' },
    employmentHistory: [],
    qualifications: [],
    mandatoryTraining: [],
    skills: [],
    references: []
  });

  const cvRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true);

  const handlePersonalDetailsChange = (field: keyof CVData['personalDetails'], value: string) => {
    setData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [field]: value }
    }));
  };

  const addEmployment = () => {
    setData(prev => ({
      ...prev,
      employmentHistory: [...prev.employmentHistory, { company: '', role: '', startDate: '', endDate: '', duties: '' }]
    }));
  };

  const updateEmployment = (index: number, field: keyof CVData['employmentHistory'][0], value: string) => {
    const newHistory = [...data.employmentHistory];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setData(prev => ({ ...prev, employmentHistory: newHistory }));
  };

  const removeEmployment = (index: number) => {
    const newHistory = [...data.employmentHistory];
    newHistory.splice(index, 1);
    setData(prev => ({ ...prev, employmentHistory: newHistory }));
  };

  const addQualification = () => {
    setData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { institution: '', degree: '', year: '' }]
    }));
  };

  const updateQualification = (index: number, field: keyof CVData['qualifications'][0], value: string) => {
    const newQuals = [...data.qualifications];
    newQuals[index] = { ...newQuals[index], [field]: value };
    setData(prev => ({ ...prev, qualifications: newQuals }));
  };

  const removeQualification = (index: number) => {
    const newQuals = [...data.qualifications];
    newQuals.splice(index, 1);
    setData(prev => ({ ...prev, qualifications: newQuals }));
  };

  const updateArrayField = (field: 'mandatoryTraining' | 'skills', value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setData(prev => ({ ...prev, [field]: items }));
  };

  const addReference = () => {
    setData(prev => ({
      ...prev,
      references: [...prev.references, { name: '', contact: '', relation: '' }]
    }));
  };

  const updateReference = (index: number, field: keyof CVData['references'][0], value: string) => {
    const newRefs = [...data.references];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setData(prev => ({ ...prev, references: newRefs }));
  };

  const removeReference = (index: number) => {
    const newRefs = [...data.references];
    newRefs.splice(index, 1);
    setData(prev => ({ ...prev, references: newRefs }));
  };

  const handleSave = () => {
    onSaveCVData(applicant.id, data);
  };

  const generatePDF = async () => {
    if (!cvRef.current) return;
    setIsGenerating(true);
    try {
      // Create a cloned div for PDF generation to ensure it's visible and correctly styled
      const clone = cvRef.current.cloneNode(true) as HTMLDivElement;
      document.body.appendChild(clone);
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.width = '794px'; // A4 width at 96 DPI
      clone.style.backgroundColor = '#ffffff';

      const canvas = await html2canvas(clone, { scale: 2 });
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfBlob = pdf.output('blob');
      onGeneratePDF(applicant.id, pdfBlob);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-indigo-600" />
          CV Builder
        </h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsEditMode(!isEditMode)} 
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {isEditMode ? 'Preview Mode' : 'Edit Mode'}
          </button>
          <button 
            onClick={handleSave}
            className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center"
          >
            <Save className="w-4 h-4 mr-1" /> Save Draft
          </button>
          <button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isGenerating ? <span className="animate-pulse">Generating...</span> : <><Printer className="w-4 h-4 mr-1" /> Generate PDF</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Editor Side */}
        <div className={`p-6 border-r border-slate-100 h-[600px] overflow-y-auto ${!isEditMode ? 'hidden lg:block lg:opacity-50 lg:pointer-events-none' : ''}`}>
          <div className="space-y-6">
            <section>
              <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide border-b pb-1">Personal Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date of Birth</label>
                  <input type="date" value={data.personalDetails.dob} onChange={e => handlePersonalDetailsChange('dob', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nationality</label>
                  <input type="text" value={data.personalDetails.nationality} onChange={e => handlePersonalDetailsChange('nationality', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                  <input type="text" value={data.personalDetails.address} onChange={e => handlePersonalDetailsChange('address', e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3 border-b pb-1">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Employment History</h4>
                <button onClick={addEmployment} className="text-indigo-600 hover:text-indigo-800"><Plus className="w-4 h-4" /></button>
              </div>
              {data.employmentHistory.map((job, idx) => (
                <div key={idx} className="mb-4 p-3 border rounded-lg bg-slate-50 relative group">
                  <button onClick={() => removeEmployment(idx)} className="absolute top-2 right-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input type="text" placeholder="Company Name" value={job.company} onChange={e => updateEmployment(idx, 'company', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                    <input type="text" placeholder="Job Title" value={job.role} onChange={e => updateEmployment(idx, 'role', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                    <input type="text" placeholder="Start Date (e.g. Jan 2020)" value={job.startDate} onChange={e => updateEmployment(idx, 'startDate', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                    <input type="text" placeholder="End Date (e.g. Present)" value={job.endDate} onChange={e => updateEmployment(idx, 'endDate', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                  </div>
                  <textarea placeholder="Duties and Responsibilities..." value={job.duties} onChange={e => updateEmployment(idx, 'duties', e.target.value)} className="w-full p-1.5 text-sm border rounded h-16 resize-none" />
                </div>
              ))}
            </section>

            <section>
              <div className="flex justify-between items-center mb-3 border-b pb-1">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Qualifications</h4>
                <button onClick={addQualification} className="text-indigo-600 hover:text-indigo-800"><Plus className="w-4 h-4" /></button>
              </div>
              {data.qualifications.map((qual, idx) => (
                <div key={idx} className="mb-2 p-2 border rounded-lg bg-slate-50 relative group flex gap-2">
                  <input type="text" placeholder="Institution" value={qual.institution} onChange={e => updateQualification(idx, 'institution', e.target.value)} className="w-1/3 p-1.5 text-sm border rounded" />
                  <input type="text" placeholder="Degree/Certificate" value={qual.degree} onChange={e => updateQualification(idx, 'degree', e.target.value)} className="w-1/3 p-1.5 text-sm border rounded" />
                  <input type="text" placeholder="Year" value={qual.year} onChange={e => updateQualification(idx, 'year', e.target.value)} className="w-1/4 p-1.5 text-sm border rounded" />
                  <button onClick={() => removeQualification(idx)} className="text-rose-500 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </section>

            <section>
              <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide border-b pb-1">Mandatory Training & Skills</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mandatory Training (comma separated)</label>
                  <textarea value={data.mandatoryTraining.join(', ')} onChange={e => updateArrayField('mandatoryTraining', e.target.value)} className="w-full p-2 border rounded-lg text-sm h-16" placeholder="Manual Handling, First Aid, Safeguarding..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Skills (comma separated)</label>
                  <textarea value={data.skills.join(', ')} onChange={e => updateArrayField('skills', e.target.value)} className="w-full p-2 border rounded-lg text-sm h-16" placeholder="Medication Administration, Dementia Care..." />
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3 border-b pb-1">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">References</h4>
                <button onClick={addReference} className="text-indigo-600 hover:text-indigo-800"><Plus className="w-4 h-4" /></button>
              </div>
              {data.references.map((ref, idx) => (
                <div key={idx} className="mb-2 p-2 border rounded-lg bg-slate-50 relative group grid grid-cols-3 gap-2">
                  <input type="text" placeholder="Name" value={ref.name} onChange={e => updateReference(idx, 'name', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                  <input type="text" placeholder="Contact/Email" value={ref.contact} onChange={e => updateReference(idx, 'contact', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Relation" value={ref.relation} onChange={e => updateReference(idx, 'relation', e.target.value)} className="w-full p-1.5 text-sm border rounded" />
                    <button onClick={() => removeReference(idx)} className="text-rose-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>

        {/* Preview Side */}
        <div className={`bg-slate-200 p-4 sm:p-8 h-[600px] overflow-y-auto flex justify-center ${isEditMode ? 'hidden lg:flex' : 'flex'}`}>
          <div ref={cvRef} className="bg-white p-8 sm:p-12 shadow-md w-full max-w-[794px] min-h-[1123px] text-slate-900 font-sans" id="cv-document">
            {/* CV Content rendered here */}
            <header className="border-b-2 border-slate-800 pb-6 mb-6">
              <h1 className="text-4xl font-bold text-slate-900 mb-2 uppercase tracking-tighter">{applicant.name}</h1>
              <h2 className="text-xl font-medium text-indigo-700 mb-4">{applicant.position}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600 font-medium">
                <span className="flex items-center">Email: {applicant.email}</span>
                <span className="flex items-center">Phone: {applicant.phone}</span>
                {data.personalDetails.address && <span className="flex items-center">Address: {data.personalDetails.address}</span>}
              </div>
            </header>

            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                {data.employmentHistory.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 mb-4 pb-1 uppercase tracking-wider">Employment History</h3>
                    <div className="space-y-5">
                      {data.employmentHistory.map((job, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className="font-bold text-slate-900 text-base">{job.role}</h4>
                            <span className="text-sm font-semibold text-slate-500 whitespace-nowrap ml-4">{job.startDate} - {job.endDate}</span>
                          </div>
                          <div className="text-indigo-600 font-medium text-sm mb-2">{job.company}</div>
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.duties}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {data.qualifications.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 mb-4 pb-1 uppercase tracking-wider">Qualifications</h3>
                    <div className="space-y-3">
                      {data.qualifications.map((qual, idx) => (
                        <div key={idx} className="flex justify-between items-baseline">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{qual.degree}</div>
                            <div className="text-slate-600 text-sm">{qual.institution}</div>
                          </div>
                          <div className="text-sm font-semibold text-slate-500">{qual.year}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-8">
                {(data.personalDetails.dob || data.personalDetails.nationality) && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 mb-4 pb-1 uppercase tracking-wider">Personal</h3>
                    <ul className="text-sm space-y-2 text-slate-700">
                      {data.personalDetails.dob && <li><span className="font-semibold block">Date of Birth</span> {data.personalDetails.dob}</li>}
                      {data.personalDetails.nationality && <li><span className="font-semibold block">Nationality</span> {data.personalDetails.nationality}</li>}
                    </ul>
                  </section>
                )}

                {data.skills.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 mb-4 pb-1 uppercase tracking-wider">Skills</h3>
                    <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                      {data.skills.map((skill, idx) => <li key={idx}>{skill}</li>)}
                    </ul>
                  </section>
                )}

                {data.mandatoryTraining.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 mb-4 pb-1 uppercase tracking-wider">Training</h3>
                    <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1">
                      {data.mandatoryTraining.map((training, idx) => <li key={idx}>{training}</li>)}
                    </ul>
                  </section>
                )}

                {data.references.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 mb-4 pb-1 uppercase tracking-wider">References</h3>
                    <div className="space-y-3">
                      {data.references.map((ref, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="font-bold text-slate-900">{ref.name}</div>
                          <div className="text-slate-600">{ref.relation}</div>
                          <div className="text-slate-500">{ref.contact}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
