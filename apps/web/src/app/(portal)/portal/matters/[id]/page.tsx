'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { ArrowLeft, Briefcase, Clock } from 'lucide-react';

type ClientMatter = {
  id: string;
  title: string;
  matterCode: string;
  status: string;
  category: string;
  updatedAt: string;
};

type MatterUpdate = {
  id: string;
  content: string;
  updateType: string;
  createdAt: string;
};

export default function PortalMatterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [matter, setMatter] = useState<ClientMatter | null>(null);
  const [updates, setUpdates] = useState<MatterUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: ClientMatter[] }>('/client/matters').catch(() => ({ data: [] as ClientMatter[] })),
      // Only client-visible updates are returned to the portal.
      api.get<{ data: MatterUpdate[] }>(`/client/matters/${id}/updates`).catch(() => ({ data: [] as MatterUpdate[] })),
    ]).then(([m, u]) => {
      setMatter((m.data ?? []).find((x) => x.id === id) ?? null);
      setUpdates(u.data ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="text-center py-16 text-gray-400">
        Matter not found. <Link href="/portal/dashboard" className="text-primary-600 underline">Back to Portal</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/portal/dashboard" className="mt-1 text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary-600" /> {matter.title}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-mono">{matter.matterCode}</span>
              {matter.category && ` · ${matter.category.replace(/_/g, ' ')}`}
            </p>
          </div>
        </div>
        <StatusBadge status={matter.status} />
      </div>

      {/* Client-visible matter updates */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary-600" /> Matter Updates
        </h2>
        {!updates.length ? (
          <p className="text-sm text-gray-400">No updates have been shared on this matter yet. Your advocate will post progress updates here.</p>
        ) : (
          <div className="space-y-4">
            {updates.map((u) => (
              <div key={u.id} className="border-l-2 border-primary-200 pl-4">
                <p className="text-xs text-gray-400">{formatDate(u.createdAt)} · {u.updateType.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">{u.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
