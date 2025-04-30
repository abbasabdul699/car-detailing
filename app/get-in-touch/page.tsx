'use client'

import ContactForm from './components/ContactForm';
import ResourceLinks from './components/ResourceLinks';

export default function ContactPage() {
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
              <ContactForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 