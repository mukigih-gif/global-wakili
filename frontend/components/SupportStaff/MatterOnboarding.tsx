// frontend/components/SupportStaff/MatterOnboarding.tsx

import React, { useState } from 'react';

const OnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [clientData, setClientData] = useState({ name: '', kraPin: '', email: '' });

  const handleNext = () => setStep(step + 1);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">New Matter Onboarding</h2>
      
      {/* Progress Bar */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-2 flex-1 rounded ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-4">
          <h3 className="font-semibold">Step 1: Client KYC & Conflict Check</h3>
          <input 
            className="w-full p-2 border rounded" 
            placeholder="Full Name / Company Name"
            onChange={(e) => setClientData({...clientData, name: e.target.value})}
          />
          <input 
            className="w-full p-2 border rounded" 
            placeholder="KRA PIN (Essential for eTIMS)" 
          />
          <button onClick={handleNext} className="bg-blue-600 text-white px-4 py-2 rounded">Run Conflict Check</button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h3 className="font-semibold">Step 2: Matter Details</h3>
          <select className="w-full p-2 border rounded">
            <option>Select Department...</option>
            <option>LITIGATION</option>
            <option>CONVEYANCING</option>
          </select>
          <input className="w-full p-2 border rounded" placeholder="Brief Description" />
          <button onClick={handleNext} className="bg-blue-600 text-white px-4 py-2 rounded">Next: Assign Team</button>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h3 className="font-semibold">Step 3: Firm Assignments</h3>
          <p className="text-sm text-slate-500">Assigning Lead Advocate & Originator</p>
          <select className="w-full p-2 border rounded">
            <option>Select Lead Advocate...</option>
            {/* List from User table where role is ADVOCATE */}
          </select>
          <button className="bg-green-600 text-white w-full py-3 rounded font-bold">
            OPEN FILE: GW/2026/001
          </button>
        </section>
      )}
    </div>
  );
};

export default OnboardingWizard;