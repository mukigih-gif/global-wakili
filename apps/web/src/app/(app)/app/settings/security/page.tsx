'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

export default function SecurityPage() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) { setErr('Passwords do not match'); return; }
    if (form.newPassword.length < 8) { setErr('Password must be at least 8 characters'); return; }
    setErr(''); setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMsg('Password changed successfully.'); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Shield className="h-6 w-6 text-primary-600" /> Security</h1><p className="text-sm text-gray-500">Password, MFA, and session management</p></div>
      </div>

      {/* Change Password */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Lock className="h-4 w-4 text-primary-600" /> Change Password</h2>
        {msg && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{err}</div>}
        <form onSubmit={changePassword} className="space-y-3">
          <div className="relative">
            <Input label="Current Password" type={showCurrent ? 'text' : 'password'} required value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 bottom-2.5 text-gray-400"><Eye className="h-4 w-4" /></button>
          </div>
          <div className="relative">
            <Input label="New Password" type={showNew ? 'text' : 'password'} required value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} placeholder="Min. 8 characters" />
            <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 bottom-2.5 text-gray-400"><Eye className="h-4 w-4" /></button>
          </div>
          <Input label="Confirm New Password" type="password" required value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
          <Button type="submit" loading={loading} size="sm">Update Password</Button>
        </form>
      </div>

      {/* MFA */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Key className="h-4 w-4 text-purple-600" /> Multi-Factor Authentication</h2>
        <p className="text-sm text-gray-500">Add an extra layer of security to your account using an authenticator app.</p>
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">MFA is currently optional. Platform administrators can enforce MFA for all users in the firm.</div>
        <Button size="sm" variant="secondary">Enable Authenticator App</Button>
      </div>

      {/* Sessions */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Shield className="h-4 w-4 text-red-600" /> Active Sessions</h2>
        <p className="text-sm text-gray-500">JWT sessions expire after 2 hours. You can sign out from all sessions below.</p>
        <Button size="sm" variant="danger">Sign Out All Sessions</Button>
      </div>
    </div>
  );
}
