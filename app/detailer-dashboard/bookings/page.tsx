'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Booking {
  id: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  vehicleType?: string;
  vehicleLocation?: string;
  services: string[];
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export default function DetailerBookingsPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, [selectedStatus]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
      const response = await fetch(`/api/bookings/detailer/${session?.user?.id}${params}`);
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          status
        })
      });

      if (response.ok) {
        fetchBookings(); // Refresh the list
      } else {
        console.error('Failed to update booking status');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
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

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading bookings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Your Bookings</h1>
            <p className="mt-2 text-gray-600">Manage your appointments and bookings</p>
          </div>

          {/* Filter by status */}
          <div className="mb-6">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Bookings list */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {bookings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No bookings found
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <li key={booking.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {booking.customerName || 'Unknown Customer'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatPhoneNumber(booking.customerPhone)}
                            </p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                          <p><strong>Date:</strong> {new Date(booking.scheduledDate).toLocaleDateString()}</p>
                          {booking.scheduledTime && <p><strong>Time:</strong> {booking.scheduledTime}</p>}
                          {booking.vehicleType && <p><strong>Vehicle:</strong> {booking.vehicleType}</p>}
                          {booking.vehicleLocation && <p><strong>Location:</strong> {booking.vehicleLocation}</p>}
                          <p><strong>Services:</strong> {booking.services.join(', ')}</p>
                          <p><strong>Created:</strong> {new Date(booking.createdAt).toLocaleDateString()}</p>
                        </div>
                        
                        {booking.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <p><strong>Notes:</strong> {booking.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4 flex space-x-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'completed')}
                          disabled={booking.status === 'cancelled'}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          Mark Complete
                        </button>
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
