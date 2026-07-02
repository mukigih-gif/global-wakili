'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Plus, Search, Download, FileText, FileCheck,
  History, ExternalLink, Eye, GitBranch, BookOpen,
  AlertCircle,
} from 'lucide-react';

type Document = {
  id: string;
  title: string;
  documentType?: string | null;
  status: string;
  fileSize?: number | null;
  mimeType?: string | null;
  signedUrl?: string | null;
  createdAt: string;
  uploadedBy?: { name: string } | null;
  matter?: { title: string; matterCode: string } | null;
  currentVersion?: number | null;
  lastEditedAt?: string | null;
};

type Tab = 'all' | 'contracts' | 'recent';

const fmt = (bytes: number | null | undefined) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MIME_ICON: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [type, setType]           = useState('');
  const [tab, setTab]             = useState<Tab>('all');
  const [preview, setPreview]     = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busyDownload, setBusyDownload] = useState<string | null>(null);

  // Signed URLs are generated ON DEMAND via GET /:id/download (the /search list
  // never presigns per row). Resolve on click for preview (inline) / download.
  const resolveDocUrl = async (id: string, disposition: 'inline' | 'attachment') => {
    const r = await api.get<{ url: string }>(`/documents/${id}/download?disposition=${disposition}`);
    return r?.url ?? null;
  };

  const openPreview = async (d: Document) => {
    setPreview(d);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try { setPreviewUrl(await resolveDocUrl(d.id, 'inline')); }
    catch { setPreviewUrl(null); }
    finally { setPreviewLoading(false); }
  };

  const downloadDoc = async (id: string) => {
    setBusyDownload(id);
    try {
      const url = await resolveDocUrl(id, 'attachment');
      if (url) { const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; a.click(); }
    } catch { /* surfaced via disabled state clearing */ }
    finally { setBusyDownload(null); }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (type)  params.set('documentType', type);
    if (tab === 'contracts') params.set('documentType', 'CONTRACT');
    const endpoint = `/documents/search?${params}&limit=100`;
    api.get<{ data: Document[] }>(endpoint)
      .then((r) => setDocuments(r.data ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [query, type, tab]);

  const contracts = documents.filter((d) => d.documentType === 'CONTRACT');
  const recent    = [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);

  const displayed = tab === 'contracts' ? contracts : tab === 'recent' ? recent : documents;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">Firm document repository — upload, version, manage, and edit documents</p>
        </div>
        <Link href="/app/documents/new">
          <Button size="sm"><Plus className="h-4 w-4" /> Upload Document</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:bg-gray-50" onClick={() => setTab('all')}>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-primary-600" /> Total Documents</p>
          <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 cursor-pointer hover:bg-blue-100" onClick={() => setTab('contracts')}>
          <p className="text-xs text-blue-600 mb-1 flex items-center gap-1"><FileCheck className="h-3.5 w-3.5" /> Contracts</p>
          <p className="text-2xl font-bold text-blue-800">{contracts.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><History className="h-3.5 w-3.5 text-amber-500" /> Versioned</p>
          <p className="text-2xl font-bold text-gray-900">{documents.filter((d) => (d.currentVersion ?? 1) > 1).length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:bg-gray-50" onClick={() => setTab('recent')}>
          <p className="text-xs text-gray-500 mb-1">Recent (20)</p>
          <p className="text-2xl font-bold text-gray-900">{Math.min(20, documents.length)}</p>
        </div>
      </div>

      {/* Contract Management panel */}
      {tab === 'contracts' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 text-sm">Contract Management</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Contracts support full version history, milestone tracking, and electronic signature integration.
              Click any contract to view versions, expiry dates, and renewal alerts.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'all',       label: `All Documents (${documents.length})` },
          { key: 'contracts', label: `Contracts (${contracts.length})` },
          { key: 'recent',    label: 'Recent' },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="search" placeholder="Search documents…" value={query}
            onChange={(e) => setQuery(e.target.value)} className="form-input pl-9 w-full" />
        </div>
        {tab === 'all' && (
          <select value={type} onChange={(e) => setType(e.target.value)} className="form-select w-44">
            <option value="">All Types</option>
            <option value="CONTRACT">Contract</option>
            <option value="PLEADING">Pleading</option>
            <option value="CORRESPONDENCE">Correspondence</option>
            <option value="INVOICE">Invoice</option>
            <option value="AFFIDAVIT">Affidavit</option>
            <option value="COURT_ORDER">Court Order</option>
            <option value="LAND_DOCUMENT">Land Document</option>
            <option value="OTHER">Other</option>
          </select>
        )}
      </div>

      {/* Document table */}
      <Table>
        <thead>
          <tr>
            <Th>Document</Th>
            <Th>Type</Th>
            <Th>Matter</Th>
            <Th>Version</Th>
            <Th>Uploaded By</Th>
            <Th>Size</Th>
            <Th>Status</Th>
            <Th>Date</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={9} /> :
           !displayed.length ? <EmptyRow colSpan={9} message="No documents found — upload your first document" /> :
           displayed.map((d) => (
             <tr key={d.id} className="hover:bg-gray-50">
               <Td>
                 <div className="flex items-center gap-2">
                   <span className="text-lg flex-shrink-0">{MIME_ICON[d.mimeType ?? ''] ?? '📁'}</span>
                   <div className="min-w-0">
                     <button onClick={() => openPreview(d)} className="font-medium text-primary-700 hover:underline text-left truncate max-w-[180px] block">
                       {d.title}
                     </button>
                     {d.lastEditedAt && (
                       <p className="text-[11px] text-gray-400">Edited {formatDate(d.lastEditedAt)}</p>
                     )}
                   </div>
                 </div>
               </Td>
               <Td className="text-xs text-gray-600">{d.documentType?.replace(/_/g, ' ') ?? '—'}</Td>
               <Td className="text-xs text-gray-500 max-w-[120px] truncate">{d.matter ? `${d.matter.matterCode} — ${d.matter.title}` : '—'}</Td>
               <Td>
                 {(d.currentVersion ?? 1) > 1
                   ? <span className="flex items-center gap-1 text-xs text-amber-700"><GitBranch className="h-3 w-3" /> v{d.currentVersion}</span>
                   : <span className="text-xs text-gray-400">v1</span>
                 }
               </Td>
               <Td className="text-sm text-gray-600">{d.uploadedBy?.name ?? '—'}</Td>
               <Td className="text-xs text-gray-500">{fmt(d.fileSize)}</Td>
               <Td><StatusBadge status={d.status} /></Td>
               <Td className="text-xs text-gray-500">{formatDate(d.createdAt)}</Td>
               <Td>
                 <div className="flex items-center gap-1.5">
                   <button onClick={() => openPreview(d)} className="p-1 text-gray-400 hover:text-primary-600" title="Preview"><Eye className="h-3.5 w-3.5" /></button>
                   <button onClick={() => downloadDoc(d.id)} disabled={busyDownload === d.id} className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-40" title="Download"><Download className="h-3.5 w-3.5" /></button>
                 </div>
               </Td>
             </tr>
           ))}
        </tbody>
      </Table>

      {/* Document Preview / PDF Panel */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">{preview.title}</h3>
                <p className="text-xs text-gray-500">{preview.documentType?.replace(/_/g,' ')} · v{preview.currentVersion ?? 1} · {formatDateTime(preview.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                    <button onClick={() => downloadDoc(preview.id)} disabled={busyDownload === preview.id}
                      className="flex items-center gap-1 text-xs text-green-600 hover:underline disabled:opacity-40">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </>
                )}
                <button onClick={() => { setPreview(null); setPreviewUrl(null); }} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-48 text-sm text-gray-400">Generating secure preview…</div>
              ) : preview.mimeType === 'application/pdf' && previewUrl ? (
                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-gray-200" title={preview.title} />
              ) : previewUrl ? (
                <div className="flex flex-col items-center justify-center h-48 gap-4 text-gray-500">
                  <span className="text-5xl">{MIME_ICON[preview.mimeType ?? ''] ?? '📁'}</span>
                  <p className="text-sm">Preview not available for this file type.</p>
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="secondary"><ExternalLink className="h-4 w-4" /> Open</Button>
                  </a>
                  <Button size="sm" onClick={() => downloadDoc(preview.id)} loading={busyDownload === preview.id}><Download className="h-4 w-4" /> Download</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                  <AlertCircle className="h-10 w-10 opacity-30" />
                  <p className="text-sm">This document has no stored file, or the secure link could not be generated.</p>
                  <p className="text-xs">Re-upload the document or check document storage configuration.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
