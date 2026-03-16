import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, ArrowRight } from 'lucide-react';

const TopUpDeposit = ({ clientId = 1 }) => {
  const [matters, setMatters] = useState([]);
  const [selectedMatter, setSelectedMatter] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    // Load only this client's active matters
    fetch(`http://localhost:5000/api/portal/matters/${clientId}`)
      .then(res => res.json())
      .then(data => setMatters(data));
  }, [clientId]);

  const handlePayment = async () => {
    // Integrated Payment Logic (e.g., M-Pesa / Card)
    const response = await fetch('/api/portal/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matterId: selectedMatter,
        amount: parseFloat(amount),
        description: `Client Deposit via Portal`
      })
    });
    if (response.ok) alert("Payment Successful! Trust Balance Updated.");
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-md">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <CreditCard className="text-blue-600"/> Refill Trust Account
      </h3>

      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Select Matter</label>
          <select 
            className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none text-sm"
            onChange={(e) => setSelectedMatter(e.target.value)}
          >
            <option value="">Choose a Case...</option>
            {matters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Amount (KES)</label>
          <input 
            type="number" 
            placeholder="0.00"
            className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <button 
          onClick={handlePayment}
          disabled={!selectedMatter || !amount}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          Pay Now <ArrowRight size={18}/>
        </button>
      </div>
    </div>
  );
};