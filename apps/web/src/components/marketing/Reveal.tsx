'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal wrapper: fades + slides its children up once they enter the
 * viewport. `delay` (ms) lets a group stagger. Respects reduced-motion via the
 * browser (transition simply runs instantly there).
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  // Until the client has hydrated we render fully visible, so content is NEVER
  // hidden for no-JS, hydration-failure, or missing-IntersectionObserver cases.
  // The fade/slide animation is a progressive enhancement layered on after mount.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const visible = !hydrated || shown;

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  );
}
