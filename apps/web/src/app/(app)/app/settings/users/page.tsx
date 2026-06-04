'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Users, Plus, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
type User = { id: string; name: string; email: string; tenantRole?: string; status: string; lastLoginAt?: string; createdAt: string };
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    api.get<{ data: User[] }>('/users?limit=100').then((r) => setUsers(r.data ?? [])).catch(() => setUsers([])).finally(() => setLoading(false));
  }, []);
  const filtered = users.filter((u) => !query || u.name?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="h-6 w-6 text-primary-600" /> Users & Roles</h1><p className="text-sm text-gray-500">Manage firm staff access and role assignments</p></div>
          <Button size="sm"><Plus className="h-4 w-4" /> Invite User</Button>
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
    </div>
  );
}
