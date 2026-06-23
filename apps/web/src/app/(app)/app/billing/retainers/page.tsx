'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Wallet, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Client = { id: string; name: string };
type Matter = { id: string; title: string; matterCode?: string };
type Retainer = { id: string; amount?: number; currency?: string; status?: string; reference?: string | null; receivedAt?: string | null; client?: { name?: string } | null };

export default function RetainersPage() {
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ clientId: '', matterId: '', amount: '', currency: 'KES', reference: '', description: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get<{ data: Retainer[] }>('/billing/retainers?limit=50').then((r) => setRetainers(r.data ?? [])).catch(() => setRetainers([])).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.amount || parseFloat(form.amount) <= 0) { setError('Client and a positive amount are required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/billing/retainers', {
        clientId: form.clientId, matterId: form.matterId || null,
        amount: parseFloat(form.amount), currency: form.currency,
        reference: form.reference || null, description: form.description || null,
      });
      setShowForm(false); setForm({ clientId: '', matterId: '', amount: '', currency: 'KES', reference: '', description: '' });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to create retainer'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Wallet className="h-6 w-6 icon-finance" /> Retainers</h1><p className="text-sm text-gray-500">Client advance payments held against future invoices</p></div>
          <Button size="sm" onClick={() => { setShowForm((v) => !v); setError(''); }}>+ New Retainer</Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Client *</label>
            <select required value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="form-select w-full">
              <option value="">Select client…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Matter</label>
            <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} className="form-select w-full">
              <option value="">None</option>{matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode ?? m.id.slice(-6)} — {m.title}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Amount *</label>
            <input required type="number" min="1" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full"><option>KES</option><option>USD</option><option>GBP</option></select>
          </div>
          <div>
            <label className="form-label">Reference</label>
            <input value={form.reference} onChange={(e) => set('reference', e.target.value)} className="form-input w-full" placeholder="e.g. bank/M-PESA ref" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="form-input w-full" />
          </div>
          <div className="sm:col-span-2 flex gap-3"><Button type="submit" loading={saving}>Create Retainer</Button><button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button></div>
        </form>
      )}

      <Table>
        <thead><tr><Th>Client</Th><Th>Amount</Th><Th>Reference</Th><Th>Status</Th><Th>Received</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !retainers.length ? <EmptyRow colSpan={5} message="No retainers recorded" /> :
           retainers.map((r) => (
             <tr key={r.id}>
               <Td className="text-gray-900 text-sm">{r.client?.name ?? '—'}</Td>
               <Td className="font-medium">{formatCurrency(r.amount ?? 0, r.currency)}</Td>
               <Td className="text-gray-600 text-sm">{r.reference ?? '—'}</Td>
               <Td>{r.status ? <StatusBadge status={r.status} /> : '—'}</Td>
               <Td className="text-xs text-gray-500">{r.receivedAt ? formatDate(r.receivedAt) : '—'}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
