'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scale } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL || '';

function resolvePortal(isSuperAdmin: boolean, role: string): string {
  if (isSuperAdmin) return '/admin/dashboard';
  if (role?.toUpperCase() === 'CLIENT') return '/portal/dashboard';
  return '/app/dashboard';
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#F25022" d="M11.5 11.5H0V0h11.5z"/>
      <path fill="#7FBA00" d="M24 11.5H12.5V0H24z"/>
      <path fill="#00A4EF" d="M11.5 24H0V12.5h11.5z"/>
      <path fill="#FFB900" d="M24 24H12.5V12.5H24z"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(params.get('error') === 'oauth_failed' ? 'Sign-in failed. No account linked to your Google/Microsoft email.' : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, tenantId || undefined);
      const role = sessionStorage.getItem('gw_role') || '';
      const isSuperAdmin = user?.isSuperAdmin ?? (role === 'SUPER_ADMIN' || role === 'SYSTEM_ADMIN');
      router.replace(resolvePortal(isSuperAdmin, role));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const oauthRedirectBase = `${APP_URL}/auth/oauth/complete`;

  const handleGoogleLogin = () => {
    const callbackUrl = `${API_BASE.replace('/api', '')}/api/v1/auth/oauth/google/callback`;
    const url = `${API_BASE.replace('/api', '')}/api/v1/auth/oauth/google?redirect_uri=${encodeURIComponent(callbackUrl)}${tenantId ? `&tenant_id=${encodeURIComponent(tenantId)}` : ''}`;
    window.location.href = url;
  };

  const handleMicrosoftLogin = () => {
    const callbackUrl = `${API_BASE.replace('/api', '')}/api/v1/auth/oauth/microsoft/callback`;
    const url = `${API_BASE.replace('/api', '')}/api/v1/auth/oauth/microsoft?redirect_uri=${encodeURIComponent(callbackUrl)}${tenantId ? `&tenant_id=${encodeURIComponent(tenantId)}` : ''}`;
    window.location.href = url;
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

          {/* Social login — single window (Google + Microsoft) */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              onClick={handleMicrosoftLogin}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <MicrosoftIcon />
              Continue with Microsoft
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">or sign in with email</span></div>
          </div>

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

          <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
            <span>Global Wakili · Kenya · Enterprise Grade</span>
            <div className="flex gap-3">
              <a href="/legal/terms" className="hover:text-gray-600">Terms</a>
              <a href="/legal/privacy" className="hover:text-gray-600">Privacy</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
