'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import Link from 'next/link';
type Subscription = { plan: string; status: string; currentPeriodEnd?: string; amount?: number; currency?: string; features?: string[] };
export default function BillingSettingsPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<any>('/tenant/subscription').then((r) => setSub(r.data ?? r)).catch(() => setSub(null)).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><CreditCard className="h-6 w-6 text-green-600" /> Billing & Subscription</h1><p className="text-sm text-gray-500">Your plan, usage, and payment details</p></div>
      </div>
      {loading ? <div className="text-center py-8 text-sm text-gray-400">Loading…</div> :
       !sub ? (
        <div className="card p-6 text-center text-gray-400 text-sm">No active subscription found. Contact Global Wakili support to activate your plan.</div>
       ) : (
        <div className="space-y-4">
          <div className="card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Current Plan</h2>
              <span className="badge-blue">{sub.plan}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-green-700">Active</span>
              {sub.currentPeriodEnd && <span className="text-gray-500">· Renews {formatDate(sub.currentPeriodEnd)}</span>}
            </div>
            {sub.amount && <p className="text-2xl font-bold text-gray-900">{formatCurrency(sub.amount, sub.currency ?? 'KES')}<span className="text-sm font-normal text-gray-500"> / month</span></p>}
          </div>
          {sub.features?.length && (
            <div className="card p-5 space-y-2">
              <h3 className="font-semibold text-gray-900 text-sm">Included Features</h3>
              {sub.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-gray-700"><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />{f}</div>
              ))}
            </div>
          )}
          <div className="card p-4 text-center"><p className="text-sm text-gray-500 mb-3">Need to upgrade or change your plan?</p><a href="mailto:billing@globalwakili.co.ke" className="text-primary-600 hover:underline text-sm">Contact Billing Support</a></div>
        </div>
       )}
    </div>
  );
}
