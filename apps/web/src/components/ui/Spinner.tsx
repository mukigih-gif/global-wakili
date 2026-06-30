import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared busy-state indicator (FRONT-009). Use for page/section loads where a
 * consistent spinner is needed; `Button` keeps its own inline loading spinner.
 */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-gray-500" role="status" aria-live="polite">
      <Loader2 className={cn('h-6 w-6 animate-spin text-primary-600', className)} />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );
}

export default Spinner;
