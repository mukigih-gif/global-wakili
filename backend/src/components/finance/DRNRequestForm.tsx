import React, { useState } from 'react';
import { FileText, Send } from 'lucide-react';

const DRNRequestForm = ({ matterId, onIniate }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText size={18} className="text-emerald-600"/> New Payment Request (DRN)
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Amount (KES)</label>
          <input 
            type="number" 
            className="w-full p-2 bg-slate-50 border-none rounded-lg text-lg font-bold"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Purpose / Category</label>
          <input 
            className="w-full p-2 bg-slate-50 border-none rounded-lg text-sm"
            placeholder="e.g. Filing Fees for E-Court"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button 
          onClick={() => onIniate({ amount, description })}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
        >
          <Send size={16}/> Submit for Approval
        </button>
      </div>
    </div>
  );
};

export default DRNRequestForm;