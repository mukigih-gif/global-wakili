'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield, X, ChevronDown, ChevronUp } from 'lucide-react';

type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

const STORAGE_KEY = 'gw_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Publish the banner height as a CSS var so floating widgets (chat,
  // back-to-top) can sit above it instead of overlapping. Reset to 0 when hidden.
  useEffect(() => {
    const root = document.documentElement;
    if (!visible) {
      root.style.setProperty('--gw-cookiebar-height', '0px');
      return;
    }
    const update = () => {
      root.style.setProperty('--gw-cookiebar-height', `${barRef.current?.offsetHeight ?? 0}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      root.style.setProperty('--gw-cookiebar-height', '0px');
    };
  }, [visible, expanded]);
  const [prefs, setPrefs]       = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...consent, timestamp: new Date().toISOString(), version: '1.0' }));
    } catch { /* localStorage unavailable */ }
    setVisible(false);
  };

  const acceptAll  = () => save({ necessary: true, analytics: true, marketing: true, functional: true });
  const rejectAll  = () => save({ necessary: true, analytics: false, marketing: false, functional: false });
  const savePrefs  = () => save(prefs);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-gray-200 shadow-2xl"
    >
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <Shield className="h-5 w-5 text-primary-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Your Privacy Matters</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  We use cookies to operate this platform, analyse usage, and improve your experience.
                  This notice complies with the{' '}
                  <strong>Kenya Data Protection Act 2019</strong> and <strong>GDPR</strong>.
                  {' '}<Link href="/legal/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
                  {' '}·{' '}<Link href="/legal/terms" className="text-primary-600 hover:underline">Terms</Link>
                </p>
              </div>
              <button onClick={() => setVisible(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Expanded preferences */}
            {expanded && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-gray-100 pt-3">
                {[
                  { key: 'necessary',  label: 'Strictly Necessary', desc: 'Authentication, security, session management. Cannot be disabled.', locked: true },
                  { key: 'functional', label: 'Functional',          desc: 'Remember preferences, UI settings, and workspace state.', locked: false },
                  { key: 'analytics',  label: 'Analytics',           desc: 'Aggregate usage metrics to improve the platform. No personal tracking.', locked: false },
                  { key: 'marketing',  label: 'Marketing',           desc: 'Platform improvement and feature announcements. No third-party ads.', locked: false },
                ].map((cat) => (
                  <label key={cat.key} className={`flex items-start gap-3 rounded-lg border p-3 ${cat.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={cat.locked ? true : prefs[cat.key as keyof ConsentState]}
                      disabled={cat.locked}
                      onChange={(e) => !cat.locked && setPrefs((p) => ({ ...p, [cat.key]: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{cat.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={acceptAll}
                className="h-8 px-4 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors"
              >
                Accept All
              </button>
              {expanded ? (
                <button
                  onClick={savePrefs}
                  className="h-8 px-4 rounded-lg border border-primary-300 text-primary-700 text-xs font-semibold hover:bg-primary-50 transition-colors"
                >
                  Save Preferences
                </button>
              ) : null}
              <button
                onClick={rejectAll}
                className="h-8 px-4 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 h-8 px-3 text-xs text-gray-500 hover:text-gray-700"
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Manage Preferences
              </button>
              <span className="ml-auto text-[10px] text-gray-400">GDPR · Kenya DPA 2019 · v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
