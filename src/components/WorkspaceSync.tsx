import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  CloudOff, 
  FileSpreadsheet, 
  HardDrive, 
  RefreshCw, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  Download, 
  Trash, 
  Upload, 
  Check, 
  AlertTriangle, 
  Plus, 
  ChevronRight, 
  Users, 
  Clock, 
  Settings, 
  Lock,
  ListFilter
} from 'lucide-react';
import { Applicant, Staff, Document, Timesheet, ActivityLog } from '../types';
import { 
  getOrCreateFolder, 
  listDriveFiles, 
  uploadFileToDrive, 
  createGoogleSpreadsheet, 
  updateSpreadsheetRange, 
  readSpreadsheetRange, 
  getSpreadsheetTabs, 
  GoogleDriveFile,
  extractSpreadsheetId 
} from '../lib/googleApi';
import GoogleMeetSchedulerView from './GoogleMeetSchedulerView';

interface WorkspaceSyncProps {
  applicants: Applicant[];
  staff: Staff[];
  documents: Document[];
  timesheets: Timesheet[];
  onAddApplicant: (applicant: Omit<Applicant, 'id' | 'dateCreated'>) => void;
  onUploadDocument: (doc: Omit<Document, 'id' | 'uploadDate'>) => void;
  onUpdateApplicantDetails: (id: string, fields: Partial<Applicant>) => void;
  onAddLog: (action: string, type: 'recruitment' | 'staff' | 'document' | 'compliance' | 'timesheet') => void;
}

export default function WorkspaceSync({
  applicants,
  staff,
  documents,
  timesheets,
  onAddApplicant,
  onUploadDocument,
  onUpdateApplicantDetails,
  onAddLog
}: WorkspaceSyncProps) {
  // OAuth Connection State Cached in Session/State
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return sessionStorage.getItem('shc_google_access_token');
  });
  const [clientId, setClientId] = useState<string>(() => {
    const metaEnv = (import.meta as any).env || {};
    return localStorage.getItem('shc_google_client_id') || metaEnv.VITE_GOOGLE_CLIENT_ID || '';
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'drive' | 'sheets_export' | 'sheets_import' | 'meetings'>('drive');

  // Persisted Google Meet Scheduled meetings
  const [meetings, setMeetings] = useState<{
    id: string;
    title: string;
    meetUrl: string;
    time: string;
    attendee: string;
    type: 'candidate' | 'staff' | 'general';
  }[]>(() => {
    const local = localStorage.getItem('shc_google_meet_meetings');
    return local ? JSON.parse(local) : [
      { id: 'm1', title: 'Senior Care Specialist Panel Interview', meetUrl: 'https://meet.google.com/abc-defg-hij', time: '2026-06-19T10:00', attendee: 'Eleanor Vance', type: 'candidate' },
      { id: 'm2', title: 'Internal Quality Assurance Review', meetUrl: 'https://meet.google.com/nrs-meet-xjp', time: '2026-06-20T14:30', attendee: 'All Care Staff (HR)', type: 'general' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('shc_google_meet_meetings', JSON.stringify(meetings));
  }, [meetings]);

  // Google Drive config
  const [driveFolderName, setDriveFolderName] = useState('Steward Health Care Onboarding Sandbox');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);
  
  // File Upload states
  const [isUploading, setIsUploading] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedVaultDocId, setSelectedVaultDocId] = useState('');

  // Sheets Export states
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [spreadsheetIdMap, setSpreadsheetIdMap] = useState<Record<string, string>>(() => {
    const local = localStorage.getItem('shc_spreadsheet_ids');
    return local ? JSON.parse(local) : {};
  });
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Sheets Import states
  const [importSpreadsheetUrl, setImportSpreadsheetUrl] = useState('');
  const [importIsLoading, setImportIsLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [discoveredTabs, setDiscoveredTabs] = useState<string[]>([]);
  const [selectedImportTab, setSelectedImportTab] = useState('');
  const [sheetPreviewRows, setSheetPreviewRows] = useState<any[][] | null>(null);
  
  // Custom Import Mapping state
  const [mappingNameIndex, setMappingNameIndex] = useState<number>(0);
  const [mappingEmailIndex, setMappingEmailIndex] = useState<number>(1);
  const [mappingPhoneIndex, setMappingPhoneIndex] = useState<number>(2);
  const [mappingPositionIndex, setMappingPositionIndex] = useState<number>(3);
  const [mappingStatusIndex, setMappingStatusIndex] = useState<number>(4);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  // -----------------------------------------------------------------
  // OAuth Popup Handler
  // -----------------------------------------------------------------
  useEffect(() => {
    // Sync spreadsheet IDs back to localStorage when they change
    localStorage.setItem('shc_spreadsheet_ids', JSON.stringify(spreadsheetIdMap));
  }, [spreadsheetIdMap]);

  useEffect(() => {
    // Listener for Google OAuth popup posting back the token
    const handleOauthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === 'GOOGLE_OAUTH_TOKEN') {
        const hash = event.data.hash;
        const params = new URLSearchParams(hash.substring(1)); // strip '#'
        const token = params.get('access_token');
        if (token) {
          setGoogleToken(token);
          sessionStorage.setItem('shc_google_access_token', token);
          onAddLog('Successfully authenticated Google Workspace secure liaison', 'document');
          setDriveError(null);
        }
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [onAddLog]);

  // Handle auto-refresh or listing files when connection exists
  useEffect(() => {
    if (googleToken) {
      syncDriveFolder();
    }
  }, [googleToken]);

  // -----------------------------------------------------------------
  // Action Helpers
  // -----------------------------------------------------------------
  
  const handleConnectGoogle = () => {
    if (!clientId.trim()) {
      alert('Please configure a valid Google Cloud Client ID in the credentials field first.');
      return;
    }
    
    // Save Client ID
    localStorage.setItem('shc_google_client_id', clientId.trim());
    setIsConnecting(true);

    const redirectUri = window.location.origin;
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/meetings.space.settings'
    ].join(' ');

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId.trim())}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=google_auth_state`;

    // Open popup
    const width = 500, height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      oauthUrl, 
      'GoogleOAuthPopup', 
      `width=${width},height=${height},left=${left},top=${top},status=yes,toolbar=no,menubar=no,location=yes`
    );
  };

  const handleDisconnectGoogle = () => {
    setGoogleToken(null);
    sessionStorage.removeItem('shc_google_access_token');
    setCurrentFolderId(null);
    setDriveFiles([]);
    onAddLog('De-registered and cleared local Google Workspace session token', 'document');
  };

  const syncDriveFolder = async () => {
    if (!googleToken) return;
    setIsDriveLoading(true);
    setDriveError(null);
    try {
      const folderId = await getOrCreateFolder(googleToken, driveFolderName);
      setCurrentFolderId(folderId);
      const files = await listDriveFiles(googleToken, folderId);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setDriveError('Authentication expired or permissions invalid. Please sign-in again.');
      setGoogleToken(null);
      sessionStorage.removeItem('shc_google_access_token');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleRefreshFiles = async () => {
    if (!googleToken || !currentFolderId) return;
    setIsDriveLoading(true);
    try {
      const files = await listDriveFiles(googleToken, currentFolderId, driveSearch);
      setDriveFiles(files);
    } catch (err) {
      setDriveError('Unable to update archive register.');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && googleToken && currentFolderId) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && googleToken && currentFolderId) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (rawFile: File) => {
    if (!googleToken || !currentFolderId) return;
    setIsUploading(true);
    try {
      const resFile = await uploadFileToDrive(googleToken, rawFile, rawFile.name, currentFolderId);
      
      // Update local file list
      setDriveFiles(prev => [resFile, ...prev]);
      
      // Register in system Document Vault
      onUploadDocument({
        name: rawFile.name,
        category: 'Training Certificates',
        status: 'Approved',
        staffName: 'Google Upload (Drive Linked)',
        expiryDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0], // 1 year
        size: `${(rawFile.size / 1024 / 1024).toFixed(2)} MB`
      });

      onAddLog(`Vault Archive: Directly uploaded file '${rawFile.name}' to Drive & indexed in local vault`, 'document');
    } catch (err) {
      alert('File upload to Drive failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Archive a local file from vault on Google Drive
  const handleArchiveVaultDoc = async () => {
    if (!selectedVaultDocId || !googleToken || !currentFolderId) return;
    const docToArchive = documents.find(d => d.id === selectedVaultDocId);
    if (!docToArchive) return;

    setIsUploading(true);
    try {
      // Since it's mockup data, upload a text log file containing file properties as metadata
      const simulatedBlob = new Blob([
        `Steward Health Care 247 Compliance Archive Log\n` +
        `-----------------------------------------\n` +
        `Document Name: ${docToArchive.name}\n` +
        `Category: ${docToArchive.category}\n` +
        `Staff Owner: ${docToArchive.staffName || 'Shared'}\n` +
        `Storage Upload Date: ${docToArchive.uploadDate}\n` +
        `Status: ${docToArchive.status}\n` +
        `Assigned Expiry Date: ${docToArchive.expiryDate || 'N/A'}\n`
      ], { type: 'text/plain' });

      const res = await uploadFileToDrive(
        googleToken, 
        simulatedBlob, 
        `SHC_Archived_${docToArchive.name.replace(/\.[^/.]+$/, "")}.txt`, 
        currentFolderId
      );

      // Add to files
      setDriveFiles(prev => [res, ...prev]);
      onAddLog(`System Document Vault: Pushed regulatory audit record '${docToArchive.name}' onto Google Drive`, 'document');
      setSelectedVaultDocId('');
      alert(`Success! File '${docToArchive.name}' safely archived to Drive.`);
    } catch (err) {
      alert('Archival failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete a file on Google Drive (Requires explicit confirmation guard)
  const handleDeleteDriveFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(
      `⚠️ ACTION CONSTRAINED: Are you sure you want to permanently delete the Google Drive file "${fileName}"?\n\nThis deletes the actual document outside the sandbox. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${googleToken}` },
      });
      if (!res.ok) throw new Error('File deletion failed');
      
      setDriveFiles(prev => prev.filter(f => f.id !== fileId));
      onAddLog(`Drive Sync: Permanent purge authorization issued for '${fileName}'`, 'document');
    } catch (err) {
      alert('Delete failed. The file may have already been deleted or write permissions revoked.');
    }
  };

  // -----------------------------------------------------------------
  // Google Sheets Export Operations
  // -----------------------------------------------------------------
  const handleExportToSheet = async (type: 'staff' | 'timesheets' | 'applicants') => {
    if (!googleToken) return;
    setIsExporting(type);
    setExportMessage(null);

    try {
      let sheetTitle = '';
      let values: any[][] = [];
      let range = 'Sheet1!A1';

      if (type === 'staff') {
        sheetTitle = 'SHC Healthcare Approved Roster';
        range = 'Approved Caregivers!A1';
        values = [
          ['Staff Register ID', 'Caregiver Name', 'Designated Position', 'Staff Email', 'Phone Contact', 'Roster Status', 'Total Hours Logged'],
          ...staff.map(s => {
            const calculatedHours = timesheets
              .filter(t => t.staffName === s.name && t.approvalStatus === 'Approved')
              .reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
            return [s.id, s.name, s.role, s.email, s.phone, s.status, `${calculatedHours} Hours`];
          })
        ];
      } else if (type === 'timesheets') {
        sheetTitle = 'SHC Timesheet Claims Payroll';
        range = 'Timesheet Audits!A1';
        values = [
          ['Timesheet ID', 'Registered Staff', 'Week Ending Date', 'Logged Hours worked', 'Approval Status'],
          ...timesheets.map(t => [t.id, t.staffName, t.weekEnding, t.hoursWorked, t.approvalStatus])
        ];
      } else if (type === 'applicants') {
        sheetTitle = 'Steward Recruiting & Candidate Pipeline';
        range = 'Pipeline Register!A1';
        values = [
          ['Candidate ID', 'Applicant Name', 'Email Identifier', 'Phone Contact', 'Position Targeted', 'Current Status', 'Registration Date'],
          ...applicants.map(a => [a.id, a.name, a.email, a.phone, a.position, a.status, a.dateCreated])
        ];
      }

      // Check if we already have an existing spreadsheet ID
      let currentSpreadsheetId = spreadsheetIdMap[type];
      if (!currentSpreadsheetId) {
        currentSpreadsheetId = await createGoogleSpreadsheet(googleToken, sheetTitle);
        setSpreadsheetIdMap(prev => ({
          ...prev,
          [type]: currentSpreadsheetId
        }));
      }

      // Since we just created it or have one, let's write to it
      // Standard writes to sheets automatically append or replace nicely
      await updateSpreadsheetRange(googleToken, currentSpreadsheetId, range, values);

      onAddLog(`Google Sheets Sync: Refreshed live workbook for ${sheetTitle} (ID: ${currentSpreadsheetId})`, 'document');
      setExportMessage(`Successfully synced database with live document: "${sheetTitle}"!`);
    } catch (err: any) {
      console.error(err);
      setExportMessage(`Sheet Export failed: Make sure spreadsheets scopes are fully authorized.`);
    } finally {
      setIsExporting(null);
    }
  };

  // -----------------------------------------------------------------
  // Google Sheets Mapping and Importing
  // -----------------------------------------------------------------
  const handleLoadSheetMetadata = async () => {
    if (!googleToken || !importSpreadsheetUrl.trim()) return;
    setImportIsLoading(true);
    setImportError(null);
    setDiscoveredTabs([]);
    setSheetPreviewRows(null);

    try {
      const spreadsheetId = extractSpreadsheetId(importSpreadsheetUrl);
      const tabs = await getSpreadsheetTabs(googleToken, spreadsheetId);
      
      if (tabs.length === 0) {
        throw new Error('No worksheets discovered in your spreadsheet workbook.');
      }
      
      setDiscoveredTabs(tabs);
      setSelectedImportTab(tabs[0]);
    } catch (err: any) {
      setImportError('Failed to pull sheet. Check if Sheet URL/ID is correct and shared.');
    } finally {
      setImportIsLoading(false);
    }
  };

  // Fetch range preview for selected sheet
  useEffect(() => {
    if (googleToken && selectedImportTab && importSpreadsheetUrl) {
      handleFetchTabPreview();
    }
  }, [selectedImportTab]);

  const handleFetchTabPreview = async () => {
    if (!googleToken) return;
    const spreadsheetId = extractSpreadsheetId(importSpreadsheetUrl);
    setImportIsLoading(true);
    setImportError(null);
    try {
      const rows = await readSpreadsheetRange(googleToken, spreadsheetId, `${selectedImportTab}!A1:Z12`);
      if (rows && rows.length > 0) {
        setSheetPreviewRows(rows);
      } else {
        setSheetPreviewRows(null);
        setImportError('Worksheet selected appears to contain zero active cells.');
      }
    } catch (err) {
      setImportError('Unable to extract tabular boundaries.');
    } finally {
      setImportIsLoading(false);
    }
  };

  const handleProcessImport = () => {
    if (!sheetPreviewRows || sheetPreviewRows.length <= 1) {
      alert('Preview row pool is empty. Populate cells before committing.');
      return;
    }

    // Process from Row 1 onwards (Assuming Row 0 contains Headers)
    const candidatesToImport = sheetPreviewRows.slice(1);
    let successCount = 0;

    candidatesToImport.forEach((row) => {
      const name = row[mappingNameIndex] || '';
      const email = row[mappingEmailIndex] || '';
      const phone = row[mappingPhoneIndex] || '';
      const position = row[mappingPositionIndex] || 'Registered Nurse';
      const statusInput = row[mappingStatusIndex] || 'Applied';

      if (name.trim()) {
        onAddApplicant({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          position: position.trim(),
          status: statusInput.trim() as any,
          complianceChecked: {}
        });
        successCount++;
      }
    });

    setImportSuccessCount(successCount);
    onAddLog(`Recruitment Sheets Import: Added ${successCount} candidates into core database roster`, 'recruitment');
    
    // Clear and reset
    setTimeout(() => {
      setImportSuccessCount(null);
      setSheetPreviewRows(null);
      setDiscoveredTabs([]);
      setImportSpreadsheetUrl('');
    }, 5000);
  };


  return (
    <div className="space-y-6" id="shc-google-workspace-hub">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 inline-flex items-center space-x-2">
            <Cloud className="w-6 h-6 text-indigo-600 animate-pulse" />
            <span>Google Workspace Operations Terminal</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Connect Steward Healthcare records directly to Google Drive repositories & synchronized Google Sheets audit workbooks.
          </p>
        </div>
      </div>

      {/* OAUTH CONNECT CONTROLLER PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>🎛️ liaison Identity Console</span>
            </h3>
            <p className="text-xs leading-normal text-slate-500">
              The AI Studio sandbox utilizes the official client ID credentials. Configure your client-id below to deploy active links in real-time.
            </p>
            <div className="pt-2">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                Google Client ID
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <input
                  type="text"
                  disabled={googleToken !== null}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="block w-full p-2 border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col sm:flex-row items-center sm:justify-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {googleToken ? (
              <div className="flex flex-col sm:flex-row items-center w-full gap-4 justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Workspace Authorized Successfully</p>
                    <p className="text-[10px] text-emerald-700 font-mono truncate max-w-[250px]">
                      Token ID: ya29.{googleToken.substring(0, 12)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={syncDriveFolder}
                    className="p-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer flex items-center space-x-1"
                    title="Refresh folder sync"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="p-2 px-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 cursor-pointer"
                  >
                    Clear Credentials
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center sm:items-end w-full text-center sm:text-right space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-50 border border-rose-100 p-1 px-2.5 rounded-full inline-flex items-center gap-1">
                    <CloudOff className="w-3 h-3" /> Offline Session
                  </span>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Connecting unlocks continuous spreadsheet sync & dynamic onboarding file back-ups.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-purple-900 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white p-2.5 px-5 hover:bg-purple-950 transition-all cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-purple-300" />
                  <span>Connect Google Workspace</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {googleToken && (
        <>
          {/* SECURE HUB PERSPECTIVES TABS */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => { setActiveTab('drive'); setExportMessage(null); }}
              className={`p-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'drive' 
                  ? 'border-indigo-600 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-505 hover:text-slate-800'
              }`}
            >
              📁 Google Drive Audit Backups
            </button>
            <button
              onClick={() => { setActiveTab('sheets_export'); setExportMessage(null); }}
              className={`p-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'sheets_export' 
                  ? 'border-indigo-600 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-550 hover:text-slate-800'
              }`}
            >
              📊 Google Sheets Database Exporter
            </button>
            <button
              onClick={() => { setActiveTab('sheets_import'); setExportMessage(null); }}
              className={`p-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'sheets_import' 
                  ? 'border-indigo-600 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-550 hover:text-slate-800'
              }`}
            >
              📥 Sheets Recruitment Importer
            </button>
            <button
              onClick={() => { setActiveTab('meetings'); setExportMessage(null); }}
              className={`p-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'meetings' 
                  ? 'border-indigo-600 text-indigo-700 font-extrabold' 
                  : 'border-transparent text-slate-550 hover:text-slate-800'
              }`}
            >
              🎥 Google Meet Scheduler
            </button>
          </div>

          <div id="workspace-tab-contents" className="space-y-6">
            {/* DRIVE AUDIT BACKUPS */}
            {activeTab === 'drive' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* File register and browsing */}
                <div className="lg:col-span-2 space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative">
                  
                  <div className="row flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-850">
                        Designated Folder: <span className="text-purple-900 font-bold">{driveFolderName}</span>
                      </h4>
                      <p className="text-[10px] text-slate-500">Live indexed documents in Google Drive for Steward Caregiver Audits.</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driveSearch}
                        onChange={(e) => setDriveSearch(e.target.value)}
                        placeholder="Filter drive files..."
                        className="p-1 px-2.5 border border-slate-300 rounded-lg text-xs placeholder-slate-400 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleRefreshFiles}
                        className="p-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 shrink-0 cursor-pointer"
                      >
                        Search
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto min-h-[250px]">
                    {isDriveLoading ? (
                      <div className="flex flex-col items-center justify-center p-14 space-y-2">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-xs text-slate-500">Retrieving drive indexes...</span>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-slate-100 text-xs font-semibold">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3">File Title</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Modified</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                          {driveFiles.map((file) => (
                            <tr key={file.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-semibold text-slate-800 flex items-center">
                                <FileText className="w-4 h-4 text-indigo-500 mr-2" />
                                <span className="truncate max-w-[200px]">{file.name}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-500 truncate max-w-[120px]">{file.mimeType.split('.').pop()}</td>
                              <td className="px-4 py-3 text-slate-550">{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Just now'}</td>
                              <td className="px-4 py-3 text-right space-x-2">
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 px-2.5 inline-flex items-center gap-1 border border-slate-300 bg-white hover:bg-slate-50 rounded text-[10px] text-slate-700 font-bold"
                                  >
                                    View <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleDeleteDriveFile(file.id, file.name)}
                                  className="text-slate-405 hover:text-rose-600 p-1"
                                >
                                  <Trash className="w-3.5 h-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {driveFiles.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-16 text-center text-slate-400 font-bold">
                                📂 Drive Directory is currently empty. Try uploading some files!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                </div>

                {/* File Dispatch & Archivist */}
                <div className="space-y-6">
                  {/* Local Compliance archivist pushes directly to Drive list */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4 bg-slate-50 rounded-lg p-2.5">
                      <HardDrive className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-xs font-black uppercase text-slate-850">Local Vault Archivist</h4>
                        <p className="text-[10px] text-slate-500">Secure record copy uploads directly to GDrive folders.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">Select Vault Target Document</label>
                        <select
                          value={selectedVaultDocId}
                          onChange={(e) => setSelectedVaultDocId(e.target.value)}
                          className="mt-1 block w-full border border-slate-300 rounded-lg p-2 bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Select Local Certificate...</option>
                          {documents.map(d => (
                            <option key={d.id} value={d.id}>
                              [{d.category}] {d.name} ({d.staffName || 'System'})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleArchiveVaultDoc}
                        disabled={!selectedVaultDocId || isUploading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                      >
                        {isUploading ? 'Transferring File...' : 'Archive to Google Drive'}
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop area */}
                  <div 
                    ref={dragRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`bg-white p-6 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center min-h-[200px] transition-all ${
                      isDragOver 
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-800Scale' 
                        : 'border-slate-200 hover:border-indigo-300 text-slate-400'
                    }`}
                  >
                    <Upload className="w-8 h-8 text-slate-400 mb-3 animate-bounce" />
                    <p className="text-xs font-bold text-slate-800">Drag & Drop Compliance File</p>
                    <p className="text-[10px] text-slate-500 mt-1">Upload anything (PDF, certificates, utility bills) directly to Drive folder.</p>
                    
                    <div className="mt-4">
                      <label className="p-2 px-5 bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer transition">
                        Browse Files
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        />
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SHEETS DATABASE EXPORTER */}
            {activeTab === 'sheets_export' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Spreadsheet Synchronization Portal</h3>
                  <p className="text-xs text-slate-500-weight mt-1">
                    Spawn and refresh distinct Google Sheets tables compiled dynamically from live application data state.
                  </p>
                </div>

                {exportMessage && (
                  <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 font-semibold text-xs rounded-r-lg">
                    {exportMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Export Staff */}
                  <div className="p-5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between hover:shadow-sm">
                    <div>
                      <div className="p-2.5 bg-purple-50 text-purple-900 rounded-lg border border-purple-100 w-10 h-10 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-purple-900" />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#2D0B31] text-left">Staff Member Directory</h4>
                      <p className="text-[11px] text-slate-650 mt-1 lines-clamp-2 leading-relaxed">
                        Compiles hired caregivers, phone numbers, NHS status, and cumulative logged hours records.
                      </p>
                    </div>
                    <div className="mt-6 space-y-3 pt-3 border-t border-slate-150">
                      {spreadsheetIdMap['staff'] ? (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">✓ Linked Live Sheet</span>
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetIdMap['staff']}`}
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 font-bold hover:underline"
                          >
                            Open Link
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Synced on Drive</span>
                      )}
                      
                      <button
                        onClick={() => handleExportToSheet('staff')}
                        disabled={isExporting !== null}
                        className="w-full py-2 bg-purple-900 override:hover:bg-purple-950 hover:bg-purple-950 font-bold text-white text-xs rounded-lg transition text-center cursor-pointer"
                      >
                        {isExporting === 'staff' ? 'Exporting...' : (spreadsheetIdMap['staff'] ? 'Refresh Active Sheet' : 'Spawn Live Google Sheet')}
                      </button>
                    </div>
                  </div>

                  {/* Export Timesheets */}
                  <div className="p-5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between hover:shadow-sm">
                    <div>
                      <div className="p-2.5 bg-blue-50 text-blue-900 rounded-lg border border-blue-100 w-10 h-10 flex items-center justify-center mb-3">
                        <Clock className="w-5 h-5 text-blue-900" />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#2D0B31] text-left">Timesheet Audit & Claims</h4>
                      <p className="text-[11px] text-slate-650 mt-1 lines-clamp-2 leading-relaxed">
                        Consolidates caregiver shift records, total hours worked, approvals, and supervisor indexes.
                      </p>
                    </div>
                    <div className="mt-6 space-y-3 pt-3 border-t border-slate-150">
                      {spreadsheetIdMap['timesheets'] ? (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">✓ Linked Live Sheet</span>
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetIdMap['timesheets']}`}
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 font-bold hover:underline"
                          >
                            Open Link
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Synced on Drive</span>
                      )}
                      
                      <button
                        onClick={() => handleExportToSheet('timesheets')}
                        disabled={isExporting !== null}
                        className="w-full py-2 bg-purple-900 override:hover:bg-purple-950 hover:bg-purple-950 font-bold text-white text-xs rounded-lg transition text-center cursor-pointer"
                      >
                        {isExporting === 'timesheets' ? 'Exporting...' : (spreadsheetIdMap['timesheets'] ? 'Refresh Active Sheet' : 'Spawn Live Google Sheet')}
                      </button>
                    </div>
                  </div>

                  {/* Export Applicants */}
                  <div className="p-5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col justify-between hover:shadow-sm">
                    <div>
                      <div className="p-2.5 bg-indigo-50 text-indigo-900 rounded-lg border border-indigo-100 w-10 h-10 flex items-center justify-center mb-3">
                        <Plus className="w-5 h-5 text-indigo-900" />
                      </div>
                      <h4 className="text-sm font-extrabold text-[#2D0B31] text-left">Registered Recruitment Pool</h4>
                      <p className="text-[11px] text-slate-650 mt-1 lines-clamp-2 leading-relaxed">
                        Compiles current onboarding pipeline applicant records, phone targets, position details, and stages.
                      </p>
                    </div>
                    <div className="mt-6 space-y-3 pt-3 border-t border-slate-150">
                      {spreadsheetIdMap['applicants'] ? (
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">✓ Linked Live Sheet</span>
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetIdMap['applicants']}`}
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 font-bold hover:underline"
                          >
                            Open Link
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Synced on Drive</span>
                      )}
                      
                      <button
                        onClick={() => handleExportToSheet('applicants')}
                        disabled={isExporting !== null}
                        className="w-full py-2 bg-purple-900 override:hover:bg-purple-950 hover:bg-purple-950 font-bold text-white text-xs rounded-lg transition text-center cursor-pointer"
                      >
                        {isExporting === 'applicants' ? 'Exporting...' : (spreadsheetIdMap['applicants'] ? 'Refresh Active Sheet' : 'Spawn Live Google Sheet')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SHEETS CANDIDATE IMPORTER */}
            {activeTab === 'sheets_import' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Google Sheets Mass Candidates Importer</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect any Google Worksheet directly to import external applicants. Maps columns dynamically into the local pipeline database.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase">Google Sheet URL or Spreadsheet ID</label>
                    <input
                      type="text"
                      value={importSpreadsheetUrl}
                      onChange={(e) => setImportSpreadsheetUrl(e.target.value)}
                      className="mt-1 block w-full p-2.5 border border-slate-300 rounded-lg text-xs placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="https://docs.google.com/spreadsheets/d/your-id-here/edit"
                    />
                  </div>

                  {discoveredTabs.length > 0 ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase">Select Target Sheet Tab</label>
                      <select
                        value={selectedImportTab}
                        onChange={(e) => setSelectedImportTab(e.target.value)}
                        className="mt-1 block w-full p-2.5 border border-slate-305 rounded-lg bg-white text-xs text-slate-800"
                      >
                        {discoveredTabs.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-405 font-bold p-2.5 truncate">
                      Workbooks not linked yet
                    </div>
                  )}

                  <button
                    onClick={discoveredTabs.length > 0 ? handleFetchTabPreview : handleLoadSheetMetadata}
                    disabled={importIsLoading || !importSpreadsheetUrl.trim()}
                    className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs font-black transition disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    {importIsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Discover Sheet Roster</span>}
                  </button>
                </div>

                {importError && (
                  <div className="p-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 font-semibold text-xs rounded-r-lg">
                    ⚠️ {importError}
                  </div>
                )}

                {importSuccessCount !== null && (
                  <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 font-extrabold text-xs rounded-r-lg text-center animate-pulse">
                    🚀 Success! Fully integrated and imported {importSuccessCount} candidates into recruiting pipelines.
                  </div>
                )}

                {/* TAB DATA PREVIEW AND MAPPING PANEL */}
                {sheetPreviewRows && sheetPreviewRows.length > 0 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">✓ Extraction Preview (Top 12 Rows)</h4>
                      <p className="text-[10px] text-slate-500">Configure correct column headers offsets underneath to index rows correctly.</p>
                    </div>

                    {/* Horizontal Column mapping widget */}
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-black text-indigo-900 uppercase">Caregiver Name</label>
                        <select
                          value={mappingNameIndex}
                          onChange={(e) => setMappingNameIndex(Number(e.target.value))}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                        >
                          {sheetPreviewRows[0].map((h, i) => (
                            <option key={i} value={i}>Col {i + 1}: {h || `Column ${i}`}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-indigo-900 uppercase">Email Identifier</label>
                        <select
                          value={mappingEmailIndex}
                          onChange={(e) => setMappingEmailIndex(Number(e.target.value))}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                        >
                          {sheetPreviewRows[0].map((h, i) => (
                            <option key={i} value={i}>Col {i + 1}: {h || `Column ${i}`}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-indigo-900 uppercase">Phone contact</label>
                        <select
                          value={mappingPhoneIndex}
                          onChange={(e) => setMappingPhoneIndex(Number(e.target.value))}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                        >
                          {sheetPreviewRows[0].map((h, i) => (
                            <option key={i} value={i}>Col {i + 1}: {h || `Column ${i}`}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-indigo-900 uppercase">Position Target</label>
                        <select
                          value={mappingPositionIndex}
                          onChange={(e) => setMappingPositionIndex(Number(e.target.value))}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                        >
                          {sheetPreviewRows[0].map((h, i) => (
                            <option key={i} value={i}>Col {i + 1}: {h || `Column ${i}`}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-indigo-900 uppercase">Initial Status</label>
                        <select
                          value={mappingStatusIndex}
                          onChange={(e) => setMappingStatusIndex(Number(e.target.value))}
                          className="mt-1 block w-full p-2 border border-slate-300 rounded-lg bg-white text-xs"
                        >
                          {sheetPreviewRows[0].map((h, i) => (
                            <option key={i} value={i}>Col {i + 1}: {h || `Column ${i}`}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-[300px]">
                      <table className="min-w-full divide-y divide-slate-100 text-xs font-semibold">
                        <thead className="bg-[#f2f4f8] sticky top-0">
                          <tr>
                            {sheetPreviewRows[0].map((header: any, index: number) => {
                              const isMapped = index === mappingNameIndex || index === mappingEmailIndex || index === mappingPhoneIndex || index === mappingPositionIndex || index === mappingStatusIndex;
                              return (
                                <th 
                                  key={index} 
                                  className={`px-4 py-3 text-left border-r border-slate-150 text-[10px] uppercase font-extrabold ${isMapped ? 'bg-indigo-55 bg-indigo-50 text-indigo-900' : 'text-slate-500'}`}
                                >
                                  {header || `Column ${index + 1}`}
                                  {isMapped && <span className="block text-[8px] tracking-tight font-black uppercase text-indigo-650 opacity-90 mt-0.5">★ MAPPED</span>}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[10px] text-slate-700 bg-white">
                          {sheetPreviewRows.map((row: any[], rIdx: number) => (
                            <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-50 font-sans italic text-slate-500 font-bold' : 'hover:bg-slate-50/50'}>
                              {row.map((cell: any, cIdx: number) => {
                                const isMapped = cIdx === mappingNameIndex || cIdx === mappingEmailIndex || cIdx === mappingPhoneIndex || cIdx === mappingPositionIndex || cIdx === mappingStatusIndex;
                                return (
                                  <td 
                                    key={cIdx} 
                                    className={`px-4 py-2 border-r border-slate-150 ${isMapped ? 'bg-indigo-50/20' : ''}`}
                                  >
                                    {String(cell || '')}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        onClick={handleProcessImport}
                        className="py-3 px-8 bg-purple-900 hover:bg-purple-950 font-bold rounded-lg text-white text-xs cursor-pointer"
                      >
                        Commit & Import {sheetPreviewRows.length - 1} Candidates
                      </button>
                    </div>

                  </div>
                )}

              </div>
            )}

            {activeTab === 'meetings' && (
              <GoogleMeetSchedulerView 
                googleToken={googleToken}
                applicants={applicants}
                staff={staff}
                meetings={meetings}
                setMeetings={setMeetings}
                onAddLog={onAddLog}
                onUpdateApplicantDetails={onUpdateApplicantDetails}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
