'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Building, Upload, X, CreditCard, FileText, Briefcase,
  Globe, ArrowLeft, CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

type FirmSettings = {
  name: string; legalName: string; kraPin: string; vatRegNumber: string;
  etimsId: string; email: string; phone: string; website: string;
  address: string; city: string; country: string; postalCode: string;
  logoUrl?: string | null;
  // Invoice settings
  invoicePrefix: string; invoiceNextNumber: number; invoiceFooter: string;
  defaultCurrency: string; defaultVatRate: number; defaultPaymentTermsDays: number;
  // Matter settings
  matterPrefix: string; matterNextNumber: number;
  // Bank details
  bankName: string; bankBranch: string; bankAccountName: string;
  bankAccountNumber: string; bankSwift: string; mpesaPaybill: string;
  // Compliance
  licenceNumber: string; regulatoryBody: string;
};

const DEFAULT: FirmSettings = {
  name: '', legalName: '', kraPin: '', vatRegNumber: '', etimsId: '',
  email: '', phone: '', website: '', address: '', city: 'Nairobi',
  country: 'Kenya', postalCode: '',
  invoicePrefix: 'INV', invoiceNextNumber: 1001, invoiceFooter: '',
  defaultCurrency: 'KES', defaultVatRate: 16, defaultPaymentTermsDays: 30,
  matterPrefix: 'MTR', matterNextNumber: 1001,
  bankName: '', bankBranch: '', bankAccountName: '', bankAccountNumber: '',
  bankSwift: '', mpesaPaybill: '',
  licenceNumber: '', regulatoryBody: 'Law Society of Kenya',
};

type Section = 'firm' | 'invoice' | 'matter' | 'bank' | 'compliance';

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'firm',       label: 'Firm Profile',       icon: <Building className="h-4 w-4" /> },
  { key: 'invoice',    label: 'Invoice Settings',   icon: <FileText className="h-4 w-4" /> },
  { key: 'matter',     label: 'Matter Settings',    icon: <Briefcase className="h-4 w-4" /> },
  { key: 'bank',       label: 'Bank Details',        icon: <CreditCard className="h-4 w-4" /> },
  { key: 'compliance', label: 'Compliance',          icon: <Globe className="h-4 w-4" /> },
];

export default function FirmSettingsPage() {
  const [settings, setSettings] = useState<FirmSettings>(DEFAULT);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [section, setSection]   = useState<Section>('firm');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<any>('/tenant/settings')
      .then((r) => setSettings({ ...DEFAULT, ...(r?.data ?? r) }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof FirmSettings, v: string | number) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload
    const fd = new FormData();
    fd.append('logo', file);
    api.post('/tenant/logo', fd as unknown as Record<string, unknown>).catch(() => {});
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await api.patch('/tenant/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice = `${settings.invoicePrefix}-${String(settings.invoiceNextNumber).padStart(4, '0')}`;
  const previewMatter  = `${settings.matterPrefix}-${String(settings.matterNextNumber).padStart(4, '0')}`;

  if (loading) return <div className="flex items-center justify-center h-48"><div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Firm Settings</h1>
            <p className="text-sm text-gray-500">Configure your firm profile, numbering, bank details and compliance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" /> Saved</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  section === s.key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                {s.icon}{s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">

          {/* FIRM PROFILE */}
          {section === 'firm' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Building className="h-4 w-4 text-primary-600" /> Firm Profile</h2>

              {/* Logo */}
              <div>
                <label className="form-label">Firm Logo</label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                    {(logoPreview || settings.logoUrl) ? (
                      <img src={logoPreview ?? settings.logoUrl ?? ''} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div>
                    <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                    <Button size="sm" variant="secondary" onClick={() => logoRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" /> Upload Logo
                    </Button>
                    {(logoPreview || settings.logoUrl) && (
                      <button onClick={() => { setLogoPreview(null); set('logoUrl', ''); }}
                        className="ml-2 text-xs text-red-500 hover:underline flex items-center gap-1">
                        <X className="h-3 w-3" /> Remove
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1">PNG or SVG, max 2 MB. Appears on invoices and portal.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Trading Name *" value={settings.name} onChange={(e) => set('name', e.target.value)} placeholder="Demo Law Firm" />
                <Input label="Legal / Registered Name" value={settings.legalName} onChange={(e) => set('legalName', e.target.value)} placeholder="Demo Law Firm & Associates LLP" />
                <Input label="KRA PIN *" value={settings.kraPin} onChange={(e) => set('kraPin', e.target.value)} placeholder="P000000000A" />
                <Input label="VAT Registration No." value={settings.vatRegNumber} onChange={(e) => set('vatRegNumber', e.target.value)} placeholder="0000000000" />
                <Input label="eTIMS Taxpayer ID" value={settings.etimsId} onChange={(e) => set('etimsId', e.target.value)} placeholder="eTIMS ID from KRA" />
                <Input label="Email" type="email" value={settings.email} onChange={(e) => set('email', e.target.value)} placeholder="info@yourlawfirm.co.ke" />
                <Input label="Phone" value={settings.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" />
                <Input label="Website" value={settings.website} onChange={(e) => set('website', e.target.value)} placeholder="https://yourlawfirm.co.ke" />
                <div className="sm:col-span-2">
                  <Input label="Physical Address" value={settings.address} onChange={(e) => set('address', e.target.value)} placeholder="Floor, Building, Street" />
                </div>
                <Input label="City" value={settings.city} onChange={(e) => set('city', e.target.value)} />
                <Input label="Postal Code" value={settings.postalCode} onChange={(e) => set('postalCode', e.target.value)} placeholder="00100" />
              </div>
            </div>
          )}

          {/* INVOICE SETTINGS */}
          {section === 'invoice' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-4 w-4 text-primary-600" /> Invoice Settings</h2>

              <div className="rounded-lg bg-primary-50 border border-primary-100 px-4 py-3 text-sm">
                <p className="font-medium text-primary-800">Invoice Number Preview</p>
                <p className="text-2xl font-bold text-primary-700 mt-1">{previewInvoice}</p>
                <p className="text-xs text-primary-600 mt-0.5">Format: {settings.invoicePrefix}-NNNN (auto-increments)</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Invoice Prefix" value={settings.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} placeholder="INV" maxLength={10} />
                <div>
                  <label className="form-label">Next Invoice Number</label>
                  <input type="number" min="1" value={settings.invoiceNextNumber}
                    onChange={(e) => set('invoiceNextNumber', parseInt(e.target.value) || 1)}
                    className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Default Currency</label>
                  <select value={settings.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} className="form-select w-full">
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Default VAT Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={settings.defaultVatRate}
                    onChange={(e) => set('defaultVatRate', parseFloat(e.target.value) || 0)}
                    className="form-input w-full" />
                </div>
                <div>
                  <label className="form-label">Payment Terms (days)</label>
                  <input type="number" min="0" value={settings.defaultPaymentTermsDays}
                    onChange={(e) => set('defaultPaymentTermsDays', parseInt(e.target.value) || 30)}
                    className="form-input w-full" />
                </div>
              </div>

              <div>
                <label className="form-label">Invoice Footer / Payment Instructions</label>
                <textarea value={settings.invoiceFooter}
                  onChange={(e) => set('invoiceFooter', e.target.value)}
                  rows={4} className="form-input w-full resize-none"
                  placeholder="e.g. Payment due within 30 days. Bank: Equity Bank. Account: 1234567890. Paybill: 247247 Account: 1234567890" />
              </div>
            </div>
          )}

          {/* MATTER SETTINGS */}
          {section === 'matter' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary-600" /> Matter Settings</h2>

              <div className="rounded-lg bg-primary-50 border border-primary-100 px-4 py-3 text-sm">
                <p className="font-medium text-primary-800">Matter Code Preview</p>
                <p className="text-2xl font-bold text-primary-700 mt-1">{previewMatter}</p>
                <p className="text-xs text-primary-600 mt-0.5">Format: {settings.matterPrefix}-NNNN (auto-increments on new matter)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Matter Code Prefix" value={settings.matterPrefix} onChange={(e) => set('matterPrefix', e.target.value.toUpperCase())} placeholder="MTR" maxLength={10} />
                <div>
                  <label className="form-label">Next Matter Number</label>
                  <input type="number" min="1" value={settings.matterNextNumber}
                    onChange={(e) => set('matterNextNumber', parseInt(e.target.value) || 1)}
                    className="form-input w-full" />
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
                Changing the prefix or next number will only affect new matters. Existing matter codes are not changed.
              </div>
            </div>
          )}

          {/* BANK DETAILS */}
          {section === 'bank' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary-600" /> Bank Details for Invoices</h2>
              <p className="text-sm text-gray-500">These details appear on all invoices sent to clients.</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Bank Name *" value={settings.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="e.g. Equity Bank Kenya" />
                <Input label="Branch" value={settings.bankBranch} onChange={(e) => set('bankBranch', e.target.value)} placeholder="e.g. Upper Hill Branch" />
                <Input label="Account Name *" value={settings.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} placeholder="Demo Law Firm & Associates" />
                <Input label="Account Number *" value={settings.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} placeholder="1234567890" />
                <Input label="SWIFT / BIC Code" value={settings.bankSwift} onChange={(e) => set('bankSwift', e.target.value)} placeholder="EQBLKENA" />
                <Input label="M-PESA Paybill / Till" value={settings.mpesaPaybill} onChange={(e) => set('mpesaPaybill', e.target.value)} placeholder="247247 / 123456" />
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">Invoice payment block preview:</p>
                <p>Bank: <strong>{settings.bankName || 'Your Bank'}</strong> · Branch: {settings.bankBranch || 'Branch'}</p>
                <p>A/C Name: <strong>{settings.bankAccountName || 'Firm Name'}</strong> · A/C No: {settings.bankAccountNumber || '0000000000'}</p>
                {settings.mpesaPaybill && <p>M-PESA Paybill: <strong>{settings.mpesaPaybill}</strong></p>}
              </div>
            </div>
          )}

          {/* COMPLIANCE */}
          {section === 'compliance' && (
            <div className="card p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Globe className="h-4 w-4 text-primary-600" /> Regulatory & Compliance</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="LSK Licence Number" value={settings.licenceNumber} onChange={(e) => set('licenceNumber', e.target.value)} placeholder="LSK/2024/001" />
                <div>
                  <label className="form-label">Regulatory Body</label>
                  <select value={settings.regulatoryBody} onChange={(e) => set('regulatoryBody', e.target.value)} className="form-select w-full">
                    <option value="Law Society of Kenya">Law Society of Kenya</option>
                    <option value="Institute of Certified Public Accountants of Kenya">ICPAK</option>
                    <option value="Kenya Revenue Authority">Kenya Revenue Authority</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
                Compliance information appears on invoices, court documents and client communications.
                Ensure your LSK practising certificate number is current and matches KRA records.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
