import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/* ─── Types ──────────────────────────────────────────────────────────────── */
const TRIP_TYPES = ['OD-Local', 'OD-UPC', 'Sch-Local', 'Sch-UPC'] as const;
type TripType = typeof TRIP_TYPES[number];
type TripStatus = 'to-start' | 'in-progress' | 'completed';

interface Charge { label: string; amount: number; category: 'revenue' | 'cost' | 'expense'; note?: string; }
interface Trip {
  id: string; clientName: string; driver: string; driverPhone: string;
  partner: string; region: string; type: TripType; status: TripStatus;
  date: string; startTime: string; endTime?: string;
  origin: string; destination: string; km: number;
  vehicleNo: string; vehicleType: string;
  lateBy?: number; outlier?: string;
  charges: Charge[];
}

/* ─── Dummy Data ─────────────────────────────────────────────────────────── */
const DUMMY_TRIPS: Trip[] = [
  {
    id: 'TR-001', clientName: 'Flipkart Logistics', driver: 'Rajesh Kumar', driverPhone: '9876543210',
    partner: 'Swift Carriers', region: 'Delhi NCR', type: 'Sch-Local', status: 'completed',
    date: '2026-06-12', startTime: '06:00', endTime: '14:30',
    origin: 'Naraina Hub, Delhi', destination: 'Noida Sector 62 WH', km: 210, vehicleNo: 'DL-3C-9821', vehicleType: '14ft',
    charges: [
      { label: 'Base Freight', amount: 10500, category: 'revenue' },
      { label: 'Night Allowance', amount: 800, category: 'revenue' },
      { label: 'Loading Charges', amount: 1100, category: 'revenue' },
      { label: 'Driver Cost', amount: 7200, category: 'cost' },
      { label: 'Fuel Cost', amount: 2100, category: 'cost' },
      { label: 'Toll', amount: 350, category: 'expense', note: 'NH-24 toll — receipt attached' },
    ],
  },
  {
    id: 'TR-002', clientName: 'Amazon India', driver: 'Suresh Patil', driverPhone: '9812345678',
    partner: 'Bharat Movers', region: 'Mumbai', type: 'OD-UPC', status: 'completed',
    date: '2026-06-12', startTime: '05:30', endTime: '19:45',
    origin: 'Bhiwandi WH', destination: 'Pune FC', km: 180, vehicleNo: 'MH-04-AB-5523', vehicleType: '24ft',
    lateBy: 45, outlier: 'Toll mismatch ₹800',
    charges: [
      { label: 'Base Freight', amount: 22000, category: 'revenue' },
      { label: 'OD Premium', amount: 3500, category: 'revenue' },
      { label: 'Unloading Charges', amount: 2500, category: 'revenue' },
      { label: 'Driver Cost', amount: 14000, category: 'cost' },
      { label: 'Fuel Cost', amount: 6400, category: 'cost' },
      { label: 'Highway Toll', amount: 600, category: 'expense' },
      { label: 'Halt Charge', amount: 400, category: 'expense', note: 'Unplanned halt at Khopoli — 2hrs' },
      { label: 'Toll Dispute', amount: 200, category: 'expense', note: '⚠️ Mismatch — under review' },
    ],
  },
  {
    id: 'TR-003', clientName: 'Reliance Retail', driver: 'Mohan Sharma', driverPhone: '9900112233',
    partner: 'Swift Carriers', region: 'Delhi NCR', type: 'Sch-Local', status: 'in-progress',
    date: '2026-06-12', startTime: '09:00',
    origin: 'Mundka ICD', destination: 'Gurugram DC', km: 145, vehicleNo: 'DL-1LB-3345', vehicleType: '20ft',
    charges: [
      { label: 'Base Freight', amount: 8500, category: 'revenue' },
      { label: 'Sunday Surcharge', amount: 1000, category: 'revenue' },
      { label: 'Driver Cost', amount: 5800, category: 'cost' },
      { label: 'Fuel Cost', amount: 1400, category: 'cost' },
    ],
  },
  {
    id: 'TR-004', clientName: 'D-Mart', driver: 'Anil Verma', driverPhone: '9765432100',
    partner: 'Kapoor Logistics', region: 'Pune', type: 'OD-Local', status: 'in-progress',
    date: '2026-06-12', startTime: '10:30',
    origin: 'Chakan WH', destination: 'Hadapsar Store', km: 45, vehicleNo: 'MH-12-GH-8812', vehicleType: 'Tata Ace',
    lateBy: 30,
    charges: [
      { label: 'Base Freight', amount: 4200, category: 'revenue' },
      { label: 'Multi-drop Charges', amount: 3800, category: 'revenue' },
      { label: 'Driver Cost', amount: 5100, category: 'cost' },
      { label: 'Fuel Cost', amount: 800, category: 'cost' },
      { label: 'Parking', amount: 200, category: 'expense', note: 'Hadapsar municipal parking' },
    ],
  },
  {
    id: 'TR-005', clientName: 'BigBasket', driver: 'Vijay Nair', driverPhone: '9988776655',
    partner: 'Horizon Fleet', region: 'Bangalore', type: 'Sch-UPC', status: 'to-start',
    date: '2026-06-12', startTime: '14:00',
    origin: 'Nelamangala WH', destination: 'Mysore DC', km: 150, vehicleNo: 'KA-51-AX-4400', vehicleType: '17ft',
    charges: [
      { label: 'Base Freight', amount: 28000, category: 'revenue' },
      { label: 'Sch Commitment Bonus', amount: 4500, category: 'revenue' },
      { label: 'Unloading', amount: 2000, category: 'revenue' },
      { label: 'Driver Cost', amount: 18000, category: 'cost' },
      { label: 'Fuel Cost', amount: 7200, category: 'cost' },
    ],
  },
  {
    id: 'TR-006', clientName: 'Meesho', driver: 'Ravi Singh', driverPhone: '9871122334',
    partner: 'Bharat Movers', region: 'Hyderabad', type: 'OD-Local', status: 'to-start',
    date: '2026-06-12', startTime: '15:30',
    origin: 'Patancheru WH', destination: 'Secunderabad Hub', km: 38, vehicleNo: 'TS-09-EF-2210', vehicleType: 'Tata Ace',
    charges: [
      { label: 'Base Freight', amount: 6200, category: 'revenue' },
      { label: 'Last-mile Surcharge', amount: 2500, category: 'revenue' },
      { label: 'Driver Cost', amount: 4800, category: 'cost' },
      { label: 'Fuel Cost', amount: 700, category: 'cost' },
    ],
  },
  {
    id: 'TR-007', clientName: 'Nykaa', driver: 'Deepak Mishra', driverPhone: '9654321087',
    partner: 'Swift Carriers', region: 'Mumbai', type: 'Sch-Local', status: 'completed',
    date: '2026-06-12', startTime: '07:00', endTime: '13:15',
    origin: 'Andheri WH', destination: 'Thane Distribution', km: 55, vehicleNo: 'MH-02-BX-9900', vehicleType: '14ft',
    charges: [
      { label: 'Base Freight', amount: 6500, category: 'revenue' },
      { label: 'Loading Charges', amount: 1300, category: 'revenue' },
      { label: 'Driver Cost', amount: 5200, category: 'cost' },
      { label: 'Fuel Cost', amount: 750, category: 'cost' },
      { label: 'Toll', amount: 150, category: 'expense' },
    ],
  },
  {
    id: 'TR-008', clientName: 'Zomato Supply', driver: 'Pradeep Yadav', driverPhone: '9823456789',
    partner: 'Kapoor Logistics', region: 'Delhi NCR', type: 'OD-UPC', status: 'completed',
    date: '2026-06-12', startTime: '04:30', endTime: '21:00',
    origin: 'Kundli ICD', destination: 'Jaipur WH', km: 270, vehicleNo: 'HR-26-BA-5511', vehicleType: '32ft SXL',
    lateBy: 90, outlier: 'Extra halting ₹1500',
    charges: [
      { label: 'Base Freight', amount: 26000, category: 'revenue' },
      { label: 'OD Premium', amount: 3500, category: 'revenue' },
      { label: 'Night Start Allowance', amount: 1500, category: 'revenue' },
      { label: 'Driver Cost', amount: 18000, category: 'cost' },
      { label: 'Fuel Cost', amount: 6000, category: 'cost' },
      { label: 'Toll (NH-48)', amount: 900, category: 'expense' },
      { label: 'Halting Charges', amount: 1500, category: 'expense', note: '⚠️ Unplanned halt at Shahjahanpur — 3hrs — dispute raised' },
      { label: 'Driver OT', amount: 600, category: 'expense', note: 'Overtime beyond 14hrs' },
    ],
  },
  {
    id: 'TR-009', clientName: 'IKEA India', driver: 'Sanjay Gupta', driverPhone: '9741230987',
    partner: 'Horizon Fleet', region: 'Bangalore', type: 'Sch-Local', status: 'in-progress',
    date: '2026-06-12', startTime: '11:00',
    origin: 'Devanahalli DC', destination: 'Whitefield Store', km: 60, vehicleNo: 'KA-01-MX-2234', vehicleType: '20ft',
    charges: [
      { label: 'Base Freight', amount: 11000, category: 'revenue' },
      { label: 'Assembly Surcharge', amount: 2200, category: 'revenue' },
      { label: 'Driver Cost', amount: 8400, category: 'cost' },
      { label: 'Fuel Cost', amount: 1200, category: 'cost' },
    ],
  },
  {
    id: 'TR-010', clientName: 'Tata 1mg', driver: 'Ramesh Tiwari', driverPhone: '9654876123',
    partner: 'Swift Carriers', region: 'Pune', type: 'Sch-UPC', status: 'to-start',
    date: '2026-06-12', startTime: '16:00',
    origin: 'Ranjangaon WH', destination: 'Nashik DC', km: 210, vehicleNo: 'MH-14-AY-1122', vehicleType: '24ft',
    charges: [
      { label: 'Base Freight', amount: 19000, category: 'revenue' },
      { label: 'Pharma Handling', amount: 2500, category: 'revenue' },
      { label: 'Cold Chain Allowance', amount: 1000, category: 'revenue' },
      { label: 'Driver Cost', amount: 14000, category: 'cost' },
      { label: 'Fuel Cost', amount: 3800, category: 'cost' },
    ],
  },
  // Yesterday
  {
    id: 'TR-011', clientName: 'Flipkart Logistics', driver: 'Kiran Mehta', driverPhone: '9876500011',
    partner: 'Bharat Movers', region: 'Hyderabad', type: 'OD-Local', status: 'completed',
    date: '2026-06-11', startTime: '08:00', endTime: '16:20',
    origin: 'Patancheru WH', destination: 'Warangal FC', km: 145, vehicleNo: 'TS-07-CD-3311', vehicleType: '20ft',
    charges: [
      { label: 'Base Freight', amount: 8200, category: 'revenue' },
      { label: 'Loading Charges', amount: 1000, category: 'revenue' },
      { label: 'Driver Cost', amount: 6200, category: 'cost' },
      { label: 'Fuel Cost', amount: 1800, category: 'cost' },
      { label: 'Toll', amount: 400, category: 'expense' },
    ],
  },
];

const WEEKLY = [
  { day: 'Mon', rev: 142000, cost: 108000 },
  { day: 'Tue', rev: 168000, cost: 129000 },
  { day: 'Wed', rev: 135000, cost: 103000 },
  { day: 'Thu', rev: 189000, cost: 144000 },
  { day: 'Fri', rev: 201000, cost: 152000 },
  { day: 'Sat', rev: 154000, cost: 118000 },
  { day: 'Sun', rev: 178000, cost: 136000 },
];

const TOP_DRIVERS = [
  { name: 'Rajesh Kumar', trips: 28, onTime: 96, revenue: 182000, score: 98 },
  { name: 'Vijay Nair',   trips: 24, onTime: 92, revenue: 161000, score: 93 },
  { name: 'Kiran Mehta',  trips: 22, onTime: 91, revenue: 148000, score: 91 },
];
const BAD_DRIVERS = [
  { name: 'Pradeep Yadav', trips: 18, lateTrips: 8, outliers: 3, score: 42 },
  { name: 'Deepak Mishra', trips: 15, lateTrips: 6, outliers: 2, score: 51 },
];
const TOP_PARTNERS = [
  { name: 'Swift Carriers',  trips: 64, onTime: 94, revenue: 412000 },
  { name: 'Bharat Movers',   trips: 58, onTime: 89, revenue: 378000 },
  { name: 'Horizon Fleet',   trips: 49, onTime: 91, revenue: 341000 },
];
const REGIONS = [
  { name: 'Delhi NCR', revenue: 520000, late: 8 },
  { name: 'Mumbai',    revenue: 448000, late: 6 },
  { name: 'Bangalore', revenue: 389000, late: 4 },
  { name: 'Pune',      revenue: 268000, late: 7 },
  { name: 'Hyderabad', revenue: 241000, late: 5 },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtINR = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`;

const marginOf = (t: Trip) => {
  const rev  = t.charges.filter(c => c.category === 'revenue').reduce((s, c) => s + c.amount, 0);
  const cost = t.charges.filter(c => c.category !== 'revenue').reduce((s, c) => s + c.amount, 0);
  return rev ? ((rev - cost) / rev) * 100 : 0;
};

const revenueOf  = (t: Trip) => t.charges.filter(c => c.category === 'revenue').reduce((s, c) => s + c.amount, 0);
const costOf     = (t: Trip) => t.charges.filter(c => c.category === 'cost').reduce((s, c) => s + c.amount, 0);
const expensesOf = (t: Trip) => t.charges.filter(c => c.category === 'expense').reduce((s, c) => s + c.amount, 0);

const TYPE_COLORS: Record<TripType, string> = {
  'OD-Local':  'bg-orange-100 text-orange-700',
  'OD-UPC':    'bg-red-100 text-red-700',
  'Sch-Local': 'bg-blue-100 text-blue-700',
  'Sch-UPC':   'bg-purple-100 text-purple-700',
};

const STATUS_META: Record<TripStatus, { label: string; dot: string; pill: string }> = {
  'to-start':    { label: 'To Start',    dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-500' },
  'in-progress': { label: 'In Progress', dot: 'bg-amber-400', pill: 'bg-amber-50 text-amber-700' },
  'completed':   { label: 'Completed',   dot: 'bg-green-400', pill: 'bg-green-50 text-green-700' },
};

/* ─── Bar Chart ──────────────────────────────────────────────────────────── */
function BarChart() {
  const maxRev = Math.max(...WEEKLY.map(d => d.rev));
  const H = 64; const BW = 22;

  return (
    <svg viewBox={`0 0 ${WEEKLY.length * (BW + 12) + 12} ${H + 18}`} className="w-full h-20">
      {WEEKLY.map((d, i) => {
        const x = 12 + i * (BW + 12);
        const rh = (d.rev / maxRev) * H;
        const ch = (d.cost / maxRev) * H;
        return (
          <g key={d.day}>
            <rect x={x}     y={H - rh} width={BW}     height={rh} rx={3} fill="#1e3a5f" opacity={0.8} />
            <rect x={x + 3} y={H - ch} width={BW - 6} height={ch} rx={2} fill="#f97316" opacity={0.65} />
            <text x={x + BW / 2} y={H + 13} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Donut ──────────────────────────────────────────────────────────────── */
function Donut({ segments, total }: { segments: { pct: number; color: string }[]; total: number }) {
  const r = 28; const C = 2 * Math.PI * r; let off = 0;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      {segments.map((s, i) => {
        const dash = (s.pct / 100) * C;
        const el = (
          <circle key={i} cx={36} cy={36} r={r} fill="none" stroke={s.color} strokeWidth={10}
            strokeDasharray={`${dash} ${C}`} strokeDashoffset={-(off / 100) * C}
            transform="rotate(-90 36 36)" />
        );
        off += s.pct; return el;
      })}
      <text x={36} y={40} textAnchor="middle" fontSize={11} fontWeight="700" fill="#334155">{total}</text>
    </svg>
  );
}

/* ─── Score Ring ─────────────────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 12; const C = 2 * Math.PI * r;
  const color = score >= 85 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" className="shrink-0">
      <circle cx={16} cy={16} r={r} fill="none" stroke="#e2e8f0" strokeWidth={4} />
      <circle cx={16} cy={16} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${(score / 100) * C} ${C}`} strokeLinecap="round"
        transform="rotate(-90 16 16)" />
      <text x={16} y={20} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

/* ─── KPI Tile ───────────────────────────────────────────────────────────── */
function KpiTile({ label, value, sub, icon, iconBg }: {
  label: string; value: string; sub: string; icon: string; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight truncate">{value}</p>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Trip Detail Drawer ─────────────────────────────────────────────────── */
function TripDrawer({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const rev  = revenueOf(trip);
  const cost = costOf(trip);
  const exp  = expensesOf(trip);
  const margin = rev ? ((rev - cost - exp) / rev * 100).toFixed(1) : '0';
  const sm   = STATUS_META[trip.status];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer panel */}
      <div ref={ref} className="w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-[slideIn_180ms_ease-out]">
        {/* Header */}
        <div className="bg-brand-navy px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-white/60">{trip.id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[trip.type]}`}>{trip.type}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sm.pill}`}>{sm.label}</span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">{trip.clientName}</h2>
            <p className="text-xs text-white/50 mt-0.5">{trip.origin} → {trip.destination}</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none mt-0.5">✕</button>
        </div>

        {/* Financial summary strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
          {[
            { label: 'Revenue', val: fmtINR(rev), color: 'text-green-600' },
            { label: 'Cost + Exp', val: fmtINR(cost + exp), color: 'text-red-500' },
            { label: 'Margin', val: `${margin}%`, color: Number(margin) >= 18 ? 'text-green-600' : Number(margin) >= 10 ? 'text-amber-500' : 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="text-center py-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Alerts */}
          {(trip.lateBy || trip.outlier) && (
            <div className="mx-4 mt-4 space-y-2">
              {trip.lateBy && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                  <span className="text-sm">⏱️</span>
                  <span className="text-xs font-semibold text-red-600">Late by {trip.lateBy} min</span>
                </div>
              )}
              {trip.outlier && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                  <span className="text-sm">⚠️</span>
                  <span className="text-xs font-semibold text-amber-700">{trip.outlier}</span>
                </div>
              )}
            </div>
          )}

          {/* Trip info */}
          <div className="mx-4 mt-4 bg-slate-50 rounded-xl border border-slate-100 p-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Driver',    `${trip.driver}`],
              ['Phone',     trip.driverPhone],
              ['Partner',   trip.partner],
              ['Vehicle',   `${trip.vehicleNo} · ${trip.vehicleType}`],
              ['Start',     trip.startTime + (trip.endTime ? ` → ${trip.endTime}` : ' (ongoing)')],
              ['Distance',  `${trip.km} km`],
              ['Region',    trip.region],
              ['Date',      trip.date],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{k}</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Charges breakdown */}
          <div className="mx-4 mt-4 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Charge Breakdown</p>

            {/* Revenue */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Revenue Components
              </p>
              <div className="rounded-xl border border-green-100 overflow-hidden">
                {trip.charges.filter(c => c.category === 'revenue').map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-50 last:border-0 bg-white hover:bg-green-50/40 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-slate-700">{c.label}</p>
                      {c.note && <p className="text-[10px] text-slate-400 mt-0.5">{c.note}</p>}
                    </div>
                    <span className="text-xs font-bold text-green-600">+{fmtINR(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-green-50 border-t border-green-100">
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Total Revenue</span>
                  <span className="text-xs font-bold text-green-700">{fmtINR(rev)}</span>
                </div>
              </div>
            </div>

            {/* Cost */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Operating Costs
              </p>
              <div className="rounded-xl border border-red-100 overflow-hidden">
                {trip.charges.filter(c => c.category === 'cost').map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-50 last:border-0 bg-white hover:bg-red-50/40 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-slate-700">{c.label}</p>
                      {c.note && <p className="text-[10px] text-slate-400 mt-0.5">{c.note}</p>}
                    </div>
                    <span className="text-xs font-bold text-red-500">−{fmtINR(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-red-50 border-t border-red-100">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Total Cost</span>
                  <span className="text-xs font-bold text-red-600">{fmtINR(cost)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            {trip.charges.filter(c => c.category === 'expense').length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Additional Expenses
                </p>
                <div className="rounded-xl border border-amber-100 overflow-hidden">
                  {trip.charges.filter(c => c.category === 'expense').map((c, i) => (
                    <div key={i} className="flex items-start justify-between px-3 py-2.5 border-b border-slate-50 last:border-0 bg-white hover:bg-amber-50/40 transition-colors gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700">{c.label}</p>
                        {c.note && <p className="text-[10px] text-amber-600 mt-0.5">{c.note}</p>}
                      </div>
                      <span className="text-xs font-bold text-amber-600 shrink-0">−{fmtINR(c.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-3 py-2 bg-amber-50 border-t border-amber-100">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Total Addl Exp</span>
                    <span className="text-xs font-bold text-amber-700">{fmtINR(exp)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Net P&L */}
            <div className="rounded-xl border border-brand-navy/20 bg-brand-navy/5 p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">P&L Summary</p>
              <div className="space-y-2">
                {[
                  { label: 'Total Revenue',     val: rev,          color: 'text-green-600', sign: '+' },
                  { label: 'Operating Cost',    val: -(cost),      color: 'text-red-500',   sign: '−' },
                  { label: 'Additional Exp',    val: -(exp),       color: 'text-amber-600', sign: '−' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{row.label}</span>
                    <span className={`font-semibold ${row.color}`}>{row.sign}{fmtINR(Math.abs(row.val))}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-sm font-bold text-slate-700">Net Profit</span>
                  <span className={`text-sm font-bold ${rev - cost - exp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtINR(rev - cost - exp)}
                    <span className="text-xs font-normal ml-1 opacity-70">({margin}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Trip Row ───────────────────────────────────────────────────────────── */
function TripRow({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const rev  = revenueOf(trip);
  const cost = costOf(trip) + expensesOf(trip);
  const m    = rev ? ((rev - cost) / rev * 100).toFixed(1) : '0';
  const exp  = expensesOf(trip);
  const sm   = STATUS_META[trip.status];

  return (
    <tr onClick={onOpen}
      className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors group">
      <td className="px-4 py-3">
        <div className="font-mono text-[10px] text-slate-400 group-hover:text-brand-navy transition-colors">{trip.id}</div>
        <div className="text-xs font-semibold text-slate-800 mt-0.5 truncate max-w-[140px]">{trip.clientName}</div>
      </td>
      <td className="px-3 py-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TYPE_COLORS[trip.type]}`}>{trip.type}</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sm.dot}`} />
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${sm.pill}`}>{sm.label}</span>
        </div>
      </td>
      <td className="px-3 py-3 max-w-[120px]">
        <div className="text-xs text-slate-600 truncate">👤 {trip.driver}</div>
        <div className="text-[10px] text-slate-400 truncate">🏢 {trip.partner}</div>
      </td>
      <td className="px-3 py-3 text-right">
        <div className="text-xs font-bold text-slate-800">{fmtINR(rev)}</div>
        <div className="text-[10px] text-slate-400">{fmtINR(costOf(trip))} cost</div>
      </td>
      <td className="px-3 py-3 text-right">
        <span className={`text-xs font-bold ${Number(m) >= 18 ? 'text-green-600' : Number(m) >= 10 ? 'text-amber-500' : 'text-red-500'}`}>{m}%</span>
      </td>
      <td className="px-3 py-3 text-right">
        {exp > 0
          ? <span className="text-xs font-semibold text-red-500">+{fmtINR(exp)}</span>
          : <span className="text-[11px] text-slate-300">—</span>}
      </td>
      <td className="px-3 py-3 text-center">
        {trip.lateBy
          ? <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 rounded-md whitespace-nowrap">+{trip.lateBy}m</span>
          : <span className="text-[10px] text-green-500">✓</span>}
      </td>
      <td className="px-3 py-3 text-[10px]">
        {trip.outlier
          ? <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md font-medium">{trip.outlier}</span>
          : <span className="text-slate-200">—</span>}
      </td>
      <td className="px-3 py-3 text-[10px] text-slate-400">📍 {trip.region}</td>
      <td className="px-3 py-3">
        <span className="text-[10px] text-brand-navy opacity-0 group-hover:opacity-100 transition-opacity font-semibold">View →</span>
      </td>
    </tr>
  );
}

/* ─── Quick Pill ─────────────────────────────────────────────────────────── */
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
        active ? 'bg-brand-navy text-white border-brand-navy shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
      }`}>
      {label}
    </button>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function MyTripsDashboard() {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const [date,        setDate]        = useState(today);
  const [statusTab,   setStatusTab]   = useState<TripStatus | 'all'>('all');
  const [typeFilter,  setTypeFilter]  = useState<Set<TripType>>(new Set());
  const [regionFilter,setRegionFilter]= useState('All');
  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]    = useState<Trip | null>(null);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const allForDate = DUMMY_TRIPS.filter(t => t.date === date);

  const trips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allForDate.filter(t => {
      const matchStatus = statusTab === 'all' || t.status === statusTab;
      const matchType   = typeFilter.size === 0 || typeFilter.has(t.type);
      const matchRegion = regionFilter === 'All' || t.region === regionFilter;
      const matchSearch = !q || t.id.toLowerCase().includes(q)
        || t.clientName.toLowerCase().includes(q)
        || t.driver.toLowerCase().includes(q)
        || t.partner.toLowerCase().includes(q)
        || t.vehicleNo.toLowerCase().includes(q);
      return matchStatus && matchType && matchRegion && matchSearch;
    });
  }, [date, statusTab, typeFilter, regionFilter, search, allForDate]);

  /* Close search dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* All trips (all dates) for search suggestions — not date-filtered */
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return DUMMY_TRIPS.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.clientName.toLowerCase().includes(q) ||
      t.driver.toLowerCase().includes(q) ||
      t.partner.toLowerCase().includes(q) ||
      t.vehicleNo.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const totalRev  = allForDate.reduce((s, t) => s + revenueOf(t), 0);
  const totalCost = allForDate.reduce((s, t) => s + costOf(t), 0);
  const totalExp  = allForDate.reduce((s, t) => s + expensesOf(t), 0);
  const margin    = totalRev ? ((totalRev - totalCost - totalExp) / totalRev * 100).toFixed(1) : '0';
  const lateCount = allForDate.filter(t => t.lateBy).length;
  const outlierCount = allForDate.filter(t => t.outlier).length;

  const counts = {
    all:           allForDate.length,
    'to-start':    allForDate.filter(t => t.status === 'to-start').length,
    'in-progress': allForDate.filter(t => t.status === 'in-progress').length,
    completed:     allForDate.filter(t => t.status === 'completed').length,
  };

  const toggleType = (t: TripType) => {
    const n = new Set(typeFilter);
    n.has(t) ? n.delete(t) : n.add(t);
    setTypeFilter(n);
  };

  const regions = ['All', ...new Set(DUMMY_TRIPS.map(t => t.region))];
  const filteredRev = trips.reduce((s, t) => s + revenueOf(t), 0);
  const filteredNet = trips.reduce((s, t) => s + revenueOf(t) - costOf(t) - expensesOf(t), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-5 py-3.5 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-slate-800">My Trips Dashboard</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Live view · OPM Console</p>
          </div>

          {/* Search with suggestions */}
          <div ref={searchRef} className="relative w-72">
            <div className={`flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-2 transition-all ${searchOpen && search ? 'border-brand-navy ring-2 ring-brand-navy/10 rounded-b-none border-b-0' : 'border-slate-200'}`}>
              <span className="text-slate-400 text-xs shrink-0">🔍</span>
              <input
                type="text"
                placeholder="Search trip ID, client, driver…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400 min-w-0"
              />
              {search && (
                <button onClick={() => { setSearch(''); setSearchOpen(false); }} className="text-slate-300 hover:text-slate-500 text-xs shrink-0">✕</button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {searchOpen && search && (
              <div className="absolute left-0 right-0 top-full bg-white border border-brand-navy/20 border-t-0 rounded-b-lg shadow-xl z-40 overflow-hidden">
                {searchSuggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400">No results for "{search}"</div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                      {searchSuggestions.length} result{searchSuggestions.length > 1 ? 's' : ''}
                    </div>
                    {searchSuggestions.map(t => {
                      const sm = STATUS_META[t.status];
                      return (
                        <button
                          key={t.id}
                          onClick={() => { setSelected(t); setSearchOpen(false); setSearch(t.id); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-brand-navy/5 transition-colors border-b border-slate-50 last:border-0 text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-brand-navy font-bold">{t.id}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[t.type]}`}>{t.type}</span>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sm.dot}`} />
                            </div>
                            <div className="text-xs font-medium text-slate-700 truncate mt-0.5">{t.clientName}</div>
                            <div className="text-[10px] text-slate-400 truncate">👤 {t.driver} · 🏢 {t.partner}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-green-600">{fmtINR(revenueOf(t))}</div>
                            <div className="text-[9px] text-slate-400">{t.date}</div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none">
              {regions.map(r => <option key={r}>{r}</option>)}
            </select>
            <div className="flex items-center gap-1">
              {TRIP_TYPES.map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                    typeFilter.has(t) ? TYPE_COLORS[t] + ' border-transparent shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DATE + STATUS TABS ───────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-5 py-2 shrink-0 flex items-center gap-3">
        <Pill label="Yesterday" active={date === yesterday} onClick={() => setDate(yesterday)} />
        <Pill label="Today"     active={date === today}     onClick={() => setDate(today)} />
        <div className="h-4 w-px bg-slate-200" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none" />

        {/* Status tabs — pushed to right */}
        <div className="ml-auto flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
          {(['all', 'to-start', 'in-progress', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setStatusTab(s)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                statusTab === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {s !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[s].dot}`} />}
              {s === 'all' ? 'All' : STATUS_META[s].label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${statusTab === s ? 'bg-brand-navy text-white' : 'bg-slate-200 text-slate-500'}`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* KPI Row — 3+3 layout */}
        <div className="grid grid-cols-3 gap-3">
          <KpiTile label="Total Trips"   value={String(allForDate.length)} sub={`${counts['in-progress']} active · ${counts['to-start']} to start`} icon="🚛" iconBg="bg-brand-navy/10" />
          <KpiTile label="Total Revenue" value={fmtINR(totalRev)}   sub={`Avg ${fmtINR(Math.round(totalRev / (allForDate.length || 1)))} / trip`} icon="💰" iconBg="bg-green-50" />
          <KpiTile label="Total Cost"    value={fmtINR(totalCost)}  sub={`+ ${fmtINR(totalExp)} additional expenses`} icon="📉" iconBg="bg-red-50" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <KpiTile label="Gross Margin"  value={`${margin}%`}       sub="(Rev − Cost − Addl) / Rev" icon="📊" iconBg="bg-blue-50" />
          <KpiTile label="Late Trips"    value={String(lateCount)}  sub={`${totalRev ? ((lateCount / allForDate.length) * 100).toFixed(0) : 0}% of total trips`} icon="⏱️" iconBg="bg-amber-50" />
          <KpiTile label="Outliers"      value={String(outlierCount)} sub="Payment / driver anomalies" icon="⚠️" iconBg="bg-orange-50" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-3 gap-3">

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Revenue vs Cost · 7 Days</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-brand-navy inline-block" />Rev</span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400"><span className="w-2 h-2 rounded-sm bg-orange-400 inline-block" />Cost</span>
              </div>
            </div>
            <BarChart />
            <p className="text-[10px] text-slate-400 mt-1">Week avg margin: <strong className="text-green-600">21.4%</strong></p>
          </div>

          {/* Donut */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs font-semibold text-slate-700 block mb-3">Trip Type Split</span>
            <div className="flex items-center gap-4">
              <Donut
                total={allForDate.length}
                segments={[
                  { pct: 32, color: '#f97316' }, { pct: 28, color: '#ef4444' },
                  { pct: 24, color: '#3b82f6' }, { pct: 16, color: '#a855f7' },
                ]}
              />
              <div className="space-y-2">
                {[['OD-Local','bg-orange-400','32'],['OD-UPC','bg-red-400','28'],['Sch-Local','bg-blue-400','24'],['Sch-UPC','bg-purple-400','16']].map(([l,c,p]) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-sm shrink-0 ${c}`} />
                    <span className="text-[10px] text-slate-600 w-16">{l}</span>
                    <span className="text-[10px] font-bold text-slate-700">{p}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Region */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <span className="text-xs font-semibold text-slate-700 block mb-3">Region Performance</span>
            <div className="space-y-2.5">
              {REGIONS.map(r => (
                <div key={r.name} className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 w-[68px] shrink-0 truncate">{r.name}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-navy/70" style={{ width: `${Math.round(r.revenue / 5200)}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 w-9 text-right shrink-0">{fmtINR(r.revenue)}</span>
                  <span className={`text-[9px] font-bold w-5 text-right shrink-0 ${r.late <= 4 ? 'text-green-500' : r.late <= 6 ? 'text-amber-500' : 'text-red-500'}`}>{r.late}L</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drivers & Partners Row */}
        <div className="grid grid-cols-3 gap-3">

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-700">🏆 Top Drivers</span>
              <span className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">This Week</span>
            </div>
            {TOP_DRIVERS.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{d.name}</p>
                  <p className="text-[9px] text-slate-400">{d.trips} trips · {d.onTime}% on-time</p>
                </div>
                <span className="text-[10px] font-bold text-green-600 shrink-0">{fmtINR(d.revenue)}</span>
                <ScoreRing score={d.score} />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-red-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-700">⚠️ Needs Attention</span>
              <span className="text-[9px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">Drivers</span>
            </div>
            {BAD_DRIVERS.map(d => (
              <div key={d.name} className="flex items-center gap-2.5 py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{d.name}</p>
                  <div className="flex gap-1.5 mt-0.5">
                    <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded font-medium">{d.lateTrips} late</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-medium">{d.outliers} outliers</span>
                  </div>
                </div>
                <ScoreRing score={d.score} />
              </div>
            ))}
            <p className="text-[9px] text-slate-400 mt-3 leading-relaxed">Drivers with score &lt;60 flagged for review</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-700">🤝 Top Partners</span>
              <span className="text-[9px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">This Week</span>
            </div>
            {TOP_PARTNERS.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                <span className="text-[10px] font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{p.name}</p>
                  <p className="text-[9px] text-slate-400">{p.trips} trips · {p.onTime}% on-time</p>
                </div>
                <span className="text-[10px] font-bold text-brand-navy shrink-0">{fmtINR(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trip Table ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Trips
              <span className="ml-2 text-xs font-normal text-slate-400">({trips.length})</span>
              {search && <span className="ml-2 text-[10px] text-brand-navy font-medium bg-brand-navy/10 px-2 py-0.5 rounded-full">"{search}"</span>}
            </span>
            <span className="text-[10px] text-slate-400">Click any row for full trip details</span>
          </div>

          {trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-4xl">🔍</span>
              <p className="text-sm font-medium text-slate-400">No trips match</p>
              <p className="text-xs text-slate-300">Try a different filter or search term</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left">Trip / Client</th>
                      <th className="px-3 py-2.5 text-left">Type</th>
                      <th className="px-3 py-2.5 text-left">Status</th>
                      <th className="px-3 py-2.5 text-left">Driver / Partner</th>
                      <th className="px-3 py-2.5 text-right">Revenue</th>
                      <th className="px-3 py-2.5 text-right">Margin</th>
                      <th className="px-3 py-2.5 text-right">Addl Exp</th>
                      <th className="px-3 py-2.5 text-center">Late</th>
                      <th className="px-3 py-2.5 text-left">Outlier</th>
                      <th className="px-3 py-2.5 text-left">Region</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(t => (
                      <TripRow key={t.id} trip={t} onOpen={() => setSelected(t)} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer totals */}
              <div className="flex items-center gap-6 px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-semibold flex-1">Subtotal — {trips.length} trips</span>
                <span className="font-bold text-green-700">{fmtINR(filteredRev)} rev</span>
                <span className={`font-bold ${filteredNet >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtINR(filteredNet)} net</span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Trip Detail Drawer ─────────────────────────────────────── */}
      {selected && <TripDrawer trip={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
