'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings, Bell, Shield, Globe, CreditCard, Users } from 'lucide-react';

const SETTINGS_SECTIONS = [
  { icon: <Users className="h-5 w-5" />, title: 'Users & Roles', desc: 'Manage staff access and permissions', href: '/app/settings/users' },
  { icon: <Bell className="h-5 w-5" />, title: 'Notifications', desc: 'Configure notification channels and preferences', href: '/app/settings/notifications' },
  { icon: <Shield className="h-5 w-5" />, title: 'Security', desc: 'Password policy, MFA, session management', href: '/app/settings/security' },
  { icon: <Globe className="h-5 w-5" />, title: 'Integrations', desc: 'eTIMS, M-PESA, QuickBooks, Zoho, Calendar', href: '/app/settings/integrations' },
  { icon: <CreditCard className="h-5 w-5" />, title: 'Billing & Subscription', desc: 'Plan details, usage, invoices', href: '/app/settings/billing' },
  { icon: <Settings className="h-5 w-5" />, title: 'Firm Settings', desc: 'Name, logo, KRA PIN, eTIMS ID', href: '/app/settings/firm' },
];

export default function SettingsPage() {
  const { user } = useAuth();

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
          <Input label="Full Name" defaultValue={user?.name ?? ''} />
          <Input label="Email Address" type="email" defaultValue={user?.email ?? ''} disabled />
          <Input label="Role" defaultValue={user?.role ?? ''} disabled />
          <Button variant="secondary" size="sm">Save Profile</Button>
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
