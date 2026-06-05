'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { ArrowLeft, Play, CheckCircle, DollarSign, Users, RefreshCw } from 'lucide-react';
import Link from 'next/link';

type PayrollRun = {
  id: string;
  period: string;
  status: string;
  employeeCount: number;
  totalGross: number;
  totalPaye: number;
  totalShif: number;
  totalNssf: number;
  totalHousingLevy: number;
  totalNet: number;
  currency: string;
  generatedAt?: string;
  approvedAt?: string;
  approvedBy?: { name: string } | null;
};

type Employee = {
  id: string;
  name: string;
  position: string;
  grossSalary: number;
  currency: string;
};

// Kenya PAYE progressive rates (2024/2025)
function computePAYE(gross: number): number {
  let paye = 0;
  const bands = [
    { limit: 24000,  rate: 0.10 },
    { limit: 8333,   rate: 0.25 },
    { limit: 467667, rate: 0.30 },
    { limit: Infinity, rate: 0.325 },
  ];
  let remaining = gross;
  for (const band of bands) {
    const taxable = Math.min(remaining, band.limit);
    paye += taxable * band.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return Math.max(0, paye - 2400); // personal relief
}

export default function BatchPayrollPage() {
  const [runs, setRuns]         = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(false);
  const [period, setPeriod]     = useState(new Date().toISOString().slice(0, 7));
  const [preview, setPreview]   = useState<any[]>([]);
  const [showPreview, setShowPrev] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ data: PayrollRun[] }>('/hr/payroll?limit=20').then((r) => setRuns(r.data ?? [])).catch(() => {}),
      api.get<{ data: Employee[] }>('/hr/employees?limit=200&status=ACTIVE').then((r) => setEmployees(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const generatePreview = () => {
    const [yr, mo] = period.split('-').map(Number);
    const computed = employees.map((emp) => {
      const gross        = emp.grossSalary || 0;
      const paye         = Math.round(computePAYE(gross));
      const shif         = Math.round(gross * 0.0275);
      const nssf         = Math.min(Math.round(gross * 0.06), 2160); // NSSF capped
      const housingLevy  = Math.round(gross * 0.015);
      const totalDeductions = paye + shif + nssf + housingLevy;
      const net          = gross - totalDeductions;
      return { ...emp, gross, paye, shif, nssf, housingLevy, totalDeductions, net };
    });
    setPreview(computed);
    setShowPrev(true);
  };

  const runPayroll = async () => {
    setGen(true);
    try {
      const [yr, mo] = period.split('-');
      await api.post('/hr/payroll/generate', { period, year: parseInt(yr), month: parseInt(mo) });
      setShowPrev(false);
      load();
    } catch (err: unknown) {
      console.error('Payroll run failed:', err);
    } finally { setGen(false); }
  };

  const totalGross = preview.reduce((s, e) => s + e.gross, 0);
  const totalNet   = preview.reduce((s, e) => s + e.net, 0);
  const totalPaye  = preview.reduce((s, e) => s + e.paye, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/hr" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 icon-hr" /> Batch Payroll
          </h1>
          <p className="text-sm text-gray-500">Generate, preview, approve and disburse payroll for all active employees</p>
        </div>
      </div>

      {/* Generate new run */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Generate Payroll Run</h2>
        <div className="flex items-end gap-3">
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
          <p className="text-xs text-amber-600 mt-2">No active employees found. <Link href="/app/hr" className="underline">Add employees</Link> first.</p>
        )}
      </div>

      {/* Payroll preview */}
      {showPreview && preview.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Payroll Preview — {period}</h2>
            <p className="text-xs text-gray-400">{preview.length} employees · Kenya statutory deductions applied (PAYE, SHIF 2.75%, NSSF, Housing Levy 1.5%)</p>
          </div>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Gross</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalGross)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Total PAYE to KRA</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(totalPaye)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-700">Total Net Pay</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(totalNet)}</p>
            </div>
          </div>
          <Table>
            <thead><tr><Th>Employee</Th><Th>Position</Th><Th>Gross</Th><Th>PAYE</Th><Th>SHIF</Th><Th>NSSF</Th><Th>Housing Levy</Th><Th>Net Pay</Th></tr></thead>
            <tbody>
              {preview.map((emp) => (
                <tr key={emp.id}>
                  <Td className="font-medium text-gray-900">{emp.name}</Td>
                  <Td className="text-xs text-gray-500">{emp.position}</Td>
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

      {/* Payroll run history */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="h-4 w-4 icon-hr" /> Payroll History</h2>
          <button onClick={load} disabled={loading} className="text-xs text-primary-600 hover:underline flex items-center gap-1 disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <Table>
          <thead><tr><Th>Period</Th><Th>Employees</Th><Th>Gross</Th><Th>Net Pay</Th><Th>Status</Th><Th>Generated</Th><Th>Approved By</Th></tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
             !runs.length ? (
               <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No payroll runs yet — generate your first payroll above</td></tr>
             ) : runs.map((r) => (
               <tr key={r.id}>
                 <Td className="font-mono text-sm font-medium">{r.period}</Td>
                 <Td className="text-gray-600">{r.employeeCount}</Td>
                 <Td className="font-medium">{formatCurrency(r.totalGross, r.currency)}</Td>
                 <Td className="font-bold text-green-700">{formatCurrency(r.totalNet, r.currency)}</Td>
                 <Td><StatusBadge status={r.status} /></Td>
                 <Td className="text-xs text-gray-500">{r.generatedAt ? formatDate(r.generatedAt) : '—'}</Td>
                 <Td className="text-xs text-gray-600">{r.approvedBy?.name ?? '—'}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
