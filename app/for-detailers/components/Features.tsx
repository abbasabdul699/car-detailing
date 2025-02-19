import Image from 'next/image'

const featureCards = [
    {
      image: '/images/professional-profile.png',
      title: 'Professional Business Profile',
      alt: 'Professional Business Profile'
    },
    {
      image: '/images/SEO.png',
      title: 'Local Pricing Without Fees',
      alt: 'Local Pricing'
    },
    {
      image: '/images/SupportDetailer.png',
      title: 'Smart Online Booking System',
      alt: 'Booking System'
    }
  ]
  
  export default function Features() {
    return (
      <section className="bg-[#E8F2EE] py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          {/* Top button */}
          <button className="bg-[#0A2217] text-white px-6 py-2 rounded-full text-sm font-medium mb-12">
            How it works
          </button>

          {/* Main heading */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-center mb-20">
            Get Set Up Fast With Our Help to<br />Start Growing
          </h2>

          {/* White card container */}
          <div className="bg-white rounded-3xl p-12 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {featureCards.map((card, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="relative w-full h-48 mb-4">
                    <Image
                      src={card.image}
                      alt={card.alt}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <h3 className="text-xl font-medium">{card.title}</h3>
                </div>
              ))}
            </div>
            
            {/* Bottom button */}
            <button className="bg-[#0A2217] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#0A2217]/90 transition-colors">
              Schedule a call
            </button>
          </div>
        </div>
      </section>
    )
  }