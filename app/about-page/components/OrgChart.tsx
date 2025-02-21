'use client'

import Image from 'next/image';

const teamMembers = [
  {
    name: "Daunte Pean",
    title: "Chief Executive Officer and Product Manager",
    subtitle: "Co-Founder",
    imageUrl: "/images/Daunte.png", // Add actual image path
  },
  {
    name: "Abdul Abbas",
    title: "Chief Technology Officer and Frontend Developer",
    subtitle: "Co-Founder",
    imageUrl: "/images/Abdul.png",
  },
  {
    name: "Anthony Zheng",
    title: "Chief Operating Officer and Product Designer",
    imageUrl: "/images/Anthony.png",
  },
  {
    name: "Jiaku Yang",
    title: "Head of Software Engineering and Backend Developer",
    imageUrl: "/images/JK.png",
  },

];

function OrgChart() {
  return (
    <div className="py-16">
      <h2 className="text-3xl font-bold text-center mb-12">Our Leadership Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto px-4">
        {teamMembers.map((member, index) => (
          <div 
            key={index}
            className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow duration-300"
          >
            <div className="w-32 h-32 mx-auto mb-6 relative rounded-full overflow-hidden">
              <Image 
                src={member.imageUrl}
                alt={member.name}
                width={200}
                height={200}
                className="rounded-full w-full h-full object-cover"
              />
            </div>
            <h3 className="text-2xl font-semibold mb-2">{member.name}</h3>
            {member.subtitle && (
              <p className="text-md text-gray-500 mb-2">{member.subtitle}</p>
            )}
            <p className="text-lg text-gray-600">{member.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

module.exports = OrgChart; 