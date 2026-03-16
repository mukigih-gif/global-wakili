import React, { useState } from 'react';
import { ArrowRightLeft, ShieldCheck, Loader2 } from 'lucide-react';

interface DrawdownProps {
  invoiceId: number;
  invoiceAmount: number;
  matterName: string;
  onSuccess: () => void;
  onClose: () => void;
}

const DrawdownModal: React.FC<DrawdownProps> = ({ invoiceId, invoiceAmount, matterName, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransfer = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/finance/drawdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          trustAccountId: 1, // Usually mapped per matter in a full system
          officeAccountId: 2 // The firm's main operating account
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Transfer failed");

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6 text-center border-b border-gray-50">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowRightLeft className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Confirm Trust Transfer</h3>
          <p className="text-sm text-gray-500 mt-1">{matterName}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-sm text-gray-500">Transfer Amount</span>
            <span className="text-lg font-bold text-gray-900">KES {invoiceAmount.toLocaleString()}</span>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800">
              <strong>LSK Compliance:</strong> This action will move funds from the Client Trust Account to the Firm Office Account to satisfy Invoice #{invoiceId}.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 flex space-x-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button 
            onClick={handleTransfer}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawdownModal;