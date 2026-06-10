'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
    } catch {
      // Endpoint always succeeds server-side; never reveal existence — ignore errors.
    } finally {
      setLoading(false);
      setSent(true);
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Forgot your password?</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your email and we&apos;ll send a reset link.</p>
          {sent ? (
            <div className="space-y-5">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                If an account exists a reset link has been sent. Check your email — the link expires in 1 hour.
              </div>
              <Link href="/login" className="text-sm text-primary-600 hover:underline">← Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input label="Email address" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@lawfirm.co.ke" />
              <Button type="submit" className="w-full" loading={loading} size="lg">Send reset link</Button>
              <Link href="/login" className="block text-center text-sm text-primary-600 hover:underline">← Back to sign in</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
