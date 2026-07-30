// =============================================================================
// src/components/StatsBar.jsx
// Top-level statistics dashboard showing headline numbers.
// =============================================================================

export default function StatsBar({ totalProjects, totalBudget, avgProgress, criticalCount }) {
  const stats = [
    {
      id: 'total-projects',
      label: 'Projects Tracked',
      value: totalProjects.toLocaleString('en-IN'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
      color: 'text-brand-700 bg-brand-50',
      highlight: false,
    },
    {
      id: 'total-budget',
      label: 'Total Budget Sanctioned',
      value: `₹${(totalBudget / 100).toFixed(0).toLocaleString('en-IN')}K Cr`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-[#DC2626] bg-red-50',
      highlight: true,
    },
    {
      id: 'avg-progress',
      label: 'Avg. Completion',
      value: `${avgProgress}%`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      color: 'text-amber-700 bg-amber-50',
      highlight: false,
    },
    {
      id: 'critical-count',
      label: 'Critical (<25% done)',
      value: criticalCount.toLocaleString('en-IN'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      color: 'text-[#DC2626] bg-red-50',
      highlight: true,
    },
  ];

  return (
    <div
      role="region"
      aria-label="Summary Statistics"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {stats.map((stat) => (
        <div
          key={stat.id}
          id={stat.id}
          className={`bg-white rounded-xl border shadow-card p-4 flex items-start gap-3 transition-transform hover:-translate-y-0.5 hover:shadow-card-lg ${
            stat.highlight ? 'border-red-200' : 'border-slate-200'
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.color}`}>
            {stat.icon}
          </div>
          <div className="min-w-0">
            <p className={`text-xl font-bold leading-tight truncate ${stat.highlight ? 'text-[#DC2626]' : 'text-slate-800'}`}>
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
