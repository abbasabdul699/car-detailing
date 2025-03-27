'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          Subscription Successful!
        </h2>
        <p className="mt-2 text-gray-600">
          Thank you for subscribing. Your account has been upgraded.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-8 w-full bg-[#0A2217] text-white rounded-md py-2 px-4 hover:bg-[#0A2217]/90"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
} 