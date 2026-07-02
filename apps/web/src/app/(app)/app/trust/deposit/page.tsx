'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Scale, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type TrustAccount = { id: string; accountName: string; accountNumber: string; currentBalance: string };
type Client = { id: string; name: string; clientCode: string };
type Matter = { id: string; title: string; matterCode: string; clientId?: string | null; client?: { id: string } | null };

export default function TrustDepositPage() {
  const router = useRouter();
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [trustAccounts, setAccounts] = useState<TrustAccount[]>([]);
  const [clients, setClients]        = useState<Client[]>([]);
  const [matters, setMatters]        = useState<Matter[]>([]);

  const [form, setForm] = useState({
    trustAccountId: '', clientId: '', matterId: '',
    amount: '', currency: 'KES', description: '',
    reference: '', paymentMethod: 'BANK_TRANSFER',
    transactionDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<any>('/trust/overview').then((r) => { const d = r?.data ?? r; setAccounts(d.dashboard?.accounts ?? []); }).catch(() => {});
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trustAccountId) { setError('Select a trust account'); return; }
    if (!form.clientId) { setError('Select a client'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than 0'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/trust/transactions', {
        trustAccountId:  form.trustAccountId,
        clientId:        form.clientId,
        matterId:        form.matterId        || null,
        amount:          parseFloat(form.amount),
        currency:        form.currency,
        description:     form.description || `Client deposit — ${clients.find(c => c.id === form.clientId)?.name}`,
        reference:       form.reference       || null,
        paymentMethod:   form.paymentMethod,
        transactionDate: form.transactionDate,
        notes:           form.notes           || null,
        transactionType: 'DEPOSIT',
      });
      router.push('/app/trust');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record deposit');
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = trustAccounts.find((a) => a.id === form.trustAccountId);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/trust" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Client Deposit</h1>
          <p className="text-sm text-gray-500">Record a client fee deposit to the firm trust account</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Deposit Details</h2>
        </div>

        <div>
          <label className="form-label">Trust Account *</label>
          <select required value={form.trustAccountId} onChange={(e) => set('trustAccountId', e.target.value)} className="form-select w-full">
            <option value="">Select trust account…</option>
            {trustAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.accountName} — {a.accountNumber}</option>
            ))}
          </select>
          {selectedAccount && (
            <p className="text-xs text-green-700 mt-0.5">Current balance: KES {Number(selectedAccount.currentBalance).toLocaleString()}</p>
          )}
        </div>

        <div>
          <label className="form-label">Client *</label>
          <select required value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, matterId: '' }))} className="form-select w-full">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Linked Matter</label>
          <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} disabled={!form.clientId} className="form-select w-full disabled:bg-gray-50">
            <option value="">{form.clientId ? 'None — general deposit' : 'Select a client first'}</option>
            {matters.filter((m) => !form.clientId || (m.client?.id ?? m.clientId) === form.clientId).map((m) => (
              <option key={m.id} value={m.id}>{m.matterCode ?? m.id.slice(-6)} — {m.title}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Amount *" required type="number" min="1" step="0.01"
              value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="form-label">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full">
              <option value="KES">KES</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Payment Method</label>
          <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className="form-select w-full">
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="MPESA">M-PESA</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
          </select>
        </div>

        <Input label="Reference / Transaction No." value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="e.g. bank ref, M-PESA code" />

        <Input label="Transaction Date" type="date" value={form.transactionDate}
          onChange={(e) => set('transactionDate', e.target.value)}
          max={new Date().toISOString().slice(0,10)} />

        <Input label="Description" value={form.description} onChange={(e) => set('description', e.target.value)}
          placeholder="e.g. Retainer deposit for land transfer matter" />

        <div>
          <label className="form-label">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="form-input w-full" />
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          This deposit will be credited to the trust account and recorded in the client ledger.
          Ensure the amount matches the bank receipt before confirming.
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}>Record Deposit</Button>
          <Link href="/app/trust"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
