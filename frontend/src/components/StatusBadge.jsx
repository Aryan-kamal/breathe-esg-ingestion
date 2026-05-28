const STYLES = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  validated: 'bg-blue-50 text-blue-800 ring-blue-100',
  suspicious: 'bg-amber-50 text-amber-800 ring-amber-100',
  approved: 'bg-green-50 text-green-800 ring-green-100',
  rejected: 'bg-red-50 text-red-800 ring-red-100',
  locked: 'bg-indigo-50 text-indigo-800 ring-indigo-100',
};

export default function StatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ${STYLES[status] || STYLES.pending}`}>
      {label}
    </span>
  );
}
