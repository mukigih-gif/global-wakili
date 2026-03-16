import React, { useState, useEffect } from 'react';
import { Briefcase, ShieldCheck, CreditCard, Clock, FileText } from 'lucide-react';

const ClientPortfolio = ({ clientId = 1 }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetches the client, their matters, and associated financial totals
    fetch(`/api/clients/${clientId}/portfolio`)
      .then(res => res.json())
      .then(json => setData(json));
  }, [clientId]);

  if (!data) return <div className="p-8 text-slate-400">Loading Portfolio...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Client Header */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                {data.kycStatus} Client
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{data.name}</h1>
            <p className="text-slate-500">{data.email} • {data.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trust Balance</p>
            <h2 className="text-3xl font-bold text-blue-600">KES {data.trustBalance.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Matters */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Briefcase size={20} className="text-blue-600"/> Active Matters
          </h3>
          {data.matters.map(matter => (
            <div key={matter.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{matter.title}</h4>
                  <p className="text-sm text-slate-500">{matter.caseNumber}</p>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg uppercase">
                  {matter.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t pt-4 border-slate-50">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Unbilled Hours</p>
                  <p className="font-semibold text-slate-700">{matter.unbilledHours}h</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">WIP Value</p>
                  <p className="font-semibold text-slate-700 font-mono">KES {matter.wipValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Rate</p>
                  <p className="font-semibold text-slate-700">KES {matter.customRate || 'Standard'}/hr</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Quick Stats & Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard size={18}/> Billing Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Total Invoiced</span>
                <span className="font-bold">KES 0</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 text-sm">Outstanding</span>
                <span className="font-bold text-orange-400 text-lg">KES {data.totalUnbilled.toLocaleString()}</span>
              </div>
            </div>
            <button className="w-full mt-6 bg-blue-600 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all">
              Generate Statement
            </button>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500"/> KYC Status</h3>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full"></div>
              </div>
              <span className="text-xs font-bold text-emerald-600">100% Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortfolio;