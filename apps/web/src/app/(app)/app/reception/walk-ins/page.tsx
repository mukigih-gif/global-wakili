'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { ArrowLeft, Plus, Search, UserCheck, Receipt, Printer, Check } from 'lucide-react';
import Link from 'next/link';

type ExpressService = {
  id: string;
  clientName: string;
  serviceType: string;
  amount: number;
  isPaid: boolean;
  mpesaRef?: string | null;
  createdAt: string;
};

const SERVICE_TYPES = [
  { value: 'COMMISSIONER_FOR_OATHS', label: 'Commissioner for Oaths' },
  { value: 'NOTARIZATION',           label: 'Notarization / Apostille' },
  { value: 'DOCUMENT_STAMP',         label: 'Document Stamp / Certification' },
  { value: 'QUICK_CONSULTATION',     label: 'Quick Consultation (≤30 min)' },
  { value: 'LEGAL_OPINION',          label: 'Written Legal Opinion' },
  { value: 'AFFIDAVIT',              label: 'Affidavit Commissioning' },
  { value: 'CONTRACT_REVIEW',        label: 'Contract Review (Walk-in)' },
  { value: 'WITNESS_SIGNATURE',      label: 'Witness Signature' },
  { value: 'TRANSLATION_CERT',       label: 'Translation Certificate' },
  { value: 'OTHER',                  label: 'Other Express Service' },
];

const DEFAULT_FEES: Record<string, number> = {
  COMMISSIONER_FOR_OATHS: 500,
  NOTARIZATION:           2500,
  DOCUMENT_STAMP:         500,
  QUICK_CONSULTATION:     3000,
  LEGAL_OPINION:          5000,
  AFFIDAVIT:              1000,
  CONTRACT_REVIEW:        5000,
  WITNESS_SIGNATURE:      500,
  TRANSLATION_CERT:       1500,
  OTHER:                  0,
};

const EMPTY_FORM = {
  clientName: '', serviceType: 'COMMISSIONER_FOR_OATHS',
  amount: 500, paymentMethod: 'MPESA', mpesaRef: '', notes: '',
};

export default function WalkInsPage() {
  const [services, setServices] = useState<ExpressService[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [query, setQuery]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [receipt, setReceipt]   = useState<ExpressService | null>(null);

  const load = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    api.get<{ data: ExpressService[] }>(`/reception/express-services?date=${today}&limit=50`)
      .then((r) => setServices(r.data ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const handleServiceType = (type: string) => {
    setForm((f) => ({ ...f, serviceType: type, amount: DEFAULT_FEES[type] ?? 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim()) { setError('Client name is required'); return; }
    setError(''); setSaving(true);
    try {
      const result = await api.post<ExpressService>('/reception/express-services', {
        clientName:  form.clientName,
        serviceType: form.serviceType,
        amount:      form.amount,
        isPaid:      true,
        mpesaRef:    form.paymentMethod === 'MPESA' ? form.mpesaRef : null,
        notes:       form.notes,
      });
      setReceipt(result);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record service');
    } finally {
      setSaving(false);
    }
  };

  const filtered = services.filter((s) =>
    !query || s.clientName.toLowerCase().includes(query.toLowerCase()) || s.serviceType.toLowerCase().includes(query.toLowerCase())
  );

  const todayTotal = services.reduce((sum, s) => sum + (s.isPaid ? s.amount : 0), 0);
  const todayCount = services.length;

  const serviceLabel = (type: string) => SERVICE_TYPES.find((s) => s.value === type)?.label ?? type.replace(/_/g, ' ');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/reception" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Walk-In Clients</h1>
          <p className="text-sm text-gray-500">Express services — stamp, consultation, notarization without opening a full matter</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Record Service</Button>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Today's Walk-ins</p>
          <p className="text-2xl font-bold text-gray-900">{todayCount}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs text-green-700 mb-1 flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Today's Revenue</p>
          <p className="text-xl font-bold text-green-800">{formatCurrency(todayTotal)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. Per Service</p>
          <p className="text-xl font-bold text-gray-900">{todayCount ? formatCurrency(todayTotal / todayCount) : '—'}</p>
        </div>
      </div>

      {/* Receipt toast */}
      {receipt && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Service recorded — {receipt.clientName}</p>
              <p className="text-xs text-green-700">{serviceLabel(receipt.serviceType)} · {formatCurrency(receipt.amount)} · {receipt.isPaid ? 'Paid' : 'Unpaid'} {receipt.mpesaRef ? `· Ref: ${receipt.mpesaRef}` : ''}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => window.print()} className="text-xs text-green-700 hover:underline flex items-center gap-1"><Printer className="h-3.5 w-3.5" /> Print Receipt</button>
            <button onClick={() => setReceipt(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
          </div>
        </div>
      )}

      {/* New service form */}
      {showForm && (
        <div className="card p-6 space-y-4 border-primary-200 bg-primary-50/20">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Record Walk-In Service</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Client Name *" required value={form.clientName} onChange={(e) => set('clientName', e.target.value)} placeholder="Full name of walk-in client" />
              <div>
                <label className="form-label">Service Type *</label>
                <select required value={form.serviceType} onChange={(e) => handleServiceType(e.target.value)} className="form-select w-full">
                  {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Fee (KES) *</label>
                <input type="number" min="0" step="50" required value={form.amount}
                  onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                  className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Payment Method</label>
                <select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className="form-select w-full">
                  <option value="MPESA">M-PESA</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="UNPAID">Invoice Later</option>
                </select>
              </div>
              {form.paymentMethod === 'MPESA' && (
                <Input label="M-PESA Reference" value={form.mpesaRef} onChange={(e) => set('mpesaRef', e.target.value)} placeholder="e.g. QK4X2ABCDE" />
              )}
              <div className="sm:col-span-2">
                <label className="form-label">Notes</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="form-input w-full resize-none" placeholder="Any additional notes…" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Total: <span className="text-primary-700 text-lg">{formatCurrency(form.amount)}</span></p>
              <Button type="submit" loading={saving}>Record &amp; Issue Receipt</Button>
            </div>
          </form>
        </div>
      )}

      {/* Search & list */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="search" placeholder="Search walk-ins…" value={query} onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Client Name</Th>
            <Th>Service</Th>
            <Th>Fee</Th>
            <Th>Payment</Th>
            <Th>M-PESA Ref</Th>
            <Th>Time</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={7} /> :
           !filtered.length ? <EmptyRow colSpan={7} message="No walk-in services recorded today" /> :
           filtered.map((s) => (
             <tr key={s.id}>
               <Td className="font-medium text-gray-900">{s.clientName}</Td>
               <Td className="text-sm text-gray-700">{serviceLabel(s.serviceType)}</Td>
               <Td className="font-medium text-gray-900">{formatCurrency(s.amount)}</Td>
               <Td><StatusBadge status={s.isPaid ? 'PAID' : 'UNPAID'} /></Td>
               <Td className="font-mono text-xs text-gray-500">{s.mpesaRef ?? '—'}</Td>
               <Td className="text-xs text-gray-500">{formatDateTime(s.createdAt)}</Td>
               <Td>
                 <button onClick={() => window.print()} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                   <Printer className="h-3 w-3" /> Receipt
                 </button>
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
