import { useState, useRef } from 'react';

type EntityTab   = 'Driver' | 'Partner' | 'Vehicle' | 'Helper';
type StatusKey   = 'Created' | 'Uploaded' | 'Checks' | 'Submitted' | 'Rejected';
type DocStatus   = 'uploaded' | 'partial' | 'missing' | 'rejected';
type VehicleCheckRemark = 'rc_failed' | 'insurance_failed' | 'fitness_failed' | 'multiple_failed';
type BankStatus  = 'APPROVED' | 'PENDING' | 'REJECTED' | null;

/* ── Document types per section ── */
interface PersonalDoc {
  type:      string;            // e.g. "PAN Card"
  status:    'verified' | 'uploaded' | 'missing';
  panNumber?: string;
  dob?:       string;
  nameOnCard?: string;
}

interface BankDoc {
  type:           string;
  status:         'verified' | 'uploaded' | 'missing';
  accountNumber?: string;
  ifsc?:          string;
  bankName?:      string;
}

type CheckRemark = 'personal_failed' | 'penny_failed' | 'both_failed';

type ApprovalStatus = 'pending' | 'approved';

/* ── Vehicle-specific doc interfaces ── */
interface RcDoc {
  type: string;
  status: 'verified' | 'uploaded' | 'missing';
  regNumber?: string;
  ownerName?: string;
  vehicleClass?: string;
  expiryDate?: string;
}

interface InsuranceDoc {
  type: string;
  status: 'verified' | 'uploaded' | 'missing';
  policyNumber?: string;
  insurer?: string;
  expiryDate?: string;
}

interface FitnessDoc {
  type: string;
  status: 'verified' | 'uploaded' | 'missing';
  certNumber?: string;
  expiryDate?: string;
  issuedBy?: string;
}

interface VehicleRow {
  id: string;
  name?: string;
  city: string;
  mobile: string;
  createdOn: string;
  updatedOn: string;
  rcDocs: DocStatus;
  insuranceDocs: DocStatus;
  fitnessDocs: DocStatus;
  approvalStatus?: ApprovalStatus;
  submittedOn?: string;
  status: StatusKey;
  checkRemark?: VehicleCheckRemark;
  rcDocList?: RcDoc[];
  insuranceDocList?: InsuranceDoc[];
  fitnessDocList?: FitnessDoc[];
}

interface Row {
  id:             string;
  name?:          string;
  city:           string;
  mobile:         string;
  createdOn:      string;
  updatedOn:      string;
  personalDocs:   DocStatus;
  bankDocs:       DocStatus;
  bankStatus:     BankStatus;
  approvalStatus?: ApprovalStatus;
  submittedOn?:   string;
  status:       StatusKey;
  checkRemark?: CheckRemark;
  personalDocList?: PersonalDoc[];
  bankDocList?:     BankDoc[];
}

const MOCK_ROWS: Row[] = [
  // Created
  { id: '1',  name: undefined,               city: 'Bangalore', mobile: '1491004403', createdOn: '2 Jun',  updatedOn: '5 Jun',  personalDocs: 'missing',  bankDocs: 'missing',  bankStatus: null,       status: 'Created' },
  { id: '2',  name: undefined,               city: 'Bangalore', mobile: '3546282924', createdOn: '5 Jun',  updatedOn: '5 Jun',  personalDocs: 'missing',  bankDocs: 'missing',  bankStatus: null,       status: 'Created' },
  { id: '3',  name: 'Duraisamy Manikandan',  city: 'Bangalore', mobile: '2314567289', createdOn: '5 Jun',  updatedOn: '5 Jun',  personalDocs: 'missing',  bankDocs: 'missing',  bankStatus: null,       status: 'Created' },
  { id: '4',  name: undefined,               city: 'Bangalore', mobile: '9012345667', createdOn: '3 Jun',  updatedOn: '3 Jun',  personalDocs: 'missing',  bankDocs: 'missing',  bankStatus: null,       status: 'Created' },
  { id: '5',  name: 'Duraisamy Manikandan',  city: 'Bangalore', mobile: '9870456872', createdOn: '3 Jun',  updatedOn: '3 Jun',  personalDocs: 'missing',  bankDocs: 'missing',  bankStatus: null,       status: 'Created' },
  { id: '6',  name: 'Duraisamy Manikandan',  city: 'Bangalore', mobile: '4321890034', createdOn: '3 Jun',  updatedOn: '3 Jun',  personalDocs: 'missing',  bankDocs: 'missing',  bankStatus: null,       status: 'Created' },
  // Uploaded
  {
    id: '7', name: 'Duraisamy Manikandan', city: 'Bangalore', mobile: '1234567891',
    createdOn: '4 Jun', updatedOn: '5 Jun', personalDocs: 'uploaded', bankDocs: 'uploaded', bankStatus: 'APPROVED', status: 'Uploaded',
    personalDocList: [
      { type: 'PAN Card',  status: 'verified', panNumber: 'BNZPM2501F', dob: '16 Jul, 1986', nameOnCard: 'DURAISAMY MANIKANDAN' },
      { type: 'Aadhaar',   status: 'verified' },
    ],
    bankDocList: [
      { type: 'Bank Statement', status: 'verified', accountNumber: '****4532', ifsc: 'SBIN0001234', bankName: 'State Bank of India' },
    ],
  },
  {
    id: '8', name: 'Thulasi Raman Mut.', city: 'Bangalore', mobile: '9741887761',
    createdOn: '31 Jul', updatedOn: '28 May', personalDocs: 'partial', bankDocs: 'missing', bankStatus: null, status: 'Uploaded',
    personalDocList: [
      { type: 'PAN Card', status: 'uploaded', panNumber: 'ABCDE1234F', dob: '12 Mar, 1990', nameOnCard: 'THULASI RAMAN' },
      { type: 'Aadhaar',  status: 'missing' },
    ],
    bankDocList: [],
  },
  {
    id: '9', name: undefined, city: 'Bangalore', mobile: '4593911225',
    createdOn: '2 Mar', updatedOn: '8 May', personalDocs: 'uploaded', bankDocs: 'uploaded', bankStatus: 'APPROVED', status: 'Uploaded',
    personalDocList: [{ type: 'PAN Card', status: 'verified' }],
    bankDocList:     [{ type: 'Bank Statement', status: 'verified' }],
  },
  {
    id: '10', name: undefined, city: 'Bangalore', mobile: '1236926100',
    createdOn: '7 Jul', updatedOn: '8 May', personalDocs: 'uploaded', bankDocs: 'uploaded', bankStatus: 'PENDING', status: 'Uploaded',
    personalDocList: [{ type: 'PAN Card', status: 'verified' }],
    bankDocList:     [{ type: 'Bank Statement', status: 'uploaded' }],
  },
  {
    id: '11', name: 'Megha', city: 'Bangalore', mobile: '5568855566',
    createdOn: '22 Nov', updatedOn: '8 May', personalDocs: 'uploaded', bankDocs: 'partial', bankStatus: null, status: 'Uploaded',
    personalDocList: [{ type: 'PAN Card', status: 'verified' }],
    bankDocList:     [{ type: 'Bank Statement', status: 'uploaded' }],
  },
  // Checks
  {
    id: '12', name: 'Megha Patil', city: 'Bangalore', mobile: '7654321098',
    createdOn: '25 May', updatedOn: '4 Jun', personalDocs: 'rejected', bankDocs: 'uploaded', bankStatus: 'PENDING', status: 'Checks', checkRemark: 'personal_failed',
    personalDocList: [
      { type: 'PAN Card', status: 'uploaded', panNumber: 'ABCPQ5678R', dob: '4 Apr, 1995', nameOnCard: 'MEGHA PATIL' },
      { type: 'Aadhaar',  status: 'uploaded' },
    ],
    bankDocList: [{ type: 'Bank Statement', status: 'verified', accountNumber: '****7890', ifsc: 'HDFC0001234', bankName: 'HDFC Bank' }],
  },
  {
    id: '15', name: 'Ravi Shankar', city: 'Mumbai', mobile: '9988776655',
    createdOn: '22 May', updatedOn: '5 Jun', personalDocs: 'uploaded', bankDocs: 'rejected', bankStatus: 'REJECTED', status: 'Checks', checkRemark: 'penny_failed',
    personalDocList: [
      { type: 'PAN Card', status: 'verified', panNumber: 'BCRSH4321T', dob: '12 Dec, 1988', nameOnCard: 'RAVI SHANKAR' },
      { type: 'Aadhaar',  status: 'verified' },
    ],
    bankDocList: [{ type: 'Bank Statement', status: 'uploaded', accountNumber: '****2233', ifsc: 'ICIC0005678', bankName: 'ICICI Bank' }],
  },
  {
    id: '16', name: 'Sunita Krishnan', city: 'Delhi', mobile: '8877665544',
    createdOn: '20 May', updatedOn: '6 Jun', personalDocs: 'rejected', bankDocs: 'rejected', bankStatus: 'REJECTED', status: 'Checks', checkRemark: 'both_failed',
    personalDocList: [
      { type: 'PAN Card', status: 'uploaded', panNumber: 'CDSUN9900K', dob: '20 Aug, 1992', nameOnCard: 'SUNITA KRISHNAN' },
    ],
    bankDocList: [{ type: 'Bank Statement', status: 'uploaded', accountNumber: '****5566', ifsc: 'AXIS0009012', bankName: 'Axis Bank' }],
  },
  // Submitted
  { id: '13', name: 'Arjun Menon', city: 'Hyderabad', mobile: '6543210987', createdOn: '20 May', updatedOn: '3 Jun', personalDocs: 'uploaded', bankDocs: 'uploaded', bankStatus: 'APPROVED', status: 'Submitted', approvalStatus: 'approved', submittedOn: '7 Jun' },
  // Rejected
  { id: '14', name: 'Kavya Reddy',  city: 'Chennai',   mobile: '5432109876', createdOn: '15 May', updatedOn: '2 Jun',  personalDocs: 'rejected', bankDocs: 'rejected', bankStatus: 'REJECTED', status: 'Rejected'  },
];

const VEHICLE_MOCK_ROWS: VehicleRow[] = [
  // Created
  { id: 'v1', name: undefined,        city: 'Bangalore', mobile: '9876543210', createdOn: '1 Jun', updatedOn: '5 Jun', rcDocs: 'missing', insuranceDocs: 'missing', fitnessDocs: 'missing', status: 'Created' },
  { id: 'v2', name: 'KA-01-AB-1234',  city: 'Bangalore', mobile: '8765432109', createdOn: '3 Jun', updatedOn: '5 Jun', rcDocs: 'missing', insuranceDocs: 'missing', fitnessDocs: 'missing', status: 'Created' },
  { id: 'v3', name: 'MH-02-CD-5678',  city: 'Mumbai',    mobile: '7654321098', createdOn: '4 Jun', updatedOn: '6 Jun', rcDocs: 'missing', insuranceDocs: 'missing', fitnessDocs: 'missing', status: 'Created' },
  // Uploaded
  {
    id: 'v4', name: 'KA-03-EF-9012', city: 'Bangalore', mobile: '6543210987',
    createdOn: '1 Jun', updatedOn: '5 Jun', rcDocs: 'uploaded', insuranceDocs: 'uploaded', fitnessDocs: 'uploaded', status: 'Uploaded',
    rcDocList: [{ type: 'RC Book', status: 'verified', regNumber: 'KA03EF9012', ownerName: 'Ramesh Kumar', vehicleClass: 'LMV-Goods', expiryDate: '31 Dec 2028' }],
    insuranceDocList: [{ type: 'Insurance Policy', status: 'verified', policyNumber: 'POL-2024-789012', insurer: 'ICICI Lombard', expiryDate: '15 Aug 2025' }],
    fitnessDocList: [{ type: 'Fitness Certificate', status: 'verified', certNumber: 'FC-2024-KA-112', expiryDate: '20 Mar 2026', issuedBy: 'RTO Bangalore North' }],
  },
  {
    id: 'v5', name: 'TN-04-GH-3456', city: 'Chennai', mobile: '5432109876',
    createdOn: '2 Jun', updatedOn: '4 Jun', rcDocs: 'partial', insuranceDocs: 'missing', fitnessDocs: 'missing', status: 'Uploaded',
    rcDocList: [{ type: 'RC Book', status: 'uploaded', regNumber: 'TN04GH3456', ownerName: 'Suresh Babu' }],
    insuranceDocList: [],
    fitnessDocList: [],
  },
  {
    id: 'v6', name: 'DL-05-IJ-7890', city: 'Delhi', mobile: '4321098765',
    createdOn: '28 May', updatedOn: '3 Jun', rcDocs: 'uploaded', insuranceDocs: 'uploaded', fitnessDocs: 'uploaded', status: 'Uploaded',
    rcDocList: [{ type: 'RC Book', status: 'verified', regNumber: 'DL05IJ7890', ownerName: 'Vikram Singh', vehicleClass: 'HMV-Goods', expiryDate: '10 Sep 2030' }],
    insuranceDocList: [{ type: 'Insurance Policy', status: 'uploaded', policyNumber: 'POL-2024-456789', insurer: 'New India Assurance', expiryDate: '1 Nov 2025' }],
    fitnessDocList: [{ type: 'Fitness Certificate', status: 'uploaded', certNumber: 'FC-2024-DL-078', expiryDate: '5 Jun 2026' }],
  },
  // Checks
  {
    id: 'v7', name: 'AP-06-KL-2345', city: 'Hyderabad', mobile: '3210987654',
    createdOn: '22 May', updatedOn: '5 Jun', rcDocs: 'rejected', insuranceDocs: 'uploaded', fitnessDocs: 'uploaded', status: 'Checks', checkRemark: 'rc_failed',
    rcDocList: [{ type: 'RC Book', status: 'uploaded', regNumber: 'AP06KL2345', ownerName: 'Prasad Reddy' }],
    insuranceDocList: [{ type: 'Insurance Policy', status: 'verified', policyNumber: 'POL-2024-111222', insurer: 'Bajaj Allianz', expiryDate: '30 Jul 2025' }],
    fitnessDocList: [{ type: 'Fitness Certificate', status: 'verified', certNumber: 'FC-2024-AP-201', expiryDate: '12 Jan 2026' }],
  },
  {
    id: 'v8', name: 'GJ-07-MN-6789', city: 'Ahmedabad', mobile: '2109876543',
    createdOn: '20 May', updatedOn: '6 Jun', rcDocs: 'uploaded', insuranceDocs: 'rejected', fitnessDocs: 'rejected', status: 'Checks', checkRemark: 'multiple_failed',
    rcDocList: [{ type: 'RC Book', status: 'verified', regNumber: 'GJ07MN6789', ownerName: 'Haresh Patel' }],
    insuranceDocList: [{ type: 'Insurance Policy', status: 'uploaded', policyNumber: 'POL-2024-334455', insurer: 'HDFC Ergo', expiryDate: '20 Oct 2025' }],
    fitnessDocList: [{ type: 'Fitness Certificate', status: 'uploaded', certNumber: 'FC-2024-GJ-099' }],
  },
  // Submitted
  {
    id: 'v9', name: 'KA-08-OP-1357', city: 'Bangalore', mobile: '1098765432',
    createdOn: '18 May', updatedOn: '2 Jun', rcDocs: 'uploaded', insuranceDocs: 'uploaded', fitnessDocs: 'uploaded', status: 'Submitted', approvalStatus: 'approved', submittedOn: '6 Jun',
  },
  {
    id: 'v10', name: 'MH-09-QR-2468', city: 'Pune', mobile: '9087654321',
    createdOn: '15 May', updatedOn: '1 Jun', rcDocs: 'uploaded', insuranceDocs: 'uploaded', fitnessDocs: 'uploaded', status: 'Submitted', approvalStatus: 'pending', submittedOn: '7 Jun',
  },
  // Rejected
  {
    id: 'v11', name: 'RJ-10-ST-3579', city: 'Jaipur', mobile: '8076543210',
    createdOn: '10 May', updatedOn: '30 May', rcDocs: 'rejected', insuranceDocs: 'rejected', fitnessDocs: 'rejected', status: 'Rejected',
  },
];

const STATUS_TABS: StatusKey[] = ['Created', 'Uploaded', 'Checks', 'Submitted', 'Rejected'];

const STATUS_COLORS: Record<StatusKey, string> = {
  Created:   'bg-slate-400',
  Uploaded:  'bg-blue-500',
  Checks:    'bg-amber-500',
  Submitted: 'bg-indigo-500',
  Rejected:  'bg-red-500',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarColor(name: string) {
  const cols = ['bg-violet-500', 'bg-blue-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500', 'bg-amber-500'];
  return cols[name.charCodeAt(0) % cols.length];
}

function PinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} text-slate-400`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

/* ── Doc status icon ── */
function DocStatusIcon({ state, label = 'Personal\nDocuments' }: { state: DocStatus; label?: string }) {
  const [line1, line2] = label.split('\n');
  if (state === 'uploaded') return (
    <div className="flex flex-col items-center gap-1">
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] text-slate-400 leading-tight text-center">{line1}<br />{line2}</span>
    </div>
  );
  if (state === 'partial') return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base text-slate-500 font-light leading-none">+</span>
      <span className="text-[10px] text-slate-400 leading-tight text-center">{line1}<br />{line2}</span>
    </div>
  );
  if (state === 'rejected') return (
    <div className="flex flex-col items-center gap-1">
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] text-red-400 leading-tight text-center">{line1}<br />{line2}</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base text-slate-300 font-light leading-none">—</span>
      <span className="text-[10px] text-slate-300 leading-tight text-center">{line1}<br />{line2}</span>
    </div>
  );
}

function BankDocStatusIcon({ state }: { state: DocStatus }) {
  if (state === 'uploaded') return (
    <div className="flex flex-col items-center gap-1">
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] text-slate-400 leading-tight text-center">Bank Account<br />Documents</span>
    </div>
  );
  if (state === 'rejected') return (
    <div className="flex flex-col items-center gap-1">
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] text-red-400 leading-tight text-center">Bank Account<br />Documents</span>
    </div>
  );
  if (state === 'partial') return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base text-slate-500 font-light leading-none">+</span>
      <span className="text-[10px] text-slate-400 leading-tight text-center">Bank Account<br />Documents</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-base text-slate-400 font-light leading-none">—</span>
      <span className="text-[10px] text-slate-300 leading-tight text-center">Bank Account<br />Documents</span>
    </div>
  );
}

/* ── Review Dialog ── */
function ReviewDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const [docTab, setDocTab]   = useState<'personal' | 'bank'>('personal');
  const [activeDoc, setActiveDoc] = useState(0);

  const personalDocs = row.personalDocList ?? [];
  const bankDocs     = row.bankDocList     ?? [];
  const currentDocList = docTab === 'personal' ? personalDocs : bankDocs;
  const currentDoc     = currentDocList[activeDoc];

  const bankStatusColors: Record<string, string> = {
    APPROVED: 'text-emerald-600',
    PENDING:  'text-amber-600',
    REJECTED: 'text-red-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Dialog header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-1">
            {row.name ? (
              <>
                <div className={`w-9 h-9 rounded-full ${avatarColor(row.name)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  {initials(row.name)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-base uppercase">{row.name}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><PinIcon className="w-3.5 h-3.5" />{row.city}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
                      </svg>
                      {row.mobile}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <PinIcon />
                <span className="font-semibold">{row.city}</span>
                <span className="text-slate-400 font-mono text-sm">{row.mobile}</span>
              </div>
            )}
            <button className="ml-3 text-xs border border-slate-200 px-2.5 py-1 rounded-full text-slate-500 hover:bg-slate-50 transition-colors">
              History
            </button>
          </div>
          {row.bankStatus && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Bank Status</span>
              <span className={`font-bold ${bankStatusColors[row.bankStatus] ?? 'text-slate-600'}`}>{row.bankStatus}</span>
            </div>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors ml-4">
            Close
          </button>
        </div>

        {/* Check remark banner — shown only when row has a checkRemark */}
        {row.checkRemark && (() => {
          const cfg: Record<CheckRemark, { label: string; icon: string; cls: string }> = {
            personal_failed: { label: 'Personal Document Verification Failed', icon: '🪪', cls: 'bg-red-50 border-red-200 text-red-700' },
            penny_failed:    { label: 'Bank Account — Penny Testing Failed',   icon: '🏦', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            both_failed:     { label: 'Personal Document Verification Failed  ·  Bank Account Penny Testing Failed', icon: '⚠️', cls: 'bg-red-50 border-red-200 text-red-700' },
          };
          const c = cfg[row.checkRemark];
          return (
            <div className={`mx-6 my-3 px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-sm font-semibold ${c.cls}`}>
              <span className="text-base">{c.icon}</span>
              <span>Check Failed: {c.label}</span>
            </div>
          );
        })()}

        {/* Dialog body */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — document image viewer */}
          <div className="flex-1 border-r border-slate-100 flex flex-col bg-slate-50 overflow-hidden">
            {currentDoc ? (
              <>
                <div className="px-5 pt-4 pb-2">
                  <span className="text-sm font-semibold text-slate-700">{currentDoc.type}</span>
                </div>

                {/* Image area */}
                <div className="flex-1 relative mx-5 mb-3 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                  {/* Zoom / rotate controls */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                    {['🔍+', '🔍−', '↺', '↻'].map((icon, i) => (
                      <button key={i} className="w-7 h-7 bg-white/90 border border-slate-200 rounded-lg text-xs flex items-center justify-center hover:bg-slate-50 shadow-sm">
                        {icon}
                      </button>
                    ))}
                  </div>

                  {/* Document placeholder (in real app this would be an <img> from API) */}
                  <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-slate-300 select-none">
                    <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-400">{currentDoc.type} Image</span>
                    <span className="text-xs text-slate-300">Document preview loads from API</span>
                  </div>
                </div>

                {/* Thumbnail strip */}
                <div className="flex gap-2 px-5 pb-4 overflow-x-auto">
                  {currentDocList.map((doc, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDoc(i)}
                      className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        activeDoc === i ? 'border-brand-navy bg-brand-navy/5' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {doc.status === 'verified' || doc.status === 'uploaded' ? (
                        <div className="relative">
                          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {doc.status === 'verified' && (
                            <svg className="w-4 h-4 text-emerald-500 absolute -bottom-1 -right-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">No documents uploaded</div>
            )}
          </div>

          {/* RIGHT — doc tabs + extracted fields */}
          <div className="w-80 flex flex-col overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b border-slate-100">
              {(['personal', 'bank'] as const).map(tab => {
                const hasData = tab === 'personal' ? personalDocs.length > 0 : bankDocs.length > 0;
                const label   = tab === 'personal' ? 'Personal Documents' : 'Bank Account Documents';
                const active  = docTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setDocTab(tab); setActiveDoc(0); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3.5 text-xs font-medium transition-all border-b-2 ${
                      active ? 'border-brand-navy text-brand-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {hasData && (
                      <svg className={`w-3.5 h-3.5 ${active ? 'text-brand-navy' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Verification status banner */}
            {currentDoc && (currentDoc.status === 'verified' || currentDoc.status === 'uploaded') && (
              <div className={`mx-4 mt-4 py-2.5 rounded-xl text-center text-sm font-bold ${
                currentDoc.status === 'verified'
                  ? 'bg-brand-navy text-white'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {currentDoc.status === 'verified' ? `${currentDoc.type} Verified` : `${currentDoc.type} Uploaded`}
              </div>
            )}

            {/* Extracted fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {docTab === 'personal' && currentDoc && 'panNumber' in currentDoc && (
                <>
                  {currentDoc.panNumber && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">PAN Number</div>
                      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{currentDoc.panNumber}</div>
                    </div>
                  )}
                  {currentDoc.dob && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Date of Birth</div>
                      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {currentDoc.dob}
                      </div>
                    </div>
                  )}
                  {currentDoc.nameOnCard && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Name on PAN Card</div>
                      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{currentDoc.nameOnCard}</div>
                    </div>
                  )}
                  {!currentDoc.panNumber && !currentDoc.dob && (
                    <div className="text-xs text-slate-400 text-center pt-6">No extracted data available</div>
                  )}
                </>
              )}
              {docTab === 'bank' && currentDoc && 'accountNumber' in currentDoc && (
                <>
                  {currentDoc.accountNumber && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Account Number</div>
                      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{currentDoc.accountNumber}</div>
                    </div>
                  )}
                  {currentDoc.ifsc && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">IFSC Code</div>
                      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{currentDoc.ifsc}</div>
                    </div>
                  )}
                  {currentDoc.bankName && (
                    <div>
                      <div className="text-xs text-slate-400 mb-1">Bank Name</div>
                      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{currentDoc.bankName}</div>
                    </div>
                  )}
                </>
              )}
              {currentDocList.length === 0 && (
                <div className="text-xs text-slate-400 text-center pt-6">No documents in this section</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add Documents Modal (FQLC manually adds docs for a partner) ── */
type AddDocSection = 'personal' | 'bank';

function AddDocsModal({ row, initialSection, onClose }: {
  row: Row;
  initialSection: AddDocSection;
  onClose: () => void;
}) {
  const [section, setSection] = useState<AddDocSection>(initialSection);

  // Aadhaar Front
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarName,      setAadhaarName]      = useState('');
  const [aadhaarNumber,    setAadhaarNumber]    = useState('');
  const [aadhaarDob,       setAadhaarDob]       = useState('');
  const [aadhaarGender,    setAadhaarGender]    = useState('');

  // Aadhaar Back
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [aadhaarAddress,  setAadhaarAddress]  = useState('');
  const [aadhaarPincode,  setAadhaarPincode]  = useState('');

  // PAN
  const [panFile,    setPanFile]    = useState<File | null>(null);
  const [panNumber,  setPanNumber]  = useState('');
  const [panDob,     setPanDob]     = useState('');
  const [panName,    setPanName]    = useState('');

  // Bank
  const [bankFile,       setBankFile]       = useState<File | null>(null);
  const [accountNum,     setAccountNum]     = useState('');
  const [ifsc,           setIfsc]           = useState('');
  const [bankName,       setBankName]       = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');

  const aadhaarFrontRef = useRef<HTMLInputElement>(null);
  const aadhaarBackRef  = useRef<HTMLInputElement>(null);
  const panRef          = useRef<HTMLInputElement>(null);
  const bankRef         = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert('Documents submitted successfully! (API integration pending)');
    onClose();
  }

  const L = 'text-xs font-semibold text-slate-500 mb-1.5 block';
  const I = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition bg-white placeholder-slate-300';

  function FileUpload({ file, onFile, onClear, label, icon, inputRef }: {
    file: File | null; onFile: (f: File) => void; onClear: () => void;
    label: string; icon: string; inputRef: React.RefObject<HTMLInputElement>;
  }) {
    return (
      <div>
        <label className={L}>{label}</label>
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-brand-navy/40 rounded-xl px-4 py-4 text-center cursor-pointer transition-colors group"
        >
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-navy font-medium">
              <span>📄</span>{file.name}
              <button type="button" onClick={e => { e.stopPropagation(); onClear(); }} className="text-slate-400 hover:text-red-500 ml-1 text-xs">✕</button>
            </div>
          ) : (
            <>
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-sm text-slate-400 group-hover:text-brand-navy transition-colors">{label}</div>
              <div className="text-xs text-slate-300 mt-0.5">JPG, PNG or PDF · max 5MB</div>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  function DocCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">{title}</span>
          {badge && <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <div className="text-base font-bold text-slate-800">Add Documents</div>
            <div className="text-xs text-slate-400 mt-0.5">
              On behalf of <span className="font-semibold text-slate-600">{row.name ?? row.mobile}</span>
              &nbsp;·&nbsp;<span className="text-brand-orange font-semibold">FQLC Manual Entry</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none mt-0.5">✕</button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-slate-100 px-6 shrink-0">
          {(['personal', 'bank'] as AddDocSection[]).map(tab => (
            <button key={tab} onClick={() => setSection(tab)}
              className={`flex items-center gap-1.5 px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-all ${
                section === tab ? 'border-brand-navy text-brand-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {tab === 'personal' ? '🪪 Personal Documents' : '🏦 Bank Account Documents'}
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {section === 'personal' && (
            <>
              {/* 1. Aadhaar Front */}
              <DocCard title="Aadhaar Card — Front" badge="Required">
                <FileUpload
                  file={aadhaarFrontFile} onFile={setAadhaarFrontFile} onClear={() => setAadhaarFrontFile(null)}
                  label="Upload Aadhaar Front" icon="🪪" inputRef={aadhaarFrontRef}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={L}>Name</label>
                    <input className={I} placeholder="As on Aadhaar" value={aadhaarName} onChange={e => setAadhaarName(e.target.value)} />
                  </div>
                  <div>
                    <label className={L}>Aadhaar Number</label>
                    <input className={I} placeholder="XXXX XXXX XXXX" value={aadhaarNumber} onChange={e => setAadhaarNumber(e.target.value)} maxLength={14} />
                  </div>
                  <div>
                    <label className={L}>Date of Birth</label>
                    <input type="date" className={I} value={aadhaarDob} onChange={e => setAadhaarDob(e.target.value)} />
                  </div>
                  <div>
                    <label className={L}>Gender</label>
                    <select className={I} value={aadhaarGender} onChange={e => setAadhaarGender(e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </DocCard>

              {/* 2. Aadhaar Back */}
              <DocCard title="Aadhaar Card — Back" badge="Required">
                <FileUpload
                  file={aadhaarBackFile} onFile={setAadhaarBackFile} onClear={() => setAadhaarBackFile(null)}
                  label="Upload Aadhaar Back" icon="🪪" inputRef={aadhaarBackRef}
                />
                <div>
                  <label className={L}>Address</label>
                  <textarea className={I + ' resize-none'} rows={2} placeholder="Full address as on Aadhaar" value={aadhaarAddress} onChange={e => setAadhaarAddress(e.target.value)} />
                </div>
                <div>
                  <label className={L}>Pincode</label>
                  <input className={I} placeholder="e.g. 560001" value={aadhaarPincode} onChange={e => setAadhaarPincode(e.target.value)} maxLength={6} />
                </div>
              </DocCard>

              {/* 3. PAN Card */}
              <DocCard title="PAN Card" badge="Required">
                <FileUpload
                  file={panFile} onFile={setPanFile} onClear={() => setPanFile(null)}
                  label="Upload PAN Card" icon="💳" inputRef={panRef}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={L}>PAN Number</label>
                    <input className={I} placeholder="ABCDE1234F" value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} maxLength={10} />
                  </div>
                  <div>
                    <label className={L}>Date of Birth</label>
                    <input type="date" className={I} value={panDob} onChange={e => setPanDob(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={L}>Name on PAN Card</label>
                  <input className={I} placeholder="As printed on card" value={panName} onChange={e => setPanName(e.target.value.toUpperCase())} />
                </div>
              </DocCard>
            </>
          )}

          {section === 'bank' && (
            <DocCard title="Bank Account Details" badge="Required">
              <FileUpload
                file={bankFile} onFile={setBankFile} onClear={() => setBankFile(null)}
                label="Upload Bank Statement / Passbook / Cancelled Cheque" icon="🏦" inputRef={bankRef}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={L}>Account Number</label>
                  <input className={I} placeholder="e.g. 012345678901" value={accountNum} onChange={e => setAccountNum(e.target.value)} />
                </div>
                <div>
                  <label className={L}>IFSC Code</label>
                  <input className={I} placeholder="e.g. SBIN0001234" value={ifsc} onChange={e => setIfsc(e.target.value.toUpperCase())} maxLength={11} />
                </div>
                <div>
                  <label className={L}>Bank Name</label>
                  <input className={I} placeholder="e.g. State Bank of India" value={bankName} onChange={e => setBankName(e.target.value)} />
                </div>
                <div>
                  <label className={L}>Beneficiary Name</label>
                  <input className={I} placeholder="Account holder name" value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)} />
                </div>
              </div>
            </DocCard>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <p className="text-[10px] text-slate-400 leading-snug max-w-xs">
            📋 Submitting as <span className="font-semibold text-slate-500">FQLC</span>. This entry will be logged against your account.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition-colors bg-white">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="px-5 py-2 text-sm font-bold bg-brand-navy hover:bg-brand-navy/90 text-white rounded-lg transition-colors shadow-sm">
              Submit Documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vehicle Review Dialog ── */
type VehicleDocTab = 'rc' | 'insurance' | 'fitness';

function VehicleReviewDialog({ row, onClose }: { row: VehicleRow; onClose: () => void }) {
  const [docTab, setDocTab] = useState<VehicleDocTab>('rc');
  const [activeDoc, setActiveDoc] = useState(0);

  const rcDocs       = row.rcDocList       ?? [];
  const insuranceDocs = row.insuranceDocList ?? [];
  const fitnessDocs  = row.fitnessDocList   ?? [];

  const currentDocList = docTab === 'rc' ? rcDocs : docTab === 'insurance' ? insuranceDocs : fitnessDocs;
  const currentDoc     = currentDocList[activeDoc];

  const checkRemarkCfg: Record<VehicleCheckRemark, { label: string; icon: string; cls: string }> = {
    rc_failed:       { label: 'RC Verification Failed',                             icon: '📋', cls: 'bg-red-50 border-red-200 text-red-700' },
    insurance_failed:{ label: 'Insurance Document Verification Failed',             icon: '🛡️', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    fitness_failed:  { label: 'Fitness Certificate Verification Failed',            icon: '📄', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    multiple_failed: { label: 'Multiple Document Verifications Failed',             icon: '⚠️', cls: 'bg-red-50 border-red-200 text-red-700' },
  };

  const TABS: { key: VehicleDocTab; label: string; docs: (RcDoc | InsuranceDoc | FitnessDoc)[] }[] = [
    { key: 'rc',        label: 'RC',                   docs: rcDocs },
    { key: 'insurance', label: 'Insurance',             docs: insuranceDocs },
    { key: 'fitness',   label: 'Fitness Certificate',  docs: fitnessDocs },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-1">
            {row.name ? (
              <>
                <div className={`w-9 h-9 rounded-full ${avatarColor(row.name)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                  🚛
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-base uppercase">{row.name}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1"><PinIcon className="w-3.5 h-3.5" />{row.city}</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
                      </svg>
                      {row.mobile}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <PinIcon />
                <span className="font-semibold">{row.city}</span>
                <span className="text-slate-400 font-mono text-sm">{row.mobile}</span>
              </div>
            )}
            <button className="ml-3 text-xs border border-slate-200 px-2.5 py-1 rounded-full text-slate-500 hover:bg-slate-50 transition-colors">History</button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors ml-4">Close</button>
        </div>

        {/* Check remark banner */}
        {row.checkRemark && (() => {
          const c = checkRemarkCfg[row.checkRemark];
          return (
            <div className={`mx-6 my-3 px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-sm font-semibold ${c.cls}`}>
              <span className="text-base">{c.icon}</span>
              <span>Check Failed: {c.label}</span>
            </div>
          );
        })()}

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — image viewer */}
          <div className="flex-1 border-r border-slate-100 flex flex-col bg-slate-50 overflow-hidden">
            {currentDoc ? (
              <>
                <div className="px-5 pt-4 pb-2">
                  <span className="text-sm font-semibold text-slate-700">{currentDoc.type}</span>
                </div>
                <div className="flex-1 relative mx-5 mb-3 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                  <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                    {['🔍+', '🔍−', '↺', '↻'].map((icon, i) => (
                      <button key={i} className="w-7 h-7 bg-white/90 border border-slate-200 rounded-lg text-xs flex items-center justify-center hover:bg-slate-50 shadow-sm">{icon}</button>
                    ))}
                  </div>
                  <div className="w-full h-64 flex flex-col items-center justify-center gap-3 text-slate-300 select-none">
                    <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-400">{currentDoc.type} Image</span>
                    <span className="text-xs text-slate-300">Document preview loads from API</span>
                  </div>
                </div>
                <div className="flex gap-2 px-5 pb-4 overflow-x-auto">
                  {currentDocList.map((doc, i) => (
                    <button key={i} onClick={() => setActiveDoc(i)}
                      className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        activeDoc === i ? 'border-brand-navy bg-brand-navy/5' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {doc.status !== 'missing' ? (
                        <div className="relative">
                          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          {doc.status === 'verified' && (
                            <svg className="w-4 h-4 text-emerald-500 absolute -bottom-1 -right-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">No documents uploaded</div>
            )}
          </div>

          {/* Right — doc tabs + extracted fields */}
          <div className="w-80 flex flex-col overflow-hidden">
            <div className="flex border-b border-slate-100">
              {TABS.map(({ key, label, docs }) => (
                <button key={key} onClick={() => { setDocTab(key); setActiveDoc(0); }}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-3.5 text-xs font-medium transition-all border-b-2 ${
                    docTab === key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {docs.length > 0 && (
                    <svg className={`w-3.5 h-3.5 ${docTab === key ? 'text-brand-navy' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {label}
                </button>
              ))}
            </div>

            {currentDoc && (currentDoc.status === 'verified' || currentDoc.status === 'uploaded') && (
              <div className={`mx-4 mt-4 py-2.5 rounded-xl text-center text-sm font-bold ${
                currentDoc.status === 'verified' ? 'bg-brand-navy text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {currentDoc.status === 'verified' ? `${currentDoc.type} Verified` : `${currentDoc.type} Uploaded`}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {docTab === 'rc' && currentDoc && (() => {
                const d = currentDoc as RcDoc;
                return (
                  <>
                    {d.regNumber   && <FieldRow label="Registration Number" value={d.regNumber} />}
                    {d.ownerName   && <FieldRow label="Owner Name" value={d.ownerName} />}
                    {d.vehicleClass && <FieldRow label="Vehicle Class" value={d.vehicleClass} />}
                    {d.expiryDate  && <FieldRow label="Expiry Date" value={d.expiryDate} />}
                    {!d.regNumber && !d.ownerName && <div className="text-xs text-slate-400 text-center pt-6">No extracted data available</div>}
                  </>
                );
              })()}
              {docTab === 'insurance' && currentDoc && (() => {
                const d = currentDoc as InsuranceDoc;
                return (
                  <>
                    {d.policyNumber && <FieldRow label="Policy Number" value={d.policyNumber} />}
                    {d.insurer      && <FieldRow label="Insurer" value={d.insurer} />}
                    {d.expiryDate   && <FieldRow label="Expiry Date" value={d.expiryDate} />}
                    {!d.policyNumber && !d.insurer && <div className="text-xs text-slate-400 text-center pt-6">No extracted data available</div>}
                  </>
                );
              })()}
              {docTab === 'fitness' && currentDoc && (() => {
                const d = currentDoc as FitnessDoc;
                return (
                  <>
                    {d.certNumber  && <FieldRow label="Certificate Number" value={d.certNumber} />}
                    {d.expiryDate  && <FieldRow label="Expiry Date" value={d.expiryDate} />}
                    {d.issuedBy    && <FieldRow label="Issued By" value={d.issuedBy} />}
                    {!d.certNumber && !d.expiryDate && <div className="text-xs text-slate-400 text-center pt-6">No extracted data available</div>}
                  </>
                );
              })()}
              {currentDocList.length === 0 && (
                <div className="text-xs text-slate-400 text-center pt-6">No documents in this section</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-sm font-medium text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{value}</div>
    </div>
  );
}

/* ── Vehicle Add Docs Modal ── */
type VehicleAddDocSection = 'rc' | 'insurance' | 'fitness';

function VehicleAddDocsModal({ row, initialSection, onClose }: {
  row: VehicleRow;
  initialSection: VehicleAddDocSection;
  onClose: () => void;
}) {
  const [section, setSection] = useState<VehicleAddDocSection>(initialSection);

  // RC
  const [rcFile,       setRcFile]       = useState<File | null>(null);
  const [regNumber,    setRegNumber]    = useState('');
  const [ownerName,    setOwnerName]    = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [rcExpiry,     setRcExpiry]     = useState('');

  // Insurance
  const [insuranceFile,   setInsuranceFile]   = useState<File | null>(null);
  const [policyNumber,    setPolicyNumber]    = useState('');
  const [insurer,         setInsurer]         = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');

  // Fitness
  const [fitnessFile,   setFitnessFile]   = useState<File | null>(null);
  const [certNumber,    setCertNumber]    = useState('');
  const [fitnessExpiry, setFitnessExpiry] = useState('');
  const [issuedBy,      setIssuedBy]      = useState('');

  const rcRef       = useRef<HTMLInputElement>(null);
  const insRef      = useRef<HTMLInputElement>(null);
  const fitRef      = useRef<HTMLInputElement>(null);

  const L = 'text-xs font-semibold text-slate-500 mb-1.5 block';
  const I = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition bg-white placeholder-slate-300';

  function VehicleFileUpload({ file, onFile, onClear, label, icon, inputRef }: {
    file: File | null; onFile: (f: File) => void; onClear: () => void;
    label: string; icon: string; inputRef: React.RefObject<HTMLInputElement>;
  }) {
    return (
      <div>
        <label className={L}>{label}</label>
        <div onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-brand-navy/40 rounded-xl px-4 py-4 text-center cursor-pointer transition-colors group"
        >
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-navy font-medium">
              <span>📄</span>{file.name}
              <button type="button" onClick={e => { e.stopPropagation(); onClear(); }} className="text-slate-400 hover:text-red-500 ml-1 text-xs">✕</button>
            </div>
          ) : (
            <>
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-sm text-slate-400 group-hover:text-brand-navy transition-colors">{label}</div>
              <div className="text-xs text-slate-300 mt-0.5">JPG, PNG or PDF · max 5MB</div>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
        </div>
      </div>
    );
  }

  function DocCard({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">{title}</span>
          {badge && <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    );
  }

  const SECTION_TABS: { key: VehicleAddDocSection; label: string }[] = [
    { key: 'rc',        label: '📋 RC' },
    { key: 'insurance', label: '🛡️ Insurance' },
    { key: 'fitness',   label: '📄 Fitness Certificate' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div>
            <div className="text-base font-bold text-slate-800">Add Vehicle Documents</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Vehicle: <span className="font-semibold text-slate-600">{row.name ?? row.mobile}</span>
              &nbsp;·&nbsp;<span className="text-brand-orange font-semibold">FQLC Manual Entry</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none mt-0.5">✕</button>
        </div>

        <div className="flex border-b border-slate-100 px-6 shrink-0">
          {SECTION_TABS.map(t => (
            <button key={t.key} onClick={() => setSection(t.key)}
              className={`flex items-center gap-1.5 px-1 py-3 mr-5 text-sm font-medium border-b-2 transition-all ${
                section === t.key ? 'border-brand-navy text-brand-navy' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >{t.label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {section === 'rc' && (
            <DocCard title="Registration Certificate (RC)" badge="Required">
              <VehicleFileUpload file={rcFile} onFile={setRcFile} onClear={() => setRcFile(null)} label="Upload RC Book" icon="📋" inputRef={rcRef} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className={L}>Registration Number</label><input className={I} placeholder="e.g. KA01AB1234" value={regNumber} onChange={e => setRegNumber(e.target.value.toUpperCase())} /></div>
                <div><label className={L}>Owner Name</label><input className={I} placeholder="As on RC" value={ownerName} onChange={e => setOwnerName(e.target.value)} /></div>
                <div><label className={L}>Vehicle Class</label><input className={I} placeholder="e.g. LMV-Goods" value={vehicleClass} onChange={e => setVehicleClass(e.target.value)} /></div>
                <div><label className={L}>Expiry Date</label><input type="date" className={I} value={rcExpiry} onChange={e => setRcExpiry(e.target.value)} /></div>
              </div>
            </DocCard>
          )}
          {section === 'insurance' && (
            <DocCard title="Insurance Policy" badge="Required">
              <VehicleFileUpload file={insuranceFile} onFile={setInsuranceFile} onClear={() => setInsuranceFile(null)} label="Upload Insurance Document" icon="🛡️" inputRef={insRef} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className={L}>Policy Number</label><input className={I} placeholder="e.g. POL-2024-123456" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} /></div>
                <div><label className={L}>Insurer</label><input className={I} placeholder="e.g. ICICI Lombard" value={insurer} onChange={e => setInsurer(e.target.value)} /></div>
                <div><label className={L}>Expiry Date</label><input type="date" className={I} value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)} /></div>
              </div>
            </DocCard>
          )}
          {section === 'fitness' && (
            <DocCard title="Fitness Certificate" badge="Required">
              <VehicleFileUpload file={fitnessFile} onFile={setFitnessFile} onClear={() => setFitnessFile(null)} label="Upload Fitness Certificate" icon="📄" inputRef={fitRef} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className={L}>Certificate Number</label><input className={I} placeholder="e.g. FC-2024-KA-001" value={certNumber} onChange={e => setCertNumber(e.target.value)} /></div>
                <div><label className={L}>Expiry Date</label><input type="date" className={I} value={fitnessExpiry} onChange={e => setFitnessExpiry(e.target.value)} /></div>
                <div className="col-span-2"><label className={L}>Issued By (RTO)</label><input className={I} placeholder="e.g. RTO Bangalore North" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} /></div>
              </div>
            </DocCard>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <p className="text-[10px] text-slate-400 leading-snug max-w-xs">
            📋 Submitting as <span className="font-semibold text-slate-500">FQLC</span>. This entry will be logged against your account.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition-colors bg-white">Cancel</button>
            <button type="button" onClick={() => { alert('Documents submitted successfully! (API integration pending)'); onClose(); }} className="px-5 py-2 text-sm font-bold bg-brand-navy hover:bg-brand-navy/90 text-white rounded-lg transition-colors shadow-sm">Submit Documents</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function VerificationDashboard() {
  const [entity,    setEntity]    = useState<EntityTab>('Partner');
  const [status,    setStatus]    = useState<StatusKey>('Created');
  const [search,    setSearch]    = useState('');

  // Partner state
  const [rows,       setRows]       = useState<Row[]>(MOCK_ROWS);
  const [reviewing,  setReviewing]  = useState<Row | null>(null);
  const [addingDocs, setAddingDocs] = useState<{ row: Row; section: AddDocSection } | null>(null);

  // Vehicle state
  const [vehicleRows,        setVehicleRows]        = useState<VehicleRow[]>(VEHICLE_MOCK_ROWS);
  const [reviewingVehicle,   setReviewingVehicle]   = useState<VehicleRow | null>(null);
  const [addingVehicleDocs,  setAddingVehicleDocs]  = useState<{ row: VehicleRow; section: VehicleAddDocSection } | null>(null);

  function handleSubmitForApproval(rowId: string) {
    setRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, status: 'Submitted', approvalStatus: 'pending', submittedOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
        : r
    ));
  }

  function handleVehicleSubmitForApproval(rowId: string) {
    setVehicleRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, status: 'Submitted', approvalStatus: 'pending', submittedOn: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
        : r
    ));
  }

  const activeRows   = entity === 'Vehicle' ? vehicleRows : entity === 'Partner' ? rows : [];
  const counts = Object.fromEntries(
    STATUS_TABS.map(s => [s, activeRows.filter(r => r.status === s).length])
  ) as Record<StatusKey, number>;

  const filtered = activeRows.filter(r => {
    if (r.status !== status) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.mobile.includes(q) || (r.name?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">

      {/* Page header */}
      <div className="bg-white border-b border-slate-100 px-8 pt-5 pb-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Verification Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage document verification for partners, drivers &amp; vehicles</p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['Driver', 'Partner', 'Vehicle', 'Helper'] as EntityTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setEntity(tab)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  entity === tab ? 'bg-white text-brand-navy shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'Driver' ? '🧑‍✈️ Driver' : tab === 'Partner' ? '🤝 Partner' : tab === 'Vehicle' ? '🚛 Vehicle' : '🙋 Helper'}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs + search */}
        <div className="flex items-end justify-between">
          <div className="flex overflow-x-auto">
            {STATUS_TABS.map(tab => {
              const active = status === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatus(tab)}
                  className={`flex items-center gap-2 px-5 py-2.5 text-sm whitespace-nowrap border-b-2 transition-all ${
                    active ? 'border-brand-navy text-brand-navy font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[tab]} inline-block`} />
                  {tab}
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-brand-navy text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{counts[tab]}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 w-60 mb-1 bg-white">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or mobile…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm outline-none text-slate-700 placeholder-slate-400 w-full bg-transparent"
            />
            {search && <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">

        {/* ── Driver tab: discontinued notice ── */}
        {entity === 'Driver' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl">🚧</div>
            <div className="text-base font-semibold text-slate-600">Driver flow is discontinued, will be redesigned if required</div>
          </div>
        )}

        {/* ── Helper tab: coming soon ── */}
        {entity === 'Helper' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-5xl">🔧</div>
            <div className="text-base font-semibold text-slate-700">Helper Verification</div>
            <div className="text-sm text-slate-400">Coming soon, in development</div>
          </div>
        )}

        {/* ── Partner / Vehicle shared table ── */}
        {(entity === 'Partner' || entity === 'Vehicle') && (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <div className="text-5xl">🔍</div>
              <div className="text-base font-medium">No records found</div>
              <div className="text-sm">Try a different search or status tab</div>
            </div>
          ) : entity === 'Partner' ? (
            /* ── Partner Table ── */
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-8 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-64">Partner Name</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Partner Mobile</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created On</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Updated On</th>
                  <th className="text-center px-10 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Documents</th>
                  <th className="text-center px-10 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Account Documents</th>
                  {status === 'Uploaded'  && <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>}
                  {status === 'Checks'   && <th className="text-left   px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Check Remark</th>}
                  {status === 'Checks'   && <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>}
                  {status === 'Submitted' && <th className="text-left  px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted On</th>}
                  {status === 'Submitted' && <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Approval Status</th>}
                </tr>
              </thead>
              <tbody>
                {(filtered as Row[]).map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => (status === 'Uploaded' || status === 'Checks') ? setReviewing(row) : undefined}
                    className={`border-b border-slate-50 transition-colors ${
                      (status === 'Uploaded' || status === 'Checks') ? 'cursor-pointer hover:bg-slate-50/80' : ''
                    } ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-8 py-4">
                      {row.name ? (
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(row.name)} text-white text-xs font-bold flex items-center justify-center shrink-0`}>{initials(row.name)}</div>
                          <div>
                            <div className="font-semibold text-slate-800 uppercase text-xs tracking-wide">{row.name}</div>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><PinIcon className="w-3.5 h-3.5" />{row.city}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400"><PinIcon /><span className="text-sm">{row.city}</span></div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
                        </svg>
                        <span className="font-mono text-sm">{row.mobile}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-sm">{row.createdOn}</td>
                    <td className="px-4 py-4 text-slate-500 text-sm">{row.updatedOn}</td>
                    <td className="px-10 py-4 text-center" onClick={e => e.stopPropagation()}>
                      {status === 'Created' ? (
                        <button onClick={() => setAddingDocs({ row, section: 'personal' })} className="group flex flex-col items-center gap-1 mx-auto hover:scale-105 transition-transform">
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 group-hover:border-brand-navy flex items-center justify-center transition-colors">
                            <span className="text-slate-400 group-hover:text-brand-navy text-base font-light leading-none transition-colors">+</span>
                          </div>
                          <span className="text-[10px] text-slate-400 group-hover:text-brand-navy leading-tight text-center transition-colors">Add by FQLC</span>
                        </button>
                      ) : <DocStatusIcon state={row.personalDocs} />}
                    </td>
                    <td className="px-10 py-4 text-center" onClick={e => e.stopPropagation()}>
                      {status === 'Created' ? (
                        <button onClick={() => setAddingDocs({ row, section: 'bank' })} className="group flex flex-col items-center gap-1 mx-auto hover:scale-105 transition-transform">
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 group-hover:border-brand-navy flex items-center justify-center transition-colors">
                            <span className="text-slate-400 group-hover:text-brand-navy text-base font-light leading-none transition-colors">+</span>
                          </div>
                          <span className="text-[10px] text-slate-400 group-hover:text-brand-navy leading-tight text-center transition-colors">Add by FQLC</span>
                        </button>
                      ) : <BankDocStatusIcon state={row.bankDocs} />}
                    </td>
                    {status === 'Checks' && (() => {
                      const remarkMap: Record<CheckRemark, { label: string; color: string; icon: string }> = {
                        personal_failed: { label: 'Personal Document Verification Failed', color: 'text-red-600 bg-red-50 border-red-200', icon: '🪪' },
                        penny_failed:    { label: 'Bank Account — Penny Testing Failed',   color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '🏦' },
                        both_failed:     { label: 'Personal Doc & Penny Testing Failed',   color: 'text-red-700 bg-red-50 border-red-200', icon: '⚠️' },
                      };
                      const remark = row.checkRemark ? remarkMap[row.checkRemark] : null;
                      return (
                        <td className="px-6 py-4">
                          {remark ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${remark.color}`}>
                              <span>{remark.icon}</span>{remark.label}
                            </span>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      );
                    })()}
                    {status === 'Submitted' && <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">{row.submittedOn ?? '—'}</td>}
                    {status === 'Submitted' && (
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <ApprovalBadge status={row.approvalStatus} />
                      </td>
                    )}
                    {status === 'Checks' && (
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <ChecksActions />
                      </td>
                    )}
                    {status === 'Uploaded' && (() => {
                      const bothUploaded = row.personalDocs === 'uploaded' && row.bankDocs === 'uploaded';
                      const hasIssue = row.personalDocs === 'partial' || row.personalDocs === 'rejected' || row.bankDocs === 'partial' || row.bankDocs === 'rejected';
                      return (
                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-2">
                            <button disabled={!bothUploaded} onClick={e => { e.stopPropagation(); if (bothUploaded) handleSubmitForApproval(row.id); }}
                              className={`w-full text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${bothUploaded ? 'bg-brand-navy hover:bg-brand-navy/90 text-white shadow-sm' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                              Submit for Approval
                            </button>
                            <button disabled={!hasIssue}
                              onClick={e => { e.stopPropagation(); if (hasIssue) { const pFail = row.personalDocs === 'partial' || row.personalDocs === 'rejected'; const bFail = row.bankDocs === 'partial' || row.bankDocs === 'rejected'; setReviewing({ ...row, checkRemark: pFail && bFail ? 'both_failed' : pFail ? 'personal_failed' : 'penny_failed' }); } }}
                              className={`w-full text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap border ${hasIssue ? 'border-amber-400 text-amber-600 hover:bg-amber-50' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}>
                              View Checks
                            </button>
                          </div>
                        </td>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── Vehicle Table ── */
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 z-10">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-8 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-52">Vehicle Number</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Owner Mobile</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created On</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Updated On</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">RC</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Insurance</th>
                  <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Fitness Certificate</th>
                  {status === 'Uploaded'  && <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>}
                  {status === 'Checks'   && <th className="text-left   px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Check Remark</th>}
                  {status === 'Checks'   && <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>}
                  {status === 'Submitted' && <th className="text-left  px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Submitted On</th>}
                  {status === 'Submitted' && <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Approval Status</th>}
                </tr>
              </thead>
              <tbody>
                {(filtered as VehicleRow[]).map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => (status === 'Uploaded' || status === 'Checks') ? setReviewingVehicle(row) : undefined}
                    className={`border-b border-slate-50 transition-colors ${
                      (status === 'Uploaded' || status === 'Checks') ? 'cursor-pointer hover:bg-slate-50/80' : ''
                    } ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    {/* Vehicle number / city */}
                    <td className="px-8 py-4">
                      {row.name ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-base flex items-center justify-center shrink-0">🚛</div>
                          <div>
                            <div className="font-semibold text-slate-800 text-xs tracking-wide">{row.name}</div>
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><PinIcon className="w-3.5 h-3.5" />{row.city}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400"><PinIcon /><span className="text-sm">{row.city}</span></div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15h3" />
                        </svg>
                        <span className="font-mono text-sm">{row.mobile}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-sm">{row.createdOn}</td>
                    <td className="px-4 py-4 text-slate-500 text-sm">{row.updatedOn}</td>

                    {/* RC */}
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      {status === 'Created' ? (
                        <AddByFqlcButton onClick={() => setAddingVehicleDocs({ row, section: 'rc' })} />
                      ) : <DocStatusIcon state={row.rcDocs} label={'RC\nDocument'} />}
                    </td>
                    {/* Insurance */}
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      {status === 'Created' ? (
                        <AddByFqlcButton onClick={() => setAddingVehicleDocs({ row, section: 'insurance' })} />
                      ) : <DocStatusIcon state={row.insuranceDocs} label={'Insurance\nDocument'} />}
                    </td>
                    {/* Fitness */}
                    <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                      {status === 'Created' ? (
                        <AddByFqlcButton onClick={() => setAddingVehicleDocs({ row, section: 'fitness' })} />
                      ) : <DocStatusIcon state={row.fitnessDocs} label={'Fitness\nCertificate'} />}
                    </td>

                    {status === 'Checks' && (() => {
                      const vehicleRemarkMap: Record<VehicleCheckRemark, { label: string; color: string; icon: string }> = {
                        rc_failed:       { label: 'RC Verification Failed',                   color: 'text-red-600 bg-red-50 border-red-200',     icon: '📋' },
                        insurance_failed:{ label: 'Insurance Verification Failed',            color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '🛡️' },
                        fitness_failed:  { label: 'Fitness Certificate Verification Failed',  color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '📄' },
                        multiple_failed: { label: 'Multiple Document Verifications Failed',   color: 'text-red-700 bg-red-50 border-red-200',     icon: '⚠️' },
                      };
                      const remark = row.checkRemark ? vehicleRemarkMap[row.checkRemark] : null;
                      return (
                        <td className="px-6 py-4">
                          {remark ? (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${remark.color}`}>
                              <span>{remark.icon}</span>{remark.label}
                            </span>
                          ) : <span className="text-xs text-slate-300">—</span>}
                        </td>
                      );
                    })()}
                    {status === 'Submitted' && <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">{row.submittedOn ?? '—'}</td>}
                    {status === 'Submitted' && (
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <ApprovalBadge status={row.approvalStatus} />
                      </td>
                    )}
                    {status === 'Checks' && (
                      <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <ChecksActions />
                      </td>
                    )}
                    {status === 'Uploaded' && (() => {
                      const allUploaded = row.rcDocs === 'uploaded' && row.insuranceDocs === 'uploaded';
                      const hasIssue = row.rcDocs === 'partial' || row.rcDocs === 'rejected' || row.insuranceDocs === 'partial' || row.insuranceDocs === 'rejected' || row.fitnessDocs === 'partial' || row.fitnessDocs === 'rejected';
                      return (
                        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-2">
                            <button disabled={!allUploaded} onClick={e => { e.stopPropagation(); if (allUploaded) handleVehicleSubmitForApproval(row.id); }}
                              className={`w-full text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${allUploaded ? 'bg-brand-navy hover:bg-brand-navy/90 text-white shadow-sm' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                              Submit for Approval
                            </button>
                            <button disabled={!hasIssue}
                              onClick={e => { e.stopPropagation(); if (hasIssue) { const rcFail = row.rcDocs === 'partial' || row.rcDocs === 'rejected'; const insFail = row.insuranceDocs === 'partial' || row.insuranceDocs === 'rejected'; const fitFail = row.fitnessDocs === 'partial' || row.fitnessDocs === 'rejected'; const failCount = [rcFail, insFail, fitFail].filter(Boolean).length; const remark: VehicleCheckRemark = failCount > 1 ? 'multiple_failed' : rcFail ? 'rc_failed' : insFail ? 'insurance_failed' : 'fitness_failed'; setReviewingVehicle({ ...row, checkRemark: remark }); } }}
                              className={`w-full text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap border ${hasIssue ? 'border-amber-400 text-amber-600 hover:bg-amber-50' : 'border-slate-200 text-slate-300 cursor-not-allowed'}`}>
                              View Checks
                            </button>
                          </div>
                        </td>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Partner Review dialog */}
      {reviewing && <ReviewDialog row={reviewing} onClose={() => setReviewing(null)} />}
      {/* Partner Add docs modal */}
      {addingDocs && <AddDocsModal row={addingDocs.row} initialSection={addingDocs.section} onClose={() => setAddingDocs(null)} />}

      {/* Vehicle Review dialog */}
      {reviewingVehicle && <VehicleReviewDialog row={reviewingVehicle} onClose={() => setReviewingVehicle(null)} />}
      {/* Vehicle Add docs modal */}
      {addingVehicleDocs && <VehicleAddDocsModal row={addingVehicleDocs.row} initialSection={addingVehicleDocs.section} onClose={() => setAddingVehicleDocs(null)} />}
    </div>
  );
}

/* ── Shared small components ── */
function AddByFqlcButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1 mx-auto hover:scale-105 transition-transform">
      <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 group-hover:border-brand-navy flex items-center justify-center transition-colors">
        <span className="text-slate-400 group-hover:text-brand-navy text-base font-light leading-none transition-colors">+</span>
      </div>
      <span className="text-[10px] text-slate-400 group-hover:text-brand-navy leading-tight text-center transition-colors">Add by FQLC</span>
    </button>
  );
}

function ApprovalBadge({ status }: { status?: ApprovalStatus }) {
  if (status === 'approved') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" />
      </svg>
      Approved
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      Pending Approval
    </span>
  );
}

function ChecksActions() {
  return (
    <div className="flex flex-col items-center gap-2">
      <button className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap bg-brand-navy hover:bg-brand-navy/90 text-white shadow-sm">Edit &amp; Recheck</button>
      <button className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap border border-red-300 text-red-500 hover:bg-red-50">Reject</button>
    </div>
  );
}
