'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const role = typeof window !== 'undefined' ? sessionStorage.getItem('gw_role') ?? '' : '';
  const isSuperAdminRole = user?.isSuperAdmin || role === 'SUPER_ADMIN' || role === 'SYSTEM_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isFirmAdmin = user?.role === 'ADMIN' || user?.role === 'FIRM_ADMIN';

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/login');
      // Allow FIRM_ADMIN to access admin panel (tenant-level admin features)
      else if (!isSuperAdminRole && !isFirmAdmin) router.replace('/app/dashboard');
    }
  }, [user, loading, router, isSuperAdminRole, isFirmAdmin]);

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
