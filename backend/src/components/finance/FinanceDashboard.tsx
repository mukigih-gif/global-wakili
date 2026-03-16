import React, { useEffect, useState } from 'react';
import { Wallet, Receipt, Hourglass, AlertCircle } from 'lucide-react';

interface FinanceSummary {
  wip: string;
  receivables: string;
  trustLiability: string;
}

const FinanceDashboard: React.FC = () => {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/finance/summary')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => console.error("Failed to load dashboard stats", err));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading firm health data...</div>;

  const cards = [
    {
      title: "Work In Progress (WIP)",
      value: data?.wip,
      description: "Unbilled time entries",
      icon: <Hourglass className="text-amber-600" />,
      bgColor: "bg-amber-50",
    },
    {
      title: "Accounts Receivable",
      value: data?.receivables,
      description: "Awaiting client payment",
      icon: <Receipt className="text-blue-600" />,
      bgColor: "bg-blue-50",
    },
    {
      title: "Trust Liability",
      value: data?.trustLiability,
      description: "Funds held for clients",
      icon: <Wallet className="text-emerald-600" />,
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Financial Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start space-x-4">
            <div className={`p-3 rounded-lg ${card.bgColor}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
              <p className="text-xs text-gray-400 mt-1">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Visual Alert if Trust is exceptionally high or low */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center text-sm text-gray-600">
        <AlertCircle className="w-4 h-4 mr-2 text-gray-400" />
        Totals are reflected in real-time based on the matter management database.
      </div>
    </div>
  );
};

export default FinanceDashboard;