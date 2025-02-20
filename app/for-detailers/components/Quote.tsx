import Image from 'next/image'

export default function Testimonial() {
    return (
      <section className="bg-[rgba(56,145,103,1)] text-white py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <blockquote className="mb-8">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-serif leading-relaxed">
              &quot;As a detailer for over 5 years, I know how hard it is to get your name 
              out there. I built this platform because every great detailer deserves to 
              be seen and booked without fighting through ads, SEO, or slow weeks.&quot;
            </p>
          </blockquote>
          
          <div className="flex items-center justify-center space-x-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-300">
              <Image
                src="/images/Daunte.png"
                alt="Daunte"
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-lg font-medium">Daunte, Founder & Detailer</p>
            </div>
          </div>
        </div>
      </section>
    )
  }