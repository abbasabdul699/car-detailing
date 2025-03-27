import Image from 'next/image'
import Link from 'next/link'

export default function Intro() {
    return (
      <section className="max-w-7xl mx-auto px-4 relative">
        <div className="text-center pt-32 pb-40">
          {/* Top Badge */}
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-[#DBF0E2] text-[#71A894] rounded-full text-sm">
              Built by detailers, for detailers
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-[64px] font-serif mb-8 leading-tight">
            Get More Customers and<br />
            Save on SEO
          </h1>

          {/* Subheading */}
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            Grow your detailing business without pricey ads. Simple, effective, real results.
          </p>

          {/* CTA Section */}
          <div className="relative inline-block">
            <Link href="/contact-us-page">
              <button className="bg-black text-white px-8 py-3 rounded-lg hover:bg-black/90 transition-colors text-lg">
                Schedule a call
              </button>
            </Link>
            
            {/* Arrow Image - Adjusted rotation */}
            <div className="absolute -right-16 -bottom-12">
              <Image
                src="/images/arrow.png"
                alt="Arrow"
                width={80}
                height={80}
                className="transform rotate-55"
              />
            </div>
            
            {/* Limited Spots Text */}
            <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <p className="text-sm text-gray-500">
                Only 3 spots left for first cohort.<br />
                Our full focus will be on your growth.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }