'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import {
  Plus, Search, ShoppingCart, FileText, Users,
  CheckCircle, Clock, AlertCircle, DollarSign, TrendingDown,
} from 'lucide-react';

type PurchaseRequest = {
  id: string;
  prNumber: string;
  title: string;
  requestedBy?: { name: string } | null;
  vendor?: { name: string } | null;
  estimatedAmount: number;
  currency: string;
  status: string;
  priority: string;
  createdAt: string;
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  vendor?: { name: string } | null;
  totalAmount: number;
  currency: string;
  status: string;
  deliveryDate?: string | null;
  createdAt: string;
};

type Vendor = {
  id: string;
  name: string;
  vendorCode?: string | null;
  category?: string | null;
  email?: string | null;
  status: string;
  createdAt: string;
};

type Bill = {
  id: string;
  billNumber: string;
  vendor?: { name: string } | null;
  amount: number;
  currency: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
};

type Tab = 'dashboard' | 'requests' | 'orders' | 'vendors' | 'bills';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard',          icon: <TrendingDown className="h-4 w-4" /> },
  { key: 'requests',  label: 'Purchase Requests',  icon: <FileText className="h-4 w-4" /> },
  { key: 'orders',    label: 'Purchase Orders',    icon: <ShoppingCart className="h-4 w-4" /> },
  { key: 'vendors',   label: 'Vendor Register',    icon: <Users className="h-4 w-4" /> },
  { key: 'bills',     label: 'Bills & Invoices',   icon: <DollarSign className="h-4 w-4" /> },
];

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: 'badge-red',
  HIGH:   'badge-yellow',
  MEDIUM: 'badge-blue',
  LOW:    'badge-gray',
};

export default function ProcurementPage() {
  const [tab, setTab]               = useState<Tab>('dashboard');
  const [requests, setRequests]     = useState<PurchaseRequest[]>([]);
  const [orders, setOrders]         = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors]       = useState<Vendor[]>([]);
  const [bills, setBills]           = useState<Bill[]>([]);
  const [loading, setLoading]       = useState(false);
  const [query, setQuery]           = useState('');
  const [statusFilter, setStatus]   = useState('');

  useEffect(() => {
    if (tab === 'dashboard') {
      // Load summary data for all tabs
      setLoading(true);
      Promise.all([
        api.get<{ data: PurchaseRequest[] }>('/procurement/requests?limit=5').then((r) => setRequests(r.data ?? [])).catch(() => {}),
        api.get<{ data: PurchaseOrder[] }>('/procurement/orders?limit=5').then((r) => setOrders(r.data ?? [])).catch(() => {}),
        api.get<{ data: Bill[] }>('/procurement/bills?limit=5').then((r) => setBills(r.data ?? [])).catch(() => {}),
      ]).finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (statusFilter) params.set('status', statusFilter);

    const endpoints: Record<Tab, string> = {
      dashboard: '',
      requests:  `/procurement/requests?${params}`,
      orders:    `/procurement/orders?${params}`,
      vendors:   `/procurement/vendors?${params}`,
      bills:     `/procurement/bills?${params}`,
    };

    const endpoint = endpoints[tab];
    if (!endpoint) return;

    if (tab === 'requests') {
      api.get<{ data: PurchaseRequest[] }>(endpoint).then((r) => setRequests(r.data ?? [])).catch(() => setRequests([])).finally(() => setLoading(false));
    } else if (tab === 'orders') {
      api.get<{ data: PurchaseOrder[] }>(endpoint).then((r) => setOrders(r.data ?? [])).catch(() => setOrders([])).finally(() => setLoading(false));
    } else if (tab === 'vendors') {
      api.get<{ data: Vendor[] }>(endpoint).then((r) => setVendors(r.data ?? [])).catch(() => setVendors([])).finally(() => setLoading(false));
    } else if (tab === 'bills') {
      api.get<{ data: Bill[] }>(endpoint).then((r) => setBills(r.data ?? [])).catch(() => setBills([])).finally(() => setLoading(false));
    }
  }, [tab, query, statusFilter]);

  const pendingRequests  = requests.filter((r) => r.status === 'PENDING_APPROVAL').length;
  const totalSpend       = bills.filter((b) => b.status === 'PAID').reduce((s, b) => s + b.amount, 0);
  const overdueCount     = bills.filter((b) => b.status === 'OVERDUE').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement</h1>
          <p className="text-sm text-gray-500">Purchase requests, orders, vendor management and bill processing</p>
        </div>
        <div className="flex gap-2">
          {tab === 'requests' && <Button size="sm"><Plus className="h-4 w-4" /> New Request</Button>}
          {tab === 'orders'   && <Button size="sm"><Plus className="h-4 w-4" /> New Order</Button>}
          {tab === 'vendors'  && <Button size="sm"><Plus className="h-4 w-4" /> Add Vendor</Button>}
          {tab === 'bills'    && <Button size="sm"><Plus className="h-4 w-4" /> Record Bill</Button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setQuery(''); setStatus(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Dashboard tab */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-amber-500" /><p className="text-xs text-gray-500">Pending Approvals</p></div>
              <p className="text-2xl font-bold text-amber-600">{pendingRequests}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-500" /><p className="text-xs text-gray-500">Total Spend (Paid)</p></div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-red-500" /><p className="text-xs text-red-600">Overdue Bills</p></div>
              <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-500" /><p className="text-xs text-gray-500">Active Vendors</p></div>
              <p className="text-2xl font-bold text-gray-900">{vendors.filter((v) => v.status === 'ACTIVE').length || '—'}</p>
            </div>
          </div>

          {/* Recent requests and orders side by side */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Purchase Requests</h2>
                <button onClick={() => setTab('requests')} className="text-xs text-primary-600 hover:underline">View all</button>
              </div>
              <Table>
                <thead><tr><Th>PR No.</Th><Th>Title</Th><Th>Amount</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {loading ? <LoadingRow colSpan={4} /> :
                   !requests.length ? <EmptyRow colSpan={4} message="No requests" /> :
                   requests.slice(0, 5).map((r) => (
                     <tr key={r.id}>
                       <Td><span className="font-mono text-xs">{r.prNumber}</span></Td>
                       <Td className="font-medium text-sm text-gray-900 truncate max-w-[120px]">{r.title}</Td>
                       <Td className="text-sm">{r.currency} {r.estimatedAmount.toLocaleString()}</Td>
                       <Td><StatusBadge status={r.status} /></Td>
                     </tr>
                   ))}
                </tbody>
              </Table>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Bills</h2>
                <button onClick={() => setTab('bills')} className="text-xs text-primary-600 hover:underline">View all</button>
              </div>
              <Table>
                <thead><tr><Th>Bill No.</Th><Th>Vendor</Th><Th>Amount</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {loading ? <LoadingRow colSpan={4} /> :
                   !bills.length ? <EmptyRow colSpan={4} message="No bills" /> :
                   bills.slice(0, 5).map((b) => (
                     <tr key={b.id}>
                       <Td><span className="font-mono text-xs">{b.billNumber}</span></Td>
                       <Td className="font-medium text-sm text-gray-900 truncate max-w-[120px]">{b.vendor?.name ?? '—'}</Td>
                       <Td className="text-sm">{b.currency} {b.amount.toLocaleString()}</Td>
                       <Td><StatusBadge status={b.status} /></Td>
                     </tr>
                   ))}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Shared filter bar for list tabs */}
      {tab !== 'dashboard' && (
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder={`Search ${tab}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="form-input pl-9 w-full"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="form-select w-40">
            <option value="">All Statuses</option>
            {tab === 'requests'  && <><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ORDERED">Ordered</option></>}
            {tab === 'orders'    && <><option value="DRAFT">Draft</option><option value="ISSUED">Issued</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></>}
            {tab === 'vendors'   && <><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLACKLISTED">Blacklisted</option></>}
            {tab === 'bills'     && <><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="PAID">Paid</option><option value="OVERDUE">Overdue</option><option value="REJECTED">Rejected</option></>}
          </select>
        </div>
      )}

      {/* Purchase Requests */}
      {tab === 'requests' && (
        <Table>
          <thead>
            <tr><Th>PR No.</Th><Th>Title</Th><Th>Requested By</Th><Th>Vendor</Th><Th>Est. Amount</Th><Th>Priority</Th><Th>Status</Th><Th>Date</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={9} /> :
             !requests.length ? <EmptyRow colSpan={9} message="No purchase requests" /> :
             requests.map((r) => (
               <tr key={r.id}>
                 <Td><span className="font-mono text-xs text-gray-600">{r.prNumber}</span></Td>
                 <Td className="font-medium text-gray-900">{r.title}</Td>
                 <Td className="text-sm text-gray-600">{r.requestedBy?.name ?? '—'}</Td>
                 <Td className="text-sm text-gray-600">{r.vendor?.name ?? '—'}</Td>
                 <Td className="font-medium">{r.currency} {r.estimatedAmount.toLocaleString()}</Td>
                 <Td><span className={`badge ${PRIORITY_BADGE[r.priority] ?? 'badge-gray'}`}>{r.priority}</span></Td>
                 <Td><StatusBadge status={r.status} /></Td>
                 <Td className="text-xs text-gray-500">{formatDate(r.createdAt)}</Td>
                 <Td>
                   {r.status === 'PENDING_APPROVAL' && (
                     <div className="flex gap-2">
                       <button className="text-xs text-green-600 hover:underline flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> Approve</button>
                       <button className="text-xs text-red-500 hover:underline">Reject</button>
                     </div>
                   )}
                 </Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Purchase Orders */}
      {tab === 'orders' && (
        <Table>
          <thead>
            <tr><Th>PO No.</Th><Th>Vendor</Th><Th>Total</Th><Th>Status</Th><Th>Delivery Date</Th><Th>Created</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
             !orders.length ? <EmptyRow colSpan={7} message="No purchase orders" /> :
             orders.map((o) => (
               <tr key={o.id}>
                 <Td><span className="font-mono text-xs text-gray-600">{o.poNumber}</span></Td>
                 <Td className="font-medium text-gray-900">{o.vendor?.name ?? '—'}</Td>
                 <Td className="font-medium text-gray-900">{o.currency} {o.totalAmount.toLocaleString()}</Td>
                 <Td><StatusBadge status={o.status} /></Td>
                 <Td className="text-xs text-gray-500">{o.deliveryDate ? formatDate(o.deliveryDate) : '—'}</Td>
                 <Td className="text-xs text-gray-500">{formatDate(o.createdAt)}</Td>
                 <Td><button className="text-xs text-primary-600 hover:underline">View</button></Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Vendors */}
      {tab === 'vendors' && (
        <Table>
          <thead>
            <tr><Th>Code</Th><Th>Name</Th><Th>Category</Th><Th>Email</Th><Th>Status</Th><Th>Since</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
             !vendors.length ? <EmptyRow colSpan={7} message="No vendors registered" /> :
             vendors.map((v) => (
               <tr key={v.id}>
                 <Td><span className="font-mono text-xs text-gray-600">{v.vendorCode ?? '—'}</span></Td>
                 <Td className="font-medium text-gray-900">{v.name}</Td>
                 <Td className="text-xs text-gray-500">{v.category?.replace(/_/g, ' ') ?? '—'}</Td>
                 <Td className="text-sm text-gray-600">{v.email ?? '—'}</Td>
                 <Td><StatusBadge status={v.status} /></Td>
                 <Td className="text-xs text-gray-500">{formatDate(v.createdAt)}</Td>
                 <Td><button className="text-xs text-primary-600 hover:underline">View</button></Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}

      {/* Bills */}
      {tab === 'bills' && (
        <Table>
          <thead>
            <tr><Th>Bill No.</Th><Th>Vendor</Th><Th>Amount</Th><Th>Status</Th><Th>Due Date</Th><Th>Created</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={7} /> :
             !bills.length ? <EmptyRow colSpan={7} message="No bills recorded" /> :
             bills.map((b) => (
               <tr key={b.id}>
                 <Td><span className="font-mono text-xs text-gray-600">{b.billNumber}</span></Td>
                 <Td className="font-medium text-gray-900">{b.vendor?.name ?? '—'}</Td>
                 <Td className="font-medium text-gray-900">{b.currency} {b.amount.toLocaleString()}</Td>
                 <Td><StatusBadge status={b.status} /></Td>
                 <Td className={`text-xs ${b.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                   {b.dueDate ? formatDate(b.dueDate) : '—'}
                 </Td>
                 <Td className="text-xs text-gray-500">{formatDate(b.createdAt)}</Td>
                 <Td>
                   {b.status === 'APPROVED' && <button className="text-xs text-green-600 hover:underline">Pay</button>}
                   {b.status === 'PENDING' && (
                     <div className="flex gap-2">
                       <button className="text-xs text-green-600 hover:underline">Approve</button>
                       <button className="text-xs text-red-500 hover:underline">Reject</button>
                     </div>
                   )}
                 </Td>
               </tr>
             ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
