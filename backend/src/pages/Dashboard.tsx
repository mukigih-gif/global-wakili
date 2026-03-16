import React, { useEffect, useState } from 'react';
import ExecutiveDashboard from '../components/dashboard/ExecutiveDashboard';

const DashboardPage = () => {
  // 1. State for all our Dashboard data
  const [data, setData] = useState({
    finance: { trustBalance: 0, officeBalance: 0 },
    revenueTrend: [],
    categories: [],
    matters: [],
    tasks: []
  });
  const [loading, setLoading] = useState(true);

  // 2. Fetch data from your API (Express Server)
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // We call the endpoints we created in the Controller earlier
        const [finRes, matterRes, taskRes] = await Promise.all([
          fetch('http://localhost:8080/api/finance/summary'),
          fetch('http://localhost:8080/api/matters/analytics/stages'),
          fetch('http://localhost:8080/api/tasks/assigned/Koki')
        ]);

        const finance = await finRes.json();
        const categories = await matterRes.json();
        const tasks = await taskRes.json();

        setData({
          finance: finance, // KES Totals
          revenueTrend: finance.monthlyTrend, // Line Chart data
          categories: categories, // Pie Chart data
          matters: categories.recentMatters, // Recent Matters list
          tasks: tasks // Koki's tasks
        });
      } catch (error) {
        console.error("Dashboard Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-10 text-center font-bold">Loading Global Wakili Command Center...</div>;

  // 3. Pass the data to your Master Component
  return (
    <ExecutiveDashboard 
      financeData={data.finance}
      revenueData={data.revenueTrend}
      categoryData={data.categories}
      recentMatters={data.matters}
      myTasks={data.tasks}
    />
  );
};

export default DashboardPage;