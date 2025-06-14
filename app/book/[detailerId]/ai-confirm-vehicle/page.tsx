'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function AiConfirmVehicleStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const vehicleParam = searchParams.get('vehicle');
  const router = useRouter();

  // Parse the vehicle object from the query param
  let vehicle: { manufacturer?: string; model?: string; year?: string; color?: string } | null = null;
  try {
    vehicle = vehicleParam ? JSON.parse(decodeURIComponent(vehicleParam)) : null;
  } catch {
    vehicle = null;
  }

  const handleConfirm = () => {
    // Pass the detected vehicle to the next step
    router.push(
      `/book/${detailerId}/ai-area-photos?service=${encodeURIComponent(service ?? '')}&vehicle=${encodeURIComponent(vehicleParam ?? '')}`
    );
  };

  const handleBack = () => {
    router.push(`/book/${detailerId}/ai-upload?service=${encodeURIComponent(service ?? '')}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black text-3xl">&larr;</button>
        <h1 className="text-2xl font-bold mb-6">Confirm Your Vehicle</h1>
        <div className="mb-8 text-center">
          <div className="text-lg mb-2">Detected Vehicle:</div>
          {vehicle ? (
            <>
              <div className="font-bold text-xl mb-4">
                {vehicle.manufacturer} {vehicle.model} {vehicle.year} {vehicle.color}
              </div>
              <div>Make: <span className="font-semibold">{vehicle.manufacturer}</span></div>
              <div>Model: <span className="font-semibold">{vehicle.model}</span></div>
              <div>Year: <span className="font-semibold">{vehicle.year}</span></div>
              <div>Color: <span className="font-semibold">{vehicle.color}</span></div>
            </>
          ) : (
            <div className="font-bold text-xl mb-4">Unknown Vehicle</div>
          )}
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold hover:bg-gray-700 transition"
          onClick={handleConfirm}
        >
          Confirm
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