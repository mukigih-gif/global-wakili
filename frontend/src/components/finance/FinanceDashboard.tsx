import React, { useEffect, useState } from 'react';
import { Landmark, AlertCircle, TrendingUp, Receipt } from 'lucide-react';

const FinanceDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/health').then(res => res.json()).then(setData);
  }, []);

  if (!data) return <p>Loading Firm Vitals...</p>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Firm Financial Health</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Office Account Card */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600"><Landmark size={24}/></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Office Account</span>
          </div>
          <p className="text-3xl font-black text-slate-900">KES {data.summary.officeAccount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">Operating Capital</p>
        </div>

        {/* Trust Account Card */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><TrendingUp size={24}/></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trust Account</span>
          </div>
          <p className="text-3xl font-black text-slate-900">KES {data.summary.trustAccount.toLocaleString()}</p>
          <p className="text-xs text-emerald-500 mt-2 font-bold">Client-Owned Funds</p>
        </div>

        {/* Pending Approval Card */}
        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/10 rounded-2xl text-amber-400"><AlertCircle size={24}/></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Approvals</span>
          </div>
          <p className="text-3xl font-black italic">KES {data.summary.exposure.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">Unresolved DRNs from Koki</p>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Receipt className="text-blue-600"/> Live Transaction Feed
        </h2>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
              <th className="pb-4">Date</th>
              <th className="pb-4">Description</th>
              <th className="pb-4">Matter</th>
              <th className="pb-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.recentActivity.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-50 last:border-0">
                <td className="py-4 text-sm text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="py-4 font-medium text-slate-900">{tx.description}</td>
                <td className="py-4 text-sm text-blue-600 font-semibold">{tx.matter?.title || 'General'}</td>
                <td className={`py-4 font-bold ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'} KES {tx.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};