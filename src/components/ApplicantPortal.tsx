import React, { useState, useEffect } from 'react';
import { Applicant, RoleTemplate, Document, CVData, mapCredentialToCategory } from '../types';
import { Upload, FileText, CheckCircle, Clock, FileBadge, Eye, ExternalLink, X, RefreshCw } from 'lucide-react';
import CVBuilder from './CVBuilder';
import { getSignedUrlForDocument } from '../lib/supabase';

interface ApplicantPortalProps {
  applicant: Applicant;
  templates: RoleTemplate[];
  documents: Document[];
  onUploadDocument: (file: File, category: string) => void;
  onUpdateApplicantCompliance: (applicantId: string, complianceChecked: Record<string, 'Compliant' | 'Awaiting Review' | 'Missing'>) => void;
  onLogout: () => void;
  onSaveCVData?: (applicantId: string, cvData: CVData) => void;
  onGenerateCVPdf?: (applicantId: string, pdfBlob: Blob) => void;
}

export default function ApplicantPortal({
  applicant,
  templates,
  documents,
  onUploadDocument,
  onUpdateApplicantCompliance,
  onLogout,
  onSaveCVData,
  onGenerateCVPdf
}: ApplicantPortalProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cv'>('overview');

  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [resolvedViewingUrl, setResolvedViewingUrl] = useState<string | null>(null);
  const [isLoadingViewing, setIsLoadingViewing] = useState(false);

  useEffect(() => {
    let active = true;
    if (viewingFileUrl) {
      setIsLoadingViewing(true);
      getSignedUrlForDocument(viewingFileUrl).then(url => {
        if (active) {
          setResolvedViewingUrl(url);
          setIsLoadingViewing(false);
        }
      }).catch(err => {
        console.error("Error resolving viewing URL in applicant portal:", err);
        if (active) setIsLoadingViewing(false);
      });
    } else {
      setResolvedViewingUrl(null);
    }
    return () => {
      active = false;
    };
  }, [viewingFileUrl]);

  const jobTemplate = templates.find(t => t.role.toLowerCase() === applicant.position.toLowerCase()) || templates[0];
  const reqs = jobTemplate?.requiredCredentials || [];

  // Derive statusChecklist dynamically and exclusively from actual documents!
  const statusChecklist: Record<string, 'Compliant' | 'Awaiting Review' | 'Missing'> = {};
  reqs.forEach(req => {
    const dbCategory = mapCredentialToCategory(req);
    const applicantDocs = documents.filter(d => d.staffId === applicant.id);
    const doc = applicantDocs.find(d => d.category === dbCategory);
    if (doc) {
      if (doc.status === 'Approved') {
        statusChecklist[req] = 'Compliant';
      } else {
        statusChecklist[req] = 'Awaiting Review';
      }
    } else {
      statusChecklist[req] = 'Missing';
    }
  });

  const handleUpload = async () => {
    if (!uploadFile) return;
    
    if (!uploadCategory) {
      alert("Please select a document category.");
      return;
    }

    setIsUploading(true);
    // Map to database-compliant category to prevent database constraint violations
    const mappedCategory = mapCredentialToCategory(uploadCategory);
    
    setTimeout(() => {
      onUploadDocument(uploadFile, mappedCategory);
      setUploadFile(null);
      setUploadCategory('');
      setIsUploading(false);
    }, 1500);
  };

  const applicantDocs = documents.filter(d => d.staffId === applicant.id);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Applicant Portal</h1>
          <p className="text-xs text-slate-500">Welcome, {applicant.name}</p>
        </div>
        <div className="flex space-x-3 items-center">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('cv')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'cv' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              CV Builder
            </button>
          </div>
          <button 
            onClick={onLogout}
            className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded hover:bg-rose-100 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        
        {activeTab === 'overview' ? (
          <>
            {/* Progress Tracker */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Application Progress
          </h2>
          <div className="flex items-center space-x-2 text-xs">
            {['Applied', 'Screening', 'Interview', 'Compliance', 'Active'].map((stage, idx) => {
              const stages = ['Applied', 'Screening', 'Interview', 'Compliance', 'Active'];
              const currentIdx = stages.indexOf(applicant.status);
              const isPast = idx <= currentIdx;
              const isCurrent = stage === applicant.status;
              
              return (
                <React.Fragment key={stage}>
                  <div className={`px-3 py-1.5 rounded-full font-bold border ${isCurrent ? 'bg-purple-100 text-purple-800 border-purple-300' : isPast ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    {stage}
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`h-0.5 w-8 ${isPast ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Required Documents Checklist */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-rose-600" />
              Required Documentation
            </h2>
            <p className="text-xs text-slate-500 mb-4">Please upload the following required documents to move your application to the next stage.</p>
            
            <div className="space-y-3">
              {reqs.map(req => {
                const status = statusChecklist[req] || 'Missing';
                return (
                  <div key={req} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50">
                    <span className="text-xs font-bold text-slate-700">{req}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      status === 'Compliant' ? 'bg-emerald-100 text-emerald-800' :
                      status === 'Awaiting Review' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upload Widget */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-600" />
              Upload Document
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Document Category</label>
                <select 
                  value={uploadCategory} 
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Choose Category --</option>
                  {reqs.map(req => (
                    <option key={req} value={req}>{req}</option>
                  ))}
                  <option value="CV">CV / Resume</option>
                  <option value="Other">Other Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select File (PDF, IMG)</label>
                <input 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-xs file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-lg p-1"
                />
              </div>

              <button 
                onClick={handleUpload}
                disabled={!uploadFile || !uploadCategory || isUploading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            </div>
          </section>
        </div>

        {/* Uploaded Documents List */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            My Submitted Documents
          </h2>
          
          {applicantDocs.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No documents uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {applicantDocs.map(doc => (
                <div key={doc.id} className="p-3 border border-slate-200 rounded-xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{doc.category}</span>
                    <h3 className="text-xs font-bold text-slate-800 mt-1 truncate">{doc.name}</h3>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      {doc.fileUrl && (
                        <button
                          onClick={() => setViewingFileUrl(doc.fileUrl)}
                          className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-bold border border-indigo-100 cursor-pointer flex items-center gap-0.5"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          View
                        </button>
                      )}
                      <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                        doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                        doc.status === 'Awaiting Review' ? 'bg-amber-50 text-amber-700' :
                        'bg-rose-50 text-rose-700'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </>
        ) : (
          <CVBuilder 
            applicant={applicant} 
            onSaveCVData={(id, data) => onSaveCVData && onSaveCVData(id, data)}
            onGeneratePDF={(id, blob) => onGenerateCVPdf && onGenerateCVPdf(id, blob)}
          />
        )}
      </main>

      {viewingFileUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Document Viewer</h3>
              </div>
              <div className="flex items-center space-x-2">
                {resolvedViewingUrl && (
                  <a
                    href={resolvedViewingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 px-2 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors flex items-center gap-1 font-bold text-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in New Tab</span>
                  </a>
                )}
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
              {isLoadingViewing ? (
                <div className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200 flex flex-col items-center justify-center p-4 gap-2">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Generating secure private URL...</span>
                </div>
              ) : resolvedViewingUrl ? (
                viewingFileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <div className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center p-4">
                    <img 
                      src={resolvedViewingUrl} 
                      alt="Document Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <iframe 
                    src={resolvedViewingUrl} 
                    className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200"
                    title="Document Viewer"
                  />
                )
              ) : (
                <div className="w-full h-full rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center p-4 text-slate-500 font-semibold text-xs">
                  Failed to generate secure viewing URL.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
