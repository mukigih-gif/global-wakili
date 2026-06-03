'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow } from '@/components/ui/Table';
import { ArrowLeft, Calendar, DollarSign, Clock, FileText } from 'lucide-react';

type MatterDetail = {
  id: string; title: string; matterCode: string; status: string;
  category: string; description?: string; createdAt: string;
  client?: { id: string; name: string; email: string } | null;
  assignedLawyer?: { name: string } | null;
  tasks?: Array<{ id: string; title: string; status: string; dueDate?: string }>;
  timeEntries?: Array<{ id: string; description: string; durationHours: string; status: string; entryDate: string }>;
  invoices?: Array<{ id: string; invoiceNumber: string; total: string; status: string; dueDate?: string }>;
  hearings?: Array<{ id: string; caseNumber: string; hearingDate: string; court: string; status: string }>;
};

export function MatterDetailClient({ id }: { id: string }) {
  const [matter, setMatter] = useState<MatterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ matter: MatterDetail }>(`/matters/${id}`)
      .then((r) => setMatter(r.matter))
      .catch(() => setMatter(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  if (!matter) return <div className="text-center text-gray-500 py-16">Matter not found.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/matters" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{matter.title}</h1>
            <StatusBadge status={matter.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono">{matter.matterCode}</span>
            {matter.client && <> · {matter.client.name}</>}
            {matter.category && <> · {matter.category.replace(/_/g, ' ')}</>}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><h2 className="font-semibold">Matter Details</h2></CardHeader>
          <CardBody className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Client</span><p className="font-medium">{matter.client?.name ?? '—'}</p></div>
            <div><span className="text-gray-500">Assigned Lawyer</span><p className="font-medium">{matter.assignedLawyer?.name ?? '—'}</p></div>
            <div><span className="text-gray-500">Category</span><p className="font-medium">{matter.category?.replace(/_/g, ' ') ?? '—'}</p></div>
            <div><span className="text-gray-500">Opened</span><p className="font-medium">{formatDate(matter.createdAt)}</p></div>
          </CardBody>
        </Card>
        <div className="space-y-3">
          <Card className="p-4"><div className="flex items-center gap-2 text-sm text-gray-500"><Clock className="h-4 w-4" /> Time Entries</div><p className="text-xl font-bold mt-1">{matter.timeEntries?.length ?? 0}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign className="h-4 w-4" /> Invoices</div><p className="text-xl font-bold mt-1">{matter.invoices?.length ?? 0}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-sm text-gray-500"><Calendar className="h-4 w-4" /> Hearings</div><p className="text-xl font-bold mt-1">{matter.hearings?.length ?? 0}</p></Card>
        </div>
      </div>
      {!!matter.hearings?.length && (
        <Card>
          <CardHeader><h2 className="font-semibold">Court Hearings</h2></CardHeader>
          <Table><thead><tr><Th>Case No.</Th><Th>Court</Th><Th>Date</Th><Th>Status</Th></tr></thead>
          <tbody>{matter.hearings.map((h) => (<tr key={h.id}><Td className="font-mono text-xs">{h.caseNumber}</Td><Td>{h.court}</Td><Td>{formatDate(h.hearingDate)}</Td><Td><StatusBadge status={h.status} /></Td></tr>))}</tbody></Table>
        </Card>
      )}
    </div>
  );
}
