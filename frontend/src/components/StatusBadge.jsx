const STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  validated: 'bg-blue-100 text-blue-700',
  suspicious: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  locked: 'bg-indigo-100 text-indigo-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${STYLES[status] || STYLES.pending}`}>
      {status}
    </span>
  );
}
