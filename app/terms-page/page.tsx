'use client';
import React from 'react';

const TermsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div data-custom-class="body">
        {/* Terms of Service Content */}
        <div>
          <strong>
            <span style={{ fontSize: '26px' }}>
              <span data-custom-class="title">
                <h1>TERMS OF SERVICE</h1>
              </span>
            </span>
          </strong>
        </div>

        {/* Last Updated Date */}
        <div>
          <span style={{ color: 'rgb(127, 127, 127)' }}>
            <strong>
              <span style={{ fontSize: '15px' }}>
                <span data-custom-class="subtitle">Last updated January 17, 2025</span>
              </span>
            </strong>
          </span>
        </div>

        {/* Main Content */}
        <div className="mt-8">
          <div data-custom-class="body_text">
            <h2 className="text-xl font-bold mb-4">Introduction</h2>
            <p>
              Welcome to Reeva Car LLC. These terms and conditions outline the rules and regulations for the use of our website.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Acceptance of Terms</h2>
            <p>
              By accessing this website, we assume you accept these terms and conditions. Do not continue to use Reeva Car LLC if you do not agree to all of the terms and conditions stated on this page.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">License</h2>
            <p>
              Unless otherwise stated, Reeva Car LLC and/or its licensors own the intellectual property rights for all material on Reeva Car LLC. All intellectual property rights are reserved. You may access this from Reeva Car LLC for your own personal use subjected to restrictions set in these terms and conditions.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">User Comments</h2>
            <p>
              Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Reeva Car LLC does not filter, edit, publish or review Comments prior to their presence on the website.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Hyperlinking to our Content</h2>
            <p>
              The following organizations may link to our Website without prior written approval: Government agencies, Search engines, News organizations, Online directory distributors, and System wide Accredited Businesses.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Content Liability</h2>
            <p>
              We shall not be hold responsible for any content that appears on your Website. You agree to protect and defend us against all claims that is rising on your Website.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Reservation of Rights</h2>
            <p>
              We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Removal of links from our website</h2>
            <p>
              If you find any link on our Website that is offensive for any reason, you are free to contact and inform us any moment. We will consider requests to remove links but we are not obligated to or so or to respond to you directly.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Google Calendar Integration</h2>
            <p>
              Our platform offers optional integration with Google Calendar services to enhance your appointment scheduling experience. By choosing to connect your Google Calendar account, you agree to the following terms:
            </p>
            
            <h3 className="text-lg font-semibold mb-3 mt-6">Service Features</h3>
            <ul className="list-disc list-inside ml-4 mb-4">
              <li>Automatic availability checking to prevent double-booking</li>
              <li>Creation of calendar events for confirmed appointments</li>
              <li>Automatic updates when appointments are modified or cancelled</li>
              <li>Synchronization of appointment data between our platform and your Google Calendar</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 mt-6">User Responsibilities</h3>
            <ul className="list-disc list-inside ml-4 mb-4">
              <li>You must have a valid Google account to use this feature</li>
              <li>You are responsible for maintaining the security of your Google account credentials</li>
              <li>You grant us permission to access your calendar data only for the purposes described above</li>
              <li>You can revoke access at any time through your account settings or Google account settings</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 mt-6">Third-Party Services</h3>
            <p>
              This integration is provided through Google Calendar API and is subject to Google's Terms of Service and Privacy Policy. By using this feature, you also agree to Google's terms. We are not responsible for Google's services, availability, or data practices.
            </p>

            <h3 className="text-lg font-semibold mb-3 mt-6">Limitation of Liability</h3>
            <p>
              We are not liable for any issues arising from your use of Google Calendar integration, including but not limited to:
            </p>
            <ul className="list-disc list-inside ml-4 mb-4">
              <li>Data loss or corruption in your Google Calendar</li>
              <li>Incorrect appointment scheduling due to calendar sync issues</li>
              <li>Unauthorized access to your Google account</li>
              <li>Google service outages or changes to Google's API</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 mt-6">Service Availability</h3>
            <p>
              Google Calendar integration may be temporarily unavailable due to maintenance, Google service outages, or changes to Google's API. We will make reasonable efforts to restore service but cannot guarantee continuous availability.
            </p>

            <h3 className="text-lg font-semibold mb-3 mt-6">Termination</h3>
            <p>
              You may disconnect your Google Calendar integration at any time. We may also suspend or terminate this service if you violate these terms or if Google revokes our access to their API services.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Contact Information</h2>
          <p className="text-gray-600">
            If you have any questions about these Terms, please contact us at:
          </p>
          <div className="mt-2">
            <p>Reeva Car LLC</p>
            <p>4 Hovendon Ave</p>
            <p>Brockton, MA 02302</p>
            <p>United States</p>
          </div>
        </div>

        {/* Custom Styles */}
        <style jsx>{`
          [data-custom-class='body'], [data-custom-class='body'] * {
            background: transparent !important;
          }
          [data-custom-class='title'], [data-custom-class='title'] * {
            font-family: Arial !important;
            font-size: 26px !important;
            color: #000000 !important;
          }
          [data-custom-class='subtitle'], [data-custom-class='subtitle'] * {
            font-family: Arial !important;
            color: #595959 !important;
            font-size: 14px !important;
          }
          [data-custom-class='body_text'], [data-custom-class='body_text'] * {
            color: #595959 !important;
            font-size: 14px !important;
            font-family: Arial !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default TermsPage; 