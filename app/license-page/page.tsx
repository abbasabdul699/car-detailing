'use client';
import React from 'react';

const LicensePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div data-custom-class="body">
        {/* License Agreement Content */}
        <div>
          <strong>
            <span style={{ fontSize: '26px' }}>
              <span data-custom-class="title">
                <h1>LICENSE AGREEMENT</h1>
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
              This License Agreement ("Agreement") is between Reeva Car LLC ("Licensor") and the user ("Licensee"). By using our software, you agree to be bound by the terms of this Agreement.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Grant of License</h2>
            <p>
              Licensor grants Licensee a non-exclusive, non-transferable license to use the software in accordance with the terms of this Agreement.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Restrictions</h2>
            <p>
              Licensee shall not modify, reverse engineer, decompile, or disassemble the software, except to the extent that such activity is expressly permitted by applicable law.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Ownership</h2>
            <p>
              The software is licensed, not sold. Licensor retains ownership of all copies of the software.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Termination</h2>
            <p>
              This Agreement is effective until terminated. Licensee may terminate it at any time by destroying all copies of the software. This Agreement will also terminate if Licensee fails to comply with any term or condition of this Agreement.
            </p>

            <h2 className="text-xl font-bold mb-4 mt-8">Limitation of Liability</h2>
            <p>
              In no event shall Licensor be liable for any damages whatsoever arising out of the use of or inability to use the software.
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Contact Information</h2>
          <p className="text-gray-600">
            If you have any questions about this License Agreement, please contact us at:
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

export default LicensePage; 