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
      {/* Header Info */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl shadow">
        <div className="text-gray-700 dark:text-gray-300">Detailer ID: <b>{user.id}</b></div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Dashboard</h1>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Monthly Visitors */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Visitors</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{monthlyVisitors}</h3>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">+10% from last month</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Bookings</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">0</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Coming soon</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Profile Complete</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{profileCompletion.percentage}%</h3>
              <Link href="/detailer-dashboard/profile" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                Edit Profile →
              </Link>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Reviews</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">0</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">No reviews yet</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Progress */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Profile Completion</h2>
          <div className="flex items-center justify-between mb-2">
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
      </div>

      {/* Client Contact Information Card */}
      <div className="mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Area Chart for Visitors Trend */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visitor Trend</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">Last 6 months</span>
          </div>
          <div style={{ width: '100%', height: 300 }}>
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
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Visitors</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">By month</span>
          </div>
          <div style={{ width: '100%', height: 300 }}>
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
                  fill="#3b82f6" 
                  radius={[8, 8, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}