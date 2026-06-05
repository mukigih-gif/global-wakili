'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Bell, Mail, MessageSquare, Phone } from 'lucide-react';

type Notification = {
  id: string;
  channel: string;
  systemTitle: string;
  systemMessage: string;
  status: string;
  priority: string;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Notification[] }>('/notifications/search?limit=30')
      .then((r) => setNotifications(r.data ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const channelIcon = (ch: string) => {
    if (ch === 'EMAIL') return <Mail className="h-4 w-4 text-blue-500" />;
    if (ch === 'SMS') return <Phone className="h-4 w-4 text-green-500" />;
    if (ch === 'PUSH') return <Bell className="h-4 w-4 text-purple-500" />;
    return <MessageSquare className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">All system alerts, reminders, and messages</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200 text-sm mb-2">
        {['All', 'Unread', 'Email', 'SMS', 'Push', 'System'].map((tab) => (
          <button key={tab} className="pb-2 text-gray-500 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-400 transition-colors">
            {tab}
          </button>
        ))}
      </div>

      <Table>
        <thead>
          <tr><Th>Ch.</Th><Th>Title</Th><Th>Message</Th><Th>Priority</Th><Th>Status</Th><Th>Received</Th><Th>Read</Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={7} /> :
           !notifications.length ? <EmptyRow colSpan={7} message="No notifications" /> :
           notifications.map((n) => (
             <tr key={n.id} className={!n.readAt ? 'bg-primary-50/40' : ''}>
               <Td>{channelIcon(n.channel)}</Td>
               <Td className={!n.readAt ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}>{n.systemTitle}</Td>
               <Td className="text-xs text-gray-500 max-w-xs truncate">{n.systemMessage}</Td>
               <Td><StatusBadge status={n.priority} /></Td>
               <Td><StatusBadge status={n.status} /></Td>
               <Td className="text-xs text-gray-500">{formatDateTime(n.createdAt)}</Td>
               <Td className="text-xs text-gray-500">{n.readAt ? formatDateTime(n.readAt) : <span className="badge-blue">Unread</span>}</Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
