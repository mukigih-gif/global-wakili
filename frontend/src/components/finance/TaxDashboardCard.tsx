import { ShieldCheck, Download } from 'lucide-react';

const TaxVault = ({ taxData }) => {
  return (
    <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 mt-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-500 text-white rounded-lg"><ShieldCheck size={20}/></div>
          <h3 className="font-bold text-rose-900">KRA eTIMS Vault</h3>
        </div>
        <button className="text-[10px] font-bold bg-white px-3 py-1 rounded-full shadow-sm text-rose-600 hover:bg-rose-100">
          GENERATE VAT-3 FORM
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase font-bold text-rose-400">VAT Liability (16%)</p>
          <p className="text-xl font-black text-rose-900">KES {taxData.vatPayable.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-rose-400">Total Taxable</p>
          <p className="text-xl font-black text-rose-900">KES {taxData.taxableAmount.toLocaleString()}</p>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-rose-200 flex justify-between items-center">
        <span className="text-[10px] text-rose-500 font-medium italic">Device: {process.env.KRA_DEVICE_SERIAL}</span>
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> KRA Sync Active
        </span>
      </div>
    </div>
  );
};