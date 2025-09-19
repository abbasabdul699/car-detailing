'use client'

import { useState } from 'react';
import SuccessModal from '@/app/components/SuccessModal';

export default function GetInTouch() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    phoneNumber: '',
    companyName: '',
    smsOptIn: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(false);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setIsModalOpen(true);
      setFormData({
        firstName: '',
        lastName: '',
        workEmail: '',
        phoneNumber: '',
        companyName: '',
        smsOptIn: false,
      });
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F2EE]">
      <main className="pt-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Ready to transform your detailing business?
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl">
                Connect with our team to learn how Reeva can help streamline your detailing operations and grow your business.
              </p>

              <div className="mt-16 space-y-12">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#0A2217] text-white flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Schedule a Demo</h2>
                    <p className="text-gray-600 text-lg">See how Reeva can work for your business</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#0A2217] text-white flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Customize Your Solution</h2>
                    <p className="text-gray-600 text-lg">Get a plan that fits your needs</p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 rounded-full bg-[#0A2217] text-white flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Launch Your Success</h2>
                    <p className="text-gray-600 text-lg">Start growing with Reeva</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Talk with our team</h2>
                <p className="text-gray-600">
                  Fill out your information and a Reeva representative will reach out to you.
                </p>
              </div>

              {submitError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                  Something went wrong. Please try again or email us directly.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First name*
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#389167] focus:border-[#389167]"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last name*
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#389167] focus:border-[#389167]"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="workEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Work email*
                  </label>
                  <input
                    type="email"
                    id="workEmail"
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#389167] focus:border-[#389167]"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                    Company name*
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#389167] focus:border-[#389167]"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number*
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#389167] focus:border-[#389167]"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.smsOptIn}
                      onChange={(e) => setFormData({ ...formData, smsOptIn: e.target.checked })}
                      className="mt-1 h-4 w-4 text-[#389167] focus:ring-[#389167] border-gray-300 rounded"
                      required
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">
                      By providing my phone number, I agree to receive SMS messages from Reeva Car regarding appointment confirmations, updates, and reminders. Message frequency may vary. Message & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.{' '}
                      <a href="/privacy-page" className="text-[#389167] underline">Privacy Policy</a> & <a href="/terms-page" className="text-[#389167] underline">Terms of Service</a>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0A2217] text-white py-3 px-6 rounded-xl hover:bg-[#0A2217]/90 transition-colors text-lg font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </form>

              <div className="mt-6 text-center text-gray-600 text-sm">
                <p>Or email us directly at: <a href="mailto:reevacar@gmail.com" className="text-[#389167]">reevacar@gmail.com</a></p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-600 text-sm mb-3">Or message us directly:</p>
                <div className="flex justify-center">
                  <a 
                    href="https://bcrw.apple.com/urn:biz:f506e0ef-81da-4425-8790-ad2123759510"
                    className="inline-block"
                  >
                    <img 
                      src="https://static.zdassets.com/message-us/apple/en/gethelp_black.svg?businessId=f506e0ef-81da-4425-8790-ad2123759510"
                      alt="Get help on Apple Messages"
                      className="h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                      onError={(e) => {
                        // Fallback if the image fails to load
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling.style.display = 'block';
                      }}
                    />
                    <div 
                      className="hidden bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                      style={{ display: 'none' }}
                    >
                      💬 Message Us
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
} 