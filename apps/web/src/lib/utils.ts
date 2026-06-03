import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'KES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${currency} 0.00`;
  return `${currency} ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(minutes: number): string {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function truncate(str: string, length = 50): string {
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function statusColor(status: string): string {
  const s = status?.toUpperCase();
  if (['ACTIVE', 'APPROVED', 'PAID', 'DELIVERED', 'CLEAN'].includes(s)) return 'badge-green';
  if (['PENDING', 'DRAFT', 'SUBMITTED', 'IN_PROGRESS'].includes(s))     return 'badge-yellow';
  if (['CANCELLED', 'REJECTED', 'FAILED', 'BLOCKED', 'OVERDUE'].includes(s)) return 'badge-red';
  if (['ARCHIVED', 'CLOSED', 'COMPLETED'].includes(s))                   return 'badge-gray';
  if (['TRIAL', 'REVIEW_REQUIRED', 'PARTIALLY_PAID'].includes(s))        return 'badge-blue';
  return 'badge-gray';
}

export function pluralise(count: number, singular: string, plural?: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${plural ?? singular + 's'}`;
}
