import Image from 'next/image';

const benefits = [
  {
    title: "Competitive Commission",
    description: "Earn up to 20% recurring commission for every detailer you refer who joins and stays active on our platform.",
    icon: "/images/commission-icon.png"
  },
  {
    title: "Dedicated Support",
    description: "Get personalized support from our partnership team to help you succeed and maximize your earnings.",
    icon: "/images/support-icon.png"
  },
  {
    title: "Marketing Resources",
    description: "Access exclusive marketing materials, training resources, and promotional content to help you promote Reeva.",
    icon: "/images/marketing-icon.png"
  },
  {
    title: "Real-Time Analytics",
    description: "Track your referrals, commissions, and performance through our intuitive dashboard.",
    icon: "/images/analytics-icon.png"
  },
  {
    title: "Early Access",
    description: "Be the first to know about new features and get exclusive access to beta programs.",
    icon: "/images/early-access-icon.png"
  },
  {
    title: "Community Access",
    description: "Join our partner community to network, share insights, and learn from other successful partners.",
    icon: "/images/community-icon.png"
  }
];

export default function Benefits() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Partner Benefits</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join our partner program and unlock exclusive benefits designed to help you succeed
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-[#E8F2EE] rounded-xl p-8 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 mb-6">
                <Image
                  src={benefit.icon}
                  alt={benefit.title}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold mb-4">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 