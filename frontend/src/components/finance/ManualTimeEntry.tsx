import React, { useState } from 'react';
import { Calendar, Save } from 'lucide-react';

const ManualTimeEntry = ({ matter, advocate, onSave }) => {
  const [entry, setEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '',
    description: ''
  });

  const activeRate = matter.customRate || advocate.defaultRate || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalValue = parseFloat(entry.duration) * activeRate;
    
    onSave({
      ...entry,
      duration: parseFloat(entry.duration),
      appliedRate: activeRate,
      totalValue: parseFloat(totalValue.toFixed(2)),
      entryType: 'MANUAL'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-4">
      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
        <Calendar size={16} className="text-orange-500"/> Retrospective Entry
      </h4>
      
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input 
          type="date" 
          className="p-2 text-sm bg-slate-50 border-none rounded-lg"
          value={entry.date}
          onChange={(e) => setEntry({...entry, date: e.target.value})}
        />
        <input 
          type="number" 
          step="0.1"
          placeholder="Hours (e.g. 1.5)"
          className="p-2 text-sm bg-slate-50 border-none rounded-lg"
          value={entry.duration}
          onChange={(e) => setEntry({...entry, duration: e.target.value})}
        />
      </div>

      <textarea 
        className="w-full p-2 mb-3 text-sm bg-slate-50 border-none rounded-lg"
        placeholder="Detailed description of work performed..."
        rows={3}
        value={entry.description}
        onChange={(e) => setEntry({...entry, description: e.target.value})}
      />

      <button type="submit" className="w-full bg-slate-800 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">
        <Save size={16}/> Save Manual Entry
      </button>
    </form>
  );
};

export default ManualTimeEntry;