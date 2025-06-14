export default function DetailerSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

        {/* Change Email Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Email</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Current Email</label>
              <input
                type="email"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                value="emirhanboruch55@gmail.com"
                disabled
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">New Email</label>
              <input
                type="email"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter new email"
                disabled
              />
            </div>
            <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition" disabled>
              Save Changes
            </button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
              <input
                type="password"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter current password"
                disabled
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">New Password</label>
              <input
                type="password"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter new password"
                disabled
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Confirm New Password</label>
              <input
                type="password"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Confirm new password"
                disabled
              />
            </div>
            <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition" disabled>
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 