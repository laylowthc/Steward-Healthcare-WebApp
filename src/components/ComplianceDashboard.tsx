import { Staff } from '../types';
import { Octagon, ShieldAlert, CheckCircle, AlertTriangle, Bell, Clock, Search, ExternalLink, CalendarDays } from 'lucide-react';
import { useState } from 'react';

interface ComplianceDashboardProps {
  staff: Staff[];
  onSelectStaff: (staffId: string) => void;
}

export default function ComplianceDashboard({ staff, onSelectStaff }: ComplianceDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Categorize staff members into traffic light bins
  const getStaffComplianceBin = (person: Staff) => {
    const dbs = person.dbsStatus;
    const rtw = person.rightToWork;
    const trn = person.trainingStatus;
    
    // Check NMC if nurse
    let nmcVal: string | undefined = person.nmcExpiry ? 'Compliant' : undefined;
    if (person.role === 'Nurse' && person.nmcExpiry) {
      const parsedDate = new Date(person.nmcExpiry);
      const diffDays = Math.ceil((parsedDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (diffDays < 0) nmcVal = 'Non-Compliant';
      else if (diffDays <= 30) nmcVal = 'Expiring';
    }

    if (dbs === 'Non-Compliant' || rtw === 'Non-Compliant' || trn === 'Non-Compliant' || nmcVal === 'Non-Compliant' || person.status === 'Non-Compliant') {
      return 'Red';
    }
    
    if (dbs === 'Expiring' || rtw === 'Expiring' || trn === 'Expiring' || nmcVal === 'Expiring') {
      return 'Amber';
    }
    
    return 'Green';
  };

  const redStaff = staff.filter(s => getStaffComplianceBin(s) === 'Red');
  const amberStaff = staff.filter(s => getStaffComplianceBin(s) === 'Amber');
  const greenStaff = staff.filter(s => getStaffComplianceBin(s) === 'Green');

  // Multi-alert constructor from database records
  const complianceAlerts: { staffId: string; staffName: string; type: string; date: string; isLapsed: boolean; desc: string }[] = [];

  staff.forEach(s => {
    // 1. DBS
    if (s.dbsStatus === 'Non-Compliant' && s.dbsExpiry) {
      complianceAlerts.push({
        staffId: s.id,
        staffName: s.name,
        type: 'Enhanced DBS Check',
        date: s.dbsExpiry,
        isLapsed: true,
        desc: `Enhanced DBS completely lapsed on ${s.dbsExpiry}. Deployment shifts are frozen.`
      });
    } else if (s.dbsStatus === 'Expiring' && s.dbsExpiry) {
      complianceAlerts.push({
        staffId: s.id,
        staffName: s.name,
        type: 'Enhanced DBS Check',
        date: s.dbsExpiry,
        isLapsed: false,
        desc: `DBS check expires on ${s.dbsExpiry}. File renewal initiated.`
      });
    }

    // 2. Training
    if (s.trainingStatus === 'Non-Compliant' && s.trainingExpiry) {
      complianceAlerts.push({
        staffId: s.id,
        staffName: s.name,
        type: 'Mandatory Classroom Training',
        date: s.trainingExpiry,
        isLapsed: true,
        desc: `Core manual handling & basic life support instruction expired on ${s.trainingExpiry}.`
      });
    } else if (s.trainingStatus === 'Expiring' && s.trainingExpiry) {
      complianceAlerts.push({
        staffId: s.id,
        staffName: s.name,
        type: 'Mandatory Classroom Training',
        date: s.trainingExpiry,
        isLapsed: false,
        desc: `Mandatory training refresh required before ${s.trainingExpiry}.`
      });
    }

    // 3. Nurse NMC
    if (s.role === 'Nurse' && s.nmcExpiry) {
      const parsedDate = new Date(s.nmcExpiry);
      const diffDays = Math.ceil((parsedDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (diffDays < 0) {
        complianceAlerts.push({
          staffId: s.id,
          staffName: s.name,
          type: 'NMC Pin Registration',
          date: s.nmcExpiry,
          isLapsed: true,
          desc: `NMC Nursing registry expired on ${s.nmcExpiry}. Barred from operating clinical work.`
        });
      } else if (diffDays <= 45) {
        complianceAlerts.push({
          staffId: s.id,
          staffName: s.name,
          type: 'NMC Pin Registration',
          date: s.nmcExpiry,
          isLapsed: false,
          desc: `NMC clinical registry PIN expiring soon (on ${s.nmcExpiry}). revalidations in progress.`
        });
      }
    }

    // 4. Right to work
    if (s.rightToWork === 'Expiring' && s.rightToWorkExpiry) {
      complianceAlerts.push({
        staffId: s.id,
        staffName: s.name,
        type: 'Right To Work Clearance',
        date: s.rightToWorkExpiry,
        isLapsed: false,
        desc: `Continuous work residency visa check expires on ${s.rightToWorkExpiry}.`
      });
    }
  });

  return (
    <div className="space-y-6" id="shc-compliance-view">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Agency Compliance Control Room</h2>
        <p className="text-xs text-slate-500 font-medium">Monitor mandatory certifications, CQC pre-audits, and system credential alerts.</p>
      </div>

      {/* Traffic Light Aggregate KPI counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Red Traffic Light Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-md flex items-center space-x-4 border-l-4 border-l-rose-600">
          <div className="p-3.5 bg-rose-50 rounded-full text-rose-600">
            <Octagon className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Lapsed Restrictions</span>
            <span className="text-3xl font-black text-rose-700 block mt-0.5">{redStaff.length} Staff</span>
            <span className="text-[10px] font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded-full mt-1.5 block w-fit">
              🚫 Shift Deployments Frozen
            </span>
          </div>
        </div>

        {/* Amber Traffic Light Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-md flex items-center space-x-4 border-l-4 border-l-amber-500">
          <div className="p-3.5 bg-amber-50 rounded-full text-amber-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Expiring within 45 days</span>
            <span className="text-3xl font-black text-amber-600 block mt-0.5">{amberStaff.length} Staff</span>
            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-full mt-1.5 block w-fit">
              ⚠️ In Renewal Pipeline
            </span>
          </div>
        </div>

        {/* Green Traffic Light Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-md flex items-center space-x-4 border-l-4 border-l-emerald-600">
          <div className="p-3.5 bg-emerald-50 rounded-full text-emerald-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Perfect Compliance</span>
            <span className="text-3xl font-black text-emerald-700 block mt-0.5">{greenStaff.length} Staff</span>
            <span className="text-[10px] font-semibold text-emerald-805 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1.5 block w-fit">
              ✓ Fully Cleared & active
            </span>
          </div>
        </div>

      </div>

      {/* Primary Row: Left Active Alerts feed, Right Traffic Lights Registry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active compliance alerts feed */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-purple-900 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Critical Certification Alerts</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Automated updates based on active calendars.</p>
            </div>
          </div>

          <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
            {complianceAlerts.map((alert, idx) => (
              <div
                key={idx}
                onClick={() => onSelectStaff(alert.staffId)}
                className={`p-3.5 rounded-xl border cursor-pointer hover:shadow transition-all ${
                  alert.isLapsed
                    ? 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                    : 'bg-amber-50/50 border-amber-250 hover:bg-amber-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[9px] font-black uppercase p-0.5 px-2 rounded-full ${
                    alert.isLapsed ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {alert.isLapsed ? 'Overdue Lapsed' : 'Expiring soon'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold font-mono">{alert.date}</span>
                </div>
                <h4 className="font-black text-slate-900 mt-2 text-xs hover:underline flex items-center">
                  {alert.staffName} <ExternalLink className="w-3 h-3 ml-1 text-slate-405 shrink-0" />
                </h4>
                <p className="text-[11px] text-slate-700 mt-1 leading-normal font-medium">{alert.desc}</p>
                <span className="text-[9px] text-purple-800 mt-2 block font-extrabold font-sans">
                  Category: {alert.type}
                </span>
              </div>
            ))}
            {complianceAlerts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                ✓ No credential alerts pending attention.
              </div>
            )}
          </div>
        </div>

        {/* Traffic Lights staff explorer table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Security Tracker by Staff Member</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 font-sans">Full visual matrix of core certificates.</p>
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="absolute inset-y-0 left-0 pl-3 h-4 w-4 text-slate-400 flex items-center pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff compliance..."
                className="pl-8 p-1.5 w-full border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs font-semibold">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Staff Individual</th>
                  <th className="px-4 py-3 text-center">Enhanced DBS</th>
                  <th className="px-4 py-3 text-center">RTW</th>
                  <th className="px-4 py-3 text-center">Training</th>
                  <th className="px-4 py-3 text-center">NMC PIN</th>
                  <th className="px-4 py-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {staff
                  .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(person => {
                    const bin = getStaffComplianceBin(person);
                    let rowBdr = 'border-l-transparent';
                    if (bin === 'Red') rowBdr = 'border-l-rose-500 border-l-2';
                    if (bin === 'Amber') rowBdr = 'border-l-amber-500 border-l-2';

                    return (
                      <tr key={person.id} className={`hover:bg-slate-50/50 ${rowBdr}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{person.name}</div>
                          <div className="text-[9px] text-slate-400 font-medium">{person.role}</div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-4 h-4 rounded-full ${
                            person.dbsStatus === 'Compliant'
                              ? 'bg-emerald-500'
                              : person.dbsStatus === 'Expiring'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}></span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-4 h-4 rounded-full ${
                            person.rightToWork === 'Compliant'
                              ? 'bg-emerald-500'
                              : person.rightToWork === 'Expiring'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}></span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-4 h-4 rounded-full ${
                            person.trainingStatus === 'Compliant'
                              ? 'bg-emerald-500'
                              : person.trainingStatus === 'Expiring'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}></span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {person.role === 'Nurse' ? (
                            <span className={`inline-block w-4 h-4 rounded-full ${
                              person.nmcExpiry && new Date(person.nmcExpiry).getTime() > new Date().getTime()
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}></span>
                          ) : (
                            <span className="text-slate-350 text-[10px]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onSelectStaff(person.id)}
                            className="text-purple-800 hover:text-purple-600 text-[11px] font-bold"
                          >
                            Investigate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
