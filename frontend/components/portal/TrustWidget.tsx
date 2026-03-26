// src/components/portal/TrustWidget.tsx
import React from 'react';

export const TrustWidget = ({ balance }: { balance: number }) => (
  <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Available Trust Balance</p>
    <div className="flex items-baseline gap-2 mt-2">
      <span className="text-3xl font-bold">KES {balance.toLocaleString()}</span>
    </div>
    <div className="mt-4 flex gap-2">
      <button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg transition">
        View Statement
      </button>
    </div>
  </div>
);