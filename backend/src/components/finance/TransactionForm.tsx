import React, { useState } from 'react';
import { DollarSign, Landmark, FileText, Calendar, PlusCircle } from 'lucide-react';

export const TransactionForm = ({ matterId, onTransactionAdded }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'CREDIT', // CREDIT (In) or DEBIT (Out)
    accountType: 'TRUST', // TRUST or OFFICE
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, matterId }),
      });

      if (response.ok) {
        setFormData({ ...formData, description: '', amount: '' }); // Reset fields
        onTransactionAdded(); // Refresh the ledger view
        alert("Transaction recorded successfully!");
      }
    } catch (error) {
      alert("Error recording transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
      <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold">
        <PlusCircle size={18} className="text-blue-600" />
        Record New Transaction
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              required
              placeholder="e.g., Initial Deposit for Plot 123"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount (KES)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="number"
              required
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="date"
              required
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        {/* Account Type (Trust vs Office) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Account</label>
          <select 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white outline-none"
            value={formData.accountType}
            onChange={(e) => setFormData({...formData, accountType: e.target.value})}
          >
            <option value="TRUST">Trust Account (Client Money)</option>
            <option value="OFFICE">Office Account (Firm Money)</option>
          </select>
        </div>

        {/* Transaction Type (In vs Out) */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Type</label>
          <select 
            className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white outline-none"
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="CREDIT">Credit (Money In)</option>
            <option value="DEBIT">Debit (Money Out)</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? "Processing..." : "Record Transaction"}
      </button>
    </form>
  );
};