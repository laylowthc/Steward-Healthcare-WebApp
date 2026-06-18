import React, { useState } from 'react';
import { Staff, Document, DocumentCategory, ComplianceLevel } from '../types';
import { ArrowLeft, Mail, Phone, MapPin, Award, Shield, FileText, Upload, Check, AlertCircle, Calendar, RefreshCw } from 'lucide-react';

interface StaffProfileProps {
  staffMember: Staff | null;
  documents: Document[];
  onBack: () => void;
  onUpdateStaffDetails: (updatedStaff: Staff) => void;
  onUploadDocument: (doc: Omit<Document, 'id' | 'uploadDate'>) => void;
}

export default function StaffProfile({
  staffMember,
  documents,
  onBack,
  onUpdateStaffDetails,
  onUploadDocument
}: StaffProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Passport');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Profile Form States
  const [name, setName] = useState(staffMember?.name || '');
  const [phone, setPhone] = useState(staffMember?.phone || '');
  const [email, setEmail] = useState(staffMember?.email || '');
  const [address, setAddress] = useState(staffMember?.address || '');
  const [nmcPin, setNmcPin] = useState(staffMember?.nmcPin || '');
  const [nmcExpiry, setNmcExpiry] = useState(staffMember?.nmcExpiry || '');

  if (!staffMember) {
    return (
      <div className="bg-white p-8 text-center rounded-2xl border border-slate-100 shadow-md">
        <p className="text-slate-500 font-bold">No staff member selected.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-purple-900 rounded-lg text-white text-xs">Back to Directory</button>
      </div>
    );
  }

  // Filter documents belonging to this staff member
  const staffDocs = documents.filter(d => d.staffId === staffMember.id);

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStaffDetails({
      ...staffMember,
      name,
      phone,
      email,
      address,
      nmcPin: staffMember.role === 'Nurse' ? nmcPin : undefined,
      nmcExpiry: staffMember.role === 'Nurse' ? nmcExpiry : undefined,
    });
    setIsEditing(false);
  };

  const getComplianceFlag = (level: ComplianceLevel | 'Pending') => {
    switch (level) {
      case 'Compliant':
        return <span className="inline-flex items-center px-2 py-1.5 rounded-xl text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-250"><Check className="w-3.5 h-3.5 mr-1" /> Compliant</span>;
      case 'Expiring':
        return <span className="inline-flex items-center px-2 py-1.5 rounded-xl text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-250"><AlertCircle className="w-3.5 h-3.5 mr-1" /> Expiring Soon</span>;
      case 'Pending':
        return <span className="inline-flex items-center px-2 py-1.5 rounded-xl text-[10px] font-extrabold bg-indigo-50 text-indigo-805 border border-indigo-200"><Calendar className="w-3.5 h-3.5 mr-1" /> Pending review</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1.5 rounded-xl text-[10px] font-extrabold bg-rose-50 text-rose-800 border border-rose-250"><AlertCircle className="w-3.5 h-3.5 mr-1" /> Non-Compliant</span>;
    }
  };

  // Quick state togglers to make prototyping satisfying
  const toggleDBSCorrection = () => {
    const isCompliant = staffMember.dbsStatus === 'Compliant';
    onUpdateStaffDetails({
      ...staffMember,
      dbsStatus: isCompliant ? 'Non-Compliant' : 'Compliant',
      dbsExpiry: isCompliant ? '2026-05-15' : '2029-06-18',
      status: !isCompliant && staffMember.trainingStatus === 'Compliant' ? 'Active' : staffMember.status
    });
  };

  const toggleTrainingCorrection = () => {
    const isCompliant = staffMember.trainingStatus === 'Compliant';
    onUpdateStaffDetails({
      ...staffMember,
      trainingStatus: isCompliant ? 'Non-Compliant' : 'Compliant',
      trainingExpiry: isCompliant ? '2026-06-10' : '2027-04-12',
      status: !isCompliant && staffMember.dbsStatus === 'Compliant' ? 'Active' : staffMember.status
    });
  };

  // Mock upload simulator
  const handleFileUpload = (fileName: string, fileSize: string) => {
    setUploadProgress(10);
    // Simulate step progress increments
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          onUploadDocument({
            name: `${staffMember.name.replace(' ', '_')}_${uploadCategory.replace(' ', '_')}.pdf`,
            category: uploadCategory,
            staffId: staffMember.id,
            staffName: staffMember.name,
            status: 'Awaiting Review',
            size: fileSize
          });
          setTimeout(() => setUploadProgress(null), 1000);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    }
  };

  return (
    <div className="space-y-6" id="shc-staff-profile">
      {/* Back button and profile headers */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 p-1 text-xs font-bold text-slate-600 hover:text-purple-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to staff directory</span>
        </button>
        <div className="space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 border border-slate-205 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition bg-white"
          >
            {isEditing ? 'Discard Changes' : 'Edit Personal Profile'}
          </button>
        </div>
      </div>

      {/* Staff Header Board */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-2xl bg-purple-100 text-purple-900 border border-slate-200 flex items-center justify-center font-black text-2xl uppercase shadow-inner">
              {staffMember.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">{staffMember.name}</h2>
                <span className="p-1 px-2.5 rounded-full bg-slate-100 border text-[10px] font-bold text-slate-600">
                  ID: {staffMember.id}
                </span>
              </div>
              <p className="text-sm font-semibold text-purple-800 mt-1">{staffMember.role}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Roster state block */}
            <div className="text-xs text-right mt-1 mr-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase">ROSTER PERMISSION</span>
              {staffMember.status === 'Active' ? (
                <span className="font-extrabold text-emerald-700 text-sm flex items-center mt-0.5 justify-end">
                  🟢 Deployable Active
                </span>
              ) : (
                <span className="font-extrabold text-rose-700 text-sm flex items-center mt-0.5 justify-end">
                  🔴 Suspended
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal and Professional details editable */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <h3 className="text-sm font-black uppercase text-slate-550 border-b border-slate-100 pb-2 mb-4 tracking-wider">
              Profile Information
            </h3>

            {!isEditing ? (
              <div className="space-y-4">
                {/* Personal Information */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase mb-2">Personal contact</h4>
                  <div className="space-y-2.5 text-xs text-slate-800">
                    <p className="flex items-center font-medium">
                      <Mail className="w-4 h-4 mr-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{staffMember.email}</span>
                    </p>
                    <p className="flex items-center font-medium">
                      <Phone className="w-4 h-4 mr-2.5 text-slate-400 shrink-0" />
                      <span>{staffMember.phone}</span>
                    </p>
                    <p className="flex items-start font-medium">
                      <MapPin className="w-4 h-4 mr-2.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{staffMember.address}</span>
                    </p>
                  </div>
                </div>

                {/* Professional details */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase mb-2">Accreditations & Registry</h4>
                  <div className="space-y-2 text-xs text-slate-800">
                    <p className="flex justify-between font-semibold">
                      <span className="text-slate-500">Designation Role:</span>
                      <span>{staffMember.role}</span>
                    </p>
                    {staffMember.role === 'Nurse' && (
                      <>
                        <p className="flex justify-between font-semibold">
                          <span className="text-slate-500 flex items-center"><Award className="w-4 h-4 mr-1 text-indigo-500" /> NMC PIN:</span>
                          <span className="font-mono bg-indigo-50 px-1.5 rounded">{staffMember.nmcPin}</span>
                        </p>
                        <p className="flex justify-between font-medium">
                          <span className="text-slate-500">NMC Expiry Date:</span>
                          <span className={`${new Date(staffMember.nmcExpiry || '').getTime() < new Date().getTime() + (30*86400000) ? 'text-rose-600 font-bold' : ''}`}>
                            {staffMember.nmcExpiry}
                          </span>
                        </p>
                      </>
                    )}
                    <p className="flex justify-between font-medium">
                      <span className="text-slate-500">Joined Agency:</span>
                      <span>{staffMember.joinedDate}</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Home Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                {staffMember.role === 'Nurse' && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">NMC PIN</label>
                      <input
                        type="text"
                        required
                        value={nmcPin}
                        onChange={(e) => setNmcPin(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">NMC Expiry</label>
                      <input
                        type="date"
                        required
                        value={nmcExpiry}
                        onChange={(e) => setNmcExpiry(e.target.value)}
                        className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="w-1/2 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-bold"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Demo Audit Shifters */}
          <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center">
              <Shield className="w-3.5 h-3.5 text-rose-700 mr-1 shrink-0" /> Interactive Demo Controls
            </h4>
            <p className="text-[11px] text-slate-600 mt-1 font-medium leading-normal">
              Toggle this candidate's accreditation status below to test dynamic agency metrics calculations in real-time.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2">
              <button
                onClick={toggleDBSCorrection}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition text-xs font-bold bg-white cursor-pointer ${
                  staffMember.dbsStatus === 'Compliant'
                    ? 'border-emerald-200 text-emerald-800 text-xs'
                    : 'border-rose-200 text-rose-800'
                }`}
              >
                <span>Enhanced DBS Registry</span>
                <span className="p-1 px-2 rounded-full border text-[9px] uppercase font-black tracking-wider flex items-center bg-slate-50">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" /> {staffMember.dbsStatus}
                </span>
              </button>

              <button
                onClick={toggleTrainingCorrection}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left border transition text-xs font-bold bg-white cursor-pointer ${
                  staffMember.trainingStatus === 'Compliant'
                    ? 'border-emerald-200 text-emerald-800'
                    : 'border-rose-200 text-rose-800'
                }`}
              >
                <span>Mandatory Nursing Training</span>
                <span className="p-1 px-2 rounded-full border text-[9px] uppercase font-black tracking-wider flex items-center bg-slate-50">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" /> {staffMember.trainingStatus}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Columns: Compliance traffic lights and document tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Traffic Lights Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <h3 className="text-sm font-black uppercase text-slate-550 border-b border-slate-100 pb-2 mb-4 tracking-wider">
              Safety Compliance Dashboard
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Enhanced DBS</span>
                <div className="mt-2.5 justify-center flex">{getComplianceFlag(staffMember.dbsStatus)}</div>
                <span className="block text-[9px] text-slate-500 font-bold mt-1.5 font-mono">{staffMember.dbsNumber || 'Lapsed'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Right to Work</span>
                <div className="mt-2.5 justify-center flex">{getComplianceFlag(staffMember.rightToWork)}</div>
                <span className="block text-[9px] text-slate-500 font-bold mt-1.5 font-mono">{staffMember.rightToWorkExpiry || 'N/A'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Mandatory Training</span>
                <div className="mt-2.5 justify-center flex">{getComplianceFlag(staffMember.trainingStatus)}</div>
                <span className="block text-[9px] text-slate-500 font-bold mt-1.5 font-mono">Exp: {staffMember.trainingExpiry || 'N/A'}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">NMC pin Accredit</span>
                <div className="mt-2.5 justify-center flex">
                  {staffMember.role === 'Nurse' 
                    ? getComplianceFlag(new Date(staffMember.nmcExpiry || '').getTime() > new Date().getTime() ? 'Compliant' : 'Non-Compliant')
                    : <span className="inline-flex px-2 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-100 border rounded">Exempt</span>}
                </div>
                <span className="block text-[9px] text-slate-500 font-bold mt-1.5 font-mono">{staffMember.nmcPin || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Documents vault for this user with upload triggers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-550 tracking-wider">
                  Accreditation File Vault
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Documents uploaded by staff or assigned by administrators.</p>
              </div>

              {/* Categorized selector during uploads */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-bold text-slate-500">Category:</span>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="p-1 px-2 border border-slate-300 rounded text-[11px] bg-slate-50 focus:outline-none"
                >
                  <option value="Passport">Passport File</option>
                  <option value="DBS">DBS Check</option>
                  <option value="Right To Work">Right To Work</option>
                  <option value="Driving Licence">Drivers Licence</option>
                  <option value="Utility Bill">Utility Invoice Address</option>
                  <option value="CV">Curriculum Vitae</option>
                  <option value="Employment Contract">Signed Contract</option>
                  <option value="Training Certificates">Accreditation Cert</option>
                  <option value="References">References</option>
                </select>
              </div>
            </div>

            {/* Visual drag and drop zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-5 mb-5 flex flex-col items-center justify-center text-center transition-all ${
                dragActive ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-50/50'
              }`}
            >
              {uploadProgress !== null ? (
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs font-semibold text-purple-700 mb-1">
                    <span>Uploading new {uploadCategory}...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-purple-800 h-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center group">
                  <Upload className="w-7 h-7 text-slate-400 group-hover:text-purple-700 transition" />
                  <span className="text-xs font-bold text-slate-800 mt-2 block">Upload File Attachment</span>
                  <span className="text-[10px] text-slate-505 block mt-0.5">Drag & drop your credentials pdf, png file, or click to browse</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        handleFileUpload(file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
                      }
                    }}
                  />
                </label>
              )}
            </div>

            {/* Active Document Lists */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="px-4 py-2.5 rounded-l-md">File Title</th>
                    <th className="px-4 py-2.5">Category Type</th>
                    <th className="px-4 py-2.5">Uploaded</th>
                    <th className="px-4 py-2.5">Status Check</th>
                    <th className="px-4 py-2.5 text-right rounded-r-md">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-800 flex items-center">
                        <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <span>{doc.name}</span>
                        {doc.assignedByAdmin && (
                          <span className="ml-1.5 p-0.5 px-1.5 text-[8px] font-bold bg-indigo-50 border border-indigo-150 rounded-full text-indigo-800">
                            ASSIGNED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{doc.category}</td>
                      <td className="px-4 py-3 text-slate-400 font-semibold">{doc.uploadDate}</td>
                      <td className="px-4 py-3">
                        <span className={`p-0.5 px-1.5 text-[9px] rounded-full font-bold border ${
                          doc.status === 'Approved' || doc.status === 'Signed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : doc.status === 'Awaiting Review' || doc.status === 'Pending Signature'
                            ? 'bg-amber-50 text-amber-800 border-amber-250'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert(`Downloading: ${doc.name}`); }}
                          className="text-purple-800 hover:text-purple-600 hover:underline font-bold text-[11px]"
                        >
                          Download Link
                        </a>
                      </td>
                    </tr>
                  ))}
                  {staffDocs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-semibold italic">
                        Empty Vault. Drag and drop credentials above to populate active files.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
