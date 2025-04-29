'use client';

import Image from 'next/image';

interface LocationMapProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  businessName: string;
}

export default function LocationMap({ address, city, state, zipCode, businessName }: LocationMapProps) {
  const formattedAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(formattedAddress)}&zoom=14&size=1000x400&scale=2&markers=color:red%7C${encodeURIComponent(formattedAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

  const openMaps = () => {
    const encodedAddress = encodeURIComponent(formattedAddress);
    
    // Check if device is iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.location.href = `maps://?address=${encodedAddress}`;
    } else {
      window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }
  };

  return (
    <div 
      className="relative w-[700px] h-[300px] rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-md"
      onClick={openMaps}
    >
      <Image
        src={mapUrl}
        alt={`Map showing location of ${businessName}`}
        fill
        className="object-cover"
        quality={100}
        priority
        sizes="700px"
      />
      <div className="absolute bottom-2 right-2">
        <Image 
          src="https://maps.gstatic.com/mapfiles/api-3/images/google_white2.png"
          alt="Google Maps"
          width={56}
          height={20}
          className="opacity-90"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    </div>
  );
} 