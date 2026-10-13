import { useState, useEffect, useMemo, useRef } from 'react';
import { type Booking } from './CreateBookings';

/* ─── Partner / Driver types (mirrors CreateBookings) ───────────────────── */
interface PartnerVehicle { id: string; registration: string; type: string; bodyType: string; }
interface Partner { id: string; partnerNumber: string; name: string; bankAccount: string; vehicles: PartnerVehicle[]; }
interface Driver  { id: string; name: string; contact: string; partnerId: string; }

/* ─── Replacement Vehicle Modal ─────────────────────────────────────────── */
function ReplacementModal({ bookingId, onClose, onSave }: {
  bookingId: string;
  onClose: () => void;
  onSave: (details: Record<string, string>) => void;
}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [drivers,  setDrivers]  = useState<Driver[]>([]);

  const [partnerQ,     setPartnerQ]     = useState('');
  const [selectedP,    setSelectedP]    = useState<Partner | null>(null);
  const [vehicleReg,   setVehicleReg]   = useState('');
  const [driverQ,      setDriverQ]      = useState('');
  const [selectedD,    setSelectedD]    = useState<Driver | null>(null);
  const [saving,       setSaving]       = useState(false);

  const [pOpen, setPOpen] = useState(false);
  const [dOpen, setDOpen] = useState(false);
  const pRef = useRef<HTMLDivElement>(null);
  const dRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/partners').then(r => r.json()).then(setPartners).catch(() => {});
    fetch('/api/partners/drivers/search').then(r => r.json()).then(setDrivers).catch(() => {});
  }, []);

  /* close dropdowns on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pRef.current && !pRef.current.contains(e.target as Node)) setPOpen(false);
      if (dRef.current && !dRef.current.contains(e.target as Node)) setDOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredP = partners.filter(p =>
    p.partnerNumber.toLowerCase().includes(partnerQ.toLowerCase()) ||
    p.name.toLowerCase().includes(partnerQ.toLowerCase())
  );
  const filteredD = drivers.filter(d =>
    d.contact.includes(driverQ) || d.name.toLowerCase().includes(driverQ.toLowerCase())
  );

  const selectedV = selectedP?.vehicles.find(v => v.registration === vehicleReg) ?? null;
  const bankMasked = selectedP ? `${'*'.repeat(Math.max(0, selectedP.bankAccount.length - 4))}${selectedP.bankAccount.slice(-4)}` : '';

  const canSave = !!selectedP && !!vehicleReg && !!selectedD;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const details = {
      replacementPartnerNumber: selectedP!.partnerNumber,
      replacementPartnerName:   selectedP!.name,
      replacementBankAccount:   `xxx-xxx-xxx-${selectedP!.bankAccount.slice(-4)}`,
      replacementVehicleId:     vehicleReg,
      replacementVehicleType:   selectedV?.type ?? '',
      replacementVehicleBody:   selectedV?.bodyType ?? '',
      replacementDriverContact: selectedD!.contact,
      replacementDriverName:    selectedD!.name,
    };
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...details, finalStatus: 'P-replacement' }),
    });
    setSaving(false);
    onSave(details);   // parent updates localStatus to P-replacement
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Add Vehicle Details</h2>
          <p className="text-xs text-slate-400 mt-0.5">Replacement vehicle for this booking</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Row 1: Partner Number + Partner Name */}
          <div className="grid grid-cols-2 gap-4">
            {/* Partner Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Partner Number <span className="text-red-400">*</span>
              </label>
              <div className="relative" ref={pRef}>
                <div className="relative">
                  <input type="text" value={partnerQ}
                    onChange={e => { setPartnerQ(e.target.value); setPOpen(true); if (!e.target.value) { setSelectedP(null); setVehicleReg(''); } }}
                    onFocus={() => setPOpen(true)}
                    placeholder="Type number or name…"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm pr-16 focus:outline-none focus:ring-2 transition ${selectedP ? 'border-green-300 focus:ring-green-200' : 'border-slate-200 focus:ring-brand-navy/20 focus:border-brand-navy'}`} />
                  {selectedP && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600">Verified</span>
                  )}
                </div>
                {pOpen && filteredP.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredP.map(p => (
                      <button key={p.id} type="button"
                        onClick={() => { setSelectedP(p); setPartnerQ(p.partnerNumber); setVehicleReg(''); setPOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors">
                        <span className="text-xs font-bold text-brand-navy">{p.partnerNumber}</span>
                        <span className="text-xs text-slate-500 ml-2">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Partner Name (auto) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Partner Name <span className="text-red-400">*</span></label>
              <div className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 min-h-[42px]">
                {selectedP?.name || <span className="text-slate-400">—</span>}
              </div>
            </div>
          </div>

          {/* Row 2: Bank Account + Select Vehicle */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bank Account (auto, masked) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bank Account Number</label>
              <div className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 font-mono min-h-[42px]">
                {bankMasked || <span className="text-slate-400 font-sans">—</span>}
              </div>
            </div>

            {/* Select Vehicle */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Vehicle <span className="text-red-400">*</span></label>
              <div className="relative">
                <select value={vehicleReg} onChange={e => setVehicleReg(e.target.value)}
                  disabled={!selectedP}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition appearance-none pr-16 ${
                    vehicleReg ? 'border-green-300 focus:ring-green-200' : 'border-slate-200 focus:ring-brand-navy/20 focus:border-brand-navy'
                  } ${!selectedP ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  <option value="">Select vehicle…</option>
                  {selectedP?.vehicles.map(v => (
                    <option key={v.id} value={v.registration}>{v.registration}</option>
                  ))}
                </select>
                {vehicleReg && <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600">Verified</span>}
              </div>
              {selectedV && (
                <p className="text-[10px] text-slate-400 mt-1">{selectedV.type} · {selectedV.bodyType}</p>
              )}
            </div>
          </div>

          {/* Row 3: Driver Mobile + Driver Name */}
          <div className="grid grid-cols-2 gap-4">
            {/* Driver Mobile */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Driver Mobile Number <span className="text-red-400">*</span>
              </label>
              <div className="relative" ref={dRef}>
                <input type="tel" value={driverQ}
                  onChange={e => { setDriverQ(e.target.value); setDOpen(true); if (!e.target.value) setSelectedD(null); }}
                  onFocus={() => setDOpen(true)}
                  placeholder="Type contact or name…"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${selectedD ? 'border-green-300 focus:ring-green-200' : 'border-slate-200 focus:ring-brand-navy/20 focus:border-brand-navy'}`} />
                {dOpen && filteredD.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredD.map(d => (
                      <button key={d.id} type="button"
                        onClick={() => { setSelectedD(d); setDriverQ(d.contact); setDOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors">
                        <span className="text-xs font-bold text-brand-navy">{d.contact}</span>
                        <span className="text-xs text-slate-500 ml-2">{d.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Driver Name (auto) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Driver Name <span className="text-red-400">*</span></label>
              <div className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 min-h-[42px]">
                {selectedD?.name || <span className="text-slate-400">—</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Attendance status options ─────────────────────────────────────────── */
interface StatusOption { value: string; label: string; partnerOnly?: boolean; }
interface StatusGroup  { group: string; color: string; options: StatusOption[]; }

const ATTENDANCE_STATUS: StatusGroup[] = [
  {
    group: 'Present',
    color: 'text-green-600',
    options: [
      { value: 'P-replacement',  label: '(P) - Vendor arranged replacement vehicle' },
      { value: 'P-continued',    label: '(P) - Continued' },
      { value: 'P-reported-late',label: '(P) - Sch Vehicle Reported Late', partnerOnly: true },
      { value: 'P-going',        label: '(P) - Going',                     partnerOnly: true },
    ],
  },
  {
    group: 'Absent',
    color: 'text-red-600',
    options: [
      { value: 'A-approved-leave',    label: '(A) - Supply Team Approved Leave' },
      { value: 'A-not-stabilized',    label: '(A) - Driver Not Stabilized' },
      { value: 'A-not-reported',      label: '(A) - Scheduled Vehicle Not Reported' },
    ],
  },
  {
    group: 'Half-day',
    color: 'text-amber-600',
    options: [
      { value: 'H-breakdown',     label: '(H) - Half-day - Vehicle Breakdown' },
      { value: 'H-left-issues',   label: '(H) - Half-day - Driver Intentionally Left Due to Issues' },
    ],
  },
  {
    group: 'Client Cancelled',
    color: 'text-slate-500',
    options: [
      { value: 'N-client-off', label: '(N) - Client Off' },
    ],
  },
];

const ALL_OPTIONS = ATTENDANCE_STATUS.flatMap(g => g.options);

function statusLabel(value?: string) {
  if (!value) return null;
  return ALL_OPTIONS.find(o => o.value === value);
}

function statusColor(value?: string) {
  if (!value) return 'text-slate-500';
  const group = ATTENDANCE_STATUS.find(g => g.options.some(o => o.value === value));
  return group?.color ?? 'text-slate-500';
}

type DayTab = 'yesterday' | 'today' | 'tomorrow';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function isoDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function fmtTime(t?: string) {
  if (!t) return '12:00 AM';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function initials(name?: string) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/* ─── Final Status Dropdown ──────────────────────────────────────────────── */
function FinalStatusDropdown({ bookingId, value, onChange, onReplacementRequest }: {
  bookingId: string;
  value?: string;
  onChange: (v: string) => void;
  onReplacementRequest?: () => void;   // called instead of saving when P-replacement picked
}) {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const selected = statusLabel(value);

  async function select(v: string) {
    setOpen(false);
    // P-replacement: open modal first — don't save until modal is confirmed
    if (v === 'P-replacement') {
      onReplacementRequest?.();
      return;
    }
    setSaving(true);
    onChange(v);
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalStatus: v }),
    });
    setSaving(false);
  }

  return (
    <div className="relative">
      <div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Final</span>
        <button onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
            selected
              ? `border-transparent bg-slate-50 ${statusColor(value)}`
              : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'
          }`}>
          {saving ? <span className="animate-spin text-[10px]">⟳</span> : null}
          <span className="truncate max-w-[140px]">{selected ? selected.label : 'Select'}</span>
          <span className="text-slate-400 text-[10px] shrink-0">{open ? '▲' : '▼'}</span>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-72 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {ATTENDANCE_STATUS.map(group => (
              <div key={group.group}>
                <div className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest bg-slate-50 border-b border-slate-100 ${group.color}`}>
                  {group.group}
                </div>
                {group.options.map(opt => (
                  <button key={opt.value}
                    onClick={() => select(opt.value)}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between gap-2 ${
                      value === opt.value ? `${group.color} font-semibold bg-slate-50` : 'text-slate-700'
                    }`}>
                    <span>{opt.label}</span>
                    {opt.partnerOnly && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-500 whitespace-nowrap shrink-0">Partner</span>
                    )}
                    {value === opt.value && <span className={`text-xs shrink-0 ${group.color}`}>✓</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Booking Card ───────────────────────────────────────────────────────── */
/* ─── Replacement Details View Modal ────────────────────────────────────── */
function ReplacementDetailsModal({ booking, onClose }: { booking: any; onClose: () => void }) {
  const b = booking;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Replacement Vehicle Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">{b.clientName} · {b.id}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Partner */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Partner</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Partner Number</p>
                <p className="text-sm font-semibold text-brand-navy">{b.replacementPartnerNumber || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Partner Name</p>
                <p className="text-sm font-medium text-slate-700">{b.replacementPartnerName || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Bank Account</p>
                <p className="text-sm font-mono text-slate-600">{b.replacementBankAccount || '—'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Vehicle</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Registration</p>
                <p className="text-sm font-semibold text-brand-navy font-mono">{b.replacementVehicleId || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Vehicle Type</p>
                <p className="text-sm font-medium text-slate-700">{b.replacementVehicleType || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Body Type</p>
                <p className="text-sm font-medium text-slate-700">{b.replacementVehicleBody || '—'}</p>
              </div>
            </div>
          </div>

          {/* Driver */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Driver</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Driver Name</p>
                <p className="text-sm font-medium text-slate-700">{b.replacementDriverName || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Mobile Number</p>
                <p className="text-sm font-medium text-slate-700">{b.replacementDriverContact || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendanceCard({ booking, onStatusChange }: {
  booking: Booking;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [menuOpen, setMenuOpen]               = useState(false);
  const [showReplacement, setShowReplacement] = useState(false);
  const [showDetails,     setShowDetails]     = useState(false);
  const hasReplacementDetails = !!(booking as any).replacementVehicleId;

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      {/* Top row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        {/* Client avatar + name */}
        <div className="w-9 h-9 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0">
          {initials(booking.clientName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800 truncate">{booking.clientName}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400 font-mono">{booking.id}</span>
            <span className="text-slate-200">·</span>
            <span className="text-[10px] text-slate-400">📍 {booking.subArea}</span>
          </div>
        </div>

        {/* Time + vehicle */}
        <div className="text-center shrink-0 border-r border-slate-100 pr-4 mr-1">
          <div className="text-xs font-semibold text-slate-700">{fmtTime(booking.bookingTime)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{booking.vehicleType || '—'}</div>
        </div>

        {/* Final status + Partner Marked */}
        <div className="shrink-0 space-y-2">
          <FinalStatusDropdown
            bookingId={booking.id}
            value={(booking as any).finalStatus}
            onChange={v => onStatusChange(booking.id, v)}
            onReplacementRequest={() => setShowReplacement(true)}
          />
          {/* View Replacement button — only when details exist */}
          {hasReplacementDetails && (
            <button
              onClick={() => setShowDetails(true)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-orange hover:text-brand-orange-dark border border-brand-orange/30 hover:border-brand-orange px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
              🔄 View Replacement
            </button>
          )}
          {showReplacement && (
            <ReplacementModal
              bookingId={booking.id}
              onClose={() => setShowReplacement(false)}
              onSave={() => onStatusChange(booking.id, 'P-replacement')}
            />
          )}
          {showDetails && (
            <ReplacementDetailsModal
              booking={booking}
              onClose={() => setShowDetails(false)}
            />
          )}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Partner Marked</span>
            {(() => {
              const fs = (booking as any).finalStatus;
              const partnerMarked = fs === 'P-going' || fs === 'P-reported-late';
              return partnerMarked ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">Yes</span>
              ) : (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400">N/A</span>
              );
            })()}
          </div>
        </div>

        {/* Vehicle details label */}
        <div className="shrink-0 border-l border-slate-100 pl-4 min-w-[140px]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Vehicle Details</span>
          {booking.driverName   && <div className="text-xs text-slate-700 font-medium truncate">👤 {booking.driverName}</div>}
          {booking.vehicleId    && <div className="text-xs font-mono text-slate-600 mt-0.5">🚗 {booking.vehicleId}</div>}
          {booking.driverContact && <div className="text-xs text-slate-600 mt-0.5">📞 {booking.driverContact}</div>}
        </div>

        {/* 3-dot menu */}
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen(o => !o)}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-lg">
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 min-w-[140px] overflow-hidden">
              <button className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors text-slate-700">View Details</button>
              <button className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors text-slate-700">Edit Booking</button>
              <button className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 transition-colors text-red-500">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AttendanceIntra() {
  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [localStatus,   setLocalStatus]   = useState<Record<string, string>>({});
  const [loading,       setLoading]       = useState(true);
  const [day,           setDay]           = useState<DayTab>('today');
  const [subAreaFilter, setSubAreaFilter] = useState('');

  useEffect(() => {
    fetch('/api/bookings')
      .then(r => r.json())
      .then((data: Booking[]) => {
        setBookings(data.filter(b => b.status === 'published' || b.status === 'confirmed'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Unique sub areas from bookings */
  const subAreas = useMemo(() =>
    [...new Set(bookings.map(b => b.subArea).filter(Boolean))].sort(),
    [bookings]
  );

  /* Filter bookings by day tab (using startDate) */
  const dates: Record<DayTab, string> = {
    yesterday: isoDate(-1),
    today:     isoDate(0),
    tomorrow:  isoDate(1),
  };

  function countsForDay(d: DayTab): { marked: number; unmarked: number } {
    const dayBookings = bookings.filter(b => {
      const matchDay  = (b.startDate || (b as any).publishDate) === dates[d];
      const matchArea = !subAreaFilter || b.subArea === subAreaFilter;
      return matchDay && matchArea;
    });
    const marked   = dayBookings.filter(b => !!(b as any).finalStatus).length;
    const unmarked = dayBookings.length - marked;
    return { marked, unmarked };
  }

  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const matchDay  = (b.startDate || b.publishDate) === dates[day];
      const matchArea = !subAreaFilter || b.subArea === subAreaFilter;
      return matchDay && matchArea;
    });
  }, [bookings, day, subAreaFilter]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-100">

      {/* ── Header ── */}
      <div className="bg-brand-navy text-white px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold">Attendance <span className="text-brand-orange">(Intra)</span></h1>
            <p className="text-xs text-slate-400 mt-0.5">Published bookings · field attendance tracking</p>
          </div>

          {/* Sub-Area filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Sub-Area</span>
            <select
              value={subAreaFilter}
              onChange={e => setSubAreaFilter(e.target.value)}
              className="border border-white/20 bg-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
              <option value="">All Sub-Areas</option>
              {subAreas.map(sa => <option key={sa} value={sa}>{sa}</option>)}
            </select>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 mt-4">
          {(['yesterday', 'today', 'tomorrow'] as DayTab[]).map(d => {
            const { marked, unmarked } = countsForDay(d);
            const isActive = day === d;
            return (
              <button key={d} onClick={() => setDay(d)}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                  isActive
                    ? 'bg-white text-brand-navy shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}>
                <span>{d}</span>
                <div className="flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-green-500 text-white">
                    {marked}
                  </span>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black bg-red-500 text-white">
                    {unmarked}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading bookings…</div>
        ) : !subAreaFilter ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-navy/10 flex items-center justify-center text-3xl mb-4">📍</div>
            <h3 className="text-base font-bold text-slate-700 mb-1">Select a Sub Area</h3>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              Choose a sub area from the dropdown above to view published bookings for that area.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {subAreas.map(sa => (
                <button key={sa} onClick={() => setSubAreaFilter(sa)}
                  className="px-4 py-2 text-xs font-semibold bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors">
                  {sa}
                </button>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No bookings for {day}</p>
            <p className="text-xs text-slate-400">No published bookings in {subAreaFilter} for this date.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium">{filtered.length} booking{filtered.length !== 1 ? 's' : ''} · {subAreaFilter} · {dates[day]}</p>
            {filtered.map(b => (
              <AttendanceCard key={b.id}
                booking={{ ...b, ...(localStatus[b.id] ? { finalStatus: localStatus[b.id] } : {}) } as any}
                onStatusChange={(id, v) => setLocalStatus(prev => ({ ...prev, [id]: v }))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
