// src/components/InvoiceCreator.tsx
import React, { useState, useEffect } from 'react';

export const InvoiceCreator = ({ matterId }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAcc, setSelectedAcc] = useState("");

  useEffect(() => {
    // Fetch accounts from your API
    fetch('/api/firm/accounts')
      .then(res => res.json())
      .then(data => {
        setAccounts(data);
        // Pre-select the default account if it exists
        const def = data.find(a => a.isDefault);
        if (def) setSelectedAcc(def.id);
      });
  }, []);

  const handleGenerate = async () => {
    const res = await fetch(`/api/matters/${matterId}/invoice`, {
      method: 'POST',
      body: JSON.stringify({ paymentDetailId: selectedAcc })
    });
    if (res.ok) alert("Invoice Generated!");
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h3 className="text-lg font-bold mb-3">Billing Options</h3>
      
      <label className="block text-sm font-medium text-gray-700">Payment Destination</label>
      <select 
        className="mt-1 block w-full border rounded-md p-2"
        value={selectedAcc}
        onChange={(e) => setSelectedAcc(e.target.value)}
      >
        {accounts.map(acc => (
          <option key={acc.id} value={acc.id}>
            {acc.label} — {acc.bankName || 'M-Pesa'} ({acc.accountNumber})
          </option>
        ))}
      </select>

      <button 
        onClick={handleGenerate}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
      >
        Generate eTIMS Invoice
      </button>
    </div>
  );
};