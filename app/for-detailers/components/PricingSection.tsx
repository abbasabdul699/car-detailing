'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function PricingSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Title and Description */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-serif mb-6">
            Simple Plan. Real Results.
          </h2>
          <p className="text-xl text-gray-600">
            We focus on getting you customers and delivering real results, not charging high fees
          </p>
        </div>

        {/* Pricing Cards Container */}
        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-5xl mx-auto">
          {/* Single Pro Plan Card */}
          <div className="max-w-md w-full">
            <motion.div 
              whileHover={{ 
                y: -10,
                backgroundColor: 'rgba(56, 145, 103, 0.05)'
              }}
              transition={{ duration: 0.2 }}
              className="p-[3px] rounded-[2.5rem] bg-gradient-to-b from-[#1D503A] to-[#389167]/40 hover:shadow-xl transition-shadow"
            >
              <div className="bg-white rounded-[2.3rem] p-8">
                <h3 className="text-3xl font-serif mb-4">Detailer Pro</h3>
                
                <div className="mb-8">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">$300</span>
                    <div className="ml-2 text-gray-600">
                      <div>per month</div>
                      <div>billed monthly</div>
                    </div>
                  </div>
                </div>

                <Link href="/get-in-touch">
                  <button className="w-full bg-black text-white py-4 rounded-2xl mb-8 hover:bg-black/90 transition-colors text-xl">
                    Schedule a call
                  </button>
                </Link>

                <div className="space-y-6">
                  {/* Features list */}
                  <div className="flex gap-3">
                    <span className="text-[#389167] text-xl">✓</span>
                    <div>
                      <span className="font-medium text-gray-700">Instant Visibility.</span>
                      <span className="text-gray-500"> Be featured in front of customers looking for detailers</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-[#389167] text-xl">✓</span>
                    <div>
                      <span className="font-medium text-gray-700">Professional Profile.</span>
                      <span className="text-gray-500"> We build your page with unlimited services, photos, and pricing</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-[#389167] text-xl">✓</span>
                    <div>
                      <span className="font-medium text-gray-700">No Website Needed.</span>
                      <span className="text-gray-500"> Customers book with you directly, hassle-free</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-[#389167] text-xl">✓</span>
                    <div>
                      <span className="font-medium text-gray-700">SEO & Ads Done for You.</span>
                      <span className="text-gray-500"> We handle marketing so you don't have to, and metric to see results</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-[#389167] text-xl">✓</span>
                    <div>
                      <span className="font-medium text-gray-700">Advanced AI Features</span>
                      <span className="text-gray-500"> Smart scheduling, pricing optimization, and customer insights</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-[#389167] text-xl">✓</span>
                    <div>
                      <span className="font-medium text-gray-700">AI-Powered Analytics</span>
                      <span className="text-gray-500"> Data-driven insights to grow your business</span>
                    </div>
                  </div>

                  
                </div>

                <div className="text-center mt-8 text-gray-500 text-sm">15% discount for first cohort</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
} 