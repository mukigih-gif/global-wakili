'use client';
export const dynamic = 'force-dynamic';
import { ArrowLeft, Globe, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const INTEGRATIONS = [
  { name: 'Google Calendar', key: 'google_calendar', status: 'NOT_CONNECTED', desc: 'Sync firm calendar events with Google Calendar. Requires Google OAuth credentials.', setupUrl: 'https://console.cloud.google.com', color: 'text-red-500' },
  { name: 'Microsoft Outlook', key: 'outlook', status: 'NOT_CONNECTED', desc: 'Sync calendar and emails via Microsoft Graph API.', setupUrl: 'https://portal.azure.com', color: 'text-blue-500' },
  { name: 'SendGrid Email', key: 'sendgrid', status: 'SIMULATED', desc: 'Email delivery for notifications and client communications. Set SENDGRID_API_KEY on Render.', setupUrl: 'https://sendgrid.com', color: 'text-green-500' },
  { name: 'M-PESA (Daraja)', key: 'mpesa', status: 'NOT_CONNECTED', desc: 'STK Push payment collection from clients via Safaricom Daraja API.', setupUrl: 'https://developer.safaricom.co.ke', color: 'text-green-700' },
  { name: 'KRA eTIMS', key: 'etims', status: 'NOT_CONNECTED', desc: 'Electronic Tax Invoice Management System for invoice fiscalization.', setupUrl: 'https://www.kra.go.ke', color: 'text-red-700' },
  { name: 'QuickBooks', key: 'quickbooks', status: 'NOT_CONNECTED', desc: 'Sync invoices and payments with QuickBooks Online.', setupUrl: 'https://developer.intuit.com', color: 'text-blue-600' },
  { name: 'Africa\'s Talking', key: 'at_sms', status: 'NOT_CONNECTED', desc: 'SMS notifications via Africa\'s Talking gateway.', setupUrl: 'https://africastalking.com', color: 'text-orange-500' },
  { name: 'Firebase (Push)', key: 'fcm', status: 'NOT_CONNECTED', desc: 'Mobile push notifications via Firebase Cloud Messaging.', setupUrl: 'https://firebase.google.com', color: 'text-amber-500' },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  CONNECTED:     { icon: <CheckCircle className="h-4 w-4" />, label: 'Connected',  color: 'text-green-700 bg-green-50 border-green-200' },
  SIMULATED:     { icon: <AlertCircle className="h-4 w-4" />, label: 'Simulation', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  NOT_CONNECTED: { icon: <AlertCircle className="h-4 w-4" />, label: 'Not set up', color: 'text-gray-500 bg-gray-50 border-gray-200' },
};

export default function IntegrationsPage() {
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Globe className="h-6 w-6 text-primary-600" /> Integrations</h1>
          <p className="text-sm text-gray-500">Connect external services — set credentials on Render for API-based integrations</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {INTEGRATIONS.map((intg) => {
          const cfg = STATUS_CONFIG[intg.status] ?? STATUS_CONFIG.NOT_CONNECTED;
          return (
            <div key={intg.key} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{intg.name}</h3>
                <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full border px-2 py-0.5 ${cfg.color}`}>
                  {cfg.icon}{cfg.label}
                </span>
              </div>
              <p className="text-xs text-gray-500">{intg.desc}</p>
              <div className="flex gap-2 mt-auto">
                {intg.status === 'CONNECTED'
                  ? <Button size="sm" variant="danger">Disconnect</Button>
                  : <Button size="sm" variant="secondary">Configure</Button>
                }
                <a href={intg.setupUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline px-2">
                  <ExternalLink className="h-3.5 w-3.5" /> Docs
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
