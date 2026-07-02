'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Brain, FileSearch, AlertTriangle, Clock, Sparkles, X, ChevronRight } from 'lucide-react';

type AIArtifact = {
  id: string;
  taskType: string;
  status: string;
  title: string;
  requiresHumanReview: boolean;
  createdAt: string;
  output?: string | null;
};

type ScopeKey = 'document-analysis' | 'contract-review' | 'matter-risk' | 'drafting-assistant' | 'deadline-intelligence' | 'legal-research';

const SCOPES: { id: ScopeKey; label: string; icon: React.ReactNode; desc: string; endpoint: string }[] = [
  { id: 'document-analysis',     label: 'Document Analysis',     icon: <FileSearch className="h-5 w-5" />,    desc: 'Analyse contracts and legal documents for key clauses, risks and obligations',  endpoint: '/ai/document-analysis' },
  { id: 'contract-review',       label: 'Contract Review',        icon: <AlertTriangle className="h-5 w-5" />, desc: 'Risk clause detection, red flags, and unfavourable terms',                       endpoint: '/ai/contract-review' },
  { id: 'matter-risk',           label: 'Matter Risk Assessment', icon: <AlertTriangle className="h-5 w-5" />, desc: 'Assess litigation exposure, financial risk, and timeline risk per matter',        endpoint: '/ai/matter-risk' },
  { id: 'drafting-assistant',    label: 'Drafting Assistant',     icon: <Sparkles className="h-5 w-5" />,     desc: 'AI-assisted legal document drafting with firm-specific context',                    endpoint: '/ai/drafting-assistant' },
  { id: 'deadline-intelligence', label: 'Deadline Intelligence',  icon: <Clock className="h-5 w-5" />,        desc: 'Identify upcoming statutory deadlines, limitation periods and filing windows',      endpoint: '/ai/deadline-intelligence' },
  { id: 'legal-research',        label: 'Legal Research',         icon: <Brain className="h-5 w-5" />,        desc: 'Kenyan case law, statutes, and regulatory guidance research',                       endpoint: '/ai/legal-research' },
];

export default function AIPage() {
  const [artifacts, setArtifacts] = useState<AIArtifact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [active, setActive]       = useState<ScopeKey | null>(null);
  const [running, setRunning]     = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState('');
  const [matters, setMatters]     = useState<{ id: string; title: string; matterCode: string }[]>([]);

  // Form state for each scope
  const [docText, setDocText]     = useState('');
  const [docTitle, setDocTitle]   = useState('');
  const [matterId, setMatterId]   = useState('');
  const [draftGoal, setDraftGoal] = useState('');
  const [draftType, setDraftType] = useState('SALE_AGREEMENT');
  const [researchQ, setResearchQ] = useState('');

  const loadArtifacts = () => {
    api.get<{ data: AIArtifact[] }>('/ai/artifacts/search?limit=15')
      .then((r) => setArtifacts(r.data ?? []))
      .catch(() => setArtifacts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadArtifacts();
    api.get<{ data: { id: string; title: string; matterCode: string }[] }>('/matters?limit=100').then((r) => setMatters(r.data ?? [])).catch(() => {});
  }, []);

  const buildPayload = (scope: ScopeKey): Record<string, any> => {
    switch (scope) {
      case 'document-analysis':
      case 'contract-review':
        return { contentText: docText, title: docTitle || undefined };
      case 'matter-risk':
        return { entityType: 'MATTER', entityId: matterId || undefined, matterName: matters.find((m) => m.id === matterId)?.title };
      case 'drafting-assistant':
        return { goal: draftGoal, documentType: draftType };
      case 'deadline-intelligence':
        return { entityType: 'MATTER', entityId: matterId || undefined };
      case 'legal-research':
        return { query: researchQ };
      default:
        return {};
    }
  };

  const run = async () => {
    if (!active) return;
    const scope = SCOPES.find((s) => s.id === active);
    if (!scope) return;
    setRunning(true); setError(''); setResult(null);
    try {
      const res = await api.post<any>(scope.endpoint, buildPayload(active));
      setResult(res?.data ?? res);
      loadArtifacts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI task failed');
    } finally { setRunning(false); }
  };

  const scope = SCOPES.find((s) => s.id === active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Brain className="h-6 w-6 text-primary-600" /> AI Legal Operations</h1>
        <p className="text-sm text-gray-500">Governed AI — all outputs require human review before reliance</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Capability cards */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Capabilities</p>
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActive(s.id); setResult(null); setError(''); }}
              className={`w-full text-left card p-4 transition-all ${active === s.id ? 'border-primary-400 bg-primary-50/50 shadow-sm' : 'hover:shadow-sm hover:border-primary-200'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={active === s.id ? 'text-primary-600' : 'text-gray-400'}>{s.icon}</div>
                  <span className={`text-sm font-medium ${active === s.id ? 'text-primary-800' : 'text-gray-800'}`}>{s.label}</span>
                </div>
                <ChevronRight className={`h-4 w-4 ${active === s.id ? 'text-primary-500' : 'text-gray-300'}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Active scope input */}
        <div className="lg:col-span-2">
          {!active ? (
            <div className="card p-8 text-center h-full flex flex-col items-center justify-center">
              <Brain className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">Select a capability on the left to run an AI task</p>
            </div>
          ) : (
            <div className="card p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary-700">{scope?.icon}<h2 className="font-bold text-lg text-gray-900">{scope?.label}</h2></div>
                  <p className="text-sm text-gray-500 mt-0.5">{scope?.desc}</p>
                </div>
                <button onClick={() => { setActive(null); setResult(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>

              {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

              <div className="space-y-3">
                {(active === 'document-analysis' || active === 'contract-review') && (
                  <>
                    <div>
                      <label className="form-label">Document Title</label>
                      <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="form-input w-full" placeholder="e.g. Sale Agreement — ABC Ltd" />
                    </div>
                    <div>
                      <label className="form-label">Document Text *</label>
                      <textarea required value={docText} onChange={(e) => setDocText(e.target.value)} rows={8} className="form-input w-full resize-none text-xs" placeholder="Paste the document content here (max 20,000 characters)…" maxLength={20000} />
                      <p className="text-xs text-gray-400 mt-0.5">{docText.length}/20,000 characters</p>
                    </div>
                  </>
                )}

                {(active === 'matter-risk' || active === 'deadline-intelligence') && (
                  <div>
                    <label className="form-label">Select Matter *</label>
                    <select required value={matterId} onChange={(e) => setMatterId(e.target.value)} className="form-select w-full">
                      <option value="">Select matter…</option>
                      {matters.map((m) => <option key={m.id} value={m.id}>{m.matterCode} — {m.title}</option>)}
                    </select>
                  </div>
                )}

                {active === 'drafting-assistant' && (
                  <>
                    <div>
                      <label className="form-label">Document Type *</label>
                      <select value={draftType} onChange={(e) => setDraftType(e.target.value)} className="form-select w-full">
                        <option value="SALE_AGREEMENT">Sale Agreement</option>
                        <option value="LEASE_AGREEMENT">Lease Agreement</option>
                        <option value="EMPLOYMENT_CONTRACT">Employment Contract</option>
                        <option value="NDA">Non-Disclosure Agreement</option>
                        <option value="POWER_OF_ATTORNEY">Power of Attorney</option>
                        <option value="AFFIDAVIT">Affidavit</option>
                        <option value="DEMAND_LETTER">Demand Letter</option>
                        <option value="LEGAL_NOTICE">Legal Notice</option>
                        <option value="BOARD_RESOLUTION">Board Resolution</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Drafting Goal / Instructions *</label>
                      <textarea required value={draftGoal} onChange={(e) => setDraftGoal(e.target.value)} rows={4} className="form-input w-full resize-none" placeholder="Describe what you want drafted. Include key parties, terms, dates and any special provisions…" />
                    </div>
                  </>
                )}

                {active === 'legal-research' && (
                  <div>
                    <label className="form-label">Research Query *</label>
                    <textarea required value={researchQ} onChange={(e) => setResearchQ(e.target.value)} rows={3} className="form-input w-full resize-none" placeholder="e.g. Landmark cases on adverse possession under the Land Registration Act 2012 in Kenya…" />
                  </div>
                )}
              </div>

              <Button onClick={run} loading={running} disabled={
                (active === 'document-analysis' || active === 'contract-review') && !docText.trim() ||
                (active === 'matter-risk' || active === 'deadline-intelligence') && !matterId ||
                active === 'drafting-assistant' && !draftGoal.trim() ||
                active === 'legal-research' && !researchQ.trim()
              }>
                <Brain className="h-4 w-4" /> Run AI Analysis
              </Button>

              {/* Result */}
              {result && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-800 flex items-center gap-2">✓ Analysis Complete</p>
                  {result.output && <p className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">{typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}</p>}
                  {result.requiresHumanReview && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">⚠ Human review required before relying on this output</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent AI Artifacts */}
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
                 <Td className="text-xs text-gray-500">{a.taskType?.replace(/_/g, ' ')}</Td>
                 <Td><StatusBadge status={a.status} /></Td>
                 <Td>
                   {a.requiresHumanReview
                     ? <span className="badge-yellow text-xs">Review required</span>
                     : <span className="badge-green text-xs">Ready</span>
                   }
                 </Td>
                 <Td className="text-gray-500 text-xs">{formatDate(a.createdAt)}</Td>
                 <Td><span className="text-xs text-gray-300 cursor-not-allowed" title="Artifact detail view coming in Gate 10">View</span></Td>
               </tr>
             ))
            }
          </tbody>
        </Table>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700">
        <strong>AI Governance:</strong> All AI outputs are draft quality and must be reviewed by a qualified advocate before use in legal proceedings or client advice. Global Wakili does not accept liability for AI-generated content relied upon without human review.
      </div>
    </div>
  );
}
