export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">SMS Communications</h2>
          <p className="text-gray-700 mb-4">
            By providing your mobile phone number and opting in to receive SMS messages, you consent to receive text messages from ReevaCar regarding:
          </p>
          <ul className="list-disc list-inside text-gray-700 mb-6">
            <li>Car detailing service confirmations</li>
            <li>Appointment reminders</li>
            <li>Service updates and promotions</li>
            <li>Customer support communications</li>
          </ul>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Message Frequency</h2>
          <p className="text-gray-700 mb-4">
            Message frequency varies based on your interactions with our services. You may receive messages when you book appointments, as reminders, or for promotional purposes.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Opt-Out Instructions</h2>
          <p className="text-gray-700 mb-4">
            You can opt out of receiving SMS messages at any time by replying "STOP" to any message. You may also reply "HELP" for assistance.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Data Usage</h2>
          <p className="text-gray-700 mb-4">
            We use your phone number solely for the purpose of sending you SMS communications related to our car detailing services. We do not share your phone number with third parties for marketing purposes.
          </p>

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Contact Information</h2>
          <p className="text-gray-700 mb-4">
            If you have any questions about this privacy policy or our SMS communications, please contact us at support@reevacar.com.
          </p>

          <p className="text-sm text-gray-500 mt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )
}
