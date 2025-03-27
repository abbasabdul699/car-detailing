'use client';
import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    phoneNumber: '',
    companyName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Add your form submission logic here
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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



      <button
        type="submit"
        className="w-full bg-[#0A2217] text-white py-3 px-6 rounded-md hover:bg-[#0A2217]/90 transition-colors"
      >
        Submit
      </button>
    </form>
  );
} 