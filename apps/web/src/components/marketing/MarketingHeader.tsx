'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'contact', label: 'Contact' },
];

export function MarketingHeader() {
  const [active, setActive]   = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Elevate the header once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: highlight the nav item for the section currently in view.
  useEffect(() => {
    const sections = NAV
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b transition-shadow ${
        scrolled ? 'border-gray-200 shadow-sm' : 'border-gray-100'
      }`}
    >
      <nav className="marketing-container h-16 flex items-center justify-between">
        <Logo variant="full" size="md" href="/" />

        {/* Desktop nav with active-section indicator */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium h-16">
          {NAV.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? 'true' : undefined}
              className={`relative h-16 flex items-center transition-colors ${
                active === id ? 'text-primary-700' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
              <span
                className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all ${
                  active === id ? 'bg-primary-600' : 'bg-transparent'
                }`}
              />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign in
          </Link>
          <Link href="#contact" className="hidden sm:inline-flex btn-primary text-sm px-5 py-2.5">
            Request Demo <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-sm">
          <div className="marketing-container py-3 flex flex-col">
            {NAV.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setMenuOpen(false)}
                className={`py-2.5 text-sm font-medium transition-colors ${
                  active === id ? 'text-primary-700' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="btn-primary text-sm px-5 py-2.5 mt-2 justify-center"
            >
              Request Demo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
