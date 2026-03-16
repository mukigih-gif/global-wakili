import React, { useEffect, useState } from 'react';

const LawyerPerformance = () => {
  const [report, setReport] = useState<{name: string, total: number, formattedTotal: string}[]>([]);

  useEffect(() => {
    fetch('/api/finance/lawyer-revenue')
      .then(res => res.json())
      .then(setReport);
  }, []);

  const maxRevenue = Math.max(...report.map(r => r.total), 1);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue by Fee Earner</h3>
      <div className="space-y-6">
        {report.map((lawyer, idx) => (
          <div key={idx}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{lawyer.name}</span>
              <span className="font-bold text-gray-900">{lawyer.formattedTotal}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${(lawyer.total / maxRevenue) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LawyerPerformance;