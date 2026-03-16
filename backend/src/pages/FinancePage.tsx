import React, { useState } from 'react';
import FinanceDashboard from '../components/finance/FinanceDashboard';
import MatterLedger from '../components/finance/MatterLedger';

const FinancePage = () => {
  // In a real app, this would be selected from a sidebar or dropdown
  const [selectedMatterId] = useState(1); 

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section: Firm-wide Stats */}
        <FinanceDashboard />
        
        {/* Bottom Section: Specific Matter Deep-Dive */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 px-6">Matter Statement</h2>
          <MatterLedger matterId={selectedMatterId} />
        </div>
      </div>
    </div>
  );
};

export default FinancePage;