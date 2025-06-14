'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AiOrManualStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (selected === 'manual') {
      router.push(`/book/${detailerId}/brand?service=${encodeURIComponent(service ?? '')}`);
    } else if (selected === 'ai') {
      router.push(`/book/${detailerId}/ai-upload?service=${encodeURIComponent(service ?? '')}`);
    }
  };

  const handleBack = () => {
    router.push(`/book/${detailerId}/service`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black text-3xl">&larr;</button>
        <h1 className="text-3xl font-bold mb-4">Now let's personalize your service:</h1>
        <h2 className="text-xl text-gray-500 mb-8">How do you want to proceed?</h2>
        <div className="space-y-6 mb-12">
          <label className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer ${selected === 'manual' ? 'border-black bg-gray-100' : 'border-gray-200 bg-white'}`}>
            <input
              type="radio"
              name="ai-or-manual"
              value="manual"
              checked={selected === 'manual'}
              onChange={() => setSelected('manual')}
              className="mt-1 mr-4 h-5 w-5 accent-black"
            />
            <div>
              <div className="font-bold text-lg mb-1">Manual</div>
              <div className="text-gray-500 text-base">Input car brand, model, year, and condition to get an instant quote</div>
            </div>
          </label>
          <label className={`flex items-start p-4 rounded-xl border transition-all cursor-pointer ${selected === 'ai' ? 'border-black bg-gray-100' : 'border-gray-200 bg-white'}`}>
            <input
              type="radio"
              name="ai-or-manual"
              value="ai"
              checked={selected === 'ai'}
              onChange={() => setSelected('ai')}
              className="mt-1 mr-4 h-5 w-5 accent-black"
            />
            <div>
              <div className="font-bold text-lg mb-1">AI-Image Recognition</div>
              <div className="text-gray-500 text-base">Just snap a few pictures of your car and get an instant and accurate quote</div>
            </div>
          </label>
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selected}
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