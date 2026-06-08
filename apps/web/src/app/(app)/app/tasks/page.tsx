'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { CheckSquare, Clock, AlertTriangle, Plus, Search, Check, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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

const MANAGER_ROLES = ['FIRM_ADMIN', 'ADMIN', 'MANAGING_PARTNER', 'PARTNER', 'SUPER_ADMIN'];

export default function TasksPage() {
  const { user } = useAuth();
  const isManager = MANAGER_ROLES.some((r) => user?.role?.toUpperCase().includes(r));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('all');

  useEffect(() => {
    api.get<any>('/tasks/dashboard')
      .then((r) => setDashboard(r?.data ?? r))
      .catch(() => null);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (statusFilter) params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);
    params.set('limit', '100');
    // Managers see all tasks; others see assigned tasks only
    if (!isManager || viewMode === 'mine') params.set('assignedToMe', 'true');

    api.get<{ data: Task[] }>(`/tasks/search?${params}`)
      .then((r) => setTasks(r.data ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [query, statusFilter, priorityFilter, viewMode, isManager]);

  const s = dashboard?.summary;

  const markDone = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}`, { status: 'DONE' });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'DONE' } : t));
    } catch { /* silently ignore */ }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{isManager && viewMode === 'all' ? 'All firm tasks — Managing Partner view' : 'Tasks assigned to me'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setViewMode('mine')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'mine' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                My Tasks
              </button>
              <button onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <Users className="h-3.5 w-3.5" /> All Firm Tasks
              </button>
            </div>
          )}
          <Link href="/app/tasks/new">
            <Button size="sm"><Plus className="h-4 w-4" /> New Task</Button>
          </Link>
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
            <Th>Due Date &amp; Time</Th>
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
                   {formatDateTime(t.dueDate)}
                   {isOverdue && ' ⚠'}
                 </Td>
                 <Td>
                   <div className="flex items-center gap-2">
                     <Link href={`/app/tasks/${t.id}`} className="text-xs text-primary-600 hover:underline">Open</Link>
                     {!['DONE','CANCELLED'].includes(t.status) && (
                       <button onClick={() => markDone(t.id)}
                         className="text-xs text-green-600 hover:text-green-800 flex items-center gap-0.5 hover:underline"
                         title="Mark as done">
                         <Check className="h-3 w-3" /> Done
                       </button>
                     )}
                     {t.status === 'DONE' && (
                       <span className="text-xs text-green-600 flex items-center gap-0.5">
                         <Check className="h-3 w-3" /> Completed
                       </span>
                     )}
                   </div>
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
