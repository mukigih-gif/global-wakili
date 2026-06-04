'use client';
import { clearSession } from '@/lib/api';
import { useRouter } from 'next/navigation';
// Client portal — accessible to clients with portal activation
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const handleSignOut = () => { clearSession(); router.replace('/login'); };
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">GW</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">Global Wakili — Client Portal</span>
          </div>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-700">Sign out</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
