// app/detailer-dashboard/page.tsx

const monthlyVisitors = 1234; // Mock stat
const visitorsByMonth = [
  { month: 'Jan', visitors: 800 },
  { month: 'Feb', visitors: 950 },
  { month: 'Mar', visitors: 1100 },
  { month: 'Apr', visitors: 1200 },
  { month: 'May', visitors: 1050 },
  { month: 'Jun', visitors: 1234 },
];

export default function DetailerDashboardPage() {
  // Find max for scaling bars
  const maxVisitors = Math.max(...visitorsByMonth.map(v => v.visitors));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
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
        <div className="flex items-end gap-4 h-48 w-full">
          {visitorsByMonth.map((v) => (
            <div key={v.month} className="flex flex-col items-center flex-1">
              <div
                className="bg-green-500 rounded-t w-8 transition-all"
                style={{ height: `${(v.visitors / maxVisitors) * 100}%` }}
                title={`${v.visitors} visitors`}
              ></div>
              <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">{v.month}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-xs text-gray-400 dark:text-gray-500">
          {visitorsByMonth.map((v) => (
            <span key={v.month} className="flex-1 text-center">{v.visitors}</span>
          ))}
        </div>
      </div>
    </div>
  );
}