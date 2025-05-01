'use client';
import { useState } from 'react';
import Image from 'next/image';

const tabs = [
  {
    id: 'generous-payouts',
    title: 'Generous payouts',
    content: {
      title: 'Earn More with Our Partner Program',
      description: 'Earn up to $30,000 or 20% commission on each referred detailer. Our competitive payout structure ensures significant returns on your efforts.',
      image: '/images/partners/payouts-dashboard.png'
    }
  },
  {
    id: 'use-platform',
    title: 'Use Reeva.com',
    content: {
      title: 'Powerful Platform at Your Fingertips',
      description: 'Access our intuitive dashboard to track referrals, manage commissions, and grow your partnership business with ease.',
      image: '/images/partners/platform-dashboard.png'
    }
  },
  {
    id: 'dedicated-team',
    title: 'Dedicated team',
    content: {
      title: 'Personal Support Every Step of the Way',
      description: 'Get direct access to our partnership team who will help you maximize your success and earnings potential.',
      image: '/images/partners/support-team.png'
    }
  },
  {
    id: 'partnership-support',
    title: 'Partnership support',
    content: {
      title: 'Resources to Help You Succeed',
      description: 'Access marketing materials, training resources, and promotional content to effectively promote Reeva to your audience.',
      image: '/images/partners/partnership-resources.png'
    }
  }
];

export default function WhyPartner() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-16">
          Why become a Reeva partner?
        </h2>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'bg-[#0A2217] text-white' 
                  : 'bg-[#E8F2EE] text-[#0A2217] hover:bg-[#0A2217] hover:text-white'
                }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`transition-all duration-300 ${
                activeTab === tab.id ? 'block' : 'hidden'
              }`}
            >
              <div className="lg:pr-12">
                <h3 className="text-3xl font-bold mb-6">{tab.content.title}</h3>
                <p className="text-xl text-gray-600 mb-8">{tab.content.description}</p>
                <div className="flex gap-4">
                  <button className="bg-[#0A2217] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#0A2217]/90 transition-colors">
                    Let's get started
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Image Area - Always visible, changes with active tab */}
          <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`absolute inset-0 transition-opacity duration-300 ${
                  activeTab === tab.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Image
                  src={tab.content.image}
                  alt={tab.content.title}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 