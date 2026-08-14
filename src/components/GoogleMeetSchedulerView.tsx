import React, { useState } from 'react';
import { Video, Copy, Plus, Trash, ExternalLink, User, Calendar, Check } from 'lucide-react';
import { Applicant, Staff } from '../types';

interface GoogleMeetSchedulerViewProps {
  googleToken: string | null;
  applicants: Applicant[];
  staff: Staff[];
  meetings: {
    id: string;
    title: string;
    meetUrl: string;
    time: string;
    attendee: string;
    type: 'candidate' | 'staff' | 'general';
  }[];
  setMeetings: React.Dispatch<React.SetStateAction<{
    id: string;
    title: string;
    meetUrl: string;
    time: string;
    attendee: string;
    type: 'candidate' | 'staff' | 'general';
  }[]>>;
  onAddLog: (action: string, type: 'recruitment' | 'staff' | 'document' | 'compliance' | 'timesheet') => void;
  onUpdateApplicantDetails: (id: string, fields: Partial<Applicant>) => void;
}

export default function GoogleMeetSchedulerView({
  googleToken,
  applicants,
  staff,
  meetings,
  setMeetings,
  onAddLog,
  onUpdateApplicantDetails
}: GoogleMeetSchedulerViewProps) {
  // Scheduling Wizard Form States
  const [meetingTitle, setMeetingTitle] = useState('');
  const [attendeeType, setAttendeeType] = useState<'candidate' | 'staff' | 'general'>('candidate');
  const [selectedAttendeeId, setSelectedAttendeeId] = useState('');
  const [meetingTime, setMeetingTime] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Copy helper
  const handleCopyLink = (meetUrl: string, id: string) => {
    navigator.clipboard.writeText(meetUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Creation Action Handler
  const handleCreateMeetingSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) {
      alert('Please enter a meeting title.');
      return;
    }
    if (!googleToken) {
      alert('Connect an authorised Google Workspace account before creating a Google Meet link.');
      return;
    }

    setIsGenerating(true);
    let attendeeName = 'Steward Board Representative';
    let targetCandidateId = '';

    if (attendeeType === 'candidate') {
      const match = applicants.find(a => a.id === selectedAttendeeId);
      if (match) {
        attendeeName = match.name;
        targetCandidateId = match.id;
      } else {
        alert('Please choose a candidate.');
        setIsGenerating(false);
        return;
      }
    } else if (attendeeType === 'staff') {
      const match = staff.find(s => s.id === selectedAttendeeId);
      if (match) {
        attendeeName = match.name;
      } else {
        alert('Please choose an approved staff member.');
        setIsGenerating(false);
        return;
      }
    } else {
      attendeeName = 'SHC internal meeting';
    }

    let meetUrl = '';

    try {
      const response = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const data = await response.json();
        if (data.meetingUri) {
          meetUrl = data.meetingUri;
        }
      }
    } catch (err) {
      console.error('Failed to create Google Meet space:', err);
    }

    if (!meetUrl) {
      alert('Google Meet could not create a meeting link. Reconnect Google Workspace and try again.');
      setIsGenerating(false);
      return;
    }

    onAddLog(`Created Google Meet link for ${attendeeName}`, 'recruitment');

    const newMeeting = {
      id: `meet_${Date.now()}`,
      title: meetingTitle,
      meetUrl,
      time: meetingTime,
      attendee: attendeeName,
      type: attendeeType
    };

    setMeetings(prev => [newMeeting, ...prev]);

    // If candidate, sync with their details so it triggers Kanban card state
    if (attendeeType === 'candidate' && targetCandidateId) {
      onUpdateApplicantDetails(targetCandidateId, {
        interviewMeetUrl: meetUrl,
        interviewTime: meetingTime
      });
    }

    // Reset Form
    setMeetingTitle('');
    setIsGenerating(false);

    alert(`Meeting link created for ${attendeeName}. Use Candidate Communications or copy the link to share it.`);
  };

  // Remove helper
  const handleDeleteMeeting = (id: string, attendeeName: string) => {
    if (confirm(`Do you want to cancel the meeting with ${attendeeName}?`)) {
      // Find meeting to decouple if candidate
      const match = meetings.find(m => m.id === id);
      if (match && match.type === 'candidate') {
        const candidate = applicants.find(a => a.name === match.attendee);
        if (candidate) {
          onUpdateApplicantDetails(candidate.id, {
            interviewMeetUrl: undefined,
            interviewTime: undefined
          });
        }
      }
      setMeetings(prev => prev.filter(m => m.id !== id));
      onAddLog(`Cancelled meeting assignment: ${attendeeName}`, 'recruitment');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="google-meet-scheduler-workspace">
      
      {/* LEFT COLUMN: WIZARD FORM */}
      <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-slate-850">Reserve Virtual Room</h3>
            <p className="text-[10px] text-slate-500">Google Meet corporate space creation.</p>
          </div>
        </div>

        <form onSubmit={handleCreateMeetingSpace} className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Meeting Subject / Title</label>
            <input
              type="text"
              required
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-purple-500 bg-white"
              placeholder="e.g. Clinical Nursing Pre-Boarding"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Target Attendee Type</label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['candidate', 'staff', 'general'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAttendeeType(type);
                    setSelectedAttendeeId('');
                  }}
                  className={`p-2 py-1.5 rounded-lg text-center text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    attendeeType === type 
                      ? 'bg-purple-900 border-purple-900 text-white shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {attendeeType === 'candidate' && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Linked Candidate Profiles</label>
              <select
                value={selectedAttendeeId}
                onChange={(e) => setSelectedAttendeeId(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
              >
                <option value="">-- Choose Candidate --</option>
                {applicants.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.position})
                  </option>
                ))}
              </select>
            </div>
          )}

          {attendeeType === 'staff' && (
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Registered Caregivers & Staff</label>
              <select
                value={selectedAttendeeId}
                onChange={(e) => setSelectedAttendeeId(e.target.value)}
                className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
              >
                <option value="">-- Choose Member --</option>
                {staff.map(mem => (
                  <option key={mem.id} value={mem.id}>
                    {mem.name} ({mem.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {attendeeType === 'general' && (
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
              <p className="text-[10px] text-slate-550 italic leading-normal">
                Create an SHC internal Google Meet link that can be shared with the required attendees.
              </p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Scheduled Timestamp</label>
            <input
              type="datetime-local"
              required
              value={meetingTime}
              onChange={(e) => setMeetingTime(e.target.value)}
              className="mt-1 block w-full border border-slate-300 rounded-lg p-2 text-xs font-mono"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isGenerating || !googleToken}
              className="w-full inline-flex justify-center items-center space-x-1.5 py-2.5 bg-gradient-to-r from-purple-900 to-rose-700 hover:from-purple-950 text-white rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Creating meeting…' : googleToken ? 'Create Google Meet link' : 'Connect Google Workspace to schedule'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: LIST OF MEETINGS */}
      <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-850">Scheduled Meetings</h3>
            <p className="text-[10px] text-slate-500">Recruitment interviews and SHC Google Meet links.</p>
          </div>
          <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-800 border border-indigo-150 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
            {googleToken ? 'Google Workspace connected' : 'Google Workspace not connected'}
          </span>
        </div>

        {meetings.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl text-center p-6 bg-slate-50/20">
            <Video className="w-8 h-8 text-slate-300 stroke-1 opacity-70 mb-2" />
            <p className="text-xs text-slate-500 font-bold">No active scheduled meeting spaces registered yet</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-sm leading-relaxed">
              Use the scheduler tool on the left or schedule candidate interviews directly from the Recruitment Kanban board.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {meetings.map((meet) => (
              <div 
                key={meet.id} 
                className="p-3.5 border border-slate-150 bg-slate-50/40 rounded-xl hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="space-y-1 max-w-[70%]">
                  <div className="flex items-center gap-2">
                    <span className={`p-0.5 px-2 text-[8px] font-black uppercase rounded-full border ${
                      meet.type === 'candidate' 
                        ? 'bg-purple-50 text-purple-800 border-purple-200' 
                        : meet.type === 'staff' 
                        ? 'bg-amber-50 text-amber-800 border-amber-200' 
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}>
                      {meet.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(meet.time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(meet.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {meet.title}
                  </h4>
                  
                  <p className="text-[10px] text-slate-600 font-medium flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    Attendee: <span className="text-slate-900 font-bold ml-1">{meet.attendee}</span>
                  </p>
                  
                  <div className="bg-white p-1.5 px-2.5 rounded border border-slate-200 inline-flex items-center text-[10px] font-mono text-indigo-700 font-semibold max-w-full truncate shadow-inner">
                    <Video className="w-3.5 h-3.5 text-indigo-500 shrink-0 mr-1.5" />
                    <span className="truncate">{meet.meetUrl}</span>
                  </div>
                </div>

                <div className="flex sm:flex-col items-stretch gap-1.5 shrink-0">
                  <div className="flex gap-1">
                    <a
                      href={meet.meetUrl}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center p-1.5 px-3 bg-indigo-650 hover:bg-indigo-700 bg-indigo-600 text-white font-extrabold text-[10px] rounded hover:shadow-sm"
                      title="Launch virtual Google Meet room"
                    >
                      Join Space <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                    
                    <button
                      onClick={() => handleCopyLink(meet.meetUrl, meet.id)}
                      className="p-1.5 px-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded transition-all cursor-pointer inline-flex items-center"
                      title="Copy join link to clipboard"
                    >
                      {copiedId === meet.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteMeeting(meet.id, meet.attendee)}
                    className="p-1 text-rose-700 hover:text-rose-900 hover:bg-rose-50 text-[10px] font-bold rounded cursor-pointer text-center border border-transparent hover:border-rose-100 transition-all font-sans"
                  >
                    Cancel Meeting
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
