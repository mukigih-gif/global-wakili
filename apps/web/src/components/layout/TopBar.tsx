'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Search, HelpCircle, MessageSquare, X, Check, Plus,
         Briefcase, Users, FileText, CheckSquare, CalendarDays, Receipt } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  readAt?: string | null;
  createdAt: string;
  link?: string | null;
};

type SearchResult = {
  type: 'matter' | 'client' | 'document' | 'task';
  id: string;
  label: string;
  sub?: string;
  href: string;
};

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, cb]);
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Notification[] }>('/notifications?limit=15')
      .then((r) => setNotifications(r.data ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {}).catch(() => null);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="absolute right-0 top-12 z-50 w-96 rounded-xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="font-semibold text-gray-900 text-sm">
          Notifications {unread > 0 && <span className="ml-1 rounded-full bg-red-100 text-red-700 text-xs px-2 py-0.5">{unread} new</span>}
        </span>
        <div className="flex items-center gap-2">
          <Link href="/app/notifications" onClick={onClose} className="text-xs text-primary-600 hover:underline">View all</Link>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : !notifications.length ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.readAt ? 'bg-primary-50/40' : ''}`}>
              <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${!n.readAt ? 'bg-primary-500' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                {n.link ? (
                  <Link href={n.link} onClick={onClose} className="text-sm font-medium text-gray-900 hover:text-primary-700 line-clamp-1">{n.title}</Link>
                ) : (
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{n.title}</p>
                )}
                {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <button onClick={() => markRead(n.id)} className="text-gray-300 hover:text-primary-500 flex-shrink-0" title="Mark as read">
                  <Check className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GlobalSearchPanel({ query, onClose }: { query: string; onClose: () => void }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    const timeout = setTimeout(() => {
      api.get<{ data: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}&limit=10`)
        .then((r) => setResults(r.data ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (query.trim().length < 2) return null;

  const TYPE_LABEL: Record<string, string> = {
    matter: 'Matter', client: 'Client', document: 'Document', task: 'Task',
  };

  return (
    <div className="absolute left-0 top-11 z-50 w-full rounded-xl border border-gray-200 bg-white shadow-2xl">
      {loading ? (
        <div className="px-4 py-4 text-sm text-gray-400">Searching…</div>
      ) : !results.length ? (
        <div className="px-4 py-4 text-sm text-gray-400">No results for &quot;{query}&quot;</div>
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 py-1">
          {results.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <Link
                href={r.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50"
              >
                <span className="text-xs font-medium rounded px-1.5 py-0.5 bg-gray-100 text-gray-500 flex-shrink-0">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.label}</p>
                  {r.sub && <p className="text-xs text-gray-500 truncate">{r.sub}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NEW_ITEMS = [
  { label: 'New Matter',   href: '/app/matters/new',   icon: <Briefcase className="h-4 w-4" /> },
  { label: 'New Client',   href: '/app/clients/new',   icon: <Users className="h-4 w-4" /> },
  { label: 'New Invoice',  href: '/app/billing/new',   icon: <Receipt className="h-4 w-4" /> },
  { label: 'New Task',     href: '/app/tasks/new',     icon: <CheckSquare className="h-4 w-4" /> },
  { label: 'New Event',    href: '/app/calendar/new',  icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'New Document', href: '/app/documents/new', icon: <FileText className="h-4 w-4" /> },
];

type Props = { title?: string };

export function TopBar({ title }: Props) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen]   = useState(false);
  const [newOpen, setNewOpen]       = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const newRef    = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef,  () => setNotifOpen(false));
  useClickOutside(searchRef, () => setSearchOpen(false));
  useClickOutside(newRef,    () => setNewOpen(false));

  useEffect(() => {
    api.get<{ data: { unread: number } }>('/notifications/unread-count')
      .then((r) => setUnreadCount(r.data?.unread ?? 0))
      .catch(() => null);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 gap-4">
      {/* Left: title + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {title && <h1 className="text-lg font-semibold text-gray-900 flex-shrink-0">{title}</h1>}
        {/* Global search — always visible */}
        <div ref={searchRef} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search matters, clients, documents…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-4 text-sm placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 bg-gray-50"
          />
          {searchOpen && (
            <GlobalSearchPanel query={searchQuery} onClose={() => { setSearchOpen(false); setSearchQuery(''); }} />
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Global NEW button */}
        <div ref={newRef} className="relative">
          <button
            onClick={() => setNewOpen((v) => !v)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors"
            title="Create new"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
          {newOpen && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-xl py-1">
              {NEW_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNewOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-700"
                >
                  <span className="text-gray-400">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Messaging */}
        <Link href="/app/messaging" className="btn-ghost p-2 rounded-lg" title="Messages">
          <MessageSquare className="h-5 w-5" />
        </Link>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            className="relative btn-ghost p-2 rounded-lg"
            title="Notifications"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
        </div>

        <button className="btn-ghost p-2 rounded-lg" title="Help">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
          {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
}
