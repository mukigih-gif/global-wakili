'use client';
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings, Bell, Shield, Globe, CreditCard, Users, Tag, Check } from 'lucide-react';
import { api } from '@/lib/api';

const SETTINGS_SECTIONS = [
  { icon: <Users className="h-5 w-5" />,    title: 'Users & Roles',        desc: 'Manage staff access and permissions',                          href: '/app/settings/users' },
  { icon: <Bell className="h-5 w-5" />,     title: 'Notifications',        desc: 'Configure notification channels and preferences',               href: '/app/settings/notifications' },
  { icon: <Shield className="h-5 w-5" />,   title: 'Security',             desc: 'Password policy, MFA, session management',                     href: '/app/settings/security' },
  { icon: <Globe className="h-5 w-5" />,    title: 'Integrations',         desc: 'eTIMS, M-PESA, QuickBooks, Zoho, Google / Outlook Calendar',    href: '/app/settings/integrations' },
  { icon: <CreditCard className="h-5 w-5" />, title: 'Billing & Subscription', desc: 'Plan details, usage, invoices',                            href: '/app/settings/billing' },
  { icon: <Settings className="h-5 w-5" />, title: 'Firm Settings',        desc: 'Name, logo, KRA PIN, eTIMS device ID',                         href: '/app/settings/firm' },
  { icon: <Tag className="h-5 w-5" />,      title: 'Custom Labels',        desc: 'Define per-module labels for Tasks, Matters, Clients, Court',  href: '/app/settings/labels' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName]     = useState(user?.name ?? '');
  const [phone, setPhone]   = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const saveProfile = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch(`/users/me`, { name: name.trim() || undefined, phone: phone.trim() || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Firm configuration and system preferences</p>
      </div>

      {/* Profile section */}
      <Card>
        <CardHeader><h2 className="font-semibold">My Profile</h2></CardHeader>
        <CardBody className="space-y-4 max-w-md">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          {saved && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
              <Check className="h-4 w-4" /> Profile saved
            </div>
          )}
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email Address" type="email" defaultValue={user?.email ?? ''} disabled />
          <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000" />
          <Input label="Role" defaultValue={user?.role ?? ''} disabled />
          <Button variant="secondary" size="sm" loading={saving} onClick={saveProfile}>
            Save Profile
          </Button>
        </CardBody>
      </Card>

      {/* Settings grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((s) => (
          <a key={s.title} href={s.href} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-primary-600">{s.icon}</div>
              <h3 className="font-semibold text-gray-900 text-sm group-hover:text-primary-700">{s.title}</h3>
            </div>
            <p className="text-xs text-gray-500">{s.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
