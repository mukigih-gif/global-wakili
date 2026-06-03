'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { CheckSquare, Clock, AlertTriangle, Plus, Search } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  matterId?: string;
  matter?: { id: string; title: string; matterCode: string } | null;
  assignee?: { id: string; name: string; email: string } | null;
  createdAt: string;
};

type Dashboard = {
  summary: {
    totalVisibleTasks: number;
    overdueCount: number;
    dueSoonCount: number;
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
  overdueTasks: Task[];
  dueSoonTasks: Task[];
  recentTasks: Task[];
};

const PRIORITY_COLORS: Record<string, 'red' | 'yellow' | 'blue' | 'gray'> = {
  URGENT: 'red',
  HIGH: 'yellow',
  NORMAL: 'blue',
  LOW: 'gray',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    api.get<Dashboard>('/tasks/dashboard')
      .then(setDashboard)
      .catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    params.set('limit', '50');

    api.get<{ data: Task[] }>(`/tasks/search?${params}`)
      .then((r) => setTasks(r.data ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [query, statusFilter, priorityFilter]);

  const s = dashboard?.summary;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">All matter tasks across your firm</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={loading ? '—' : (s?.totalVisibleTasks ?? tasks.length)} icon={<CheckSquare className="h-5 w-5" />} />
        <StatCard label="Overdue" value={s?.overdueCount ?? 0} icon={<AlertTriangle className="h-5 w-5" />} deltaType={s?.overdueCount ? 'down' : 'neutral'} />
        <StatCard label="Due This Week" value={s?.dueSoonCount ?? 0} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="In Progress" value={s?.statusBreakdown?.IN_PROGRESS ?? 0} icon={<CheckSquare className="h-5 w-5" />} />
      </div>

      {/* Overdue alert */}
      {(s?.overdueCount ?? 0) > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {s!.overdueCount} overdue task{s!.overdueCount > 1 ? 's' : ''} require immediate attention.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search tasks, matters, assignees…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select w-36">
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="form-select w-36">
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Task</Th>
            <Th>Matter</Th>
            <Th>Assignee</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Due Date</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={7} /> :
           !tasks.length ? <EmptyRow colSpan={7} message="No tasks found" /> :
           tasks.map((t) => {
             const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && !['DONE','CANCELLED'].includes(t.status);
             return (
               <tr key={t.id} className={isOverdue ? 'bg-red-50/30' : ''}>
                 <Td>
                   <Link href={`/app/tasks/${t.id}`} className="font-medium text-primary-700 hover:underline">{t.title}</Link>
                 </Td>
                 <Td className="text-xs text-gray-500">
                   {t.matter
                     ? <Link href={`/app/matters/${t.matter.id}`} className="hover:underline">{t.matter.title}</Link>
                     : '—'
                   }
                 </Td>
                 <Td className="text-sm text-gray-600">{t.assignee?.name ?? <span className="text-gray-400 italic">Unassigned</span>}</Td>
                 <Td><Badge variant={PRIORITY_COLORS[t.priority] ?? 'gray'}>{t.priority}</Badge></Td>
                 <Td><StatusBadge status={t.status} /></Td>
                 <Td className={isOverdue ? 'text-red-600 font-medium text-xs' : 'text-gray-500 text-xs'}>
                   {formatDate(t.dueDate)}
                   {isOverdue && ' ⚠'}
                 </Td>
                 <Td>
                   <Link href={`/app/tasks/${t.id}`} className="text-xs text-primary-600 hover:underline">Open</Link>
                 </Td>
               </tr>
             );
           })
          }
        </tbody>
      </Table>
    </div>
  );
}
