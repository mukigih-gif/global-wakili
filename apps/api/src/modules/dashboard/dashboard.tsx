export default function Dashboard({ role }) {
  if (role === 'PARTNER') return <PartnerDashboard />;
  if (role === 'ACCOUNTANT') return <FinanceDashboard />;
  if (role === 'ASSOCIATE') return <MatterDashboard />;
}