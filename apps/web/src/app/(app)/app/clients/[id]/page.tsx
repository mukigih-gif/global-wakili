'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import {
  ArrowLeft, Users, Briefcase, FileText, CheckSquare, DollarSign,
  AlertCircle, Globe, UserCheck, Edit2, Save, X, Plus, CreditCard,
} from 'lucide-react';

type Client = {
  id: string; name: string; clientCode: string; type?: string | null;
  email?: string | null; phoneNumber?: string | null; idNumber?: string | null;
  kraPin?: string | null; address?: string | null; city?: string | null;
  country?: string | null; status: string; riskBand?: string | null; riskScore?: number | null;
  kycStatus?: string | null; creditLimit?: number | null; currency?: string | null;
  createdAt: string; branchId?: string | null;
};
type Matter  = { id: string; title: string; matterCode: string; status: string; openedDate?: string; createdAt: string };
type Invoice = { id: string; invoiceNumber: string; total?: number; totalAmount?: number; currency: string; status: string; dueDate?: string; balanceDue?: number };
type Task    = { id: string; title: string; status: string; priority: string; dueDate?: string };

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient]   = useState<Client | null>(null);
  const [portalActivating, setPortalActivating] = useState(false);
  const [portalMsg, setPortalMsg] = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<'matters' | 'invoices' | 'tasks'>('matters');

  // Edit state
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    name: '', email: '', phoneNumber: '', kraPin: '',
    address: '', city: '', country: '', riskBand: '',
  });

  // Debit state
  const [showDebit, setShowDebit]   = useState(false);
  const [debitInvoiceId, setDebitInvoiceId] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitRef, setDebitRef]     = useState('');
  const [debitSaving, setDebitSaving] = useState(false);
  const [debitMsg, setDebitMsg]     = useState('');

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<any>(`/clients/${id}`)
        .then((r) => {
          const c = r?.id ? r : (r?.client ?? r?.data ?? r);
          if (c?.id) {
            setClient(c);
            setEditForm({
              name: c.name ?? '', email: c.email ?? '', phoneNumber: c.phoneNumber ?? '',
              kraPin: c.kraPin ?? '', address: c.address ?? '', city: c.city ?? '',
              country: c.country ?? '', riskBand: c.riskBand ?? '',
            });
          }
        })
        .catch(() => setClient(null)),
      api.get<{ data: Matter[] }>(`/matters?clientId=${id}&limit=30`).then((r) => setMatters(r.data ?? [])).catch(() => {}),
      api.get<{ data: Invoice[] }>(`/billing/invoices?clientId=${id}&limit=30`).then((r) => setInvoices(r.data ?? [])).catch(() => {}),
      api.get<{ data: Task[] }>(`/tasks/search?clientId=${id}&limit=30`).then((r) => setTasks(r.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSave = async () => {
    setSaving(true); setEditError('');
    try {
      // Convert empty strings to undefined — the API's optional fields validate
      // email() / kraPin regex and REJECT '' (only undefined/null are allowed).
      // city/country/riskBand aren't first-class columns, so persist via metadata.
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim() || undefined,
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        kraPin: editForm.kraPin.trim() ? editForm.kraPin.trim().toUpperCase() : undefined,
        address: editForm.address.trim() || undefined,
        // city/country/riskBand are real Client columns — send top-level so they persist.
        city: editForm.city.trim() || undefined,
        country: editForm.country.trim() || undefined,
        riskBand: editForm.riskBand || undefined,
      };
      await api.patch(`/clients/${id}`, payload);
      setEditing(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message
        : (err && typeof err === 'object' && 'message' in err) ? String((err as any).message)
        : 'Failed to save';
      setEditError(msg);
    } finally { setSaving(false); }
  };

  const handleDebit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAmount || parseFloat(debitAmount) <= 0) return;
    setDebitSaving(true); setDebitMsg('');
    try {
      await api.post(`/billing/invoices/${debitInvoiceId}/payment`, {
        amount: parseFloat(debitAmount),
        reference: debitRef || undefined,
        method: 'ACCOUNT_DEBIT',
        clientId: id,
      });
      setDebitMsg('Account debited successfully.');
      setShowDebit(false);
      setDebitAmount(''); setDebitRef(''); setDebitInvoiceId('');
      loadData();
    } catch (err: unknown) {
      setDebitMsg(err instanceof Error ? err.message : 'Debit failed.');
    } finally { setDebitSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  if (!client) return <div className="text-center py-12 text-gray-400">Client not found.</div>;

  const unpaid = invoices.filter((i) => ['INVOICED','OVERDUE','PARTIALLY_PAID'].includes(i.status))
    .reduce((s, i) => s + (parseFloat(String(i.balanceDue ?? i.total ?? i.totalAmount ?? 0))), 0);

  const TABS = [
    { key: 'matters',  label: `Matters (${matters.length})`,   icon: <Briefcase className="h-4 w-4" /> },
    { key: 'invoices', label: `Invoices (${invoices.length})`, icon: <FileText className="h-4 w-4" /> },
    { key: 'tasks',    label: `Tasks (${tasks.length})`,       icon: <CheckSquare className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/app/clients" className="text-gray-400 hover:text-gray-600 mt-1"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {client.clientCode}
                {client.type && ` · ${client.type.replace(/_/g, ' ')}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={client.status} />
              {client.kycStatus && <StatusBadge status={client.kycStatus} />}
              {!editing ? (
                <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditError(''); }}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                  <Button size="sm" loading={saving} onClick={handleSave}>
                    <Save className="h-3.5 w-3.5" /> Save
                  </Button>
                </>
              )}
              <Button size="sm" variant="secondary" onClick={() => setShowDebit(!showDebit)}>
                <CreditCard className="h-3.5 w-3.5" /> Debit Account
              </Button>
              <Button
                size="sm" variant="secondary" loading={portalActivating}
                onClick={async () => {
                  setPortalActivating(true);
                  try {
                    await api.post(`/clients/${id}/portal/activate`, {});
                    setPortalMsg('Portal activated — invitation sent to client email.');
                  } catch {
                    setPortalMsg('Portal activation failed. Ensure client has a valid email.');
                  } finally { setPortalActivating(false); }
                }}
              >
                <Globe className="h-3.5 w-3.5" /> Activate Portal
              </Button>
            </div>
          </div>
        </div>
      </div>

      {portalMsg && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700 flex items-center gap-2">
          <UserCheck className="h-4 w-4 flex-shrink-0" />{portalMsg}
        </div>
      )}

      {editError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{editError}</div>
      )}

      {debitMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{debitMsg}</div>
      )}

      {/* Account Debit Panel */}
      {showDebit && (
        <div className="card p-5 border-primary-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary-600" /> Debit Client Account</h3>
            <button onClick={() => setShowDebit(false)} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>
          <p className="text-xs text-gray-500">Debit the client's account to record payment against a specific invoice. This reduces the outstanding balance.</p>
          <form onSubmit={handleDebit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Invoice *</label>
              <select required value={debitInvoiceId} onChange={(e) => {
                setDebitInvoiceId(e.target.value);
                const inv = invoices.find((i) => i.id === e.target.value);
                if (inv) setDebitAmount(String(inv.balanceDue ?? inv.total ?? inv.totalAmount ?? ''));
              }} className="form-select w-full">
                <option value="">Select invoice…</option>
                {invoices.filter((i) => ['INVOICED','OVERDUE','PARTIALLY_PAID'].includes(i.status)).map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.currency} {parseFloat(String(inv.balanceDue ?? inv.total ?? 0)).toLocaleString()} outstanding
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Amount *</label>
              <input required type="number" min="0.01" step="0.01" value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)} className="form-input w-full" placeholder="0.00" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Payment Reference</label>
              <input value={debitRef} onChange={(e) => setDebitRef(e.target.value)} className="form-input w-full" placeholder="e.g. Bank transfer ref, cheque no." />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" loading={debitSaving}>Record Payment</Button>
            </div>
          </form>
        </div>
      )}

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
          <p className="text-2xl font-bold text-gray-900">{tasks.filter((t) => !['DONE','CANCELLED'].includes(t.status)).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Client info / edit panel */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary-600" /> Client Info</h2>
          {!editing ? (
            <dl className="space-y-2.5 text-sm">
              {[
                ['Email',   client.email],
                ['Phone',   client.phoneNumber],
                ['KRA PIN', client.kraPin],
                ['Address', client.address],
                ['City',    client.city],
                ['Country', client.country],
                ['Risk',    client.riskBand],
                ['Since',   formatDate(client.createdAt)],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={String(label)} className="flex gap-2">
                  <dt className="text-gray-500 w-20 flex-shrink-0">{label}</dt>
                  <dd className="text-gray-900 font-medium">{value}</dd>
                </div>
              ))}
              {client.kycStatus !== 'APPROVED' && (
                <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> KYC {client.kycStatus ?? 'pending'} — verify before proceeding
                </div>
              )}
            </dl>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <label className="form-label">Full Name *</label>
                <input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input value={editForm.phoneNumber} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumber: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">KRA PIN</label>
                <input value={editForm.kraPin} onChange={(e) => setEditForm((f) => ({ ...f, kraPin: e.target.value }))} className="form-input w-full" placeholder="A000000000Z" />
              </div>
              <div>
                <label className="form-label">Address</label>
                <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} className="form-input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label">City</label>
                  <input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Country</label>
                  <input value={editForm.country} onChange={(e) => setEditForm((f) => ({ ...f, country: e.target.value }))} className="form-input w-full" placeholder="Kenya" />
                </div>
              </div>
              <div>
                <label className="form-label">Risk Band</label>
                <select value={editForm.riskBand} onChange={(e) => setEditForm((f) => ({ ...f, riskBand: e.target.value }))} className="form-select w-full">
                  <option value="">Not Set</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
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
            <div className="space-y-2">
              <div className="flex justify-end">
                <Link href={`/app/matters/new?clientId=${id}`}>
                  <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Matter</Button>
                </Link>
              </div>
              <Table>
                <thead><tr><Th>Code</Th><Th>Title</Th><Th>Status</Th><Th>Opened</Th></tr></thead>
                <tbody>
                  {!matters.length ? <EmptyRow colSpan={4} message="No matters for this client" /> :
                   matters.map((m) => (
                     <tr key={m.id}>
                       <Td><span className="font-mono text-xs">{m.matterCode}</span></Td>
                       <Td><Link href={`/app/matters/${m.id}`} className="font-medium text-primary-700 hover:underline">{m.title}</Link></Td>
                       <Td><StatusBadge status={m.status} /></Td>
                       <Td className="text-xs text-gray-500">{formatDate(m.openedDate ?? m.createdAt)}</Td>
                     </tr>
                   ))}
                </tbody>
              </Table>
            </div>
          )}

          {tab === 'invoices' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className={`text-xs font-medium px-3 py-1 rounded-full ${unpaid > 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {unpaid > 0 ? `${formatCurrency(unpaid)} outstanding` : 'No outstanding balance'}
                </div>
                <Link href={`/app/billing/new?clientId=${id}`}>
                  <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Invoice</Button>
                </Link>
              </div>
              <Table>
                <thead><tr><Th>Invoice</Th><Th>Amount</Th><Th>Balance</Th><Th>Status</Th><Th>Due</Th></tr></thead>
                <tbody>
                  {!invoices.length ? <EmptyRow colSpan={5} message="No invoices for this client" /> :
                   invoices.map((inv) => {
                     const total = parseFloat(String(inv.total ?? inv.totalAmount ?? 0));
                     const balance = parseFloat(String(inv.balanceDue ?? total));
                     return (
                       <tr key={inv.id}>
                         <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
                         <Td className="font-medium text-gray-900">{formatCurrency(total, inv.currency)}</Td>
                         <Td className={`font-medium ${balance > 0 ? 'text-amber-700' : 'text-green-700'}`}>{formatCurrency(balance, inv.currency)}</Td>
                         <Td><StatusBadge status={inv.status} /></Td>
                         <Td className={`text-xs ${inv.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
                       </tr>
                     );
                   })}
                </tbody>
              </Table>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Link href={`/app/tasks/new?clientId=${id}`}>
                  <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Task</Button>
                </Link>
              </div>
              <Table>
                <thead><tr><Th>Task</Th><Th>Priority</Th><Th>Status</Th><Th>Due</Th></tr></thead>
                <tbody>
                  {!tasks.length ? <EmptyRow colSpan={4} message="No tasks for this client" /> :
                   tasks.map((t) => {
                     const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';
                     return (
                       <tr key={t.id}>
                         <Td className="font-medium text-gray-900 text-sm">{t.title}</Td>
                         <Td>
                           <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                             t.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                             t.priority === 'HIGH'   ? 'bg-amber-100 text-amber-700' :
                             t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                           }`}>{t.priority}</span>
                         </Td>
                         <Td><StatusBadge status={t.status} /></Td>
                         <Td className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                           {t.dueDate ? formatDate(t.dueDate) : '—'}
                         </Td>
                       </tr>
                     );
                   })}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
