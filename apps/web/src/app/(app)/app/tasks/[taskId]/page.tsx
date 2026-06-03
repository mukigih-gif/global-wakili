'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, initials } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, MessageSquare, Clock, User, Calendar, Flag, CheckCircle, XCircle, Send } from 'lucide-react';

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
  comments?: Comment[];
};

const PRIORITY_COLOR: Record<string, 'red' | 'yellow' | 'blue' | 'gray'> = {
  URGENT: 'red', HIGH: 'yellow', NORMAL: 'blue', LOW: 'gray',
};

const STATUS_ACTIONS: Record<string, { label: string; nextStatus: string; variant: 'primary' | 'secondary' | 'danger' }[]> = {
  TODO:        [{ label: 'Start', nextStatus: 'IN_PROGRESS', variant: 'primary' }, { label: 'Cancel', nextStatus: 'CANCELLED', variant: 'danger' }],
  IN_PROGRESS: [{ label: 'Mark Done', nextStatus: 'DONE', variant: 'primary' }, { label: 'Block', nextStatus: 'BLOCKED', variant: 'secondary' }, { label: 'Cancel', nextStatus: 'CANCELLED', variant: 'danger' }],
  BLOCKED:     [{ label: 'Resume', nextStatus: 'IN_PROGRESS', variant: 'primary' }, { label: 'Cancel', nextStatus: 'CANCELLED', variant: 'danger' }],
  DONE: [], CANCELLED: [],
};

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadTask = () =>
    api.get<TaskDetail>(`/tasks/${taskId}`)
      .then((t) => {
        setTask(t);
        setComments(t.comments ?? []);
      })
      .catch(() => setTask(null))
      .finally(() => setLoading(false));

  useEffect(() => { loadTask(); }, [taskId]);

  const loadComments = () =>
    api.get<{ data: Comment[] }>(`/tasks/${taskId}/comments?limit=100`)
      .then((r) => setComments(r.data ?? []))
      .catch(() => {});

  const sendComment = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post(`/tasks/${taskId}/comments`, { message: message.trim() });
      setMessage('');
      await loadComments();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (nextStatus: string) => {
    setTransitioning(true);
    try {
      await api.post(`/tasks/${taskId}/status`, { status: nextStatus });
      await loadTask();
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  if (!task) return <div className="text-center text-gray-500 py-16">Task not found or access denied.</div>;

  const actions = STATUS_ACTIONS[task.status] ?? [];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/app/tasks" className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            <StatusBadge status={task.status} />
            <Badge variant={PRIORITY_COLOR[task.priority] ?? 'gray'}>{task.priority}</Badge>
          </div>
          {task.matter && (
            <p className="text-sm text-gray-500 mt-0.5">
              <Link href={`/app/matters/${task.matter.id}`} className="hover:underline text-primary-600">{task.matter.title}</Link>
              <span className="text-gray-400 font-mono ml-2 text-xs">{task.matter.matterCode}</span>
            </p>
          )}
        </div>
        {/* Status actions */}
        {actions.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            {actions.map((a) => (
              <Button key={a.nextStatus} size="sm" variant={a.variant} loading={transitioning} onClick={() => updateStatus(a.nextStatus)}>
                {a.nextStatus === 'DONE' && <CheckCircle className="h-4 w-4" />}
                {a.nextStatus === 'CANCELLED' && <XCircle className="h-4 w-4" />}
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — details + messaging */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {task.description && (
            <Card>
              <CardHeader><h2 className="font-semibold text-sm">Description</h2></CardHeader>
              <CardBody><p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p></CardBody>
            </Card>
          )}

          {/* Messaging board / Comments */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <h2 className="font-semibold text-sm">Comments & Messaging</h2>
                {comments.length > 0 && <span className="badge-blue">{comments.length}</span>}
              </div>
            </CardHeader>
            <CardBody className="space-y-3 min-h-[120px] max-h-[420px] overflow-y-auto">
              {!comments.length && (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the conversation below.</p>
              )}
              {[...comments].reverse().map((c) => (
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
              ))}
              <div ref={bottomRef} />
            </CardBody>
            {/* Compose */}
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

        {/* Right — metadata */}
        <div className="space-y-3">
          <Card className="p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-500"><User className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Assignee</span></div>
            <p className="font-medium text-gray-900">{task.assignee?.name ?? <span className="text-gray-400 italic">Unassigned</span>}</p>

            <div className="flex items-center gap-2 text-gray-500 mt-3"><Flag className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Priority</span></div>
            <Badge variant={PRIORITY_COLOR[task.priority] ?? 'gray'}>{task.priority}</Badge>

            <div className="flex items-center gap-2 text-gray-500 mt-3"><Clock className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Due Date</span></div>
            <p className={task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-600 font-medium' : 'text-gray-900'}>
              {formatDate(task.dueDate) ?? '—'}
            </p>

            {task.completedAt && (
              <>
                <div className="flex items-center gap-2 text-gray-500 mt-3"><CheckCircle className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Completed</span></div>
                <p className="text-green-700">{formatDate(task.completedAt)}</p>
              </>
            )}

            <div className="flex items-center gap-2 text-gray-500 mt-3"><User className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Created By</span></div>
            <p className="text-gray-700">{task.createdBy?.name ?? '—'}</p>

            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-400">Created {formatDateTime(task.createdAt)}</p>
            </div>
          </Card>

          {/* Quick actions */}
          <Card className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Quick Actions</p>
            <div className="space-y-2">
              <a href={`/app/matters/${task.matterId}`} className="block text-sm text-primary-600 hover:underline">→ View Matter</a>
              <button className="block text-sm text-gray-600 hover:text-gray-900" onClick={() => alert('Set reminder — configure remindAt and channel via API')}>
                → Set Reminder
              </button>
              <button className="block text-sm text-gray-600 hover:text-gray-900" onClick={() => alert('Link to calendar — configure startTime and endTime via API')}>
                → Add to Calendar
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
