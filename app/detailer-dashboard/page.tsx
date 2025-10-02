// app/detailer-dashboard/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  CartesianGrid 
} from 'recharts';
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
  const [monthlyMessages, setMonthlyMessages] = useState(0);
  const [messagesPercentageChange, setMessagesPercentageChange] = useState(0);
  const [detailer, setDetailer] = useState<DetailerWithRelations | null>(null);
  const [profileCompletion, setProfileCompletion] = useState({ percentage: 0, message: "" });

  useEffect(() => {
    if (detailerId) {
      fetch(`/api/visitors/${detailerId}/monthly`)
        .then(res => res.json())
        .then(data => {
          setVisitorsByMonth(data.visitors || []);
        });

      fetch(`/api/detailer/messages-count`)
        .then(res => res.json())
        .then(data => {
          setMonthlyMessages(data.messagesThisMonth || 0);
          setMessagesPercentageChange(data.percentageChange || 0);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Dark Green Header Section */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white rounded-b-3xl shadow-lg">
        <div className="p-6">
          {/* Detailer ID */}
          <div className="text-green-100 text-sm mb-2">Detailer ID: {user.id}</div>
          
          {/* Welcome Message */}
          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            Welcome {detailer?.businessName || 'to Your Dashboard'}
          </h1>

          {/* Key Stats in Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Messages This Month */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Messages this month</p>
                  <p className="text-2xl font-bold">{monthlyMessages}</p>
                  <p className="text-green-100 text-xs">
                    {messagesPercentageChange > 0 ? '+' : ''}{messagesPercentageChange}% from last month
                  </p>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Bookings */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Bookings</p>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-green-100 text-xs">Coming soon</p>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Profile Complete</p>
                  <p className="text-2xl font-bold">{profileCompletion.percentage}%</p>
                  <Link href="/detailer-dashboard/profile" className="text-green-100 text-xs hover:text-white">
                    Edit Profile →
                  </Link>
                </div>
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* White Cards Section */}
      <div className="p-6 -mt-4 space-y-6">
        {/* Profile Completion Progress - Only show if not 100% */}
        {profileCompletion.percentage < 100 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Profile Completion</h2>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">{profileCompletion.message}</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{profileCompletion.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${profileCompletion.percentage}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Client Contact Information Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Client Contact Information</h2>
          <div className="space-y-4">
            {detailer?.twilioPhoneNumber && detailer?.smsEnabled ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
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
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
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

        {/* Charts Section */}
        <div className="space-y-6">
          {/* Area Chart for Visitors Trend */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visitor Trend</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Last 6 months</span>
            </div>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitorsByMonth}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="visitors" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorVisitors)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart for Monthly Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Visitors</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">By month</span>
            </div>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitorsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis allowDecimals={false} stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f3f4f6'
                    }} 
                  />
                  <Bar 
                    dataKey="visitors" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}