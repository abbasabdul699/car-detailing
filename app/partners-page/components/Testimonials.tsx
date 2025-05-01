import Image from 'next/image';

const testimonials = [
  {
    quote: "Partnering with Reeva has been a game-changer for our detailing community. The commission structure is fantastic, and their support team is always there when we need them.",
    author: "John Smith",
    role: "Detailing Industry Influencer",
    avatar: "/images/testimonial-1.jpg"
  },
  {
    quote: "As a content creator in the automotive space, Reeva's partner program has provided an excellent opportunity to monetize my audience while providing real value to my followers.",
    author: "Sarah Johnson",
    role: "Automotive YouTuber",
    avatar: "/images/testimonial-2.jpg"
  },
  {
    quote: "The partnership with Reeva has allowed us to offer our clients a reliable platform for their detailing needs. The integration was seamless, and the results speak for themselves.",
    author: "Mike Williams",
    role: "Agency Owner",
    avatar: "/images/testimonial-3.jpg"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-[#0A2217] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-16">What Our Partners Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-[#0F2E1F] rounded-xl p-8"
            >
              <div className="mb-6">
                <svg className="w-8 h-8 text-[#389167]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-lg mb-6">{testimonial.quote}</p>
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 