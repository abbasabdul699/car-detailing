'use client';

import { useState } from 'react';
import { X, Phone, CheckCircle, AlertCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  detailerId: string;
  detailerName: string;
}

export default function ContactModal({ isOpen, onClose, detailerId, detailerName }: ContactModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter your phone number');
      return;
    }

    if (!consentTerms || !consentPrivacy) {
      setErrorMessage('Please agree to our Terms and Conditions and Privacy Policy');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detailerId,
          phoneNumber: phoneNumber.trim(),
          consentTerms,
          consentPrivacy,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        // Close modal after 2 seconds
        setTimeout(() => {
          onClose();
          setSubmitStatus('idle');
          setPhoneNumber('');
          setConsentTerms(false);
          setConsentPrivacy(false);
        }, 2000);
      } else {
        setSubmitStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Contact {detailerName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitStatus === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Message Sent!
              </h3>
              <p className="text-gray-600">
                We've sent you a text message. Please check your phone to start the conversation.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Phone className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-gray-700 font-medium">
                    Start a conversation via SMS
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  Enter your phone number below and we'll send you a text message to begin booking your car detailing service.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Phone Number Input */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Consent Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="consentTerms"
                      checked={consentTerms}
                      onChange={(e) => setConsentTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      required
                    />
                    <label htmlFor="consentTerms" className="ml-3 text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                        Terms and Conditions
                      </a>
                    </label>
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="consentPrivacy"
                      checked={consentPrivacy}
                      onChange={(e) => setConsentPrivacy(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      required
                    />
                    <label htmlFor="consentPrivacy" className="ml-3 text-sm text-gray-700">
                      I agree to the{' '}
                      <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm text-red-700">{errorMessage}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending Message...
                    </div>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  By clicking "Send Message", you consent to receive SMS messages from {detailerName}.
                  Message and data rates may apply. Reply STOP to opt out.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
