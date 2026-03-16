import React, { useState } from 'react';
import { Clock, Save } from 'lucide-react';

export const TimeTracker = ({ matterId }: { matterId: number }) => {
  const [entry, setEntry] = useState({ description: '', duration: 0, rate: 3500 });

  const handleSave = async () => {
    // API call to POST /api/finance/time-entry
    console.log("Saving time entry for Matter:", matterId, entry);
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4">
        <Clock size={18} /> Log Professional Time
      </h3>
      <div className="space-y-3">
        <input 
          className="w-full p-2 border rounded" 
          placeholder="What work was done?"
          onChange={(e) => setEntry({...entry, description: e.target.value})}
        />
        <div className="flex gap-2">
          <input 
            type="number" 
            className="w-1/2 p-2 border rounded" 
            placeholder="Hours"
            onChange={(e) => setEntry({...entry, duration: parseFloat(e.target.value)})}
          />
          <input 
            type="number" 
            className="w-1/2 p-2 border rounded" 
            placeholder="Rate (KES)"
            defaultValue={3500}
            onChange={(e) => setEntry({...entry, rate: parseFloat(e.target.value)})}
          />
        </div>
        <button 
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700"
        >
          <Save size={16} /> Save Entry
        </button>
      </div>
    </div>
  );
};