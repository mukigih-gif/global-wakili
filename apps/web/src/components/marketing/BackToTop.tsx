'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Long-page navigation aids for the marketing site:
 *  - a thin scroll-progress bar pinned to the top edge,
 *  - a back-to-top button that reveals only when the user scrolls UP (so it
 *    stays out of the way while reading down the page), and
 *  - coordination that hides this button AND the chat widget while the footer
 *    is in view, so neither floats over footer links.
 * Positioned bottom-LEFT to avoid the ChatBolt widget (bottom-right).
 */
export function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [show, setShow]         = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (y / docHeight) * 100 : 0);

      if (y > lastY.current + 2) setShow(false);            // scrolling down → hide
      else if (y < lastY.current - 2 && y > 600) setShow(true); // scrolling up → reveal
      lastY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide floating widgets (this button + the chat, via the data attribute) when
  // the footer is in view, so they don't overlap footer links at rest.
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const root = document.documentElement;
    const obs = new IntersectionObserver(
      ([entry]) => {
        root.dataset.gwAtFooter = entry.isIntersecting ? 'true' : 'false';
        if (entry.isIntersecting) setShow(false);
      },
      { threshold: 0.01 },
    );
    obs.observe(footer);
    return () => {
      obs.disconnect();
      delete root.dataset.gwAtFooter;
    };
  }, []);

  return (
    <>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-primary-600 to-accent-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back-to-top button */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-[calc(1.5rem+var(--gw-cookiebar-height,0px))] left-6 z-50 h-11 w-11 rounded-full bg-primary-900 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:bg-primary-800 ${
          show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </>
  );
}
