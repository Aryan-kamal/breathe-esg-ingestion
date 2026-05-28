import { useState, useEffect } from 'react';
import { dashboard } from '../api/endpoints';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const SCOPE_COLORS = { 1: '#1e40af', 2: '#059669', 3: '#d97706' };
const STATUS_COLORS = {
  pending: '#6b7280', validated: '#3b82f6', suspicious: '#f59e0b',
  approved: '#10b981', rejected: '#ef4444', locked: '#6366f1',
};
const SOURCE_COLORS = { sap: '#8b5cf6', utility: '#06b6d4', travel: '#f97316' };

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.stats().then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading dashboard...</p>;
  if (!stats) return <p className="text-gray-500">No data available.</p>;

  const scopeData = stats.by_scope.map((s) => ({
    name: `Scope ${s.scope}`,
    co2e: Math.round(Number(s.total_co2e) || 0),
    count: s.count,
    fill: SCOPE_COLORS[s.scope],
  }));

  const statusData = stats.by_status.map((s) => ({
    name: s.status,
    count: s.count,
    fill: STATUS_COLORS[s.status] || '#6b7280',
  }));

  const sourceData = stats.by_source.map((s) => ({
    name: s.source__source_type,
    co2e: Math.round(Number(s.total_co2e) || 0),
    count: s.count,
    fill: SOURCE_COLORS[s.source__source_type] || '#6b7280',
  }));

  const totalCO2e = Number(stats.total_co2e_kg) || 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Emissions"
          value={totalCO2e >= 1000 ? `${(totalCO2e / 1000).toFixed(1)} tCO2e` : `${Math.round(totalCO2e)} kgCO2e`}
        />
        <StatCard label="Total Records" value={stats.total_records} />
        <StatCard label="Pending Review" value={stats.pending_review} />
        <StatCard label="Data Sources" value={sourceData.length} sub="SAP, Utility, Travel" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Emissions by Scope</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={scopeData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v.toLocaleString()} kgCO2e`} />
              <Bar dataKey="co2e" radius={[4, 4, 0, 0]}>
                {scopeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Records by Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Emissions by Source</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sourceData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v.toLocaleString()} kgCO2e`} />
              <Bar dataKey="co2e" radius={[4, 4, 0, 0]}>
                {sourceData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
