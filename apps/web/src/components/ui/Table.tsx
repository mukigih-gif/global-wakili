import { cn } from '@/lib/utils';

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('table-wrapper', className)}>
      <table>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3', className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3', className)}>{children}</td>;
}

export function EmptyRow({ colSpan, message = 'No records found' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  );
}

export function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-400">
        Loading…
      </td>
    </tr>
  );
}
