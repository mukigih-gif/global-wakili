'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { ArrowLeft, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<{ data: any[] }>('/finance/trust/accounts?limit=50')
      .then((r) => setData(r.data ?? [])).catch(() => setData([])).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/analytics" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Scale className="h-6 w-6 icon-trust" /> Trust Ledger Report</h1><p className="text-sm text-gray-500">Three-way reconciliation summary</p></div>
      </div>
      {loading ? <div className="text-center py-8 text-sm text-gray-400">Loading…</div> :
       !data.length ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-gray-600">No trust ledger data yet. Use the system and data will appear here.</p>
          <Link href="/app/analytics" className="text-xs text-primary-600 hover:underline mt-3 block">Back to Analytics</Link>
        </div>
       ) : (
        <>
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.slice(0,15)} margin={{top:4,right:8,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey={Object.keys(data[0])[0]} tick={{fontSize:10}} />
                <YAxis tick={{fontSize:11}} />
                <Tooltip />
                <Bar dataKey={Object.keys(data[0])[1] || Object.keys(data[0])[0]} fill="#1B3A6B" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <thead><tr>{Object.keys(data[0]).slice(0,6).map((k) => <Th key={k}>{k}</Th>)}</tr></thead>
            <tbody>{data.slice(0,50).map((row, i) => <tr key={i}>{Object.values(row).slice(0,6).map((v: any, j) => <Td key={j} className="text-sm text-gray-700">{String(v ?? '—')}</Td>)}</tr>)}</tbody>
          </Table>
        </>
       )}
    </div>
  );
}