// src/components/finance/InvoicePrint.tsx
export const InvoicePrint = ({ invoice, matter, client }: any) => (
  <div className="p-10 bg-white max-w-4xl mx-auto border" id="printable-invoice">
    <div className="flex justify-between items-start mb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold">GLOBAL WAKILI LLP</h1>
        <p className="text-sm">Upper Hill, Nairobi | info@globalwakili.com</p>
      </div>
      <div className="text-right">
        <h2 className="text-xl font-bold">INVOICE</h2>
        <p>#{invoice.invoiceNumber}</p>
        <p>Date: {new Date().toLocaleDateString()}</p>
      </div>
    </div>

    <div className="mb-8">
      <h3 className="font-bold border-b mb-2">BILL TO:</h3>
      <p>{client.name}</p>
      <p>{client.address}</p>
    </div>

    <table className="w-full mb-10">
      <thead className="bg-slate-100">
        <tr>
          <th className="p-2 text-left">Description</th>
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

    <div className="flex justify-end">
      <div className="w-64">
        <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
          <span>TOTAL DUE:</span>
          <span>KES {invoice.total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
);