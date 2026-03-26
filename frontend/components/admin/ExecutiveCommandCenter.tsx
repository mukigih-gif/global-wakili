// src/components/admin/ExecutiveCommandCenter.tsx
import React from 'react';

export const ExecutiveCommandCenter = ({ balances, liabilities }: any) => (
  <div className="p-6 bg-slate-50 min-h-screen">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Real-time Bank Balance */}
      <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-blue-600">
        <p className="text-xs font-bold text-slate-500 uppercase">Operating Bank</p>
        <h2 className="text-2xl font-black text-slate-900">KES {balances.bank.toLocaleString()}</h2>
      </div>

      {/* M-Pesa Business Float */}
      <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-emerald-500">
        <p className="text-xs font-bold text-slate-500 uppercase">M-Pesa Float</p>
        <h2 className="text-2xl font-black text-slate-900">KES {balances.mpesa.toLocaleString()}</h2>
      </div>

      {/* Trust Account (Client Money) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-amber-500">
        <p className="text-xs font-bold text-slate-500 uppercase">Total Trust (Liability)</p>
        <h2 className="text-2xl font-black text-slate-900">KES {balances.trust.toLocaleString()}</h2>
      </div>

      {/* KRA Tax Liability */}
      <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-red-600">
        <p className="text-xs font-bold text-slate-500 uppercase">Est. KRA (VAT/WHT)</p>
        <h2 className="text-2xl font-black text-red-600">KES {liabilities.kra.toLocaleString()}</h2>
      </div>
    </div>
  </div>
);