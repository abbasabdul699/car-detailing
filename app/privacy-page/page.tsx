'use client';
import React from 'react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div data-custom-class="body">
        {/* Privacy Policy Content */}
        <div>
          <strong>
            <span style={{ fontSize: '26px' }}>
              <span data-custom-class="title">
                <h1>PRIVACY POLICY</h1>
              </span>
            </span>
          </strong>
        </div>

        {/* Last Updated Date */}
        <div>
          <span style={{ color: 'rgb(127, 127, 127)' }}>
            <strong>
              <span style={{ fontSize: '15px' }}>
                <span data-custom-class="subtitle">Last updated September 15, 2025</span>
              </span>
            </strong>
          </span>
        </div>

        {/* Main Content */}
        <div className="mt-8">
          <div data-custom-class="body_text">
            <h2 className="text-xl font-bold mb-4">Introduction</h2>
            <p>
              Welcome to Reeva Car LLC. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Information We Collect</h2>
            <p>
              We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website, or otherwise when you contact us.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">How We Use Your Information</h2>
            <p>
              We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Sharing Your Information</h2>
            <p>
              We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Mobile Information and SMS Communications</h2>
            <p>
              We do not share mobile contact information with third parties or affiliates for marketing or promotional purposes. Mobile information will only be used to send you messages related to your relationship with Reeva Car. This information is not shared with any third parties, except as required to provide services (e.g., customer support).
            </p>
            <p>
              By providing your mobile number, you consent to receive SMS messages from Reeva Car for purposes such as:
            </p>
            <ul className="list-disc list-inside ml-4 mb-4">
              <li>Appointment confirmations, reminders, and service updates</li>
              <li>Customer support and account-related communications</li>
              <li>Promotional offers and marketing messages (only if you have opted in separately)</li>
            </ul>
            <p>
              Message frequency may vary depending on your interactions with Reeva Car. Standard message and data rates may apply. We are not liable for delayed or undelivered messages.
            </p>
            <p>
              You may opt out of receiving SMS messages at any time by replying "STOP." For assistance, reply "HELP." SMS messaging may be provided through third-party vendors such as Twilio in order to deliver communications on behalf of Reeva Car.
            </p>
            <p>
              Your mobile number will be stored securely and will only be accessible to authorized personnel. We implement appropriate technical and organizational safeguards to protect your information and prevent unauthorized access.
            </p>
            <p>
              Our SMS services are intended for users 16 years of age and older. By opting in, you confirm that you meet this requirement or have parental consent.
            </p>
            <p>
              Use of our SMS services is also subject to this Privacy Policy and our Terms of Service.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Your Rights</h2>
            <p>
              Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Security of Your Information</h2>
            <p>
              We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Changes to This Privacy Policy</h2>
            <p>
              We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
          <p className="text-gray-600">
            If you have questions or comments about this notice, you may contact us at:
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

export default PrivacyPage; 