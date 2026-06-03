'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';

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

      {/* Sub-navigation */}
      <div className="flex gap-4 border-b border-gray-200 text-sm">
        {['Employees', 'Payroll', 'Leave', 'Performance', 'Payslips'].map((tab) => (
          <button key={tab} className="pb-2 text-gray-500 hover:text-gray-800 border-b-2 border-transparent hover:border-gray-400 transition-colors">
            {tab}
          </button>
        ))}
      </div>

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
