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

      {/* Client Contact Information Card */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Client Contact Information</h2>
          <div className="space-y-4">
            {detailer?.twilioPhoneNumber && detailer?.smsEnabled ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">SMS & Phone Number for Clients</h3>
                    <p className="text-lg font-bold text-green-900 dark:text-green-100">{detailer.twilioPhoneNumber}</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Give this number to clients for SMS communication and Phone Calls</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">SMS Not Configured</h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">Contact admin to set up SMS communication for clients</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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