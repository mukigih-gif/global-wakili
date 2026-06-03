'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  Shield, UserCheck, BarChart2, Brain, Bell, Settings,
  Building, LogOut, CheckSquare, Gavel, Award, ExternalLink, Scale,
  CalendarDays, PhoneCall, ShoppingCart, Receipt, MessageSquare, Globe,
  GitBranch, Clock,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
  module?: string;
};

const TENANT_NAV: NavItem[] = [
  { href: '/app/dashboard',      label: 'Dashboard',        icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/app/calendar',       label: 'Calendar',         icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/app/clients',        label: 'Clients',          icon: <Users className="h-4 w-4" /> },
  { href: '/app/matters',        label: 'Matters',          icon: <Briefcase className="h-4 w-4" /> },
  { href: '/app/documents',      label: 'Documents',        icon: <FileText className="h-4 w-4" /> },
  { href: '/app/tasks',          label: 'Tasks',            icon: <CheckSquare className="h-4 w-4" /> },
  { href: '/app/workflows',      label: 'Workflows',        icon: <GitBranch className="h-4 w-4" /> },
  { href: '/app/time-capture',   label: 'Time Capture',     icon: <Clock className="h-4 w-4" /> },
  { href: '/app/billing',        label: 'Billing',          icon: <Receipt className="h-4 w-4" />, module: 'billing' },
  { href: '/app/finance',        label: 'Finance',          icon: <DollarSign className="h-4 w-4" />, module: 'finance' },
  { href: '/app/trust',          label: 'Trust Accounting', icon: <Scale className="h-4 w-4" />, module: 'trust' },
  { href: '/app/hr',             label: 'HR & Payroll',     icon: <UserCheck className="h-4 w-4" />, module: 'payroll' },
  { href: '/app/analytics',      label: 'Analytics',        icon: <BarChart2 className="h-4 w-4" />, module: 'analytics' },
  { href: '/app/reports',        label: 'Reports',          icon: <Globe className="h-4 w-4" /> },
  { href: '/app/ai',             label: 'AI Platform',      icon: <Brain className="h-4 w-4" />, module: 'ai' },
  { href: '/app/court/filings',  label: 'Court Filings',    icon: <Gavel className="h-4 w-4" /> },
  { href: '/app/tenders',        label: 'Tenders',          icon: <Award className="h-4 w-4" /> },
  { href: '/app/procurement',    label: 'Procurement',      icon: <ShoppingCart className="h-4 w-4" /> },
  { href: '/app/reception',      label: 'Reception',        icon: <PhoneCall className="h-4 w-4" /> },
  { href: '/app/resources',      label: 'Legal Resources',  icon: <ExternalLink className="h-4 w-4" /> },
  { href: '/app/messaging',      label: 'Messages',         icon: <MessageSquare className="h-4 w-4" /> },
  { href: '/app/notifications',  label: 'Notifications',    icon: <Bell className="h-4 w-4" /> },
  { href: '/app/settings',       label: 'Settings',         icon: <Settings className="h-4 w-4" /> },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { href: '/admin/dashboard',    label: 'Overview',         icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/admin/tenants',      label: 'Tenants',          icon: <Building className="h-4 w-4" /> },
  { href: '/admin/subscriptions',label: 'Subscriptions',    icon: <DollarSign className="h-4 w-4" /> },
  { href: '/admin/monitoring',   label: 'Monitoring',       icon: <BarChart2 className="h-4 w-4" /> },
  { href: '/admin/security',     label: 'Security',         icon: <Shield className="h-4 w-4" /> },
  { href: '/admin/settings',     label: 'Platform Settings',icon: <Settings className="h-4 w-4" /> },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      className={active ? 'sidebar-link-active' : 'sidebar-link-inactive'}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin;
  const nav = isSuperAdmin ? SUPER_ADMIN_NAV : TENANT_NAV;

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-100 px-4" style={{ background: 'linear-gradient(135deg, #071529 0%, #1B3A6B 100%)' }}>
        <Logo variant="full" size="sm" href="/app/dashboard" darkBg />
      </div>

      {/* Tenant context */}
      {!isSuperAdmin && user?.tenantName && (
        <div className="border-b border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-500">Firm</p>
          <p className="text-sm font-medium text-gray-800 truncate">{user.tenantName}</p>
        </div>
      )}
      {isSuperAdmin && (
        <div className="border-b border-gray-100 px-4 py-2">
          <span className="badge-purple text-xs">Super Admin</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {nav.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
            {user?.name?.slice(0, 2).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
