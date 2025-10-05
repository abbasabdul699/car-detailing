"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CreditCardIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { SubscriptionPlan, SubscriptionStatus, Invoice } from '@/types/subscription';

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [plansRes, statusRes, invoicesRes] = await Promise.all([
        fetch('/api/subscription/plans'),
        fetch('/api/subscription/status'),
        fetch('/api/subscription/invoices')
      ]);

      if (!plansRes.ok || !statusRes.ok || !invoicesRes.ok) {
        throw new Error('Failed to fetch subscription data');
      }

      const [plansData, statusData, invoicesData] = await Promise.all([
        plansRes.json(),
        statusRes.json(),
        invoicesRes.json()
      ]);

      setPlans(plansData.plans);
      setStatus(statusData.status);
      setInvoices(invoicesData.invoices);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setError(''); // Clear any previous errors
      
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.needsSubscription) {
          setError('Please subscribe to a plan first to manage your subscription.');
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create customer portal session');
      }

      const { url } = await response.json();
      
      // Open in new tab and provide feedback
      window.open(url, '_blank');
      
      // Optional: Show success message briefly
      setTimeout(() => {
        // Could add a success toast here if you have a toast system
      }, 1000);
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        throw new Error('Failed to upgrade subscription');
      }

      const result = await response.json();
      
      // Check if we got a checkout URL for monthly plans
      if (result.checkoutUrl) {
        // Redirect to Stripe Checkout for monthly plans
        window.location.href = result.checkoutUrl;
      } else if (result.subscription) {
        // Handle successful subscription creation (pay-per-booking)
        fetchData(); // Refresh data
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription & Billing</h1>
        <p className="text-gray-600">
          Manage your subscription plan, billing information, and view invoices.
        </p>
      </div>

      {/* Current Status */}
      {status && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                status.isActive ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <CheckCircleIcon className={`h-5 w-5 ${
                  status.isActive ? 'text-green-600' : 'text-yellow-600'
                }`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {status.isActive ? 'Active' : status.isTrial ? 'Trial' : 'Inactive'}
                </p>
                <p className="text-sm text-gray-500">
                  {status.currentPlan?.name || 'No plan selected'}
                </p>
              </div>
            </div>

            {status.isTrial && status.trialDaysRemaining !== undefined && (
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {status.trialDaysRemaining} days remaining
                  </p>
                  <p className="text-sm text-gray-500">Free trial</p>
                </div>
              </div>
            )}

            {status.nextBillingDate && (
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-gray-100">
                  <CalendarIcon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Next billing: {new Date(status.nextBillingDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500">Automatic renewal</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={handleManageSubscription}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <CreditCardIcon className="h-4 w-4 mr-2" />
              Manage Subscription
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Opens secure billing portal to update payment methods, view invoices, and manage billing details
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Note: To downgrade plans, please contact ReevaCar support
            </p>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className={`border rounded-lg p-6 relative ${
              plan.name === 'Detailer Pro' ? 'border-green-500 shadow-lg' : ''
            }`}>
              {/* Recommended Badge for Detailer Pro */}
              {plan.name === 'Detailer Pro' && (
                <div className="absolute -top-2 right-6">
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

              <div className="space-y-2">
                {status?.currentPlan?.id === plan.id ? (
                  <div className="text-center py-2 px-4 bg-green-100 text-green-800 rounded-md">
                    Current Plan
                  </div>
                ) : (
                  <>
                    {status?.canUpgrade && plan.type === 'monthly' && (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <ArrowUpIcon className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </button>
                    )}
                    
                    {status?.canDowngrade && plan.type === 'pay_per_booking' && (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <ArrowDownIcon className="h-4 w-4 mr-2" />
                        Downgrade to Starter
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h2>
        
        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'open'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.periodStart).toLocaleDateString()} - {new Date(invoice.periodEnd).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
