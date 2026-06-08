'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Bell, Mail, MessageSquare, Phone, CheckCheck } from 'lucide-react';

type Notification = {
  id: string;
  channel: string;
  systemTitle?: string | null;
  systemMessage?: string | null;
  emailSubject?: string | null;
  status: string;
  priority?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type FilterTab = 'All' | 'Unread' | 'EMAIL' | 'SMS' | 'PUSH' | 'SYSTEM_ALERT';

const TAB_LABELS: Record<FilterTab, string> = {
  All:         'All',
  Unread:      'Unread',
  EMAIL:       'Email',
  SMS:         'SMS',
  PUSH:        'Push',
  SYSTEM_ALERT: 'System',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]    = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [markingAll, setMarkingAll] = useState(false);

  const load = (tab: FilterTab = activeTab) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (tab === 'Unread') params.set('unreadOnly', 'true');
    else if (tab !== 'All') params.set('channel', tab);

    api.get<{ data: Notification[] }>(`/notifications/search?${params}`)
      .then((r) => setNotifications(r.data ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTab]);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {}).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/mark-all-read', {}).catch(() => {});
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } finally { setMarkingAll(false); }
  };

  const channelIcon = (ch: string) => {
    if (ch === 'EMAIL')        return <Mail className="h-4 w-4 text-blue-500" />;
    if (ch === 'SMS')          return <Phone className="h-4 w-4 text-green-500" />;
    if (ch === 'PUSH')         return <Bell className="h-4 w-4 text-purple-500" />;
    if (ch === 'SYSTEM_ALERT') return <Bell className="h-4 w-4 text-amber-500" />;
    return <MessageSquare className="h-4 w-4 text-gray-400" />;
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </h1>
          <p className="text-sm text-gray-500">System alerts, reminders, and messages</p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" loading={markingAll} onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as FilterTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {TAB_LABELS[tab]}
            {tab === 'Unread' && unreadCount > 0 && (
              <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <Table>
        <thead>
          <tr><Th>Ch.</Th><Th>Title</Th><Th>Message</Th><Th>Status</Th><Th>Received</Th><Th></Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> :
           !notifications.length ? <EmptyRow colSpan={6} message="No notifications" /> :
           notifications.map((n) => (
             <tr key={n.id} className={!n.readAt ? 'bg-primary-50/40' : ''}>
               <Td>{channelIcon(n.channel)}</Td>
               <Td className={!n.readAt ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}>
                 {n.systemTitle ?? n.emailSubject ?? '—'}
               </Td>
               <Td className="text-xs text-gray-500 max-w-xs truncate">
                 {n.systemMessage ?? '—'}
               </Td>
               <Td><StatusBadge status={n.status} /></Td>
               <Td className="text-xs text-gray-500">{formatDateTime(n.createdAt)}</Td>
               <Td>
                 {!n.readAt
                   ? <button onClick={() => markRead(n.id)} className="text-xs text-primary-600 hover:underline">Mark Read</button>
                   : <span className="text-xs text-gray-400">Read</span>
                 }
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
