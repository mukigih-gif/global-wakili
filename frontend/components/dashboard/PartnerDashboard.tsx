// src/components/dashboard/PartnerDashboard.tsx

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Search, Filter, Download, Calendar } from 'lucide-react';

const COLORS = ['#0A192F', '#D4AF37', '#22C55E', '#EF4444']; // Midnight, Gold, Green, Red

export const PartnerDashboard = () => {
  const [reportData, setReportData] = useState(null);
  const [filter, setFilter] = useState({ range: '7d', lawyer: 'all' });

  // 1. Fetch data from our MasterPowerHouseReport API
  useEffect(() => {
    // fetch('/api/reports/dashboard-widgets').then(res => res.json()).then(setReportData);
  }, [filter]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* HEADER & FILTERS */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Partner Executive Control</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Matters, Clients..." 
              className="pl-10 pr-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-slate-100">
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Matters" value="124" trend="+12%" color="blue" />
        <StatCard title="Monthly Revenue" value="KES 4.2M" trend="+5.4%" color="green" />
        <StatCard title="WIP (Unbilled)" value="KES 1.8M" trend="-2.1%" color="gold" />
        <StatCard title="Trust Safety" value="100%" trend="Verified" color="green" />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses (Monthly)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockFinancialData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A192F" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0A192F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#0A192F" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Matter Distribution (Donut) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Matter Category Mix</h3>
          <div className="h-80 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={mockCategoryData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {mockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/3">
               {mockCategoryData.map((item, i) => (
                 <div key={i} className="flex items-center gap-2 mb-2">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}} />
                   <span className="text-sm text-slate-600">{item.name}: {item.value}%</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border">
    <p className="text-sm text-slate-500 font-medium">{title}</p>
    <h2 className="text-2xl font-bold text-slate-900 mt-1">{value}</h2>
    <span className={`text-xs font-bold ${trend.startsWith('+') ? 'text-green-600' : 'text-amber-600'}`}>
      {trend} vs last month
    </span>
  </div>
);

// MOCK DATA FOR ILLUSTRATION
const mockFinancialData = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 2000, expenses: 9800 },
  { name: 'Apr', revenue: 2780, expenses: 3908 },
];

const mockCategoryData = [
  { name: 'Conveyancing', value: 45 },
  { name: 'Litigation', value: 30 },
  { name: 'Corporate', value: 15 },
  { name: 'Family', value: 10 },
];