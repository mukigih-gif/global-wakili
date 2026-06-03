'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Shield, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

type TrustAccount = {
  id: string;
  accountName: string;
  accountNumber?: string;
  balance: string;
  status: string;
  lastReconciled?: string;
  variance?: string;
};

type TrustTransaction = {
  id: string;
  type: string;
  amount: string;
  status: string;
  description?: string;
  createdAt: string;
  matter?: { title: string } | null;
};

export default function TrustPage() {
  const [accounts, setAccounts] = useState<TrustAccount[]>([]);
  const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState('0');

  useEffect(() => {
    Promise.all([
      api.get<{ data: TrustAccount[] }>('/trust/accounts?limit=20'),
      api.get<{ data: TrustTransaction[] }>('/trust/transactions?limit=10'),
    ]).then(([acc, txn]) => {
      const accs = acc.data ?? [];
      setAccounts(accs);
      setTransactions(txn.data ?? []);
      const total = accs.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);
      setTotalBalance(total.toFixed(2));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const overdrawn = accounts.filter((a) => parseFloat(a.balance) < 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trust Accounting</h1>
        <p className="text-sm text-gray-500">Client trust funds — Law Society of Kenya compliant</p>
      </div>

      {overdrawn.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {overdrawn.length} trust account{overdrawn.length > 1 ? 's' : ''} overdrawn — regulatory violation. Immediate action required.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Trust Funds" value={formatCurrency(totalBalance)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Trust Accounts" value={accounts.length} icon={<Shield className="h-5 w-5" />} />
        <StatCard label="Overdrawn" value={overdrawn.length} icon={<AlertTriangle className="h-5 w-5" />} deltaType={overdrawn.length > 0 ? 'down' : 'neutral'} />
        <StatCard label="Pending Reconciliation" value={accounts.filter((a) => a.variance && parseFloat(a.variance) !== 0).length} icon={<CheckCircle className="h-5 w-5" />} />
      </div>

      {/* Trust Accounts */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Trust Accounts</h2>
        </div>
        <Table>
          <thead>
            <tr><Th>Account Name</Th><Th>Account No.</Th><Th>Balance</Th><Th>Status</Th><Th>Last Reconciled</Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={5} /> :
             !accounts.length ? <EmptyRow colSpan={5} message="No trust accounts" /> :
             accounts.map((a) => (
               <tr key={a.id}>
                 <Td className="font-medium">{a.accountName}</Td>
                 <Td className="font-mono text-xs text-gray-500">{a.accountNumber ?? '—'}</Td>
                 <Td className={parseFloat(a.balance) < 0 ? 'text-red-600 font-bold' : 'font-medium text-green-700'}>
                   {formatCurrency(a.balance)}
                 </Td>
                 <Td><StatusBadge status={a.status} /></Td>
                 <Td className="text-gray-500 text-xs">{formatDate(a.lastReconciled)}</Td>
               </tr>
             ))
            }
          </tbody>
        </Table>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Recent Trust Transactions</h2>
        </div>
        <Table>
          <thead>
            <tr><Th>Type</Th><Th>Amount</Th><Th>Matter</Th><Th>Description</Th><Th>Status</Th><Th>Date</Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> :
             !transactions.length ? <EmptyRow colSpan={6} message="No recent transactions" /> :
             transactions.map((t) => (
               <tr key={t.id}>
                 <Td className="text-xs font-medium text-gray-600">{t.type.replace(/_/g, ' ')}</Td>
                 <Td className={t.type === 'WITHDRAWAL' || t.type === 'TRANSFER_TO_OFFICE' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                   {t.type === 'WITHDRAWAL' || t.type === 'TRANSFER_TO_OFFICE' ? '-' : '+'}{formatCurrency(t.amount)}
                 </Td>
                 <Td className="text-gray-600 text-xs">{t.matter?.title ?? '—'}</Td>
                 <Td className="text-gray-600 text-xs">{t.description ?? '—'}</Td>
                 <Td><StatusBadge status={t.status} /></Td>
                 <Td className="text-gray-500 text-xs">{formatDate(t.createdAt)}</Td>
               </tr>
             ))
            }
          </tbody>
        </Table>
      </div>
    </div>
  );
}
