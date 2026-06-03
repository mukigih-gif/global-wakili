'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Search, Briefcase, Users, FileText, CheckSquare, CalendarDays,
  Receipt, DollarSign, Scale, UserCheck, BarChart2, Brain,
  Settings, Bell, MessageSquare, LayoutDashboard, Gavel,
  Plus, ArrowRight,
} from 'lucide-react';

type Result = { type: string; id: string; label: string; sub?: string; href: string };

const NAV_SHORTCUTS = [
  { label: 'Dashboard',       href: '/app/dashboard',     icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Matters',         href: '/app/matters',       icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Clients',         href: '/app/clients',       icon: <Users className="h-4 w-4" /> },
  { label: 'Documents',       href: '/app/documents',     icon: <FileText className="h-4 w-4" /> },
  { label: 'Tasks',           href: '/app/tasks',         icon: <CheckSquare className="h-4 w-4" /> },
  { label: 'Calendar',        href: '/app/calendar',      icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Billing',         href: '/app/billing',       icon: <Receipt className="h-4 w-4" /> },
  { label: 'Finance',         href: '/app/finance',       icon: <DollarSign className="h-4 w-4" /> },
  { label: 'Trust Accounting',href: '/app/trust',         icon: <Scale className="h-4 w-4" /> },
  { label: 'HR & Payroll',    href: '/app/hr',            icon: <UserCheck className="h-4 w-4" /> },
  { label: 'Analytics',       href: '/app/analytics',     icon: <BarChart2 className="h-4 w-4" /> },
  { label: 'AI Platform',     href: '/app/ai',            icon: <Brain className="h-4 w-4" /> },
  { label: 'Court Filings',   href: '/app/court/filings', icon: <Gavel className="h-4 w-4" /> },
  { label: 'Messages',        href: '/app/messaging',     icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Notifications',   href: '/app/notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Settings',        href: '/app/settings',      icon: <Settings className="h-4 w-4" /> },
];

const CREATE_SHORTCUTS = [
  { label: 'New Matter',   href: '/app/matters/new',   icon: <Briefcase className="h-4 w-4" /> },
  { label: 'New Client',   href: '/app/clients/new',   icon: <Users className="h-4 w-4" /> },
  { label: 'New Invoice',  href: '/app/billing/new',   icon: <Receipt className="h-4 w-4" /> },
  { label: 'New Task',     href: '/app/tasks/new',     icon: <CheckSquare className="h-4 w-4" /> },
  { label: 'New Event',    href: '/app/calendar/new',  icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'New Document', href: '/app/documents/new', icon: <FileText className="h-4 w-4" /> },
];

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary-100 text-primary-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function CommandPalette() {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const router    = useRouter();

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]); setActiveIdx(0); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get<{ data: Result[] }>(`/search?q=${encodeURIComponent(query)}&limit=8`)
        .then((r) => { setResults(r.data ?? []); setActiveIdx(0); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const filteredNav = query.trim()
    ? NAV_SHORTCUTS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : NAV_SHORTCUTS.slice(0, 8);

  const filteredCreate = query.trim()
    ? CREATE_SHORTCUTS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : CREATE_SHORTCUTS;

  const allItems: Array<{ label: string; href: string; icon?: React.ReactNode; sub?: string }> = [
    ...results.map((r) => ({ label: r.label, href: r.href, sub: r.sub })),
    ...filteredNav.map((n) => ({ label: n.label, href: n.href, icon: n.icon })),
    ...filteredCreate.map((c) => ({ label: c.label, href: c.href, icon: c.icon })),
  ];

  const navigate = (href: string) => { router.push(href); close(); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[activeIdx]) navigate(allItems[activeIdx].href);
  };

  if (!open) return null;

  const TYPE_ICON: Record<string, React.ReactNode> = {
    matter:   <Briefcase className="h-4 w-4 text-gray-400" />,
    client:   <Users className="h-4 w-4 text-gray-400" />,
    document: <FileText className="h-4 w-4 text-gray-400" />,
    task:     <CheckSquare className="h-4 w-4 text-gray-400" />,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search matters, clients, documents… or navigate"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* API search results */}
          {results.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Results</div>
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${activeIdx === i ? 'bg-primary-50' : ''}`}
                >
                  {TYPE_ICON[r.type] ?? <ArrowRight className="h-4 w-4 text-gray-400" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{highlight(r.label, query)}</p>
                    {r.sub && <p className="text-xs text-gray-500 truncate">{r.sub}</p>}
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 ml-auto flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
          )}

          {/* Quick create */}
          {filteredCreate.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Create</div>
              {filteredCreate.map((item, i) => {
                const idx = results.length + filteredNav.length + i;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${activeIdx === idx ? 'bg-primary-50' : ''}`}
                  >
                    <span className="text-primary-500">{item.icon ?? <Plus className="h-4 w-4" />}</span>
                    <p className="text-sm text-gray-700">{highlight(item.label, query)}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navigation */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Navigate</div>
              {filteredNav.map((item, i) => {
                const idx = results.length + i;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${activeIdx === idx ? 'bg-primary-50' : ''}`}
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    <p className="text-sm text-gray-700">{highlight(item.label, query)}</p>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-300 ml-auto flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">Esc</kbd> close</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
