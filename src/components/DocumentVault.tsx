import React, { useState } from 'react';
import { Document, DocumentCategory, Staff } from '../types';
import { Search, FileText, Upload, Plus, Users, Compass, Download, ShieldCheck, Check, Trash } from 'lucide-react';

interface DocumentVaultProps {
  documents: Document[];
  staff: Staff[];
  onUploadDocument: (doc: Omit<Document, 'id' | 'uploadDate'>) => void;
  onAssignDocument: (staffId: string, docCategory: DocumentCategory, docName: string) => void;
  onDeleteDocument: (docId: string) => void;
}

export default function DocumentVault({
  documents,
  staff,
  onUploadDocument,
  onAssignDocument,
  onDeleteDocument
}: DocumentVaultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Assignment states
  const [assignTargetStaffId, setAssignTargetStaffId] = useState('');
  const [assignTemplateCategory, setAssignTemplateCategory] = useState<DocumentCategory>('Employment Contract');
  const [assignMessage, setAssignMessage] = useState('');

  // Filtering documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (doc.staffName && doc.staffName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories: DocumentCategory[] = [
    'Passport', 'DBS', 'Right To Work', 'Driving Licence', 'Utility Bill', 
    'CV', 'Employment Contract', 'Training Certificates', 'References', 
    'Job Description', 'Privacy Policy', 'Staff Handbook'
  ];

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetStaffId) return;

    const targetStaff = staff.find(s => s.id === assignTargetStaffId);
    if (!targetStaff) return;

    const filename = `SHC_${assignTemplateCategory.replace(' ', '_')}_Assignment.pdf`;
    onAssignDocument(targetStaff.id, assignTemplateCategory, filename);
    
    // Reset and success banner trigger
    setAssignMessage(`Successfully assigned ${assignTemplateCategory} to ${targetStaff.name}! It is now marked 'Pending Signature' on their profile.`);
    setTimeout(() => setAssignMessage(''), 4500);
    setAssignTargetStaffId('');
  };

  const getPreviewIconColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Signed': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'Expired': return 'text-rose-605 bg-rose-50 border-rose-100';
      default: return 'text-amber-600 bg-amber-50 border-amber-100';
    }
  };

  return (
    <div className="space-y-6" id="shc-vault-view">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">National Document Vault</h2>
          <p className="text-xs text-slate-500 font-medium">Coordinate agency-wide onboarding agreements and track upcoming credential lapses.</p>
        </div>
      </div>

      {assignMessage && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded-r-xl flex items-start space-x-3 shadow-sm transition-all animate-bounce">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span className="text-xs text-emerald-800 font-semibold">{assignMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Vault Directory, Right Assign Template form & Document Details panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Document Search & Directory Table */}
        <div className="lg:col-span-2 space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div className="relative shrink-0 w-full sm:w-64">
              <Search className="absolute inset-y-0 left-0 pl-3 h-5 w-5 text-slate-400 flex items-center pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents or staff..."
                className="pl-9 p-2 w-full border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
              />
            </div>

            <div className="flex items-center space-x-1 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-1 px-2 border border-slate-350 rounded-xl bg-slate-50 text-slate-705 text-xs focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs font-semibold">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Document File Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Staff Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setPreviewDoc(doc)}
                    className={`cursor-pointer transition-all hover:bg-slate-50/50 ${previewDoc?.id === doc.id ? 'bg-purple-50/40 border-l-2 border-l-purple-800' : ''}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800 flex items-center">
                      <FileText className="w-4 h-4 text-slate-400 mr-2" />
                      <span className="truncate max-w-[170px]">{doc.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{doc.category}</td>
                    <td className="px-4 py-3 text-slate-700">{doc.staffName || 'System Shared'}</td>
                    <td className="px-4 py-3">
                      <span className={`p-0.5 px-2 text-[9px] rounded-full border font-bold ${
                        doc.status === 'Approved' || doc.status === 'Signed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : doc.status === 'Awaiting Review' || doc.status === 'Pending Signature'
                          ? 'bg-amber-50 text-amber-800 border-amber-250'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-bold">
                      📂 No corresponding files stored in the cabinet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Dashboard Area: Assign template forms and dynamic inspect document */}
        <div className="space-y-6">
          
          {/* Form: Assign document template directly (Signature required) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4 bg-slate-50 rounded-lg p-2.5">
              <Users className="w-5 h-5 text-purple-850 shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800">Assign Regulatory File</h4>
                <p className="text-[10px] text-slate-500 font-semibold font-sans mt-0.5">Dispatches notifications require electronic signatures.</p>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase">Recipient Staff Member</label>
                <select
                  required
                  value={assignTargetStaffId}
                  onChange={(e) => setAssignTargetStaffId(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 bg-white text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="">Select Caregiver...</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase">Template Category Doc</label>
                <select
                  value={assignTemplateCategory}
                  onChange={(e) => setAssignTemplateCategory(e.target.value as any)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 bg-white text-xs focus:ring-1 focus:ring-purple-500"
                >
                  <option value="Employment Contract">Employment Contract (SHC SLA)</option>
                  <option value="Job Description">Associated Duties Job Description</option>
                  <option value="Privacy Policy">GDPR & Medical Privacy Policy</option>
                  <option value="Staff Handbook">Steward Health Staff Handbook</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!assignTargetStaffId}
                className="w-full py-2 bg-purple-900 override:hover:bg-purple-950 hover:bg-purple-950 font-bold transition rounded-lg text-white text-xs disabled:opacity-40 disabled:hover:bg-purple-900 cursor-pointer"
              >
                Dispatch E-Signature Request
              </button>
            </form>
          </div>

          {/* Quick inspect document preview box */}
          {previewDoc ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm font-semibold">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-4 text-xs font-black">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Selected Document Properties</span>
                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>

              <div className="flex flex-col items-center text-center p-3 border rounded-xl bg-slate-50/50">
                <div className={`p-4 rounded-full border mb-3 ${getPreviewIconColor(previewDoc.status)}`}>
                  <FileText className="w-8 h-8" />
                </div>
                <h4 className="text-slate-800 font-bold text-xs truncate max-w-full">{previewDoc.name}</h4>
                <p className="text-[10px] text-slate-500 mt-1">Category type: {previewDoc.category}</p>
                
                <div className="w-full pt-4 mt-4 border-t border-slate-150 text-[11px] space-y-2 text-left text-slate-700">
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-500">File owner:</span>
                    <span className="font-bold">{previewDoc.staffName || 'System'}</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-500">Stored date:</span>
                    <span>{previewDoc.uploadDate}</span>
                  </p>
                  <p className="flex justify-between font-medium">
                    <span className="text-slate-500">Certificate Status:</span>
                    <span className="font-bold text-slate-800 uppercase">{previewDoc.status}</span>
                  </p>
                  {previewDoc.expiryDate && (
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-500">Expiry date:</span>
                      <span className="text-slate-800 font-mono font-bold">{previewDoc.expiryDate}</span>
                    </p>
                  )}
                  {previewDoc.size && (
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-500">File weight:</span>
                      <span className="text-slate-400 font-mono">{previewDoc.size}</span>
                    </p>
                  )}
                </div>

                <div className="w-full mt-4 flex gap-2">
                  <button
                    onClick={() => { alert(`Downloading: ${previewDoc.name}`); }}
                    className="w-full inline-flex justify-center items-center py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs rounded-lg shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-1 text-slate-400" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 hover:bg-slate-100 p-5 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 font-semibold p-10 leading-normal">
              🔍 Select a document from the vault index table to preview properties, download file, or review signature timelines.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
