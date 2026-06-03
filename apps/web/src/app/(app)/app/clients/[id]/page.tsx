'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ArrowLeft, Users, Briefcase, FileText, CheckSquare, DollarSign, AlertCircle } from 'lucide-react';

type Client = {
  id: string; name: string; clientCode: string; clientType: string;
  email?: string | null; phone?: string | null; idNumber?: string | null;
  kraPin?: string | null; address?: string | null; city?: string | null;
  country?: string | null; status: string; riskLevel?: string | null;
  kycStatus?: string | null; createdAt: string;
};
type Matter  = { id: string; title: string; matterCode: string; status: string; createdAt: string };
type Invoice = { id: string; invoiceNumber: string; totalAmount: number; currency: string; status: string; dueDate?: string };
type Task    = { id: string; title: string; status: string; priority: string; dueDate?: string };

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient]   = useState<Client | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'matters' | 'invoices' | 'tasks'>('matters');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<Client>(`/clients/${id}`).then(setClient).catch(() => null),
      api.get<{ data: Matter[] }>(`/matters?clientId=${id}&limit=20`).then((r) => setMatters(r.data ?? [])).catch(() => {}),
      api.get<{ data: Invoice[] }>(`/billing/invoices?clientId=${id}&limit=20`).then((r) => setInvoices(r.data ?? [])).catch(() => {}),
      api.get<{ data: Task[] }>(`/tasks?clientId=${id}&limit=20`).then((r) => setTasks(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  if (!client) return <div className="text-center py-12 text-gray-400">Client not found.</div>;

  const unpaid = invoices.filter((i) => ['ISSUED','OVERDUE','PARTIALLY_PAID'].includes(i.status)).reduce((s, i) => s + i.totalAmount, 0);

  const TABS = [
    { key: 'matters',  label: `Matters (${matters.length})`,   icon: <Briefcase className="h-4 w-4" /> },
    { key: 'invoices', label: `Invoices (${invoices.length})`, icon: <DollarSign className="h-4 w-4" /> },
    { key: 'tasks',    label: `Tasks (${tasks.length})`,       icon: <CheckSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/app/clients" className="text-gray-400 hover:text-gray-600 mt-1"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{client.clientCode} · {client.clientType?.replace(/_/g, ' ')}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={client.status} />
              {client.kycStatus && <StatusBadge status={client.kycStatus} />}
              <Button size="sm" variant="secondary">Edit</Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Matters</p>
          <p className="text-2xl font-bold text-gray-900">{matters.length}</p>
          <p className="text-xs text-gray-400">{matters.filter((m) => m.status === 'ACTIVE').length} active</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
          <p className="text-xs text-gray-400">{invoices.filter((i) => i.status === 'PAID').length} paid</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-600 mb-1 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Outstanding</p>
          <p className="text-xl font-bold text-amber-800">{formatCurrency(unpaid)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" /> Open Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Client info */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary-600" /> Client Info</h2>
          <dl className="space-y-2.5 text-sm">
            {[
              ['Email',   client.email],
              ['Phone',   client.phone],
              ['ID No.',  client.idNumber],
              ['KRA PIN', client.kraPin],
              ['Address', client.address],
              ['City',    client.city],
              ['Country', client.country],
              ['Risk',    client.riskLevel],
              ['Since',   formatDate(client.createdAt)],
            ].filter(([,v]) => v).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="text-gray-500 w-20 flex-shrink-0">{label}</dt>
                <dd className="text-gray-900 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {client.kycStatus !== 'APPROVED' && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> KYC pending — run verification before proceeding
            </div>
          )}
        </div>

        {/* Tabs panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {tab === 'matters' && (
            <Table>
              <thead><tr><Th>Code</Th><Th>Title</Th><Th>Status</Th><Th>Opened</Th></tr></thead>
              <tbody>
                {!matters.length ? <EmptyRow colSpan={4} message="No matters for this client" /> :
                 matters.map((m) => (
                   <tr key={m.id}>
                     <Td><span className="font-mono text-xs">{m.matterCode}</span></Td>
                     <Td><Link href={`/app/matters/${m.id}`} className="font-medium text-primary-700 hover:underline">{m.title}</Link></Td>
                     <Td><StatusBadge status={m.status} /></Td>
                     <Td className="text-xs text-gray-500">{formatDate(m.createdAt)}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          )}

          {tab === 'invoices' && (
            <Table>
              <thead><tr><Th>Invoice</Th><Th>Amount</Th><Th>Status</Th><Th>Due</Th></tr></thead>
              <tbody>
                {!invoices.length ? <EmptyRow colSpan={4} message="No invoices for this client" /> :
                 invoices.map((inv) => (
                   <tr key={inv.id}>
                     <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
                     <Td className="font-medium">{inv.currency} {inv.totalAmount.toLocaleString()}</Td>
                     <Td><StatusBadge status={inv.status} /></Td>
                     <Td className="text-xs text-gray-500">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          )}

          {tab === 'tasks' && (
            <Table>
              <thead><tr><Th>Task</Th><Th>Priority</Th><Th>Status</Th><Th>Due</Th></tr></thead>
              <tbody>
                {!tasks.length ? <EmptyRow colSpan={4} message="No tasks for this client" /> :
                 tasks.map((t) => (
                   <tr key={t.id}>
                     <Td className="font-medium text-gray-900">{t.title}</Td>
                     <Td><StatusBadge status={t.priority} /></Td>
                     <Td><StatusBadge status={t.status} /></Td>
                     <Td className="text-xs text-gray-500">{t.dueDate ? formatDate(t.dueDate) : '—'}</Td>
                   </tr>
                 ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
