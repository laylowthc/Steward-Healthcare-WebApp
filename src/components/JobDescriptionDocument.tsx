import React from 'react';
import { JobDescriptionContent } from '../types/jobDescription';
import BrandedLogo from './BrandedLogo';

interface Props {
  title: string;
  roleName: string;
  version: string;
  effectiveDate?: string;
  content: JobDescriptionContent;
  acknowledgement?: {
    text: string;
    signerName: string;
    signatureType: 'typed' | 'drawn';
    signatureValue: string;
    signedAt: string;
  };
}

export default function JobDescriptionDocument({ title, roleName, version, effectiveDate, content, acknowledgement }: Props) {
  const acknowledgementText = content.acknowledgementText || acknowledgement?.text || '';
  return (
    <article className="min-w-0 space-y-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700 sm:p-5 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-purple-200 pb-4">
        <div><BrandedLogo /><p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-purple-800">{content.documentStatus || 'Controlled HR Document'}</p></div>
        <dl className="text-right text-[10px]"><dt className="font-black text-slate-500">Version</dt><dd className="font-bold text-slate-900">{version}</dd>{effectiveDate && <><dt className="mt-1 font-black text-slate-500">Effective</dt><dd>{new Date(`${effectiveDate}T00:00:00`).toLocaleDateString()}</dd></>}</dl>
      </header>
      <div><h2 className="break-words text-xl font-black text-purple-950">{title}</h2><p className="mt-1 font-bold text-slate-600">Job Title: {roleName}</p>{content.organisation && <p className="mt-1 text-slate-600">Organisation: {content.organisation}</p>}</div>
      {content.reportsTo && <section><h3 className="font-black uppercase text-purple-900">Reports to</h3><p className="mt-2">{content.reportsTo}</p></section>}
      {content.professionalRequirement && <section><h3 className="font-black uppercase text-purple-900">Professional requirement</h3><p className="mt-2">{content.professionalRequirement}</p></section>}
      {content.summary && <section><h3 className="font-black uppercase text-purple-900">Role purpose</h3><p className="mt-2 whitespace-pre-wrap leading-5">{content.summary}</p></section>}
      <section><h3 className="font-black uppercase text-purple-900">Duties and responsibilities</h3><ol className="mt-2 list-decimal space-y-2 pl-5 leading-5">{content.duties.map((duty, index) => <li key={`${index}-${duty}`}>{duty}</li>)}</ol></section>
      {content.conduct.length > 0 && <section><h3 className="font-black uppercase text-purple-900">Professional conduct</h3><ul className="mt-2 list-disc space-y-2 pl-5 leading-5">{content.conduct.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></section>}
      {acknowledgementText && <section><h3 className="font-black uppercase text-purple-900">Acknowledgement</h3><p className="mt-2 leading-5">{acknowledgementText}</p></section>}
      {acknowledgement && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 print:border-slate-300 print:bg-white"><h3 className="font-black uppercase text-emerald-900">Electronic signature record</h3><div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0"><p className="break-words font-bold">{acknowledgement.signerName}</p><p className="text-[10px]">Signed {new Date(acknowledgement.signedAt).toLocaleString()}</p></div><div className="min-w-0">{acknowledgement.signatureType === 'drawn' ? <img src={acknowledgement.signatureValue} alt="Applicant drawn signature" className="max-h-20 max-w-full rounded bg-white" /> : <p className="break-words font-serif text-2xl italic text-purple-950">{acknowledgement.signatureValue}</p>}</div></div></section>}
    </article>
  );
}
