'use client';

import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          Subscription Cancelled
        </h2>
        <p className="mt-2 text-gray-600">
          Your subscription was not completed. Please try again or contact support if you need assistance.
        </p>
        <button
          onClick={() => router.push('/subscription')}
          className="mt-8 w-full bg-[#0A2217] text-white rounded-md py-2 px-4 hover:bg-[#0A2217]/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
} 