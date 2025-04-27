import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FaInstagram, FaTiktok, FaGlobe, FaShare } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import { prisma } from '@/lib/prisma';
import ImageUpload from '@/app/components/ImageUpload';
interface Image {
  id: string;
  url: string;
  alt: string;
  detailerId: string;
}

interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  priceRange: string;
  description: string;
  services: string[];
  images: Image[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default async function DetailerProfile({ params }: { params: { id: string } }) {
  try {
    const detailer = await prisma.detailer.findUnique({
      where: { 
        id: params.id 
      },
      include: {  // Changed from select to include
        images: true,
      }
    });

    if (!detailer) {
      return notFound();
    }

    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="relative h-[400px] mb-8 rounded-xl overflow-hidden">
              <Image
                src={detailer.images[0]?.url || '/images/detailers/default-car.jpg'}
                alt={detailer.images[0]?.alt || detailer.businessName}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Business Info */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h1 className="text-4xl font-bold mb-4">{detailer.businessName}</h1>
              <div className="flex items-center mb-6">
                <span className="text-green-600 font-semibold">{detailer.priceRange}</span>
              </div>
              <p className="text-gray-600 text-lg mb-6">{detailer.description}</p>
            </div>

            {/* Contact & Services */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <p className="flex items-center">
                    <span className="mr-2">📍</span>
                    {`${detailer.address}, ${detailer.city}, ${detailer.state} ${detailer.zipCode}`}
                  </p>
                  <p className="flex items-center">
                    <span className="mr-2">📞</span>
                    {detailer.phone}
                  </p>
                  <p className="flex items-center">
                    <span className="mr-2">✉️</span>
                    {detailer.email}
                  </p>
                </div>
              </div>

              {/* Services */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold mb-6">Services</h2>
                <div className="grid gap-4">
                  {detailer.services.map((service, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      {service}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Book Now Button */}
            <div className="mt-8 text-center">
              <a 
                href={`mailto:${detailer.email}?subject=Booking Request for ${detailer.businessName}`}
                className="inline-block bg-green-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Book Now
              </a>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Upload Detailer Images</h2>
              <ImageUpload
                detailerId={params.id}
                businessName={detailer.businessName}
                onUploadComplete={(imageUrl) => {
                  console.log('Image uploaded:', imageUrl);
                  // Handle the uploaded image URL
                }}
              />
            </div>
          </div>
        </main>
      </>
    );
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return notFound();
  }
}