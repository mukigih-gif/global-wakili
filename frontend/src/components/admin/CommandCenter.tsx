// src/components/admin/CommandCenter.tsx
export const CommandCenter = ({ bank, mpesa, kra }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50">
    <div className="p-4 bg-white border-l-4 border-blue-600 shadow-sm">
      <p className="text-xs text-slate-500 uppercase">Bank Account</p>
      <h2 className="text-2xl font-bold">KES {bank.toLocaleString()}</h2>
    </div>
    <div className="p-4 bg-white border-l-4 border-emerald-500 shadow-sm">
      <p className="text-xs text-slate-500 uppercase">M-Pesa Float</p>
      <h2 className="text-2xl font-bold">KES {mpesa.toLocaleString()}</h2>
    </div>
    <div className="p-4 bg-white border-l-4 border-red-500 shadow-sm">
      <p className="text-xs text-slate-500 uppercase">KRA Liability (Est.)</p>
      <h2 className="text-2xl font-bold">KES {kra.toLocaleString()}</h2>
    </div>
  </div>
);