// src/components/admin/ExecutiveDashboard.tsx
import React from 'react';

export const CommandDashboard = ({ data }: any) => (
  <div className="space-y-6 p-6 bg-slate-50">
    {/* Executive Summary Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-blue-600">
        <h3 className="text-slate-500 text-xs font-bold uppercase">Bank Float</h3>
        <p className="text-2xl font-black">KES {data.bankBalance.toLocaleString()}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-emerald-500">
        <h3 className="text-slate-500 text-xs font-bold uppercase">M-Pesa Float</h3>
        <p className="text-2xl font-black">KES {data.mpesaFloat.toLocaleString()}</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-sm border-b-4 border-red-500">
        <h3 className="text-slate-500 text-xs font-bold uppercase">KRA Liabilities</h3>
        <p className="text-2xl font-black text-red-600">KES {data.kraTax.toLocaleString()}</p>
      </div>
    </div>
  </div>
);