'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Building2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Department = { id: string; name: string; code?: string | null; status?: string; description?: string | null; costCenterCode?: string | null };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', code: '', description: '', costCenterCode: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = () =>
    api.get<{ data: Department[] }>('/hr/departments?limit=200')
      .then((r) => setDepartments(r.data ?? [])).catch(() => setDepartments([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/hr/departments', {
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        costCenterCode: form.costCenterCode || null,
      });
      setShowForm(false);
      setForm({ name: '', code: '', description: '', costCenterCode: '' });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to create department'); } finally { setSaving(false); }
  };

  const archive = async (d: Department) => {
    const reason = window.prompt(`Archive department "${d.name}"? Reason:`);
    if (!reason?.trim()) return;
    setArchiving(d.id); setError('');
    try {
      await api.post(`/hr/departments/${d.id}/archive`, { reason });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to archive'); } finally { setArchiving(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/hr" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Building2 className="h-6 w-6 text-primary-600" /> Departments</h1>
            <p className="text-sm text-gray-500">Manage firm departments and cost centres</p>
          </div>
          <Button size="sm" onClick={() => { setShowForm((v) => !v); setError(''); }}>+ New Department</Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Name *</label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className="form-input w-full" placeholder="e.g. Litigation" />
          </div>
          <div>
            <label className="form-label">Code</label>
            <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} className="form-input w-full" placeholder="e.g. LIT" />
          </div>
          <div>
            <label className="form-label">Cost Centre Code</label>
            <input value={form.costCenterCode} onChange={(e) => set('costCenterCode', e.target.value)} className="form-input w-full" placeholder="e.g. CC-100" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="form-input w-full" />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" loading={saving}>Create Department</Button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </form>
      )}

      <Table>
        <thead><tr><Th>Name</Th><Th>Code</Th><Th>Cost Centre</Th><Th>Status</Th><Th></Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !departments.length ? <EmptyRow colSpan={5} message="No departments yet" /> :
           departments.map((d) => (
             <tr key={d.id}>
               <Td className="font-medium text-gray-900">{d.name}</Td>
               <Td className="text-gray-600 text-sm">{d.code ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{d.costCenterCode ?? '—'}</Td>
               <Td>{d.status ? <StatusBadge status={d.status} /> : '—'}</Td>
               <Td>
                 {d.status !== 'ARCHIVED' && (
                   <button onClick={() => archive(d)} disabled={archiving === d.id}
                     className="text-xs text-red-600 hover:underline disabled:opacity-50">
                     {archiving === d.id ? 'Archiving…' : 'Archive'}
                   </button>
                 )}
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
