import { useState, useEffect, useCallback } from 'react';
import { getUser } from '../hooks/useAuth';
import ApprovedClientsPanel from '../components/ApprovedClientsPanel';
import Header from '../components/Header';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface DraftStep { [key: string]: string | undefined; }

interface CommercialFile { id: string; name: string; size: string; category: 'commercial' | 'approval'; }

interface CommercialDraftStep {
  name?: string; businessType?: string; contractStartDate?: string; contractEndDate?: string;
  marginPct?: string; billingDays?: string; creditDays?: string; invoiceFrequency?: string;
  remarks?: string;
}

interface Draft {
  id: string;
  createdAt: string; updatedAt: string; createdBy: string; currentStep: number;
  steps: {
    group?:       DraftStep;
    legalEntity?: DraftStep;
    vertical?:    DraftStep;
    stateGstin?:  DraftStep;
    poc?:         DraftStep;
    city?:        DraftStep;
    commercial?:  CommercialDraftStep;
  };
  commercialFiles?: CommercialFile[];
  salesAdminStatus: string | null; salesAdminSubmittedAt?: string; salesAdminComment?: string;
  bizFinStatus:     string | null; bizFinSubmittedAt?: string;     bizFinComment?: string;
  opmStatus:        string | null; opmSubmittedAt?: string;        opmComment?: string;
}

interface Client {
  id: string;
  groupName: string;
  legalEntityName: string;
  vertical: string;
  city?: string;
  state?: string;
  poc1: string;
  poc1Email?: string;
  onboardedDate: string;
  status?: string;
}

type TopTab = 'clients' | 'pending-reviews';
type SubTab = 'pending' | 'ongoing';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const LEG_LABELS: Record<string, string> = {
  FM: 'First Mile', SH: 'Short Haul', LH: 'Long Haul', LM: 'Last Mile', '0': '—',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtShortDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ─── Atoms ──────────────────────────────────────────────────────────────── */
function Field({ label, value, mono = false, span2 = false }: {
  label: string; value?: string; mono?: boolean; span2?: boolean;
}) {
  if (!value?.trim()) return null;
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-xs text-slate-700 font-medium leading-snug ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function SectionCard({ title, children }: {
  title: string; focus?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ─── DraftListItem ──────────────────────────────────────────────────────── */
function DraftListItem({ draft, selected, tab, onClick }: {
  draft: Draft; selected: boolean;
  tab: SubTab; onClick: () => void;
}) {
  const g    = draft.steps.group;
  const saS  = draft.salesAdminStatus;
  const opmS = draft.opmStatus;

  // State label — only shown in Ongoing tab
  let stateTag: { text: string; cls: string } | null = null;
  if (tab === 'ongoing') {
    if (saS === 'Correction Required')
      stateTag = { text: 'Awaiting COB Executive revision', cls: 'text-amber-600' };
    else if (saS === 'Approved' && opmS === 'Correction Required')
      stateTag = { text: 'OPM flagged issue', cls: 'text-red-500' };
    else if (saS === 'Approved')
      stateTag = { text: 'Pending OPM approval', cls: 'text-purple-600' };
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        selected
          ? 'bg-brand-orange/10 border-brand-orange/40 shadow-sm'
          : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
      }`}
    >
      <span className={`block text-xs font-semibold truncate leading-snug ${selected ? 'text-brand-orange' : 'text-slate-700'}`}>
        {g?.name ?? draft.id}
      </span>
      {g?.industryType && <div className="text-[9px] text-slate-400 mt-0.5">{g.industryType}</div>}
      <div className="text-[9px] text-slate-400 font-mono mt-0.5">{draft.id}</div>
      {tab === 'pending' && draft.salesAdminSubmittedAt && (
        <div className="text-[9px] text-slate-400 mt-0.5">
          Submitted {new Date(draft.salesAdminSubmittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {new Date(draft.salesAdminSubmittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      )}
      {stateTag && (
        <div className={`text-[9px] font-semibold mt-1 ${stateTag.cls}`}>{stateTag.text}</div>
      )}
    </button>
  );
}

/* ─── Clients Tab ─────────────────────────────────────────────────────────── */
function ClientsTab() {
  return <ApprovedClientsPanel showAddButton={false} />;
}


/* ─── DraftDetailPanel ───────────────────────────────────────────────────── */
function DraftDetailPanel({ draft, tab, onApprove, onRequestCorrection, submitting }: {
  draft: Draft; tab: SubTab;
  onApprove: () => void;
  onRequestCorrection: (comment: string) => void;
  submitting: boolean;
}) {
  const [correcting,        setCorrecting]        = useState(false);
  const [comment,           setComment]           = useState('');
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [downloadedIds,     setDownloadedIds]     = useState<Set<string>>(new Set());

  useEffect(() => {
    setCorrecting(false); setComment(''); setConfirmingApprove(false);
    setDownloadedIds(new Set());
  }, [draft.id]);

  // Files uploaded by Sales during commercial step
  const commFiles: CommercialFile[] = draft.commercialFiles ?? [];

  const { group: g, legalEntity: le, vertical: v, stateGstin: sg, poc, city, commercial: comm } = draft.steps;

  const statusNow   = draft.salesAdminStatus;
  const commentNow  = draft.salesAdminComment;
  const submittedAt = draft.salesAdminSubmittedAt;

  // COB Admin reviews all sections
  const isGroupFocus = true;
  const isVertFocus  = true;
  const isGstinFocus = true;
  const isCommFocus  = true;

  /* File-gate: all docs must be downloaded before approve */
  const allFilesReviewed = commFiles.length === 0 || downloadedIds.size >= commFiles.length;
  const unreviewedCount  = Math.max(0, commFiles.length - downloadedIds.size);

  /* confirmation message text */
  const confirmMsg = <>Approving Group <strong>"{g?.name}"</strong> and Vertical <strong className="font-mono">"{v?.name ?? '—'}"</strong> — submitting to OPM for final approval. Sure?</>;

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-slate-50">

      {/* top bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-brand-navy text-sm truncate">{g?.name ?? 'Draft'}</h2>
              {g?.industryType && (
                <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wide">
                  {g.industryType}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-400 font-mono">{draft.id}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] text-slate-400">{submittedAt ? fmtDate(submittedAt) : fmtDate(draft.createdAt)}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] text-slate-400">{draft.createdBy.split('@')[0]}</span>
            </div>
          </div>

          {tab === 'ongoing' && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              {statusNow === 'Approved' ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">✓ Approved</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      draft.opmStatus === 'Correction Required'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-purple-50 text-purple-600 border-purple-200'
                    }`}>
                      {draft.opmStatus === 'Correction Required' ? 'OPM flagged issue' : 'Pending OPM'}
                    </span>
                  </div>
                  {draft.opmStatus === 'Correction Required' && (
                    <span className="text-[10px] text-amber-600">⚠ OPM flagged an error</span>
                  )}
                </>
              ) : statusNow ? (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  ↩ Correction Required
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* scrollable sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* ── Pending: Sales re-submitted after correction ── */}
        {tab === 'pending' && draft.salesAdminComment && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold block mb-1 text-blue-800">↩ Sales re-submitted after correction</span>
            <span className="text-[10px] text-blue-500 block mb-1">Your previous note:</span>
            {draft.salesAdminComment}
          </div>
        )}

        {/* ── Ongoing: Correction Required — awaiting COB Executive fix ── */}
        {tab === 'ongoing' && statusNow === 'Correction Required' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold block mb-1 text-amber-800">↩ Awaiting COB Executive revision</span>
            {commentNow && <p className="mb-1">{commentNow}</p>}
            <span className="text-[10px] text-amber-500 italic">Will return to Pending Review once COB Executive resubmits</span>
          </div>
        )}

        {/* ── Ongoing: Approved → OPM chain ── */}
        {tab === 'ongoing' && statusNow === 'Approved' && (!draft.opmStatus || draft.opmStatus === 'Pending') && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
            ⏳ Pending OPM approval — hub verification pending
          </div>
        )}
        {tab === 'ongoing' && statusNow === 'Approved' && draft.opmStatus === 'Correction Required' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed">
            <span className="font-semibold block mb-1 text-red-800">⚠ OPM flagged an issue</span>
            {draft.opmComment || 'OPM has flagged an issue — awaiting resolution.'}
          </div>
        )}

        {/* GROUP */}
        {g && (
          <SectionCard title="Client Group" focus={isGroupFocus}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="col-span-2">
                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Group Name</div>
                <div className={`font-bold leading-snug ${isGroupFocus ? 'text-base text-brand-navy' : 'text-xs text-slate-700'}`}>
                  {g.name}
                </div>
              </div>
              <Field label="Industry Type" value={g.industryType} />
            </div>
          </SectionCard>
        )}

        {/* LEGAL ENTITY */}
        {le && (
          <SectionCard title="Legal Entity" focus={false}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {le.mode === 'existing' ? (
                <Field label="Entity Name" value={le.name} span2 />
              ) : (<>
                <Field label="Entity Name" value={le.name} span2 />
                <Field label="PAN" value={le.pan} mono />
                <Field label="Org Type" value={le.orgType} />
                <Field label="Registered Address" value={le.address} span2 />
              </>)}
            </div>
          </SectionCard>
        )}

        {/* VERTICAL */}
        {v && (
          <SectionCard title="Vertical" focus={isVertFocus}>
            <div className="space-y-3">
              <div>
                <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Vertical Name</div>
                <div className={`font-mono font-bold break-all ${isVertFocus ? 'text-base text-brand-navy' : 'text-xs text-slate-700'}`}>
                  {v.name}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.tripMode && (
                  <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600">
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wide">Trip Mode</span>
                    <span className="font-semibold">{v.tripMode}</span>
                  </div>
                )}
                {v.leg && (
                  <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-600">
                    <span className="text-[9px] text-slate-400 block uppercase tracking-wide">Leg</span>
                    <span className="font-semibold">{LEG_LABELS[v.leg] ?? v.leg}</span>
                  </div>
                )}
                {v.isCFA === 'true' && (
                  <div className="px-2.5 py-1 rounded-lg bg-purple-100 text-xs text-purple-700">
                    <span className="text-[9px] text-purple-400 block uppercase tracking-wide">Type</span>
                    <span className="font-semibold">CFA</span>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* STATE GSTIN */}
        {sg && (
          <SectionCard title="State & GSTIN" focus={isGstinFocus}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {sg.mode === 'existing' ? (
                <Field label="State / GSTIN" value={sg.name} span2 />
              ) : (<>
                <Field label="State"           value={sg.state} />
                <Field label="GSTIN"           value={sg.gstin} mono />
                <Field label="Billing Address" value={sg.billingAddress} span2 />
                <Field label="Dummy GSTIN"     value={sg.isDummy === 'true' ? 'Yes — placeholder' : sg.isDummy === 'false' ? 'No' : undefined} />
              </>)}
            </div>
          </SectionCard>
        )}

        {/* POC */}
        {poc && (poc.financeName || poc.opsName) && (
          <SectionCard title="Points of Contact" focus={false}>
            <div className="space-y-4">
              {poc.financeName && (
                <div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Finance</div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <Field label="Name"      value={poc.financeName} />
                    <Field label="Email"     value={poc.financeEmail} />
                    <Field label="Phone"     value={poc.financePhone} />
                    {poc.financeAltName && <>
                      <Field label="Alt Name"  value={poc.financeAltName} />
                      <Field label="Alt Email" value={poc.financeAltEmail} />
                      <Field label="Alt Phone" value={poc.financeAltPhone} />
                    </>}
                  </div>
                </div>
              )}
              {poc.opsName && (
                <div className={poc.financeName ? 'border-t border-slate-100 pt-3' : ''}>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Ops</div>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2">
                    <Field label="Name"      value={poc.opsName} />
                    <Field label="Email"     value={poc.opsEmail} />
                    <Field label="Phone"     value={poc.opsPhone} />
                    {poc.opsAltName && <>
                      <Field label="Alt Name"  value={poc.opsAltName} />
                      <Field label="Alt Email" value={poc.opsAltEmail} />
                      <Field label="Alt Phone" value={poc.opsAltPhone} />
                    </>}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* CITY */}
        {city && (
          <SectionCard title="City & Hub" focus={false}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {city.mode === 'existing' ? (
                <Field label="City" value={city.name} span2 />
              ) : (<>
                <Field label="City"          value={city.city} />
                <Field label="Hub Name"      value={city.hubName} />
                <Field label="Hub Address"   value={city.hubAddress} span2 />
                {city.lat && <Field label="Coordinates" value={`${city.lat}, ${city.lng}`} />}
                {city.subArea && <Field label="Sub Area / Area" value={`${city.subArea} · ${city.area}`} />}
                <Field label="Contact Name"  value={city.contactName} />
                <Field label="Contact Email" value={city.contactEmail} />
                <Field label="Contact Phone" value={city.contactPhone} />
              </>)}
            </div>
          </SectionCard>
        )}

        {/* COMMERCIAL */}
        {comm && (
          <SectionCard title="Commercial Terms" focus={isCommFocus}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Business Type"    value={comm.businessType} />
              <div />
              <Field label="Contract Start"   value={comm.contractStartDate} />
              <Field label="Contract End"     value={comm.contractEndDate} />
              <Field label="Margin %"         value={comm.marginPct ? `${comm.marginPct}%` : undefined} />
              <Field label="Billing Days"     value={comm.billingDays ? `${comm.billingDays} days` : undefined} />
              <Field label="Credit Days"      value={comm.creditDays ? `${comm.creditDays} days` : undefined} />
              <Field label="Invoice Freq."    value={comm.invoiceFrequency ? `Every ${comm.invoiceFrequency} days` : undefined} />
              {comm.remarks && (
                <div className="col-span-2 pt-2 border-t border-slate-100">
                  <Field label="Remarks" value={comm.remarks} />
                </div>
              )}

              {/* ── Documents — must all be downloaded before approve ── */}
              {commFiles.length > 0 && (
                <div className="col-span-2 pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                    Documents to Review
                    <span className="ml-1 text-amber-500">
                      ({downloadedIds.size}/{commFiles.length} reviewed)
                    </span>
                  </div>
                  {commFiles.map(f => {
                    const reviewed = downloadedIds.has(f.id);
                    return (
                      <div key={f.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
                        reviewed ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-white'
                      }`}>
                        <span className="text-base shrink-0">{f.category === 'approval' ? '📋' : '📊'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium text-slate-700 truncate">{f.name}</div>
                          <div className="text-[9px] text-slate-400">
                            {f.size} · {f.category === 'approval' ? 'Approval doc' : 'Commercial doc'}
                          </div>
                        </div>
                        {reviewed ? (
                          <span className="text-[10px] text-green-600 font-semibold shrink-0">✓ Reviewed</span>
                        ) : (
                          <button
                            onClick={() => setDownloadedIds(prev => new Set([...prev, f.id]))}
                            className="shrink-0 text-[10px] font-semibold text-brand-orange hover:text-orange-600 border border-brand-orange/30 hover:border-brand-orange/60 px-2 py-0.5 rounded-lg transition-colors"
                          >
                            ↓ Download
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {downloadedIds.size < commFiles.length && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      ⚠ Download and review all {commFiles.length} document{commFiles.length > 1 ? 's' : ''} to enable approval
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <div className="h-2" />
      </div>

      {/* ── Sticky action bar ── */}
      {tab === 'pending' && (
        <div className="shrink-0 bg-white border-t border-slate-200 px-5 py-4">

          {/* STATE 1: normal buttons */}
          {!confirmingApprove && !correcting && (
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingApprove(true)}
                disabled={submitting || !allFilesReviewed}
                title={!allFilesReviewed ? `Download ${unreviewedCount} remaining document(s) first` : undefined}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {!allFilesReviewed
                  ? `↓ Review ${unreviewedCount} doc${unreviewedCount > 1 ? 's' : ''} first`
                  : '✓ Approve'}
              </button>
              <button
                onClick={() => setCorrecting(true)}
                disabled={submitting}
                className="flex-1 border border-amber-400 text-amber-600 hover:bg-amber-50 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Request Correction
              </button>
            </div>
          )}

          {/* STATE 2: approval confirmation */}
          {confirmingApprove && !correcting && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                {confirmMsg}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingApprove(false)}
                  className="px-4 text-sm text-slate-400 hover:text-slate-700 py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmingApprove(false); onApprove(); }}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {submitting ? 'Approving…' : '✓ Yes, Confirm'}
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: correction comment */}
          {correcting && !confirmingApprove && (
            <div className="space-y-2">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Describe what needs to be corrected…"
                rows={3}
                autoFocus
                className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setCorrecting(false); setComment(''); }}
                  className="px-4 text-sm text-slate-400 hover:text-slate-700 py-2 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (comment.trim()) onRequestCorrection(comment.trim()); }}
                  disabled={!comment.trim() || submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
                >
                  {submitting ? 'Sending…' : 'Send Back for Correction'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function ClientApprovals() {
  const [topTab,     setTopTab]     = useState<TopTab>('clients');
  const [tab,        setTab]        = useState<SubTab>('pending');
  const [drafts,     setDrafts]     = useState<Draft[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drafts');
      const all: Draft[] = await res.json();
      setDrafts(all);
      const pending = all.filter(d => d.salesAdminStatus === 'Pending');
      setSelectedId(prev =>
        prev && pending.some(d => d.id === prev) ? prev : (pending[0]?.id ?? null)
      );
    } catch { setDrafts([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const pendingDrafts = drafts
    .filter(d => d.salesAdminStatus === 'Pending')
    .sort((a, b) => new Date(b.salesAdminSubmittedAt ?? b.updatedAt ?? b.createdAt).getTime()
                  - new Date(a.salesAdminSubmittedAt ?? a.updatedAt ?? a.createdAt).getTime());
  const ongoingDrafts = drafts.filter(d =>
    d.salesAdminStatus === 'Correction Required' ||
    (d.salesAdminStatus === 'Approved' && d.opmStatus !== 'Approved')
  );

  const shown         = tab === 'pending' ? pendingDrafts : ongoingDrafts;
  const selectedDraft = shown.find(d => d.id === selectedId) ?? shown[0] ?? null;

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  async function handleApprove(draftId: string) {
    const remaining = pendingDrafts.filter(d => d.id !== draftId);
    setSubmitting(true);
    try {
      await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesAdminStatus: 'Approved', salesAdminComment: '', opmStatus: 'Pending', opmSubmittedAt: new Date().toISOString() }),
      });
      flash('✓ Approved — submitted to OPM for final sign-off');
      setSelectedId(remaining[0]?.id ?? null);
      await loadDrafts();
    } finally { setSubmitting(false); }
  }

  async function handleRequestCorrection(draftId: string, comment: string) {
    const remaining = pendingDrafts.filter(d => d.id !== draftId);
    setSubmitting(true);
    try {
      await fetch(`/api/drafts/${draftId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesAdminStatus: 'Correction Required', salesAdminComment: comment }),
      });
      flash('Correction requested — COB Executive has been notified');
      setSelectedId(remaining[0]?.id ?? null);
      await loadDrafts();
    } finally { setSubmitting(false); }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Client Approvals" />

      {/* Top tabs — mirrors Client Onboarding structure */}
      <div className="bg-white border-b border-slate-200 px-6 shrink-0">
        <div className="flex gap-1">
          {([
            { id: 'clients',         label: 'My Activated Clients' },
            { id: 'pending-reviews', label: 'Pending Reviews' },
          ] as { id: TopTab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTopTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                topTab === t.id
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
              {t.id === 'pending-reviews' && pendingDrafts.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-brand-orange text-white px-1.5 py-0.5 rounded-full">
                  {pendingDrafts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-tabs inside Pending Reviews */}
      {topTab === 'pending-reviews' && (
        <div className="bg-white border-b border-slate-200 px-6 shrink-0">
          <div className="flex gap-1">
            {([
              { id: 'pending', label: 'Pending Review'    },
              { id: 'ongoing', label: 'Ongoing Approvals' },
            ] as { id: SubTab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSelectedId(null); }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-brand-navy text-brand-navy'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.label}
                {t.id === 'pending' && pendingDrafts.length > 0 && (
                  <span className="ml-1.5 text-[9px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">
                    {pendingDrafts.length}
                  </span>
                )}
                {t.id === 'ongoing' && ongoingDrafts.length > 0 && (
                  <span className="ml-1.5 text-[9px] font-bold bg-slate-400 text-white px-1.5 py-0.5 rounded-full">
                    {ongoingDrafts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="bg-green-600 text-white text-xs font-medium px-6 py-2.5 flex items-center gap-2 shrink-0">
          {successMsg}
        </div>
      )}

      {/* ── My Clients ── */}
      {topTab === 'clients' && <ClientsTab />}

      {/* ── Pending Reviews ── */}
      {topTab === 'pending-reviews' && (
        <>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm gap-2">
              <span className="inline-block animate-spin">⟳</span> Loading…
            </div>
          ) : shown.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="text-4xl">{tab === 'pending' ? '✅' : '📂'}</div>
              <p className="text-slate-600 font-medium text-sm">
                {tab === 'pending' ? 'All caught up!' : 'Nothing here yet'}
              </p>
              <p className="text-slate-400 text-xs">
                {tab === 'pending' ? 'No submissions waiting for review' : 'Reviewed drafts will appear here'}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: draft list */}
              <div className="w-48 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {shown.map(d => (
                    <DraftListItem
                      key={d.id}
                      draft={d}
                      selected={d.id === selectedDraft?.id}
                      tab={tab}
                      onClick={() => setSelectedId(d.id)}
                    />
                  ))}
                </div>
              </div>
              {/* Right: detail */}
              {selectedDraft ? (
                <DraftDetailPanel
                  key={selectedDraft.id}
                  draft={selectedDraft}
                  tab={tab}
                  onApprove={() => handleApprove(selectedDraft.id)}
                  onRequestCorrection={c => handleRequestCorrection(selectedDraft.id, c)}
                  submitting={submitting}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  Select a draft from the list
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
