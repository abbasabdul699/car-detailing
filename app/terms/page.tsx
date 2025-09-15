export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">SMS Service Terms</h2>
          <p className="text-gray-700 mb-4">
            By opting in to receive SMS messages from ReevaCar, you agree to the following terms:
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Description</h3>
          <p className="text-gray-700 mb-4">
            ReevaCar provides SMS notifications for car detailing services including appointment confirmations, reminders, and service updates.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">User Responsibilities</h3>
          <ul className="list-disc list-inside text-gray-700 mb-6">
            <li>Provide accurate contact information</li>
            <li>Notify us of any changes to your phone number</li>
            <li>Use the service in accordance with applicable laws</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">Message Charges</h3>
          <p className="text-gray-700 mb-4">
            Standard message and data rates may apply. Check with your mobile carrier for details about your messaging plan.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">Opt-Out Rights</h3>
          <p className="text-gray-700 mb-4">
            You have the right to opt out of receiving SMS messages at any time by replying "STOP" to any message. You may also reply "HELP" for assistance.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">Service Availability</h3>
          <p className="text-gray-700 mb-4">
            SMS services are provided on a best-effort basis. We are not responsible for delays or failures in message delivery due to carrier issues or other technical problems.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">Limitation of Liability</h3>
          <p className="text-gray-700 mb-4">
            ReevaCar shall not be liable for any damages arising from the use of our SMS services, including but not limited to message delivery failures or delays.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">Contact Information</h3>
          <p className="text-gray-700 mb-4">
            For questions about these terms or our SMS services, please contact us at support@reevacar.com.
          </p>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
