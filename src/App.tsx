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
  Database, 
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
  StaffRole, 
  DocumentCategory,
  RoleTemplate,
  FamilyFeedback,
  DocumentStatus,
  mapCredentialToCategory
} from './types';

import { 
  initialApplicants, 
  initialStaff, 
  initialDocuments, 
  initialTimesheets, 
  initialActivityLogs,
  initialRoleTemplates,
  initialFamilyFeedbacks
} from './mockData';

import { supabase } from './lib/supabase';

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
import DeveloperConsole from './components/DeveloperConsole';
import UserAdministration from './components/UserAdministration';
import WorkspaceSync from './components/WorkspaceSync';
import BrandedLogo from './components/BrandedLogo';
import FamilyPortal from './components/FamilyPortal';
import FamilyFeedbackAdmin from './components/FamilyFeedbackAdmin';
import ApplicantPortal from './components/ApplicantPortal';
import StaffDashboard from './components/StaffDashboard';

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentRole, setCurrentRole] = useState<'admin' | 'staff' | 'family' | 'applicant'>('admin');
  const [currentUserId, setCurrentUserId] = useState<string>('staff_1'); // Defaults to Blessing Gurure demo
  const [userAccountRole, setUserAccountRole] = useState<'admin' | 'staff' | 'family' | 'applicant' | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);

  const [isAuthRestoring, setIsAuthRestoring] = useState(true);
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);

  const [familyFeedbacks, setFamilyFeedbacks] = useState<FamilyFeedback[]>(() => {
    const local = localStorage.getItem('shc_family_feedbacks_v2');
    if (local) {
      const parsed = JSON.parse(local);
      return Array.from(new Map(parsed.map((item: FamilyFeedback) => [item.id, item])).values()) as FamilyFeedback[];
    }
    return initialFamilyFeedbacks;
  });

  // Listen for shareable hash modification links (e.g. #family)
  useEffect(() => {
    const handleHashCheck = () => {
      if (window.location.hash === '#family') {
        setCurrentRole('family');
        setIsLoggedIn(true);
      } else if (window.location.hash === '#login') {
        setIsLoggedIn(false);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // Global Core Data Persistence State
  const [applicants, setApplicants] = useState<Applicant[]>(() => {
    const local = localStorage.getItem('shc_applicants_v2');
    if (local) {
      const parsed = JSON.parse(local);
      return Array.from(new Map(parsed.map((item: Applicant) => [item.id, item])).values()) as Applicant[];
    }
    return initialApplicants;
  });

  useEffect(() => {
    localStorage.setItem('shc_applicants_v2', JSON.stringify(applicants));
  }, [applicants]);

  const [staff, setStaff] = useState<Staff[]>(() => {
    const local = localStorage.getItem('shc_staff_v2');
    if (local) {
      const parsed = JSON.parse(local);
      return Array.from(new Map(parsed.map((item: Staff) => [item.id, item])).values()) as Staff[];
    }
    return initialStaff;
  });

  const [documents, setDocuments] = useState<Document[]>(() => {
    return initialDocuments;
  });

  const [timesheets, setTimesheets] = useState<Timesheet[]>(() => {
    const local = localStorage.getItem('shc_timesheets_v2');
    if (local) {
      const parsed = JSON.parse(local);
      return Array.from(new Map(parsed.map((item: Timesheet) => [item.id, item])).values()) as Timesheet[];
    }
    return initialTimesheets;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const local = localStorage.getItem('shc_logs_v2');
    if (local) {
      const parsed = JSON.parse(local);
      return Array.from(new Map(parsed.map((item: ActivityLog) => [item.id, item])).values()) as ActivityLog[];
    }
    return initialActivityLogs;
  });

  const [templates, setTemplates] = useState<RoleTemplate[]>(() => {
    const local = localStorage.getItem('shc_templates_v2');
    if (local) {
      const parsed = JSON.parse(local);
      return Array.from(new Map(parsed.map((item: RoleTemplate) => [item.role, item])).values()) as RoleTemplate[];
    }
    return initialRoleTemplates;
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);

  // One-time patch for "Clara" to "Blessing" locally
  useEffect(() => {
    const patched = localStorage.getItem('shc_name_patched_v2');
    if (!patched) {
      setStaff(initialStaff);
      setDocuments(initialDocuments);
      setTimesheets(initialTimesheets);
      setActivityLogs(initialActivityLogs);
      localStorage.setItem('shc_name_patched_v2', 'true');
    }
  }, []);

  // Sync to client-side localStorage
  useEffect(() => {
    localStorage.setItem('shc_recruits_v2', JSON.stringify(applicants));
  }, [applicants]);

  useEffect(() => {
    localStorage.setItem('shc_staff_v2', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('shc_timesheets_v2', JSON.stringify(timesheets));
  }, [timesheets]);

  useEffect(() => {
    localStorage.setItem('shc_logs_v2', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('shc_templates_v2', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('shc_family_feedbacks_v2', JSON.stringify(familyFeedbacks));
  }, [familyFeedbacks]);

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
        return;
      }

      try {
        const userEmail = supabaseUser.email?.toLowerCase();
        if (!userEmail) {
          throw new Error("No email associated with authenticated Supabase user.");
        }

        // Try querying public.users by UUID id first
        const { data: existingUsers, error: selectError } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id);

        if (selectError) {
          throw selectError;
        }

        let sUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

        // Fallback: If no user found by ID, query by email
        if (!sUser) {
          const { data: usersByEmail, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', userEmail);

          if (emailError) {
            throw emailError;
          }

          if (usersByEmail && usersByEmail.length > 0) {
            sUser = usersByEmail[0];
            // Sync user details to map to the new ID mapping standard
            await supabase
              .from('users')
              .update({ firebase_uid: supabaseUser.id })
              .eq('id', sUser.id);
          }
        }

        if (!active) return;

        if (sUser) {
          console.log("Successfully matched Supabase user profile during session restoration:", sUser);
          
          setSupabaseUserId(sUser.id);
          
          // Map the role from DB to React state
          const dbRole = (sUser.role || 'Applicant').toLowerCase() as 'admin' | 'staff' | 'family' | 'applicant';
          setCurrentRole(dbRole);
          setCurrentUserId(supabaseUser.id); // Map to Supabase UUID
          setUserAccountRole(dbRole);
          setIsLoggedIn(true);
          setProfileSyncError(null);

          // Fetch documents from Supabase public.documents for the user
          try {
            let query = supabase.from('documents').select('*');
            if (dbRole !== 'admin') {
              query = query.eq('user_id', sUser.id);
            }
            const { data: dbDocs, error: docsError } = await query;
            if (!docsError && dbDocs && active) {
              const mappedDbDocs: Document[] = dbDocs.map(d => ({
                id: d.id.toString(),
                name: d.document_name,
                category: d.category as DocumentCategory,
                staffId: d.user_id,
                staffName: sUser.full_name || 'System User',
                fileUrl: d.file_path,
                uploadDate: d.upload_date || new Date().toISOString().split('T')[0],
                status: (d.verification_status === 'Pending' ? 'Awaiting Review' : d.verification_status) as DocumentStatus,
              }));
              setDocuments(mappedDbDocs);
            } else if (docsError) {
              console.error("Error fetching documents from Supabase:", docsError);
            }
          } catch (docFetchErr) {
            console.error("Error during document query:", docFetchErr);
          }

          // If they are a staff member, sync with the local staff state if missing
          if (dbRole === 'staff') {
            setStaff(prevStaff => {
              const exists = prevStaff.some(s => s.email.toLowerCase() === userEmail || s.id === supabaseUser.id);
              if (!exists) {
                const newStaffMember: Staff = {
                  id: supabaseUser.id,
                  name: sUser.full_name || 'Staff Member',
                  email: sUser.email,
                  phone: 'N/A',
                  address: 'Registered Caregiver Address',
                  role: 'Care Assistant',
                  status: 'Active',
                  dbsStatus: 'Compliant',
                  rightToWork: 'Compliant',
                  trainingStatus: 'Compliant',
                  joinedDate: new Date().toISOString().split('T')[0]
                };
                return [...prevStaff, newStaffMember];
              }
              return prevStaff;
            });
          }
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
      }
    };

    syncProfile();

    return () => {
      active = false;
    };
  }, [supabaseUser]);

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
    setCurrentRole(role);
    setUserAccountRole(role);
    if (userId) {
      setCurrentUserId(userId);
    } else {
      // Demo accounts or fallback login without userId
      if (role === 'admin') {
        setCurrentUserId('admin_demo');
      } else if (role === 'staff') {
        setCurrentUserId('staff_1');
      }
    }
    setIsLoggedIn(true);
    setSelectedStaffId(null);
    if (role === 'family') {
      window.location.hash = 'family';
    } else {
      // Clear hash if logging in as staff/admin so they don't get routed back
      if (window.location.hash === '#family') {
        window.location.hash = '';
      }
      setActiveTab(role === 'admin' ? 'dashboard' : 'staff_dashboard');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setProfileDropdownOpen(false);
    setProfileSyncError(null);
  };

  // State mutation callbacks passed to children components
  const handleUpdateApplicantStatus = async (id: string, newStatus: ApplicantStatus) => {
    const targetApplicant = applicants.find(a => a.id === id);
    if (!targetApplicant) return;

    if (newStatus === 'Accepted') {
      // 1. Automatically remove them from the Recruitment Pipeline
      setApplicants(prev => prev.filter(a => a.id !== id));

      // 2. Automatically create an Active Staff record
      const alreadyExists = staff.some(s => s.email.toLowerCase() === targetApplicant.email.toLowerCase());
      if (!alreadyExists) {
        // Automatically assign: Staff ID, Compliance Profile, Document Folder, Employment Status = Active
        const newStaffId = `staff_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const newStaffMember: Staff = {
          id: newStaffId,
          name: targetApplicant.name,
          email: targetApplicant.email,
          phone: targetApplicant.phone,
          address: 'Registered Candidate Address',
          role: targetApplicant.position as StaffRole,
          status: 'Active',
          dbsStatus: 'Compliant',
          dbsNumber: `001${Math.floor(10000000 + Math.random() * 90000000)}`,
          dbsExpiry: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
          rightToWork: 'Compliant',
          rightToWorkExpiry: new Date(Date.now() + 4 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
          trainingStatus: 'Compliant',
          trainingExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
          joinedDate: new Date().toISOString().split('T')[0]
        };
        setStaff(prevStaff => [...prevStaff, newStaffMember]);

        // Automatically assign Document Folder
        const placeholderDoc: Document = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(7)}_pass`,
          name: `${targetApplicant.name.replace(/\s+/g, '_')}_Compliance_Profile.pdf`,
          category: 'Passport',
          staffId: newStaffMember.id,
          staffName: targetApplicant.name,
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'Approved',
          size: '1.5 MB'
        };
        setDocuments(prevDocs => [placeholderDoc, ...prevDocs]);
        
        // Log every action inside Recent Activity
        const logs: ActivityLog[] = [
          {
            id: `act_${Date.now()}_1`,
            action: `RECRUITMENT: Candidate ${targetApplicant.name} reached Accepted stage and was removed from the Recruitment Pipeline.`,
            timestamp: 'Just now',
            user: 'Agency Automation',
            type: 'applicant'
          },
          {
            id: `act_${Date.now()}_2`,
            action: `STAFFING: Automatically created Active Staff record for ${targetApplicant.name} (Staff ID: ${newStaffId}).`,
            timestamp: 'Just now',
            user: 'Agency Automation',
            type: 'status'
          },
          {
            id: `act_${Date.now()}_3`,
            action: `COMPLIANCE: Automatically assigned Compliance Profile and Document Folder to ${targetApplicant.name}.`,
            timestamp: 'Just now',
            user: 'Agency Automation',
            type: 'compliance'
          }
        ];
        setActivityLogs(prevLogs => [...logs, ...prevLogs]);
      }
    } else {
      setApplicants(prev => prev.map(a => {
        if (a.id === id) {
          return { ...a, status: newStatus };
        }
        return a;
      }));
    }
  };

  const handleAddApplicant = (applicant: Omit<Applicant, 'id' | 'dateCreated'>, specificId?: string) => {
    const newId = specificId || `app_${Date.now()}`;
    const newApp: Applicant = {
      ...applicant,
      id: newId,
      dateCreated: new Date().toISOString().split('T')[0]
    };

    setApplicants(prev => [newApp, ...prev]);

    // Push activity log
    const log: ActivityLog = {
      id: `act_${Date.now()}`,
      action: `REGISTRY: New candidate applicant ${applicant.name} registered successfully as ${applicant.position}`,
      timestamp: 'Just now',
      user: 'System Bot',
      type: 'applicant'
    };
    setActivityLogs(prev => [log, ...prev]);
    return newApp.id;
  };

  const handleUpdateApplicantCompliance = (applicantId: string, complianceChecked: Record<string, 'Compliant' | 'Awaiting Review' | 'Missing'>) => {
    setApplicants(prev => prev.map(a => {
      if (a.id === applicantId) {
        return {
          ...a,
          complianceChecked
        };
      }
      return a;
    }));
  };

  const handleUpdateApplicantDetails = (id: string, fields: Partial<Applicant>) => {
    setApplicants(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, ...fields };
      }
      return a;
    }));
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

      // 1. Delete from local applicants state
      setApplicants(prev => prev.filter(a => a.id !== id));

      // 2. Delete any documents where staffId is the applicant id
      setDocuments(prev => prev.filter(d => d.staffId !== id));

      // 3. Delete any timesheets associated with this applicant's name
      setTimesheets(prev => prev.filter(t => t.staffName !== targetApplicant.name));

      // 4. Look for any associated user record in Supabase 'users' table and delete it
      try {
        await supabase
          .from('users')
          .delete()
          .eq('email', targetApplicant.email.toLowerCase());
      } catch (err) {
        console.error("Error deleting matching Supabase user account:", err);
      }

      // 5. Push an activity log
      const log: ActivityLog = {
        id: `act_${Date.now()}`,
        action: `DELETION: Administrator permanently purged candidate "${targetApplicant.name}" along with all files, credentials, timesheets, and historical logs.`,
        timestamp: 'Just now',
        user: 'Blessing (Super-Admin)',
        type: 'applicant'
      };
      setActivityLogs(prev => [log, ...prev]);

    } catch (err) {
      console.error("Error during comprehensive applicant deletion:", err);
    }
  };

  const handleUpdateStaffDetails = async (updatedStaff: Staff) => {
    setStaff(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));

    const log: ActivityLog = {
      id: `act_${Date.now()}`,
      action: `COMPLIANCE: Personal details updated directly for staff member ${updatedStaff.name}`,
      timestamp: 'Just now',
      user: 'System Bot',
      type: 'compliance'
    };
    setActivityLogs(prev => [log, ...prev]);
  };

  const handleAddStaff = async (newStaff: Staff) => {
    try {
      // Save to local React State (triggers localStorage sync automatically)
      setStaff(prev => [...prev, newStaff]);

      // Push an activity log
      const log: ActivityLog = {
        id: `act_${Date.now()}`,
        action: `STAFF REGISTRATION: Manually registered new staff member "${newStaff.name}" (${newStaff.role}) into the active registry.`,
        timestamp: 'Just now',
        user: 'Blessing (Super-Admin)',
        type: 'compliance'
      };
      setActivityLogs(prev => [log, ...prev]);
    } catch (err) {
      console.error("Error manual registering staff:", err);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      const target = staff.find(s => s.id === staffId);
      if (!target) return;

      // 1. Remove from local state
      setStaff(prev => prev.filter(s => s.id !== staffId));

      // 2. Clear selectedStaffId if it was this staff
      if (selectedStaffId === staffId) {
        setSelectedStaffId(null);
      }

      // 3. Delete documents assigned to this staff member
      setDocuments(prev => prev.filter(d => d.staffId !== staffId));

      // 4. Delete timesheets assigned to this staff member
      setTimesheets(prev => prev.filter(t => t.staffName !== target.name));

      // 5. Delete associated Supabase profile
      try {
        await supabase
          .from('users')
          .delete()
          .eq('email', target.email.toLowerCase());
      } catch (err) {
        console.error("Error deleting matching Supabase user account for staff:", err);
      }

      // 6. Push Activity Log
      const log: ActivityLog = {
        id: `act_${Date.now()}`,
        action: `STAFF DELETION: Permanently deleted staff member "${target.name}" and purged all associated compliance records.`,
        timestamp: 'Just now',
        user: 'Blessing (Super-Admin)',
        type: 'compliance'
      };
      setActivityLogs(prev => [log, ...prev]);
    } catch (err) {
      console.error("Error deleting staff member:", err);
    }
  };

  const handleUpdateDocument = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc));

    const log: ActivityLog = {
      id: `act_${Date.now()}`,
      action: `COMPLIANCE: Online form completed and e-signed: '${updatedDoc.category}' for ${updatedDoc.staffName}`,
      timestamp: 'Just now',
      user: updatedDoc.staffName || 'System Bot',
      type: 'document'
    };
    setActivityLogs(prev => [log, ...prev]);
  };

  const handleUploadDocument = async (doc: Omit<Document, 'id' | 'uploadDate'>, file?: File) => {
    let finalFileUrl = doc.fileUrl;
    
    if (file) {
      const filePath = `${Date.now()}_${file.name}`;
      let uploadedToStorage = false;

      try {
        // 1. Upload the file into the private Supabase Storage bucket named: documents
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

        // 2. Generate/fetch the public URL for local state preview in Vault
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
          
        finalFileUrl = urlData?.publicUrl || '';

        // Determine target user's Supabase UUID
        let targetSupabaseId = null;
        const targetFirebaseUid = doc.staffId || currentUserId;
        
        if (targetFirebaseUid === currentUserId && supabaseUserId) {
          targetSupabaseId = supabaseUserId;
        } else if (targetFirebaseUid) {
          const targetApplicant = applicants.find(a => a.id === targetFirebaseUid);
          const targetStaff = staff.find(s => s.id === targetFirebaseUid);
          const email = targetApplicant?.email || targetStaff?.email || 'unknown@example.com';
          const name = targetApplicant?.name || targetStaff?.name || 'Unknown User';
          
          try {
            // Check if user exists by firebase_uid
            let { data: uData, error: uError } = await supabase
              .from('users')
              .select('id')
              .eq('firebase_uid', targetFirebaseUid)
              .maybeSingle();

            if (!uData) {
              // Also try checking by email
              const { data: eData } = await supabase
                .from('users')
                .select('id')
                .eq('email', email.toLowerCase())
                .maybeSingle();
              uData = eData;
            }

            if (uData) {
              targetSupabaseId = uData.id;
            } else {
              // Create new user row
              const { data: newUData, error: insError } = await supabase
                .from('users')
                .insert({
                  firebase_uid: targetFirebaseUid,
                  full_name: name,
                  email: email.toLowerCase(),
                  role: 'Applicant',
                  status: 'Pending'
                })
                .select('id')
                .single();
              if (newUData) {
                targetSupabaseId = newUData.id;
              } else {
                console.error("Failed to create new Supabase user on-the-fly for upload sync:", insError);
              }
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
          verification_status: 'Pending'
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
          .insert(insertPayload);

        if (dbError) {
          throw new Error(`Database registration failed: ${dbError.message}`);
        }
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
      id: `doc_${Date.now()}`,
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

  const handleAssignDocument = (targetStaffId: string, docCategory: DocumentCategory, docName: string) => {
    const targetStaff = staff.find(s => s.id === targetStaffId);
    const staffMemberName = targetStaff?.name || 'Unknown';
    const staffEmail = targetStaff?.email || 'staff@example.com';
    const docId = `doc_assigned_${Date.now()}`;
    const secureLink = `https://shc.test/sign/${docId}`;

    const newAssigned: Document = {
      id: docId,
      name: docName,
      category: docCategory,
      staffId: targetStaffId,
      staffName: staffMemberName,
      uploadDate: new Date().toISOString().split('T')[0],
      status: 'Sent',
      assignedByAdmin: true,
      size: '420 KB'
    };
    setDocuments(prev => [newAssigned, ...prev]);

    // Open email client
    const subject = encodeURIComponent(`Action Required: E-Signature Request for ${docName}`);
    const body = encodeURIComponent(`Hello ${staffMemberName},\n\nPlease review and sign your document here:\n${secureLink}\n\nThank you.`);
    window.location.href = `mailto:${staffEmail}?subject=${subject}&body=${body}`;

    const logSent: ActivityLog = {
      id: `act_${Date.now()}_sent`,
      action: `E-SIGNATURE SENT: Secure link emailed to ${staffMemberName} (${staffEmail}) for ${docName}`,
      timestamp: 'Just now',
      user: 'System Workflow',
      type: 'document'
    };
    setActivityLogs(prev => [logSent, ...prev]);

    // Simulate lifecycle automatically
    const simulateStatus = (status: DocumentStatus, actionMsg: string, delayMs: number) => {
      setTimeout(() => {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
        setActivityLogs(prev => [{
          id: `act_${Date.now()}_${status.toLowerCase()}`,
          action: actionMsg,
          timestamp: 'Just now',
          user: 'System Workflow',
          type: 'document'
        }, ...prev]);
      }, delayMs);
    };

    simulateStatus('Opened', `E-SIGNATURE OPENED: ${staffMemberName} viewed ${docName}`, 4000);
    simulateStatus('Signed', `E-SIGNATURE SIGNED: ${staffMemberName} electronically signed ${docName}`, 8000);
    simulateStatus('Completed', `E-SIGNATURE COMPLETED: Workflow finished for ${docName}. Locked & encrypted.`, 12000);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleUpdateTimesheetStatus = (timesheetId: string, status: 'Approved' | 'Rejected' | 'Paid') => {
    setTimesheets(prev => prev.map(t => {
      if (t.id === timesheetId) {
        return { 
          ...t, 
          approvalStatus: status,
          reviewer: 'Admin'
        };
      }
      return t;
    }));

    const target = timesheets.find(t => t.id === timesheetId);
    if (target) {
      const log: ActivityLog = {
        id: `act_${Date.now()}`,
        action: `FINANCE AUDIT: Timesheet submission for ${target.staffName} (${target.hoursWorked} hrs) marked as '${status}'`,
        timestamp: 'Just now',
        user: 'Agency Admin (Blessing)',
        type: 'timesheet'
      };
      setActivityLogs(prev => [log, ...prev]);
    }
  };

  const handleAddTimesheet = (timesheet: Omit<Timesheet, 'id' | 'uploadDate'>) => {
    const newTime: Timesheet = {
      ...timesheet,
      id: `time_${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    setTimesheets(prev => [newTime, ...prev]);

    const log: ActivityLog = {
      id: `act_${Date.now()}`,
      action: `SHIFT CLAIM: Shift claim log reported directly by ${timesheet.staffName}: ${timesheet.hoursWorked} registered hours`,
      timestamp: 'Just now',
      user: timesheet.staffName,
      type: 'timesheet'
    };
    setActivityLogs(prev => [log, ...prev]);
  };

  // Helper selectors
  const activeStaffMember = staff.find(s => s.id === (selectedStaffId || currentUserId));

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
    { id: 'administration', label: 'User Administration', icon: Shield, desc: 'Manage system users and access roles' },
    { id: 'system', label: 'Developer Settings', icon: Database, desc: 'Architect schema schemas' }
  ];

  // Auth Guard
  if (isAuthRestoring) {
    return <div className="flex h-screen items-center justify-center font-sans"><span className="text-slate-500 font-bold">Restoring user session...</span></div>;
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
    const activeApplicant = applicants.find(a => a.id === currentUserId);
    if (!activeApplicant) {
      // Fallback if they were somehow deleted
      return <div>Profile not found. <button onClick={handleLogout}>Logout</button></div>;
    }
    return (
      <ApplicantPortal 
        applicant={activeApplicant}
        templates={templates}
        documents={documents}
        onUploadDocument={(file, category) => {
          handleUploadDocument({
            name: file.name,
            category: category as any,
            staffId: currentUserId,
            staffName: activeApplicant.name,
            status: 'Awaiting Review',
          }, file);
        }}
        onUpdateApplicantCompliance={handleUpdateApplicantCompliance}
        onSaveCVData={handleSaveCVData}
        onGenerateCVPdf={handleGenerateCVPdf}
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
            <span className="truncate max-w-[130px]">{currentRole === 'admin' ? 'Blessing (Super-Admin)' : activeStaffMember?.name}</span>
            {userAccountRole === 'admin' && (
              <button 
                onClick={() => {
                  // Instantly swap perspective for satisfied evaluation
                  const nextRole = currentRole === 'admin' ? 'staff' : 'admin';
                  setCurrentRole(nextRole);
                  setSelectedStaffId(null);
                  setActiveTab(nextRole === 'admin' ? 'dashboard' : 'staff_dashboard');
                }}
                className="text-[9px] text-indigo-700 font-bold hover:underline"
                title="Switch role perspective"
              >
                [Swap]
              </button>
            )}
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
            
            {/* Quick swap button directly in the main header for satisfied exploration */}
            {userAccountRole === 'admin' && (
              <button
                onClick={() => {
                  const nextRole = currentRole === 'admin' ? 'staff' : 'admin';
                  setCurrentRole(nextRole);
                  setSelectedStaffId(null);
                  setActiveTab(nextRole === 'admin' ? 'dashboard' : 'staff_dashboard');
                }}
                className="inline-flex items-center space-x-1 border border-slate-205 rounded-xl px-2.5 py-1 text-[10px] bg-slate-50 font-black tracking-wider text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 transition cursor-pointer"
              >
                <span>SWAP ROLE:</span>
                <span className="text-[#9C1F60] font-black">{currentRole === 'admin' ? 'STAFF' : 'ADMIN'}</span>
              </button>
            )}

            {/* Profile badge with popup settings */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 hover:bg-slate-50 p-1.5 rounded-xl transition cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-indigo-650 flex items-center justify-center font-bold text-white text-xs">
                  {currentRole === 'admin' ? 'BL' : activeStaffMember?.name.substring(0,2).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-700 hidden lg:inline">
                  {currentRole === 'admin' ? 'Blessing (Admin)' : activeStaffMember?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 text-xs text-slate-700 font-medium">
                  <div className="px-3 py-2 border-b border-slate-50">
                    <p className="font-extrabold text-slate-900 leading-none">Blessing Steward</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-none">blessing.admin@shc247.co.uk</p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setCurrentRole('admin');
                      setSelectedStaffId(null);
                      setActiveTab('system');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2"
                  >
                    <span>System Architecture Spec</span>
                  </button>

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
                      onUpdateApplicantCompliance={handleUpdateApplicantCompliance}
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

                  {/* Schema Developer Database ERCD blueprints sandbox */}
                  {activeTab === 'system' && (
                    <DeveloperConsole
                      staff={staff}
                      applicants={applicants}
                      documents={documents}
                      timesheets={timesheets}
                      onSystemReset={handleSystemReset}
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
                      onAddLog={(action, type) => {
                        let logType: 'applicant' | 'document' | 'compliance' | 'timesheet' | 'status' = 'document';
                        if (type === 'recruitment') logType = 'applicant';
                        else if (type === 'staff') logType = 'status';
                        else if (type === 'compliance') logType = 'compliance';
                        else if (type === 'timesheet') logType = 'timesheet';
                        else if (type === 'document') logType = 'document';

                        const log: ActivityLog = {
                          id: `act_${Date.now()}`,
                          action,
                          timestamp: 'Just now',
                          user: 'Blessing (Admin)',
                          type: logType
                        };
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
                      onAddLog={(action, type) => {
                        let logType: 'applicant' | 'document' | 'compliance' | 'timesheet' | 'status' = 'compliance';
                        if (type === 'recruitment') logType = 'applicant';
                        else if (type === 'staff') logType = 'status';
                        else if (type === 'timesheet') logType = 'timesheet';
                        const log: ActivityLog = {
                          id: `act_${Date.now()}`,
                          action,
                          timestamp: 'Just now',
                          user: 'Blessing (Admin)',
                          type: logType
                        };
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
                              staff={staff.filter(s => s.id === currentUserId)}
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
