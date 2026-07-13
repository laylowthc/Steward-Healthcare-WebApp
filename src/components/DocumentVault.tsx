import React, { useState, useRef } from 'react';
import { Document, DocumentCategory, Staff } from '../types';
import { Search, FileText, Upload, Plus, Users, Compass, Download, ShieldCheck, Check, Trash, Eye, X, Mail, RefreshCw, ExternalLink } from 'lucide-react';
import InteractiveDocumentFiller from './InteractiveDocumentFiller';
import { downloadFile } from '../lib/downloadFile';

interface DocumentVaultProps {
  documents: Document[];
  staff: Staff[];
  onUploadDocument: (doc: Omit<Document, 'id' | 'uploadDate'>, file?: File) => void;
  onAssignDocument: (staffId: string, docCategory: DocumentCategory, docName: string) => void;
  onDeleteDocument: (docId: string) => void;
  onUpdateDocument?: (doc: Document) => void;
}

export default function DocumentVault({
  documents,
  staff,
  onUploadDocument,
  onAssignDocument,
  onDeleteDocument,
  onUpdateDocument
}: DocumentVaultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [activeInspectorDoc, setActiveInspectorDoc] = useState<Document | null>(null);
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Passport');
  const [uploadTargetStaffId, setUploadTargetStaffId] = useState('');

  // Assignment states
  const [assignTargetStaffId, setAssignTargetStaffId] = useState('');
  const [assignTemplateCategory, setAssignTemplateCategory] = useState<DocumentCategory>('Employment Contract');
  const [assignMessage, setAssignMessage] = useState('');

  // Filtering documents
  const [activeTab, setActiveTab] = useState<'All' | 'Applicants' | 'Internal'>('All');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (doc.staffName && doc.staffName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;

    let matchesTab = true;
    const internalCat = ['Employment Contract', 'Privacy Policy', 'Staff Handbook', 'Job Description'];
    if (activeTab === 'Applicants') {
      matchesTab = !!doc.staffId && !internalCat.includes(doc.category);
    } else if (activeTab === 'Internal') {
      matchesTab = internalCat.includes(doc.category) || (!doc.staffId && doc.category !== 'CV');
    }

    return matchesSearch && matchesCategory && matchesTab;
  });

  const categories: DocumentCategory[] = [
    'Passport',
    'Right To Work',
    'DBS Certificate',
    'Driving Licence',
    'CV',
    'Employment Contract',
    'Job Description',
    'Nurse Profile',
    'Care Worker Profile',
    'Training Certificate',
    'Reference',
    'Timesheet',
    'Other'
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

  const handleFileUpload = () => {
    if (!uploadFile) return;

    const targetStaff = staff.find(s => s.id === uploadTargetStaffId);
    
    // Create an object URL so the file can be viewed in the browser natively
    const fileUrl = URL.createObjectURL(uploadFile);

    onUploadDocument({
      name: uploadFile.name,
      category: uploadCategory,
      staffId: targetStaff?.id,
      staffName: targetStaff?.name,
      status: 'Approved',
      size: `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB`,
      fileUrl: fileUrl,
    }, uploadFile);

    setUploadFile(null);
    setUploadCategory('Passport');
    setUploadTargetStaffId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        <div className="lg:col-span-2 space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          
          <div className="flex items-center space-x-1 border-b border-slate-100 mb-2">
            {[
              { id: 'All', label: 'All Documents' },
              { id: 'Applicants', label: 'Applicant Credentials' },
              { id: 'Internal', label: 'Internal Employment' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold transition-all relative ${activeTab === tab.id ? 'text-purple-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-t-full"></span>
                )}
              </button>
            ))}
          </div>

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
                        doc.status === 'Approved' || doc.status === 'Signed' || doc.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : doc.status === 'Sent' || doc.status === 'Opened' || doc.status === 'Pending Signature'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : doc.status === 'Awaiting Review'
                          ? 'bg-amber-50 text-amber-800 border-amber-250'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end items-center space-x-2">
                        {onUpdateDocument && (doc.status === 'Sent' || doc.status === 'Opened' || doc.status === 'Pending Signature') && (
                          <button
                            onClick={() => onUpdateDocument({ ...doc, status: 'Declined' })}
                            className="text-[9px] font-bold text-rose-500 hover:underline"
                          >
                            Decline
                          </button>
                        )}
                        {onUpdateDocument && (doc.status === 'Signed' || doc.status === 'Completed' || doc.status === 'Approved') && (
                          <button
                            onClick={() => onUpdateDocument({ ...doc, status: 'Expired' })}
                            className="text-[9px] font-bold text-amber-500 hover:underline"
                          >
                            Expire
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteDocument(doc.id)}
                          className="text-slate-400 hover:text-rose-600 transition ml-2"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
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
                  <option value="Other">Privacy Policy & Handbook (Other)</option>
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

          {/* Document Properties removed from sidebar. Replaced by slide-over modal. */}

          {/* Form: Upload custom document file to Vault */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4 bg-slate-50 rounded-lg p-2.5">
              <Upload className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800">Upload Local Document</h4>
                <p className="text-[10px] text-slate-500 font-semibold font-sans mt-0.5">Upload a PDF or document directly.</p>
              </div>
            </div>

            <div className="space-y-4">
               <div>
                  <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">Select File</label>
                  <input 
                    type="file" 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    ref={fileInputRef}
                    className="block w-full text-xs text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100 cursor-pointer"
                  />
               </div>
               <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase">Assign to Staff (Optional)</label>
                <select
                  value={uploadTargetStaffId}
                  onChange={(e) => setUploadTargetStaffId(e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 bg-white text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">System Admin / General</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
               </div>
               <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase">Category type</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="mt-1 block w-full border border-slate-300 rounded-lg p-2 bg-white text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
               </div>
               
               <button
                  type="button"
                  onClick={handleFileUpload}
                  disabled={!uploadFile}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 font-bold transition rounded-lg text-white text-xs disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer"
                >
                  Upload File to Vault
                </button>
            </div>
          </div>
        </div>

      </div>

      {previewDoc && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg border ${getPreviewIconColor(previewDoc.status)}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{previewDoc.name}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Document Management</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 px-3 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors flex items-center gap-1 font-bold text-xs"
              >
                <span>Close</span>
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              
              {/* Left Side: Preview */}
              <div className="flex-1 bg-slate-200/50 p-4 overflow-hidden flex flex-col relative">
                {previewDoc.fileUrl && (
                  <div className="absolute top-6 right-6 z-10">
                    <a
                      href={previewDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in New Tab
                    </a>
                  </div>
                )}
                {previewDoc.fileUrl && previewDoc.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <div className="w-full flex-1 rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-4">
                    <img 
                      src={previewDoc.fileUrl} 
                      alt="Document Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <iframe 
                    src={previewDoc.fileUrl || `data:text/html;charset=utf-8,%3Chtml%3E%3Cbody%20style%3D%22display%3Aflex%3Balign-items%3Acenter%3Bjustify-content%3Acenter%3Bfont-family%3Asans-serif%3Bcolor%3A%2364748b%3Bbackground%3A%23ffffff%3Bheight%3A100vh%3Bmargin%3A0%3B%22%3E%3Cdiv%20style%3D%22text-align%3Acenter%22%3E%3Ch2%3ENo%20Preview%20Available%3C%2Fh2%3E%3Cp%3EFile%20contents%20cannot%20be%20displayed.%3C%2Fp%3E%3C%2Fdiv%3E%3C%2Fbody%3E%3C%2Fhtml%3E`} 
                    className="w-full flex-1 rounded-xl bg-white shadow-sm border border-slate-200"
                    title="Document Viewer"
                  />
                )}
              </div>

              {/* Right Side: Details & Actions */}
              <div className="w-full lg:w-80 bg-white border-l border-slate-100 p-6 flex flex-col overflow-y-auto">
                <h4 className="text-xs font-black uppercase text-slate-800 mb-4 tracking-wider">Document Details</h4>
                
                <div className="space-y-4 text-xs mb-8">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Staff Owner</p>
                    <p className="font-semibold text-slate-800 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {previewDoc.staffName || 'System Shared'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Category</p>
                    <p className="font-semibold text-slate-800">{previewDoc.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Upload Date</p>
                    <p className="font-semibold text-slate-800">{previewDoc.uploadDate}</p>
                  </div>
                  {previewDoc.expiryDate && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Expiry Date</p>
                      <p className="font-semibold text-rose-600">{previewDoc.expiryDate}</p>
                    </div>
                  )}
                  {previewDoc.size && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">File Size</p>
                      <p className="font-semibold text-slate-800">{previewDoc.size}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Status</p>
                    <span className={`inline-block mt-1 p-1 px-2 text-[10px] rounded-md border font-bold ${getPreviewIconColor(previewDoc.status)}`}>
                      {previewDoc.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-800 mb-3 tracking-wider border-b border-slate-100 pb-2">Actions</h4>
                  <div className="space-y-2">
                    {previewDoc.status === 'Signed' && (
                      <button
                        onClick={() => {
                          setActiveInspectorDoc(previewDoc);
                          setPreviewDoc(null);
                        }}
                        className="w-full inline-flex justify-start items-center py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold rounded-lg transition-colors border border-purple-100"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Inspect E-Signature
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (previewDoc.fileUrl) {
                          setViewingFileUrl(previewDoc.fileUrl);
                        } else {
                          alert('No viewable file available.');
                        }
                      }}
                      className="w-full inline-flex justify-start items-center py-2 px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      <Eye className="w-4 h-4 mr-2 text-slate-500" />
                      View Full Screen
                    </button>

                    <button
                      onClick={() => { 
                        if (previewDoc.fileUrl) {
                          downloadFile(previewDoc.fileUrl, previewDoc.name);
                        } else {
                          alert(`Downloading: ${previewDoc.name}`); 
                        }
                      }}
                      className="w-full inline-flex justify-start items-center py-2 px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      <Download className="w-4 h-4 mr-2 text-slate-500" />
                      Download
                    </button>

                    <button
                      onClick={() => {
                        alert('Your default email client will open. Note: Browsers cannot attach files to emails automatically for security reasons. Please download the file first and attach it manually to the drafted email.');
                        window.location.href = `mailto:?subject=Document: ${previewDoc.name}&body=Please find the document attached. Note: The sender must manually attach the downloaded file.`;
                      }}
                      className="w-full inline-flex justify-start items-center py-2 px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                    >
                      <Mail className="w-4 h-4 mr-2 text-slate-500" />
                      Send via Email
                    </button>

                    <div className="relative mt-2">
                      <input 
                        type="file" 
                        title="Replace File"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            const newFile = e.target.files[0];
                            const fileUrl = URL.createObjectURL(newFile);
                            onUploadDocument({
                              ...previewDoc,
                              name: newFile.name,
                              size: `${(newFile.size / 1024 / 1024).toFixed(2)} MB`,
                              fileUrl: fileUrl,
                            }, newFile);
                            onDeleteDocument(previewDoc.id);
                            setPreviewDoc(null);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <button
                        className="w-full inline-flex justify-start items-center py-2 px-3 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                      >
                        <RefreshCw className="w-4 h-4 mr-2 text-slate-500" />
                        Replace
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onDeleteDocument(previewDoc.id);
                        setPreviewDoc(null);
                      }}
                      className="w-full inline-flex justify-start items-center py-2 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-lg transition-colors border border-rose-100 mt-4"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingFileUrl && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Document Viewer</h3>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={viewingFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 px-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1 font-bold text-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in New Tab</span>
                </a>
                <button 
                  onClick={() => setViewingFileUrl(null)}
                  className="p-1 px-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors flex items-center gap-1 font-bold text-xs"
                >
                  <span>Close</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200/50 p-4">
              {viewingFileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                <div className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-4">
                  <img 
                    src={viewingFileUrl} 
                    alt="Document Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <iframe 
                  src={viewingFileUrl} 
                  className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200"
                  title="Document Viewer"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {activeInspectorDoc && (() => {
        const matchingStaff = staff.find(s => s.id === activeInspectorDoc.staffId);
        if (matchingStaff) {
          return (
            <InteractiveDocumentFiller
              document={activeInspectorDoc}
              staffMember={matchingStaff}
              readOnly={true}
              onClose={() => setActiveInspectorDoc(null)}
              onSaveSignature={() => {}}
            />
          );
        }
        return null;
      })()}
    </div>
  );
}
