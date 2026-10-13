import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { OPMHubDetails } from './OPMApprovals';
import { getUser } from '../hooks/useAuth';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface DraftStep { [key: string]: string | undefined; }

interface DraftPricing {
  id: string; type: string;
  odName?: string;
  schedName?: string; odVehicle?: string; schedVehicleType?: string;
}

interface Draft {
  id: string;
  steps: {
    group?:       DraftStep;
    legalEntity?: DraftStep;
    vertical?:    DraftStep;
    poc?:         DraftStep;
    city?:        DraftStep;
  };
  opmStatus:      string | null;
  opmHubDetails?: OPMHubDetails;
  opmHubs?:       OPMHubDetails[];
  pricings?:      DraftPricing[];
  driverPricings?: DraftPricing[];
}

export interface Booking {
  id:        string;
  subArea:   string;
  area:      string;
  status:      'draft' | 'confirmed' | 'published';
  createdAt:   string;
  createdBy:   string;
  publishedAt?:  string;
  publishDate?:  string;
  publishEndDate?: string;
  odStatus?: 'open' | 'applications' | 'confirmed';
  schStatus?: 'open' | 'bids' | 'confirmed';
  nonWorkingDays?: string[];
  applications?: { id: string; partner: string; contact: string; vehicle: string; bid?: number; appliedAt?: string; quoteStatus: string; opmStatus: string | null }[];

  draftId:                  string;
  clientName:               string;
  clientSupervisorName?:    string;
  clientSupervisorContact?: string;
  bookingTime?:             string;
  hubName:                  string;
  clientPricingLabel?:      string;
  clientPricingDetails?:    string;

  partnerNumber?:     string;
  partnerName?:       string;
  bankAccountNumber?: string;
  vehicleId?:         string;
  driverPricing?:     string;
  vehicleType?:       string;
  vehicleBodyType?:   string;
  vehicleAttributes?: string[];
  driverContact?:     string;
  driverName?:        string;
  startDate?:         string;
  materials?:         string;
  helpers?:           string;
  tripType?:          'single' | 'multiple';
  is24hrTrip?:        boolean;
  totalDistance?:     string;
  totalTime?:         string;
  bookingType?:       'within_city' | 'upcountry';

  estimatedCost?:    string;
  estimatedRevenue?: string;
  margin?:           string;
}

interface SubAreaInfo {
  subArea:    string;
  area:       string;
  clientHubs: { draft: Draft; hub: OPMHubDetails }[];
}

type View = 'list' | 'viewSubAreas' | 'viewSubArea' | 'selectBookingType' | 'createBooking' | 'editBooking';
type PricingCategory = 'od' | 'scheduled';
type TripLocation    = 'local' | 'upc';

/* ─── Options ────────────────────────────────────────────────────────────── */
const VEHICLE_TYPE_OPTIONS = [
  '2W', '3W / E-3W', '0.5 TON-TATA ACE', '0.75 TON-TATA ACE GOLD',
  '1 TON-TATA ACE HT', '1.25 TON-ASHOK LEYLAND DOST', '1.5 TON-MAHINDRA SUPRO',
  '2.1 TON-TATA 207', '2.5 TON-TATA 407', '3.5 TON-TATA 709',
  '5 TON-EICHER 10.90', '7 TON-TATA 1109', '9 TON-TATA 1512',
  '10 TON-TATA 1615', '14 TON-TATA 1715', '15 TON-EICHER 20.16',
  '16 TON-24 FEET TRUCK', '21 TON-32 FEET', '25 TON-40 FEET CONTAINER',
  '30 TON-TRAILER',
];
const VEHICLE_BODY_TYPE_OPTIONS = ['Open Body', 'Closed Body', 'Container', 'Flatbed', 'Refrigerated', 'Tanker', 'Tipper'];
const VEHICLE_ATTRIBUTES_OPTIONS = [
  'Open', 'Close',
  'GPS Enabled', 'Non-GPS',
  'AC', 'Non-AC',
  'With Tail Gate', 'Without Tail Gate',
  'Hydraulic',
];
const MATERIALS_OPTIONS = ['FMCG', 'Electronics', 'Garments', 'Pharma', 'Automotive', 'Food & Beverage', 'E-commerce', 'Raw Materials', 'Furniture', 'Other'];
const VEHICLE_TONNAGE_OPTIONS = ['0.5 Ton', '0.75 Ton', '1 Ton', '1.25 Ton', '1.5 Ton', '2.1 Ton', '2.5 Ton', '3.5 Ton', '5 Ton', '7 Ton', '9 Ton', '10 Ton', '14 Ton', '15 Ton', '16 Ton', '21 Ton', '25 Ton', '30 Ton'];
const WORK_TYPE_OPTIONS = ['Loading', 'Unloading', 'Loading & Unloading', 'Transit', 'Delivery', 'Pickup & Delivery', 'Other'];
const CONTRACTED_LANES = ['Indiranagar - Chennai', 'Peenya - Mumbai', 'Whitefield - Pune', 'Koramangala - Hyderabad', 'Hebbal - Delhi', 'Marathahalli - Bangalore'];
const GOODS_TYPES_OPTIONS = ['Carton Boxes', 'Crates - Beverages', 'FMCG', 'Electronics', 'Pharma', 'Garments', 'Automotive', 'Raw Materials'];
const UPC_VEHICLE_OPTIONS = [
  { label: 'Open/12 ft/2.5 ton',    code: 'OP250012', price: 6840  },
  { label: 'Closed/14 ft/3.5 ton',  code: 'CL350014', price: 8500  },
  { label: 'Container/17 ft/5 ton', code: 'CT500017', price: 12000 },
  { label: 'Open/19 ft/7 ton',      code: 'OP700019', price: 15000 },
  { label: 'Closed/22 ft/9 ton',    code: 'CL900022', price: 18500 },
];
const HELPERS_OPTIONS = [
  'Driver Only',
  'Driver cum Helper',
  'Driver with Helper',
  'Driver with 2 Helpers',
  'Driver with 3 Helpers',
  'Driver with 4 Helpers',
  'Driver with 5 Helpers',
];

/* ─── Partner / Driver types ─────────────────────────────────────────────── */
interface PartnerVehicle {
  id: string; registration: string; type: string; bodyType: string;
}
interface Partner {
  id: string; partnerNumber: string; name: string; bankAccount: string;
  vehicles: PartnerVehicle[];
}
interface Driver {
  id: string; name: string; contact: string; partnerId: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getHubs(draft: Draft): OPMHubDetails[] {
  if (draft.opmHubs && draft.opmHubs.length > 0) return draft.opmHubs;
  if (draft.opmHubDetails) return [draft.opmHubDetails];
  return [];
}

function initials(name?: string) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── Booking helpers (module-level) ─────────────────────────────────────── */
function isODBooking(b: Booking)   { return b.clientPricingLabel?.startsWith('OD ·') ?? false; }
function bookingClassOf(b: Booking): 'OD-Local' | 'OD-UPC' | 'Sch-Local' | 'Sch-UPC' {
  const p = isODBooking(b) ? 'OD' : 'Sch';
  const t = b.bookingType === 'upcountry' ? 'UPC' : 'Local';
  return `${p}-${t}` as 'OD-Local' | 'OD-UPC' | 'Sch-Local' | 'Sch-UPC';
}

const CLS_BADGE: Record<string, string> = {
  'OD-Local': 'bg-orange-100 text-orange-700',
  'OD-UPC':   'bg-red-100 text-red-700',
  'Sch-Local':'bg-blue-100 text-blue-700',
  'Sch-UPC':  'bg-purple-100 text-purple-700',
};

/* stub partner bids — replace with real API data later */
const STUB_BIDS = [
  { id: 'B1', partner: 'Ravi Logistics',    contact: '9876543210', vehicle: 'KA01AB1234', bid: 1400, quoteStatus: 'pending',  opmStatus: 'pending'  },
  { id: 'B2', partner: 'Suresh Transport',  contact: '9845012345', vehicle: 'MH05YZ9012', bid: 1350, quoteStatus: 'accepted', opmStatus: 'approved' },
  { id: 'B3', partner: 'Noor Basha',        contact: '9880241816', vehicle: 'AU00RA0727', bid: 1500, quoteStatus: 'pending',  opmStatus: 'pending'  },
];

function DateFilterInput({ value, onChange, placeholder, min, max }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; min?: string; max?: string;
}) {
  const [active, setActive] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type={active || value ? 'date' : 'text'}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      onChange={e => onChange(e.target.value)}
      onFocus={() => { setActive(true); setTimeout(() => ref.current?.showPicker?.(), 0); }}
      onBlur={() => setActive(false)}
      className="text-[11px] py-2 pl-3 pr-1 bg-transparent focus:outline-none cursor-pointer w-[100px] placeholder:text-slate-400 text-slate-600"
    />
  );
}

function BookingDetailDrawer({ booking, onClose, tomorrowStr }: {
  booking: Booking;
  onClose: () => void;
  tomorrowStr: string;
}) {
  const isOD = isODBooking(booking);
  const cls  = bookingClassOf(booking);
  const isAutoTomorrow = !isOD && !!booking.publishDate &&
    booking.publishDate <= tomorrowStr &&
    (!booking.publishEndDate || booking.publishEndDate >= tomorrowStr);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function InfoCell({ label, value }: { label: string; value?: string | null | boolean }) {
    if (!value && value !== 0) return null;
    return (
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-sm text-slate-700 font-medium">{String(value)}</div>
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* drawer */}
      <div className="relative w-[520px] bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-[slideIn_0.22s_ease-out]"
           style={{ animation: 'slideInRight 0.22s ease-out' }}>

        {/* Navy header */}
        <div className="bg-brand-navy px-6 py-4 shrink-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${CLS_BADGE[cls]}`}>{cls}</span>
              <span className="text-white/40 text-[10px] font-mono">{booking.id}</span>
              {isAutoTomorrow && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Auto-publishes tomorrow
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white text-lg leading-none transition-colors shrink-0 ml-3">✕</button>
          </div>
          <div className="text-xl font-bold text-white leading-tight">{booking.clientName || '—'}</div>
          <div className="text-white/50 text-xs mt-0.5">
            {[booking.subArea, booking.area, booking.hubName].filter(Boolean).join(' · ')}
          </div>
          {/* Financial strip */}
          {(booking.estimatedRevenue || booking.estimatedCost || booking.margin) && (
            <div className="flex gap-6 mt-3 pt-3 border-t border-white/10">
              {booking.estimatedRevenue && (
                <div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wide">Revenue</div>
                  <div className="text-sm font-bold text-green-400">₹{booking.estimatedRevenue}</div>
                </div>
              )}
              {booking.estimatedCost && (
                <div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wide">Cost</div>
                  <div className="text-sm font-bold text-red-400">₹{booking.estimatedCost}</div>
                </div>
              )}
              {booking.margin && (
                <div>
                  <div className="text-[9px] text-white/40 uppercase tracking-wide">Margin</div>
                  <div className={`text-sm font-bold ${parseFloat(booking.margin) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {booking.margin}%
                  </div>
                </div>
              )}
              {booking.clientPricingLabel && (
                <div className="ml-auto text-right">
                  <div className="text-[9px] text-white/40 uppercase tracking-wide">Pricing</div>
                  <div className="text-[11px] text-white/70 font-medium max-w-[140px] truncate">{booking.clientPricingLabel}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Published banner */}
        <div className="bg-green-50 border-b border-green-100 px-6 py-2 flex items-center gap-2 shrink-0">
          <span className="text-green-600 text-xs font-semibold">✓ Published</span>
          {booking.publishDate && <span className="text-green-500/60 text-xs">since {fmtDate(booking.publishDate)}</span>}
          {!isOD && booking.publishEndDate && (
            <span className="text-slate-400 text-xs">→ {fmtDate(booking.publishEndDate)}</span>
          )}
          {!isOD && !booking.publishEndDate && booking.publishDate && (
            <span className="text-slate-400 text-xs">→ ongoing</span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

          {/* ── Booking details ── */}
          <div className="px-6 py-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Booking Details</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoCell label="Reporting Time"  value={booking.bookingTime} />
              <InfoCell label="Start Date"       value={booking.startDate ? fmtDate(booking.startDate) : null} />
              {isOD ? (
                <>
                  <InfoCell label="Total Distance" value={booking.totalDistance ? `${booking.totalDistance} km` : null} />
                  <InfoCell label="Total Duration" value={booking.totalTime ? `${booking.totalTime} hrs` : null} />
                  <InfoCell label="Trip Stops"     value={booking.tripType === 'multiple' ? 'Multiple' : booking.tripType === 'single' ? 'Single' : null} />
                </>
              ) : (
                <>
                  <InfoCell label="Schedule Until"  value={booking.publishEndDate ? fmtDate(booking.publishEndDate) : 'Ongoing'} />
                  <InfoCell label="24-hr Trip"      value={booking.is24hrTrip ? 'Yes' : booking.is24hrTrip === false ? 'No' : null} />
                  <InfoCell label="Total Distance"  value={booking.totalDistance ? `${booking.totalDistance} km` : null} />
                  <InfoCell label="Total Duration"  value={booking.totalTime ? `${booking.totalTime} hrs` : null} />
                </>
              )}
            </div>
          </div>

          {/* ── Vehicle requirements ── */}
          <div className="px-6 py-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle Details</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoCell label="Vehicle Type"    value={booking.vehicleType} />
              <InfoCell label="Vehicle Body"    value={booking.vehicleBodyType} />
              <InfoCell label="Material"        value={booking.materials} />
              <InfoCell label="Helpers"         value={booking.helpers} />
              {(booking.vehicleAttributes as string[] | undefined)?.length ? (
                <div className="col-span-2">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Vehicle Attributes</div>
                  <div className="flex flex-wrap gap-1">
                    {(booking.vehicleAttributes as string[]).map(a => (
                      <span key={a} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Scheduled: bids + driver assignment ── */}
          {!isOD && (
            <div className="px-6 py-4">
              {(booking.driverName || booking.vehicleId) ? (
                /* Trip Created — show approved price + assigned details */
                <>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Assigned Driver & Vehicle</div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ Trip Created</span>
                      {booking.clientPricingDetails && (
                        <span className="text-sm font-bold text-slate-800">{booking.clientPricingDetails}</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <InfoCell label="Driver Name"    value={booking.driverName} />
                    <InfoCell label="Driver Contact" value={booking.driverContact} />
                    <InfoCell label="Vehicle No."    value={booking.vehicleId} />
                    <InfoCell label="Partner No."    value={booking.partnerNumber} />
                    <InfoCell label="Partner Name"   value={booking.partnerName} />
                    <InfoCell label="Driver Pricing" value={booking.driverPricing} />
                  </div>
                </>
              ) : (
                /* Open / Bids received */
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {booking.schStatus === 'bids' ? 'Partner Bids' : 'Awaiting Bids'}
                    </div>
                    {booking.schStatus === 'bids'
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">{booking.applications?.length ?? 0} bids</span>
                      : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">No bids yet</span>
                    }
                  </div>
                  {booking.clientPricingDetails && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Suggested Price:</span>
                      <span className="text-sm font-bold text-slate-800">{booking.clientPricingDetails}</span>
                    </div>
                  )}
                  {(!booking.applications || booking.applications.length === 0) ? (
                    <div className="text-center py-8 text-slate-400">
                      <div className="text-2xl mb-1">🕐</div>
                      <p className="text-xs">Waiting for partner bids on the loadboard.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {booking.applications.map(app => (
                        <div key={app.id} className="border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-800">{app.partner}</div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] text-slate-500">{app.contact}</span>
                                <span className="text-[10px] font-mono text-slate-400">{app.vehicle}</span>
                              </div>
                              {app.appliedAt && (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  Bid sent {new Date(app.appliedAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {app.bid != null && <div className="text-sm font-bold text-slate-800">₹{app.bid}</div>}
                              <div className="text-[10px] text-slate-400">bid</div>
                            </div>
                          </div>
                          <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                            <button className="text-[11px] font-semibold bg-brand-navy text-white px-3 py-1.5 rounded-lg hover:bg-brand-navy/90 transition-colors">
                              Approve & Assign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── OD: Partner Applications ── */}
          {isOD && booking.odStatus === 'confirmed' && (
            <div className="px-6 py-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Confirmed Partner & Driver</div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ Trip Created</span>
                  {booking.clientPricingDetails && (
                    <span className="text-sm font-bold text-slate-800">{booking.clientPricingDetails}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                  <InfoCell label="Partner Name"   value={booking.partnerName} />
                  <InfoCell label="Partner No."    value={booking.partnerNumber} />
                  <InfoCell label="Driver Name"    value={booking.driverName} />
                  <InfoCell label="Driver Contact" value={booking.driverContact} />
                  <InfoCell label="Vehicle No."    value={booking.vehicleId} />
                </div>
              </div>
            </div>
          )}
          {isOD && booking.odStatus !== 'confirmed' && (
            <div className="px-6 py-4">
              {(() => {
                const isUPC = cls === 'OD-UPC';
                const term = isUPC ? 'Bids' : 'Applications';
                const count = booking.applications?.length ?? 0;
                return (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner {term}</div>
                      {count > 0
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">{count} {term.toLowerCase()}</span>
                        : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">No {term.toLowerCase()} yet</span>
                      }
                    </div>
                    {booking.clientPricingDetails && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{isUPC ? 'Suggested Price:' : 'Fixed Rate:'}</span>
                        <span className="text-sm font-bold text-slate-800">{booking.clientPricingDetails}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {(!booking.applications || booking.applications.length === 0) ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-2xl mb-1">🕐</div>
                  <p className="text-xs">Waiting for partner {cls === 'OD-UPC' ? 'bids' : 'applications'} on the loadboard.</p>
                </div>
              ) : cls === 'OD-Local' ? (
                /* OD-Local: fixed price, show applied time, Approve & Create Trip button */
                <div className="space-y-2">
                  {booking.clientPricingDetails && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Fixed Rate:</span>
                      <span className="text-sm font-bold text-slate-800">{booking.clientPricingDetails}</span>
                    </div>
                  )}
                  {booking.applications.map(app => (
                    <div key={app.id} className="border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{app.partner}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-slate-500">{app.contact}</span>
                            <span className="text-[10px] font-mono text-slate-400">{app.vehicle}</span>
                          </div>
                          {app.appliedAt && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Applied {new Date(app.appliedAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                            </div>
                          )}
                        </div>
                        <button className="shrink-0 text-[11px] font-semibold bg-brand-navy text-white px-3 py-1.5 rounded-lg hover:bg-brand-navy/90 transition-colors">
                          Approve & Create Trip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* OD-UPC: competitive bids with prices */
                <div className="space-y-2">
                  {booking.clientPricingDetails && (
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Suggested Price:</span>
                      <span className="text-sm font-bold text-slate-800">{booking.clientPricingDetails}</span>
                    </div>
                  )}
                  {booking.applications.map(app => (
                    <div key={app.id} className="border border-slate-200 rounded-xl px-4 py-3 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-800">{app.partner}</div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-slate-500">{app.contact}</span>
                            <span className="text-[10px] font-mono text-slate-400">{app.vehicle}</span>
                          </div>
                          {app.appliedAt && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Bid sent {new Date(app.appliedAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-slate-800">₹{app.bid}</div>
                          <div className="text-[10px] text-slate-400">bid</div>
                        </div>
                      </div>
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-100">
                        <button className="text-[11px] font-semibold bg-brand-navy text-white px-3 py-1.5 rounded-lg hover:bg-brand-navy/90 transition-colors">
                          Approve & Create Trip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-3 italic">Partner applications will connect to live loadboard API.</p>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

function today() { return new Date().toISOString().slice(0, 10); }

function calcMargin(cost: string, rev: string) {
  const c = parseFloat(cost), r = parseFloat(rev);
  if (!r || isNaN(c) || isNaN(r)) return '';
  return ((r - c) / r * 100).toFixed(1);
}

/* ─── Reusable field atoms ───────────────────────────────────────────────── */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />;
}
function SelectInput({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function SegmentControl<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="flex border border-slate-200 rounded-lg overflow-hidden">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${value === opt.value ? 'bg-brand-navy text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
function FormSection({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/* ─── Searchable Vehicle Select ──────────────────────────────────────────── */
function SearchableVehicleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [othersMode, setOthersMode] = useState(false);
  const [othersVal, setOthersVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && !VEHICLE_TYPE_OPTIONS.includes(value)) { setOthersMode(true); setOthersVal(value); }
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = VEHICLE_TYPE_OPTIONS.filter(v => v.toLowerCase().includes(query.toLowerCase()));

  if (othersMode) return (
    <div className="flex gap-2">
      <input autoFocus type="text" value={othersVal}
        onChange={e => { setOthersVal(e.target.value); onChange(e.target.value); }}
        placeholder="Type vehicle type…"
        className="flex-1 border border-brand-orange rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 transition" />
      <button onClick={() => { setOthersMode(false); setOthersVal(''); onChange(''); }}
        className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg">✕</button>
    </div>
  );

  return (
    <div className="relative" ref={dropRef}>
      <div onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 40); }}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm flex items-center justify-between cursor-pointer transition ${value ? 'border-brand-navy text-slate-800' : 'border-slate-200 text-slate-400'} ${open ? 'ring-2 ring-brand-navy/20 border-brand-navy' : 'hover:border-slate-300'}`}>
        <span className={value ? 'font-medium text-slate-800' : ''}>{value || 'Select an option'}</span>
        <span className="text-slate-400 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 pt-2.5 pb-1.5 border-b border-slate-100">
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type to search…"
              className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition" />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 text-center">No matches</div>}
            {filtered.map(v => (
              <button key={v} onClick={() => { onChange(v); setQuery(''); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors ${value === v ? 'bg-brand-navy/5 text-brand-navy font-semibold' : 'text-slate-700'}`}>{v}</button>
            ))}
            <button onClick={() => { setOthersMode(true); setOpen(false); setQuery(''); onChange(''); }}
              className="w-full text-left px-4 py-2.5 text-xs text-brand-orange font-semibold hover:bg-brand-orange/5 border-t border-slate-100">
              + Others (type manually)
            </button>
          </div>
        </div>
      )}
      {value && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] text-green-600 font-medium">✓ {value}</span>
          <button onClick={() => onChange('')} className="text-[10px] text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}
    </div>
  );
}

/* ─── Searchable Partner Select ──────────────────────────────────────────── */
function SearchablePartnerSelect({ partners, value, onSelect }: {
  partners: Partner[];
  value: string;       // partnerNumber currently selected
  onSelect: (p: Partner | null) => void;
}) {
  const [query,  setQuery]  = useState(value);
  const [open,   setOpen]   = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = partners.filter(p =>
    p.partnerNumber.toLowerCase().includes(query.toLowerCase()) ||
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={dropRef}>
      <input type="text" value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Type partner number or name…"
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-4 py-3 text-xs text-slate-400 text-center">No partners found</div>
            : filtered.map(p => (
              <button key={p.id} type="button"
                onClick={() => { onSelect(p); setQuery(p.partnerNumber); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-brand-navy">{p.partnerNumber}</span>
                <span className="text-xs text-slate-500 ml-2">{p.name}</span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

/* ─── Searchable Driver Select ───────────────────────────────────────────── */
function SearchableDriverSelect({ drivers, value, onSelect }: {
  drivers: Driver[];
  value: string;       // contact number currently selected
  onSelect: (d: Driver | null) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open,  setOpen]  = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = drivers.filter(d =>
    d.contact.includes(query) ||
    d.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative" ref={dropRef}>
      <input type="tel" value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
        onFocus={() => setOpen(true)}
        placeholder="Type contact number or name…"
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-4 py-3 text-xs text-slate-400 text-center">No drivers found</div>
            : filtered.map(d => (
              <button key={d.id} type="button"
                onClick={() => { onSelect(d); setQuery(d.contact); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors">
                <span className="text-xs font-bold text-brand-navy">{d.contact}</span>
                <span className="text-xs text-slate-500 ml-2">{d.name}</span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

/* ─── Multi-select Vehicle Attributes ───────────────────────────────────── */
function MultiSelectAttributes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  }

  return (
    <div className="relative" ref={dropRef}>
      <div onClick={() => setOpen(o => !o)}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between transition ${open ? 'border-brand-navy ring-2 ring-brand-navy/20' : 'border-slate-200 hover:border-slate-300'}`}>
        <span className={value.length > 0 ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {value.length > 0 ? `${value.length} selected` : 'Select an option'}
        </span>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {VEHICLE_ATTRIBUTES_OPTIONS.map(opt => (
              <label key={opt}
                className={`flex items-center gap-2.5 px-3.5 py-2 cursor-pointer transition-colors text-xs ${
                  value.includes(opt) ? 'bg-brand-navy/5 text-brand-navy font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}>
                <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)}
                  className="w-3.5 h-3.5 accent-brand-navy cursor-pointer" />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 text-[10px] font-medium bg-brand-navy text-white px-2 py-0.5 rounded-full">
              {v}
              <button type="button" onClick={() => toggle(v)} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Read-only auto-fetched field ───────────────────────────────────────── */
function AutoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-xs font-semibold text-slate-500">{label}</label>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">⟳ Auto-fetched</span>
      </div>
      <div className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 select-none ${value ? 'text-slate-700' : 'text-slate-400'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

/* ─── Sub Area Card ──────────────────────────────────────────────────────── */
function SubAreaCard({ info, bookingCount, onClick }: { info: SubAreaInfo; bookingCount: number; onClick: () => void }) {
  const uniqueClients = info.clientHubs.filter((v, i, a) => a.findIndex(x => x.draft.id === v.draft.id) === i).length;

  return (
    <div onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 hover:border-brand-navy/40 hover:shadow-sm transition-all cursor-pointer p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-brand-navy/10 text-brand-navy flex items-center justify-center text-sm font-bold shrink-0">
          {info.subArea.slice(0, 2).toUpperCase()}
        </div>
        {bookingCount > 0 && (
          <span className="text-[10px] font-bold bg-brand-navy text-white px-2 py-0.5 rounded-full">
            {bookingCount} booking{bookingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-bold text-slate-800 leading-tight">{info.subArea}</div>
        <div className="text-xs text-slate-400 mt-0.5">{info.area}</div>
      </div>
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <span className="text-[10px] text-slate-500">{uniqueClients} client{uniqueClients !== 1 ? 's' : ''}</span>
        <span className="text-slate-200">·</span>
        <span className="text-[10px] text-slate-500">{info.clientHubs.length} hub{info.clientHubs.length !== 1 ? 's' : ''}</span>
        <span className="ml-auto text-[10px] text-brand-navy font-semibold">View →</span>
      </div>
    </div>
  );
}

/* ─── Booking Card ───────────────────────────────────────────────────────── */
function BookingCard({ booking, onPublish, onDelete, onEdit, publishing }: {
  booking: Booking; onPublish: () => void; onDelete: () => void; onEdit: () => void; publishing: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPublished = booking.status === 'published';

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${isPublished ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {isPublished ? '✓ Published' : '● Draft'}
          </span>
          <span className="text-[10px] text-slate-400">{booking.id}</span>
        </div>
        <div className="text-sm font-bold text-slate-800">{fmtDate(booking.startDate || '')}</div>
        <div className="text-xs text-slate-600">
          <span className="font-semibold">{booking.clientName || '—'}</span>
          {booking.hubName && <span className="text-slate-400"> · {booking.hubName}</span>}
        </div>
        {booking.vehicleType && (
          <div className="inline-flex items-center gap-1.5 bg-brand-navy/5 text-brand-navy px-2.5 py-1 rounded-lg">
            <span className="text-xs font-bold">{booking.vehicleType}</span>
            {booking.vehicleBodyType && <span className="text-[10px] text-slate-400">· {booking.vehicleBodyType}</span>}
          </div>
        )}
        {(booking.driverName || booking.driverContact) && (
          <div className="text-[10px] text-slate-400">{booking.driverName}{booking.driverName && booking.driverContact ? ' · ' : ''}{booking.driverContact}</div>
        )}
        {booking.estimatedRevenue && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-slate-500">Rev: <span className="font-semibold text-slate-700">₹{booking.estimatedRevenue}</span></span>
            {booking.margin && (
              <span className={`text-[10px] font-semibold ${parseFloat(booking.margin) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{booking.margin}% margin</span>
            )}
          </div>
        )}
        {isPublished && booking.publishedAt && (
          <p className="text-[10px] text-green-600">Published {fmtDate(booking.publishedAt)}</p>
        )}
      </div>
      <div className="border-t border-slate-100">
        {!isPublished ? (
          confirmDelete ? (
            <div className="flex items-center gap-2 px-4 py-2.5">
              <span className="text-[10px] text-slate-500 flex-1">Delete this booking?</span>
              <button onClick={onDelete} className="text-[10px] font-semibold text-red-500 hover:text-red-700">Yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          ) : (
            <div className="flex">
              <button onClick={onEdit} className="flex-1 py-2.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors border-r border-slate-100">EDIT</button>
              <button onClick={() => setConfirmDelete(true)} className="flex-1 py-2.5 text-[10px] font-semibold text-red-400 hover:bg-red-50 transition-colors border-r border-slate-100">DELETE</button>
              <button onClick={onPublish} disabled={publishing} className="flex-1 py-2.5 text-[10px] font-bold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50 transition-colors">
                {publishing ? '…' : 'PUBLISH'}
              </button>
            </div>
          )
        ) : (
          <div className="px-4 py-2.5"><span className="text-[10px] text-green-600 font-semibold">✓ Booking live</span></div>
        )}
      </div>
    </div>
  );
}

/* ─── Inline Pricing Dropdown ───────────────────────────────────────────── */
const SCHED_PAYMENT_MODES = ['Prepaid', 'Postpaid', 'Cash'];
const SCHED_WEEKLY_DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const INLINE_PARAM_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
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
const SCHED_PARAM_OPTIONS = Object.keys(INLINE_PARAM_FIELDS);

function InlineInput({ label, value, onChange, placeholder, type = 'text', required = false }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
    </div>
  );
}

function PricingDropdownField({ pricingOptions, clientPricingLabel, setClientPricingLabel, draftId, isOD, storageKey, required, label, onPricingCreated }: {
  pricingOptions: string[];
  clientPricingLabel: string;
  setClientPricingLabel: (v: string) => void;
  draftId: string;
  isOD: boolean;
  storageKey?: string;
  required?: boolean;
  label?: string;
  onPricingCreated: (updatedPricings: import('./OPMClients').Pricing[]) => void;
}) {
  const CREATE_SENTINEL = '__create_new__';
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // OD fields
  const [odVehicle,    setOdVehicle]    = useState('');
  const [odPrice,      setOdPrice]      = useState('');
  const [odCutOff,     setOdCutOff]     = useState('');
  const [odExtraKm,    setOdExtraKm]    = useState('');
  const [odHours,      setOdHours]      = useState('');
  const [odMinutes,    setOdMinutes]    = useState('00');
  const [odOvertime,   setOdOvertime]   = useState('');
  const [odName,       setOdName]       = useState('');
  const [odNameEdited, setOdNameEdited] = useState(false);

  // SVC fields
  const [svcPricingType,   setSvcPricingType]   = useState('');
  const [svcVehicle,       setSvcVehicle]       = useState('');
  const [svcPaymentMode,   setSvcPaymentMode]   = useState('');
  const [svcWeeklyDays,    setSvcWeeklyDays]    = useState<string[]>([]);
  const [svcFullMonth,     setSvcFullMonth]     = useState(true);
  const [svcDaysInMonth,   setSvcDaysInMonth]   = useState('');
  const [svcHubExtraKm,    setSvcHubExtraKm]    = useState(false);
  const [svcParameters,    setSvcParameters]    = useState<string[]>([]);
  const [svcParamValues,   setSvcParamValues]   = useState<Record<string, Record<string, string>>>({});
  const [svcNameSuffix,    setSvcNameSuffix]    = useState('');

  useEffect(() => {
    if (odNameEdited) return;
    const v = odVehicle ? odVehicle.split('-')[0].trim().replace(/\s+/g, '') : '';
    const p = odPrice.trim();
    setOdName(v && p ? `OD-${v}-${p}` : v ? `OD-${v}` : '');
  }, [odVehicle, odPrice, odNameEdited]);

  const svcNamePrefix = (() => {
    const v = svcVehicle ? svcVehicle.split('-')[0].trim().replace(/\s+/g, '') : '';
    const t = svcPricingType;
    if (v && t) return `SVC-${v}-${t}-`;
    if (v)      return `SVC-${v}-`;
    return 'SVC-';
  })();

  function toggleSvcDay(d: string) { setSvcWeeklyDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]); }
  function toggleSvcParam(p: string) { setSvcParameters(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]); }
  function setSvcParamField(param: string, field: string, val: string) {
    setSvcParamValues(prev => ({ ...prev, [param]: { ...(prev[param] ?? {}), [field]: val } }));
  }

  const canSave = isOD ? (odVehicle !== '' && odPrice !== '') : (svcVehicle !== '' && svcPricingType !== '' && svcNameSuffix.trim() !== '');

  function reset() {
    setOdVehicle(''); setOdPrice(''); setOdCutOff(''); setOdExtraKm(''); setOdHours(''); setOdMinutes('00'); setOdOvertime(''); setOdName(''); setOdNameEdited(false);
    setSvcPricingType(''); setSvcVehicle(''); setSvcPaymentMode(''); setSvcWeeklyDays([]); setSvcFullMonth(true); setSvcDaysInMonth(''); setSvcHubExtraKm(false); setSvcParameters([]); setSvcParamValues({}); setSvcNameSuffix('');
  }

  async function handleSave() {
    if (!draftId || !canSave) return;
    type P = import('./OPMClients').Pricing;
    const newId = Math.random().toString(36).slice(2, 10);
    const createdAt = new Date().toISOString();
    const newP: P = isOD
      ? { id: newId, createdAt, type: 'od', odVehicle, odPrice, odCutOffKms: odCutOff, odExtraKmRate: odExtraKm, odHours, odMinutes, odOvertime, odName }
      : { id: newId, createdAt, type: 'schedule', schedVehicleType: svcVehicle, schedPricingType: svcPricingType, schedPaymentMode: svcPaymentMode,
          schedWeeklyDays: svcWeeklyDays, schedFullMonth: svcFullMonth, schedDaysInMonth: svcDaysInMonth,
          schedHubExtraKm: svcHubExtraKm, schedParameters: svcParameters, schedParamValues: svcParamValues, schedName: svcNamePrefix + svcNameSuffix.trim() };
    setSaving(true);
    try {
      const key = storageKey ?? 'pricings';
      const res  = await fetch(`/api/drafts/${draftId}`);
      const data = await res.json();
      const updated: P[] = [...(data[key] ?? []), newP];
      await fetch(`/api/drafts/${draftId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: updated }) });
      onPricingCreated(updated);
      const label = isOD ? (odName || `OD · ${odVehicle}`) : (svcNamePrefix + svcNameSuffix.trim());
      setClientPricingLabel(label);
      setOpen(false);
      reset();
    } finally { setSaving(false); }
  }

  const ddBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`;

  return (
    <Field label={label ?? "Client Pricing"} required={required}>
      <div className="space-y-2">
        <select value={open ? CREATE_SENTINEL : clientPricingLabel}
          onChange={e => { if (e.target.value === CREATE_SENTINEL) { setOpen(true); setClientPricingLabel(''); } else { setClientPricingLabel(e.target.value); setOpen(false); } }}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
          style={{ backgroundImage: ddBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
          <option value="">Select an option</option>
          {pricingOptions.map(o => <option key={o} value={o}>{o}</option>)}
          <option value={CREATE_SENTINEL}>＋ Create New {isOD ? 'OD' : storageKey === 'driverPricings' ? 'Driver' : 'SVC'} Pricing</option>
        </select>

        {open && (
          <div className="border border-brand-navy/20 rounded-xl bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-navy">New {isOD ? 'OD' : storageKey === 'driverPricings' ? 'Driver' : 'SVC'} Pricing</span>
              <button type="button" onClick={() => { setOpen(false); reset(); }} className="text-slate-400 hover:text-slate-600 text-xs">✕ Cancel</button>
            </div>

            {isOD ? (<>
              {/* Row 1: Vehicle + Price */}
              <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                <div><label className="block text-[10px] font-semibold text-slate-500 mb-1">Vehicle <span className="text-red-400">*</span></label>
                  <SearchableVehicleSelect value={odVehicle} onChange={setOdVehicle} /></div>
                <InlineInput label="Price (₹)" value={odPrice} onChange={setOdPrice} placeholder="e.g. 1000" type="number" required />
              </div>
              {/* Row 2: Cut Off + Extra Km + Overtime */}
              <div className="grid grid-cols-3 gap-3">
                <InlineInput label="Cut Off (Kms)" value={odCutOff} onChange={setOdCutOff} placeholder="e.g. 80" type="number" />
                <InlineInput label="Extra Km Rate (₹)" value={odExtraKm} onChange={setOdExtraKm} placeholder="e.g. 12" type="number" />
                <InlineInput label="Overtime (₹/hr)" value={odOvertime} onChange={setOdOvertime} placeholder="e.g. 150" type="number" />
              </div>
              {/* Row 3: Hours + Minutes */}
              <div className="grid grid-cols-2 gap-3">
                <InlineInput label="Hours Included" value={odHours} onChange={setOdHours} placeholder="e.g. 8" type="number" />
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Minutes</label>
                  <select value={odMinutes} onChange={e => setOdMinutes(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
                    style={{ backgroundImage: ddBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    {['00','15','30','45'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 4: Name */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pricing Name</label>
                <input type="text" value={odName} placeholder="Auto-generated"
                  onChange={e => { setOdName(e.target.value); setOdNameEdited(true); }}
                  onBlur={() => { if (!odName.trim()) setOdNameEdited(false); }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
              </div>
            </>) : (<>
              {/* Row 1: Vehicle + Pricing Type */}
              <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                <div><label className="block text-[10px] font-semibold text-slate-500 mb-1">Vehicle Type <span className="text-red-400">*</span></label>
                  <SearchableVehicleSelect value={svcVehicle} onChange={setSvcVehicle} /></div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Pricing Type <span className="text-red-400">*</span></label>
                  <select value={svcPricingType} onChange={e => setSvcPricingType(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
                    style={{ backgroundImage: ddBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Select</option>
                    {['Monthly','Daily','Weekly'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Row 2: Payment Mode + Weekly Days + Full Month */}
              <div className="flex items-end gap-3 flex-wrap">
                <div className="w-32 shrink-0">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Payment Mode</label>
                  <select value={svcPaymentMode} onChange={e => setSvcPaymentMode(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
                    style={{ backgroundImage: ddBg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Select</option>
                    {SCHED_PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Weekly Days</label>
                  <div className="flex gap-1 flex-wrap">
                    {SCHED_WEEKLY_DAYS.map(d => (
                      <button key={d} type="button" onClick={() => toggleSvcDay(d)}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-colors ${svcWeeklyDays.includes(d) ? 'bg-brand-navy text-white border-brand-navy' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-navy/40'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button type="button" onClick={() => setSvcFullMonth(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${svcFullMonth ? 'bg-brand-orange' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${svcFullMonth ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <span className="text-[10px] font-semibold text-slate-500">Full Month</span>
                  {!svcFullMonth && (
                    <input type="number" value={svcDaysInMonth} onChange={e => setSvcDaysInMonth(e.target.value)} placeholder="Days"
                      className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                  )}
                </div>
              </div>
              {/* Hub Extra KM + Parameters */}
              <div className={`border-2 rounded-xl px-3 py-2.5 transition-colors ${svcHubExtraKm ? 'border-brand-orange bg-brand-orange/5' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setSvcHubExtraKm(v => !v)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${svcHubExtraKm ? 'bg-brand-orange' : 'bg-slate-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${svcHubExtraKm ? 'left-4' : 'left-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Hub Extra KM Charges</p>
                    <p className="text-[10px] text-slate-400">Enable to add parameter-based charges</p>
                  </div>
                </div>
                {svcHubExtraKm && (
                  <div className="mt-3 space-y-2">
                    {SCHED_PARAM_OPTIONS.map(opt => {
                      const checked = svcParameters.includes(opt);
                      const fields = INLINE_PARAM_FIELDS[opt] ?? [];
                      return (
                        <div key={opt} className={`border rounded-lg overflow-hidden transition-colors ${checked ? 'border-brand-navy/30 bg-white' : 'border-slate-200'}`}>
                          <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={() => toggleSvcParam(opt)}
                              className="w-3.5 h-3.5 rounded border-slate-300 accent-brand-navy" />
                            <span className="text-xs text-slate-700">{opt}</span>
                          </label>
                          {checked && fields.length > 0 && (
                            <div className={`px-3 pb-2.5 pt-1 bg-brand-navy/5 grid gap-2 ${fields.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {fields.map(f => (
                                <div key={f.key}>
                                  <label className="block text-[10px] font-semibold text-brand-navy mb-1">{f.label}</label>
                                  <input type="text" value={svcParamValues[opt]?.[f.key] ?? ''} onChange={e => setSvcParamField(opt, f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                    className="w-full border border-brand-navy/20 bg-white rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-navy/30 transition" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* Name — mandatory suffix after auto-prefix */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                  Pricing Name <span className="text-red-400">*</span>
                </label>
                <div className="flex items-stretch border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-navy/25 focus-within:border-brand-navy transition">
                  <span className="px-3 py-2 text-sm text-slate-400 bg-slate-50 border-r border-slate-200 whitespace-nowrap select-none font-mono">
                    {svcNamePrefix}
                  </span>
                  <input
                    type="text"
                    value={svcNameSuffix}
                    onChange={e => setSvcNameSuffix(e.target.value)}
                    placeholder="e.g. 15000 or ₹500-80km"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none bg-white"
                  />
                </div>
                {svcNameSuffix.trim() && (
                  <p className="text-[10px] text-slate-400 mt-1">Full name: <span className="font-semibold text-slate-600">{svcNamePrefix}{svcNameSuffix.trim()}</span></p>
                )}
              </div>
            </>)}

            <button type="button" onClick={handleSave} disabled={!canSave || saving}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${canSave && !saving ? 'bg-brand-navy text-white hover:bg-brand-navy/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              {saving ? 'Saving…' : `✓ Save & Select ${isOD ? 'OD' : 'SVC'} Pricing`}
            </button>
          </div>
        )}
      </div>
    </Field>
  );
}

/* ─── Booking Form ───────────────────────────────────────────────────────── */
function BookingForm({ subAreaInfo, allSubAreas, onBack, onSave, submitting, initial, initialPricingCat, initialLocation, hideHeader }: {
  subAreaInfo?: SubAreaInfo;
  allSubAreas?: SubAreaInfo[];
  onBack: () => void;
  onSave: (b: Partial<Booking>) => void;
  submitting: boolean;
  initial?: Booking;
  initialPricingCat?: PricingCategory;
  initialLocation?: TripLocation;
  hideHeader?: boolean;
}) {
  const user = getUser();
  const isEdit = !!initial;

  /* Sub area selection */
  const availableSubAreas = allSubAreas ?? (subAreaInfo ? [subAreaInfo] : []);
  const [selectedSubArea, setSelectedSubArea] = useState<string>(
    initial?.subArea ?? availableSubAreas[0]?.subArea ?? ''
  );
  const activeSubAreaInfo: SubAreaInfo | undefined = useMemo(
    () => availableSubAreas.find(s => s.subArea === selectedSubArea) ?? availableSubAreas[0],
    [selectedSubArea, availableSubAreas]
  );

  /* Booking type selection — required before form body shows (new bookings only) */
  const inferPricingCat = (b: Booking): PricingCategory => {
    if (b.clientPricingLabel?.startsWith('OD ·')) return 'od';
    if (b.clientPricingLabel?.startsWith('SVC') || b.clientPricingLabel?.startsWith('Schedule')) return 'scheduled';
    return b.clientPricingLabel?.startsWith('OD') ? 'od' : 'scheduled';
  };
  const inferLocation = (b: Booking): TripLocation =>
    b.bookingType === 'upcountry' ? 'upc' : 'local';

  const [selPricingCat, setSelPricingCat] = useState<PricingCategory | null>(
    initial ? inferPricingCat(initial) : (initialPricingCat ?? null)
  );
  const [selLocation, setSelLocation] = useState<TripLocation | null>(
    initial ? inferLocation(initial) : (initialLocation ?? null)
  );
  const bothSelected = selPricingCat !== null && selLocation !== null;

  const navigate = useNavigate();

  const clientOptions = useMemo(() => {
    if (!activeSubAreaInfo) return [];
    const seen = new Set<string>();
    return activeSubAreaInfo.clientHubs.filter(({ draft }) => { if (seen.has(draft.id)) return false; seen.add(draft.id); return true; });
  }, [activeSubAreaInfo]);

  const [draftId,                 setDraftId]                 = useState(initial?.draftId                  ?? clientOptions[0]?.draft.id ?? '');
  const firstPoc = clientOptions[0]?.draft?.steps?.poc;
  const [clientSupervisorName,    setClientSupervisorName]    = useState(initial?.clientSupervisorName     ?? firstPoc?.opsName    ?? '');
  const [clientSupervisorContact, setClientSupervisorContact] = useState(initial?.clientSupervisorContact  ?? firstPoc?.opsPhone   ?? '');
  const [bookingTime,             setBookingTime]             = useState(initial?.bookingTime              ?? '12:00');
  const [hubName,                 setHubName]                 = useState(initial?.hubName                  ?? '');
  const [clientPricingLabel,      setClientPricingLabel]      = useState(initial?.clientPricingLabel       ?? '');
  /* Partners & drivers data */
  const [isSchedOpportunity, setIsSchedOpportunity] = useState(false);
  const [partners,      setPartners]      = useState<Partner[]>([]);
  const [drivers,       setDrivers]       = useState<Driver[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  useEffect(() => {
    fetch('/api/partners').then(r => r.json()).then(setPartners).catch(() => {});
    fetch('/api/partners/drivers/search').then(r => r.json()).then(setDrivers).catch(() => {});
  }, []);

  const [partnerNumber,    setPartnerNumber]    = useState(initial?.partnerNumber     ?? '');
  const [partnerName,      setPartnerName]      = useState(initial?.partnerName       ?? '');
  const [bankAccountNumber,setBankAccountNumber]= useState(initial?.bankAccountNumber ?? '');
  const [vehicleId,        setVehicleId]        = useState(initial?.vehicleId         ?? '');
  const [driverPricing,    setDriverPricing]    = useState(initial?.driverPricing     ?? '');
  const [vehicleType,      setVehicleType]      = useState(initial?.vehicleType       ?? '');
  const [vehicleBodyType,  setVehicleBodyType]  = useState(initial?.vehicleBodyType   ?? '');
  const [vehicleAttributes,setVehicleAttributes]= useState<string[]>(
    Array.isArray(initial?.vehicleAttributes) ? initial!.vehicleAttributes : []
  );
  const [driverContact,    setDriverContact]    = useState(initial?.driverContact     ?? '');
  const [driverName,       setDriverName]       = useState(initial?.driverName        ?? '');

  /* When partner selected, auto-fill name + masked account; reset vehicle */
  function handlePartnerSelect(p: Partner | null) {
    setSelectedPartner(p);
    setPartnerNumber(p?.partnerNumber ?? '');
    setPartnerName(p?.name ?? '');
    const acc = p?.bankAccount ?? '';
    setBankAccountNumber(acc ? `xxx-xxx-xxx-${acc.slice(-4)}` : '');
    setVehicleId('');
    setVehicleType('');
    setVehicleBodyType('');
  }

  /* When vehicle selected, auto-fill type + body type */
  function handleVehicleSelect(reg: string) {
    setVehicleId(reg);
    const v = selectedPartner?.vehicles.find(v => v.registration === reg);
    setVehicleType(v?.type ?? '');
    setVehicleBodyType(v?.bodyType ?? '');
  }

  /* When driver selected, auto-fill driver name */
  function handleDriverSelect(d: Driver | null) {
    setDriverContact(d?.contact ?? '');
    setDriverName(d?.name ?? '');
  }
  const [startDate,        setStartDate]        = useState(initial?.startDate         ?? today());
  const [materials,        setMaterials]        = useState(initial?.materials         ?? '');
  const [helpers,          setHelpers]          = useState(initial?.helpers           ?? '');
  const [tripType,         setTripType]         = useState<'single'|'multiple'>(initial?.tripType ?? 'single');
  const [is24hrTrip,       setIs24hrTrip]       = useState<boolean>(initial?.is24hrTrip ?? false);
  const [totalDistance,    setTotalDistance]    = useState(initial?.totalDistance     ?? '');
  const [totalTime,        setTotalTime]        = useState(initial?.totalTime         ?? '');
  const [bookingType,      setBookingType]      = useState<'within_city'|'upcountry'>(
    initial?.bookingType ?? 'within_city'
  );

  /* Sync bookingType when location selection changes */
  useEffect(() => {
    if (!initial) setBookingType(selLocation === 'upc' ? 'upcountry' : 'within_city');
  }, [selLocation]);
  const [estimatedCost,    setEstimatedCost]    = useState(initial?.estimatedCost     ?? '');
  const [estimatedRevenue, setEstimatedRevenue] = useState(initial?.estimatedRevenue  ?? '');
  const margin = useMemo(() => calcMargin(estimatedCost, estimatedRevenue), [estimatedCost, estimatedRevenue]);
  const [confirming, setConfirming] = useState(false);

  const [cutoffInfoAnchor, setCutoffInfoAnchor] = useState<{ top: number; left: number } | null>(null);
  const [transpPriceInfoAnchor, setTranspPriceInfoAnchor] = useState<{ top: number; left: number } | null>(null);

  const [freshPricings, setFreshPricings] = useState<import('./OPMClients').Pricing[] | null>(null);
  const [freshDriverPricings, setFreshDriverPricings] = useState<import('./OPMClients').Pricing[] | null>(null);

  const minReportingDateTime = useMemo(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  }, []);

  /* ── OD specific fields ── */
  const [reportingDateTime,    setReportingDateTime]    = useState('');
  const [confirmationDateTime, setConfirmationDateTime] = useState('');
  const [cutoffDateTime,       setCutoffDateTime]       = useState('');
  const [confirmScreenshotName, setConfirmScreenshotName] = useState('');
  const [numberOfVehicles,     setNumberOfVehicles]     = useState('1');
  const [vehicleTonnage,       setVehicleTonnage]       = useState('');
  const [workType,             setWorkType]             = useState('');
  const [podRequired,          setPodRequired]          = useState<'none'|'mandatory'>('none');
  const [podCount,             setPodCount]             = useState('');
  const [remarks,              setRemarks]              = useState('');

  /* Auto-fill Confirmation = Reporting; Cutoff = Reporting + 6h */
  useEffect(() => {
    if (!reportingDateTime) return;
    setConfirmationDateTime(reportingDateTime);
    const d = new Date(reportingDateTime);
    d.setHours(d.getHours() - 6);
    const pad = (n: number) => String(n).padStart(2, '0');
    const cutoff = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setCutoffDateTime(cutoff);
  }, [reportingDateTime]);

  const selectedDraft = clientOptions.find(c => c.draft.id === draftId)?.draft
    ?? (isEdit && initial?.clientName
      ? clientOptions.find(c => c.draft.steps.group?.name === initial.clientName)?.draft
      : undefined);
  // If no draft found in edit mode, also update draftId to the matched draft
  useEffect(() => {
    if (isEdit && !clientOptions.find(c => c.draft.id === draftId) && initial?.clientName) {
      const matched = clientOptions.find(c => c.draft.steps.group?.name === initial.clientName);
      if (matched) setDraftId(matched.draft.id);
    }
  }, [clientOptions.length]);
  const clientName = selectedDraft?.steps.group?.name ?? (isEdit ? (initial?.clientName ?? '') : '');
  const allClientHubs = useMemo(() => {
    const allHubs: OPMHubDetails[] = [];
    availableSubAreas.forEach(sa => sa.clientHubs.filter(ch => ch.draft.id === draftId).forEach(ch => allHubs.push(ch.hub)));
    return allHubs;
  }, [draftId, availableSubAreas]);
  const hubsForClient = allClientHubs;
  const hubSubArea = useMemo(() => allClientHubs.find(h => h.hubName === hubName) ?? allClientHubs[0], [hubName, allClientHubs]);
  const isODPricing = selPricingCat === 'od';
  const pricingOptions = (freshPricings ?? selectedDraft?.pricings ?? [])
    .filter(p => isODPricing ? p.type === 'od' : p.type !== 'od')
    .map(p => p.type === 'od' ? (p.odName || `OD · ${p.odVehicle || '—'}`) : (p.schedName || `Schedule · ${p.schedVehicleType || '—'}`));
  const driverPricingOptions = (freshDriverPricings ?? selectedDraft?.driverPricings ?? [])
    .filter(p => p.type !== 'od')
    .map(p => p.schedName || `Schedule · ${p.schedVehicleType || '—'}`);
  const isSchedLocal = !isODPricing && bookingType === 'within_city';
  const isSchedUPC   = !isODPricing && bookingType === 'upcountry';

  useEffect(() => {
    if (!initial) {
      setHubName(hubsForClient[0]?.hubName ?? '');
      // Auto-fill supervisor from Ops POC of the selected client
      const poc = selectedDraft?.steps?.poc;
      setClientSupervisorName(poc?.opsName ?? '');
      setClientSupervisorContact(poc?.opsPhone ?? '');
    }
  }, [draftId]);

  const isODLocal = selPricingCat === 'od' && selLocation === 'local';
  const isODUPC   = selPricingCat === 'od' && selLocation === 'upc';

  /* ── OD-UPC specific state ── */
  const [odUpcStops,       setOdUpcStops]       = useState<string[]>(['', '']);
  const [showRouteModal,   setShowRouteModal]   = useState(false);
  const [spotFlag,         setSpotFlag]         = useState<'contracted'|'spot'>('contracted');
  const [contractedLane,   setContractedLane]   = useState('');
  const [goodsType,        setGoodsType]        = useState('');
  const [upcVehicleSel,    setUpcVehicleSel]    = useState('');
  const [addedVehicles,    setAddedVehicles]    = useState<{label:string;code:string;price:number;count:number;expectedUnits:string}[]>([]);
  const [showPocPodModal,  setShowPocPodModal]  = useState(false);
  const [pocPodData,       setPocPodData]       = useState<{city:string;pocName:string;pocNumber:string;pods:number}[]>([]);
  const upcTotalRevenue = addedVehicles.reduce((s, v) => s + v.price * v.count, 0);
  const [tripCategory,   setTripCategory]   = useState('Normal');
  const [agentNumber,    setAgentNumber]    = useState('');
  const [isGSTClient,    setIsGSTClient]    = useState<'yes'|'no'>('no');
  const [gstPercentage,  setGstPercentage]  = useState('0%');
  const [showUpcSummary,     setShowUpcSummary]     = useState(false);
  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);
  const [confirmOrderId,     setConfirmOrderId]     = useState('');

  /* ── Spot-specific state ── */
  const [spotReason,          setSpotReason]          = useState('');
  const [showSpotVehicleModal,setShowSpotVehicleModal]= useState(false);
  const [spotVehicleModel,    setSpotVehicleModel]    = useState('');
  const [spotTonnage,         setSpotTonnage]         = useState('');
  const [spotModel,           setSpotModel]           = useState('');
  const [spotBodyType,        setSpotBodyType]        = useState('');
  const [spotFuelType,        setSpotFuelType]        = useState('');
  const [spotRemarks,         setSpotRemarks]         = useState('');
  const [spotTariffType,      setSpotTariffType]      = useState('Per Lane');
  const [spotExpectedUnits,   setSpotExpectedUnits]   = useState('1');
  const [spotBaseRevenue,     setSpotBaseRevenue]     = useState('');
  const [spotBaseCost,        setSpotBaseCost]        = useState('');
  const [spotAddedVehicles,   setSpotAddedVehicles]   = useState<{
    vehicleModel: string; tonnage: string; model: string; bodyType: string;
    fuelType: string; remarks: string; tariffType: string;
    expectedUnits: string; baseRevenue: string; baseCost: string;
  }[]>([]);
  const [spotEditIndex, setSpotEditIndex] = useState<number | null>(null); // null = new, number = editing

  function openSpotModal(index?: number) {
    if (index !== undefined) {
      const sv = spotAddedVehicles[index];
      setSpotVehicleModel(sv.vehicleModel); setSpotTonnage(sv.tonnage);
      setSpotModel(sv.model); setSpotBodyType(sv.bodyType);
      setSpotFuelType(sv.fuelType); setSpotRemarks(sv.remarks);
      setSpotTariffType(sv.tariffType); setSpotExpectedUnits(sv.expectedUnits);
      setSpotBaseRevenue(sv.baseRevenue); setSpotBaseCost(sv.baseCost);
      setSpotEditIndex(index);
    } else {
      setSpotVehicleModel(''); setSpotTonnage(''); setSpotModel('');
      setSpotBodyType(''); setSpotFuelType(''); setSpotRemarks('');
      setSpotTariffType('Per Lane'); setSpotExpectedUnits('1');
      setSpotBaseRevenue(''); setSpotBaseCost('');
      setSpotEditIndex(null);
    }
    setShowSpotVehicleModal(true);
  }

  const spotVehicleModalValid = spotVehicleModel !== '' && spotTonnage !== '' && spotModel !== '' && spotBodyType !== '' && spotFuelType !== '' && spotBaseRevenue !== '' && spotBaseCost !== '';

  /* Auto-compute Expected Units based on Tariff Type + Tonnage */
  const spotExpectedUnitsAuto = useMemo(() => {
    const parseTon = (t: string) => parseFloat(t.replace(' Ton', '')) || 0;
    switch (spotTariffType) {
      case 'Per Lane': return '1';
      case 'Per KG':   return spotTonnage ? String(Math.round(parseTon(spotTonnage) * 1000)) : '';
      case 'Per MT':   return spotTonnage ? String(parseTon(spotTonnage)) : '';
      case 'Per KM':   return totalDistance ? totalDistance : '1091'; // proxy from route; fallback 1091 kms
      case 'Per Box':  return null; // user-editable
      default:         return null;
    }
  }, [spotTariffType, spotTonnage, totalDistance]);

  /* Sync auto-computed value into spotExpectedUnits whenever it changes */
  useEffect(() => {
    if (spotExpectedUnitsAuto !== null) setSpotExpectedUnits(spotExpectedUnitsAuto);
  }, [spotExpectedUnitsAuto]);

  const spotExpectedUnitsReadOnly = spotExpectedUnitsAuto !== null; // locked when auto-computed

  function handleSpotVehicleSubmit() {
    const entry = {
      vehicleModel: spotVehicleModel, tonnage: spotTonnage, model: spotModel,
      bodyType: spotBodyType, fuelType: spotFuelType, remarks: spotRemarks,
      tariffType: spotTariffType, expectedUnits: spotExpectedUnits,
      baseRevenue: spotBaseRevenue, baseCost: spotBaseCost,
    };
    if (spotEditIndex !== null) {
      const updated = [...spotAddedVehicles];
      updated[spotEditIndex] = entry;
      setSpotAddedVehicles(updated);
    } else {
      setSpotAddedVehicles([...spotAddedVehicles, entry]);
    }
    setSpotEditIndex(null);
    setShowSpotVehicleModal(false);
  }
  const pocPodComplete = pocPodData.length > 0 && pocPodData.every(r => r.pocName.trim() !== '' && r.pocNumber.trim() !== '');

  /* sync POC&POD rows with stops whenever stops change */
  useEffect(() => {
    if (!isODUPC) return;
    const cities = odUpcStops.filter(Boolean);
    setPocPodData(prev => cities.map((city, i) => prev[i] ? { ...prev[i], city } : { city, pocName: '', pocNumber: '', pods: 0 }));
  }, [odUpcStops, isODUPC]);

  const canSave = isODLocal
    ? draftId !== '' && hubName !== '' && reportingDateTime !== '' && confirmScreenshotName !== ''
      && totalDistance !== '' && totalTime !== ''
      && numberOfVehicles !== '' && vehicleTonnage !== '' && vehicleType !== '' && vehicleBodyType !== '' && materials !== '' && workType !== ''
      && (podRequired === 'mandatory' ? podCount !== '' : true)
      && (clientPricingLabel !== '' || estimatedRevenue !== '' || estimatedCost !== '')
    : isODUPC
    ? draftId !== '' && reportingDateTime !== '' && addedVehicles.length > 0
    : draftId !== '' && hubName !== '' && startDate !== '' && bookingTime !== ''
      && clientPricingLabel !== ''
      && (isSchedOpportunity
        ? partnerNumber !== '' && vehicleId !== '' && driverPricing !== '' && vehicleAttributes.length > 0 && driverContact !== ''
        : numberOfVehicles !== '' && vehicleTonnage !== '' && vehicleType !== '' && vehicleBodyType !== '' && materials !== '' && workType !== ''
      );

  function buildPayload(): Partial<Booking> {
    return {
      subArea: hubSubArea?.subArea ?? '', area: hubSubArea?.area ?? '',
      draftId, clientName, clientSupervisorName, clientSupervisorContact,
      bookingTime, hubName, clientPricingLabel,
      partnerNumber, partnerName, bankAccountNumber, vehicleId, driverPricing,
      vehicleType, vehicleBodyType, vehicleAttributes,
      driverContact, driverName, startDate, materials, helpers,
      tripType, is24hrTrip, totalDistance, totalTime, bookingType,
      estimatedCost, estimatedRevenue, margin,
      createdBy: user?.email ?? 'unknown',
    };
  }

  /* ── OD-UPC Summary Screen ── */
  if (isODUPC && showUpcSummary) {
    const selectedDraftForSummary = clientOptions.find(c => c.draft.id === draftId)?.draft;
    const clientVertical = selectedDraftForSummary?.steps?.vertical?.verticalName ?? selectedDraftForSummary?.steps?.group?.name ?? '—';
    const fmtDt = (v: string) => v ? new Date(v).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : '—';
    const routeLabel = odUpcStops.filter(Boolean).join(' - ');

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Success dialog */}
        {showConfirmSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 px-8 py-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 mb-2">Congratulations!</p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  You have successfully punched in {addedVehicles.reduce((s,v)=>s+v.count,0) || 1} listing with<br />
                  Order Id <span className="font-semibold text-slate-800">{confirmOrderId}</span>.<br />
                  Please visit Listing Dashboard for more details!
                </p>
              </div>
              <button onClick={() => { setShowConfirmSuccess(false); onBack(); }}
                className="bg-brand-navy text-white font-semibold text-sm px-10 py-2.5 rounded-xl hover:bg-brand-navy/90 transition-colors">
                OK
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-3">
          <button onClick={() => setShowUpcSummary(false)} className="text-slate-400 hover:text-brand-navy text-sm transition-colors flex items-center gap-1.5">
            ← {activeSubAreaInfo?.subArea ?? ''}
          </button>
          <span className="text-slate-200">|</span>
          <span className="text-sm font-semibold text-brand-navy">Summary</span>
          <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">OD-UPC</span>
        </div>

        {/* Two-column body */}
        <div className="flex-1 overflow-hidden flex gap-0">

          {/* LEFT — summary details */}
          <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5 space-y-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Summary</p>

            {/* POD checklist */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-blue-700">POD ++ document collection checklist</p>
              <div className="flex gap-2 text-xs text-slate-700 leading-relaxed">
                <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg>
                <div>
                  <p>Below documents to be collected from the partner for the <strong>Balance payout release</strong></p>
                  <ol className="list-decimal list-inside mt-1 space-y-0.5">
                    <li>POD (Proof of Delivery)</li>
                    <li>Parking slip</li>
                    <li>Weigh Slip</li>
                  </ol>
                  <p className="mt-2">Collect <strong>Picture within 1 day of unloading</strong> and Get the <strong>Courier within 10 days</strong> of unloading for <strong>ALL</strong> the documents</p>
                </div>
              </div>
            </div>

            {/* Summary fields */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-3 gap-x-8 gap-y-5 text-sm">
              <div><p className="text-xs text-slate-400 mb-0.5">Client Vertical</p><p className="font-semibold text-slate-800">{clientVertical}</p></div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Service Type</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">Upcountry {spotFlag === 'spot' ? 'Spot' : 'Contracted'}</p>
                  {spotFlag === 'spot' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">SPOT</span>}
                </div>
              </div>
              <div><p className="text-xs text-slate-400 mb-0.5">Hub Selection</p><p className="font-semibold text-slate-800">{hubName || '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Reporting Date & Time</p><p className="font-semibold text-slate-800">{fmtDt(reportingDateTime)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Confirmation Date & Time</p><p className="font-semibold text-slate-800">{fmtDt(confirmationDateTime)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Cutoff Date & Time</p><p className="font-semibold text-slate-800">{fmtDt(cutoffDateTime)}</p></div>
            </div>

            {routeLabel && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs text-slate-400 mb-0.5">Route</p>
                <p className="font-semibold text-slate-800">{routeLabel}</p>
                {totalDistance && <p className="text-xs text-slate-400 mt-1">{totalDistance} kms</p>}
              </div>
            )}

            {(contractedLane || goodsType || spotFlag === 'spot') && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {spotFlag === 'spot' && spotReason && <div className="col-span-2"><p className="text-xs text-slate-400 mb-0.5">Spot Reason</p><p className="font-semibold text-amber-700">{spotReason}</p></div>}
                {contractedLane && <div><p className="text-xs text-slate-400 mb-0.5">{spotFlag === 'spot' ? 'Spot Lane' : 'Lane Selection'}</p><p className="font-semibold text-slate-800">{contractedLane}</p></div>}
                {goodsType && <div><p className="text-xs text-slate-400 mb-0.5">Goods Type</p><p className="font-semibold text-slate-800">{goodsType}</p></div>}
                {tripCategory && <div><p className="text-xs text-slate-400 mb-0.5">Trip Category</p><p className="font-semibold text-slate-800">{tripCategory}</p></div>}
                {tripCategory === 'Low Credit' && agentNumber && <div><p className="text-xs text-slate-400 mb-0.5">Agent Number</p><p className="font-semibold text-slate-800">{agentNumber}</p></div>}
                {tripCategory === 'Low Credit' && <div><p className="text-xs text-slate-400 mb-0.5">Is GST Client</p><p className="font-semibold text-slate-800">{isGSTClient === 'yes' ? `Yes — ${gstPercentage}` : 'No'}</p></div>}
              </div>
            )}

            {/* Spot vehicle summary */}
            {spotFlag === 'spot' && spotAddedVehicles.length > 0 && spotAddedVehicles.map((sv, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Spot Vehicle</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">SPOT</span>
                </div>
                <div className="grid grid-cols-3 gap-x-8 gap-y-3 text-sm">
                  <div><p className="text-xs text-slate-400 mb-0.5">Vehicle Model</p><p className="font-semibold text-slate-800">{sv.vehicleModel}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Tonnage</p><p className="font-semibold text-slate-800">{sv.tonnage}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Model</p><p className="font-semibold text-slate-800">{sv.model}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Body Type</p><p className="font-semibold text-slate-800">{sv.bodyType}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Fuel Type</p><p className="font-semibold text-slate-800">{sv.fuelType}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Tariff Type</p><p className="font-semibold text-slate-800">{sv.tariffType}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Base Revenue</p><p className="font-semibold text-green-700">₹{sv.baseRevenue}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Base Cost</p><p className="font-semibold text-red-600">₹{sv.baseCost}</p></div>
                  <div><p className="text-xs text-slate-400 mb-0.5">Expected Units</p><p className="font-semibold text-slate-800">{sv.expectedUnits}</p></div>
                </div>
                {sv.remarks && <p className="text-xs text-slate-400 italic border-t border-slate-100 pt-2">{sv.remarks}</p>}
              </div>
            ))}
          </div>

          {/* RIGHT — services selected panel */}
          <div className="w-80 shrink-0 bg-white border-l border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Services Selected</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {spotFlag === 'spot' ? (
                spotAddedVehicles.length === 0
                  ? <p className="text-xs text-slate-400 text-center py-6">No vehicle added</p>
                  : spotAddedVehicles.map((sv, i) => (
                    <div key={i} className="space-y-2 pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{sv.vehicleModel}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">SPOT</span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <p>{sv.tonnage} · {sv.model} · {sv.bodyType} · {sv.fuelType}</p>
                        <p>{sv.tariffType} · {sv.expectedUnits} units</p>
                      </div>
                      <div className="flex justify-between text-xs font-semibold pt-1">
                        <span className="text-red-600">Cost: ₹{sv.baseCost}</span>
                        <span className="text-green-700">Revenue: ₹{sv.baseRevenue}</span>
                      </div>
                    </div>
                  ))
              ) : (
                <>
                  {addedVehicles.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No vehicles added</p>}
                  {addedVehicles.map((v, i) => (
                    <div key={v.code} className="space-y-2 pb-4 border-b border-slate-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">{v.label}</span>
                        <span className="text-sm text-slate-600">₹ {v.price.toLocaleString('en-IN')} / Lane</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400 mb-1">Vehicle Count</p>
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                            <button onClick={() => { const a=[...addedVehicles]; a[i]={...a[i],count:Math.max(1,a[i].count-1)}; setAddedVehicles(a); }}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 text-sm font-bold border-r border-slate-200">−</button>
                            <span className="px-3 py-1.5 text-sm font-semibold text-slate-800">{v.count}</span>
                            <button onClick={() => { const a=[...addedVehicles]; a[i]={...a[i],count:a[i].count+1}; setAddedVehicles(a); }}
                              className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-50 text-sm font-bold border-l border-slate-200">+</button>
                          </div>
                        </div>
                        <div className="relative flex-1">
                          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-400">Expected Units</label>
                          <input type="number" value={v.expectedUnits}
                            onChange={e => { const a=[...addedVehicles]; a[i]={...a[i],expectedUnits:e.target.value}; setAddedVehicles(a); }}
                            placeholder="1"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition" />
                        </div>
                      </div>
                      <p className="text-right text-xs font-semibold text-slate-700">Revenue: ₹ {(v.price * v.count).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 space-y-3">
              <p className="text-right text-sm font-bold text-slate-800">
                Total Revenue : ₹ {spotFlag === 'spot'
                  ? spotAddedVehicles.reduce((s, sv) => s + (parseFloat(sv.baseRevenue) || 0), 0).toLocaleString('en-IN')
                  : upcTotalRevenue.toLocaleString('en-IN')}
              </p>
              {/* POC & POD details */}
              {pocPodData.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">POC & POD</p>
                  {pocPodData.map((row, i) => (
                    <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                      <p className="font-semibold text-slate-600">{row.city || `Stop ${i+1}`}</p>
                      {row.pocName && <p className="text-slate-500">{row.pocName} · {row.pocNumber ? `+91 ${row.pocNumber}` : '—'}</p>}
                      {row.pods > 0 && <p className="text-slate-400">PODs: {row.pods}</p>}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { const id = `677e45a${Date.now().toString(16)}`; setConfirmOrderId(id); setShowConfirmSuccess(true); }}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                CONFIRM LISTING
              </button>
            </div>
          </div>
        </div>

        {/* POC & POD modal (reused) */}
        {showPocPodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="font-semibold text-slate-800">POC &amp; POD</span>
                <button onClick={() => setShowPocPodModal(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
              </div>
              <div className="px-5 py-4 space-y-5 max-h-96 overflow-y-auto">
                {pocPodData.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Add stops in Route first.</p>}
                {pocPodData.map((row, i) => (
                  <div key={i}>
                    <p className="text-sm font-bold text-slate-800 mb-2">{row.city || `Stop ${i + 1}`}</p>
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 relative">
                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-400">POC Name</label>
                        <input value={row.pocName} onChange={e => { const d=[...pocPodData]; d[i]={...d[i],pocName:e.target.value}; setPocPodData(d); }}
                          placeholder="Enter POC Name"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition" />
                      </div>
                      <div className="flex-1 relative">
                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-400">POC Number</label>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                          <span className="px-3 py-2.5 text-sm text-slate-500 bg-slate-50 border-r border-slate-200">+91 ▾</span>
                          <input value={row.pocNumber} onChange={e => { const d=[...pocPodData]; d[i]={...d[i],pocNumber:e.target.value}; setPocPodData(d); }}
                            placeholder="Enter POC Number" type="tel"
                            className="flex-1 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition" />
                        </div>
                      </div>
                      <div className="shrink-0">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">No of PODs</p>
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button onClick={() => { const d=[...pocPodData]; d[i]={...d[i],pods:Math.max(0,d[i].pods-1)}; setPocPodData(d); }}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-sm font-bold">−</button>
                          <span className="px-4 py-2 text-sm font-semibold text-slate-800 border-x border-slate-200">{row.pods}</span>
                          <button onClick={() => { const d=[...pocPodData]; d[i]={...d[i],pods:d[i].pods+1}; setPocPodData(d); }}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-sm font-bold">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-4 pt-2">
                <button onClick={() => setShowPocPodModal(false)}
                  disabled={!pocPodComplete}
                  className={`w-full font-semibold text-sm py-3 rounded-xl transition ${pocPodComplete ? 'bg-brand-navy text-white hover:bg-brand-navy/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cutoff info popover — rendered at root to escape overflow clipping */}
      {cutoffInfoAnchor && (
        <div className="fixed z-[9999] w-64 bg-brand-navy text-white text-[11px] leading-relaxed rounded-xl shadow-2xl px-4 py-3"
          style={{ top: cutoffInfoAnchor.top, left: cutoffInfoAnchor.left }}>
          <p className="font-semibold mb-1 text-orange-300">Cutoff Time</p>
          <p className="text-slate-200">A signal for the business team to wrap up this booking by the set time. It has <span className="font-semibold text-white">no impact</span> on trip visibility — neither on the partner app nor anywhere internally.</p>
        </div>
      )}
      {transpPriceInfoAnchor && (
        <div className="fixed z-[9999] w-64 bg-brand-navy text-white text-[11px] leading-relaxed rounded-xl shadow-2xl px-4 py-3"
          style={{ top: transpPriceInfoAnchor.top, left: transpPriceInfoAnchor.left }}>
          <p className="font-semibold mb-1 text-orange-300">Final Transporter's Price</p>
          <p className="text-slate-200">This price will be <span className="font-semibold text-white">published on the loadboard</span> and is visible to partners bidding for the trip.</p>
        </div>
      )}
      {/* Header — hidden when embedded inline in the tab */}
      {!hideHeader && (
        <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-brand-navy text-sm transition-colors flex items-center gap-1.5">
            ← Back
          </button>
          <span className="text-slate-200">|</span>
          <span className="text-sm font-semibold text-brand-navy">{activeSubAreaInfo?.subArea ?? ''}</span>
          <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
            {isEdit ? 'Edit Booking' : 'Add Booking'}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5 space-y-5">

        {(bothSelected || hideHeader) && (<>


        {/* ══ OD-LOCAL TEMPLATE ══ */}
        {isODLocal ? (<>


        {/* 1. Client Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Client Details" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Select Client" required>
              {isEdit && !initial?.draftId && initial?.clientName ? (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  <div className="w-5 h-5 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-[8px] font-bold shrink-0">{initials(initial.clientName)}</div>
                  <span className="text-sm font-medium text-slate-700">{initial.clientName}</span>
                </div>
              ) : clientOptions.length === 1 ? (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  <div className="w-5 h-5 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-[8px] font-bold shrink-0">{initials(clientOptions[0].draft.steps.group?.name)}</div>
                  <span className="text-sm font-medium text-slate-700">{clientOptions[0].draft.steps.group?.name}</span>
                </div>
              ) : (
                <select value={draftId} onChange={e => setDraftId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  <option value="">Select client…</option>
                  {clientOptions.map(({ draft }) => <option key={draft.id} value={draft.id}>{draft.steps.group?.name ?? draft.id}</option>)}
                </select>
              )}
            </Field>
            <Field label="Hub Location" required>
              {(isEdit && !initial?.draftId && initial?.hubName) ? (
                <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">{initial.hubName}</div>
              ) : hubsForClient.length <= 1 ? (
                <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">{hubsForClient[0]?.hubName || 'No hub'}</div>
              ) : (
                <SelectInput value={hubName} onChange={setHubName} options={hubsForClient.map(h => h.hubName)} placeholder="Select hub…" />
              )}
            </Field>
          </div>
          {(clientSupervisorName || clientSupervisorContact) && (
            <div className="flex items-center gap-4 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-[9px] font-bold text-blue-400 shrink-0">⟳ HUB OPS POC</span>
              <span className="text-[11px] font-semibold text-slate-700">{clientSupervisorName || '—'}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-[11px] text-slate-600">{clientSupervisorContact || '—'}</span>
              {hubSubArea?.subArea && (<>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy border border-brand-navy/20">
                  Sub Area: {hubSubArea.subArea}
                </span>
              </>)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reporting Date & Time" required>
              <input type="datetime-local" value={reportingDateTime} min={minReportingDateTime} onChange={e => setReportingDateTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </Field>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-slate-500">Confirmation Date & Time</label>
                {confirmationDateTime && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">⟳ Auto-filled</span>}
              </div>
              <input type="datetime-local" value={confirmationDateTime} onChange={e => setConfirmationDateTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-slate-500">Cutoff Date & Time</label>
                {cutoffDateTime && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">⟳ -6 hrs</span>}
                <div className="relative ml-0.5">
                  <button type="button"
                    onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setCutoffInfoAnchor({ top: r.bottom + 6, left: r.left }); }}
                    onMouseLeave={() => setCutoffInfoAnchor(null)}
                    className="w-4 h-4 rounded-full bg-slate-200 hover:bg-brand-navy/20 text-slate-500 hover:text-brand-navy text-[10px] font-bold flex items-center justify-center transition-colors leading-none">
                    i
                  </button>
                </div>
              </div>
              <input type="datetime-local" value={cutoffDateTime} onChange={e => setCutoffDateTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </div>
            <Field label="Upload Confirmation Screenshot" required>
              <label className="flex items-center gap-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white cursor-pointer hover:border-brand-navy/40 transition">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span className={`truncate ${confirmScreenshotName ? 'text-slate-700' : 'text-slate-400'}`}>{confirmScreenshotName || 'Upload file…'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setConfirmScreenshotName(e.target.files?.[0]?.name ?? '')} />
              </label>
            </Field>
          </div>
        </div>

        {/* 2. Booking Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Booking Details" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Trip Stops Type" required>
              <div className="flex flex-col gap-2 pt-0.5">
                {(['single', 'multiple'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => setTripType(v)}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${tripType === v ? 'border-brand-orange' : 'border-slate-300'}`}>
                      {tripType === v && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
                    </div>
                    <span className="text-sm text-slate-700">{v === 'single' ? 'Single Point' : 'Multiple Point'}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Total Distance (Kms)" required>
              <TextInput value={totalDistance} onChange={setTotalDistance} placeholder="0" type="number" />
            </Field>
            <Field label="Total Duration (Hrs)" required>
              <TextInput value={totalTime} onChange={setTotalTime} placeholder="0" type="number" />
            </Field>
          </div>
        </div>

        {/* 3. Vehicle Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Vehicle Details" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Number of Vehicles" required>
              <TextInput value={numberOfVehicles} onChange={setNumberOfVehicles} placeholder="1" type="number" />
            </Field>
            <Field label="Vehicle Tonnage" required>
              <SelectInput value={vehicleTonnage} onChange={setVehicleTonnage} options={VEHICLE_TONNAGE_OPTIONS} placeholder="Select…" />
            </Field>
            <Field label="Vehicle Type" required>
              <SearchableVehicleSelect value={vehicleType} onChange={setVehicleType} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Vehicle Body" required>
              <SelectInput value={vehicleBodyType} onChange={setVehicleBodyType} options={VEHICLE_BODY_TYPE_OPTIONS} placeholder="Select…" />
            </Field>
            <Field label="Select Material" required>
              <SelectInput value={materials} onChange={setMaterials} options={MATERIALS_OPTIONS} placeholder="Select…" />
            </Field>
            <Field label="Select Work Type" required>
              <SelectInput value={workType} onChange={setWorkType} options={WORK_TYPE_OPTIONS} placeholder="Select…" />
            </Field>
          </div>
        </div>

        {/* 4. Client Pricing & Booking Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Client Pricing & Booking Rate" />
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 pt-3 pb-3">
              <PricingDropdownField
                pricingOptions={pricingOptions}
                clientPricingLabel={clientPricingLabel}
                setClientPricingLabel={setClientPricingLabel}
                draftId={draftId}
                isOD={true}
                onPricingCreated={setFreshPricings}
              />
            </div>
            <div className="flex items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 border-y border-slate-100 w-full text-center">OR enter booking rate</span>
            </div>
            <div className="px-3 pt-3 pb-3 space-y-2">
              <p className="text-[10px] text-slate-400 font-medium">Prices are <span className="font-semibold text-slate-500">per vehicle</span></p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Final Revenue (₹)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={estimatedRevenue} onChange={e => setEstimatedRevenue(e.target.value)} placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                  </div>
                </Field>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label className="text-xs font-semibold text-slate-500">Final Transporter's Price (₹)</label>
                    <button type="button"
                      onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTranspPriceInfoAnchor({ top: r.bottom + 6, left: r.left - 180 }); }}
                      onMouseLeave={() => setTranspPriceInfoAnchor(null)}
                      className="w-4 h-4 rounded-full bg-slate-200 hover:bg-brand-navy/20 text-slate-500 hover:text-brand-navy text-[10px] font-bold flex items-center justify-center transition-colors leading-none shrink-0">
                      i
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                  </div>
                </div>
              </div>
              {margin && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${parseFloat(margin) >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  Margin: {margin}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Proof of Delivery */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <FormSection title="Proof of Delivery" />
          <div className="grid grid-cols-2 gap-4">
            {([['none', 'POD not required'], ['mandatory', 'Mandatory POD required']] as const).map(([v, label]) => (
              <label key={v} onClick={() => setPodRequired(v)} className="flex items-center gap-3 cursor-pointer">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${podRequired === v ? 'border-brand-orange' : 'border-slate-300'}`}>
                  {podRequired === v && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
                </div>
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          {podRequired === 'mandatory' && (
            <Field label="No. of POD Required" required>
              <TextInput value={podCount} onChange={setPodCount} placeholder="Enter count" type="number" />
            </Field>
          )}
          <Field label="Instructions / Remarks">
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add Remarks…" rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white resize-none" />
          </Field>
        </div>

        </>) : isODUPC ? (<>

        {/* ══ OD-UPC TEMPLATE ══ */}

        {/* Route modal */}
        {showRouteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="font-semibold text-slate-800">Route</span>
                <button onClick={() => setShowRouteModal(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-72 overflow-y-auto">
                {odUpcStops.map((stop, i) => (
                  <div key={i} className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-brand-navy">Stop {i + 1}</label>
                    <div className="flex gap-2">
                      <input value={stop} onChange={e => { const s = [...odUpcStops]; s[i] = e.target.value; setOdUpcStops(s); }}
                        placeholder={`Stop ${i + 1} city, state`}
                        className="flex-1 border-2 border-slate-200 focus:border-brand-navy rounded-lg px-3 py-2.5 text-sm focus:outline-none transition" />
                      {odUpcStops.length > 2 && (
                        <button onClick={() => setOdUpcStops(odUpcStops.filter((_, j) => j !== i))}
                          className="text-slate-400 hover:text-red-500 text-sm px-2">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-2">
                <button onClick={() => setOdUpcStops([...odUpcStops, ''])}
                  className="text-brand-navy font-semibold text-xs flex items-center gap-1 py-2 hover:opacity-70">
                  + ADD STOP
                </button>
              </div>
              <div className="px-5 pb-4">
                <button onClick={() => setShowRouteModal(false)}
                  className="w-full bg-brand-navy text-white font-semibold text-sm py-3 rounded-xl hover:bg-brand-navy/90 transition">
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POC & POD modal */}
        {showPocPodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="font-semibold text-slate-800">POC &amp; POD</span>
                <button onClick={() => setShowPocPodModal(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">✕</button>
              </div>
              <div className="px-5 py-4 space-y-5 max-h-96 overflow-y-auto">
                {pocPodData.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Add stops in Route first.</p>}
                {pocPodData.map((row, i) => (
                  <div key={i}>
                    <p className="text-sm font-bold text-slate-800 mb-2">{row.city || `Stop ${i + 1}`}</p>
                    <div className="flex gap-3 items-start">
                      <div className="flex-1 relative">
                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-400">POC Name</label>
                        <input value={row.pocName} onChange={e => { const d=[...pocPodData]; d[i]={...d[i],pocName:e.target.value}; setPocPodData(d); }}
                          placeholder="Enter POC Name"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition" />
                      </div>
                      <div className="flex-1 relative">
                        <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-400">POC Number</label>
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                          <span className="px-3 py-2.5 text-sm text-slate-500 bg-slate-50 border-r border-slate-200">+91 ▾</span>
                          <input value={row.pocNumber} onChange={e => { const d=[...pocPodData]; d[i]={...d[i],pocNumber:e.target.value}; setPocPodData(d); }}
                            placeholder="Enter POC Number" type="tel"
                            className="flex-1 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/20 transition" />
                        </div>
                      </div>
                      <div className="shrink-0">
                        <p className="text-xs font-semibold text-slate-600 mb-1.5">No of PODs</p>
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button onClick={() => { const d=[...pocPodData]; d[i]={...d[i],pods:Math.max(0,d[i].pods-1)}; setPocPodData(d); }}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-sm font-bold">−</button>
                          <span className="px-4 py-2 text-sm font-semibold text-slate-800 border-x border-slate-200">{row.pods}</span>
                          <button onClick={() => { const d=[...pocPodData]; d[i]={...d[i],pods:d[i].pods+1}; setPocPodData(d); }}
                            className="px-3 py-2 text-slate-500 hover:bg-slate-50 text-sm font-bold">+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-4 pt-2">
                <button onClick={() => setShowPocPodModal(false)}
                  disabled={!pocPodComplete}
                  className={`w-full font-semibold text-sm py-3 rounded-xl transition ${pocPodComplete ? 'bg-brand-navy text-white hover:bg-brand-navy/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1. Client Details (OD-UPC — no screenshot, no pricing) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Client Details" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Select Client" required>
              {isEdit && !initial?.draftId && initial?.clientName ? (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  <div className="w-5 h-5 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-[8px] font-bold shrink-0">{initials(initial.clientName)}</div>
                  <span className="text-sm font-medium text-slate-700">{initial.clientName}</span>
                </div>
              ) : clientOptions.length === 1 ? (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  <div className="w-5 h-5 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-[8px] font-bold shrink-0">{initials(clientOptions[0].draft.steps.group?.name)}</div>
                  <span className="text-sm font-medium text-slate-700">{clientOptions[0].draft.steps.group?.name}</span>
                </div>
              ) : (
                <select value={draftId} onChange={e => setDraftId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  <option value="">Select client…</option>
                  {clientOptions.map(({ draft }) => <option key={draft.id} value={draft.id}>{draft.steps.group?.name ?? draft.id}</option>)}
                </select>
              )}
            </Field>
            <Field label="Hub Location" required>
              {(isEdit && !initial?.draftId && initial?.hubName) ? (
                <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">{initial.hubName}</div>
              ) : hubsForClient.length <= 1 ? (
                <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">{hubsForClient[0]?.hubName || 'No hub'}</div>
              ) : (
                <SelectInput value={hubName} onChange={setHubName} options={hubsForClient.map(h => h.hubName)} placeholder="Select hub…" />
              )}
            </Field>
          </div>
          {(clientSupervisorName || clientSupervisorContact) && (
            <div className="flex items-center gap-4 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-[9px] font-bold text-blue-400 shrink-0">⟳ HUB OPS POC</span>
              <span className="text-[11px] font-semibold text-slate-700">{clientSupervisorName || '—'}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-[11px] text-slate-600">{clientSupervisorContact || '—'}</span>
              {hubSubArea?.subArea && (<>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy border border-brand-navy/20">
                  Sub Area: {hubSubArea.subArea}
                </span>
              </>)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reporting Date & Time" required>
              <input type="datetime-local" value={reportingDateTime} min={minReportingDateTime} onChange={e => setReportingDateTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </Field>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-slate-500">Confirmation Date & Time</label>
                {confirmationDateTime && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">⟳ Auto-filled</span>}
              </div>
              <input type="datetime-local" value={confirmationDateTime} onChange={e => setConfirmationDateTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-slate-500">Cutoff Date & Time</label>
                {cutoffDateTime && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">⟳ -6 hrs</span>}
                <div className="relative ml-0.5">
                  <button type="button"
                    onMouseEnter={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setCutoffInfoAnchor({ top: r.bottom + 6, left: r.left }); }}
                    onMouseLeave={() => setCutoffInfoAnchor(null)}
                    className="w-4 h-4 rounded-full bg-slate-200 hover:bg-brand-navy/20 text-slate-500 hover:text-brand-navy text-[10px] font-bold flex items-center justify-center transition-colors leading-none">
                    i
                  </button>
                </div>
              </div>
              <input type="datetime-local" value={cutoffDateTime} onChange={e => setCutoffDateTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </div>
            <Field label="Upload Proof of Indent" required>
              <label className={`flex items-center gap-2 w-full border rounded-lg px-3 py-2 text-sm bg-white cursor-pointer transition ${confirmScreenshotName ? 'border-brand-navy/40' : 'border-slate-200 hover:border-brand-navy/40'}`}>
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span className={`truncate ${confirmScreenshotName ? 'text-slate-700' : 'text-slate-400'}`}>{confirmScreenshotName || 'Upload file…'}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setConfirmScreenshotName(e.target.files?.[0]?.name ?? '')} />
              </label>
            </Field>
          </div>
        </div>

        {/* 2. Route */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Route" />
          <div className="flex items-center gap-3">
            {odUpcStops.filter(Boolean).length >= 2 ? (
              <div className="flex-1 flex flex-wrap gap-1.5">
                {odUpcStops.filter(Boolean).map((s, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">Stop {i+1}: {s}</span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-slate-400 flex-1">No stops added yet</span>
            )}
            <button onClick={() => setShowRouteModal(true)}
              className="shrink-0 text-xs font-semibold text-brand-navy border border-brand-navy/30 px-3 py-1.5 rounded-lg hover:bg-brand-navy/5 transition-colors">
              {odUpcStops.filter(Boolean).length >= 2 ? 'Edit Route' : '+ Add Route'}
            </button>
          </div>
        </div>

        {/* 3. Spot Flag + Lane + Goods + Vehicle Selection */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <FormSection title="Spot Flag" />
          <div className="flex gap-5">
            {([['contracted', 'Contracted Rates'], ['spot', 'Spot']] as const).map(([v, label]) => (
              <label key={v} onClick={() => setSpotFlag(v)} className="flex items-center gap-2.5 cursor-pointer">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${spotFlag === v ? 'border-brand-navy' : 'border-slate-300'}`}>
                  {spotFlag === v && <div className="w-2 h-2 rounded-full bg-brand-navy" />}
                </div>
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>

          {spotFlag === 'spot' ? (<>
            {/* Spot Reason */}
            <Field label="Spot Reason" required>
              <SelectInput
                value={spotReason}
                onChange={setSpotReason}
                options={['Spot Bidding', 'Adhoc requirement', 'Contract Rates not uploaded']}
                placeholder="Select reason…"
              />
            </Field>

            {/* Spot Lane + Goods Type */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Spot Lane Selection">
                <SelectInput value={contractedLane} onChange={setContractedLane} options={CONTRACTED_LANES} placeholder="Select lane…" />
              </Field>
              <Field label="Goods Type">
                <SelectInput value={goodsType} onChange={setGoodsType} options={GOODS_TYPES_OPTIONS} placeholder="Select goods type…" />
              </Field>
            </div>

            {/* Trip Category + Low Credit extras */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trip Category">
                <SelectInput value={tripCategory} onChange={setTripCategory} options={['Normal', 'Low Credit']} />
              </Field>
              {tripCategory === 'Low Credit' && (
                <Field label="Agent Number">
                  <TextInput value={agentNumber} onChange={setAgentNumber} placeholder="Enter agent contact number" type="tel" />
                </Field>
              )}
            </div>

            {tripCategory === 'Low Credit' && (
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Is GST Client</p>
                  <div className="flex gap-5">
                    {(['yes', 'no'] as const).map(v => (
                      <label key={v} onClick={() => setIsGSTClient(v)} className="flex items-center gap-2.5 cursor-pointer">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isGSTClient === v ? 'border-brand-navy' : 'border-slate-300'}`}>
                          {isGSTClient === v && <div className="w-2 h-2 rounded-full bg-brand-navy" />}
                        </div>
                        <span className="text-sm text-slate-700">{v === 'yes' ? 'Yes' : 'No'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {isGSTClient === 'yes' && (
                  <Field label="GST Percentage">
                    <SelectInput value={gstPercentage} onChange={setGstPercentage} options={['0%', '5%', '12%', '18%', '28%']} />
                  </Field>
                )}
              </div>
            )}

            {/* Added Spot Vehicles — clickable to edit */}
            {spotAddedVehicles.length > 0 && (
              <div className="space-y-2 pt-1">
                <FormSection title="Added Vehicle" />
                {spotAddedVehicles.map((sv, i) => (
                  <div
                    key={i}
                    onClick={() => openSpotModal(i)}
                    className="border border-brand-navy/30 rounded-xl p-3 space-y-1.5 cursor-pointer hover:border-brand-navy hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-800">{sv.vehicleModel}</span>
                        <span className="ml-2 text-xs text-slate-500">{sv.tonnage} · {sv.model} · {sv.bodyType}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-brand-navy font-semibold opacity-0 group-hover:opacity-100 transition-opacity">✎ Edit</span>
                        <button
                          onClick={e => { e.stopPropagation(); setSpotAddedVehicles(spotAddedVehicles.filter((_, j) => j !== i)); }}
                          className="text-slate-300 hover:text-red-400 text-xs"
                        >✕</button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>⛽ {sv.fuelType}</span>
                      <span>📦 {sv.tariffType}</span>
                      <span>Rev: <span className="font-semibold text-green-700">₹{sv.baseRevenue}</span></span>
                      <span>Cost: <span className="font-semibold text-red-600">₹{sv.baseCost}</span></span>
                      <span>Units: {sv.expectedUnits}</span>
                    </div>
                    {sv.remarks && <p className="text-xs text-slate-400 italic">{sv.remarks}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* ADD VEHICLE DETAILS — hidden once a vehicle is added */}
            {spotAddedVehicles.length === 0 && (
              <button
                onClick={() => openSpotModal()}
                className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-semibold py-3 rounded-xl transition-colors mt-2"
              >
                + ADD VEHICLE DETAILS
              </button>
            )}
          </>) : (<>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contracted Lane Selection">
                <SelectInput value={contractedLane} onChange={setContractedLane} options={CONTRACTED_LANES} placeholder="Select lane…" />
              </Field>
              <Field label="Goods Type">
                <SelectInput value={goodsType} onChange={setGoodsType} options={GOODS_TYPES_OPTIONS} placeholder="Select goods type…" />
              </Field>
            </div>

            {/* Trip Category + Low Credit extras */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Trip Category">
                <SelectInput value={tripCategory} onChange={setTripCategory} options={['Normal', 'Low Credit']} />
              </Field>
              {tripCategory === 'Low Credit' && (
                <Field label="Agent Number">
                  <TextInput value={agentNumber} onChange={setAgentNumber} placeholder="Enter agent contact number" type="tel" />
                </Field>
              )}
            </div>

            {tripCategory === 'Low Credit' && (
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Is GST Client</p>
                  <div className="flex gap-5">
                    {(['yes', 'no'] as const).map(v => (
                      <label key={v} onClick={() => setIsGSTClient(v)} className="flex items-center gap-2.5 cursor-pointer">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isGSTClient === v ? 'border-brand-navy' : 'border-slate-300'}`}>
                          {isGSTClient === v && <div className="w-2 h-2 rounded-full bg-brand-navy" />}
                        </div>
                        <span className="text-sm text-slate-700">{v === 'yes' ? 'Yes' : 'No'}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {isGSTClient === 'yes' && (
                  <Field label="GST Percentage">
                    <SelectInput value={gstPercentage} onChange={setGstPercentage} options={['0%', '5%', '12%', '18%', '28%']} />
                  </Field>
                )}
              </div>
            )}
          </>)}

          {spotFlag === 'contracted' && (<>
            <FormSection title="Vehicle Selection" />
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Field label="Select Vehicle Type">
                  <SelectInput value={upcVehicleSel} onChange={setUpcVehicleSel}
                    options={UPC_VEHICLE_OPTIONS.map(v => v.label)} placeholder="Select vehicle…" />
                </Field>
              </div>
              <button
                onClick={() => {
                  const opt = UPC_VEHICLE_OPTIONS.find(v => v.label === upcVehicleSel);
                  if (!opt) return;
                  if (addedVehicles.find(v => v.code === opt.code)) return;
                  setAddedVehicles([...addedVehicles, { label: opt.label, code: opt.code, price: opt.price, count: 1, expectedUnits: '' }]);
                  setUpcVehicleSel('');
                }}
                disabled={!upcVehicleSel}
                className="shrink-0 bg-brand-navy disabled:opacity-40 hover:bg-brand-navy/90 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-colors mb-0.5">
                ADD
              </button>
            </div>

            {/* Added vehicle rows */}
            {addedVehicles.length > 0 && (
              <div className="space-y-3 pt-1">
                {addedVehicles.map((v, i) => (
                  <div key={v.code} className="border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-800">{v.label}</span>
                        <span className="ml-2 text-[10px] text-slate-400 font-mono">{v.code}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-700">₹ {v.price.toLocaleString('en-IN')} / Lane</span>
                        <button onClick={() => setAddedVehicles(addedVehicles.filter((_, j) => j !== i))}
                          className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 mb-1">Vehicle Count</p>
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button onClick={() => { const a=[...addedVehicles]; a[i]={...a[i],count:Math.max(1,a[i].count-1)}; setAddedVehicles(a); }}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 text-sm font-bold border-r border-slate-200">−</button>
                          <span className="px-4 py-1.5 text-sm font-semibold text-slate-800">{v.count}</span>
                          <button onClick={() => { const a=[...addedVehicles]; a[i]={...a[i],count:a[i].count+1}; setAddedVehicles(a); }}
                            className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 text-sm font-bold border-l border-slate-200">+</button>
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[10px] text-slate-400">Revenue</p>
                        <p className="text-sm font-bold text-slate-800">₹ {(v.price * v.count).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-1 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-800">Total Revenue : ₹ {upcTotalRevenue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </>)}
        </div>

        </>) : (<>

        {/* ── CLIENT DETAILS ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Client Details" />

          {/* Client Name + Client Hub */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client Name" required>
              {clientOptions.length === 1 ? (
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-slate-50">
                  <div className="w-5 h-5 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-[8px] font-bold shrink-0">{initials(clientOptions[0].draft.steps.group?.name)}</div>
                  <span className="text-sm font-medium text-slate-700">{clientOptions[0].draft.steps.group?.name}</span>
                </div>
              ) : (
                <select value={draftId} onChange={e => setDraftId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  <option value="">Select client…</option>
                  {clientOptions.map(({ draft }) => <option key={draft.id} value={draft.id}>{draft.steps.group?.name ?? draft.id}</option>)}
                </select>
              )}
            </Field>
            <Field label="Client Hub" required>
              {hubsForClient.length <= 1 ? (
                <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-700">{hubsForClient[0]?.hubName || 'No hub'}</div>
              ) : (
                <SelectInput value={hubName} onChange={setHubName} options={hubsForClient.map(h => h.hubName)} placeholder="Select hub…" />
              )}
            </Field>
          </div>

          {/* Supervisor auto-fetched strip */}
          {(clientSupervisorName || clientSupervisorContact) && (
            <div className="flex items-center gap-4 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-[9px] font-bold text-blue-400 shrink-0">⟳ HUB OPS POC</span>
              <span className="text-[11px] font-semibold text-slate-700">{clientSupervisorName || '—'}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-[11px] text-slate-600">{clientSupervisorContact || '—'}</span>
              {hubSubArea?.subArea && (<>
                <span className="text-slate-300 text-xs">·</span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy border border-brand-navy/20">
                  Sub Area: {hubSubArea.subArea}
                </span>
              </>)}
            </div>
          )}

          {/* Start Date + Reporting Time — mirrors OD-Local's date/time row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" required>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </Field>
            <Field label="Reporting Time" required>
              <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
            </Field>
          </div>

        </div>

        {/* ── TRIP & RATE ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Booking Details" />
          <div className="grid grid-cols-4 gap-3">
            <Field label="Trip Stops Type" required>
              <div className="flex flex-col gap-2 pt-0.5">
                {(['single', 'multiple'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <div onClick={() => setTripType(v)}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${tripType === v ? 'border-brand-orange' : 'border-slate-300'}`}>
                      {tripType === v && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
                    </div>
                    <span className="text-sm text-slate-700">{v === 'single' ? 'Single Point' : 'Multiple Point'}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="24hr Trip">
              <SegmentControl<'yes'|'no'>
                options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
                value={is24hrTrip ? 'yes' : 'no'} onChange={v => setIs24hrTrip(v === 'yes')} />
            </Field>
            <Field label="Total Distance (Kms)" required>
              <TextInput value={totalDistance} onChange={setTotalDistance} placeholder="0" type="number" />
            </Field>
            <Field label="Total Duration (Hrs)" required>
              <TextInput value={totalTime} onChange={setTotalTime} placeholder="0" type="number" />
            </Field>
          </div>
        </div>

        {/* ── DRIVER PRE-ASSIGNED TOGGLE (Sch-Local + Sch-UPC) ── */}
        {(isSchedLocal || isSchedUPC) && (
          <label className={`flex items-center gap-3 cursor-pointer select-none bg-white rounded-xl border px-4 py-3 transition-colors ${isSchedOpportunity ? 'border-brand-navy/40 bg-brand-navy/5' : 'border-slate-200'}`}>
            <input
              type="checkbox"
              checked={isSchedOpportunity}
              onChange={e => setIsSchedOpportunity(e.target.checked)}
              className="w-4 h-4 accent-brand-navy rounded shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">Driver already assigned — loadboard publishing not required</p>
              <p className="text-[11px] mt-0.5">
                <span className="text-red-500 font-medium">We don't recommend using this.</span>
                {' '}
                <span className="text-green-600 font-medium">Please try to publish as many bookings as possible on the loadboard.</span>
              </p>
            </div>
          </label>
        )}

        {/* ── VEHICLE DETAILS (loadboard publish — shown when driver NOT pre-assigned) ── */}
        {(isSchedLocal || isSchedUPC) && !isSchedOpportunity && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <FormSection title="Vehicle Details" />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Number of Vehicles" required>
                <TextInput value={numberOfVehicles} onChange={setNumberOfVehicles} placeholder="1" type="number" />
              </Field>
              <Field label="Vehicle Tonnage" required>
                <SelectInput value={vehicleTonnage} onChange={setVehicleTonnage} options={VEHICLE_TONNAGE_OPTIONS} placeholder="Select…" />
              </Field>
              <Field label="Vehicle Type" required>
                <SearchableVehicleSelect value={vehicleType} onChange={setVehicleType} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Vehicle Body" required>
                <SelectInput value={vehicleBodyType} onChange={setVehicleBodyType} options={VEHICLE_BODY_TYPE_OPTIONS} placeholder="Select…" />
              </Field>
              <Field label="Select Material" required>
                <SelectInput value={materials} onChange={setMaterials} options={MATERIALS_OPTIONS} placeholder="Select…" />
              </Field>
              <Field label="Select Work Type" required>
                <SelectInput value={workType} onChange={setWorkType} options={WORK_TYPE_OPTIONS} placeholder="Select…" />
              </Field>
            </div>
          </div>
        )}

        {/* ── DRIVER & VEHICLE ── */}
        {selPricingCat === 'scheduled' && ((isSchedLocal || isSchedUPC) && !isSchedOpportunity ? null : (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Driver and Vehicle Details" />

          {/* Row 1: Partner Number | Select Vehicle */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Partner Number" required>
              <SearchablePartnerSelect partners={partners} value={partnerNumber} onSelect={handlePartnerSelect} />
            </Field>
            <Field label="Select Vehicle" required>
              {selectedPartner ? (
                <SelectInput value={vehicleId} onChange={handleVehicleSelect}
                  options={selectedPartner.vehicles.map(v => v.registration)}
                  placeholder="Select vehicle…" />
              ) : (
                <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400">Select partner first</div>
              )}
            </Field>
          </div>

          {/* Auto-fetched strip: partner + vehicle info */}
          {(partnerName || vehicleType) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-lg">
              <span className="text-[9px] font-bold text-blue-400 shrink-0">⟳ AUTO</span>
              {partnerName    && <><span className="text-[10px] text-slate-400">Partner:</span><span className="text-[10px] font-semibold text-slate-700">{partnerName}</span></>}
              {bankAccountNumber && <><span className="text-slate-300">·</span><span className="text-[10px] text-slate-400">Bank:</span><span className="text-[10px] font-semibold text-slate-700 font-mono">{bankAccountNumber}</span></>}
              {vehicleType    && <><span className="text-slate-300">·</span><span className="text-[10px] font-semibold text-brand-navy">{vehicleType}</span></>}
              {vehicleBodyType && <span className="text-[10px] text-slate-500">({vehicleBodyType})</span>}
            </div>
          )}

          {/* Row 2: Driver Pricing (full width) */}
          <PricingDropdownField
            isOD={false}
            label="Driver Pricing"
            required
            pricingOptions={driverPricingOptions}
            clientPricingLabel={driverPricing}
            setClientPricingLabel={setDriverPricing}
            draftId={draftId}
            storageKey="driverPricings"
            onPricingCreated={setFreshDriverPricings}
          />

          {/* Row 3: Vehicle Attributes | Driver Contact | Driver Name */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Vehicle Attributes" required>
              <MultiSelectAttributes value={vehicleAttributes} onChange={setVehicleAttributes} />
            </Field>
            <Field label="Driver Contact" required>
              <SearchableDriverSelect drivers={drivers} value={driverContact} onSelect={handleDriverSelect} />
            </Field>
            <AutoField label="Driver Name" value={driverName} />
          </div>
        </div>
        ))}

        {/* Client Pricing & Booking Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <FormSection title="Client Pricing & Booking Rate" />
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-3 pt-3 pb-3">
              <PricingDropdownField
                pricingOptions={pricingOptions}
                clientPricingLabel={clientPricingLabel}
                setClientPricingLabel={setClientPricingLabel}
                draftId={draftId}
                isOD={false}
                required
                onPricingCreated={setFreshPricings}
              />
            </div>
            <div className="flex items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 border-y border-slate-100 w-full text-center">Estimated Booking Rate</span>
            </div>
            <div className="px-3 pt-3 pb-3 space-y-2">
              <p className="text-[10px] text-slate-400 font-medium">Prices are <span className="font-semibold text-slate-500">per vehicle</span></p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Est. Revenue (₹)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={estimatedRevenue} onChange={e => setEstimatedRevenue(e.target.value)} placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                  </div>
                </Field>
                <Field label="Est. Cost (₹)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="0"
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                  </div>
                </Field>
                <Field label="Margin (%)">
                  <div className={`w-full border rounded-lg px-3 py-2.5 text-sm font-semibold ${
                    margin ? parseFloat(margin) >= 0 ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'
                    : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                    {margin ? `${margin}%` : '—'}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </div>

        <div className="h-1" />
        </>)}  {/* end else (non-OD-Local) */}
        </>)}
      </div>

      {/* ── Spot Vehicle Details Modal ── */}
      {showSpotVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <span className="text-base font-bold text-slate-800">
                {spotEditIndex !== null ? '✎ Edit Vehicle Details' : 'Spot Listing — Vehicle Details'}
              </span>
              <button onClick={() => { setShowSpotVehicleModal(false); setSpotEditIndex(null); }} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Vehicle Category */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle Category</p>
                <Field label="Vehicle Model" required>
                  <SelectInput
                    value={spotVehicleModel}
                    onChange={setSpotVehicleModel}
                    options={['0.1 - 2 Ton', '2 - 5 Ton', '5 - 10 Ton', '10 - 15 Ton', '15 - 22 Ton', '22 - 30 Ton']}
                    placeholder="Select vehicle model…"
                  />
                </Field>
              </div>

              {/* Vehicle Details */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle Details</p>
                <div className="space-y-3">
                  <Field label="Tonnage" required>
                    <SelectInput value={spotTonnage} onChange={setSpotTonnage}
                      options={['0.5 Ton', '0.75 Ton', '1 Ton', '1.5 Ton', '2.1 Ton', '2.5 Ton', '3.5 Ton', '5 Ton', '7 Ton', '9 Ton', '10 Ton', '14 Ton', '15 Ton', '16 Ton', '21 Ton', '25 Ton', '30 Ton']}
                      placeholder="Select Maximum Tonnage…" />
                  </Field>
                  <Field label="Model" required>
                    <SelectInput value={spotModel} onChange={setSpotModel}
                      options={['Tata Ace Zip', 'Tata Ace', 'Tata Ace HT', 'Mahindra Supro', 'Ashok Leyland Dost', 'Tata 407', 'Tata 709', 'Eicher 10.90', 'Tata 1109', 'Tata 1512', 'Tata 1615', '24 Ft Truck', '32 Ft Truck', '40 Ft Container', 'Trailer']}
                      placeholder="Select Model…" />
                  </Field>
                  <Field label="Body Type" required>
                    <SelectInput value={spotBodyType} onChange={setSpotBodyType}
                      options={['Standard Container', 'Open Body', 'Closed Body', 'Flatbed', 'Refrigerated', 'Tanker', 'Tipper']}
                      placeholder="Select Body Type…" />
                  </Field>
                  <Field label="Fuel Type" required>
                    <SelectInput value={spotFuelType} onChange={setSpotFuelType}
                      options={['Diesel', 'Petrol', 'CNG', 'Electric', 'Hybrid']}
                      placeholder="Select Fuel Type…" />
                  </Field>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Remarks <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={spotRemarks}
                  onChange={e => setSpotRemarks(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white resize-none"
                />
              </div>

              {/* Revenue & Cost */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Revenue &amp; Cost</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tariff Type" required>
                      <SelectInput value={spotTariffType} onChange={setSpotTariffType}
                        options={['Per Lane', 'Per KG', 'Per KM', 'Per Box', 'Per MT']} />
                    </Field>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="text-xs font-semibold text-slate-500">Expected Units</label>
                        {spotExpectedUnitsReadOnly && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">⟳ Auto</span>
                        )}
                      </div>
                      {spotExpectedUnitsReadOnly ? (
                        <div className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-700 select-none">
                          <span className="font-medium">{spotExpectedUnits || '—'}</span>
                          <span className="ml-1.5 text-xs text-slate-400">
                            {spotTariffType === 'Per Lane' && 'lane'}
                            {spotTariffType === 'Per KG'   && 'kg'}
                            {spotTariffType === 'Per MT'   && 'MT'}
                            {spotTariffType === 'Per KM'   && 'km (route)'}
                          </span>
                        </div>
                      ) : (
                        <TextInput value={spotExpectedUnits} onChange={setSpotExpectedUnits} placeholder="Enter units" type="number" />
                      )}
                      {spotTariffType === 'Per KG' && spotTonnage && (
                        <p className="text-[10px] text-slate-400 mt-1">From {spotTonnage} = {spotExpectedUnits} kg</p>
                      )}
                      {spotTariffType === 'Per MT' && spotTonnage && (
                        <p className="text-[10px] text-slate-400 mt-1">From {spotTonnage}</p>
                      )}
                      {spotTariffType === 'Per KM' && (
                        <p className="text-[10px] text-slate-400 mt-1">{totalDistance ? `From route: ${totalDistance} km` : 'Proxy: 1091 km'}</p>
                      )}
                      {spotTariffType === 'Per Box' && (
                        <p className="text-[10px] text-slate-400 mt-1">Enter number of boxes</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`Base Revenue (${spotTariffType})`} required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <input type="number" value={spotBaseRevenue} onChange={e => setSpotBaseRevenue(e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                      </div>
                    </Field>
                    <Field label={`Base Cost (${spotTariffType})`} required>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                        <input type="number" value={spotBaseCost} onChange={e => setSpotBaseCost(e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy transition bg-white" />
                      </div>
                    </Field>
                  </div>
                  {/* Live margin preview */}
                  {spotBaseRevenue && spotBaseCost && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400">Margin:</span>
                      <span className={`text-xs font-bold ${parseFloat(spotBaseRevenue) > parseFloat(spotBaseCost) ? 'text-green-600' : 'text-red-500'}`}>
                        {parseFloat(spotBaseRevenue) > 0
                          ? `${(((parseFloat(spotBaseRevenue) - parseFloat(spotBaseCost)) / parseFloat(spotBaseRevenue)) * 100).toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 pb-5 pt-3 border-t border-slate-100 shrink-0">
              <button
                onClick={handleSpotVehicleSubmit}
                disabled={!spotVehicleModalValid}
                className={`w-full font-semibold text-sm py-3 rounded-xl transition-colors ${spotVehicleModalValid ? 'bg-brand-navy text-white hover:bg-brand-navy/90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`shrink-0 bg-white border-t border-slate-200 px-6 py-4 ${!bothSelected ? 'hidden' : ''}`}>
        {isODUPC ? (
          <div className="flex gap-3">
            <button onClick={() => setShowPocPodModal(true)}
              className="flex-1 border-2 border-brand-navy text-brand-navy text-sm font-semibold py-2.5 rounded-xl hover:bg-brand-navy/5 transition-colors">
              ADD POC &amp; POD
            </button>
            <button
              onClick={() => setShowUpcSummary(true)}
              disabled={!canSave || !pocPodComplete || submitting}
              title={!pocPodComplete ? 'Fill POC & POD details first' : undefined}
              className="flex-1 bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
              PROCEED
            </button>
          </div>
        ) : !confirming ? (
          <button onClick={() => setConfirming(true)} disabled={!canSave || submitting}
            className="w-full bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            {isEdit ? '✓ Update Booking' : isSchedOpportunity ? '✓ Confirm Booking (Driver Pre-assigned)' : '✓ Publish Booking on Loadboard'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {isEdit ? 'Update' : 'Save'} booking for <strong>{clientName}</strong>{hubName && <> · <strong>{hubName}</strong></>}{startDate && <> on <strong>{fmtDate(startDate)}</strong></>}{vehicleType && <> — <strong>{vehicleType}</strong></>}?
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirming(false)} className="px-4 text-sm text-slate-400 hover:text-slate-700 py-2 rounded-xl">Cancel</button>
              <button onClick={() => onSave(buildPayload())} disabled={submitting}
                className="flex-1 bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                {submitting ? 'Saving…' : isEdit ? '✓ Yes, Update' : '✓ Yes, Save Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function CreateBookings() {
  const [drafts,        setDrafts]        = useState<Draft[]>([]);
  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [view,          setView]          = useState<View>('list');
  const [selectedSA,    setSelectedSA]    = useState<string | null>(null);
  const [editBooking,   setEditBooking]   = useState<Booking | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [publishing,    setPublishing]    = useState<string | null>(null);
  const [search,        setSearch]        = useState('');
  const [activeTab,     setActiveTab]     = useState<'bookings' | 'opportunities'>('bookings');
  const [selPricingCat, setSelPricingCat] = useState<PricingCategory | null>(null);
  const [selLocation,   setSelLocation]   = useState<TripLocation | null>(null);

  useEffect(() => {
    fetch('/api/drafts').then(r => r.json())
      .then(d => { setDrafts(d); setLoadingDrafts(false); })
      .catch(() => setLoadingDrafts(false));
  }, []);

  async function fetchBookings() {
    const r = await fetch('/api/bookings');
    setBookings(await r.json());
  }
  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (typeDropRef.current && !typeDropRef.current.contains(e.target as Node)) setTypeDropOpen(false);
      if (cityDropRef.current && !cityDropRef.current.contains(e.target as Node)) setCityDropOpen(false);
      if (subAreaDropRef.current && !subAreaDropRef.current.contains(e.target as Node)) setSubAreaDropOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subAreaMap = useMemo(() => {
    const map: Record<string, SubAreaInfo> = {};
    drafts.filter(d => d.opmStatus?.toLowerCase() === 'approved').forEach(draft => {
      getHubs(draft).forEach(hub => {
        if (!hub.subArea) return;
        if (!map[hub.subArea]) map[hub.subArea] = { subArea: hub.subArea, area: hub.area, clientHubs: [] };
        map[hub.subArea].clientHubs.push({ draft, hub });
      });
    });
    return map;
  }, [drafts]);

  const subAreas = Object.values(subAreaMap);
  const filteredSAs = search
    ? subAreas.filter(sa => sa.subArea.toLowerCase().includes(search.toLowerCase()) || sa.area.toLowerCase().includes(search.toLowerCase()))
    : subAreas;

  const selectedInfo = selectedSA ? subAreaMap[selectedSA] : null;
  const saBookings   = bookings.filter(b => b.subArea === selectedSA);

  /* publish popup: id of booking whose calendar is open */
  const [publishPopup,    setPublishPopup]    = useState<string | null>(null);
  const [publishStartDate, setPublishStartDate] = useState('');
  const [publishEndDate,   setPublishEndDate]   = useState('');
  const [expanded,         setExpanded]         = useState<string | null>(null);
  const [detailBooking,    setDetailBooking]    = useState<Booking | null>(null);
  const [disabledBookings, setDisabledBookings] = useState<Set<string>>(new Set());

  /* existing bookings tab filters */
  const [existingSearch,    setExistingSearch]    = useState('');
  const [existingDateFrom,  setExistingDateFrom]  = useState('');
  const [existingDateTo,    setExistingDateTo]    = useState('');
  const [existingTypes,     setExistingTypes]     = useState<string[]>([]);
  const [existingCities,    setExistingCities]    = useState<string[]>([]);
  const [existingSubAreas_, setExistingSubAreas_] = useState<string[]>([]);
  const [typeDropOpen,      setTypeDropOpen]      = useState(false);
  const [cityDropOpen,      setCityDropOpen]      = useState(false);
  const [subAreaDropOpen,   setSubAreaDropOpen]   = useState(false);
  const typeDropRef    = useRef<HTMLDivElement>(null);
  const cityDropRef    = useRef<HTMLDivElement>(null);
  const subAreaDropRef = useRef<HTMLDivElement>(null);

  /* booking status helpers */
  const isBookingComplete = (b: Booking) =>
    isODBooking(b)
      ? !!(b.clientName && b.hubName && b.startDate)
      : !!(b.clientName && b.hubName && b.startDate && (b.vehicleType || b.vehicleId) && (b.driverName || b.driverContact));
  type BookingStatus = 'published' | 'confirmed' | 'incomplete';
  const bookingStatusOf = (b: Booking): BookingStatus =>
    b.status === 'published' ? 'published' : isBookingComplete(b) ? 'confirmed' : 'incomplete';

  async function handleSaveBooking(payload: Partial<Booking>) {
    setSubmitting(true);
    try {
      if (editBooking) {
        await fetch(`/api/bookings/${editBooking.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, status: 'confirmed' }) });
      } else {
        await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, status: 'confirmed' }) });
      }
      await fetchBookings();
      setView(editBooking ? 'viewSubAreas' : 'list'); setEditBooking(null);
    } finally { setSubmitting(false); }
  }

  function openPublishPopup(b: Booking) {
    setPublishPopup(b.id);
    setPublishStartDate(b.startDate || '');
    setPublishEndDate('');
  }

  async function handlePublish(id: string) {
    setPublishing(id);
    await fetch(`/api/bookings/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published', publishDate: publishStartDate, publishEndDate }),
    });
    await fetchBookings();
    setPublishing(null);
    setPublishPopup(null);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    await fetchBookings();
  }

  /* ── Main tabbed landing ── */
  if (view === 'list' || view === 'viewSubAreas') {
    const mainTab = view === 'list' ? 'create' : 'existing';
    const bothSelected = selPricingCat !== null && selLocation !== null;

    const typeLabel = selPricingCat && selLocation
      ? `${selPricingCat === 'od' ? 'OD' : 'Sch'}-${selLocation === 'local' ? 'Local' : 'UPC'}`
      : null;
    const typeColors: Record<string, string> = {
      'OD-Local':  'bg-orange-100 text-orange-700 border-orange-200',
      'OD-UPC':    'bg-red-100 text-red-700 border-red-200',
      'Sch-Local': 'bg-blue-100 text-blue-700 border-blue-200',
      'Sch-UPC':   'bg-purple-100 text-purple-700 border-purple-200',
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Page header + tabs */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-4">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {([
              { key: 'create',   label: '+ Create New Booking' },
              { key: 'existing', label: '📋 View Existing Bookings' },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => { if (key === 'create') { setSelPricingCat(null); setSelLocation(null); } setView(key === 'create' ? 'list' : 'viewSubAreas'); }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mainTab === key
                    ? 'bg-white text-brand-navy shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── CREATE TAB ── */}
          {mainTab === 'create' && (
            <div className="flex flex-col h-full">
              {/* Inline dual selector */}
              <div className="bg-white border-b border-slate-100 px-6 py-3 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Booking Type</span>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0">
                    {(['od', 'scheduled'] as const).map(v => (
                      <button key={v} type="button" onClick={() => setSelPricingCat(v)}
                        className={`px-4 py-2 text-xs font-semibold transition-colors ${selPricingCat === v ? 'bg-brand-navy text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                        {v === 'od' ? 'OD' : 'Scheduled'}
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-200 text-sm shrink-0">·</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Location</span>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden shrink-0">
                    {(['local', 'upc'] as const).map(v => (
                      <button key={v} type="button" onClick={() => setSelLocation(v)}
                        className={`px-4 py-2 text-xs font-semibold transition-colors ${selLocation === v ? 'bg-brand-navy text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                        {v === 'local' ? 'Local' : 'Upcountry'}
                      </button>
                    ))}
                  </div>
                  {typeLabel && (
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${typeColors[typeLabel]}`}>{typeLabel}</span>
                  )}
                  {!bothSelected && (
                    <span className="text-[10px] text-slate-400 italic">Select both to load template</span>
                  )}
                </div>
              </div>

              {/* Template loads inline */}
              {bothSelected ? (
                <div className="flex-1 overflow-hidden">
                  <BookingForm
                    key={`${selPricingCat}-${selLocation}`}
                    allSubAreas={subAreas}
                    initialPricingCat={selPricingCat ?? undefined}
                    initialLocation={selLocation ?? undefined}
                    onBack={() => { setSelPricingCat(null); setSelLocation(null); }}
                    onSave={async (payload) => {
                      setSubmitting(true);
                      try {
                        await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, status: 'confirmed' }) });
                        await fetchBookings();
                        setSelPricingCat(null); setSelLocation(null);
                      } finally { setSubmitting(false); }
                    }}
                    submitting={submitting}
                    hideHeader
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="text-4xl">📋</div>
                  <p className="text-sm font-semibold text-slate-500">Select booking type and location above</p>
                  <p className="text-xs text-slate-400">The booking template will load here</p>
                </div>
              )}
            </div>
          )}

          {/* ── EXISTING BOOKINGS TAB ── */}
          {mainTab === 'existing' && (() => {
            /* only published bookings surface here */
            const published = bookings.filter(b => b.status === 'published');

            /* reference date: end of selected date range, else today */
            const todayStr  = new Date().toISOString().split('T')[0];
            const refDate   = existingDateTo || todayStr;
            const refDateNext = (() => {
              const d = new Date(refDate + 'T00:00:00');
              d.setDate(d.getDate() + 1);
              return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            })();

            /* KPI cards — independent of date filter, based on refDate */
            const schedActive = published.filter(b => {
              if (isODBooking(b) || !b.publishDate) return false;
              return b.publishDate <= refDate && (!b.publishEndDate || b.publishEndDate >= refDate);
            });
            const autoPublishNext = published.filter(b => {
              if (isODBooking(b) || !b.publishDate) return false;
              return b.publishDate <= refDateNext && (!b.publishEndDate || b.publishEndDate >= refDateNext);
            });

            /* city/subArea lists derived from sub areas user has access to */
            const allCities   = [...new Set(subAreas.map(s => s.area))].sort();
            const allSAList   = existingCities.length
              ? subAreas.filter(s => existingCities.includes(s.area))
              : subAreas;

            /* filtered table rows — overlap logic for Sch, point-in-time for OD */
            const q = existingSearch.toLowerCase();
            const filtered = published
              .filter(b => {
                const matchQ  = !q || (b.clientName||'').toLowerCase().includes(q) || (b.subArea||'').toLowerCase().includes(q) || b.id.includes(q);
                const matchT  = existingTypes.length === 0 || existingTypes.includes(bookingClassOf(b));
                const matchC  = !existingCities.length    || existingCities.includes(b.area);
                const matchSA = !existingSubAreas_.length || existingSubAreas_.includes(b.subArea);
                const isOD = isODBooking(b);
                const matchFrom = !existingDateFrom || (isOD
                  ? (b.publishDate || '') >= existingDateFrom
                  : (b.publishEndDate || '9999-12-31') >= existingDateFrom);
                const matchTo   = !existingDateTo   || (b.publishDate || '') <= existingDateTo;
                return matchQ && matchT && matchC && matchSA && matchFrom && matchTo;
              })
              .slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            const hasFilter = existingSearch || existingDateFrom || existingDateTo || existingTypes.length > 0 || existingCities.length > 0 || existingSubAreas_.length > 0;

            return (
              <div className="flex flex-col h-full">
                {/* Filter bar */}
                <div className="px-6 pt-4 pb-3 shrink-0 flex items-center gap-3 border-b border-slate-100">
                  {/* Search */}
                  <div className="relative shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">⌕</span>
                    <input type="text" value={existingSearch} onChange={e => setExistingSearch(e.target.value)}
                      placeholder="Search client, sub area, ID…"
                      className="pl-7 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition w-56" />
                  </div>

                  {/* Date range */}
                  <div className="flex items-center shrink-0 border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <DateFilterInput value={existingDateFrom} onChange={setExistingDateFrom}
                      placeholder="Start date" max={existingDateTo || undefined} />
                    <span className="text-slate-300 text-xs px-1 shrink-0">→</span>
                    <DateFilterInput value={existingDateTo} onChange={setExistingDateTo}
                      placeholder="End date" min={existingDateFrom || undefined} />
                    {(existingDateFrom || existingDateTo) && (
                      <button onClick={() => { setExistingDateFrom(''); setExistingDateTo(''); }}
                        className="text-slate-400 hover:text-slate-600 text-xs px-2 border-l border-slate-100 py-2 transition-colors">✕</button>
                    )}
                  </div>

                  {/* Booking Type multi-select */}
                  <div className="relative shrink-0" ref={typeDropRef}>
                    <button onClick={() => { setTypeDropOpen(o => !o); setCityDropOpen(false); setSubAreaDropOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 text-[11px] font-semibold border rounded-lg transition-colors ${existingTypes.length ? 'border-brand-navy bg-brand-navy/5 text-brand-navy' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                      Booking Type {existingTypes.length > 0 && <span className="bg-brand-navy text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{existingTypes.length}</span>}
                      <span className="text-slate-300 text-[10px]">{typeDropOpen ? '▲' : '▼'}</span>
                    </button>
                    {typeDropOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[160px] py-1">
                        {(['OD-Local', 'OD-UPC', 'Sch-Local', 'Sch-UPC'] as const).map(t => (
                          <label key={t} className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={existingTypes.includes(t)}
                              onChange={() => setExistingTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                              className="accent-brand-navy w-3.5 h-3.5" />
                            <span className="text-xs text-slate-700">{t}</span>
                          </label>
                        ))}
                        {existingTypes.length > 0 && (
                          <div className="border-t border-slate-100 mt-1 pt-1 px-4 pb-1">
                            <button onClick={() => setExistingTypes([])} className="text-[10px] text-slate-400 hover:text-slate-600 underline">Clear</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* City multi-select */}
                  <div className="relative" ref={cityDropRef}>
                    <button onClick={() => { setCityDropOpen(o => !o); setSubAreaDropOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 text-[11px] font-semibold border rounded-lg transition-colors ${existingCities.length ? 'border-brand-navy bg-brand-navy/5 text-brand-navy' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                      City {existingCities.length > 0 && <span className="bg-brand-navy text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{existingCities.length}</span>}
                      <span className="text-slate-300 text-[10px]">{cityDropOpen ? '▲' : '▼'}</span>
                    </button>
                    {cityDropOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[180px] py-1">
                        {allCities.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-slate-400">No cities found</div>
                        ) : allCities.map(city => (
                          <label key={city} className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={existingCities.includes(city)}
                              onChange={() => {
                                setExistingCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
                                setExistingSubAreas_(prev => prev.filter(sa => {
                                  const saInfo = subAreas.find(s => s.subArea === sa);
                                  return saInfo && saInfo.area !== city;
                                }));
                              }}
                              className="accent-brand-navy w-3.5 h-3.5" />
                            <span className="text-xs text-slate-700">{city}</span>
                          </label>
                        ))}
                        {existingCities.length > 0 && (
                          <div className="border-t border-slate-100 mt-1 pt-1 px-4 pb-1">
                            <button onClick={() => { setExistingCities([]); setExistingSubAreas_([]); }}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline">Clear</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sub Area multi-select */}
                  <div className="relative" ref={subAreaDropRef}>
                    <button onClick={() => { setSubAreaDropOpen(o => !o); setCityDropOpen(false); }}
                      className={`flex items-center gap-2 px-3 py-2 text-[11px] font-semibold border rounded-lg transition-colors ${existingSubAreas_.length ? 'border-brand-navy bg-brand-navy/5 text-brand-navy' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                      Sub Area {existingSubAreas_.length > 0 && <span className="bg-brand-navy text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{existingSubAreas_.length}</span>}
                      <span className="text-slate-300 text-[10px]">{subAreaDropOpen ? '▲' : '▼'}</span>
                    </button>
                    {subAreaDropOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[200px] max-h-56 overflow-y-auto py-1">
                        {allSAList.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-slate-400">No sub areas found</div>
                        ) : allSAList.map(sa => (
                          <label key={sa.subArea} className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={existingSubAreas_.includes(sa.subArea)}
                              onChange={() => setExistingSubAreas_(prev => prev.includes(sa.subArea) ? prev.filter(s => s !== sa.subArea) : [...prev, sa.subArea])}
                              className="accent-brand-navy w-3.5 h-3.5" />
                            <div>
                              <div className="text-xs text-slate-700">{sa.subArea}</div>
                              <div className="text-[10px] text-slate-400">{sa.area}</div>
                            </div>
                          </label>
                        ))}
                        {existingSubAreas_.length > 0 && (
                          <div className="border-t border-slate-100 mt-1 pt-1 px-4 pb-1">
                            <button onClick={() => setExistingSubAreas_([])}
                              className="text-[10px] text-slate-400 hover:text-slate-600 underline">Clear</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button onClick={() => { setExistingSearch(''); setExistingDateFrom(''); setExistingDateTo(''); setExistingTypes([]); setExistingCities([]); setExistingSubAreas_([]); }}
                    className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors shrink-0 ${hasFilter ? 'border-brand-navy/30 text-brand-navy hover:bg-brand-navy/5' : 'border-slate-200 text-slate-400 hover:text-slate-500'}`}>
                    Reset filters
                  </button>
                </div>

                {/* KPI cards */}
                <div className="px-6 pt-3 pb-3 shrink-0 grid grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Published Bookings</div>
                    <div className="text-3xl font-bold text-slate-800">{filtered.length}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{existingDateFrom && existingDateTo ? `${fmtDate(existingDateFrom)} – ${fmtDate(existingDateTo)}` : existingDateFrom ? `From ${fmtDate(existingDateFrom)}` : existingDateTo ? `Until ${fmtDate(existingDateTo)}` : `As of ${fmtDate(todayStr)}`}</div>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-xl px-5 py-3.5">
                    <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1">Scheduled Daily (Active)</div>
                    <div className="text-3xl font-bold text-blue-700">{schedActive.length}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Active on {fmtDate(refDate)}</div>
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl px-5 py-3.5">
                    <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-1">Auto-Publish Tomorrow</div>
                    <div className="text-3xl font-bold text-amber-600">{autoPublishNext.length}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Scheduled trips on {fmtDate(refDateNext)}</div>
                  </div>
                </div>

                {/* Status Legend */}
                <details className="mx-4 mt-3 mb-1 border border-slate-200 rounded-xl bg-white text-[11px]">
                  <summary className="px-4 py-2.5 cursor-pointer font-semibold text-slate-500 select-none list-none flex items-center gap-2">
                    <span className="text-slate-400">⊕</span> Status Legend
                  </summary>
                  <div className="px-4 pb-3 pt-1 border-t border-slate-100 grid grid-cols-2 gap-x-8 gap-y-2.5">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">OD Bookings</div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-[10px] shrink-0">✓ Published</span><span className="text-slate-500">Posted on loadboard, waiting for bids / applications</span></div>
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px] shrink-0">Pending Bids</span><span className="text-slate-500">Bids received (UPC) — review & approve a partner</span></div>
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px] shrink-0">Pending Applications</span><span className="text-slate-500">Applications received (Local) — review & approve a driver</span></div>
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-[10px] shrink-0">✓ Trip Created</span><span className="text-slate-500">Partner approved, trip is confirmed & active</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Scheduled Bookings (Local & UPC)</div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold text-[10px] shrink-0">✓ Published</span><span className="text-slate-500">Contract live on loadboard, waiting for bids</span></div>
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold text-[10px] shrink-0">Pending Bids</span><span className="text-slate-500">Bids received — approve to assign driver</span></div>
                        <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold text-[10px] shrink-0">✓ Trip Created</span><span className="text-slate-500">Driver assigned, auto-publishes daily per schedule</span></div>
                        <div className="flex items-start gap-1.5 flex-wrap mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold text-[10px]">Auto Tomorrow</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">Rest Day Tomorrow</span>
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold text-[10px]">Last Day Today</span>
                        </div>
                        <div className="text-slate-400 text-[10px] pl-0.5">Sub-badges on Trip Created rows only — show tomorrow's run status</div>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                      <div className="text-4xl">📋</div>
                      <p className="text-sm">{hasFilter ? 'No bookings match your filters.' : 'No published bookings yet.'}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                          <tr>
                            {['Booking ID', 'Sub Area · City', 'Type', 'Date Range', 'Vehicle & Driver', 'Status', 'Actions'].map((h, i) => (
                              <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map(b => {
                            const cls = bookingClassOf(b);
                            const isSched = !isODBooking(b);
                            const isTomorrow = autoPublishNext.some(t => t.id === b.id);
                            const tomorrowDayName = new Date(refDateNext + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
                            const isRestDayTomorrow = isSched && Array.isArray(b.nonWorkingDays) && b.nonWorkingDays.includes(tomorrowDayName);
                            return (
                              <React.Fragment key={b.id}>
                                {(() => {
                                  const isDisabled = disabledBookings.has(b.id);
                                  return (
                                    <tr onClick={() => setDetailBooking(b)}
                                        className={`cursor-pointer transition-colors hover:bg-slate-50/60 ${isDisabled ? 'opacity-50' : ''}`}>
                                      <td className="px-4 py-3">
                                        <div className={`text-sm font-mono font-semibold ${isDisabled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{b.id}</div>
                                        <div className="text-[10px] text-slate-400">{b.clientName || '—'}</div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-sm text-slate-700">{b.subArea || '—'}</div>
                                        <div className="text-[10px] text-slate-400">{b.area || ''}</div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CLS_BADGE[cls]}`}>{cls}</span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        {isSched && b.publishDate ? (() => {
                                          const moreThanOneMonth = b.publishEndDate && (() => {
                                            const start = new Date(b.publishDate + 'T00:00:00');
                                            const end   = new Date(b.publishEndDate + 'T00:00:00');
                                            const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                                            return diffDays > 31;
                                          })();
                                          return (
                                            <div className="text-xs text-slate-600">
                                              <span>{fmtDate(b.publishDate)}</span>
                                              {moreThanOneMonth
                                                ? <span className="text-slate-400"> → ongoing</span>
                                                : b.publishEndDate
                                                  ? <><span className="text-slate-400"> → {fmtDate(b.publishEndDate)}</span><div className="text-[10px] text-red-500 font-medium mt-0.5">Contract ending soon!</div></>
                                                  : <span className="text-slate-400"> → ongoing</span>}
                                            </div>
                                          );
                                        })() : b.publishDate ? (
                                          <div className="text-xs text-slate-600">{fmtDate(b.publishDate)}</div>
                                        ) : (
                                          <span className="text-slate-400 text-xs">—</span>
                                        )}
                                        {b.bookingTime && <div className="text-[10px] text-slate-400">{b.bookingTime}</div>}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        {isODBooking(b) ? (() => {
                                          const odS = b.odStatus || 'open';
                                          const isUPC = cls === 'OD-UPC';
                                          const term = isUPC ? 'Bids' : 'Applications';
                                          if (odS === 'open') return <span className="text-slate-400 text-xs italic">{isUPC ? 'Waiting for Bids' : 'Waiting for Applications'}</span>;
                                          if (odS === 'applications') return (
                                            <div className="flex flex-col gap-1 items-start">
                                              <span className="text-[10px] font-semibold text-amber-600">{term} ({b.applications?.length ?? 0})</span>
                                              <button onClick={e => { e.stopPropagation(); setDetailBooking(b); }}
                                                className="text-[10px] font-semibold text-brand-navy underline underline-offset-2 hover:text-brand-navy/70 transition-colors">
                                                View & Approve
                                              </button>
                                            </div>
                                          );
                                          return (
                                            <>
                                              <div className="text-xs font-mono text-slate-600">{b.vehicleId || '—'}</div>
                                              <div className="text-[10px] text-slate-600">{b.driverName || '—'}</div>
                                              <div className="text-[10px] text-slate-400">{b.driverContact || ''}</div>
                                            </>
                                          );
                                        })() : (
                                          b.driverName || b.vehicleId ? (
                                            <>
                                              <div className="text-xs font-mono text-slate-600">{b.vehicleId || '—'}</div>
                                              <div className="text-[10px] text-slate-600">{b.driverName || '—'}</div>
                                              <div className="text-[10px] text-slate-400">{b.driverContact || ''}</div>
                                            </>
                                          ) : b.schStatus === 'bids' ? (
                                            <div className="flex flex-col gap-1 items-start">
                                              <span className="text-[10px] font-semibold text-amber-600">Bids ({b.applications?.length ?? 0})</span>
                                              <button onClick={e => { e.stopPropagation(); setDetailBooking(b); }}
                                                className="text-[10px] font-semibold text-brand-navy underline underline-offset-2 hover:text-brand-navy/70 transition-colors">
                                                View & Approve
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 text-xs italic">Waiting for Bids</span>
                                          )
                                        )}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap" >
                                        {isDisabled ? (
                                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Disabled</span>
                                        ) : isSched ? (
                                          <div className="flex flex-col gap-1">
                                            {(b.driverName || b.vehicleId)
                                              ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 w-fit">✓ Trip Created</span>
                                              : b.schStatus === 'bids'
                                                ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 w-fit">Pending Bids</span>
                                                : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 w-fit">✓ Published</span>
                                            }
                                            {(b.driverName || b.vehicleId) && (b.publishEndDate === refDate
                                              ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 w-fit">Last Day Today</span>
                                              : isRestDayTomorrow
                                                ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 w-fit">Rest Day Tomorrow</span>
                                                : isTomorrow && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 w-fit">Auto Tomorrow</span>
                                            )}
                                          </div>
                                        ) : (() => {
                                          const odS = b.odStatus || 'open';
                                          const isUPC = cls === 'OD-UPC';
                                          if (odS === 'open') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Published</span>;
                                          if (odS === 'confirmed') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ Trip Created</span>;
                                          return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{isUPC ? 'Pending Bids' : 'Pending Applications'}</span>;
                                        })()}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                        {(isODBooking(b) && b.odStatus === 'confirmed') || (isSched && !!(b.driverName || b.vehicleId)) ? (
                                          <button className="text-[11px] font-semibold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                            Check Trip Status
                                          </button>
                                        ) : (
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => { setEditBooking(b); setView('editBooking'); setExpanded(null); }}
                                            className="text-[11px] font-semibold text-brand-navy border border-brand-navy/30 px-3 py-1.5 rounded-lg hover:bg-brand-navy/5 transition-colors">
                                            Edit
                                          </button>
                                          <button onClick={() => setDisabledBookings(prev => {
                                            const next = new Set(prev);
                                            if (next.has(b.id)) next.delete(b.id); else next.add(b.id);
                                            return next;
                                          })}
                                            className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isDisabled ? 'border-green-300 text-green-600 hover:bg-green-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                            {isDisabled ? 'Enable' : 'Disable'}
                                          </button>
                                        </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })()}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Detail drawer */}
                {detailBooking && (
                  <BookingDetailDrawer
                    booking={detailBooking}
                    onClose={() => setDetailBooking(null)}
                    tomorrowStr={refDateNext}
                  />
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  /* ── Sub area booking list ── */
  if (view === "viewSubArea" && selectedInfo) {
    const isOD = (b: Booking) => b.clientPricingLabel?.startsWith('OD ·') ?? false;
    const bookingClass = (b: Booking): 'OD-Local' | 'OD-UPC' | 'Sch-Local' | 'Sch-UPC' => {
      const p = isOD(b) ? 'OD' : 'Sch';
      const t = b.bookingType === 'upcountry' ? 'UPC' : 'Local';
      return `${p}-${t}` as 'OD-Local' | 'OD-UPC' | 'Sch-Local' | 'Sch-UPC';
    };
    const classBadgeColors: Record<string, string> = {
      'OD-Local':  'bg-orange-100 text-orange-700',
      'OD-UPC':    'bg-red-100 text-red-700',
      'Sch-Local': 'bg-blue-100 text-blue-700',
      'Sch-UPC':   'bg-purple-100 text-purple-700',
    };
    const isComplete = (b: Booking) =>
      isOD(b)
        ? !!(b.clientName && b.hubName && b.startDate)
        : !!(b.clientName && b.hubName && b.startDate && (b.vehicleType || b.vehicleId) && (b.driverName || b.driverContact));

    const sorted = saBookings
      .filter(b => b.status !== 'published')
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex items-center gap-3">
          <button onClick={() => { setView("viewSubAreas"); setSelectedSA(null); }}
            className="text-slate-400 hover:text-brand-navy text-sm transition-colors flex items-center gap-1.5">
            ← Create Bookings
          </button>
          <span className="text-slate-200">|</span>
          <span className="text-sm font-semibold text-brand-navy">{selectedInfo.subArea}</span>
          <span className="text-xs text-slate-400">{selectedInfo.area}</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => {/* Show Published Bookings — coming soon */}}
              className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors bg-white">
              Show Published Bookings
            </button>
            <button onClick={() => { setEditBooking(null); setView("createBooking"); }}
              className="flex items-center gap-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm">
              + Add New Booking
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No bookings yet</p>
              <p className="text-xs text-slate-400 mb-4">Add a booking for {selectedInfo.subArea}.</p>
              <button onClick={() => { setEditBooking(null); setView("createBooking"); }}
                className="bg-brand-navy text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-brand-navy/90 transition-colors">
                + Add New Booking
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  {["Client Name", "Pickup Time", "Booking Type", "Vehicle Number", "Driver Name", "Driver Number", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map(b => {
                  const complete = isComplete(b);
                  const isPublished = b.status === "published";
                  const publishOpen = publishPopup === b.id;
                  return (
                    <React.Fragment key={b.id}>
                      <tr
                        onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                        className={`cursor-pointer transition-colors ${expanded === b.id ? 'bg-brand-navy/5' : 'hover:bg-slate-50/60'}`}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-800">{b.clientName || "—"}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">{b.id}</span>
                            {!complete && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                                ⚠ Incomplete
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{b.bookingTime || "12:00 AM"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => { const cls = bookingClass(b); return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${classBadgeColors[cls]}`}>{cls}</span>; })()}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 whitespace-nowrap">{isOD(b) ? '—' : (b.vehicleId || "—")}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{isOD(b) ? '—' : (b.driverName || "—")}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{isOD(b) ? '—' : (b.driverContact || "—")}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {isPublished ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-100 text-green-700">
                                ✓ Published{b.publishDate ? ' · ' + fmtDate(b.publishDate) : ''}
                              </span>
                            ) : (
                              <button
                                onClick={() => publishOpen ? setPublishPopup(null) : openPublishPopup(b)}
                                disabled={!complete}
                                title={!complete ? 'Complete all booking details before publishing' : ''}
                                className={complete ? 'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap bg-brand-navy hover:bg-brand-navy/90 text-white' : 'text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap bg-slate-100 text-slate-400 cursor-not-allowed'}>
                                {publishing === b.id ? '…' : publishOpen ? '✕ Cancel' : 'Publish'}
                              </button>
                            )}
                            <span className="text-slate-300 text-xs">{expanded === b.id ? '▲' : '▼'}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Publish date picker row */}
                      {publishOpen && !isPublished && (
                        <tr className="bg-brand-navy/5 border-b border-brand-navy/10">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-semibold text-brand-navy whitespace-nowrap">
                                {isOD(b) ? 'Publish to collect Applications/Bids:' : 'Select date range to publish:'}
                              </span>
                              <div className="flex items-center gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">Start Date</label>
                                  <input type="date" value={publishStartDate}
                                    onChange={e => setPublishStartDate(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition" />
                                </div>
                                <span className="text-slate-300 mt-4">→</span>
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">End Date <span className="text-slate-300">(optional)</span></label>
                                  <input type="date" value={publishEndDate}
                                    min={publishStartDate}
                                    onChange={e => setPublishEndDate(e.target.value)}
                                    className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition" />
                                </div>
                              </div>
                              <button
                                onClick={() => handlePublish(b.id)}
                                disabled={!publishStartDate || publishing === b.id}
                                className="mt-3 self-end text-xs font-bold bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                {publishing === b.id ? "Publishing…" : isOD(b) ? "✓ Publish to collect Applications/Bids" : "✓ Confirm Trip Creation"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expanded details row */}
                      {expanded === b.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="grid grid-cols-4 gap-x-8 gap-y-2 text-xs">
                              {b.hubName      && <><span className="text-slate-400">Hub:</span><span className="font-medium text-slate-700">{b.hubName}</span></>}
                              {b.vehicleType  && <><span className="text-slate-400">Vehicle Type:</span><span className="font-medium text-slate-700">{b.vehicleType}</span></>}
                              {b.startDate    && <><span className="text-slate-400">Start Date:</span><span className="font-medium text-slate-700">{fmtDate(b.startDate)}</span></>}
                              {b.materials    && <><span className="text-slate-400">Materials:</span><span className="font-medium text-slate-700">{b.materials}</span></>}
                              {b.helpers      && <><span className="text-slate-400">Helpers:</span><span className="font-medium text-slate-700">{b.helpers}</span></>}
                              {b.estimatedCost && <><span className="text-slate-400">Est. Cost:</span><span className="font-medium text-slate-700">₹{b.estimatedCost}</span></>}
                              {b.estimatedRevenue && <><span className="text-slate-400">Revenue:</span><span className="font-medium text-green-700">₹{b.estimatedRevenue}</span></>}
                              {b.margin       && <><span className="text-slate-400">Margin:</span><span className={parseFloat(b.margin) >= 0 ? 'font-medium text-green-700' : 'font-medium text-red-600'}>{b.margin}%</span></>}
                            </div>
                            {!isPublished && (
                              <div className="flex gap-2 mt-3">
                                <button onClick={e => { e.stopPropagation(); setEditBooking(b); setView('editBooking'); setExpanded(null); }}
                                  className="text-[10px] font-semibold text-brand-navy border border-brand-navy/30 px-3 py-1 rounded-lg hover:bg-brand-navy/5 transition-colors">Edit</button>
                                <button onClick={e => { e.stopPropagation(); handleDelete(b.id); }}
                                  className="text-[10px] font-semibold text-red-500 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  /* ── Booking form ── */
  if (view === 'editBooking') return (
    <BookingForm
      subAreaInfo={selectedInfo ?? undefined}
      allSubAreas={subAreas}
      onBack={() => { setView('viewSubAreas'); setEditBooking(null); }}
      onSave={handleSaveBooking}
      submitting={submitting}
      initial={editBooking ?? undefined}
    />
  );
  if (view === 'createBooking') return (
    <BookingForm
      allSubAreas={subAreas}
      onBack={() => { setView('list'); setEditBooking(null); }}
      onSave={handleSaveBooking}
      submitting={submitting}
      initialPricingCat={selPricingCat ?? undefined}
      initialLocation={selLocation ?? undefined}
    />
  );

  return null;
}
