'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Upload, FileText, X } from 'lucide-react';
import Link from 'next/link';

type Matter = { id: string; title: string; matterCode: string };

function NewDocumentForm() {
  const router  = useRouter();
  const searchParams = useSearchParams();
  const presetMatter = searchParams.get('matterId') ?? '';
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [matters, setMatters] = useState<Matter[]>([]);
  const [file, setFile]       = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', documentType: 'OTHER', matterId: presetMatter, description: '', tags: '' });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ data: Matter[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!form.title) set('title', f.name.replace(/\.[^/.]+$/, '')); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); if (!form.title) set('title', f.name.replace(/\.[^/.]+$/, '')); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload'); return; }
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1'}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('gw_token')}`, 'x-tenant-id': sessionStorage.getItem('gw_tenant_id') ?? '' },
        body: fd,
      });
      router.push('/app/documents');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={presetMatter ? `/app/matters/${presetMatter}` : '/app/documents'} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Document</h1>
          <p className="text-sm text-gray-500">Add a document to the firm repository</p>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${file ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
        >
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept="*/*" />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-8 w-8 text-primary-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="ml-2 text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Drag & drop or click to select a file</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX, images — max 50 MB</p>
            </div>
          )}
        </div>

        <Input label="Document Title *" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sale Agreement — Doe v Smith" />

        <div>
          <label className="form-label">Document Type</label>
          <select value={form.documentType} onChange={(e) => set('documentType', e.target.value)} className="form-select w-full">
            <option value="CONTRACT">Contract</option>
            <option value="PLEADING">Pleading</option>
            <option value="AFFIDAVIT">Affidavit</option>
            <option value="CORRESPONDENCE">Correspondence</option>
            <option value="INVOICE">Invoice</option>
            <option value="COURT_ORDER">Court Order</option>
            <option value="LAND_DOCUMENT">Land Document</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="form-label">Link to Matter</label>
          <select value={form.matterId} onChange={(e) => set('matterId', e.target.value)} disabled={Boolean(presetMatter)} className="form-select w-full disabled:bg-gray-50 disabled:text-gray-500">
            <option value="">None</option>
            {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
          </select>
          {presetMatter && <p className="text-xs text-gray-400 mt-0.5">Attaching to the current matter</p>}
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="form-input w-full resize-none" placeholder="Brief description…" />
        </div>

        <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="e.g. urgent, review, signed" />

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <Button type="submit" loading={loading}><Upload className="h-4 w-4" /> Upload Document</Button>
          <Link href={presetMatter ? `/app/matters/${presetMatter}` : '/app/documents'}><Button type="button" variant="secondary">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense>
      <NewDocumentForm />
    </Suspense>
  );
}
