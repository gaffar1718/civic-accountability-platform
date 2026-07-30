// =============================================================================
// src/App.jsx — India Civic Accountability Platform
// =============================================================================
// Lead Architect & Original Creator  : Shaik Abdul Gaffar
// Data Strategy & Ideation           : Sudarraman Yateendran
// Civic Policy Researcher            : Vummiti Yasho Vardhan
// UI/UX & Accessibility Consultant   : Vishnumurthula Santosh
// Security & Quality Assurance       : Borra Shashi Ram
//
// Licensed under Apache 2.0.
// Any fork or clone MUST retain the above attribution block.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import html2canvas from 'html2canvas';

import ProjectCard from './components/ProjectCard.jsx';
import FeedbackModal from './components/FeedbackModal.jsx';
import FilterBar from './components/FilterBar.jsx';
import StatsBar from './components/StatsBar.jsx';
import MapFlyTo from './components/MapFlyTo.jsx';

// ── Fix Leaflet default icon paths broken by Vite build ─────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Severity score computation (also in Python scraper for parity) ───────────
function severityScore(project) {
  return project.sanctioned_amount_cr * (100 - project.progress_percent);
}

// ── Custom severity-based marker icon ────────────────────────────────────────
function createSeverityIcon(progress) {
  const color = progress < 25
    ? '#7F1D1D'
    : progress < 50
    ? '#DC2626'
    : progress < 75
    ? '#D97706'
    : '#16A34A';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 5.25 2.93 9.83 7.27 12.23L14 36l6.73-9.77C25.07 23.83 28 19.25 28 14 28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [28, 36],
    iconAnchor: [14, 36],
    popupAnchor:[0, -36],
  });
}

// ── Sorting & filtering helpers ───────────────────────────────────────────────
function sortProjects(projects, sortKey) {
  return [...projects].sort((a, b) => {
    switch (sortKey) {
      case 'severity':
        return severityScore(b) - severityScore(a);
      case 'amount':
        return b.sanctioned_amount_cr - a.sanctioned_amount_cr;
      case 'progress':
        return a.progress_percent - b.progress_percent;
      case 'delay':
        return (b.delay_months || 0) - (a.delay_months || 0);
      default:
        return severityScore(b) - severityScore(a);
    }
  });
}

// =============================================================================
// APP ROOT
// =============================================================================

export default function App() {
  const [projects,       setProjects]       = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [selectedProject,setSelectedProject]= useState(null);
  const [modalProject,   setModalProject]   = useState(null);
  const [sortKey,        setSortKey]        = useState('severity');
  const [filterState,    setFilterState]    = useState('all');
  const [filterTag,      setFilterTag]      = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [flyTo,          setFlyTo]          = useState(null);

  const mapRef = useRef(null);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/data.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        // Client-side severity sort (Python scraper also sorts, but belt-and-suspenders)
        const sorted = sortProjects(data, 'severity');
        setProjects(sorted);
        setFiltered(sorted);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Apply filters & sort whenever controls change ──────────────────────────
  useEffect(() => {
    let result = [...projects];

    if (filterState !== 'all') {
      result = result.filter(p => p.state === filterState);
    }
    if (filterTag !== 'all') {
      result = result.filter(p => p.tags?.includes(filterTag));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.project_title.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.constituency.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q)
      );
    }

    setFiltered(sortProjects(result, sortKey));
  }, [projects, filterState, filterTag, searchQuery, sortKey]);

  // ── Unique states & tags for filter dropdowns ──────────────────────────────
  const states = ['all', ...new Set(projects.map(p => p.state).sort())];
  const tags   = ['all', ...new Set(projects.flatMap(p => p.tags || []).sort())];

  // ── Card click → fly map to project location ──────────────────────────────
  const handleCardClick = useCallback((project) => {
    setSelectedProject(project);
    setFlyTo({ coords: project.coordinates, id: project.id });
    // Scroll map into view
    document.getElementById('civic-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalBudget    = projects.reduce((s, p) => s + p.sanctioned_amount_cr, 0);
  const avgProgress    = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress_percent, 0) / projects.length)
    : 0;
  const criticalCount  = projects.filter(p => p.progress_percent < 25).length;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) return <LoadingSkeleton />;

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) return <ErrorState message={error} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="bg-[#0F172A] text-white sticky top-0 z-50 border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center shadow-glow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight leading-none">India Civic Accountability</h1>
                <p className="text-xs text-slate-400 leading-none mt-0.5">Track Every Rupee · Hold Every Official</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/YOUR_ORG/india-civic-accountability"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors hidden sm:flex items-center gap-1.5 text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                Source
              </a>
              <div className="bg-[#DC2626] text-white text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse-slow">
                LIVE DATA
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sub-header alert ─────────────────────────────────────────────── */}
      <div className="bg-[#DC2626] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2 text-sm font-medium">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
          </svg>
          <span>
            ₹{(totalBudget / 100).toFixed(0)}K Cr in taxpayer money — {criticalCount} projects critically delayed. Citizens have a right to know.
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <StatsBar
          totalProjects={projects.length}
          totalBudget={totalBudget}
          avgProgress={avgProgress}
          criticalCount={criticalCount}
        />

        {/* ── Leaflet Map ───────────────────────────────────────────────── */}
        <section id="civic-map" aria-label="Project Locations Map">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">Project Map — Click a card to zoom in</span>
              <span className="ml-auto text-xs text-slate-400">{filtered.length} projects visible</span>
            </div>
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '420px', width: '100%' }}
              ref={mapRef}
              preferCanvas
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {flyTo && <MapFlyTo coords={flyTo.coords} zoom={12} key={flyTo.id} />}
              {filtered.map(project => (
                <Marker
                  key={project.id}
                  position={project.coordinates}
                  icon={createSeverityIcon(project.progress_percent)}
                  eventHandlers={{
                    click: () => setSelectedProject(project),
                  }}
                >
                  <Popup maxWidth={260} minWidth={220}>
                    <MapPopupContent project={project} />
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <FilterBar
          states={states}
          tags={tags}
          filterState={filterState}
          filterTag={filterTag}
          sortKey={sortKey}
          searchQuery={searchQuery}
          onStateChange={setFilterState}
          onTagChange={setFilterTag}
          onSortChange={setSortKey}
          onSearchChange={setSearchQuery}
          resultCount={filtered.length}
        />

        {/* ── Project Feed ──────────────────────────────────────────────── */}
        <section aria-label="Project Feed" aria-live="polite">
          {filtered.length === 0 ? (
            <EmptyState onReset={() => { setFilterState('all'); setFilterTag('all'); setSearchQuery(''); }} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((project, idx) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  rank={idx + 1}
                  isSelected={selectedProject?.id === project.id}
                  onClick={() => handleCardClick(project)}
                  onReport={() => setModalProject(project)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="pt-8 pb-4 border-t border-slate-200">
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-500">
              Data sourced from CAG Reports, NHAI Dashboards, State PWD Audit Reports & eprocure.gov.in (CPPP).
              Updated daily via GitHub Actions.
            </p>
            <p className="text-xs text-slate-400">
              Built under <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Apache 2.0</a> ·
              Lead Architect: <strong>Shaik Abdul Gaffar</strong> ·
              Data Strategy: <strong>Sudarraman Yateendran</strong> ·
              Policy Research: <strong>Vummiti Yasho Vardhan</strong> ·
              UI/UX: <strong>Vishnumurthula Santosh</strong> ·
              QA: <strong>Borra Shashi Ram</strong>
            </p>
          </div>
        </footer>
      </main>

      {/* ── Feedback modal ────────────────────────────────────────────────── */}
      {modalProject && (
        <FeedbackModal
          project={modalProject}
          onClose={() => setModalProject(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS (co-located for clarity)
// =============================================================================

function MapPopupContent({ project }) {
  const pct = project.progress_percent;
  const color = pct < 25 ? '#7F1D1D' : pct < 50 ? '#DC2626' : pct < 75 ? '#D97706' : '#16A34A';
  return (
    <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
      <p className="font-semibold text-slate-800 leading-tight mb-2 line-clamp-2">{project.project_title}</p>
      <p className="text-slate-500 text-xs mb-1">{project.state} · {project.constituency}</p>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">Progress</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div style={{ height: '6px', background: '#FEE2E2', borderRadius: '3px', overflow:'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
      </div>
      <p className="text-xs text-slate-500 mt-2">
        ₹{project.sanctioned_amount_cr.toLocaleString('en-IN')} Cr sanctioned
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-96 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-red-200 shadow-card p-8 max-w-md text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Failed to load data</h2>
        <p className="text-slate-500 text-sm mb-4">{message}</p>
        <button onClick={() => window.location.reload()} className="bg-[#DC2626] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#B91C1C] transition-colors">
          Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-12 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
        </svg>
      </div>
      <p className="text-slate-600 font-medium mb-1">No projects match your filters</p>
      <p className="text-slate-400 text-sm mb-4">Try adjusting the state, tag, or search query</p>
      <button onClick={onReset} className="text-[#DC2626] text-sm font-semibold hover:underline">
        Clear all filters
      </button>
    </div>
  );
}
