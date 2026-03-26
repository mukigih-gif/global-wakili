"use client";

import { useState } from 'react';

export default function PayrollPage() {
  const [employeeId, setEmployeeId] = useState('');
  const [commissions, setCommissions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunPayroll = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId, 
          month: new Date().getMonth() + 1, 
          year: 2026,
          commissions 
        }),
      });
      const json = await response.json();
      setResult(json.data);
    } catch (error) {
      alert("Payroll processing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Global Wakili: Payroll Manager</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Employee ID</label>
          <input 
            type="text" 
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            placeholder="e.g. cl0xt1..."
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700">Matter Finders Fees (KES)</label>
          <input 
            type="number" 
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            value={commissions}
            onChange={(e) => setCommissions(Number(e.target.value))}
          />
        </div>

        <button 
          onClick={handleRunPayroll}
          disabled={loading || !employeeId}
          className="w-full bg-slate-800 text-white py-2 px-4 rounded-md hover:bg-slate-900 disabled:bg-slate-400 transition-colors"
        >
          {loading ? "Calculating..." : "Run March 2026 Payroll"}
        </button>
      </div>

      {result && (
        <div className="mt-8 bg-white p-8 rounded-lg shadow-lg border border-slate-200 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold border-b pb-4 mb-4">Payslip Preview</h2>
          <div className="grid grid-cols-2 gap-4">
            <p className="text-slate-500">Gross Pay:</p><p className="font-semibold text-right">KES {result.grossPay.toLocaleString()}</p>
            <p className="text-slate-500">NSSF Phase 4:</p><p className="text-red-600 text-right">-{result.nssf.toLocaleString()}</p>
            <p className="text-slate-500">SHIF (2.75%):</p><p className="text-red-600 text-right">-{result.shif.toLocaleString()}</p>
            <p className="text-slate-500">Housing Levy:</p><p className="text-red-600 text-right">-{result.housingLevy.toLocaleString()}</p>
            <p className="text-slate-500">PAYE (Net of Relief):</p><p className="text-red-600 text-right">-{result.paye.toLocaleString()}</p>
            <div className="col-span-2 border-t pt-4 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Net Salary:</span>
                <span className="text-green-700">KES {result.netPay.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}