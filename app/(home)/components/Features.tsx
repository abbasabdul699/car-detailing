"use client";
import { FC } from 'react';

const Features = () => {
  const features = [
    {
      id: 1,
      title: "Quality You Can Trust",
      description: "Every detailer on our platform is verified and vetted to meet high service standards. We carefully select professionals based on their experience, customer service, and quality of work—so you know you're booking with the best.",
      video: "/videos/mobile-detailing.mp4",
      poster: "/images/detailers/joshmobile.jpg"
    },
    {
      id: 2,
      title: "Car Detailing, Made Simple",
      description: "Browse top detailers in your area, check their services, and call them directly to discuss your needs. No waiting, no middlemen—just direct access to trusted professionals who are ready to help.",
      video: "/videos/interior-detailing.mp4",
    },
    {
      id: 3,
      title: "Personalized Car Care",
      description: "Whether it's a quick wash, deep interior cleaning, or premium protection like ceramic coating, find the right detailer offering exactly what your car needs. Compare options, ask questions, and choose with confidence.",
      video: "/videos/exterior-detailing.mp4",
    },
  ];

  return (
    <div className="bg-white w-screen overflow-x-hidden">
      <div className="w-full">
        <div>
          {features.map((feature, index) => (
            <div 
              key={feature.id} 
              className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-stretch w-full`}
            >
              {/* Video Section */}
              <div className="relative w-screen lg:w-1/2 h-[600px]">
                <div className="absolute inset-0">
                  <video
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={feature.poster}
                  >
                    <source src={feature.video} type="video/mp4" />
                  </video>
                  {/* Gradient Overlay - Direction changes based on position */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${
                    index % 2 === 0 
                      ? 'from-black/10 to-transparent' 
                      : 'from-transparent to-black/10'
                  } pointer-events-none`} />
                </div>
              </div>

              {/* Content Section */}
              <div className="w-screen lg:w-1/2 p-16 lg:p-24">
                <div className={`max-w-xl ${index % 2 === 1 ? 'ml-auto' : ''}`}>
                  <h2 className="text-5xl font-semibold text-gray-900 mb-8">
                    {feature.title}
                  </h2>
                  <p className="text-2xl text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features; 