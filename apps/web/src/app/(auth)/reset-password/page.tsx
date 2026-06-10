'use client';
export const dynamic = 'force-dynamic';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, type ApiError } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One digit', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function ResetPasswordContent() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allPass = RULES.every((r) => r.test(password));
  const match = password.length > 0 && password === confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) { setError('Invalid reset link.'); return; }
    if (!allPass) { setError('Password does not meet all requirements.'); return; }
    if (!match) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      router.push('/login?reset=success');
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #071529 0%, #0D1F3C 50%, #1B3A6B 100%)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Logo variant="full" size="lg" darkBg />
          </div>
          <div className="gold-accent-line" />
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Set a new password</h2>
          {!token && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              This reset link is invalid or missing a token. <Link href="/forgot-password" className="underline">Request a new one</Link>.
            </div>
          )}
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input w-full" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </div>
            <ul className="space-y-1">
              {RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="font-semibold">{ok ? '✓' : '✗'}</span> {r.label}
                  </li>
                );
              })}
            </ul>
            <div className="space-y-1">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
              {confirm.length > 0 && !match && <p className="text-xs text-red-500">Passwords do not match.</p>}
            </div>
            <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!token || !allPass || !match}>Reset password</Button>
            <Link href="/login" className="block text-center text-sm text-primary-600 hover:underline">← Back to sign in</Link>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordContent /></Suspense>;
}
