'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, CheckSquare } from 'lucide-react';
import Link from 'next/link';

type Matter = { id: string; title: string; matterCode: string };
type User   = { id: string; name: string };

function NewTaskForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const presetMatter = searchParams.get('matterId') ?? '';
  const presetClient = searchParams.get('clientId') ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [users, setUsers]     = useState<User[]>([]);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    dueDate: '', matterId: presetMatter, assignedToId: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Matter[] }>('/matters?limit=100&status=ACTIVE').then((r) => setMatters(r.data ?? [])).catch(() => {});
    api.get<{ data: User[] }>('/users?limit=100').then((r) => setUsers(r.data ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post<any>('/tasks', {
        ...form,
        matterId:       form.matterId       || null,
        assignedToId:   form.assignedToId   || null,
        dueDate:        form.dueDate        || null,
      });
      const task = (r?.data ?? r) as { id: string };
      router.push(`/app/tasks/${task.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={presetMatter ? `/app/matters/${presetMatter}` : '/app/tasks'} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Task</h1>
          <p className="text-sm text-gray-500">Create a task and assign it to a team member</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckSquare className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Task Details</h2>
        </div>

        <Input label="Task Title *" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Draft pleadings for Doe v Smith" />

        <div>
          <label className="form-label">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="form-input w-full" placeholder="What needs to be done?" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Priority</label>
            <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className="form-select w-full">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <Input label="Due Date & Time" type="datetime-local" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} min={new Date().toISOString().slice(0,16)} />
        </div>

        <div>
          <label className="form-label">Link to Matter</label>
          <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} className="form-select w-full">
            <option value="">None</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Assign To</label>
          <select value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)} className="form-select w-full">
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}>Create Task</Button>
          <Link href={presetMatter ? `/app/matters/${presetMatter}` : '/app/tasks'}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense>
      <NewTaskForm />
    </Suspense>
  );
}
