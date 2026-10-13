import { useEffect, useState, useCallback } from 'react';
import Header from '../components/Header';

interface City { id: string; name: string; }
interface MSA  { verticalName: string; }

const MIS_FREQUENCY_OPTS       = ['Custom', 'Weekly', 'Bi-weekly', 'Monthly'];
const INVOICE_FREQUENCY_OPTS   = ['Day wise', 'Weekly', 'Monthly'];
const INVOICE_TYPE_OPTS        = ['Soft Copy', 'Hard Copy', 'Both'];
const MIS_LEVEL_OPTS           = ['Trip', 'Route', 'City', 'Vertical'];
const INVOICE_LEVEL_OPTS       = ['Trip', 'Route', 'City', 'Vertical'];
const MIS_SUBMISSION_TYPE_OPTS = ['Client Approval Required', 'Auto Submit'];
const REF_DATE_OPTS            = ['LR date/Loading Date', 'Delivery Date', 'Invoice Date'];

interface FormState {
  partialInvoicing: boolean;
  partialMIS: boolean;
  misFrequency: string;
  invoiceFrequency: string;
  invoiceType: string;
  misLevel: string;
  invoiceLevel: string;
  mis: boolean;
  misSubmissionType: string;
  refDateRevenueControl: string;
  remarks: string;
}

const defaultForm = (): FormState => ({
  partialInvoicing:      false,
  partialMIS:            false,
  misFrequency:          MIS_FREQUENCY_OPTS[0],
  invoiceFrequency:      INVOICE_FREQUENCY_OPTS[0],
  invoiceType:           INVOICE_TYPE_OPTS[0],
  misLevel:              MIS_LEVEL_OPTS[0],
  invoiceLevel:          INVOICE_LEVEL_OPTS[0],
  mis:                   false,
  misSubmissionType:     MIS_SUBMISSION_TYPE_OPTS[0],
  refDateRevenueControl: REF_DATE_OPTS[0],
  remarks:               '',
});

function RadioField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            value ? 'bg-brand-orange' : 'bg-slate-200'
          }`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
        <span className={`text-xs font-medium ${value ? 'text-brand-orange' : 'text-slate-400'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function InvoiceMetadata() {
  const [cities,     setCities]     = useState<City[]>([]);
  const [msas,       setMsas]       = useState<MSA[]>([]);
  const [vertical,   setVertical]   = useState('');
  const [city,       setCity]       = useState('');
  const [form,       setForm]       = useState<FormState>(defaultForm());
  const [loaded,     setLoaded]     = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const [isDirty,    setIsDirty]    = useState(false);

  useEffect(() => {
    fetch('/api/hierarchy/cities').then((r) => r.json()).then(setCities).catch(() => {});
    fetch('/api/msas').then((r) => r.json()).then(setMsas).catch(() => {});
  }, []);

  const verticals = [...new Set(msas.map((m) => m.verticalName))].sort();

  const loadConfig = useCallback(async (v: string, c: string) => {
    setLoaded(false);
    setSaved(false);
    setIsDirty(false);
    const res  = await fetch(`/api/invoice-metadata?verticalName=${encodeURIComponent(v)}&city=${encodeURIComponent(c)}`);
    const data = await res.json();
    if (data.length > 0) {
      const rec = data[0];
      setForm({
        partialInvoicing:      rec.partialInvoicing      ?? false,
        partialMIS:            rec.partialMIS            ?? false,
        misFrequency:          rec.misFrequency          ?? MIS_FREQUENCY_OPTS[0],
        invoiceFrequency:      rec.invoiceFrequency      ?? INVOICE_FREQUENCY_OPTS[0],
        invoiceType:           rec.invoiceType           ?? INVOICE_TYPE_OPTS[0],
        misLevel:              rec.misLevel              ?? MIS_LEVEL_OPTS[0],
        invoiceLevel:          rec.invoiceLevel          ?? INVOICE_LEVEL_OPTS[0],
        mis:                   rec.mis                   ?? false,
        misSubmissionType:     rec.misSubmissionType     ?? MIS_SUBMISSION_TYPE_OPTS[0],
        refDateRevenueControl: rec.refDateRevenueControl ?? REF_DATE_OPTS[0],
        remarks:               rec.remarks               ?? '',
      });
      setIsExisting(true);
    } else {
      setForm(defaultForm());
      setIsExisting(false);
    }
    setLoaded(true);
  }, []);

  function handleVerticalChange(v: string) {
    setVertical(v); setLoaded(false); setSaved(false);
    if (v && city) loadConfig(v, city);
  }

  function handleCityChange(c: string) {
    setCity(c); setLoaded(false); setSaved(false);
    if (vertical && c) loadConfig(vertical, c);
  }

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
    setSaved(false);
    setIsDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch('/api/invoice-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verticalName: vertical, city, ...form }),
    });
    setSaving(false);
    setSaved(true);
    setIsExisting(true);
    setIsDirty(false);
  }

  const showForm = !!(vertical && city && loaded);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header title="Invoice Metadata" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Selectors */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Client Details</p>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Client Vertical</label>
              <select value={vertical} onChange={(e) => handleVerticalChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange">
                <option value="">— Select —</option>
                {verticals.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
              <select value={city} onChange={(e) => handleCityChange(e.target.value)}
                disabled={!vertical}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">— Select —</option>
                {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Metadata form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Metadata — {vertical} · {city}
              </p>
              {saved && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
            </div>

            {/* Row 1: 2 radios + 2 dropdowns */}
            <div className="grid grid-cols-4 gap-x-6 gap-y-5">
              <RadioField label="Partial Y/N for Invoicing" value={form.partialInvoicing}
                onChange={(v) => patch({ partialInvoicing: v })} />
              <RadioField label="Partial Y/N for MIS" value={form.partialMIS}
                onChange={(v) => patch({ partialMIS: v })} />
              <SelectField label="MIS Frequency" value={form.misFrequency} options={MIS_FREQUENCY_OPTS}
                onChange={(v) => patch({ misFrequency: v })} />
              <SelectField label="Invoice Frequency" value={form.invoiceFrequency} options={INVOICE_FREQUENCY_OPTS}
                onChange={(v) => patch({ invoiceFrequency: v })} />
            </div>

            {/* Row 2: 3 dropdowns + 1 radio */}
            <div className="grid grid-cols-4 gap-x-6 gap-y-5">
              <SelectField label="Invoice Type" value={form.invoiceType} options={INVOICE_TYPE_OPTS}
                onChange={(v) => patch({ invoiceType: v })} />
              <SelectField label="MIS Level" value={form.misLevel} options={MIS_LEVEL_OPTS}
                onChange={(v) => patch({ misLevel: v })} />
              <SelectField label="Invoice Level" value={form.invoiceLevel} options={INVOICE_LEVEL_OPTS}
                onChange={(v) => patch({ invoiceLevel: v })} />
              <RadioField label="MIS" value={form.mis}
                onChange={(v) => patch({ mis: v })} />
            </div>

            {/* Row 3: 2 dropdowns + remarks (spans 2 cols) */}
            <div className="grid grid-cols-4 gap-x-6 gap-y-5">
              <SelectField label="MIS Submission Type" value={form.misSubmissionType} options={MIS_SUBMISSION_TYPE_OPTS}
                onChange={(v) => patch({ misSubmissionType: v })} />
              <SelectField label="Reference Date for Revenue Control" value={form.refDateRevenueControl} options={REF_DATE_OPTS}
                onChange={(v) => patch({ refDateRevenueControl: v })} />
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Remarks</label>
                <textarea value={form.remarks} rows={3}
                  onChange={(e) => patch({ remarks: e.target.value })}
                  placeholder="Add any notes…"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange resize-none" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-brand-orange text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                {saving ? 'Saving…' : isExisting && isDirty ? 'Submit Changes' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}

        {!vertical && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-4xl">🧾</span>
            <p className="text-slate-600 font-medium text-sm">Select a Vertical and City to configure</p>
            <p className="text-slate-400 text-xs">Invoice metadata is configured per vertical + city combination</p>
          </div>
        )}

      </main>
    </div>
  );
}
