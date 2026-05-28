import { useState, useEffect, useCallback } from 'react';
import { ingestion } from '../api/endpoints';
import PageHeader from '../components/PageHeader';
import { Upload, FileText, AlertCircle, CheckCircle2, Factory, Zap, Plane } from 'lucide-react';

const SOURCE_TYPES = [
  {
    key: 'sap',
    label: 'SAP Fuel & Procurement',
    desc: 'CSV/TSV flat-file export from SE16 or ME2M',
    accept: '.csv,.txt,.tsv',
    icon: Factory,
    color: 'border-violet-200 bg-violet-50/50 ring-violet-600',
  },
  {
    key: 'utility',
    label: 'Utility Electricity',
    desc: 'CSV portal export with meter readings',
    accept: '.csv',
    icon: Zap,
    color: 'border-cyan-200 bg-cyan-50/50 ring-cyan-600',
  },
  {
    key: 'travel',
    label: 'Corporate Travel',
    desc: 'Concur-style CSV report export',
    accept: '.csv',
    icon: Plane,
    color: 'border-orange-200 bg-orange-50/50 ring-orange-600',
  },
];

export default function UploadPage() {
  const [selected, setSelected] = useState('sap');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [sources, setSources] = useState([]);

  useEffect(() => {
    ingestion.listSources().then((r) => setSources(r.data));
  }, [result]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError('');
    try {
      const uploadFn = {
        sap: ingestion.uploadSAP,
        utility: ingestion.uploadUtility,
        travel: ingestion.uploadTravel,
      }[selected];
      const res = await uploadFn(file);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [selected]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files[0]);
  };

  const onFileSelect = (e) => {
    handleUpload(e.target.files[0]);
  };

  const sourceInfo = SOURCE_TYPES.find((s) => s.key === selected);

  return (
    <div>
      <PageHeader
        badge="Ingestion"
        title="Upload source data"
        description="Select a source type and upload a CSV export. Rows are parsed, normalized, and queued for analyst review automatically."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {SOURCE_TYPES.map((src) => {
          const Icon = src.icon;
          const isActive = selected === src.key;
          return (
            <button
              key={src.key}
              type="button"
              onClick={() => { setSelected(src.key); setResult(null); setError(''); }}
              className={`text-left p-5 rounded-xl border-2 transition shadow-sm ${
                isActive
                  ? `${src.color} ring-2 ring-offset-1`
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg mb-3 ${isActive ? 'bg-white/80' : 'bg-slate-100'}`}>
                <Icon size={20} className={isActive ? 'text-gray-800' : 'text-gray-500'} />
              </div>
              <p className="font-semibold text-sm text-gray-900">{src.label}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{src.desc}</p>
            </button>
          );
        })}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-14 text-center transition shadow-sm ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50'
            : 'border-slate-300 bg-white'
        }`}
      >
        <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
          <Upload className="text-slate-500" size={32} />
        </div>
        <p className="text-base font-medium text-gray-800 mb-1">
          Drop your <span className="text-emerald-700">{sourceInfo.label}</span> file here
        </p>
        <p className="text-sm text-gray-400 mb-6">Accepted formats: {sourceInfo.accept}</p>
        <label className="inline-block cursor-pointer bg-emerald-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-emerald-800 transition shadow-sm">
          Browse files
          <input type="file" accept={sourceInfo.accept} onChange={onFileSelect} className="hidden" />
        </label>
      </div>

      {uploading && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-gray-600 py-4">
          <div className="animate-spin h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full" />
          Parsing and normalizing file…
        </div>
      )}

      {result && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
          <CheckCircle2 className="text-green-600 shrink-0" size={22} />
          <div>
            <p className="text-sm font-semibold text-green-900">Upload successful</p>
            <p className="text-sm text-green-800 mt-1">
              {result.rows_processed} rows processed · {result.records_created} records created · {result.errors} parse errors
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
          <AlertCircle className="text-red-600 shrink-0" size={22} />
          <div>
            <p className="text-sm font-semibold text-red-900">Upload failed</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Upload history</h3>
          <p className="text-xs text-gray-400 mb-4">Previous ingestion runs for this tenant</p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Rows</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Errors</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src) => (
                  <tr key={src.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{src.file_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                        {src.source_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{src.row_count}</td>
                    <td className="px-4 py-3 tabular-nums">{src.error_count}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        src.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{src.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(src.uploaded_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
