import React, { useEffect, useMemo, useRef, useState } from "react";
import { Applicant, RoleTemplate } from "../types";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import SHCLoader from "./SHCLoader";
import BrandedLogo from "./BrandedLogo";
import {
  emptyChronologyEntry,
  emptyReference,
  ChronologyEntryType,
  EqualOpportunitiesData,
  OfficialApplicationData,
} from "../types/officialApplication";
import {
  loadEqualOpportunities,
  loadOfficialApplication,
  saveEqualOpportunities,
  saveOfficialApplication,
} from "../lib/officialApplicationRepository";
import { validateOfficialApplication } from "../lib/officialApplicationValidation";
import { findRole, hasRequirement } from "../lib/roleEngine";
import {
  analyseChronology,
  applicationChronologyEntries,
  chronologyTypeLabels,
  formatHistoryMonth,
} from "../lib/continuousHistory";

interface Props {
  applicant: Applicant;
  authenticatedUserId: string;
  templates: RoleTemplate[];
  onRoleChange?: (role: RoleTemplate) => Promise<void> | void;
  onCancel?: () => void;
}
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-100";
const today = () => new Date().toISOString().slice(0, 10);
const initialApplication = (
  applicant: Applicant,
  userId: string,
): OfficialApplicationData => {
  const names = applicant.name.trim().split(/\s+/);
  return {
    userId,
    applicantId: applicant.id,
    roleId: applicant.roleId,
    positionApplied: applicant.position || "",
    vacancyReferenceLocation: "",
    sourceOfAdvertisement: "",
    title: "",
    forenames: names.slice(0, -1).join(" ") || names[0] || "",
    surname: names.length > 1 ? names[names.length - 1] : "",
    address: applicant.cvData?.personalDetails?.address || "",
    postcode: "",
    telephone: "",
    mobile: applicant.phone || "",
    personalEmail: applicant.email || "",
    nationalInsuranceNumber: "",
    eligibleToWorkUk: null,
    nmcPin: "",
    rna: "",
    nmcExpiryDate: "",
    rightToWork: "",
    enhancedDbs: "",
    dbsIssueDate: "",
    recentEmployerNameAddress: "",
    recentEmployerPostcode: "",
    recentEmployerTelephone: "",
    recentEmployerDateFrom: "",
    recentEmployerDateTo: "",
    recentEmployerPositionTitle: "",
    recentEmployerPrimaryResponsibilities: "",
    recentEmployerSalary: "",
    recentEmployerNoticePeriod: "",
    recentEmployerReasonForLeaving: "",
    employmentHistory: [],
    professionalReferences: [emptyReference(), emptyReference()],
    refereesAgreedToContact: false,
    personalStatement: "",
    knowsConnectedPerson: null,
    connectedPersonDetails: "",
    hasUnprotectedCriminalRecord: null,
    criminalRecordDetails: "",
    declarationConfirmed: false,
    referencesAndChecksAuthorised: false,
    satisfactoryChecksAcknowledged: false,
    dataProtectionConsent: false,
    signatureType: "typed",
    signatureValue: "",
    printedName: applicant.name || "",
    signatureDate: today(),
    currentStep: 1,
    status: "Draft",
    revision: 1,
  };
};
const initialEqual: EqualOpportunitiesData = {
  vacancyReferenceNumber: "",
  genderIdentification: "",
  ageBand: "",
  disabilityDeclaration: "",
  ethnicOrigin: "",
};

const labels = [
  "Role & Personal Details",
  "Professional & Compliance",
  "Present Employer",
  "Continuous History",
  "References",
  "Equal Opportunities",
  "Personal Statement",
  "Additional Information",
  "Declaration & Signature",
];

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  key?: React.Key;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
function Text({
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      className={input}
      type={type}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
function YesNo({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-3">
      {[
        ["Yes", true],
        ["No", false],
      ].map(([l, v]) => (
        <button
          key={l as string}
          type="button"
          onClick={() => onChange(v as boolean)}
          className={`rounded-xl border px-5 py-2 text-sm font-bold ${value === v ? "border-purple-700 bg-purple-50 text-purple-900" : "border-slate-300 text-slate-600"}`}
        >
          {l as string}
        </button>
      ))}
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !value.startsWith("data:image")) return;
    const image = new Image();
    image.onload = () => element.getContext("2d")?.drawImage(image, 0, 0, element.width, element.height);
    image.src = value;
  }, []);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const element = canvas.current!;
    const bounds = element.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (element.width / bounds.width), y: (event.clientY - bounds.top) * (element.height / bounds.height) };
  };
  return <div><canvas ref={canvas} width={700} height={150} aria-label="Draw electronic signature" className="h-36 w-full touch-none rounded-xl border border-slate-300 bg-white" onPointerDown={(event) => { drawing.current = true; const context = canvas.current!.getContext("2d")!; const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drawing.current) return; const context = canvas.current!.getContext("2d")!; const p = point(event); context.lineWidth = 2.5; context.lineCap = "round"; context.strokeStyle = "#351064"; context.lineTo(p.x, p.y); context.stroke(); }} onPointerUp={() => { drawing.current = false; if (canvas.current) onChange(canvas.current.toDataURL("image/png")); }} /><button type="button" className="mt-2 text-xs font-bold text-rose-700" onClick={() => { canvas.current?.getContext("2d")?.clearRect(0, 0, 700, 150); onChange(""); }}>Clear signature</button></div>;
}

export default function OnlineApplicationForm({
  applicant,
  authenticatedUserId,
  templates,
  onRoleChange,
  onCancel,
}: Props) {
  const [form, setForm] = useState(() =>
    initialApplication(applicant, authenticatedUserId),
  );
  const [equal, setEqual] = useState(initialEqual);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [gapToExplain, setGapToExplain] = useState<{ startMonth: string; endMonth: string } | null>(null);
  const [gapType, setGapType] = useState<ChronologyEntryType>('unemployment');
  const [gapDetails, setGapDetails] = useState('');
  const [gapOrganisation, setGapOrganisation] = useState('');
  const [gapTitle, setGapTitle] = useState('');
  const loaded = useRef(false);
  const timer = useRef<number>();
  const roleOptions = useMemo(
    () => templates.filter(role => role.active !== false),
    [templates],
  );
  const selectedRole = findRole(templates, form.roleId, form.positionApplied);
  const chronologyAnalysis = analyseChronology(applicationChronologyEntries(form));
  const showNmcRegistration = hasRequirement(selectedRole, ['nmc_registration_information', 'nmc_pin', 'nmc_expiry']);
  const requireNmcPin = hasRequirement(selectedRole, ['nmc_registration_information', 'nmc_pin']);
  const requireNmcExpiry = hasRequirement(selectedRole, 'nmc_expiry');
  const canEdit =
    form.status === "Draft" || form.status === "Returned for Correction";
  const update = <K extends keyof OfficialApplicationData>(
    key: K,
    value: OfficialApplicationData[K],
  ) => setForm((p) => ({ ...p, [key]: value }));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const found = await loadOfficialApplication(authenticatedUserId);
        if (!active) return;
        if (found) {
          const persistedRole = findRole(
            templates,
            found.roleId || applicant.roleId,
            found.positionApplied || applicant.position
          );
          setForm({
            ...found,
            roleId: persistedRole?.id || found.roleId || applicant.roleId,
            positionApplied: persistedRole?.role || found.positionApplied || applicant.position
          });
          if (found.id) {
            const eo = await loadEqualOpportunities(found.id);
            if (eo && active) setEqual(eo);
          }
        }
      } catch (e: any) {
        setError(
          e?.message?.includes("employment_applications")
            ? "The official application database migration has not been applied yet."
            : e.message || "Unable to restore application.",
        );
      } finally {
        if (active) {
          loaded.current = true;
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [authenticatedUserId]);

  const persist = async (next = form, nextEqual = equal) => {
    if (!loaded.current || !canEdit) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveOfficialApplication(next);
      setForm((p) => ({ ...p, id: saved.id, updatedAt: saved.updatedAt }));
      if (saved.id)
        await saveEqualOpportunities(saved.id, authenticatedUserId, nextEqual);
      setLastSaved(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (e: any) {
      setError(e.message || "Draft save failed.");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    if (!loaded.current || !canEdit) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => persist(form, equal), 900);
    return () => window.clearTimeout(timer.current);
  }, [
    form.currentStep,
    form.roleId,
    form.positionApplied,
    form.vacancyReferenceLocation,
    form.sourceOfAdvertisement,
    form.title,
    form.forenames,
    form.surname,
    form.address,
    form.postcode,
    form.telephone,
    form.mobile,
    form.personalEmail,
    form.nationalInsuranceNumber,
    form.eligibleToWorkUk,
    form.nmcPin,
    form.rna,
    form.nmcExpiryDate,
    form.rightToWork,
    form.enhancedDbs,
    form.dbsIssueDate,
    form.recentEmployerNameAddress,
    form.recentEmployerPostcode,
    form.recentEmployerTelephone,
    form.recentEmployerDateFrom,
    form.recentEmployerDateTo,
    form.recentEmployerPositionTitle,
    form.recentEmployerPrimaryResponsibilities,
    form.recentEmployerSalary,
    form.recentEmployerNoticePeriod,
    form.recentEmployerReasonForLeaving,
    form.employmentHistory,
    form.professionalReferences,
    form.refereesAgreedToContact,
    form.personalStatement,
    form.knowsConnectedPerson,
    form.connectedPersonDetails,
    form.hasUnprotectedCriminalRecord,
    form.criminalRecordDetails,
    form.declarationConfirmed,
    form.referencesAndChecksAuthorised,
    form.satisfactoryChecksAcknowledged,
    form.dataProtectionConsent,
    form.signatureType,
    form.signatureValue,
    form.printedName,
    form.signatureDate,
    equal,
  ]);

  const submit = async () => {
    const missing = validateOfficialApplication(form, selectedRole);
    if (missing.length) {
      setError(`Please complete: ${missing.join(", ")}.`);
      if (hasRequirement(selectedRole, 'continuous_history') && chronologyAnalysis.complete === false) {
        update('currentStep', 4);
      }
      return;
    }
    const next = {
      ...form,
      status: "Submitted" as const,
      submittedAt: new Date().toISOString(),
      currentStep: 9,
    };
    setSaving(true);
    try {
      const saved = await saveOfficialApplication(next);
      if (saved.id)
        await saveEqualOpportunities(saved.id, authenticatedUserId, equal);
      setForm(saved);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Submission failed.");
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return <SHCLoader variant="page" text="Restoring your application..." />;
  if (success)
    return (
      <div className="mx-auto my-8 max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <CheckCircle className="mx-auto h-14 w-14 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold">Application submitted</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your submission has been recorded as version {form.revision}. It is
          now read-only pending review.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-5 rounded-xl bg-purple-900 px-5 py-2.5 text-sm font-bold text-white"
          >
            Return to overview
          </button>
        )}
      </div>
    );

  const employers = form.employmentHistory;
  const refs = form.professionalReferences;
  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-fuchsia-200 bg-gradient-to-r from-purple-950 via-purple-900 to-fuchsia-800 p-5 text-white">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="rounded-xl bg-white p-2">
            <BrandedLogo layout="horizontal" size="sm" className="h-14 w-auto" />
          </div>
          <div className="md:text-right">
            <h2 className="text-xl font-black uppercase tracking-wide">
              Application for Employment
            </h2>
            <p className="text-xs text-purple-100">
              Official SHC digital application - version {form.revision}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-1.5 md:grid-cols-9">
          {labels.map((l, i) => (
            <button
              key={l}
              type="button"
              onClick={() => update("currentStep", i + 1)}
              className={`rounded-lg p-2 text-left ${form.currentStep === i + 1 ? "bg-white text-purple-950" : "bg-white/10 text-purple-100"}`}
            >
              <span className="block text-[9px] font-black">{i + 1}</span>
              <span className="hidden text-[9px] font-bold md:block">{l}</span>
            </button>
          ))}
        </div>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-5 py-3 text-xs">
        <span className="font-bold text-slate-700">
          {form.status}
          {lastSaved && ` - Last saved ${lastSaved}`}
        </span>
        <span className="text-slate-500">
          {saving ? "Saving draft..." : "Drafts save automatically"}
        </span>
      </div>
      {form.status === "Returned for Correction" && (
        <div className="m-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-black">Returned for correction</p>
          <p className="mt-1">{form.reviewerNotes || "Please review and correct the application before resubmitting."}</p>
        </div>
      )}
      {error && (
        <div className="m-5 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      <fieldset disabled={!canEdit || saving} className="p-5 md:p-7">
        <h3 className="mb-5 text-lg font-black text-purple-950">
          {form.currentStep}. {labels[form.currentStep - 1]}
        </h3>
        {form.currentStep === 1 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Application for the Position of">
              <select
                className={input}
                value={form.roleId || ""}
                onChange={async (e) => {
                  const role = templates.find(item => item.id === e.target.value);
                  if (!role) return;
                  try {
                    await onRoleChange?.(role);
                    setForm(previous => ({
                      ...previous,
                      roleId: role.id,
                      positionApplied: role.role
                    }));
                  } catch {
                    // The portal reports persistence failures and keeps the prior role.
                  }
                }}
                required
              >
                <option value="">Select a role</option>
                {roleOptions.map((role) => (
                  <option key={role.id || role.role} value={role.id}>{role.role}</option>
                ))}
              </select>
            </Field>
            <Field label="Vacancy Reference / Location">
              <Text
                value={form.vacancyReferenceLocation}
                onChange={(v) => update("vacancyReferenceLocation", v)}
              />
            </Field>
            <Field label="Source of Advertisement" wide>
              <Text
                value={form.sourceOfAdvertisement}
                onChange={(v) => update("sourceOfAdvertisement", v)}
              />
            </Field>
            <Field label="Title (Mr / Mrs / Miss / Ms / Dr / Other)">
              <Text value={form.title} onChange={(v) => update("title", v)} />
            </Field>
            <Field label="Forenames">
              <Text
                value={form.forenames}
                onChange={(v) => update("forenames", v)}
              />
            </Field>
            <Field label="Surname">
              <Text
                value={form.surname}
                onChange={(v) => update("surname", v)}
              />
            </Field>
            <Field label="Address" wide>
              <textarea
                className={input}
                rows={3}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
            <Field label="Postcode">
              <Text
                value={form.postcode}
                onChange={(v) => update("postcode", v.toUpperCase())}
              />
            </Field>
            <Field label="Telephone Number">
              <Text
                value={form.telephone}
                onChange={(v) => update("telephone", v)}
              />
            </Field>
            <Field label="Mobile Number">
              <Text value={form.mobile} onChange={(v) => update("mobile", v)} />
            </Field>
            <Field label="Personal Email Address">
              <Text
                type="email"
                value={form.personalEmail}
                onChange={(v) => update("personalEmail", v)}
              />
            </Field>
            <Field label="National Insurance Number">
              <Text
                value={form.nationalInsuranceNumber}
                onChange={(v) =>
                  update("nationalInsuranceNumber", v.toUpperCase())
                }
              />
            </Field>
            <Field label="Are you eligible to work in the UK?">
              <YesNo
                value={form.eligibleToWorkUk}
                onChange={(v) => update("eligibleToWorkUk", v)}
              />
            </Field>
          </div>
        )}
        {form.currentStep === 2 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {showNmcRegistration && (
              <>
                <div className="md:col-span-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs text-purple-900">
                  NMC registration is required by the configured requirements for <b>{selectedRole?.role}</b>.
                </div>
                <Field label={`NMC PIN${requireNmcPin ? " *" : ""}`}>
                  <Text value={form.nmcPin} onChange={(v) => update("nmcPin", v)} />
                </Field>
                {hasRequirement(selectedRole, 'nmc_registration_information') && (
                  <Field label="NMC registration / RNA *">
                    <Text value={form.rna} onChange={(v) => update("rna", v)} />
                  </Field>
                )}
                <Field label={`NMC Expiry Date${requireNmcExpiry ? " *" : ""}`}>
                  <Text type="date" value={form.nmcExpiryDate} onChange={(v) => update("nmcExpiryDate", v)} />
                </Field>
              </>
            )}
            <Field label="Right to Work">
              <Text
                value={form.rightToWork}
                onChange={(v) => update("rightToWork", v)}
              />
            </Field>
            <Field label="Enhanced DBS">
              <Text
                value={form.enhancedDbs}
                onChange={(v) => update("enhancedDbs", v)}
              />
            </Field>
            <Field label="DBS Issue Date">
              <Text
                type="date"
                value={form.dbsIssueDate}
                onChange={(v) => update("dbsIssueDate", v)}
              />
            </Field>
          </div>
        )}
        {form.currentStep === 3 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Employer Name and Address" wide>
              <textarea
                className={input}
                rows={3}
                value={form.recentEmployerNameAddress}
                onChange={(e) =>
                  update("recentEmployerNameAddress", e.target.value)
                }
              />
            </Field>
            {[
              ["Postcode", "recentEmployerPostcode"],
              ["Telephone Number", "recentEmployerTelephone"],
              ["Date Employed From", "recentEmployerDateFrom"],
              ["Date Employed To", "recentEmployerDateTo"],
              ["Position Title", "recentEmployerPositionTitle"],
              ["Salary", "recentEmployerSalary"],
              ["Notice Period", "recentEmployerNoticePeriod"],
            ].map(([l, k]) => (
              <Field key={k} label={l}>
                <Text
                  type={k.includes("Date") ? "date" : "text"}
                  value={(form as any)[k]}
                  onChange={(v) => update(k as any, v)}
                />
              </Field>
            ))}
            <Field label="Primary Responsibilities" wide>
              <textarea
                className={input}
                rows={4}
                value={form.recentEmployerPrimaryResponsibilities}
                onChange={(e) =>
                  update(
                    "recentEmployerPrimaryResponsibilities",
                    e.target.value,
                  )
                }
              />
            </Field>
            <Field label="Reason for Leaving" wide>
              <textarea
                className={input}
                rows={3}
                value={form.recentEmployerReasonForLeaving}
                onChange={(e) =>
                  update("recentEmployerReasonForLeaving", e.target.value)
                }
              />
            </Field>
          </div>
        )}
        {form.currentStep === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-950">
              <h4 className="font-black">Complete history from secondary school to the present</h4>
              <p className="mt-1 text-xs leading-5 text-purple-800">
                Include education, employment and every other activity. Overlapping study and work are allowed. Your present or most recent employer from step 3 is included automatically.
              </p>
            </div>

            {!chronologyAnalysis.hasSecondaryEducation && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">
                Please add your secondary/high-school history so SHC has a complete chronology.
              </div>
            )}

            {chronologyAnalysis.dateIssues.map(issue => (
              <div key={`${issue.entryId}-${issue.message}`} role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-900">
                {issue.message}
              </div>
            ))}

            {employers.map((entry, i) => {
              const showOrganisation = ['secondary_education', 'higher_education', 'vocational_training', 'employment'].includes(entry.type);
              return (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold text-fuchsia-800">
                    {chronologyTypeLabels[entry.type]}
                  </h4>
                  <button
                    type="button"
                    onClick={() => update("employmentHistory", employers.filter((_, x) => x !== i))}
                    className="text-rose-600"
                    aria-label={`Remove ${chronologyTypeLabels[entry.type]} entry`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Entry type">
                    <select
                      className={input}
                      value={entry.type}
                      onChange={(event) => {
                        const next = [...employers];
                        next[i] = { ...entry, type: event.target.value as ChronologyEntryType };
                        update('employmentHistory', next);
                      }}
                    >
                      {Object.entries(chronologyTypeLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </select>
                  </Field>
                  {showOrganisation && <Field label={entry.type === 'employment' ? 'Employer / organisation' : 'Institution / organisation'}>
                    <Text value={entry.organisation} onChange={(value) => {
                      const next = [...employers]; next[i] = { ...entry, organisation: value }; update('employmentHistory', next);
                    }} />
                  </Field>}
                  {showOrganisation && <Field label={entry.type === 'employment' ? 'Role / position' : 'Course / qualification'}>
                    <Text value={entry.title} onChange={(value) => {
                      const next = [...employers]; next[i] = { ...entry, title: value }; update('employmentHistory', next);
                    }} />
                  </Field>}
                  <Field label="Start month">
                    <Text type="month" value={entry.startMonth} onChange={(value) => {
                      const next = [...employers]; next[i] = { ...entry, startMonth: value }; update('employmentHistory', next);
                    }} />
                  </Field>
                  <Field label="End month">
                    <Text type="month" value={entry.endMonth} onChange={(value) => {
                      const next = [...employers]; next[i] = { ...entry, endMonth: value, isCurrent: false }; update('employmentHistory', next);
                    }} />
                  </Field>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input type="checkbox" checked={entry.isCurrent} onChange={(event) => {
                      const next = [...employers]; next[i] = { ...entry, isCurrent: event.target.checked, endMonth: event.target.checked ? '' : entry.endMonth }; update('employmentHistory', next);
                    }} />
                    This activity continues to the present
                  </label>
                  <Field label="Location (optional)">
                    <Text value={entry.location} onChange={(value) => {
                      const next = [...employers]; next[i] = { ...entry, location: value }; update('employmentHistory', next);
                    }} />
                  </Field>
                  <Field label={entry.type === 'other' ? 'Explanation *' : 'Details (optional)'} wide>
                    <textarea className={input} rows={2} value={entry.details} onChange={(event) => {
                      const next = [...employers]; next[i] = { ...entry, details: event.target.value }; update('employmentHistory', next);
                    }} />
                  </Field>
                  {entry.type === 'employment' && <Field label="Reason for leaving (where applicable)" wide>
                    <textarea className={input} rows={2} value={entry.reasonForLeaving} onChange={(event) => {
                      const next = [...employers]; next[i] = { ...entry, reasonForLeaving: event.target.value }; update('employmentHistory', next);
                    }} />
                  </Field>}
                </div>
              </div>
            )})}
            <button
              type="button"
              onClick={() => update("employmentHistory", [
                ...employers,
                emptyChronologyEntry(chronologyAnalysis.hasSecondaryEducation ? 'employment' : 'secondary_education'),
              ])}
              className="flex items-center gap-2 rounded-xl border border-purple-300 px-4 py-2 text-sm font-bold text-purple-900"
            >
              <Plus className="h-4 w-4" />
              Add history entry
            </button>

            {chronologyAnalysis.gaps.length > 0 && (
              <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <h4 className="font-black text-amber-950">Unexplained periods</h4>
                {chronologyAnalysis.gaps.map(gap => (
                  <div key={`${gap.startMonth}-${gap.endMonth}`} className="rounded-xl border border-amber-200 bg-white p-3">
                    <p className="text-xs font-bold text-amber-950">
                      We found an unexplained period between {formatHistoryMonth(gap.startMonth)} and {formatHistoryMonth(gap.endMonth)} ({gap.durationMonths} month{gap.durationMonths === 1 ? '' : 's'}).
                    </p>
                    <button type="button" onClick={() => {
                      setGapToExplain({ startMonth: gap.startMonth, endMonth: gap.endMonth });
                      setGapType('unemployment');
                      setGapDetails('');
                      setGapOrganisation('');
                      setGapTitle('');
                    }} className="mt-2 text-xs font-black text-purple-800 underline">
                      Explain this gap
                    </button>
                  </div>
                ))}
              </section>
            )}

            {gapToExplain && (
              <section className="rounded-2xl border border-purple-300 bg-white p-4 shadow-sm">
                <h4 className="font-black text-purple-950">Explain {formatHistoryMonth(gapToExplain.startMonth)} to {formatHistoryMonth(gapToExplain.endMonth)}</h4>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Field label="What were you doing?">
                    <select className={input} value={gapType} onChange={(event) => setGapType(event.target.value as ChronologyEntryType)}>
                      {(['unemployment','caring_responsibilities','vocational_training','illness','travel','career_break','other'] as ChronologyEntryType[])
                        .map(type => <option key={type} value={type}>{chronologyTypeLabels[type]}</option>)}
                    </select>
                  </Field>
                  <Field label={gapType === 'other' ? 'Explanation *' : 'Additional details (optional)'}>
                    <Text value={gapDetails} onChange={setGapDetails} />
                  </Field>
                  {gapType === 'vocational_training' && <>
                    <Field label="Institution / organisation *">
                      <Text value={gapOrganisation} onChange={setGapOrganisation} />
                    </Field>
                    <Field label="Course / qualification *">
                      <Text value={gapTitle} onChange={setGapTitle} />
                    </Field>
                  </>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={
                    (gapType === 'other' && !gapDetails.trim())
                    || (gapType === 'vocational_training' && (!gapOrganisation.trim() || !gapTitle.trim()))
                  } onClick={() => {
                    const explanation = {
                      ...emptyChronologyEntry(gapType),
                      startMonth: gapToExplain.startMonth,
                      endMonth: gapToExplain.endMonth,
                      organisation: gapOrganisation.trim(),
                      title: gapTitle.trim(),
                      details: gapDetails.trim(),
                    };
                    update('employmentHistory', [...employers, explanation]);
                    setGapToExplain(null);
                    setGapDetails('');
                    setGapOrganisation('');
                    setGapTitle('');
                  }} className="rounded-lg bg-purple-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                    Add explanation
                  </button>
                  <button type="button" onClick={() => setGapToExplain(null)} className="rounded-lg border px-4 py-2 text-xs font-bold">Cancel</button>
                </div>
              </section>
            )}

            {chronologyAnalysis.complete && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
                Your chronology is continuous from high school to the present.
              </div>
            )}
          </div>
        )}
        {form.currentStep === 5 && (
          <div className="space-y-4">
            {refs.slice(0, 2).map((ref, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <h4 className="mb-3 font-bold text-fuchsia-800">
                  Professional Referee {i + 1}
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.entries({
                    fullName: "Full Name",
                    position: "Position",
                    organisation: "Organisation",
                    relationshipToApplicant: "Relationship to Applicant",
                    telephone: "Telephone Number",
                    email: "Email Address",
                  }).map(([k, l]) => (
                    <Field key={k} label={l}>
                      <Text
                        type={k === "email" ? "email" : "text"}
                        value={(ref as any)[k]}
                        onChange={(v) => {
                          const a = [...refs];
                          a[i] = { ...ref, [k]: v };
                          update("professionalReferences", a);
                        }}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
            <label className="flex items-start gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm font-bold text-purple-950">
              <input
                type="checkbox"
                checked={form.refereesAgreedToContact}
                onChange={(e) =>
                  update("refereesAgreedToContact", e.target.checked)
                }
                className="mt-1"
              />
              I confirm that the referees listed above have agreed to be
              contacted.
            </label>
          </div>
        )}
        {form.currentStep === 6 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <b>Confidential monitoring information.</b> This is stored
              separately and is not shown in ordinary applicant assessment
              screens.
            </div>
            {[
              ["vacancyReferenceNumber", "Vacancy Reference Number"],
              ["genderIdentification", "Gender Identification"],
              ["ageBand", "Age Band"],
              ["disabilityDeclaration", "Disability"],
              ["ethnicOrigin", "Ethnic Origin"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                {k === "vacancyReferenceNumber" ? (
                  <Text
                    value={(equal as any)[k]}
                    onChange={(v) => setEqual((p) => ({ ...p, [k]: v }))}
                  />
                ) : (
                  <select
                    className={input}
                    value={(equal as any)[k]}
                    onChange={(e) =>
                      setEqual((p) => ({ ...p, [k]: e.target.value }))
                    }
                  >
                    <option value="">Prefer not to say / Select</option>
                    {(k === "genderIdentification"
                      ? ["Male", "Female", "Non-binary", "Prefer not to say"]
                      : k === "ageBand"
                        ? [
                            "16-18",
                            "19-21",
                            "22-40",
                            "41-65",
                            "65+",
                            "Prefer not to say",
                          ]
                        : k === "disabilityDeclaration"
                          ? ["Yes", "No", "Prefer not to say"]
                          : [
                              "White - British",
                              "White - Irish",
                              "Other White Background",
                              "Asian or Asian British - Indian",
                              "Asian or Asian British - Pakistani",
                              "Asian or Asian British - Bangladeshi",
                              "Asian or Asian British - Chinese",
                              "Other Asian",
                              "Black or Black British - African",
                              "Black or Black British - Caribbean",
                              "Other Black",
                              "Mixed - White & Black Caribbean",
                              "Mixed - White & Black African",
                              "Mixed - White & Asian",
                              "Other Mixed",
                              "Other Ethnic Group",
                            ]
                    ).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                )}
              </Field>
            ))}
          </div>
        )}
        {form.currentStep === 7 && (
          <Field label="Please use this section to explain why you are applying for this position, how it fits with your career development, your ability to perform the job, and what you can contribute to the organisation.">
            <textarea
              className={input}
              rows={14}
              value={form.personalStatement}
              onChange={(e) => update("personalStatement", e.target.value)}
            />
          </Field>
        )}
        {form.currentStep === 8 && (
          <div className="space-y-6">
            <Field label="Do you know any member of staff or service users connected with Steward Health Care 247 Professionals?">
              <YesNo
                value={form.knowsConnectedPerson}
                onChange={(v) => update("knowsConnectedPerson", v)}
              />
            </Field>
            {form.knowsConnectedPerson && (
              <Field label="If Yes, please provide details">
                <textarea
                  className={input}
                  rows={3}
                  value={form.connectedPersonDetails}
                  onChange={(e) =>
                    update("connectedPersonDetails", e.target.value)
                  }
                />
              </Field>
            )}
            <Field label="Do you have any convictions, cautions, reprimands or warnings that are not protected under DBS filtering rules?">
              <YesNo
                value={form.hasUnprotectedCriminalRecord}
                onChange={(v) => update("hasUnprotectedCriminalRecord", v)}
              />
            </Field>
            {form.hasUnprotectedCriminalRecord && (
              <Field label="If Yes, please provide details">
                <textarea
                  className={input}
                  rows={4}
                  value={form.criminalRecordDetails}
                  onChange={(e) =>
                    update("criminalRecordDetails", e.target.value)
                  }
                />
              </Field>
            )}
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              This post is exempt from the Rehabilitation of Offenders Act 1974.
              Applicants are therefore not entitled to withhold information
              about convictions which for other purposes are “spent” under the
              provisions of the Act.
            </p>
          </div>
        )}
        {form.currentStep === 9 && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-slate-800">
              {[
                [
                  "declarationConfirmed",
                  "I confirm that the information given in this application is true and complete. I understand that any false information or omission may disqualify me from employment or result in my dismissal.",
                ],
                [
                  "referencesAndChecksAuthorised",
                  "I authorise Steward Health Care 247 Professionals to obtain references and carry out any necessary checks to process my application for employment.",
                ],
                [
                  "satisfactoryChecksAcknowledged",
                  "I understand that any offer of employment is subject to satisfactory references, Right to Work documentation, DBS clearance and other compliance requirements.",
                ],
                [
                  "dataProtectionConsent",
                  "The information I provide will be processed in accordance with data protection legislation. I consent to processing for recruitment and employment.",
                ],
              ].map(([k, l]) => (
                <label key={k} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean((form as any)[k])}
                    onChange={(e) => update(k as any, e.target.checked)}
                    className="mt-1"
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Signature method">
                <select
                  className={input}
                  value={form.signatureType}
                  onChange={(e) =>
                    update("signatureType", e.target.value as any)
                  }
                >
                  <option value="typed">Typed electronic signature</option>
                  <option value="drawn">Draw signature</option>
                </select>
              </Field>
              <Field label="Signature">
                {form.signatureType === "typed" ? <Text value={form.signatureValue} onChange={(v) => update("signatureValue", v)} placeholder="Type your full legal name" /> : <SignaturePad value={form.signatureValue} onChange={(v) => update("signatureValue", v)} />}
              </Field>
              <Field label="Print Name">
                <Text
                  value={form.printedName}
                  onChange={(v) => update("printedName", v)}
                />
              </Field>
              <Field label="Date">
                <Text
                  type="date"
                  value={form.signatureDate}
                  onChange={(v) => update("signatureDate", v)}
                />
              </Field>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 text-sm">
              <b>Review before submit:</b> Position{" "}
              {form.positionApplied || "not supplied"}; applicant{" "}
              {form.forenames} {form.surname}; status {form.status}; version{" "}
              {form.revision}.
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row">
          <button
            type="button"
            disabled={form.currentStep === 1}
            onClick={() =>
              update("currentStep", Math.max(1, form.currentStep - 1))
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => persist()}
              disabled={!canEdit || saving}
              className="flex items-center justify-center gap-2 rounded-xl border border-purple-300 px-4 py-2.5 text-sm font-bold text-purple-900"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            {form.currentStep < 9 ? (
              <button
                type="button"
                onClick={() =>
                  update("currentStep", Math.min(9, form.currentStep + 1))
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-purple-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                Save and Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canEdit || saving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white"
              >
                Submit Official Application
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
