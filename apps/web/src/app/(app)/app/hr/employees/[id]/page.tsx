'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft, User, DollarSign, Calendar, FileText,
  Briefcase, Phone, Mail, CreditCard, Clock, TrendingUp, Star,
} from 'lucide-react';

type EmployeeDetail = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  basicSalary?: number | string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  createdAt: string;
  employeeProfile?: {
    employeeNumber?: string;
    employmentType?: string;
    employmentStatus?: string;
    hireDate?: string;
    terminationDate?: string | null;
    workLocation?: string | null;
    department?: { name: string } | null;
    jobTitle?: { title: string } | null;
    position?: string | null;
  } | null;
};

type Payslip = {
  id: string;
  grossPay: number;
  netPay: number;
  paye: number;
  shif: number;
  nssf: number;
  housingLevy: number;
  createdAt: string;
  batch?: { month: number; year: number; status: string } | null;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Tab = 'profile' | 'payslips' | 'performance' | 'leave' | 'attendance';

type PerfReview = {
  id: string; cycleName: string; status: string;
  periodStart: string; periodEnd: string;
  finalScore?: number | null; finalRating?: string | null;
  selfScore?: number | null; managerScore?: number | null;
};

export default function EmployeeDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [emp, setEmp]         = useState<EmployeeDetail | null>(null);
  const [payslips, setPayslips]   = useState<Payslip[]>([]);
  const [leave, setLeave]         = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [performance, setPerformance] = useState<PerfReview[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<Tab>('profile');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<any>(`/hr/employees/${id}`).then((r) => setEmp(r?.id ? r : r?.data ?? r)).catch(() => {}),
      api.get<{ data: Payslip[] }>(`/payroll/payslips?userId=${id}&limit=24`).then((r) => setPayslips(r.data ?? [])).catch(() => {}),
      api.get<{ data: any[] }>(`/hr/leave?employeeId=${id}&limit=20`).then((r) => setLeave(r.data ?? [])).catch(() => {}),
      api.get<{ data: any[] }>(`/hr/attendance?employeeId=${id}&limit=30`).then((r) => setAttendance(r.data ?? [])).catch(() => {}),
      api.get<{ data: PerfReview[] }>(`/hr/performance?employeeId=${id}&take=20`).then((r) => setPerformance(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'profile',     label: 'Profile' },
    { key: 'payslips',    label: `Payslips (${payslips.length})` },
    { key: 'performance', label: `Performance (${performance.length})` },
    { key: 'leave',       label: `Leave (${leave.length})` },
    { key: 'attendance',  label: 'Attendance' },
  ];

  const dept  = emp?.employeeProfile?.department?.name ?? emp?.department ?? '—';
  const title = emp?.employeeProfile?.jobTitle?.title ?? emp?.jobTitle ?? emp?.employeeProfile?.position ?? '—';
  const empNo = emp?.employeeProfile?.employeeNumber ?? '—';
  const hireDate = emp?.employeeProfile?.hireDate;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="text-center py-16 text-gray-400">
        Employee not found. <Link href="/app/hr" className="text-primary-600 underline">Back to HR</Link>
      </div>
    );
  }

  const grossSalary = parseFloat(String(emp.basicSalary ?? 0));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/hr" className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                {emp.name.slice(0,2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{emp.name}</h1>
                <p className="text-sm text-gray-500">{title} · {dept} · <span className="font-mono text-xs">{empNo}</span></p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={emp.status} />
          <Link href={`/app/hr/payroll/batch`}>
            <Button size="sm" variant="secondary"><DollarSign className="h-3.5 w-3.5" /> Payroll</Button>
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Basic Salary</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(grossSalary)}</p>
          <p className="text-xs text-gray-400">per month</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Payslips</p>
          <p className="text-xl font-bold text-gray-900">{payslips.length}</p>
          <p className="text-xs text-gray-400">on record</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Hire Date</p>
          <p className="text-lg font-bold text-gray-900">{hireDate ? formatDate(hireDate) : '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Attendance</p>
          <p className="text-xl font-bold text-gray-900">{attendance.length}</p>
          <p className="text-xs text-gray-400">records</p>
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

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['Email',       emp.email,                    <Mail className="h-3.5 w-3.5" />],
                ['Phone',       emp.phone,                    <Phone className="h-3.5 w-3.5" />],
                ['Department',  dept,                          <Briefcase className="h-3.5 w-3.5" />],
                ['Job Title',   title,                         <User className="h-3.5 w-3.5" />],
                ['Employee No', empNo,                         <FileText className="h-3.5 w-3.5" />],
                ['Work Location', emp.employeeProfile?.workLocation, null],
                ['Employment Type', emp.employeeProfile?.employmentType?.replace(/_/g,' '), null],
              ].filter(([, v]) => v && v !== '—').map(([label, value, icon]) => (
                <div key={String(label)} className="flex items-start gap-2">
                  {icon && <span className="text-gray-400 mt-0.5">{icon as React.ReactNode}</span>}
                  <dt className="text-gray-500 w-28 flex-shrink-0">{String(label)}</dt>
                  <dd className="text-gray-900 font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Payroll &amp; Bank Details</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['Basic Salary',   formatCurrency(grossSalary)],
                ['Bank Name',      emp.bankName],
                ['Account Number', emp.accountNumber],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={String(label)} className="flex items-start gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                  <dt className="text-gray-500 w-32 flex-shrink-0">{String(label)}</dt>
                  <dd className="text-gray-900 font-medium font-mono text-xs">{String(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="pt-3 border-t border-gray-100">
              <Link href="/app/hr/payroll/batch?tab=p9">
                <Button size="sm" variant="secondary"><FileText className="h-3.5 w-3.5" /> Generate P9</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payslips tab */}
      {tab === 'payslips' && (
        <div className="card">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Payslip History</h2>
          </div>
          <Table>
            <thead><tr><Th>Period</Th><Th>Gross Pay</Th><Th>PAYE</Th><Th>SHIF</Th><Th>NSSF</Th><Th>Housing</Th><Th>Net Pay</Th></tr></thead>
            <tbody>
              {!payslips.length ? <EmptyRow colSpan={7} message="No payslips found for this employee" /> :
               payslips.map((p) => (
                 <tr key={p.id}>
                   <Td className="font-mono text-sm">{p.batch ? `${MONTHS[(p.batch.month??1)-1]} ${p.batch.year}` : formatDate(p.createdAt)}</Td>
                   <Td className="font-medium">{formatCurrency(parseFloat(String(p.grossPay)))}</Td>
                   <Td className="text-red-700">{formatCurrency(parseFloat(String(p.paye)))}</Td>
                   <Td className="text-red-600">{formatCurrency(parseFloat(String(p.shif)))}</Td>
                   <Td className="text-red-600">{formatCurrency(parseFloat(String(p.nssf)))}</Td>
                   <Td className="text-red-600">{formatCurrency(parseFloat(String(p.housingLevy)))}</Td>
                   <Td className="font-bold text-green-700">{formatCurrency(parseFloat(String(p.netPay)))}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Performance tab */}
      {tab === 'performance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{performance.length} review cycle{performance.length !== 1 ? 's' : ''}</p>
            <Link href="/app/hr/performance">
              <Button size="sm" variant="secondary"><TrendingUp className="h-3.5 w-3.5" /> Manage Reviews</Button>
            </Link>
          </div>
          {!performance.length ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              No performance reviews for this employee yet.
            </div>
          ) : (
            <div className="space-y-3">
              {performance.map((r) => {
                const score = r.finalScore ?? r.managerScore ?? r.selfScore;
                const scoreNum = score ? parseFloat(String(score)) : null;
                const scoreColor = !scoreNum ? 'text-gray-400' : scoreNum >= 85 ? 'text-green-700' : scoreNum >= 65 ? 'text-blue-700' : scoreNum >= 50 ? 'text-amber-700' : 'text-red-700';
                return (
                  <div key={r.id} className="card p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Star className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900">{r.cycleName}</p>
                        <p className="text-xs text-gray-500">{formatDate(r.periodStart)} — {formatDate(r.periodEnd)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {scoreNum !== null && (
                        <p className={`text-lg font-bold ${scoreColor}`}>{scoreNum.toFixed(1)}</p>
                      )}
                      {r.finalRating && (
                        <span className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">{r.finalRating.replace(/_/g,' ')}</span>
                      )}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Leave tab */}
      {tab === 'leave' && (
        <div className="card">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Leave History</h2>
          </div>
          <Table>
            <thead><tr><Th>Type</Th><Th>Start</Th><Th>End</Th><Th>Days</Th><Th>Status</Th><Th>Reason</Th></tr></thead>
            <tbody>
              {!leave.length ? <EmptyRow colSpan={6} message="No leave records for this employee" /> :
               leave.map((l) => (
                 <tr key={l.id}>
                   <Td className="font-medium text-gray-900">{l.leaveType?.replace(/_/g,' ') ?? l.type ?? '—'}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(l.startDate)}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(l.endDate)}</Td>
                   <Td className="text-gray-700">{l.daysRequested ?? l.days ?? '—'}</Td>
                   <Td><StatusBadge status={l.status ?? 'PENDING'} /></Td>
                   <Td className="text-xs text-gray-500 max-w-xs truncate">{l.reason ?? '—'}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Attendance tab */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Attendance Records</h2>
          </div>
          <Table>
            <thead><tr><Th>Date</Th><Th>Clock In</Th><Th>Clock Out</Th><Th>Hours</Th><Th>Status</Th><Th>Notes</Th></tr></thead>
            <tbody>
              {!attendance.length ? <EmptyRow colSpan={6} message="No attendance records for this employee" /> :
               attendance.map((a) => (
                 <tr key={a.id}>
                   <Td className="text-sm font-medium">{formatDate(a.attendanceDate ?? a.date ?? a.clockIn)}</Td>
                   <Td className="text-xs text-gray-600 font-mono">{a.clockIn ? new Date(a.clockIn).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '—'}</Td>
                   <Td className="text-xs text-gray-600 font-mono">{a.clockOut ? new Date(a.clockOut).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}) : '—'}</Td>
                   <Td className="text-gray-700">{a.hoursWorked ? `${parseFloat(a.hoursWorked).toFixed(1)}h` : '—'}</Td>
                   <Td><StatusBadge status={a.status ?? 'PRESENT'} /></Td>
                   <Td className="text-xs text-gray-500">{a.notes ?? '—'}</Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
