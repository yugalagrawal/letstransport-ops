import { useEffect, useState } from 'react';
import Header from '../components/Header';
import AddClientModal, { type Draft } from '../components/AddClientModal';
import ApprovedClientsPanel from '../components/ApprovedClientsPanel';

type TopTab = 'my-clients' | 'pending-list';
type PendingSubTab = 'my-drafts' | 'approval-status';
type ViewMode = 'list' | 'tile';
type SortMode = 'alpha' | 'recent';

interface Client {
  id: string;
  groupName: string;
  legalEntityName: string;
  vertical: string;
  city: string;
  state: string;
  poc1: string;
  poc1Email: string;
  poc1Phone: string;
  gstin: string;
  pan: string;
  onboardedDate: string;
  status: string;
}

export default function ClientOnboarding() {
  const [topTab, setTopTab] = useState<TopTab>('my-clients');
  const [pendingSubTab, setPendingSubTab] = useState<PendingSubTab>('my-drafts');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Client Onboarding" />

      {/* Top tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1">
          {([
            { id: 'my-clients',   label: 'My Activated Clients' },
            { id: 'pending-list', label: 'Pending Reviews' },
          ] as { id: TopTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTopTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                topTab === tab.id
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs for Pending List */}
      {topTab === 'pending-list' && (
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="flex gap-1">
            {([
              { id: 'my-drafts',       label: 'My Drafts'         },
              { id: 'approval-status', label: 'Ongoing Approvals' },
            ] as { id: PendingSubTab; label: string }[]).map((sub) => (
              <button
                key={sub.id}
                onClick={() => setPendingSubTab(sub.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  pendingSubTab === sub.id
                    ? 'border-brand-navy text-brand-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {topTab === 'my-clients' && <MyClientsPanel />}
        {topTab === 'pending-list' && pendingSubTab === 'my-drafts' && <MyDraftsPanel />}
        {topTab === 'pending-list' && pendingSubTab === 'approval-status' && <ApprovalStatusPanel />}
      </div>
    </div>
  );
}

/* ─── My Clients ─── */
function MyClientsPanel() {
  return <ApprovedClientsPanel showAddButton />;
}


/* ─── Icons ─── */
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="1" y="11" width="14" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

function TileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/* ─── Shared helpers ─── */
const PIPELINE_STEPS = ['Group', 'Legal Entity', 'Vertical', 'State GSTIN', 'POC', 'City', 'Commercial'];

function statusStyle(s: string) {
  if (s === 'Approved')            return { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  icon: '✓' };
  if (s === 'Correction Required') return { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',      icon: '⚠' };
  return                                  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700',  icon: '⏳' };
}

/* ─── My Drafts ─── */
function MyDraftsPanel() {
  const [drafts, setDrafts]         = useState<Draft[]>([]);
  const [loading, setLoading]       = useState(true);
  const [continueDraft, setContinueDraft] = useState<Draft | null>(null);
  const [search, setSearch]         = useState('');

  useEffect(() => {
    fetch('/api/drafts')
      .then((r) => r.json())
      .then((d) => { setDrafts(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Loading drafts…</div>;

  if (drafts.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
      <span className="text-3xl">📋</span>
      <p className="text-sm">No drafts yet. Start adding a client to see it here.</p>
    </div>
  );

  const q = search.toLowerCase();
  const filtered = drafts.filter((d) => {
    // Only show drafts not yet submitted to COB Admin
    if (d.salesAdminStatus) return false;
    if (!q) return true;
    const gName = (d.steps?.group?.name ?? d.steps?.group?.id ?? '').toLowerCase();
    const lName = (d.steps?.legalEntity?.name ?? d.steps?.legalEntity?.id ?? '').toLowerCase();
    return gName.includes(q) || lName.includes(q);
  });

  /* Sort by most recently updated */
  const sorted = [...filtered].sort((a, b) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
  );

  /* Group by updatedAt date */
  const byDate: Record<string, Draft[]> = {};
  sorted.forEach((d) => {
    const label = new Date(d.updatedAt ?? d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    (byDate[label] ??= []).push(d);
  });

  return (
    <>
      {continueDraft && (
        <AddClientModal initialDraft={continueDraft} onClose={() => setContinueDraft(null)} />
      )}
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Group or Legal Entity name…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition"
          />
        </div>

        {sorted.length === 0 && q ? (
          <p className="text-center text-slate-400 text-sm py-8">No drafts match "{search}"</p>
        ) : (
          Object.entries(byDate).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-slate-500">{date}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="space-y-3">
                {items.map((draft) => (
                  <DraftCard key={draft.id} draft={draft} onContinue={() => setContinueDraft(draft)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function DraftCard({ draft, onContinue }: { draft: Draft; onContinue: () => void }) {
  const groupData = draft.steps?.group;
  const leData    = draft.steps?.legalEntity;
  const groupLabel = groupData?.name ?? groupData?.id ?? draft.id;
  const leLabel    = leData?.name    ?? leData?.id    ?? '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:border-slate-300 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-mono text-slate-400">{draft.id}</span>
          <p className="text-sm font-semibold text-brand-navy mt-0.5">{groupLabel}</p>
          {leLabel && <p className="text-xs text-slate-500 mt-0.5">{leLabel}</p>}
        </div>
        <button
          onClick={onContinue}
          className="text-xs text-brand-orange hover:text-brand-orange-dark font-medium border border-brand-orange/30 hover:border-brand-orange px-3 py-1 rounded-md transition-colors shrink-0"
        >
          {draft.salesAdminStatus === 'Correction Required' ? 'Edit to resubmit →' : 'Continue →'}
        </button>
      </div>

      {/* No approval badges in My Drafts — submitted drafts move to Approval Status */}

      {/* Pipeline */}
      <div className="flex items-center gap-0">
        {PIPELINE_STEPS.map((step, idx) => {
          const done   = idx <= draft.currentStep;
          const active = idx === draft.currentStep;
          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 text-[10px] font-bold transition-colors ${
                  done && !active ? 'bg-green-500 border-green-500 text-white'
                  : active        ? 'bg-brand-orange border-brand-orange text-white'
                  :                 'bg-white border-slate-300 text-slate-300'
                }`}>
                  {done && !active ? '✓' : idx + 1}
                </div>
                <span className={`text-[9px] mt-1 text-center leading-tight truncate w-full px-0.5 ${
                  done && !active ? 'text-green-600' : active ? 'text-brand-navy font-medium' : 'text-slate-300'
                }`}>{step}</span>
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 -mt-4 mx-0.5 ${idx < draft.currentStep ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 mt-2">
        Last updated: {new Date(draft.updatedAt ?? draft.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        {' · '}by {draft.createdBy}
      </p>
    </div>
  );
}

function ApprovalBadge({ admin, status }: { admin: string; status: string }) {
  const s = statusStyle(status);
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] ${s.bg} ${s.border} ${s.text}`}>
      <span className="shrink-0">{s.icon}</span>
      <span><span className="font-semibold">{admin}:</span> {status}</span>
    </div>
  );
}

/* ─── Approval Status Panel ─── */
type ApprovalSubTab = 'pending' | 'resolve-errors' | 'approved';

function ApprovalStatusPanel() {
  const [allDrafts, setAllDrafts]   = useState<Draft[]>([]);
  const [loading, setLoading]       = useState(true);
  const [subTab, setSubTab]         = useState<ApprovalSubTab>('pending');
  const [editDraft, setEditDraft]   = useState<Draft | null>(null);

  const loadDrafts = () => {
    setLoading(true);
    fetch('/api/drafts')
      .then((r) => r.json())
      .then((d: Draft[]) => { setAllDrafts(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadDrafts(); }, []);

  // Only drafts submitted to COB Admin appear here
  const submitted = allDrafts.filter((d) => !!d.salesAdminStatus);

  const byNewest = (a: Draft, b: Draft) =>
    new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();

  const pendingDrafts  = submitted.filter((d) =>
    d.salesAdminStatus === 'Pending' ||
    (d.salesAdminStatus === 'Approved' && d.opmStatus === 'Pending')
  ).sort(byNewest);
  const errorDrafts    = submitted.filter((d) => d.salesAdminStatus === 'Correction Required').sort(byNewest);
  const approvedDrafts = submitted.filter((d) =>
    d.salesAdminStatus === 'Approved' && d.opmStatus === 'Approved'
  ).sort(byNewest);

  if (loading) return <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>;

  const tabs: { id: ApprovalSubTab; label: string; count: number; dot: string }[] = [
    { id: 'pending',        label: 'Pending Approvals', count: pendingDrafts.length,  dot: 'bg-amber-400' },
    { id: 'resolve-errors', label: 'Resolve Errors',    count: errorDrafts.length,    dot: 'bg-red-400'   },
    { id: 'approved',       label: 'Approved',          count: approvedDrafts.length, dot: 'bg-green-500' },
  ];

  const currentList =
    subTab === 'pending'        ? pendingDrafts  :
    subTab === 'resolve-errors' ? errorDrafts    :
    approvedDrafts;

  return (
    <>
      {editDraft && (
        <AddClientModal
          initialDraft={editDraft}
          onClose={() => { setEditDraft(null); loadDrafts(); }}
        />
      )}

      <div className="flex flex-col h-full overflow-hidden">
        {/* Sub-tabs */}
        <div className="bg-white border-b border-slate-200 px-6 shrink-0">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  subTab === t.id
                    ? 'border-brand-navy text-brand-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${t.dot}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
              <span className="text-3xl">{subTab === 'approved' ? '🎉' : subTab === 'resolve-errors' ? '✅' : '⏳'}</span>
              <p className="text-sm">
                {subTab === 'pending'        ? 'No pending approvals.' :
                 subTab === 'resolve-errors' ? 'No errors to resolve.' :
                 'No approved drafts yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map((d) => (
                <ApprovalCard
                  key={d.id}
                  draft={d}
                  subTab={subTab}
                  onEdit={() => setEditDraft(d)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ApprovalCard({ draft, subTab, onEdit }: {
  draft: Draft;
  subTab: ApprovalSubTab;
  onEdit: () => void;
}) {
  const groupLabel = draft.steps?.group?.name ?? draft.steps?.group?.id ?? draft.id;
  const leLabel    = draft.steps?.legalEntity?.name ?? draft.steps?.legalEntity?.id ?? '';
  const vertLabel  = draft.steps?.vertical?.name ?? '';
  const tripMode   = draft.steps?.vertical?.tripMode ?? '';

  const saStatus  = draft.salesAdminStatus;
  const opmStatus = draft.opmStatus;

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <span className="text-xs font-mono text-slate-400">{draft.id}</span>
          <p className="text-sm font-semibold text-brand-navy mt-0.5">{groupLabel}</p>
          {leLabel   && <p className="text-xs text-slate-500 mt-0.5">{leLabel}</p>}
          {vertLabel && <p className="text-xs text-slate-400 mt-0.5">{vertLabel}{tripMode ? ` · ${tripMode}` : ''}</p>}
        </div>
        {subTab === 'resolve-errors' && (
          <button onClick={onEdit}
            className="text-xs font-medium bg-brand-orange text-white px-3 py-1.5 rounded-md hover:bg-brand-orange/90 transition-colors whitespace-nowrap shrink-0">
            ✏ Edit to resubmit
          </button>
        )}
      </div>

      {/* Status rows */}
      <div className="space-y-2">
        {saStatus && (
          <div className={`rounded-lg border px-3 py-2 text-[11px] ${statusStyle(saStatus).bg} ${statusStyle(saStatus).border} ${statusStyle(saStatus).text}`}>
            <div className="flex items-center gap-1.5">
              <span>{statusStyle(saStatus).icon}</span>
              <span className="font-semibold">COB Admin:</span>
              <span>{saStatus}</span>
            </div>
            {saStatus === 'Correction Required' && draft.salesAdminComment && (
              <p className="mt-1.5 pl-5 italic opacity-90">"{draft.salesAdminComment}"</p>
            )}
          </div>
        )}
        {saStatus === 'Approved' && opmStatus && (
          <div className={`rounded-lg border px-3 py-2 text-[11px] ${statusStyle(opmStatus).bg} ${statusStyle(opmStatus).border} ${statusStyle(opmStatus).text}`}>
            <div className="flex items-center gap-1.5">
              <span>{statusStyle(opmStatus).icon}</span>
              <span className="font-semibold">OPM:</span>
              <span>{opmStatus}</span>
            </div>
            {opmStatus === 'Correction Required' && draft.opmComment && (
              <p className="mt-1.5 pl-5 italic opacity-90">"{draft.opmComment}"</p>
            )}
          </div>
        )}
        {saStatus === 'Approved' && !opmStatus && (
          <div className="rounded-lg border px-3 py-2 text-[11px] bg-purple-50 border-purple-200 text-purple-700">
            <div className="flex items-center gap-1.5">
              <span>⏳</span>
              <span className="font-semibold">OPM:</span>
              <span>Pending final approval</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
