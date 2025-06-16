'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const CONDITION_OPTIONS = [
  {
    value: 'Barely Dirty',
    label: 'Barely Dirty',
    description: 'Thorough hand wash with microfiber towels to prevent scratches',
    image: '/images/level1.png',
  },
  {
    value: 'Somewhat dirty',
    label: 'Somewhat dirty',
    description: 'Thorough hand wash with microfiber towels to prevent scratches',
    image: '/images/level2.png',
  },
  {
    value: 'Dirty',
    label: 'Dirty',
    description: 'Requires extra attention to remove moderate dirt and grime',
    image: '/images/level3a.png',
  },
  {
    value: 'Very dirty',
    label: 'Very dirty',
    description: 'Extensive cleaning needed for heavy dirt and buildup',
    image: '/images/level3.png',
  },
  // Add more options as needed
];

export default function ConditionStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const brand = searchParams.get('brand');
  const model = searchParams.get('model');
  const year = searchParams.get('year');
  const type = searchParams.get('type');
  const service = searchParams.get('service');
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    router.push(
      `/book/${detailerId}/review?brand=${encodeURIComponent(brand ?? '')}&model=${encodeURIComponent(model ?? '')}&year=${encodeURIComponent(year ?? '')}&type=${encodeURIComponent(type ?? '')}&service=${encodeURIComponent(service ?? '')}&condition=${encodeURIComponent(selectedCondition ?? '')}`
    );
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black text-3xl">&larr;</button>
        <h1 className="text-2xl font-bold mb-6">How would you describe the condition of your car?</h1>
        <div className="space-y-6 mb-8">
          {CONDITION_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${selectedCondition === option.value ? 'border-black bg-gray-100' : 'border-gray-200 bg-white'}`}
            >
              <img src={option.image} alt={option.label} className="w-full h-56 object-cover rounded mb-2 bg-gray-200" />
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  name="condition"
                  value={option.value}
                  checked={selectedCondition === option.value}
                  onChange={() => setSelectedCondition(option.value)}
                  className="mr-3 h-5 w-5 accent-black"
                />
                <span className="font-bold text-lg">{option.label}</span>
              </div>
              <div className="text-gray-500 text-base">{option.description}</div>
            </label>
          ))}
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selectedCondition}
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
