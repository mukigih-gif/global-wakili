'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { ArrowLeft, TrendingUp, Plus, X, Star, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type Review = {
  id: string;
  cycleName: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string | null;
  selfScore?: number | null;
  managerScore?: number | null;
  finalScore?: number | null;
  finalRating?: string | null;
  selfRating?: string | null;
  managerRating?: string | null;
  completedAt?: string | null;
  employee?: { id: string; name: string } | null;
  reviewer?: { id: string; name: string } | null;
  goals?: any[];
};

type Employee = { id: string; name: string };

const RATING_COLORS: Record<string, string> = {
  EXCEEDS_EXPECTATIONS: 'text-green-700 bg-green-50 border-green-200',
  MEETS_EXPECTATIONS:   'text-blue-700 bg-blue-50 border-blue-200',
  NEEDS_IMPROVEMENT:    'text-amber-700 bg-amber-50 border-amber-200',
  UNSATISFACTORY:       'text-red-700 bg-red-50 border-red-200',
  NOT_RATED:            'text-gray-600 bg-gray-50 border-gray-200',
};

const STATUS_STEPS = ['DRAFT','SELF_REVIEW','MANAGER_REVIEW','CALIBRATION','COMPLETED'];

export default function PerformancePage() {
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected]   = useState<Review | null>(null);
  const [saving, setSaving]       = useState(false);
  const [actionSaving, setActionSaving] = useState('');
  const [error, setError]         = useState('');
  const [form, setForm] = useState({
    employeeId: '', reviewerId: '', cycleName: '',
    periodStart: '', periodEnd: '', dueDate: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: Review[] }>('/hr/performance?take=50').then((r) => setReviews(r.data ?? [])).catch(() => {}),
      api.get<{ data: Employee[] }>('/hr/employees?limit=200').then((r) => setEmployees(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/hr/performance', {
        ...form,
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd:   new Date(form.periodEnd).toISOString(),
        dueDate:     form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        goals: [],
      });
      setShowCreate(false);
      setForm({ employeeId: '', reviewerId: '', cycleName: '', periodStart: '', periodEnd: '', dueDate: '' });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally { setSaving(false); }
  };

  const doAction = async (reviewId: string, action: string, body?: Record<string, any>) => {
    setActionSaving(action);
    try {
      await api.post(`/hr/performance/${reviewId}/${action}`, body ?? {});
      load();
      if (selected?.id === reviewId) {
        const updated = await api.get<any>(`/hr/performance/${reviewId}`).catch(() => null);
        setSelected(updated?.id ? updated : updated?.data ?? null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally { setActionSaving(''); }
  };

  const scoreColor = (score?: number | null) =>
    !score ? 'text-gray-400' : score >= 85 ? 'text-green-700' : score >= 65 ? 'text-blue-700' : score >= 50 ? 'text-amber-700' : 'text-red-700';

  const pending    = reviews.filter((r) => !['COMPLETED','CANCELLED'].includes(r.status)).length;
  const completed  = reviews.filter((r) => r.status === 'COMPLETED').length;
  const avgScore   = completed > 0
    ? reviews.filter((r) => r.status === 'COMPLETED' && r.finalScore)
        .reduce((s, r) => s + parseFloat(String(r.finalScore)), 0) / completed
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/hr" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 icon-hr" /> Performance Reviews
          </h1>
          <p className="text-sm text-gray-500">Manage employee performance review cycles</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Review</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-600">In Progress</p>
          <p className="text-2xl font-bold text-amber-800">{pending}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs text-green-600">Avg Score (Completed)</p>
          <p className="text-2xl font-bold text-green-800">{avgScore ? `${avgScore.toFixed(1)}%` : '—'}</p>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 border-primary-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Create Performance Review</h3>
            <button onClick={() => { setShowCreate(false); setError(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee *</label>
              <select required value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className="form-select w-full">
                <option value="">Select employee…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Reviewer (Manager)</label>
              <select value={form.reviewerId} onChange={(e) => setForm((f) => ({ ...f, reviewerId: e.target.value }))} className="form-select w-full">
                <option value="">Select reviewer…</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Cycle Name *</label>
              <input required value={form.cycleName} onChange={(e) => setForm((f) => ({ ...f, cycleName: e.target.value }))} className="form-input w-full" placeholder="e.g. Q2 2026, Annual Review 2026" />
            </div>
            <div>
              <label className="form-label">Period Start *</label>
              <input required type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} className="form-input w-full" />
            </div>
            <div>
              <label className="form-label">Period End *</label>
              <input required type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} className="form-input w-full" />
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="form-input w-full" />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" loading={saving}>Create Review</Button>
            </div>
          </form>
        </div>
      )}

      {/* Review detail */}
      {selected && (
        <div className="card p-5 border-primary-200 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{selected.cycleName}</h3>
              <p className="text-sm text-gray-500">{selected.employee?.name ?? '—'} · Reviewer: {selected.reviewer?.name ?? 'Unassigned'}</p>
              <p className="text-xs text-gray-400">{formatDate(selected.periodStart)} — {formatDate(selected.periodEnd)}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Progress stepper */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_STEPS.map((step, i) => {
              const done = STATUS_STEPS.indexOf(selected.status) > i;
              const active = selected.status === step;
              return (
                <div key={step} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`px-2 py-1 rounded text-xs font-medium border ${active ? 'bg-primary-600 text-white border-primary-600' : done ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {step.replace(/_/g,' ')}
                  </div>
                  {i < STATUS_STEPS.length - 1 && <div className="w-4 h-px bg-gray-200 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Scores */}
          {(selected.selfScore || selected.managerScore || selected.finalScore) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-500">Self Score</p>
                <p className={`text-2xl font-bold ${scoreColor(selected.selfScore)}`}>{selected.selfScore ? `${parseFloat(String(selected.selfScore)).toFixed(1)}` : '—'}</p>
                {selected.selfRating && <p className="text-xs text-gray-400">{selected.selfRating.replace(/_/g,' ')}</p>}
              </div>
              <div className="rounded-lg border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-500">Manager Score</p>
                <p className={`text-2xl font-bold ${scoreColor(selected.managerScore)}`}>{selected.managerScore ? `${parseFloat(String(selected.managerScore)).toFixed(1)}` : '—'}</p>
                {selected.managerRating && <p className="text-xs text-gray-400">{selected.managerRating.replace(/_/g,' ')}</p>}
              </div>
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-center">
                <p className="text-xs text-primary-600">Final Score</p>
                <p className={`text-2xl font-bold ${scoreColor(selected.finalScore)}`}>{selected.finalScore ? `${parseFloat(String(selected.finalScore)).toFixed(1)}` : '—'}</p>
                {selected.finalRating && <span className={`text-xs px-1.5 py-0.5 rounded border ${RATING_COLORS[selected.finalRating] ?? ''}`}>{selected.finalRating.replace(/_/g,' ')}</span>}
              </div>
            </div>
          )}

          {/* Goals */}
          {selected.goals && selected.goals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">GOALS ({selected.goals.length})</p>
              <div className="space-y-2">
                {selected.goals.map((g: any) => (
                  <div key={g.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <Star className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{g.title}</p>
                      {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                    </div>
                    {(g.selfScore || g.managerScore) && (
                      <div className="text-xs text-gray-500 whitespace-nowrap">
                        {g.selfScore ? `Self: ${g.selfScore}` : ''} {g.managerScore ? `Mgr: ${g.managerScore}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
            {selected.status === 'DRAFT' && (
              <Button size="sm" loading={actionSaving === 'self-review/start'} onClick={() => doAction(selected.id, 'self-review/start')}>
                Start Self-Review
              </Button>
            )}
            {['DRAFT','SELF_REVIEW'].includes(selected.status) && (
              <Button size="sm" loading={actionSaving === 'self-review/submit'} onClick={() => {
                const score = parseFloat(prompt('Enter self-review score (0-100):') ?? '');
                if (!isNaN(score)) doAction(selected.id, 'self-review/submit', { score, comments: prompt('Comments (optional):') || undefined });
              }}>
                Submit Self-Review
              </Button>
            )}
            {['MANAGER_REVIEW','CALIBRATION'].includes(selected.status) && (
              <Button size="sm" loading={actionSaving === 'manager-review/submit'} onClick={() => {
                const score = parseFloat(prompt('Enter manager score (0-100):') ?? '');
                if (!isNaN(score)) doAction(selected.id, 'manager-review/submit', { score, comments: prompt('Comments (optional):') || undefined });
              }}>
                <CheckCircle className="h-3.5 w-3.5" /> Submit Manager Review
              </Button>
            )}
            {!['COMPLETED','CANCELLED'].includes(selected.status) && (
              <Button size="sm" variant="ghost" className="text-red-500" loading={actionSaving === 'cancel'} onClick={() => {
                const reason = prompt('Cancellation reason:');
                if (reason) doAction(selected.id, 'cancel', { reason });
              }}>
                Cancel Review
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="card">
        <Table>
          <thead>
            <tr><Th>Employee</Th><Th>Cycle</Th><Th>Period</Th><Th>Reviewer</Th><Th>Status</Th><Th>Score</Th><Th>Due</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={8} /> :
             !reviews.length ? <EmptyRow colSpan={8} message="No performance reviews yet. Create the first one above." /> :
             reviews.map((r) => (
               <tr key={r.id} className="hover:bg-gray-50">
                 <Td className="font-medium text-gray-900">{r.employee?.name ?? '—'}</Td>
                 <Td className="text-sm text-gray-700">{r.cycleName}</Td>
                 <Td className="text-xs text-gray-500">{formatDate(r.periodStart)} – {formatDate(r.periodEnd)}</Td>
                 <Td className="text-xs text-gray-600">{r.reviewer?.name ?? '—'}</Td>
                 <Td><StatusBadge status={r.status} /></Td>
                 <Td className={`font-bold ${scoreColor(r.finalScore ?? r.managerScore ?? r.selfScore)}`}>
                   {r.finalScore ? parseFloat(String(r.finalScore)).toFixed(1) :
                    r.managerScore ? parseFloat(String(r.managerScore)).toFixed(1) :
                    r.selfScore ? parseFloat(String(r.selfScore)).toFixed(1) : '—'}
                 </Td>
                 <Td className={`text-xs ${r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'COMPLETED' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                   {r.dueDate ? formatDate(r.dueDate) : '—'}
                 </Td>
                 <Td>
                   <button onClick={() => setSelected(r)} className="text-xs text-primary-600 hover:underline">Review</button>
                 </Td>
               </tr>
             ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
