export default function BookingsComingSoon() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-xl shadow p-10 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Bookings</h1>
          <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">Coming Soon</span>
        </div>
        <svg className="w-16 h-16 text-yellow-400 mb-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <p className="text-gray-600 text-center text-lg">The bookings feature is coming soon! You'll be able to manage and view all your appointments here.</p>
      </div>
    </div>
  );
} 