import Header from '../components/Header';
import { useDashboard } from '../hooks/useDashboard';
import type { KPI, Trip } from '../hooks/useDashboard';

const STATUS_STYLES: Record<Trip['status'], string> = {
  completed:  'bg-green-100 text-green-700',
  in_transit: 'bg-blue-100 text-blue-700',
  pending:    'bg-amber-100 text-amber-700',
};

const STATUS_LABELS: Record<Trip['status'], string> = {
  completed:  'Completed',
  in_transit: 'In Transit',
  pending:    'Pending',
};

function KPICard({ kpi }: { kpi: KPI }) {
  const valueDisplay =
    kpi.unit === '₹'
      ? `₹${Number(kpi.value).toLocaleString('en-IN')}`
      : `${kpi.value}${kpi.unit}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</span>
      <span className="text-2xl font-bold text-brand-navy">{valueDisplay}</span>
      <span
        className={`text-xs font-medium ${
          kpi.trendUp ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {kpi.trendUp ? '▲' : '▼'} {kpi.trend} vs yesterday
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error } = useDashboard();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && (
          <div className="text-slate-500 text-sm">Loading dashboard data…</div>
        )}
        {error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* KPI Grid */}
            <section>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                Today's Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {data.kpis.map((kpi) => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </section>

            {/* Recent Trips */}
            <section>
              <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                Recent Trips
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Trip ID', 'Route', 'Driver', 'Time', 'Status'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-brand-navy font-medium">
                          {trip.id}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {trip.origin} → {trip.destination}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{trip.driver}</td>
                        <td className="px-4 py-3 text-slate-500">{trip.time}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              STATUS_STYLES[trip.status]
                            }`}
                          >
                            {STATUS_LABELS[trip.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
