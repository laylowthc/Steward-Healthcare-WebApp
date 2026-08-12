import React, { useState } from 'react';
import { Staff, StaffRole } from '../types';
import { Search, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, MapPin, BadgePercent, Filter, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { isApprovedStaffProfile } from '../lib/complianceState';

interface StaffDirectoryProps {
  staff: Staff[];
  onSelectStaff: (staffId: string) => void;
  currentRole?: 'admin' | 'staff' | 'family' | 'applicant';
  onAddStaff?: (newStaff: Staff) => void;
  onDeleteStaff?: (staffId: string) => void;
}

export default function StaffDirectory({
  staff,
  onSelectStaff,
  currentRole,
  onAddStaff,
  onDeleteStaff
}: StaffDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Add Staff Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffAddress, setNewStaffAddress] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('Care Assistant');
  const [newStaffNmcPin, setNewStaffNmcPin] = useState('');
  const [newStaffNmcExpiry, setNewStaffNmcExpiry] = useState('');
  
  const [formError, setFormError] = useState('');

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newStaffName.trim()) {
      setFormError('Please enter the full name.');
      return;
    }
    if (!newStaffEmail.trim()) {
      setFormError('Please enter the email address.');
      return;
    }
    if (!newStaffPhone.trim()) {
      setFormError('Please enter the phone number.');
      return;
    }
    if (!newStaffAddress.trim()) {
      setFormError('Please enter the address.');
      return;
    }

    if (newStaffRole === 'Nurse' && !newStaffNmcPin.trim()) {
      setFormError('Please enter the NMC PIN for Nurses.');
      return;
    }

    const newStaffId = `staff_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newStaffMember: Staff = {
      id: newStaffId,
      name: newStaffName,
      email: newStaffEmail.toLowerCase(),
      phone: newStaffPhone,
      address: newStaffAddress,
      role: newStaffRole,
      status: 'Active',
      accountStatus: 'Pending',
      rosterStatus: 'Pending',
      nmcPin: newStaffRole === 'Nurse' ? newStaffNmcPin : undefined,
      nmcExpiry: newStaffRole === 'Nurse' ? (newStaffNmcExpiry || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0]) : undefined,
      dbsStatus: 'Pending',
      rightToWork: 'Non-Compliant',
      trainingStatus: 'Non-Compliant',
      referenceStatus: 'Pending',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    if (onAddStaff) {
      onAddStaff(newStaffMember);
    }

    // Reset Form
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffAddress('');
    setNewStaffRole('Care Assistant');
    setNewStaffNmcPin('');
    setNewStaffNmcExpiry('');
    setIsAddModalOpen(false);
  };

  // Employment approval and deployment readiness are separate lifecycle states.
  const approvedStaff = staff.filter(isApprovedStaffProfile);

  // Filter deployable staff according to search term and drop filters
  const filteredStaff = approvedStaff.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (member.nmcPin && member.nmcPin.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          member.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || member.role === roleFilter;

    let matchesStatus = true;
    if (statusFilter !== 'All') {
      matchesStatus = member.rosterStatus === statusFilter;
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getDbsBadge = (status: string) => {
    switch (status) {
      case 'Compliant':
        return <span className="p-0.5 px-2 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-250 rounded font-semibold flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1 shrink-0 text-emerald-600" /> Compliant</span>;
      case 'Expiring':
        return <span className="p-0.5 px-2 text-[10px] bg-amber-50 text-amber-800 border border-amber-250 rounded font-semibold flex items-center w-fit"><AlertTriangle className="w-3 h-3 mr-1 shrink-0 text-amber-600" /> Expiring Soon</span>;
      default:
        return <span className="p-0.5 px-2 text-[10px] bg-rose-50 text-rose-800 border border-rose-250 rounded font-semibold flex items-center w-fit"><ShieldAlert className="w-3 h-3 mr-1 shrink-0 text-rose-600" /> Non-Compliant</span>;
    }
  };

  const getRoleAbbr = (role: StaffRole) => {
    switch (role) {
      case 'Nurse': return 'RGN';
      case 'Care Assistant': return 'HCA';
      case 'Senior Care Assistant': return 'SCA';
      case 'Deputy Manager': return 'DEP';
    }
  };

  return (
    <div className="space-y-6" id="shc-staff-directory">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Approved Staff</h2>
          <p className="text-xs text-slate-500 font-medium">Review approved employment records and current deployment readiness.</p>
        </div>
        {currentRole === 'admin' && onAddStaff && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-purple-900 hover:bg-purple-800 rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Staff Member
          </button>
        )}
      </div>

      {/* Modern Filter Workspace */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Term input */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-xs"
              placeholder="Search by staff name, NMC pin, location, address..."
            />
          </div>

          {/* Role Filter dropdown */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
            >
              <option value="All">Role: All Categories</option>
              <option value="Nurse">Registered Nurse (RGN)</option>
              <option value="Care Assistant">Care Assistant (HCA)</option>
              <option value="Senior Care Assistant">Senior Care Assistant (SCA)</option>
              <option value="Deputy Manager">Deputy Manager (DEP)</option>
            </select>
          </div>

          {/* Status Filter dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
            >
              <option value="All">Status: All</option>
              <option value="Deployable">Deployable</option>
              <option value="Pending">Pending checks</option>
              <option value="Active">Deployment restricted</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pill Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 flex items-center mr-1">
            <Filter className="w-3 h-3 mr-1" /> Quick Pill:
          </span>
          <button
            onClick={() => { setRoleFilter('All'); setStatusFilter('All'); }}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${roleFilter === 'All' && statusFilter === 'All' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            Show All ({approvedStaff.length})
          </button>
          <button
            onClick={() => { setRoleFilter('Nurse'); }}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${roleFilter === 'Nurse' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            Nurses ({approvedStaff.filter(s => s.role === 'Nurse').length})
          </button>
          <button
            onClick={() => { setRoleFilter('Care Assistant'); }}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${roleFilter === 'Care Assistant' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            Care Assistants ({approvedStaff.filter(s => s.role === 'Care Assistant').length})
          </button>
        </div>
      </div>

      {/* Staff List Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="px-6 py-4">Name & Address</th>
                <th scope="col" className="px-6 py-4">Role Code</th>
                <th scope="col" className="px-6 py-4">Registration PIN</th>
                <th scope="col" className="px-6 py-4">Enhanced DBS Status</th>
                <th scope="col" className="px-6 py-4">Roster Status</th>
                <th scope="col" className="px-6 py-4 text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-102 text-xs">
              {filteredStaff.map((person) => {
                const hasOverallViolation = person.rosterStatus === 'Suspended';

                return (
                  <tr
                    key={person.id}
                    onClick={() => onSelectStaff(person.id)}
                    className="hover:bg-slate-50/80 cursor-pointer border-l-2 hover:border-l-purple-800 border-l-transparent transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {person.avatarUrl ? (
                          <img
                            src={person.avatarUrl}
                            alt={`${person.name} profile`}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-purple-900 border border-slate-200 uppercase">
                            {person.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 flex items-center">
                            {person.name}
                            {hasOverallViolation && (
                              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping"></span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center mt-0.5">
                            <MapPin className="w-3 h-3 mr-0.5 shrink-0" />
                            <span className="truncate max-w-[150px]">{person.address ? (person.address.split(',')[1] || person.address) : 'Address not recorded'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs">{person.role}</span>
                        {getRoleAbbr(person.role) && (
                          <span className="text-[9px] font-black text-slate-400 mt-0.5">{getRoleAbbr(person.role)} PROFILE</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-slate-600 font-semibold">
                      {person.nmcPin ? (
                        <div className="flex flex-col">
                          <span>{person.nmcPin}</span>
                          <span className="text-[9px] text-slate-400 font-sans">Exp: {person.nmcExpiry}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-sans italic">
                          {person.role === 'Nurse' ? 'Not recorded' : 'Not required'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDbsBadge(person.dbsStatus)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        person.rosterStatus === 'Deployable' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        person.rosterStatus === 'Suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        person.rosterStatus === 'Active' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {person.rosterStatus}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold pr-8">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectStaff(person.id); }}
                          className="inline-flex items-center text-purple-800 hover:text-purple-600 hover:underline"
                        >
                          <span>View Profile</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                        {currentRole === 'admin' && onDeleteStaff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to permanently delete staff member ${person.name}?`)) {
                                onDeleteStaff(person.id);
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-semibold selection:text-white">
                    {approvedStaff.length === 0
                      ? 'No approved staff yet. Candidates remain in Recruitment and Compliance until their employment lifecycle is approved.'
                      : 'No approved staff match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-purple-200" />
                <h3 className="text-base font-bold">Add New Staff Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 text-rose-800 text-xs font-semibold p-3.5 rounded-xl border border-rose-200">
                  ⚠️ {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Ashton Kutcher"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-slate-50/50"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="e.g. ashton@stewardhealthcare.com"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-slate-50/50"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="e.g. +44 7123 456789"
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-slate-50/50"
                    required
                  />
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Role *</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-slate-50/50"
                  >
                    <option value="Care Assistant">Care Assistant (HCA)</option>
                    <option value="Senior Care Assistant">Senior Care Assistant (SCA)</option>
                    <option value="Nurse">Registered Nurse (RGN)</option>
                    <option value="Deputy Manager">Deputy Manager (DEP)</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Address *</label>
                <input
                  type="text"
                  value={newStaffAddress}
                  onChange={(e) => setNewStaffAddress(e.target.value)}
                  placeholder="e.g. 10 Downing Street, London, SW1A 2AA"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-slate-50/50"
                  required
                />
              </div>

              {/* RGN Specific Section */}
              {newStaffRole === 'Nurse' && (
                <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <h4 className="text-xs font-bold text-purple-950 flex items-center">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-700 mr-1" /> Nurse Registration Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5">NMC PIN *</label>
                      <input
                        type="text"
                        value={newStaffNmcPin}
                        onChange={(e) => setNewStaffNmcPin(e.target.value)}
                        placeholder="e.g. 12A3456E"
                        className="block w-full px-3 py-1.5 border border-purple-200 rounded-xl text-slate-950 placeholder-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-0.5">NMC Expiry *</label>
                      <input
                        type="date"
                        value={newStaffNmcExpiry}
                        onChange={(e) => setNewStaffNmcExpiry(e.target.value)}
                        className="block w-full px-3 py-1.5 border border-purple-200 rounded-xl text-slate-950 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Compliance Initial Setup */}
              <div className="hidden" aria-hidden="true">
                <h4 className="text-xs font-bold text-slate-800">Initial Compliance Profile</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* DBS */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase text-slate-500">Enhanced DBS</label>
                    <select
                      value="Pending"
                      onChange={() => undefined}
                      className="block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white text-xs"
                    >
                      <option value="Compliant">🟢 Compliant</option>
                      <option value="Pending">🟡 Pending</option>
                      <option value="Non-Compliant">🔴 Non-Compliant</option>
                    </select>
                  </div>

                  {/* Right to Work */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase text-slate-500">Right to Work</label>
                    <select
                      value="Non-Compliant"
                      onChange={() => undefined}
                      className="block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white text-xs"
                    >
                      <option value="Compliant">🟢 Compliant</option>
                      <option value="Expiring">🟡 Expiring Soon</option>
                      <option value="Non-Compliant">🔴 Non-Compliant</option>
                    </select>
                  </div>

                  {/* Training */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase text-slate-500">Mandatory Training</label>
                    <select
                      value="Non-Compliant"
                      onChange={() => undefined}
                      className="block w-full px-2 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white text-xs"
                    >
                      <option value="Compliant">🟢 Compliant</option>
                      <option value="Expiring">🟡 Expiring Soon</option>
                      <option value="Non-Compliant">🔴 Non-Compliant</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-100">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-0.5">DBS Number</label>
                    <input
                      type="text"
                      value=""
                      onChange={() => undefined}
                      placeholder="Optional"
                      className="block w-full px-2 py-1 border border-slate-300 rounded-lg text-slate-850 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-0.5">DBS Expiry</label>
                    <input
                      type="date"
                      value=""
                      onChange={() => undefined}
                      className="block w-full px-2 py-1 border border-slate-300 rounded-lg text-slate-850 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-0.5">Right to Work Expiry</label>
                    <input
                      type="date"
                      value=""
                      onChange={() => undefined}
                      className="block w-full px-2 py-1 border border-slate-300 rounded-lg text-slate-850 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-250 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-900 hover:bg-purple-800 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
