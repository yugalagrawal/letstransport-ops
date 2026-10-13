import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ltLogo from '../assets/lt-logo.jpeg';
import { clearUser, ROLE_LABELS } from '../hooks/useAuth';
import type { AuthUser, Role } from '../hooks/useAuth';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  SALES: [
    { path: '/client-onboarding', label: 'Client Onboarding', icon: '📋' },
    { path: '/msa-ratecard',      label: 'MSA / Rate Card',   icon: '📄' },
  ],
  OPS: [
    { path: '/dashboard',         label: 'Dashboard',         icon: '⊞' },
  ],
  ADMIN: [
    { path: '/permissions-admin', label: 'Permissions',       icon: '🔐' },
  ],
  Sales_admin: [
    { path: '/client-approvals',  label: 'Client Approvals',  icon: '✦' },
    { path: '/msa-ratecard',      label: 'MSA / Rate Card',   icon: '📄' },
    { path: '/sales-dashboard',   label: 'My Dashboard',      icon: '📊' },
  ],
  BizFin_admin: [
    { path: '/msa-ratecard',      label: 'MSA / Rate Card',   icon: '📄' },
    { path: '/pod-metadata',      label: 'POD Metadata++',    icon: '📦' },
    { path: '/invoice-metadata',  label: 'Invoice Metadata',  icon: '🧾' },
    { path: '/mis',               label: 'MIS Template',      icon: '📊' },
    { path: '/sales-dashboard',   label: 'My Dashboard',      icon: '📊' },
  ],
  OPM: [
    { path: '/opm-dashboard',     label: 'Home - My Dashboard', icon: '🏠' },
    { path: '/opm-approvals',     label: 'Client Activation',   icon: '✦'  },
    { path: '/opm-clients',       label: 'My Activated Clients', icon: '🏢' },
    { path: '/create-bookings',   label: 'Create Bookings',     icon: '📦' },
    { path: '/attendance-intra',  label: 'Attendance (Intra)',  icon: '📋' },
    { path: '/listing-dashboard', label: 'Listing Dashboard',   icon: '📊' },
    { path: '/my-trips',          label: 'My Trips Dashboard',  icon: '🗺️' },
  ],
  FieldOps: [
    { path: '/attendance-intra',         label: 'Attendance (Intra)',   icon: '📋' },
  ],
  CDE_UPC: [
    { path: '/bidding-loads', label: 'Bidding Loads', icon: '🚚' },
  ],
  CRE: [
    { path: '/bidding-loads', label: 'Bidding Loads', icon: '🚚' },
  ],
  Tripsheet_exec: [
    { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
  ],
  Payment_exec: [
    { path: '/add-expenses', label: 'Add Expenses', icon: '₹' },
  ],
  FQLC: [
    { path: '/verification-dashboard', label: 'Verification Dashboard', icon: '✔' },
  ],
};

interface SidebarProps {
  user: AuthUser;
  onOpenSearch: () => void;
}

export default function Sidebar({ user, onOpenSearch }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    clearUser();
    navigate('/login');
  }

  // Build grouped nav: one group per role, dedup paths across groups
  const allRoles = user.roles ?? [user.role];
  const seenPaths = new Set<string>();
  const groups: { role: Role; items: NavItem[] }[] = [];

  for (const role of allRoles) {
    const items = (NAV_BY_ROLE[role] ?? []).filter((item) => {
      if (seenPaths.has(item.path)) return false;
      seenPaths.add(item.path);
      return true;
    });
    if (items.length > 0) groups.push({ role, items });
  }

  const roleLabel = allRoles.length === 1
    ? (ROLE_LABELS[allRoles[0]] ?? allRoles[0])
    : allRoles.map(r => ROLE_LABELS[r] ?? r).join(', ');

  return (
    <aside
      className={`flex flex-col bg-brand-navy text-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      } min-h-screen shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-brand-navy-light">
        <img src={ltLogo} alt="LT" className="w-8 h-8 shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-sm leading-tight">
            letstransport<br />
            <span className="text-xs text-slate-400 font-normal">Ops Console</span>
          </span>
        )}
      </div>

      {/* Nav — grouped by role */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {groups.map(({ role, items }, gi) => (
          <div key={role} className={gi > 0 ? 'mt-3' : ''}>
            {/* Role group label */}
            {!collapsed && (
              <span className="block px-4 mb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                {ROLE_LABELS[role] ?? role}
              </span>
            )}
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-orange text-white font-medium'
                      : 'text-slate-300 hover:bg-brand-navy-light hover:text-white'
                  }`
                }
              >
                <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-brand-navy-light px-4 py-3 space-y-2">
        {!collapsed && (
          <div>
            <span className="block font-medium text-white text-xs truncate">{user.name}</span>
            <span className="block text-[10px] text-slate-500 truncate">{user.email}</span>
            <span className="block text-[10px] text-slate-400 mt-0.5 truncate" title={roleLabel}>
              {roleLabel}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white text-xs transition-colors"
            title="Logout"
          >
            {collapsed ? '⏏' : 'Logout'}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto text-slate-400 hover:text-white text-lg leading-none"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>
      </div>
    </aside>
  );
}
