import Image from 'next/image';

const partnerTypes = [
  {
    icon: "/images/content-creator-icon.png",
    title: "Content Creator",
    description: "You publish informative relevant content through blogs, social media, YouTube videos, a podcast, or other channels."
  },
  {
    icon: "/images/agency-icon.png",
    title: "Agency",
    description: "You manage detailing businesses or offer development, integration, analytics, or other related services."
  },
  {
    icon: "/images/consultant-icon.png",
    title: "Consultant / Evangelist",
    description: "You advise clients on strategies or are influential in the detailing industry."
  },
  {
    icon: "/images/technology-icon.png",
    title: "Technology",
    description: "Your software solution users can find added value with Reeva and we do or should share clients."
  }
];

export default function PartnerTypes() {
  return (
    <section className="py-24 bg-[#E8F2EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-16">Are you a good fit?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {partnerTypes.map((type, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className="w-16 h-16 mx-auto mb-6">
                <Image
                  src={type.icon}
                  alt={type.title}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4">{type.title}</h3>
              <p className="text-gray-600">{type.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 