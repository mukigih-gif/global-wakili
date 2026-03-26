// src/components/finance/InvoicePreview.tsx
export const InvoicePreview = ({ invoice, onApprove }: any) => (
  <div className="bg-white border rounded-lg shadow-2xl p-12 max-w-4xl mx-auto font-serif">
    <div className="flex justify-between border-b pb-8 mb-8">
      <div>
        <h1 className="text-2xl font-bold uppercase">Global Wakili LLP</h1>
        <p className="text-sm">Invoice No: {invoice.invoiceNumber}</p>
      </div>
      <div className="text-right text-sm">
        <p>Date: {new Date().toLocaleDateString()}</p>
        <p className="font-bold text-orange-600">STATUS: PREVIEW / DRAFT</p>
      </div>
    </div>

    {/* Table of Worklogs and Expenses */}
    <table className="w-full text-left mb-10">
      <thead>
        <tr className="bg-slate-100 italic">
          <th className="p-2">Description</th>
          <th className="p-2 text-right">Amount (KES)</th>
        </tr>
      </thead>
      <tbody>
        {invoice.items.map((item: any) => (
          <tr key={item.id} className="border-b">
            <td className="p-2">{item.description}</td>
            <td className="p-2 text-right">{item.amount.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="flex justify-end gap-4 mt-10 no-print">
      <button className="px-6 py-2 bg-slate-200 rounded" onClick={() => window.print()}>Print Preview</button>
      <button className="px-6 py-2 bg-emerald-600 text-white rounded font-bold" onClick={onApprove}>Finalize & Send</button>
    </div>
  </div>
);