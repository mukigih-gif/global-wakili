import React from 'react';
import { 
  Wallet, 
  Briefcase, 
  CheckSquare, 
  ArrowUpRight, 
  Clock, 
  PlusCircle 
} from 'lucide-react';

const DashboardSummary = ({ financeData, recentMatters, myTasks }) => {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* 1. LIQUIDITY CARDS (Trust vs. Office) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Wallet size={24} />
            </div>
            <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">Trust</span>
          </div>
          <h3 className="text-slate-500 text-sm mt-4 font-medium">Trust Account Balance</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">
            KES {financeData.trustBalance.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Briefcase size={24} />
            </div>
            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Office</span>
          </div>
          <h3 className="text-slate-500 text-sm mt-4 font-medium">Office Account Balance</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">
            KES {financeData.officeBalance.toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <CheckSquare size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm mt-4 font-medium">Pending Tasks</h3>
          <p className="text-2xl font-black text-slate-900 mt-1">{myTasks.length}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center border-dashed border-2 border-slate-200 hover:border-blue-400 cursor-pointer transition-colors group">
          <PlusCircle className="text-slate-300 group-hover:text-blue-500" size={32} />
          <span className="text-sm font-bold text-slate-400 mt-2 group-hover:text-blue-600">New Matter</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. RECENT MATTERS (Left Column) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 text-lg">Recently Opened Matters</h2>
            <button className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {recentMatters.map((matter) => (
              <div key={matter.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    {matter.clientName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{matter.title}</h4>
                    <p className="text-xs text-slate-500">{matter.clientName} • Opened {new Date(matter.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                  matter.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {matter.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. TASKS ASSIGNED TO ME (Right Column) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-slate-800 text-lg">My Tasks</h2>
          </div>
          <div className="space-y-4">
            {myTasks.length > 0 ? myTasks.map((task) => (
              <div key={task.id} className="flex gap-3 items-start border-b border-slate-50 pb-4 last:border-0">
                <input type="checkbox" className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 leading-tight">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <Clock size={12} />
                    <span>Due: {task.dueDate}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-sm italic">All caught up! No pending tasks.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;