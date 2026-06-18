import { useState } from 'react';
import { Staff, StaffRole } from '../types';
import { Search, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, MapPin, BadgePercent, Filter } from 'lucide-react';

interface StaffDirectoryProps {
  staff: Staff[];
  onSelectStaff: (staffId: string) => void;
}

export default function StaffDirectory({ staff, onSelectStaff }: StaffDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filter staff according to search term and drop filters
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (member.nmcPin && member.nmcPin.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          member.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'All' || member.role === roleFilter;

    let matchesStatus = true;
    if (statusFilter === 'Active') {
      matchesStatus = member.status === 'Active';
    } else if (statusFilter === 'Non-Compliant') {
      matchesStatus = member.status === 'Non-Compliant' || 
                      member.dbsStatus === 'Non-Compliant' || 
                      member.rightToWork === 'Non-Compliant' || 
                      member.trainingStatus === 'Non-Compliant';
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
      <div>
        <h2 className="text-xl font-bold text-slate-900">Active Staff Registry</h2>
        <p className="text-xs text-slate-500 font-medium">Verify credentials, filter on-call nursing teams, and inspect individual compliance logs.</p>
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
              <option value="All">Status: All Records</option>
              <option value="Active">Operational (Active)</option>
              <option value="Non-Compliant">Non-Compliant Alerts</option>
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
            Show All ({staff.length})
          </button>
          <button
            onClick={() => { setRoleFilter('Nurse'); }}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${roleFilter === 'Nurse' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            Nurses ({staff.filter(s => s.role === 'Nurse').length})
          </button>
          <button
            onClick={() => { setRoleFilter('Care Assistant'); }}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all ${roleFilter === 'Care Assistant' ? 'bg-purple-900 text-white border-purple-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
          >
            HCA Assist ({staff.filter(s => s.role === 'Care Assistant').length})
          </button>
          <button
            onClick={() => { setStatusFilter('Non-Compliant'); }}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-all border-rose-200 hover:border-rose-350 ${statusFilter === 'Non-Compliant' ? 'bg-rose-700 text-white border-rose-700' : 'bg-rose-50/50 text-rose-700'}`}
          >
            ⚠️ Flagged Alerts ({staff.filter(s => s.status === 'Non-Compliant' || s.dbsStatus === 'Non-Compliant' || s.rightToWork === 'Non-Compliant' || s.trainingStatus === 'Non-Compliant').length})
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
                const hasOverallViolation = person.status === 'Non-Compliant' || 
                                           person.dbsStatus === 'Non-Compliant' || 
                                           person.rightToWork === 'Non-Compliant' || 
                                           person.trainingStatus === 'Non-Compliant';

                return (
                  <tr
                    key={person.id}
                    onClick={() => onSelectStaff(person.id)}
                    className="hover:bg-slate-50/80 cursor-pointer border-l-2 hover:border-l-purple-800 border-l-transparent transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-purple-900 border border-slate-200 uppercase">
                          {person.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center">
                            {person.name}
                            {hasOverallViolation && (
                              <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping"></span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center mt-0.5">
                            <MapPin className="w-3 h-3 mr-0.5 shrink-0" />
                            <span className="truncate max-w-[150px]">{person.address.split(',')[1] || person.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs">{person.role}</span>
                        <span className="text-[9px] font-black text-slate-400 mt-0.5">{getRoleAbbr(person.role)} PROFILE</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-slate-600 font-semibold">
                      {person.nmcPin ? (
                        <div className="flex flex-col">
                          <span>{person.nmcPin}</span>
                          <span className="text-[9px] text-slate-400 font-sans">Exp: {person.nmcExpiry}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-sans italic">Not Applicable</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDbsBadge(person.dbsStatus)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasOverallViolation ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          🔴 Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          🟢 Active Deploy
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold pr-8">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectStaff(person.id); }}
                        className="inline-flex items-center text-purple-800 hover:text-purple-600 hover:underline"
                      >
                        <span>View Profile</span>
                        <ArrowRight className="w-4.5 h-4.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-semibold selection:text-white">
                    🔍 No staff members matched your current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
