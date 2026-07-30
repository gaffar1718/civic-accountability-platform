// =============================================================================
// src/components/ProjectCard.jsx
// The primary project card UI with:
//   - Status pill with severity colouring
//   - Red budget utilisation bar
//   - 2×2 Accountability Grid
//   - "Report Inaccurate Data" button
//   - "SHARE TO EXPOSE" button using html2canvas + navigator.share
// =============================================================================

import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

// ── Severity thresholds ────────────────────────────────────────────────────
function getSeverityLabel(progress) {
  if (progress < 10)  return { label: 'CRITICAL',     bg: '#7F1D1D', text: '#FEE2E2' };
  if (progress < 25)  return { label: 'VERY HIGH',    bg: '#DC2626', text: '#FFFFFF' };
  if (progress < 50)  return { label: 'HIGH',         bg: '#D97706', text: '#FFFFFF' };
  if (progress < 75)  return { label: 'MODERATE',     bg: '#2563EB', text: '#FFFFFF' };
  return              { label: 'LOW RISK',            bg: '#16A34A', text: '#FFFFFF' };
}

function getBarColor(progress) {
  if (progress < 25)  return 'linear-gradient(90deg, #7F1D1D, #DC2626)';
  if (progress < 50)  return 'linear-gradient(90deg, #DC2626, #D97706)';
  if (progress < 75)  return 'linear-gradient(90deg, #D97706, #F59E0B)';
  return              'linear-gradient(90deg, #16A34A, #22C55E)';
}

// ── Accountability grid cell ───────────────────────────────────────────────
function GridCell({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className={`text-xs font-semibold leading-snug ${highlight ? 'text-[#DC2626]' : 'text-slate-700'}`}>
        {value || '—'}
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProjectCard({ project, rank, isSelected, onClick, onReport }) {
  const cardRef  = useRef(null);
  const [sharing, setSharing] = useState(false);

  const severity = getSeverityLabel(project.progress_percent);
  const barColor = getBarColor(project.progress_percent);
  const progress = project.progress_percent;

  const severityScore = Math.round(
    project.sanctioned_amount_cr * (100 - project.progress_percent)
  ).toLocaleString('en-IN');

  // ── Share / Export via html2canvas ─────────────────────────────────────
  const handleShare = async (e) => {
    e.stopPropagation();
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#FFFFFF',
        logging: false,
        removeContainer: true,
      });

      const blob = await new Promise(resolve =>
        canvas.toBlob(resolve, 'image/png', 0.95)
      );

      const shareData = {
        title: `🚨 Delayed Project: ${project.project_title}`,
        text:
          `${project.project_title}\n` +
          `State: ${project.state}\n` +
          `Budget: ₹${project.sanctioned_amount_cr} Cr\n` +
          `Progress: Only ${project.progress_percent}% complete!\n` +
          `Contractor: ${project.contractor}\n\n` +
          `Track all delayed projects → https://india-civic-accountability.netlify.app`,
        files: [new File([blob], 'project-accountability.png', { type: 'image/png' })],
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        // Mobile: native share sheet
        await navigator.share(shareData);
      } else {
        // Desktop fallback: download PNG
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `accountability-${project.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <article
      ref={cardRef}
      id={`card-${project.id}`}
      onClick={onClick}
      className={`
        card-stagger bg-white rounded-xl border shadow-card cursor-pointer
        transition-all duration-200 hover:shadow-card-lg hover:-translate-y-0.5
        ${isSelected ? 'border-[#DC2626] ring-2 ring-[#DC2626] ring-opacity-30' : 'border-slate-200'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`View project: ${project.project_title}`}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      {/* ── Card header ─────────────────────────────────────────────── */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Rank badge + title */}
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white mt-0.5"
              style={{ background: severity.bg }}
              aria-label={`Rank ${rank}`}
            >
              {rank}
            </div>
            <h2 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
              {project.project_title}
            </h2>
          </div>

          {/* Status pill */}
          <span
            className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
            style={{ background: severity.bg, color: severity.text }}
            aria-label={`Severity: ${severity.label}`}
          >
            {severity.label}
          </span>
        </div>

        {/* Location pill */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span>{project.state} · {project.constituency}</span>
          {project.delay_months > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-[#DC2626] font-semibold">{project.delay_months}mo delayed</span>
            </>
          )}
        </div>

        {/* ── Budget utilisation bar ───────────────────────────────── */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 font-medium">Completion</span>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold tabular-nums"
                style={{ color: severity.bg }}
              >
                {progress}%
              </span>
              <span className="text-xs text-slate-400">of</span>
              <span className="text-xs font-semibold text-slate-700">
                ₹{project.sanctioned_amount_cr.toLocaleString('en-IN')} Cr
              </span>
            </div>
          </div>
          <div className="budget-bar-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress}% complete`}>
            <div
              className="budget-bar-fill"
              style={{ width: `${progress}%`, background: barColor }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">₹0</span>
            <span className="text-[10px] text-[#DC2626] font-semibold">
              ₹{((project.sanctioned_amount_cr * (100 - progress)) / 100).toFixed(1)} Cr UNSPENT
            </span>
          </div>
        </div>

        {/* ── Severity score ───────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-[#DC2626]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-[10px] text-slate-500">Severity Score:</span>
          <span className="text-[10px] font-bold text-[#DC2626] tabular-nums">{severityScore}</span>
          <span className="text-[10px] text-slate-400">(Budget × Incomplete %)</span>
        </div>

        {/* ── 2×2 Accountability Grid ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <GridCell label="Contractor"       value={project.contractor} />
          <GridCell label="Sanctioned Under" value={project.ruling_party_at_start} />
          <GridCell label="Current Govt"     value={project.current_ruling_party} highlight={
            project.ruling_party_at_start !== project.current_ruling_party
          } />
          <GridCell label="Official in Charge" value={project.official_in_charge} />
        </div>

        {/* ── Tags ─────────────────────────────────────────────────── */}
        {project.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {project.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium capitalize"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Source attribution ───────────────────────────────────── */}
        {project.source && (
          <p className="text-[10px] text-slate-400 italic mb-3 leading-tight">
            Source: {project.source}
          </p>
        )}

        {/* ── Action buttons ───────────────────────────────────────── */}
        <div className="flex gap-2 pt-1">
          {/* Report Inaccurate Data */}
          <button
            id={`report-btn-${project.id}`}
            onClick={(e) => { e.stopPropagation(); onReport(); }}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Report inaccurate data for this project"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            Report Inaccuracy
          </button>

          {/* SHARE TO EXPOSE */}
          <button
            id={`share-btn-${project.id}`}
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 h-9 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
            aria-label="Share this project to expose delays"
          >
            {sharing ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Capturing…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                SHARE TO EXPOSE
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
