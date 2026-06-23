'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Client = { id: string; name: string };
type Notification = { id: string; type?: string; channel?: string; status?: string; recipientEmail?: string | null; subject?: string | null; createdAt?: string | null };

const CHANNELS = ['EMAIL', 'SMS', 'PORTAL', 'WHATSAPP', 'MANUAL'];

export default function BillingNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: '', channel: 'EMAIL', clientId: '', recipientEmail: '', subject: '', message: '', scheduledFor: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const load = () => api.get<{ data: Notification[] }>('/billing/notifications?limit=50').then((r) => setItems(r.data ?? [])).catch(() => setItems([])).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type.trim()) { setError('Type is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/billing/notifications', {
        type: form.type, channel: form.channel,
        clientId: form.clientId || null, recipientEmail: form.recipientEmail || null,
        subject: form.subject || null, message: form.message || null,
        scheduledFor: form.scheduledFor || null,
      });
      setShowForm(false); setForm({ type: '', channel: 'EMAIL', clientId: '', recipientEmail: '', subject: '', message: '', scheduledFor: '' });
      await load();
    } catch (err) { setError((err as ApiError)?.message ?? 'Failed to create notification'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/billing" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Mail className="h-6 w-6 icon-finance" /> Billing Notifications</h1><p className="text-sm text-gray-500">Client-facing billing notifications and dispatch log</p></div>
          <Button size="sm" onClick={() => { setShowForm((v) => !v); setError(''); }}>+ New Notification</Button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {showForm && (
        <form onSubmit={submit} className="card p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Type *</label>
            <input required value={form.type} onChange={(e) => set('type', e.target.value)} className="form-input w-full" placeholder="e.g. INVOICE_ISSUED, PAYMENT_RECEIVED" />
          </div>
          <div>
            <label className="form-label">Channel</label>
            <select value={form.channel} onChange={(e) => set('channel', e.target.value)} className="form-select w-full">{CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="form-label">Client</label>
            <select value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="form-select w-full">
              <option value="">None</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Recipient Email</label>
            <input type="email" value={form.recipientEmail} onChange={(e) => set('recipientEmail', e.target.value)} className="form-input w-full" placeholder="client@example.com" />
          </div>
          <div>
            <label className="form-label">Subject</label>
            <input value={form.subject} onChange={(e) => set('subject', e.target.value)} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Scheduled For</label>
            <input type="date" value={form.scheduledFor} onChange={(e) => set('scheduledFor', e.target.value)} className="form-input w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Message</label>
            <textarea value={form.message} onChange={(e) => set('message', e.target.value)} rows={2} className="form-input w-full" />
          </div>
          <div className="sm:col-span-2 flex gap-3"><Button type="submit" loading={saving}>Create Notification</Button><button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button></div>
        </form>
      )}

      <Table>
        <thead><tr><Th>Type</Th><Th>Channel</Th><Th>Recipient</Th><Th>Status</Th><Th>Created</Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={5} /> :
           !items.length ? <EmptyRow colSpan={5} message="No billing notifications" /> :
           items.map((n) => (
             <tr key={n.id}>
               <Td className="text-gray-900 text-sm">{n.type ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{n.channel ?? '—'}</Td>
               <Td className="text-gray-600 text-sm">{n.recipientEmail ?? '—'}</Td>
               <Td>{n.status ? <StatusBadge status={n.status} /> : '—'}</Td>
               <Td className="text-xs text-gray-500">{n.createdAt ? formatDate(n.createdAt) : '—'}</Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
