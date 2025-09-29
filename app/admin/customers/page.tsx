'use client';

import { useState, useEffect } from 'react';
import AdminNavbar from '@/app/components/AdminNavbar';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  locationType?: string;
  vehicleInfo?: any[];
  preferredTime?: string;
  flexibility?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  detailer: {
    businessName: string;
  };
  bookings: {
    id: string;
    scheduledDate: string;
    status: string;
  }[];
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailer, setSelectedDetailer] = useState('all');
  const [detailers, setDetailers] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchDetailers();
  }, [selectedDetailer]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = selectedDetailer !== 'all' ? `?detailerId=${selectedDetailer}` : '';
      console.log('Fetching customers with params:', params);
      const response = await fetch(`/api/customers${params}`);
      console.log('Customers API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Customers data received:', data);
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailers = async () => {
    try {
      const response = await fetch('/api/admin/detailers');
      const data = await response.json();
      setDetailers(data.detailers || []);
    } catch (error) {
      console.error('Error fetching detailers:', error);
    }
  };

  const formatVehicleInfo = (vehicleInfo: any[]) => {
    if (!vehicleInfo || vehicleInfo.length === 0) return 'N/A';
    return vehicleInfo.map(vehicle => 
      `${vehicle.year || 'N/A'} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    ).join(', ');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="mt-2 text-gray-600">View and manage customer contact information</p>
          </div>

          {/* Filter by detailer */}
          <div className="mb-6">
            <select
              value={selectedDetailer}
              onChange={(e) => setSelectedDetailer(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Detailers</option>
              {detailers.map((detailer) => (
                <option key={detailer.id} value={detailer.id}>
                  {detailer.businessName}
                </option>
              ))}
            </select>
          </div>

          {/* Customers list */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {customers.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No customers found
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <li key={customer.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {customer.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {customer.detailer.businessName} • {customer.phone}
                            </p>
                            {customer.email && (
                              <p className="text-sm text-gray-600">{customer.email}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-500">
                              {customer.bookings.length} booking{customer.bookings.length !== 1 ? 's' : ''}
                            </span>
                            {customer.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {customer.tags.map((tag, index) => (
                                  <span key={index} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                          {customer.address && (
                            <p>
                              <strong>Address:</strong> {customer.address}
                              {customer.locationType && (
                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  {customer.locationType}
                                </span>
                              )}
                            </p>
                          )}
                          <p><strong>Vehicle:</strong> {formatVehicleInfo(customer.vehicleInfo || [])}</p>
                          {customer.preferredTime && <p><strong>Preferred Time:</strong> {customer.preferredTime}</p>}
                          {customer.flexibility && <p><strong>Flexibility:</strong> {customer.flexibility}</p>}
                        </div>
                        
                        {customer.bookings.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-900">Recent Bookings:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {customer.bookings.slice(0, 3).map((booking) => (
                                <span 
                                  key={booking.id}
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}
                                >
                                  {new Date(booking.scheduledDate).toLocaleDateString()} - {booking.status}
                                </span>
                              ))}
                              {customer.bookings.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{customer.bookings.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
