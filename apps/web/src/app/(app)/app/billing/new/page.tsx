'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Receipt, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Client = { id: string; name: string; clientCode: string };
type Matter = { id: string; title: string; matterCode: string };

type LineItemKind = 'FEES' | 'DISBURSEMENT' | 'EXPENSE' | 'OTHER';
type LineItem = { description: string; quantity: number; unitPrice: number; vatRate: number; sourceType: LineItemKind };

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetMatterId = searchParams.get('matterId') ?? '';
  const presetClientId = searchParams.get('clientId') ?? '';
  // When opened from a matter, client + matter are fixed and shown read-only.
  const lockedToMatter = Boolean(presetMatterId);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [form, setForm] = useState({ clientId: presetClientId, matterId: presetMatterId, currency: 'KES', dueDate: '', notes: '' });
  const [lines, setLines] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0, vatRate: 16, sourceType: 'FEES' }]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
    // Opened from a matter → resolve its client so both align automatically.
    if (presetMatterId) {
      api.get<any>(`/matters/${presetMatterId}/overview`)
        .then((r) => {
          const m = r?.data ?? r;
          const clientId = m?.client?.id ?? m?.clientId;
          if (clientId) setForm((f) => ({ ...f, clientId, matterId: presetMatterId }));
        })
        .catch(() => {});
    }
  }, [presetMatterId]);

  const addLine = () => setLines((l) => [...l, { description: '', quantity: 1, unitPrice: 0, vatRate: 16, sourceType: 'FEES' }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const setLine = (i: number, k: keyof LineItem, v: string | number) =>
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [k]: v } : line));

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat      = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * l.vatRate / 100), 0);
  const total    = subtotal + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const inv = await api.post<{ id: string }>('/billing/invoices', {
        ...form,
        matterId: form.matterId || null,
        dueDate:  form.dueDate  || null,
        lineItems: lines,
      });
      router.push(`/app/billing`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-sm text-gray-500">Create a client invoice with line items and VAT</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Invoice Header</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Client *</label>
              <select required value={form.clientId} onChange={(e) => set('clientId', e.target.value)} disabled={lockedToMatter} className="form-select w-full disabled:bg-gray-50 disabled:text-gray-500">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {lockedToMatter && <p className="text-xs text-gray-400 mt-0.5">Auto-set from the matter</p>}
            </div>
            <div>
              <label className="form-label">Matter</label>
              <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} disabled={lockedToMatter} className="form-select w-full disabled:bg-gray-50 disabled:text-gray-500">
                <option value="">None</option>
                {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
              </select>
              {lockedToMatter && <p className="text-xs text-gray-400 mt-0.5">Invoicing this matter</p>}
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full">
                <option value="KES">KES</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} min={new Date().toISOString().slice(0,10)} />
          </div>
        </div>

        {/* Line items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Line Items</h2>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add Line</Button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <span className="col-span-2">Type</span>
              <span className="col-span-4">Description</span>
              <span className="col-span-1 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-2 text-right">VAT %</span>
              <span className="col-span-1"></span>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select className="form-select col-span-2 text-xs" value={line.sourceType} onChange={(e) => setLine(i, 'sourceType', e.target.value as LineItemKind)}>
                  <option value="FEES">Professional Fees</option>
                  <option value="DISBURSEMENT">Disbursement</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="OTHER">Other</option>
                </select>
                <input className="form-input col-span-4" value={line.description} onChange={(e) => setLine(i, 'description', e.target.value)} placeholder="Description…" required />
                <input className="form-input col-span-1 text-right" type="number" min="1" value={line.quantity} onChange={(e) => setLine(i, 'quantity', parseFloat(e.target.value) || 1)} />
                <input className="form-input col-span-2 text-right" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => setLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                <input className="form-input col-span-2 text-right" type="number" min="0" max="100" value={line.vatRate} onChange={(e) => setLine(i, 'vatRate', parseFloat(e.target.value) || 0)} />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1} className="col-span-1 text-gray-300 hover:text-red-500 disabled:opacity-30 flex justify-center">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
            <div className="flex justify-end gap-8 text-gray-600">
              <span className="w-32 text-right text-xs text-gray-500">Subtotal</span>
              <span className="w-36 text-right font-medium">{form.currency} {subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-end gap-8 text-gray-600">
              <span className="w-32 text-right text-xs text-gray-500">VAT</span>
              <span className="w-36 text-right font-medium">{form.currency} {vat.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-end gap-8 font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
              <span className="w-32 text-right">Total</span>
              <span className="w-36 text-right text-primary-700">{form.currency} {total.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <label className="form-label">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="form-input w-full resize-none" placeholder="Payment terms, bank details, etc." />
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Create Invoice</Button>
          <Button type="button" variant="secondary" onClick={() => { /* save as draft */ }}>Save Draft</Button>
          <Link href="/app/billing"><Button type="button" variant="ghost">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceForm />
    </Suspense>
  );
}
