import {
  ChronologyEntry,
  ChronologyEntryType,
  OfficialApplicationData,
} from '../types/officialApplication';

export type ChronologyGap = {
  startMonth: string;
  endMonth: string;
  durationMonths: number;
  precedingEntry?: ChronologyEntry;
  followingEntry?: ChronologyEntry;
  resolved: false;
};

export type ChronologyDateIssue = {
  entryId: string;
  message: string;
};

export type ChronologyAnalysis = {
  entries: ChronologyEntry[];
  hasSecondaryEducation: boolean;
  gaps: ChronologyGap[];
  dateIssues: ChronologyDateIssue[];
  complete: boolean;
};

export const chronologyTypeLabels: Record<ChronologyEntryType, string> = {
  secondary_education: 'Secondary / high school',
  higher_education: 'College / university',
  vocational_training: 'Vocational study / training',
  employment: 'Employment',
  unemployment: 'Unemployed / seeking work',
  caring_responsibilities: 'Caring responsibilities',
  parental_leave: 'Maternity / paternity leave',
  illness: 'Medical / health reason',
  travel: 'Travel',
  career_break: 'Career break',
  other: 'Other explained period',
};

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthValue = (value?: string) => {
  const month = String(value || '').slice(0, 7);
  if (!monthPattern.test(month)) return null;
  const [year, number] = month.split('-').map(Number);
  return year * 12 + number - 1;
};

export const monthFromValue = (value?: string) => {
  const month = String(value || '').slice(0, 7);
  return monthPattern.test(month) ? month : '';
};

const monthFromIndex = (value: number) => {
  const year = Math.floor(value / 12);
  const month = value % 12 + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
};

export const formatHistoryMonth = (value?: string) => {
  const parsed = monthValue(value);
  if (parsed === null) return 'Unknown';
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
    .format(new Date(Math.floor(parsed / 12), parsed % 12, 1));
};

export const formatHistoryRange = (entry: ChronologyEntry) =>
  `${formatHistoryMonth(entry.startMonth)} – ${entry.isCurrent ? 'Present' : formatHistoryMonth(entry.endMonth)}`;

export const normalizeChronologyEntries = (value: unknown): ChronologyEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw: any, index): ChronologyEntry[] => {
    if (!raw || typeof raw !== 'object') return [];
    if (raw.type && raw.startMonth !== undefined) {
      return [{
        id: String(raw.id || `history-${index}`),
        type: raw.type as ChronologyEntryType,
        organisation: String(raw.organisation || ''),
        title: String(raw.title || ''),
        startMonth: monthFromValue(raw.startMonth),
        endMonth: monthFromValue(raw.endMonth),
        isCurrent: Boolean(raw.isCurrent),
        location: String(raw.location || ''),
        details: String(raw.details || ''),
        reasonForLeaving: String(raw.reasonForLeaving || ''),
        ...(raw.legacyPostcode ? { legacyPostcode: String(raw.legacyPostcode) } : {}),
        ...(raw.legacyTelephone ? { legacyTelephone: String(raw.legacyTelephone) } : {}),
      }];
    }

    const hasLegacyData = [
      raw.employerNameAddress,
      raw.positionHeld,
      raw.dateFrom,
      raw.dateTo,
      raw.reasonForLeaving,
    ].some(item => String(item || '').trim());
    if (!hasLegacyData) return [];
    return [{
      id: `legacy-employer-${index}`,
      type: 'employment',
      organisation: String(raw.employerNameAddress || ''),
      title: String(raw.positionHeld || ''),
      startMonth: monthFromValue(raw.dateFrom),
      endMonth: monthFromValue(raw.dateTo),
      isCurrent: false,
      location: String(raw.postcode || ''),
      details: '',
      reasonForLeaving: String(raw.reasonForLeaving || ''),
      legacyPostcode: String(raw.postcode || ''),
      legacyTelephone: String(raw.telephone || ''),
    }];
  });
};

export const applicationChronologyEntries = (
  application: Pick<OfficialApplicationData,
    | 'employmentHistory'
    | 'recentEmployerNameAddress'
    | 'recentEmployerPositionTitle'
    | 'recentEmployerDateFrom'
    | 'recentEmployerDateTo'
    | 'recentEmployerPrimaryResponsibilities'
    | 'recentEmployerReasonForLeaving'
    | 'recentEmployerPostcode'
    | 'recentEmployerTelephone'>,
) => {
  const entries = normalizeChronologyEntries(application.employmentHistory);
  const hasRecentEmployer = [
    application.recentEmployerNameAddress,
    application.recentEmployerPositionTitle,
    application.recentEmployerDateFrom,
  ].some(value => value.trim());
  if (!hasRecentEmployer) return entries;
  const recentStart = monthFromValue(application.recentEmployerDateFrom);
  const alreadyIncluded = entries.some(entry =>
    entry.type === 'employment'
    && entry.organisation.trim().toLowerCase() === application.recentEmployerNameAddress.trim().toLowerCase()
    && entry.startMonth === recentStart,
  );
  if (alreadyIncluded) return entries;
  return [...entries, {
    id: 'present-or-most-recent-employer',
    type: 'employment' as const,
    organisation: application.recentEmployerNameAddress,
    title: application.recentEmployerPositionTitle,
    startMonth: recentStart,
    endMonth: monthFromValue(application.recentEmployerDateTo),
    isCurrent: !application.recentEmployerDateTo,
    location: application.recentEmployerPostcode,
    details: application.recentEmployerPrimaryResponsibilities,
    reasonForLeaving: application.recentEmployerReasonForLeaving,
    legacyPostcode: application.recentEmployerPostcode,
    legacyTelephone: application.recentEmployerTelephone,
  }];
};

export const analyseChronology = (
  entriesInput: ChronologyEntry[],
  asOf = new Date(),
): ChronologyAnalysis => {
  const entries = normalizeChronologyEntries(entriesInput);
  const currentMonth = asOf.getFullYear() * 12 + asOf.getMonth();
  const dateIssues: ChronologyDateIssue[] = [];
  const intervals = entries.flatMap(entry => {
    if (['secondary_education', 'higher_education', 'vocational_training', 'employment'].includes(entry.type)
      && !entry.organisation.trim()) {
      dateIssues.push({ entryId: entry.id, message: `${chronologyTypeLabels[entry.type]} needs an organisation or institution.` });
    }
    if (entry.type === 'employment' && !entry.title.trim()) {
      dateIssues.push({ entryId: entry.id, message: 'Employment needs a role or position.' });
    }
    if (['secondary_education', 'higher_education', 'vocational_training'].includes(entry.type) && !entry.title.trim()) {
      dateIssues.push({ entryId: entry.id, message: `${chronologyTypeLabels[entry.type]} needs a course or qualification.` });
    }
    if (entry.type === 'other' && !entry.details.trim()) {
      dateIssues.push({ entryId: entry.id, message: 'Other explained period needs a short explanation.' });
    }
    const start = monthValue(entry.startMonth);
    const end = entry.isCurrent ? currentMonth : monthValue(entry.endMonth);
    if (start === null) {
      dateIssues.push({ entryId: entry.id, message: `${chronologyTypeLabels[entry.type]} needs a valid start month.` });
      return [];
    }
    if (start > currentMonth) {
      dateIssues.push({ entryId: entry.id, message: `${chronologyTypeLabels[entry.type]} cannot start in the future.` });
      return [];
    }
    if (end === null) {
      dateIssues.push({ entryId: entry.id, message: `${chronologyTypeLabels[entry.type]} needs an end month or Present.` });
      return [];
    }
    if (end < start) {
      dateIssues.push({ entryId: entry.id, message: `${chronologyTypeLabels[entry.type]} ends before it starts.` });
      return [];
    }
    return [{ entry, start, end: Math.min(end, currentMonth) }];
  }).sort((a, b) => a.start - b.start || b.end - a.end);

  const secondaryStarts = intervals
    .filter(interval => interval.entry.type === 'secondary_education')
    .map(interval => interval.start);
  const hasSecondaryEducation = secondaryStarts.length > 0;
  const timelineStart = hasSecondaryEducation ? Math.min(...secondaryStarts) : null;
  const gaps: ChronologyGap[] = [];

  if (timelineStart !== null) {
    const coverage = intervals
      .filter(interval => interval.end >= timelineStart)
      .map(interval => ({ ...interval, start: Math.max(interval.start, timelineStart) }));
    let coverageEnd = timelineStart - 1;
    let precedingEntry: ChronologyEntry | undefined;
    for (const interval of coverage) {
      if (interval.start > coverageEnd + 1) {
        gaps.push({
          startMonth: monthFromIndex(coverageEnd + 1),
          endMonth: monthFromIndex(interval.start - 1),
          durationMonths: interval.start - coverageEnd - 1,
          precedingEntry,
          followingEntry: interval.entry,
          resolved: false,
        });
      }
      if (interval.end > coverageEnd) {
        coverageEnd = interval.end;
        precedingEntry = interval.entry;
      }
    }
    if (coverageEnd < currentMonth) {
      gaps.push({
        startMonth: monthFromIndex(coverageEnd + 1),
        endMonth: monthFromIndex(currentMonth),
        durationMonths: currentMonth - coverageEnd,
        precedingEntry,
        resolved: false,
      });
    }
  }

  return {
    entries: entries.sort((a, b) => (monthValue(a.startMonth) ?? Infinity) - (monthValue(b.startMonth) ?? Infinity)),
    hasSecondaryEducation,
    gaps,
    dateIssues,
    complete: hasSecondaryEducation && gaps.length === 0 && dateIssues.length === 0,
  };
};

export const chronologyValidationMessages = (
  application: OfficialApplicationData,
  asOf = new Date(),
) => {
  const analysis = analyseChronology(applicationChronologyEntries(application), asOf);
  const messages = analysis.dateIssues.map(issue => issue.message);
  if (!analysis.hasSecondaryEducation) {
    messages.push('Please add your secondary/high-school history so SHC has a complete chronology.');
  }
  analysis.gaps.forEach(gap => {
    messages.push(`Explain the period between ${formatHistoryMonth(gap.startMonth)} and ${formatHistoryMonth(gap.endMonth)}.`);
  });
  return messages;
};
