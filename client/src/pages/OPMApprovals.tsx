import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../hooks/useAuth';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface DraftStep { [key: string]: string | undefined; }

interface Draft {
  id: string;
  createdAt: string; updatedAt: string; createdBy: string;
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
  salesAdminStatus: string | null;
  bizFinStatus:     string | null;
}

export interface OPMHubDetails {
  lat: string; lng: string;
  subArea: string; area: string;
  hubName: string;
  areaLead: string; fo: string;
}

interface GeoZone {
  latMin: number; latMax: number;
  lngMin: number; lngMax: number;
  subArea: string; area: string;
}

/* ─── Geo mapping (dummy DB) ─────────────────────────────────────────────── */
export const GEO_ZONES: GeoZone[] = [
  { latMin: 13.00, latMax: 13.07, lngMin: 77.48, lngMax: 77.57, subArea: 'Peenya',       area: 'North Bangalore' },
  { latMin: 12.95, latMax: 13.02, lngMin: 77.55, lngMax: 77.62, subArea: 'Rajajinagar',  area: 'West Bangalore'  },
  { latMin: 12.92, latMax: 12.97, lngMin: 77.60, lngMax: 77.68, subArea: 'Koramangala',  area: 'South Bangalore' },
  { latMin: 12.97, latMax: 13.05, lngMin: 77.63, lngMax: 77.75, subArea: 'Mahadevapura', area: 'East Bangalore'  },
  { latMin: 13.04, latMax: 13.10, lngMin: 77.56, lngMax: 77.65, subArea: 'Hebbal',       area: 'North Bangalore' },
  { latMin: 12.88, latMax: 12.95, lngMin: 77.65, lngMax: 77.73, subArea: 'HSR Layout',   area: 'South Bangalore' },
  { latMin: 19.05, latMax: 19.15, lngMin: 72.83, lngMax: 72.95, subArea: 'Andheri East', area: 'Mumbai East'     },
  { latMin: 19.00, latMax: 19.07, lngMin: 72.83, lngMax: 72.90, subArea: 'Kurla',        area: 'Mumbai Central'  },
  { latMin: 28.60, latMax: 28.68, lngMin: 77.08, lngMax: 77.18, subArea: 'Dwarka',       area: 'West Delhi'      },
  { latMin: 28.55, latMax: 28.63, lngMin: 77.22, lngMax: 77.32, subArea: 'Saket',        area: 'South Delhi'     },
];

export function lookupZone(lat: number, lng: number): GeoZone | null {
  return GEO_ZONES.find(z =>
    lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax
  ) ?? null;
}

export const AREA_LEADS = ['Ramesh Nair', 'Sunil Joshi', 'Pradeep Verma', 'Anil Yadav', 'Vikram Das'];
export const FOS        = ['FO-BLR-01', 'FO-BLR-02', 'FO-BLR-03', 'FO-MUM-01', 'FO-DEL-01'];

/* ─── Shared atoms ───────────────────────────────────────────────────────── */
function initials(name?: string) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</div>
      <div className="text-sm text-slate-800 font-medium truncate">{value || '—'}</div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

/* ─── Hub form ───────────────────────────────────────────────────────────── */
export function HubForm({ draft, backLabel, onBack, onSave, submitting, initialHub, existingHubNames = [], isAdditionalHub = false }: {
  draft: Draft; backLabel: string;
  onBack: () => void;
  onSave: (hub: OPMHubDetails) => void;
  submitting: boolean;
  initialHub?: OPMHubDetails;
  existingHubNames?: string[];
  isAdditionalHub?: boolean;         // true = adding a 2nd+ hub, suppress city pre-fills
}) {
  const g    = draft.steps.group;
  const le   = draft.steps.legalEntity;
  const v    = draft.steps.vertical;
  const poc  = draft.steps.poc;
  const city = draft.steps.city;

  // If COB Executive already entered lat/lng, use them; otherwise blank for OPM to fill
  const cobLat = (!isAdditionalHub && city?.lat) ? city.lat : '';
  const cobLng = (!isAdditionalHub && city?.lng) ? city.lng : '';
  const cobPrefilled = !!(cobLat && cobLng);

  const [hubName,    setHubName]    = useState(initialHub?.hubName || (!isAdditionalHub ? city?.hubName ?? '' : ''));
  const [lat,        setLat]        = useState(initialHub?.lat ?? cobLat);
  const [lng,        setLng]        = useState(initialHub?.lng ?? cobLng);
  const [zone,       setZone]       = useState<GeoZone | null | 'not-mapped'>(null);
  const [areaLead,   setAreaLead]   = useState(initialHub?.areaLead ?? '');
  const [fo,         setFo]         = useState(initialHub?.fo ?? '');
  const [confirming, setConfirming] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (lat.trim() && lng.trim() && !isNaN(la) && !isNaN(ln)) {
      setZone(lookupZone(la, ln) ?? 'not-mapped');
    } else { setZone(null); }
    if (!isFirstRender.current) { setAreaLead(''); setFo(''); }
    isFirstRender.current = false;
    setConfirming(false);
  }, [lat, lng]);

  const hubNameTrimmed  = hubName.trim();
  const hubNameDuplicate = existingHubNames
    .map(n => n.trim().toLowerCase())
    .includes(hubNameTrimmed.toLowerCase()) && hubNameTrimmed !== '';

  const mappedOk = zone !== null && zone !== 'not-mapped';
  const canSave  = mappedOk && areaLead !== '' && fo !== '' && hubNameTrimmed !== '' && !hubNameDuplicate;

  function handleSave() {
    if (!mappedOk || !canSave) return;
    onSave({ lat, lng, subArea: (zone as GeoZone).subArea, area: (zone as GeoZone).area, hubName: hubNameTrimmed, areaLead, fo });
  }

  const isEdit   = !!initialHub;
  const btnLabel = (!lat || !lng) && !cobPrefilled ? '↑ Enter Lat / Lng to continue'
    : zone === 'not-mapped'              ? '⚠ Sub area not mapped — cannot save'
    : !mappedOk                          ? '↑ Enter Lat / Lng to continue'
    : hubNameTrimmed === ''              ? 'Enter a Hub Name to continue'
    : hubNameDuplicate                   ? '⚠ Hub name already exists for this client'
    : !canSave                           ? 'Select Area Lead & FO to save'
    : isEdit                             ? '✓ Save Changes'
    : '✓ Save & Activate Client';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-brand-navy text-sm transition-colors flex items-center gap-1.5 shrink-0">
          ← {backLabel}
        </button>
        <span className="text-slate-200 shrink-0">|</span>
        <span className="text-sm font-semibold text-brand-navy truncate">{g?.name ?? 'Client'}</span>
        {g?.industryType && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{g.industryType}</span>
        )}
        <span className="ml-auto shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">Hub Setup</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7 bg-white">
        <div>
          <SectionTitle>Client Details</SectionTitle>
          <div className="grid grid-cols-6 gap-x-6 gap-y-4">
            <InfoField label="Group Name"         value={g?.name} />
            <InfoField label="Biller Name"        value={le?.name} />
            <InfoField label="Client Name"        value={v?.name} />
            <InfoField label="Client Supervisor"  value={poc?.opsName} />
            <InfoField label="Supervisor Contact" value={poc?.opsPhone} />
            <InfoField label="Supervisor Email"   value={poc?.opsEmail} />
          </div>
        </div>
        <div>
          <SectionTitle>Hub Details</SectionTitle>
          <div className="grid grid-cols-4 gap-x-6 gap-y-4">
            <InfoField label="Name"           value={city?.contactName} />
            <InfoField label="Contact Number" value={city?.contactPhone} />
            <InfoField label="Email Id"       value={city?.contactEmail} />
            <InfoField label="Address"        value={city?.hubAddress} />
          </div>
        </div>
        <div>
          <SectionTitle>Add Details</SectionTitle>
          <div className="space-y-5">
            {cobPrefilled && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-500 text-sm">✓</span>
                <p className="text-xs text-green-700 font-medium">Hub coordinates were pre-filled by COB Executive — verify and assign Area Lead & FO below.</p>
              </div>
            )}

            {/* 1. Hub Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Hub Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={hubName}
                onChange={e => { setHubName(e.target.value); setConfirming(false); }}
                placeholder="Enter hub name"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                  hubNameDuplicate
                    ? 'border-red-400 bg-red-50 focus:ring-red-300 focus:border-red-400 text-red-700'
                    : 'border-slate-300 focus:ring-brand-orange/40 focus:border-brand-orange'
                }`}
              />
              {hubNameDuplicate && (
                <p className="text-[10px] text-red-600 mt-1 font-medium">A hub with this name already exists for this client</p>
              )}
            </div>

            {/* 2. Lat / Lng */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Latitude {!cobPrefilled && <span className="text-red-400">*</span>}
                </label>
                {cobPrefilled ? (
                  <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 flex items-center gap-1.5">
                    <span className="text-green-500 text-xs">✓</span>{lat}
                  </div>
                ) : (
                  <input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 13.0300"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Longitude {!cobPrefilled && <span className="text-red-400">*</span>}
                </label>
                {cobPrefilled ? (
                  <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 flex items-center gap-1.5">
                    <span className="text-green-500 text-xs">✓</span>{lng}
                  </div>
                ) : (
                  <input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="e.g. 77.5200"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
                )}
              </div>
            </div>

            {/* 3. Sub Area / Area (auto-filled) */}
            {zone === 'not-mapped' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <span className="text-red-500 shrink-0 mt-0.5">⚠</span>
                <p className="text-sm text-red-700 font-medium">Sub Area not mapped, contact Product Support Team</p>
              </div>
            )}
            {mappedOk && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Sub Area', val: (zone as GeoZone).subArea },
                    { label: 'Area',     val: (zone as GeoZone).area    },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                      <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 flex items-center gap-1.5">
                        <span className="text-green-500 text-xs">✓</span>{val || '—'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4. Area Lead / FO */}
                <div className="grid grid-cols-2 gap-4">
                  {([
                    { label: 'Area Lead', val: areaLead, set: setAreaLead, opts: AREA_LEADS },
                    { label: 'FO',        val: fo,       set: setFo,       opts: FOS        },
                  ] as { label: string; val: string; set: (v: string) => void; opts: string[] }[]).map(({ label, val, set, opts }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label} <span className="text-red-400">*</span></label>
                      <select value={val} onChange={e => set(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition bg-white appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                        <option value="">Select {label}</option>
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="h-4" />
      </div>

      <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-4">
        {!confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!canSave || submitting}
            className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            {btnLabel}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {isEdit
                ? <>Update hub <strong>{hubNameTrimmed}</strong> for <strong>{g?.name}</strong> → <span className="font-mono font-semibold">{lat}, {lng}</span> ({(zone as GeoZone).subArea} · {(zone as GeoZone).area}) — {areaLead} / {fo}. Confirm changes?</>
                : <>Approve hub <strong>{hubNameTrimmed}</strong> for <strong>{g?.name}</strong> at{' '}<span className="font-mono font-semibold">{lat}, {lng}</span>{' '}({(zone as GeoZone).subArea} · {(zone as GeoZone).area}) — {areaLead} / {fo}. Activate client. Sure?</>
              }
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} className="px-4 text-sm text-slate-400 hover:text-slate-700 py-2 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {submitting ? 'Saving…' : isEdit ? '✓ Yes, Save Changes' : '✓ Yes, Activate Client'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Pending list row ───────────────────────────────────────────────────── */
function PendingRow({ draft, onOpen }: { draft: Draft; onOpen: () => void }) {
  const g = draft.steps.group; const le = draft.steps.legalEntity;
  const v = draft.steps.vertical; const city = draft.steps.city;
  return (
    <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="w-9 h-9 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0">{initials(g?.name)}</div>
      <div className="flex-1 grid grid-cols-4 gap-x-6 min-w-0">
        <div className="min-w-0">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Group Name</div>
          <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{g?.name ?? '—'}</div>
          {g?.industryType && <div className="text-[9px] text-slate-400 mt-0.5">{g.industryType}</div>}
        </div>
        <div className="min-w-0">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Legal Entity</div>
          <div className="text-xs text-slate-700 mt-0.5 truncate">{le?.name ?? '—'}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Vertical</div>
          <div className="text-xs font-mono text-slate-600 mt-0.5 truncate">{v?.name ?? '—'}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Hub</div>
          <div className="text-xs text-slate-700 mt-0.5 truncate">{city?.hubName ?? city?.name ?? '—'}</div>
          {city?.city && <div className="text-[9px] text-slate-400 mt-0.5">{city.city}</div>}
        </div>
      </div>
      {city?.lat && city?.lng ? (
        <button onClick={onOpen} className="shrink-0 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
          Activate Now
        </button>
      ) : (
        <button onClick={onOpen} className="shrink-0 bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
          Map Hub &amp; Activate
        </button>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
function getDraftCity(d: Draft): string {
  const c = d.steps.city;
  if (!c) return '';
  // new-mode has c.city (LT regional city); existing-mode has c.name
  return c.city ?? c.name ?? '';
}

export default function OPMApprovals() {
  const navigate = useNavigate();

  const [drafts,      setDrafts]      = useState<Draft[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [successMsg,  setSuccessMsg]  = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [cityFilter,  setCityFilter]  = useState('');
  const [allowedCities, setAllowedCities] = useState<string[] | null>(null); // null = unrestricted

  // Fetch user's city permissions
  useEffect(() => {
    const user = getUser();
    if (!user?.email) return;
    fetch(`/api/permissions/user/${encodeURIComponent(user.email)}`)
      .then(r => r.json())
      .then(data => {
        const cities: string[] = data.cities ?? [];
        setAllowedCities(cities.length > 0 ? cities : null);
      })
      .catch(() => setAllowedCities(null));
  }, []);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts');
      const all: Draft[] = await res.json();
      setDrafts(all.filter(d => d.salesAdminStatus === 'Approved' && d.opmStatus === 'Pending'));
    } catch { setDrafts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  // Cities available in the dropdown = intersection of user's allowed cities + cities present in drafts
  const cityOptions = useMemo(() => {
    const inDrafts = [...new Set(drafts.map(getDraftCity).filter(Boolean))].sort();
    if (!allowedCities) return inDrafts;
    return inDrafts.filter(c => allowedCities.includes(c));
  }, [drafts, allowedCities]);

  const filtered = useMemo(() => {
    let result = drafts;
    // Restrict to allowed cities if permission set
    if (allowedCities) result = result.filter(d => allowedCities.includes(getDraftCity(d)));
    // City dropdown filter
    if (cityFilter) result = result.filter(d => getDraftCity(d) === cityFilter);
    // Text search
    const q = search.toLowerCase().trim();
    if (q) result = result.filter(d => {
      const g = d.steps.group; const le = d.steps.legalEntity;
      const v = d.steps.vertical; const c = d.steps.city;
      return g?.name?.toLowerCase().includes(q)  || le?.name?.toLowerCase().includes(q) ||
             v?.name?.toLowerCase().includes(q)  || c?.hubName?.toLowerCase().includes(q) ||
             c?.city?.toLowerCase().includes(q);
    });
    return result;
  }, [drafts, search, cityFilter, allowedCities]);

  const selectedDraft = drafts.find(d => d.id === selectedId) ?? null;

  async function handleSave(draftId: string, hub: OPMHubDetails) {
    setSubmitting(true);
    try {
      await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opmStatus: 'Approved', opmApprovedAt: new Date().toISOString(), opmHubDetails: hub }),
      });
      // Navigate to My Clients and auto-open this newly activated client
      navigate('/opm-clients', { state: { openDraftId: draftId } });
    } finally { setSubmitting(false); }
  }

  if (selectedDraft) {
    return <HubForm key={selectedDraft.id} draft={selectedDraft} backLabel="Client Activation"
      onBack={() => setSelectedId(null)} onSave={hub => handleSave(selectedDraft.id, hub)} submitting={submitting} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-brand-navy">Client Activation</h1>
            <p className="text-xs text-slate-500 mt-0.5">Verify hub info and activate clients</p>
          </div>
          {drafts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange px-3 py-1.5 rounded-lg">
              <span className="text-lg font-bold leading-none">{drafts.length}</span>
              <span className="text-xs font-medium">pending</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-navy text-white shrink-0">
            Pending Hubs
            {drafts.length > 0 && (
              <span className="ml-1.5 bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{drafts.length}</span>
            )}
          </button>
          {cityOptions.length > 0 && (
            <select
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition shrink-0"
            >
              <option value="">All Cities</option>
              {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by group, legal entity, vertical, hub name…"
              className="w-full pl-8 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange transition bg-slate-50" />
          </div>
        </div>
      </div>

      {successMsg && <div className="bg-green-600 text-white text-xs font-medium px-6 py-2.5 shrink-0">{successMsg}</div>}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm gap-2">
            <span className="inline-block animate-spin">⟳</span> Loading…
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <div className="text-4xl">✅</div>
            <p className="text-slate-600 font-medium text-sm">All hubs approved!</p>
            <p className="text-slate-400 text-xs">No clients pending hub setup</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-1">
            <p className="text-slate-500 text-sm font-medium">No results for "{search}"</p>
            <button onClick={() => setSearch('')} className="text-xs text-brand-orange hover:underline">Clear search</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 mb-3 font-medium">{filtered.length} client{filtered.length !== 1 ? 's' : ''} pending hub setup</div>
            {filtered.map(d => (
              <PendingRow key={d.id} draft={d} onOpen={() => setSelectedId(d.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
