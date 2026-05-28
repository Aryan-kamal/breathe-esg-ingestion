import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { records, audit } from '../api/endpoints';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, AlertTriangle, Clock, User } from 'lucide-react';

export default function RecordDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');

  const fetchAll = () => {
    Promise.all([
      records.detail(id),
      audit.log(id),
    ]).then(([rec, log]) => {
      setRecord(rec.data);
      setAuditLog(log.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleAction = async (action) => {
    const fn = { approved: records.approve, rejected: records.reject, suspicious: records.flag, locked: records.lock };
    await fn[action](id, comment);
    setComment('');
    fetchAll();
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!record) return <p className="text-gray-500">Record not found.</p>;

  const isLocked = record.status === 'locked';

  return (
    <div>
      <button onClick={() => navigate('/review')}
        className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 mb-6 transition">
        <ArrowLeft size={16} /> Back to review
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">Record detail</p>
                <h2 className="text-xl font-bold text-gray-900">{record.activity_description || 'Emission record'}</h2>
              </div>
              <StatusBadge status={record.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Source" value={`${record.source_type} — ${record.source_file}`} />
              <Field label="Scope" value={`Scope ${record.scope}`} />
              <Field label="Category" value={record.category?.replace(/_/g, ' ')} />
              <Field label="Description" value={record.activity_description} />
              <Field label="Original Quantity" value={`${record.original_quantity} ${record.original_unit}`} />
              <Field label="Normalized Quantity" value={`${record.normalized_quantity} ${record.normalized_unit}`} />
              <Field label="Emission Factor" value={record.emission_factor_used ? `${record.emission_factor_used} kgCO2e/unit` : 'N/A'} />
              <Field label="CO2e" value={record.co2e_kg ? `${Number(record.co2e_kg).toLocaleString()} kg` : 'N/A'} />
              <Field label="Period" value={`${record.period_start || '?'} — ${record.period_end || '?'}`} />
              <Field label="Reviewed By" value={record.reviewed_by || 'Not yet reviewed'} />
            </div>

            {record.is_suspicious && record.suspicion_reasons?.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Flagged Issues</span>
                </div>
                <ul className="text-xs text-amber-700 space-y-1">
                  {record.suspicion_reasons.map((r, i) => <li key={i}>- {r}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Raw Data */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Raw source data</h3>
            <pre className="bg-gray-50 rounded-md p-4 text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(record.raw_payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Sidebar — actions & audit log */}
        <div className="space-y-6">
          {!isLocked && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Review actions</h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment..."
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 mb-3 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <div className="flex flex-col gap-2">
                <button onClick={() => handleAction('approved')}
                  className="w-full px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition">
                  Approve
                </button>
                <button onClick={() => handleAction('rejected')}
                  className="w-full px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition">
                  Reject
                </button>
                <button onClick={() => handleAction('suspicious')}
                  className="w-full px-3 py-2 text-sm font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition">
                  Flag as Suspicious
                </button>
                {record.status === 'approved' && (
                  <button onClick={() => handleAction('locked')}
                    className="w-full px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
                    Lock for Audit
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Audit trail</h3>
            {auditLog.length === 0 ? (
              <p className="text-xs text-gray-400">No review actions yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLog.map((log, i) => (
                  <div key={i} className="border-l-2 border-gray-200 pl-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User size={12} /> {log.changed_by}
                      <Clock size={12} /> {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <p className="text-xs mt-0.5">
                      <StatusBadge status={log.old_status} />
                      <span className="mx-1">→</span>
                      <StatusBadge status={log.new_status} />
                    </p>
                    {log.comment && <p className="text-xs text-gray-500 mt-1 italic">"{log.comment}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value || '-'}</p>
    </div>
  );
}
