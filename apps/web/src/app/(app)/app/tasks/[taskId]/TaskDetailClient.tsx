'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, initials } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft, MessageSquare, Clock, User, Calendar, Flag, CheckCircle,
  XCircle, Send, Edit2, Save, X, Bell, CalendarDays, Tag, Plus, Trash2,
} from 'lucide-react';

type Comment = {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

type TaskDetail = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  completedAt?: string | null;
  matterId: string;
  createdAt: string;
  matter?: { id: string; title: string; matterCode: string } | null;
  assignee?: { id: string; name: string; email: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
};

type LabelDef = { id: string; name: string; color: string; module: string };

const PRIORITY_COLOR: Record<string, 'red' | 'yellow' | 'blue' | 'gray'> = {
  URGENT: 'red', HIGH: 'yellow', NORMAL: 'blue', LOW: 'gray',
};

const STATUS_ACTIONS: Record<string, { label: string; nextStatus: string; variant: 'primary' | 'secondary' | 'danger' }[]> = {
  TODO:        [{ label: 'Start',     nextStatus: 'IN_PROGRESS', variant: 'primary' },   { label: 'Cancel', nextStatus: 'CANCELLED', variant: 'danger' }],
  IN_PROGRESS: [{ label: 'Mark Done', nextStatus: 'DONE',        variant: 'primary' },   { label: 'Block',  nextStatus: 'BLOCKED',    variant: 'secondary' }, { label: 'Cancel', nextStatus: 'CANCELLED', variant: 'danger' }],
  BLOCKED:     [{ label: 'Resume',    nextStatus: 'IN_PROGRESS', variant: 'primary' },   { label: 'Cancel', nextStatus: 'CANCELLED', variant: 'danger' }],
  DONE: [], CANCELLED: [],
};

export function TaskDetailClient({ taskId }: { taskId: string }) {
  const [task, setTask]           = useState<TaskDetail | null>(null);
  const [comments, setComments]   = useState<Comment[]>([]);
  const [labels, setLabels]       = useState<string[]>([]);
  const [labelDefs, setLabelDefs] = useState<LabelDef[]>([]);
  const [users, setUsers]         = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading]     = useState(true);

  // Edit state
  const [editing, setEditing]     = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm]   = useState({ title: '', description: '', priority: 'NORMAL', dueDate: '', assignedTo: '' });

  // Comment state
  const [message, setMessage]     = useState('');
  const [sending, setSending]     = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reminder modal
  const [showReminder, setShowReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({ remindAt: '', channel: 'IN_APP', message: '' });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderMsg, setReminderMsg]   = useState('');

  // Calendar link modal
  const [showCalendar, setShowCalendar] = useState(false);
  const [calForm, setCalForm] = useState({ title: '', startTime: '', endTime: '', description: '' });
  const [calSaving, setCalSaving]   = useState(false);
  const [calMsg, setCalMsg]         = useState('');

  const loadTask = () =>
    api.get<TaskDetail>(`/tasks/${taskId}`)
      .then((t) => {
        setTask(t);
        setEditForm({
          title:       t.title ?? '',
          description: t.description ?? '',
          priority:    t.priority ?? 'NORMAL',
          dueDate:     t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : '',
          assignedTo:  t.assignee?.id ?? '',
        });
      })
      .catch(() => setTask(null))
      .finally(() => setLoading(false));

  const loadComments = () =>
    api.get<{ data: Comment[] }>(`/tasks/${taskId}/comments?limit=100`)
      .then((r) => setComments(r.data ?? []))
      .catch(() => {});

  const loadLabels = () =>
    Promise.all([
      api.get<{ data: string[] }>(`/tasks/${taskId}/labels`).then((r) => setLabels(r.data ?? [])).catch(() => {}),
      api.get<{ data: Record<string, LabelDef[]> }>(`/settings/labels?module=TASK`).then((r) => setLabelDefs(r.data?.TASK ?? [])).catch(() => {}),
    ]);

  useEffect(() => {
    Promise.all([
      loadTask(),
      loadComments(),
      loadLabels(),
      api.get<{ data: { id: string; name: string }[] }>('/users?limit=100').then((r) => setUsers(r.data ?? [])).catch(() => {}),
    ]);
  }, [taskId]);

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await api.patch(`/tasks/${taskId}`, {
        title:       editForm.title || undefined,
        description: editForm.description || null,
        priority:    editForm.priority || undefined,
        dueDate:     editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
        assignedTo:  editForm.assignedTo || null,
      });
      setEditing(false);
      loadTask();
    } catch { /* show error in future iteration */ }
    finally { setEditSaving(false); }
  };

  const sendComment = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { message: message.trim() });
      setMessage('');
      await loadComments();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally { setSending(false); }
  };

  const updateStatus = async (nextStatus: string) => {
    setTransitioning(true);
    try {
      await api.post(`/tasks/${taskId}/status`, { status: nextStatus });
      await loadTask();
    } finally { setTransitioning(false); }
  };

  const setReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setReminderSaving(true);
    try {
      await api.post(`/tasks/${taskId}/reminders`, {
        remindAt: new Date(reminderForm.remindAt).toISOString(),
        channel:  reminderForm.channel,
        message:  reminderForm.message || null,
      });
      setReminderMsg('Reminder set successfully.');
      setShowReminder(false);
    } catch (err: unknown) {
      setReminderMsg(err instanceof Error ? err.message : 'Failed to set reminder');
    } finally { setReminderSaving(false); }
  };

  const linkCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalSaving(true);
    try {
      await api.post(`/tasks/${taskId}/calendar-link`, {
        title:       calForm.title || task?.title,
        startTime:   new Date(calForm.startTime).toISOString(),
        endTime:     new Date(calForm.endTime).toISOString(),
        description: calForm.description || null,
      });
      setCalMsg('Added to calendar.');
      setShowCalendar(false);
    } catch (err: unknown) {
      setCalMsg(err instanceof Error ? err.message : 'Failed to add to calendar');
    } finally { setCalSaving(false); }
  };

  const toggleLabel = async (labelId: string) => {
    const updated = labels.includes(labelId)
      ? labels.filter((l) => l !== labelId)
      : [...labels, labelId];
    setLabels(updated);
    await api.patch(`/tasks/${taskId}/labels`, { labels: updated }).catch(() => {});
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  if (!task) return <div className="text-center text-gray-500 py-16">Task not found or access denied.</div>;

  const actions = STATUS_ACTIONS[task.status] ?? [];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !['DONE', 'CANCELLED'].includes(task.status);
  const appliedLabels = labelDefs.filter((l) => labels.includes(l.id));

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/app/tasks" className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <input
                className="form-input text-xl font-bold flex-1 min-w-[200px]"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            )}
            <StatusBadge status={task.status} />
            <Badge variant={PRIORITY_COLOR[task.priority] ?? 'gray'}>{task.priority}</Badge>
            {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">OVERDUE</span>}
          </div>
          {task.matter && (
            <p className="text-sm text-gray-500 mt-0.5">
              <Link href={`/app/matters/${task.matter.id}`} className="hover:underline text-primary-600">{task.matter.title}</Link>
              <span className="text-gray-400 font-mono ml-2 text-xs">{task.matter.matterCode}</span>
            </p>
          )}
          {appliedLabels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {appliedLabels.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: l.color }}>
                  <Tag className="h-2.5 w-2.5" />{l.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {!editing ? (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" loading={editSaving} onClick={saveEdit}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </>
          )}
          {actions.map((a) => (
            <Button key={a.nextStatus} size="sm" variant={a.variant} loading={transitioning} onClick={() => updateStatus(a.nextStatus)}>
              {a.nextStatus === 'DONE'      && <CheckCircle className="h-4 w-4" />}
              {a.nextStatus === 'CANCELLED' && <XCircle className="h-4 w-4" />}
              {a.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Notification banners */}
      {reminderMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{reminderMsg}</div>
      )}
      {calMsg && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">{calMsg}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — description, edit fields, messaging */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description (editable) */}
          <Card>
            <CardHeader><h2 className="font-semibold text-sm">Description</h2></CardHeader>
            <CardBody>
              {editing ? (
                <textarea
                  className="form-input w-full resize-none text-sm"
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Task description…"
                />
              ) : task.description ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No description. Click Edit to add one.</p>
              )}
            </CardBody>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <h2 className="font-semibold text-sm">Comments</h2>
                {comments.length > 0 && <span className="badge-blue">{comments.length}</span>}
              </div>
            </CardHeader>
            <CardBody className="space-y-3 min-h-[120px] max-h-[400px] overflow-y-auto">
              {!comments.length ? (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the conversation below.</p>
              ) : (
                [...comments].reverse().map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                      {initials(c.user.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-gray-800">{c.user.name}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </CardBody>
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendComment(); }}
                  placeholder="Add a comment… (Ctrl+Enter to send)"
                  rows={2}
                  className="form-input flex-1 resize-none text-sm"
                />
                <Button onClick={sendComment} loading={sending} disabled={!message.trim()} size="sm" className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Ctrl+Enter to send</p>
            </div>
          </Card>
        </div>

        {/* Right — metadata + actions */}
        <div className="space-y-3">
          <Card className="p-4 space-y-4 text-sm">
            {/* Assignee */}
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1"><User className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wide">Assignee</span></div>
              {editing ? (
                <select className="form-select w-full text-sm" value={editForm.assignedTo} onChange={(e) => setEditForm((f) => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : (
                <p className="font-medium text-gray-900">{task.assignee?.name ?? <span className="text-gray-400 italic">Unassigned</span>}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1"><Flag className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wide">Priority</span></div>
              {editing ? (
                <select className="form-select w-full text-sm" value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              ) : (
                <Badge variant={PRIORITY_COLOR[task.priority] ?? 'gray'}>{task.priority}</Badge>
              )}
            </div>

            {/* Due Date */}
            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1"><Clock className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wide">Due Date</span></div>
              {editing ? (
                <input type="datetime-local" className="form-input w-full text-sm" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} />
              ) : (
                <p className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                  {task.dueDate ? formatDateTime(task.dueDate) : '—'}
                </p>
              )}
            </div>

            {task.completedAt && (
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-1"><CheckCircle className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wide">Completed</span></div>
                <p className="text-green-700">{formatDate(task.completedAt)}</p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 text-gray-500 mb-1"><User className="h-3.5 w-3.5" /><span className="text-xs font-medium uppercase tracking-wide">Created By</span></div>
              <p className="text-gray-700">{task.createdBy?.name ?? '—'}</p>
            </div>

            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400">Created {formatDateTime(task.createdAt)}</p>
            </div>
          </Card>

          {/* Labels */}
          {labelDefs.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> Labels</p>
                <Link href="/app/settings/labels" className="text-xs text-primary-600 hover:underline">Manage</Link>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {labelDefs.map((l) => {
                  const active = labels.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-all ${
                        active ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 hover:border-gray-400 bg-white'
                      }`}
                      style={active ? { backgroundColor: l.color, borderColor: l.color } : {}}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card className="p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Actions</p>
            {task.matterId && (
              <Link href={`/app/matters/${task.matterId}`} className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                <Flag className="h-3.5 w-3.5" /> View Matter
              </Link>
            )}
            <button
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full text-left"
              onClick={() => { setShowReminder(true); setReminderMsg(''); }}
            >
              <Bell className="h-3.5 w-3.5" /> Set Reminder
            </button>
            <button
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full text-left"
              onClick={() => {
                const start = task.dueDate ? new Date(new Date(task.dueDate).getTime() - 60 * 60 * 1000).toISOString().slice(0, 16) : '';
                setCalForm({ title: task.title, startTime: start, endTime: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '', description: task.description ?? '' });
                setShowCalendar(true); setCalMsg('');
              }}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Add to Calendar
            </button>
          </Card>
        </div>
      </div>

      {/* Set Reminder Modal */}
      {showReminder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Bell className="h-4 w-4 text-primary-600" /> Set Reminder</h3>
              <button onClick={() => setShowReminder(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={setReminder} className="space-y-3">
              <div>
                <label className="form-label">Remind At *</label>
                <input required type="datetime-local" value={reminderForm.remindAt} onChange={(e) => setReminderForm((f) => ({ ...f, remindAt: e.target.value }))} className="form-input w-full" min={new Date().toISOString().slice(0, 16)} />
              </div>
              <div>
                <label className="form-label">Channel</label>
                <select value={reminderForm.channel} onChange={(e) => setReminderForm((f) => ({ ...f, channel: e.target.value }))} className="form-select w-full">
                  <option value="IN_APP">In-App</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
              <div>
                <label className="form-label">Custom Message</label>
                <input value={reminderForm.message} onChange={(e) => setReminderForm((f) => ({ ...f, message: e.target.value }))} className="form-input w-full" placeholder="Optional reminder message…" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={reminderSaving}>Set Reminder</Button>
                <Button type="button" variant="secondary" onClick={() => setShowReminder(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary-600" /> Add to Calendar</h3>
              <button onClick={() => setShowCalendar(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={linkCalendar} className="space-y-3">
              <div>
                <label className="form-label">Event Title</label>
                <input value={calForm.title} onChange={(e) => setCalForm((f) => ({ ...f, title: e.target.value }))} className="form-input w-full" placeholder={task.title} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Start *</label>
                  <input required type="datetime-local" value={calForm.startTime} onChange={(e) => setCalForm((f) => ({ ...f, startTime: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">End *</label>
                  <input required type="datetime-local" value={calForm.endTime} min={calForm.startTime} onChange={(e) => setCalForm((f) => ({ ...f, endTime: e.target.value }))} className="form-input w-full" />
                </div>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea value={calForm.description} onChange={(e) => setCalForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="form-input w-full resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={calSaving}>Add to Calendar</Button>
                <Button type="button" variant="secondary" onClick={() => setShowCalendar(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
