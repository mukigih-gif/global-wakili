import React, { useState } from 'react';
import { X, ArrowRightLeft, ShieldCheck } from 'lucide-react';

const TrustTransferModal = ({ isOpen, onClose, matter, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Professional Fees');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg"><ArrowRightLeft size={20}/></div>
            <h2 className="font-bold text-slate-800">Trust to Office Transfer</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <p className="text-[10px] uppercase font-bold text-blue-600 mb-1">Matter Reference</p>
            <p className="text-sm font-bold text-slate-800">{matter.title}</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Transfer Amount (KES)</label>
            <input 
              type="number" 
              className="w-full text-2xl font-black p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase">Payment Description</label>
            <input 
              className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm"
              placeholder="e.g., Filing Fees, Legal Consultation"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
          <button 
            onClick={() => onConfirm({ amount, description })}
            className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-200"
          >
            <ShieldCheck size={18}/> Authorize Drawdown
          </button>
        </div>
      </div>
    </div>
  );
};