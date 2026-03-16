// 1. ADD THIS IMPORT AT THE TOP
import SmartTimer from '../components/billing/SmartTimer';

const MatterDetail = ({ matter, advocate }) => {
  
  // 2. ADD THIS FUNCTION INSIDE YOUR COMPONENT
  const handleSaveTimeEntry = async (entryData) => {
    // This sends the data from the timer to your backend
    const response = await fetch('/api/billing/time-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entryData,
        matterId: matter.id,
        advocateId: advocate.id
      })
    });
    
    if (response.ok) {
      alert("Time logged successfully!");
      // Refresh your matter data here if needed
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* ... your existing Matter Info ... */}

      <div className="col-span-4">
        {/* 3. PLACE THE TIMER IN THE SIDEBAR */}
        <SmartTimer 
          matter={matter} 
          advocate={advocate} 
          onSaveEntry={handleSaveTimeEntry} 
        />
      </div>
    </div>
  );
};