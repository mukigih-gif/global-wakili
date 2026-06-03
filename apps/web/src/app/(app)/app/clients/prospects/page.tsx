export const dynamic = 'force-dynamic';
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

type Prospect = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  source: string;
  stage: string;
  status: string;
  estimatedValue?: string | null;
  practiceArea?: string | null;
  expectedCloseDate?: string | null;
  assignedTo?: { name: string } | null;
  createdAt: string;
};

type PipelineView = {
  totalActive: number;
  totalEstimatedValue: string;
  stageCounts: Record<string, number>;
  pipeline: Record<string, Prospect[]>;
};

const STAGES = [
  'INITIAL_CONTACT',
  'NEEDS_ASSESSMENT',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'RETAINER_SIGNED',
];

const STAGE_LABELS: Record<string, string> = {
  INITIAL_CONTACT: 'Initial Contact',
  NEEDS_ASSESSMENT: 'Needs Assessment',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  RETAINER_SIGNED: 'Retainer Signed',
};

const STAGE_COLORS: Record<string, string> = {
  INITIAL_CONTACT: 'bg-gray-100 text-gray-700',
  NEEDS_ASSESSMENT: 'bg-blue-100 text-blue-700',
  PROPOSAL_SENT: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  RETAINER_SIGNED: 'bg-green-100 text-green-700',
};

export default function ProspectsPage() {
  const [pipeline, setPipeline] = useState<PipelineView | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<PipelineView>('/clients/prospects/pipeline').catch(() => null),
      api.get<{ data: Prospect[] }>('/clients/prospects?limit=50').catch(() => ({ data: [] })),
    ]).then(([pipe, list]) => {
      setPipeline(pipe);
      setProspects(list?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const totalWon = prospects.filter((p) => p.status === 'CONVERTED').length;
  const totalLost = prospects.filter((p) => p.status === 'LOST').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospects Pipeline</h1>
          <p className="text-sm text-gray-500">Track potential clients through the business development pipeline</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('pipeline')} className={`btn ${view === 'pipeline' ? 'btn-primary' : 'btn-secondary'} text-sm px-3 py-1.5`}>Kanban</button>
          <button onClick={() => setView('list')} className={`btn ${view === 'list' ? 'btn-primary' : 'btn-secondary'} text-sm px-3 py-1.5`}>List</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active Prospects" value={pipeline?.totalActive ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Pipeline Value" value={formatCurrency(pipeline?.totalEstimatedValue ?? 0)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Converted" value={totalWon} icon={<TrendingUp className="h-5 w-5" />} deltaType="up" />
        <StatCard label="Lost" value={totalLost} icon={<Target className="h-5 w-5" />} deltaType="down" />
      </div>

      {view === 'pipeline' && pipeline ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const items = (pipeline.pipeline[stage] ?? []) as Prospect[];
            const count = pipeline.stageCounts[stage] ?? 0;
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <div className={`rounded-lg px-3 py-2 mb-3 flex items-center justify-between ${STAGE_COLORS[stage]}`}>
                  <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
                  <span className="text-xs font-bold">{count}</span>
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <Card key={p.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                      {p.company && <p className="text-xs text-gray-500 truncate">{p.company}</p>}
                      {p.estimatedValue && (
                        <p className="text-xs font-medium text-green-700 mt-1">{formatCurrency(p.estimatedValue)}</p>
                      )}
                      {p.assignedTo && (
                        <p className="text-xs text-gray-400 mt-1">→ {p.assignedTo.name}</p>
                      )}
                      {p.expectedCloseDate && (
                        <p className="text-xs text-gray-400">Close: {formatDate(p.expectedCloseDate)}</p>
                      )}
                      <span className="badge-gray text-xs mt-1">{p.source.replace(/_/g,' ')}</span>
                    </Card>
                  ))}
                  {!items.length && (
                    <p className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table>
          <thead>
            <tr><Th>Name</Th><Th>Company</Th><Th>Source</Th><Th>Stage</Th><Th>Value</Th><Th>Assignee</Th><Th>Expected Close</Th><Th>Status</Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={8} /> :
             !prospects.length ? <EmptyRow colSpan={8} message="No prospects found" /> :
             prospects.map((p) => (
               <tr key={p.id}>
                 <Td className="font-medium">{p.name}</Td>
                 <Td className="text-xs text-gray-500">{p.company ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{p.source.replace(/_/g,' ')}</Td>
                 <Td><span className={`badge text-xs ${STAGE_COLORS[p.stage] ?? 'badge-gray'}`}>{STAGE_LABELS[p.stage] ?? p.stage}</span></Td>
                 <Td className="font-medium text-sm">{p.estimatedValue ? formatCurrency(p.estimatedValue) : '—'}</Td>
                 <Td className="text-xs text-gray-600">{p.assignedTo?.name ?? '—'}</Td>
                 <Td className="text-xs text-gray-500">{formatDate(p.expectedCloseDate)}</Td>
                 <Td><StatusBadge status={p.status} /></Td>
               </tr>
             ))
            }
          </tbody>
        </Table>
      )}
    </div>
  );
}
