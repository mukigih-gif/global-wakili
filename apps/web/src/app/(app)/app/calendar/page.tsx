'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, CalendarDays } from 'lucide-react';

type CalendarEvent = {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  status: string;
  organizer?: { name: string } | null;
  matter?: { title: string; matterCode: string } | null;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (type) params.set('eventType', type);
    api.get<{ data: CalendarEvent[] }>(`/calendar/events?${params}`)
      .then((r) => setEvents(r.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [query, type]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Court dates, meetings, deadlines and firm events</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4" /> New Event</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="form-select w-44">
          <option value="">All Types</option>
          <option value="COURT_HEARING">Court Hearing</option>
          <option value="CLIENT_MEETING">Client Meeting</option>
          <option value="INTERNAL_MEETING">Internal Meeting</option>
          <option value="DEADLINE">Deadline</option>
          <option value="REMINDER">Reminder</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Type</Th>
            <Th>Start</Th>
            <Th>End</Th>
            <Th>Location</Th>
            <Th>Matter</Th>
            <Th>Organizer</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !events.length ? (
             <EmptyRow colSpan={8} message="No events scheduled" />
           ) : (
             events.map((e) => (
               <tr key={e.id}>
                 <Td>
                   <div className="flex items-center gap-2">
                     <CalendarDays className="h-4 w-4 text-gray-400 flex-shrink-0" />
                     <span className="font-medium text-gray-900">{e.title}</span>
                   </div>
                 </Td>
                 <Td className="text-gray-600 text-xs">{e.eventType?.replace(/_/g, ' ')}</Td>
                 <Td className="text-gray-600 text-xs">{formatDate(e.startTime)}</Td>
                 <Td className="text-gray-500 text-xs">{e.endTime ? formatDate(e.endTime) : '—'}</Td>
                 <Td className="text-gray-600 text-sm">{e.location ?? '—'}</Td>
                 <Td className="text-gray-600 text-xs">
                   {e.matter ? `${e.matter.matterCode}` : '—'}
                 </Td>
                 <Td className="text-gray-600 text-sm">{e.organizer?.name ?? '—'}</Td>
                 <Td><StatusBadge status={e.status} /></Td>
               </tr>
             ))
           )}
        </tbody>
      </Table>
    </div>
  );
}
