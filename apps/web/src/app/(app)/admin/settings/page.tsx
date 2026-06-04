'use client';
export const dynamic = 'force-dynamic';
import { Settings, Globe, Bell, Shield, Database } from 'lucide-react';
import Link from 'next/link';
export default function PlatformSettingsPage() {
  const sections = [
    { label: 'Platform Branding', icon: <Globe className="h-5 w-5 icon-legal" />, desc: 'Logo, colours, platform name and domain configuration.', href: '#' },
    { label: 'Email & Notifications', icon: <Bell className="h-5 w-5 icon-tasks" />, desc: 'SMTP/SendGrid configuration, notification templates.', href: '/app/settings/integrations' },
    { label: 'Security Policies', icon: <Shield className="h-5 w-5 icon-danger" />, desc: 'Password policy, session timeout, MFA enforcement.', href: '/admin/security' },
    { label: 'Database & Backups', icon: <Database className="h-5 w-5 icon-finance" />, desc: 'Neon DB configuration, backup schedule, retention policy.', href: '#' },
  ];
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="h-6 w-6 icon-neutral" /> Platform Settings</h1><p className="text-sm text-gray-500">Global platform configuration — affects all tenants</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 mb-2">{s.icon}<h3 className="font-semibold text-gray-900 group-hover:text-primary-700">{s.label}</h3></div>
            <p className="text-xs text-gray-500">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
