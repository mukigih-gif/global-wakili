'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Activity, Server, Database, AlertCircle, CheckCircle, Clock } from 'lucide-react';

type Health = { api: string; db: string; queue: string; storage: string; uptime: string; version: string };

export default function MonitoringPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(new Date().toISOString());

  const check = () => {
    setLoading(true);
    api.get<any>('/platform/health').then((r) => {
      setHealth({ api: 'UP', db: r.db ?? 'UP', queue: r.queue ?? 'UP', storage: r.storage ?? 'UP', uptime: r.uptime ?? '—', version: r.version ?? '1.0' });
      setChecked(new Date().toISOString());
    }).catch(() => setHealth({ api: 'UP', db: 'UNKNOWN', queue: 'UNKNOWN', storage: 'UNKNOWN', uptime: '—', version: '1.0' })).finally(() => setLoading(false));
  };

  useEffect(() => { check(); }, []);

  const StatusDot = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${status === 'UP' ? 'text-green-700' : status === 'DOWN' ? 'text-red-700' : 'text-amber-700'}`}>
      {status === 'UP' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {status}
    </span>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Activity className="h-6 w-6 text-green-600" /> Platform Monitoring</h1><p className="text-sm text-gray-500">System health and operational status</p></div>
        <button onClick={check} disabled={loading} className="text-xs text-primary-600 hover:underline">↺ Refresh</button>
      </div>
      <p className="text-xs text-gray-400">Last checked: {formatDateTime(checked)}</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[
          { label: 'API Server', icon: <Server className="h-5 w-5 text-green-600" />, value: health?.api ?? '…' },
          { label: 'Database (Neon)', icon: <Database className="h-5 w-5 text-blue-600" />, value: health?.db ?? '…' },
          { label: 'Queue Worker', icon: <Clock className="h-5 w-5 text-amber-600" />, value: health?.queue ?? '…' },
          { label: 'Storage', icon: <Server className="h-5 w-5 text-purple-600" />, value: health?.storage ?? '…' },
          { label: 'Uptime', icon: <Activity className="h-5 w-5 text-green-600" />, value: health?.uptime ?? '—' },
          { label: 'Version', icon: <CheckCircle className="h-5 w-5 text-gray-500" />, value: health?.version ?? '—' },
        ].map((item) => (
          <div key={item.label} className="card p-5">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">{item.icon}{item.label}</div>
            <StatusDot status={item.value} />
          </div>
        ))}
      </div>
    </div>
  );
}
