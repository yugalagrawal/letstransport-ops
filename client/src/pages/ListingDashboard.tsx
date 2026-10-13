import { useState, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type ListingStatus = 'Published' | 'Draft' | 'Closed' | 'Cancelled';
type ServiceType = 'Upcountry Contracted' | 'Upcountry Spot' | 'Local Contracted' | 'Local Spot';
type ClientVertical = 'cello' | 'nykaa' | 'amazon' | 'flipkart' | 'zomato';

interface Listing {
  id: string;
  status: ListingStatus;
  hasBid: boolean;
  service: ServiceType;
  lane: string;
  vehicleType: string;
  cost: number;
  lowestBid: number | null;
  clientVertical: ClientVertical;
  confirmationDateTime: string;
  createdBy: string;
  confirmedCount: string;
  revenue: number;
  totalBids: number;
  originState: string;
  reportingDate: string; // ISO date string
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_LISTINGS: Listing[] = [
  {
    id: '6a22a20d45dfd6d9fdbdcd85',
    status: 'Published',
    hasBid: true,
    service: 'Upcountry Contracted',
    lane: 'Bengaluru - Davangere',
    vehicleType: 'Open /10 ft /3 ton',
    cost: 4928,
    lowestBid: null,
    clientVertical: 'cello',
    confirmationDateTime: '2026-06-05T10:30:00',
    createdBy: 'yugal_agarwal@letstransport.team',
    confirmedCount: '0/1',
    revenue: 5475,
    totalBids: 0,
    originState: 'Karnataka',
    reportingDate: '2026-06-05',
  },
  {
    id: 'b8f1c3d72e4a519067890abc',
    status: 'Published',
    hasBid: false,
    service: 'Local Contracted',
    lane: 'Bengaluru - Mysuru',
    vehicleType: 'Closed /14 ft /5 ton',
    cost: 3200,
    lowestBid: 3100,
    clientVertical: 'nykaa',
    confirmationDateTime: '2026-06-05T14:00:00',
    createdBy: 'priya_sharma@letstransport.team',
    confirmedCount: '1/2',
    revenue: 3800,
    totalBids: 3,
    originState: 'Karnataka',
    reportingDate: '2026-06-05',
  },
  {
    id: 'c9a4d5e81f6b723178901def',
    status: 'Closed',
    hasBid: true,
    service: 'Upcountry Spot',
    lane: 'Mumbai - Pune',
    vehicleType: 'Open /17 ft /7 ton',
    cost: 8500,
    lowestBid: 8200,
    clientVertical: 'amazon',
    confirmationDateTime: '2026-06-04T09:00:00',
    createdBy: 'rahul_ops@letstransport.team',
    confirmedCount: '2/2',
    revenue: 9200,
    totalBids: 5,
    originState: 'Maharashtra',
    reportingDate: '2026-06-04',
  },
  {
    id: 'd1b5e6f92g7c834289012ef0',
    status: 'Draft',
    hasBid: false,
    service: 'Local Spot',
    lane: 'Delhi - Gurgaon',
    vehicleType: '2W',
    cost: 500,
    lowestBid: null,
    clientVertical: 'flipkart',
    confirmationDateTime: '2026-06-06T11:00:00',
    createdBy: 'sanjay_gupta@letstransport.team',
    confirmedCount: '0/3',
    revenue: 650,
    totalBids: 0,
    originState: 'Delhi',
    reportingDate: '2026-06-06',
  },
  {
    id: 'e2c6f7a03h8d945390123fg1',
    status: 'Published',
    hasBid: true,
    service: 'Upcountry Contracted',
    lane: 'Chennai - Coimbatore',
    vehicleType: 'Open /10 ft /3 ton',
    cost: 5600,
    lowestBid: 5400,
    clientVertical: 'zomato',
    confirmationDateTime: '2026-06-05T16:00:00',
    createdBy: 'yugal_agarwal@letstransport.team',
    confirmedCount: '1/1',
    revenue: 6100,
    totalBids: 4,
    originState: 'Tamil Nadu',
    reportingDate: '2026-06-05',
  },
  {
    id: 'f3d7g8b14i9e056401234gh2',
    status: 'Cancelled',
    hasBid: false,
    service: 'Local Contracted',
    lane: 'Hyderabad - Secunderabad',
    vehicleType: 'Tata Ace / 1 ton',
    cost: 1200,
    lowestBid: null,
    clientVertical: 'cello',
    confirmationDateTime: '2026-06-03T08:30:00',
    createdBy: 'priya_sharma@letstransport.team',
    confirmedCount: '0/1',
    revenue: 1500,
    totalBids: 0,
    originState: 'Telangana',
    reportingDate: '2026-06-03',
  },
];

const STATUS_COLORS: Record<ListingStatus, string> = {
  Published: 'bg-blue-100 text-blue-700',
  Draft:     'bg-amber-100 text-amber-700',
  Closed:    'bg-slate-100 text-slate-600',
  Cancelled: 'bg-red-100 text-red-600',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function shortId(id: string) {
  return id.length > 20 ? id.slice(0, 20) + '…' : id;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ListingDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [listingIdFilter, setListingIdFilter]   = useState('');
  const [fromDate, setFromDate]                  = useState(weekAgo);
  const [toDate, setToDate]                      = useState(today);
  const [statusFilter, setStatusFilter]          = useState<string>('');
  const [verticalFilter, setVerticalFilter]      = useState<string>('');
  const [originFilter, setOriginFilter]          = useState<string>('');
  const [createdByFilter, setCreatedByFilter]    = useState<string>('');
  const [serviceFilter, setServiceFilter]        = useState<string>('');

  // Applied filters (only change on APPLY)
  const [applied, setApplied] = useState({
    listingId: '', fromDate: weekAgo, toDate: today,
    status: '', vertical: '', origin: '', createdBy: '', service: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleApply() {
    setApplied({
      listingId: listingIdFilter, fromDate, toDate,
      status: statusFilter, vertical: verticalFilter,
      origin: originFilter, createdBy: createdByFilter, service: serviceFilter,
    });
  }

  function handleReset() {
    setListingIdFilter(''); setFromDate(weekAgo); setToDate(today);
    setStatusFilter(''); setVerticalFilter(''); setOriginFilter('');
    setCreatedByFilter(''); setServiceFilter('');
    setApplied({
      listingId: '', fromDate: weekAgo, toDate: today,
      status: '', vertical: '', origin: '', createdBy: '', service: '',
    });
  }

  function handleCopy(listing: Listing) {
    const text = [
      `Listing ID: ${listing.id}`,
      `Service: ${listing.service}`,
      `Lane: ${listing.lane}`,
      `Vehicle: ${listing.vehicleType}`,
      `Cost: ₹${listing.cost}`,
      `Revenue: ₹${listing.revenue}`,
      `Status: ${listing.status}`,
      `Confirmed: ${listing.confirmedCount}`,
      `Confirmation: ${formatDateTime(listing.confirmationDateTime)}`,
      `Created By: ${listing.createdBy}`,
    ].join('\n');
    copyToClipboard(text);
    setCopiedId(listing.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = useMemo(() => {
    return MOCK_LISTINGS.filter(l => {
      if (applied.listingId && !l.id.toLowerCase().includes(applied.listingId.toLowerCase())) return false;
      if (applied.status && l.status !== applied.status) return false;
      if (applied.vertical && l.clientVertical !== applied.vertical) return false;
      if (applied.origin && l.originState !== applied.origin) return false;
      if (applied.createdBy && !l.createdBy.includes(applied.createdBy)) return false;
      if (applied.service && l.service !== applied.service) return false;
      if (applied.fromDate && l.reportingDate < applied.fromDate) return false;
      if (applied.toDate && l.reportingDate > applied.toDate) return false;
      return true;
    });
  }, [applied]);

  // Unique filter options derived from mock data
  const allStatuses  = Array.from(new Set(MOCK_LISTINGS.map(l => l.status)));
  const allVerticals = Array.from(new Set(MOCK_LISTINGS.map(l => l.clientVertical)));
  const allOrigins   = Array.from(new Set(MOCK_LISTINGS.map(l => l.originState)));
  const allCreators  = Array.from(new Set(MOCK_LISTINGS.map(l => l.createdBy)));
  const allServices  = Array.from(new Set(MOCK_LISTINGS.map(l => l.service)));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-100">
      {/* Topbar */}
      <header className="bg-brand-navy text-white px-6 py-3 flex items-center gap-3 shrink-0">
        <span className="text-lg">📋</span>
        <h1 className="text-base font-semibold tracking-wide">Listing Dashboard</h1>
        <span className="ml-auto text-xs text-slate-400">{filtered.length} listing{filtered.length !== 1 ? 's' : ''}</span>
      </header>

      {/* Filter bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {/* Listing ID */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Listing ID</label>
            <input
              value={listingIdFilter}
              onChange={e => setListingIdFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40"
              placeholder="Search by ID…"
            />
          </div>

          {/* Reporting from date */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Reporting from date</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40"
            />
          </div>

          {/* Reporting to date */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Reporting to date</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40"
            />
          </div>

          {/* Listing Status */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Listing Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40 bg-white appearance-none"
            >
              <option value="">All</option>
              {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          {/* Client Vertical */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Client Vertical</label>
            <select
              value={verticalFilter}
              onChange={e => setVerticalFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40 bg-white appearance-none"
            >
              <option value="">All</option>
              {allVerticals.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Origin State */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Origin State</label>
            <select
              value={originFilter}
              onChange={e => setOriginFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40 bg-white appearance-none"
            >
              <option value="">All</option>
              {allOrigins.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* Created By */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Created By</label>
            <select
              value={createdByFilter}
              onChange={e => setCreatedByFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40 bg-white appearance-none"
            >
              <option value="">All</option>
              {allCreators.map(c => <option key={c} value={c}>{c.split('@')[0]}</option>)}
            </select>
          </div>

          {/* Service Line + action buttons */}
          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              <label className="absolute -top-2 left-2.5 bg-white text-[10px] text-slate-400 px-0.5">Service Line</label>
              <select
                value={serviceFilter}
                onChange={e => setServiceFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-navy/40 bg-white appearance-none"
              >
                <option value="">All</option>
                {allServices.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button
              onClick={handleApply}
              className="bg-brand-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-navy/90 transition-colors shrink-0"
            >
              APPLY
            </button>
            <button
              onClick={handleReset}
              className="border border-slate-300 text-slate-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors shrink-0"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <span className="text-4xl mb-2">📭</span>
            <p className="text-sm">No listings match the applied filters.</p>
          </div>
        )}

        {filtered.map(listing => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onCopy={() => handleCopy(listing)}
            copied={copiedId === listing.id}
          />
        ))}
      </div>
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  onCopy,
  copied,
}: {
  listing: Listing;
  onCopy: () => void;
  copied: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Main row */}
      <div className="px-5 py-4">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3">

          {/* Left: ID + status */}
          <div className="min-w-[180px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-700 font-medium">{shortId(listing.id)}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[listing.status]}`}>
                {listing.status}
              </span>
              {listing.hasBid && (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  B
                </span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {listing.clientVertical}
            </div>
          </div>

          {/* Service + Lane */}
          <div className="min-w-[160px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Service</div>
            <div className="text-sm font-medium text-slate-700">{listing.service}</div>
            <div className="text-xs text-slate-500 mt-0.5">{listing.lane}</div>
          </div>

          {/* Vehicle */}
          <div className="min-w-[130px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Vehicle Type</div>
            <div className="text-sm text-slate-700">{listing.vehicleType}</div>
          </div>

          {/* Cost */}
          <div className="min-w-[80px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Cost</div>
            <div className="text-sm font-semibold text-slate-800">₹{listing.cost.toLocaleString('en-IN')}</div>
          </div>

          {/* Lowest Bid */}
          <div className="min-w-[80px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Lowest Bid</div>
            <div className="text-sm text-slate-700">
              {listing.lowestBid ? `₹${listing.lowestBid.toLocaleString('en-IN')}` : '—'}
            </div>
          </div>

          {/* Confirmed Count */}
          <div className="min-w-[90px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Confirmed</div>
            <div className="text-sm text-slate-700">{listing.confirmedCount}</div>
          </div>

          {/* Revenue */}
          <div className="min-w-[80px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Revenue</div>
            <div className="text-sm font-semibold text-green-700">₹{listing.revenue.toLocaleString('en-IN')}</div>
          </div>

          {/* Total Bids */}
          <div className="min-w-[70px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Total Bids</div>
            <div className="text-sm text-slate-700">{listing.totalBids || '—'}</div>
          </div>

          {/* Confirmation DateTime */}
          <div className="min-w-[130px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Confirmation Date/Time</div>
            <div className="text-sm text-slate-700">{formatDateTime(listing.confirmationDateTime)}</div>
          </div>

          {/* Created By */}
          <div className="min-w-[160px] flex-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Created By</div>
            <div className="text-sm text-slate-700 truncate">{listing.createdBy}</div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 ml-auto shrink-0">
            <button
              onClick={() => setExpanded(e => !e)}
              className="bg-brand-navy text-white text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-brand-navy/90 transition-colors whitespace-nowrap"
            >
              {expanded ? 'HIDE DETAILS' : 'VIEW DETAILS'}
            </button>
            <button
              onClick={onCopy}
              className="border border-brand-navy text-brand-navy text-xs font-semibold px-4 py-1.5 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copied ? '✓ COPIED' : 'COPY DETAILS'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Full Listing ID</div>
            <div className="font-mono text-xs text-slate-700 break-all">{listing.id}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Origin State</div>
            <div className="text-slate-700">{listing.originState}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Client Vertical</div>
            <div className="text-slate-700 capitalize">{listing.clientVertical}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Margin</div>
            <div className="text-slate-700 font-semibold">
              {listing.cost && listing.revenue
                ? `${(((listing.revenue - listing.cost) / listing.revenue) * 100).toFixed(1)}%`
                : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
