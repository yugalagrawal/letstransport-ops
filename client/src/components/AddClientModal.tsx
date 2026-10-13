import { useEffect, useRef, useState } from 'react';
import { lookupZone, GEO_ZONES } from '../pages/OPMApprovals';
// GEO_ZONES imported for type inference only; lookupZone does the work
void GEO_ZONES;

/* ─── Types ─── */
interface Group       { id: string; name: string; }
interface LegalEntity { id: string; groupId: string; name: string; pan: string; }
interface Vertical    { id: string; leId: string; name: string; }
interface StateGstin  { id: string; leId: string; verticalId: string; state: string; gstin: string; }
interface City        { id: string; stateGstinId: string; name: string; }

interface NewGroup { name: string; industryType: string; }
interface NewLegalEntity { name: string; pan: string; orgType: string; address: string; }
interface NewVertical {
  name: string;           // assembled final name (stored in draft)
  tripMode: string;       // Local | Upcountry (for commercial margin calc)
  isCFA?: boolean;        // standard vs CFA format
  verticalPart?: string;  // vertical name (standard) or CFA company name — no spaces/underscores
  leg?: string;           // FM | MM | SH | LH | LM | '0' | ''
  projectName?: string;   // optional, standard-only, no spaces/underscores
}
interface NewStateGstin  { state: string; gstin: string; billingAddress: string; isDummy: boolean; }
interface NewCity {
  lat?: string;
  lng?: string;
  subArea?: string;
  area?: string;
  city: string;
  hubName: string;
  hubAddress: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}
interface POCContact     { name: string; email: string; phone: string; }
interface NewPOC {
  finance:       POCContact;
  financeAlt:    POCContact | null;
  operations:    POCContact | null;
  operationsAlt: POCContact | null;
}
interface CommercialFileMeta {
  id: string; name: string; size: string; category: 'commercial' | 'approval';
}

interface NewCommercial {
  name: string;
  businessType: string;
  contractStartDate: string;
  contractEndDate: string;
  marginPct: string;
  billingDays: string;
  creditDays: string;
  invoiceFrequency: string;
  remarks: string;
  files?: CommercialFileMeta[];
}

export interface Draft {
  id: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  currentStep: number;
  steps: Record<string, Record<string, string>>;
  salesAdminStatus?: 'Pending' | 'Approved' | 'Correction Required' | null;
  salesAdminSubmittedAt?: string;
  salesAdminComment?: string;
  bizFinStatus?: 'Pending' | 'Approved' | 'Correction Required' | null;
  bizFinSubmittedAt?: string;
  bizFinComment?: string;
  opmStatus?: string | null;
  opmSubmittedAt?: string;
  opmComment?: string;
  opmApprovedAt?: string;
}

interface FormState {
  draftId:           string | null;
  groupId:           string | null;
  groupDisplayName:  string;
  newGroup:          NewGroup | null;
  leId:              string | null;
  leDisplayName:     string;
  newLE:        NewLegalEntity | null;
  verticalId:          string | null;
  verticalDisplayName: string;
  newVertical:         NewVertical | null;
  stateGstinId:          string | null;
  stateGstinDisplayName: string;
  newStateGstin:   NewStateGstin | null;
  newPOC:          NewPOC | null;
  cityId:          string | null;
  cityDisplayName: string;
  newCity:         NewCity | null;
  newCommercial:   NewCommercial | null;
}

function getCreatedBy(): string {
  try { return JSON.parse(localStorage.getItem('lt_ops_user') || '{}').email || 'unknown'; }
  catch { return 'unknown'; }
}

function buildStepData(step: number, form: FormState): Record<string, unknown> {
  switch (step) {
    case 0: return form.groupId
      ? { group: { id: form.groupId, name: form.groupDisplayName, mode: 'existing' } }
      : { group: { ...form.newGroup, mode: 'new' } };
    case 1: return form.leId
      ? { legalEntity: { id: form.leId, name: form.leDisplayName, mode: 'existing' } }
      : { legalEntity: { ...form.newLE, mode: 'new' } };
    case 2: return form.verticalId
      ? { vertical: { id: form.verticalId, name: form.verticalDisplayName, mode: 'existing' } }
      : { vertical: { ...form.newVertical, mode: 'new' } };
    case 3: return form.stateGstinId
      ? { stateGstin: { id: form.stateGstinId, name: form.stateGstinDisplayName, mode: 'existing' } }
      : { stateGstin: { ...form.newStateGstin, mode: 'new' } };
    case 4: return { poc: {
      financeName:       form.newPOC?.finance.name    ?? '',
      financeEmail:      form.newPOC?.finance.email   ?? '',
      financePhone:      form.newPOC?.finance.phone   ?? '',
      financeAltName:    form.newPOC?.financeAlt?.name    ?? '',
      financeAltEmail:   form.newPOC?.financeAlt?.email   ?? '',
      financeAltPhone:   form.newPOC?.financeAlt?.phone   ?? '',
      opsName:           form.newPOC?.operations?.name  ?? '',
      opsEmail:          form.newPOC?.operations?.email ?? '',
      opsPhone:          form.newPOC?.operations?.phone ?? '',
      opsAltName:        form.newPOC?.operationsAlt?.name  ?? '',
      opsAltEmail:       form.newPOC?.operationsAlt?.email ?? '',
      opsAltPhone:       form.newPOC?.operationsAlt?.phone ?? '',
    }};
    case 5: return form.cityId
      ? { city: { id: form.cityId, name: form.cityDisplayName, mode: 'existing' } }
      : { city: { ...form.newCity, mode: 'new' } };
    case 6: return { commercial: { ...(form.newCommercial ?? {}) } };
    default: return {};
  }
}

const STEPS = [
  { id: 'group',        label: 'Group'        },
  { id: 'legal-entity', label: 'Legal Entity' },
  { id: 'vertical',     label: 'Vertical'     },
  { id: 'state-gstin',  label: 'State GSTIN'  },
  { id: 'poc',          label: 'POC'          },
  { id: 'city',         label: 'City'         },
  { id: 'commercial',   label: 'Commercial'   },
];

/* ─── Main modal ─── */
export default function AddClientModal({ onClose, initialDraft }: { onClose: () => void; initialDraft?: Draft }) {
  const [current, setCurrent] = useState<number>(() => {
    if (!initialDraft) return 0;
    return Math.min(initialDraft.currentStep + 1, STEPS.length - 1);
  });
  const [completed, setCompleted] = useState<Set<number>>(() => {
    if (!initialDraft) return new Set<number>();
    return new Set(Array.from({ length: initialDraft.currentStep + 1 }, (_, i) => i));
  });
  const [form, setForm] = useState<FormState>(() => {
    if (!initialDraft) return { draftId: null, groupId: null, groupDisplayName: '', newGroup: null, leId: null, leDisplayName: '', newLE: null, verticalId: null, verticalDisplayName: '', newVertical: null, stateGstinId: null, stateGstinDisplayName: '', newStateGstin: null, newPOC: null, cityId: null, cityDisplayName: '', newCity: null, newCommercial: null };
    const s = initialDraft.steps;
    return {
      draftId:          initialDraft.id,
      groupId:          s.group?.mode === 'existing' ? s.group.id : null,
      groupDisplayName: s.group?.mode === 'new' ? (s.group.name ?? '') : '',
      newGroup:         s.group?.mode === 'new' ? { name: s.group.name, industryType: s.group.industryType } : null,
      leId:           s.legalEntity?.mode === 'existing' ? s.legalEntity.id : null,
      leDisplayName:  s.legalEntity?.mode === 'existing' ? (s.legalEntity.name ?? '') : '',
      newLE:          s.legalEntity?.mode === 'new' ? { name: s.legalEntity.name ?? '', pan: s.legalEntity.pan ?? '', orgType: s.legalEntity.orgType ?? '', address: s.legalEntity.address ?? '' } : null,
      verticalId:          s.vertical?.mode === 'existing' ? s.vertical.id : null,
      verticalDisplayName: s.vertical?.mode === 'existing' ? (s.vertical.name ?? '') : '',
      newVertical:  s.vertical?.mode === 'new' ? {
        name:         s.vertical.name         ?? '',
        tripMode:     s.vertical.tripMode     ?? '',
        isCFA:        s.vertical.isCFA        === 'true',
        verticalPart: s.vertical.verticalPart ?? '',
        leg:          s.vertical.leg          ?? '',
        projectName:  s.vertical.projectName  ?? '',
      } : null,
      stateGstinId:          s.stateGstin?.mode === 'existing' ? s.stateGstin.id : null,
      stateGstinDisplayName: s.stateGstin?.mode === 'existing' ? (s.stateGstin.name ?? '') : '',
      newStateGstin:         s.stateGstin?.mode === 'new' ? { state: s.stateGstin.state ?? '', gstin: s.stateGstin.gstin ?? '', billingAddress: s.stateGstin.billingAddress ?? '', isDummy: s.stateGstin.isDummy === 'true' } : null,
      newPOC: s.poc?.financeName ? {
        finance:       { name: s.poc.financeName ?? '', email: s.poc.financeEmail ?? '', phone: s.poc.financePhone ?? '' },
        financeAlt:    s.poc.financeAltName ? { name: s.poc.financeAltName, email: s.poc.financeAltEmail ?? '', phone: s.poc.financeAltPhone ?? '' } : null,
        operations:    { name: s.poc.opsName ?? '', email: s.poc.opsEmail ?? '', phone: s.poc.opsPhone ?? '' },
        operationsAlt: s.poc.opsAltName     ? { name: s.poc.opsAltName,     email: s.poc.opsAltEmail     ?? '', phone: s.poc.opsAltPhone     ?? '' } : null,
      } : null,
      cityId:          s.city?.mode === 'existing' ? s.city.id : null,
      cityDisplayName: s.city?.mode === 'existing' ? (s.city.name ?? '') : '',
      newCity:  s.city?.mode === 'new' ? { city: s.city.city ?? '', hubName: s.city.hubName ?? '', hubAddress: s.city.hubAddress ?? '', contactName: s.city.contactName ?? '', contactEmail: s.city.contactEmail ?? '', contactPhone: s.city.contactPhone ?? '', lat: s.city.lat ?? '', lng: s.city.lng ?? '', subArea: s.city.subArea ?? '', area: s.city.area ?? '' } : null,
      newCommercial: s.commercial?.name ? {
        name: s.commercial.name ?? '',
        businessType: s.commercial.businessType ?? '',
        contractStartDate: s.commercial.contractStartDate ?? '',
        contractEndDate: s.commercial.contractEndDate ?? '',
        marginPct: s.commercial.marginPct ?? '',
        billingDays: s.commercial.billingDays ?? '',
        creditDays: s.commercial.creditDays ?? '',
        invoiceFrequency: s.commercial.invoiceFrequency ?? '',
        remarks: s.commercial.remarks ?? '',
      } : null,
    };
  });
  const [saving, setSaving]       = useState(false);
  const [lockedSteps, setLockedSteps] = useState<Set<number>>(() => {
    const s = new Set<number>();
    const sa = initialDraft?.salesAdminStatus;
    // Lock all steps when pending/approved — Correction Required means it was sent back for editing
    if (sa === 'Pending' || sa === 'Approved') {
      [0, 1, 2, 3, 4, 5, 6].forEach((i) => s.add(i));
    }
    return s;
  });
  interface ApprovalConfirm { step: number; admin: string; stepsToLock: number[]; note: string; }
  const [approvalConfirm, setApprovalConfirm] = useState<ApprovalConfirm | null>(null);
  const [commercialFileStats, setCommercialFileStats] = useState({ commercialCount: 0, approvalCount: 0 });

  function canProceed() {
    switch (current) {
      case 0: return !!form.groupId || !!(form.newGroup?.name && form.newGroup?.industryType);
      case 1: return !!form.leId || !!(form.newLE?.name && form.newLE?.address && form.newLE?.pan && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.newLE.pan));
      case 2: {
        if (form.verticalId) return true;
        const v = form.newVertical;
        if (!v?.tripMode) return false;
        if (!['FM', 'MM', 'SH', 'LH', 'LM', '0'].includes(v.leg ?? '')) return false;
        if (v.isCFA && !v.verticalPart?.trim()) return false;
        return true;
      }
      case 3: {
        if (form.stateGstinId) return true;
        const sg = form.newStateGstin;
        if (!sg?.state || !sg?.billingAddress) return false;
        if (!sg.gstin || sg.gstin.length !== 15) return false;
        return !gstinValidationError(sg.gstin, sg.state, sg.isDummy ? null : (form.newLE?.pan ?? null));
      }
      case 4: {
        const poc = form.newPOC;
        if (!poc) return false;
        const { name, email, phone } = poc.finance;
        if (!name || !EMAIL_RE.test(email) || !phone) return false;
        if (poc.financeAlt) {
          const a = poc.financeAlt;
          if (!a.name || !EMAIL_RE.test(a.email) || !a.phone) return false;
        }
        // Operations is mandatory
        if (!poc.operations) return false;
        const o = poc.operations;
        if (!o.name || !EMAIL_RE.test(o.email) || !o.phone) return false;
        if (poc.operationsAlt) {
          const oa = poc.operationsAlt;
          if (!oa.name || !EMAIL_RE.test(oa.email) || !oa.phone) return false;
        }
        return true;
      }
      case 5: {
        if (form.cityId) return true;
        const c = form.newCity;
        return !!(c?.city && c?.hubName && c?.hubAddress && c?.contactName && c?.contactPhone && c?.contactEmail && EMAIL_RE.test(c.contactEmail));
      }
      case 6: {
        const c = form.newCommercial;
        if (!c?.name || !c?.businessType || !c?.contractStartDate || !c?.contractEndDate || !c?.marginPct) return false;
        // Attach Commercial is always mandatory
        if (commercialFileStats.commercialCount === 0) return false;
        // Attach Client Approval Files is mandatory when approval is needed
        const pctNum   = parseFloat(c.marginPct);
        const tm       = form.newVertical?.tripMode ?? '';
        const marginNeeds  = !isNaN(pctNum) && marginApprovalLabel(pctNum, tm).label !== 'Auto approved';
        const billNum  = parseInt(c.billingDays || '0');
        const credNum  = parseInt(c.creditDays  || '0');
        const creditNeeds  = !!(c.billingDays || c.creditDays) &&
          creditApprovalLabel(billNum, credNum).label !== '' &&
          creditApprovalLabel(billNum, credNum).label !== 'Auto approved';
        if ((marginNeeds || creditNeeds) && commercialFileStats.approvalCount === 0) return false;
        return true;
      }
      default: return true;
    }
  }

  async function doSave(step: number, extraFields: Record<string, unknown> = {}) {
    setSaving(true);
    try {
      const stepData = buildStepData(step, form);
      // Persist commercial file metadata at draft root level when saving step 6
      const allExtra = step === 6
        ? { ...extraFields, commercialFiles: form.newCommercial?.files ?? [] }
        : extraFields;
      if (!form.draftId) {
        const res  = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ createdBy: getCreatedBy(), currentStep: step, steps: stepData, ...allExtra }),
        });
        const draft = await res.json();
        setForm((f) => ({ ...f, draftId: draft.id }));
      } else {
        await fetch(`/api/drafts/${form.draftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStep: step, steps: stepData, ...allExtra }),
        });
      }
      setCompleted((p) => new Set(p).add(step));
      if (step < STEPS.length - 1) setCurrent(step + 1);
      else onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (saving) return;
    // Locked step — just navigate forward without saving
    if (lockedSteps.has(current)) {
      if (current < STEPS.length - 1) setCurrent((c) => c + 1);
      return;
    }
    if (!canProceed()) return;
    // Approval gate only at final step (Commercial)
    if (current === 6 && !lockedSteps.has(6)) {
      setApprovalConfirm({
        step: 6,
        admin: 'COB Admin',
        stepsToLock: [0, 1, 2, 3, 4, 5, 6],
        note: 'All details will be submitted to COB Admin for approval. All steps will be locked and cannot be edited until reviewed.',
      });
      return;
    }
    await doSave(current);
  }

  async function handleApprovalConfirm() {
    if (!approvalConfirm) return;
    const { step, stepsToLock } = approvalConfirm;
    setLockedSteps((prev) => { const next = new Set(prev); stepsToLock.forEach((s) => next.add(s)); return next; });
    setApprovalConfirm(null);
    await doSave(step, { salesAdminStatus: 'Pending', salesAdminSubmittedAt: new Date().toISOString() });
  }

  function handleBack() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function handleStepClick(idx: number) {
    if (idx < current || completed.has(idx) || lockedSteps.has(idx)) setCurrent(idx);
  }

  function getLockedAdmin(_idx: number): string {
    return 'COB Admin';
  }

  /* Reset downstream selections when a parent changes */
  function setGroup(id: string, name = '') {
    setForm((f) => ({ ...f, groupId: id, groupDisplayName: name, newGroup: null, leId: null, verticalId: null, stateGstinId: null, cityId: null }));
  }
  function setNewGroup(data: NewGroup | null) {
    setForm((f) => ({ ...f, groupId: null, groupDisplayName: data?.name ?? '', newGroup: data }));
  }
  function setLE(id: string, name = '') {
    setForm((f) => ({ ...f, leId: id, leDisplayName: name, newLE: null, verticalId: null, stateGstinId: null, cityId: null }));
  }
  function setNewLE(data: NewLegalEntity | null) {
    setForm((f) => ({ ...f, leId: null, leDisplayName: '', newLE: data }));
  }
  function setVertical(id: string, name = '') {
    setForm((f) => ({ ...f, verticalId: id, verticalDisplayName: name, newVertical: null, stateGstinId: null, cityId: null }));
  }
  function setNewVertical(data: NewVertical | null) {
    setForm((f) => ({ ...f, verticalId: null, verticalDisplayName: '', newVertical: data }));
  }
  function setStateGstin(id: string, name = '') {
    setForm((f) => ({ ...f, stateGstinId: id, stateGstinDisplayName: name, newStateGstin: null, cityId: null }));
  }
  function setNewStateGstin(data: NewStateGstin | null) {
    setForm((f) => ({ ...f, stateGstinId: null, stateGstinDisplayName: '', newStateGstin: data }));
  }
  function setNewPOC(data: NewPOC | null) {
    setForm((f) => ({ ...f, newPOC: data }));
  }
  function setCity(id: string, name = '') {
    setForm((f) => ({ ...f, cityId: id, cityDisplayName: name, newCity: null }));
  }
  function setNewCity(data: NewCity | null) {
    setForm((f) => ({ ...f, cityId: null, cityDisplayName: '', newCity: data }));
  }
  function setNewCommercial(data: NewCommercial | null) {
    setForm((f) => ({ ...f, newCommercial: data }));
  }

  const isLast = current === STEPS.length - 1;

  /* Breadcrumb context line — shows immediate parent for the current step */
  const stepContextLine: string | null = (() => {
    const gName = form.newGroup?.name    ?? '';
    const lName = form.newLE?.name       ?? '';
    const vName = form.newVertical?.name ?? '';
    const tMode = form.newVertical?.tripMode ?? '';
    switch (current) {
      case 1: return gName ? `Group: ${gName}` : null;
      case 2: return lName ? `Legal Entity: ${lName}` : null;
      case 3: return lName ? `Legal Entity: ${lName}` : null;
      case 4: return vName ? `Vertical: ${vName}` : null;
      case 5: return vName ? `Vertical: ${vName}` : null;
      case 6: return vName ? `Vertical: ${vName}${tMode ? ` (${tMode})` : ''}` : null;
      default: return null;
    }
  })();

  const stepContent: Record<string, React.ReactNode> = {
    'group':        <GroupStep        selected={form.groupId}  onSelect={setGroup}  newGroup={form.newGroup}  onNewGroup={setNewGroup}  locked={lockedSteps.has(0)} />,
    'legal-entity': <LegalEntityStep  groupId={form.groupId}  hasGroup={!!(form.groupId || form.newGroup)}  selected={form.leId}  onSelect={setLE}  newLE={form.newLE}  onNewLE={setNewLE}  locked={lockedSteps.has(1)}  displayName={form.leDisplayName} />,
    'vertical':     <VerticalStep     leId={form.leId}  hasLE={!!(form.leId || form.newLE)}  selected={form.verticalId}  onSelect={setVertical}  newVertical={form.newVertical}  onNewVertical={setNewVertical}  locked={lockedSteps.has(2)}  groupName={form.groupDisplayName} />,
    'state-gstin':  <StateGstinStep   leId={form.leId}  hasVertical={!!(form.verticalId || form.newVertical)}  verticalId={form.verticalId}  selected={form.stateGstinId}  onSelect={setStateGstin}  newStateGstin={form.newStateGstin}  onNewStateGstin={setNewStateGstin}  lePAN={form.newLE?.pan ?? null}  locked={lockedSteps.has(3)}  displayName={form.stateGstinDisplayName} />,
    'poc':          <PocStep newPOC={form.newPOC} onNewPOC={setNewPOC} />,
    'city':         <CityStep         stateGstinId={form.stateGstinId}  hasStateGstin={!!(form.stateGstinId || form.newStateGstin)}  selected={form.cityId}  onSelect={setCity}  newCity={form.newCity}  onNewCity={setNewCity}  locked={lockedSteps.has(5)}  displayName={form.cityDisplayName} />,
    'commercial':   <CommercialStep newCommercial={form.newCommercial} onNewCommercial={setNewCommercial} verticalName={form.newVertical?.name ?? form.verticalDisplayName} tripMode={form.newVertical?.tripMode ?? ''} locked={lockedSteps.has(6)} onFileStatsChange={setCommercialFileStats} />,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-brand-navy shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">Add New Client</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Step {current + 1} of {STEPS.length} — {STEPS[current].label}
            </p>
            {stepContextLine && (
              <p className="text-slate-400 text-[10px] mt-0.5">↳ {stepContextLine}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left stepper */}
          <div className="w-52 shrink-0 bg-slate-50 border-r border-slate-200 py-6 px-4 overflow-y-auto">
            <ol className="relative">
              {STEPS.map((step, idx) => {
                const isLocked    = lockedSteps.has(idx);
                const isDone      = completed.has(idx) && idx !== current && !isLocked;
                const isActive    = idx === current;
                const isClickable = idx < current || completed.has(idx) || isLocked;
                return (
                  <li key={step.id} className="relative flex gap-3 pb-7 last:pb-0">
                    {idx < STEPS.length - 1 && (
                      <div className={`absolute left-[15px] top-8 w-0.5 h-full -translate-x-1/2 ${isDone ? 'bg-green-400' : isLocked ? 'bg-amber-300' : 'bg-slate-200'}`} />
                    )}
                    <button
                      onClick={() => handleStepClick(idx)}
                      disabled={!isClickable && !isActive}
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all text-sm font-semibold
                        ${isActive   ? 'bg-brand-orange border-brand-orange text-white shadow-md' : ''}
                        ${isDone     ? 'bg-green-500 border-green-500 text-white'                 : ''}
                        ${isLocked && !isActive ? 'bg-amber-100 border-amber-400 text-amber-600' : ''}
                        ${!isActive && !isDone && !isLocked ? 'bg-white border-slate-300 text-slate-400' : ''}
                        ${isClickable && !isActive ? 'cursor-pointer hover:border-brand-orange/50' : ''}
                        ${!isClickable && !isActive ? 'cursor-default' : ''}
                      `}
                    >
                      {isDone ? '✓' : isLocked && !isActive ? '🔒' : idx + 1}
                    </button>
                    <div className="pt-1">
                      <span className={`text-sm font-medium leading-none ${
                        isActive ? 'text-brand-navy' : isDone ? 'text-green-600' : isLocked ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                      {isLocked && !isActive && (
                        <p className="text-[9px] text-amber-500 mt-0.5">{getLockedAdmin(idx)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Right content */}
          <div className="relative flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {stepContent[STEPS[current].id]}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <button
                onClick={handleBack}
                disabled={current === 0}
                className="px-5 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={(!canProceed() && !lockedSteps.has(current)) || saving}
                className="px-6 py-2 rounded-lg text-sm font-semibold bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
              >
                {saving ? 'Saving…' : isLast ? 'Submit for Approval →' : lockedSteps.has(current) ? 'Next →' : 'Save & Next →'}
              </button>
            </div>

            {/* Approval confirmation overlay */}
            {approvalConfirm && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-xl border border-amber-200 p-6 mx-6 max-w-sm w-full">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-xl mt-0.5">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">Submit for Approval?</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{approvalConfirm.note}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5">
                    <p className="text-xs text-amber-800">
                      Will be sent to <span className="font-semibold">{approvalConfirm.admin}</span>.
                      These steps will be <span className="font-semibold">locked</span> — no further edits allowed.
                    </p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setApprovalConfirm(null)}
                      className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={handleApprovalConfirm}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-brand-orange hover:bg-brand-orange-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Submitting…' : 'Yes, Submit for Approval'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable primitives ─── */

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
        <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

type Mode = 'select' | 'add';

function ModeToggle({ mode, onToggle, addLabel }: { mode: Mode; onToggle: (m: Mode) => void; addLabel: string }) {
  return (
    <div className="flex gap-2">
      {(['add', 'select'] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onToggle(m)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            mode === m
              ? 'bg-brand-navy text-white border-brand-navy'
              : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
          }`}
        >
          {m === 'select' ? 'Select Existing' : `+ ${addLabel}`}
        </button>
      ))}
    </div>
  );
}

function OptionCard({
  label, sub, selected, onClick,
}: { label: string; sub?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-brand-orange bg-orange-50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <p className={`text-sm font-medium ${selected ? 'text-brand-navy' : 'text-slate-700'}`}>{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </button>
  );
}

function AddForm({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 bg-slate-50 space-y-3">
      {children}
    </div>
  );
}

function PlaceholderFields({ label }: { label: string }) {
  return (
    <p className="text-xs text-slate-400 italic">
      Input fields for <span className="font-medium text-slate-500">{label}</span> will be added in the next step.
    </p>
  );
}

function LockedStepView({ admin, children }: { admin: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
        <span className="text-base">🔒</span>
        <div>
          <p className="text-xs font-semibold text-amber-800">Submitted for approval</p>
          <p className="text-[11px] text-amber-600">Sent to <span className="font-medium">{admin}</span> — fields are locked.</p>
        </div>
      </div>
      <div className="opacity-60 pointer-events-none select-none space-y-3">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

/* ─── Step components ─── */

const INDUSTRY_TYPES = [
  'E-Commerce',
  'Retail & FMCG',
  'Automotive',
  'Manufacturing',
  'Pharmaceutical',
  'Food & Beverage',
  'Logistics & Supply Chain',
  'IT / Technology',
  'Textile & Apparel',
  'Agriculture',
  'Healthcare',
  'Infrastructure & Construction',
  'Banking & Finance',
  'Others',
];

function GroupStep({
  selected, onSelect, newGroup, onNewGroup, locked,
}: {
  selected: string | null;
  onSelect: (id: string, name: string) => void;
  newGroup: NewGroup | null;
  onNewGroup: (d: NewGroup | null) => void;
  locked?: boolean;
}) {
  const [mode, setMode]     = useState<Mode>(() => selected ? 'select' : 'add');
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/hierarchy/groups').then((r) => r.json()).then(setGroups);
  }, []);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  function handleModeToggle(m: Mode) {
    setMode(m);
    if (m === 'select') onNewGroup(null);
    else onSelect('', ''); // clear select-mode choice
  }

  if (locked) return (
    <LockedStepView admin="COB Admin">
      <StepShell title="Group" subtitle="Submitted for approval.">
        <DetailRow label="Group Name"    value={newGroup?.name        ?? groups.find(g => g.id === selected)?.name ?? ''} />
        <DetailRow label="Industry Type" value={newGroup?.industryType ?? ''} />
      </StepShell>
    </LockedStepView>
  );

  return (
    <StepShell title="Group" subtitle="Create a new group or select an existing one.">
      <ModeToggle mode={mode} onToggle={handleModeToggle} addLabel="New Group" />

      {mode === 'add' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              value={newGroup?.name ?? ''}
              onChange={(e) => onNewGroup({ name: e.target.value, industryType: newGroup?.industryType ?? '' })}
              placeholder="e.g. 1FKT"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Industry Type <span className="text-red-400">*</span>
            </label>
            <select
              value={newGroup?.industryType ?? ''}
              onChange={(e) => onNewGroup({ name: newGroup?.name ?? '', industryType: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition bg-white text-slate-700"
            >
              <option value="" disabled>Select industry type…</option>
              {INDUSTRY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {mode === 'select' && (
        <>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
          />
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-xs text-slate-400 py-2">No groups found.</p>
              : filtered.map((g) => (
                  <OptionCard key={g.id} label={g.name} selected={selected === g.id} onClick={() => onSelect(g.id, g.name)} />
                ))
            }
          </div>
        </>
      )}
    </StepShell>
  );
}

const DUMMY_PAN = 'AABCT1234F';

const PAN_TYPE_MAP: Record<string, string> = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Firm / Partnership',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
};

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function LegalEntityStep({
  groupId, hasGroup, selected, onSelect, newLE, onNewLE, locked, displayName = '',
}: {
  groupId: string | null;
  hasGroup: boolean;
  selected: string | null;
  onSelect: (id: string, name: string) => void;
  newLE: NewLegalEntity | null;
  onNewLE: (d: NewLegalEntity | null) => void;
  locked?: boolean;
  displayName?: string;
}) {
  const [mode, setMode]         = useState<Mode>(() => selected ? 'select' : 'add');
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [useDummy, setUseDummy] = useState(() => newLE?.pan === DUMMY_PAN);

  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/hierarchy/legal-entities?groupId=${groupId}`).then((r) => r.json()).then(setEntities);
  }, [groupId]);

  function patch(fields: Partial<NewLegalEntity>) {
    onNewLE({ name: '', pan: '', orgType: '', address: '', ...(newLE ?? {}), ...fields });
  }

  function handlePanChange(raw: string) {
    const pan = raw.toUpperCase();
    const orgType = PAN_RE.test(pan) ? (PAN_TYPE_MAP[pan[3]] ?? '') : '';
    patch({ pan, orgType });
  }

  function handleDummyToggle(checked: boolean) {
    setUseDummy(checked);
    if (checked) patch({ pan: DUMMY_PAN, orgType: PAN_TYPE_MAP['C'] });
    else         patch({ pan: '', orgType: '' });
  }

  function handleModeToggle(m: Mode) {
    setMode(m);
    if (m === 'select') onNewLE(null);
    else onSelect('', '');
  }

  const panVal  = newLE?.pan ?? '';
  const panDirty = !useDummy && panVal.length === 10;
  const panValid = PAN_RE.test(panVal);
  const orgType  = panValid ? (PAN_TYPE_MAP[panVal[3]] ?? '') : '';

  if (locked) return (
    <LockedStepView admin="COB Admin">
      <StepShell title="Legal Entity" subtitle="Submitted for approval.">
        <DetailRow label="Legal Entity Name" value={newLE?.name ?? displayName} />
        <DetailRow label="PAN Number"        value={newLE?.pan  ?? ''} />
        <DetailRow label="Organisation Type" value={newLE?.orgType ?? ''} />
        <DetailRow label="Address"           value={newLE?.address ?? ''} />
      </StepShell>
    </LockedStepView>
  );

  if (!hasGroup) return (
    <StepShell title="Legal Entity" subtitle="Please complete the Group step first.">
      <p className="text-sm text-slate-400 italic">Go back and select or create a group to continue.</p>
    </StepShell>
  );

  return (
    <StepShell title="Legal Entity" subtitle="Select an existing legal entity under this group, or add a new one.">
      {/* Only show Select Existing when the group already exists in DB */}
      {groupId && <ModeToggle mode={mode} onToggle={handleModeToggle} addLabel="New Legal Entity" />}

      {mode === 'select' && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {entities.length === 0
            ? <p className="text-xs text-slate-400 py-2">No legal entities found for this group.</p>
            : entities.map((le) => (
                <OptionCard key={le.id} label={le.name} sub={`PAN: ${le.pan}`} selected={selected === le.id} onClick={() => onSelect(le.id, le.name)} />
              ))
          }
        </div>
      )}

      {mode === 'add' && (
        <div className="space-y-4">
          {/* Legal Entity Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Legal Entity Name <span className="text-red-400">*</span>
            </label>
            <input
              value={newLE?.name ?? ''}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="e.g. Acme Logistics Pvt. Ltd."
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
            />
          </div>

          {/* PAN Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-600">
                PAN Number <span className="text-red-400">*</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useDummy}
                  onChange={(e) => handleDummyToggle(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-orange"
                />
                <span className="text-[11px] text-slate-500">Use dummy PAN</span>
              </label>
            </div>
            <input
              value={panVal}
              onChange={(e) => { if (!useDummy) handlePanChange(e.target.value); }}
              disabled={useDummy}
              placeholder="e.g. AABCT1234F"
              maxLength={10}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 transition ${
                useDummy
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                  : panDirty && !panValid
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : 'border-slate-300 focus:ring-brand-orange/40 focus:border-brand-orange'
              }`}
            />
            {panDirty && !panValid && (
              <p className="text-[11px] text-red-500 mt-1">
                Invalid PAN — expected 5 letters + 4 digits + 1 letter (e.g. AABCT1234F)
              </p>
            )}
          </div>

          {/* Organisation Type — auto-derived */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Organisation Type <span className="text-slate-400 font-normal">(auto-detected from PAN)</span>
            </label>
            <div className={`w-full border rounded-lg px-3 py-2.5 text-sm ${
              orgType
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-slate-200 bg-slate-50 text-slate-400 italic'
            }`}>
              {orgType || 'Will auto-fill once a valid PAN is entered'}
            </div>
          </div>

          {/* Registered Office Address */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Registered Office Address <span className="text-red-400">*</span>
            </label>
            <textarea
              value={newLE?.address ?? ''}
              onChange={(e) => patch({ address: e.target.value })}
              placeholder="Full registered address as per MCA records…"
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition resize-none"
            />
          </div>
        </div>
      )}
    </StepShell>
  );
}

const VERTICAL_SUGGESTIONS = [
  'Pantry', 'HeavyBulky', 'DarkStore', 'Prime', 'Buyback', 'FMCG', 'General',
  'Electronics', 'Apparel', 'Pharma', 'Instamart', 'Express', 'Standard',
  'B2B', 'ColdChain', 'Perishables', 'Industrial', 'Hyperlocal', '0',
];

const CFA_NAME_SUGGESTIONS = [
  'AgarwalPackers', 'MyPackers', 'SovereignLogistics', 'BlueDart', 'DTDC',
  'Delhivery', 'XpressBees', 'SafexExpress', 'GatiKWE', 'TCI',
  'AdityaAssociates', 'ShreeSaiLogistics', 'VijayLogistics', 'RoyalCourier',
  'NationalPackers', 'SRSLogistics', 'OmLogistics', 'ProfessionalCourier',
];

const LEG_OPTIONS = [
  { value: 'FM', title: 'First Mile'  },
  { value: 'MM', title: 'Mid Mile'    },
  { value: 'SH', title: 'Short Haul' },
  { value: 'LH', title: 'Long Haul'  },
  { value: 'LM', title: 'Last Mile'  },
] as const;

function VerticalStep({
  leId, hasLE, selected, onSelect, newVertical, onNewVertical, locked, groupName,
}: {
  leId: string | null;
  hasLE: boolean;
  selected: string | null;
  onSelect: (id: string, name: string) => void;
  newVertical: NewVertical | null;
  onNewVertical: (d: NewVertical | null) => void;
  locked?: boolean;
  groupName: string;
}) {
  const [mode, setMode]           = useState<Mode>(() => selected ? 'select' : 'add');
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!leId) return;
    fetch(`/api/hierarchy/verticals?leId=${leId}`).then((r) => r.json()).then(setVerticals);
  }, [leId]);

  const isCFA        = newVertical?.isCFA        ?? false;
  const verticalPart = newVertical?.verticalPart ?? '';
  const leg          = newVertical?.leg          ?? '';
  const projectName  = newVertical?.projectName  ?? '';
  const tripMode     = newVertical?.tripMode     ?? '';

  // Strip spaces AND underscores — only clean chars allowed in name segments
  const sanitize = (s: string) => s.replace(/[\s_]+/g, '');

  function buildName(gName: string, vPart: string, l: string, proj: string, cfa: boolean): string {
    const g = gName.replace(/\s+/g, '') || 'Group';
    const v = vPart || '0';
    const lPart = l || '0';
    if (cfa) return [g, v, lPart, 'cfa'].join('_');
    const parts = [g, v, lPart];
    if (proj) parts.push(proj);
    return parts.join('_');
  }

  function patch(fields: Partial<NewVertical>) {
    const base = { name: '', tripMode: '', isCFA: false, verticalPart: '', leg: '', projectName: '', ...(newVertical ?? {}) };
    const updated = { ...base, ...fields };
    updated.name = buildName(groupName, updated.verticalPart ?? '', updated.leg ?? '', updated.projectName ?? '', updated.isCFA ?? false);
    onNewVertical(updated);
  }

  function handleModeToggle(m: Mode) {
    setMode(m);
    if (m === 'select') onNewVertical(null);
    else onSelect('', '');
  }

  const legIsNA    = leg === '0';
  const legOk      = ['FM', 'MM', 'SH', 'LH', 'LM', '0'].includes(leg);
  const groupPrefix = (groupName.replace(/\s+/g, '') || 'Group') + '_';
  const preview    = buildName(groupName, verticalPart, leg, projectName, isCFA);

  /* ── Locked view ── */
  if (locked) return (
    <LockedStepView admin="COB Admin">
      <StepShell title="Vertical" subtitle="Submitted for approval.">
        <DetailRow label="Vertical Name" value={newVertical?.name ?? verticals.find(v => v.id === selected)?.name ?? ''} />
        <DetailRow label="Trip Mode"     value={newVertical?.tripMode ?? ''} />
      </StepShell>
    </LockedStepView>
  );

  if (!hasLE) return (
    <StepShell title="Vertical" subtitle="Please complete the Legal Entity step first.">
      <p className="text-sm text-slate-400 italic">Go back and select or create a legal entity to continue.</p>
    </StepShell>
  );

  return (
    <StepShell title="Vertical" subtitle="Build the vertical name using the fields below.">
      {leId && <ModeToggle mode={mode} onToggle={handleModeToggle} addLabel="New Vertical" />}

      {mode === 'select' && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {verticals.length === 0
            ? <p className="text-xs text-slate-400 py-2">No verticals found for this legal entity.</p>
            : verticals.map((v) => (
                <OptionCard key={v.id} label={v.name} selected={selected === v.id} onClick={() => onSelect(v.id, v.name)} />
              ))
          }
        </div>
      )}

      {mode === 'add' && (
        <div className="space-y-3">

          {/* ── CFA toggle ── */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCFA}
              onChange={(e) => patch({ isCFA: e.target.checked, verticalPart: '', projectName: '' })}
              className="w-3.5 h-3.5 accent-brand-orange"
            />
            <span className="text-xs font-medium text-slate-600">CFA Client</span>
            <span className="text-[11px] text-slate-400">— GroupName_CFAName_Leg_cfa</span>
          </label>

          {/* ── Vertical name: fixed prefix + typed segment + leg pills, all in one row ── */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-600">
                {isCFA ? 'CFA Name' : 'Vertical Name'} <span className="text-red-400">*</span>
              </label>
              <span className="text-[10px] text-slate-400">No spaces or underscores — e.g. <span className="font-mono">pantry / darkstore / heavy</span></span>
            </div>

            {/* Single-row input: [GroupPrefix][text input][_ Leg pills] */}
            <div className="flex items-stretch rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange transition">
              {/* Non-editable group prefix */}
              <span className="flex items-center px-2.5 bg-slate-100 border-r border-slate-200 font-mono text-sm text-slate-500 whitespace-nowrap shrink-0 select-none">
                {groupPrefix}
              </span>
              {/* Typed name segment with suggestions */}
              <input
                value={verticalPart}
                onChange={(e) => patch({ verticalPart: sanitize(e.target.value) })}
                placeholder={isCFA ? 'AdityaAssociates' : 'HeavyBulky'}
                list={isCFA ? 'cfa-name-datalist' : 'vname-datalist'}
                autoComplete="off"
                className="flex-1 px-2.5 py-2.5 text-sm font-mono focus:outline-none min-w-0 bg-white placeholder:text-slate-300"
              />
              <datalist id="vname-datalist">
                {VERTICAL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
              <datalist id="cfa-name-datalist">
                {CFA_NAME_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
              {/* Separator */}
              <span className="flex items-center px-1 text-slate-300 font-mono text-sm select-none shrink-0">_</span>
              {/* Leg pills — 4 options + N/A (0) */}
              <div className="flex items-center gap-1 pr-2">
                {LEG_OPTIONS.map(({ value, title }) => (
                  <button
                    key={value}
                    type="button"
                    title={title}
                    disabled={legIsNA}
                    onClick={() => patch({ leg: value })}
                    className={`px-1.5 py-1 rounded text-[11px] font-bold border transition-all shrink-0 ${
                      legIsNA
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : leg === value
                          ? 'bg-brand-orange text-white border-brand-orange'
                          : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {value}
                  </button>
                ))}
                {/* N/A toggle */}
                <button
                  type="button"
                  title="Not applicable — use 0"
                  onClick={() => patch({ leg: legIsNA ? '' : '0' })}
                  className={`px-1.5 py-1 rounded text-[11px] font-bold border transition-all shrink-0 ${
                    legIsNA
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  N/A
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-1">
              {leg && !legIsNA && <span className="mr-2">↳ Leg: {LEG_OPTIONS.find(o => o.value === leg)?.title}</span>}
              {!legOk && <span className="text-amber-600">Select a leg to continue</span>}
              {legIsNA && <span className="text-slate-500">Leg not available — using 0</span>}
            </p>
          </div>

          {/* ── Project Name (Standard only) — compact ── */}
          {!isCFA && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
                Project <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-stretch flex-1 rounded-lg border border-slate-300 overflow-hidden focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange transition">
                <span className="flex items-center px-2 bg-slate-100 border-r border-slate-200 font-mono text-sm text-slate-400 shrink-0 select-none">_</span>
                <input
                  value={projectName}
                  onChange={(e) => patch({ projectName: sanitize(e.target.value) })}
                  placeholder="e.g. CPO (leave blank if none)"
                  className="flex-1 px-2.5 py-2 text-sm font-mono focus:outline-none bg-white placeholder:text-slate-300"
                />
              </div>
            </div>
          )}

          {/* ── Live preview (appears once leg is selected) ── */}
          {legOk && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-mono ${
              legOk && tripMode ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <span className="shrink-0">{legOk && tripMode ? '✓' : '◎'}</span>
              <span className="font-semibold break-all">{preview}</span>
            </div>
          )}

          {/* ── Naming guide — collapsed by default ── */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(s => !s)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <span>📐 Naming Convention Reference</span>
              <span className="text-slate-400 text-[10px]">{showGuide ? '▲ collapse' : '▼ expand'}</span>
            </button>
            {showGuide && (
              <div className="border-t border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1.5 text-[11px]">
                <p><span className="font-semibold text-slate-600">Standard: </span><span className="font-mono text-slate-500">GroupName_VerticalName_Leg[_Project]</span></p>
                <p className="text-slate-400 pl-2">BigBasket_Pantry_SH · Amazon_HeavyBulky_LM_CPO · Britannia_0_LM</p>
                <p className="mt-1"><span className="font-semibold text-slate-600">CFA: </span><span className="font-mono text-slate-500">GroupName_CFAName_Leg_cfa</span></p>
                <p className="text-slate-400 pl-2">Abbott_AdityaAssociates_LM_cfa</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 pt-1">
                  {LEG_OPTIONS.map(({ value, title }) => (
                    <span key={value} className="text-slate-500"><span className="font-mono font-bold">{value}</span> {title}</span>
                  ))}
                  <span className="text-slate-500"><span className="font-mono font-bold">0</span> Not applicable</span>
                </div>
                <p className="text-slate-500 pt-0.5">Not sure? <span className="font-semibold">Tanmay Uday (BA)</span> @ +91-94820 84482</p>
              </div>
            )}
          </div>

          {/* ── Trip Mode ── */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Trip Mode <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-3">
              {(['Local', 'Upcountry'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => patch({ tripMode: opt })}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    tripMode === opt
                      ? 'border-brand-orange bg-orange-50 text-brand-orange'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {opt === 'Local' ? '🏙️ Local' : '🛣️ Upcountry'}
                </button>
              ))}
            </div>
            {tripMode && (
              <p className="text-[11px] text-slate-400 mt-1">
                {tripMode === 'Local' ? 'Same-city trips.' : 'Long-haul or inter-city trips.'}
              </p>
            )}
          </div>

        </div>
      )}
    </StepShell>
  );
}

/* ─── State GSTIN constants ─── */

const INDIAN_STATES = [
  { name: 'Andaman & Nicobar Islands',                code: '35' },
  { name: 'Andhra Pradesh',                           code: '37' },
  { name: 'Arunachal Pradesh',                        code: '12' },
  { name: 'Assam',                                    code: '18' },
  { name: 'Bihar',                                    code: '10' },
  { name: 'Chandigarh',                               code: '04' },
  { name: 'Chhattisgarh',                             code: '22' },
  { name: 'Dadra & Nagar Haveli and Daman & Diu',     code: '26' },
  { name: 'Delhi',                                    code: '07' },
  { name: 'Goa',                                      code: '30' },
  { name: 'Gujarat',                                  code: '24' },
  { name: 'Haryana',                                  code: '06' },
  { name: 'Himachal Pradesh',                         code: '02' },
  { name: 'Jammu & Kashmir',                          code: '01' },
  { name: 'Jharkhand',                                code: '20' },
  { name: 'Karnataka',                                code: '29' },
  { name: 'Kerala',                                   code: '32' },
  { name: 'Ladakh',                                   code: '38' },
  { name: 'Lakshadweep',                              code: '31' },
  { name: 'Madhya Pradesh',                           code: '23' },
  { name: 'Maharashtra',                              code: '27' },
  { name: 'Manipur',                                  code: '14' },
  { name: 'Meghalaya',                                code: '17' },
  { name: 'Mizoram',                                  code: '15' },
  { name: 'Nagaland',                                 code: '13' },
  { name: 'Odisha',                                   code: '21' },
  { name: 'Puducherry',                               code: '34' },
  { name: 'Punjab',                                   code: '03' },
  { name: 'Rajasthan',                                code: '08' },
  { name: 'Sikkim',                                   code: '11' },
  { name: 'Tamil Nadu',                               code: '33' },
  { name: 'Telangana',                                code: '36' },
  { name: 'Tripura',                                  code: '16' },
  { name: 'Uttar Pradesh',                            code: '09' },
  { name: 'Uttarakhand',                              code: '05' },
  { name: 'West Bengal',                              code: '19' },
];

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_RE      = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Compute the 15th checksum character per GST India algorithm */
function computeGSTINChecksum(first14: string): string {
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const v = GSTIN_CHARSET.indexOf(first14[i]);
    const p = v * (i % 2 === 0 ? 1 : 2);
    total += Math.floor(p / 36) + (p % 36);
  }
  return GSTIN_CHARSET[(36 - (total % 36)) % 36];
}

function buildDummyGSTIN(stateCode: string): string {
  const first14 = `${stateCode}${DUMMY_PAN}1Z`;
  return first14 + computeGSTINChecksum(first14);
}

/**
 * Returns an error string if GSTIN is invalid, or null if valid.
 * Pass lePAN=null to skip PAN-match check (dummy mode).
 */
function gstinValidationError(gstin: string, state: string, lePAN: string | null): string | null {
  if (!GSTIN_RE.test(gstin)) {
    return 'Format: SS-PPPPPNNNNP-E-Z-C  (state code · PAN · entity · Z · check)';
  }
  const entry = INDIAN_STATES.find((s) => s.name === state);
  if (entry && gstin.slice(0, 2) !== entry.code) {
    return `State code in GSTIN (${gstin.slice(0, 2)}) must be ${entry.code} for ${state}`;
  }
  if (lePAN && gstin.slice(2, 12) !== lePAN) {
    return `PAN in GSTIN (${gstin.slice(2, 12)}) doesn't match Legal Entity PAN (${lePAN})`;
  }
  return null;
}

function StateGstinStep({
  leId, hasVertical, verticalId, selected, onSelect,
  newStateGstin, onNewStateGstin, lePAN, locked, displayName = '',
}: {
  leId: string | null;
  hasVertical: boolean;
  verticalId: string | null;
  selected: string | null;
  onSelect: (id: string, name: string) => void;
  newStateGstin: NewStateGstin | null;
  onNewStateGstin: (d: NewStateGstin | null) => void;
  lePAN: string | null;
  locked?: boolean;
  displayName?: string;
}) {
  const [mode, setMode]               = useState<Mode>(() => selected ? 'select' : 'add');
  const [stateGstins, setStateGstins] = useState<StateGstin[]>([]);

  useEffect(() => {
    if (!leId || !verticalId) return;
    fetch(`/api/hierarchy/state-gstins?leId=${leId}&verticalId=${verticalId}`)
      .then((r) => r.json()).then(setStateGstins);
  }, [leId, verticalId]);

  function patch(fields: Partial<NewStateGstin>) {
    onNewStateGstin({ state: '', gstin: '', billingAddress: '', isDummy: false, ...(newStateGstin ?? {}), ...fields });
  }

  function handleModeToggle(m: Mode) {
    setMode(m);
    if (m === 'select') onNewStateGstin(null);
    else onSelect('', '');
  }

  const isDummy   = newStateGstin?.isDummy ?? false;
  const stateCode = INDIAN_STATES.find((s) => s.name === newStateGstin?.state)?.code ?? '';

  function handleStateChange(name: string) {
    const code = INDIAN_STATES.find((s) => s.name === name)?.code ?? '';
    if (isDummy && code) patch({ state: name, gstin: buildDummyGSTIN(code) });
    else               patch({ state: name });
  }

  function handleDummyToggle(checked: boolean) {
    if (checked) {
      const g = stateCode ? buildDummyGSTIN(stateCode) : '';
      patch({ isDummy: true, gstin: g });
    } else {
      patch({ isDummy: false, gstin: '' });
    }
  }

  const gstinVal   = newStateGstin?.gstin ?? '';
  const gstinDirty = gstinVal.length === 15;
  const validErr   = gstinDirty
    ? gstinValidationError(gstinVal, newStateGstin?.state ?? '', isDummy ? null : lePAN)
    : null;

  /* ── Locked view ── */
  if (locked) return (
    <LockedStepView admin="COB Admin">
      <StepShell title="State GSTIN" subtitle="Submitted for approval.">
        <DetailRow label="State / GSTIN"   value={newStateGstin ? `${newStateGstin.state} — ${newStateGstin.gstin}` : displayName} />
        <DetailRow label="Billing Address" value={newStateGstin?.billingAddress ?? ''} />
      </StepShell>
    </LockedStepView>
  );

  if (!hasVertical) return (
    <StepShell title="State GSTIN" subtitle="Please complete the Vertical step first.">
      <p className="text-sm text-slate-400 italic">Go back and select or create a vertical to continue.</p>
    </StepShell>
  );

  return (
    <StepShell title="State GSTIN" subtitle="Register a new state for this LE + Vertical, or select an existing one.">
      {(leId && verticalId) && <ModeToggle mode={mode} onToggle={handleModeToggle} addLabel="New State GSTIN" />}

      {mode === 'select' && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {stateGstins.length === 0
            ? <p className="text-xs text-slate-400 py-2">No state GSTINs found for this combination.</p>
            : stateGstins.map((s) => (
                <OptionCard key={s.id} label={s.state} sub={`GSTIN: ${s.gstin}`} selected={selected === s.id} onClick={() => onSelect(s.id, `${s.state} — ${s.gstin}`)} />
              ))
          }
        </div>
      )}

      {mode === 'add' && (
        <div className="space-y-4">

          {/* Select State */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              State <span className="text-red-400">*</span>
            </label>
            <select
              value={newStateGstin?.state ?? ''}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition bg-white text-slate-700"
            >
              <option value="" disabled>Select state…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* GSTIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-600">
                GSTIN Number <span className="text-red-400">*</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDummy}
                  onChange={(e) => handleDummyToggle(e.target.checked)}
                  className="w-3.5 h-3.5 accent-brand-orange"
                />
                <span className="text-[11px] text-slate-500">Use dummy GSTIN</span>
              </label>
            </div>
            <input
              value={gstinVal}
              onChange={(e) => { if (!isDummy) patch({ gstin: e.target.value.toUpperCase() }); }}
              disabled={isDummy}
              placeholder={stateCode ? `e.g. ${buildDummyGSTIN(stateCode)}` : 'Select a state first…'}
              maxLength={15}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 transition ${
                isDummy
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                  : gstinDirty && validErr
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : gstinDirty && !validErr
                      ? 'border-green-300 focus:ring-green-200 focus:border-green-400'
                      : 'border-slate-300 focus:ring-brand-orange/40 focus:border-brand-orange'
              }`}
            />
            {isDummy && !stateCode && (
              <p className="text-[11px] text-amber-600 mt-1">Select a state above to auto-fill the dummy GSTIN.</p>
            )}
            {gstinDirty && validErr && (
              <p className="text-[11px] text-red-500 mt-1">{validErr}</p>
            )}
            {gstinDirty && !validErr && (
              <p className="text-[11px] text-green-600 mt-1">✓ Valid GSTIN</p>
            )}
            {!isDummy && (
              <p className="text-[10px] text-slate-400 mt-1">
                Structure: <span className="font-mono">SS</span> (state) + <span className="font-mono">PPPPPPPPPP</span> (PAN) + <span className="font-mono">E</span> (entity) + <span className="font-mono">Z</span> + <span className="font-mono">C</span> (check)
              </p>
            )}
          </div>

          {/* Billing Address */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Billing Address <span className="text-red-400">*</span>
            </label>
            <textarea
              value={newStateGstin?.billingAddress ?? ''}
              onChange={(e) => patch({ billingAddress: e.target.value })}
              placeholder="Address to be used on invoices for this state…"
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition resize-none"
            />
          </div>

        </div>
      )}
    </StepShell>
  );
}

const EMPTY_CONTACT: POCContact = { name: '', email: '', phone: '' };

function ContactFields({
  value, onChange,
}: { value: POCContact; onChange: (d: POCContact) => void }) {
  const emailDirty = value.email.length > 0;
  const emailErr   = emailDirty && !EMAIL_RE.test(value.email);
  return (
    <div className="space-y-2.5">
      <input
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        placeholder="Full name"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <input
            type="email"
            value={value.email}
            onChange={(e) => onChange({ ...value, email: e.target.value })}
            placeholder="email@company.com"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition ${
              emailErr
                ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                : 'border-slate-300 focus:ring-brand-orange/40 focus:border-brand-orange'
            }`}
          />
          {emailErr && <p className="text-[10px] text-red-500 mt-0.5">Invalid email</p>}
        </div>
        <input
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="+91 98765 43210"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
        />
      </div>
    </div>
  );
}

function PocStep({ newPOC, onNewPOC }: { newPOC: NewPOC | null; onNewPOC: (d: NewPOC) => void }) {
  const poc = newPOC ?? { finance: EMPTY_CONTACT, financeAlt: null, operations: EMPTY_CONTACT, operationsAlt: null };

  const [hasFinanceAlt, setHasFinanceAlt] = useState(() => !!newPOC?.financeAlt);
  const [hasOpsAlt,     setHasOpsAlt]     = useState(() => !!newPOC?.operationsAlt);

  function patch(fields: Partial<NewPOC>) {
    onNewPOC({ ...poc, ...fields });
  }

  function toggleFinanceAlt(checked: boolean) {
    setHasFinanceAlt(checked);
    patch({ financeAlt: checked ? EMPTY_CONTACT : null });
  }

  function toggleOpsAlt(checked: boolean) {
    setHasOpsAlt(checked);
    patch({ operationsAlt: checked ? EMPTY_CONTACT : null });
  }

  return (
    <StepShell title="POC" subtitle="Add points of contact for this client.">
      <div className="space-y-5">

        {/* ── Finance Contact ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Finance Contact</span>
            <span className="text-[10px] text-red-400 font-medium">Required</span>
          </div>
          <ContactFields value={poc.finance} onChange={(v) => patch({ finance: v })} />

          <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
            <input
              type="checkbox"
              checked={hasFinanceAlt}
              onChange={(e) => toggleFinanceAlt(e.target.checked)}
              className="w-3.5 h-3.5 accent-brand-orange"
            />
            <span className="text-[11px] text-slate-500">Add alternate Finance contact</span>
          </label>

          {hasFinanceAlt && (
            <div className="pl-4 border-l-2 border-brand-orange/30 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Finance Contact 2</p>
              <ContactFields
                value={poc.financeAlt ?? EMPTY_CONTACT}
                onChange={(v) => patch({ financeAlt: v })}
              />
            </div>
          )}
        </div>

        <div className="h-px bg-slate-100" />

        {/* ── Operations Contact (mandatory) ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Operations Contact</span>
            <span className="text-[10px] text-red-400 font-medium">Required</span>
          </div>

          <ContactFields
            value={poc.operations ?? EMPTY_CONTACT}
            onChange={(v) => patch({ operations: v })}
          />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasOpsAlt}
              onChange={(e) => toggleOpsAlt(e.target.checked)}
              className="w-3.5 h-3.5 accent-brand-orange"
            />
            <span className="text-[11px] text-slate-500">Add alternate Operations contact</span>
          </label>

          {hasOpsAlt && (
            <div className="pl-4 border-l-2 border-brand-orange/30 space-y-1.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Operations Contact 2</p>
              <ContactFields
                value={poc.operationsAlt ?? EMPTY_CONTACT}
                onChange={(v) => patch({ operationsAlt: v })}
              />
            </div>
          )}
        </div>

      </div>
    </StepShell>
  );
}

const LT_CITIES = ['Bangalore', 'New Delhi', 'Chennai', 'Bhubaneswar', 'Koderma', 'Guwahati'];

function CityStep({
  stateGstinId, hasStateGstin, selected, onSelect, newCity, onNewCity, locked, displayName = '',
}: {
  stateGstinId: string | null;
  hasStateGstin: boolean;
  selected: string | null;
  onSelect: (id: string, name: string) => void;
  newCity: NewCity | null;
  onNewCity: (d: NewCity | null) => void;
  locked?: boolean;
  displayName?: string;
}) {
  const [mode, setMode]     = useState<Mode>(() => selected ? 'select' : 'add');
  const [cities, setCities] = useState<City[]>([]);
  const [zone, setZone]     = useState<ReturnType<typeof lookupZone> | 'not-mapped' | null>(null);
  const skipZoneInit        = useRef(true);

  useEffect(() => {
    if (!stateGstinId) return;
    fetch(`/api/hierarchy/cities?stateGstinId=${stateGstinId}`)
      .then((r) => r.json()).then(setCities);
  }, [stateGstinId]);

  useEffect(() => {
    if (skipZoneInit.current) { skipZoneInit.current = false; return; }
    const lat = parseFloat(newCity?.lat ?? '');
    const lng = parseFloat(newCity?.lng ?? '');
    if (isNaN(lat) || isNaN(lng)) { setZone(null); return; }
    const found = lookupZone(lat, lng);
    setZone(found ?? 'not-mapped');
    if (found) patch({ subArea: found.subArea, area: found.area });
    else patch({ subArea: '', area: '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newCity?.lat, newCity?.lng]);

  function patch(fields: Partial<NewCity>) {
    onNewCity({ city: '', hubName: '', hubAddress: '', contactName: '', contactEmail: '', contactPhone: '', lat: '', lng: '', subArea: '', area: '', ...(newCity ?? {}), ...fields });
  }

  function handleModeToggle(m: Mode) {
    setMode(m);
    if (m === 'select') onNewCity(null);
    else onSelect('', '');
  }

  /* ── Locked view ── */
  if (locked) return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
        <span className="text-base">🏙️</span>
        <p className="text-xs text-slate-600">City details saved — no approval required.</p>
      </div>
      <div className="opacity-60 pointer-events-none select-none space-y-3">
        <StepShell title="City" subtitle="City details.">
          <DetailRow label="LT Regional City" value={newCity?.city ?? displayName} />
          <DetailRow label="Hub Name"         value={newCity?.hubName    ?? ''} />
          <DetailRow label="Hub Address"      value={newCity?.hubAddress ?? ''} />
          {newCity?.lat && <DetailRow label="Coordinates" value={`${newCity.lat}, ${newCity.lng}`} />}
          {newCity?.subArea && <DetailRow label="Sub Area / Area" value={`${newCity.subArea} · ${newCity.area}`} />}
          <div className="h-px bg-slate-100 my-1" />
          <DetailRow label="Contact Name"  value={newCity?.contactName  ?? ''} />
          <DetailRow label="Contact Email" value={newCity?.contactEmail ?? ''} />
          <DetailRow label="Contact Phone" value={newCity?.contactPhone ?? ''} />
        </StepShell>
      </div>
    </div>
  );

  if (!hasStateGstin) return (
    <StepShell title="City" subtitle="Please complete the State GSTIN step first.">
      <p className="text-sm text-slate-400 italic">Go back and select or add a state GSTIN to continue.</p>
    </StepShell>
  );

  return (
    <StepShell title="City" subtitle="Add a city hub for this client.">
      {stateGstinId && <ModeToggle mode={mode} onToggle={handleModeToggle} addLabel="New City" />}

      {mode === 'select' && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {cities.length === 0
            ? <p className="text-xs text-slate-400 py-2">No cities found for this state GSTIN.</p>
            : cities.map((c) => (
                <OptionCard key={c.id} label={c.name} selected={selected === c.id} onClick={() => onSelect(c.id, c.name)} />
              ))
          }
        </div>
      )}

      {mode === 'add' && (
        <div className="space-y-4">

          {/* LT Regional City Office */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              LT Regional City Office <span className="text-red-400">*</span>
            </label>
            <select
              value={newCity?.city ?? ''}
              onChange={(e) => patch({ city: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition bg-white text-slate-700"
            >
              <option value="" disabled>Select city…</option>
              {LT_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Hub Name */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Hub Name <span className="text-red-400">*</span>
            </label>
            <input
              value={newCity?.hubName ?? ''}
              onChange={(e) => patch({ hubName: e.target.value })}
              placeholder="e.g. Whitefield Hub"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
            />
          </div>

          {/* Hub Address */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Hub Address <span className="text-red-400">*</span>
            </label>
            <textarea
              value={newCity?.hubAddress ?? ''}
              onChange={(e) => patch({ hubAddress: e.target.value })}
              placeholder="Full hub address…"
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition resize-none"
            />
          </div>

          {/* Hub Coordinates */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hub Coordinates</label>
            <p className="text-[11px] text-slate-400 mb-1.5">Not mandatory — if skipped, OPM will need to add hub coordinates during approval.</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newCity?.lat ?? ''}
                onChange={(e) => patch({ lat: e.target.value })}
                placeholder="Latitude e.g. 12.9716"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
              />
              <input
                value={newCity?.lng ?? ''}
                onChange={(e) => patch({ lng: e.target.value })}
                placeholder="Longitude e.g. 77.5946"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
              />
            </div>
            {zone && zone !== 'not-mapped' && (
              <div className="mt-2.5 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Sub Area</p>
                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">{zone.subArea}</div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">Area</p>
                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 font-medium">{zone.area}</div>
                </div>
              </div>
            )}
            {zone === 'not-mapped' && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <span>⚠️</span> Sub Area not mapped — contact Product Support Team to map this hub coordinates.
              </p>
            )}
          </div>

          {/* City Contact */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">City Contact</span>
              <span className="text-[10px] text-red-400 font-medium">Required</span>
            </div>
            <ContactFields
              value={{ name: newCity?.contactName ?? '', email: newCity?.contactEmail ?? '', phone: newCity?.contactPhone ?? '' }}
              onChange={(v) => patch({ contactName: v.name, contactEmail: v.email, contactPhone: v.phone })}
            />
          </div>

        </div>
      )}
    </StepShell>
  );
}

/* ─── Commercial helpers ─── */

const BUSINESS_TYPES = ['Scheduled', 'Ent OD / AdHoc', 'Peak'];

function mkDefaultCommercial(verticalName: string): NewCommercial {
  const today    = new Date();
  const nextYear = new Date(today);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { name: verticalName, businessType: '', contractStartDate: fmt(today), contractEndDate: '', marginPct: '', billingDays: '', creditDays: '', invoiceFrequency: '', remarks: '' };
}

function marginApprovalLabel(pct: number, tripMode: string): { label: string; color: string } {
  if (tripMode === 'Upcountry') {
    if (pct >= 5) return { label: 'Auto approved', color: 'text-green-600' };
    return { label: 'City Head / GM Ops approval needed', color: 'text-red-500' };
  }
  // Local / default
  if (pct >= 10) return { label: 'Auto approved', color: 'text-green-600' };
  if (pct >= 5)  return { label: 'Sales Head approval needed', color: 'text-amber-600' };
  return { label: 'Finance Head approval needed', color: 'text-red-500' };
}

function creditApprovalLabel(billing: number, credit: number): { label: string; color: string } {
  if (billing <= 15 && credit <= 7) return { label: 'Auto approved', color: 'text-green-600' };
  if (credit > 30)                  return { label: 'COO (Director) approval required', color: 'text-red-500' };
  return { label: 'Lead Onboarding Manager approval required', color: 'text-amber-600' };
}

function CommercialStep({
  newCommercial, onNewCommercial, verticalName, tripMode, locked, onFileStatsChange,
}: {
  newCommercial: NewCommercial | null;
  onNewCommercial: (d: NewCommercial) => void;
  verticalName: string;
  tripMode: string;
  locked?: boolean;
  onFileStatsChange?: (stats: { commercialCount: number; approvalCount: number }) => void;
}) {
  // Initialise with defaults on first render
  useEffect(() => {
    if (!newCommercial) onNewCommercial(mkDefaultCommercial(verticalName));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync commercial name when vertical name changes (if user hasn't manually overridden)
  useEffect(() => {
    if (!verticalName) return;
    const cur = newCommercial?.name ?? '';
    if (cur === '' || cur === undefined) {
      onNewCommercial({ ...(newCommercial ?? mkDefaultCommercial(verticalName)), name: verticalName });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verticalName]);

  const c = newCommercial ?? mkDefaultCommercial(verticalName);

  function patch(fields: Partial<NewCommercial>) {
    onNewCommercial({ ...c, ...fields });
  }

  // File state — local (File[]) for UI; metadata synced into newCommercial.files for persistence
  const [commercialFiles, setCommercialFiles] = useState<File[]>([]);
  const [approvalFiles,   setApprovalFiles]   = useState<File[]>([]);

  function toMeta(f: File, category: 'commercial' | 'approval'): CommercialFileMeta {
    const kb = Math.round(f.size / 1024);
    const size = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    return { id: `${Date.now()}-${f.name}`, name: f.name, size, category };
  }
  function syncFiles(newComm: File[], newApproval: File[]) {
    const metas = [
      ...newComm.map(f => toMeta(f, 'commercial')),
      ...newApproval.map(f => toMeta(f, 'approval')),
    ];
    patch({ files: metas });
  }

  const pctNum    = parseFloat(c.marginPct);
  const marginHint = c.marginPct && !isNaN(pctNum) ? marginApprovalLabel(pctNum, tripMode) : null;
  const billNum   = parseInt(c.billingDays || '0');
  const credNum   = parseInt(c.creditDays  || '0');
  const creditHint = (c.billingDays || c.creditDays) ? creditApprovalLabel(billNum, credNum) : null;

  // Approval files are mandatory when any field requires non-auto approval
  const needsApproval =
    (marginHint !== null && marginHint.label !== 'Auto approved') ||
    (creditHint !== null && creditHint.label !== '' && creditHint.label !== 'Auto approved');

  // Report file counts to parent so canProceed can gate on them
  useEffect(() => {
    onFileStatsChange?.({ commercialCount: commercialFiles.length, approvalCount: approvalFiles.length });
  }, [commercialFiles.length, approvalFiles.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Locked view ── */
  if (locked) return (
    <LockedStepView admin="COB Admin">
      <StepShell title="Commercial" subtitle="Submitted for approval.">
        <DetailRow label="Commercial Name"   value={c.name} />
        <DetailRow label="Business Type"     value={c.businessType} />
        <DetailRow label="Contract Period"   value={`${c.contractStartDate} → ${c.contractEndDate}`} />
        <DetailRow label="Margin %"          value={c.marginPct ? `${c.marginPct}%` : ''} />
        <DetailRow label="Billing / Credit"  value={c.billingDays ? `${c.billingDays}B / ${c.creditDays}C days` : ''} />
        <DetailRow label="Invoice Frequency" value={c.invoiceFrequency ? `${c.invoiceFrequency} days` : ''} />
        <DetailRow label="Remarks"           value={c.remarks} />
      </StepShell>
    </LockedStepView>
  );

  return (
    <StepShell title="Commercial" subtitle="Add commercial terms for this vertical.">
      <div className="space-y-5">

        {/* 1. Commercial Name */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Commercial Name <span className="text-red-400">*</span>
          </label>
          <input
            value={c.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Commercial name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
          />
          <p className="text-[11px] text-slate-400 mt-1 italic">
            Advise: Keep it same as Vertical Name unless necessarily required to change.
          </p>
          {verticalName && c.name !== verticalName && (
            <button type="button" onClick={() => patch({ name: verticalName })}
              className="text-[11px] text-brand-orange mt-0.5 hover:underline">
              ↩ Reset to vertical name "{verticalName}"
            </button>
          )}
        </div>

        {/* 2. Business Type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Business Type <span className="text-red-400">*</span>
          </label>
          <select
            value={c.businessType}
            onChange={(e) => patch({ businessType: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition bg-white text-slate-700"
          >
            <option value="" disabled>Select business type…</option>
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 3. Contract Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Contract Start <span className="text-red-400">*</span>
            </label>
            <input type="date" value={c.contractStartDate}
              onChange={(e) => patch({ contractStartDate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Contract End <span className="text-red-400">*</span>
            </label>
            <input type="date" value={c.contractEndDate}
              min={c.contractStartDate}
              onChange={(e) => patch({ contractEndDate: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
          </div>
        </div>

        {/* 4. Margin % */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
            Margin % <span className="text-red-400">*</span>
            <span className="relative group cursor-default">
              <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-300 text-white text-[9px] font-bold leading-none select-none">i</span>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-2.5 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                Estimation of Margin based on which finding supply range will be decided as per demand price.
              </span>
            </span>
          </label>
          <div className="relative">
            <input type="number" min="0" max="100" step="0.1"
              value={c.marginPct}
              onChange={(e) => patch({ marginPct: e.target.value })}
              placeholder="e.g. 8"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">%</span>
          </div>
          {marginHint && (
            <div className="mt-1">
              <p className={`text-[11px] font-medium ${marginHint.color}`}>→ {marginHint.label}</p>
              {marginHint.label === 'Auto approved'
                ? <p className="text-[11px] text-green-600 mt-0.5">✓ No approval files needed.</p>
                : <p className="text-[11px] text-slate-500 mt-0.5">Attach their approval in the <span className="font-medium text-slate-600">Approval Files</span> section below.</p>
              }
            </div>
          )}
          {/* Approval reference */}
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 text-[10px] overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              <div className="px-3 py-2">
                <p className="font-semibold text-slate-500 mb-1">Local</p>
                <p>≥10% → Auto approved</p>
                <p>5–10% → Sales Head</p>
                <p>&lt;5% → Finance Head</p>
              </div>
              <div className="px-3 py-2">
                <p className="font-semibold text-slate-500 mb-1">Upcountry</p>
                <p>≥5% → Auto approved</p>
                <p>&lt;5% → City Head / GM Ops</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Credit Period */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Credit Period</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Billing Days</label>
              <input type="number" min="0" value={c.billingDays}
                onChange={(e) => patch({ billingDays: e.target.value })}
                placeholder="e.g. 15"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Credit Days</label>
              <input type="number" min="0" value={c.creditDays}
                onChange={(e) => patch({ creditDays: e.target.value })}
                placeholder="e.g. 7"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
            </div>
          </div>
          {creditHint?.label && (
            <div className="mt-1">
              <p className={`text-[11px] font-medium ${creditHint.color}`}>→ {creditHint.label}</p>
              {creditHint.label === 'Auto approved'
                ? <p className="text-[11px] text-green-600 mt-0.5">✓ No approval files needed.</p>
                : <p className="text-[11px] text-slate-500 mt-0.5">Attach their approval in the <span className="font-medium text-slate-600">Approval Files</span> section below.</p>
              }
            </div>
          )}
          {/* Credit reference */}
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 text-[10px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 text-slate-500">
                  <th className="px-2 py-1 text-left font-semibold">Billing</th>
                  <th className="px-2 py-1 text-left font-semibold">Credit</th>
                  <th className="px-2 py-1 text-left font-semibold">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                <tr><td className="px-2 py-1">≤15</td><td className="px-2 py-1">≤7</td><td className="px-2 py-1 text-green-600">Auto approved</td></tr>
                <tr><td className="px-2 py-1">&gt;15, &lt;30</td><td className="px-2 py-1">&gt;7</td><td className="px-2 py-1 text-amber-600">Lead Onboarding Mgr</td></tr>
                <tr><td className="px-2 py-1">any</td><td className="px-2 py-1">&gt;30</td><td className="px-2 py-1 text-red-500">COO (Director)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Invoice Frequency */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Invoice Frequency</label>
          <div className="relative">
            <input type="number" min="1" value={c.invoiceFrequency}
              onChange={(e) => patch({ invoiceFrequency: e.target.value })}
              placeholder="e.g. 7"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition pr-14" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">Days</span>
          </div>
        </div>

        {/* 7. Remarks */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Remarks</label>
          <textarea value={c.remarks}
            onChange={(e) => patch({ remarks: e.target.value })}
            placeholder="Any additional remarks or conditions…"
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition resize-none" />
        </div>

        <div className="h-px bg-slate-100" />

        {/* 8. Attach Commercial */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Attach Commercial <span className="text-red-400">*</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-brand-orange/50 bg-white transition w-full">
            <span className="text-slate-400">📎</span>
            <span className="text-sm text-slate-500 flex-1">
              {commercialFiles.length > 0 ? `${commercialFiles.length} file(s) selected` : 'Attach Commercial'}
            </span>
            <span className="text-[10px] text-slate-400">xlsx / csv only</span>
            <input type="file" accept=".xlsx,.csv" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { const next = [f]; setCommercialFiles(next); syncFiles(next, approvalFiles); }
              }} />
          </label>
          {commercialFiles.map((f) => (
            <div key={f.name} className="flex items-center justify-between mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => { setCommercialFiles([]); syncFiles([], approvalFiles); }} className="ml-2 text-red-400 hover:text-red-600 text-[11px] shrink-0">✕ Remove</button>
            </div>
          ))}
        </div>

        {/* 9. Attach Client Approval Files */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Attach Client Approval Files{' '}
            {needsApproval
              ? <span className="text-red-400">*</span>
              : <span className="text-slate-400 font-normal">(optional)</span>
            }
          </label>
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-lg border border-dashed border-slate-300 hover:border-brand-orange/50 bg-white transition w-full ${approvalFiles.length >= 5 ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
            <span className="text-slate-400">📎</span>
            <span className="text-sm text-slate-500 flex-1">
              {approvalFiles.length > 0 ? `${approvalFiles.length} / 5 file(s)` : 'Attach Client Approval files'}
            </span>
            <span className="text-[10px] text-slate-400">PDF, PNG, IMG, email</span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.eml,.msg" multiple className="hidden"
              onChange={(e) => {
                const incoming = Array.from(e.target.files ?? []);
                setApprovalFiles((prev) => {
                  const next = [...prev, ...incoming].slice(0, 5);
                  syncFiles(commercialFiles, next);
                  return next;
                });
                e.target.value = '';
              }} />
          </label>
          <p className="text-[10px] text-slate-400 mt-1">*Upload up to 5 documents (max 5 MB each)</p>
          {approvalFiles.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <span className="truncate">{f.name}</span>
              <button type="button" onClick={() => { const next = approvalFiles.filter((_, idx) => idx !== i); setApprovalFiles(next); syncFiles(commercialFiles, next); }} className="ml-2 text-red-400 hover:text-red-600 text-[11px] shrink-0">✕ Remove</button>
            </div>
          ))}
        </div>

      </div>
    </StepShell>
  );
}
