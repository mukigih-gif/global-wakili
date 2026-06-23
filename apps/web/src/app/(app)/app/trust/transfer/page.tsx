'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, type ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, ArrowRightLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type TrustAccount = { id: string; accountName: string; accountNumber: string; currentBalance: string };
type Client = { id: string; name: string };
type Matter = { id: string; title: string; matterCode?: string };

export default function TrustTransferPage() {
  const router = useRouter();
  const [loading, setLoading]        = useState(false);
  const [error, setError]            = useState('');
  const [trustAccounts, setAccounts] = useState<TrustAccount[]>([]);
  const [clients, setClients]        = useState<Client[]>([]);
  const [matters, setMatters]        = useState<Matter[]>([]);

  const [form, setForm] = useState({
    trustAccountId: '', clientId: '', matterId: '',
    amount: '', reference: '', description: '', invoiceId: '',
    transactionDate: new Date().toISOString().slice(0, 10),
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<any>('/trust/overview').then((r) => { const d = r?.data ?? r; setAccounts(d.dashboard?.accounts ?? []); }).catch(() => {});
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trustAccountId || !form.clientId || !form.matterId) { setError('Trust account, client and matter are required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than 0'); return; }
    if (!form.reference.trim() || !form.description.trim()) { setError('Reference and description are required'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/trust/transfers/to-office', {
        trustAccountId: form.trustAccountId,
        clientId: form.clientId,
        matterId: form.matterId,
        amount: parseFloat(form.amount),
        reference: form.reference,
        description: form.description,
        transactionDate: form.transactionDate,
        invoiceId: form.invoiceId || null,
      });
      router.push('/app/trust');
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Failed to record transfer');
    } finally { setLoading(false); }
  };

  const selectedAccount = trustAccounts.find((a) => a.id === form.trustAccountId);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/trust" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Trust → Office</h1>
          <p className="text-sm text-gray-500">Move earned funds from trust to the office account (e.g. settle an invoice)</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2"><ArrowRightLeft className="h-5 w-5 text-primary-600" /><h2 className="font-semibold text-gray-900">Transfer Details</h2></div>

        <div>
          <label className="form-label">Trust Account *</label>
          <select required value={form.trustAccountId} onChange={(e) => set('trustAccountId', e.target.value)} className="form-select w-full">
            <option value="">Select trust account…</option>
            {trustAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountName} — {a.accountNumber}</option>)}
          </select>
          {selectedAccount && <p className="text-xs text-gray-500 mt-0.5">Balance: KES {Number(selectedAccount.currentBalance).toLocaleString()}</p>}
        </div>

        <div>
          <label className="form-label">Client *</label>
          <select required value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="form-select w-full">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Matter *</label>
          <select required value={form.matterId} onChange={(e) => set('matterId', e.target.value)} className="form-select w-full">
            <option value="">Select matter…</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode ?? m.id.slice(-6)} — {m.title}</option>)}
          </select>
        </div>

        <Input label="Amount *" required type="number" min="1" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
        <Input label="Reference *" required value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="e.g. transfer authority / invoice no." />
        <Input label="Invoice Reference ID" value={form.invoiceId} onChange={(e) => set('invoiceId', e.target.value)} placeholder="Invoice this transfer settles (optional)" />
        <Input label="Transaction Date" type="date" value={form.transactionDate} onChange={(e) => set('transactionDate', e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        <div><label className="form-label">Description *</label><textarea required value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="form-input w-full" placeholder="Reason for the transfer" /></div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          Transfers to the office account require written client authority and that the funds have been earned (e.g. an issued invoice).
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}>Record Transfer</Button>
          <Link href="/app/trust"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
