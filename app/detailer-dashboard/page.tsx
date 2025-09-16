// app/detailer-dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DetailerWithRelations, calculateProfileCompletion, getCompletionMessage } from "@/lib/profileCompletion";
import Link from "next/link";

const ProfileCompletionCard = ({ percentage, message }: { percentage: number, message: string }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Profile Completion</h2>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
      </div>
      <Link href="/detailer-dashboard/profile" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-3 inline-block">
        Edit Profile
      </Link>
    </div>
  );
};

export default function DetailerDashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const detailerId = session?.user?.id;
  const [visitorsByMonth, setVisitorsByMonth] = useState<{ month: string, visitors: number }[]>([]);
  const [monthlyVisitors, setMonthlyVisitors] = useState(0);
  const [detailer, setDetailer] = useState<DetailerWithRelations | null>(null);
  const [profileCompletion, setProfileCompletion] = useState({ percentage: 0, message: "" });

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

      fetch(`/api/detailer/profile`)
        .then(res => res.json())
        .then(data => {
          setDetailer(data);
          const { percentage, missing } = calculateProfileCompletion(data);
          setProfileCompletion({ percentage, message: getCompletionMessage(missing) });
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

      {/* Profile Completion Card */}
      <div className="mb-8">
        <ProfileCompletionCard
          percentage={profileCompletion.percentage}
          message={profileCompletion.message}
        />
      </div>

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