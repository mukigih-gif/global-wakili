'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Client = { id: string; name: string; clientCode: string };
type Matter = { id: string; title: string; matterCode: string };
type LineItem = { description: string; quantity: number; unitPrice: number; vatRate: number };

const KES_FMT = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NewQuotationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [form, setForm] = useState({
    clientId: '', matterId: '', currency: 'KES',
    validUntil: '', notes: '', termsAndConditions: '',
  });
  const [lines, setLines] = useState<LineItem[]>([
    { description: 'Professional legal fees', quantity: 1, unitPrice: 0, vatRate: 16 },
  ]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const addLine    = () => setLines((l) => [...l, { description: '', quantity: 1, unitPrice: 0, vatRate: 16 }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const setLine    = (i: number, k: keyof LineItem, v: string | number) =>
    setLines((l) => l.map((line, idx) => idx === i ? { ...line, [k]: v } : line));

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const vat      = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * l.vatRate / 100), 0);
  const total    = subtotal + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) { setError('Please select a client'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/billing/quotations', { ...form, lineItems: lines, totalAmount: total });
      router.push('/app/billing');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Quotation</h1>
          <p className="text-sm text-gray-500">Create a fee quotation to send to a client — convert to invoice once accepted</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Quotation Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Client *</label>
              <select required value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="form-select w-full">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.clientCode})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Matter</label>
              <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} className="form-select w-full">
                <option value="">None</option>
                {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full">
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <Input label="Valid Until" type="date" value={form.validUntil}
              onChange={(e) => set('validUntil', e.target.value)}
              min={new Date().toISOString().slice(0,10)} />
          </div>
        </div>

        {/* Line items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Fee Schedule</h2>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}>
              <Plus className="h-3.5 w-3.5" /> Add Line
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit Price ({form.currency})</span>
              <span className="col-span-2 text-right">VAT %</span>
              <span className="col-span-1"></span>
            </div>

            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input className="form-input col-span-5 text-sm" value={line.description}
                  onChange={(e) => setLine(i, 'description', e.target.value)}
                  placeholder="e.g. Professional legal fees" required />
                <input className="form-input col-span-2 text-right text-sm" type="number" min="0.01" step="0.01"
                  value={line.quantity} onChange={(e) => setLine(i, 'quantity', parseFloat(e.target.value) || 1)} />
                <input className="form-input col-span-2 text-right text-sm" type="number" min="0" step="0.01"
                  value={line.unitPrice} onChange={(e) => setLine(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                <input className="form-input col-span-2 text-right text-sm" type="number" min="0" max="100" step="0.5"
                  value={line.vatRate} onChange={(e) => setLine(i, 'vatRate', parseFloat(e.target.value) || 0)} />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
                  className="col-span-1 text-gray-300 hover:text-red-500 disabled:opacity-30 flex justify-center">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
            <div className="flex justify-end gap-8 text-gray-600">
              <span className="w-32 text-right text-xs text-gray-500">Subtotal</span>
              <span className="w-36 text-right font-medium">{form.currency} {KES_FMT(subtotal)}</span>
            </div>
            <div className="flex justify-end gap-8 text-gray-600">
              <span className="w-32 text-right text-xs text-gray-500">VAT</span>
              <span className="w-36 text-right font-medium">{form.currency} {KES_FMT(vat)}</span>
            </div>
            <div className="flex justify-end gap-8 font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-2">
              <span className="w-32 text-right">Total</span>
              <span className="w-36 text-right text-primary-700">{form.currency} {KES_FMT(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Notes & Terms</h2>
          <div>
            <label className="form-label">Notes to Client</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              className="form-input w-full resize-none" placeholder="e.g. This quotation is valid for 30 days from date of issue." />
          </div>
          <div>
            <label className="form-label">Terms & Conditions</label>
            <textarea value={form.termsAndConditions} onChange={(e) => set('termsAndConditions', e.target.value)} rows={3}
              className="form-input w-full resize-none"
              placeholder="e.g. Payment due within 14 days of acceptance. 50% retainer required before commencement." />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Create Quotation</Button>
          <Button type="button" variant="secondary" onClick={() => {}}>Save Draft</Button>
          <Link href="/app/billing"><Button type="button" variant="ghost">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
