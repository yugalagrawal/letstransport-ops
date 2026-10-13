import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, ROLE_LABELS } from '../hooks/useAuth';
import type { Role } from '../hooks/useAuth';
import { STATIC_REGISTRY } from '../data/searchRegistry';
import type { SearchItem, SearchItemKind } from '../data/searchRegistry';

// ── Dynamic items fetched from API ────────────────────────────────────────────

async function fetchDynamicItems(): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  try {
    const [clientsRes, bookingsRes, driversRes] = await Promise.all([
      fetch('/api/clients'),
      fetch('/api/bookings'),
      fetch('/api/drivers'),
    ]);
    const opmRoles: Role[] = ['OPM'];
    const salesRoles: Role[] = ['SALES', 'Sales_admin', 'BizFin_admin', 'OPM', 'ADMIN'];

    if (clientsRes.ok) {
      const { clients } = await clientsRes.json();
      (clients ?? []).forEach((c: any) => {
        items.push({
          id: `client-${c.id}`,
          kind: 'client',
          title: c.legalEntityName ?? c.groupName,
          subtitle: `${c.id} · ${c.vertical} · ${c.city}`,
          path: '/client-approvals',
          roles: salesRoles,
          icon: '🏢',
          badge: 'Client',
        });
      });
    }

    if (bookingsRes.ok) {
      const { bookings } = await bookingsRes.json();
      (bookings ?? []).forEach((b: any) => {
        items.push({
          id: `booking-${b.id}`,
          kind: 'booking',
          title: `${b.id} — ${b.clientName}`,
          subtitle: `${b.vehicleId ?? ''} · ${b.subArea ?? ''} · ${b.bookingTime ?? ''}`,
          path: '/create-bookings',
          roles: opmRoles,
          icon: '🚛',
          badge: 'Booking',
        });
      });
    }

    if (driversRes.ok) {
      const { drivers } = await driversRes.json();
      (drivers ?? []).forEach((d: any) => {
        items.push({
          id: `driver-${d.id}`,
          kind: 'driver',
          title: d.name,
          subtitle: `Driver · ${d.contact}`,
          path: '/create-bookings',
          roles: opmRoles,
          icon: '🧑‍✈️',
          badge: 'Driver',
        });
      });
    }
  } catch {
    // silently ignore — dynamic items are best-effort
  }
  return items;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_ORDER: SearchItemKind[] = ['nav', 'tab', 'action', 'client', 'booking', 'driver'];
const KIND_LABEL: Record<SearchItemKind, string> = {
  nav: 'Pages',
  tab: 'Tabs & Sections',
  action: 'Actions',
  client: 'Clients',
  booking: 'Bookings',
  driver: 'Drivers',
};

const BADGE_COLOR: Record<string, string> = {
  Page:         'bg-slate-100 text-slate-500',
  Tab:          'bg-blue-50 text-blue-600',
  Action:       'bg-orange-50 text-brand-orange',
  Client:       'bg-green-50 text-green-700',
  Booking:      'bg-purple-50 text-purple-700',
  Driver:       'bg-amber-50 text-amber-700',
  'Booking Type': 'bg-slate-100 text-slate-600',
};

function match(item: SearchItem, q: string): boolean {
  const low = q.toLowerCase();
  return (
    item.title.toLowerCase().includes(low) ||
    (item.subtitle ?? '').toLowerCase().includes(low) ||
    (item.badge ?? '').toLowerCase().includes(low) ||
    item.kind.toLowerCase().includes(low)
  );
}

function canAccess(item: SearchItem, role: Role): boolean {
  return item.roles.length === 0 || item.roles.includes(role);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MasterSearch({ open, onClose }: Props) {
  const [query, setQuery]           = useState('');
  const [dynamic, setDynamic]       = useState<SearchItem[]>([]);
  const [activeIdx, setActiveIdx]   = useState(0);
  const [noAccess, setNoAccess]     = useState<SearchItem | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const navigate                    = useNavigate();
  const user                        = getUser();
  const role                        = user?.role;

  // fetch dynamic items once on open
  useEffect(() => {
    if (open && dynamic.length === 0) fetchDynamicItems().then(setDynamic);
  }, [open]);

  // focus input
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 30); }
    else       { setQuery(''); setNoAccess(null); setActiveIdx(0); }
  }, [open]);

  const allItems   = [...STATIC_REGISTRY, ...dynamic];
  const q          = query.trim();
  const filtered   = q.length < 1
    ? allItems.filter(i => i.kind === 'nav')   // default: show all pages
    : allItems.filter(i => match(i, q));

  // group by kind, preserving order
  const grouped = KIND_ORDER.reduce<Record<string, SearchItem[]>>((acc, k) => {
    const g = filtered.filter(i => i.kind === k);
    if (g.length) acc[k] = g;
    return acc;
  }, {});

  // flat list for keyboard nav
  const flat = Object.values(grouped).flat();

  function handleSelect(item: SearchItem) {
    if (!role) return;
    if (!canAccess(item, role)) { setNoAccess(item); return; }
    onClose();
    navigate(item.path);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { if (flat[activeIdx]) handleSelect(flat[activeIdx]); }
    if (e.key === 'Escape')    { if (noAccess) setNoAccess(null); else onClose(); }
  }

  // reset active index on query change
  useEffect(() => setActiveIdx(0), [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(10,18,35,0.55)', backdropFilter: 'blur(2px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
           style={{ maxHeight: '70vh' }}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <span className="text-slate-400 text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, tabs, actions, clients, bookings, drivers…"
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 text-xs">
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* No-access banner */}
        {noAccess && (
          <div className="mx-4 mt-3 mb-1 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span className="text-red-500 text-lg mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Access Restricted</p>
              <p className="text-xs text-red-600 mt-0.5">
                <strong>"{noAccess.title}"</strong> is not available for your current role
                (<strong>{role ? ROLE_LABELS[role] : ''}</strong>).
                Switch roles or contact support if you need access.
              </p>
            </div>
            <button onClick={() => setNoAccess(null)} className="ml-auto text-red-400 hover:text-red-600 text-sm">✕</button>
          </div>
        )}

        {/* Results */}
        <div className="overflow-y-auto flex-1 py-2">
          {flat.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-10">No results for "{q}"</p>
          )}

          {Object.entries(grouped).map(([kind, items]) => (
            <div key={kind}>
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                {KIND_LABEL[kind as SearchItemKind]}
              </p>
              {items.map((item) => {
                const idx       = flat.indexOf(item);
                const isActive  = idx === activeIdx;
                const allowed   = role ? canAccess(item, role) : false;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-slate-50' : 'hover:bg-slate-50'
                    } ${!allowed ? 'opacity-50' : ''}`}
                  >
                    <span className="text-base w-6 text-center shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!allowed && (
                        <span className="text-[10px] text-red-400 font-medium">🔒 No access</span>
                      )}
                      {item.badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BADGE_COLOR[item.badge] ?? 'bg-slate-100 text-slate-500'}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400">
          <span><kbd className="border border-slate-200 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-slate-200 rounded px-1">↵</kbd> select</span>
          <span><kbd className="border border-slate-200 rounded px-1">Esc</kbd> close</span>
          <span className="ml-auto">Role: <strong className="text-slate-500">{role ? ROLE_LABELS[role] : '—'}</strong></span>
        </div>
      </div>
    </div>
  );
}
