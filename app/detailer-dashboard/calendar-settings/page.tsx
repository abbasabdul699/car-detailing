"use client";
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface CalendarStatus {
  connected: boolean;
  lastSync?: string;
  eventsCount?: number;
  nextEvent?: string;
}

export default function CalendarSettingsPage() {
  const { data: session } = useSession();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCalendarStatus();
  }, []);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch('/api/detailer/calendar/status');
      const data = await response.json();
      setCalendarStatus(data);
    } catch (error) {
      console.error('Error fetching calendar status:', error);
    }
  };

  const handleConnectCalendar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/detailer/calendar/connect', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to connect calendar');
      }
    } catch (error) {
      setError('Failed to connect calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/detailer/calendar/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSuccess('Calendar disconnected successfully');
        setCalendarStatus({ connected: false });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to disconnect calendar');
      }
    } catch (error) {
      setError('Failed to disconnect calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalendar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/detailer/calendar/sync', {
        method: 'POST',
      });
      
      if (response.ok) {
        setSuccess('Calendar synced successfully');
        fetchCalendarStatus();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to sync calendar');
      }
    } catch (error) {
      setError('Failed to sync calendar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center space-x-3">
          <CalendarIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Google Calendar Integration
          </h1>
        </div>

        {/* Connection Status */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Connection Status
            </h2>
            <div className="flex items-center space-x-2">
              {calendarStatus.connected ? (
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-red-500" />
              )}
              <span className={`font-medium ${calendarStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                {calendarStatus.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>

          {calendarStatus.connected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Sync
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {calendarStatus.lastSync || 'Never'}
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Events Count
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {calendarStatus.eventsCount || 0}
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-5 w-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Next Event
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {calendarStatus.nextEvent || 'None'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Connection Actions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Calendar Management
          </h2>
          
          <div className="space-y-4">
            {!calendarStatus.connected ? (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Connect your Google Calendar to enable AI-powered availability checking and automatic appointment scheduling.
                </p>
                <button
                  onClick={handleConnectCalendar}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Connecting...' : 'Connect Google Calendar'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Your Google Calendar is connected. The AI can now check your availability and schedule appointments automatically.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={handleSyncCalendar}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Syncing...' : 'Sync Calendar'}
                  </button>
                  <button
                    onClick={handleDisconnectCalendar}
                    disabled={loading}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Disconnecting...' : 'Disconnect Calendar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            AI Calendar Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Availability Checking</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• AI checks your calendar for conflicts</li>
                <li>• Suggests available time slots</li>
                <li>• Prevents double-booking</li>
                <li>• Respects your working hours</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Automatic Scheduling</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Creates calendar events automatically</li>
                <li>• Sends confirmation details</li>
                <li>• Updates event status</li>
                <li>• Syncs with your existing calendar</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}
