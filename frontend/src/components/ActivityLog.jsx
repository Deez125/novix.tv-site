export default function ActivityLog({ activities }) {
  const getActionColor = (action) => {
    if (action.includes('kick') || action.includes('removed') || action.includes('cancelled')) {
      return 'text-red-400';
    }
    if (action.includes('failed') || action.includes('past_due')) {
      return 'text-amber-400';
    }
    if (action.includes('started') || action.includes('created') || action.includes('active')) {
      return 'text-emerald-400';
    }
    return 'text-slate-400';
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 text-sm">
            <span className="text-slate-500 font-mono text-xs whitespace-nowrap">
              {formatTime(activity.created_at)}
            </span>
            <div>
              <span className="font-medium">
                {activity.users?.display_name || 'Unknown User'}
              </span>
              <span className="text-slate-400"> — </span>
              <span className={getActionColor(activity.action)}>
                {activity.details || activity.action}
              </span>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <div className="text-slate-500 text-center py-4">No activity yet</div>
        )}
      </div>
    </div>
  );
}
