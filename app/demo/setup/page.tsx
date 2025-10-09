'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DemoSetupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [twilioPhone, setTwilioPhone] = useState('');

  const updateWebhookUrl = () => {
    if (!twilioPhone) {
      alert('Please enter your Twilio phone number');
      return;
    }

    const webhookUrl = `${window.location.origin}/api/webhooks/twilio/demo`;
    alert(`Set this webhook URL in your Twilio console:\n\n${webhookUrl}\n\nFor phone number: ${twilioPhone}`);
  };

  if (!session) {
    router.push('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">🎭 Demo Setup Guide</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Demo Mode Features</h2>
              <ul className="text-blue-800 space-y-1">
                <li>• No AI interference - pure manual conversation</li>
                <li>• Real-time messaging between dashboard and phone</li>
                <li>• Perfect for live demonstrations</li>
                <li>• All messages are saved to database</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-900 mb-2">Setup Instructions</h2>
              <ol className="text-yellow-800 space-y-2">
                <li><strong>1.</strong> Go to your Twilio Console</li>
                <li><strong>2.</strong> Navigate to Phone Numbers → Manage → Active numbers</li>
                <li><strong>3.</strong> Click on your Twilio phone number</li>
                <li><strong>4.</strong> In the "Messaging" section, set the webhook URL to:</li>
              </ol>
              
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Enter your Twilio phone number (e.g., +16178827958)"
                  value={twilioPhone}
                  onChange={(e) => setTwilioPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                />
                <button
                  onClick={updateWebhookUrl}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Generate Webhook URL
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-green-900 mb-2">How to Use</h2>
              <ol className="text-green-800 space-y-2">
                <li><strong>1.</strong> Set up the webhook URL in Twilio (see above)</li>
                <li><strong>2.</strong> Go to <a href="/demo" className="text-blue-600 underline">Demo Page</a></li>
                <li><strong>3.</strong> Send a text message to your Twilio number from any phone</li>
                <li><strong>4.</strong> The conversation will appear in the dashboard</li>
                <li><strong>5.</strong> Click on the conversation and start messaging!</li>
              </ol>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-900 mb-2">Important Notes</h2>
              <ul className="text-red-800 space-y-1">
                <li>• This is DEMO MODE - no AI responses will be sent</li>
                <li>• All messages go through the demo webhook: <code className="bg-red-100 px-1 rounded">/api/webhooks/twilio/demo</code></li>
                <li>• To switch back to AI mode, change the webhook URL back to: <code className="bg-red-100 px-1 rounded">/api/webhooks/twilio/sms-fast</code></li>
                <li>• Messages are saved to database for record keeping</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <a
                href="/demo"
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Go to Demo Page
              </a>
              <a
                href="/detailer-dashboard"
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
