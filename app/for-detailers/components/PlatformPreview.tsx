import Image from 'next/image'

export default function PlatformPreview() {
    return (
      <section className="bg-white text-black py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-center mb-20">
            Everything You Need to Get Seen,<br />Trusted, and Booked
          </h2>

          <div className="relative">
            {/* Laptop Display */}
            <div className="relative w-full max-w-5xl mx-auto">
              <Image
                src="/images/preview-laptop.png"
                alt="Platform preview on laptop"
                width={1200}
                height={750}
                className="w-full h-auto"
                priority
              />
            </div>

            {/* Phone Display - Positioned absolutely to overlap
            <div className="absolute -right-4 bottom-0 w-1/4 min-w-[300px]">
              <Image
                src="/images/phone-mockup.png"
                alt="Platform preview on phone"
                width={300}
                height={600}
                className="w-full h-auto"
                priority
              />
            </div> */}
          </div>
        </div>
      </section>
    )
  }