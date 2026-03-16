// Example Logic for the Audit Log Component
const AuditLog = ({ activities }) => (
  <div className="space-y-4">
    {activities.map((act) => (
      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border-l-4 border-blue-500 shadow-sm">
        <div className="bg-blue-50 p-2 rounded-full"><FileText size={16} /></div>
        <div>
          <p className="text-sm font-semibold">{act.staffName} generated a new Invoice</p>
          <p className="text-xs text-slate-400">{new Date(act.date).toLocaleTimeString()} - Matter #44</p>
        </div>
      </div>
    ))}
  </div>
);