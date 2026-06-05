'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatCard } from '@/components/ui/Card';
import { Scale, Plus, ArrowUpRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

type TrustAccount = { id: string; accountName: string; accountNumber: string; bankName: string; currentBalance: string; reconciliationBalance: string; isActive: boolean; lastReconciled?: string | null };
type TrustTransaction = { id: string; reference: string; description: string; transactionType: string; credit: string; debit: string; transactionDate: string; isReconciled: boolean; client?: { name: string } | null; matter?: { matterCode: string } | null };
type ClientLedger = { clientId: string; clientName: string; balance: string; lastActivity?: string };

type Tab = 'accounts' | 'transactions' | 'ledger' | 'reconcile';

export default function TrustPage() {
  const [tab, setTab]               = useState<Tab>('accounts');
  const [accounts, setAccounts]     = useState<TrustAccount[]>([]);
  const [transactions, setTxns]     = useState<TrustTransaction[]>([]);
  const [ledger, setLedger]         = useState<ClientLedger[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedAccount, setSelAcc] = useState('');
  const [running3Way, setRunning3Way] = useState(false);
  const [reconResult, setReconResult] = useState<{ status: string; bankBalance: string; trustLiability: string; clientLedgerTotal: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    if (tab === 'accounts') {
      // Trust overview returns { dashboard: { accounts: [...] }, recentTransactions: [...] }
      api.get<any>('/trust/overview')
        .then((r) => setAccounts(r.dashboard?.accounts ?? []))
        .catch(() => setAccounts([])).finally(() => setLoading(false));
    } else if (tab === 'transactions') {
      const p = new URLSearchParams();
      if (selectedAccount) p.set('trustAccountId', selectedAccount);
      p.set('limit', '100');
      api.get<{ data: TrustTransaction[] }>(`/trust/transactions?${p}`)
        .then((r) => setTxns(r.data ?? [])).catch(() => setTxns([])).finally(() => setLoading(false));
    } else if (tab === 'ledger') {
      api.get<any>('/trust/overview')
        .then((r) => setLedger(r.dashboard?.clientLedgers ?? []))
        .catch(() => setLedger([])).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [tab, selectedAccount]);

  const runThreeWay = async () => {
    setRunning3Way(true);
    try {
      const result = await api.post<any>('/trust/reconciliations/three-way', {
        trustAccountId: selectedAccount || accounts[0]?.id,
      });
      setReconResult(result.data ?? result);
    } catch {
      setReconResult(null);
    } finally {
      setRunning3Way(false);
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.currentBalance || '0'), 0);
  const unreconciledTxns = transactions.filter((t) => !t.isReconciled).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trust Accounting</h1>
          <p className="text-sm text-gray-500">Client trust accounts, ledgers, transactions, and three-way reconciliation</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setTab('reconcile')}>
            <RefreshCw className="h-4 w-4" /> 3-Way Reconciliation
          </Button>
          <Link href="/app/trust/deposit">
            <Button size="sm"><Plus className="h-4 w-4" /> New Deposit</Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Trust Balance" value={formatCurrency(totalBalance)} icon={<Scale className="h-5 w-5" />} />
        <StatCard label="Active Accounts" value={accounts.filter((a) => a.isActive).length} icon={<CheckCircle className="h-5 w-5" />} />
        <StatCard label="Unreconciled" value={unreconciledTxns} icon={<AlertCircle className="h-5 w-5" />} deltaType={unreconciledTxns > 0 ? 'down' : 'neutral'} />
        <StatCard label="Accounts" value={accounts.length} icon={<ArrowUpRight className="h-5 w-5" />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {([
          { key: 'accounts',     label: 'Trust Accounts' },
          { key: 'transactions', label: 'Transactions' },
          { key: 'ledger',       label: 'Client Ledger' },
          { key: 'reconcile',    label: '3-Way Reconciliation' },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Trust Accounts */}
      {tab === 'accounts' && (
        <Table>
          <thead><tr><Th>Account Name</Th><Th>Account No.</Th><Th>Bank</Th><Th>Balance</Th><Th>Recon Balance</Th><Th>Status</Th><Th>Last Reconciled</Th></tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
             !accounts.length ? <EmptyRow colSpan={7} message="No trust accounts. Seed data or add via settings." /> :
             accounts.map((a) => (
               <tr key={a.id} className={!a.isActive ? 'opacity-60' : ''}>
                 <Td className="font-medium text-gray-900">{a.accountName}</Td>
                 <Td><span className="font-mono text-xs">{a.accountNumber}</span></Td>
                 <Td className="text-sm text-gray-600">{a.bankName}</Td>
                 <Td className={`font-bold ${parseFloat(a.currentBalance) < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(a.currentBalance)}</Td>
                 <Td className="text-gray-600">{formatCurrency(a.reconciliationBalance)}</Td>
                 <Td><StatusBadge status={a.isActive ? 'ACTIVE' : 'INACTIVE'} /></Td>
                 <Td className="text-xs text-gray-500">{a.lastReconciled ? formatDate(a.lastReconciled) : 'Never'}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <>
          <div className="flex gap-3">
            <select value={selectedAccount} onChange={(e) => setSelAcc(e.target.value)} className="form-select w-64">
              <option value="">All Trust Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
          </div>
          <Table>
            <thead><tr><Th>Reference</Th><Th>Client</Th><Th>Matter</Th><Th>Type</Th><Th>Credit</Th><Th>Debit</Th><Th>Date</Th><Th>Reconciled</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={8} /> :
               !transactions.length ? <EmptyRow colSpan={8} message="No trust transactions" /> :
               transactions.map((t) => (
                 <tr key={t.id}>
                   <Td><span className="font-mono text-xs">{t.reference}</span></Td>
                   <Td className="text-sm text-gray-900">{t.client?.name ?? '—'}</Td>
                   <Td className="text-xs text-gray-500">{t.matter?.matterCode ?? '—'}</Td>
                   <Td>
                     <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                       t.transactionType === 'DEPOSIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                     }`}>{t.transactionType?.replace(/_/g,' ')}</span>
                   </Td>
                   <Td className="text-green-700 font-medium">{parseFloat(t.credit) > 0 ? formatCurrency(t.credit) : '—'}</Td>
                   <Td className="text-red-700 font-medium">{parseFloat(t.debit) > 0 ? formatCurrency(t.debit) : '—'}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(t.transactionDate)}</Td>
                   <Td>
                     {t.isReconciled
                       ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Yes</span>
                       : <span className="text-amber-600 text-xs">Pending</span>}
                   </Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </>
      )}

      {/* Client Ledger */}
      {tab === 'ledger' && (
        <Table>
          <thead><tr><Th>Client</Th><Th>Trust Balance</Th><Th>Last Activity</Th></tr></thead>
          <tbody>
            {loading ? <LoadingRow colSpan={3} /> :
             !ledger.length ? <EmptyRow colSpan={3} message="No client ledger entries" /> :
             ledger.map((l) => (
               <tr key={l.clientId}>
                 <Td className="font-medium text-gray-900">{l.clientName}</Td>
                 <Td className={`font-bold ${parseFloat(l.balance) < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(l.balance)}</Td>
                 <Td className="text-xs text-gray-500">{l.lastActivity ? formatDate(l.lastActivity) : '—'}</Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Three-Way Reconciliation */}
      {tab === 'reconcile' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
            <h2 className="font-semibold text-blue-900">Three-Way Trust Reconciliation</h2>
            <p className="text-sm text-blue-700">
              Verifies: <strong>Bank Balance</strong> = <strong>Trust Ledger</strong> = <strong>Sum of Client Ledgers</strong>
            </p>
            <div className="flex items-center gap-3">
              <select value={selectedAccount} onChange={(e) => setSelAcc(e.target.value)} className="form-select w-72">
                <option value="">Select trust account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
              </select>
              <Button onClick={runThreeWay} loading={running3Way} variant="secondary">
                <RefreshCw className="h-4 w-4" /> Run Reconciliation
              </Button>
            </div>
          </div>

          {reconResult && (
            <div className={`rounded-xl border p-5 space-y-4 ${reconResult.status === 'BALANCED' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-center gap-2">
                {reconResult.status === 'BALANCED'
                  ? <CheckCircle className="h-5 w-5 text-green-600" />
                  : <AlertCircle className="h-5 w-5 text-red-600" />}
                <h3 className={`font-bold ${reconResult.status === 'BALANCED' ? 'text-green-900' : 'text-red-900'}`}>
                  {reconResult.status === 'BALANCED' ? '✅ Reconciliation Balanced' : '❌ Reconciliation Imbalanced'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Bank Statement Balance', value: reconResult.bankBalance },
                  { label: 'Trust Account Ledger', value: reconResult.trustLiability },
                  { label: 'Sum of Client Ledgers', value: reconResult.clientLedgerTotal },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-white border p-3">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Trust Accounting Rules (LSK Guidelines)</h3>
            <div className="space-y-1 text-xs text-gray-600">
              {[
                'No client trust funds may be used for firm operating expenses',
                'Each client must have a separate ledger entry',
                'No negative client trust balances are permitted',
                'Monthly three-way reconciliation is required under LSK rules',
                'All trust receipts must be banked on the day of receipt',
                'Transfers to office account require written client authority',
                'Unclaimed trust funds must be reported after 6 months',
              ].map((rule) => <p key={rule}>✓ {rule}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
