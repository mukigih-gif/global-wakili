'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function resolvePortal(isSuperAdmin: boolean, role: string): string {
  if (isSuperAdmin) return '/admin/dashboard';
  if (role?.toUpperCase() === 'CLIENT') return '/portal/dashboard';
  return '/app/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, tenantId || undefined);
      // Single-window login: route to the correct portal based on resolved user role
      // AuthContext.user is hydrated from /auth/me after login() resolves
      const role = sessionStorage.getItem('gw_role') || '';
      const isSuperAdmin = user?.isSuperAdmin ?? (role === 'SUPER_ADMIN' || role === 'SYSTEM_ADMIN');
      router.replace(resolvePortal(isSuperAdmin, role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Scale className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Global Wakili</h1>
          <p className="text-primary-300 text-sm mt-1">Legal Enterprise Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lawfirm.co.ke"
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="Firm ID (optional)"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="your-firm-id"
            />
            <Button type="submit" className="w-full" loading={loading} size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Global Wakili Legal Enterprise · Kenya · Enterprise Grade
          </p>
        </div>
      </div>
    </div>
  );
}
