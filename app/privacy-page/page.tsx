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
                <span data-custom-class="subtitle">Last updated February 20, 2025</span>
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