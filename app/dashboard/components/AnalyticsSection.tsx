'use client';
import { useState } from 'react';
import { EyeIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface AnalyticsData {
  completedJobs: number;
  profileViews: number;
  uniqueVisitors: number;
}

interface AnalyticsSectionProps {
  initialData?: AnalyticsData;
}

export default function AnalyticsSection({ initialData }: AnalyticsSectionProps) {
  const [stats, setStats] = useState<AnalyticsData>(initialData || {
    completedJobs: 0,
    profileViews: 0,
    uniqueVisitors: 0
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-6">Business Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#389167]/10 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircleIcon className="w-5 h-5 text-[#389167]" />
            <span className="text-sm font-medium text-[#389167]">Completed Jobs</span>
          </div>
          <p className="text-2xl font-bold">{stats.completedJobs}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <EyeIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Profile Views</span>
          </div>
          <p className="text-2xl font-bold">{stats.profileViews}</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <UserGroupIcon className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Unique Visitors</span>
          </div>
          <p className="text-2xl font-bold">{stats.uniqueVisitors}</p>
        </div>
      </div>
    </div>
  );
} 