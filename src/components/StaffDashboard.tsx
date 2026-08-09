import React, { useState } from 'react';
import { Staff, Document, Timesheet } from '../types';
import { Bell, MessageSquare, Calendar, Shield, Clock, BookOpen, ChevronRight, CheckCircle, FileText } from 'lucide-react';

interface StaffDashboardProps {
  currentUser: Staff;
  documents: Document[];
  timesheets: Timesheet[];
  onNavigate: (tab: string) => void;
}

export default function StaffDashboard({ currentUser, documents, timesheets, onNavigate }: StaffDashboardProps) {
  const isCompliant = currentUser.dbsStatus === 'Compliant' && currentUser.trainingStatus === 'Compliant' && currentUser.rightToWork === 'Compliant';

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <span className={`p-0.5 px-2 border rounded text-[9px] font-black uppercase tracking-wider ${isCompliant ? 'bg-emerald-500/35 border-emerald-400 text-emerald-300' : 'bg-rose-500/35 border-rose-400 text-rose-300'}`}>
            {isCompliant ? 'Fully Compliant - Ready to Deploy' : 'Compliance Action Required'}
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-2 text-white">Welcome back, {currentUser.name.split(' ')[0]}!</h2>
          <p className="text-slate-400 text-xs mt-1">
            Your deployment status is currently listed as{' '}
            <span className={`font-extrabold ${currentUser.rosterStatus === 'Deployable' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {currentUser.rosterStatus}
            </span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Messages & Notifications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
              Recent Messages & Notifications
            </h3>
            <span className="bg-rose-100 text-rose-700 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
              2 Unread
            </span>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Admin Team</span>
                <span className="text-[9px] text-slate-400 font-mono">10 mins ago</span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-1">
                Please remember to submit your timesheet for this week by Friday 5 PM.
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-amber-600 uppercase">Compliance</span>
                <span className="text-[9px] text-slate-400 font-mono">1 day ago</span>
              </div>
              <p className="text-xs text-slate-700 font-medium mt-1">
                Your Mandatory Training certificate is expiring next month. Please upload the renewed version.
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Shifts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
              Upcoming Shifts
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center p-3 border border-slate-100 rounded-xl bg-slate-50">
              <div className="bg-white border shadow-sm rounded-lg p-2 text-center mr-3 min-w-[50px]">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">JUL</span>
                <span className="block text-lg font-black text-slate-800">14</span>
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800">Royal Care Home - Day Shift</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">08:00 - 20:00 (12 hrs)</p>
              </div>
            </div>
            <div className="flex items-center p-3 border border-slate-100 rounded-xl bg-slate-50">
              <div className="bg-white border shadow-sm rounded-lg p-2 text-center mr-3 min-w-[50px]">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">JUL</span>
                <span className="block text-lg font-black text-slate-800">16</span>
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-800">City Hospital - Night Shift</h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">20:00 - 08:00 (12 hrs)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-3 mt-6 pl-1">Self-Service Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('profile')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all text-left group"
        >
          <Shield className="w-6 h-6 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-slate-800">My Compliance</h4>
          <p className="text-[10px] text-slate-500 mt-1">Upload & Replace Documents</p>
        </button>

        <button
          onClick={() => onNavigate('staff_timesheets')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left group"
        >
          <Clock className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-slate-800">Timesheets</h4>
          <p className="text-[10px] text-slate-500 mt-1">Upload & View Status</p>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 hover:shadow-md transition-all text-left group"
        >
          <FileText className="w-6 h-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-slate-800">E-Signatures</h4>
          <p className="text-[10px] text-slate-500 mt-1">Sign Pending Documents</p>
        </button>

        <button
          onClick={() => onNavigate('training')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 hover:shadow-md transition-all text-left group"
        >
          <BookOpen className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-slate-800">Training & CPD</h4>
          <p className="text-[10px] text-slate-500 mt-1">View Modules & Certs</p>
        </button>
      </div>
    </div>
  );
}
