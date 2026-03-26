import React, { useEffect, useState } from 'react';

export const SupplierDashboard = () => {
  const [procurements, setProcurements] = useState([]);

  // Logic: Fetch all procurements and highlight compliance gaps
  const checkCompliance = (item) => {
    return item.supplierInvoice ? "COMPLIANT" : "BLOCKED_BY_KRA";
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Supplier & Procurement Ledger</h2>
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th>Supplier</th>
            <th>Description</th>
            <th>Amount</th>
            <th>eTIMS Invoice No.</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {procurements.map((item) => (
            <tr key={item.id} className="border-t">
              <td>{item.supplier.name}</td>
              <td>{item.description}</td>
              <td>{item.amount}</td>
              <td className={!item.supplierInvoice ? "text-red-500 font-bold" : ""}>
                {item.supplierInvoice || "MISSING E-TIMS"}
              </td>
              <td>
                <span className={`px-2 py-1 rounded ${item.status === 'PAID' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {item.status}
                </span>
              </td>
              <td>
                {checkCompliance(item) === "BLOCKED_BY_KRA" ? (
                  <button className="bg-gray-400 text-white px-3 py-1 cursor-not-allowed" disabled>
                    Awaiting eTIMS
                  </button>
                ) : (
                  <button className="bg-blue-600 text-white px-3 py-1">Approve Payment</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};