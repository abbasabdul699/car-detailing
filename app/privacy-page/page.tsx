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
          {/* Add your privacy policy content here */}
          <div data-custom-class="body_text">
            {/* Your privacy policy sections */}
            {/* ... */}
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
          <p className="text-gray-600">
            If you have questions or comments about this notice, you may contact us at:
          </p>
          <div className="mt-2">
            <p>Renu LLC</p>
            <p>65 Dyer St</p>
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
          [data-custom-class='heading_1'], [data-custom-class='heading_1'] * {
            font-family: Arial !important;
            font-size: 19px !important;
            color: #000000 !important;
          }
          [data-custom-class='heading_2'], [data-custom-class='heading_2'] * {
            font-family: Arial !important;
            font-size: 17px !important;
            color: #000000 !important;
          }
          [data-custom-class='body_text'], [data-custom-class='body_text'] * {
            color: #595959 !important;
            font-size: 14px !important;
            font-family: Arial !important;
          }
          [data-custom-class='link'], [data-custom-class='link'] * {
            color: #3030F1 !important;
            font-size: 14px !important;
            font-family: Arial !important;
            word-break: break-word !important;
          }
        `}</style>
      </div>
    </div>
  );
};

export default PrivacyPage; 