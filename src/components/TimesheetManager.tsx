import React, { useState } from 'react';
import { Timesheet, Staff } from '../types';
import { FileText, CheckCircle, XCircle, Plus, Clipboard, Landmark, CalendarDays, Download, Eye } from 'lucide-react';
import { downloadFile } from '../lib/downloadFile';

interface TimesheetManagerProps {
  timesheets: Timesheet[];
  staff: Staff[];
  onUpdateTimesheetStatus: (id: string, status: 'Approved' | 'Rejected' | 'Paid') => void;
  onAddTimesheet: (timesheet: Omit<Timesheet, 'id' | 'uploadDate'>) => void;
  isAdmin?: boolean;
}

export default function TimesheetManager({
  timesheets,
  staff,
  onUpdateTimesheetStatus,
  onAddTimesheet,
  isAdmin = true
}: TimesheetManagerProps) {
  const [showForm, setShowForm] = useState(false);
  
  // Submission Form State
  const [submitStaffName, setSubmitStaffName] = useState('');
  const [submitWeekEnding, setSubmitWeekEnding] = useState('');
  const [submitHours, setSubmitHours] = useState<number | ''>('');
  const [submitClient, setSubmitClient] = useState('');
  const [submitFileUrl, setSubmitFileUrl] = useState<string>('');
  
  const [successBanner, setSuccessBanner] = useState('');

  const handleCreateTimesheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitStaffName || !submitWeekEnding) return;

    const targetStaff = staff.find(s => s.name === submitStaffName);
    const resolvedRole = targetStaff ? targetStaff.role : 'Care Assistant';

    onAddTimesheet({
      staffName: submitStaffName,
      role: resolvedRole,
      weekEnding: submitWeekEnding,
      client: submitClient || undefined,
      approvalStatus: 'Pending',
      hoursWorked: Number(submitHours) || 0,
      fileUrl: submitFileUrl
    });

    setSuccessBanner('Timesheet successfully submitted! Available for administrative audit review.');
    setTimeout(() => setSuccessBanner(''), 4500);

    // Reset Form
    setSubmitStaffName('');
    setSubmitWeekEnding('');
    setSubmitHours('');
    setSubmitClient('');
    setSubmitFileUrl('');
    setShowForm(false);
  };

  // Sum total approved hours and total outstanding hours
  const totalApprovedHours = timesheets.filter(t => t.approvalStatus === 'Approved' || t.approvalStatus === 'Paid').reduce((acc, curr) => acc + curr.hoursWorked, 0);
  const totalOutstandingHours = timesheets.filter(t => t.approvalStatus === 'Pending').reduce((acc, curr) => acc + curr.hoursWorked, 0);
  
  const approvedStaff = staff.filter(member => member.accountRole === 'staff');

  return (
    <div className="space-y-6" id="shc-timesheets-view">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Timesheets</h2>
          <p className="text-xs text-slate-500 font-medium">Review recorded shift hours and timesheet approval status.</p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-900 to-rose-700 text-white rounded-xl text-xs font-bold hover:opacity-90 shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Timesheet Record</span>
        </button>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-b-xl text-xs text-emerald-800 font-semibold animate-bounce shadow">
          ✓ {successBanner}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="finance-board-grid">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Approved Shift hours</span>
          <span className="text-2xl font-black text-slate-800 block mt-1">{totalApprovedHours} hours</span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Validated for billing</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Outstanding hours</span>
          <span className="text-2xl font-black text-slate-800 block mt-1">{totalOutstandingHours} hours</span>
          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Awaiting clearance</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Timesheet Records</span>
          <span className="text-2xl font-black text-slate-800 block mt-1">{timesheets.length}</span>
          <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Persisted records</span>
        </div>
      </div>

      {/* Upload Timesheet Slider Form */}
      {showForm && (
        <form onSubmit={handleCreateTimesheetSubmit} className="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-4 max-w-lg">
          <div className="border-b border-slate-100 pb-2 flex justify-between items-center bg-slate-50 p-2.5 rounded-lg mb-2">
            <h4 className="text-xs font-black uppercase text-slate-805 tracking-wide">Timesheet Submission form</h4>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 text-lg hover:text-slate-600">×</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Caregiver Staff Name</label>
              <select
                required
                value={submitStaffName}
                onChange={(e) => setSubmitStaffName(e.target.value)}
                className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
              >
                <option value="">Select Staff...</option>
                {approvedStaff.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Week Ending Date</label>
              <input
                type="date"
                required
                value={submitWeekEnding}
                onChange={(e) => setSubmitWeekEnding(e.target.value)}
                className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Total Logged Shift Hours</label>
              <input
                type="number"
                step="0.5"
                required
                value={submitHours}
                onChange={(e) => setSubmitHours(Number(e.target.value))}
                className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                placeholder="37.5"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Client / Location</label>
              <input
                type="text"
                value={submitClient}
                onChange={(e) => setSubmitClient(e.target.value)}
                className="mt-1 block w-full p-2 border border-slate-300 rounded-lg text-xs"
                placeholder="Hospital/Care Home"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-1/2 py-2 border rounded-lg text-xs font-bold text-slate-700 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 bg-purple-900 border border-purple-900 text-white rounded-lg text-xs font-bold"
            >
              Submit Weekly Hours
            </button>
          </div>
        </form>
      )}

      {/* Timesheet Table List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-150">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 select-none">
                <th scope="col" className="px-6 py-3">Caregiver Name</th>
                <th scope="col" className="px-6 py-3">Client</th>
                <th scope="col" className="px-6 py-3">Week Ending</th>
                <th scope="col" className="px-6 py-3">Submitted Date</th>
                <th scope="col" className="px-6 py-3">Claimed Log</th>
                <th scope="col" className="px-6 py-3">Reviewer</th>
                <th scope="col" className="px-6 py-3">Approval Tracker</th>
                <th scope="col" className="px-6 py-3 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-800">
              {timesheets.map((timesheet) => {
                return (
                  <tr key={timesheet.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-800">{timesheet.staffName}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-semibold">{timesheet.client || '-'}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{timesheet.weekEnding}</td>
                    <td className="px-6 py-3 text-slate-400 font-semibold">{timesheet.uploadDate}</td>
                    <td className="px-6 py-3 font-black text-slate-850 font-mono">{timesheet.hoursWorked} hrs</td>
                    <td className="px-6 py-3 font-medium text-slate-500">{timesheet.reviewer || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`p-0.5 px-2.5 rounded-full text-[10px] font-bold border ${
                        timesheet.approvalStatus === 'Approved'
                          ? 'bg-emerald-50 text-emerald-805 border-emerald-250 font-extrabold'
                          : timesheet.approvalStatus === 'Paid'
                          ? 'bg-blue-50 text-blue-805 border-blue-250 font-extrabold'
                          : timesheet.approvalStatus === 'Pending'
                          ? 'bg-amber-50 text-amber-805 border-amber-250 font-extrabold'
                          : 'bg-rose-50 text-rose-805 border-rose-250'
                      }`}>
                        {timesheet.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end space-x-1.5 items-center">
                        {timesheet.fileUrl && <>
                          <button onClick={() => window.open(timesheet.fileUrl, '_blank')} className="p-1 text-slate-500 hover:text-indigo-600 transition-colors" title="View Timesheet"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => downloadFile(timesheet.fileUrl, `timesheet_${timesheet.staffName}_${timesheet.weekEnding}.pdf`)} className="p-1 text-slate-500 hover:text-indigo-600 transition-colors" title="Export Timesheet"><Download className="w-4 h-4" /></button>
                        </>}

                        {isAdmin && (
                          <>
                            {timesheet.approvalStatus === 'Pending' && (
                              <>
                                <button
                                  onClick={() => onUpdateTimesheetStatus(timesheet.id, 'Approved')}
                                  className="p-1 px-2.5 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600 transition-colors text-[10px] shadow-sm cursor-pointer ml-2"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => onUpdateTimesheetStatus(timesheet.id, 'Rejected')}
                                  className="p-1 px-2.5 bg-rose-500 text-white rounded font-bold hover:bg-rose-600 transition-colors text-[10px] shadow-sm cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {timesheet.approvalStatus === 'Approved' && (
                              <button
                                onClick={() => onUpdateTimesheetStatus(timesheet.id, 'Paid')}
                                className="p-1 px-2.5 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors text-[10px] shadow-sm cursor-pointer ml-2"
                              >
                                Mark Paid
                              </button>
                            )}
                            {(timesheet.approvalStatus === 'Paid' || timesheet.approvalStatus === 'Rejected') && (
                              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">
                                Processed ✓
                              </span>
                            )}
                          </>
                        )}
                        {!isAdmin && timesheet.approvalStatus !== 'Pending' && (
                          <span className="text-[10px] font-black text-slate-400 uppercase ml-2">
                            Processed ✓
                          </span>
                        )}
                        {!isAdmin && timesheet.approvalStatus === 'Pending' && (
                          <span className="text-[10px] font-black text-slate-400 uppercase ml-2">
                            Pending ⏳
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {timesheets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500 font-medium">
                    No timesheet records have been submitted yet.
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
