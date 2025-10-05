"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SubscriptionPlan } from '@/types/subscription';

export function usePlanSelection() {
  const { data: session } = useSession();
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if detailer needs to select a plan
  useEffect(() => {
    const checkPlanSelectionNeeded = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/subscription/status');
        if (response.ok) {
          const data = await response.json();
          const status = data.status;
          
          // Show plan selection if:
          // 1. No active subscription
          // 2. Not in trial period
          // 3. No current plan selected
          if (!status?.isActive && !status?.isTrial && !status?.currentPlan) {
            setShowPlanSelection(true);
          }
        }
      } catch (err) {
        console.error('Error checking plan selection status:', err);
      }
    };

    checkPlanSelectionNeeded();
  }, [session]);

  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/subscription/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError('Failed to load subscription plans');
      }
    };

    if (showPlanSelection) {
      fetchPlans();
    }
  }, [showPlanSelection]);

  const handleSelectPlan = async (planId: string) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowPlanSelection(false);
        // Redirect to Stripe checkout or show success message
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create subscription');
      }
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError('Failed to create subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const closePlanSelection = () => {
    setShowPlanSelection(false);
    setError(null);
  };

  return {
    showPlanSelection,
    plans,
    isLoading,
    error,
    handleSelectPlan,
    closePlanSelection,
  };
}
