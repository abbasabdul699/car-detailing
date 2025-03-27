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
              Welcome to Renu LLC. These terms and conditions outline the rules and regulations for the use of our website.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Acceptance of Terms</h2>
            <p>
              By accessing this website, we assume you accept these terms and conditions. Do not continue to use Renu LLC if you do not agree to all of the terms and conditions stated on this page.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">License</h2>
            <p>
              Unless otherwise stated, Renu LLC and/or its licensors own the intellectual property rights for all material on Renu LLC. All intellectual property rights are reserved. You may access this from Renu LLC for your own personal use subjected to restrictions set in these terms and conditions.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">User Comments</h2>
            <p>
              Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Renu LLC does not filter, edit, publish or review Comments prior to their presence on the website.
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