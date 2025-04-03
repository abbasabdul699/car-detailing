'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, FormEvent } from 'react';

const helpCategories = [
  {
    title: 'Detailing Basics',
    description: 'Start off on the right foot! Not the left one!',
    icon: '/icons/smile.svg',
    href: '#'
  },
  {
    title: 'Business Settings',
    description: 'Almost as exciting as interior decorating.',
    icon: '/icons/sliders.svg',
    href: '#'
  },
  {
    title: 'Pricing & Services',
    description: "Please don't shop until you drop. Let us help.",
    icon: '/icons/store.svg',
    href: '#'
  },
  {
    title: 'Payments & Billing',
    description: 'That feel when you look at your bank account.',
    icon: '/icons/credit-card.svg',
    href: '#'
  },
  {
    title: 'Safety, Privacy & Policy',
    description: 'Keep things safe & sound for you and your buddies.',
    icon: '/icons/shield.svg',
    href: '#'
  }
];

export default function HelpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
      setStatus('success');

      // Reset success status after 3 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('Submission error:', error);
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      {/* Hero Section with Search */}
      <div className="bg-[#004040] min-h-[300px] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 relative z-10">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            Help Center
          </h1>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full px-4 py-3 rounded-md border-0 focus:ring-2 focus:ring-white/20 bg-white"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative background elements can be added here */}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Need help? We've got your back.</h2>
          <p className="text-gray-600 mb-2">
            From account settings to permissions, find help for everything Renu
          </p>
        </div>

        {/* Help Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {helpCategories.map((category, index) => (
            <Link
              key={index}
              href={category.href}
              className="p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 mb-4">
                <Image
                  src={category.icon}
                  alt={category.title}
                  width={48}
                  height={48}
                />
              </div>
              <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
              <p className="text-gray-600 text-sm">{category.description}</p>
            </Link>
          ))}
        </div>

        {/* Troubleshooting Section */}
        <div className="mt-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <Image
              src="/icons/magnifier.svg"
              alt="Troubleshooting"
              width={64}
              height={64}
            />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Known Issues, Bugs & Troubleshooting
          </h3>
        </div>
      </main>

      {/* Contact Form Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white rounded-lg shadow-sm mt-16">
        <h2 className="text-4xl font-bold text-[#1a2e44] mb-4">
          How would you like to contact us?
        </h2>
        
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-2">Request a call.</h3>
          <p className="text-gray-600 mb-8">
            Give us some info so the right person can get back to you.
          </p>

          {status === 'success' && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Your message has been sent successfully!
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Failed to send message. Please try again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email*
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject*
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message*
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-[#0F1923] text-white py-3 px-4 rounded-md hover:bg-[#1a2836] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {status === 'submitting' ? 'Sending...' : 'Submit'}
            </button>
          </form>
        </div>
      </section>
    </>
  )
} 