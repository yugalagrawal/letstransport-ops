import { useState, useEffect } from 'react';
import AddClientModal, { type Draft } from './AddClientModal';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function statusStyle(s: string) {
  if (s === 'Approved')            return { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  icon: '✓' };
  if (s === 'Correction Required') return { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    icon: '⚠' };
  return                                  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon: '⏳' };
}

/* ─── Detail field ───────────────────────────────────────────────────────── */
function DetailField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</p>
      <p className={`text-xs text-slate-800 font-medium leading-snug break-words ${mono ? 'font-mono' : ''}`}>
        {value ? value : <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/* ─── Draft client table ─────────────────────────────────────────────────── */
function DraftClientList({
  drafts, selected, onSelect,
}: { drafts: Draft[]; selected: Draft | null; onSelect: (d: Draft) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <tr>
          {['Group Name', 'Legal Entity', 'Vertical', 'City', ''].map((h, i) => (
            <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {drafts.map((d) => {
          const isActive = selected?.id === d.id;
          return (
            <tr key={d.id}
              onClick={() => onSelect(d)}
              className={`transition-colors cursor-pointer ${isActive ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
              <td className="px-4 py-3 font-semibold text-brand-navy whitespace-nowrap">
                {d.steps?.group?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                {d.steps?.legalEntity?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                {d.steps?.vertical?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                {d.steps?.city?.city ?? '—'}
              </td>
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => onSelect(d)}
                  className={`text-xs font-medium border px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'text-brand-orange hover:text-brand-orange-dark border-brand-orange/40 hover:border-brand-orange'
                  }`}>
                  {isActive ? '✓ Viewing' : 'View Details'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─── Detail panel ───────────────────────────────────────────────────────── */
function DraftDetailPanel({ draft, allDrafts, onClose }: { draft: Draft; allDrafts: Draft[]; onClose: () => void }) {
  const g = draft.steps?.group;

  // Build hierarchy: group all approved drafts by LE → vertical, each vertical carries its full draft
  const groupName   = g?.name ?? '';
  const groupDrafts = allDrafts.filter(d => (d.steps?.group?.name ?? '') === groupName);

  type VertEntry = {
    draftId: string; name: string; tripMode: string;
    gstin: string; state: string; billingAddress: string;
    city: string; hubName: string; hubAddress: string; contactName: string; contactEmail: string; contactPhone: string;
    financeName: string; financeEmail: string; financePhone: string;
    opsName: string; opsEmail: string; opsPhone: string;
    businessType: string; contractStart: string; contractEnd: string;
    marginPct: string; billingDays: string; creditDays: string; invoiceFreq: string; remarks: string;
    salesAdminStatus: string | null; bizFinStatus: string | null; opmStatus: string | null;
    createdBy: string; updatedAt: string;
  };
  type LEEntry = { name: string; pan: string; orgType: string; address: string; verticals: VertEntry[] };

  const leMap = new Map<string, LEEntry>();
  for (const d of groupDrafts) {
    const leName = d.steps?.legalEntity?.name ?? '—';
    if (!leMap.has(leName)) {
      leMap.set(leName, {
        name:    leName,
        pan:     d.steps?.legalEntity?.pan     ?? '',
        orgType: d.steps?.legalEntity?.orgType ?? '',
        address: d.steps?.legalEntity?.address ?? '',
        verticals: [],
      });
    }
    const le    = leMap.get(leName)!;
    const vName = d.steps?.vertical?.name ?? '—';
    if (!le.verticals.find(vv => vv.name === vName)) {
      const poc = d.steps?.poc as any;
      const city = d.steps?.city as any;
      const com  = d.steps?.commercial as any;
      le.verticals.push({
        draftId:       d.id,
        name:          vName,
        tripMode:      d.steps?.vertical?.tripMode ?? '',
        gstin:         d.steps?.stateGstin?.gstin  ?? '',
        state:         d.steps?.stateGstin?.state  ?? '',
        billingAddress: (d.steps?.stateGstin as any)?.billingAddress ?? '',
        city:          city?.city         ?? '',
        hubName:       city?.hubName      ?? '',
        hubAddress:    city?.hubAddress   ?? '',
        contactName:   city?.contactName  ?? '',
        contactEmail:  city?.contactEmail ?? '',
        contactPhone:  city?.contactPhone ?? '',
        financeName:   poc?.financeName   ?? '',
        financeEmail:  poc?.financeEmail  ?? '',
        financePhone:  poc?.financePhone  ?? '',
        opsName:       poc?.opsName       ?? '',
        opsEmail:      poc?.opsEmail      ?? '',
        opsPhone:      poc?.opsPhone      ?? '',
        businessType:  com?.businessType  ?? '',
        contractStart: com?.contractStartDate ?? '',
        contractEnd:   com?.contractEndDate   ?? '',
        marginPct:     com?.marginPct     ?? '',
        billingDays:   com?.billingDays   ?? '',
        creditDays:    com?.creditDays    ?? '',
        invoiceFreq:   com?.invoiceFrequency ?? '',
        remarks:       com?.remarks       ?? '',
        salesAdminStatus: d.salesAdminStatus ?? null,
        bizFinStatus:     d.bizFinStatus     ?? null,
        opmStatus:        d.opmStatus        ?? null,
        createdBy:  d.createdBy,
        updatedAt:  d.updatedAt ?? d.createdAt,
      });
    }
  }
  const leList         = Array.from(leMap.values());
  const totalVerticals = leList.reduce((s, le) => s + le.verticals.length, 0);
  const totalCities    = new Set(groupDrafts.map(d => d.steps?.city?.city).filter(Boolean)).size;

  const [expandedLEs,   setExpandedLEs]   = useState<Set<string>>(() => new Set(leList.map(le => le.name)));
  const [expandedVerts, setExpandedVerts] = useState<Set<string>>(new Set());

  function toggleLE(name: string) {
    setExpandedLEs(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }
  function toggleVert(id: string) {
    setExpandedVerts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center text-xs font-bold shrink-0">
            {(g?.name ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-brand-navy text-sm leading-tight truncate">{g?.name ?? '—'}</h2>
            <p className="text-[10px] text-slate-400">{g?.industryType ?? ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Active</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Summary line */}
        <p className="text-[11px] text-slate-400">
          {leList.length} legal entit{leList.length !== 1 ? 'ies' : 'y'} · {totalVerticals} vertical{totalVerticals !== 1 ? 's' : ''} · {totalCities} cit{totalCities !== 1 ? 'ies' : 'y'}
        </p>

        {/* LE → Vertical tree */}
        {leList.map(le => (
          <div key={le.name} className="border border-slate-200 rounded-xl overflow-hidden">
            {/* LE header */}
            <button
              onClick={() => toggleLE(le.name)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <span className="text-sm shrink-0">🏢</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-slate-800 truncate block">{le.name}</span>
                {le.pan && <span className="text-[10px] text-slate-400 font-mono">{le.pan}{le.orgType ? ` · ${le.orgType}` : ''}</span>}
              </div>
              <span className="text-[10px] text-slate-300 shrink-0">{expandedLEs.has(le.name) ? '▲' : '▼'}</span>
            </button>

            {/* Verticals */}
            {expandedLEs.has(le.name) && le.verticals.map(vert => {
              const open = expandedVerts.has(vert.draftId);
              return (
                <div key={vert.draftId} className="border-t border-slate-100">
                  {/* Vertical summary row — always visible */}
                  <button
                    onClick={() => toggleVert(vert.draftId)}
                    className="w-full flex items-start gap-0 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-0.5 bg-brand-orange self-stretch shrink-0" />
                    <div className="flex-1 px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate flex-1">{vert.name}</span>
                        {vert.tripMode && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{vert.tripMode}</span>
                        )}
                        <span className="text-[10px] text-slate-300 shrink-0">{open ? '▲' : '▼'}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-1">
                        {(vert.state || vert.gstin) && (
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">State / GSTIN</p>
                            <p className="text-[11px] text-slate-600 font-mono">{vert.state}{vert.state && vert.gstin ? ' · ' : ''}{vert.gstin}</p>
                          </div>
                        )}
                        {vert.city && (
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">City</p>
                            <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{vert.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail — POC, Hub, Commercial, Approvals */}
                  {open && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-4">
                      {/* Hub */}
                      {vert.hubName && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hub</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <DetailField label="Hub Name"    value={vert.hubName} />
                            <DetailField label="Hub Address" value={vert.hubAddress} />
                            <DetailField label="Contact"     value={vert.contactName} />
                            <DetailField label="Email"       value={vert.contactEmail} />
                            <DetailField label="Phone"       value={vert.contactPhone} />
                          </div>
                        </div>
                      )}

                      {/* POC */}
                      {(vert.financeName || vert.opsName) && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Points of Contact</p>
                          <div className="grid grid-cols-2 gap-3">
                            {vert.financeName && (
                              <div className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Finance</p>
                                <DetailField label="Name"  value={vert.financeName} />
                                <DetailField label="Email" value={vert.financeEmail} />
                                <DetailField label="Phone" value={vert.financePhone} />
                              </div>
                            )}
                            {vert.opsName && (
                              <div className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ops</p>
                                <DetailField label="Name"  value={vert.opsName} />
                                <DetailField label="Email" value={vert.opsEmail} />
                                <DetailField label="Phone" value={vert.opsPhone} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Commercial */}
                      {vert.businessType && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Commercial</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <DetailField label="Business Type"     value={vert.businessType} />
                            <DetailField label="Margin"            value={vert.marginPct ? `${vert.marginPct}%` : ''} />
                            <DetailField label="Contract Start"    value={vert.contractStart} />
                            <DetailField label="Contract End"      value={vert.contractEnd} />
                            <DetailField label="Billing Days"      value={vert.billingDays} />
                            <DetailField label="Credit Days"       value={vert.creditDays} />
                            {vert.invoiceFreq && <DetailField label="Invoice Every" value={`${vert.invoiceFreq} days`} />}
                            {vert.remarks     && <DetailField label="Remarks"        value={vert.remarks} />}
                          </div>
                        </div>
                      )}

                      {/* Approvals */}
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approvals</p>
                        <div className="flex gap-2 flex-wrap">
                          {([
                            { label: 'Sales Admin', status: vert.salesAdminStatus },
                            { label: 'BizFin',      status: vert.bizFinStatus },
                            { label: 'OPM',         status: vert.opmStatus },
                          ] as { label: string; status: string | null }[]).filter(a => a.status).map(({ label, status }) => (
                            <div key={label} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] border ${statusStyle(status!).bg} ${statusStyle(status!).border} ${statusStyle(status!).text}`}>
                              <span>{statusStyle(status!).icon}</span>
                              <span className="font-semibold">{label}</span>
                              <span className="opacity-70">{status}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                          By {vert.createdBy} · {new Date(vert.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main exported panel ────────────────────────────────────────────────── */
export default function ApprovedClientsPanel({ showAddButton = false }: { showAddButton?: boolean }) {
  const [allDrafts,    setAllDrafts]    = useState<Draft[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [sortMode,     setSortMode]     = useState<'alpha' | 'recent'>('recent');
  const [selected,     setSelected]     = useState<Draft | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetch('/api/drafts')
      .then(r => r.json())
      .then((d: Draft[]) => { setAllDrafts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const myClients = allDrafts.filter(d => d.opmStatus?.toLowerCase() === 'approved');

  const q = search.toLowerCase();
  const filtered = myClients.filter(d => {
    if (!q) return true;
    const g  = (d.steps?.group?.name       ?? '').toLowerCase();
    const le = (d.steps?.legalEntity?.name ?? '').toLowerCase();
    const v  = (d.steps?.vertical?.name    ?? '').toLowerCase();
    const c  = (d.steps?.city?.city        ?? '').toLowerCase();
    return g.includes(q) || le.includes(q) || v.includes(q) || c.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'alpha')
      return (a.steps?.group?.name ?? '').localeCompare(b.steps?.group?.name ?? '');
    return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main pane */}
      <div className={`flex flex-col overflow-hidden transition-all duration-200 ${selected ? 'w-[42%] border-r border-slate-200' : 'flex-1'}`}>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex-1 min-w-0 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by Group, Legal Entity, Vertical Name only"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition" />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
            {(['alpha', 'recent'] as const).map(m => (
              <button key={m} onClick={() => setSortMode(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  sortMode === m ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {m === 'alpha' ? 'A → Z' : 'Recent'}
              </button>
            ))}
          </div>

          {showAddButton && (
            <button onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0">
              <span className="text-base leading-none">+</span>
              Add New Client
            </button>
          )}
          {showAddModal && <AddClientModal onClose={() => setShowAddModal(false)} />}
        </div>

        {/* COF banner (only when Add button visible) */}
        {showAddButton && (
          <div className="flex items-center justify-center gap-2.5 px-6 py-2 bg-slate-50 border-b border-dashed border-slate-200 cursor-not-allowed select-none">
            <span className="text-sm">📄</span>
            <span className="text-xs text-slate-400">Upload COF / Agreement to automatically onboard a client</span>
            <span className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded-full bg-brand-navy/10 text-brand-navy uppercase">Coming Soon</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading clients…</div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 py-16">
              <span className="text-3xl">🏢</span>
              <p className="text-sm">{q ? 'No clients match your search.' : 'No fully approved clients yet.'}</p>
            </div>
          ) : (
            <DraftClientList drafts={sorted} selected={selected} onSelect={setSelected} />
          )}
        </div>

        {!loading && sorted.length > 0 && (
          <div className="px-5 py-2 bg-white border-t border-slate-100 text-xs text-slate-400">
            {sorted.length} client{sorted.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && <DraftDetailPanel draft={selected} allDrafts={myClients} onClose={() => setSelected(null)} />}
    </div>
  );
}
