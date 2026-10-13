import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { HubForm, InfoField, OPMHubDetails } from './OPMApprovals';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface DraftStep { [key: string]: string | undefined; }

export type PricingType = 'od' | 'schedule';

export interface Pricing {
  id:   string;
  type: PricingType;
  /* OD Pricing */
  odName?:        string;
  odHub?:         string;
  odVehicle?:     string;
  odPrice?:       string;
  odCutOffKms?:   string;
  odExtraKmRate?: string;
  odHours?:       string;
  odMinutes?:     string;
  odOvertime?:    string;
  /* Schedule Vehicle Costing */
  schedName?:        string;
  schedPricingType?: string;   // Monthly | Daily | Weekly
  schedVehicleType?: string;
  schedPaymentMode?: string;
  schedFullMonth?:   boolean;
  schedDaysInMonth?: string;   // when full month is OFF
  schedWeeklyDays?:  string[]; // ['Su','Mo',...]
  schedHubExtraKm?:  boolean;
  schedParameters?:  string[]; // multi-select parameters
  schedParamValues?: Record<string, Record<string, string>>; // param → {fieldKey → value}
  /* meta */
  createdAt: string;
}

interface Draft {
  id: string;
  createdAt: string; updatedAt: string; createdBy: string;
  opmApprovedAt?: string;
  steps: {
    group?:       DraftStep;
    legalEntity?: DraftStep;
    vertical?:    DraftStep;
    stateGstin?:  DraftStep;
    poc?:         DraftStep;
    city?:        DraftStep;
    commercial?:  DraftStep;
  };
  opmStatus:        string | null;
  opmHubDetails?:   OPMHubDetails;
  opmHubs?:         OPMHubDetails[];
  pricings?:        Pricing[];
  salesAdminStatus: string | null;
  bizFinStatus:     string | null;
}

type View = 'list' | 'viewClient' | 'addHub' | 'editHub' | 'addPricing' | 'editPricing';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const VEHICLE_TYPE_OPTIONS = [
  '2W',
  '3W / E-3W',
  '0.5 TON-TATA ACE',
  '0.75 TON-TATA ACE GOLD',
  '1 TON-TATA ACE HT',
  '1.25 TON-ASHOK LEYLAND DOST',
  '1.5 TON-MAHINDRA SUPRO',
  '2.1 TON-TATA 207',
  '2.5 TON-TATA 407',
  '3.5 TON-TATA 709',
  '5 TON-EICHER 10.90',
  '7 TON-TATA 1109',
  '9 TON-TATA 1512',
  '10 TON-TATA 1615',
  '14 TON-TATA 1715',
  '15 TON-EICHER 20.16',
  '16 TON-24 FEET TRUCK',
  '21 TON-32 FEET',
  '25 TON-40 FEET CONTAINER',
  '30 TON-TRAILER',
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function initials(name?: string) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function getHubs(draft: Draft): OPMHubDetails[] {
  if (draft.opmHubs && draft.opmHubs.length > 0) return draft.opmHubs;
  if (draft.opmHubDetails) return [draft.opmHubDetails];
  return [];
}
function getPricings(draft: Draft): Pricing[] {
  return draft.pricings ?? [];
}
function uid() {
  return `P-${Date.now().toString(36).toUpperCase()}`;
}

/* ─── Pricing Form ───────────────────────────────────────────────────────── */
const HOURS_OPTS   = Array.from({ length: 24 }, (_, i) => String(i + 1));
const MINUTES_OPTS = ['00', '15', '30', '45'];

const SCHED_PARAMETERS_OPTIONS = [
  'Fixed Distance Charges Monthly',
  'Fixed Distance Charges',
  'Labour Amount Charge',
  'Fixed Distance Monthly',
  'Per Unit Rate Monthly',
  'Per Unit Rate',
  'Client Flexible Amount',
  'Extra Km Rate',
  'Base Fare Monthly',
  'Base Fare Daily',
  'Working Hours',
  'Overtime Rate',
  'Fixed Distance Daily',
  'Labour Amount',
];

type ParamField = { key: string; label: string; placeholder: string; unit?: string };
const PARAM_FIELDS: Record<string, ParamField[]> = {
  'Fixed Distance Charges Monthly': [{ key: 'rate', label: 'Rate (₹)', placeholder: 'e.g. 500' }, { key: 'distanceKm', label: 'Distance (km)', placeholder: 'e.g. 100' }],
  'Fixed Distance Charges':         [{ key: 'rate', label: 'Rate (₹)', placeholder: 'e.g. 500' }, { key: 'distanceKm', label: 'Distance (km)', placeholder: 'e.g. 100' }],
  'Fixed Distance Monthly':         [{ key: 'rate', label: 'Rate (₹)', placeholder: 'e.g. 500' }, { key: 'distanceKm', label: 'Distance (km)', placeholder: 'e.g. 100' }],
  'Fixed Distance Daily':           [{ key: 'rate', label: 'Rate (₹)', placeholder: 'e.g. 200' }, { key: 'distanceKm', label: 'Distance (km)', placeholder: 'e.g. 50' }],
  'Labour Amount Charge':           [{ key: 'amount', label: 'Amount (₹)', placeholder: 'e.g. 300' }],
  'Labour Amount':                  [{ key: 'amount', label: 'Amount (₹)', placeholder: 'e.g. 300' }],
  'Per Unit Rate Monthly':          [{ key: 'rate', label: 'Rate (₹/unit)', placeholder: 'e.g. 10' }, { key: 'unitLabel', label: 'Unit Label', placeholder: 'e.g. parcel' }],
  'Per Unit Rate':                  [{ key: 'rate', label: 'Rate (₹/unit)', placeholder: 'e.g. 10' }, { key: 'unitLabel', label: 'Unit Label', placeholder: 'e.g. parcel' }],
  'Client Flexible Amount':         [{ key: 'amount', label: 'Amount (₹)', placeholder: 'e.g. 1000' }],
  'Extra Km Rate':                  [{ key: 'rate', label: 'Rate (₹/km)', placeholder: 'e.g. 8' }, { key: 'freeKm', label: 'Free KM Limit', placeholder: 'e.g. 20' }],
  'Base Fare Monthly':              [{ key: 'fare', label: 'Base Fare (₹)', placeholder: 'e.g. 15000' }],
  'Base Fare Daily':                [{ key: 'fare', label: 'Base Fare (₹)', placeholder: 'e.g. 600' }],
  'Working Hours':                  [{ key: 'hours', label: 'Hours', placeholder: 'e.g. 8' }, { key: 'minutes', label: 'Minutes', placeholder: 'e.g. 30' }],
  'Overtime Rate':                  [{ key: 'rate', label: 'Rate (₹/hr)', placeholder: 'e.g. 50' }],
};

function PricingForm({
  draft, onBack, onSave, submitting, initialPricing,
}: {
  draft:           Draft;
  onBack:          () => void;
  onSave:          (p: Pricing) => void;
  submitting:      boolean;
  initialPricing?: Pricing;
}) {
  const g   = draft.steps.group;
  const le  = draft.steps.legalEntity;
  const poc = draft.steps.poc;
  const hubs = getHubs(draft);
  const isEdit = !!initialPricing;

  const [type, setType] = useState<PricingType>(initialPricing?.type ?? 'od');

  /* ── OD fields ── */
  const [odName,        setOdName]        = useState(initialPricing?.odName        ?? '');
  const [odHub,         setOdHub]         = useState(initialPricing?.odHub         ?? '');
  const [odVehicle,     setOdVehicle]     = useState(initialPricing?.odVehicle     ?? '');
  const [odPrice,       setOdPrice]       = useState(initialPricing?.odPrice       ?? '');
  const [odCutOffKms,   setOdCutOffKms]   = useState(initialPricing?.odCutOffKms   ?? '');
  const [odExtraKmRate, setOdExtraKmRate] = useState(initialPricing?.odExtraKmRate ?? '');
  const [odHours,       setOdHours]       = useState(initialPricing?.odHours       ?? '');
  const [odMinutes,     setOdMinutes]     = useState(initialPricing?.odMinutes     ?? '00');
  const [odOvertime,    setOdOvertime]    = useState(initialPricing?.odOvertime    ?? '');

  /* ── Schedule fields ── */
  const [schedName,        setSchedName]        = useState(initialPricing?.schedName        ?? '');
  const [schedPricingType, setSchedPricingType] = useState(initialPricing?.schedPricingType ?? '');
  const [schedVehicleType, setSchedVehicleType] = useState(initialPricing?.schedVehicleType ?? '');
  const [schedPaymentMode, setSchedPaymentMode] = useState(initialPricing?.schedPaymentMode ?? '');
  const [schedFullMonth,   setSchedFullMonth]   = useState(initialPricing?.schedFullMonth   ?? true);
  const [schedDaysInMonth, setSchedDaysInMonth] = useState(initialPricing?.schedDaysInMonth ?? '');
  const [schedWeeklyDays,  setSchedWeeklyDays]  = useState<string[]>(initialPricing?.schedWeeklyDays ?? []);
  const [schedHubExtraKm,  setSchedHubExtraKm]  = useState(initialPricing?.schedHubExtraKm  ?? false);
  const [schedParameters,  setSchedParameters]  = useState<string[]>(
    Array.isArray(initialPricing?.schedParameters)
      ? initialPricing.schedParameters
      : (initialPricing?.schedParameters ? [initialPricing.schedParameters as unknown as string] : [])
  );
  const [schedParamValues, setSchedParamValues] = useState<Record<string, Record<string, string>>>(
    initialPricing?.schedParamValues ?? {}
  );

  function setParamField(param: string, field: string, val: string) {
    setSchedParamValues(prev => ({ ...prev, [param]: { ...(prev[param] ?? {}), [field]: val } }));
  }

  const [odNameEdited,    setOdNameEdited]    = useState(!!initialPricing?.odName);
  const [schedNameEdited, setSchedNameEdited] = useState(!!initialPricing?.schedName);

  /* Auto-generate default names unless user has manually edited */
  useEffect(() => {
    if (odNameEdited) return;
    const v = odVehicle ? odVehicle.split('-')[0].trim().replace(/\s+/g, '') : '';
    const p = odPrice   ? odPrice.trim() : '';
    setOdName(v && p ? `OD-${v}-${p}` : v ? `OD-${v}` : '');
  }, [odVehicle, odPrice, odNameEdited]);

  useEffect(() => {
    if (schedNameEdited) return;
    const v = schedVehicleType ? schedVehicleType.split('-')[0].trim().replace(/\s+/g, '') : '';
    const t = schedPricingType ?? '';
    setSchedName(v && t ? `SVC-${v}-${t}` : v ? `SVC-${v}` : '');
  }, [schedVehicleType, schedPricingType, schedNameEdited]);

  const [confirming, setConfirming] = useState(false);

  function switchType(t: PricingType) { setType(t); setConfirming(false); }

  const canSave = type === 'od'
    ? odVehicle !== '' && odPrice !== ''
    : schedVehicleType !== '' && schedPricingType !== '';

  function toggleDay(d: string) {
    setSchedWeeklyDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  }

  function buildPricing(): Pricing {
    return {
      id:        initialPricing?.id ?? uid(),
      type,
      ...(type === 'od' ? { odName, odHub, odVehicle, odPrice, odCutOffKms, odExtraKmRate, odHours, odMinutes, odOvertime } : {}),
      ...(type === 'schedule' ? {
        schedName, schedPricingType, schedVehicleType, schedPaymentMode,
        schedFullMonth, ...(!schedFullMonth && schedDaysInMonth ? { schedDaysInMonth } : {}),
        schedWeeklyDays, schedHubExtraKm,
        ...(schedHubExtraKm && schedParameters.length > 0 ? { schedParameters, schedParamValues } : {}),
      } : {}),
      createdAt: initialPricing?.createdAt ?? new Date().toISOString(),
    };
  }

  const typeLabel  = type === 'od' ? 'OD Pricing' : 'Schedule Vehicle Costing';
  const vehicleVal = type === 'od' ? odVehicle : schedVehicleType;

  /* Hub options: ALL HUBS + each individual hub name */
  const hubOptions = ['ALL HUBS', ...hubs.map(h => h.hubName)];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-brand-navy text-sm transition-colors flex items-center gap-1.5 shrink-0">
          ← {g?.name ?? 'Client'}
        </button>
        <span className="text-slate-200 shrink-0">|</span>
        <span className="text-sm font-semibold text-brand-navy truncate">{g?.name ?? 'Client'}</span>
        <span className="ml-auto shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
          {isEdit ? 'Edit Pricing' : 'Add Pricing'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-5 space-y-7">

        {/* Client info strip */}
        <div className="grid grid-cols-4 gap-x-6 gap-y-3 pb-5 border-b border-slate-100">
          <InfoField label="Group Name"   value={g?.name} />
          <InfoField label="Legal Entity" value={le?.name} />
          <InfoField label="Ops POC"      value={poc?.opsName} />
          <InfoField label="Ops Phone"    value={poc?.opsPhone} />
        </div>

        {/* Pricing type selector */}
        <div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Pricing Type <span className="text-red-400">*</span></p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'od',       label: 'OD Pricing',              desc: 'On-demand — base price + km overage + overtime'  },
              { key: 'schedule', label: 'Schedule Vehicle Costing', desc: 'Dedicated vehicles on scheduled shifts'          },
            ] as { key: PricingType; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <button key={key} onClick={() => switchType(key)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  type === key ? 'border-brand-navy bg-brand-navy/5' : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}>
                <div className={`text-sm font-bold mb-0.5 ${type === key ? 'text-brand-navy' : 'text-slate-700'}`}>
                  {type === key && <span className="mr-1.5 text-brand-orange">●</span>}{label}
                </div>
                <div className="text-[10px] text-slate-400">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── OD Pricing fields ── */}
        {type === 'od' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">OD Pricing Details</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="space-y-3">

              {/* Row 1: Vehicle + Price */}
              <div className="grid grid-cols-[1.6fr_1fr] gap-4">
                <SearchableVehicleSelect label="Vehicle" value={odVehicle} onChange={setOdVehicle} required />
                <NumField label="Price (₹)" value={odPrice} onChange={setOdPrice} placeholder="e.g. 1000" hint="Base price" required />
              </div>

              {/* Row 2: Cut Off + Extra Km Rate + Overtime */}
              <div className="grid grid-cols-3 gap-4">
                <NumField label="Cut Off (kms)"          value={odCutOffKms}   onChange={setOdCutOffKms}   placeholder="e.g. 20" hint="Free km limit" />
                <NumField label="Extra Km Rate (₹/km)"   value={odExtraKmRate} onChange={setOdExtraKmRate} placeholder="e.g. 5"  hint="Rate beyond cutoff" />
                <NumField label="Overtime (₹/hr)"        value={odOvertime}    onChange={setOdOvertime}    placeholder="e.g. 1"  hint="Rate per overtime hour" />
              </div>

              {/* Row 3: Hours + Minutes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hours</label>
                  <SelectField value={odHours} onChange={setOdHours} options={HOURS_OPTS} placeholder="Select hours" />
                  <p className="text-[10px] text-slate-400 mt-1">Shift duration</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Minutes</label>
                  <SelectField value={odMinutes} onChange={setOdMinutes} options={MINUTES_OPTS} placeholder="Select minutes" />
                </div>
              </div>

              {/* Row 4: Pricing Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Pricing Name
                  <span className="ml-2 text-[10px] font-normal text-slate-400">Auto-generated · editable</span>
                </label>
                <input type="text" value={odName}
                  onChange={e => { setOdName(e.target.value); setOdNameEdited(true); }}
                  placeholder="e.g. OD-2W-500"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition font-mono" />
              </div>

            </div>
          </div>
        )}

        {/* ── Schedule Vehicle Costing fields ── */}
        {type === 'schedule' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Schedule Costing Details</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="space-y-3">

              {/* Row 1: Pricing Type + Vehicle Type */}
              <div className="grid grid-cols-[1fr_1.6fr] gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pricing Type <span className="text-red-400">*</span></label>
                  <SelectField value={schedPricingType} onChange={setSchedPricingType}
                    options={['Monthly', 'Daily', 'Weekly']} placeholder="Select type" />
                </div>
                <SearchableVehicleSelect value={schedVehicleType} onChange={setSchedVehicleType} required />
              </div>

              {/* Row 2: Payment Mode + Weekly Days + Full Month toggle */}
              <div className="flex items-end gap-4">
                <div className="w-36 shrink-0">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Mode</label>
                  <SelectField value={schedPaymentMode} onChange={setSchedPaymentMode}
                    options={['Cash', 'Online', 'NEFT', 'Credit']} placeholder="Mode" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Weekly Days</label>
                  <div className="flex gap-1.5">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <button key={d} onClick={() => toggleDay(d)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold border transition-all ${
                          schedWeeklyDays.includes(d)
                            ? 'bg-brand-navy text-white border-brand-navy'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Month</label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 h-[42px]">
                    <button onClick={() => { setSchedFullMonth(p => !p); setSchedDaysInMonth(''); }}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${schedFullMonth ? 'bg-green-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${schedFullMonth ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    {!schedFullMonth && (
                      <input type="number" min="1" max="31" value={schedDaysInMonth}
                        onChange={e => setSchedDaysInMonth(e.target.value)}
                        placeholder="days"
                        className="w-14 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-navy/30" />
                    )}
                  </div>
                </div>
              </div>

              {/* Row 5: Hub Level Extra KM toggle */}
              <div className={`border-2 rounded-xl px-4 py-3 transition-colors ${schedHubExtraKm ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Hub Level Extra KM (Distance) Calculation</span>
                  <button onClick={() => setSchedHubExtraKm(p => !p)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${schedHubExtraKm ? 'bg-brand-orange' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${schedHubExtraKm ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Row 6: Parameters (only when Hub Extra KM is on) */}
              {schedHubExtraKm && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Parameters
                    {schedParameters.length > 0 && (
                      <span className="ml-2 text-[10px] font-normal text-brand-navy bg-brand-navy/10 px-1.5 py-0.5 rounded-full">
                        {schedParameters.length} selected
                      </span>
                    )}
                  </label>
                  {/* Checkbox list */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                      {SCHED_PARAMETERS_OPTIONS.map(opt => {
                        const checked = schedParameters.includes(opt);
                        const fields  = PARAM_FIELDS[opt] ?? [];
                        return (
                          <div key={opt}>
                            <label className={`flex items-center gap-2.5 px-3.5 py-2 cursor-pointer transition-colors text-xs ${
                              checked ? 'bg-brand-navy/5 text-brand-navy font-semibold' : 'text-slate-700 hover:bg-slate-50'
                            }`}>
                              <input type="checkbox" checked={checked}
                                onChange={() =>
                                  setSchedParameters(prev =>
                                    prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]
                                  )
                                }
                                className="w-3.5 h-3.5 accent-brand-navy cursor-pointer" />
                              {opt}
                            </label>
                            {checked && fields.length > 0 && (
                              <div className={`px-4 pb-3 pt-1 bg-brand-navy/5 grid gap-3 ${fields.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {fields.map(f => (
                                  <div key={f.key}>
                                    <label className="block text-[10px] font-semibold text-brand-navy mb-1">{f.label}</label>
                                    <input type="text"
                                      value={schedParamValues[opt]?.[f.key] ?? ''}
                                      onChange={e => setParamField(opt, f.key, e.target.value)}
                                      placeholder={f.placeholder}
                                      className="w-full border border-brand-navy/20 bg-white rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Name (auto-generated after all params) */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Pricing Name
                  <span className="ml-2 text-[10px] font-normal text-slate-400">Auto-generated · editable</span>
                </label>
                <input type="text" value={schedName}
                  onChange={e => { setSchedName(e.target.value); setSchedNameEdited(true); }}
                  placeholder="e.g. SVC-2W-Monthly"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition font-mono" />
              </div>

            </div>
          </div>
        )}

        <div className="h-4" />
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!canSave || submitting}
            className="w-full bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            {canSave
              ? (isEdit ? '✓ Save Changes' : '✓ Save Pricing')
              : type === 'od' ? 'Select Hub, Vehicle & Price to continue' : 'Select Vehicle Type & Pricing Type'
            }
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {isEdit ? 'Update' : 'Add'} <strong>{typeLabel}</strong> for <strong>{g?.name}</strong>
              {type === 'od' && <> — Vehicle: <strong>{odVehicle}</strong>, Price: <strong>₹{odPrice}</strong></>}
              {type === 'schedule' && <> — <strong>{schedVehicleType || '—'}</strong>, {schedPricingType}{schedName ? `, "${schedName}"` : ''}</>}
              . Sure?
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} className="px-4 text-sm text-slate-400 hover:text-slate-700 py-2 rounded-xl">Cancel</button>
              <button onClick={() => onSave(buildPricing())} disabled={submitting}
                className="flex-1 bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {submitting ? 'Saving…' : isEdit ? '✓ Yes, Update' : '✓ Yes, Add Pricing'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable inputs ────────────────────────────────────────────────────── */
function NumField({ label, value, onChange, placeholder, hint, required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input type="number" min="0" step="any" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition" />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition bg-white appearance-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─── Searchable Vehicle Select ──────────────────────────────────────────── */
function SearchableVehicleSelect({ value, onChange, label = 'Vehicle Type', required }: {
  value: string; onChange: (v: string) => void;
  label?: string; required?: boolean;
}) {
  const [query,      setQuery]      = useState('');
  const [open,       setOpen]       = useState(false);
  const [othersMode, setOthersMode] = useState(false);
  const [othersVal,  setOthersVal]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef  = useRef<HTMLDivElement>(null);

  // If value doesn't match any preset, we're in others mode on mount
  useEffect(() => {
    if (value && !VEHICLE_TYPE_OPTIONS.includes(value)) {
      setOthersMode(true);
      setOthersVal(value);
    }
  }, []);

  const filtered = VEHICLE_TYPE_OPTIONS.filter(v =>
    v.toLowerCase().includes(query.toLowerCase())
  );

  function select(v: string) {
    onChange(v);
    setQuery('');
    setOpen(false);
    setOthersMode(false);
  }

  function selectOthers() {
    setOthersMode(true);
    setOpen(false);
    setQuery('');
    setOthersVal('');
    onChange('');
  }

  function commitOthers() {
    if (othersVal.trim()) onChange(othersVal.trim());
  }

  function clearOthers() {
    setOthersMode(false);
    setOthersVal('');
    onChange('');
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {othersMode ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={othersVal}
            onChange={e => { setOthersVal(e.target.value); onChange(e.target.value.trim()); }}
            onBlur={commitOthers}
            placeholder="Type vehicle type…"
            className="flex-1 border border-brand-orange rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition"
          />
          <button onClick={clearOthers}
            className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg transition">
            ✕
          </button>
        </div>
      ) : (
        <div className="relative" ref={dropRef}>
          <div
            onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between cursor-pointer transition ${
              value ? 'border-brand-navy text-slate-800 bg-white' : 'border-slate-300 text-slate-400 bg-white'
            } ${open ? 'ring-2 ring-brand-navy/20 border-brand-navy' : 'hover:border-slate-400'}`}>
            <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>
              {value || 'Search or select vehicle type…'}
            </span>
            <span className="text-slate-400 text-xs ml-2">{open ? '▲' : '▼'}</span>
          </div>

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {/* Search input */}
              <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type to search…"
                  className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition"
                />
              </div>
              {/* Options list */}
              <div className="max-h-52 overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-xs text-slate-400 text-center">No matches</div>
                )}
                {filtered.map(v => (
                  <button key={v} onClick={() => select(v)}
                    className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors ${
                      value === v ? 'bg-brand-navy/5 text-brand-navy font-semibold' : 'text-slate-700'
                    }`}>
                    {v}
                  </button>
                ))}
                {/* Others option */}
                <button onClick={selectOthers}
                  className="w-full text-left px-4 py-2.5 text-xs text-brand-orange font-semibold hover:bg-brand-orange/5 transition-colors border-t border-slate-100">
                  + Others (type manually)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {value && !othersMode && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] text-green-600 font-medium">✓ {value}</span>
          <button onClick={() => onChange('')} className="text-[10px] text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}
    </div>
  );
}

/* ─── Pricing Tile ───────────────────────────────────────────────────────── */
function PricingTile({ pricing, onEdit }: { pricing: Pricing; onEdit: () => void }) {
  const isOD  = pricing.type === 'od';
  const label = isOD ? 'OD Pricing' : 'Schedule VC';
  const color = isOD ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700';

  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-4 flex-1 space-y-1.5">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${color}`}>{label}</span>

        {isOD ? (
          <>
            <div className="text-sm font-bold text-slate-800 mt-1.5">₹{pricing.odPrice || '—'}</div>
            <div className="text-xs text-slate-500">{pricing.odVehicle || '—'}</div>
            <div className="text-[10px] text-slate-400">{pricing.odHub || '—'}</div>
            {pricing.odCutOffKms && (
              <div className="text-[10px] text-slate-400">
                Cutoff: {pricing.odCutOffKms} km · ₹{pricing.odExtraKmRate || '—'}/km extra
              </div>
            )}
            {pricing.odHours && (
              <div className="text-[10px] text-slate-400">
                {pricing.odHours}h {pricing.odMinutes && pricing.odMinutes !== '00' ? `${pricing.odMinutes}m` : ''} shift
                {pricing.odOvertime ? ` · OT ₹${pricing.odOvertime}/hr` : ''}
              </div>
            )}
          </>
        ) : (
          <>
            {pricing.schedName && <div className="text-sm font-bold text-slate-800 mt-1.5">{pricing.schedName}</div>}
            <div className={`text-xs text-slate-500 ${!pricing.schedName ? 'mt-1.5' : ''}`}>{pricing.schedVehicleType || '—'}</div>
            {pricing.schedPricingType && (
              <div className="text-[10px] text-slate-400">
                {pricing.schedPricingType}
                {pricing.schedDaysInMonth ? ` · ${pricing.schedDaysInMonth} days` : (pricing.schedFullMonth === false ? '' : ' · Full month')}
              </div>
            )}
            {pricing.schedWeeklyDays && pricing.schedWeeklyDays.length > 0 && (
              <div className="text-[10px] text-slate-400">{pricing.schedWeeklyDays.join(' · ')}</div>
            )}
            {pricing.schedParameters && pricing.schedParameters.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {pricing.schedParameters.map(p => (
                  <span key={p} className="text-[8px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{p}</span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="border-t border-slate-100">
        <button onClick={onEdit}
          className="w-full py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          EDIT
        </button>
      </div>
    </div>
  );
}

/* ─── Client Card ────────────────────────────────────────────────────────── */
function ClientCard({ draft, onView, onAddHub, onAddPricing }: {
  draft: Draft;
  onView: () => void; onAddHub: () => void; onAddPricing: () => void;
}) {
  const g    = draft.steps.group;
  const city = draft.steps.city;
  const pricingCount = getPricings(draft).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col">
      <div onClick={onView} className="px-4 py-3.5 flex items-center gap-3 cursor-pointer">
        <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0 select-none">
          {initials(g?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800 truncate leading-tight">{g?.name ?? '—'}</div>
          <div className="text-[10px] text-slate-400 truncate mt-0.5">
            {city?.city && <span>{city.city}</span>}
            {city?.hubName && <span className="text-slate-300 mx-1">·</span>}
            {city?.hubName && <span>{city.hubName}</span>}
          </div>
        </div>
        <span className="shrink-0 w-2 h-2 rounded-full bg-green-400" title="Active" />
      </div>
      <div className="px-3 pb-3 space-y-1.5 border-t border-slate-100 pt-2.5">
        <button onClick={onView}
          className="w-full text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg transition-colors text-center">
          View Details
        </button>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={onAddPricing}
            className="relative text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg transition-colors text-center">
            Add Pricing
            {pricingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-orange text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {pricingCount}
              </span>
            )}
          </button>
          <button onClick={onAddHub}
            className="text-[10px] font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 py-1.5 rounded-lg transition-colors text-center">
            Add New Hub
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Hub tile ───────────────────────────────────────────────────────────── */
function HubTile({ hubName, subArea, area, onEdit, onDelete, canDelete }: {
  hubName: string; subArea: string; area: string;
  onEdit: () => void; onDelete: () => void; canDelete: boolean;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
      <div className="flex-1 px-4 pt-4 pb-5">
        <div className="text-sm font-bold text-slate-800 leading-snug">{hubName || '—'}</div>
        <div className="text-xs text-slate-500 mt-1">{subArea || '—'}</div>
        {area && <div className="text-[10px] text-slate-400 mt-0.5">{area}</div>}
      </div>
      {confirmDel ? (
        <div className="border-t border-red-100 bg-red-50 px-3 py-2 flex items-center gap-2">
          <span className="text-[10px] text-red-700 flex-1 font-medium">Delete this hub?</span>
          <button onClick={() => setConfirmDel(false)} className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded">Cancel</button>
          <button onClick={() => { setConfirmDel(false); onDelete(); }}
            className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded">Yes, Delete</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 border-t border-slate-100">
          <button onClick={onEdit} className="py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100">EDIT</button>
          <button onClick={() => canDelete && setConfirmDel(true)} disabled={!canDelete}
            title={canDelete ? 'Delete this hub' : 'At least one hub must remain'}
            className={`py-2 text-[10px] font-semibold transition-colors ${canDelete ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-300 cursor-not-allowed opacity-50'}`}>
            DELETE
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── View Client Panel ──────────────────────────────────────────────────── */
function ViewClientPanel({ draft, allDrafts, onBack, onAddHub, onEditHub, onDeleteHub, onAddPricing, onEditPricing }: {
  draft:          Draft;
  allDrafts:      Draft[];
  onBack:         () => void;
  onAddHub:       () => void;
  onEditHub:      (idx: number) => void;
  onDeleteHub:    (idx: number) => void;
  onAddPricing:   () => void;
  onEditPricing:  (idx: number) => void;
}) {
  const g        = draft.steps.group;
  const poc      = draft.steps.poc;
  const hubs     = getHubs(draft);
  const pricings = getPricings(draft);

  // Build hierarchy tree from all drafts belonging to this group
  const groupName = g?.name ?? '';
  const groupDrafts = allDrafts.filter(d => (d.steps.group?.name ?? '') === groupName);

  // LE → verticals map
  type VertEntry = { name: string; gstin: string; state: string; city: string; status: string };
  type LEEntry   = { name: string; pan: string; verticals: VertEntry[] };
  const leMap = new Map<string, LEEntry>();
  for (const d of groupDrafts) {
    const leName = d.steps.legalEntity?.name ?? '—';
    const pan    = d.steps.legalEntity?.pan  ?? '';
    if (!leMap.has(leName)) leMap.set(leName, { name: leName, pan, verticals: [] });
    const le = leMap.get(leName)!;
    // avoid duplicate verticals
    const vName = d.steps.vertical?.name ?? '—';
    if (!le.verticals.find(vv => vv.name === vName)) {
      le.verticals.push({
        name:   vName,
        gstin:  d.steps.stateGstin?.gstin ?? '',
        state:  d.steps.stateGstin?.state ?? '',
        city:   d.steps.city?.city ?? '',
        status: d.opmStatus === 'approved' ? 'Active' : 'Draft',
      });
    }
  }
  const leList = Array.from(leMap.values());

  const totalVerticals = leList.reduce((s, le) => s + le.verticals.length, 0);
  const totalCities    = new Set(groupDrafts.map(d => d.steps.city?.city).filter(Boolean)).size;

  const [expandedLEs, setExpandedLEs] = useState<Set<string>>(
    () => new Set(leList.map(le => le.name))
  );
  function toggleLE(name: string) {
    setExpandedLEs(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-brand-navy text-sm transition-colors flex items-center gap-1.5 shrink-0">
          ← My Activated Clients
        </button>
        <span className="text-slate-200 shrink-0">|</span>
        <span className="text-sm font-semibold text-brand-navy truncate">{g?.name ?? 'Client'}</span>
        {g?.industryType && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{g.industryType}</span>
        )}
        <span className="ml-auto shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Active</span>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        {/* Info strip — Group + POC only; LE/Vertical moved to tree */}
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-4 gap-x-8 gap-y-3">
            <InfoField label="Group Name" value={g?.name} />
            <InfoField label="Ops POC"    value={poc?.opsName} />
            <InfoField label="Ops Phone"  value={poc?.opsPhone} />
            <InfoField label="Ops Email"  value={poc?.opsEmail} />
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── Structure / Hierarchy ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700">
                Structure
                <span className="ml-2 text-[10px] font-normal text-slate-400">
                  {leList.length} legal entit{leList.length !== 1 ? 'ies' : 'y'} · {totalVerticals} vertical{totalVerticals !== 1 ? 's' : ''} · {totalCities} cit{totalCities !== 1 ? 'ies' : 'y'}
                </span>
              </h2>
            </div>

            <div className="space-y-2">
              {leList.map(le => (
                <div key={le.name} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {/* LE header */}
                  <button
                    onClick={() => toggleLE(le.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className="text-slate-400 text-base shrink-0">🏢</span>
                    <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{le.name}</span>
                    {le.pan && <span className="text-[10px] text-slate-400 shrink-0">PAN: {le.pan}</span>}
                    <span className="text-slate-300 text-xs shrink-0 ml-2">{expandedLEs.has(le.name) ? '▲' : '▼'}</span>
                  </button>

                  {/* Verticals */}
                  {expandedLEs.has(le.name) && (
                    <div className="border-t border-slate-100">
                      {le.verticals.map((vert, vi) => (
                        <div
                          key={vi}
                          className="flex border-b border-slate-100 last:border-b-0"
                        >
                          {/* Status bar */}
                          <div className={`w-1 shrink-0 ${vert.status === 'Active' ? 'bg-brand-orange' : 'bg-amber-400'}`} />
                          <div className="flex-1 px-4 py-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-slate-700">{vert.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                vert.status === 'Active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>{vert.status}</span>
                            </div>
                            <div className="flex items-start gap-6 flex-wrap">
                              {(vert.state || vert.gstin) && (
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">State / GSTIN</p>
                                  <p className="text-[11px] text-slate-600">
                                    {vert.state}{vert.state && vert.gstin ? ' · ' : ''}{vert.gstin}
                                  </p>
                                </div>
                              )}
                              {vert.city && (
                                <div>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">City</p>
                                  <span className="inline-block text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{vert.city}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Hubs ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700">
                Hubs
                <span className="ml-2 text-[10px] font-normal text-slate-400">{hubs.length} hub{hubs.length !== 1 ? 's' : ''}</span>
              </h2>
              <button onClick={onAddHub}
                className="text-[10px] font-semibold text-brand-navy border border-brand-navy/30 hover:bg-brand-navy hover:text-white px-3 py-1 rounded-lg transition-colors">
                + Add Hub
              </button>
            </div>
            {hubs.length === 0 ? (
              <p className="text-xs text-slate-400">No hubs added yet.</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {hubs.map((h, i) => (
                  <HubTile key={i} hubName={h.hubName} subArea={h.subArea} area={h.area}
                    canDelete={hubs.length > 1}
                    onEdit={() => onEditHub(i)}
                    onDelete={() => onDeleteHub(i)} />
                ))}
              </div>
            )}
          </div>

          {/* ── Pricings ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700">
                Pricings
                <span className="ml-2 text-[10px] font-normal text-slate-400">
                  {pricings.length > 0 ? `${pricings.length} added` : 'none yet'}
                </span>
              </h2>
              <button onClick={onAddPricing}
                className="text-[10px] font-semibold text-brand-navy border border-brand-navy/30 hover:bg-brand-navy hover:text-white px-3 py-1 rounded-lg transition-colors">
                + Add Pricing
              </button>
            </div>
            {pricings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-medium">No pricings added yet</p>
                <button onClick={onAddPricing}
                  className="mt-3 text-[10px] font-semibold text-brand-navy border border-brand-navy/30 hover:bg-brand-navy hover:text-white px-4 py-1.5 rounded-lg transition-colors">
                  + Add First Pricing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {pricings.map((p, i) => (
                  <PricingTile key={p.id} pricing={p} onEdit={() => onEditPricing(i)} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function OPMClients() {
  const location = useLocation();

  const [drafts,         setDrafts]         = useState<Draft[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [view,           setView]           = useState<View>('list');
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [editHubIdx,     setEditHubIdx]     = useState<number | null>(null);
  const [editPricingIdx, setEditPricingIdx] = useState<number | null>(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [successMsg,     setSuccessMsg]     = useState<string | null>(null);
  const [search,         setSearch]         = useState('');

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts');
      const all: Draft[] = await res.json();
      setDrafts(all.filter(d => d.opmStatus === 'Approved'));
    } catch { setDrafts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  /* Auto-open a specific client when navigated here with state.openDraftId */
  useEffect(() => {
    const openId = (location.state as any)?.openDraftId;
    if (openId && drafts.length > 0) {
      const target = drafts.find(d => d.id === openId);
      if (target) {
        setSelectedId(openId);
        setView('viewClient');
      }
    }
  }, [location.state, drafts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return drafts;
    return drafts.filter(d => {
      const g = d.steps.group; const le = d.steps.legalEntity;
      const v = d.steps.vertical; const c = d.steps.city;
      const hubs = getHubs(d);
      return g?.name?.toLowerCase().includes(q)   || le?.name?.toLowerCase().includes(q)  ||
             v?.name?.toLowerCase().includes(q)   || c?.hubName?.toLowerCase().includes(q) ||
             c?.city?.toLowerCase().includes(q)   ||
             hubs.some(h => h.subArea?.toLowerCase().includes(q) || h.area?.toLowerCase().includes(q) || h.hubName?.toLowerCase().includes(q));
    });
  }, [drafts, search]);

  const selectedDraft = drafts.find(d => d.id === selectedId) ?? null;

  /* ── Save hub (add or edit) ── */
  async function handleSaveHub(draftId: string, hub: OPMHubDetails, editIdx: number | null) {
    setSubmitting(true);
    try {
      const draft = drafts.find(d => d.id === draftId)!;
      const existing = getHubs(draft);
      const updatedHubs = editIdx !== null
        ? existing.map((h, i) => i === editIdx ? hub : h)
        : [...existing, hub];
      await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opmHubs: updatedHubs }),
      });
      setSuccessMsg(editIdx !== null ? `✓ Hub "${hub.hubName}" updated` : `✓ Hub "${hub.hubName}" added`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadDrafts();
      setView('viewClient'); setEditHubIdx(null);
    } finally { setSubmitting(false); }
  }

  /* ── Delete hub ── */
  async function handleDeleteHub(draftId: string, hubIdx: number) {
    const draft = drafts.find(d => d.id === draftId)!;
    const existing = getHubs(draft);
    if (existing.length <= 1) return;
    await fetch(`/api/drafts/${draftId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opmHubs: existing.filter((_, i) => i !== hubIdx) }),
    });
    setSuccessMsg('✓ Hub deleted');
    setTimeout(() => setSuccessMsg(null), 3000);
    await loadDrafts();
  }

  /* ── Save pricing (add or edit) ── */
  async function handleSavePricing(draftId: string, pricing: Pricing, editIdx: number | null) {
    setSubmitting(true);
    try {
      const draft = drafts.find(d => d.id === draftId)!;
      const existing = getPricings(draft);
      const updated = editIdx !== null
        ? existing.map((p, i) => i === editIdx ? pricing : p)
        : [...existing, pricing];
      await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricings: updated }),
      });
      const typeLabel = pricing.type === 'od' ? 'OD Pricing' : 'Schedule VC';
      setSuccessMsg(editIdx !== null ? `✓ ${typeLabel} updated` : `✓ ${typeLabel} added`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadDrafts();
      setView('viewClient'); setEditPricingIdx(null);
    } finally { setSubmitting(false); }
  }

  /* ── Routing ── */
  if (selectedDraft && view === 'viewClient') {
    return (
      <ViewClientPanel
        draft={selectedDraft}
        allDrafts={drafts}
        onBack={() => { setView('list'); setSelectedId(null); }}
        onAddHub={() => { setEditHubIdx(null); setView('addHub'); }}
        onEditHub={idx => { setEditHubIdx(idx); setView('editHub'); }}
        onDeleteHub={idx => handleDeleteHub(selectedDraft.id, idx)}
        onAddPricing={() => { setEditPricingIdx(null); setView('addPricing'); }}
        onEditPricing={idx => { setEditPricingIdx(idx); setView('editPricing'); }}
      />
    );
  }

  if (selectedDraft && (view === 'addHub' || view === 'editHub')) {
    const hubs = getHubs(selectedDraft);
    const initialHub = view === 'editHub' && editHubIdx !== null ? hubs[editHubIdx] : undefined;
    const existingHubNames = hubs.filter((_, i) => i !== editHubIdx).map(h => h.hubName);
    return (
      <HubForm
        key={`${selectedDraft.id}-${view}-${editHubIdx ?? 'new'}`}
        draft={selectedDraft}
        backLabel={selectedDraft.steps.group?.name ?? 'Client'}
        onBack={() => { setView('viewClient'); setEditHubIdx(null); }}
        onSave={hub => handleSaveHub(selectedDraft.id, hub, view === 'editHub' ? editHubIdx : null)}
        submitting={submitting}
        initialHub={initialHub}
        existingHubNames={existingHubNames}
        isAdditionalHub={view === 'addHub'}
      />
    );
  }

  if (selectedDraft && (view === 'addPricing' || view === 'editPricing')) {
    const pricings    = getPricings(selectedDraft);
    const initialPricing = view === 'editPricing' && editPricingIdx !== null ? pricings[editPricingIdx] : undefined;
    return (
      <PricingForm
        key={`${selectedDraft.id}-${view}-${editPricingIdx ?? 'new'}`}
        draft={selectedDraft}
        onBack={() => { setView('viewClient'); setEditPricingIdx(null); }}
        onSave={p => handleSavePricing(selectedDraft.id, p, view === 'editPricing' ? editPricingIdx : null)}
        submitting={submitting}
        initialPricing={initialPricing}
      />
    );
  }

  /* ── List view ── */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">My Activated Clients</h1>
            <p className="text-xs text-slate-500 mt-0.5">Active clients with approved hubs</p>
          </div>
          {drafts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200">
              <span className="text-lg font-bold leading-none">{drafts.length}</span>
              <span className="text-xs font-medium">active</span>
            </div>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by group, legal entity, vertical, hub, sub area…"
            className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition bg-slate-50" />
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-600 text-white text-xs font-medium px-6 py-2.5 shrink-0">{successMsg}</div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm gap-2">
            <span className="inline-block animate-spin">⟳</span> Loading…
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-3xl">📋</div>
            <p className="text-slate-600 font-medium text-sm">No active clients yet</p>
            <p className="text-slate-400 text-xs">Approve hubs from Client Approvals to see them here</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-1">
            <p className="text-slate-500 text-sm font-medium">No results for "{search}"</p>
            <button onClick={() => setSearch('')} className="text-xs text-brand-orange hover:underline">Clear search</button>
          </div>
        ) : (
          <div>
            <div className="text-[10px] text-slate-400 mb-3 font-medium">
              {filtered.length} active client{filtered.length !== 1 ? 's' : ''}
            </div>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="grid grid-cols-[2fr_2fr_auto] gap-x-8 px-5 py-2 bg-slate-50">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Group · Legal Entity</span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Vertical</span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Actions</span>
              </div>
              {filtered.map(d => {
                const g  = d.steps.group;
                const le = d.steps.legalEntity;
                const v  = d.steps.vertical;
                const pricingCount = getPricings(d).length;
                return (
                  <div key={d.id} className="grid grid-cols-[2fr_2fr_auto] gap-x-8 px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0">{initials(g?.name)}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{g?.name ?? '—'}</div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{le?.name ?? '—'}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 truncate font-mono">{v?.name ?? '—'}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setSelectedId(d.id); setView('viewClient'); }}
                        className="text-[11px] font-medium text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                        View Details
                      </button>
                      <button onClick={() => { setSelectedId(d.id); setEditPricingIdx(null); setView('addPricing'); }}
                        className={`relative text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap border ${
                          pricingCount === 0
                            ? 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}>
                        {pricingCount === 0 ? '⚠ Add Pricing' : 'Add Pricing'}
                        {pricingCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-orange text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                            {pricingCount}
                          </span>
                        )}
                      </button>
                      <button onClick={() => { setSelectedId(d.id); setEditHubIdx(null); setView('addHub'); }}
                        className="text-[11px] font-medium text-white bg-brand-navy hover:bg-brand-navy/90 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                        Add New Hub
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
