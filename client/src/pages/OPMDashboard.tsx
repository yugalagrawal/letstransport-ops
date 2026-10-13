import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Booking } from './CreateBookings';

/* ── helpers ──────────────────────────────────────────────── */
const toYMD = (d: Date) => d.toISOString().slice(0, 10);

const fmt = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtTime = (t?: string) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const initials = (name?: string) => {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

/* ── Attendance status (mirrored from AttendanceIntra) ─────── */
interface StatusOption { value: string; label: string; partnerOnly?: boolean; }
interface StatusGroup  { group: string; color: string; options: StatusOption[]; }

const ATTENDANCE_STATUS: StatusGroup[] = [
  { group: 'Present', color: 'text-green-600', options: [
    { value: 'P-replacement',   label: '(P) - Vendor arranged replacement vehicle' },
    { value: 'P-continued',     label: '(P) - Continued' },
    { value: 'P-reported-late', label: '(P) - Sch Vehicle Reported Late', partnerOnly: true },
    { value: 'P-going',         label: '(P) - Going',                     partnerOnly: true },
  ]},
  { group: 'Absent', color: 'text-red-600', options: [
    { value: 'A-approved-leave', label: '(A) - Supply Team Approved Leave' },
    { value: 'A-not-stabilized', label: '(A) - Driver Not Stabilized' },
    { value: 'A-not-reported',   label: '(A) - Scheduled Vehicle Not Reported' },
  ]},
  { group: 'Half-day', color: 'text-amber-600', options: [
    { value: 'H-breakdown',   label: '(H) - Half-day - Vehicle Breakdown' },
    { value: 'H-left-issues', label: '(H) - Half-day - Driver Intentionally Left Due to Issues' },
  ]},
  { group: 'Client Cancelled', color: 'text-slate-500', options: [
    { value: 'N-client-off', label: '(N) - Client Off' },
  ]},
];

const ALL_OPTIONS = ATTENDANCE_STATUS.flatMap(g => g.options);

const statusLabel = (value?: string) => value ? ALL_OPTIONS.find(o => o.value === value) : null;
const statusColor = (value?: string) => {
  if (!value) return 'text-slate-500';
  return ATTENDANCE_STATUS.find(g => g.options.some(o => o.value === value))?.color ?? 'text-slate-500';
};

/* ── Final Status Dropdown ─────────────────────────────────── */
function FinalStatusDropdown({ bookingId, value, onChange }: {
  bookingId: string; value?: string; onChange: (v: string) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = statusLabel(value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function select(v: string) {
    setOpen(false);
    setSaving(true);
    onChange(v);
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalStatus: v }),
    });
    setSaving(false);
  }

  return (
    <div ref={ref} className="relative">
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Final</span>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
          selected ? `border-transparent bg-slate-50 ${statusColor(value)}` : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'
        }`}
      >
        {saving && <span className="animate-spin text-[10px]">⟳</span>}
        <span className="truncate max-w-[160px]">{selected ? selected.label : 'Select'}</span>
        <span className="text-slate-400 text-[10px] shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-72 overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {ATTENDANCE_STATUS.map(group => (
              <div key={group.group}>
                <div className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest bg-slate-50 border-b border-slate-100 ${group.color}`}>
                  {group.group}
                </div>
                {group.options.map(opt => (
                  <button key={opt.value} onClick={() => select(opt.value)}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 border-b border-slate-50 flex items-center justify-between gap-2 ${
                      value === opt.value ? `${group.color} font-semibold bg-slate-50` : 'text-slate-700'
                    }`}>
                    <span>{opt.label}</span>
                    {opt.partnerOnly && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-500 whitespace-nowrap shrink-0">Partner</span>}
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

/* ── Trip Card ─────────────────────────────────────────────── */
function TripCard({ booking, onStatusChange }: { booking: Booking; onStatusChange: (id: string, v: string) => void }) {
  const cls = bookingClass(booking);
  const partnerMarked = (booking as any).finalStatus === 'P-going' || (booking as any).finalStatus === 'P-reported-late';

  return (
    <div className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0">
          {initials(booking.clientName)}
        </div>

        {/* Client + meta */}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-800 truncate">{booking.clientName}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400 font-mono">{booking.id}</span>
            <span className="text-slate-200">·</span>
            <span className="text-[10px] text-slate-400">📍 {booking.hubName || booking.subArea}</span>
          </div>
        </div>

        {/* Time + vehicle type */}
        <div className="text-center shrink-0 border-r border-slate-100 pr-4 mr-1">
          <div className="text-xs font-semibold text-slate-700">{fmtTime(booking.bookingTime)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{booking.vehicleType || '—'}</div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${classBadgeColors[cls] ?? 'bg-slate-100 text-slate-500'}`}>{cls}</span>
        </div>

        {/* Final status + Partner Marked */}
        <div className="shrink-0 space-y-2 border-r border-slate-100 pr-4">
          <FinalStatusDropdown
            bookingId={booking.id}
            value={(booking as any).finalStatus}
            onChange={v => onStatusChange(booking.id, v)}
          />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Partner Marked</span>
            {partnerMarked
              ? <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">Yes</span>
              : <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400">N/A</span>
            }
          </div>
        </div>

        {/* Vehicle details */}
        <div className="shrink-0 min-w-[150px]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Vehicle Details</span>
          {booking.driverName    && <div className="text-xs text-slate-700 font-medium truncate">👤 {booking.driverName}</div>}
          {booking.vehicleId     && <div className="text-xs font-mono text-slate-600 mt-0.5">🚗 {booking.vehicleId}</div>}
          {booking.driverContact && <div className="text-xs text-slate-600 mt-0.5">📞 {booking.driverContact}</div>}
        </div>
      </div>
    </div>
  );
}

const bookingClass = (b: Booking) => {
  const p = b.clientPricingLabel?.startsWith('OD ·') ? 'OD' : 'Sch';
  const t = b.bookingType === 'upcountry' ? 'UPC' : 'Local';
  return `${p}-${t}`;
};

const classBadgeColors: Record<string, string> = {
  'OD-Local':  'bg-orange-100 text-orange-700',
  'OD-UPC':    'bg-red-100 text-red-700',
  'Sch-Local': 'bg-blue-100 text-blue-700',
  'Sch-UPC':   'bg-purple-100 text-purple-700',
};

/* ── Quick-date pill ──────────────────────────────────────── */
function QuickPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? 'bg-brand-navy text-white border-brand-navy'
          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-navy hover:text-brand-navy'
      }`}
    >
      {label}
    </button>
  );
}

/* ── Stat card ────────────────────────────────────────────── */
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

const ALL_BOOKING_TYPES = ['OD-Local', 'OD-UPC', 'Sch-Local', 'Sch-UPC'] as const;
type BookingType = typeof ALL_BOOKING_TYPES[number];

const typeColors: Record<BookingType, string> = {
  'OD-Local':  'bg-orange-100 text-orange-700',
  'OD-UPC':    'bg-red-100 text-red-700',
  'Sch-Local': 'bg-blue-100 text-blue-700',
  'Sch-UPC':   'bg-purple-100 text-purple-700',
};

/* ── Booking Type multi-select dropdown ───────────────────── */
function BookingTypeFilter({ selected, onChange }: {
  selected: Set<BookingType>;
  onChange: (s: Set<BookingType>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (t: BookingType) => {
    const next = new Set(selected);
    next.has(t) ? next.delete(t) : next.add(t);
    onChange(next);
  };

  const label = selected.size === 0 || selected.size === ALL_BOOKING_TYPES.length
    ? 'All Types'
    : selected.size === 1
      ? [...selected][0]
      : `${selected.size} types`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 bg-white font-medium focus:outline-none transition-colors min-w-[130px] justify-between ${
          selected.size > 0 && selected.size < ALL_BOOKING_TYPES.length
            ? 'border-brand-navy text-brand-navy'
            : 'border-slate-200 text-slate-700'
        }`}
      >
        <span>{label}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 min-w-[170px]">
          {/* Select all / clear */}
          <button
            onClick={() => onChange(selected.size === ALL_BOOKING_TYPES.length ? new Set() : new Set(ALL_BOOKING_TYPES))}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-400 hover:text-brand-navy hover:bg-slate-50 transition-colors"
          >
            {selected.size === ALL_BOOKING_TYPES.length ? 'Clear all' : 'Select all'}
          </button>
          <div className="border-t border-slate-100 my-1" />
          {ALL_BOOKING_TYPES.map(t => (
            <label key={t} className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={selected.has(t)}
                onChange={() => toggle(t)}
                className="w-3.5 h-3.5 accent-brand-navy rounded"
              />
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeColors[t]}`}>{t}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function OPMDashboard() {
  const today = toYMD(new Date());
  const yesterday = toYMD(new Date(Date.now() - 86400000));
  const tomorrow  = toYMD(new Date(Date.now() + 86400000));

  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [subArea, setSubArea] = useState('All');
  const [typeFilter, setTypeFilter] = useState<Set<BookingType>>(new Set());
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/bookings')
      .then(r => r.json())
      .then((data: { bookings?: Booking[] } | Booking[]) => {
        const list = Array.isArray(data) ? data : (data.bookings ?? []);
        setAllBookings(list.filter((b: Booking) => b.status === 'published'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subAreas = useMemo(() => {
    const areas = [...new Set(allBookings.map(b => b.subArea))].filter(Boolean).sort();
    return ['All', ...areas];
  }, [allBookings]);

  const typeActive = typeFilter.size > 0 && typeFilter.size < ALL_BOOKING_TYPES.length;

  const filtered = useMemo(() => {
    return allBookings.filter(b => {
      const dateMatch = b.startDate === selectedDate;
      const areaMatch = subArea === 'All' || b.subArea === subArea;
      const typeMatch = !typeActive || typeFilter.has(bookingClass(b) as BookingType);
      return dateMatch && areaMatch && typeMatch;
    });
  }, [allBookings, selectedDate, subArea, typeFilter, typeActive]);

  /* stats across selected date (regardless of subArea filter) */
  const statsForDate = useMemo(() => {
    const forDate = allBookings.filter(b => b.startDate === selectedDate);
    const forFiltered = forDate.filter(b => {
      const areaMatch = subArea === 'All' || b.subArea === subArea;
      const typeMatch = !typeActive || typeFilter.has(bookingClass(b) as BookingType);
      return areaMatch && typeMatch;
    });
    return {
      total:    forFiltered.length,
      clients:  new Set(forFiltered.map(b => b.clientName)).size,
      hubs:     new Set(forFiltered.map(b => b.hubName)).size,
      vehicles: forFiltered.filter(b => b.vehicleId).length,
    };
  }, [allBookings, selectedDate, subArea]);

  const quickLabel = selectedDate === yesterday ? 'Yesterday'
    : selectedDate === today ? 'Today'
    : selectedDate === tomorrow ? 'Tomorrow'
    : fmt(selectedDate);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">My Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Published trips — {quickLabel}</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sub-Area</span>
          <select
            value={subArea}
            onChange={e => setSubArea(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-navy/30 min-w-[140px]"
          >
            {subAreas.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-slate-200" />

          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Booking Type</span>
          <BookingTypeFilter selected={typeFilter} onChange={setTypeFilter} />
        </div>
      </div>

      {/* ── Date bar ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-3 shrink-0">
        <QuickPill label="Yesterday" active={selectedDate === yesterday} onClick={() => setSelectedDate(yesterday)} />
        <QuickPill label="Today"     active={selectedDate === today}     onClick={() => setSelectedDate(today)}     />
        <QuickPill label="Tomorrow"  active={selectedDate === tomorrow}  onClick={() => setSelectedDate(tomorrow)}  />

        {/* divider */}
        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Calendar date picker */}
        <label className="flex items-center gap-2 cursor-pointer">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-navy/30 bg-white"
          />
        </label>

        <span className="ml-auto text-xs text-slate-400">{fmt(selectedDate)}</span>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Trips"    value={loading ? '…' : statsForDate.total}    color="text-brand-navy"  />
          <StatCard label="Clients"  value={loading ? '…' : statsForDate.clients}  color="text-blue-600"    />
          <StatCard label="Hubs"     value={loading ? '…' : statsForDate.hubs}     color="text-purple-600"  />
          <StatCard label="Vehicles" value={loading ? '…' : statsForDate.vehicles} color="text-green-600"   />
        </div>

        {/* Trips table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Published Trips
              {!loading && <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length})</span>}
            </span>
            <span className="text-xs text-slate-400">
              {subArea !== 'All' ? subArea : 'All Sub-Areas'} · {fmt(selectedDate)}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-300 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                  d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <p className="text-sm font-medium text-slate-400">No published trips for this date</p>
              <p className="text-xs text-slate-300">Try a different date or sub-area</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filtered.map(b => (
                <TripCard
                  key={b.id}
                  booking={{ ...b, finalStatus: localStatus[b.id] ?? (b as any).finalStatus }}
                  onStatusChange={(id, v) => setLocalStatus(s => ({ ...s, [id]: v }))}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
