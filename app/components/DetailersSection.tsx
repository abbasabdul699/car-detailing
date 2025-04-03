import Link from 'next/link'

<Image
  src={detailer.images?.[0]?.url || '/images/detailers/default-car.jpg'}
  alt={detailer.images?.[0]?.alt || detailer.businessName}
  fill
  className="rounded-lg object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
  onError={(e) => {
    console.error(`Failed to load image for ${detailer.businessName}`);
    const target = e.target as HTMLImageElement;
    target.src = '/images/detailers/default-car.jpg';
  }}
/> 

export default function DetailersSection({ detailers }: { detailers: Detailer[] }) {
  return (
    <section className="py-12">
      <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {detailers.map((detailer) => (
          <Link 
            href={`/detailers/${detailer.id}`} 
            key={detailer.id}
            className="block transition-transform hover:scale-105 hover:shadow-xl"
          >
            <div className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer">
              <div className="relative h-48">
                <Image
                  src={detailer.images?.[0]?.url || '/images/detailers/default-car.jpg'}
                  alt={detailer.images?.[0]?.alt || detailer.businessName}
                  fill
                  className="rounded-t-lg object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  onError={(e) => {
                    console.error(`Failed to load image for ${detailer.businessName}`);
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/detailers/default-car.jpg';
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{detailer.businessName}</h3>
                <p className="text-gray-600 text-sm mb-2">{detailer.description}</p>
                <p className="text-green-600">{detailer.priceRange}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
} 