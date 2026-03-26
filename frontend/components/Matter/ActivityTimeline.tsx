// frontend/components/Matter/ActivityTimeline.tsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface LogEntry {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: { name: string; role: string };
}

export const ActivityTimeline = ({ logs }: { logs: LogEntry[] }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
        Matter Audit Trail
      </h3>

      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {logs.map((log) => (
          <div key={log.id} className="relative flex items-start gap-4">
            {/* The Dot */}
            <div className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 shadow-sm z-10">
              <span className="text-xs">⚖️</span>
            </div>

            <div className="ml-12">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-900">{log.user.name}</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {log.user.role}
                </span>
              </div>
              <p className="text-sm text-slate-700 font-medium">{log.action}</p>
              {log.details && (
                <p className="text-xs text-slate-500 mt-1 italic">"{log.details}"</p>
              )}
              <time className="text-[10px] text-slate-400 mt-2 block">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};