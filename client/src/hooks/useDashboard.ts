import { useEffect, useState } from 'react';

export interface KPI {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: string;
  trendUp: boolean;
}

export interface Trip {
  id: string;
  origin: string;
  destination: string;
  status: 'completed' | 'in_transit' | 'pending';
  driver: string;
  time: string;
}

interface DashboardData {
  kpis: KPI[];
  recentTrips: Trip[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load dashboard data'); setLoading(false); });
  }, []);

  return { data, loading, error };
}
