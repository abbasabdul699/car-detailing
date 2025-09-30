"use client";
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import zxcvbn from 'zxcvbn';

export default function DetailerSettingsPage() {
  const { data: session, update } = useSession();
  // State for email change
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password strength
  const passwordStrength = zxcvbn(newPassword);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-600'];

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess('');
    setEmailError('');
    setEmailLoading(true);
    try {
      const res = await fetch('/api/detailer/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change email');
      setEmailSuccess('Email changed successfully!');
      setNewEmail('');
      // Optionally update session
      update();
    } catch (err: any) {
      setEmailError(err.message || 'Failed to change email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/detailer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Settings</h1>

        {/* Change Email Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Email</h2>
          <form className="space-y-4" onSubmit={handleEmailChange}>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Current Email</label>
              <input
                type="email"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                value={session?.user?.email || ''}
                disabled
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">New Email</label>
              <input
                type="email"
                className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter new email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                required
              />
            </div>
            {emailError && <div className="text-red-600 font-semibold">{emailError}</div>}
            {emailSuccess && <div className="text-green-600 font-semibold">{emailSuccess}</div>}
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition" disabled={emailLoading}>
              {emailLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
          <form className="space-y-4" onSubmit={handlePasswordChange}>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
              <div className="relative">
              <input
                  type={showCurrent ? "text" : "password"}
                  className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10"
                placeholder="Enter current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowCurrent(v => !v)}
                  tabIndex={-1}
                >
                  <img
                    src={showCurrent
                      ? "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/view.svg"
                      : "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/hidden.svg"}
                    alt={showCurrent ? "Hide password" : "Show password"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">New Password</label>
              <div className="relative">
              <input
                  type={showNew ? "text" : "password"}
                  className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10"
                placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowNew(v => !v)}
                  tabIndex={-1}
                >
                  <img
                    src={showNew
                      ? "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/view.svg"
                      : "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/hidden.svg"}
                    alt={showNew ? "Hide password" : "Show password"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
              {newPassword && (
                <div className="mt-2 flex items-center gap-2">
                  <div className={`h-2 w-24 rounded ${strengthColor[passwordStrength.score]}`}></div>
                  <span className={`text-xs font-semibold ${strengthColor[passwordStrength.score]}`}>{strengthLabels[passwordStrength.score]}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Confirm New Password</label>
              <div className="relative">
              <input
                  type={showConfirm ? "text" : "password"}
                  className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10"
                placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirm(v => !v)}
                  tabIndex={-1}
                >
                  <img
                    src={showConfirm
                      ? "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/view.svg"
                      : "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/hidden.svg"}
                    alt={showConfirm ? "Hide password" : "Show password"}
                    className="h-5 w-5"
                  />
                </button>
              </div>
            </div>
            {error && <div className="text-red-600 font-semibold">{error}</div>}
            {success && <div className="text-green-600 font-semibold">{success}</div>}
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 