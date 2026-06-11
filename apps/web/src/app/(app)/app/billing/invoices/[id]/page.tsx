'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FileText, Briefcase, ShieldCheck, X } from 'lucide-react';

type InvoiceLine = { id: string; description?: string | null; quantity?: number | string | null; unitPrice?: number | string | null; total?: number | string | null };
type PaymentReceipt = { id: string; receiptNumber?: string | null; amount?: number | string | null; method?: string | null; reference?: string | null; status?: string | null; receivedAt?: string | null };
type Invoice = {
  id: string; invoiceNumber: string; status: string; currency?: string;
  total?: number | string; subTotal?: number | string; taxAmount?: number | string; whtAmount?: number | string;
  paidAmount?: number | string; balanceDue?: number | string;
  issuedDate?: string | null; dueDate?: string | null; matterId?: string;
  matter?: { id?: string; title?: string; matterCode?: string | null } | null;
  client?: { id?: string; name?: string; email?: string | null; kraPin?: string | null } | null;
  lines?: InvoiceLine[]; paymentReceipts?: PaymentReceipt[];
  etimsStatus?: string | null; etimsValidated?: boolean; kraControlNumber?: string | null;
  etimsReceiptNumber?: string | null; cuInvoiceNumber?: string | null; etimsQrCode?: string | null; etimsRejectionReason?: string | null;
};

const num = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [etimsSubmitting, setEtimsSubmitting] = useState(false);
  const [etimsMsg, setEtimsMsg] = useState('');
  const [acting, setActing] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'ACCOUNT_DEBIT', reference: '' });
  const [paySaving, setPaySaving] = useState(false);
  const [payErr, setPayErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.get<{ data: Invoice }>(`/billing/invoices/${id}`)
      .then((r) => setInvoice(r.data ?? null))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const submitEtims = async () => {
    if (!invoice) return;
    setEtimsSubmitting(true); setEtimsMsg('');
    try {
      await api.post(`/etims/invoices/${invoice.id}/submit`, {});
      setEtimsMsg('Submitted to KRA eTIMS.'); load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'eTIMS submission failed';
      setEtimsMsg(/not implemented|501|not found|404/i.test(msg) ? 'eTIMS submission is not implemented yet (501).' : msg);
    } finally { setEtimsSubmitting(false); }
  };
  const submitInvoice = async () => {
    if (!invoice?.matterId) return;
    setActing(true);
    try { await api.post(`/matters/${invoice.matterId}/invoices/${invoice.id}/submit`, {}); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed to submit'); }
    finally { setActing(false); }
  };
  const cancelInvoice = async () => {
    if (!invoice?.matterId) return;
    if (!confirm('Cancel this invoice? Billed time/expenses will be released.')) return;
    setActing(true);
    try { await api.post(`/matters/${invoice.matterId}/invoices/${invoice.id}/cancel`, {}); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed to cancel'); }
    finally { setActing(false); }
  };
  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { setPayErr('Amount must be greater than 0'); return; }
    setPaySaving(true); setPayErr('');
    try {
      await api.post(`/billing/invoices/${invoice.id}/payment`, { amount: parseFloat(payForm.amount), method: payForm.method, reference: payForm.reference || undefined });
      setShowPay(false); setPayForm({ amount: '', method: 'ACCOUNT_DEBIT', reference: '' }); load();
    } catch (err: unknown) { setPayErr(err instanceof Error ? err.message : 'Payment failed'); }
    finally { setPaySaving(false); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const viewReceipt = async () => {
    if (!invoice) return;
    setReceiptLoading(true);
    try {
      const r = await api.get<{ data: any }>(`/billing/invoices/${invoice.id}/receipt`);
      setReceipt(r.data ?? null);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed to load receipt'); }
    finally { setReceiptLoading(false); }
  };

  if (loading) {
    return (<div className="space-y-4 animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-40 bg-gray-100 rounded-xl" /></div>);
  }
  if (!invoice) {
    return (<div className="text-center py-16 text-gray-400">Invoice not found. <Link href="/app/billing" className="text-primary-600 underline">Back to Billing</Link></div>);
  }

  const cur = invoice.currency ?? 'KES';
  const total = num(invoice.total);
  const paid = num(invoice.paidAmount);
  const balance = invoice.balanceDue != null ? num(invoice.balanceDue) : total - paid;
  const subTotal = num(invoice.subTotal);
  const vat = num(invoice.taxAmount);
  const wht = num(invoice.whtAmount);

  return (
    <div className="space-y-5 max-w-4xl">
      <style>{`@media print { nav, header, .no-print, button { display: none !important; } .print-only { display: block !important; } }`}</style>

      {/* Header */}
      <div>
        <Link href="/app/billing" className="no-print text-gray-400 hover:text-gray-600 text-sm inline-flex items-center gap-1 mb-3"><ArrowLeft className="h-4 w-4" /> Invoices</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary-700">{user?.tenantName ?? 'Your Firm'}</p>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mt-1"><FileText className="h-6 w-6 text-primary-600" /> {invoice.invoiceNumber}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Issued {invoice.issuedDate ? formatDate(invoice.issuedDate) : '—'}</p>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-gray-900">{formatCurrency(total, cur)}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Paid</p><p className="text-xl font-bold text-green-700">{formatCurrency(paid, cur)}</p></div>
        <div className={`rounded-xl border p-4 ${balance > 0 ? 'border-amber-100 bg-amber-50' : 'border-gray-200 bg-white'}`}><p className={`text-xs ${balance > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Balance Due</p><p className={`text-xl font-bold ${balance > 0 ? 'text-amber-800' : 'text-gray-900'}`}>{formatCurrency(balance, cur)}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Due Date</p><p className="text-lg font-bold text-gray-900">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p></div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">From</p>
          <p className="font-semibold text-gray-900">{user?.tenantName ?? 'Your Firm'}</p>
          <p className="text-sm text-gray-400 mt-1">Firm address — configure in firm settings</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Bill To</p>
          <p className="font-semibold text-gray-900">{invoice.client?.name ?? '—'}</p>
          {invoice.client?.kraPin && <p className="text-sm text-gray-600 mt-1">KRA PIN: {invoice.client.kraPin}</p>}
          {invoice.client?.email && <p className="text-sm text-gray-600">{invoice.client.email}</p>}
        </div>
      </div>

      {/* Matter reference */}
      {invoice.matter && (
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">Matter:</span>
          <Link href={`/app/matters/${invoice.matter.id ?? invoice.matterId}`} className="font-medium text-primary-700 hover:underline">
            {invoice.matter.title}{invoice.matter.matterCode ? ` (${invoice.matter.matterCode})` : ''}
          </Link>
        </div>
      )}

      {/* Line items */}
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Line Items</h2></div>
        <Table>
          <thead><tr><Th>Description</Th><Th>Qty</Th><Th>Unit Price</Th><Th>Amount</Th></tr></thead>
          <tbody>
            {!invoice.lines?.length ? <EmptyRow colSpan={4} message="No line items on this invoice" /> :
             invoice.lines.map((l) => (
               <tr key={l.id}>
                 <Td className="text-sm text-gray-900">{l.description ?? '—'}</Td>
                 <Td className="text-xs text-gray-600">{num(l.quantity).toLocaleString()}</Td>
                 <Td className="text-xs text-gray-600">{formatCurrency(num(l.unitPrice), cur)}</Td>
                 <Td className="font-medium text-gray-900">{formatCurrency(num(l.total), cur)}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
        <div className="border-t border-gray-100 px-5 py-3 space-y-1.5 text-sm">
          <div className="flex justify-end gap-8"><span className="text-gray-500">Subtotal</span><span className="w-32 text-right text-gray-900">{formatCurrency(subTotal, cur)}</span></div>
          {vat > 0 && <div className="flex justify-end gap-8"><span className="text-gray-500">VAT</span><span className="w-32 text-right text-gray-900">{formatCurrency(vat, cur)}</span></div>}
          {wht > 0 && <div className="flex justify-end gap-8"><span className="text-gray-500">WHT</span><span className="w-32 text-right text-gray-900">−{formatCurrency(wht, cur)}</span></div>}
          <div className="flex justify-end gap-8 pt-1.5 border-t border-gray-100"><span className="font-bold text-gray-900">Total</span><span className="w-32 text-right font-bold text-gray-900">{formatCurrency(total, cur)}</span></div>
        </div>
      </div>

      {/* Payment history */}
      <div className="card">
        <div className="px-5 py-3 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Payment History</h2></div>
        <Table>
          <thead><tr><Th>Receipt No.</Th><Th>Method</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th></tr></thead>
          <tbody>
            {!invoice.paymentReceipts?.length ? <EmptyRow colSpan={5} message="No payments recorded" /> :
             invoice.paymentReceipts.map((p) => (
               <tr key={p.id}>
                 <Td className="font-mono text-xs">{p.receiptNumber ?? '—'}</Td>
                 <Td className="text-xs text-gray-600">{p.method ?? '—'}</Td>
                 <Td className="font-medium text-green-700">{formatCurrency(num(p.amount), cur)}</Td>
                 <Td className="text-xs text-gray-500">{p.receivedAt ? formatDate(p.receivedAt) : '—'}</Td>
                 <Td>{p.status ? <StatusBadge status={p.status} /> : '—'}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      </div>

      {/* eTIMS compliance */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary-600" /> KRA eTIMS Compliance</h2>
          {invoice.etimsValidated ? <span className="badge-green text-xs">KRA Verified ✓</span> : <span className="badge-yellow text-xs">Pending Validation</span>}
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {invoice.etimsStatus && <div className="flex gap-2"><dt className="text-gray-500 w-40">Status</dt><dd className="text-gray-900">{invoice.etimsStatus}</dd></div>}
          {invoice.kraControlNumber && <div className="flex gap-2"><dt className="text-gray-500 w-40">Control Number</dt><dd className="font-mono text-gray-900">{invoice.kraControlNumber}</dd></div>}
          {invoice.etimsReceiptNumber && <div className="flex gap-2"><dt className="text-gray-500 w-40">eTIMS Receipt No.</dt><dd className="font-mono text-gray-900">{invoice.etimsReceiptNumber}</dd></div>}
          {invoice.cuInvoiceNumber && <div className="flex gap-2"><dt className="text-gray-500 w-40">CU Invoice No.</dt><dd className="font-mono text-gray-900">{invoice.cuInvoiceNumber}</dd></div>}
          {invoice.etimsQrCode && <div className="flex gap-2"><dt className="text-gray-500 w-40">QR Code</dt><dd className="text-gray-900 break-all text-xs">{invoice.etimsQrCode}</dd></div>}
        </dl>
        {invoice.etimsRejectionReason && <p className="text-sm text-red-600">Rejected: {invoice.etimsRejectionReason}</p>}
        {etimsMsg && <p className="text-sm text-gray-600">{etimsMsg}</p>}
        {!invoice.etimsValidated && invoice.status === 'APPROVED' && (
          <Button size="sm" variant="secondary" loading={etimsSubmitting} onClick={submitEtims} className="no-print">Submit to KRA eTIMS</Button>
        )}
      </div>

      {/* Actions */}
      <div className="no-print flex flex-wrap items-center gap-3 pt-2">
        {invoice.status === 'DRAFT' && (<>
          <Button size="sm" loading={acting} onClick={submitInvoice}>Submit for Approval</Button>
          <Button size="sm" variant="secondary" loading={acting} onClick={cancelInvoice}>Cancel</Button>
        </>)}
        {invoice.status === 'PENDING_APPROVAL' && (<Link href="/app/approvals"><Button size="sm" variant="secondary">In Approvals →</Button></Link>)}
        {invoice.status === 'APPROVED' && (<Button size="sm" onClick={() => setShowPay((v) => !v)}>Record Payment</Button>)}
        {invoice.status === 'PAID' && (<Button size="sm" variant="secondary" loading={receiptLoading} onClick={viewReceipt}>View Receipt</Button>)}
        {invoice.status !== 'CANCELLED' && (<>
          <Button size="sm" variant="ghost" onClick={() => window.print()}>Print</Button>
          <Button size="sm" variant="ghost" onClick={share}>{copied ? 'Link copied!' : 'Share'}</Button>
        </>)}
      </div>

      {invoice.status === 'APPROVED' && showPay && (
        <form onSubmit={recordPayment} className="no-print card p-5 space-y-3">
          {payErr && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{payErr}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className="form-label">Amount *</label><input type="number" min="0.01" step="0.01" required value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} className="form-input w-full" placeholder="0.00" /></div>
            <div><label className="form-label">Method</label><select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))} className="form-select w-full"><option value="ACCOUNT_DEBIT">Account Debit</option><option value="MPESA">M-PESA</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="TRUST">Trust</option></select></div>
            <div><label className="form-label">Reference</label><input value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} className="form-input w-full" placeholder="Optional" /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowPay(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button><Button type="submit" size="sm" loading={paySaving}>Save Payment</Button></div>
        </form>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 no-print" onClick={() => setReceipt(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Receipt — {receipt.invoiceNumber}</h3>
              <button onClick={() => setReceipt(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-gray-500">Client</dt><dd className="text-gray-900">{receipt.client?.name ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Total</dt><dd className="text-gray-900">{formatCurrency(num(receipt.total), cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Paid</dt><dd className="text-green-700">{formatCurrency(num(receipt.paidAmount), cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Balance Due</dt><dd className="text-gray-900">{formatCurrency(num(receipt.balanceDue), cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd className="font-medium">{receipt.isPaid ? 'PAID' : (receipt.status ?? '—')}</dd></div>
            </dl>
            {Array.isArray(receipt.payments) && receipt.payments.length > 0 && (
              <div className="border-t border-gray-100 pt-2 space-y-1">
                <p className="text-xs font-semibold text-gray-400">Payments</p>
                {receipt.payments.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs text-gray-600"><span>{p.receiptNumber ?? p.method ?? '—'}</span><span>{formatCurrency(num(p.amount), cur)}</span></div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-2"><button onClick={() => setReceipt(null)} className="text-sm text-primary-600 hover:underline">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
