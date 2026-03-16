import React from 'react';
import { Printer, Download } from 'lucide-react';

export const StatementOfAccount = ({ ledgerData, clientDetails }) => {
  const { summary, history, matterId } = ledgerData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg border border-slate-100 my-8 print:shadow-none print:border-none print:my-0">
      {/* 1. Header & Branding */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">GLOBAL SITES LTD</h1>
          <p className="text-sm text-slate-500 mt-1">Legal Management Division</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-800">Statement of Account</h2>
          <p className="text-sm text-slate-500">Ref: MATTER-00{matterId}</p>
          <p className="text-sm text-slate-500">Date: {new Date().toLocaleDateString('en-KE')}</p>
        </div>
      </div>

      {/* 2. Client Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client Details</h3>
          <p className="font-bold text-slate-800">{clientDetails.name}</p>
          <p className="text-slate-600">{clientDetails.address || "Nairobi, Kenya"}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Summary</h3>
          <div className="flex justify-between mb-1">
            <span className="text-slate-600">Trust Balance:</span>
            <span className="font-bold text-blue-700">{summary.formattedTrust}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 mt-1 text-xs italic text-slate-500">
            <span>Status:</span>
            <span>Finalized Balance</span>
          </div>
        </div>
      </div>

      {/* 3. The Ledger Table */}
      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="p-3 text-sm font-semibold">Date</th>
            <th className="p-3 text-sm font-semibold">Description</th>
            <th className="p-3 text-sm font-semibold text-right">Debit (Out)</th>
            <th className="p-3 text-sm font-semibold text-right">Credit (In)</th>
            <th className="p-3 text-sm font-semibold text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {history.map((tx, index) => (
            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="p-3 text-sm text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
              <td className="p-3 text-sm text-slate-800 font-medium">{tx.description}</td>
              <td className="p-3 text-sm text-right text-red-600">
                {tx.type === 'DEBIT' ? Number(tx.amount).toLocaleString() : '-'}
              </td>
              <td className="p-3 text-sm text-right text-green-600">
                {tx.type === 'CREDIT' ? Number(tx.amount).toLocaleString() : '-'}
              </td>
              <td className="p-3 text-sm text-right font-bold text-slate-900">
                {tx.runningTrustBalance.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Footer */}
      <div className="border-t border-slate-200 pt-4 text-center">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest">
          This is a computer-generated statement and does not require a signature. 
          Property of Global Sites Ltd.
        </p>
      </div>

      {/* Print Controls (Hidden when printing) */}
      <div className="mt-8 flex gap-4 print:hidden justify-center">
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-800 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-900 transition-all"
        >
          <Printer size={18} /> Print Statement
        </button>
      </div>
    </div>
  );
};