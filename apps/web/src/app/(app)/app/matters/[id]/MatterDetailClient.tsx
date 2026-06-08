'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import {
  ArrowLeft, Edit2, CheckCircle, FileText, Clock, DollarSign,
  Users, Scale, Briefcase, TrendingUp, X, Save, AlertCircle,
  File, Plus, CalendarDays, MapPin,
} from 'lucide-react';

type Matter = {
  id: string;
  title: string;
  matterCode?: string | null;
  caseNumber?: string | null;
  status: string;
  category: string;
  riskLevel: string;
  description?: string | null;
  openedDate: string;
  closedDate?: string | null;
  currency: string;
  estimatedValue?: string | number | null;
  progressPercent: number;
  progressStage?: string | null;
  client?: { id: string; name: string; clientCode: string; email?: string; phoneNumber?: string } | null;
  leadAdvocate?: { id: string; name: string; email: string } | null;
  invoiceCount?: number;
  taskCount?: number;
  documentCount?: number;
  expenseCount?: number;
  trustTransactionCount?: number;
  courtHearingCount?: number;
  recentInvoices?: { id: string; invoiceNumber: string; total?: number; paidAmount?: number; status: string }[];
};

const PROGRESS_STAGES = [
  { value: 'INSTRUCTION_RECEIVED', label: 'Instruction Received' },
  { value: 'INITIAL_REVIEW', label: 'Initial Review' },
  { value: 'RESEARCH', label: 'Research & Analysis' },
  { value: 'DRAFTING', label: 'Drafting' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'COURT_PROCEEDINGS', label: 'Court Proceedings' },
  { value: 'AWAITING_JUDGMENT', label: 'Awaiting Judgment' },
  { value: 'JUDGMENT_RECEIVED', label: 'Judgment Received' },
  { value: 'POST_JUDGMENT', label: 'Post-Judgment' },
  { value: 'ENFORCEMENT', label: 'Enforcement' },
  { value: 'SETTLEMENT', label: 'Settlement' },
  { value: 'CLOSING', label: 'Closing' },
];

type Tab = 'overview' | 'updates' | 'invoices' | 'disbursements' | 'expenses' | 'time' | 'tasks' | 'hearings' | 'calendar' | 'documents';

export function MatterDetailClient({ id }: { id: string }) {
  const [matter, setMatter] = useState<Matter | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showRaiseInvoice, setShowRaiseInvoice] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '', progressPercent: 0, progressStage: '', description: '',
  });

  const loadMatter = () => {
    setLoading(true);
    api.get<any>(`/matters/${id}/overview`)
      .then((m) => {
        const data = m?.id ? m : (m?.matter ?? m?.data ?? m);
        setMatter(data);
        setEditForm({
          status: data?.status ?? '',
          progressPercent: data?.progressPercent ?? 0,
          progressStage: data?.progressStage ?? '',
          description: data?.description ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMatter(); }, [id]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.patch(`/matters/${id}`, {
        status: editForm.status,
        progressPercent: editForm.progressPercent,
        progressStage: editForm.progressStage || null,
        description: editForm.description || null,
      });
      setEditing(false);
      loadMatter();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-500">Matter not found</p>
        <Link href="/app/matters" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
          ← Back to Matters
        </Link>
      </div>
    );
  }

  const progressPct = editing ? editForm.progressPercent : (matter.progressPercent ?? 0);
  const progressColor =
    progressPct < 25 ? 'bg-red-400' :
    progressPct < 50 ? 'bg-amber-400' :
    progressPct < 75 ? 'bg-blue-400' : 'bg-green-500';
  const stageLabel = PROGRESS_STAGES.find((s) => s.value === matter.progressStage)?.label;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/matters" className="mt-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{matter.title}</h1>
              <StatusBadge status={matter.status} />
              {matter.riskLevel && matter.riskLevel !== 'LOW' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  matter.riskLevel === 'HIGH'   ? 'bg-red-100 text-red-700' :
                  matter.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}>{matter.riskLevel} RISK</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                {matter.matterCode ?? `MTR-${id.slice(-6).toUpperCase()}`}
              </span>
              {matter.caseNumber && <span className="text-xs">Case: {matter.caseNumber}</span>}
              <span className="text-xs">{matter.category?.replace(/_/g, ' ')}</span>
              <span className="text-xs">Opened {formatDate(matter.openedDate)}</span>
              {matter.closedDate && <span className="text-xs text-red-500">Closed {formatDate(matter.closedDate)}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="secondary" onClick={() => setShowRaiseInvoice(true)}>
            <FileText className="h-3.5 w-3.5" /> Raise Invoice
          </Button>
          {!editing ? (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setError(''); }}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button size="sm" loading={saving} onClick={handleSave}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {showRaiseInvoice && (
        <RaiseInvoiceModal
          matterId={id}
          currency={matter.currency}
          onClose={() => setShowRaiseInvoice(false)}
          onCreated={() => { setShowRaiseInvoice(false); setTab('invoices'); loadMatter(); }}
        />
      )}

      {/* Progress Bar */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-semibold text-gray-800">Matter Progress</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {editing ? (
              <select
                value={editForm.progressStage}
                onChange={(e) => setEditForm((f) => ({ ...f, progressStage: e.target.value }))}
                className="form-select text-xs w-52"
              >
                <option value="">— Select Stage —</option>
                {PROGRESS_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            ) : stageLabel ? (
              <span className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium">
                {stageLabel}
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">No stage set — click Edit to update</span>
            )}
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100" step="5"
                  value={editForm.progressPercent}
                  onChange={(e) => setEditForm((f) => ({ ...f, progressPercent: parseInt(e.target.value) }))}
                  className="w-28 accent-primary-600"
                />
                <span className="text-sm font-bold text-gray-700 w-10 text-right">{editForm.progressPercent}%</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-gray-900">{progressPct}%</span>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
          {[0, 25, 50, 75, 100].map((v) => <span key={v}>{v}%</span>)}
        </div>

        {editing && (
          <div className="grid grid-cols-1 gap-4 pt-3 border-t border-gray-100 sm:grid-cols-2">
            <div>
              <label className="form-label">Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="form-select w-full">
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2} className="form-input w-full resize-none text-sm" placeholder="Brief description of the matter…" />
            </div>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Client</p>
          {matter.client ? (
            <Link href={`/app/clients/${matter.client.id}`} className="text-sm font-semibold text-primary-700 hover:underline block">
              {matter.client.name}
            </Link>
          ) : <span className="text-sm text-gray-400">—</span>}
          {matter.client?.clientCode && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">{matter.client.clientCode}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Lead Advocate</p>
          <p className="text-sm font-semibold text-gray-800">{matter.leadAdvocate?.name ?? '—'}</p>
          {matter.leadAdvocate?.email && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{matter.leadAdvocate.email}</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Est. Value</p>
          <p className="text-sm font-semibold text-gray-800">
            {matter.estimatedValue
              ? formatCurrency(matter.estimatedValue, matter.currency)
              : <span className="text-gray-400">Not set</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{matter.currency}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> Activity</p>
          <div className="grid grid-cols-3 gap-1 text-center">
            <div><p className="text-sm font-bold text-gray-800">{matter.invoiceCount ?? 0}</p><p className="text-[10px] text-gray-400">Inv</p></div>
            <div><p className="text-sm font-bold text-gray-800">{matter.taskCount ?? 0}</p><p className="text-[10px] text-gray-400">Tasks</p></div>
            <div><p className="text-sm font-bold text-gray-800">{matter.documentCount ?? 0}</p><p className="text-[10px] text-gray-400">Docs</p></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'overview',      label: 'Overview',                                                                        icon: <Scale className="h-3.5 w-3.5" /> },
          { key: 'updates',       label: 'Updates',                                                                         icon: <TrendingUp className="h-3.5 w-3.5" /> },
          { key: 'invoices',      label: `Invoices${matter.invoiceCount ? ` (${matter.invoiceCount})` : ''}`,               icon: <FileText className="h-3.5 w-3.5" /> },
          { key: 'disbursements', label: 'Disbursements',                                                                   icon: <DollarSign className="h-3.5 w-3.5" /> },
          { key: 'expenses',      label: `Expenses${matter.expenseCount ? ` (${matter.expenseCount})` : ''}`,               icon: <Clock className="h-3.5 w-3.5" /> },
          { key: 'time',          label: 'Time',                                                                              icon: <Clock className="h-3.5 w-3.5" /> },
          { key: 'tasks',         label: `Tasks${matter.taskCount ? ` (${matter.taskCount})` : ''}`,                        icon: <CheckCircle className="h-3.5 w-3.5" /> },
          { key: 'hearings',   label: `Court${matter.courtHearingCount ? ` (${matter.courtHearingCount})` : ''}`, icon: <Scale className="h-3.5 w-3.5" /> },
          { key: 'calendar',   label: 'Calendar',                                                                    icon: <CalendarDays className="h-3.5 w-3.5" /> },
          { key: 'documents',  label: 'Documents',                                                                   icon: <File className="h-3.5 w-3.5" /> },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'      && <MatterOverviewTab matter={matter} matterId={id} />}
      {tab === 'updates'       && <MatterUpdatesTab matterId={id} />}
      {tab === 'invoices'      && <MatterInvoicesTab matterId={id} />}
      {tab === 'disbursements' && <MatterDisbursementsTab matterId={id} />}
      {tab === 'expenses'      && <MatterExpensesTab matterId={id} currency={matter.currency} />}
      {tab === 'time'          && <MatterTimeTab matterId={id} currency={matter.currency} />}
      {tab === 'tasks'         && <MatterTasksTab matterId={id} />}
      {tab === 'hearings'      && <MatterHearingsTab matterId={id} />}
      {tab === 'calendar'      && <MatterCalendarTab matterId={id} matterTitle={matter.title} />}
      {tab === 'documents'     && <MatterDocumentsTab matterId={id} />}
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function MatterOverviewTab({ matter, matterId }: { matter: Matter; matterId: string }) {
  return (
    <div className="space-y-4">
      {matter.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{matter.description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: 'Invoices',       count: matter.invoiceCount ?? 0,          href: '#invoices',                                         icon: <FileText className="h-5 w-5" /> },
          { label: 'Tasks',          count: matter.taskCount ?? 0,             href: `/app/tasks/new?matterId=${matterId}`,                icon: <CheckCircle className="h-5 w-5" /> },
          { label: 'Documents',      count: matter.documentCount ?? 0,         href: `/app/documents`,                                    icon: <File className="h-5 w-5" /> },
          { label: 'Expenses',       count: matter.expenseCount ?? 0,          href: '#expenses',                                         icon: <Clock className="h-5 w-5" /> },
          { label: 'Court Hearings', count: matter.courtHearingCount ?? 0,     href: `/app/court/filings?matterId=${matterId}`,            icon: <Scale className="h-5 w-5" /> },
          { label: 'New Event',      count: 0,                                 href: `/app/calendar/new?matterId=${matterId}`,             icon: <CalendarDays className="h-5 w-5" /> },
        ].map((item) => (
          <Link key={item.label} href={item.href}
            className="rounded-xl border border-gray-200 bg-white p-4 hover:border-primary-200 hover:bg-primary-50/30 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{item.label}</span>
              <span className="text-gray-300 group-hover:text-primary-400 transition-colors">{item.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
          </Link>
        ))}
      </div>

      {matter.recentInvoices && matter.recentInvoices.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Recent Invoices</p>
          <div className="divide-y divide-gray-50">
            {matter.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs text-gray-600">{inv.invoiceNumber}</span>
                <StatusBadge status={inv.status} />
                {inv.total != null && (
                  <span className="text-gray-700 font-medium text-xs">{formatCurrency(inv.total)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invoices ────────────────────────────────────────────────────────────────

function MatterInvoicesTab({ matterId }: { matterId: string }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any[] }>(`/billing/invoices?matterId=${matterId}&take=50`)
      .then((r) => setInvoices(r.data ?? []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [matterId]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={`/app/billing/new?matterId=${matterId}`}>
          <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Invoice</Button>
        </Link>
      </div>
      <Table>
        <thead><tr><Th>Invoice No.</Th><Th>Total</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th><Th>Issued</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> :
           !invoices.length ? <EmptyRow colSpan={6} message="No invoices for this matter" /> :
           invoices.map((inv) => {
             const total = parseFloat(inv.total ?? inv.totalAmount ?? 0);
             const paid  = parseFloat(inv.paidAmount ?? 0);
             return (
               <tr key={inv.id}>
                 <Td><span className="font-mono text-xs">{inv.invoiceNumber}</span></Td>
                 <Td className="font-medium text-gray-900">{formatCurrency(total)}</Td>
                 <Td className="font-medium text-green-700">{formatCurrency(paid)}</Td>
                 <Td className={`font-medium ${total - paid > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{formatCurrency(total - paid)}</Td>
                 <Td><StatusBadge status={inv.status} /></Td>
                 <Td className="text-xs text-gray-500">
                   {inv.issuedAt ? formatDate(inv.issuedAt) : inv.issuedDate ? formatDate(inv.issuedDate) : '—'}
                 </Td>
               </tr>
             );
           })}
        </tbody>
      </Table>
    </div>
  );
}

// ─── Disbursements (inline with approve/reject/mark-paid) ─────────────────────

function MatterDisbursementsTab({ matterId }: { matterId: string }) {
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    disbursementType: 'COURT_FEES', description: '', amount: '',
    currency: 'KES', requestNote: '', notes: '',
  });

  const load = () => {
    setLoading(true);
    api.get<{ data: any[] }>(`/matters/${matterId}/disbursements`)
      .then((r) => setDisbursements(r.data ?? []))
      .catch(() => setDisbursements([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [matterId]);

  const act = async (disbId: string, action: 'approve' | 'reject' | 'mark-paid') => {
    setActioning(disbId + action);
    try {
      await api.patch(`/matters/${matterId}/disbursements/${disbId}/${action}`, {});
      load();
    } catch { load(); }
    finally { setActioning(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be > 0'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/matters/${matterId}/disbursements`, { ...form, amount: parseFloat(form.amount), matterId });
      setForm({ disbursementType: 'COURT_FEES', description: '', amount: '', currency: 'KES', requestNote: '', notes: '' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit disbursement');
    } finally { setSaving(false); }
  };

  const totalPaid    = disbursements.filter((d) => d.status === 'SETTLED').reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalPending = disbursements.filter((d) => ['DRAFT', 'APPROVED'].includes(d.status)).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
            <p className="text-xs text-gray-500">Disbursed</p>
            <p className="text-base font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2">
            <p className="text-xs text-amber-600">Pending</p>
            <p className="text-base font-bold text-amber-800">{formatCurrency(totalPending)}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Request Disbursement</Button>
      </div>

      {showForm && (
        <div className="card p-5 border-primary-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Disbursement Request</h3>
            <button onClick={() => { setShowForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type *</label>
              <select required value={form.disbursementType} onChange={(e) => setForm((f) => ({ ...f, disbursementType: e.target.value }))} className="form-select w-full">
                <option value="COURT_FEES">Court Filing Fees</option>
                <option value="STAMP_DUTY">Stamp Duty</option>
                <option value="VALUATION">Valuation Fees</option>
                <option value="SEARCH_FEES">Search / Registry Fees</option>
                <option value="TRAVEL">Travel & Accommodation</option>
                <option value="PRINTING">Printing & Photocopying</option>
                <option value="PROCESS_SERVER">Process Server</option>
                <option value="EXPERT_WITNESS">Expert Witness</option>
                <option value="ADVOCATE_FEES">Advocate Fees</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Description *</label>
              <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="form-input w-full" placeholder="Brief description" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="form-label">Amount *</label>
                <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="form-input w-full" placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className="form-label">Currency</label>
                <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="form-select w-full">
                  <option>KES</option><option>USD</option><option>GBP</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Justification *</label>
              <textarea required value={form.requestNote} onChange={(e) => setForm((f) => ({ ...f, requestNote: e.target.value }))} rows={2} className="form-input w-full resize-none" placeholder="Purpose and necessity of this expense…" />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" loading={saving}>Submit Request</Button>
            </div>
          </form>
        </div>
      )}

      <Table>
        <thead><tr><Th>Ref</Th><Th>Type</Th><Th>Description</Th><Th>Amount</Th><Th>Requested By</Th><Th>Status</Th><Th>Date</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !disbursements.length ? <EmptyRow colSpan={8} message="No disbursements requested for this matter" /> :
           disbursements.map((d) => (
             <tr key={d.id}>
               <Td><span className="font-mono text-xs text-gray-600">{d.reference ?? '—'}</span></Td>
               <Td className="text-xs text-gray-600">{d.disbursementType?.replace(/_/g, ' ') ?? '—'}</Td>
               <Td className="text-sm text-gray-900">{d.description}</Td>
               <Td className="font-medium text-gray-900">{formatCurrency(d.amount, d.currency)}</Td>
               <Td className="text-xs text-gray-600">{d.requestedBy?.name ?? '—'}</Td>
               <Td><StatusBadge status={d.status} /></Td>
               <Td className="text-xs text-gray-500">{formatDate(d.createdAt)}</Td>
               <Td>
                 {d.status === 'DRAFT' && (
                   <div className="flex gap-2">
                     <button disabled={!!actioning} onClick={() => act(d.id, 'approve')}
                       className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-40">
                       {actioning === d.id + 'approve' ? '…' : 'Approve'}
                     </button>
                     <button disabled={!!actioning} onClick={() => act(d.id, 'reject')}
                       className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-40">
                       {actioning === d.id + 'reject' ? '…' : 'Reject'}
                     </button>
                   </div>
                 )}
                 {d.status === 'APPROVED' && (
                   <button disabled={!!actioning} onClick={() => act(d.id, 'mark-paid')}
                     className="text-xs text-primary-600 hover:text-primary-800 font-medium disabled:opacity-40">
                     {actioning === d.id + 'mark-paid' ? '…' : 'Mark Settled'}
                   </button>
                 )}
                 {d.status === 'REJECTED' && <span className="text-xs text-red-400 italic">Rejected</span>}
                 {d.status === 'SETTLED' && (
                   <span className="text-xs text-green-500 flex items-center gap-1">
                     <CheckCircle className="h-3 w-3" /> Settled
                   </span>
                 )}
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}

// ─── Expenses ────────────────────────────────────────────────────────────────

function MatterExpensesTab({ matterId, currency }: { matterId: string; currency: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    description: '', amount: '', currency,
    expenseDate: new Date().toISOString().slice(0, 10), notes: '',
  });

  const load = () => {
    setLoading(true);
    api.get<{ data: any[] }>(`/matters/${matterId}/expenses`)
      .then((r) => setExpenses(r.data ?? []))
      .catch(() => setExpenses([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [matterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be > 0'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/billing/expenses`, { matterId, ...form, amount: parseFloat(form.amount) });
      setForm({ description: '', amount: '', currency, expenseDate: new Date().toISOString().slice(0, 10), notes: '' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally { setSaving(false); }
  };

  const totalAmt = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-600">Total Expenses</p>
          <p className="text-lg font-bold text-amber-800">{formatCurrency(totalAmt, currency)}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Record Expense</Button>
      </div>

      {showForm && (
        <div className="card p-5 border-primary-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Record Expense</h3>
            <button onClick={() => { setShowForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
          </div>
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Description *</label>
              <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="form-input w-full" placeholder="e.g. Travel to Mombasa for hearing" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="form-label">Amount *</label>
                <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="form-input w-full" placeholder="0.00" />
              </div>
              <div className="w-24">
                <label className="form-label">Currency</label>
                <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="form-select w-full">
                  <option>KES</option><option>USD</option><option>GBP</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Date</label>
              <input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} className="form-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="form-input w-full resize-none" placeholder="Optional notes" />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button type="submit" loading={saving}>Save Expense</Button>
            </div>
          </form>
        </div>
      )}

      <Table>
        <thead><tr><Th>Date</Th><Th>Description</Th><Th>Amount</Th><Th>Recorded By</Th><Th>Status</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !expenses.length ? <EmptyRow colSpan={5} message="No expenses recorded for this matter" /> :
           expenses.map((exp) => (
             <tr key={exp.id}>
               <Td className="text-xs text-gray-500">{formatDate(exp.expenseDate ?? exp.createdAt)}</Td>
               <Td className="text-sm text-gray-900">{exp.description ?? '—'}</Td>
               <Td className="font-medium text-gray-900">{formatCurrency(exp.amount, exp.currency)}</Td>
               <Td className="text-xs text-gray-500">{exp.user?.name ?? '—'}</Td>
               <Td><StatusBadge status={exp.status ?? 'DRAFT'} /></Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

function MatterTasksTab({ matterId }: { matterId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any[] }>(`/tasks/search?matterId=${matterId}&limit=50`)
      .then((r) => setTasks(r.data ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [matterId]);

  const now = new Date();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={`/app/tasks/new?matterId=${matterId}`}>
          <Button size="sm"><Plus className="h-3.5 w-3.5" /> New Task</Button>
        </Link>
      </div>
      <Table>
        <thead><tr><Th>Title</Th><Th>Priority</Th><Th>Assigned To</Th><Th>Due</Th><Th>Status</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !tasks.length ? <EmptyRow colSpan={5} message="No tasks for this matter" /> :
           tasks.map((t) => {
             const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE';
             return (
               <tr key={t.id}>
                 <Td>
                   <Link href={`/app/tasks/${t.id}`} className="text-primary-700 hover:underline text-sm font-medium">{t.title}</Link>
                 </Td>
                 <Td>
                   <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                     t.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                     t.priority === 'HIGH'   ? 'bg-amber-100 text-amber-700' :
                     t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                   }`}>{t.priority}</span>
                 </Td>
                 <Td className="text-xs text-gray-600">{t.assignee?.name ?? '—'}</Td>
                 <Td className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                   {t.dueDate ? formatDate(t.dueDate) : '—'}
                   {isOverdue && <span className="ml-1">(overdue)</span>}
                 </Td>
                 <Td><StatusBadge status={t.status} /></Td>
               </tr>
             );
           })}
        </tbody>
      </Table>
    </div>
  );
}

// ─── Matter Calendar (Bring-Ups, Hearings, Deadlines) ────────────────────────

function MatterCalendarTab({ matterId, matterTitle }: { matterId: string; matterTitle: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const to   = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString();
    api.get<{ data: any[] }>(`/calendar/events?matterId=${matterId}&startDate=${from}&endDate=${to}&limit=100`)
      .then((r) => setEvents(r.data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [matterId]);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startTime ?? e.start) >= now);
  const past     = events.filter((e) => new Date(e.startTime ?? e.start) < now);

  const TYPE_COLORS: Record<string, string> = {
    COURT_HEARING:    'bg-red-100 text-red-700',
    DEADLINE:         'bg-orange-100 text-orange-700',
    BRING_UP:         'bg-amber-100 text-amber-700',
    COMPLIANCE_DATE:  'bg-purple-100 text-purple-700',
    CLIENT_MEETING:   'bg-blue-100 text-blue-700',
    INTERNAL_MEETING: 'bg-gray-100 text-gray-700',
    REMINDER:         'bg-green-100 text-green-700',
  };

  const EventRow = ({ ev }: { ev: any }) => {
    const start = new Date(ev.startTime ?? ev.start);
    const isPast = start < now;
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
        <div className="flex-shrink-0 text-center min-w-[48px]">
          <p className={`text-xs font-bold ${isPast ? 'text-gray-400' : 'text-primary-700'}`}>
            {start.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
          </p>
          <p className={`text-xs ${isPast ? 'text-gray-400' : 'text-gray-500'}`}>
            {ev.startTime ? start.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : 'All day'}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ev.type ?? ev.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
              {(ev.type ?? ev.eventType ?? 'EVENT').replace(/_/g, ' ')}
            </span>
            {isPast && <span className="text-xs text-gray-400 italic">past</span>}
          </div>
          <p className={`text-sm font-medium mt-0.5 ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>{ev.title}</p>
          {ev.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{ev.location}
            </p>
          )}
          {ev.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{ev.description}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">{upcoming.length} upcoming</span>
          <span className="text-gray-400">{past.length} past</span>
        </div>
        <Link href={`/app/calendar/new?matterId=${matterId}&matter=${encodeURIComponent(matterTitle)}`}>
          <button className="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Schedule Event
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 rounded-xl border-2 border-dashed border-gray-200">
          <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No events scheduled for this matter</p>
          <p className="text-xs text-gray-400 mt-1">Add bring-ups, hearings, deadlines and meetings</p>
          <Link href={`/app/calendar/new?matterId=${matterId}`} className="mt-3 inline-block">
            <button className="text-xs text-primary-600 hover:text-primary-800 font-medium">+ Schedule first event</button>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-2">
                {upcoming.sort((a, b) => new Date(a.startTime ?? a.start).getTime() - new Date(b.startTime ?? b.start).getTime())
                  .map((ev) => <EventRow key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Past</p>
              <div className="space-y-2">
                {past.sort((a, b) => new Date(b.startTime ?? b.start).getTime() - new Date(a.startTime ?? a.start).getTime())
                  .slice(0, 10)
                  .map((ev) => <EventRow key={ev.id} ev={ev} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Court Hearings ───────────────────────────────────────────────────────────

function MatterHearingsTab({ matterId }: { matterId: string }) {
  const [hearings, setHearings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any[] }>(`/court/hearings?matterId=${matterId}&limit=50`)
      .then((r) => setHearings(r.data ?? []))
      .catch(() => setHearings([]))
      .finally(() => setLoading(false));
  }, [matterId]);

  return (
    <Table>
      <thead><tr><Th>Date</Th><Th>Court</Th><Th>Judge</Th><Th>Purpose</Th><Th>Status</Th></tr></thead>
      <tbody>
        {loading ? <LoadingRow colSpan={5} /> :
         !hearings.length ? <EmptyRow colSpan={5} message="No court hearings recorded for this matter" /> :
         hearings.map((h) => (
           <tr key={h.id}>
             <Td className="text-xs text-gray-500">{formatDate(h.hearingDate ?? h.scheduledDate ?? h.date)}</Td>
             <Td className="text-sm text-gray-900">{h.courtName ?? h.court ?? '—'}</Td>
             <Td className="text-xs text-gray-600">{h.judgeName ?? h.judge ?? '—'}</Td>
             <Td className="text-xs text-gray-600">{h.purpose ?? h.type ?? '—'}</Td>
             <Td><StatusBadge status={h.status ?? 'SCHEDULED'} /></Td>
           </tr>
         ))}
      </tbody>
    </Table>
  );
}

// ─── Documents ────────────────────────────────────────────────────────────────

function MatterDocumentsTab({ matterId }: { matterId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any[] }>(`/documents/matter/${matterId}?limit=50`)
      .then((r) => setDocs(r.data ?? []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [matterId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{docs.length} document{docs.length !== 1 ? 's' : ''} linked to this matter</p>
        <Link href="/app/documents">
          <Button size="sm" variant="secondary"><Plus className="h-3.5 w-3.5" /> Upload Document</Button>
        </Link>
      </div>
      <Table>
        <thead><tr><Th>Title</Th><Th>Type</Th><Th>Status</Th><Th>Version</Th><Th>Created</Th><Th></Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={6} /> :
           !docs.length ? <EmptyRow colSpan={6} message="No documents linked to this matter" /> :
           docs.map((d) => (
             <tr key={d.id}>
               <Td className="font-medium text-gray-900 text-sm">{d.title ?? d.name ?? 'Untitled'}</Td>
               <Td className="text-xs text-gray-500">{d.contractType?.replace(/_/g, ' ') ?? d.type?.replace(/_/g, ' ') ?? '—'}</Td>
               <Td><StatusBadge status={d.status ?? 'DRAFT'} /></Td>
               <Td className="text-xs text-gray-500">{d.currentVersion ?? d.versionCount ?? '1'}</Td>
               <Td className="text-xs text-gray-500">{formatDate(d.createdAt)}</Td>
               <Td>
                 <Link href={`/app/documents?id=${d.id}`} className="text-xs text-primary-600 hover:underline">View</Link>
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}

// ─── Time Entries tab ─────────────────────────────────────────────────────────

function MatterTimeTab({ matterId, currency }: { matterId: string; currency: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: any[] }>(`/matters/${matterId}/time-entries`)
      .then((r) => setEntries(r.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [matterId]);

  const unbilled = entries.filter((e) => !e.isInvoiced);
  const billed   = entries.filter((e) =>  e.isInvoiced);
  const totalUnbilled = unbilled.reduce((s, e) => s + parseFloat(String(e.billableAmount ?? 0)), 0);
  const totalBilled   = billed.reduce((s, e)   => s + parseFloat(String(e.billableAmount ?? 0)), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2">
          <p className="text-xs text-amber-600">Unbilled Time</p>
          <p className="text-lg font-bold text-amber-800">{formatCurrency(totalUnbilled, currency)}</p>
          <p className="text-xs text-amber-500">{unbilled.length} entries</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-2">
          <p className="text-xs text-green-600">Billed Time</p>
          <p className="text-lg font-bold text-green-800">{formatCurrency(totalBilled, currency)}</p>
          <p className="text-xs text-green-500">{billed.length} entries</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2">
          <p className="text-xs text-gray-500">Total Time Value</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(totalUnbilled + totalBilled, currency)}</p>
        </div>
      </div>
      <Table>
        <thead><tr><Th>Date</Th><Th>Description</Th><Th>Advocate</Th><Th>Hours</Th><Th>Rate</Th><Th>Amount</Th><Th>Status</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={7} /> :
           !entries.length ? <EmptyRow colSpan={7} message="No time entries for this matter. Record time via Time Capture." /> :
           entries.map((e) => {
             const hrs = parseFloat(String(e.durationHours ?? 0)) + parseFloat(String(e.durationMinutes ?? 0)) / 60;
             return (
               <tr key={e.id}>
                 <Td className="text-xs text-gray-500">{formatDate(e.entryDate ?? e.createdAt)}</Td>
                 <Td className="text-sm text-gray-900">{e.description ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{e.advocate?.name ?? '—'}</Td>
                 <Td className="text-xs text-gray-600">{hrs.toFixed(2)}h</Td>
                 <Td className="text-xs text-gray-600">{formatCurrency(e.appliedRate ?? 0, currency)}/hr</Td>
                 <Td className="font-medium text-gray-900">{formatCurrency(e.billableAmount ?? 0, currency)}</Td>
                 <Td>{e.isInvoiced ? <span className="badge-green text-xs">Billed</span> : <span className="badge-yellow text-xs">Unbilled</span>}</Td>
               </tr>
             );
           })}
        </tbody>
      </Table>
    </div>
  );
}

// ─── Raise Invoice Modal ──────────────────────────────────────────────────────

function RaiseInvoiceModal({
  matterId, currency, onClose, onCreated,
}: { matterId: string; currency: string; onClose: () => void; onCreated: () => void }) {
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [expenses, setExpenses]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedTime, setSelectedTime] = useState<Set<string>>(new Set());
  const [selectedExp,  setSelectedExp]  = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState('');
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ data: any[] }>(`/matters/${matterId}/time-entries`).then((r) => r.data ?? []),
      api.get<{ data: any[] }>(`/matters/${matterId}/expenses`).then((r) => r.data ?? []),
    ]).then(([te, exp]) => {
      const unbilledTime = te.filter((e: any) => !e.isInvoiced && e.isBillable !== false);
      const unbilledExp  = exp.filter((e: any) => !e.isInvoiced);
      setTimeEntries(unbilledTime);
      setExpenses(unbilledExp);
      setSelectedTime(new Set(unbilledTime.map((e: any) => e.id)));
      setSelectedExp(new Set(unbilledExp.map((e: any) => e.id)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [matterId]);

  const toggleTime = (id: string) => setSelectedTime((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleExp  = (id: string) => setSelectedExp((s)  => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selTime = timeEntries.filter((e) => selectedTime.has(e.id));
  const selExp  = expenses.filter((e) => selectedExp.has(e.id));
  const timeTotal  = selTime.reduce((s, e) => s + parseFloat(String(e.billableAmount ?? 0)), 0);
  const expTotal   = selExp.reduce((s, e)  => s + parseFloat(String(e.amount ?? 0)), 0);
  const grandTotal = timeTotal + expTotal;

  const handleCreate = async () => {
    if (!selectedTime.size && !selectedExp.size) { setError('Select at least one item to bill'); return; }
    setSaving(true); setError('');
    try {
      await api.post(`/matters/${matterId}/raise-invoice`, {
        timeEntryIds: [...selectedTime],
        expenseIds:   [...selectedExp],
        dueDate: dueDate || undefined,
        notes:   notes   || undefined,
      });
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" /> Raise Invoice
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">All unbilled items pre-selected. Uncheck to exclude.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-8">Loading billable items…</p>
          ) : (
            <>
              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary-500" /> Unbilled Time ({timeEntries.length})
                  </h3>
                  <span className="text-xs font-medium text-gray-600">{formatCurrency(timeTotal, currency)}</span>
                </div>
                {!timeEntries.length ? <p className="text-xs text-gray-400 italic px-1">No unbilled time entries</p>
                 : timeEntries.map((e) => {
                   const hrs = parseFloat(String(e.durationHours ?? 0)) + parseFloat(String(e.durationMinutes ?? 0)) / 60;
                   return (
                     <label key={e.id} className={`flex items-start gap-3 p-3 rounded-lg border mb-1.5 cursor-pointer ${selectedTime.has(e.id) ? 'border-primary-200 bg-primary-50/40' : 'border-gray-100 bg-gray-50'}`}>
                       <input type="checkbox" checked={selectedTime.has(e.id)} onChange={() => toggleTime(e.id)} className="mt-0.5 accent-primary-600" />
                       <div className="flex-1 min-w-0">
                         <p className="text-sm text-gray-900 truncate">{e.description ?? 'Time Entry'}</p>
                         <p className="text-xs text-gray-500">{formatDate(e.entryDate)} · {hrs.toFixed(2)}h · {e.advocate?.name ?? '—'}</p>
                       </div>
                       <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(e.billableAmount ?? 0, currency)}</span>
                     </label>
                   );
                })}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Unbilled Expenses ({expenses.length})
                  </h3>
                  <span className="text-xs font-medium text-gray-600">{formatCurrency(expTotal, currency)}</span>
                </div>
                {!expenses.length ? <p className="text-xs text-gray-400 italic px-1">No unbilled expenses</p>
                 : expenses.map((e) => (
                   <label key={e.id} className={`flex items-start gap-3 p-3 rounded-lg border mb-1.5 cursor-pointer ${selectedExp.has(e.id) ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-gray-50'}`}>
                     <input type="checkbox" checked={selectedExp.has(e.id)} onChange={() => toggleExp(e.id)} className="mt-0.5 accent-amber-600" />
                     <div className="flex-1 min-w-0">
                       <p className="text-sm text-gray-900 truncate">{e.description ?? 'Expense'}</p>
                       <p className="text-xs text-gray-500">{formatDate(e.expenseDate ?? e.createdAt)} · {e.user?.name ?? '—'}</p>
                     </div>
                     <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(e.amount ?? 0, e.currency ?? currency)}</span>
                   </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                <div>
                  <label className="form-label">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="form-input w-full" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="form-input w-full resize-none" placeholder="Optional invoice notes…" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
          <div>
            <p className="text-xs text-gray-500">Invoice total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(grandTotal, currency)}</p>
            <p className="text-xs text-gray-400">{selectedTime.size} time · {selectedExp.size} expense items</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button loading={saving} disabled={!selectedTime.size && !selectedExp.size} onClick={handleCreate}>
              <FileText className="h-4 w-4" /> Create Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Matter Updates / Timeline ────────────────────────────────────────────────

const UPDATE_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General Update',
  STATUS_CHANGE: 'Status Change',
  HEARING_UPDATE: 'Hearing Update',
  FILING_UPDATE: 'Filing Update',
  CLIENT_COMMUNICATION: 'Client Communication',
  SETTLEMENT: 'Settlement',
  JUDGMENT: 'Judgment',
  INSTRUCTION: 'New Instruction',
};

function MatterUpdatesTab({ matterId }: { matterId: string }) {
  const [updates, setUpdates]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [form, setForm] = useState({
    content: '', updateType: 'GENERAL', isClientVisible: false, notifyClient: false, bringUpDate: '',
  });

  const load = () => {
    setLoading(true);
    api.get<{ data: any[] }>(`/matters/${matterId}/updates`)
      .then((r) => setUpdates(r.data ?? []))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [matterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) return;
    setSaving(true); setError('');
    try {
      await api.post(`/matters/${matterId}/updates`, { ...form, bringUpDate: form.bringUpDate || undefined });
      setForm({ content: '', updateType: 'GENERAL', isClientVisible: false, notifyClient: false, bringUpDate: '' });
      setShowForm(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post update');
    } finally { setSaving(false); }
  };

  const toggleVisibility = async (updateId: string, current: boolean) => {
    await api.patch(`/matters/${matterId}/updates/${updateId}`, { isClientVisible: !current }).catch(() => {});
    setUpdates((prev) => prev.map((u) => u.id === updateId ? { ...u, isClientVisible: !current } : u));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {updates.length} update{updates.length !== 1 ? 's' : ''} &mdash; {updates.filter((u) => u.isClientVisible).length} visible to client
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Post Update</Button>
      </div>

      {showForm && (
        <div className="card p-5 border-primary-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Post Matter Update</h3>
            <button onClick={() => { setShowForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
          </div>
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="form-label">Update Type</label>
              <select value={form.updateType} onChange={(e) => setForm((f) => ({ ...f, updateType: e.target.value }))} className="form-select w-full">
                {Object.entries(UPDATE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Update *</label>
              <textarea required value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} className="form-input w-full resize-none" placeholder="Describe what happened, decisions made, next steps…" />
            </div>
            <div>
              <label className="form-label">Next Bring-Up Date &amp; Time <span className="font-normal text-gray-400">(optional — adds a reminder to the calendar)</span></label>
              <input type="datetime-local" value={form.bringUpDate} onChange={(e) => setForm((f) => ({ ...f, bringUpDate: e.target.value }))} className="form-input w-full sm:w-64" />
            </div>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isClientVisible} onChange={(e) => setForm((f) => ({ ...f, isClientVisible: e.target.checked }))} className="accent-primary-600" />
                <span className="text-gray-700">Visible to client on portal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.notifyClient} onChange={(e) => setForm((f) => ({ ...f, notifyClient: e.target.checked }))} className="accent-primary-600" />
                <span className="text-gray-700">Notify client by system</span>
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={saving}>Post Update</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Loading…</div>
      ) : !updates.length ? (
        <div className="text-center text-sm text-gray-400 py-12">No updates yet. Post the first update above.</div>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {updates.map((u) => (
              <div key={u.id} className="relative pl-10">
                <div className="absolute left-3 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-400 shadow" />
                <div className={`rounded-xl border p-4 space-y-2 ${u.isClientVisible ? 'border-primary-100 bg-primary-50/30' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900">{u.author?.name ?? '—'}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{formatDate(u.createdAt)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{UPDATE_TYPE_LABELS[u.updateType] ?? u.updateType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.isClientVisible && <span className="text-xs text-primary-600 bg-primary-50 border border-primary-200 px-1.5 py-0.5 rounded">Client Visible</span>}
                      <button
                        onClick={() => toggleVisibility(u.id, u.isClientVisible)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${u.isClientVisible ? 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600' : 'border-gray-200 text-gray-400 hover:border-primary-200 hover:text-primary-600'}`}
                      >
                        {u.isClientVisible ? 'Hide from client' : 'Show to client'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{u.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
