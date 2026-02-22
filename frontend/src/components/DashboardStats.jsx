export default function DashboardStats({ users }) {
  const total = users.length;
  const active = users.filter(u => u.subscription_status === 'active').length;
  const pastDue = users.filter(u => u.subscription_status === 'past_due').length;
  const inactive = users.filter(u => ['cancelled', 'kicked'].includes(u.subscription_status)).length;

  const stats = [
    { label: 'Total Users', value: total, color: 'text-white' },
    { label: 'Active', value: active, color: 'text-emerald-400' },
    { label: 'Past Due', value: pastDue, color: 'text-amber-400' },
    { label: 'Cancelled/Kicked', value: inactive, color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map(stat => (
        <div key={stat.label} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">{stat.label}</div>
          <div className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
