import Image from 'next/image'

export default function GetStarted() {
    const features = [
        {
            title: "Professional Business Profile",
            description: "We build your profile with your services, photos, and pricing—so customers see you as the pro you are",
            image: "/images/professional-profile.png",
        },
        {
            title: "Local Visibility Without SEO",
            description: "Show up when car owners search for detailers in your area—without paying hundreds for ads or SEO experts",
            image: "/images/SEO.png",
        },
        {
            title: "Support from Detailers Who Get It",
            description: "From profile setup to your first customer, we work with you every step of the way",
            image: "/images/SupportDetailers.png",
        }
    ]

    return (
      <section className="bg-[rgba(10,34,23,0.8)] text-white py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-center mb-20">
            Everything You Need to Get Seen,<br />Trusted, and Booked
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-3xl p-8 flex flex-col items-center">
                <div className="h-48 w-full relative mb-6">
                  <Image
                    src={feature.image}
                    alt={feature.title}
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="text-[#0A2217] text-xl font-semibold mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-center mb-8 text-sm">
                  {feature.description}
                </p>
                <button className="mt-auto border border-[#0A2217] text-[#0A2217] px-6 py-3 rounded-full hover:bg-gray-50 transition-colors">
                  Schedule a call
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }