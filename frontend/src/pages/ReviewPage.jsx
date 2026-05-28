import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { records } from '../api/endpoints';
import StatusBadge from '../components/StatusBadge';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

const SCOPE_LABELS = { 1: 'Scope 1', 2: 'Scope 2', 3: 'Scope 3' };
const SOURCE_LABELS = { sap: 'SAP', utility: 'Utility', travel: 'Travel' };

export default function ReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const [filters, setFilters] = useState({
    scope: searchParams.get('scope') || '',
    source_type: searchParams.get('source_type') || '',
    status: searchParams.get('status') || '',
    suspicious: searchParams.get('suspicious') === 'true' ? 'true' : '',
    search: searchParams.get('search') || '',
  });

  const fetchData = () => {
    setLoading(true);
    const params = { page, page_size: 30 };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    records.list(params)
      .then((r) => { setData(r.data.results); setCount(r.data.count); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, filters]);

  const handleBulk = async (action) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      await records.bulkAction([...selected], action);
      setSelected(new Set());
      fetchData();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSingle = async (id, action) => {
    try {
      const fn = { approved: records.approve, rejected: records.reject, suspicious: records.flag, locked: records.lock };
      await fn[action](id);
      fetchData();
    } catch { /* handled by interceptor */ }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((r) => r.id)));
    }
  };

  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <input type="checkbox" checked={data.length > 0 && selected.size === data.length}
          onChange={toggleAll} className="rounded" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={selected.has(row.original.id)}
          onChange={() => toggleSelect(row.original.id)} className="rounded" />
      ),
      size: 40,
    },
    {
      accessorKey: 'source_type',
      header: 'Source',
      cell: ({ getValue }) => (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
          {SOURCE_LABELS[getValue()] || getValue()}
        </span>
      ),
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ getValue }) => <span className="text-xs font-medium">{SCOPE_LABELS[getValue()]}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => <span className="text-xs">{getValue()?.replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'activity_description',
      header: 'Description',
      cell: ({ getValue }) => <span className="text-xs truncate max-w-48 block">{getValue()}</span>,
    },
    {
      accessorKey: 'normalized_quantity',
      header: 'Quantity',
      cell: ({ row }) => (
        <span className="text-xs">
          {Number(row.original.normalized_quantity).toLocaleString()} {row.original.normalized_unit}
        </span>
      ),
    },
    {
      accessorKey: 'co2e_kg',
      header: 'CO2e (kg)',
      cell: ({ getValue }) => {
        const v = Number(getValue());
        return <span className="text-xs font-mono">{v ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    {
      id: 'flags',
      header: '',
      cell: ({ row }) => row.original.is_suspicious ? (
        <AlertTriangle size={14} className="text-amber-500" title={row.original.suspicion_reasons?.join(', ')} />
      ) : null,
      size: 30,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const r = row.original;
        if (r.status === 'locked') return <span className="text-xs text-gray-400">Locked</span>;
        return (
          <div className="flex gap-1">
            {r.status !== 'approved' && (
              <button onClick={(e) => { e.stopPropagation(); handleSingle(r.id, 'approved'); }}
                className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition">
                Approve
              </button>
            )}
            {r.status !== 'rejected' && (
              <button onClick={(e) => { e.stopPropagation(); handleSingle(r.id, 'rejected'); }}
                className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition">
                Reject
              </button>
            )}
            {r.status === 'approved' && (
              <button onClick={(e) => { e.stopPropagation(); handleSingle(r.id, 'locked'); }}
                className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition">
                Lock
              </button>
            )}
          </div>
        );
      },
    },
  ], [data, selected]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.ceil(count / 30);

  return (
    <div>
      <PageHeader
        badge="Analyst workflow"
        title="Review emission records"
        description="Approve, reject, or flag normalized rows before locking them for audit. Click a row to compare raw source data with normalized values."
      >
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <button onClick={() => handleBulk('approved')} disabled={bulkLoading}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Approve all
            </button>
            <button onClick={() => handleBulk('rejected')} disabled={bulkLoading}
              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Reject all
            </button>
            <button onClick={() => handleBulk('locked')} disabled={bulkLoading}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              Lock all
            </button>
          </div>
        )}
      </PageHeader>

      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <select value={filters.scope} onChange={(e) => { setFilters((f) => ({ ...f, scope: e.target.value })); setPage(1); }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white">
          <option value="">All Scopes</option>
          <option value="1">Scope 1</option>
          <option value="2">Scope 2</option>
          <option value="3">Scope 3</option>
        </select>
        <select value={filters.source_type} onChange={(e) => { setFilters((f) => ({ ...f, source_type: e.target.value })); setPage(1); }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white">
          <option value="">All Sources</option>
          <option value="sap">SAP</option>
          <option value="utility">Utility</option>
          <option value="travel">Travel</option>
        </select>
        <select value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="validated">Validated</option>
          <option value="suspicious">Suspicious</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="locked">Locked</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-600">
          <input type="checkbox" checked={filters.suspicious === 'true'}
            onChange={(e) => { setFilters((f) => ({ ...f, suspicious: e.target.checked ? 'true' : '' })); setPage(1); }}
            className="rounded" />
          Suspicious only
        </label>
        <input
          type="text" placeholder="Search description..."
          value={filters.search}
          onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white w-48"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap"
                      style={{ width: h.column.columnDef.size }}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-gray-400">No records found</td></tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/records/${row.original.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">{count} records total</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages || 1}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-1 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-100 transition">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
