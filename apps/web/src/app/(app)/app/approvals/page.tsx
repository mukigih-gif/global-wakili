'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { CheckCircle, XCircle, Clock, AlertCircle, Filter } from 'lucide-react';

type ApprovalRequest = {
  id: string;
  type: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  requestedBy?: { name: string } | null;
  matter?: { title: string; matterCode: string } | null;
  status: string;
  priority: string;
  createdAt: string;
  dueDate?: string | null;
  module: string;
};

const MODULE_COLORS: Record<string, string> = {
  DISBURSEMENT:   'badge-yellow',
  TIME_ENTRY:     'badge-blue',
  PAYROLL:        'badge-purple',
  LEAVE:          'badge-gray',
  INVOICE:        'badge-blue',
  PROCUREMENT:    'badge-yellow',
  TRUST_TRANSFER: 'badge-red',
  WRITE_OFF:      'badge-red',
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'PENDING' | 'ALL'>('PENDING');
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const q = filter === 'PENDING' ? '?status=PENDING&limit=50' : '?limit=50';
    api.get<{ data: ApprovalRequest[] }>(`/approvals/search${q}`)
      .then((r) => setRequests(r.data ?? []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (id: string) => {
    setApproving(id);
    try {
      await api.post(`/approvals/${id}/approve`, { comment: 'Approved' });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'APPROVED' } : r));
    } catch { } finally { setApproving(null); }
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Rejection reason (required):');
    if (!reason) return;
    setRejecting(id);
    try {
      await api.post(`/approvals/${id}/reject`, { comment: reason });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'REJECTED' } : r));
    } catch { } finally { setRejecting(null); }
  };

  const pending   = requests.filter((r) => r.status === 'PENDING').length;
  const approved  = requests.filter((r) => r.status === 'APPROVED').length;
  const rejected  = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500">Disbursements, time entries, leave, payroll, procurement and trust transfers requiring sign-off</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFilter('PENDING')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === 'PENDING' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            Pending ({pending})
          </button>
          <button onClick={() => setFilter('ALL')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === 'ALL' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            All Requests
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1 text-xs text-amber-700"><Clock className="h-3.5 w-3.5" /> Awaiting Approval</div>
          <p className="text-2xl font-bold text-amber-800">{pending}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-1 text-xs text-green-700"><CheckCircle className="h-3.5 w-3.5" /> Approved</div>
          <p className="text-2xl font-bold text-green-800">{approved}</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-1 text-xs text-red-700"><XCircle className="h-3.5 w-3.5" /> Rejected</div>
          <p className="text-2xl font-bold text-red-800">{rejected}</p>
        </div>
      </div>

      {/* Approval matrix info */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800 space-y-1">
        <p className="font-semibold">Approval Authority Matrix:</p>
        <p>• <strong>Disbursements (DRN)</strong> → Partner or Managing Partner</p>
        <p>• <strong>Time Entry Approval</strong> → Partner (cannot self-approve)</p>
        <p>• <strong>Leave Requests</strong> → HR Manager or Managing Partner</p>
        <p>• <strong>Payroll Approval</strong> → Managing Partner + CFO</p>
        <p>• <strong>Trust Transfers</strong> → Managing Partner (client written authority required)</p>
        <p>• <strong>Write-offs</strong> → Managing Partner only</p>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Request</Th>
            <Th>Module</Th>
            <Th>Requested By</Th>
            <Th>Matter</Th>
            <Th>Amount</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Date</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={9} /> :
           !requests.length ? (
             <tr><td colSpan={9} className="px-4 py-10 text-center">
               <div className="space-y-2">
                 <CheckCircle className="h-10 w-10 text-green-200 mx-auto" />
                 <p className="text-sm text-gray-500">{filter === 'PENDING' ? 'No pending approvals — all clear!' : 'No approval requests found'}</p>
               </div>
             </td></tr>
           ) : requests.map((req) => (
             <tr key={req.id} className={req.status === 'PENDING' ? 'bg-amber-50/20' : ''}>
               <Td>
                 <div>
                   <p className="font-medium text-gray-900 text-sm">{req.title}</p>
                   {req.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{req.description}</p>}
                 </div>
               </Td>
               <Td><span className={`badge text-xs ${MODULE_COLORS[req.module] ?? 'badge-gray'}`}>{req.module?.replace(/_/g,' ')}</span></Td>
               <Td className="text-sm text-gray-600">{req.requestedBy?.name ?? '—'}</Td>
               <Td className="text-xs text-gray-500">{req.matter ? `${req.matter.matterCode}` : '—'}</Td>
               <Td className="font-medium">{req.amount ? formatCurrency(req.amount, req.currency ?? 'KES') : '—'}</Td>
               <Td><span className={`text-xs font-semibold ${req.priority === 'URGENT' ? 'text-red-600' : req.priority === 'HIGH' ? 'text-amber-600' : 'text-gray-500'}`}>{req.priority}</span></Td>
               <Td><StatusBadge status={req.status} /></Td>
               <Td className="text-xs text-gray-500">{formatDate(req.createdAt)}</Td>
               <Td>
                 {req.status === 'PENDING' && (
                   <div className="flex gap-1.5">
                     <button
                       onClick={() => approve(req.id)}
                       disabled={approving === req.id}
                       className="flex items-center gap-0.5 text-xs text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                     >
                       <CheckCircle className="h-3.5 w-3.5" /> Approve
                     </button>
                     <span className="text-gray-300">|</span>
                     <button
                       onClick={() => reject(req.id)}
                       disabled={rejecting === req.id}
                       className="flex items-center gap-0.5 text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                     >
                       <XCircle className="h-3.5 w-3.5" /> Reject
                     </button>
                   </div>
                 )}
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>
    </div>
  );
}
