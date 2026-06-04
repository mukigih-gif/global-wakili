'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function VendorsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/app/procurement'); }, [router]);
  return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Redirecting to Procurement…</div>;
}
