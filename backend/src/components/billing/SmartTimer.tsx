import React, { useState, useEffect } from 'react';
import { Play, Square, Save, Clock } from 'lucide-react';

const SmartTimer = ({ matter, advocate, onSaveEntry }) => {
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [description, setDescription] = useState('');

  // Rate Logic Hierarchy
  const activeRate = matter.customRate || advocate.defaultRate || 0;

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStopAndSave = () => {
    const durationHours = seconds / 3600;
    const totalValue = durationHours * activeRate;
    
    onSaveEntry({
      description,
      duration: parseFloat(durationHours.toFixed(2)),
      appliedRate: activeRate,
      totalValue: parseFloat(totalValue.toFixed(2)),
      entryType: 'AUTO'
    });
    
    setIsActive(false);
    setSeconds(0);
    setDescription('');
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Clock size={16} className="text-blue-600"/> Smart Timer
        </h4>
        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
          Rate: KES {activeRate}/hr
        </span>
      </div>

      <input 
        className="w-full p-2 mb-3 text-sm bg-slate-50 border-none rounded-lg"
        placeholder="What are you working on?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex gap-2">
        {!isActive ? (
          <button 
            onClick={() => setIsActive(true)}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-bold"
          >
            <Play size={16}/> Start Tracking
          </button>
        ) : (
          <button 
            onClick={handleStopAndSave}
            className="flex-1 bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-bold"
          >
            <Square size={16}/> Stop & Save ({Math.floor(seconds / 60)}m {seconds % 60}s)
          </button>
        )}
      </div>
    </div>
  );
};

export default SmartTimer;