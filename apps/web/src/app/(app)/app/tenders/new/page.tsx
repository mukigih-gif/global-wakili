'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Award } from 'lucide-react';
import Link from 'next/link';

type Matter = { id: string; title: string; matterCode: string };
type User   = { id: string; name: string };

export default function NewTenderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [users, setUsers]     = useState<User[]>([]);
  const [form, setForm] = useState({
    tenderName: '', tenderNumber: '', issuedBy: '', category: 'GOODS',
    estimatedValue: '', currency: 'KES', deadline: '',
    description: '', matterId: '', assignedToId: '', documents: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
    api.get<{ data: User[] }>('/users?limit=100').then((r) => setUsers(r.data ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/tenders', {
        ...form,
        matterId:     form.matterId     || null,
        assignedToId: form.assignedToId || null,
        deadline:     form.deadline     || null,
        tenderNumber: form.tenderNumber || null,
        issuedBy:     form.issuedBy     || null,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
      });
      router.push('/app/tenders');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tender');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/tenders" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Tender</h1>
          <p className="text-sm text-gray-500">Register a new tendering engagement</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Award className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Tender Details</h2>
        </div>

        <Input label="Tender Name *" required value={form.tenderName} onChange={(e) => set('tenderName', e.target.value)} placeholder="e.g. Supply of Legal Services — ABC Ministry" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Tender Number" value={form.tenderNumber} onChange={(e) => set('tenderNumber', e.target.value)} placeholder="e.g. TDR/2026/001" />
          <Input label="Issued By" value={form.issuedBy} onChange={(e) => set('issuedBy', e.target.value)} placeholder="e.g. Ministry of Finance" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Category *</label>
            <select required value={form.category} onChange={(e) => set('category', e.target.value)} className="form-select w-full">
              <option value="GOODS">Goods</option>
              <option value="SERVICES">Services</option>
              <option value="WORKS">Works</option>
              <option value="CONSULTANCY">Consultancy</option>
              <option value="LEGAL_SERVICES">Legal Services</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <Input label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Estimated Value" type="number" min="0" value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} placeholder="0.00" />
          <div>
            <label className="form-label">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full">
              <option value="KES">KES</option><option value="USD">USD</option><option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div>
          <label className="form-label">Link to Matter</label>
          <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} className="form-select w-full">
            <option value="">None</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode ?? m.id.slice(-6)} — {m.title}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Assigned To</label>
          <select value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)} className="form-select w-full">
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Description / Scope</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className="form-input w-full" placeholder="Describe the tender scope and requirements…" />
        </div>
        <div>
          <label className="form-label">Documents Submitted</label>
          <textarea value={form.documents} onChange={(e) => set('documents', e.target.value)} rows={2} className="form-input w-full" placeholder="List documents submitted or required…" />
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}>Create Tender</Button>
          <Link href="/app/tenders"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
