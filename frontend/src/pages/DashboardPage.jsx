import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboard } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, FileStack, AlertCircle, Database,
  ArrowRight, Upload, ClipboardCheck,
} from 'lucide-react';

const SCOPE_COLORS = { 1: '#1e40af', 2: '#059669', 3: '#d97706' };
const STATUS_COLORS = {
  pending: '#94a3b8', validated: '#3b82f6', suspicious: '#f59e0b',
  approved: '#10b981', rejected: '#ef4444', locked: '#6366f1',
};
const SOURCE_LABELS = { sap: 'SAP', utility: 'Utility', travel: 'Travel' };
const SOURCE_COLORS = { sap: '#8b5cf6', utility: '#06b6d4', travel: '#f97316' };

function StatCard({ label, value, sub, icon: Icon, accent }) {
  const accents = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {Icon && (
          <div className={`p-2 rounded-lg border ${accents[accent] || accents.slate}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-3 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

const chartTooltipStyle = {
  contentStyle: { borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' },
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboard.stats().then((r) => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-gray-500">No data available. Upload files to get started.</p>;
  }

  const scopeData = stats.by_scope.map((s) => ({
    name: `Scope ${s.scope}`,
    co2e: Math.round(Number(s.total_co2e) || 0),
    count: s.count,
    fill: SCOPE_COLORS[s.scope],
  }));

  const statusData = stats.by_status.map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    count: s.count,
    fill: STATUS_COLORS[s.status] || '#94a3b8',
  }));

  const sourceData = stats.by_source.map((s) => ({
    name: SOURCE_LABELS[s.source__source_type] || s.source__source_type,
    co2e: Math.round(Number(s.total_co2e) || 0),
    count: s.count,
    fill: SOURCE_COLORS[s.source__source_type] || '#94a3b8',
  }));

  const categoryData = (stats.by_category || [])
    .filter((c) => Number(c.total_co2e) > 0)
    .map((c) => ({
      name: c.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      co2e: Math.round(Number(c.total_co2e) || 0),
      count: c.count,
    }))
    .slice(0, 8);

  const totalCO2e = Number(stats.total_co2e_kg) || 0;
  const suspiciousCount = stats.by_status?.find((s) => s.status === 'suspicious')?.count || 0;

  return (
    <div className="min-h-[calc(100vh-3rem)] flex flex-col pb-8">
      <PageHeader
        badge="Overview"
        title="Emissions dashboard"
        description="Summary of ingested activity data across SAP, utility, and travel sources. Use Review to approve or flag records before audit lock."
      >
        <Link
          to="/review"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition"
        >
          <ClipboardCheck size={16} />
          Review queue
          {stats.pending_review > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{stats.pending_review}</span>
          )}
        </Link>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <Upload size={16} />
          Upload data
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total emissions"
          value={totalCO2e >= 1000 ? `${(totalCO2e / 1000).toFixed(1)} tCO₂e` : `${Math.round(totalCO2e).toLocaleString()} kg`}
          sub="All scopes combined"
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          label="Total records"
          value={stats.total_records}
          sub="Normalized emission rows"
          icon={FileStack}
          accent="blue"
        />
        <StatCard
          label="Pending review"
          value={stats.pending_review}
          sub="Awaiting analyst action"
          icon={AlertCircle}
          accent="amber"
        />
        <StatCard
          label="Data sources"
          value={sourceData.length}
          sub="SAP · Utility · Travel"
          icon={Database}
          accent="slate"
        />
      </div>

      {/* Charts row — taller to fill viewport */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[380px]">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[380px]">
          <h3 className="text-sm font-semibold text-gray-800">Emissions by scope</h3>
          <p className="text-xs text-gray-400 mb-4">kgCO₂e by GHG scope</p>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scopeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} kgCO₂e`, 'Emissions']} {...chartTooltipStyle} />
                <Bar dataKey="co2e" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {scopeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[380px]">
          <h3 className="text-sm font-semibold text-gray-800">Records by status</h3>
          <p className="text-xs text-gray-400 mb-4">Review workflow breakdown</p>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="bottom" />
                <Tooltip {...chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[380px]">
          <h3 className="text-sm font-semibold text-gray-800">Emissions by source</h3>
          <p className="text-xs text-gray-400 mb-4">SAP vs utility vs travel</p>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={56} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} kgCO₂e`, 'Emissions']} {...chartTooltipStyle} />
                <Bar dataKey="co2e" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {sourceData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom section — fills remaining space */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {categoryData.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800">Top categories by emissions</h3>
            <p className="text-xs text-gray-400 mb-4">Activity types with calculated CO₂e</p>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 4, right: 8, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} kgCO₂e`, 'CO₂e']} {...chartTooltipStyle} />
                  <Bar dataKey="co2e" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-gray-800">Quick actions</h3>
          <p className="text-xs text-gray-400 mb-4">Common analyst workflows</p>
          <ul className="space-y-3 flex-1">
            <li>
              <Link
                to="/review?suspicious=true"
                className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Suspicious records</p>
                  <p className="text-xs text-gray-500">{suspiciousCount} flagged for review</p>
                </div>
                <ArrowRight size={16} className="text-amber-600 group-hover:translate-x-0.5 transition" />
              </Link>
            </li>
            <li>
              <Link
                to="/review?status=validated"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Ready to approve</p>
                  <p className="text-xs text-gray-500">Validated, not yet signed off</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </li>
            <li>
              <Link
                to="/upload"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload new file</p>
                  <p className="text-xs text-gray-500">SAP, utility, or travel CSV</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
