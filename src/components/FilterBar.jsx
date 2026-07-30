// =============================================================================
// src/components/FilterBar.jsx
// Search, sort, and filter controls for the project feed.
// =============================================================================

export default function FilterBar({
  states, tags,
  filterState, filterTag, sortKey, searchQuery,
  onStateChange, onTagChange, onSortChange, onSearchChange,
  resultCount,
}) {
  const selectClass =
    'h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer';

  return (
    <div
      role="search"
      aria-label="Filter and sort projects"
      className="bg-white rounded-xl border border-slate-200 shadow-card p-4"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
          </svg>
          <input
            id="project-search"
            type="search"
            placeholder="Search by project, state, contractor…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            aria-label="Search projects"
          />
        </div>

        {/* State filter */}
        <div>
          <label htmlFor="state-filter" className="sr-only">Filter by State</label>
          <select
            id="state-filter"
            value={filterState}
            onChange={e => onStateChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by state"
          >
            <option value="all">All States</option>
            {states.filter(s => s !== 'all').map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Tag filter */}
        <div>
          <label htmlFor="tag-filter" className="sr-only">Filter by Tag</label>
          <select
            id="tag-filter"
            value={filterTag}
            onChange={e => onTagChange(e.target.value)}
            className={selectClass}
            aria-label="Filter by project type"
          >
            <option value="all">All Types</option>
            {tags.filter(t => t !== 'all').map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <label htmlFor="sort-key" className="sr-only">Sort by</label>
          <select
            id="sort-key"
            value={sortKey}
            onChange={e => onSortChange(e.target.value)}
            className={selectClass}
            aria-label="Sort projects"
          >
            <option value="severity">↓ Severity Score</option>
            <option value="amount">↓ Budget Amount</option>
            <option value="progress">↑ Least Progress</option>
            <option value="delay">↓ Most Delayed</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500" aria-live="polite" aria-atomic="true">
          Showing <strong className="text-slate-700">{resultCount}</strong> project{resultCount !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#7F1D1D]" />
          <span className="text-xs text-slate-400">Critical</span>
          <div className="w-2 h-2 rounded-full bg-[#DC2626] ml-2" />
          <span className="text-xs text-slate-400">High</span>
          <div className="w-2 h-2 rounded-full bg-[#D97706] ml-2" />
          <span className="text-xs text-slate-400">Medium</span>
          <div className="w-2 h-2 rounded-full bg-[#16A34A] ml-2" />
          <span className="text-xs text-slate-400">Low</span>
        </div>
      </div>
    </div>
  );
}
