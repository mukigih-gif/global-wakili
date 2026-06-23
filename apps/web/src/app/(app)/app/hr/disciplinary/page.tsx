'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, ShieldAlert, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Employee = { id: string; name: string };
type DisciplinaryCase = {
  id: string; caseNumber?: string | null; title?: string; severity?: string;
  status?: string; incidentDate?: string; employee?: { name?: string } | null;
};

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function DisciplinaryPage() {
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    employeeId: '', reportedById: '', title: '', description: '',
    incidentDate: new Date().toISOString().slice(0, 10), severity: 'MEDIUM', category: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = () =>
    api.get<{ data: DisciplinaryCase[] }>('/hr/disciplinary')
      .then((r) => setCases(r.data ?? [])).catch(() => setCases([])).finally(() => setLoading(false));

  useEffect(() => {
    load();
    api.get<{ data: Employee[] }>('/hr/employees?limit=200').then((r) => setEmployees(r.data ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.reportedById || !form.title.trim() || !form.description.trim()) {
      setError('Employee, reporter, title and description are required'); return;
    }
    setSaving(true); setError('');
    try {
      await api.post('/hr/disciplinary', {
        employeeId: form.employeeId,
        reportedById: form.reportedById,
        title: form.title,
        description: form.description,
        incidentDate: form.incidentDate,
        severity: form.severity,
        category: form.category || null,
      });
      setShowForm(false);
      setForm({ employeeId: '', reportedById: '', title: '', description: '', incidentDate: new Date().toISOString().slice(0, 10), severity: 'MEDIUM', category: '' });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to create case'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/hr" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-primary-600" /> Disciplinary Cases</h1>
            <p className="text-sm text-gray-500">Record and track employee disciplinary cases</p>
          </div>
          <Button size="sm" onClick={() => { setShowForm((v) => !v); setError(''); }}>+ New Case</Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Employee *</label>
            <select required value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} className="form-select w-full">
              <option value="">Select employee…</option>
              {employees.map((em) => <option key={em.id} value={em.id}>{em.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Reported By *</label>
            <select required value={form.reportedById} onChange={(e) => set('reportedById', e.target.value)} className="form-select w-full">
              <option value="">Select reporter…</option>
              {employees.map((em) => <option key={em.id} value={em.id}>{em.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Title *</label>
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} className="form-input w-full" placeholder="Short summary of the case" />
          </div>
          <div>
            <label className="form-label">Incident Date *</label>
            <input required type="date" value={form.incidentDate} onChange={(e) => set('incidentDate', e.target.value)} className="form-input w-full" max={new Date().toISOString().slice(0, 10)} />
          </div>
          <div>
            <label className="form-label">Severity</label>
            <select value={form.severity} onChange={(e) => set('severity', e.target.value)} className="form-select w-full">
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Category</label>
            <input value={form.category} onChange={(e) => set('category', e.target.value)} className="form-input w-full" placeholder="e.g. Attendance, Conduct, Performance" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Description *</label>
            <textarea required value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="form-input w-full" placeholder="Details of the incident" />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" loading={saving}>Create Case</Button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <Table>
        <thead><tr><Th>Case</Th><Th>Employee</Th><Th>Severity</Th><Th>Status</Th><Th>Incident Date</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !cases.length ? <EmptyRow colSpan={5} message="No disciplinary cases recorded" /> :
           cases.map((c) => (
             <tr key={c.id}>
               <Td className="font-medium text-gray-900">{c.title ?? c.caseNumber ?? c.id.slice(-6)}</Td>
               <Td className="text-gray-600 text-sm">{c.employee?.name ?? '—'}</Td>
               <Td>{c.severity ? <StatusBadge status={c.severity} /> : '—'}</Td>
               <Td>{c.status ? <StatusBadge status={c.status} /> : '—'}</Td>
               <Td className="text-xs text-gray-500">{c.incidentDate ? formatDate(c.incidentDate) : '—'}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
