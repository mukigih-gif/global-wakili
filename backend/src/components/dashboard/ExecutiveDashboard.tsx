import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wallet, TrendingUp, CheckSquare, Clock, ArrowRight } from 'lucide-react';
import TrustTransferModal from '../modals/TrustTransferModal';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ExecutiveDashboard = ({ financeData, revenueData, categoryData, recentMatters, myTasks }) => {
  // Hooks properly placed inside the component
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);

  const handleTransferClick = (matter) => {
    setSelectedMatter(matter);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-8">
      
      {/* 1. FINANCIAL HEALTH CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trust Balance Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Wallet size={24}/></div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Trust Balance</p>
            <p className="text-xl font-bold text-slate-900">KES {financeData?.trustBalance?.toLocaleString() || 0}</p>
          </div>
        </div>

        {/* OFFICE BALANCE CARD: Clickable to trigger drawdown */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <TrendingUp size={24}/>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Office Balance</p>
            <p className="text-xl font-bold text-slate-900">KES {financeData?.officeBalance?.toLocaleString() || 0}</p>
            <p className="text-[9px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase">
              Click to transfer fees
            </p>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><CheckSquare size={24}/></div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Tasks</p>
            <p className="text-xl font-bold text-slate-900">{myTasks?.length || 0} Pending</p>
          </div>
        </div>
      </div>

      {/* 2. ANALYTICS (REVENUE TREND & CATEGORIES) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Revenue Trend (Monthly)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Revenue by Category</h3>
          <div className="h-64 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                  {categoryData?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-[10px] mt-2">
              {categoryData?.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                  <span className="text-slate-500">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL (MATTERS & TASKS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Recent Matters</h3>
            <button className="text-blue-600 text-[10px] font-bold flex items-center gap-1">ALL MATTERS <ArrowRight size={12}/></button>
          </div>
          <div className="space-y-3">
            {recentMatters?.map(m => (
              <div key={m.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-900">{m.title}</p>
                  <p className="text-[10px] text-slate-400">{m.clientName} • {m.billingType}</p>
                </div>
                <button 
                  onClick={() => handleTransferClick(m)}
                  className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors uppercase"
                >
                  {m.stage}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Priority Tasks</h3>
          <div className="space-y-3">
            {myTasks?.map(t => (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-50">
                <input type="checkbox" className="mt-1 rounded border-slate-300 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{t.title}</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock size={10}/> Due: {t.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TRUST TRANSFER MODAL INTEGRATION */}
      {isModalOpen && (
        <TrustTransferModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          matter={selectedMatter || recentMatters?.[0] || {title: "General Ledger"}}
          onConfirm={(data) => {
            console.log("Processing Transfer to Office...", data);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ExecutiveDashboard;