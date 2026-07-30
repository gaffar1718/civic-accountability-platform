// =============================================================================
// src/components/FeedbackModal.jsx
// Bot-proof Netlify form modal for reporting inaccurate project data.
// Uses:
//   - data-netlify="true" + hidden form-name input for Netlify endpoint discovery
//   - Cloudflare Turnstile CAPTCHA via @marsidev/react-turnstile
//   - Honeypot field (bot-field) for additional bot protection
//   - Focus-trap + ESC key dismiss for accessibility
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

// ── Form field component ──────────────────────────────────────────────────
function Field({ id, label, required, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-[#DC2626]" aria-hidden="true">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

const textareaClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FeedbackModal({ project, onClose }) {
  const modalRef        = useRef(null);
  const firstFocusRef   = useRef(null);
  const turnstileRef    = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [status,  setStatus]  = useState('idle');    // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    reporter_name:     '',
    reporter_email:    '',
    issue_description: '',
    'bot-field':       '',  // honeypot — intentionally left empty by real users
  });

  // ── Focus trap & ESC dismiss ───────────────────────────────────────────
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    firstFocusRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const handleChange = useCallback((e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  // ── Netlify form submission ────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.reporter_name.trim()) {
      setErrorMsg('Please enter your name.'); return;
    }
    if (!formData.issue_description.trim() || formData.issue_description.trim().length < 20) {
      setErrorMsg('Please describe the issue in at least 20 characters.'); return;
    }
    if (!turnstileToken) {
      setErrorMsg('Please complete the security check.'); return;
    }
    // Honeypot check (real users won't fill bot-field)
    if (formData['bot-field']) {
      setStatus('success'); return; // silently "succeed" for bots
    }

    setStatus('submitting');
    setErrorMsg('');

    const body = new URLSearchParams({
      'form-name':        'report-inaccuracy',
      'bot-field':        formData['bot-field'],
      reporter_name:      formData.reporter_name,
      reporter_email:     formData.reporter_email,
      project_id:         project.id,
      project_title:      project.project_title,
      issue_description:  formData.issue_description,
      'cf-turnstile-response': turnstileToken,
    });

    try {
      const resp = await fetch('/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
      });

      if (!resp.ok) throw new Error(`Server responded with HTTP ${resp.status}`);
      setStatus('success');
    } catch (err) {
      console.error('Form submission error:', err);
      setStatus('error');
      setErrorMsg('Submission failed. Please try again in a moment.');
      // Reset Turnstile so user can retry
      turnstileRef.current?.reset?.();
      setTurnstileToken('');
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 modal-backdrop"
      style={{ background: 'rgba(15,23,42,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal panel */}
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-2xl shadow-card-xl animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#DC2626] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-bold text-slate-800">Report Inaccurate Data</h2>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{project.project_title}</p>
            </div>
          </div>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            id="modal-close-btn"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">

          {status === 'success' ? (
            /* Success state */
            <div className="text-center py-8 animate-fade-in">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Thank you for your report!</h3>
              <p className="text-sm text-slate-500 mb-6">
                Your submission has been received. Our team will review the data and update it within 48 hours.
              </p>
              <button
                onClick={onClose}
                id="modal-success-close"
                className="bg-[#DC2626] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#B91C1C] transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            /* Form */
            <>
              <p className="text-xs text-slate-500 mb-4">
                All submissions are reviewed by our civic data team. Provide as much detail as possible.
              </p>

              {/* ─────────────────────────────────────────────────────────────
                  NETLIFY FORM
                  • data-netlify="true" → Netlify detects this form
                  • name="report-inaccuracy" → matches the hidden form in index.html
                  • The hidden form-name input is REQUIRED by Netlify's form handler
                ───────────────────────────────────────────────────────────── */}
              <form
                data-netlify="true"
                name="report-inaccuracy"
                netlify-honeypot="bot-field"
                onSubmit={handleSubmit}
                noValidate
                aria-label="Report inaccurate project data"
              >
                {/* Required hidden fields for Netlify */}
                <input type="hidden" name="form-name"    value="report-inaccuracy" />
                <input type="hidden" name="project_id"   value={project.id} />
                <input type="hidden" name="project_title" value={project.project_title} />

                {/* Honeypot — visually hidden, screen-reader accessible via sr-only */}
                <div className="sr-only" aria-hidden="true">
                  <label>
                    Don't fill this in if you're human
                    <input
                      name="bot-field"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData['bot-field']}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <Field id="reporter-name" label="Your Name" required>
                    <input
                      id="reporter-name"
                      type="text"
                      name="reporter_name"
                      placeholder="e.g., Ravi Kumar"
                      required
                      maxLength={100}
                      value={formData.reporter_name}
                      onChange={handleChange}
                      className={inputClass}
                      autoComplete="name"
                    />
                  </Field>

                  {/* Email (optional) */}
                  <Field id="reporter-email" label="Email (optional — for follow-up)">
                    <input
                      id="reporter-email"
                      type="email"
                      name="reporter_email"
                      placeholder="you@example.com"
                      maxLength={200}
                      value={formData.reporter_email}
                      onChange={handleChange}
                      className={inputClass}
                      autoComplete="email"
                    />
                  </Field>

                  {/* Issue description */}
                  <Field id="issue-description" label="Describe the inaccuracy" required>
                    <textarea
                      id="issue-description"
                      name="issue_description"
                      rows={4}
                      placeholder="e.g., The progress percentage shown is 18% but the local municipality's latest report shows 42%. Source: District Collector press release dated 12 June 2024."
                      required
                      minLength={20}
                      maxLength={2000}
                      value={formData.issue_description}
                      onChange={handleChange}
                      className={textareaClass}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                      {formData.issue_description.length}/2000
                    </p>
                  </Field>

                  {/* Cloudflare Turnstile */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2">
                      Security Verification <span className="text-[#DC2626]" aria-hidden="true">*</span>
                    </label>
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={TURNSTILE_KEY}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                      options={{ theme: 'light', language: 'en' }}
                    />
                  </div>

                  {/* Error message */}
                  {errorMsg && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <svg className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-[#DC2626] font-medium">{errorMsg}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      id="modal-cancel-btn"
                      className="flex-1 h-10 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="modal-submit-btn"
                      disabled={status === 'submitting'}
                      className="flex-1 h-10 flex items-center justify-center gap-2 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
                    >
                      {status === 'submitting' ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Submitting…
                        </>
                      ) : (
                        'Submit Report'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
