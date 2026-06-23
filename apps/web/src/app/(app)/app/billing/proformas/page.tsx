'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FileText, AlertCircle, Plus, X } from 'lucide-react';
import Link from 'next/link';

type Client = { id: string; name: string };
type Matter = { id: string; title: string; matterCode?: string };
type Proforma = { id: string; proformaNumber?: string; status?: string; total?: number; currency?: string; issueDate?: string | null; client?: { name?: string } | null };
type Line = { description: string; quantity: string; unitPrice: string; taxRate: string };

const emptyLine = (): Line => ({ description: '', quantity: '1', unitPrice: '', taxRate: '16' });

export default function ProformasPage() {
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [head, setHead] = useState({ clientId: '', matterId: '', currency: 'KES', issueDate: '', expiryDate: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const setH = (k: string, v: string) => setHead((f) => ({ ...f, [k]: v }));
  const setL = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [k]: v } : l)));

  const load = () => api.get<{ data: Proforma[] }>('/billing/proformas?limit=50').then((r) => setProformas(r.data ?? [])).catch(() => setProformas([])).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!head.clientId) { setError('Select a client'); return; }
    const cleanLines = lines.filter((l) => l.description.trim() && parseFloat(l.unitPrice) > 0);
    if (!cleanLines.length) { setError('Add at least one line with a description and unit price'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/billing/proformas', {
        clientId: head.clientId,
        matterId: head.matterId || null,
        currency: head.currency,
        issueDate: head.issueDate || null,
        expiryDate: head.expiryDate || null,
        notes: head.notes || null,
        lines: cleanLines.map((l) => ({
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice),
          taxRate: l.taxRate ? parseFloat(l.taxRate) : null,
        })),
      });
      setShowForm(false); setHead({ clientId: '', matterId: '', currency: 'KES', issueDate: '', expiryDate: '', notes: '' }); setLines([emptyLine()]);
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to create proforma'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileText className="h-6 w-6 icon-finance" /> Proforma Invoices</h1><p className="text-sm text-gray-500">Draft proformas that can be converted to invoices</p></div>
          <Button size="sm" onClick={() => { setShowForm((v) => !v); setError(''); }}>+ New Proforma</Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Client *</label>
              <select required value={head.clientId} onChange={(e) => setH('clientId', e.target.value)} className="form-select w-full">
                <option value="">Select client…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Matter</label>
              <select value={head.matterId} onChange={(e) => setH('matterId', e.target.value)} className="form-select w-full">
                <option value="">None</option>{matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode ?? m.id.slice(-6)} — {m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Issue Date</label>
              <input type="date" value={head.issueDate} onChange={(e) => setH('issueDate', e.target.value)} className="form-input w-full" />
            </div>
            <div>
              <label className="form-label">Expiry Date</label>
              <input type="date" value={head.expiryDate} onChange={(e) => setH('expiryDate', e.target.value)} className="form-input w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="form-label">Line Items *</label>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className="form-input col-span-5" placeholder="Description" value={l.description} onChange={(e) => setL(i, 'description', e.target.value)} />
                <input className="form-input col-span-2" type="number" min="0" step="0.01" placeholder="Qty" value={l.quantity} onChange={(e) => setL(i, 'quantity', e.target.value)} />
                <input className="form-input col-span-2" type="number" min="0" step="0.01" placeholder="Unit price" value={l.unitPrice} onChange={(e) => setL(i, 'unitPrice', e.target.value)} />
                <input className="form-input col-span-2" type="number" min="0" step="0.01" placeholder="Tax %" value={l.taxRate} onChange={(e) => setL(i, 'taxRate', e.target.value)} />
                <button type="button" className="col-span-1 text-gray-400 hover:text-red-600 disabled:opacity-30" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add line</button>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea value={head.notes} onChange={(e) => setH('notes', e.target.value)} rows={2} className="form-input w-full" />
          </div>
          <div className="flex gap-3"><Button type="submit" loading={saving}>Create Proforma</Button><button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button></div>
        </form>
      )}

      <Table>
        <thead><tr><Th>Proforma</Th><Th>Client</Th><Th>Total</Th><Th>Status</Th><Th>Issued</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !proformas.length ? <EmptyRow colSpan={5} message="No proformas recorded" /> :
           proformas.map((p) => (
             <tr key={p.id}>
               <Td className="font-medium text-gray-900">{p.proformaNumber ?? p.id.slice(-6)}</Td>
               <Td className="text-gray-600 text-sm">{p.client?.name ?? '—'}</Td>
               <Td className="font-medium">{formatCurrency(p.total ?? 0, p.currency)}</Td>
               <Td>{p.status ? <StatusBadge status={p.status} /> : '—'}</Td>
               <Td className="text-xs text-gray-500">{p.issueDate ? formatDate(p.issueDate) : '—'}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
