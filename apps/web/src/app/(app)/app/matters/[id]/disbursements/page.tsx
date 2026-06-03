'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { ArrowLeft, Plus, FileText, DollarSign, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Disbursement = {
  id: string;
  reference: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  requestedBy?: { name: string } | null;
  approvedBy?: { name: string } | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
};

export default function DisbursementsPage() {
  const { id } = useParams<{ id: string }>();
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '', amount: '', currency: 'KES',
    notes: '', requestNote: '', disbursementType: 'COURT_FEES',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => {
    setLoading(true);
    api.get<{ data: Disbursement[] }>(`/matters/${id}/disbursements`)
      .then((r) => setDisbursements(r.data ?? []))
      .catch(() => setDisbursements([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than 0'); return; }
    setError(''); setSaving(true);
    try {
      await api.post(`/matters/${id}/disbursements`, {
        ...form,
        amount: parseFloat(form.amount),
        matterId: id,
      });
      setForm({ description: '', amount: '', currency: 'KES', notes: '', requestNote: '', disbursementType: 'COURT_FEES' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit disbursement request');
    } finally {
      setSaving(false);
    }
  };

  const totalPaid    = disbursements.filter((d) => d.status === 'PAID').reduce((s, d) => s + d.amount, 0);
  const totalPending = disbursements.filter((d) => ['PENDING','APPROVED'].includes(d.status)).reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/app/matters/${id}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Disbursements</h1>
            <p className="text-sm text-gray-500">Matter expenses and disbursement requests</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Request Disbursement</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Total Disbursed</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-700 mb-1 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Pending</p>
          <p className="text-xl font-bold text-amber-800">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Requests</p>
          <p className="text-2xl font-bold text-gray-900">{disbursements.length}</p>
        </div>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="card p-6 space-y-4 border-primary-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary-600" /> Disbursement Request Note
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Disbursement Type *</label>
                <select required value={form.disbursementType} onChange={(e) => set('disbursementType', e.target.value)} className="form-select w-full">
                  <option value="COURT_FEES">Court Filing Fees</option>
                  <option value="STAMP_DUTY">Stamp Duty</option>
                  <option value="VALUATION">Valuation Fees</option>
                  <option value="SEARCH_FEES">Search / Registry Fees</option>
                  <option value="TRAVEL">Travel & Accommodation</option>
                  <option value="PRINTING">Printing & Photocopying</option>
                  <option value="PROCESS_SERVER">Process Server</option>
                  <option value="EXPERT_WITNESS">Expert Witness</option>
                  <option value="ADVOCATE_FEES">Advocate Fees (Correspondent)</option>
                  <option value="OTHER">Other Disbursement</option>
                </select>
              </div>
              <Input label="Description *" required value={form.description}
                onChange={(e) => set('description', e.target.value)} placeholder="Brief description of expense" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input label="Amount *" required type="number" min="1" step="0.01"
                    value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
                </div>
                <div className="w-24">
                  <label className="form-label">Currency</label>
                  <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full">
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Request Note / Justification *</label>
                <textarea required value={form.requestNote} onChange={(e) => set('requestNote', e.target.value)}
                  rows={3} className="form-input w-full"
                  placeholder="Describe the purpose and necessity of this disbursement. Include any supporting reference numbers…" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Additional Notes</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
                  rows={2} className="form-input w-full"
                  placeholder="Any additional information for the approver…" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Disbursement requests require partner approval before payment.</p>
              <Button type="submit" loading={saving}>Submit Request</Button>
            </div>
          </form>
        </div>
      )}

      <Table>
        <thead>
          <tr><Th>Ref</Th><Th>Type</Th><Th>Description</Th><Th>Amount</Th><Th>Requested By</Th><Th>Status</Th><Th>Date</Th><Th></Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !disbursements.length ? <EmptyRow colSpan={8} message="No disbursements requested for this matter" /> :
           disbursements.map((d) => (
             <tr key={d.id}>
               <Td><span className="font-mono text-xs text-gray-600">{d.reference}</span></Td>
               <Td className="text-xs text-gray-600">{d.status}</Td>
               <Td className="text-sm text-gray-900">{d.description}</Td>
               <Td className="font-medium text-gray-900">{formatCurrency(d.amount, d.currency)}</Td>
               <Td className="text-sm text-gray-600">{d.requestedBy?.name ?? '—'}</Td>
               <Td><StatusBadge status={d.status} /></Td>
               <Td className="text-xs text-gray-500">{formatDate(d.createdAt)}</Td>
               <Td>
                 {d.status === 'PENDING' && (
                   <div className="flex gap-2">
                     <button className="text-xs text-green-600 hover:underline">Approve</button>
                     <button className="text-xs text-red-500 hover:underline">Reject</button>
                   </div>
                 )}
                 {d.status === 'APPROVED' && (
                   <button className="text-xs text-primary-600 hover:underline">Mark Paid</button>
                 )}
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
