export default function StatusBadge({ status }) {
  const styles = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    past_due: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    kicked: 'bg-red-800/20 text-red-300 border-red-800/30',
  };

  const labels = {
    active: 'Active',
    pending: 'Pending',
    past_due: 'Past Due',
    cancelled: 'Cancelled',
    kicked: 'Kicked',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}
