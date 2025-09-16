'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { FaArrowUp, FaArrowDown, FaSort } from 'react-icons/fa';

export default function ManageServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/detailer/services');
        if (!res.ok) {
          if (res.status === 401) throw new Error('You must be logged in to view your services.');
          if (res.status === 404) throw new Error('No detailer profile found. Please complete your profile.');
          throw new Error('Failed to fetch services');
        }
        const data = await res.json();
        setServices(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  const sortedServices = useMemo(() => {
    let sortableServices = [...services];
    if (sortConfig !== null) {
      sortableServices.sort((a, b) => {
        const aValue = sortConfig.key === 'category' ? a.category?.name : a[sortConfig.key];
        const bValue = sortConfig.key === 'category' ? b.category?.name : b[sortConfig.key];

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableServices;
  }, [services, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <FaSort className="inline-block h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'ascending' ? <FaArrowUp className="inline-block h-4 w-4" /> : <FaArrowDown className="inline-block h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Services</h1>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">+ Add Service</button>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          {loading ? (
            <div>Loading services...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : services.length === 0 ? (
            <div className="text-gray-500">No services found. Click "+ Add Service" to create your first service.</div>
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="text-left py-2 cursor-pointer" onClick={() => requestSort('name')}>
                  <div className="flex items-center gap-2">
                    <span>Name</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2 cursor-pointer" onClick={() => requestSort('category')}>
                  <div className="flex items-center gap-2">
                    <span>Category</span>
                    {getSortIcon('category')}
                  </div>
                </th>
                <th className="text-left py-2">Price</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedServices.map((service) => (
                <tr key={service.id} className="border-t dark:border-gray-800">
                  <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{service.name}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-200">{service.description}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-200">{service.category?.name}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-200">{service.price}</td>
                  <td className="py-2 flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Edit</button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
} 