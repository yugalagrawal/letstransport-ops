import { useEffect, useState, useCallback } from 'react';
import Header from '../components/Header';

interface City { id: string; name: string; }
interface MSA  { verticalName: string; }

const SOFT_COPY_OPTIONS = ['Portal', 'Non-Portal', 'NA-Hardcopy'];

const DOC_FIELDS: { key: string; label: string }[] = [
  { key: 'pod',              label: 'POD (Proof of Delivery)' },
  { key: 'clientTaxInvoice', label: 'Client Tax Invoice' },
  { key: 'tollSlip',         label: 'Toll Slip' },
  { key: 'parkingSlip',      label: 'Parking Slip' },
  { key: 'gatePass',         label: 'Gate Pass' },
  { key: 'loadingReceipt',   label: 'Loading Receipt (LR)' },
  { key: 'eWayBill',         label: 'E-Way Bill' },
  { key: 'bhansar',          label: 'Bhansar Slip' },
  { key: 'grn',              label: 'GRN (Goods Received Note)' },
  { key: 'tripsheet',        label: 'Tripsheet' },
  { key: 'satisfactionSlip', label: 'Satisfaction Slip' },
  { key: 'weighSlip',        label: 'Weigh Slip' },
];

type DocValues = Record<string, boolean>;
const defaultDocs = (): DocValues => Object.fromEntries(DOC_FIELDS.map((f) => [f.key, false]));

export default function PODMetadata() {
  const [cities,   setCities]   = useState<City[]>([]);
  const [msas,     setMsas]     = useState<MSA[]>([]);
  const [vertical, setVertical] = useState('');
  const [city,     setCity]     = useState('');
  const [softCopy, setSoftCopy] = useState(SOFT_COPY_OPTIONS[0]);
  const [docs,     setDocs]     = useState<DocValues>(defaultDocs());
  const [loaded,   setLoaded]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
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
    const res  = await fetch(`/api/pod-metadata?verticalName=${encodeURIComponent(v)}&city=${encodeURIComponent(c)}`);
    const data = await res.json();
    if (data.length > 0) {
      const rec = data[0];
      setSoftCopy(rec.softCopy ?? SOFT_COPY_OPTIONS[0]);
      const d = defaultDocs();
      DOC_FIELDS.forEach((f) => { d[f.key] = rec[f.key] ?? false; });
      setDocs(d);
      setIsExisting(true);
    } else {
      setSoftCopy(SOFT_COPY_OPTIONS[0]);
      setDocs(defaultDocs());
      setIsExisting(false);
    }
    setIsDirty(false);
    setLoaded(true);
  }, []);

  function handleVerticalChange(v: string) {
    setVertical(v);
    setLoaded(false);
    setSaved(false);
    if (v && city) loadConfig(v, city);
  }

  function handleCityChange(c: string) {
    setCity(c);
    setLoaded(false);
    setSaved(false);
    if (vertical && c) loadConfig(vertical, c);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const body = { verticalName: vertical, city, softCopy, ...docs };
    await fetch('/api/pod-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setIsExisting(true);
    setIsDirty(false);
  }

  const showForm = !!(vertical && city && loaded);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header title="POD Metadata++" />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">

        <div className="flex items-center gap-2 bg-brand-navy/5 border border-brand-navy/20 rounded-xl px-4 py-3">
          <span className="text-base">ℹ️</span>
          <p className="text-sm text-brand-navy font-medium">Note: This module is for upcountry purposes only.</p>
        </div>

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

        {/* Metadata config */}
        {showForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Metadata — {vertical} · {city}
              </p>
              {saved && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Soft Copy Submission</label>
              <select value={softCopy} onChange={(e) => { setSoftCopy(e.target.value); setSaved(false); setIsDirty(true); }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange">
                {SOFT_COPY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-4 gap-x-6 gap-y-5">
              {DOC_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-600">{f.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setDocs((p) => ({ ...p, [f.key]: !p[f.key] })); setSaved(false); setIsDirty(true); }}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        docs[f.key] ? 'bg-brand-orange' : 'bg-slate-200'
                      }`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        docs[f.key] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-xs font-medium ${docs[f.key] ? 'text-brand-orange' : 'text-slate-400'}`}>
                      {docs[f.key] ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              ))}
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
            <span className="text-4xl">📋</span>
            <p className="text-slate-600 font-medium text-sm">Select a Vertical and City to configure</p>
            <p className="text-slate-400 text-xs">POD metadata is configured per vertical + city combination</p>
          </div>
        )}

      </main>
    </div>
  );
}
