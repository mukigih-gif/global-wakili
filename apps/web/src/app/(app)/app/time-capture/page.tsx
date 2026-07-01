'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Clock, Mail, FileText, CalendarDays, CheckSquare, Plus, Zap, Play, Square, Timer } from 'lucide-react';

type WIPEntry = {
  id: string;
  activityType: string;
  description: string;
  durationMinutes: number;
  status: string;
  source: string;
  matter?: { title: string; matterCode: string } | null;
  capturedAt: string;
  approvedBy?: { name: string } | null;
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  EMAIL:    <Mail className="h-4 w-4 text-blue-500" />,
  DOCUMENT: <FileText className="h-4 w-4 text-gray-500" />,
  CALENDAR: <CalendarDays className="h-4 w-4 text-purple-500" />,
  MANUAL:   <Clock className="h-4 w-4 text-gray-400" />,
  TASK:     <CheckSquare className="h-4 w-4 text-green-500" />,
};

const ACTIVITY_SOURCES = [
  { key: 'EMAIL',    label: 'Email Activity',     icon: <Mail className="h-5 w-5 text-blue-500" />,    desc: 'Emails sent and received relating to matters — auto-classified by matter context.' },
  { key: 'DOCUMENT', label: 'Document Activity',  icon: <FileText className="h-5 w-5 text-gray-500" />, desc: 'Time spent drafting and editing matter documents.' },
  { key: 'CALENDAR', label: 'Calendar Activity',  icon: <CalendarDays className="h-5 w-5 text-purple-500" />, desc: 'Court hearings, client meetings, and other calendar events.' },
  { key: 'TASK',     label: 'Task Activity',      icon: <CheckSquare className="h-5 w-5 text-green-500" />, desc: 'Task completion time tracked per matter.' },
];

export default function TimeCapturePage() {
  const [entries, setEntries]     = useState<WIPEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState('');
  const [source, setSource]       = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ description: '', durationMinutes: '', matterId: '' });
  const [matters, setMatters]     = useState<{ id: string; title: string; matterCode: string }[]>([]);
  const [manualSaving, setManualSaving] = useState(false);

  const loadEntries = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    api.get<{ data: WIPEntry[] }>(`/time-capture/wip?${params}&limit=30`)
      .then((r) => setEntries(r.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEntries(); }, [status, source]);
  useEffect(() => {
    api.get<{ data: { id: string; title: string; matterCode: string }[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const actOnEntry = async (id: string, action: 'approve' | 'reject') => {
    setActioning(id + action);
    try {
      await api.patch(`/time-capture/wip/${id}/${action}`, {});
      loadEntries();
    } catch { loadEntries(); }
    finally { setActioning(null); }
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.description || !manualForm.durationMinutes) return;
    setManualSaving(true);
    try {
      await api.post('/time-capture/wip', {
        source: 'MANUAL',
        description: manualForm.description,
        durationMinutes: parseInt(manualForm.durationMinutes),
        matterId: manualForm.matterId || null,
        status: 'PENDING_APPROVAL',
      });
      setManualForm({ description: '', durationMinutes: '', matterId: '' });
      setShowManual(false);
      loadEntries();
    } catch { /* ignore */ }
    finally { setManualSaving(false); }
  };

  const pendingCount   = entries.filter((e) => e.status === 'PENDING_APPROVAL').length;
  const totalMinutes   = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  // Live timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDesc, setTimerDesc]       = useState('');
  const [timerRef, setTimerRef]         = useState<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimerRunning(true);
    const ref = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    setTimerRef(ref);
  };

  const stopTimer = async () => {
    if (timerRef) clearInterval(timerRef);
    setTimerRunning(false);
    const minutes = Math.round(timerSeconds / 60);
    if (minutes > 0 && timerDesc) {
      try {
        await api.post('/time-capture/wip', {
          source: 'MANUAL', description: timerDesc, durationMinutes: minutes, status: 'PENDING_APPROVAL',
        });
        setEntries((prev) => [{ id: Date.now().toString(), activityType: 'MANUAL', description: timerDesc, durationMinutes: minutes, status: 'PENDING_APPROVAL', source: 'MANUAL', capturedAt: new Date().toISOString() } as any, ...prev]);
      } catch { /* silently ignore */ }
    }
    setTimerSeconds(0);
    setTimerDesc('');
  };

  const fmtTimer = (s: number) => `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Capture</h1>
          <p className="text-sm text-gray-500">Live timer + passive background activity engine — WIP entries for billing</p>
        </div>
        <Button size="sm" onClick={() => setShowManual(true)}><Plus className="h-4 w-4" /> Manual Entry</Button>
      </div>

      {/* Live Timer Widget */}
      <div className={`rounded-2xl border-2 p-5 ${timerRunning ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Timer className={`h-6 w-6 ${timerRunning ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
            <div>
              <p className="text-3xl font-bold font-mono text-gray-900">{fmtTimer(timerSeconds)}</p>
              <p className="text-xs text-gray-500">{timerRunning ? 'Timer running — stop to save as WIP entry' : 'Click Start to begin timing a task'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={timerDesc} onChange={(e) => setTimerDesc(e.target.value)} placeholder="What are you working on?" disabled={timerRunning} className="form-input h-9 w-56" />
            {!timerRunning ? (
              <Button size="sm" onClick={startTimer} disabled={!timerDesc.trim()} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4" /> Start
              </Button>
            ) : (
              <Button size="sm" variant="danger" onClick={stopTimer}>
                <Square className="h-4 w-4" /> Stop & Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-primary-600" /><p className="text-xs text-gray-500">Total Captured</p></div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-amber-600" /><p className="text-xs text-amber-700">Pending Approval</p></div>
          <p className="text-2xl font-bold text-amber-800">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Auto-captured</p>
          <p className="text-2xl font-bold text-gray-900">{entries.filter((e) => e.source !== 'MANUAL').length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Manual Entries</p>
          <p className="text-2xl font-bold text-gray-900">{entries.filter((e) => e.source === 'MANUAL').length}</p>
        </div>
      </div>

      {/* Activity sources */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity Sources</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIVITY_SOURCES.map((s) => (
            <div key={s.key} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                {s.icon}
                <h3 className="font-semibold text-gray-900 text-sm">{s.label}</h3>
              </div>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* WIP entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">WIP Entries</h2>
          <div className="flex gap-2">
            <select value={source} onChange={(e) => setSource(e.target.value)} className="form-select text-xs w-36">
              <option value="">All Sources</option>
              <option value="EMAIL">Email</option>
              <option value="DOCUMENT">Document</option>
              <option value="CALENDAR">Calendar</option>
              <option value="TASK">Task</option>
              <option value="MANUAL">Manual</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-select text-xs w-40">
              <option value="">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="BILLED">Billed</option>
            </select>
          </div>
        </div>

        <Table>
          <thead>
            <tr><Th>Source</Th><Th>Description</Th><Th>Matter</Th><Th>Duration</Th><Th>Status</Th><Th>Captured</Th><Th>Approved By</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={8} /> :
             !entries.length ? <EmptyRow colSpan={8} message="No WIP entries — activity will appear here as it is captured" /> :
             entries.map((e) => (
               <tr key={e.id} className={e.status === 'PENDING_APPROVAL' ? 'bg-amber-50/30' : ''}>
                 <Td>
                   <div className="flex items-center gap-2">
                     {SOURCE_ICONS[e.source] ?? <Clock className="h-4 w-4 text-gray-300" />}
                     <span className="text-xs text-gray-500">{e.source}</span>
                   </div>
                 </Td>
                 <Td className="text-sm text-gray-900 max-w-xs truncate">{e.description}</Td>
                 <Td className="text-xs text-gray-600">{e.matter ? `${e.matter.matterCode}` : '—'}</Td>
                 <Td className="font-medium text-gray-900">{formatDuration(e.durationMinutes)}</Td>
                 <Td><StatusBadge status={e.status} /></Td>
                 <Td className="text-xs text-gray-500">{formatDate(e.capturedAt)}</Td>
                 <Td className="text-xs text-gray-500">{e.approvedBy?.name ?? '—'}</Td>
                 <Td>
                   {e.status === 'PENDING_APPROVAL' && (
                     <div className="flex gap-2">
                       <button
                         disabled={!!actioning}
                         onClick={() => actOnEntry(e.id, 'approve')}
                         className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-40"
                       >{actioning === e.id + 'approve' ? '…' : 'Approve'}</button>
                       <button
                         disabled={!!actioning}
                         onClick={() => actOnEntry(e.id, 'reject')}
                         className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40"
                       >{actioning === e.id + 'reject' ? '…' : 'Reject'}</button>
                     </div>
                   )}
                 </Td>
               </tr>
             ))}
          </tbody>
        </Table>
      </div>
      {/* Manual Entry Modal */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowManual(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock className="h-5 w-5 text-primary-600" /> Manual Time Entry</h3>
              <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={submitManual} className="space-y-3">
              <div>
                <label className="form-label">Description *</label>
                <input required value={manualForm.description} onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))} className="form-input w-full" placeholder="e.g. Drafted sale agreement for matter" />
              </div>
              <div>
                <label className="form-label">Duration (minutes) *</label>
                <input required type="number" min="1" value={manualForm.durationMinutes} onChange={(e) => setManualForm((f) => ({ ...f, durationMinutes: e.target.value }))} className="form-input w-full" placeholder="e.g. 90" />
              </div>
              <div>
                <label className="form-label">Link to Matter</label>
                <select value={manualForm.matterId} onChange={(e) => setManualForm((f) => ({ ...f, matterId: e.target.value }))} className="form-select w-full">
                  <option value="">None</option>
                  {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={manualSaving}>Save Entry</Button>
                <Button type="button" variant="secondary" onClick={() => setShowManual(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
