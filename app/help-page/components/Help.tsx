"use client";

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    projectGoals: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First name:
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Your first name"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-black focus:ring-0"
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last name:
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Your last name"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-black focus:ring-0"
            required
          />
        </div>
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Your email:
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Your email address"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-black focus:ring-0"
          required
        />
      </div>

      {/* Project Goals Field */}
      <div>
        <label htmlFor="projectGoals" className="block text-sm font-medium text-gray-700 mb-1">
          Tell us more about your project goals:
        </label>
        <textarea
          id="projectGoals"
          name="projectGoals"
          value={formData.projectGoals}
          onChange={handleChange}
          placeholder="e.g. We'd like to rebrand & improve our marketing website and platform."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-black focus:ring-0"
          required
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="bg-black text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors inline-flex items-center"
      >
        Send
        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>
    </form>
  );
} 