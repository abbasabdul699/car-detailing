'use client';
import React, { useEffect, useState, useRef } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { BarsArrowUpIcon, BarsArrowDownIcon } from '@heroicons/react/24/outline';
import BusinessHoursPicker, { BusinessHours } from '@/app/components/BusinessHoursPicker';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Resource {
  id: string;
  name: string;
  type: 'bay' | 'van';
  createdAt?: string;
  updatedAt?: string;
}

interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  workHours?: any;
  isActive: boolean;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ResourcesPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'employees' | 'bays' | 'vans'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Employee | Resource | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    imageUrl: '',
    type: 'bay' as 'bay' | 'van',
    isActive: true,
    workHours: {} as BusinessHours,
    color: 'blue' as string
  });
  const router = useRouter();

  useEffect(() => {
    fetchAllData();
  }, []);


  useEffect(() => {
    if (activeTab !== 'employees') {
      fetchResources();
    }
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, resourcesRes] = await Promise.all([
        fetch('/api/detailer/employees'),
        fetch('/api/detailer/resources')
      ]);

      if (!employeesRes.ok) throw new Error('Failed to fetch employees');
      if (!resourcesRes.ok) throw new Error('Failed to fetch resources');

      const employeesData = await employeesRes.json();
      const resourcesData = await resourcesRes.json();

      setEmployees(employeesData.employees || []);
      setAllResources(resourcesData.resources || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/detailer/resources');
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      setAllResources(data.resources || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/detailer/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    }
  };

  // Filter resources based on active tab
  const resources = React.useMemo(() => {
    if (activeTab === 'bays') {
      return allResources.filter(r => r.type === 'bay');
    } else if (activeTab === 'vans') {
      return allResources.filter(r => r.type === 'van');
    }
    return [];
  }, [allResources, activeTab]);

  const handleOpenModal = (item?: Employee | Resource) => {
    if (item) {
      setEditingItem(item);
      if (activeTab === 'employees') {
        const emp = item as Employee;
        setFormData({
          name: emp.name,
          email: emp.email || '',
          phone: emp.phone || '',
          imageUrl: emp.imageUrl || '',
          type: 'bay',
          isActive: emp.isActive,
          workHours: (emp.workHours as BusinessHours) || {},
          color: emp.color || 'blue'
        });
      } else {
        const res = item as Resource;
        setFormData({
          name: res.name,
          email: '',
          phone: '',
          imageUrl: '',
          type: res.type,
          isActive: true,
          workHours: {}
        });
      }
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        imageUrl: '',
        type: activeTab === 'bays' ? 'bay' : 'van',
        isActive: true,
        workHours: {},
        color: 'blue'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      imageUrl: '',
      type: 'bay',
      isActive: true,
      workHours: {},
      color: 'blue'
    });
  };

  const handleSave = async () => {
    try {
      const url = activeTab === 'employees' 
        ? (editingItem ? `/api/detailer/employees/${editingItem.id}` : '/api/detailer/employees')
        : (editingItem ? `/api/detailer/resources/${editingItem.id}` : '/api/detailer/resources');
      
      const method = editingItem ? 'PATCH' : 'POST';
      
      const body = activeTab === 'employees' 
        ? {
            name: formData.name,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            imageUrl: formData.imageUrl || undefined,
            isActive: formData.isActive,
            workHours: Object.keys(formData.workHours).length > 0 ? formData.workHours : undefined,
            color: formData.color || 'blue'
          }
        : {
            name: formData.name,
            type: formData.type
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editingItem ? 'update' : 'create'} ${activeTab}`);
      }

      if (activeTab === 'employees') {
        await fetchEmployees();
      } else {
        await fetchResources();
      }
      handleCloseModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${activeTab === 'employees' ? 'employee' : activeTab.slice(0, -1)}?`)) {
      return;
    }

    try {
      const url = activeTab === 'employees' 
        ? `/api/detailer/employees/${id}`
        : `/api/detailer/resources/${id}`;
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete ${activeTab === 'employees' ? 'employee' : activeTab.slice(0, -1)}`);
      }

      if (activeTab === 'employees') {
        await fetchEmployees();
      } else {
        await fetchResources();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.id)));
    }
  };

  const handleSelectEmployee = (id: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmployees(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedEmployees.size} employee${selectedEmployees.size !== 1 ? 's' : ''}? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedEmployees).map(id =>
        fetch(`/api/detailer/employees/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok));
      
      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} employee(s). Please try again.`);
      } else {
        alert(`Successfully deleted ${selectedEmployees.size} employee(s).`);
      }
      
      setSelectedEmployees(new Set());
      await fetchEmployees();
    } catch (err: any) {
      alert(`Error deleting employees: ${err.message}`);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedEmployees.size === 0) return;
    
    try {
      const updatePromises = Array.from(selectedEmployees).map(id =>
        fetch(`/api/detailer/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true })
        })
      );
      
      await Promise.all(updatePromises);
      alert(`Successfully activated ${selectedEmployees.size} employee(s).`);
      setSelectedEmployees(new Set());
      await fetchEmployees();
    } catch (err: any) {
      alert(`Error activating employees: ${err.message}`);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedEmployees.size === 0) return;
    
    try {
      const updatePromises = Array.from(selectedEmployees).map(id =>
        fetch(`/api/detailer/employees/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: false })
        })
      );
      
      await Promise.all(updatePromises);
      alert(`Successfully deactivated ${selectedEmployees.size} employee(s).`);
      setSelectedEmployees(new Set());
      await fetchEmployees();
    } catch (err: any) {
      alert(`Error deactivating employees: ${err.message}`);
    }
  };

  const handleExportSelected = () => {
    if (selectedEmployees.size === 0) return;
    
    const selectedEmployeeData = employees.filter(e => selectedEmployees.has(e.id));
    
    // Create CSV content
    const headers = ['Name', 'Email', 'Phone', 'Work Hours', 'Status'];
    const rows = selectedEmployeeData.map(emp => [
      emp.name,
      emp.email || '',
      emp.phone || '',
      formatWorkHours(emp.workHours),
      emp.isActive ? 'Active' : 'Inactive'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${selectedEmployees.size} employee(s) to CSV.`);
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

  const sortedEmployees = React.useMemo(() => {
    if (!sortConfig) return employees;
    return [...employees].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Employee];
      let bValue: any = b[sortConfig.key as keyof Employee];
      
      // Handle different data types
      if (sortConfig.key === 'name' || sortConfig.key === 'email' || sortConfig.key === 'phone') {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
      } else if (sortConfig.key === 'isActive') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      } else if (sortConfig.key === 'workHours') {
        const aHasHours = aValue && typeof aValue === 'object' && Object.keys(aValue).length > 0;
        const bHasHours = bValue && typeof bValue === 'object' && Object.keys(bValue).length > 0;
        aValue = aHasHours ? 1 : 0;
        bValue = bHasHours ? 1 : 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employees, sortConfig]);

  const formatWorkHours = (workHours: any): string => {
    if (!workHours || typeof workHours !== 'object') return '-';
    const hours = workHours as BusinessHours;
    const daysWithHours = Object.entries(hours).filter(([_, times]) => times && times[0] && times[1]);
    if (daysWithHours.length === 0) return 'Not set';
    if (daysWithHours.length === 7) {
      // Check if all days have the same hours
      const firstDay = daysWithHours[0][1];
      const allSame = daysWithHours.every(([_, times]) => times[0] === firstDay[0] && times[1] === firstDay[1]);
      if (allSame) {
        return `${firstDay[0]}-${firstDay[1]} (All days)`;
      }
    }
    return `${daysWithHours.length} days set`;
  };

  const currentItems = activeTab === 'employees' ? employees : resources;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="w-full">
        {/* Header Section */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 pl-10 md:pl-0">
                {activeTab === 'employees' ? 'Employees' : activeTab === 'bays' ? 'Bays' : 'Vans'}
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => handleOpenModal()}
                className="hidden md:flex bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition items-center gap-2"
              >
                <FaPlus /> Add {activeTab === 'employees' ? 'Employee' : activeTab === 'bays' ? 'Bay' : 'Van'}
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('employees')}
              className={`text-sm font-medium pb-2 flex items-center gap-2 ${
                activeTab === 'employees'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Employees
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold shadow-sm">
                {employees.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('bays')}
              className={`text-sm font-medium pb-2 flex items-center gap-2 ${
                activeTab === 'bays'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Bays
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold shadow-sm">
                {allResources.filter(r => r.type === 'bay').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('vans')}
              className={`text-sm font-medium pb-2 flex items-center gap-2 ${
                activeTab === 'vans'
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Vans
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold shadow-sm">
                {allResources.filter(r => r.type === 'van').length}
              </span>
            </button>
          </div>
        </div>

        {/* Employees Table View */}
        {activeTab === 'employees' && (
          <>
            {/* Bulk Actions Toolbar */}
            {selectedEmployees.size > 0 && (
              <div className="px-6 py-3 bg-black border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {selectedEmployees.size} employee{selectedEmployees.size !== 1 ? 's' : ''} selected
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
                    onClick={handleBulkActivate}
                    className="px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 rounded-lg transition"
                  >
                    Activate Selected
                  </button>
                  <button
                    onClick={handleBulkDeactivate}
                    className="px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 rounded-lg transition"
                  >
                    Deactivate Selected
                  </button>
                  <button
                    onClick={handleExportSelected}
                    className="px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 rounded-lg transition"
                  >
                    Export Selected
                  </button>
                  <button
                    onClick={() => setSelectedEmployees(new Set())}
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
            ) : employees.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No employees found. Click "Add Employee" to create one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.size === employees.length && employees.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                        #
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Name</span>
                          {getSortIcon('name')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Email</span>
                          {getSortIcon('email')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => handleSort('phone')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Phone</span>
                          {getSortIcon('phone')}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => handleSort('workHours')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Work Hours</span>
                          {getSortIcon('workHours')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Color
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => handleSort('isActive')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                          {getSortIcon('isActive')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-200 dark:divide-gray-700">
                    {sortedEmployees.map((employee, index) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                        <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(employee.id)}
                            onChange={() => handleSelectEmployee(employee.id)}
                            className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td 
                          className="px-4 py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => handleOpenModal(employee)}
                        >
                          <div className="flex items-center gap-3">
                            {employee.imageUrl ? (
                              <img 
                                src={employee.imageUrl} 
                                alt={employee.name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <span className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
                                  {employee.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition">
                              {employee.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {employee.email || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {employee.phone || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {formatWorkHours(employee.workHours)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full ${
                              employee.color === 'blue' ? 'bg-blue-500' :
                              employee.color === 'green' ? 'bg-green-500' :
                              employee.color === 'orange' ? 'bg-orange-500' :
                              employee.color === 'red' ? 'bg-red-500' :
                              employee.color === 'gray' ? 'bg-gray-500' :
                              'bg-blue-500'
                            }`}></span>
                            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                              {employee.color || 'blue'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            employee.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(employee)}
                              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
                              title="Edit"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(employee.id)}
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
          </>
        )}

        {/* Bays and Vans Grid View */}
        {activeTab !== 'employees' && (
          <div className="px-6 py-6">
            {loading ? (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">Loading...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>
            ) : resources.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No {activeTab} found. Click "Add {activeTab === 'bays' ? 'Bay' : 'Van'}" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {resource.type === 'bay' ? (
                        <Image src="/icons/bay.svg" alt="Bay" width={32} height={32} className="object-contain" />
                      ) : (
                        <Image src="/icons/van.svg" alt="Van" width={32} height={32} className="object-contain" />
                      )}
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {resource.name.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(resource)}
                        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={() => handleOpenModal()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition flex items-center justify-center z-30"
        aria-label={`Add ${activeTab === 'employees' ? 'Employee' : activeTab === 'bays' ? 'Bay' : 'Van'}`}
      >
        <FaPlus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${activeTab === 'employees' ? 'max-w-2xl' : 'max-w-md'} w-full p-6 my-8`}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingItem ? 'Edit' : 'Add'} {activeTab === 'employees' ? 'Employee' : activeTab === 'bays' ? 'Bay' : 'Van'}
            </h2>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={activeTab === 'employees' ? 'Employee name' : activeTab === 'bays' ? 'Bay name (e.g., Bay 1)' : 'Van name (e.g., Van 1)'}
                />
              </div>

              {activeTab === 'employees' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Profile Image
                    </label>
                    <div className="flex items-center gap-4">
                      {formData.imageUrl ? (
                        <img 
                          src={formData.imageUrl} 
                          alt="Employee"
                          className="w-20 h-20 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                          <span className="text-gray-500 dark:text-gray-400 text-2xl font-semibold">
                            {formData.name.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <EmployeeImageUploader
                        detailerId={session?.user?.id}
                        currentImageUrl={formData.imageUrl}
                        onUpload={(url) => setFormData({ ...formData, imageUrl: url })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="employee@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Calendar Color
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      This color will be used for events assigned to this employee in the calendar.
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
                        { value: 'green', label: 'Green', class: 'bg-green-500' },
                        { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
                        { value: 'red', label: 'Red', class: 'bg-red-500' },
                        { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
                      ].map((colorOption) => (
                        <label
                          key={colorOption.value}
                          className={`flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.color === colorOption.value
                              ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-700'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="employee-color"
                            value={colorOption.value}
                            checked={formData.color === colorOption.value}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="hidden"
                          />
                          <span className={`w-6 h-6 rounded-full mb-1 ${colorOption.class}`}></span>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                            {colorOption.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Work Hours
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                      <BusinessHoursPicker
                        value={formData.workHours}
                        onChange={(hours) => setFormData({ ...formData, workHours: hours })}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab !== 'employees' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'bay' | 'van' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bay">Bay</option>
                    <option value="van">Van</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Employee Image Uploader Component
function EmployeeImageUploader({ 
  detailerId, 
  currentImageUrl, 
  onUpload 
}: { 
  detailerId?: string; 
  currentImageUrl?: string; 
  onUpload: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessName", 'employee');
      formData.append("detailerId", detailerId || '');
      formData.append("type", "profile");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (!data.image?.url) {
        throw new Error('No image URL returned');
      }

      onUpload(data.image.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      console.error('Image upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {uploading ? 'Uploading...' : currentImageUrl ? 'Change Image' : 'Upload Image'}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {currentImageUrl && (
        <button
          type="button"
          onClick={() => onUpload('')}
          className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
        >
          Remove Image
        </button>
      )}
    </div>
  );
}


