import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  CheckSquare, 
  ShieldAlert, 
  Clock, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  Activity, 
  Briefcase,
  Shield,
  User,
  ExternalLink,
  ChevronDown,
  Upload,
  BriefcaseBusiness,
  TrendingUp,
  Award,
  Plus,
  Cloud,
  Heart,
  LayoutDashboard
} from 'lucide-react';

import { 
  Applicant, 
  Staff, 
  Document, 
  Timesheet, 
  ActivityLog, 
  ApplicantStatus, 
  DocumentCategory,
  RoleTemplate,
  FamilyFeedback,
  DocumentStatus,
  SystemUserProfile,
  mapCredentialToCategory
} from './types';

import { supabase } from './lib/supabase';
import {
  applicantToRow,
  createUserProfile,
  insertActivityLog,
  loadWorkflowData,
  mapApplicantRow,
  mapFeedbackRow,
  mapStaffRow,
  mapTimesheetRow,
  staffToRow,
  timesheetToRow,
  getCurrentProfile
} from './lib/workflowRepository';

// Dynamic Sub-Views Imports
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ApplicantKanban from './components/ApplicantKanban';
import StaffDirectory from './components/StaffDirectory';
import StaffProfile from './components/StaffProfile';
import DocumentVault from './components/DocumentVault';
import ComplianceDashboard from './components/ComplianceDashboard';
import RoleTemplates from './components/RoleTemplates';
import TimesheetManager from './components/TimesheetManager';
import UserAdministration from './components/UserAdministration';
import AdminProfile from './components/AdminProfile';
import WorkspaceSync from './components/WorkspaceSync';
import BrandedLogo from './components/BrandedLogo';
import FamilyPortal from './components/FamilyPortal';
import FamilyFeedbackAdmin from './components/FamilyFeedbackAdmin';
import ApplicantPortal from './components/ApplicantPortal';
import StaffDashboard from './components/StaffDashboard';
import SHCLoader from './components/SHCLoader';
import SHCSplashScreen from './components/SHCSplashScreen';
import { resolveAvatarUrl } from './lib/profileState';
import { readApiResponse } from './lib/apiResponse';

export default function App() {
  const [startupReady, setStartupReady] = useState(false);

  return (
    <>
      <AppShell onStartupReady={setStartupReady} />
      <SHCSplashScreen ready={startupReady} />
    </>
  );
}

function AppShell({ onStartupReady }: { onStartupReady: (ready: boolean) => void }) {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<'admin' | 'staff' | 'family' | 'applicant'>('applicant');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userAccountRole, setUserAccountRole] = useState<'admin' | 'staff' | 'family' | 'applicant' | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<SystemUserProfile | null>(null);

  const [isAuthRestoring, setIsAuthRestoring] = useState(true);
  const [isProfileSyncing, setIsProfileSyncing] = useState(true);
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);

  const [familyFeedbacks, setFamilyFeedbacks] = useState<FamilyFeedback[]>([]);

  // Global Core Data Persistence State
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);

  const [visibleCards, setVisibleCards] = useState<string[]>(() => {
    const local = localStorage.getItem('shc_visible_cards');
    return local ? JSON.parse(local) : ['health_index', 'recruiting_targets', 'pending_timesheets', 'recent_activity', 'quick_actions', 'workspace_sync', 'family_surveys'];
  });

  useEffect(() => {
    localStorage.setItem('shc_visible_cards', JSON.stringify(visibleCards));
  }, [visibleCards]);

  // Synchronous session listener flow - sets state only, avoiding async DB calls here
  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (active) {
          setSupabaseUser(session?.user ?? null);
          setIsAuthRestoring(false);
        }
      } catch (err) {
        console.error("Error checking initial Supabase session:", err);
        if (active) {
          setIsAuthRestoring(false);
        }
      }
    };
    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setSupabaseUser(session?.user ?? null);
        setIsAuthRestoring(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Separate session profile synchronization flow (handles async Supabase database queries)
  useEffect(() => {
    let active = true;

    const syncProfile = async () => {
      if (!supabaseUser) {
        setIsLoggedIn(false);
        setUserAccountRole(null);
        setSupabaseUserId(null);
        setCurrentUserProfile(null);
        setIsProfileSyncing(false);
        return;
      }

      setIsProfileSyncing(true);
      try {
        const userEmail = supabaseUser.email?.toLowerCase();
        if (!userEmail) {
          throw new Error("No email associated with authenticated Supabase user.");
        }

        const profile = await getCurrentProfile(supabaseUser.id, userEmail);

        if (!active) return;

        if (profile) {
          setSupabaseUserId(profile.id);
          setCurrentUserProfile(profile);
          const dbRole = profile.role;
          setCurrentRole(dbRole);
          setCurrentUserId(profile.id);
          setUserAccountRole(dbRole);
          setIsLoggedIn(true);
          setProfileSyncError(null);

          if (profile.status !== 'Active') {
            setApplicants([]);
            setStaff([]);
            setDocuments([]);
            setTimesheets([]);
            setActivityLogs([]);
            return;
          }

          const workflow = await loadWorkflowData(profile);
          if (!active) return;
          setApplicants(workflow.applicants);
          setStaff(workflow.staff);
          setDocuments(workflow.documents);
          setTimesheets(workflow.timesheets);
          if (workflow.templates.length > 0) {
            setTemplates(workflow.templates);
          }
          setActivityLogs(workflow.activityLogs);
          setFamilyFeedbacks(workflow.familyFeedbacks);

        } else {
          // No matching Supabase user profile exists!
          const diagnosticMsg = `No matching Supabase application profile exists in the 'public.users' table for email '${supabaseUser.email}' (UID: ${supabaseUser.id}).`;
          console.error(diagnosticMsg);
          setProfileSyncError(diagnosticMsg);
          setIsLoggedIn(false);
        }
      } catch (err: any) {
        if (!active) return;
        console.error("Critical error restoring user session with Supabase:", err);
        setProfileSyncError(`Failed to restore session. Error: ${err.message || err}`);
        setIsLoggedIn(false);
      } finally {
        if (active) setIsProfileSyncing(false);
      }
    };

    syncProfile();

    return () => {
      active = false;
    };
  }, [supabaseUser]);

  useEffect(() => {
    onStartupReady(!isAuthRestoring && !isProfileSyncing);
  }, [isAuthRestoring, isProfileSyncing, onStartupReady]);

  useEffect(() => {
    if (isLoggedIn) {
      if (currentRole === 'staff' && activeTab === 'dashboard') {
        setActiveTab('staff_dashboard');
      } else if (currentRole === 'admin' && activeTab === 'staff_dashboard') {
        setActiveTab('dashboard');
      }
    }
  }, [currentRole, isLoggedIn, activeTab]);

  const handleToggleCard = (cardId: string, visible?: boolean) => {
    setVisibleCards(prev => {
      const isCurrentlyVisible = prev.includes(cardId);
      const shouldBeVisible = visible !== undefined ? visible : !isCurrentlyVisible;
      if (shouldBeVisible) {
        if (isCurrentlyVisible) return prev;
        return [...prev, cardId];
      } else {
        return prev.filter(id => id !== cardId);
      }
    });
  };

  const handleClearActivityLogs = () => {
    setActivityLogs([]);
  };

  const reloadWorkflowState = async (profile = currentUserProfile) => {
    if (!profile || profile.status !== 'Active') return;
    const workflow = await loadWorkflowData(profile);
    setApplicants(workflow.applicants);
    setStaff(workflow.staff);
    setDocuments(workflow.documents);
    setTimesheets(workflow.timesheets);
    if (workflow.templates.length > 0) {
      setTemplates(workflow.templates);
    }
    setActivityLogs(workflow.activityLogs);
    setFamilyFeedbacks(workflow.familyFeedbacks);

  };

  // Global OAuth Popup close Handler
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token=') && window.location.hash.includes('state=google_auth_state')) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_TOKEN',
          hash: window.location.hash
        }, window.location.origin);
        window.close();
      }
    }
  }, []);

  // Auth Operations
  const handleLoginSuccess = async (role: 'admin' | 'staff' | 'family' | 'applicant', userId?: string) => {
    if (!userId) return;
    setCurrentRole(role);
    setUserAccountRole(role);
    setCurrentUserId(userId);
    setSelectedStaffId(null);
    setActiveTab(role === 'admin' ? 'dashboard' : 'staff_dashboard');
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Failed to sign out of the local Supabase session:', error);
      return;
    }

    setSupabaseUser(null);
    setSupabaseUserId(null);
    setCurrentUserId('');
    setCurrentUserProfile(null);
    setUserAccountRole(null);
    setCurrentRole('applicant');
    setIsLoggedIn(false);
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    setSelectedStaffId(null);
    setProfileSyncError(null);
    setApplicants([]);
    setStaff([]);
    setDocuments([]);
    setTimesheets([]);
    setActivityLogs([]);
    setFamilyFeedbacks([]);
    setActiveTab('dashboard');
  };

  // State mutation callbacks passed to children components
  const handleUpdateApplicantStatus = async (id: string, newStatus: ApplicantStatus) => {
    const targetApplicant = applicants.find(a => a.id === id);
    if (!targetApplicant) return;

    try {
      if (newStatus === 'Accepted') {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          alert('Your session has expired. Please sign in again before accepting this applicant.');
          return;
        }

        const response = await fetch('/api/admin/accept-applicant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ applicantId: id })
        });
        const result = await response.json();
        if (!response.ok) {
          alert(`Applicant acceptance failed: ${result.error || 'Unknown server error'}`);
          return;
        }
        await reloadWorkflowState();
        return;
      }

      const { data, error } = await supabase
        .from('applicants')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      setApplicants(prev => prev.map(a => a.id === id ? mapApplicantRow(data) : a));
      const log = await insertActivityLog({
        action: `RECRUITMENT: Candidate ${targetApplicant.name} moved to ${newStatus}.`,
        user: currentUserProfile?.fullName || 'Authenticated User',
        type: 'applicant'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [log, ...prev]);
    } catch (error: any) {
      console.error('Failed to update applicant status:', error);
      alert(error.message || 'Failed to update applicant status.');
    }
  };

  const handleAddApplicant = async (applicant: Omit<Applicant, 'id' | 'dateCreated'>, specificId?: string) => {
    try {
      const payload = applicantToRow({
        ...applicant,
        id: specificId,
        userId: specificId
      });
      const { data, error } = await supabase
        .from('applicants')
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      const newApp = mapApplicantRow(data);
      setApplicants(prev => [newApp, ...prev]);
      const log = await insertActivityLog({
        action: `REGISTRY: New candidate applicant ${applicant.name} registered successfully as ${applicant.position}`,
        user: currentUserProfile?.fullName || 'System',
        type: 'applicant'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [log, ...prev]);
      return newApp.id;
    } catch (error: any) {
      console.error('Failed to add applicant:', error);
      alert(error.message || 'Failed to add applicant.');
      return '';
    }
  };

  const handleUpdateApplicantDetails = async (id: string, fields: Partial<Applicant>) => {
    try {
      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) updatePayload.full_name = fields.name;
      if (fields.email !== undefined) updatePayload.email = fields.email.toLowerCase();
      if (fields.phone !== undefined) updatePayload.phone = fields.phone;
      if (fields.position !== undefined) updatePayload.position = fields.position;
      if (fields.status !== undefined) updatePayload.status = fields.status;
      if (fields.notes !== undefined) updatePayload.notes = fields.notes;
      if (fields.interviewTime !== undefined) updatePayload.interview_time = fields.interviewTime || null;
      if (fields.interviewMeetUrl !== undefined) updatePayload.interview_meet_url = fields.interviewMeetUrl || null;
      if (fields.cvData !== undefined) updatePayload.cv_data = fields.cvData;

      const { data, error } = await supabase
        .from('applicants')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      setApplicants(prev => prev.map(a => a.id === id ? mapApplicantRow(data) : a));
    } catch (error: any) {
      console.error('Failed to update applicant details:', error);
      alert(error.message || 'Failed to update applicant details.');
    }
  };

  const handleSaveCVData = (applicantId: string, cvData: any) => {
    handleUpdateApplicantDetails(applicantId, { cvData });
    setActivityLogs(prev => [{
      id: `act_${Date.now()}_cv`,
      action: `CV Builder data updated for applicant.`,
      timestamp: 'Just now',
      user: 'Applicant Portal',
      type: 'applicant'
    }, ...prev]);
  };

  const handleGenerateCVPdf = (applicantId: string, pdfBlob: Blob) => {
    const applicant = applicants.find(a => a.id === applicantId);
    if (!applicant) return;

    const file = new File([pdfBlob], `${applicant.name.replace(/\s+/g, '_')}_CV.pdf`, { type: 'application/pdf' });
    
    handleUploadDocument({
      name: `${applicant.name} Generated CV`,
      category: 'CV',
      staffId: applicant.id,
      staffName: applicant.name,
      status: 'Approved',
      size: `${(file.size / 1024).toFixed(1)} KB`
    }, file);
  };

  const handleSystemReset = async () => {
    if (!window.confirm("CRITICAL WARNING:\n\nThis will permanently delete all local cache, user sessions, activity logs, documents, and sign you out to start from a 100% clean state.\n\nAre you sure you want to proceed?")) {
      return;
    }
    try {
      // 1. Reset React states
      setApplicants([]);
      setStaff([]);
      setDocuments([]);
      setTimesheets([]);
      setActivityLogs([]);
      setFamilyFeedbacks([]);

      // 2. Clear client caches
      localStorage.clear();
      sessionStorage.clear();

      // 3. Sign out
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setUserAccountRole(null);
      setCurrentRole('applicant');

      alert("SUCCESS!\n\nAll local caches and active user sessions have been purged.\n\nPlease complete registration of your new account on the next screen.");
      window.location.reload();
    } catch (error: any) {
      console.error("Critical error during full system reset:", error);
      alert("System reset failed. Details: " + (error.message || error));
    }
  };

  const handleDeleteApplicant = async (id: string) => {
    try {
      const targetApplicant = applicants.find(a => a.id === id);
      if (!targetApplicant) return;

      console.log(`[handleDeleteApplicant] Beginning persistent delete workflow for applicant: "${targetApplicant.name}" (${id})`);

      // Find user profile in Supabase 'users' table
      const { data: matchedUsers, error: findError } = await supabase
        .from('users')
        .select('id, email')
        .or(`id.eq."${id}",firebase_uid.eq."${id}",email.eq."${targetApplicant.email.toLowerCase()}"`);

      if (findError) {
        console.error("[handleDeleteApplicant] Error searching matching user in database:", findError);
      }
      
      const dbUser = matchedUsers && matchedUsers.length > 0 ? matchedUsers[0] : null;
      const targetUserId = dbUser ? dbUser.id : (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? id : null);

      if (targetUserId) {
        console.log(`[handleDeleteApplicant] Found persistent database user: "${targetUserId}". Calling secure backend deletion API.`);
        
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          alert("CRITICAL ERROR: Authorization session token not found. Please log in again to delete this persistent record.");
          return;
        }

        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUserId })
        });

        const result = await readApiResponse(response);

        if (!response.ok) {
          console.error("[handleDeleteApplicant] Backend user deletion failed:", result);
          alert(`CRITICAL ERROR: Backend administrative deletion was blocked or failed.\n\nMessage: ${result.message || result.error || "Unknown server error"}\nDetails: ${JSON.stringify(result.details || {})}`);
          return; // STOP! Do not update React state
        }

        console.log("[handleDeleteApplicant] Backend user deletion successful:", result);
      } else {
        console.log(`[handleDeleteApplicant] No active database profile was found for ID/Email. This is a local-only candidate record.`);
      }

      // Database deletion verified successful -> now safely update React local state
      setApplicants(prev => prev.filter(a => a.id !== id));
      setDocuments(prev => prev.filter(d => d.staffId !== id));
      setTimesheets(prev => prev.filter(t => t.staffName !== targetApplicant.name));

      // Activity Log
      const log: ActivityLog = {
        id: `act_${Date.now()}`,
        action: `DELETION: Administrator permanently purged candidate "${targetApplicant.name}" along with all files, credentials, timesheets, and historical logs.`,
        timestamp: 'Just now',
        user: currentUserProfile?.fullName || 'Administrator',
        type: 'applicant'
      };
      setActivityLogs(prev => [log, ...prev]);

      if (targetUserId) {
        alert(`SUCCESS:\nCandidate "${targetApplicant.name}" and all associated credentials/files have been successfully purged via secure backend deletion.`);
      } else {
        alert(`SUCCESS:\nLocal candidate "${targetApplicant.name}" has been removed.`);
      }

    } catch (err: any) {
      console.error("Error during comprehensive applicant deletion:", err);
      alert(`An error occurred during deletion: ${err.message || err}`);
    }
  };

  const handleUpdateStaffDetails = async (updatedStaff: Staff) => {
    try {
      const { data, error } = await supabase
        .from('staff_profiles')
        .update(staffToRow(updatedStaff))
        .eq('id', updatedStaff.id)
        .select('*')
        .single();
      if (error) throw error;
      await reloadWorkflowState();

      const log = await insertActivityLog({
        action: `COMPLIANCE: Personal details updated directly for staff member ${updatedStaff.name}`,
        user: currentUserProfile?.fullName || 'Authenticated User',
        type: 'compliance'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [log, ...prev]);
    } catch (error: any) {
      console.error('Failed to update staff profile:', error);
      alert(error.message || 'Failed to update staff profile.');
    }
  };

  const handleAddStaff = async (newStaff: Staff) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .upsert({
          email: newStaff.email.toLowerCase(),
          full_name: newStaff.name,
          role: 'Staff',
          status: 'Pending',
          permissions: []
        }, { onConflict: 'email' })
        .select('*')
        .single();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from('staff_profiles')
        .insert(staffToRow({ ...newStaff, userId: userData.id }))
        .select('*')
        .single();

      if (error) throw error;
      await reloadWorkflowState();
      const log = await insertActivityLog({
        action: `STAFF REGISTRATION: Manually registered new staff member "${newStaff.name}" (${newStaff.role}) into the active registry.`,
        user: currentUserProfile?.fullName || 'Administrator',
        type: 'compliance'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [log, ...prev]);
    } catch (err: any) {
      console.error("Error manual registering staff:", err);
      alert(err.message || 'Failed to register staff.');
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const target = staff.find(s => s.id === staffId);
      if (!target) return;

      console.log(`[handleDeleteStaff] Beginning persistent delete workflow for staff member: "${target.name}" (${staffId})`);

      // Find user profile in Supabase 'users' table
      const { data: matchedUsers, error: findError } = await supabase
        .from('users')
        .select('id, email')
        .or(`id.eq."${staffId}",firebase_uid.eq."${staffId}",email.eq."${target.email.toLowerCase()}"`);

      if (findError) {
        console.error("[handleDeleteStaff] Error searching matching user in database:", findError);
      }
      
      const dbUser = matchedUsers && matchedUsers.length > 0 ? matchedUsers[0] : null;
      const targetUserId = dbUser ? dbUser.id : (staffId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? staffId : null);

      if (targetUserId) {
        console.log(`[handleDeleteStaff] Found persistent database user: "${targetUserId}". Calling secure backend deletion API.`);
        
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          alert("CRITICAL ERROR: Authorization session token not found. Please log in again to delete this persistent record.");
          return;
        }

        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUserId })
        });

        const result = await readApiResponse(response);

        if (!response.ok) {
          console.error("[handleDeleteStaff] Backend user deletion failed:", result);
          alert(`CRITICAL ERROR: Backend administrative deletion was blocked or failed.\n\nMessage: ${result.message || result.error || "Unknown server error"}\nDetails: ${JSON.stringify(result.details || {})}`);
          return; // STOP! Do not update React state
        }

        console.log("[handleDeleteStaff] Backend user deletion successful:", result);
      } else {
        console.log(`[handleDeleteStaff] No active database profile was found for ID/Email. This is a local-only staff record.`);
      }

      // Database deletion verified successful -> now safely update React local state
      setStaff(prev => prev.filter(s => s.id !== staffId));
      if (selectedStaffId === staffId) {
        setSelectedStaffId(null);
      }
      setDocuments(prev => prev.filter(d => d.staffId !== staffId));
      setTimesheets(prev => prev.filter(t => t.staffName !== target.name));

      // Activity Log
      const log: ActivityLog = {
        id: `act_${Date.now()}`,
        action: `STAFF DELETION: Permanently deleted staff member "${target.name}" and purged all associated compliance records.`,
        timestamp: 'Just now',
        user: currentUserProfile?.fullName || 'Administrator',
        type: 'compliance'
      };
      setActivityLogs(prev => [log, ...prev]);

      if (targetUserId) {
        alert(`SUCCESS:\nStaff member "${target.name}" and all associated credentials/files have been successfully purged via secure backend deletion.`);
      } else {
        alert(`SUCCESS:\nLocal staff member "${target.name}" has been removed.`);
      }

    } catch (err: any) {
      console.error("Error deleting staff member:", err);
      alert(`An error occurred during deletion: ${err.message || err}`);
    }
  };

  const handleUpdateDocument = async (updatedDoc: Document) => {
    try {
      const updatePayload = {
        document_name: updatedDoc.name,
        category: mapCredentialToCategory(updatedDoc.category),
        verification_status: updatedDoc.status === 'Awaiting Review' ? 'Pending' : updatedDoc.status,
        file_path: updatedDoc.fileUrl || null
      };
      await supabase.from('documents').update(updatePayload).eq('id', updatedDoc.id);
      setDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));

      const log = await insertActivityLog({
        action: `COMPLIANCE: Online form completed and e-signed: '${updatedDoc.category}' for ${updatedDoc.staffName}`,
        user: updatedDoc.staffName || currentUserProfile?.fullName || 'System',
        type: 'document'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [log, ...prev]);
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  const handleUploadDocument = async (doc: Omit<Document, 'id' | 'uploadDate'>, file?: File) => {
    let finalFileUrl = doc.fileUrl;
    let persistedDocumentId: string | undefined;
    
    if (file) {
      const filePath = `${Date.now()}_${file.name}`;
      let uploadedToStorage = false;

      try {
        // 1. Upload the file into the private Supabase Storage bucket named: documents
        console.log("=== SUPABASE UPLOAD VERIFICATION ===");
        console.log("Uploaded Storage bucket name: 'documents'");
        console.log("Exact upload path:", filePath);
        console.log("Exact saved file_path:", filePath);
        console.log("====================================");

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        uploadedToStorage = true;

        // 2. Use relative storage path for local state consistency
        finalFileUrl = filePath;

        // Determine target user's Supabase UUID
        let targetSupabaseId: string | null = null;
        let targetApplicantId: string | null = null;
        let targetStaffProfileId: string | null = null;
        const targetFirebaseUid = doc.staffId || currentUserId;
        
        if (targetFirebaseUid === currentUserId && supabaseUserId) {
          targetSupabaseId = supabaseUserId;
        } else if (targetFirebaseUid) {
          const targetApplicant = applicants.find(a => a.id === targetFirebaseUid);
          const targetStaff = staff.find(s => s.id === targetFirebaseUid);
          const email = targetApplicant?.email || targetStaff?.email || 'unknown@example.com';
          const name = targetApplicant?.name || targetStaff?.name || 'Unknown User';
          
          try {
            if (targetApplicant) {
              const { data: appRow } = await supabase
                .from('applicants')
                .select('id, user_id')
                .eq('id', targetApplicant.id)
                .maybeSingle();
              if (appRow) {
                targetApplicantId = appRow.id;
                targetSupabaseId = appRow.user_id;
              }
            }

            if (!targetSupabaseId && targetStaff) {
              const { data: staffRow } = await supabase
                .from('staff_profiles')
                .select('id, user_id')
                .eq('id', targetStaff.id)
                .maybeSingle();
              if (staffRow) {
                targetStaffProfileId = staffRow.id;
                targetSupabaseId = staffRow.user_id;
              }
            }

            if (!targetSupabaseId && email !== 'unknown@example.com') {
              const { data: eData } = await supabase
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .maybeSingle();
              targetSupabaseId = eData?.id || null;
            }
          } catch (userErr) {
            console.error("Error looking up/syncing user in Supabase for upload:", userErr);
          }
        }

        // Map category to a database check-constraint-compliant value
        const mappedCategory = mapCredentialToCategory(doc.category);

        // Prepare the payload for exact verification logging
        const insertPayload = {
          user_id: targetSupabaseId,
          document_name: file.name,
          category: mappedCategory,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          upload_date: new Date().toISOString().split('T')[0],
          verification_status: 'Pending',
          applicant_id: targetApplicantId,
          staff_profile_id: targetStaffProfileId
        };

        // Verbose verification logging immediately before insertion
        console.log("=== SUPABASE PRE-INSERT VERIFICATION ===");
        console.log("Table: public.documents");
        console.log("Payload:", JSON.stringify(insertPayload, null, 2));
        console.log("Category Value Checked:", insertPayload.category);
        console.log("========================================");

        // 3. Create a row in the existing documents PostgreSQL table
        const { data: dbData, error: dbError } = await supabase
          .from('documents')
          .insert(insertPayload)
          .select('id')
          .single();

        if (dbError || !dbData?.id) {
          throw new Error(`Database registration failed: ${dbError?.message || 'No document ID was returned.'}`);
        }
        persistedDocumentId = String(dbData.id);
      } catch (e: any) {
        console.error("Failed to upload/register with Supabase:", e);
        
        // Rollback uploaded storage file if metadata creation failed
        if (uploadedToStorage) {
          try {
            await supabase.storage
              .from('documents')
              .remove([filePath]);
            console.log("Successfully rolled back storage file due to subsequent metadata insertion error.");
          } catch (rollbackErr) {
            console.error("Failed to rollback storage file:", rollbackErr);
          }
        }

        // Display the real error to the user
        alert(e.message || e);
        return; // Halt execution and do not add to local application state/UI
      }
    }

    const mappedCategory = mapCredentialToCategory(doc.category);
    const newDocItem: Document = {
      ...doc,
      category: mappedCategory as DocumentCategory,
      fileUrl: finalFileUrl,
      id: persistedDocumentId || `doc_${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    setDocuments(prev => [newDocItem, ...prev]);

    const log: ActivityLog = {
      id: `act_${Date.now()}`,
      action: `FILE CABINET: ${mappedCategory} credential file uploaded to vault: '${doc.name}'`,
      timestamp: 'Just now',
      user: doc.staffName || 'Caregiver Oswald',
      type: 'document'
    };
    setActivityLogs(prev => [log, ...prev]);
  };

  const handleAssignDocument = async (targetStaffId: string, docCategory: DocumentCategory, docName: string) => {
    const targetStaff = staff.find(s => s.id === targetStaffId);
    const staffMemberName = targetStaff?.name || 'Unknown';
    const staffEmail = targetStaff?.email || 'staff@example.com';
    if (!targetStaff) return;

    try {
      const { data: staffRow } = await supabase
        .from('staff_profiles')
        .select('id, user_id')
        .eq('id', targetStaffId)
        .maybeSingle();

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: staffRow?.user_id || null,
          staff_profile_id: targetStaffId,
          document_name: docName,
          category: mapCredentialToCategory(docCategory),
          upload_date: new Date().toISOString().split('T')[0],
          verification_status: 'Pending Signature'
        })
        .select('*')
        .single();

      if (error) throw error;

      const newAssigned: Document = {
        id: data.id.toString(),
        name: data.document_name,
        category: data.category as DocumentCategory,
        staffId: targetStaffId,
        staffName: staffMemberName,
        uploadDate: data.upload_date || new Date().toISOString().split('T')[0],
        status: 'Pending Signature',
        assignedByAdmin: true
      };
      setDocuments(prev => [newAssigned, ...prev]);

      // Open email client
      const subject = encodeURIComponent(`Action Required: Document Request for ${docName}`);
      const body = encodeURIComponent(`Hello ${staffMemberName},\n\nPlease sign in to SHC StaffHub to review and complete your pending document: ${docName}\n\nThank you.`);
      window.location.href = `mailto:${staffEmail}?subject=${subject}&body=${body}`;

      const logSent = await insertActivityLog({
        action: `DOCUMENT REQUEST: ${docName} assigned to ${staffMemberName} (${staffEmail}).`,
        user: currentUserProfile?.fullName || 'Administrator',
        type: 'document'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [logSent, ...prev]);
    } catch (error: any) {
      console.error('Failed to assign document:', error);
      alert(error.message || 'Failed to assign document.');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Access token not found. Please sign in again.');

      const response = await fetch('/api/admin/delete-document', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ documentId: docId })
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || result.error || 'Document deletion failed.');

      setDocuments(prev => prev.filter(d => d.id !== docId));
      alert(result.message || 'Document deleted successfully.');
    } catch (err: any) {
      console.error("[handleDeleteDocument] Failed:", err);
      alert(`Failed to delete document: ${err.message || err}`);
    }
  };

  const handleUpdateTimesheetStatus = async (timesheetId: string, status: 'Approved' | 'Rejected' | 'Paid') => {
    try {
      const reviewer = currentUserProfile?.fullName || 'Administrator';
      const { data, error } = await supabase
        .from('timesheets')
        .update({ approval_status: status, reviewer, updated_at: new Date().toISOString() })
        .eq('id', timesheetId)
        .select('*')
        .single();
      if (error) throw error;
      setTimesheets(prev => prev.map(t => t.id === timesheetId ? mapTimesheetRow(data) : t));

      const target = timesheets.find(t => t.id === timesheetId);
      if (target) {
        const log = await insertActivityLog({
          action: `FINANCE AUDIT: Timesheet submission for ${target.staffName} (${target.hoursWorked} hrs) marked as '${status}'`,
          user: reviewer,
          type: 'timesheet'
        }, currentUserProfile?.id);
        setActivityLogs(prev => [log, ...prev]);
      }
    } catch (error: any) {
      console.error('Failed to update timesheet status:', error);
      alert(error.message || 'Failed to update timesheet status.');
    }
  };

  const handleAddTimesheet = async (timesheet: Omit<Timesheet, 'id' | 'uploadDate'>) => {
    try {
      const targetStaff = staff.find(s => s.name === timesheet.staffName);
      const { data, error } = await supabase
        .from('timesheets')
        .insert(timesheetToRow({
          ...timesheet,
          userId: currentRole === 'staff' ? currentUserId : undefined,
          staffProfileId: targetStaff?.id
        }))
        .select('*')
        .single();
      if (error) throw error;
      const newTime = mapTimesheetRow(data);
      setTimesheets(prev => [newTime, ...prev]);

      const log = await insertActivityLog({
        action: `SHIFT CLAIM: Shift claim log reported directly by ${timesheet.staffName}: ${timesheet.hoursWorked} registered hours`,
        user: timesheet.staffName,
        type: 'timesheet'
      }, currentUserProfile?.id);
      setActivityLogs(prev => [log, ...prev]);
    } catch (error: any) {
      console.error('Failed to add timesheet:', error);
      alert(error.message || 'Failed to add timesheet.');
    }
  };

  const handleUpdateAdminProfile = async (details: { fullName: string; phone: string }) => {
    if (!currentUserProfile) throw new Error('Admin profile is unavailable.');
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: details.fullName,
        phone: details.phone || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUserProfile.id)
      .select('id, email, full_name, phone, role, status, permissions')
      .single();
    if (error) throw error;

    setCurrentUserProfile(profile => profile ? {
      ...profile,
      fullName: data.full_name || details.fullName,
      phone: data.phone || ''
    } : profile);
  };

  // Helper selectors
  const activeStaffMember = selectedStaffId
    ? staff.find(s => s.id === selectedStaffId)
    : staff.find(s => s.userId === currentUserId || s.email.toLowerCase() === (currentUserProfile?.email || '').toLowerCase());
  const currentUserAvatarUrl = currentUserProfile
    ? resolveAvatarUrl(documents, { userId: currentUserProfile.id })
    : undefined;

  // Navigation Links & Icons configuration
  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Users, desc: 'Global credentials summary' },
    { id: 'recruitment', label: 'Recruitment', icon: Briefcase, desc: 'Registered onboarding pool' },
    { id: 'staff', label: 'Approved Staff', icon: User, desc: 'Operational caregiver roster' },
    { id: 'vault', label: 'Documents', icon: FileText, desc: 'GDPR contract records storage' },
    { id: 'templates', label: 'Roles', icon: BookOpen, desc: 'Criteria checklists by role' },
    { id: 'timesheets', label: 'Timesheets', icon: Clock, desc: 'Shift approvals and pays metrics' },
    { id: 'workspace', label: 'Google Workspace', icon: Cloud, desc: 'Drive & Sheets Integration' },
    { id: 'family_feedback', label: 'Family Surveys Hub', icon: Heart, desc: 'Real-time client satisfaction' },
    { id: 'administration', label: 'User Administration', icon: Shield, desc: 'Manage system users and access roles' }
  ];

  // Auth Guard
  if (isAuthRestoring || isProfileSyncing) {
    return <SHCLoader variant="fullscreen" text={isAuthRestoring ? 'Restoring your secure session…' : 'Synchronising your SHC profile…'} />;
  }

  if (profileSyncError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="shc-sync-error-view">
        {/* Visual background accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-60 transform translate-x-20 -translate-y-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-60 transform -translate-x-20 translate-y-20"></div>
        
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center justify-center">
          <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100 w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 text-rose-600 mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Synchronization Error</h2>
            <p className="text-sm text-slate-500 mb-6">
              Your authenticated account has no matching Supabase application profile.
            </p>

            <div className="bg-rose-50/50 rounded-xl p-4 mb-6 border border-rose-100/50 text-left">
              <p className="text-[11px] font-black uppercase text-rose-800 tracking-wider mb-1 font-sans">Diagnostic Details:</p>
              <p className="text-[11px] font-mono text-slate-700 leading-relaxed break-all">
                {profileSyncError}
              </p>
            </div>

            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Please contact your Steward Health Care administrator to register your email in the system database.
            </p>

            <button
              onClick={handleLogout}
              className="w-full flex justify-center items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-[#9C1F60] hover:bg-[#80194E] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9C1F60]"
            >
              Logout and Return
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} onAddApplicant={handleAddApplicant} onSystemReset={handleSystemReset} />;
  }

  if (currentUserProfile && currentUserProfile.status !== 'Active') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="shc-account-status-view">
        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center justify-center">
          <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100 w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-700 mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {currentUserProfile.status === 'Pending' ? 'Account Pending Approval' : 'Account Suspended'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {currentUserProfile.status === 'Pending'
                ? 'Your account is authenticated, but an administrator must activate it before you can enter StaffHub.'
                : 'Your account is authenticated, but access is currently suspended.'}
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-left">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Signed in as</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{currentUserProfile.fullName}</p>
              <p className="text-xs text-slate-500">{currentUserProfile.email}</p>
              <p className="text-xs text-slate-500 mt-2">Status: <span className="font-bold">{currentUserProfile.status}</span></p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex justify-center items-center px-4 py-2.5 rounded-xl shadow-sm text-xs font-bold text-white bg-[#9C1F60] hover:bg-[#80194E] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Family & Client Feedback Portal: Clean Isolated Perspective
  if (currentRole === 'family') {
    return (
      <FamilyPortal 
        onBackToLogin={handleLogout} 
        onSubmitFeedback={(newFeed) => {
          const feed: FamilyFeedback = {
            ...newFeed,
            id: `fb_${Date.now()}`,
            dateSubmitted: new Date().toISOString(),
            status: 'Awaiting Action'
          };
          
          setFamilyFeedbacks(prev => [feed, ...prev]);
          
          // Prepend an activity log!
          const log: ActivityLog = {
            id: `act_${Date.now()}`,
            action: `Real-time family feedback: Client "${feed.clientName}" (${feed.category})`,
            timestamp: 'Just now',
            user: feed.anonymous ? 'Anonymous Relation' : `${feed.familyRepresentative} (${feed.relation})`,
            type: 'status'
          };
          setActivityLogs(prev => [log, ...prev]);
        }} 
        staffList={staff} 
      />
    );
  }

  // Applicant Portal Navigation Guard
  if (currentRole === 'applicant') {
    const activeApplicant = applicants.find(a => 
      a.id === currentUserId || 
      (supabaseUser?.email && a.email.toLowerCase() === supabaseUser.email.toLowerCase())
    );
    if (!activeApplicant) {
      console.error("=== DIAGNOSTIC: APPLICANT PROFILE NOT FOUND ===");
      console.error("currentUserId:", currentUserId);
      console.error("supabaseUser:", supabaseUser);
      console.error("applicants:", applicants);
      
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden" id="shc-profile-not-found-view">
          {/* Visual background accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-60 transform translate-x-20 -translate-y-20"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-60 transform -translate-x-20 translate-y-20"></div>
          
          <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center justify-center">
            <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100 w-full text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-amber-600 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              
              <h2 className="text-xl font-bold text-slate-900 mb-2">Applicant Profile Not Found</h2>
              <p className="text-sm text-slate-500 mb-6">
                Your session is authenticated, but your local applicant portal profile could not be resolved.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200/60 text-left">
                <p className="text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1 font-sans">Diagnostic Details:</p>
                <div className="text-[11px] font-mono text-slate-700 leading-relaxed break-all space-y-1">
                  <div><strong>Supabase User ID (UUID):</strong> {supabaseUser?.id || 'None'}</div>
                  <div><strong>Email:</strong> {supabaseUser?.email || 'None'}</div>
                  <div><strong>Current User ID (State):</strong> {currentUserId}</div>
                  <div><strong>Role:</strong> {currentRole}</div>
                  <div><strong>Local Candidates Array:</strong> {applicants.length} available ({applicants.map(a => `${a.name} [id:${a.id}, email:${a.email}]`).join(', ') || 'none'})</div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
                Try logging out and logging back in, or contact support if the issue persists.
              </p>

              <button
                onClick={handleLogout}
                className="w-full flex justify-center items-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-[#9C1F60] hover:bg-[#80194E] transition-colors focus:outline-none"
              >
                Logout and Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <ApplicantPortal 
        applicant={activeApplicant}
        authenticatedUserId={supabaseUser?.id || currentUserId}
        templates={templates}
        documents={documents}
        onUploadDocument={(file, category) => {
          return handleUploadDocument({
            name: file.name,
            category: category as any,
            staffId: currentUserId,
            staffName: activeApplicant.name,
            status: 'Awaiting Review',
          }, file);
        }}
        onSaveCVData={handleSaveCVData}
        onLogout={handleLogout}
      />
    );
  }

  // --- RENDERING PERSPECTIVES ---
  const getPageTitle = () => {
    if (selectedStaffId) {
      return "Approved Staff";
    }
    if (currentRole === 'admin') {
      if (activeTab === 'admin_profile') return 'Admin Profile';
      const currentTab = navigationTabs.find(tab => tab.id === activeTab);
      return currentTab ? currentTab.label : 'Dashboard';
    } else {
      if (activeTab === 'profile') return 'My Credentials';
      if (activeTab === 'staff_timesheets') return 'Timesheets';
      if (activeTab === 'role_briefs') return 'Mandatory Checklist';
      return 'Staff Portal';
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-800 font-sans flex flex-col md:flex-row antialiased">
      
      {/* DESKTOP SIDEBAR RAIL: Clean Minimal Look */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#e8eaee] shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* LOGO AREA */}
        <div className="p-4 border-b border-[#e8eaee]">
          <BrandedLogo layout="horizontal" size="sm" />
        </div>

        {/* ROLE INDICATOR */}
        <div className="p-4 bg-[#f8f9fc] border-b border-[#e8eaee] mx-3 my-3 rounded-xl text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Logged Role:</span>
            <span className={`p-0.5 px-2 text-[10px] uppercase font-bold rounded-full ${
              currentRole === 'admin' ? 'bg-purple-50 text-purple-800 border border-purple-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
            }`}>
              {currentRole}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-sans font-semibold text-slate-800">
            <span className="truncate max-w-[180px]">{currentUserProfile?.fullName || activeStaffMember?.name || 'Authenticated User'}</span>
          </div>
        </div>

        {/* ADMIN SIDEBAR LINKS */}
        <nav className="flex-1 px-3 space-y-1">
          {currentRole === 'admin' ? (
            navigationTabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedStaffId(null);
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-left text-xs font-semibold tracking-tight transition-all relative ${
                    activeTab === item.id && selectedStaffId === null
                      ? 'bg-slate-900 text-white font-bold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#f1f2f6]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })
          ) : (
            // STAFF ACCOUNT NAVIGATION
            <>
              <button
                onClick={() => {
                  setSelectedStaffId(null);
                  setActiveTab('staff_dashboard');
                }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-semibold tracking-tight transition ${
                  activeTab === 'staff_dashboard' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-[#f1f2f6]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStaffId(null);
                  setActiveTab('profile');
                }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-semibold tracking-tight transition ${
                  activeTab === 'profile' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-[#f1f2f6]'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Compliance & Documents</span>
              </button>

              <button
                onClick={() => setActiveTab('staff_timesheets')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-semibold tracking-tight transition ${
                  activeTab === 'staff_timesheets' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-[#f1f2f6]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Timesheets</span>
              </button>

              <button
                onClick={() => setActiveTab('training')}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-semibold tracking-tight transition ${
                  activeTab === 'training' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-[#f1f2f6]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Training & CPD</span>
              </button>
            </>
          )}
        </nav>

        {/* LOG OUT BUTTON AREA */}
        <div className="p-4 border-t border-[#e8eaee]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Securely</span>
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="md:hidden w-full bg-white border-b border-[#e8eaee] p-3 flex items-center justify-between sticky top-0 z-40">
        <BrandedLogo layout="horizontal" size="sm" />

        <div className="flex items-center space-x-3">
          <span className="text-[10px] bg-slate-100 rounded-full font-bold p-1 px-2 uppercase text-slate-600">
            {currentRole}
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-md text-slate-600 hover:bg-slate-50 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* MOBILE NAIL SLIDER DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 bg-white h-full shadow-2xl flex flex-col p-5" onClick={(e) => e.stopPropagation()}>
            <div className="pb-4 border-b mb-4 flex justify-between items-center">
              <BrandedLogo layout="horizontal" size="sm" />
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-550 hover:text-slate-800 text-xl font-black p-1 leading-none">×</button>
            </div>
            
            <nav className="flex-1 space-y-2">
              {currentRole === 'admin' ? (
                navigationTabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedStaffId(null);
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left text-xs font-semibold ${
                      activeTab === item.id && selectedStaffId === null
                        ? 'bg-slate-900 text-white font-bold'
                        : 'text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectedStaffId(null);
                      setActiveTab('staff_dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left text-xs font-semibold ${
                      activeTab === 'staff_dashboard' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <span>My Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStaffId(null);
                      setActiveTab('profile');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left text-xs font-semibold ${
                      activeTab === 'profile' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <span>Compliance & Documents</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('staff_timesheets');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left text-xs font-semibold ${
                      activeTab === 'staff_timesheets' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <span>Timesheets</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('training');
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left text-xs font-semibold ${
                      activeTab === 'training' ? 'bg-slate-900 text-white' : 'text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <span>Training & CPD</span>
                  </button>
                </>
              )}
            </nav>

            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="mt-auto py-3 w-full bg-rose-50 text-rose-700 rounded-xl font-bold flex justify-center text-xs"
            >
              Sign Out Securely
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN PAGE VIEW CONTENT AND HEADER STAGE --- */}
      <main className="flex-1 flex flex-col min-w-0" id="shc-main-view-stage">
        
        {/* UPPER TITLE BAR HEADER: Beautiful Minimal Look */}
        <header className="hidden md:flex bg-white h-14 border-b border-[#e8eaee] items-center justify-between px-8 shrink-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Profile badge with popup settings */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 hover:bg-slate-50 p-1.5 rounded-xl transition cursor-pointer"
              >
                {currentUserAvatarUrl ? (
                  <img src={currentUserAvatarUrl} alt={`${currentUserProfile?.fullName || 'User'} profile`} className="h-7 w-7 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-indigo-650 flex items-center justify-center font-bold text-white text-xs">
                    {(currentUserProfile?.fullName || activeStaffMember?.name || 'US').substring(0,2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-slate-700 hidden lg:inline">
                  {currentUserProfile?.fullName || activeStaffMember?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 text-xs text-slate-700 font-medium">
                  <div className="px-3 py-2 border-b border-slate-50">
                    <p className="font-extrabold text-slate-900 leading-none">{currentUserProfile?.fullName || 'Authenticated User'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-none">{currentUserProfile?.email || supabaseUser?.email}</p>
                  </div>
                  
                  {currentRole === 'admin' && (
                    <button
                      onClick={() => {
                        setSelectedStaffId(null);
                        setActiveTab('admin_profile');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2"
                    >
                      <span>Admin Profile</span>
                    </button>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-700 font-bold border-t flex items-center space-x-2"
                  >
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* WORKSPACE CANVAS STAGE */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* STAFF DETAIL PROFILE OVERLAY VIEW: Rendered if selectedStaffId is active */}
          {selectedStaffId !== null ? (
            <StaffProfile
              staffMember={staff.find(s => s.id === selectedStaffId) || null}
              documents={documents}
              onBack={() => setSelectedStaffId(null)}
              onUpdateStaffDetails={handleUpdateStaffDetails}
              onUploadDocument={handleUploadDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteStaff={handleDeleteStaff}
              currentRole={currentRole}
              onProfilePhotoUploaded={() => reloadWorkflowState()}
            />
          ) : (
            // --- TABBED WORKSPACE CONTENT FOR ACTIVE SELECTIONS ---
            <>
              {currentRole === 'admin' ? (
                <>
                  {/* Dashboard Tab */}
                  {activeTab === 'dashboard' && (
                    <Dashboard 
                      currentUser={staff.find(s => s.id === currentUserId)}
                      currentUserProfile={currentUserProfile}
                      currentUserAvatarUrl={currentUserAvatarUrl}
                      currentRole={currentRole}
                      applicants={applicants}
                      staff={staff}
                      documents={documents}
                      timesheets={timesheets}
                      activityLogs={activityLogs}
                      onNavigate={(tabId) => setActiveTab(tabId)}
                      onSelectStaff={(staffId) => setSelectedStaffId(staffId)}
                      templates={templates}
                      visibleCards={visibleCards}
                      onToggleCard={handleToggleCard}
                      onClearActivityLogs={handleClearActivityLogs}
                      familyFeedbacks={familyFeedbacks}
                    />
                  )}

                  {/* Recruitment Kanban */}
                  {activeTab === 'recruitment' && (
                    <ApplicantKanban
                      applicants={applicants}
                      onUpdateApplicantStatus={handleUpdateApplicantStatus}
                      onAddApplicant={handleAddApplicant}
                      templates={templates}
                      documents={documents}
                      onUpdateApplicantDetails={handleUpdateApplicantDetails}
                      onSaveCVData={handleSaveCVData}
                      onGenerateCVPdf={handleGenerateCVPdf}
                      onDeleteApplicant={handleDeleteApplicant}
                      onUploadDocument={(file, category, staffId, staffName) => {
                        handleUploadDocument({
                          name: file.name,
                          category: category as any,
                          staffId: staffId,
                          staffName: staffName,
                          status: 'Awaiting Review',
                        }, file);
                      }}
                    />
                  )}

                  {/* Staff Directory */}
                  {activeTab === 'staff' && (
                    <StaffDirectory
                      staff={staff}
                      onSelectStaff={(staffId) => setSelectedStaffId(staffId)}
                      currentRole={currentRole}
                      onAddStaff={handleAddStaff}
                      onDeleteStaff={handleDeleteStaff}
                    />
                  )}

                  {/* Document Vault */}
                  {activeTab === 'vault' && (
                    <DocumentVault 
                      documents={documents}
                      staff={staff}
                      onUploadDocument={handleUploadDocument}
                      onAssignDocument={handleAssignDocument}
                      onDeleteDocument={handleDeleteDocument}
                      onUpdateDocument={handleUpdateDocument}
                    />
                  )}

                  {/* Compliance traffic signals */}
                  {activeTab === 'compliance' && (
                    <ComplianceDashboard
                      staff={staff}
                      onSelectStaff={(staffId) => setSelectedStaffId(staffId)}
                    />
                  )}

                  {/* Job role designation criteria */}
                  {activeTab === 'templates' && (
                    <RoleTemplates
                      templates={templates}
                      onChangeTemplates={setTemplates}
                    />
                  )}

                  {/* Timesheet submission manager */}
                  {activeTab === 'timesheets' && (
                    <TimesheetManager
                      timesheets={timesheets}
                      staff={staff}
                      onUpdateTimesheetStatus={handleUpdateTimesheetStatus}
                      onAddTimesheet={handleAddTimesheet}
                    />
                  )}

                  {activeTab === 'admin_profile' && currentUserProfile && (
                    <AdminProfile
                      profile={currentUserProfile}
                      avatarUrl={currentUserAvatarUrl}
                      onSave={handleUpdateAdminProfile}
                      onPhotoUploaded={async () => {
                        await reloadWorkflowState();
                      }}
                    />
                  )}

                  {activeTab === 'administration' && (
                    <UserAdministration onSystemReset={handleSystemReset} />
                  )}

                  {/* Google Workspace operations center */}
                  {activeTab === 'workspace' && (
                    <WorkspaceSync
                      applicants={applicants}
                      staff={staff}
                      documents={documents}
                      timesheets={timesheets}
                      onAddApplicant={handleAddApplicant}
                      onUploadDocument={handleUploadDocument}
                      onUpdateApplicantDetails={handleUpdateApplicantDetails}
                      onAddLog={async (action, type) => {
                        let logType: 'applicant' | 'document' | 'compliance' | 'timesheet' | 'status' = 'document';
                        if (type === 'recruitment') logType = 'applicant';
                        else if (type === 'staff') logType = 'status';
                        else if (type === 'compliance') logType = 'compliance';
                        else if (type === 'timesheet') logType = 'timesheet';
                        else if (type === 'document') logType = 'document';

                        const log = await insertActivityLog({
                          action,
                          user: currentUserProfile?.fullName || 'Administrator',
                          type: logType
                        }, currentUserProfile?.id);
                        setActivityLogs(prev => [log, ...prev]);
                      }}
                    />
                  )}

                  {/* Family Feedbacks & Care Quality QA Management */}
                  {activeTab === 'family_feedback' && (
                    <FamilyFeedbackAdmin
                      feedbacks={familyFeedbacks}
                      onUpdateStatus={(id, newStatus) => {
                        setFamilyFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
                      }}
                      onDeleteFeedback={(id) => {
                        setFamilyFeedbacks(prev => prev.filter(f => f.id !== id));
                      }}
                      onAddLog={async (action, type) => {
                        let logType: 'applicant' | 'document' | 'compliance' | 'timesheet' | 'status' = 'compliance';
                        if (type === 'recruitment') logType = 'applicant';
                        else if (type === 'staff') logType = 'status';
                        else if (type === 'timesheet') logType = 'timesheet';
                        const log = await insertActivityLog({
                          action,
                          user: currentUserProfile?.fullName || 'Administrator',
                          type: logType
                        }, currentUserProfile?.id);
                        setActivityLogs(prev => [log, ...prev]);
                      }}
                    />
                  )}
                </>
              ) : (
                // --- CAREGIVER STAFF PORTAL INTERFACES ---
                <div className="space-y-6">
                  
                  {activeTab === 'staff_dashboard' && activeStaffMember && (
                    <StaffDashboard
                      currentUser={activeStaffMember}
                      documents={documents}
                      timesheets={timesheets.filter(t => t.staffName === activeStaffMember.name)}
                      onNavigate={(tabId) => setActiveTab(tabId)}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <div className="border border-slate-200/80 rounded-2xl bg-white shadow-sm p-1">
                      <StaffProfile
                        staffMember={activeStaffMember || null}
                        documents={documents}
                        onBack={() => setActiveTab('staff_dashboard')}
                        onUpdateStaffDetails={handleUpdateStaffDetails}
                        onUploadDocument={handleUploadDocument}
                        onUpdateDocument={handleUpdateDocument}
                        currentRole={currentRole}
                        onProfilePhotoUploaded={() => reloadWorkflowState()}
                      />
                    </div>
                  )}

                  {/* STAFF PORTAL: Timesheets logging and hours claims review */}
                  {activeTab === 'staff_timesheets' && (
                    <div className="space-y-6">
                      <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-black uppercase text-slate-800 border-b pb-2.5 mb-4 flex items-center justify-between">
                          <span>Log Shift Hours</span>
                          <button onClick={() => setActiveTab('staff_dashboard')} className="text-indigo-600 hover:underline text-xs font-bold">Back to Dashboard</button>
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                          Submit shift logs directly online to Steward Health Care 247 for processing. Claim hours matching clinical timesheet signed-off papers. Always upload a clear snapshot pdf/image of validation cards.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          
                          {/* Left: Input Claim form */}
                          <div className="lg:col-span-4 p-4 border border-dashed rounded-xl bg-slate-50/50">
                            <h4 className="font-bold text-slate-800 text-xs mb-3">Report Shifts Log</h4>
                            <TimesheetManager
                              timesheets={timesheets.filter(t => t.staffName === activeStaffMember?.name)}
                              staff={staff.filter(s => s.userId === currentUserId)}
                              onUpdateTimesheetStatus={() => {}} // Disabled for caregiver
                              onAddTimesheet={handleAddTimesheet}
                              isAdmin={false}
                            />
                          </div>

                          {/* Right: Existing claims ledger history */}
                          <div className="lg:col-span-8 space-y-4">
                            <h4 className="font-bold text-slate-800 text-xs">My Shifts Claim ledger</h4>
                            <div className="bg-white rounded-xl border overflow-hidden">
                              <table className="min-w-full divide-y text-xs">
                                <thead className="bg-[#f8f9fc]">
                                  <tr className="text-left text-[10px] text-slate-450 uppercase font-black tracking-wider">
                                    <th className="px-4 py-3">Week Ending</th>
                                    <th className="px-4 py-3">Submitted</th>
                                    <th className="px-4 py-3">Claimed Log</th>
                                    <th className="px-4 py-3">Audit Review</th>
                                    <th className="px-4 py-3 text-right">Details</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y text-slate-700">
                                  {timesheets.filter(t => t.staffName === activeStaffMember?.name).map(t => (
                                    <tr key={t.id}>
                                      <td className="px-4 py-3 font-semibold text-slate-800">{t.weekEnding}</td>
                                      <td className="px-4 py-3 text-slate-400 font-medium">{t.uploadDate}</td>
                                      <td className="px-4 py-3 font-bold font-mono text-slate-900">{t.hoursWorked} hrs</td>
                                      <td className="px-4 py-3">
                                        <span className={`p-0.5 px-2 text-[9px] rounded-full font-bold border ${
                                          t.approvalStatus === 'Approved' || t.approvalStatus === 'Paid'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : t.approvalStatus === 'Pending'
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : 'bg-rose-50 text-rose-800 border-rose-250'
                                        }`}>
                                          {t.approvalStatus}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <span className="text-[10px] text-slate-400 font-semibold">{t.fileUrl}</span>
                                      </td>
                                    </tr>
                                  ))}
                                  {timesheets.filter(t => t.staffName === activeStaffMember?.name).length === 0 && (
                                    <tr>
                                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                                        No claimed shifts registered yet.
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
                  )}

                  {activeTab === 'training' && (
                    <div className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h3 className="text-sm font-black uppercase text-slate-800">Training & CPD Modules</h3>
                        <button onClick={() => setActiveTab('staff_dashboard')} className="text-indigo-600 hover:underline text-[10px] font-bold">Back to Dashboard</button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-xl bg-emerald-50 border-emerald-200">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-emerald-900 text-xs">Mandatory Training</h4>
                            <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Compliant</span>
                          </div>
                          <p className="text-[10px] text-emerald-700">Expires: {activeStaffMember?.trainingExpiry || 'N/A'}</p>
                          <div className="mt-3">
                            <div className="h-2 w-full bg-emerald-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 w-full"></div>
                            </div>
                            <span className="text-[9px] text-emerald-600 mt-1 block">100% Completed</span>
                          </div>
                          <button onClick={() => setActiveTab('profile')} className="mt-4 text-[10px] font-bold bg-white text-emerald-700 px-3 py-1.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors w-full">View Certificate</button>
                        </div>
                        
                        <div className="p-4 border rounded-xl bg-amber-50 border-amber-200">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-amber-900 text-xs">Safeguarding Level 3</h4>
                            <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Expiring Soon</span>
                          </div>
                          <p className="text-[10px] text-amber-700">Expires: Next Month</p>
                          <div className="mt-3">
                            <div className="h-2 w-full bg-amber-200 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 w-[80%]"></div>
                            </div>
                            <span className="text-[9px] text-amber-600 mt-1 block">Requires Renewal</span>
                          </div>
                          <button onClick={() => setActiveTab('profile')} className="mt-4 text-[10px] font-bold bg-white text-amber-700 px-3 py-1.5 rounded border border-amber-200 hover:bg-amber-100 transition-colors w-full">Upload New Certificate</button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}

        </div>

      </main>

    </div>
  );
}
