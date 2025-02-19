import Image from 'next/image'

export default function Hero() {
    return (
      <section className="relative bg-white text-black py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Top Schedule Button */}
          <button className="bg-[#E8F2EE] text-[#0A2217] px-6 py-2 rounded-full text-sm font-medium mb-12">
            Schedule a call
          </button>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif tracking-tight mb-8">
            Detailing Made Easy. Get Customers & Grow Fast.
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            We help mobile detailers get discovered by local customers with a professional business profile—no website or SEO headaches needed
          </p>

          {/* Bottom Schedule Button */}
          <button className="bg-[#0A2217] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#0A2217]/90 transition-colors">
            Schedule a call
          </button>
        </div>
      </section>
    )
  }