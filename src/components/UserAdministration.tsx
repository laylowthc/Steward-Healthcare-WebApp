import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, User, UserPlus, UserMinus, ShieldAlert, Key, CheckCircle, Search, Mail, RefreshCw, Cloud, CloudOff, Send, Check } from 'lucide-react';
import { 
  syncGmailContacts, 
  sendGmailOutreach, 
  updateLocalContactStatus, 
  OUTREACH_TEMPLATES, 
  GmailContact 
} from '../lib/gmailService';
import { applicantToRow, insertActivityLog } from '../lib/workflowRepository';

interface SystemUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'applicant' | 'family';
  status?: 'Pending' | 'Active' | 'Suspended';
  permissions?: string[];
}

interface UserAdministrationProps {
  onSystemReset?: () => Promise<void>;
}

export default function UserAdministration({ onSystemReset }: UserAdministrationProps) {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('All');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff' | 'applicant' | 'family'>('applicant');
  
  const [isManagingPermissions, setIsManagingPermissions] = useState<SystemUser | null>(null);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);
  
  const availablePermissions = ['View Reports', 'Manage Documents', 'Approve Timesheets', 'Manage Roster'];

  // Gmail outreach & sync states
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return sessionStorage.getItem('shc_google_access_token');
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [gmailContacts, setGmailContacts] = useState<GmailContact[]>([]);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [outreachModalContact, setOutreachModalContact] = useState<GmailContact | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('temp_onboarding');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [targetPosition, setTargetPosition] = useState('Care Assistant');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Automatically fetch Gmail contacts when token is available
  useEffect(() => {
    if (googleToken) {
      handleSyncContacts(googleToken);
    }
  }, [googleToken]);

  // Update outreach email body template placeholders dynamically
  useEffect(() => {
    if (outreachModalContact) {
      const template = OUTREACH_TEMPLATES.find(t => t.id === selectedTemplateId);
      if (template) {
        const parsedSubject = template.subject
          .replace(/{name}/g, outreachModalContact.name)
          .replace(/{position}/g, targetPosition);
        const parsedBody = template.body
          .replace(/{name}/g, outreachModalContact.name)
          .replace(/{position}/g, targetPosition);
        setEmailSubject(parsedSubject);
        setEmailBody(parsedBody);
      }
    }
  }, [selectedTemplateId, outreachModalContact, targetPosition]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const { googleSignIn } = await import('../lib/auth');
      const result = await googleSignIn();
      if (result) {
        setGoogleToken(result.accessToken);
        sessionStorage.setItem('shc_google_access_token', result.accessToken);
        showMessage('Successfully connected Gmail outreach desk.', 'success');
        handleSyncContacts(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google Auth Failed:', err);
      showMessage('Google Gmail authorization failed. Check the configured Google/Firebase OAuth settings.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setGoogleToken(null);
    sessionStorage.removeItem('shc_google_access_token');
    setGmailContacts([]);
    showMessage('Disconnected Google session.', 'success');
    try {
      const { logout } = await import('../lib/auth');
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncContacts = async (token: string) => {
    if (!token) return;
    setIsSyncingContacts(true);
    try {
      const contacts = await syncGmailContacts(token);
      setGmailContacts(contacts);
      showMessage(`Successfully synchronized ${contacts.length} outreach leads from Gmail.`, 'success');
    } catch (err: any) {
      console.error(err);
      showMessage('Failed to sync Gmail contacts. Your authorization token may be expired.', 'error');
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleImportContact = async (contact: GmailContact) => {
    // Explicit user confirmation required as per workspace integration guidelines
    const confirmed = window.confirm(
      `Are you sure you want to import ${contact.name} (${contact.email}) as a Caregiver Applicant into the onboarding pipeline?`
    );
    if (!confirmed) return;

    try {
      const newApp = {
        name: contact.name,
        email: contact.email,
        phone: '(Synchronized from Gmail)',
        position: 'Care Assistant',
        status: 'Applied' as const,
        dateCreated: new Date().toISOString().split('T')[0],
        notes: `IMPORTED FROM GMAIL OUTREACH: Extracted candidate inquiry. (Email Subject: "${contact.subject}")`,
        complianceChecked: {
          'Passport': 'Missing' as const,
          'DBS Certificate': 'Missing' as const,
          'Right to Work': 'Missing' as const,
          'Training Certificate': 'Missing' as const
        }
      };

      const { error: insertError } = await supabase.from('applicants').insert(applicantToRow(newApp));
      if (insertError) throw insertError;

      // Update contact status in UI and local storage
      updateLocalContactStatus(contact.id, 'Imported');
      setGmailContacts(prev => prev.map(c => c.id === contact.id ? { ...c, status: 'Imported' as const } : c));
      
      await insertActivityLog({
        action: `RECRUITMENT OUTREACH: Imported Gmail lead ${contact.name} (${contact.email}) as applicant.`,
        user: 'Admin Outreach',
        type: 'applicant'
      });

      showMessage(`Imported ${contact.name} to Applicant Kanban successfully.`, 'success');
    } catch (error) {
      console.error("Error importing contact:", error);
      showMessage("Failed to import contact as applicant.", 'error');
    }
  };

  const handleSendEmail = async () => {
    if (!outreachModalContact || !googleToken) return;
    
    // Explicit user confirmation required before executing a mutating/sending API call
    const confirmed = window.confirm(
      `Send this recruitment outreach email to ${outreachModalContact.name} (${outreachModalContact.email})?`
    );
    if (!confirmed) return;

    setIsSendingEmail(true);
    try {
      await sendGmailOutreach(googleToken, outreachModalContact.email, emailSubject, emailBody);
      
      // Update contact status in UI and local storage
      updateLocalContactStatus(outreachModalContact.id, 'Contacted');
      setGmailContacts(prev => prev.map(c => c.id === outreachModalContact.id ? { ...c, status: 'Contacted' as const } : c));

      await insertActivityLog({
        action: `GMAIL OUTREACH: Sent email "${emailSubject}" to candidate ${outreachModalContact.name}.`,
        user: 'Admin Outreach',
        type: 'status'
      });

      showMessage(`Email successfully sent to ${outreachModalContact.email}`, 'success');
      setOutreachModalContact(null);
    } catch (err) {
      console.error(err);
      showMessage("Failed to send email. Please check your connection or retry.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) {
        throw error;
      }

      const fetchedUsers: SystemUser[] = (data || []).map(row => ({
        id: row.id,
        uid: row.firebase_uid || row.id,
        name: row.full_name || 'No Name',
        email: row.email,
        role: (row.role || 'Applicant').toLowerCase() as SystemUser['role'],
        status: row.status || 'Pending',
        permissions: row.permissions || []
      }));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    try {
      const dbRole = inviteRole === 'admin' ? 'Admin' : (inviteRole === 'staff' ? 'Staff' : 'Applicant');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Access token not found. Please sign in again.');
      }

      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: inviteName,
          email: inviteEmail,
          role: dbRole,
          status: 'Pending'
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invitation.');
      }

      await fetchUsers();
      showMessage(`Invitation sent to ${inviteEmail}.`, 'success');
      setIsInviting(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('applicant');
    } catch (error: any) {
      console.error("Error inviting user:", error);
      showMessage(`Failed to send invitation: ${error.message || error}`, 'error');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: SystemUser['role']) => {
    try {
      const dbRole = newRole === 'admin' ? 'Admin' : (newRole === 'staff' ? 'Staff' : 'Applicant');
      const { error } = await supabase
        .from('users')
        .update({ role: dbRole })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showMessage(`User role successfully updated to ${newRole}.`, 'success');
    } catch (error: any) {
      console.error("Error updating role:", error);
      showMessage(`Failed to update user role: ${error.message || error}`, 'error');
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Access token not found. Please sign in again.');
      }

      const response = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update account status.');

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      showMessage(`User account ${newStatus.toLowerCase()}.`, 'success');
    } catch (error: any) {
      console.error("Error toggling status:", error);
      showMessage(`Failed to update account status: ${error.message || error}`, 'error');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`,
      });
      if (error) throw error;
      showMessage(`Password reset email sent to ${email}.`, 'success');
    } catch (error) {
      console.error("Error sending reset email:", error);
      showMessage("Failed to send password reset email.", 'error');
    }
  };

  const handleTogglePermission = async (user: SystemUser, permission: string) => {
    const currentPerms = user.permissions || [];
    const newPerms = currentPerms.includes(permission) 
      ? currentPerms.filter(p => p !== permission)
      : [...currentPerms, permission];
      
    try {
      const { error } = await supabase
        .from('users')
        .update({ permissions: newPerms })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      const updatedUser = { ...user, permissions: newPerms };
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      setIsManagingPermissions(updatedUser);
    } catch (error: any) {
      console.error("Error updating permissions:", error);
      showMessage(`Failed to update permissions: ${error.message || error}`, 'error');
    }
  };

  const executeDeleteUser = async (user: SystemUser) => {
    try {
      console.log(`[UserAdministration] Beginning backend administrative delete for user ID: "${user.id}"`);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert("CRITICAL ERROR: Access token not found. Please log out and sign in again to re-authenticate.");
        return;
      }

      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: user.id })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("[UserAdministration] Backend administrative deletion failed:", result);
        alert(`CRITICAL ERROR: Backend administrative deletion was blocked or failed.\n\nMessage: ${result.error || "Unknown server error"}\nDetails: ${JSON.stringify(result.details || {})}`);
        return; // STOP!
      }

      console.log("[UserAdministration] Backend administrative deletion successful:", result);
      
      // Update the UI state
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setDeleteConfirmUserId(null);

      const details = result.details || {};
      alert(`SUCCESS:\nUser profile, all associated documents (${details.documentsDeletedCount || 0} file(s)), and active Supabase Auth credentials have been successfully purged from the database and storage backend.`);
      
    } catch (error: any) {
      console.error("Error during secure backend user deletion:", error);
      alert(`An error occurred during secure deletion: ${error.message || error}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <span className="p-0.5 px-2 bg-indigo-500/35 border border-indigo-400 text-indigo-300 rounded text-[9px] font-black uppercase tracking-wider">
              Administration Center
            </span>
            <h2 className="text-2xl font-bold tracking-tight mt-2 text-white">System Users & Permissions</h2>
            <p className="text-slate-400 text-xs mt-1">
              Manage system access, promote applicants, create administrators, and control account statuses.
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsInviting(true)}
              className="flex items-center space-x-2 bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite New User</span>
            </button>
          </div>
        </div>
      </div>

      {isInviting && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Invite New User</h3>
              <button onClick={() => setIsInviting(false)} className="text-slate-400 hover:text-slate-600">
                <ShieldAlert className="w-5 h-5 opacity-0" /> {/* Spacer */}
                <span className="text-xs font-bold mr-2">Cancel</span>
              </button>
            </div>
            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-sm"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-sm"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Role</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  <option value="applicant">Applicant</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-indigo-700 transition">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className={`p-4 rounded-xl border ${actionMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <div className="flex items-center">
            {actionMessage.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2 shrink-0" /> : <ShieldAlert className="w-5 h-5 mr-2 shrink-0" />}
            <span className="text-sm font-bold">{actionMessage.text}</span>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute inset-y-0 left-0 pl-3 h-5 w-5 text-slate-400 flex items-center pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or email..."
              className="pl-9 p-2 w-full border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Role:</span>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="p-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none font-semibold"
            >
              <option value="All">All Users</option>
              <option value="Applicant">Applicants</option>
              <option value="Staff">Staff</option>
              <option value="Admin">Administrators</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <span className="text-slate-500 font-bold animate-pulse">Loading users...</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-sm">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{user.name || 'Unknown User'}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as any)}
                        className={`text-xs font-bold p-1 rounded border ${
                          user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          user.role === 'staff' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="applicant">Applicant</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                        <option value="family">Family</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        user.status === 'Suspended'
                          ? 'bg-rose-100 text-rose-800'
                          : user.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {user.status || 'Pending'}
                      </span>
                    </td>
                     <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {deleteConfirmUserId === user.id ? (
                          <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-100 rounded-lg p-1">
                            <span className="text-[10px] font-bold text-rose-800 animate-pulse uppercase">Purge Account?</span>
                            <button
                              onClick={() => executeDeleteUser(user)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUserId(null)}
                              className="px-2 py-0.5 border border-slate-300 text-slate-600 text-[10px] font-semibold rounded bg-white"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setIsManagingPermissions(user)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Manage Permissions"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.email)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Send Password Reset"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1.5 rounded transition-colors ${
                                user.status !== 'Active'
                                  ? 'text-emerald-500 hover:bg-emerald-50' 
                                  : 'text-amber-500 hover:bg-amber-50'
                              }`}
                              title={user.status === 'Active' ? 'Suspend Account' : 'Activate Account'}
                            >
                              {user.status !== 'Active' ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUserId(user.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete User"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm font-medium">
                      No users found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isManagingPermissions && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Manage Permissions</h3>
                <p className="text-[10px] text-slate-500">{isManagingPermissions.name}</p>
              </div>
              <button onClick={() => setIsManagingPermissions(null)} className="text-slate-400 hover:text-slate-600">
                <span className="text-xs font-bold">Done</span>
              </button>
            </div>
            <div className="p-6 space-y-3">
              {availablePermissions.map(permission => {
                const isGranted = (isManagingPermissions.permissions || []).includes(permission);
                return (
                  <label key={permission} className="flex items-center space-x-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={isGranted}
                      onChange={() => handleTogglePermission(isManagingPermissions, permission)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">{permission}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Gmail Outreach & Automation Desk */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 mb-5 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-0.5 px-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wider">
                Recruitment Automation
              </span>
              {googleToken && (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                  <span>Gmail Online</span>
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-2">Gmail Contacts Outreach Registry</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Connect your authorized caregiver recruitment mailbox to sync candidate leads, send templated compliance outreach, and import talent instantly.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {!googleToken ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Cloud className="w-4 h-4" />
                <span>{isConnecting ? 'Authorizing...' : 'Connect Gmail Outreach'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSyncContacts(googleToken)}
                  disabled={isSyncingContacts}
                  className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-2 rounded-xl transition"
                  title="Synchronize Gmail messages"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                  <span>{isSyncingContacts ? 'Syncing...' : 'Sync Gmail Contacts'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="flex items-center space-x-1 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  <CloudOff className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {!googleToken ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-slate-700">Gmail Integration Not Linked</h4>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1 mb-4">
              Connect your Google Workspace email client to pull care applicant emails, reply with templates, and automate tracking.
            </p>
            <button
              type="button"
              onClick={handleConnectGoogle}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition shadow"
            >
              <Cloud className="w-4 h-4" />
              <span>Link Gmail Account</span>
            </button>
          </div>
        ) : (
          <div>
            {isSyncingContacts && gmailContacts.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-xs font-bold animate-pulse">Syncing recent caretaker communication threads...</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Gmail Sender</th>
                      <th className="px-4 py-3">Communication Inquiry</th>
                      <th className="px-4 py-3">Received</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Outreach Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 animate-fade-in">
                    {gmailContacts.map((contact) => (
                      <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-bold text-slate-900">{contact.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{contact.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs sm:max-w-md">
                          <div className="font-semibold text-slate-800 truncate" title={contact.subject}>
                            {contact.subject}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5" title={contact.snippet}>
                            {contact.snippet}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-[11px]">
                          {new Date(contact.date).toLocaleDateString()} {new Date(contact.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            contact.status === 'Imported' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            contact.status === 'Contacted' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {contact.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            {contact.status !== 'Imported' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setOutreachModalContact(contact)}
                                  className="inline-flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                  title="Send Outreach Email"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>Outreach</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleImportContact(contact)}
                                  className="inline-flex items-center space-x-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                                  title="Add to Onboarding Pipeline"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Import</span>
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Onboarding Active</span>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {gmailContacts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-xs font-semibold">
                          No recruit-specific email messages discovered in your inbox.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outreach Email Sending Modal */}
      {outreachModalContact && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>Draft Recruitment Outreach</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Recipient: {outreachModalContact.name} ({outreachModalContact.email})</p>
              </div>
              <button 
                onClick={() => setOutreachModalContact(null)} 
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
            <div className="p-6 space-y-4 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Email Template</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50"
                  >
                    {OUTREACH_TEMPLATES.map(temp => (
                      <option key={temp.id} value={temp.id}>{temp.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Candidate Position Target</label>
                  <select
                    value={targetPosition}
                    onChange={(e) => setTargetPosition(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-slate-50"
                  >
                    <option value="Care Assistant">Care Assistant</option>
                    <option value="Senior Care Assistant">Senior Care Assistant</option>
                    <option value="Nurse">Registered Nurse</option>
                    <option value="Support Worker">Support Worker</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Message Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed whitespace-pre-wrap"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-bold italic">
                Secure Google API outbound transmission
              </span>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingEmail ? 'Sending...' : 'Send Outreach Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {onSystemReset && (
        <div className="mt-8 bg-rose-50/50 border border-rose-200 p-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h4 className="text-sm font-extrabold text-rose-950 flex items-center">
                <ShieldAlert className="w-4 h-4 text-rose-700 mr-2" />
                <span>System Administration Maintenance Controls</span>
              </h4>
              <p className="text-xs text-slate-550 mt-1 max-w-xl">
                Ready to clear mock data and start your testing cycle with a completely empty database? 
                This action will permanently delete all cloud Firestore document records (users, applicants, staff profiles) and clear all cached client-side states.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onSystemReset}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer"
              >
                <span>⚠️ Factory Reset Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
