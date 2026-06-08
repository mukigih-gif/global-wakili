'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Tag, Plus, Trash2, Briefcase, Users, CheckSquare, FileText, Scale } from 'lucide-react';
import Link from 'next/link';

type LabelDef = { id: string; name: string; color: string; module: string };

const MODULES = [
  { key: 'TASK',     label: 'Tasks',         icon: <CheckSquare className="h-4 w-4" />, description: 'Labels for task workflow (Research, Drafting, Court Prep…)' },
  { key: 'MATTER',   label: 'Matters',       icon: <Briefcase className="h-4 w-4" />,   description: 'Labels for matter classification (Pro Bono, IP, Urgent…)' },
  { key: 'CLIENT',   label: 'Clients',       icon: <Users className="h-4 w-4" />,       description: 'Labels for client segmentation (VIP, Referred, At-Risk…)' },
  { key: 'DOCUMENT', label: 'Documents',     icon: <FileText className="h-4 w-4" />,    description: 'Labels for document type/status (Signed, Draft, Expired…)' },
  { key: 'COURT',    label: 'Court Filings', icon: <Scale className="h-4 w-4" />,       description: 'Labels for filings (Pending Service, Objected, Filed…)' },
];

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#64748b', '#1e293b',
];

export default function LabelsSettingsPage() {
  const [labels, setLabels]         = useState<Record<string, LabelDef[]>>({});
  const [loading, setLoading]       = useState(true);
  const [activeModule, setActiveModule] = useState('TASK');
  const [form, setForm]             = useState({ name: '', color: '#6366f1' });
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [error, setError]           = useState('');

  const load = () => {
    setLoading(true);
    api.get<{ data: Record<string, LabelDef[]> }>('/settings/labels')
      .then((r) => setLabels(r.data ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError('');
    try {
      await api.post('/settings/labels', { module: activeModule, name: form.name.trim(), color: form.color });
      setForm({ name: '', color: '#6366f1' });
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create label');
    } finally { setSaving(false); }
  };

  const handleDelete = async (labelId: string) => {
    setDeleting(labelId);
    try {
      await api.delete(`/settings/labels/${labelId}?module=${activeModule}`);
      load();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const currentLabels = labels[activeModule] ?? [];
  const mod = MODULES.find((m) => m.key === activeModule);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/settings" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Labels</h1>
          <p className="text-sm text-gray-500">Define per-module labels that staff can apply to records</p>
        </div>
      </div>

      {/* Module tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {MODULES.map((m) => (
          <button key={m.key} onClick={() => setActiveModule(m.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeModule === m.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {m.icon}{m.label}
            {(labels[m.key]?.length ?? 0) > 0 && (
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{labels[m.key]?.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Module description */}
      {mod && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          {mod.icon} {mod.description}
        </p>
      )}

      {/* Add label form */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Plus className="h-4 w-4 text-primary-600" /> Add Label</h3>
        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="form-label">Label Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="form-input w-full"
              placeholder={`e.g. ${activeModule === 'TASK' ? 'Court Prep' : activeModule === 'MATTER' ? 'Pro Bono' : activeModule === 'CLIENT' ? 'VIP' : 'Signed'}`}
              maxLength={32}
            />
          </div>
          <div>
            <label className="form-label">Colour</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-9 w-12 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <Button type="submit" loading={saving} size="sm">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </form>

        {/* Preview */}
        {form.name && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Preview:</span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium text-white" style={{ backgroundColor: form.color }}>
              <Tag className="h-3 w-3" />{form.name}
            </span>
          </div>
        )}
      </div>

      {/* Label list */}
      <div className="card divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : currentLabels.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No labels defined for {mod?.label}</p>
            <p className="text-xs text-gray-400 mt-1">Add your first label using the form above</p>
          </div>
        ) : (
          currentLabels.map((label) => (
            <div key={label.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium text-white" style={{ backgroundColor: label.color }}>
                  <Tag className="h-3.5 w-3.5" />{label.name}
                </span>
                <span className="text-xs text-gray-400 font-mono">{label.color}</span>
              </div>
              <button
                onClick={() => handleDelete(label.id)}
                disabled={deleting === label.id}
                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                title="Delete label"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700">
        <strong>How labels work:</strong> Labels defined here appear on {MODULES.map((m) => m.label).join(', ')} records.
        Staff can apply or remove labels directly from each record. Admins and Partners can filter/search by label.
        Labels are per-branch and tenant-scoped.
      </div>
    </div>
  );
}
