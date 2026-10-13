import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MasterSearch from './components/MasterSearch';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientApprovals from './pages/ClientApprovals';
import OPMApprovals      from './pages/OPMApprovals';
import OPMClients        from './pages/OPMClients';
import OPMDashboard     from './pages/OPMDashboard';
import CreateBookings    from './pages/CreateBookings';
import AttendanceIntra   from './pages/AttendanceIntra';
import MSARateCard       from './pages/MSARateCard';
import UnderConstruction from './pages/UnderConstruction';
import PODMetadata       from './pages/PODMetadata';
import InvoiceMetadata   from './pages/InvoiceMetadata';
import MISTemplate       from './pages/MISTemplate';
import SalesDashboard    from './pages/SalesDashboard';
import BiddingLoads            from './pages/BiddingLoads';
import VerificationDashboard  from './pages/VerificationDashboard';
import AddExpenses             from './pages/AddExpenses';
import ListingDashboard       from './pages/ListingDashboard';
import MyTripsDashboard        from './pages/MyTripsDashboard';
import PermissionsAdmin        from './pages/PermissionsAdmin';
import { getUser } from './hooks/useAuth';

function RequireAuth() {
  const user = getUser();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar user={user} onOpenSearch={() => setSearchOpen(true)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global topbar with centered search */}
        <div className="bg-brand-navy shrink-0 flex items-center px-6 py-2 gap-4">
          <div className="flex-1" />
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg px-4 py-1.5 text-slate-300 hover:text-white transition-colors w-[560px]"
          >
            <span className="text-sm opacity-70">🔍</span>
            <span className="flex-1 text-left text-xs">Search anything — clients, bookings, drivers, hubs, partners, approvals…</span>
            <kbd className="text-[9px] border border-white/20 rounded px-1.5 py-0.5 text-slate-400 bg-white/5 shrink-0">⌘K</kbd>
          </button>
          <div className="flex-1" />
        </div>
        <Outlet />
      </div>
      <MasterSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function DefaultRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SALES') return <Navigate to="/client-onboarding" replace />;
  if (user.role === 'Sales_admin') return <Navigate to="/client-approvals" replace />;
  if (user.role === 'BizFin_admin') return <Navigate to="/msa-ratecard" replace />;
  if (user.role === 'ADMIN')    return <Navigate to="/permissions-admin" replace />;
  if (user.role === 'OPM')      return <Navigate to="/opm-dashboard"    replace />;
  if (user.role === 'FieldOps') return <Navigate to="/attendance-intra"  replace />;
  if (user.role === 'CDE_UPC' || user.role === 'CRE') return <Navigate to="/bidding-loads" replace />;
  if (user.role === 'FQLC') return <Navigate to="/verification-dashboard" replace />;
  if (user.role === 'Payment_exec') return <Navigate to="/add-expenses" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/"                  element={<DefaultRedirect />} />
        <Route path="/dashboard"         element={<Dashboard />} />
        <Route path="/client-onboarding" element={<ClientOnboarding />} />
        <Route path="/client-approvals"  element={<ClientApprovals />} />
        <Route path="/opm-dashboard"     element={<OPMDashboard />} />
        <Route path="/opm-approvals"     element={<OPMApprovals />} />
        <Route path="/opm-clients"       element={<OPMClients />} />
        <Route path="/create-bookings"   element={<CreateBookings />} />
        <Route path="/attendance-intra"  element={<AttendanceIntra />} />
        <Route path="/msa-ratecard"      element={<MSARateCard />} />
        <Route path="/sales-dashboard"   element={<SalesDashboard />} />
        <Route path="/pod-metadata"      element={<PODMetadata />} />
        <Route path="/invoice-metadata"  element={<InvoiceMetadata />} />
        <Route path="/mis"               element={<MISTemplate />} />
        <Route path="/bidding-loads"            element={<BiddingLoads />} />
        <Route path="/verification-dashboard"  element={<VerificationDashboard />} />
        <Route path="/listing-dashboard"       element={<ListingDashboard />} />
        <Route path="/add-expenses"            element={<AddExpenses />} />
        <Route path="/my-trips"               element={<MyTripsDashboard />} />
        <Route path="/permissions-admin"      element={<PermissionsAdmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
