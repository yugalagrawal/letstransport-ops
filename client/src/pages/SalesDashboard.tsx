import Header from '../components/Header';
import { getUser } from '../hooks/useAuth';

export default function SalesDashboard() {
  const role = getUser()?.role;
  const isSalesAdmin = role === 'Sales_admin';
  const isBizFin     = role === 'BizFin_admin';

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Header title="My Dashboard" />
      <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">

        {/* Personal metrics card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-12 max-w-lg w-full flex flex-col items-center text-center gap-4 shadow-sm">
          <span className="text-5xl">📊</span>
          <p className="text-xl font-bold text-brand-navy">Coming Soon</p>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
            {isBizFin
              ? 'Your finance performance hub — track MSA renewals, POD & invoice configurations, MIS submissions, and billing health across verticals, cities, and time periods — all in one place.'
              : 'Your personal performance hub — track clients onboarded, active & inactive verticals, and demand trends across days, weeks, and months — all in one place.'}
          </p>
        </div>

        {/* Sales Admin team card */}
        {isSalesAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 max-w-lg w-full flex flex-col items-center text-center gap-4 shadow-sm">
            <span className="text-5xl">👥</span>
            <p className="text-xl font-bold text-brand-navy">Team Performance — Coming Soon</p>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              A unified view of your team's output — monitor each Sales rep's onboarding activity,
              conversion rates, and vertical health to coach smarter and drive better results.
            </p>
          </div>
        )}

        {/* BizFin Admin team card */}
        {isBizFin && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 max-w-lg w-full flex flex-col items-center text-center gap-4 shadow-sm">
            <span className="text-5xl">👥</span>
            <p className="text-xl font-bold text-brand-navy">Team Performance — Coming Soon</p>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              A bird's-eye view of your team's finance operations — track contract approvals,
              metadata configurations, MIS compliance, and invoice accuracy across your team members.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
