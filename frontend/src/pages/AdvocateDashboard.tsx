import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Clock, BarChart3 } from 'lucide-react';

const AdvocateDashboard = () => {
  const [metrics, setMetrics] = useState({
    totalBillable: 0,
    billedRevenue: 0,
    unbilledRevenue: 0,
    topDepartment: 'Litigation',
    advocateStats: []
  });

  // Mock data for initial view - replace with fetch('/api/analytics/productivity')
  useEffect(() => {
    // In a real scenario, this pulls from the AnalyticsService we mapped earlier
    setMetrics({
      totalBillable: 142.5,
      billedRevenue: 450000,
      unbilledRevenue: 125000,
      topDepartment: 'Conveyancing',
      advocateStats: [
        { name: 'Stanley Mwangi', hours: 45, revenue: 180000, efficiency: '92%' },
        { name: 'Koki', hours: 38, revenue: 95000, efficiency: '88%' },
      ]
    });
  }, []);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Advocate Productivity</h1>
          <p className="text-slate-500 text-sm">Real-time performance metrics across the firm</p>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-200 flex gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Monthly Report</button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
            <Clock className="text-blue-600" size={20}/>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Billable Hours</p>
          <h3 className="text-2xl font-bold text-slate-900">{metrics.totalBillable}h</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-emerald-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
            <DollarSign className="text-emerald-600" size={20}/>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Billed Revenue</p>
          <h3 className="text-2xl font-bold text-slate-900">KES {metrics.billedRevenue.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-orange-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="text-orange-600" size={20}/>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Work in Progress (WIP)</p>
          <h3 className="text-2xl font-bold text-slate-900">KES {metrics.unbilledRevenue.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="bg-purple-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
            <Users className="text-purple-600" size={20}/>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Lead Department</p>
          <h3 className="text-2xl font-bold text-slate-900">{metrics.topDepartment}</h3>
        </div>
      </div>

      {/* Advocate Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600"/> Individual Performance
          </h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Advocate Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Hours Logged</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Revenue Gen.</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Realization Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {metrics.advocateStats.map((adv, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{adv.name}</td>
                <td className="px-6 py-4 text-slate-600">{adv.hours}h</td>
                <td className="px-6 py-4 text-slate-600 font-semibold">KES {adv.revenue.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                    {adv.efficiency}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdvocateDashboard;