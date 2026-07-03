import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Shield, User, UserPlus, UserMinus, ShieldAlert, Key, CheckCircle, Search, Mail } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';

interface SystemUser {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'applicant' | 'family';
  status?: 'Active' | 'Deactivated';
  permissions?: string[];
}

export default function UserAdministration() {
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
  
  const availablePermissions = ['View Reports', 'Manage Documents', 'Approve Timesheets', 'Manage Roster'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const fetchedUsers: SystemUser[] = [];
      snapshot.forEach(doc => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as SystemUser);
      });
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
      const newUserId = `usr_${Date.now()}`;
      const newUser = {
        name: inviteName,
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        uid: newUserId,
        status: 'Active' as const,
        permissions: []
      };
      await setDoc(doc(db, 'users', newUserId), newUser);
      setUsers(prev => [newUser as any, ...prev]);
      showMessage(`Invitation sent to ${inviteEmail}.`, 'success');
      setIsInviting(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('applicant');
    } catch (error) {
      console.error("Error inviting user:", error);
      showMessage("Failed to send invitation.", 'error');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: SystemUser['role']) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showMessage(`User role successfully updated to ${newRole}.`, 'success');
    } catch (error) {
      console.error("Error updating role:", error);
      showMessage("Failed to update user role.", 'error');
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const newStatus = user.status === 'Deactivated' ? 'Active' : 'Deactivated';
    try {
      await updateDoc(doc(db, 'users', user.id), { status: newStatus });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      showMessage(`User account ${newStatus.toLowerCase()}.`, 'success');
    } catch (error) {
      console.error("Error toggling status:", error);
      showMessage("Failed to update account status.", 'error');
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
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
      await updateDoc(doc(db, 'users', user.id), { permissions: newPerms });
      const updatedUser = { ...user, permissions: newPerms };
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      setIsManagingPermissions(updatedUser);
    } catch (error) {
      console.error("Error updating permissions:", error);
      showMessage("Failed to update permissions.", 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user record? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      showMessage("User successfully deleted.", 'success');
    } catch (error) {
      console.error("Error deleting user:", error);
      showMessage("Failed to delete user.", 'error');
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
                        user.status === 'Deactivated' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
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
                            user.status === 'Deactivated' 
                              ? 'text-emerald-500 hover:bg-emerald-50' 
                              : 'text-amber-500 hover:bg-amber-50'
                          }`}
                          title={user.status === 'Deactivated' ? 'Reactivate Account' : 'Deactivate Account'}
                        >
                          {user.status === 'Deactivated' ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete User"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
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
    </div>
  );
}
