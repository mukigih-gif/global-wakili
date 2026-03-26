// src/components/admin/ExecutiveSummary.tsx
import React from 'react';

export const ExecutiveSummary = ({ portfolio }: any) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
    <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
      <h2 className="font-bold">Cumulative Portfolio: {portfolio.clientName}</h2>
      <span className="text-xs bg-emerald-500 px-2 py-1 rounded">LIVE LEDGER</span>
    </div>
    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b">
      <div className="p-6 text-center">
        <p className="text-xs text-slate-500 uppercase font-bold">Total Trust</p>
        <p className="text-xl font-black text-slate-900">KES {portfolio.totalPortfolioTrust.toLocaleString()}</p>
      </div>
      <div className="p-6 text-center">
        <p className="text-xs text-slate-500 uppercase font-bold">Total Outstanding</p>
        <p className="text-xl font-black text-red-600">KES {portfolio.totalPortfolioDebt.toLocaleString()}</p>
      </div>
      <div className="p-6 text-center bg-slate-50">
        <p className="text-xs text-slate-500 uppercase font-bold">Net Position</p>
        <p className={`text-xl font-black ${portfolio.grandNetPosition >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          KES {portfolio.grandNetPosition.toLocaleString()}
        </p>
      </div>
    </div>
  </div>
);