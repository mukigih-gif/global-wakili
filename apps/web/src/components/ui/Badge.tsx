import { cn, statusColor } from '@/lib/utils';

type Props = { status: string; label?: string; className?: string };

export function StatusBadge({ status, label, className }: Props) {
  return (
    <span className={cn('badge', statusColor(status), className)}>
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';

export function Badge({ variant = 'gray', children, className }: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(`badge-${variant}`, className)}>{children}</span>
  );
}
