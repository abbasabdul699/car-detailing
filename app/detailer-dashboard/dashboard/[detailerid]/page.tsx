import React from 'react';

interface DetailerDashboardPageProps {
  params: { detailerid: string };
}

export default function DetailerDashboardPage({ params }: DetailerDashboardPageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">Welcome to your dashboard!</h1>
      <p className="text-lg text-gray-700">Detailer ID: <span className="font-mono text-indigo-600">{params.detailerid}</span></p>
      {/* Add dashboard widgets and content here */}
    </div>
  );
} 