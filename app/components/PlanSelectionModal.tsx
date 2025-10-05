"use client";

import { useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SubscriptionPlan } from '@/types/subscription';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
  plans: SubscriptionPlan[];
  isLoading?: boolean;
}

export default function PlanSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectPlan, 
  plans, 
  isLoading = false 
}: PlanSelectionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan(planId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
            <p className="text-gray-600 mt-1">
              Select the plan that best fits your business needs. You can change it anytime.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                className={`border rounded-lg p-6 relative cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? 'border-green-500 shadow-lg ring-2 ring-green-200' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {/* Recommended Badge for Detailer Pro */}
                {plan.name === 'Detailer Pro' && (
                  <div className="absolute -top-3 right-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Recommended
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      ${plan.price}
                      {plan.type === 'monthly' ? '/month' : '/booking'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {plan.type === 'monthly' ? 'Billed monthly' : 'Pay per booking'}
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">{plan.description}</p>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan.id);
                    }}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      selectedPlan === plan.id
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : plan.name === 'Detailer Pro'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isLoading ? 'Processing...' : `Choose ${plan.name}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <p className="text-sm text-gray-600 text-center">
            💡 <strong>Tip:</strong> Most successful detailers choose the Pro plan for unlimited bookings and advanced features.
          </p>
        </div>
      </div>
    </div>
  );
}
