'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import {
  DollarSign, FileText, AlertCircle, CheckCircle,
  Receipt, Calculator, ArrowUpRight, ArrowDownLeft,
  Building, Upload, TrendingDown, BarChart2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type VatMonthly = {
  month: string; year: number;
  outputVat: number; inputVat: number; netVatPayable: number;
  invoiceCount: number; status: 'FILED' | 'PENDING' | 'OVERDUE';
};

type VatAdjustment = {
  id: string; type: string; amount: number;
  reason: string; reference?: string | null; status: string; adjustmentDate: string;
};

type WhtCertificate = {
  id: string; certificateNumber: string; amount: number;
  payerName?: string | null; payerPin?: string | null;
  status: string; certificateDate: string;
  invoice?: { invoiceNumber: string } | null;
};

type WhtReport = {
  totalWhtDeducted: number; certificateCount: number;
  pendingCertificates: number;
  byMonth: Array<{ month: string; amount: number; count: number }>;
};

type EtimsInvoice = {
  id: string; invoiceNumber: string; totalAmount: number; currency: string;
  etimsStatus?: string | null; etimsReference?: string | null;
  etimsReceiptNumber?: string | null; createdAt: string;
  client?: { name: string } | null;
};

type PayrollDeductions = {
  period: string;
  paye: number; shif: number; nssf: number; housingLevy: number;
  grossSalary: number; netSalary: number; employeeCount: number;
};

type Tab = 'vat' | 'wht' | 'etims' | 'payroll' | 'returns';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'vat',      label: 'VAT',                  icon: <Receipt className="h-4 w-4" /> },
  { key: 'wht',      label: 'Withholding Tax',       icon: <TrendingDown className="h-4 w-4" /> },
  { key: 'etims',    label: 'eTIMS / KRA',           icon: <Building className="h-4 w-4" /> },
  { key: 'payroll',  label: 'Payroll Deductions',    icon: <Calculator className="h-4 w-4" /> },
  { key: 'returns',  label: 'Tax Returns',           icon: <BarChart2 className="h-4 w-4" /> },
];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TaxPage() {
  const now   = new Date();
  const [tab, setTab] = useState<Tab>('vat');

  // VAT state
  const [vatMonthly, setVatMonthly]     = useState<VatMonthly[]>([]);
  const [vatAdjs, setVatAdjs]           = useState<VatAdjustment[]>([]);
  const [vatLoading, setVatLoading]     = useState(false);
  const [vatYear, setVatYear]           = useState(now.getFullYear());
  const [showVatAdjForm, setShowVatAdjForm] = useState(false);
  const [vatAdjForm, setVatAdjForm]     = useState({ type: 'OUTPUT_VAT', amount: '', reason: '', reference: '', adjustmentDate: '' });
  const [vatAdjSaving, setVatAdjSaving] = useState(false);
  const [vatAdjError, setVatAdjError]   = useState('');
  const [etimsError, setEtimsError]     = useState('');

  // WHT state
  const [whtCerts, setWhtCerts]         = useState<WhtCertificate[]>([]);
  const [whtReport, setWhtReport]       = useState<WhtReport | null>(null);
  const [whtLoading, setWhtLoading]     = useState(false);

  // eTIMS state
  const [etimsInvoices, setEtimsInvs]   = useState<EtimsInvoice[]>([]);
  const [etimsLoading, setEtimsLoading] = useState(false);
  const [fiscalizing, setFiscalizing]   = useState<string | null>(null);

  // Payroll deductions
  const [deductions, setDeductions]     = useState<PayrollDeductions | null>(null);
  const [dedLoading, setDedLoading]     = useState(false);
  const [dedPeriod, setDedPeriod]       = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);

  // WHT form
  const [showWhtForm, setShowWhtForm]   = useState(false);
  const [whtForm, setWhtForm]           = useState({ certificateNumber: '', certificateDate: '', amount: '', payerName: '', payerPin: '', invoiceId: '', notes: '' });
  const [whtSaving, setWhtSaving]       = useState(false);

  // Load VAT
  useEffect(() => {
    if (tab !== 'vat') return;
    setVatLoading(true);
    Promise.all([
      api.get<{ data: VatMonthly[] }>(`/finance/tax/vat/monthly?year=${vatYear}`)
        .then((r) => setVatMonthly(r.data ?? [])).catch(() => {}),
      api.get<{ data: VatAdjustment[] }>('/finance/tax/vat/adjustments')
        .then((r) => setVatAdjs(r.data ?? [])).catch(() => {}),
    ]).finally(() => setVatLoading(false));
  }, [tab, vatYear]);

  // Load WHT
  useEffect(() => {
    if (tab !== 'wht') return;
    setWhtLoading(true);
    Promise.all([
      api.get<{ data: WhtCertificate[] }>('/finance/tax/wht/report?limit=50')
        .then((r) => { if (Array.isArray(r.data)) setWhtCerts(r.data); }).catch(() => {}),
      api.get<WhtReport>('/finance/tax/wht/report')
        .then((r) => { if (r.totalWhtDeducted !== undefined) setWhtReport(r); }).catch(() => {}),
    ]).finally(() => setWhtLoading(false));
  }, [tab]);

  // Load eTIMS
  useEffect(() => {
    if (tab !== 'etims') return;
    setEtimsLoading(true);
    api.get<{ data: EtimsInvoice[] }>('/billing/invoices?limit=50')
      .then((r) => setEtimsInvs(r.data ?? [])).catch(() => setEtimsInvs([]))
      .finally(() => setEtimsLoading(false));
  }, [tab]);

  // Load payroll deductions
  useEffect(() => {
    if (tab !== 'payroll') return;
    setDedLoading(true);
    const [yr, mo] = dedPeriod.split('-');
    api.get<PayrollDeductions>(`/hr/payroll/deductions?year=${yr}&month=${mo}`)
      .then(setDeductions).catch(() => setDeductions(null))
      .finally(() => setDedLoading(false));
  }, [tab, dedPeriod]);

  const fiscalize = async (invoiceId: string) => {
    setFiscalizing(invoiceId); setEtimsError('');
    try {
      await api.post(`/finance/etims/invoices/${invoiceId}/fiscalize`, {});
      // Refresh
      const r = await api.get<{ data: EtimsInvoice[] }>('/billing/invoices?limit=50');
      setEtimsInvs(r.data ?? []);
    } catch (err) {
      // FRONT-007: surface the failure reason (e.g. 422 ETIMS_SUPPLIER_PIN_REQUIRED)
      setEtimsError((err as ApiError)?.message ?? 'Fiscalization failed');
    } finally {
      setFiscalizing(null);
    }
  };

  const submitWhtCert = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhtSaving(true);
    try {
      await api.post('/finance/tax/wht/certificates', { ...whtForm, amount: parseFloat(whtForm.amount) });
      setShowWhtForm(false);
      setWhtForm({ certificateNumber: '', certificateDate: '', amount: '', payerName: '', payerPin: '', invoiceId: '', notes: '' });
      // reload
      const r = await api.get<{ data: WhtCertificate[] }>('/finance/tax/wht/report?limit=50');
      if (Array.isArray(r.data)) setWhtCerts(r.data);
    } catch { } finally { setWhtSaving(false); }
  };

  const setW = (k: string, v: string) => setWhtForm((f) => ({ ...f, [k]: v }));

  // VAT adjustments (FRONT-001)
  const submitVatAdj = async (e: React.FormEvent) => {
    e.preventDefault();
    setVatAdjSaving(true); setVatAdjError('');
    try {
      await api.post('/finance/tax/vat/adjustments', {
        type: vatAdjForm.type,
        amount: parseFloat(vatAdjForm.amount),
        reason: vatAdjForm.reason,
        reference: vatAdjForm.reference || null,
        adjustmentDate: vatAdjForm.adjustmentDate || new Date().toISOString(),
      });
      setShowVatAdjForm(false);
      setVatAdjForm({ type: 'OUTPUT_VAT', amount: '', reason: '', reference: '', adjustmentDate: '' });
      const r = await api.get<{ data: VatAdjustment[] }>('/finance/tax/vat/adjustments');
      setVatAdjs(r.data ?? []);
    } catch (err) {
      setVatAdjError((err as ApiError)?.message ?? 'Failed to record adjustment');
    } finally { setVatAdjSaving(false); }
  };

  const voidVatAdj = async (id: string) => {
    const reason = window.prompt('Reason for voiding this VAT adjustment?');
    if (!reason?.trim()) return;
    try {
      await api.post(`/finance/tax/vat/adjustments/${id}/void`, { reason });
      const r = await api.get<{ data: VatAdjustment[] }>('/finance/tax/vat/adjustments');
      setVatAdjs(r.data ?? []);
    } catch (err) { setVatAdjError((err as ApiError)?.message ?? 'Void failed'); }
  };

  // VAT metrics
  const currentYearVat = vatMonthly;
  const totalOutputVat = currentYearVat.reduce((s, m) => s + m.outputVat, 0);
  const totalInputVat  = currentYearVat.reduce((s, m) => s + m.inputVat, 0);
  const netVatPayable  = totalOutputVat - totalInputVat;
  const pendingVat     = currentYearVat.filter((m) => m.status === 'PENDING' || m.status === 'OVERDUE').length;

  // eTIMS metrics
  const unfiscalized   = etimsInvoices.filter((i) => !i.etimsStatus || i.etimsStatus === 'PENDING').length;
  const fiscalized     = etimsInvoices.filter((i) => i.etimsStatus === 'SUBMITTED' || i.etimsStatus === 'ACCEPTED').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Compliance</h1>
          <p className="text-sm text-gray-500">VAT, WHT, eTIMS, payroll deductions and tax return preparation</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
          VAT returns due by 20th of following month · WHT returns due by 20th of following month
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── VAT ──────────────────────────────────────────────────────────────── */}
      {tab === 'vat' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Year</label>
              <select value={vatYear} onChange={(e) => setVatYear(parseInt(e.target.value))} className="form-select h-8 text-xs w-24">
                {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button size="sm" variant="secondary">
              <FileText className="h-3.5 w-3.5" /> Prepare VAT Return
            </Button>
          </div>

          {/* VAT KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1 text-xs text-gray-500"><ArrowUpRight className="h-3.5 w-3.5 text-green-500" /> Output VAT (Sales)</div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalOutputVat)}</p>
              <p className="text-xs text-gray-400 mt-0.5">VAT collected from clients</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1 text-xs text-gray-500"><ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" /> Input VAT (Purchases)</div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalInputVat)}</p>
              <p className="text-xs text-gray-400 mt-0.5">VAT paid on firm expenses</p>
            </div>
            <div className={`rounded-xl border p-4 ${netVatPayable > 0 ? 'border-amber-100 bg-amber-50' : 'border-green-100 bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-1 text-xs text-amber-600"><DollarSign className="h-3.5 w-3.5" /> Net VAT Payable</div>
              <p className={`text-xl font-bold ${netVatPayable > 0 ? 'text-amber-800' : 'text-green-800'}`}>{formatCurrency(Math.abs(netVatPayable))}</p>
              <p className="text-xs text-gray-400 mt-0.5">{netVatPayable > 0 ? 'Payable to KRA' : 'Refund due'}</p>
            </div>
            <div className={`rounded-xl border p-4 ${pendingVat > 0 ? 'border-red-100 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2 mb-1 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" /> Unfiled Returns</div>
              <p className={`text-2xl font-bold ${pendingVat > 0 ? 'text-red-700' : 'text-gray-900'}`}>{pendingVat}</p>
              <p className="text-xs text-gray-400 mt-0.5">months with pending filing</p>
            </div>
          </div>

          {/* Monthly VAT table */}
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-gray-900">Monthly VAT Summary — {vatYear}</h2></div>
            <Table>
              <thead>
                <tr><Th>Month</Th><Th>Output VAT</Th><Th>Input VAT</Th><Th>Net Payable</Th><Th>Invoices</Th><Th>Filing Status</Th><Th></Th></tr>
              </thead>
              <tbody>
                {vatLoading ? <LoadingRow colSpan={7} /> :
                 !vatMonthly.length ? <EmptyRow colSpan={7} message="No VAT data for this year" /> :
                 vatMonthly.map((m) => (
                   <tr key={m.month} className={m.status === 'OVERDUE' ? 'bg-red-50/30' : ''}>
                     <Td className="font-medium text-gray-900">{m.month}</Td>
                     <Td className="text-gray-900">{formatCurrency(m.outputVat)}</Td>
                     <Td className="text-gray-600">{formatCurrency(m.inputVat)}</Td>
                     <Td className={`font-semibold ${m.netVatPayable > 0 ? 'text-amber-700' : 'text-green-700'}`}>{formatCurrency(Math.abs(m.netVatPayable))}</Td>
                     <Td className="text-gray-600">{m.invoiceCount}</Td>
                     <Td><StatusBadge status={m.status} /></Td>
                     <Td>
                       {m.status === 'PENDING' && <button className="text-xs text-primary-600 hover:underline">File Return</button>}
                       {m.status === 'FILED'   && <button className="text-xs text-gray-400 hover:underline">View Filing</button>}
                     </Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          </div>

          {/* VAT Adjustments */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">VAT Adjustments</h2>
              <Button size="sm" variant="secondary" onClick={() => { setShowVatAdjForm((v) => !v); setVatAdjError(''); }}>+ Record Adjustment</Button>
            </div>
            {vatAdjError && <div className="px-4 pt-3 text-xs text-red-600">{vatAdjError}</div>}
            {showVatAdjForm && (
              <form onSubmit={submitVatAdj} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 border-b border-gray-100">
                <div>
                  <label className="form-label">Type *</label>
                  <select value={vatAdjForm.type} onChange={(e) => setVatAdjForm((f) => ({ ...f, type: e.target.value }))} className="form-select w-full">
                    {['OUTPUT_VAT','INPUT_VAT','VAT_PAYABLE','VAT_REFUND','OTHER'].map((t) => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Amount (KES) *</label>
                  <input required type="number" min="0" step="0.01" value={vatAdjForm.amount} onChange={(e) => setVatAdjForm((f) => ({ ...f, amount: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Adjustment Date</label>
                  <input type="date" value={vatAdjForm.adjustmentDate} onChange={(e) => setVatAdjForm((f) => ({ ...f, adjustmentDate: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Reference</label>
                  <input value={vatAdjForm.reference} onChange={(e) => setVatAdjForm((f) => ({ ...f, reference: e.target.value }))} className="form-input w-full" placeholder="e.g. KRA-ADJ-2026-001" />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Reason *</label>
                  <textarea required value={vatAdjForm.reason} onChange={(e) => setVatAdjForm((f) => ({ ...f, reason: e.target.value }))} rows={2} className="form-input w-full" placeholder="Why this adjustment is being recorded" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" loading={vatAdjSaving}>Save Adjustment</Button>
                  <button type="button" onClick={() => setShowVatAdjForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              </form>
            )}
            <Table>
              <thead><tr><Th>Type</Th><Th>Reason</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th><Th></Th></tr></thead>
              <tbody>
                {!vatAdjs.length ? <EmptyRow colSpan={6} message="No VAT adjustments recorded" /> :
                 vatAdjs.map((a) => (
                   <tr key={a.id}>
                     <Td><span className="text-xs font-medium text-gray-600">{a.type.replace(/_/g,' ')}</span></Td>
                     <Td className="text-gray-900 text-sm">{a.reason}</Td>
                     <Td className="font-medium">{formatCurrency(a.amount)}</Td>
                     <Td><StatusBadge status={a.status} /></Td>
                     <Td className="text-xs text-gray-500">{formatDate(a.adjustmentDate)}</Td>
                     <Td>{a.status === 'POSTED' && <button onClick={() => voidVatAdj(a.id)} className="text-xs text-red-600 hover:underline">Void</button>}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* ── WHT ──────────────────────────────────────────────────────────────── */}
      {tab === 'wht' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-xs text-blue-700 max-w-lg">
              <strong>Kenya WHT on Professional Services:</strong> Clients who are companies/registered entities must
              deduct 5% WHT on professional fees and remit to KRA. You receive the net amount
              plus a WHT certificate. File WHT return by 20th of following month.
            </div>
            <Button size="sm" onClick={() => setShowWhtForm(true)}>
              <Upload className="h-3.5 w-3.5" /> Record WHT Certificate
            </Button>
          </div>

          {/* WHT KPI */}
          {whtReport && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500 mb-1">Total WHT Deducted (YTD)</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(whtReport.totalWhtDeducted)}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs text-blue-700 mb-1">Certificates Received</p>
                <p className="text-2xl font-bold text-blue-800">{whtReport.certificateCount}</p>
              </div>
              <div className={`rounded-xl border p-4 ${whtReport.pendingCertificates > 0 ? 'border-amber-100 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                <p className="text-xs text-amber-700 mb-1">Awaiting Certificates</p>
                <p className="text-2xl font-bold text-amber-800">{whtReport.pendingCertificates}</p>
              </div>
            </div>
          )}

          {/* WHT certificate form */}
          {showWhtForm && (
            <div className="card p-6 space-y-4 border-blue-200">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Record WHT Certificate</h2>
                <button onClick={() => setShowWhtForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
              <form onSubmit={submitWhtCert} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Certificate Number *</label>
                  <input required value={whtForm.certificateNumber} onChange={(e) => setW('certificateNumber', e.target.value)} className="form-input w-full" placeholder="WHT/2024/001234" />
                </div>
                <div>
                  <label className="form-label">Certificate Date *</label>
                  <input required type="date" value={whtForm.certificateDate} onChange={(e) => setW('certificateDate', e.target.value)} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">WHT Amount (KES) *</label>
                  <input required type="number" min="0" step="0.01" value={whtForm.amount} onChange={(e) => setW('amount', e.target.value)} className="form-input w-full" placeholder="e.g. 5000.00 (5% of 100,000)" />
                </div>
                <div>
                  <label className="form-label">Invoice Reference ID</label>
                  <input value={whtForm.invoiceId} onChange={(e) => setW('invoiceId', e.target.value)} className="form-input w-full" placeholder="Invoice ID this certificate relates to" />
                </div>
                <div>
                  <label className="form-label">Payer Name</label>
                  <input value={whtForm.payerName} onChange={(e) => setW('payerName', e.target.value)} className="form-input w-full" placeholder="Company that deducted WHT" />
                </div>
                <div>
                  <label className="form-label">Payer KRA PIN</label>
                  <input value={whtForm.payerPin} onChange={(e) => setW('payerPin', e.target.value.toUpperCase())} className="form-input w-full" placeholder="P000000000A" />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea value={whtForm.notes} onChange={(e) => setW('notes', e.target.value)} rows={2} className="form-input w-full" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" loading={whtSaving}>Save Certificate</Button>
                </div>
              </form>
            </div>
          )}

          {/* WHT certificates table */}
          <Table>
            <thead>
              <tr><Th>Certificate No.</Th><Th>Payer</Th><Th>Payer PIN</Th><Th>Amount</Th><Th>Invoice</Th><Th>Status</Th><Th>Date</Th></tr>
            </thead>
            <tbody>
              {whtLoading ? <LoadingRow colSpan={7} /> :
               !whtCerts.length ? <EmptyRow colSpan={7} message="No WHT certificates recorded" /> :
               whtCerts.map((c) => (
                 <tr key={c.id}>
                   <Td><span className="font-mono text-xs text-gray-700">{c.certificateNumber}</span></Td>
                   <Td className="text-gray-900 text-sm">{c.payerName ?? '—'}</Td>
                   <Td className="font-mono text-xs text-gray-500">{c.payerPin ?? '—'}</Td>
                   <Td className="font-medium text-gray-900">{formatCurrency(c.amount)}</Td>
                   <Td className="font-mono text-xs text-gray-500">{c.invoice?.invoiceNumber ?? '—'}</Td>
                   <Td><StatusBadge status={c.status} /></Td>
                   <Td className="text-xs text-gray-500">{formatDate(c.certificateDate)}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── eTIMS ────────────────────────────────────────────────────────────── */}
      {tab === 'etims' && (
        <div className="space-y-5">
          <div className="rounded-lg bg-primary-50 border border-primary-200 px-4 py-3 text-sm text-primary-800">
            <strong>KRA eTIMS Compliance:</strong> All invoices issued to registered entities must be fiscalized
            via Kenya Revenue Authority eTIMS before or at the time of issuance. Penalties apply for non-fiscalized invoices.
          </div>

          {etimsError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {etimsError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <div className="flex items-center gap-2 mb-1 text-xs text-green-700"><CheckCircle className="h-3.5 w-3.5" /> Fiscalized</div>
              <p className="text-2xl font-bold text-green-800">{fiscalized}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-1 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" /> Pending Fiscalization</div>
              <p className="text-2xl font-bold text-red-800">{unfiscalized}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 mb-1">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{etimsInvoices.length}</p>
            </div>
          </div>

          <Table>
            <thead>
              <tr><Th>Invoice No.</Th><Th>Client</Th><Th>Amount</Th><Th>eTIMS Status</Th><Th>eTIMS Ref</Th><Th>Receipt No.</Th><Th>Date</Th><Th></Th></tr>
            </thead>
            <tbody>
              {etimsLoading ? <LoadingRow colSpan={8} /> :
               !etimsInvoices.length ? <EmptyRow colSpan={8} message="No invoices found" /> :
               etimsInvoices.map((inv) => (
                 <tr key={inv.id} className={!inv.etimsStatus || inv.etimsStatus === 'PENDING' ? 'bg-red-50/20' : ''}>
                   <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
                   <Td className="text-gray-900 text-sm">{inv.client?.name ?? '—'}</Td>
                   <Td className="font-medium">{formatCurrency(inv.totalAmount, inv.currency)}</Td>
                   <Td>
                     <StatusBadge status={inv.etimsStatus ?? 'PENDING'} />
                   </Td>
                   <Td className="font-mono text-xs text-gray-500">{inv.etimsReference ?? '—'}</Td>
                   <Td className="font-mono text-xs text-gray-500">{inv.etimsReceiptNumber ?? '—'}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(inv.createdAt)}</Td>
                   <Td>
                     {(!inv.etimsStatus || inv.etimsStatus === 'PENDING') && (
                       <button
                         onClick={() => fiscalize(inv.id)}
                         disabled={fiscalizing === inv.id}
                         className="text-xs text-primary-600 hover:underline font-medium disabled:opacity-50"
                       >
                         {fiscalizing === inv.id ? 'Sending…' : 'Fiscalize →'}
                       </button>
                     )}
                   </Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── Payroll Deductions ────────────────────────────────────────────────── */}
      {tab === 'payroll' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div>
              <label className="form-label">Period</label>
              <input type="month" value={dedPeriod} onChange={(e) => setDedPeriod(e.target.value)} className="form-input h-9" />
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800 space-y-1">
            <p><strong>Kenya Statutory Deductions (as at 2024/2025):</strong></p>
            <p>• <strong>PAYE</strong>: Progressive tax on employment income (10%–30%). Remit to KRA by 9th of following month.</p>
            <p>• <strong>SHIF</strong> (formerly NHIF): 2.75% of gross salary. Remit to SHIF by 9th.</p>
            <p>• <strong>NSSF</strong>: Employee 6% + Employer 6% (capped). Remit by 15th.</p>
            <p>• <strong>Housing Levy</strong>: 1.5% employee + 1.5% employer on gross. Remit by 9th.</p>
          </div>

          {dedLoading ? (
            <div className="text-center py-8 text-sm text-gray-400">Loading deductions…</div>
          ) : !deductions ? (
            <div className="text-center py-8 text-sm text-gray-400">No payroll data for {dedPeriod}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Gross Salary',   value: deductions.grossSalary,  color: 'text-gray-900' },
                { label: 'PAYE',           value: deductions.paye,         color: 'text-red-700', desc: 'Progressive rate — remit by 9th' },
                { label: 'SHIF',           value: deductions.shif,         color: 'text-blue-700', desc: '2.75% of gross — remit by 9th' },
                { label: 'NSSF',           value: deductions.nssf,         color: 'text-purple-700', desc: '6% employee — remit by 15th' },
                { label: 'Housing Levy',   value: deductions.housingLevy,  color: 'text-amber-700', desc: '1.5% employee — remit by 9th' },
                { label: 'Net Salary',     value: deductions.netSalary,    color: 'text-green-700' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                  <p className={`text-xl font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                  {item.desc && <p className="text-[11px] text-gray-400 mt-1">{item.desc}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tax Returns ──────────────────────────────────────────────────────── */}
      {tab === 'returns' && (
        <div className="space-y-5">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Important:</strong> This module tracks the status of your firm's tax return obligations.
            Actual filing must be completed on KRA iTax (<a href="https://itax.kra.go.ke" className="underline" target="_blank" rel="noopener noreferrer">itax.kra.go.ke</a>).
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                label: 'VAT Return (VAT 3)',
                desc: 'Monthly. Due by 20th of following month.',
                frequency: 'Monthly',
                dueDay: 20, dueMonth: 'following month',
                href: 'https://itax.kra.go.ke',
                status: pendingVat > 0 ? 'OVERDUE' : 'FILED',
              },
              {
                label: 'WHT Return (WHT Certificate)',
                desc: 'Monthly. Due by 20th of following month. Covers 5% deduction on professional fees.',
                frequency: 'Monthly',
                dueDay: 20, dueMonth: 'following month',
                href: 'https://itax.kra.go.ke',
                status: 'PENDING',
              },
              {
                label: 'PAYE Return (P10)',
                desc: 'Monthly. Due by 9th of following month.',
                frequency: 'Monthly',
                dueDay: 9, dueMonth: 'following month',
                href: 'https://itax.kra.go.ke',
                status: 'PENDING',
              },
              {
                label: 'NSSF Return',
                desc: 'Monthly. Due by 15th of following month.',
                frequency: 'Monthly',
                dueDay: 15, dueMonth: 'following month',
                href: 'https://www.nssf.or.ke',
                status: 'PENDING',
              },
              {
                label: 'SHIF Contribution',
                desc: 'Monthly. Due by 9th of following month.',
                frequency: 'Monthly',
                dueDay: 9, dueMonth: 'following month',
                href: 'https://www.shif.or.ke',
                status: 'PENDING',
              },
              {
                label: 'Housing Levy Return',
                desc: 'Monthly. Due by 9th of following month.',
                frequency: 'Monthly',
                dueDay: 9, dueMonth: 'following month',
                href: 'https://itax.kra.go.ke',
                status: 'PENDING',
              },
              {
                label: 'Annual Corporation Tax (IT2C)',
                desc: 'Annual. Due 6 months after financial year end. Instalment tax due quarterly.',
                frequency: 'Annual',
                dueDay: null, dueMonth: '6 months after year-end',
                href: 'https://itax.kra.go.ke',
                status: 'PENDING',
              },
              {
                label: 'Annual Return (Registrar)',
                desc: 'Filed annually with Registrar of Companies within 42 days of AGM.',
                frequency: 'Annual',
                dueDay: null, dueMonth: '42 days after AGM',
                href: 'https://ecitizen.go.ke',
                status: 'PENDING',
              },
            ].map((ret) => (
              <div key={ret.label} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{ret.label}</h3>
                  <StatusBadge status={ret.status} />
                </div>
                <p className="text-xs text-gray-500 mb-3">{ret.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 bg-gray-100 rounded px-2 py-0.5">{ret.frequency}</span>
                  <a href={ret.href} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    File on portal <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
