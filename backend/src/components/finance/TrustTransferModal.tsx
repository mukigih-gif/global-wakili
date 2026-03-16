export const TrustTransferModal = ({ invoice, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Internal Trust Transfer</h2>
        <p className="text-sm text-slate-500 mb-4">
          Transferring funds for <strong>Invoice #{invoice.id}</strong>
        </p>
        
        <div className="bg-slate-50 p-3 rounded mb-4">
          <div className="flex justify-between text-sm">
            <span>Invoice Total:</span>
            <span className="font-mono">KES {invoice.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400">FROM TRUST ACCOUNT</label>
            <select className="w-full p-2 border rounded text-sm">
              <option>Standard Chartered - Client Trust</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400">TO OFFICE ACCOUNT</label>
            <select className="w-full p-2 border rounded text-sm">
              <option>Standard Chartered - Office Operations</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border rounded">Cancel</button>
          <button className="flex-1 py-2 bg-green-600 text-white rounded">Confirm Transfer</button>
        </div>
      </div>
    </div>
  );
};