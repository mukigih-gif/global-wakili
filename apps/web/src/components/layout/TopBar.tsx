'use client';

import { Bell, Search, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Props = { title?: string };

export function TopBar({ title }: Props) {
  const { user } = useAuth();
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search matters, clients, documents…"
            className="h-9 w-72 rounded-lg border border-gray-200 pl-9 pr-4 text-sm placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative btn-ghost p-2 rounded-lg" title="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <button className="btn-ghost p-2 rounded-lg" title="Help">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
          {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
}
