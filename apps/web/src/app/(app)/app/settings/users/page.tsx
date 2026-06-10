'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api, type ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Users, Plus, Search, ArrowLeft, X, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type User = { id: string; name: string; email: string; tenantRole?: string; status: string; lastLoginAt?: string; createdAt: string };
type Role = { id: string; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const loadUsers = () =>
    api.get<{ data: User[] }>('/users?limit=100').then((r) => setUsers(r.data ?? [])).catch(() => setUsers([])).finally(() => setLoading(false));

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter((u) => !query || u.name?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="h-6 w-6 text-primary-600" /> Users &amp; Roles</h1><p className="text-sm text-gray-500">Manage firm staff access and role assignments</p></div>
          <Button size="sm" onClick={() => setShowInvite(true)}><Plus className="h-4 w-4" /> Invite User</Button>
        </div>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="search" placeholder="Search users…" value={query} onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" /></div>
      <Table>
        <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Last Login</Th><Th>Since</Th><Th></Th></tr></thead>
        <tbody>
          {loading ? <LoadingRow colSpan={7} /> : !filtered.length ? <EmptyRow colSpan={7} message="No users found" /> :
           filtered.map((u) => (
             <tr key={u.id}>
               <Td className="font-medium text-gray-900">{u.name ?? '—'}</Td>
               <Td className="text-sm text-gray-600">{u.email}</Td>
               <Td><span className="badge-blue text-xs">{u.tenantRole ?? 'STAFF'}</span></Td>
               <Td><StatusBadge status={u.status} /></Td>
               <Td className="text-xs text-gray-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</Td>
               <Td className="text-xs text-gray-500">{formatDate(u.createdAt)}</Td>
               <Td><button className="text-xs text-primary-600 hover:underline">Edit</button></Td>
             </tr>
           ))}
        </tbody>
      </Table>

      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} onCreated={loadUsers} />}
    </div>
  );
}

function InviteUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({ name: '', email: '', roleName: '', password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get<{ data: Role[] }>('/roles').then((r) => setRoles(r.data ?? [])).catch(() => setRoles([]));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.roleName) { setError('Name, email and role are required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await api.post('/users', { name: form.name.trim(), email: form.email.trim(), password: form.password, roleName: form.roleName });
      setSuccess(true);
      onCreated();
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-semibold text-gray-900">Invite User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {success ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>User created successfully. Share the temporary password securely with the new user.</span>
            </div>
            <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="form-label">Full Name *</label>
              <input className="form-input w-full" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Jane Wanjiru" required />
            </div>
            <div>
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input w-full" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@lawfirm.co.ke" required />
            </div>
            <div>
              <label className="form-label">Role *</label>
              <select className="form-select w-full" value={form.roleName} onChange={(e) => set('roleName', e.target.value)} required>
                <option value="">{roles.length ? 'Select role…' : 'Loading roles…'}</option>
                {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Temporary Password *</label>
              <input type="password" className="form-input w-full" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 characters" required />
            </div>
            <div>
              <label className="form-label">Confirm Password *</label>
              <input type="password" className="form-input w-full" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={submitting}>Create User</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
