'use client';
import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    phoneNumber: '',
    companyName: '',
    jobTitle: '',
    teamSize: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Add your form submission logic here
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            First name*
          </label>
          <input
            type="text"
            id="firstName"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Last name*
          </label>
          <input
            type="text"
            id="lastName"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
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
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
          value={formData.workEmail}
          onChange={(e) => setFormData({...formData, workEmail: e.target.value})}
        />
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Phone number*
        </label>
        <input
          type="tel"
          id="phoneNumber"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
        />
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
          Company name*
        </label>
        <input
          type="text"
          id="companyName"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
          value={formData.companyName}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
        />
      </div>

      <div>
        <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
          Job title*
        </label>
        <input
          type="text"
          id="jobTitle"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
          value={formData.jobTitle}
          onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
        />
      </div>

      <div>
        <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-1">
          Team size*
        </label>
        <select
          id="teamSize"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
          value={formData.teamSize}
          onChange={(e) => setFormData({...formData, teamSize: e.target.value})}
        >
          <option value="">Select team size</option>
          <option value="1-5">1-5 employees</option>
          <option value="6-15">6-15 employees</option>
          <option value="16-50">16-50 employees</option>
          <option value="51-100">51-100 employees</option>
          <option value="100+">100+ employees</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          How can we help?
        </label>
        <textarea
          id="message"
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#0A2217] focus:border-[#0A2217]"
          value={formData.message}
          onChange={(e) => setFormData({...formData, message: e.target.value})}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-[#0A2217] text-white py-3 px-6 rounded-md hover:bg-[#0A2217]/90 transition-colors"
      >
        Submit
      </button>
    </form>
  );
} 