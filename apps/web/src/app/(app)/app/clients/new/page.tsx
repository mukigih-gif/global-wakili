'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Users, Briefcase, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// KRA PIN format: A or P + 9 digits + 1 letter (e.g. P052312345J or A000000000B)
// Must match the backend validator (/^[AP][0-9]{9}[A-Z]$/i) to avoid false-positive validation.
const KRA_PIN_REGEX = /^[AP]\d{9}[A-Z]$/i;

type ConflictResult = { hasConflict: boolean; conflicts?: Array<{ name: string; matter?: string }> };

const TABS = ['Client Details', 'Conflict Check', 'Add Matter'] as const;
type Tab = typeof TABS[number];

export default function NewClientPage() {
  const router = useRouter();
  const [tab, setTab]           = useState<Tab>('Client Details');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [kraError, setKraError] = useState('');
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictResult | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const [form, setForm] = useState({
    name: '', clientType: 'INDIVIDUAL', email: '', phone: '',
    idNumber: '', kraPin: '', address: '', city: 'Nairobi',
    country: 'Kenya', notes: '',
  });

  // Matter form for the Add Matter tab
  const [matterForm, setMatterForm] = useState({
    title: '', matterType: 'GENERAL', category: 'CIVIL',
    description: '', estimatedValue: '', currency: 'KES',
    openedDate: new Date().toISOString().slice(0, 10),
  });

  const [matterLoading, setMatterLoading] = useState(false);
  const [matterError, setMatterError]     = useState('');

  const set  = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setM = (k: string, v: string) => setMatterForm((f) => ({ ...f, [k]: v }));

  const validateKraPin = (pin: string) => {
    if (!pin) return '';
    const cleaned = pin.trim().toUpperCase();
    if (!KRA_PIN_REGEX.test(cleaned)) {
      return 'Invalid KRA PIN format. Expected: 1 letter + 9 digits + 1 letter (e.g. P052312345J)';
    }
    return '';
  };

  const handleKraChange = (value: string) => {
    set('kraPin', value.toUpperCase());
    setKraError(validateKraPin(value));
  };

  const runConflictCheck = async () => {
    if (!form.name.trim()) { setError('Enter client name first to run a conflict check'); return; }
    setCheckingConflict(true);
    try {
      const result = await api.post<ConflictResult>('/clients/conflict-check', {
        name: form.name, idNumber: form.idNumber, kraPin: form.kraPin,
      });
      setConflict(result);
    } catch {
      setConflict(null);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    const kraErr = validateKraPin(form.kraPin);
    if (kraErr) { setKraError(kraErr); return; }
    if (!form.idNumber.trim()) { setError('ID Number is required'); return; }
    if (!form.kraPin.trim())   { setError('KRA PIN is required'); return; }

    setError(''); setLoading(true);
    try {
      // Map UI field names to the API contract (type / phoneNumber)
      const payload = {
        name: form.name.trim(),
        type: form.clientType,
        email: form.email || undefined,
        phoneNumber: form.phone || undefined,
        idNumber: form.idNumber.trim(),
        kraPin: form.kraPin.trim().toUpperCase(),
        address: form.address || undefined,
        metadata: {
          city: form.city || undefined,
          country: form.country || undefined,
          notes: form.notes || undefined,
        },
      };
      const result = await api.post<{ id: string } | { client?: { id: string }; id?: string }>('/clients', payload);
      // Handle both { id } and { client: { id } } response shapes
      const clientId = (result as { id: string }).id
        ?? (result as { client?: { id: string } }).client?.id;
      if (!clientId) throw new Error('Client created but ID not returned');
      setCreatedClientId(clientId);
      setTab('Conflict Check');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdClientId) return;
    if (!matterForm.estimatedValue) { setMatterError('Estimated value is required'); return; }
    setMatterError(''); setMatterLoading(true);
    try {
      await api.post('/matters', {
        ...matterForm,
        clientId: createdClientId,
        estimatedValue: parseFloat(matterForm.estimatedValue),
      });
      router.push(`/app/clients/${createdClientId}`);
    } catch (err: unknown) {
      setMatterError(err instanceof Error ? err.message : 'Failed to create matter');
    } finally {
      setMatterLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/clients" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Client</h1>
          <p className="text-sm text-gray-500">Register a new client to the firm</p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => { if (t !== 'Add Matter' || createdClientId) setTab(t); }}
            disabled={(t === 'Conflict Check' || t === 'Add Matter') && !createdClientId}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5
              ${tab === t ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'}
              ${i > 0 ? 'border-l border-gray-200' : ''}`}>
            {i + 1}. {t}
            {t === 'Client Details' && createdClientId && <CheckCircle className="h-3.5 w-3.5" />}
          </button>
        ))}
      </div>

      {/* TAB 1 — Client Details */}
      {tab === 'Client Details' && (
        <>
          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900">Client Information</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Full Name / Company Name *" required value={form.name}
                  onChange={(e) => set('name', e.target.value)} placeholder="e.g. John Doe or Acme Ltd" />
              </div>
              <div>
                <label className="form-label">Client Type *</label>
                <select required value={form.clientType} onChange={(e) => set('clientType', e.target.value)} className="form-select w-full">
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="CORPORATE">Company / Corporate</option>
                  <option value="STATE_AGENCY">Government / State Agency</option>
                  <option value="OTHER">NGO / Partnership / Other</option>
                </select>
              </div>
              <Input label="Email Address" type="email" value={form.email}
                onChange={(e) => set('email', e.target.value)} placeholder="client@email.com" />
              <Input label="Phone Number" value={form.phone}
                onChange={(e) => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" />

              {/* ID Number — MANDATORY */}
              <div>
                <Input label="ID / Passport / Reg. No. *" required value={form.idNumber}
                  onChange={(e) => set('idNumber', e.target.value)}
                  placeholder={form.clientType === 'INDIVIDUAL' ? 'National ID No.' : 'Company Reg. No.'} />
                <p className="text-xs text-gray-400 mt-0.5">
                  {form.clientType === 'INDIVIDUAL' ? 'National ID or Passport number' : 'Registrar of Companies number'}
                </p>
              </div>

              {/* KRA PIN — MANDATORY with validator */}
              <div>
                <Input label="KRA PIN *" required value={form.kraPin}
                  onChange={(e) => handleKraChange(e.target.value)}
                  placeholder="e.g. P052312345J"
                  className={kraError ? 'border-red-400 focus:border-red-500' : ''} />
                {kraError ? (
                  <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />{kraError}
                  </p>
                ) : form.kraPin && KRA_PIN_REGEX.test(form.kraPin) ? (
                  <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Valid KRA PIN format
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Format: 1 letter + 9 digits + 1 letter (e.g. P052312345J)</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <Input label="Physical Address" value={form.address}
                  onChange={(e) => set('address', e.target.value)} placeholder="Street, building, floor" />
              </div>
              <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
              <Input label="Country" value={form.country} onChange={(e) => set('country', e.target.value)} />
              <div className="sm:col-span-2">
                <label className="form-label">Notes</label>
                <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                  className="form-input w-full resize-none" placeholder="Any additional notes…" />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">* ID Number and KRA PIN are mandatory</p>
              <div className="flex gap-3">
                <Link href="/app/clients"><Button type="button" variant="secondary">Cancel</Button></Link>
                <Button type="submit" loading={loading}>Save Client & Continue</Button>
              </div>
            </div>
          </form>
        </>
      )}

      {/* TAB 2 — Conflict Check */}
      {tab === 'Conflict Check' && createdClientId && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">Conflict of Interest Check</h2>
          </div>
          <p className="text-sm text-gray-500">
            Run a conflict check to ensure no existing client, matter, or opposing party would create
            a conflict of interest before proceeding.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" loading={checkingConflict} onClick={runConflictCheck}>
              Run Conflict Check for <span className="font-semibold ml-1">{form.name}</span>
            </Button>
          </div>

          {conflict && (
            conflict.hasConflict ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
                  <AlertTriangle className="h-4 w-4" /> Conflict Detected
                </div>
                {conflict.conflicts?.map((c, i) => (
                  <p key={i} className="text-xs text-red-600">{c.name}{c.matter ? ` — ${c.matter}` : ''}</p>
                ))}
                <p className="text-xs text-red-500 mt-2">
                  Disclose conflicts to relevant partners before proceeding. Document any waiver obtained.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <CheckCircle className="h-4 w-4" /> No conflicts found — client intake may proceed.
              </div>
            )
          )}

          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <Button onClick={() => router.push(`/app/clients/${createdClientId}`)}>
              Go to Client Profile
            </Button>
            <Button variant="secondary" onClick={() => setTab('Add Matter')}>
              <Briefcase className="h-4 w-4" /> Add Matter for this Client
            </Button>
          </div>
        </div>
      )}

      {/* TAB 3 — Add Matter */}
      {tab === 'Add Matter' && createdClientId && (
        <>
          {matterError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{matterError}</div>}
          <form onSubmit={handleAddMatter} className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-5 w-5 text-primary-600" />
              <h2 className="font-semibold text-gray-900">Open a Matter for {form.name}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Matter Title *" required value={matterForm.title}
                  onChange={(e) => setM('title', e.target.value)} placeholder="e.g. Doe — Land Transfer LR No. 123" />
              </div>
              <div>
                <label className="form-label">Matter Type *</label>
                <select required value={matterForm.matterType} onChange={(e) => setM('matterType', e.target.value)} className="form-select w-full">
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
                <select value={matterForm.category} onChange={(e) => setM('category', e.target.value)} className="form-select w-full">
                  <option value="CIVIL">Civil</option>
                  <option value="CRIMINAL">Criminal</option>
                  <option value="FAMILY">Family</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="LAND">Land & Property</option>
                  <option value="CONSTITUTIONAL">Constitutional</option>
                  <option value="TAX">Tax</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input label="Estimated Value *" required type="number" min="0" step="100"
                    value={matterForm.estimatedValue} onChange={(e) => setM('estimatedValue', e.target.value)}
                    placeholder="0.00" />
                  <p className="text-xs text-gray-400 mt-0.5">Required — can be revised later</p>
                </div>
                <div className="w-24">
                  <label className="form-label">Currency</label>
                  <select value={matterForm.currency} onChange={(e) => setM('currency', e.target.value)} className="form-select w-full">
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <Input label="Opened Date" type="date" value={matterForm.openedDate}
                onChange={(e) => setM('openedDate', e.target.value)}
                max={new Date().toISOString().slice(0,10)} />
              <div className="sm:col-span-2">
                <label className="form-label">Description</label>
                <textarea value={matterForm.description} onChange={(e) => setM('description', e.target.value)}
                  rows={2} className="form-input w-full resize-none" placeholder="Brief description…" />
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <Button type="submit" loading={matterLoading}>Open Matter</Button>
              <Button type="button" variant="secondary"
                onClick={() => router.push(`/app/clients/${createdClientId}`)}>
                Skip — Go to Client Profile
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
