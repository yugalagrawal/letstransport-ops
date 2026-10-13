import { useState, useRef, useEffect, Fragment } from 'react';

type ExpenseEffect = 'add' | 'deduct' | 'none';

interface ExpenseType {
  name: string;
  whenToUse: string;
  effect: ExpenseEffect;
}

const EXPENSE_TYPES: ExpenseType[] = [
  { name: 'Advance',              whenToUse: 'Pay an advance to the driver',                                    effect: 'deduct' },
  { name: 'Toll and Parking',     whenToUse: 'Reimburse driver for toll and parking and submit receipts',       effect: 'add'    },
  { name: 'Handling (Labour)',    whenToUse: 'Reimburse driver for any labour hired',                           effect: 'add'    },
  { name: 'Client Penalty',       whenToUse: 'Forward client penalty to the driver',                            effect: 'deduct' },
  { name: 'Penalty',              whenToUse: 'Driver has to be penalized by LetsTransport',                     effect: 'deduct' },
  { name: 'DS Collection',        whenToUse: 'Driver has not deposited the cash he has collected',              effect: 'deduct' },
  { name: 'Retention Amount',     whenToUse: 'Pay driver for extra services (e.g. halting)',                    effect: 'add'    },
  { name: 'Cost Reduction',       whenToUse: 'Adjust monthly payout',                                          effect: 'deduct' },
  { name: 'Incentive',            whenToUse: 'Forward incentive bonus from client to the driver',               effect: 'add'    },
  { name: 'Insurance',            whenToUse: 'Pay advance to driver for vehicle insurance premium',             effect: 'deduct' },
  { name: 'Bonus',                whenToUse: 'Bonus to be given to the driver from LetsTransport',              effect: 'none'   },
  { name: 'Fuel Card',            whenToUse: 'Money already added to the fuel card of the driver',              effect: 'deduct' },
  { name: 'GPS Security Deposit', whenToUse: 'Security Deposit for GPS device',                                effect: 'deduct' },
  { name: 'Deduction Fee',        whenToUse: 'N/A',                                                             effect: 'none'   },
  { name: 'Toll',                 whenToUse: 'Reimburse driver for toll and submit receipts',                   effect: 'add'    },
  { name: 'Parking',              whenToUse: 'Reimburse driver for parking and submit receipts',                effect: 'add'    },
  { name: 'Unloading Charges',    whenToUse: 'Reimburse driver for unloading charges and submit receipts',      effect: 'add'    },
];

const EFFECT_META: Record<ExpenseEffect, { label: string; badgeCls: string; pillCls: string; bannerCls: string; dotCls: string }> = {
  add:    { label: '+ Added to salary',      badgeCls: 'bg-green-50 text-green-700 border border-green-200',  pillCls: 'bg-green-50 text-green-800 border border-green-200',  bannerCls: 'bg-green-50 border-green-200 text-green-700', dotCls: 'bg-green-500' },
  deduct: { label: '− Deducted from salary', badgeCls: 'bg-red-50 text-red-700 border border-red-200',        pillCls: 'bg-red-50 text-red-800 border border-red-200',        bannerCls: 'bg-red-50 border-red-200 text-red-700',       dotCls: 'bg-red-500'   },
  none:   { label: 'No salary adjustment',   badgeCls: 'bg-slate-100 text-slate-500 border border-slate-200', pillCls: 'bg-slate-100 text-slate-600 border border-slate-200', bannerCls: 'bg-slate-50 border-slate-200 text-slate-500', dotCls: 'bg-slate-400' },
};

interface FormState {
  expenseType: string;
  expenseDate: string;
  partnerNo: string;
  vehicleNo: string;
  clientName: string;
  cost: string;
  revenue: string;
  processingFee: string;
  receiptId: string;
  remarks: string;
}
const EMPTY = (type = ''): FormState => ({
  expenseType: type, expenseDate: '', partnerNo: '', vehicleNo: '',
  clientName: '', cost: '', revenue: '', processingFee: '', receiptId: '', remarks: '',
});

/* ── Shared inline form ───────────────────────────────────────────── */
function ExpenseForm({
  initialType,
  onSubmit,
  onCancel,
  compact = false,
}: {
  initialType: string;
  onSubmit: () => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY(initialType));
  const selected = EXPENSE_TYPES.find(e => e.name === form.expenseType) ?? null;

  useEffect(() => { setForm(EMPTY(initialType)); }, [initialType]);

  function set(field: keyof FormState, val: string) {
    setForm(prev => ({ ...prev, [field]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const ic = "w-full border-0 border-b border-slate-300 px-0 py-1.5 text-sm bg-transparent focus:outline-none focus:border-brand-orange placeholder-slate-400";
  const lc = "block text-xs font-semibold text-slate-500 mb-0.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Effect banner */}
      {selected && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs border ${EFFECT_META[selected.effect].bannerCls}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${EFFECT_META[selected.effect].dotCls}`} />
          <span className="font-semibold">{EFFECT_META[selected.effect].label}</span>
          <span className="opacity-60 ml-1">— {selected.whenToUse}</span>
        </div>
      )}

      {/* Expense Date */}
      <div className="w-52">
        <label className={lc}>Expense Date <span className="text-red-500">*</span></label>
        <input required type="date" value={form.expenseDate} onChange={e => set('expenseDate', e.target.value)}
          className={ic} />
      </div>

      {/* Row: Partner No | Vehicle No | Client Name | Cost | Revenue */}
      <div className="grid grid-cols-5 gap-6">
        <div>
          <label className={lc}>Partner Number <span className="text-red-500">*</span></label>
          <input required type="text" placeholder="Partner Number" value={form.partnerNo} onChange={e => set('partnerNo', e.target.value)} className={ic} />
        </div>
        <div>
          <label className={lc}>Vehicle Number <span className="text-red-500">*</span></label>
          <input required type="text" placeholder="Vehicle Number" value={form.vehicleNo} onChange={e => set('vehicleNo', e.target.value)} className={ic} />
        </div>
        <div>
          <label className={lc}>Client Name <span className="text-red-500">*</span></label>
          <input required type="text" placeholder="Client Name" value={form.clientName} onChange={e => set('clientName', e.target.value)} className={ic} />
        </div>
        <div>
          <label className={lc}>Cost(Rs) <span className="text-red-500">*</span></label>
          <input required type="number" min="0" placeholder="Cost(Rs)" value={form.cost} onChange={e => set('cost', e.target.value)} className={ic} />
        </div>
        <div>
          <label className={lc}>Revenue(Rs)</label>
          <input type="number" min="0" placeholder="Revenue(Rs)" value={form.revenue} onChange={e => set('revenue', e.target.value)} className={ic} />
        </div>
      </div>

      {/* Row: Processing Fee | Receipt ID | Remarks */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className={lc}>Processing Fee (if present)</label>
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="0.01" placeholder="Processing Fee (if present)" value={form.processingFee} onChange={e => set('processingFee', e.target.value)} className={ic} />
            <span className="text-slate-500 font-bold text-sm shrink-0">%</span>
          </div>
        </div>
        <div>
          <label className={lc}>Receipt Id</label>
          <input type="text" placeholder="Receipt Id" value={form.receiptId} onChange={e => set('receiptId', e.target.value)} className={ic} />
        </div>
        <div>
          <label className={lc}>Remarks</label>
          <input type="text" placeholder="Remarks..." value={form.remarks} onChange={e => set('remarks', e.target.value)} className={ic} />
        </div>
      </div>

      {/* Upload Receipt */}
      <button type="button" className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded px-5 py-2 transition-colors">
        Upload Receipt
      </button>

      {/* Actions */}
      <div className="flex gap-3 pt-1 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-sm rounded-lg px-5 py-2 transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold text-sm rounded-lg px-6 py-2 transition-colors">
          Submit Expense
        </button>
      </div>
    </form>
  );
}

/* ── View Expenses ────────────────────────────────────────────────── */
type ExpStatus = 'Created' | 'Processed' | 'Verified' | 'Raised' | 'Returned' | 'Rejected' | 'Discarded';

const STATUS_META: Record<ExpStatus, { cls: string; dot: string }> = {
  Created:   { cls: 'bg-blue-50 text-blue-700 border border-blue-200',     dot: 'bg-blue-500'   },
  Processed: { cls: 'bg-green-50 text-green-700 border border-green-200',  dot: 'bg-green-500'  },
  Verified:  { cls: 'bg-amber-50 text-amber-700 border border-amber-200',  dot: 'bg-amber-400'  },
  Raised:    { cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200', dot: 'bg-indigo-400' },
  Returned:  { cls: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
  Rejected:  { cls: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  Discarded: { cls: 'bg-red-50 text-red-700 border border-red-200',         dot: 'bg-red-600'    },
};

interface ExpenseRow {
  id: string; date: string; partnerNo: string; clientName: string;
  fuelRechargeNo: string; fuelProvider: string; vehicle: string;
  amount: number; processingFee: number; submittedBy: string;
  paidBy: string; remarks: string; status: ExpStatus;
  requestedBy: string; finalAmount: number; expenseType: string;
}

const ALL_EXPENSES: ExpenseRow[] = [
  { id:'E001', date:'2026-06-11', partnerNo:'9880241816', clientName:'Britannia_0', fuelRechargeNo:'9880241816', fuelProvider:'BPCL', vehicle:'KA23D2220',  amount:1,    processingFee:0,   submittedBy:'6267731649232896', paidBy:'',          remarks:'',   status:'Created',   requestedBy:'partner_app', finalAmount:1,    expenseType:'Fuel Card' },
  { id:'E002', date:'2026-06-11', partnerNo:'8639501281', clientName:'Britannia_0', fuelRechargeNo:'8639501281', fuelProvider:'BPCL', vehicle:'HI09KA5678',  amount:5,    processingFee:0,   submittedBy:'6690325150040064', paidBy:'',          remarks:'Gg', status:'Created',   requestedBy:'partner_app', finalAmount:5,    expenseType:'Fuel Card' },
  { id:'E003', date:'2026-06-10', partnerNo:'8639501281', clientName:'Britannia_0', fuelRechargeNo:'8939189095', fuelProvider:'BPCL', vehicle:'NB678903',    amount:80,   processingFee:7.5, submittedBy:'6690325150040064', paidBy:'',          remarks:'',   status:'Created',   requestedBy:'partner_app', finalAmount:74,   expenseType:'Fuel Card' },
  { id:'E004', date:'2026-06-11', partnerNo:'9880241816', clientName:'Britannia_0', fuelRechargeNo:'9880241816', fuelProvider:'BPCL', vehicle:'KA562408',    amount:5000, processingFee:4,   submittedBy:'hrithik.ranjan_bang', paidBy:'',       remarks:'',   status:'Created',   requestedBy:'FO',          finalAmount:4800, expenseType:'Fuel Card' },
  { id:'E005', date:'2026-06-11', partnerNo:'9880241816', clientName:'Britannia_0', fuelRechargeNo:'9880241816', fuelProvider:'BPCL', vehicle:'KA562408',    amount:5000, processingFee:4,   submittedBy:'6267731649232896', paidBy:'',          remarks:'',   status:'Created',   requestedBy:'partner_app', finalAmount:4800, expenseType:'Fuel Card' },
  { id:'E006', date:'2026-06-09', partnerNo:'7760001234', clientName:'Flipkart_0',  fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'MH12AB3456',  amount:2000, processingFee:0,   submittedBy:'ops.team@lt.in',  paidBy:'FO',        remarks:'',   status:'Processed', requestedBy:'FO',          finalAmount:2000, expenseType:'Advance' },
  { id:'E007', date:'2026-06-09', partnerNo:'9910005678', clientName:'Amazon_0',    fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'DL01CA9988',  amount:450,  processingFee:0,   submittedBy:'raj.kumar@lt.in', paidBy:'partner_app', remarks:'Receipt attached', status:'Verified', requestedBy:'partner_app', finalAmount:450, expenseType:'Toll and Parking' },
  { id:'E008', date:'2026-06-08', partnerNo:'8820009871', clientName:'HUL_0',       fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'KA04MF7612',  amount:300,  processingFee:0,   submittedBy:'ops.team@lt.in',  paidBy:'',          remarks:'',   status:'Raised',    requestedBy:'FO',          finalAmount:300,  expenseType:'Toll' },
  { id:'E009', date:'2026-06-08', partnerNo:'7760001234', clientName:'Britannia_0', fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'MH12AB3456',  amount:500,  processingFee:0,   submittedBy:'priya.s@lt.in',   paidBy:'',          remarks:'LT penalty', status:'Rejected', requestedBy:'FO', finalAmount:0, expenseType:'Penalty' },
  { id:'E010', date:'2026-06-07', partnerNo:'6650012345', clientName:'Myntra_0',    fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'TN09CC4321',  amount:1500, processingFee:0,   submittedBy:'ops.team@lt.in',  paidBy:'FO',        remarks:'',   status:'Processed', requestedBy:'partner_app', finalAmount:1500, expenseType:'Incentive' },
  { id:'E011', date:'2026-06-07', partnerNo:'9910005678', clientName:'Amazon_0',    fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'DL01CA9988',  amount:800,  processingFee:0,   submittedBy:'raj.kumar@lt.in', paidBy:'',          remarks:'cash not deposited', status:'Returned', requestedBy:'FO', finalAmount:800, expenseType:'DS Collection' },
  { id:'E012', date:'2026-06-06', partnerNo:'8820009871', clientName:'HUL_0',       fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'KA04MF7612',  amount:600,  processingFee:0,   submittedBy:'priya.s@lt.in',   paidBy:'partner_app', remarks:'halting', status:'Verified', requestedBy:'partner_app', finalAmount:600, expenseType:'Retention Amount' },
  { id:'E013', date:'2026-06-06', partnerNo:'6650012345', clientName:'Myntra_0',    fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'TN09CC4321',  amount:1000, processingFee:0,   submittedBy:'ops.team@lt.in',  paidBy:'',          remarks:'',   status:'Discarded', requestedBy:'FO',          finalAmount:0,    expenseType:'Client Penalty' },
  { id:'E014', date:'2026-06-05', partnerNo:'9880241816', clientName:'Britannia_0', fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'KA23D2220',   amount:200,  processingFee:0,   submittedBy:'hrithik.ranjan_bang', paidBy:'FO',    remarks:'',   status:'Processed', requestedBy:'FO',          finalAmount:200,  expenseType:'Unloading Charges' },
  { id:'E015', date:'2026-06-05', partnerNo:'7760001234', clientName:'Flipkart_0',  fuelRechargeNo:'—',          fuelProvider:'—',    vehicle:'MH12AB3456',  amount:5000, processingFee:0,   submittedBy:'ops.team@lt.in',  paidBy:'',          remarks:'GPS deposit', status:'Raised', requestedBy:'partner_app', finalAmount:5000, expenseType:'GPS Security Deposit' },
];

type ColKey = 'date' | 'partnerNo' | 'clientName' | 'fuelRechargeNo' | 'fuelProvider' | 'vehicle' | 'amount' | 'processingFee' | 'submittedBy' | 'paidBy' | 'remarks' | 'status';
type ColFilters = Record<ColKey, string>;
const EMPTY_COL: ColFilters = { date:'', partnerNo:'', clientName:'', fuelRechargeNo:'', fuelProvider:'', vehicle:'', amount:'', processingFee:'', submittedBy:'', paidBy:'', remarks:'', status:'' };

const STATUS_BUBBLE: Record<ExpStatus, string> = {
  Created:'bg-blue-500 text-white', Processed:'bg-green-500 text-white', Verified:'bg-amber-400 text-white',
  Raised:'bg-indigo-500 text-white', Returned:'bg-purple-500 text-white', Rejected:'bg-orange-500 text-white', Discarded:'bg-red-600 text-white',
};

/* Small funnel SVG used in column headers */
function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`w-3 h-3 shrink-0 transition-colors ${active ? 'fill-brand-orange' : 'fill-slate-400 group-hover:fill-slate-600'}`}>
      <path d="M1.5 2h13l-5 6v5l-3-1.5V8L1.5 2z" />
    </svg>
  );
}

function ViewExpenses() {
  const [dateFrom, setDateFrom]               = useState('2026-06-01');
  const [dateTo, setDateTo]                   = useState('2026-06-12');
  const [searchQ, setSearchQ]                 = useState('');
  const [selectedType, setSelectedType]       = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<ExpStatus[]>([]);
  const [statusOpen, setStatusOpen]           = useState(false);
  const [colF, setColF]                       = useState<ColFilters>(EMPTY_COL);
  const [openCol, setOpenCol]                 = useState<ColKey | null>(null);
  const filterRef                             = useRef<HTMLDivElement>(null);
  const statusRef                             = useRef<HTMLDivElement>(null);

  /* Close open column filter and status dropdown on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setOpenCol(null);
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggleStatus(s: ExpStatus) {
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  const typesWithData = EXPENSE_TYPES.filter(et => ALL_EXPENSES.some(e => e.expenseType === et.name)).map(et => ({
    ...et,
    total: ALL_EXPENSES.filter(e => e.expenseType === et.name).length,
    statusCounts: (Object.keys(STATUS_META) as ExpStatus[]).reduce((acc, s) => {
      acc[s] = ALL_EXPENSES.filter(e => e.expenseType === et.name && e.status === s).length;
      return acc;
    }, {} as Record<ExpStatus, number>),
  }));

  function setCol(k: ColKey, v: string) { setColF(prev => ({ ...prev, [k]: v })); }

  const displayed = ALL_EXPENSES.filter(r => {
    if (selectedType && r.expenseType !== selectedType)           return false;
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.status)) return false;
    if (r.date < dateFrom || r.date > dateTo)                     return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (![r.partnerNo, r.clientName, r.vehicle, r.fuelRechargeNo, r.fuelProvider,
            r.submittedBy, r.paidBy, r.remarks, r.status, r.expenseType,
            r.amount.toString(), r.finalAmount.toString()].some(v => v.toLowerCase().includes(q))) return false;
    }
    const cf = colF;
    if (cf.date         && !r.date.includes(cf.date))                                                   return false;
    if (cf.partnerNo    && !r.partnerNo.toLowerCase().includes(cf.partnerNo.toLowerCase()))              return false;
    if (cf.clientName   && !r.clientName.toLowerCase().includes(cf.clientName.toLowerCase()))           return false;
    if (cf.fuelRechargeNo && !r.fuelRechargeNo.toLowerCase().includes(cf.fuelRechargeNo.toLowerCase())) return false;
    if (cf.fuelProvider && !r.fuelProvider.toLowerCase().includes(cf.fuelProvider.toLowerCase()))       return false;
    if (cf.vehicle      && !r.vehicle.toLowerCase().includes(cf.vehicle.toLowerCase()))                 return false;
    if (cf.amount       && !r.amount.toString().includes(cf.amount))                                    return false;
    if (cf.processingFee && !r.processingFee.toString().includes(cf.processingFee))                     return false;
    if (cf.submittedBy  && !r.submittedBy.toLowerCase().includes(cf.submittedBy.toLowerCase()))         return false;
    if (cf.paidBy       && !r.paidBy.toLowerCase().includes(cf.paidBy.toLowerCase()))                   return false;
    if (cf.remarks      && !r.remarks.toLowerCase().includes(cf.remarks.toLowerCase()))                 return false;
    if (cf.status       && !r.status.toLowerCase().includes(cf.status.toLowerCase()))                   return false;
    return true;
  });

  function reset() {
    setDateFrom('2026-06-01'); setDateTo('2026-06-12');
    setSearchQ(''); setSelectedType(null); setSelectedStatuses([]); setColF(EMPTY_COL); setOpenCol(null);
  }

  const anyColFilter = Object.values(colF).some(Boolean);

  /* Render a column header with funnel icon — clicking icon toggles inline input */
  function ColHeader({ label, k, isStatus = false }: { label: string; k: ColKey; isStatus?: boolean }) {
    const active = !!colF[k];
    const open   = openCol === k;
    return (
      <th className="px-3 py-0 font-semibold text-slate-600 text-xs whitespace-nowrap">
        <div className="flex flex-col">
          <div className="flex items-center gap-1 py-2.5">
            <span>{label}</span>
            <button
              onClick={e => { e.stopPropagation(); setOpenCol(open ? null : k); }}
              className="group ml-0.5 p-0.5 rounded hover:bg-slate-200 transition-colors shrink-0"
              title={`Filter by ${label}`}
            >
              <FunnelIcon active={active} />
            </button>
          </div>
          {open && (
            <div ref={filterRef} className="pb-1.5">
              {isStatus ? (
                <select value={colF[k]} onChange={e => setCol(k, e.target.value)}
                  className="w-full px-1 py-1 text-[10px] border border-brand-orange/50 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange/50 text-slate-600 min-w-[90px]">
                  <option value="">All</option>
                  {(Object.keys(STATUS_META) as ExpStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input autoFocus type="text" value={colF[k]} onChange={e => setCol(k, e.target.value)}
                  placeholder={`Filter…`}
                  className="w-full px-1.5 py-1 text-[10px] border border-brand-orange/50 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-orange/50 placeholder-slate-300 min-w-[80px]" />
              )}
            </div>
          )}
        </div>
      </th>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Top filter bar ── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs w-32 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs w-32 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        <div className="relative shrink-0 flex-1 min-w-[180px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">🔍</span>
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by anything…"
            className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange" />
        </div>
        {/* ── Status multi-select dropdown ── */}
        <div ref={statusRef} className="relative shrink-0">
          <button
            onClick={() => setStatusOpen(o => !o)}
            className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              selectedStatuses.length > 0
                ? 'border-brand-orange text-brand-orange bg-orange-50'
                : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Status
            {selectedStatuses.length > 0 && (
              <span className="bg-brand-orange text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {selectedStatuses.length}
              </span>
            )}
            <svg className={`w-3 h-3 transition-transform ${statusOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {statusOpen && (
            <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[170px] py-1 overflow-hidden">
              {(Object.keys(STATUS_META) as ExpStatus[]).map(s => {
                const checked = selectedStatuses.includes(s);
                return (
                  <label key={s} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStatus(s)}
                      className="accent-brand-orange w-3.5 h-3.5 shrink-0"
                    />
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_META[s].dot}`} />
                    <span className="text-xs text-slate-700">{s}</span>
                  </label>
                );
              })}
              {selectedStatuses.length > 0 && (
                <div className="border-t border-slate-100 px-3 py-1.5">
                  <button onClick={() => setSelectedStatuses([])} className="text-[11px] text-brand-orange font-semibold hover:underline">
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-semibold rounded-lg px-4 py-1.5 transition-colors shrink-0">
          Search
        </button>
        <button className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12v6m0 0l-3-3m3 3l3-3M12 4v4" />
          </svg>
          Export {displayed.length > 0 && <span className="bg-slate-200 rounded px-1 text-[10px] font-bold">{displayed.length}</span>}
        </button>
        <button onClick={reset} className="border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors shrink-0">
          Reset
        </button>
        {anyColFilter && (
          <span className="text-[10px] text-brand-orange font-semibold shrink-0">
            {Object.values(colF).filter(Boolean).length} column filter{Object.values(colF).filter(Boolean).length > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      {/* ── Body: left panel + table ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Expense Types panel ── */}
        <div className="w-48 shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Expense Types</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <button onClick={() => setSelectedType(null)}
              className={`w-full text-left px-3 py-2.5 border-b border-slate-100 flex items-center justify-between transition-colors ${
                selectedType === null ? 'bg-slate-50 border-l-2 border-l-brand-navy' : 'border-l-2 border-l-transparent hover:bg-slate-50'
              }`}>
              <span className="text-xs font-semibold text-slate-700">All</span>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5">{ALL_EXPENSES.length}</span>
            </button>
            {typesWithData.map(et => {
              const active  = selectedType === et.name;
              const nonZero = (Object.entries(et.statusCounts) as [ExpStatus, number][]).filter(([, n]) => n > 0);
              return (
                <button key={et.name} onClick={() => setSelectedType(active ? null : et.name)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 transition-colors ${
                    active ? 'bg-slate-50 border-l-2 border-l-brand-navy' : 'border-l-2 border-l-transparent hover:bg-slate-50'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium leading-tight ${active ? 'text-brand-navy' : 'text-slate-700'}`}>{et.name}</span>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 shrink-0 ml-1">{et.total}</span>
                  </div>
                  {nonZero.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {nonZero.map(([s, n]) => (
                        <span key={s} title={s}
                          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${STATUS_BUBBLE[s]}`}>
                          {n}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: Table area ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-left align-top">
                      <ColHeader label="Date"               k="date" />
                      <ColHeader label="Partner No"         k="partnerNo" />
                      <ColHeader label="Client Name"        k="clientName" />
                      <ColHeader label="Fuel Recharge No"   k="fuelRechargeNo" />
                      <ColHeader label="Fuel Provider"      k="fuelProvider" />
                      <ColHeader label="Vehicle"            k="vehicle" />
                      <ColHeader label="Amount (Rs)"        k="amount" />
                      <ColHeader label="Processing Fee (%)" k="processingFee" />
                      <ColHeader label="Submitted By"       k="submittedBy" />
                      <ColHeader label="Paid By"            k="paidBy" />
                      <ColHeader label="Remarks"            k="remarks" />
                      <ColHeader label="Status"             k="status" isStatus />
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-16 text-slate-400 text-sm">
                          <div className="text-2xl mb-2">🔍</div>
                          No expenses match your filters.
                          <button onClick={reset} className="block mx-auto mt-2 text-brand-orange text-xs font-semibold hover:underline">Reset filters</button>
                        </td>
                      </tr>
                    ) : displayed.map((r, i) => (
                      <tr key={r.id} className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-slate-800">{r.partnerNo}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{r.clientName}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{r.fuelRechargeNo}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.fuelProvider}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-slate-700">{r.vehicle}</td>
                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-800">{r.amount.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{r.processingFee > 0 ? r.processingFee : '0.00'}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[140px] truncate" title={r.submittedBy}>{r.submittedBy}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{r.paidBy || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-400 max-w-[120px] truncate" title={r.remarks}>{r.remarks || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block text-[10px] rounded-full px-2.5 py-0.5 font-semibold border ${STATUS_META[r.status].cls}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Status legend (bottom bar) ── */}
          <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center gap-4 flex-wrap">
            {(Object.entries(STATUS_META) as [ExpStatus, {cls:string;dot:string}][]).map(([s, m]) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`w-3 h-3 rounded-sm inline-block ${m.dot}`} />{s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function AddExpenses() {
  const [tab, setTab]               = useState<'create' | 'view'>('create');
  const [headerType, setHeaderType] = useState('');
  const [panelType, setPanelType]   = useState('');
  const [panelOpen, setPanelOpen]   = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [toast, setToast]           = useState(false);
  const formRef                     = useRef<HTMLDivElement>(null);

  function handleAddClick() {
    if (!headerType) return;
    setExpandedRow(null);
    setPanelType(headerType);
    setPanelOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function closePanel() {
    setPanelOpen(false);
    setPanelType('');
    setHeaderType('');
  }

  function handleRowClick(name: string) {
    if (expandedRow === name) { setExpandedRow(null); return; }
    setPanelOpen(false);
    setPanelType('');
    setExpandedRow(name);
  }

  function handleSubmit() {
    setPanelOpen(false);
    setPanelType('');
    setHeaderType('');
    setExpandedRow(null);
    setToast(true);
    setTimeout(() => setToast(false), 3500);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 flex flex-col">
        <div className="flex items-center justify-between gap-4 pt-3 pb-2">
          <h1 className="text-base font-bold text-slate-800 shrink-0">Driver Expenses</h1>
          {tab === 'create' && (
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={headerType}
                onChange={e => { setHeaderType(e.target.value); setPanelOpen(false); }}
                className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange min-w-[200px]"
              >
                <option value="">Select type…</option>
                {EXPENSE_TYPES.map(et => (
                  <option key={et.name} value={et.name}>{et.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddClick}
                disabled={!headerType}
                className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition-colors shadow-sm shrink-0"
              >
                + Add Expense
              </button>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-0">
          {(['create', 'view'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-brand-orange text-brand-orange'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'create' ? 'Create Expenses' : 'View Expenses'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium rounded-lg px-5 py-3 shadow-lg flex items-center gap-2">
          ✓ Expense submitted successfully.
        </div>
      )}

      {/* ── View Expenses tab ── */}
      {tab === 'view' && <ViewExpenses />}

      {tab === 'create' && <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-5xl">

        {/* ── Inline form panel (Add Expense button) ── */}
        {panelOpen && (
          <div ref={formRef} className="bg-white rounded-xl border border-brand-orange/30 shadow-sm overflow-hidden">
            <div className="bg-brand-navy px-5 py-3 flex items-center gap-3">
              <span className="text-white font-semibold text-sm">New Expense</span>
              <span className="text-slate-400 text-xs">— fill the details below</span>
            </div>
            <div className="p-5">
              <ExpenseForm
                initialType={panelType}
                onSubmit={handleSubmit}
                onCancel={closePanel}
              />
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        <div className="flex items-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Adds to monthly salary</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Deducted from monthly salary</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> No salary adjustment</span>
        </div>

        {/* ── Reference table ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600 w-48">Expense Type</th>
                <th className="px-5 py-3 font-semibold text-slate-600">When To Use?</th>
                <th className="px-5 py-3 font-semibold text-slate-600 w-56">What Will Happen?</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {EXPENSE_TYPES.map((et, i) => {
                const meta = EFFECT_META[et.effect];
                const expanded = expandedRow === et.name;
                return (
                  <Fragment key={et.name}>
                    <tr
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer ${i % 2 === 1 && !expanded ? 'bg-slate-50/40' : ''} ${expanded ? 'bg-orange-50/40 border-brand-orange/20' : ''}`}
                      onClick={() => handleRowClick(et.name)}
                    >
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded px-2.5 py-1 text-xs font-semibold ${meta.pillCls}`}>
                          {et.name}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{et.whenToUse}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block text-xs rounded-full px-2.5 py-0.5 font-medium ${meta.badgeCls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-semibold transition-all ${expanded ? 'text-brand-orange' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                          {expanded ? '▲ Close' : 'Use →'}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded inline form */}
                    {expanded && (
                      <tr key={`${et.name}-form`} className="border-b border-brand-orange/30">
                        <td colSpan={4} className="p-0">
                          <div className="mx-4 my-3 rounded-xl border-2 border-brand-orange/50 bg-orange-50/30 shadow-sm">
                            <div className="bg-brand-orange/10 border-b border-brand-orange/20 px-5 py-2.5 flex items-center gap-2 rounded-t-xl">
                              <span className={`inline-block rounded px-2.5 py-1 text-xs font-semibold ${meta.pillCls}`}>{et.name}</span>
                              <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium border ${meta.badgeCls}`}>{meta.label}</span>
                              <span className="ml-2 text-xs text-slate-500 italic">Fill in the details below to submit this expense</span>
                            </div>
                            <div className="px-5 py-4">
                          <ExpenseForm
                            initialType={et.name}
                            onSubmit={handleSubmit}
                            onCancel={() => setExpandedRow(null)}
                          />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>}
    </div>
  );
}
