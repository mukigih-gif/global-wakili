'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Briefcase, AlertTriangle, CheckCircle, Shield, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

type Client = { id: string; name: string; clientCode: string };
type User   = { id: string; name: string; role: string };

// Roles allowed to be assigned to a matter (originators / partners)
const ORIGINATOR_ROLES = ['MANAGING_PARTNER', 'PARTNER', 'FIRM_ADMIN', 'ADMIN'];
const ASSIGNEE_ROLES   = ['MANAGING_PARTNER', 'PARTNER', 'ASSOCIATE', 'PUPIL', 'FIRM_ADMIN', 'ADMIN'];

type ConflictResult = { hasConflict: boolean; conflicts?: Array<{ name: string; matter: string }> };

export default function NewMatterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [clients, setClients]           = useState<Client[]>([]);
  const [lawyers, setLawyers]           = useState<User[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictResult | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const [form, setForm] = useState({
    title: '', matterType: 'GENERAL', category: 'CIVIL',
    clientId: searchParams.get('clientId') ?? '', assignedLawyerId: '', originatorId: '', description: '',
    estimatedValue: '', currency: 'KES',
    commissionRate: '', caseNumber: '',
    openedDate: new Date().toISOString().slice(0, 10),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Client[] }>('/clients?limit=100').then((r) => setClients(r.data ?? [])).catch(() => {});
    api.get<{ data: User[] }>('/users?limit=200').then((r) => setLawyers(r.data ?? [])).catch(() => {});
  }, []);

  const originators = lawyers.filter((l) => ORIGINATOR_ROLES.some((r) => l.role?.toUpperCase().includes(r)));
  const assignees   = lawyers.filter((l) => ASSIGNEE_ROLES.some((r) => l.role?.toUpperCase().includes(r)));

  const runConflictCheck = async () => {
    if (!form.clientId) { setError('Select a client first to run a conflict check'); return; }
    setCheckingConflict(true);
    try {
      const r = await api.post<any>(
        '/matters/conflict-check', { clientId: form.clientId, title: form.title }
      );
      setConflictResult((r?.data ?? r) as ConflictResult);
    } catch {
      setConflictResult(null);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.estimatedValue || parseFloat(form.estimatedValue) <= 0) {
      setError('Estimated value is required and must be greater than 0'); return;
    }
    setError(''); setLoading(true);
    try {
      const matter = await api.post<{ id: string }>('/matters', {
        ...form,
        estimatedValue:   parseFloat(form.estimatedValue),
        commissionRate:   form.commissionRate ? parseFloat(form.commissionRate) : null,
        assignedLawyerId: form.assignedLawyerId   || null,
        originatorId:     form.originatorId        || null,
      });
      const matterId = matter.id ?? (matter as unknown as { matter?: { id: string } }).matter?.id;
      router.push(`/app/matters/${matterId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create matter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/matters" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Matter</h1>
          <p className="text-sm text-gray-500">Open a new legal matter file</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Matter Details */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Matter Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Matter Title *" required value={form.title}
                onChange={(e) => set('title', e.target.value)} placeholder="e.g. Doe v Smith — Land Dispute" />
            </div>
            <div>
              <Input label="Case Number" value={form.caseNumber}
                onChange={(e) => set('caseNumber', e.target.value)} placeholder="e.g. Civil Case No. 123/2024" />
              <p className="text-xs text-gray-400 mt-0.5">Court-assigned case number if already filed</p>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="form-label">Client *</label>
                <Link href="/app/clients/new" className="text-xs text-primary-600 hover:underline">+ Add Client</Link>
              </div>
              <select required value={form.clientId} onChange={(e) => set('clientId', e.target.value)} className="form-select w-full">
                <option value="">{clients.length ? 'Select client…' : 'No clients yet — Add Client →'}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.clientCode ? ` (${c.clientCode})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Matter Type *</label>
              <select required value={form.matterType} onChange={(e) => set('matterType', e.target.value)} className="form-select w-full">
                <option value="GENERAL">General</option>
                <option value="LITIGATION">Litigation</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="CONVEYANCING">Conveyancing</option>
                <option value="PROBATE">Probate & Succession</option>
                <option value="EMPLOYMENT">Employment</option>
                <option value="IP">Intellectual Property</option>
              </select>
            </div>
            <div>
              <label className="form-label">Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="form-select w-full">
                <option value="CIVIL">Civil</option>
                <option value="CRIMINAL">Criminal</option>
                <option value="FAMILY">Family</option>
                <option value="CORPORATE">Corporate</option>
                <option value="LAND">Land & Property</option>
                <option value="CONSTITUTIONAL">Constitutional</option>
                <option value="EMPLOYMENT">Employment</option>
                <option value="TAX">Tax</option>
              </select>
            </div>
            <Input label="Opened Date" type="date" value={form.openedDate}
              onChange={(e) => set('openedDate', e.target.value)}
              max={new Date().toISOString().slice(0,10)} />
            <div className="sm:col-span-2">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                rows={2} className="form-input w-full resize-none" placeholder="Brief description of the matter…" />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Financial</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input label="Estimated Value *" required type="number" min="1" step="100"
                  value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)}
                  placeholder="e.g. 500000" />
                {form.estimatedValue && parseFloat(form.estimatedValue) > 0
                  ? <p className="text-xs font-medium text-gray-600 mt-0.5">{formatCurrency(form.estimatedValue, form.currency)}</p>
                  : <p className="text-xs text-gray-400 mt-0.5">Required. Can be revised at any stage.</p>}
              </div>
              <div className="w-24">
                <label className="form-label">Currency</label>
                <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="form-select w-full">
                  <option value="KES">KES</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div>
              <Input label="Originator Commission %" type="number" min="0" max="100" step="0.5"
                value={form.commissionRate} onChange={(e) => set('commissionRate', e.target.value)}
                placeholder="e.g. 10" />
              <p className="text-xs text-gray-400 mt-0.5">Percentage paid to matter originator on collection</p>
            </div>
          </div>
        </div>

        {/* Originator & Assignment */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Originator & Assignment</h2>
          <p className="text-xs text-gray-500">
            Originator = the partner who brought in the client. Assigned Lawyer = partner/associate handling the matter.
            Assignment is restricted to Managing Partner, Partners, and above.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Matter Originator *</label>
              <select required value={form.originatorId} onChange={(e) => set('originatorId', e.target.value)} className="form-select w-full">
                <option value="">Select originator…</option>
                {originators.length
                  ? originators.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.role})</option>)
                  : lawyers.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.role})</option>)
                }
              </select>
            </div>
            <div>
              <label className="form-label">Assigned Lawyer</label>
              <select value={form.assignedLawyerId} onChange={(e) => set('assignedLawyerId', e.target.value)} className="form-select w-full">
                <option value="">Unassigned</option>
                {assignees.length
                  ? assignees.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.role})</option>)
                  : lawyers.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.role})</option>)
                }
              </select>
            </div>
          </div>
        </div>

        {/* Conflict Check */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-semibold text-gray-900">Conflict of Interest Check</span>
              <span className="text-xs text-gray-400">(Required before opening)</span>
            </div>
            <Button type="button" size="sm" variant="secondary" loading={checkingConflict} onClick={runConflictCheck}>
              Run Check
            </Button>
          </div>
          {conflictResult && (
            conflictResult.hasConflict ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
                  <AlertTriangle className="h-4 w-4" /> Conflict Detected
                </div>
                {conflictResult.conflicts?.map((c, i) => (
                  <p key={i} className="text-xs text-red-600">{c.name} — {c.matter}</p>
                ))}
                <p className="text-xs text-red-500 mt-2">Obtain partner approval and document waiver before proceeding.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle className="h-4 w-4" /> No conflicts found — matter may proceed.
              </div>
            )
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={loading}>Open Matter</Button>
          <Link href="/app/matters"><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
