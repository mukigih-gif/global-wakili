'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Table, Th, Td, EmptyRow, LoadingRow } from '@/components/ui/Table';
import { UserCheck, Plus, CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type OnboardingRecord = {
  id: string;
  employeeName: string;
  email: string;
  position: string;
  department: string;
  startDate: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
};

const ONBOARDING_STEPS = [
  { id: 'offer_letter',      label: 'Offer Letter Signed',          category: 'Legal' },
  { id: 'id_documents',      label: 'ID / Passport Submitted',       category: 'Legal' },
  { id: 'kra_pin',           label: 'KRA PIN Registered',           category: 'Tax' },
  { id: 'nssf',              label: 'NSSF Number Registered',       category: 'Statutory' },
  { id: 'shif',              label: 'SHIF Registration',            category: 'Statutory' },
  { id: 'bank_details',      label: 'Bank Account Details',         category: 'Payroll' },
  { id: 'it_access',         label: 'IT Access / Email Created',    category: 'IT' },
  { id: 'system_training',   label: 'System Training Completed',    category: 'Training' },
  { id: 'induction',         label: 'Firm Induction Done',          category: 'Training' },
  { id: 'portal_access',     label: 'Employee Portal Activated',    category: 'System' },
];

export default function EmployeeOnboardingPage() {
  const [records, setRecords]       = useState<OnboardingRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [selected, setSelected]     = useState<OnboardingRecord | null>(null);
  const [steps, setSteps]           = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    employeeName: '', email: '', position: '', department: '', startDate: '',
  });

  const load = () => {
    setLoading(true);
    api.get<{ data: OnboardingRecord[] }>('/hr/onboarding?limit=50')
      .then((r) => setRecords(r.data ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/hr/onboarding', form);
      setShowForm(false);
      setForm({ employeeName: '', email: '', position: '', department: '', startDate: '' });
      load();
    } catch { } finally { setSaving(false); }
  };

  const completeStep = async (stepId: string, checked: boolean) => {
    if (!selected) return;
    setSteps((s) => ({ ...s, [stepId]: checked }));
    await api.patch(`/hr/onboarding/${selected.id}/steps`, { stepId, completed: checked }).catch(() => null);
  };

  const completedCount  = ONBOARDING_STEPS.filter((s) => steps[s.id]).length;
  const progressPercent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/app/hr" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><UserCheck className="h-6 w-6 icon-hr" /> Employee Onboarding</h1>
            <p className="text-sm text-gray-500">Structured onboarding checklist for new hires — Kenya labour law compliant</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Hire</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Clock className="h-3.5 w-3.5 icon-ops" /> In Progress</p>
          <p className="text-2xl font-bold text-gray-900">{records.filter((r) => r.status === 'IN_PROGRESS').length}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-xs text-green-600 mb-1 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> Completed</p>
          <p className="text-2xl font-bold text-green-800">{records.filter((r) => r.status === 'COMPLETED').length}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-600 mb-1 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Pending</p>
          <p className="text-2xl font-bold text-amber-800">{records.filter((r) => r.status === 'PENDING').length}</p>
        </div>
      </div>

      {/* New hire form */}
      {showForm && (
        <div className="card p-6 space-y-4 border-primary-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">New Employee Onboarding</h2>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <form onSubmit={submitNew} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full Name *" required value={form.employeeName} onChange={(e) => set('employeeName', e.target.value)} />
            <Input label="Email *" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Position *" required value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Associate Advocate" />
            <div>
              <label className="form-label">Department</label>
              <select value={form.department} onChange={(e) => set('department', e.target.value)} className="form-select w-full">
                <option value="">Select department</option>
                <option value="LITIGATION">Litigation</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="CONVEYANCING">Conveyancing</option>
                <option value="EMPLOYMENT">Employment</option>
                <option value="ADMINISTRATION">Administration</option>
                <option value="FINANCE">Finance</option>
                <option value="HR">Human Resources</option>
                <option value="IT">Information Technology</option>
              </select>
            </div>
            <Input label="Start Date *" type="date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} min={new Date().toISOString().slice(0,10)} />
            <div className="sm:col-span-2 flex gap-3">
              <Button type="submit" loading={saving}>Create Onboarding Record</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Onboarding list */}
        <div className="lg:col-span-2">
          <Table>
            <thead><tr><Th>Employee</Th><Th>Position</Th><Th>Start Date</Th><Th>Progress</Th><Th>Status</Th></tr></thead>
            <tbody>
              {loading ? <LoadingRow colSpan={5} /> :
               !records.length ? (
                 <tr><td colSpan={5} className="px-4 py-8 text-center">
                   <div className="space-y-2">
                     <UserCheck className="h-10 w-10 text-gray-200 mx-auto" />
                     <p className="text-sm text-gray-500">No onboarding records. Add your first new hire above.</p>
                     <p className="text-xs text-gray-400">The 10-step checklist covers legal, statutory, payroll and IT requirements.</p>
                   </div>
                 </td></tr>
               ) : records.map((r) => (
                 <tr key={r.id} className="cursor-pointer hover:bg-gray-50" onClick={() => { setSelected(r); setSteps({}); }}>
                   <Td>
                     <div>
                       <p className="font-medium text-gray-900">{r.employeeName}</p>
                       <p className="text-xs text-gray-400">{r.email}</p>
                     </div>
                   </Td>
                   <Td className="text-sm text-gray-600">{r.position}</Td>
                   <Td className="text-xs text-gray-500">{formatDate(r.startDate)}</Td>
                   <Td>
                     <div className="space-y-1">
                       <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round(((r.completedSteps||0) / (r.totalSteps||10)) * 100)}%` }} />
                       </div>
                       <p className="text-[11px] text-gray-400">{r.completedSteps ?? 0}/{r.totalSteps ?? 10} steps</p>
                     </div>
                   </Td>
                   <Td><StatusBadge status={r.status ?? 'PENDING'} /></Td>
                 </tr>
               ))}
            </tbody>
          </Table>
        </div>

        {/* Checklist panel */}
        <div className="card p-4">
          {!selected ? (
            <div className="text-center text-gray-400 py-8">
              <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select an employee to see their checklist</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900">{selected.employeeName}</h3>
                <p className="text-xs text-gray-400">{selected.position}</p>
                <div className="mt-2 space-y-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-xs text-gray-500">{completedCount}/{ONBOARDING_STEPS.length} steps complete ({progressPercent}%)</p>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {ONBOARDING_STEPS.map((step) => (
                  <label key={step.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded p-1.5 transition-colors">
                    <input type="checkbox" checked={steps[step.id] ?? false} onChange={(e) => completeStep(step.id, e.target.checked)} className="rounded border-gray-300 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className={`text-xs font-medium ${steps[step.id] ? 'line-through text-gray-400' : 'text-gray-900'}`}>{step.label}</p>
                      <p className="text-[11px] text-gray-400">{step.category}</p>
                    </div>
                  </label>
                ))}
              </div>
              {progressPercent === 100 && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Onboarding complete! Employee is fully set up.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
