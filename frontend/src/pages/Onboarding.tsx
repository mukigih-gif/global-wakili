import React, { useState } from 'react';
import { UserPlus, Building2, User, Calendar } from 'lucide-react';

const ClientOnboarding = () => {
  const [clientType, setClientType] = useState('INDIVIDUAL');
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    matterTitle: '',
    commencementDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting Onboarding Data:", { ...formData, clientType });
    // Add your fetch call here to send to /api/clients/onboard
  };

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="text-blue-600" /> Professional Onboarding
        </h2>
        <p className="text-slate-500 text-sm">Register new client and open initial matter</p>
      </div>

      {/* 1. Client Type Selector */}
      <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
        <button 
          type="button"
          onClick={() => setClientType('INDIVIDUAL')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${clientType === 'INDIVIDUAL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
        >
          <User size={18}/> Individual
        </button>
        <button 
          type="button"
          onClick={() => setClientType('CORPORATE')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${clientType === 'CORPORATE' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
        >
          <Building2 size={18}/> Corporate/Company
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 2. Client Identity Section */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-wider">Client Name</label>
            <input 
              type="text" 
              required
              placeholder={clientType === 'INDIVIDUAL' ? "Full Name" : "Company Name"} 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-sm"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div className="col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-wider">Contact Person</label>
            <input 
              type="text" 
              placeholder={clientType === 'INDIVIDUAL' ? "Next of Kin (Optional)" : "Authorized Representative"} 
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-sm"
              onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
            />
          </div>
        </div>

        {/* 3. Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <input 
            type="email" required placeholder="Email Address" 
            className="p-4 bg-slate-50 rounded-2xl border-none text-sm"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
          <input 
            type="text" placeholder="Phone Number" 
            className="p-4 bg-slate-50 rounded-2xl border-none text-sm"
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>

        {/* 4. Initial Matter & Date Section */}
        <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div className="col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-blue-600 ml-2 uppercase tracking-wider">Matter Title</label>
            <input 
              type="text" required placeholder="e.g., Sale of Plot 123" 
              className="w-full mt-1 p-4 bg-blue-50/50 rounded-2xl border-none text-sm italic"
              onChange={(e) => setFormData({...formData, matterTitle: e.target.value})}
            />
          </div>

          <div className="col-span-2 lg:col-span-1">
            <label className="text-[10px] font-bold text-slate-400 ml-2 uppercase tracking-wider">Commencement Date</label>
            <div className="relative">
              <input 
                type="date" 
                className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none text-sm"
                value={formData.commencementDate}
                onChange={(e) => setFormData({...formData, commencementDate: e.target.value})}
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-slate-900 text-white py-5 rounded-3xl font-bold text-lg hover:bg-blue-600 transition-all shadow-xl mt-4"
        >
          Complete Onboarding & Open Matter
        </button>
      </form>
    </div>
  );
};

export default ClientOnboarding;