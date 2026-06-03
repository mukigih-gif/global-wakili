'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Briefcase, FileText, DollarSign, Shield } from 'lucide-react';

type ClientMatter = {
  id: string;
  title: string;
  matterCode: string;
  status: string;
  category: string;
  updatedAt: string;
};

type ClientInvoice = {
  id: string;
  invoiceNumber: string;
  total: string;
  balanceDue: string;
  status: string;
  dueDate?: string;
};

export default function ClientPortalPage() {
  const [matters, setMatters] = useState<ClientMatter[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ data: ClientMatter[] }>('/client/matters').catch(() => ({ data: [] })),
      api.get<{ data: ClientInvoice[] }>('/client/invoices').catch(() => ({ data: [] })),
    ]).then(([m, inv]) => {
      setMatters(m.data ?? []);
      setInvoices(inv.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const outstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balanceDue || '0'), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Legal Matters</h1>
        <p className="text-sm text-gray-500 mt-0.5">Secure client portal — your matters and documents</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Active Matters', value: matters.filter((m) => m.status === 'ACTIVE').length, icon: <Briefcase className="h-4 w-4" /> },
          { label: 'Documents', value: '—', icon: <FileText className="h-4 w-4" /> },
          { label: 'Outstanding', value: formatCurrency(outstanding), icon: <DollarSign className="h-4 w-4" /> },
          { label: 'Trust Balance', value: '—', icon: <Shield className="h-4 w-4" /> },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">{s.icon} {s.label}</div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Matters */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">My Matters</h2></CardHeader>
          <Table>
            <thead><tr><Th>Matter</Th><Th>Type</Th><Th>Status</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={3} /> :
               !matters.length ? <EmptyRow colSpan={3} message="No active matters" /> :
               matters.map((m) => (
                 <tr key={m.id}>
                   <Td>
                     <a href={`/portal/matters/${m.id}`} className="font-medium text-primary-700 hover:underline">{m.title}</a>
                     <p className="text-xs text-gray-500 font-mono">{m.matterCode}</p>
                   </Td>
                   <Td className="text-xs text-gray-600">{m.category.replace(/_/g, ' ')}</Td>
                   <Td><StatusBadge status={m.status} /></Td>
                 </tr>
               ))
              }
            </tbody>
          </Table>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Invoices</h2></CardHeader>
          <Table>
            <thead><tr><Th>Invoice</Th><Th>Amount</Th><Th>Due</Th><Th>Status</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={4} /> :
               !invoices.length ? <EmptyRow colSpan={4} message="No invoices" /> :
               invoices.map((inv) => (
                 <tr key={inv.id}>
                   <Td className="font-mono text-xs">{inv.invoiceNumber}</Td>
                   <Td className="font-medium">{formatCurrency(inv.total)}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(inv.dueDate)}</Td>
                   <Td><StatusBadge status={inv.status} /></Td>
                 </tr>
               ))
              }
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
