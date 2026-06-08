'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { ArrowLeft, Play, DollarSign, Users, RefreshCw, FileText, Download, Printer } from 'lucide-react';
import Link from 'next/link';

type Tab = 'runs' | 'payslips' | 'p9' | 'remittance';

type PayrollBatch = {
  id: string;
  month: number;
  year: number;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  generatedBy?: { name: string } | null;
  approvedBy?: { name: string } | null;
  payslips?: Payslip[];
};

type Payslip = {
  id: string;
  userId: string;
  batchId: string;
  grossPay: number;
  netPay: number;
  paye: number;
  shif: number;
  nssf: number;
  housingLevy: number;
  allowances: number;
  deductions: number;
  createdAt: string;
  user?: { id: string; name: string; accountNumber?: string; bankName?: string };
  batch?: { month: number; year: number };
};

type Employee = {
  id: string;
  name: string;
  employeeProfile?: { position?: string; basicSalary?: number; department?: { name: string } } | null;
  accountNumber?: string;
  bankName?: string;
  basicSalary?: number;
};

// Kenya PAYE progressive rates (2024/2025)
function computePAYE(gross: number): number {
  let paye = 0;
  const bands = [
    { limit: 24000,   rate: 0.10 },
    { limit: 8333,    rate: 0.25 },
    { limit: 467667,  rate: 0.30 },
    { limit: Infinity, rate: 0.325 },
  ];
  let remaining = gross;
  for (const band of bands) {
    const taxable = Math.min(remaining, band.limit);
    paye += taxable * band.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return Math.max(0, paye - 2400);
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function BatchPayrollPage() {
  const [tab, setTab] = useState<Tab>('runs');
  const [batches, setBatches]     = useState<PayrollBatch[]>([]);
  const [payslips, setPayslips]   = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [generating, setGen]      = useState(false);
  const [period, setPeriod]       = useState(new Date().toISOString().slice(0, 7));
  const [preview, setPreview]     = useState<any[]>([]);
  const [showPreview, setShowPrev] = useState(false);
  const [p9Employee, setP9Employee] = useState('');
  const [p9Year, setP9Year]       = useState(String(new Date().getFullYear()));
  const [p9Data, setP9Data]       = useState<any>(null);
  const [p9Loading, setP9Loading] = useState(false);
  const [remittanceBatch, setRemittanceBatch] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: PayrollBatch[] }>('/payroll/batches?limit=20')
        .then((r) => setBatches(r.data ?? [])).catch(() => {}),
      api.get<{ data: Payslip[] }>('/payroll/payslips?limit=100')
        .then((r) => setPayslips(r.data ?? [])).catch(() => {}),
      api.get<{ data: Employee[] }>('/hr/employees?limit=200&status=ACTIVE')
        .then((r) => setEmployees(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  // ── Preview ──────────────────────────────────────────────────────────────────
  const generatePreview = () => {
    const computed = employees.map((emp) => {
      const gross = parseFloat(String(emp.basicSalary ?? emp.employeeProfile?.basicSalary ?? 0));
      const paye        = Math.round(computePAYE(gross));
      const shif        = Math.round(gross * 0.0275);
      const nssf        = Math.min(Math.round(gross * 0.06), 2160);
      const housingLevy = Math.round(gross * 0.015);
      const net         = gross - paye - shif - nssf - housingLevy;
      return {
        ...emp,
        position: emp.employeeProfile?.position ?? '—',
        dept: emp.employeeProfile?.department?.name ?? '—',
        gross, paye, shif, nssf, housingLevy, net,
      };
    });
    setPreview(computed);
    setShowPrev(true);
  };

  // ── Run payroll ───────────────────────────────────────────────────────────────
  const runPayroll = async () => {
    setGen(true);
    try {
      const [yr, mo] = period.split('-').map(Number);
      const periodStart = new Date(yr, mo - 1, 1).toISOString();
      const periodEnd   = new Date(yr, mo, 0, 23, 59, 59).toISOString();
      await api.post('/payroll/batches', { month: mo, year: yr, periodStart, periodEnd });
      setShowPrev(false);
      loadAll();
    } catch (err: unknown) {
      console.error('Payroll run failed:', err);
    } finally { setGen(false); }
  };

  // ── P9 ───────────────────────────────────────────────────────────────────────
  const generateP9 = async () => {
    if (!p9Employee) return;
    setP9Loading(true);
    try {
      const data = await api.get<any>(`/payroll/reports/p9/${p9Employee}?year=${p9Year}`);
      setP9Data(data);
    } catch { setP9Data(null); }
    finally { setP9Loading(false); }
  };

  const printP9 = () => {
    if (!p9Data) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const emp = employees.find((e) => e.id === p9Employee);
    win.document.write(`
      <html><head><title>P9 Certificate ${p9Year}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
      h2{text-align:center}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #000;padding:4px 8px;text-align:right}
      th{background:#f0f0f0;text-align:center}.left{text-align:left}
      .total{font-weight:bold;background:#fffde7}</style></head>
      <body>
      <h2>P9 TAX DEDUCTION CARD — ${p9Year}</h2>
      <p><strong>Employee:</strong> ${emp?.name ?? '—'} &nbsp;&nbsp;
         <strong>KRA PIN:</strong> ${p9Data.employeePin ?? '—'} &nbsp;&nbsp;
         <strong>Employee No:</strong> ${p9Data.employeeId ?? '—'}</p>
      <table>
        <tr><th class="left">Month</th><th>Gross Pay</th><th>Benefits</th><th>Chargeable Pay</th><th>PAYE</th><th>Relief</th><th>Net PAYE</th></tr>
        ${(p9Data.months ?? []).map((m: any) => `
          <tr>
            <td class="left">${MONTH_NAMES[m.month - 1] ?? m.month}</td>
            <td>${parseFloat(m.grossPay ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
            <td>${parseFloat(m.benefits ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
            <td>${parseFloat(m.chargeablePay ?? m.grossPay ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
            <td>${parseFloat(m.paye ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
            <td>${parseFloat(m.relief ?? 2400).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
            <td>${parseFloat(m.netPaye ?? m.paye ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
          </tr>`).join('')}
        <tr class="total">
          <td class="left">TOTAL</td>
          <td>${parseFloat(p9Data.totalGross ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
          <td>—</td>
          <td>${parseFloat(p9Data.totalChargeable ?? p9Data.totalGross ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
          <td>${parseFloat(p9Data.totalPaye ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
          <td>—</td>
          <td>${parseFloat(p9Data.totalNetPaye ?? p9Data.totalPaye ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
      <p style="margin-top:20px;font-size:10px">Generated by Global Wakili Legal Enterprise &mdash; ${new Date().toLocaleDateString()}</p>
      </body></html>`);
    win.document.close();
    win.print();
  };

  // ── Bank remittance CSV ───────────────────────────────────────────────────────
  const exportRemittance = () => {
    const batch = batches.find((b) => b.id === remittanceBatch);
    const batchPayslips = payslips.filter((p) => p.batchId === remittanceBatch);
    if (!batch || !batchPayslips.length) return;
    const header = 'Employee Name,Bank,Account Number,Net Pay (KES)\n';
    const rows = batchPayslips.map((p) =>
      `"${p.user?.name ?? ''}","${p.user?.bankName ?? ''}","${p.user?.accountNumber ?? ''}",${parseFloat(String(p.netPay)).toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `remittance-${MONTH_NAMES[batch.month - 1]}-${batch.year}.csv`;
    a.click();
  };

  const totalGross = preview.reduce((s, e) => s + e.gross, 0);
  const totalNet   = preview.reduce((s, e) => s + e.net, 0);
  const totalPaye  = preview.reduce((s, e) => s + e.paye, 0);
  const selectedBatchPayslips = payslips.filter((p) => p.batchId === remittanceBatch);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'runs',       label: 'Payroll Runs' },
    { key: 'payslips',   label: `Payslips (${payslips.length})` },
    { key: 'p9',         label: 'P9 Certificates' },
    { key: 'remittance', label: 'Bank Remittance' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/hr" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 icon-hr" /> Payroll
          </h1>
          <p className="text-sm text-gray-500">Batch payroll, payslips, P9 certificates and bank remittance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Payroll Runs tab ── */}
      {tab === 'runs' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Generate Payroll Run</h2>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="form-label">Payroll Period</label>
                <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} max={new Date().toISOString().slice(0,7)} className="form-input" />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={generatePreview} disabled={loading || employees.length === 0}>
                  Preview {employees.length} Employees
                </Button>
                {showPreview && (
                  <Button loading={generating} onClick={runPayroll}>
                    <Play className="h-4 w-4" /> Run Payroll
                  </Button>
                )}
              </div>
            </div>
            {employees.length === 0 && !loading && (
              <p className="text-xs text-amber-600 mt-2">No active employees. <Link href="/app/hr" className="underline">Add employees</Link> first.</p>
            )}
          </div>

          {showPreview && preview.length > 0 && (
            <div className="card">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Payroll Preview — {period}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{preview.length} employees · PAYE, SHIF 2.75%, NSSF, Housing Levy 1.5%</p>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100">
                <div className="text-center"><p className="text-xs text-gray-500">Total Gross</p><p className="text-xl font-bold text-gray-900">{formatCurrency(totalGross)}</p></div>
                <div className="text-center"><p className="text-xs text-gray-500">Total PAYE to KRA</p><p className="text-xl font-bold text-red-700">{formatCurrency(totalPaye)}</p></div>
                <div className="text-center"><p className="text-xs text-green-700">Total Net Pay</p><p className="text-xl font-bold text-green-700">{formatCurrency(totalNet)}</p></div>
              </div>
              <Table>
                <thead><tr><Th>Employee</Th><Th>Dept</Th><Th>Gross</Th><Th>PAYE</Th><Th>SHIF</Th><Th>NSSF</Th><Th>Housing</Th><Th>Net Pay</Th></tr></thead>
                <tbody>
                  {preview.map((emp) => (
                    <tr key={emp.id}>
                      <Td className="font-medium text-gray-900">{emp.name}</Td>
                      <Td className="text-xs text-gray-500">{emp.dept}</Td>
                      <Td className="font-medium">{formatCurrency(emp.gross)}</Td>
                      <Td className="text-red-700">{formatCurrency(emp.paye)}</Td>
                      <Td className="text-red-600">{formatCurrency(emp.shif)}</Td>
                      <Td className="text-red-600">{formatCurrency(emp.nssf)}</Td>
                      <Td className="text-red-600">{formatCurrency(emp.housingLevy)}</Td>
                      <Td className="font-bold text-green-700">{formatCurrency(emp.net)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          <div className="card">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="h-4 w-4 icon-hr" /> Payroll History</h2>
              <button onClick={loadAll} disabled={loading} className="text-xs text-primary-600 hover:underline flex items-center gap-1 disabled:opacity-50">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <Table>
              <thead><tr><Th>Period</Th><Th>Status</Th><Th>Generated By</Th><Th>Approved By</Th><Th>Created</Th><Th>Approved</Th></tr></thead>
              <tbody>
                {loading ? <LoadingRow colSpan={6} /> :
                 !batches.length ? <EmptyRow colSpan={6} message="No payroll runs yet — generate your first payroll above" /> :
                 batches.map((b) => (
                   <tr key={b.id}>
                     <Td className="font-mono text-sm font-medium">{MONTH_NAMES[b.month - 1]} {b.year}</Td>
                     <Td><StatusBadge status={b.status} /></Td>
                     <Td className="text-xs text-gray-600">{b.generatedBy?.name ?? '—'}</Td>
                     <Td className="text-xs text-gray-600">{b.approvedBy?.name ?? '—'}</Td>
                     <Td className="text-xs text-gray-500">{formatDate(b.createdAt)}</Td>
                     <Td className="text-xs text-gray-500">{b.approvedAt ? formatDate(b.approvedAt) : '—'}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Payslips tab ── */}
      {tab === 'payslips' && (
        <div className="card">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All Payslips</h2>
            <p className="text-xs text-gray-500 mt-0.5">Published payslips across all payroll batches</p>
          </div>
          <Table>
            <thead><tr><Th>Employee</Th><Th>Period</Th><Th>Gross Pay</Th><Th>PAYE</Th><Th>SHIF</Th><Th>NSSF</Th><Th>Net Pay</Th><Th>Date</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={8} /> :
               !payslips.length ? <EmptyRow colSpan={8} message="No payslips found. Run a payroll batch first." /> :
               payslips.map((p) => (
                 <tr key={p.id}>
                   <Td className="font-medium text-gray-900">{p.user?.name ?? '—'}</Td>
                   <Td className="text-xs text-gray-500 font-mono">{p.batch ? `${MONTH_NAMES[(p.batch.month ?? 1) - 1]} ${p.batch.year}` : '—'}</Td>
                   <Td className="font-medium">{formatCurrency(parseFloat(String(p.grossPay)))}</Td>
                   <Td className="text-red-700">{formatCurrency(parseFloat(String(p.paye)))}</Td>
                   <Td className="text-red-600">{formatCurrency(parseFloat(String(p.shif)))}</Td>
                   <Td className="text-red-600">{formatCurrency(parseFloat(String(p.nssf)))}</Td>
                   <Td className="font-bold text-green-700">{formatCurrency(parseFloat(String(p.netPay)))}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(p.createdAt)}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── P9 Certificates tab ── */}
      {tab === 'p9' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-primary-600" /> Generate P9 Annual Tax Certificate</h2>
            <p className="text-xs text-gray-500 mb-4">P9 is the annual PAYE deduction card required for KRA individual income tax returns.</p>
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className="form-label">Employee *</label>
                <select value={p9Employee} onChange={(e) => { setP9Employee(e.target.value); setP9Data(null); }} className="form-select w-full">
                  <option value="">Select employee…</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Tax Year *</label>
                <select value={p9Year} onChange={(e) => { setP9Year(e.target.value); setP9Data(null); }} className="form-select w-full">
                  {[0, 1, 2].map((i) => {
                    const yr = String(new Date().getFullYear() - i);
                    return <option key={yr} value={yr}>{yr}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button disabled={!p9Employee} loading={p9Loading} onClick={generateP9}>
                <FileText className="h-4 w-4" /> Generate P9
              </Button>
              {p9Data && (
                <Button variant="secondary" onClick={printP9}>
                  <Printer className="h-4 w-4" /> Print / Download
                </Button>
              )}
            </div>
          </div>

          {p9Data && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">P9 — {employees.find((e) => e.id === p9Employee)?.name} — {p9Year}</h3>
                  <p className="text-xs text-gray-500">KRA PIN: {p9Data.employeePin ?? '—'}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={printP9}><Printer className="h-3.5 w-3.5" /> Print</Button>
              </div>
              <Table>
                <thead>
                  <tr><Th>Month</Th><Th>Gross Pay</Th><Th>Benefits</Th><Th>Chargeable Pay</Th><Th>PAYE</Th><Th>Relief</Th><Th>Net PAYE</Th></tr>
                </thead>
                <tbody>
                  {(p9Data.months ?? []).map((m: any) => (
                    <tr key={m.month}>
                      <Td className="font-medium">{MONTH_NAMES[m.month - 1]}</Td>
                      <Td>{formatCurrency(parseFloat(m.grossPay ?? 0))}</Td>
                      <Td>{formatCurrency(parseFloat(m.benefits ?? 0))}</Td>
                      <Td>{formatCurrency(parseFloat(m.chargeablePay ?? m.grossPay ?? 0))}</Td>
                      <Td className="text-red-700">{formatCurrency(parseFloat(m.paye ?? 0))}</Td>
                      <Td className="text-green-700">{formatCurrency(parseFloat(m.relief ?? 2400))}</Td>
                      <Td className="font-medium text-red-700">{formatCurrency(parseFloat(m.netPaye ?? m.paye ?? 0))}</Td>
                    </tr>
                  ))}
                  <tr className="bg-amber-50 font-bold">
                    <Td>TOTAL</Td>
                    <Td>{formatCurrency(parseFloat(p9Data.totalGross ?? 0))}</Td>
                    <Td>—</Td>
                    <Td>{formatCurrency(parseFloat(p9Data.totalChargeable ?? p9Data.totalGross ?? 0))}</Td>
                    <Td className="text-red-700">{formatCurrency(parseFloat(p9Data.totalPaye ?? 0))}</Td>
                    <Td>—</Td>
                    <Td className="text-red-700">{formatCurrency(parseFloat(p9Data.totalNetPaye ?? p9Data.totalPaye ?? 0))}</Td>
                  </tr>
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── Bank Remittance tab ── */}
      {tab === 'remittance' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Download className="h-4 w-4 text-primary-600" /> Bank Remittance Export</h2>
            <p className="text-xs text-gray-500 mb-4">Select a payroll batch to export the net pay schedule for your bank. The CSV lists each employee's bank account and net pay for direct credit processing.</p>
            <div className="flex items-end gap-3">
              <div>
                <label className="form-label">Select Payroll Batch</label>
                <select value={remittanceBatch} onChange={(e) => setRemittanceBatch(e.target.value)} className="form-select w-60">
                  <option value="">Select batch…</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{MONTH_NAMES[b.month - 1]} {b.year} — {b.status}</option>
                  ))}
                </select>
              </div>
              <Button disabled={!remittanceBatch || !selectedBatchPayslips.length} onClick={exportRemittance}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            {remittanceBatch && !selectedBatchPayslips.length && (
              <p className="text-xs text-amber-600 mt-2">No payslips found for this batch. Generate and publish payslips first.</p>
            )}
          </div>

          {remittanceBatch && selectedBatchPayslips.length > 0 && (
            <div className="card">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Remittance Schedule — {MONTH_NAMES[(batches.find(b=>b.id===remittanceBatch)?.month??1)-1]} {batches.find(b=>b.id===remittanceBatch)?.year}</h3>
                <div>
                  <span className="text-xs text-gray-500 mr-3">{selectedBatchPayslips.length} employees</span>
                  <span className="text-sm font-bold text-green-700">Total: {formatCurrency(selectedBatchPayslips.reduce((s, p) => s + parseFloat(String(p.netPay)), 0))}</span>
                </div>
              </div>
              <Table>
                <thead><tr><Th>Employee</Th><Th>Bank</Th><Th>Account No.</Th><Th>Net Pay (KES)</Th></tr></thead>
                <tbody>
                  {selectedBatchPayslips.map((p) => (
                    <tr key={p.id}>
                      <Td className="font-medium text-gray-900">{p.user?.name ?? '—'}</Td>
                      <Td className="text-xs text-gray-600">{p.user?.bankName ?? '—'}</Td>
                      <Td className="font-mono text-xs text-gray-600">{p.user?.accountNumber ?? '—'}</Td>
                      <Td className="font-bold text-green-700">{formatCurrency(parseFloat(String(p.netPay)))}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
