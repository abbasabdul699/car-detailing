// app/detailer-dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DetailerDashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const detailerId = session?.user?.id;
  const [visitorsByMonth, setVisitorsByMonth] = useState<{ month: string, visitors: number }[]>([]);
  const [monthlyVisitors, setMonthlyVisitors] = useState(0);

  useEffect(() => {
    if (detailerId) {
      fetch(`/api/visitors/${detailerId}/monthly`)
        .then(res => res.json())
        .then(data => {
          setVisitorsByMonth(data.visitors || []);
          if (data.visitors && data.visitors.length > 0) {
            setMonthlyVisitors(data.visitors[data.visitors.length - 1].visitors);
          } else {
            setMonthlyVisitors(0);
          }
        });
    }
  }, [detailerId]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }
  if (!user) {
    return <div>Not logged in</div>;
  }

  const maxVisitors = visitorsByMonth.length > 0 ? Math.max(...visitorsByMonth.map(v => v.visitors)) : 1;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="mb-4 p-4 bg-white rounded shadow">
        <div className="text-gray-700">Logged in as: <b>{user.email}</b></div>
        <div className="text-gray-700">Detailer ID: <b>{user.id}</b></div>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Dashboard</h1>

      {/* Monthly Visitors Stat Card */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 flex flex-col items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400 text-sm mb-1">Monthly Visitors</span>
          <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">{monthlyVisitors}</span>
          <span className="text-green-600 dark:text-green-400 text-sm mt-1">+10% from last month</span>
        </div>
      </div>

      {/* Simple Bar Chart for Monthly Visitors */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Visitors by Month</h2>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visitorsByMonth}>
              <XAxis dataKey="month" stroke="#8884d8" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visitors" fill="#166534" barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}