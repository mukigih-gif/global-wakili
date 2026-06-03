'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

type Matter = { id: string; title: string; matterCode: string };
type User   = { id: string; name: string };

function NewEventForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [users, setUsers]     = useState<User[]>([]);

  const defaultDate = params.get('date') || new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: '', type: 'CLIENT_MEETING', startTime: `${defaultDate}T09:00`,  // API expects 'type' not 'eventType'
    endTime: `${defaultDate}T10:00`, location: '', description: '',
    matterId: '', attendeeIds: [] as string[], isAllDay: false,
    reminderMinutes: 30,  // default 30-min reminder
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Matter[] }>('/matters?limit=100&status=ACTIVE').then((r) => setMatters(r.data ?? [])).catch(() => {});
    api.get<{ data: User[] }>('/users?limit=100').then((r) => setUsers(r.data ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/calendar/events', {
        ...form,
        matterId:        form.matterId        || null,
        endTime:         form.isAllDay ? null : (form.endTime || null),
        reminderMinutes: form.reminderMinutes  || 0,
      });
      router.push('/app/calendar');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/calendar" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Event</h1>
          <p className="text-sm text-gray-500">Add a calendar event, hearing or meeting</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Event Details</h2>
        </div>

        <Input label="Event Title *" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Hearing — Doe v Smith" />

        <div>
          <label className="form-label">Event Type *</label>
          <select required value={form.type} onChange={(e) => set('type', e.target.value)} className="form-select w-full">
            <option value="COURT_HEARING">Court Hearing</option>
            <option value="CLIENT_MEETING">Client Meeting</option>
            <option value="INTERNAL_MEETING">Internal Meeting</option>
            <option value="DEADLINE">Deadline</option>
            <option value="COMPLIANCE_DATE">Compliance Date</option>
            <option value="BRING_UP">Bring Up</option>
            <option value="REMINDER">Reminder</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.isAllDay} onChange={(e) => set('isAllDay', e.target.checked)} className="rounded border-gray-300 text-primary-600" />
          All-day event
        </label>

        {!form.isAllDay ? (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start *" type="datetime-local" required value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
            <Input label="End *" type="datetime-local" required value={form.endTime} min={form.startTime} onChange={(e) => set('endTime', e.target.value)} />
          </div>
        ) : (
          <Input label="Date *" type="date" required value={form.startTime.slice(0, 10)} onChange={(e) => set('startTime', `${e.target.value}T00:00`)} />
        )}

        <Input label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Milimani Law Courts, Room 3" />

        <div>
          <label className="form-label">Link to Matter</label>
          <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} className="form-select w-full">
            <option value="">None</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Reminder</label>
          <select value={form.reminderMinutes} onChange={(e) => set('reminderMinutes', e.target.value)} className="form-select w-full">
            <option value={0}>No reminder</option>
            <option value={15}>15 minutes before</option>
            <option value={30}>30 minutes before</option>
            <option value={60}>1 hour before</option>
            <option value={120}>2 hours before</option>
            <option value={1440}>1 day before</option>
            <option value={2880}>2 days before</option>
            <option value={10080}>1 week before</option>
          </select>
          <p className="text-xs text-gray-400 mt-0.5">You and all attendees will receive an in-app notification and email at the reminder time.</p>
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="form-input w-full" placeholder="Additional notes…" />
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}>Save Event</Button>
          <Link href="/app/calendar"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}

export default function NewEventPage() {
  return <Suspense fallback={null}><NewEventForm /></Suspense>;
}
