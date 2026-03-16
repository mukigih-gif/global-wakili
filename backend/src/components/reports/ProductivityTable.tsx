// src/components/reports/ProductivityTable.tsx
import { UserCheck, FileText, TrendingUp } from 'lucide-react';

export const ProductivityTable = ({ data }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <UserCheck size={18} className="text-blue-600" /> Staff Productivity Report
        </h3>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
          <tr>
            <th className="px-6 py-3">Staff Member</th>
            <th className="px-6 py-3 text-center">Invoices Issued</th>
            <th className="px-6 py-3 text-right">Portfolio Value</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((staff, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-medium text-slate-900">{staff.staffName}</td>
              <td className="px-6 py-4 text-center">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                  {staff.invoicesProcessed} Files
                </span>
              </td>
              <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                KES {staff.totalValueManaged.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};