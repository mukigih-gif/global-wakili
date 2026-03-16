import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LedgerEntry {
  dateFormatted: string;
  description: string;
  ref: string;
  debit: number;
  credit: number;
  runningBalance: string;
  type: 'RECEIPT' | 'INVOICE' | 'EXPENSE';
}

interface LedgerData {
  matterName: string;
  clientName: string;
  ledger: LedgerEntry[];
  finalBalance: string;
  isStatementClean: boolean;
}

const MatterLedger: React.FC<{ matterId: number }> = ({ matterId }) => {
  const [data, setData] = useState<LedgerData | null>(null);

  useEffect(() => {
    fetch(`/api/finance/ledger/${matterId}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error("Ledger Load Error:", err));
  }, [matterId]);

  if (!data) return <div className="p-4 text-gray-400 italic">Select a matter to view ledger...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{data.matterName}</h3>
          <p className="text-sm text-gray-500">Client: {data.clientName}</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Export Statement
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-right">Debit (Dr)</th>
              <th className="px-6 py-4 text-right">Credit (Cr)</th>
              <th className="px-6 py-4 text-right">Balance (KES)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.ledger.map((entry, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-gray-600">{entry.dateFormatted}</td>
                <td className="px-6 py-4 font-medium text-gray-800">{entry.description}</td>
                <td className="px-6 py-4 text-right text-red-600">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                <td className="px-6 py-4 text-right text-emerald-600">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                <td className="px-6 py-4 text-right font-semibold text-gray-900">{Number(entry.runningBalance).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / Summary */}
      <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end items-center space-x-6">
        <div className="flex items-center">
          {data.isStatementClean ? (
            <span className="flex items-center text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Fully Funded
            </span>
          ) : (
            <span className="flex items-center text-amber-600 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 mr-1" /> Outstanding Balance
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase font-bold">Closing Balance</p>
          <p className={`text-2xl font-black ${Number(data.finalBalance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            KES {Number(data.finalBalance).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatterLedger;