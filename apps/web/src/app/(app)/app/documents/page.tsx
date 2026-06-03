'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Download, FileText } from 'lucide-react';

type Document = {
  id: string;
  title: string;
  documentType?: string | null;
  status: string;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt: string;
  uploadedBy?: { name: string } | null;
  matter?: { title: string; matterCode: string } | null;
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (type) params.set('documentType', type);
    api.get<{ data: Document[] }>(`/documents?${params}`)
      .then((r) => setDocuments(r.data ?? []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [query, type]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500">Firm document repository and file management</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4" /> Upload Document</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="form-select w-44">
          <option value="">All Types</option>
          <option value="CONTRACT">Contract</option>
          <option value="PLEADING">Pleading</option>
          <option value="CORRESPONDENCE">Correspondence</option>
          <option value="INVOICE">Invoice</option>
          <option value="AFFIDAVIT">Affidavit</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Type</Th>
            <Th>Matter</Th>
            <Th>Uploaded By</Th>
            <Th>Size</Th>
            <Th>Status</Th>
            <Th>Date</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {loading ? <LoadingRow colSpan={8} /> :
           !documents.length ? <EmptyRow colSpan={8} message="No documents found" /> :
           documents.map((d) => (
             <tr key={d.id}>
               <Td>
                 <div className="flex items-center gap-2">
                   <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                   <span className="font-medium text-gray-900 truncate max-w-xs">{d.title}</span>
                 </div>
               </Td>
               <Td className="text-gray-600 text-xs">{d.documentType?.replace(/_/g, ' ') ?? '—'}</Td>
               <Td className="text-gray-600 text-xs">
                 {d.matter ? `${d.matter.matterCode} — ${d.matter.title}` : '—'}
               </Td>
               <Td className="text-gray-600 text-sm">{d.uploadedBy?.name ?? '—'}</Td>
               <Td className="text-gray-500 text-xs">{formatBytes(d.fileSize)}</Td>
               <Td><StatusBadge status={d.status} /></Td>
               <Td className="text-gray-500 text-xs">{formatDate(d.createdAt)}</Td>
               <Td>
                 <button className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                   <Download className="h-3 w-3" /> Download
                 </button>
               </Td>
             </tr>
           ))
          }
        </tbody>
      </Table>
    </div>
  );
}
