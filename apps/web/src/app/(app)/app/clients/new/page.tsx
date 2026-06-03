'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', clientType: 'INDIVIDUAL', email: '', phone: '',
    idNumber: '', kraPin: '', address: '', city: 'Nairobi',
    country: 'Kenya', notes: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const client = await api.post<{ id: string }>('/clients', form);
      router.push(`/app/clients/${client.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/clients" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
          <p className="text-sm text-gray-500">Register a new client to the firm</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Client Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Full Name / Company Name *" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. John Doe or Acme Ltd" />
          </div>
          <div>
            <label className="form-label">Client Type *</label>
            <select value={form.clientType} onChange={(e) => set('clientType', e.target.value)} className="form-select w-full">
              <option value="INDIVIDUAL">Individual</option>
              <option value="COMPANY">Company</option>
              <option value="NGO">NGO / Non-Profit</option>
              <option value="GOVERNMENT">Government Entity</option>
              <option value="PARTNERSHIP">Partnership</option>
            </select>
          </div>
          <Input label="Email Address" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="client@email.com" />
          <Input label="Phone Number" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" />
          <Input label="ID Number / Reg. No." value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} placeholder="National ID or Company Reg." />
          <Input label="KRA PIN" value={form.kraPin} onChange={(e) => set('kraPin', e.target.value)} placeholder="P000000000A" />
          <div className="sm:col-span-2">
            <Input label="Physical Address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, building, floor" />
          </div>
          <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <Input label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
          <div className="sm:col-span-2">
            <label className="form-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className="form-input w-full resize-none" placeholder="Any additional notes about this client…" />
          </div>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}>Create Client</Button>
          <Link href="/app/clients"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
