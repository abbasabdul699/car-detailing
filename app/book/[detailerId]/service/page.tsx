'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Service {
  id: string;
  name: string;
  description?: string;
  category?: { name: string };
  icon?: string;
}

export default function ServiceStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const brand = searchParams.get('brand');
  const model = searchParams.get('model');
  const year = searchParams.get('year');
  const [bundleServices, setBundleServices] = useState<Service[]>([]);
  const [additionalServices, setAdditionalServices] = useState<Service[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [selectedAdditional, setSelectedAdditional] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/detailers/${detailerId}`)
      .then(res => res.json())
      .then(detailer => {
        const all = (detailer.services || []).map((ds: any) => ds.service);
        setBundleServices(all.filter((s: Service) => s.category?.name === 'Bundle'));
        setAdditionalServices(all.filter((s: Service) => s.category?.name === 'Additional'));
      })
      .finally(() => setLoading(false));
  }, [detailerId]);

  const handleBundleSelect = (serviceName: string) => {
    setSelectedBundle(serviceName);
  };

  const handleAdditionalToggle = (serviceName: string) => {
    setSelectedAdditional(prev =>
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const handleContinue = () => {
    const allSelected = [
      ...(selectedBundle ? [selectedBundle] : []),
      ...selectedAdditional,
    ];
    if (allSelected.length > 0) {
      router.push(`/book/${detailerId}/ai-or-manual?service=${encodeURIComponent(allSelected.join(','))}`);
    }
  };

  const handleBack = () => {
    router.push(`/detailers/${detailerId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black">&larr; Back</button>
        <h1 className="text-2xl font-bold mb-6">What kind of service do you need?</h1>
        {loading ? (
          <div className="mb-6 text-center text-gray-500">Loading services...</div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-3">Bundle Services</h2>
              <div className="space-y-4">
                {bundleServices.map(service => (
                  <label
                    key={service.id}
                    className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer ${selectedBundle === service.name ? 'border-black bg-gray-100' : 'border-gray-200 bg-white'}`}
                  >
                    <input
                      type="radio"
                      name="bundleService"
                      value={service.name}
                      checked={selectedBundle === service.name}
                      onChange={() => handleBundleSelect(service.name)}
                      className="mt-1 mr-4 h-5 w-5 accent-black"
                    />
                    <div className="flex items-center">
                      {service.icon && (
                        <img
                          src={service.icon}
                          alt={service.name}
                          className="w-10 h-10 object-contain mr-4"
                        />
                      )}
                      <div>
                        <div className="font-bold text-lg mb-1">{service.name}</div>
                        <div className="text-gray-500 text-base">{service.description || 'Thorough hand wash with microfiber towels to prevent scratches'}</div>
                      </div>
                    </div>
                  </label>
                ))}
                {bundleServices.length === 0 && <div className="text-gray-400 text-center">No bundle services available.</div>}
              </div>
            </div>
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-3">Additional Services</h2>
              <div className="space-y-4">
                {additionalServices.map(service => (
                  <label
                    key={service.id}
                    className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer ${selectedAdditional.includes(service.name) ? 'border-black bg-gray-100' : 'border-gray-200 bg-white'}`}
                  >
                    <input
                      type="checkbox"
                      name="additionalService"
                      value={service.name}
                      checked={selectedAdditional.includes(service.name)}
                      onChange={() => handleAdditionalToggle(service.name)}
                      className="mt-1 mr-4 h-5 w-5 accent-black"
                    />
                    <div className="flex items-center">
                      {service.icon && (
                        <img
                          src={service.icon}
                          alt={service.name}
                          className="w-10 h-10 object-contain mr-4"
                        />
                      )}
                      <div>
                        <div className="font-bold text-lg mb-1">{service.name}</div>
                        <div className="text-gray-500 text-base">{service.description || 'Thorough hand wash with microfiber towels to prevent scratches'}</div>
                      </div>
                    </div>
                  </label>
                ))}
                {additionalServices.length === 0 && <div className="text-gray-400 text-center">No additional services available.</div>}
              </div>
            </div>
          </>
        )}
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selectedBundle && selectedAdditional.length === 0}
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
      <style jsx global>{`
        .animate-fadein {
          animation: fadein 0.5s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 