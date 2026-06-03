import { cn } from '@/lib/utils';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card-header', className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card-body', className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  delta,
  deltaType = 'neutral',
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}) {
  const deltaColor = deltaType === 'up' ? 'text-green-600' : deltaType === 'down' ? 'text-red-600' : 'text-gray-500';
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <span className="stat-value">{value}</span>
      {delta && <span className={cn('stat-delta', deltaColor)}>{delta}</span>}
    </div>
  );
}
