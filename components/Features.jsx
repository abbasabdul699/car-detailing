const Features = () => {
  const features = [
    {
      title: "Quality You Can Trust",
      description: "Every detailer on our platform is verified and vetted to meet high service standards. We carefully select professionals based on their experience, customer service, and quality of work—so you know you're booking with the best.",
      image: "/guyqualitycheck.png", // Replace with your actual image path
      imagePosition: "left"
    },
    {
      title: "Car Detailing, Made Simple",
      description: "Browse top detailers in your area, check their services, and call them directly to discuss your needs. No waiting, no middlemen—just direct access to trusted professionals who are ready to help.",
      image: "/cardetailercalling.png", // Replace with your actual image path
      imagePosition: "left"
    },
    {
      title: "Personalized Car Care",
      description: "Whether it's a quick wash, deep interior cleaning, or premium protection like ceramic coating, find the right detailer offering exactly what your car needs. Compare options, ask questions, and choose with confidence.",
      image: "/guycleaningcar.png", // Replace with your actual image path
      imagePosition: "left"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <div className="space-y-24">
        {features.map((feature, index) => (
          <div 
            key={index}
            className={`flex flex-col md:flex-row items-center gap-12 ${
              index % 2 === 1 ? 'md:flex-row-reverse' : ''
            }`}
          >
            <div className="flex-1">
              <div className="rounded-3xl overflow-hidden">
                <img 
                  src={feature.image} 
                  alt={feature.title}
                  className="w-full h-[400px] object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <h2 className="text-3xl font-serif">{feature.title}</h2>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Features; 