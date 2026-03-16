import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

// Professional color palette for legal dashboards
const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#475569'];

export const CategoryRevenueChart = ({ data, title = "Revenue Distribution" }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full">
      <div className="flex items-center gap-2 mb-6">
        <PieIcon size={20} className="text-purple-600" />
        <h3 className="font-bold text-slate-800">{title}</h3>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              nameKey="category" // Matches our FinanceService output
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => `KES ${Number(value).toLocaleString()}`}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Quick Summary List */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="text-slate-600">{item.category}</span>
            </div>
            <span className="font-semibold text-slate-800">
              {((item.value / data.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};