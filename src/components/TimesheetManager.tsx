import React, { useState } from 'react';
import { Timesheet, Staff } from '../types';
import { FileText, CheckCircle, XCircle, Plus, Clipboard, Landmark, CalendarDays } from 'lucide-react';

interface TimesheetManagerProps {
  timesheets: Timesheet[];
  staff: Staff[];
  onUpdateTimesheetStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  onAddTimesheet: (timesheet: Omit<Timesheet, 'id' | 'uploadDate'>) => void;
}

export default function TimesheetManager({
  timesheets,
  staff,
  onUpdateTimesheetStatus,
  onAddTimesheet
}: TimesheetManagerProps) {
  const [showForm, setShowForm] = useState(false);
  
  // Submission Form State
  const [submitStaffName, setSubmitStaffName] = useState('');
  const [submitWeekEnding, setSubmitWeekEnding] = useState('');
  const [submitHours, setSubmitHours] = useState<number>(37.5);
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
      approvalStatus: 'Pending',
      hoursWorked: Number(submitHours),
      fileUrl: `timesheet_${submitStaffName.replace(' ', '_')}_${submitWeekEnding}.pdf`
    });

    setSuccessBanner('Timesheet successfully submitted! Available for administrative audit review.');
    setTimeout(() => setSuccessBanner(''), 4500);

    // Reset Form
    setSubmitStaffName('');
    setSubmitWeekEnding('');
    setSubmitHours(37.5);
    setShowForm(false);
  };

  // Finance Aggregators
  const billingRateMap = {
    'Nurse': 38.00,
    'Care Assistant': 15.50,
    'Senior Care Assistant': 21.00,
    'Deputy Manager': 30.00
  };

  const getPayout = (sheet: Timesheet) => {
    const rate = billingRateMap[sheet.role] || 15.50;
    return sheet.hoursWorked * rate;
  };

  // Sum total approved hours and total outstanding hours
  const totalApprovedHours = timesheets.filter(t => t.approvalStatus === 'Approved').reduce((acc, curr) => acc + curr.hoursWorked, 0);
  const totalOutstandingHours = timesheets.filter(t => t.approvalStatus === 'Pending').reduce((acc, curr) => acc + curr.hoursWorked, 0);
  
  const estimateApprovedPayout = timesheets.filter(t => t.approvalStatus === 'Approved').reduce((acc, curr) => acc + getPayout(curr), 0);
  const estimateOutstandingPayout = timesheets.filter(t => t.approvalStatus === 'Pending').reduce((acc, curr) => acc + getPayout(curr), 0);

  return (
    <div className="space-y-6" id="shc-timesheets-view">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">National Timesheet Repository</h2>
          <p className="text-xs text-slate-500 font-medium">Verify shift hours, cross-reference clinical log reports, and approve timesheets for weekly payout.</p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-900 to-rose-700 text-white rounded-xl text-xs font-bold hover:opacity-90 shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Timesheet Staff Log</span>
        </button>
      </div>

      {successBanner && (
        <div className="bg-emerald-50 border-l-4 border-emerald-600 p-3 rounded-b-xl text-xs text-emerald-800 font-semibold animate-bounce shadow">
          ✓ {successBanner}
        </div>
      )}

      {/* Finance Analytics Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="finance-board-grid">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Approved Shift hours</span>
          <span className="text-2xl font-black text-slate-800 block mt-1">{totalApprovedHours} hours</span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Validated for billing</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Estimated Payroll Payout</span>
          <span className="text-2xl font-black text-purple-900 block mt-1">£{estimateApprovedPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Estimated Agency cost</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Outstanding hours</span>
          <span className="text-2xl font-black text-slate-800 block mt-1">{totalOutstandingHours} hours</span>
          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Awaiting clearance</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Pending Release Amount</span>
          <span className="text-2xl font-black text-slate-800 block mt-1">£{estimateOutstandingPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
          <span className="text-[10px] text-slate-550 font-bold bg-slate-100 px-1 py-0.5 rounded-full mt-1.5 block w-fit">Escrow pipeline</span>
        </div>
      </div>

      {/* Upload Timesheet Slider Form */}
      {showForm && (
        <form onSubmit={handleCreateTimesheetSubmit} className="bg-white p-5 rounded-2xl border border-slate-205 shadow-sm space-y-4 max-w-lg">
          <div className="border-b border-slate-100 pb-2 flex justify-between items-center bg-slate-50 p-2.5 rounded-lg mb-2">
            <h4 className="text-xs font-black uppercase text-slate-805 tracking-wide">Timesheet Submission form</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 text-lg hover:text-slate-600">×</button>
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
                {staff.map(s => (
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
                <th scope="col" className="px-6 py-3">Category Role</th>
                <th scope="col" className="px-6 py-3">Week Ending</th>
                <th scope="col" className="px-6 py-3">Submited Date</th>
                <th scope="col" className="px-6 py-3">Claimed Log</th>
                <th scope="col" className="px-6 py-3">Estimated Cost</th>
                <th scope="col" className="px-6 py-3">Approval Tracker</th>
                <th scope="col" className="px-6 py-3 text-right pr-6">Action Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-800">
              {timesheets.map((timesheet) => {
                const hourlyPayout = billingRateMap[timesheet.role] || 15.50;
                const estAmount = timesheet.hoursWorked * hourlyPayout;
                
                return (
                  <tr key={timesheet.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-800">{timesheet.staffName}</div>
                    </td>
                    <td className="px-6 py-3 text-slate-600 font-semibold">{timesheet.role}</td>
                    <td className="px-6 py-3 font-medium text-slate-700">{timesheet.weekEnding}</td>
                    <td className="px-6 py-3 text-slate-400 font-semibold">{timesheet.uploadDate}</td>
                    <td className="px-6 py-3 font-black text-slate-850 font-mono">{timesheet.hoursWorked} hrs</td>
                    <td className="px-6 py-3 font-semibold text-slate-900 font-mono">£{estAmount.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`p-0.5 px-2.5 rounded-full text-[10px] font-bold border ${
                        timesheet.approvalStatus === 'Approved'
                          ? 'bg-emerald-50 text-emerald-805 border-emerald-250 font-extrabold'
                          : timesheet.approvalStatus === 'Pending'
                          ? 'bg-amber-50 text-amber-805 border-amber-250 font-extrabold'
                          : 'bg-rose-50 text-rose-805 border-rose-250'
                      }`}>
                        {timesheet.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      {timesheet.approvalStatus === 'Pending' ? (
                        <div className="flex justify-end space-x-1.5">
                          <button
                            onClick={() => onUpdateTimesheetStatus(timesheet.id, 'Approved')}
                            className="p-1 px-2.5 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600 transition-colors text-[10px] shadow-sm cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onUpdateTimesheetStatus(timesheet.id, 'Rejected')}
                            className="p-1 px-2.5 bg-rose-500 text-white rounded font-bold hover:bg-rose-600 transition-colors text-[10px] shadow-sm cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled
                          className="text-[10px] font-black text-slate-400 cursor-not-allowed uppercase"
                        >
                          Processed ✓
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {timesheets.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-405 font-bold">
                    📂 Empty Timesheet Archive.
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
