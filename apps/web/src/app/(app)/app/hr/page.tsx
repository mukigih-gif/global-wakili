'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Users, DollarSign, Calendar, TrendingUp, UserCheck, Receipt } from 'lucide-react';
import Link from 'next/link';

type Employee = {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  department?: string;
  status: string;
  startDate?: string;
};

export default function HRPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Employee[] }>('/hr/employees?limit=30')
      .then((r) => setEmployees(r.data ?? []))
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, []);

  const active = employees.filter((e) => e.status === 'ACTIVE').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR & Payroll</h1>
        <p className="text-sm text-gray-500">Employee management, payroll, and compliance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Employees" value={employees.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active" value={active} icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
        <StatCard label="On Leave" value={employees.filter((e) => e.status === 'ON_LEAVE').length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Payroll Pending" value="—" icon={<DollarSign className="h-5 w-5" />} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link href="/app/hr/onboarding" className="card p-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:shadow-sm transition-all">
          <UserCheck className="h-4 w-4 icon-hr" /> Employee Onboarding
        </Link>
        <Link href="/app/hr/payroll/batch" className="card p-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:shadow-sm transition-all">
          <Receipt className="h-4 w-4 icon-finance" /> Batch Payroll
        </Link>
        <Link href="/app/approvals" className="card p-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:shadow-sm transition-all">
          <Calendar className="h-4 w-4 icon-tasks" /> Leave Approvals
        </Link>
        <Link href="/app/dashboard/cfo" className="card p-3 flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:shadow-sm transition-all">
          <DollarSign className="h-4 w-4 icon-finance" /> CFO Dashboard
        </Link>
      </div>

      {/* Employee list */}

      <Table>
        <thead>
          <tr><Th>Employee</Th><Th>Email</Th><Th>Job Title</Th><Th>Department</Th><Th>Status</Th><Th>Start Date</Th></tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> :
           !employees.length ? <EmptyRow colSpan={6} message="No employees found" /> :
           employees.map((e) => (
             <tr key={e.id}>
               <Td className="font-medium">{e.name}</Td>
               <Td className="text-gray-500 text-sm">{e.email}</Td>
               <Td className="text-gray-600">{e.jobTitle ?? '—'}</Td>
               <Td className="text-gray-600">{e.department ?? '—'}</Td>
               <Td><StatusBadge status={e.status} /></Td>
               <Td className="text-gray-500 text-xs">{formatDate(e.startDate)}</Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
