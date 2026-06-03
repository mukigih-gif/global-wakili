'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
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

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #071529 0%, #0D1F3C 50%, #1B3A6B 100%)' }}>
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Logo variant="full" size="lg" darkBg />
          </div>
          {/* Gold accent line */}
          <div className="gold-accent-line" />
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
            <div className="space-y-1">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-7 0-1.065.567-2.1 1.54-3.01M6.228 6.228A9.956 9.956 0 0112 5c5.523 0 10 4.477 10 7 0 1.065-.567 2.1-1.54 3.01M6.228 6.228L3 3m3.228 3.228 3.65 3.65M17.772 17.772 21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
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

export default function LoginPage() {
  return <Suspense fallback={null}><LoginPageContent /></Suspense>;
}
