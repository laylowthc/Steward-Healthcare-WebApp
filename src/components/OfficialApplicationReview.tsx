import React, { useEffect, useState } from "react";
import { Download, FileCheck2 } from "lucide-react";
import SHCLoader from "./SHCLoader";
import ContinuousHistoryTimeline from './ContinuousHistoryTimeline';
import {
  loadOfficialApplication,
  loadOfficialApplicationVersions,
  reviewOfficialApplication,
} from "../lib/officialApplicationRepository";
import {
  OfficialApplicationData,
  OfficialApplicationStatus,
  OfficialApplicationVersion,
} from "../types/officialApplication";
import { RoleTemplate } from '../types';
import { nmcPresentation } from '../lib/officialApplicationPresentation';

const statuses: OfficialApplicationStatus[] = [
  "Submitted",
  "Under Review",
  "Returned for Correction",
  "Approved",
  "Rejected",
];
const label = (key: string) =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const pdfRows = (value: any, prefix = ""): Array<[string, string]> => {
  if (Array.isArray(value))
    return value.flatMap((entry, index) => pdfRows(entry, `${prefix}Entry ${index + 1} - `));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, nested]) =>
      nested && typeof nested === "object"
        ? pdfRows(nested, `${prefix}${label(key)} - `)
        : [[`${prefix}${label(key)}`, nested === null || nested === undefined || nested === "" ? "Not provided" : typeof nested === "boolean" ? (nested ? "Yes" : "No") : String(nested)]],
    );
  return [[prefix || "Value", value === null || value === undefined || value === "" ? "Not provided" : String(value)]];
};
const show = (value: any): React.ReactNode =>
  value === null || value === undefined || value === "" ? (
    <span className="text-slate-400">Not provided</span>
  ) : typeof value === "boolean" ? (
    value ? (
      "Yes"
    ) : (
      "No"
    )
  ) : Array.isArray(value) ? (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="rounded-lg border bg-white p-2">
          {show(v)}
        </div>
      ))}
    </div>
  ) : typeof value === "object" ? (
    <dl className="space-y-1">
      {Object.entries(value).map(([k, v]) => (
        <div key={k} className="grid grid-cols-2 gap-2">
          <dt className="font-bold text-slate-500">{label(k)}</dt>
          <dd>{show(v)}</dd>
        </div>
      ))}
    </dl>
  ) : (
    String(value)
  );

const sections = (a: OfficialApplicationData, templates: RoleTemplate[]) => {
  const nmc = nmcPresentation(a, templates);
  const professionalRegistration = nmc.required || nmc.hasSubmittedData ? {
    professionalRegistrationContext: nmc.historicalOnly
      ? 'Historical submitted data retained in this immutable application; NMC registration is not a current requirement for this role.'
      : 'Professional registration required for the selected role.',
    nmcPin: a.nmcPin,
    rna: a.rna,
    nmcExpiryDate: a.nmcExpiryDate,
  } : {};
  return (
  [
    [
      "1. Role and Personal Details",
      {
        positionApplied: a.positionApplied,
        vacancyReferenceLocation: a.vacancyReferenceLocation,
        sourceOfAdvertisement: a.sourceOfAdvertisement,
        title: a.title,
        forenames: a.forenames,
        surname: a.surname,
        address: a.address,
        postcode: a.postcode,
        telephone: a.telephone,
        mobile: a.mobile,
        personalEmail: a.personalEmail,
        nationalInsuranceNumber: a.nationalInsuranceNumber,
        eligibleToWorkUk: a.eligibleToWorkUk,
      },
    ],
    [
      "2. Professional and Compliance",
      {
        ...professionalRegistration,
        rightToWork: a.rightToWork,
        enhancedDbs: a.enhancedDbs,
        dbsIssueDate: a.dbsIssueDate,
      },
    ],
    [
      "3. Present or Most Recent Employer",
      {
        employerNameAddress: a.recentEmployerNameAddress,
        postcode: a.recentEmployerPostcode,
        telephone: a.recentEmployerTelephone,
        dateEmployedFrom: a.recentEmployerDateFrom,
        dateEmployedTo: a.recentEmployerDateTo,
        positionTitle: a.recentEmployerPositionTitle,
        primaryResponsibilities: a.recentEmployerPrimaryResponsibilities,
        salary: a.recentEmployerSalary,
        noticePeriod: a.recentEmployerNoticePeriod,
        reasonForLeaving: a.recentEmployerReasonForLeaving,
      },
    ],
    ["4. Continuous History", a.employmentHistory],
    [
      "5. References",
      {
        professionalReferences: a.professionalReferences,
        refereesAgreedToContact: a.refereesAgreedToContact,
      },
    ],
    ["7. Personal Statement", { personalStatement: a.personalStatement }],
    [
      "8. Additional and Criminal Record",
      {
        knowsConnectedPerson: a.knowsConnectedPerson,
        connectedPersonDetails: a.connectedPersonDetails,
        hasUnprotectedCriminalRecord: a.hasUnprotectedCriminalRecord,
        criminalRecordDetails: a.criminalRecordDetails,
      },
    ],
    [
      "9. Declaration and Signature",
      {
        declarationConfirmed: a.declarationConfirmed,
        referencesAndChecksAuthorised: a.referencesAndChecksAuthorised,
        satisfactoryChecksAcknowledged: a.satisfactoryChecksAcknowledged,
        dataProtectionConsent: a.dataProtectionConsent,
        signatureType: a.signatureType,
        signature: a.signatureValue,
        printName: a.printedName,
        date: a.signatureDate,
        submittedAt: a.submittedAt,
      },
    ],
  ] as Array<[string, any]>
  );
};

export default function OfficialApplicationReview({
  userId,
  templates,
}: {
  userId?: string;
  templates: RoleTemplate[];
}) {
  const [app, setApp] = useState<OfficialApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OfficialApplicationStatus>("Submitted");
  const [error, setError] = useState("");
  const [versions, setVersions] = useState<OfficialApplicationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<OfficialApplicationVersion | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  useEffect(() => {
    let active = true;
    if (!userId) {
      setLoading(false);
      return;
    }
    loadOfficialApplication(userId)
      .then((a) => {
        if (active) {
          setApp(a);
          if (a) {
            setNotes(a.reviewerNotes || "");
            setStatus(a.status);
            if (a.id) {
              loadOfficialApplicationVersions(a.id)
                .then((history) => active && setVersions(history))
                .catch((e) => active && setError(e.message));
            }
          }
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);
  const saveReview = async () => {
    if (!app?.id) return;
    setLoading(true);
    try {
      await reviewOfficialApplication(app.id, status, notes);
      setApp({
        ...app,
        status,
        reviewerNotes: notes,
        reviewedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const exportPdf = async () => {
    if (!app) return;
    setExporting(true);
    setExportMessage("");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const logoBlob = await fetch("/assets/shc-logo.png").then((response) => {
        if (!response.ok) throw new Error("Official SHC logo could not be loaded.");
        return response.blob();
      });
      const logoData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Official SHC logo could not be read."));
        reader.readAsDataURL(logoBlob);
      });
      const pageGroups = [
        sections(app, templates).slice(0, 2),
        sections(app, templates).slice(2, 4),
        sections(app, templates).slice(4, 5),
        sections(app, templates).slice(5, 6),
        sections(app, templates).slice(6),
      ];
      pageGroups.forEach((group, pageIndex) => {
        if (pageIndex > 0) doc.addPage();
        doc.addImage(logoData, "PNG", 14, 9, 70, 16.3);
        doc.setDrawColor(191, 27, 115);
        doc.setLineWidth(0.8);
        doc.line(14, 29, 196, 29);
        doc.setTextColor(53, 16, 100);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("APPLICATION FOR EMPLOYMENT", 14, 37);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.text(`Applicant: ${app.forenames} ${app.surname}   Role: ${app.positionApplied}   Version: ${app.revision}`, 14, 43);
        let y = 51;
        group.forEach(([heading, value]) => {
          doc.setFillColor(53, 16, 100);
          doc.rect(14, y, 182, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text(heading, 17, y + 5.3);
          y += 10;
          for (const [field, raw] of pdfRows(value)) {
            const valueLines = doc.splitTextToSize(raw, 105) as string[];
            const fieldLines = doc.splitTextToSize(field, 56) as string[];
            const rowHeight = Math.max(7, fieldLines.length * 4.2 + 2.5, valueLines.length * 4.2 + 2.5);
            doc.setDrawColor(222, 213, 229);
            doc.setFillColor(250, 247, 252);
            doc.rect(14, y, 62, rowHeight, "FD");
            doc.rect(76, y, 120, rowHeight, "S");
            doc.setTextColor(45, 36, 55);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.text(fieldLines, 17, y + 4.5);
            doc.setFont("helvetica", "normal");
            doc.text(valueLines, 79, y + 4.5);
            y += rowHeight;
          }
          y += 4;
        });
        doc.setTextColor(110, 100, 120);
        doc.setFontSize(7);
        doc.text(`SHC confidential recruitment record · Page ${pageIndex + 1} of ${pageGroups.length}`, 14, 291);
      });
      const safeName = `${app.forenames}_${app.surname}`.replace(/[^a-z0-9_-]+/gi, "_");
      doc.save(`SHC_Employment_Application_${safeName}_v${app.revision}.pdf`);
      setExportMessage("PDF downloaded successfully.");
    } catch (e: any) {
      setError(e.message || "PDF generation failed.");
    } finally {
      setExporting(false);
    }
  };
  if (loading)
    return <SHCLoader variant="page" text="Loading official application..." />;
  if (error)
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        {error}
      </div>
    );
  if (!app)
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        No structured official application has been started.
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-black text-purple-950">
            <FileCheck2 className="h-4 w-4" />
            Official Application
          </h4>
          <p className="text-[10px] text-slate-500">
            {app.status} - version {app.revision} -{" "}
            {app.submittedAt
              ? new Date(app.submittedAt).toLocaleString()
              : "not submitted"}
          </p>
        </div>
        <button
          onClick={exportPdf}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg border border-purple-300 px-3 py-2 text-xs font-bold text-purple-900"
        >
          {exporting ? <SHCLoader variant="inline" text="Generating PDF..." /> : <><Download className="h-4 w-4" />Download PDF</>}
        </button>
      </div>
      {exportMessage && <p className="text-xs font-bold text-emerald-700">{exportMessage}</p>}
      {nmcPresentation(app, templates).historicalOnly && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold leading-5 text-amber-900">This immutable submission contains historical professional-registration information. NMC registration is not part of the applicant's current role requirements and does not affect their current personnel-file or compliance status.</p>}
      <div className="max-h-[520px] space-y-4 overflow-y-auto rounded-xl border bg-slate-50 p-3 text-[11px]">
        {sections(app, templates).map(([heading, value]) => (
          <section key={heading} className="rounded-xl border bg-white p-3">
            {heading.startsWith('4.') ? <ContinuousHistoryTimeline application={app} /> : <>
              <h5 className="mb-2 font-black uppercase text-purple-900">{heading}</h5>
              {show(value)}
            </>}
          </section>
        ))}
      </div>
      <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold">
            Review status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as OfficialApplicationStatus)
              }
              className="mt-1 w-full rounded-lg border p-2"
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Reviewer notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2"
              rows={3}
            />
          </label>
        </div>
        <button
          onClick={saveReview}
          className="mt-3 rounded-lg bg-purple-900 px-4 py-2 text-xs font-bold text-white"
        >
          Save Review
        </button>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h5 className="mb-2 text-xs font-black uppercase text-purple-900">Submission history</h5>
        {versions.length === 0 ? (
          <p className="text-[11px] text-slate-500">No submitted versions have been archived yet.</p>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] hover:border-purple-300"
              >
                <span className="font-bold text-slate-800">Version {version.revision} · {version.status}</span>
                <span className="text-slate-500">{new Date(version.createdAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
        {selectedVersion && (
          <div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-xl border bg-slate-50 p-3 text-[11px]">
            {sections(selectedVersion.snapshot, templates).map(([heading, value]) => (
              <section key={heading} className="rounded-lg border bg-white p-3">
                {heading.startsWith('4.') ? <ContinuousHistoryTimeline application={selectedVersion.snapshot} /> : <>
                  <h6 className="mb-2 font-black uppercase text-purple-900">{heading}</h6>
                  {show(value)}
                </>}
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
