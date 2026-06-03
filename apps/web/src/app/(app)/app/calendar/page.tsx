'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, List, CalendarDays, ChevronDown, RefreshCw, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type CalendarEvent = {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  status: string;
  matter?: { matterCode: string } | null;
};

const EVENT_COLORS: Record<string, string> = {
  COURT_HEARING:    'bg-red-100 text-red-800 border-red-200',
  CLIENT_MEETING:   'bg-blue-100 text-blue-800 border-blue-200',
  INTERNAL_MEETING: 'bg-purple-100 text-purple-800 border-purple-200',
  DEADLINE:         'bg-amber-100 text-amber-800 border-amber-200',
  REMINDER:         'bg-green-100 text-green-800 border-green-200',
  OTHER:            'bg-gray-100 text-gray-700 border-gray-200',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today  = new Date();
  const router = useRouter();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [view, setView]     = useState<'month' | 'list'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<CalendarEvent | null>(null);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [refreshKey, setRefreshKey]       = useState(0); // force reload

  const loadEvents = useCallback(() => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    // Try both with and without date filter in case API doesn't support it
    api.get<{ data: CalendarEvent[] }>(`/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=500`)
      .then((r) => setEvents(r.data ?? []))
      .catch(() =>
        // Fallback: fetch all events without date filter
        api.get<{ data: CalendarEvent[] }>('/calendar/events?limit=500')
          .then((r) => setEvents(r.data ?? []))
          .catch(() => setEvents([]))
      )
      .finally(() => setLoading(false));
  }, [year, month, refreshKey]); // refreshKey forces reload

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const [showJump, setShowJump] = useState(false);
  const [filterType, setFilterType] = useState('');

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const handleDayDoubleClick = (day: number) => {
    const date = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    window.location.href = `/app/calendar/new?date=${date}`;
  };

  const eventsOnDay = (day: number) => events.filter((e) => {
    const d = new Date(e.startTime);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
      && (!filterType || e.eventType === filterType);
  });

  const daysInMonth  = getDaysInMonth(year, month);
  const firstDaySlot = getFirstDayOfMonth(year, month);
  const cells = Array.from({ length: firstDaySlot + daysInMonth }, (_, i) =>
    i < firstDaySlot ? null : i - firstDaySlot + 1
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500">Court dates, meetings, deadlines and firm events</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${view === 'month' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <CalendarDays className="h-3.5 w-3.5" /> Month
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          {/* Refresh */}
          <button onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40 transition-colors" title="Refresh events">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Sync */}
          <button onClick={() => setShowSyncPanel((v) => !v)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
            <Globe className="h-3.5 w-3.5" /> Sync
          </button>
          {/* New Event — navigates to form */}
          <Link href="/app/calendar/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New Event</Button>
          </Link>
        </div>
      </div>

      {/* Google / Outlook sync panel */}
      {showSyncPanel && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" /> Calendar Sync
            </h3>
            <button onClick={() => setShowSyncPanel(false)} className="text-blue-400 hover:text-blue-600 text-xs">Close</button>
          </div>
          <p className="text-xs text-blue-700">
            Connect your Google or Microsoft Outlook calendar to sync events automatically.
            Go to <strong>Settings → Integrations</strong> to configure OAuth credentials first.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a href="/app/settings/integrations"
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </a>
            <a href="/app/settings/integrations"
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#F25022" d="M11.5 11.5H0V0h11.5z"/>
                <path fill="#7FBA00" d="M24 11.5H12.5V0H24z"/>
                <path fill="#00A4EF" d="M11.5 24H0V12.5h11.5z"/>
                <path fill="#FFB900" d="M24 24H12.5V12.5H24z"/>
              </svg>
              Connect Outlook Calendar
            </a>
            <button onClick={() => { setRefreshKey((k) => k + 1); setShowSyncPanel(false); }}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Force Sync Now
            </button>
          </div>
          <p className="text-[11px] text-blue-500">
            OAuth integration for Google (Google Calendar API) and Microsoft (Graph API / Outlook)
            must be configured in Settings → Integrations with valid client credentials before sync is active.
          </p>
        </div>
      )}

      {/* Month navigation + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft className="h-5 w-5 text-gray-600" /></button>
        {/* Month/Year jump picker */}
        <div className="relative">
          <button onClick={() => setShowJump((v) => !v)}
            className="flex items-center gap-1 text-lg font-semibold text-gray-900 hover:text-primary-700 min-w-[160px] justify-center px-2 py-1 rounded-lg hover:bg-gray-100">
            {MONTHS[month]} {year}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {showJump && (
            <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64">
              <div className="flex gap-2 mb-2">
                <select value={month} onChange={(e) => { setMonth(parseInt(e.target.value)); setShowJump(false); }} className="form-select flex-1 text-sm">
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select value={year} onChange={(e) => { setYear(parseInt(e.target.value)); setShowJump(false); }} className="form-select w-24 text-sm">
                  {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight className="h-5 w-5 text-gray-600" /></button>
        <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} className="text-xs text-primary-600 hover:underline border border-primary-200 rounded-lg px-3 py-1">Today</button>

        {/* Filter */}
        <div className="ml-auto flex items-center gap-2">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-select h-8 text-xs w-44">
            <option value="">All Event Types</option>
            <option value="COURT_HEARING">Court Hearings</option>
            <option value="CLIENT_MEETING">Client Meetings</option>
            <option value="DEADLINE">Deadlines</option>
            <option value="COMPLIANCE_DATE">Compliance Dates</option>
            <option value="BRING_UP">Bring Ups</option>
            <option value="REMINDER">Reminders</option>
            <option value="INTERNAL_MEETING">Internal Meetings</option>
          </select>
        </div>
      </div>

      {view === 'month' ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">{d}</div>
            ))}
          </div>
          {/* Cells */}
          <div className="grid grid-cols-7 divide-x divide-gray-100">
            {cells.map((day, idx) => {
              const isToday = day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayEvents = day !== null ? eventsOnDay(day) : [];
              const hasCompliance = dayEvents.some((e) => e.eventType === 'COMPLIANCE_DATE' || e.eventType === 'DEADLINE');
              const hasHearing    = dayEvents.some((e) => e.eventType === 'COURT_HEARING');
              return (
                <div
                  key={idx}
                  onDoubleClick={() => day && handleDayDoubleClick(day)}
                  title={day ? 'Double-click to add event' : undefined}
                  className={`min-h-[100px] p-1.5 border-b border-gray-100 cursor-default ${!day ? 'bg-gray-50/50' : 'hover:bg-blue-50/30'} ${hasCompliance ? 'ring-1 ring-inset ring-amber-300' : ''} ${hasHearing ? 'ring-1 ring-inset ring-red-200' : ''}`}
                >
                  {day && (
                    <>
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${isToday ? 'bg-primary-600 text-white' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {loading ? null : dayEvents.slice(0, 3).map((e) => (
                          <button
                            key={e.id}
                            onClick={() => setSelected(e)}
                            className={`w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded border truncate ${EVENT_COLORS[e.eventType] ?? EVENT_COLORS.OTHER}`}
                          >
                            {e.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[11px] text-gray-400 pl-1">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">Loading events…</div>
          ) : !events.length ? (
            <div className="text-center py-8 text-sm text-gray-400">No events this month</div>
          ) : (
            events
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((e) => {
                const d = new Date(e.startTime);
                return (
                  <div key={e.id} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
                    <div className="flex-shrink-0 text-center w-10">
                      <p className="text-xs text-gray-400 uppercase">{DAYS[d.getDay()]}</p>
                      <p className="text-xl font-bold text-gray-900 leading-tight">{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{e.title}</p>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${EVENT_COLORS[e.eventType] ?? EVENT_COLORS.OTHER}`}>
                          {e.eventType?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</span>
                        {e.location && <span>· {e.location}</span>}
                        {e.matter && <span>· {e.matter.matterCode}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Event detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><Plus className="h-5 w-5 rotate-45" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-gray-500 w-20 flex-shrink-0">Type</dt><dd className="text-gray-900">{selected.eventType?.replace(/_/g, ' ')}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-20 flex-shrink-0">Start</dt><dd className="text-gray-900">{new Date(selected.startTime).toLocaleString('en-KE')}</dd></div>
              {selected.endTime && <div className="flex gap-2"><dt className="text-gray-500 w-20 flex-shrink-0">End</dt><dd className="text-gray-900">{new Date(selected.endTime).toLocaleString('en-KE')}</dd></div>}
              {selected.location && <div className="flex gap-2"><dt className="text-gray-500 w-20 flex-shrink-0">Location</dt><dd className="text-gray-900">{selected.location}</dd></div>}
              {selected.matter && <div className="flex gap-2"><dt className="text-gray-500 w-20 flex-shrink-0">Matter</dt><dd className="text-gray-900">{selected.matter.matterCode}</dd></div>}
              <div className="flex gap-2"><dt className="text-gray-500 w-20 flex-shrink-0">Status</dt><dd className="text-gray-900">{selected.status}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
