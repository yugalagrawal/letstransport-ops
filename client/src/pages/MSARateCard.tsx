import { useEffect, useState } from 'react';
import Header from '../components/Header';

interface MSA {
  id: string;
  verticalName: string;
  businessType: string;
  freightBasis: string;
  tariffType: string;
  contractStartDate: string;
  contractEndDate: string;
  marginPct: string;
  billingDays: string;
  creditDays: string;
  invoiceFrequency: string;
  remarks: string;
  attachedMSA: string;
  attachedApprovalFiles: string[];
  status: string;
  createdAt: string;
  createdBy: string;
}

interface RateCard {
  id: string;
  verticalName: string;
  msaId: string;
  rateCardCode: string;
  noOfLanes: number;
  effectiveFrom: string;
  effectiveTo: string;
  createdAt: string;
  createdBy: string;
  status: string;
  remarks: string;
  csvFile: string;
}

interface EligibleVertical {
  id: string;
  verticalName: string;
  group: string;
  tripMode: string;
  approvedBy: string;
  approvedAt: string;
  draftId: string;
}

type Tab = 'msa-info' | 'rate-card';

const BUSINESS_TYPES = ['Scheduled', 'Ent OD / AdHoc', 'Peak'];
const FREIGHT_BASIS  = ['Per Trip', 'Per KM', 'Per Day', 'Per Package'];
const TARIFF_TYPES   = ['Fixed', 'Variable', 'Hybrid'];

/* ── Approval logic (MSA page is upcountry-only) ── */
function marginApprovalLabel(pct: number): { label: string; color: string } {
  if (pct >= 5) return { label: 'Auto approved', color: 'text-green-600' };
  return { label: 'City Head / GM Ops approval needed', color: 'text-red-500' };
}

function creditApprovalLabel(billing: number, credit: number): { label: string; color: string } {
  if (billing <= 15 && credit <= 7) return { label: 'Auto approved', color: 'text-green-600' };
  if (credit > 30)                  return { label: 'COO (Director) approval required', color: 'text-red-500' };
  return { label: 'Lead Onboarding Manager approval required', color: 'text-amber-600' };
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end   = new Date(dateStr); end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

function fmt(dateStr: string) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function StatusBadge({ endDate }: { endDate: string }) {
  const days = daysUntil(endDate);
  if (days < 0)  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Expired</span>;
  if (days <= 7) return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Expires in {days}d</span>;
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>;
}

/* ── Shared form state & helpers ── */
type FormState = {
  verticalName: string;
  businessType: string;
  freightBasis: string;
  tariffType: string;
  contractStartDate: string;
  contractEndDate: string;
  marginPct: string;
  billingDays: string;
  creditDays: string;
  invoiceFrequency: string;
  remarks: string;
  attachedMSA: string;
  attachedApprovalFiles: string[];
};

function formNeedsApproval(form: FormState): boolean {
  const pctNum     = parseFloat(form.marginPct);
  const marginHint = form.marginPct && !isNaN(pctNum) ? marginApprovalLabel(pctNum) : null;
  const billNum    = parseInt(form.billingDays || '0');
  const credNum    = parseInt(form.creditDays  || '0');
  const creditHint = (form.billingDays || form.creditDays) ? creditApprovalLabel(billNum, credNum) : null;
  return (
    (marginHint !== null && marginHint.label !== 'Auto approved') ||
    (creditHint !== null && creditHint.label !== '' && creditHint.label !== 'Auto approved')
  );
}

/* ── Shared form body ── */
function MSAFormFields({
  form, patch, verticalEditable = false, renewHint = false,
}: {
  form: FormState;
  patch: (f: Partial<FormState>) => void;
  verticalEditable?: boolean;
  renewHint?: boolean;
}) {
  const pctNum     = parseFloat(form.marginPct);
  const marginHint = form.marginPct && !isNaN(pctNum) ? marginApprovalLabel(pctNum) : null;
  const billNum    = parseInt(form.billingDays || '0');
  const credNum    = parseInt(form.creditDays  || '0');
  const creditHint = (form.billingDays || form.creditDays) ? creditApprovalLabel(billNum, credNum) : null;
  const needsApproval =
    (marginHint !== null && marginHint.label !== 'Auto approved') ||
    (creditHint !== null && creditHint.label !== '' && creditHint.label !== 'Auto approved');

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Vertical Name</label>
        <input
          value={form.verticalName}
          disabled={!verticalEditable}
          onChange={(e) => patch({ verticalName: e.target.value })}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange ${
            verticalEditable ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([
          ['Business Type', 'businessType', BUSINESS_TYPES],
          ['Freight Basis', 'freightBasis', FREIGHT_BASIS],
          ['Tariff Type',   'tariffType',   TARIFF_TYPES],
        ] as [string, keyof FormState, string[]][]).map(([label, key, opts]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
            <select value={form[key] as string} onChange={(e) => patch({ [key]: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange">
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Contract Start <span className="text-red-400">*</span></label>
          <input type="date" value={form.contractStartDate} onChange={(e) => patch({ contractStartDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Contract End <span className="text-red-400">*</span></label>
          <input type="date" value={form.contractEndDate} min={form.contractStartDate} onChange={(e) => patch({ contractEndDate: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        </div>
      </div>
      {renewHint && (
        <p className="text-[11px] text-amber-600 -mt-3">Enter new contract dates — all other details are pre-filled from the previous MSA.</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* Margin % */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Margin %</label>
          <div className="relative">
            <input type="number" min="0" value={form.marginPct} onChange={(e) => patch({ marginPct: e.target.value })} placeholder="0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
          </div>
          {marginHint && (
            <div className="mt-1">
              <p className={`text-[11px] font-medium ${marginHint.color}`}>→ {marginHint.label}</p>
              {marginHint.label === 'Auto approved'
                ? <p className="text-[11px] text-green-600 mt-0.5">✓ No approval files needed.</p>
                : <p className="text-[11px] text-red-500 mt-0.5">✗ Approval files required.</p>}
            </div>
          )}
        </div>
        {/* Billing Days */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Billing Days</label>
          <div className="relative">
            <input type="number" min="0" value={form.billingDays} onChange={(e) => patch({ billingDays: e.target.value })} placeholder="0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange pr-12" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Days</span>
          </div>
        </div>
        {/* Credit Days */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Credit Days</label>
          <div className="relative">
            <input type="number" min="0" value={form.creditDays} onChange={(e) => patch({ creditDays: e.target.value })} placeholder="0"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange pr-12" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Days</span>
          </div>
          {creditHint && (
            <div className="mt-1">
              <p className={`text-[11px] font-medium ${creditHint.color}`}>→ {creditHint.label}</p>
              {creditHint.label === 'Auto approved'
                ? <p className="text-[11px] text-green-600 mt-0.5">✓ No approval files needed.</p>
                : <p className="text-[11px] text-red-500 mt-0.5">✗ Approval files required.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Files */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Attach MSA <span className="text-slate-400 font-normal">(PDF, max 10MB)</span></label>
          <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 cursor-pointer hover:border-brand-orange transition text-sm text-slate-500">
            <span>📎</span><span>{form.attachedMSA || 'Choose file…'}</span>
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => patch({ attachedMSA: e.target.files?.[0]?.name ?? '' })} />
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Approval Files
            {needsApproval
              ? <span className="text-red-400 ml-1">* Required</span>
              : <span className="text-slate-400 font-normal ml-1">(optional)</span>}
          </label>
          <label className={`flex items-center gap-2 border border-dashed rounded-lg px-3 py-2.5 cursor-pointer transition text-sm ${
            needsApproval && form.attachedApprovalFiles.length === 0
              ? 'border-red-400 text-red-400 hover:border-red-500'
              : 'border-slate-300 text-slate-500 hover:border-brand-orange'
          }`}>
            <span>📎</span>
            <span>{form.attachedApprovalFiles.length ? `${form.attachedApprovalFiles.length} file(s)` : needsApproval ? 'Attach approval files…' : 'Choose files…'}</span>
            <input type="file" multiple className="hidden" onChange={(e) => patch({ attachedApprovalFiles: Array.from(e.target.files ?? []).map((f) => f.name) })} />
          </label>
          {needsApproval && form.attachedApprovalFiles.length === 0 && (
            <p className="text-[11px] text-red-500 mt-1">Approval files are mandatory for the selected margin / credit terms.</p>
          )}
        </div>
      </div>

      {/* Invoice Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Invoice Frequency <span className="text-slate-400 font-normal">(days)</span></label>
          <input type="number" min="0" value={form.invoiceFrequency} onChange={(e) => patch({ invoiceFrequency: e.target.value })} placeholder="e.g. 30"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        </div>
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Remarks <span className="text-slate-400 font-normal">(max 250 chars)</span></label>
        <textarea rows={3} maxLength={250} value={form.remarks} onChange={(e) => patch({ remarks: e.target.value })} placeholder="Enter remarks…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        <p className="text-[11px] text-slate-400 text-right">{form.remarks.length}/250</p>
      </div>
    </div>
  );
}

/* ── Past MSAs list (inside RenewModal) ── */
function PastMSAsList({ msas, onView }: { msas: MSA[]; onView: (m: MSA) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (msas.length === 0) return null;
  const shown = expanded ? msas : msas.slice(0, 3);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Past MSAs for this vertical</span>
        <span className="text-xs text-slate-400">{msas.length} record{msas.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {shown.map((m) => (
          <button key={m.id} onClick={() => onView(m)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-navy/5 transition group">
            <div className="shrink-0"><StatusBadge endDate={m.contractEndDate} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{fmt(m.contractStartDate)} → {fmt(m.contractEndDate)}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {m.freightBasis} · {m.tariffType} · Margin {m.marginPct}% · by {m.createdBy}
              </p>
            </div>
            <span className="text-xs text-brand-navy font-medium opacity-0 group-hover:opacity-100 transition shrink-0">View →</span>
          </button>
        ))}
      </div>
      {msas.length > 3 && (
        <button onClick={() => setExpanded((v) => !v)}
          className="w-full text-center py-2 text-xs text-brand-orange font-medium hover:bg-slate-50 transition border-t border-slate-100">
          {expanded ? 'Show less' : `Show ${msas.length - 3} more`}
        </button>
      )}
    </div>
  );
}

function FileChip({ filename }: { filename: string }) {
  return (
    <a
      href={`/api/msas/files/${encodeURIComponent(filename)}`}
      download={filename}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-brand-navy/5 hover:border-brand-navy/30 transition text-xs text-slate-700 font-medium"
    >
      <span>📄</span>
      <span className="truncate max-w-[180px]">{filename}</span>
      <span className="text-brand-navy shrink-0">↓</span>
    </a>
  );
}

/* ── View Info Modal (read-only) ── */
function ViewModal({ msa, onClose }: { msa: MSA; onClose: () => void }) {
  const infoRows: [string, string][] = [
    ['Vertical Name',     msa.verticalName],
    ['Business Type',     msa.businessType],
    ['Freight Basis',     msa.freightBasis],
    ['Tariff Type',       msa.tariffType],
    ['Contract Period',   `${fmt(msa.contractStartDate)} → ${fmt(msa.contractEndDate)}`],
    ['Margin',            `${msa.marginPct}%`],
    ['Billing Days',      msa.billingDays || '—'],
    ['Credit Days',       msa.creditDays  || '—'],
    ['Invoice Frequency', msa.invoiceFrequency ? `${msa.invoiceFrequency} days` : '—'],
    ['Remarks',           msa.remarks || '—'],
    ['Created By',        msa.createdBy],
    ['Created At',        fmt(msa.createdAt)],
  ];
  const hasApprovalFiles = msa.attachedApprovalFiles?.length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-slate-800">MSA Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">{msa.verticalName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-4 divide-y divide-slate-100">
          {infoRows.map(([label, value]) => (
            <div key={label} className="flex py-3 gap-4">
              <span className="text-xs text-slate-500 w-36 shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-slate-800 font-medium">{value}</span>
            </div>
          ))}

          {/* MSA File */}
          <div className="flex py-3 gap-4">
            <span className="text-xs text-slate-500 w-36 shrink-0 pt-0.5">Attached MSA</span>
            <div>
              {msa.attachedMSA
                ? <FileChip filename={msa.attachedMSA} />
                : <span className="text-sm text-slate-400">—</span>}
            </div>
          </div>

          {/* Approval Files */}
          <div className="flex py-3 gap-4">
            <span className="text-xs text-slate-500 w-36 shrink-0 pt-0.5">Approval Files</span>
            <div className="flex flex-col gap-1.5">
              {hasApprovalFiles
                ? msa.attachedApprovalFiles.map((f) => <FileChip key={f} filename={f} />)
                : <span className="text-sm text-slate-400">—</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Renew Modal ── */
function RenewModal({ msa, allMsas, onClose, onSaved }: {
  msa: MSA; allMsas: MSA[]; onClose: () => void; onSaved: (m: MSA) => void;
}) {
  const [form, setForm] = useState<FormState>({
    verticalName: msa.verticalName, businessType: msa.businessType,
    freightBasis: msa.freightBasis, tariffType: msa.tariffType,
    contractStartDate: '', contractEndDate: '',
    marginPct: msa.marginPct, billingDays: msa.billingDays,
    creditDays: msa.creditDays, invoiceFrequency: msa.invoiceFrequency,
    remarks: msa.remarks, attachedMSA: '', attachedApprovalFiles: [],
  });
  const [saving, setSaving]           = useState(false);
  const [historyView, setHistoryView] = useState<MSA | null>(null);
  const patch = (fields: Partial<FormState>) => setForm((f) => ({ ...f, ...fields }));

  const pastMsas = allMsas
    .filter((m) => m.verticalName === msa.verticalName && m.id !== msa.id)
    .sort((a, b) => b.contractStartDate.localeCompare(a.contractStartDate));

  const needsApproval = formNeedsApproval(form);
  const canSave = !!form.contractStartDate && !!form.contractEndDate && (!needsApproval || form.attachedApprovalFiles.length > 0);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch('/api/msas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active', createdAt: new Date().toISOString().slice(0, 10), createdBy: 'sales1@letstransport.in' }),
      });
      onSaved(await res.json());
    } finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Renew MSA</h2>
              <p className="text-xs text-slate-500 mt-0.5">{msa.verticalName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
          </div>
          <div className="px-6 py-5 space-y-5">
            <PastMSAsList msas={pastMsas} onView={setHistoryView} />
            <MSAFormFields form={form} patch={patch} renewHint />
          </div>
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSave} disabled={saving || !canSave}
              className="px-5 py-2 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : 'Save MSA'}
            </button>
          </div>
        </div>
      </div>
      {historyView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4">
          <ViewModal msa={historyView} onClose={() => setHistoryView(null)} />
        </div>
      )}
    </>
  );
}

/* ── Add MSA Modal (locked to an eligible vertical) ── */
function AddMSAModal({ vertical, onClose, onSaved }: {
  vertical: EligibleVertical; onClose: () => void; onSaved: (m: MSA) => void;
}) {
  const [form, setForm] = useState<FormState>({
    verticalName: vertical.verticalName, businessType: BUSINESS_TYPES[0],
    freightBasis: FREIGHT_BASIS[0], tariffType: TARIFF_TYPES[0],
    contractStartDate: '', contractEndDate: '',
    marginPct: '', billingDays: '', creditDays: '',
    invoiceFrequency: '', remarks: '', attachedMSA: '', attachedApprovalFiles: [],
  });
  const [saving, setSaving] = useState(false);
  const patch = (fields: Partial<FormState>) => setForm((f) => ({ ...f, ...fields }));

  const needsApproval = formNeedsApproval(form);
  const canSave = !!form.contractStartDate && !!form.contractEndDate && (!needsApproval || form.attachedApprovalFiles.length > 0);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch('/api/msas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active', createdAt: new Date().toISOString().slice(0, 10), createdBy: 'sales1@letstransport.in' }),
      });
      onSaved(await res.json());
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Add New MSA</h2>
            <p className="text-xs text-slate-500 mt-0.5">{vertical.group} · Sales Admin approved</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {/* Vertical context banner */}
        <div className="mx-6 mt-5 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <span className="text-green-600 text-base">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">{vertical.verticalName}</p>
            <p className="text-[11px] text-green-600 mt-0.5">
              Approved by {vertical.approvedBy} on {fmt(vertical.approvedAt)} · Draft {vertical.draftId}
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <MSAFormFields form={form} patch={patch} verticalEditable={false} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving || !canSave}
            className="px-5 py-2 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Add MSA'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Rate Card Tab ── */
function RateCardTab({ msas }: { msas: MSA[] }) {
  // Unique verticals from MSAs
  const verticals = Array.from(new Set(msas.map((m) => m.verticalName))).sort();

  const [selVertical, setSelVertical] = useState('');
  const [selMsaId,    setSelMsaId]    = useState('');
  const [rateCards,   setRateCards]   = useState<RateCard[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [csvName,     setCsvName]     = useState('');

  // MSAs for selected vertical
  const msasForVertical = msas
    .filter((m) => m.verticalName === selVertical)
    .sort((a, b) => b.contractStartDate.localeCompare(a.contractStartDate));

  const selectedMsa = msas.find((m) => m.id === selMsaId) ?? null;

  // Auto-select first MSA when vertical changes
  useEffect(() => {
    if (msasForVertical.length > 0) setSelMsaId(msasForVertical[0].id);
    else setSelMsaId('');
  }, [selVertical]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch rate cards when MSA selected
  useEffect(() => {
    if (!selVertical || !selMsaId) { setRateCards([]); return; }
    fetch(`/api/rate-cards?verticalName=${encodeURIComponent(selVertical)}&msaId=${selMsaId}`)
      .then((r) => r.json()).then(setRateCards).catch(() => {});
  }, [selVertical, selMsaId]);

  // MSA label: clientCode_DD-MM-YYYY_to_DD-MM-YYYY
  function msaLabel(m: MSA) {
    return `${m.clientCode}_${fmt(m.contractStartDate)}_to_${fmt(m.contractEndDate)}`;
  }

  function fmtDateTime(iso: string) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  async function handleUpload(file: File) {
    if (!selectedMsa) return;
    setUploading(true);
    try {
      const body = {
        verticalName: selVertical,
        msaId: selMsaId,
        rateCardCode: `${selectedMsa.clientCode}-${new Date().getFullYear()}-R${String(rateCards.length + 1).padStart(3, '0')}`,
        noOfLanes: 0,
        effectiveFrom: selectedMsa.contractStartDate,
        effectiveTo: selectedMsa.contractEndDate,
        status: 'Active',
        remarks: '',
        csvFile: file.name,
      };
      const res = await fetch('/api/rate-cards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const saved = await res.json();
      setRateCards((prev) => [...prev, saved]);
      setCsvName('');
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Selectors row */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Client Vertical */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Client Vertical</label>
            <select value={selVertical} onChange={(e) => setSelVertical(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange">
              <option value="">— Select vertical —</option>
              {verticals.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {/* MSA */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">MSA</label>
            <select value={selMsaId} onChange={(e) => setSelMsaId(e.target.value)}
              disabled={!selVertical}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange disabled:bg-slate-50 disabled:text-slate-400">
              {msasForVertical.map((m) => (
                <option key={m.id} value={m.id}>{msaLabel(m)}</option>
              ))}
              {msasForVertical.length === 0 && <option value="">— No MSAs —</option>}
            </select>
          </div>
          {/* Client Code (auto) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Client Code</label>
            <div className="flex gap-2">
              <input value={selectedMsa?.clientCode ?? ''} readOnly placeholder="Auto-fetched"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 font-mono" />
              {selectedMsa?.clientCode && (
                <button
                  onClick={() => navigator.clipboard.writeText(selectedMsa.clientCode)}
                  title="Copy client code"
                  className="px-3 py-2.5 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-100 transition text-sm">
                  ⧉
                </button>
              )}
            </div>
          </div>
          {/* Tariff Type (auto) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Tariff Type</label>
            <input value={selectedMsa?.tariffType ?? ''} readOnly placeholder="Auto-fetched"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700" />
          </div>
        </div>
      </div>

      {/* Actions — only when MSA is selected */}
      {selectedMsa && (
        <div className="grid grid-cols-2 gap-4">
          {/* Download template */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Download rate card template</p>
              <p className="text-xs text-slate-400 mt-0.5">.xlsx format · fill lane-wise pricing</p>
            </div>
            <a
              href={`/api/rate-cards/template/${selectedMsa.clientCode}.xlsx`}
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-navy text-white text-sm font-semibold hover:opacity-90 transition w-fit">
              ↓ Download
            </a>
          </div>
          {/* Upload CSV */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Upload rate card</p>
              <p className="text-xs text-slate-400 mt-0.5">Only .csv files · max 1 MB</p>
            </div>
            <div className="flex items-center gap-2">
              <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition w-fit ${uploading ? 'bg-slate-200 text-slate-400' : 'bg-brand-orange text-white hover:bg-orange-600'}`}>
                {uploading ? 'Uploading…' : '↑ Upload'}
                <input type="file" accept=".csv" className="hidden" disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setCsvName(f.name); handleUpload(f); }
                  }} />
              </label>
              {csvName && <span className="text-xs text-slate-500 truncate max-w-[160px]">{csvName}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Rate cards table */}
      {selectedMsa && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Rate Cards — {selVertical} + {msaLabel(selectedMsa)}
            </span>
            <span className="text-xs text-slate-400">{rateCards.length} record{rateCards.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Rate Card Code', 'No. of Lanes', 'Effective From', 'Effective To', 'Created At', 'Created By', 'Status', 'Remarks', 'Action (.csv)'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rateCards.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-slate-400 text-sm">No rate cards uploaded yet.</td></tr>
              )}
              {rateCards.map((rc) => (
                <tr key={rc.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-brand-navy">{rc.rateCardCode}</td>
                  <td className="px-4 py-3 text-slate-700 text-center">{rc.noOfLanes}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(rc.effectiveFrom)}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(rc.effectiveTo)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmtDateTime(rc.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[140px]">{rc.createdBy}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${rc.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {rc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px] truncate">{rc.remarks || '—'}</td>
                  <td className="px-4 py-3">
                    <a href={`/api/rate-cards/files/${encodeURIComponent(rc.csvFile)}`} download={rc.csvFile}
                      className="inline-flex items-center gap-1 text-xs text-brand-navy font-medium hover:underline">
                      ↓ Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selVertical && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-2">
          <span className="text-4xl">📋</span>
          <p className="text-slate-600 font-medium text-sm">Select a Client Vertical to view rate cards</p>
          <p className="text-slate-400 text-xs">Rate cards are managed at the Vertical + MSA level</p>
        </div>
      )}
    </div>
  );
}

/* ── Main ── */
export default function MSARateCard() {
  const [msas, setMsas]                     = useState<MSA[]>([]);
  const [eligibleVerticals, setEligible]    = useState<EligibleVertical[]>([]);
  const [tab, setTab]                       = useState<Tab>('msa-info');
  const [search, setSearch]                 = useState('');
  const [showAll, setShowAll]               = useState(false);
  const [viewTarget, setViewTarget]         = useState<MSA | null>(null);
  const [renewTarget, setRenewTarget]       = useState<MSA | null>(null);
  const [addTarget, setAddTarget]           = useState<EligibleVertical | null>(null);

  useEffect(() => {
    fetch('/api/msas').then((r) => r.json()).then(setMsas).catch(() => {});
    fetch('/api/msas/eligible-verticals').then((r) => r.json()).then(setEligible).catch(() => {});
  }, []);

  const q = search.toLowerCase().trim();
  const filteredMsas     = msas.filter((m) => m.verticalName.toLowerCase().includes(q));
  const filteredEligible = eligibleVerticals.filter((v) => !q || v.verticalName.toLowerCase().includes(q) || v.group.toLowerCase().includes(q));

  // Deduplicate MSA list — only show the latest record per vertical in the main table
  const latestByVertical = Object.values(
    filteredMsas.reduce<Record<string, MSA>>((acc, m) => {
      const existing = acc[m.verticalName];
      if (!existing || m.contractStartDate > existing.contractStartDate) acc[m.verticalName] = m;
      return acc;
    }, {})
  );

  function handleSaved(newMsa: MSA) {
    setMsas((prev) => [...prev, newMsa]);
    // Remove from eligible list if it was just added
    setEligible((prev) => prev.filter((v) => v.verticalName.toLowerCase() !== newMsa.verticalName.toLowerCase()));
    setRenewTarget(null);
    setAddTarget(null);
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header title="MSA / Rate Card" />
      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center gap-2 bg-brand-navy/5 border border-brand-navy/20 rounded-xl px-4 py-3">
          <span className="text-base">ℹ️</span>
          <p className="text-sm text-brand-navy font-medium">Note: This tab is for upcountry purposes only.</p>
        </div>

        <div className="flex gap-1 border-b border-slate-200">
          {([{ id: 'msa-info', label: 'MSA Info' }, { id: 'rate-card', label: 'Rate Card' }] as { id: Tab; label: string }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${tab === t.id ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'msa-info' && (() => {
          const expiringSoon = latestByVertical.filter((m) => { const d = daysUntil(m.contractEndDate); return d >= 1 && d <= 7; });
          const displayed    = showAll ? latestByVertical : expiringSoon;

          return (
            <div className="space-y-5">
              {/* Top controls — mirrors Rate Card selector card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {showAll ? 'All MSAs' : 'Expiring Soon'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {showAll
                        ? `${latestByVertical.length} vertical${latestByVertical.length !== 1 ? 's' : ''} · latest contract per vertical`
                        : `${expiringSoon.length} MSA${expiringSoon.length !== 1 ? 's' : ''} expiring within 7 days`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search vertical…"
                      className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange w-52" />
                    <button onClick={() => setShowAll((v) => !v)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${showAll ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-navy hover:text-brand-navy'}`}>
                      {showAll ? 'Show Expiring' : 'Show All'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expiring soon cards — like Rate Card action cards */}
              {!showAll && (
                expiringSoon.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-2">
                    <span className="text-4xl">✅</span>
                    <p className="text-slate-600 font-medium text-sm">No MSAs expiring in the next 7 days</p>
                    <p className="text-slate-400 text-xs">All contracts are in good standing</p>
                    <button onClick={() => setShowAll(true)}
                      className="mt-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:border-brand-navy hover:text-brand-navy transition">
                      View all MSAs →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {expiringSoon.map((m) => {
                      const days = daysUntil(m.contractEndDate);
                      return (
                        <div key={m.id} className="bg-white rounded-xl border border-amber-200 p-5 flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{m.verticalName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{fmt(m.contractStartDate)} → {fmt(m.contractEndDate)}</p>
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                              {days === 1 ? 'Expires tomorrow' : `Expires in ${days}d`}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-slate-400 mb-0.5">Business Type</p>
                              <p className="text-slate-700 font-medium">{m.businessType || '—'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 mb-0.5">Tariff Type</p>
                              <p className="text-slate-700 font-medium">{m.tariffType || '—'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 mb-0.5">Margin %</p>
                              <p className="text-slate-700 font-medium">{m.marginPct ? `${m.marginPct}%` : '—'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1 border-t border-slate-100">
                            <button onClick={() => setViewTarget(m)}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition text-center">
                              View Info
                            </button>
                            <button onClick={() => setRenewTarget(m)}
                              className="flex-1 px-3 py-2 rounded-lg bg-brand-navy text-white text-xs font-semibold hover:opacity-90 transition text-center">
                              Renew
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* All MSAs table — shown only when showAll */}
              {showAll && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">All MSAs</span>
                    <span className="text-xs text-slate-400">{displayed.length} vertical{displayed.length !== 1 ? 's' : ''}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vertical Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Latest Contract Period</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayed.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No MSAs found.</td></tr>
                      )}
                      {displayed.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{m.verticalName}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmt(m.contractStartDate)} → {fmt(m.contractEndDate)}</td>
                          <td className="px-4 py-3"><StatusBadge endDate={m.contractEndDate} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setViewTarget(m)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs font-medium hover:bg-slate-50 transition">
                                View Info
                              </button>
                              <button onClick={() => setRenewTarget(m)}
                                className="px-3 py-1.5 rounded-lg bg-brand-navy text-white text-xs font-semibold hover:opacity-90 transition">
                                Renew
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Eligible for New MSA */}
              {filteredEligible.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-green-50 border-b border-green-100 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-sm">✓</span>
                      <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Eligible for New MSA</span>
                      <span className="text-[11px] text-green-600 font-normal">— Sales Admin approved, no MSA yet</span>
                    </div>
                    <span className="text-xs text-green-600">{filteredEligible.length} vertical{filteredEligible.length !== 1 ? 's' : ''}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vertical Name</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Group</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Approved On</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEligible.map((v) => (
                        <tr key={v.id} className="hover:bg-green-50/40 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{v.verticalName}</td>
                          <td className="px-4 py-3 text-slate-500">{v.group}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{fmt(v.approvedAt)}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setAddTarget(v)}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition">
                              + Add MSA
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {tab === 'rate-card' && <RateCardTab msas={msas} />}
      </main>

      {viewTarget  && <ViewModal msa={viewTarget} onClose={() => setViewTarget(null)} />}
      {renewTarget && <RenewModal msa={renewTarget} allMsas={msas} onClose={() => setRenewTarget(null)} onSaved={handleSaved} />}
      {addTarget   && <AddMSAModal vertical={addTarget} onClose={() => setAddTarget(null)} onSaved={handleSaved} />}
    </div>
  );
}
