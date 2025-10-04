"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session?.user) {
      // Redirect logged-in users to their dashboard subscription page
      router.push('/detailer-dashboard/subscription');
    } else {
      // Redirect non-logged-in users to login
      router.push('/detailer-login');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to subscription management...</p>
      </div>
    </div>
  );
} 