'use client';
import React, { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { BarsArrowUpIcon, BarsArrowDownIcon } from '@heroicons/react/24/outline';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Customer {
  id: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  address?: string;
  locationType?: string;
  vehicle?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  services?: string[];
  vcardSent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function CustomersPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [formData, setFormData] = useState({
    customerPhone: '',
    customerName: '',
    customerEmail: '',
    address: '',
    locationType: '',
    vehicleModel: '',
    services: [] as string[],
    vcardSent: false,
    customerNotes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/detailer/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      // Extract notes from data.notes if it exists
      const notes = (customer as any).data && typeof (customer as any).data === 'object' && (customer as any).data.notes 
        ? (customer as any).data.notes 
        : '';
      setFormData({
        customerPhone: customer.customerPhone || '',
        customerName: customer.customerName || '',
        customerEmail: customer.customerEmail || '',
        address: customer.address || '',
        locationType: customer.locationType || '',
        vehicleModel: customer.vehicleModel || '',
        services: customer.services || [],
        vcardSent: customer.vcardSent || false,
        customerNotes: notes
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        customerPhone: '',
        customerName: '',
        customerEmail: '',
        address: '',
        locationType: '',
        vehicleModel: '',
        services: [],
        vcardSent: false,
        customerNotes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      customerPhone: '',
      customerName: '',
      customerEmail: '',
      address: '',
      locationType: '',
      vehicleModel: '',
      services: [],
      vcardSent: false,
      customerNotes: ''
    });
  };

  const handleSave = async () => {
    if (!formData.customerPhone.trim()) {
      alert('Customer phone is required');
      return;
    }

    try {
      const url = editingCustomer 
        ? `/api/detailer/customers/${editingCustomer.id}`
        : '/api/detailer/customers';
      
      const method = editingCustomer ? 'PATCH' : 'POST';
      
      // Prepare data object with notes
      const data: any = {};
      if (formData.customerNotes) {
        data.notes = formData.customerNotes;
      }
      
      const body = {
        customerPhone: formData.customerPhone,
        customerName: formData.customerName || undefined,
        customerEmail: formData.customerEmail || undefined,
        address: formData.address || undefined,
        locationType: formData.locationType || undefined,
        vehicleModel: formData.vehicleModel || undefined,
        services: formData.services,
        vcardSent: formData.vcardSent,
        data: Object.keys(data).length > 0 ? data : undefined
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingCustomer ? 'update' : 'create'} customer`);
      }

      await fetchCustomers();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      const response = await fetch(`/api/detailer/customers/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }

      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.id)));
    }
  };

  const handleSelectCustomer = (id: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <BarsArrowUpIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
    }
    return sortConfig.direction === 'asc' 
      ? <BarsArrowUpIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      : <BarsArrowDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
  };

  const sortedCustomers = React.useMemo(() => {
    if (!sortConfig) return customers;
    return [...customers].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Customer];
      let bValue: any = b[sortConfig.key as keyof Customer];
      
      if (sortConfig.key === 'customerName' || sortConfig.key === 'customerPhone' || sortConfig.key === 'customerEmail' || sortConfig.key === 'address' || sortConfig.key === 'vehicle') {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [customers, sortConfig]);

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedCustomers.size} customer${selectedCustomers.size !== 1 ? 's' : ''}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedCustomers).map(id =>
        fetch(`/api/detailer/customers/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      
      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} customer(s). Please try again.`);
      } else {
        alert(`Successfully deleted ${selectedCustomers.size} customer(s).`);
      }
      
      setSelectedCustomers(new Set());
      await fetchCustomers();
    } catch (err: any) {
      alert(`Error deleting customers: ${err.message}`);
    }
  };

  const handleExportSelected = () => {
    if (selectedCustomers.size === 0) return;
    
    const selectedCustomerData = customers.filter(c => selectedCustomers.has(c.id));
    
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Vehicle', 'Services', 'vCard Sent'];
    const rows = selectedCustomerData.map(customer => [
      customer.customerName || '',
      customer.customerPhone || '',
      customer.customerEmail || '',
      customer.address || '',
      customer.vehicle || '',
      (customer.services || []).join('; '),
      customer.vcardSent ? 'Yes' : 'No'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${selectedCustomers.size} customer(s) to CSV.`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="w-full">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Customers
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenModal()}
                className="bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition flex items-center gap-2"
              >
                <FaPlus /> Add Customer
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedCustomers.size > 0 && (
          <div className="px-6 py-3 bg-black border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 rounded-lg transition"
              >
                Delete Selected
              </button>
              <button
                onClick={handleExportSelected}
                className="px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 rounded-lg transition"
              >
                Export Selected
              </button>
              <button
                onClick={() => setSelectedCustomers(new Set())}
                className="px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 rounded-lg transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No customers found. Click "Add Customer" to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === customers.length && customers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    onClick={() => handleSort('customerName')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Name</span>
                      {getSortIcon('customerName')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    onClick={() => handleSort('customerPhone')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Phone</span>
                      {getSortIcon('customerPhone')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    onClick={() => handleSort('customerEmail')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Email</span>
                      {getSortIcon('customerEmail')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    onClick={() => handleSort('address')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Address</span>
                      {getSortIcon('address')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    onClick={() => handleSort('vehicle')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicle</span>
                      {getSortIcon('vehicle')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedCustomers.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                    <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td 
                      className="px-4 py-4 whitespace-nowrap cursor-pointer"
                      onClick={() => handleOpenModal(customer)}
                    >
                      <div className="font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition">
                        {customer.customerName || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {customer.customerPhone || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {customer.customerEmail || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {customer.address || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {customer.vehicle || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {customer.services && customer.services.length > 0 
                        ? customer.services.join(', ') 
                        : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                          title="Edit"
                        >
                          <FaEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                          title="Delete"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="rounded-xl shadow-xl max-w-2xl w-full p-6 my-8" style={{ backgroundColor: '#F8F8F7' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingCustomer ? 'Edit' : 'Add'} Customer
            </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="+1234567890"
                  disabled={!!editingCustomer}
                />
                {editingCustomer && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Phone number cannot be changed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location Type
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select location type</option>
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Camry, Civic, F-150, Model 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Add notes about the customer (e.g., preferences, behavior, reminders)..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Quick notes about customer preferences, behavior, or reminders for future reference
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.customerPhone.trim()}
                className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                <span>{editingCustomer ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

