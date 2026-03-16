import React, { useState } from 'react';
import { FileDown, Receipt, CheckCircle } from 'lucide-react';

const InvoiceGenerator = ({ matterId }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // This calls the BillingService logic we mapped earlier
      const response = await fetch(`/api/billing/generate-invoice/${matterId}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert("Invoice generated and saved to Matter documents!");
      }
    } catch (error) {
      console.error("Billing error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mt-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <Receipt size={20}/> Billing & Invoicing
          </h3>
          <p className="text-blue-700 text-xs mt-1">
            Generate a tax-compliant invoice for all unbilled hours and DRNs.
          </p>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md"
        >
          {isGenerating ? 'Processing...' : <><FileDown size={16}/> Generate PDF</>}
        </button>
      </div>
    </div>
  );
};

export default InvoiceGenerator;