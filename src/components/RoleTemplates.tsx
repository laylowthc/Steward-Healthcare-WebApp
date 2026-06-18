import React, { useState, FormEvent } from 'react';
import { RoleTemplate, StaffRole } from '../types';
import { ClipboardList, Award, Copy, Plus, Trash, Edit, Check, X, ArrowUpRight } from 'lucide-react';

interface RoleTemplatesProps {
  templates: RoleTemplate[];
  onChangeTemplates: (newTemplates: RoleTemplate[]) => void;
}

export default function RoleTemplates({ templates, onChangeTemplates }: RoleTemplatesProps) {
  const [selectedRole, setSelectedRole] = useState<string>(templates[0]?.role || 'Nurse');
  const [successMsg, setSuccessMsg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form states for adding/editing templates
  const [formRole, setFormRole] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDutiesText, setFormDutiesText] = useState('');
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [customCredInput, setCustomCredInput] = useState('');

  const activeTemplate = templates.find(t => t.role === selectedRole) || templates[0];

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMsg('Copied template details to clipboard!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const standardCredentials = [
    'Enhanced DBS (on the Update Service)',
    'Valid Right to Work in the UK',
    'Active NMC Registration Sub-Part 1',
    'Level 3 Safeguarding Adults & Children',
    'Manual Handling and Basic Life Support training',
    'Core Care Certificate or NVQ level 2',
    'Medication Administration competency certificate',
    'First Aid & Fire Marshal Certifications',
    'NVQ Level 4/5 in Leadership and Management',
    'Proof of 2 Professional References',
    'Verified CV and Employment History'
  ];

  const startAddTemplate = () => {
    setFormRole('');
    setFormSalary('');
    setFormDesc('');
    setFormDutiesText('');
    setSelectedCredentials([
      'Enhanced DBS (on the Update Service)',
      'Valid Right to Work in the UK'
    ]);
    setIsAdding(true);
    setIsEditing(false);
  };

  const startEditTemplate = (template: RoleTemplate) => {
    setFormRole(template.role);
    setFormSalary(template.salaryRange);
    setFormDesc(template.description);
    setFormDutiesText(template.responsibilities.join('\n'));
    setSelectedCredentials(template.requiredCredentials);
    setIsEditing(true);
    setIsAdding(false);
  };

  const toggleCredentialCheckbox = (cred: string) => {
    if (selectedCredentials.includes(cred)) {
      setSelectedCredentials(selectedCredentials.filter(c => c !== cred));
    } else {
      setSelectedCredentials([...selectedCredentials, cred]);
    }
  };

  const handleAddCustomCredential = (e: FormEvent) => {
    e.preventDefault();
    if (!customCredInput.trim()) return;
    if (!selectedCredentials.includes(customCredInput.trim())) {
      setSelectedCredentials([...selectedCredentials, customCredInput.trim()]);
    }
    setCustomCredInput('');
  };

  const handleSaveTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!formRole || !formDesc) return;

    const parsedResponsibilities = formDutiesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const updatedTemplate: RoleTemplate = {
      role: formRole,
      salaryRange: formSalary || 'Negotiable SLA Rate',
      description: formDesc,
      responsibilities: parsedResponsibilities.length ? parsedResponsibilities : ['General shift duties as assigned.'],
      requiredCredentials: selectedCredentials
    };

    let nextTemplates = [...templates];

    if (isAdding) {
      // Check if role already exists
      if (templates.some(t => t.role.toLowerCase() === formRole.toLowerCase())) {
        alert('A role template with this title already exists. Please select another title or edit the existing one.');
        return;
      }
      nextTemplates.push(updatedTemplate);
      setSelectedRole(formRole);
      setSuccessMsg(`Successfully created new role template for ${formRole}!`);
    } else {
      // Editing existing
      nextTemplates = templates.map(t => t.role === selectedRole ? updatedTemplate : t);
      if (formRole !== selectedRole) {
        // If they renamed the role title
        setSelectedRole(formRole);
      }
      setSuccessMsg(`Successfully updated role template for ${formRole}!`);
    }

    onChangeTemplates(nextTemplates);
    setIsAdding(false);
    setIsEditing(false);
    setTimeout(() => setSuccessMsg(''), 4050);
  };

  const handleDeleteTemplate = (roleToDelete: string) => {
    if (templates.length <= 1) {
      alert('You must retain at least one job role template for system recruitment mapping.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the job role template for ${roleToDelete}? Applicants targeting this position will retain descriptions but default compliance guidelines.`)) {
      const remaining = templates.filter(t => t.role !== roleToDelete);
      onChangeTemplates(remaining);
      setSelectedRole(remaining[0].role);
      setSuccessMsg(`Deleted role template for ${roleToDelete}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-6" id="shc-templates-view">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Job Role & Compliance templates</h2>
          <p className="text-xs text-slate-500 font-medium font-sans">
            Input custom designations, descriptions, and required credentials that automatically synchronize with applicant profiles.
          </p>
        </div>
        {!isAdding && !isEditing && (
          <button
            onClick={startAddTemplate}
            className="inline-flex items-center space-x-1 px-3.5 py-2 bg-[#2D0B31] hover:bg-opacity-90 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role Template</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-r-md text-xs text-emerald-800 font-bold transition-all">
          ✓ {successMsg}
        </div>
      )}

      {/* Editor & Creation View Form */}
      {(isAdding || isEditing) ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-solid border-slate-100">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
              {isAdding ? 'Create Job Role Template' : `Edit Template: ${selectedRole}`}
            </h3>
            <button
              onClick={() => { setIsAdding(false); setIsEditing(false); }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveTemplate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 label-required">Job Title Designation</label>
                <input
                  type="text"
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-600 focus:outline-none"
                  placeholder="e.g., Lead Clinical Supervisor"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">Contract Pay Scale / Salary Range</label>
                <input
                  type="text"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-600 focus:outline-none"
                  placeholder="e.g., £24.00 - £30.00 / hour"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 label-required">Associated Job Description</label>
              <textarea
                required
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-purple-600 focus:outline-none leading-relaxed"
                placeholder="Describe the clinical or administrative purpose of this role within care environments..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Key Duties & General Responsibilities (One duty per line)</label>
              <textarea
                value={formDutiesText}
                onChange={(e) => setFormDutiesText(e.target.value)}
                rows={4}
                className="mt-1 block w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono focus:ring-1 focus:ring-purple-600 focus:outline-none"
                placeholder="Supervise nurse assistants&#10;Administer prescriptions accurately&#10;Audit physical logs"
              />
            </div>

            {/* Required Credentials Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Core Compliance Mandates / Required Documents
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-xl border">
                {standardCredentials.map((cred) => (
                  <div key={cred} className="flex items-start text-xs font-medium text-slate-705">
                    <input
                      type="checkbox"
                      id={`chk-${cred}`}
                      checked={selectedCredentials.includes(cred)}
                      onChange={() => toggleCredentialCheckbox(cred)}
                      className="mt-0.5 h-4 w-4 text-purple-900 border-slate-300 rounded"
                    />
                    <label htmlFor={`chk-${cred}`} className="ml-2 select-none text-slate-700 cursor-pointer">
                      {cred}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Credentials Add tag */}
            <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-100 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase text-purple-900">Add Custom Compliance Document Category</label>
                <input
                  type="text"
                  value={customCredInput}
                  onChange={(e) => setCustomCredInput(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-md p-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-purple-650"
                  placeholder="e.g., Hepatitis B Vaccination Proof"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCustomCredential}
                className="mt-5 sm:mt-0 p-2.5 bg-purple-900 hover:bg-purple-950 text-white font-bold text-xs rounded-lg shadow"
              >
                Insert Mandate
              </button>
            </div>

            <div className="pt-4 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                className="px-4 py-2 border border-slate-2D0 text-slate-700 font-semibold rounded-lg text-xs bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2D0B31] hover:bg-opacity-95 text-white font-bold rounded-lg text-xs shadow"
              >
                Save Template Registry
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Regular Selector and Detail View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Side: Designation Selector Cards */}
          <div className="lg:col-span-1 space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Steward Designations</span>
            
            <div className="space-y-2">
              {templates.map((temp) => (
                <button
                  key={temp.role}
                  onClick={() => setSelectedRole(temp.role)}
                  className={`w-full p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                    selectedRole === temp.role
                      ? 'bg-[#2D0B31] border-[#2D0B31] text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-750 hover:border-purple-200 hover:bg-slate-50'
                  }`}
                >
                  <h4 className="font-bold text-xs">{temp.role}</h4>
                  <p className={`text-[10px] mt-1 ${selectedRole === temp.role ? 'text-purple-200 font-medium' : 'text-slate-500'}`}>
                    {temp.salaryRange || 'Negotiable Rate'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Visualizing Active Template */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-md space-y-5 relative">
            {activeTemplate ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-solid border-slate-100 gap-2">
                  <div className="flex items-center space-x-2.5">
                    <ClipboardList className="w-5 h-5 text-[#2D0B31] shrink-0" />
                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                      Autostructure Profile targets: {activeTemplate.role}
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopyText(`${activeTemplate.role}\n${activeTemplate.salaryRange}\n${activeTemplate.description}\nRequired Documents:\n- ${activeTemplate.requiredCredentials.join('\n- ')}`)}
                      className="p-1 px-2 border hover:bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg flex items-center bg-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy Brief
                    </button>
                    <button
                      onClick={() => startEditTemplate(activeTemplate)}
                      className="p-1 px-2 border border-purple-200 bg-purple-50 text-purple-750 hover:bg-purple-100 text-[10px] font-bold rounded-lg flex items-center cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit Template
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(activeTemplate.role)}
                      className="p-1 px-2 border border-rose-250 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-bold rounded-lg flex items-center cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5 mr-1" /> Delete
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-indigo-800 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                    Salary Indicator: {activeTemplate.salaryRange}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50 p-4 rounded-xl border">
                    {activeTemplate.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Responsibilities list */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center pr-2">
                      <ArrowUpRight className="w-4 h-4 text-purple-800 mr-1 shrink-0" /> Key General Duties
                    </h4>
                    <ul className="space-y-2 text-xs font-medium text-slate-700 list-disc pl-4 leading-relaxed">
                      {activeTemplate.responsibilities.map((resp, idx) => (
                        <li key={idx}>{resp}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Required Credentials list */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-450 tracking-wider flex items-center pr-2">
                      <Award className="w-4 h-4 text-rose-700 mr-1 shrink-0" /> Core Compliance Mandates
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {activeTemplate.requiredCredentials.map((cred, idx) => (
                        <div key={idx} className="flex items-center space-x-2 p-2.5 bg-rose-50/40 border border-rose-100 rounded-xl text-xs font-semibold text-rose-900">
                          <span className="h-4 w-4 rounded-full bg-rose-100 text-[10px] font-extrabold flex items-center justify-center text-rose-800 shrink-0">
                            {idx + 1}
                          </span>
                          <span>{cred}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400 italic text-xs">
                Select or create a job template.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
