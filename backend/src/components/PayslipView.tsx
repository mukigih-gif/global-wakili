import React from 'react';

interface PayslipProps {
  data: {
    month: number;
    year: number;
    basePay: number;
    commissions: number;
    grossPay: number;
    nssf: number;
    shif: number;
    housingLevy: number;
    paye: number;
    netPay: number;
  };
}

export const PayslipView = ({ data }: PayslipProps) => {
  return (
    <div className="max-w-xl mx-auto p-10 bg-white border border-gray-300 rounded shadow-sm font-serif">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-widest">Global Wakili LLP</h1>
        <p className="text-sm italic">Advocates & Legal Consultants</p>
        <p className="text-xs mt-2 underline">PAYSLIP: {data.month}/{data.year}</p>
      </div>

      <div className="space-y-4">
        <section>
          <h3 className="font-bold border-b text-sm mb-2">EARNINGS</h3>
          <div className="flex justify-between text-sm"><span>Basic Salary</span><span>{data.basePay}</span></div>
          <div className="flex justify-between text-sm"><span>Finders Fees / Commissions</span><span>{data.commissions}</span></div>
          <div className="flex justify-between font-bold text-sm pt-2"><span>TOTAL GROSS</span><span>{data.grossPay}</span></div>
        </section>

        <section>
          <h3 className="font-bold border-b text-sm mb-2">STATUTORY DEDUCTIONS</h3>
          <div className="flex justify-between text-sm"><span>NSSF (Tier I & II)</span><span>({data.nssf})</span></div>
          <div className="flex justify-between text-sm"><span>SHIF (Medical)</span><span>({data.shif})</span></div>
          <div className="flex justify-between text-sm"><span>Housing Levy</span><span>({data.housingLevy})</span></div>
          <div className="flex justify-between text-sm"><span>P.A.Y.E (KRA)</span><span>({data.paye})</span></div>
        </section>

        <section className="bg-gray-100 p-4 rounded mt-6">
          <div className="flex justify-between text-lg font-bold">
            <span>NET PAYABLE</span>
            <span>KES {data.netPay.toLocaleString()}</span>
          </div>
        </section>
      </div>

      <div className="mt-10 text-[10px] text-gray-400 text-center uppercase">
        Computer Generated - No Signature Required
      </div>
    </div>
  );
};