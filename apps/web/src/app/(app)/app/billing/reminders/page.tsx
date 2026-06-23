'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, BellRing, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Invoice = { id: string; invoiceNumber?: string; status?: string };
type Reminder = { id: string; channel?: string; tone?: string; status?: string; scheduledFor?: string | null; invoice?: { invoiceNumber?: string } | null };

const CHANNELS = ['EMAIL', 'SMS', 'PORTAL', 'WHATSAPP', 'MANUAL'];
const TONES = ['GENTLE', 'STANDARD', 'FIRM', 'FINAL_NOTICE'];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ invoiceId: '', channel: 'EMAIL', tone: 'STANDARD', scheduledFor: '', message: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get<{ data: Reminder[] }>('/billing/reminders?limit=50').then((r) => setReminders(r.data ?? [])).catch(() => setReminders([])).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.get<{ data: Invoice[] }>('/billing/invoices?limit=100').then((r) => setInvoices(r.data ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoiceId) { setError('Select an invoice'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/billing/reminders', {
        invoiceId: form.invoiceId, channel: form.channel, tone: form.tone,
        scheduledFor: form.scheduledFor || null, message: form.message || null,
      });
      setShowForm(false); setForm({ invoiceId: '', channel: 'EMAIL', tone: 'STANDARD', scheduledFor: '', message: '' });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to create reminder'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BellRing className="h-6 w-6 icon-finance" /> Payment Reminders</h1><p className="text-sm text-gray-500">Schedule reminders for outstanding invoices</p></div>
          <Button size="sm" onClick={() => { setShowForm((v) => !v); setError(''); }}>+ New Reminder</Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="form-label">Invoice *</label>
            <select required value={form.invoiceId} onChange={(e) => set('invoiceId', e.target.value)} className="form-select w-full">
              <option value="">Select invoice…</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber ?? i.id.slice(-6)}{i.status ? ` — ${i.status}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Channel</label>
            <select value={form.channel} onChange={(e) => set('channel', e.target.value)} className="form-select w-full">{CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="form-label">Tone</label>
            <select value={form.tone} onChange={(e) => set('tone', e.target.value)} className="form-select w-full">{TONES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
          </div>
          <div>
            <label className="form-label">Scheduled For</label>
            <input type="date" value={form.scheduledFor} onChange={(e) => set('scheduledFor', e.target.value)} className="form-input w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Message</label>
            <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={2} className="form-input w-full" placeholder="Optional custom message (defaults to template)" />
          </div>
          <div className="sm:col-span-2 flex gap-3"><Button type="submit" loading={saving}>Create Reminder</Button><button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button></div>
        </form>
      )}

      <Table>
        <thead><tr><Th>Invoice</Th><Th>Channel</Th><Th>Tone</Th><Th>Status</Th><Th>Scheduled</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !reminders.length ? <EmptyRow colSpan={5} message="No reminders scheduled" /> :
           reminders.map((r) => (
             <tr key={r.id}>
               <Td className="text-gray-900 text-sm">{r.invoice?.invoiceNumber ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{r.channel ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{r.tone?.replace(/_/g, ' ') ?? '—'}</Td>
               <Td>{r.status ? <StatusBadge status={r.status} /> : '—'}</Td>
               <Td className="text-xs text-gray-500">{r.scheduledFor ? formatDate(r.scheduledFor) : '—'}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
