import React from 'react';
import { AlertCircle, BriefcaseBusiness, GraduationCap, HeartHandshake } from 'lucide-react';
import { OfficialApplicationData } from '../types/officialApplication';
import {
  analyseChronology,
  applicationChronologyEntries,
  chronologyTypeLabels,
  formatHistoryMonth,
  formatHistoryRange,
} from '../lib/continuousHistory';

const category = (type: string) => {
  if (type === 'employment') return { label: 'Employment', icon: BriefcaseBusiness, tone: 'border-blue-200 bg-blue-50 text-blue-900' };
  if (['secondary_education', 'higher_education', 'vocational_training'].includes(type)) {
    return { label: 'Education', icon: GraduationCap, tone: 'border-purple-200 bg-purple-50 text-purple-900' };
  }
  return { label: 'Explained activity', icon: HeartHandshake, tone: 'border-amber-200 bg-amber-50 text-amber-950' };
};

export default function ContinuousHistoryTimeline({ application }: { application: OfficialApplicationData }) {
  const analysis = analyseChronology(applicationChronologyEntries(application));
  return (
    <section className="space-y-3" aria-label="Continuous history timeline">
      <div>
        <h5 className="font-black uppercase text-purple-900">4. Continuous education, employment and activity history</h5>
        <p className="mt-1 text-[10px] text-slate-500">Secondary school through the present, ordered chronologically.</p>
      </div>

      {!analysis.hasSecondaryEducation && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 font-bold text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Secondary/high-school history is missing.
        </div>
      )}
      {analysis.dateIssues.map(issue => (
        <div key={`${issue.entryId}-${issue.message}`} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 font-bold text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{issue.message}
        </div>
      ))}
      {analysis.gaps.map(gap => (
        <div key={`${gap.startMonth}-${gap.endMonth}`} className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 font-bold text-rose-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Unresolved gap: {formatHistoryMonth(gap.startMonth)} to {formatHistoryMonth(gap.endMonth)} ({gap.durationMonths} month{gap.durationMonths === 1 ? '' : 's'}).
        </div>
      ))}

      <div className="relative space-y-3 border-l-2 border-purple-200 pl-4">
        {analysis.entries.map(entry => {
          const item = category(entry.type);
          const Icon = item.icon;
          return (
            <article key={entry.id} className={`relative rounded-xl border p-3 ${item.tone}`}>
              <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-white bg-purple-700" />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{item.label}</p>
                  <h6 className="mt-1 text-xs font-black">{entry.organisation || chronologyTypeLabels[entry.type]}</h6>
                  {entry.title && <p className="mt-0.5 font-semibold">{entry.title}</p>}
                </div>
                <span className="rounded-full bg-white/80 px-2 py-1 text-[9px] font-black">{formatHistoryRange(entry)}</span>
              </div>
              {entry.location && <p className="mt-2 text-[10px] font-semibold">Location: {entry.location}</p>}
              {entry.details && <p className="mt-2 whitespace-pre-wrap text-[10px] leading-4">{entry.details}</p>}
              {entry.reasonForLeaving && <p className="mt-2 text-[10px]"><b>Reason for leaving:</b> {entry.reasonForLeaving}</p>}
            </article>
          );
        })}
        {analysis.entries.length === 0 && <p className="text-slate-500">No chronology has been supplied.</p>}
      </div>
    </section>
  );
}
