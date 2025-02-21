import Image from 'next/image'
import Link from 'next/link'

const helpCategories = [
  {
    title: 'Announcements',
    description: "We've got our ear to the ground. Here's what you need to know.",
    icon: '/icons/megaphone.svg',
    href: '#'
  },
  {
    title: 'Detailing Basics',
    description: 'Start off on the right foot! Not the left one!',
    icon: '/icons/smile.svg',
    href: '#'
  },
  {
    title: 'Account Settings',
    description: "You're a special snowflake and so is your account.",
    icon: '/icons/settings.svg',
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
    title: 'Quests & Promotions',
    description: 'Welcome, weary traveler! Would you like to see our quests?',
    icon: '/icons/heart-mail.svg',
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
  return (
    <>
      {/* Hero Section with Search */}
      <div className="bg-[#5865F2] min-h-[300px] relative overflow-hidden">
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
          <p className="text-gray-600">
            If you're new to Renu and looking for tips, check out our{' '}
            <Link href="/beginners-guide" className="text-[#5865F2] hover:underline">
              Beginner's Guide
            </Link>
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

          <form className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <input
                  type="text"
                  placeholder="First name"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44]"
                  required
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Last name"
                  className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44]"
                  required
                />
              </div>
            </div>


            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44]"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <input
                type="tel"
                placeholder="Phone"
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44]"
                required
              />
            </div>

            {/* Company */}
            <div>
              <input
                type="text"
                placeholder="Company"
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44]"
                required
              />
            </div>


            {/* Country/Region Dropdown */}
            <div>
              <select
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44] bg-white"
                required
                defaultValue="United States"
              >
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Mexico">Mexico</option>
                {/* Add more countries as needed */}
              </select>
            </div>

            {/* Product Interest Dropdown */}
            <div>
              <select
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44] bg-white"
                required
              >
                <option value="">Select your product interest</option>
                <option value="basic">Basic Detailing</option>
                <option value="premium">Premium Detailing</option>
                <option value="enterprise">Enterprise Solutions</option>
              </select>
            </div>

            {/* Description Text Area */}
            <div>
              <textarea
                placeholder="Please describe your issue or question in detail..."
                rows={4}
                className="w-full px-4 py-3 rounded-md border border-gray-300 focus:border-[#1a2e44] focus:ring-1 focus:ring-[#1a2e44] resize-none"
              />
            </div>

            {/* Privacy Statement */}
            <div className="text-sm text-gray-600">
              By registering, you agree to the processing of your personal data as described in the{' '}
              <Link href="/privacy" className="text-[#1a2e44] hover:underline">
                Privacy Statement
              </Link>
              .
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#1a2e44] text-white py-3 px-6 rounded-md hover:bg-[#1a2e44]/90 transition-colors font-medium"
            >
              CONTACT US
            </button>
          </form>
        </div>
      </section>
    </>
  )
} 