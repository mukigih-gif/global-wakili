'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setSession } from '@/lib/api';

/**
 * OAuth completion page.
 * The backend redirects here after Google/Microsoft login with:
 *   ?token=<jwt>&tenantId=<id>&role=<role>&redirect=<path>
 *
 * This page stores the session and routes to the correct portal.
 */
export default function OAuthCompletePage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token    = params.get('token');
    const tenantId = params.get('tenantId') ?? '';
    const role     = params.get('role') ?? '';
    const redirect = params.get('redirect') ?? '/app/dashboard';

    if (!token) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    setSession(token, tenantId, role);
    router.replace(redirect);
  }, [params, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto mb-4" />
        <p className="text-sm text-gray-500">Completing sign-in…</p>
      </div>
    </div>
  );
}
