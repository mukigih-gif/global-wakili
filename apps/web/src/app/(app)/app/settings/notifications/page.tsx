'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import { ArrowLeft, Bell, Mail, Phone, Monitor } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const CHANNELS = [
  { key: 'in_app',  label: 'In-App',  icon: <Monitor className="h-4 w-4 text-primary-600" />,  desc: 'Notifications shown in the bell icon and notification page.' },
  { key: 'email',   label: 'Email',   icon: <Mail className="h-4 w-4 text-green-600" />,        desc: 'Emailed to your registered address. Requires SMTP/SendGrid setup.' },
  { key: 'sms',     label: 'SMS',     icon: <Phone className="h-4 w-4 text-amber-600" />,       desc: 'SMS to your mobile number. Requires Africa\'s Talking or Twilio.' },
  { key: 'push',    label: 'Push',    icon: <Bell className="h-4 w-4 text-purple-600" />,       desc: 'Mobile push notifications. Requires Firebase Cloud Messaging.' },
];

const EVENTS = [
  { key: 'task_assigned',    label: 'Task Assigned to Me',          channels: { in_app: true,  email: true,  sms: false, push: false } },
  { key: 'task_due',         label: 'Task Due Soon (24h)',           channels: { in_app: true,  email: true,  sms: true,  push: false } },
  { key: 'hearing_reminder', label: 'Court Hearing Reminder',        channels: { in_app: true,  email: true,  sms: true,  push: false } },
  { key: 'invoice_paid',     label: 'Invoice Paid',                  channels: { in_app: true,  email: true,  sms: false, push: false } },
  { key: 'invoice_overdue',  label: 'Invoice Overdue',               channels: { in_app: true,  email: true,  sms: true,  push: false } },
  { key: 'matter_update',    label: 'Matter Status Changed',         channels: { in_app: true,  email: false, sms: false, push: false } },
  { key: 'doc_uploaded',     label: 'Document Uploaded to Matter',   channels: { in_app: true,  email: false, sms: false, push: false } },
  { key: 'trust_deposit',    label: 'Trust Deposit Received',        channels: { in_app: true,  email: true,  sms: false, push: false } },
  { key: 'compliance_due',   label: 'Compliance Date Approaching',   channels: { in_app: true,  email: true,  sms: true,  push: false } },
  { key: 'disbursement_req', label: 'Disbursement Request Pending',  channels: { in_app: true,  email: true,  sms: false, push: false } },
];

export default function NotifSettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, Record<string, boolean>>>(
    Object.fromEntries(EVENTS.map((e) => [e.key, { ...e.channels }]))
  );
  const [saved, setSaved] = useState(false);
  const toggle = (event: string, channel: string) =>
    setPrefs((p) => ({ ...p, [event]: { ...p[event], [channel]: !p[event][channel] } }));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bell className="h-6 w-6 text-primary-600" /> Notification Preferences</h1><p className="text-sm text-gray-500">Choose how you receive notifications for each event type</p></div>
          <Button size="sm" onClick={save}>{saved ? '✓ Saved' : 'Save Preferences'}</Button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Event</th>
                {CHANNELS.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">{c.icon}<span className="text-xs font-medium text-gray-600">{c.label}</span></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {EVENTS.map((event) => (
                <tr key={event.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{event.label}</td>
                  {CHANNELS.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-center">
                      <input type="checkbox" checked={prefs[event.key]?.[c.key] ?? false}
                        onChange={() => toggle(event.key, c.key)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
