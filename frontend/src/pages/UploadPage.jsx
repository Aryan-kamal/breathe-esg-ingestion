import { useState, useEffect, useCallback } from 'react';
import { ingestion } from '../api/endpoints';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const SOURCE_TYPES = [
  { key: 'sap', label: 'SAP Fuel & Procurement', desc: 'CSV/TSV flat-file export from SE16/ME2M', accept: '.csv,.txt,.tsv' },
  { key: 'utility', label: 'Utility Electricity', desc: 'CSV portal export with meter readings', accept: '.csv' },
  { key: 'travel', label: 'Corporate Travel', desc: 'Concur-style CSV report export', accept: '.csv' },
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
      <h2 className="text-lg font-bold text-gray-900 mb-4">Upload Data</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {SOURCE_TYPES.map((src) => (
          <button
            key={src.key}
            onClick={() => { setSelected(src.key); setResult(null); setError(''); }}
            className={`text-left p-4 rounded-lg border-2 transition ${
              selected === src.key
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="font-semibold text-sm text-gray-900">{src.label}</p>
            <p className="text-xs text-gray-500 mt-1">{src.desc}</p>
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
          dragOver ? 'border-gray-900 bg-gray-100' : 'border-gray-300 bg-white'
        }`}
      >
        <Upload className="mx-auto text-gray-400 mb-3" size={36} />
        <p className="text-sm text-gray-600 mb-1">
          Drag & drop a <strong>{sourceInfo.label}</strong> file here
        </p>
        <p className="text-xs text-gray-400 mb-4">Accepted: {sourceInfo.accept}</p>
        <label className="inline-block cursor-pointer bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-gray-800 transition">
          Browse Files
          <input type="file" accept={sourceInfo.accept} onChange={onFileSelect} className="hidden" />
        </label>
      </div>

      {uploading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          Processing file...
        </div>
      )}

      {result && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-green-800">Upload successful</p>
            <p className="text-xs text-green-700 mt-1">
              {result.rows_processed} rows processed, {result.records_created} records created, {result.errors} errors
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-red-800">Upload failed</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload History</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">File</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Rows</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Errors</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((src) => (
                  <tr key={src.id} className="border-b border-gray-100">
                    <td className="px-4 py-2 flex items-center gap-2">
                      <FileText size={14} className="text-gray-400" />
                      {src.file_name}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">{src.source_type}</span>
                    </td>
                    <td className="px-4 py-2">{src.row_count}</td>
                    <td className="px-4 py-2">{src.error_count}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        src.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{src.status}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{new Date(src.uploaded_at).toLocaleString()}</td>
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
