import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Wallet } from 'lucide-react';

const FinancialApprovals = () => {
  const [pendingDRNs, setPendingDRNs] = useState([]);

  // Fetch only transactions with status 'PENDING_APPROVAL'
  useEffect(() => {
    fetch('/api/finance/approvals')
      .then(res => res.json())
      .then(data => setPendingDRNs(data));
  }, []);

  const handleAction = async (id, action) => {
    const response = await fetch(`/api/finance/approve-drn/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }) // 'APPROVE' or 'REJECT'
    });
    
    if (response.ok) {
      setPendingDRNs(prev => prev.filter(item => item.id !== id));
      alert(`Transaction ${action === 'APPROVE' ? 'Approved & Funds Allocated' : 'Rejected'}`);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Financial Approvals</h1>
      <p className="text-slate-500 mb-8">Review and authorize Digital Request Notes (DRNs)</p>

      <div className="grid gap-4">
        {pendingDRNs.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
            <CheckCircle className="mx-auto text-slate-300 mb-4" size={48}/>
            <p className="text-slate-500 font-medium">All clear! No pending requests.</p>
          </div>
        ) : (
          pendingDRNs.map((drn) => (
            <div key={drn.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div className="flex gap-4 items-center">
                <div className="bg-orange-100 p-3 rounded-full text-orange-600">
                  <Wallet size={24}/>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{drn.description}</h3>
                  <p className="text-sm text-slate-500">Matter: {drn.matter?.title || 'General Office'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">KES {drn.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{drn.accountType} ACCOUNT</p>
                </div>
                <div className="flex gap-2 border-l pl-6 border-slate-100">
                  <button onClick={() => handleAction(drn.id, 'REJECT')} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <XCircle size={24}/>
                  </button>
                  <button onClick={() => handleAction(drn.id, 'APPROVE')} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                    <CheckCircle size={24}/>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FinancialApprovals;