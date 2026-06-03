export const dynamic = 'force-dynamic';
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Brain, FileSearch, AlertTriangle, Clock, Sparkles } from 'lucide-react';

type AIArtifact = {
  id: string;
  taskType: string;
  status: string;
  title: string;
  requiresHumanReview: boolean;
  createdAt: string;
};

const SCOPES = [
  { id: 'document-analysis',      label: 'Document Analysis',      icon: <FileSearch className="h-5 w-5" />, desc: 'Analyse contracts and legal documents' },
  { id: 'contract-review',        label: 'Contract Review',         icon: <AlertTriangle className="h-5 w-5" />, desc: 'Risk clause detection and review' },
  { id: 'matter-risk',            label: 'Matter Risk Assessment',  icon: <AlertTriangle className="h-5 w-5" />, desc: 'Assess litigation and legal risks' },
  { id: 'drafting-assistant',     label: 'Drafting Assistant',      icon: <Sparkles className="h-5 w-5" />, desc: 'AI-assisted legal document drafting' },
  { id: 'deadline-intelligence',  label: 'Deadline Intelligence',   icon: <Clock className="h-5 w-5" />, desc: 'Identify upcoming deadlines and risks' },
  { id: 'legal-research',         label: 'Legal Research',          icon: <Brain className="h-5 w-5" />, desc: 'Kenyan case law and statute research' },
];

export default function AIPage() {
  const [artifacts, setArtifacts] = useState<AIArtifact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: AIArtifact[] }>('/ai/artifacts?limit=10')
      .then((r) => setArtifacts(r.data ?? []))
      .catch(() => setArtifacts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Legal Operations</h1>
        <p className="text-sm text-gray-500">Governed AI — all outputs require human review before reliance</p>
      </div>

      {/* Scope grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Available AI Capabilities</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              className="card p-5 text-left hover:shadow-md hover:border-primary-300 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-primary-600 group-hover:text-primary-700">{s.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm">{s.label}</h3>
              </div>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Pending reviews */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent AI Artifacts</h2>
        <Table>
          <thead>
            <tr><Th>Title</Th><Th>Type</Th><Th>Status</Th><Th>Review Required</Th><Th>Generated</Th><Th></Th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow colSpan={6} /> :
             !artifacts.length ? <EmptyRow colSpan={6} message="No AI artifacts yet — run your first analysis above" /> :
             artifacts.map((a) => (
               <tr key={a.id}>
                 <Td className="font-medium text-sm">{a.title}</Td>
                 <Td className="text-xs text-gray-500">{a.taskType.replace(/_/g, ' ')}</Td>
                 <Td><StatusBadge status={a.status} /></Td>
                 <Td>
                   {a.requiresHumanReview
                     ? <span className="badge-yellow">Review required</span>
                     : <span className="badge-green">Ready</span>
                   }
                 </Td>
                 <Td className="text-gray-500 text-xs">{formatDate(a.createdAt)}</Td>
                 <Td><a href={`/app/ai/artifacts/${a.id}`} className="text-xs text-primary-600 hover:underline">View</a></Td>
               </tr>
             ))
            }
          </tbody>
        </Table>
      </div>
    </div>
  );
}
