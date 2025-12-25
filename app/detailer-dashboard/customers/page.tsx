'use client';
import React, { useEffect, useState, useRef } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { BarsArrowUpIcon, BarsArrowDownIcon } from '@heroicons/react/24/outline';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import AddressAutocompleteInput from '../calendar/components/AddressAutocompleteInput';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FunnelIcon,
} from '@heroicons/react/24/outline';

// Format phone number as (XXX) XXX XXXX
const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limitedDigits = digits.slice(0, 10);
    
    // Format based on length
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
};

interface Customer {
  id: string;
  customerPhone: string;
  customerName?: string;
  customerEmail?: string;
  address?: string;
  locationType?: string;
  customerType?: string;
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
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: Array<{ row: number; error: string }> } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ rowId: string; column: string; content: string; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    checkbox: 48,
    name: 200,
    phone: 150,
    email: 200,
    address: 250,
    vehicle: 150,
    services: 200,
    action: 120,
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [isActionSidebarOpen, setIsActionSidebarOpen] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null);
  const [customerPastJobs, setCustomerPastJobs] = useState<Array<{ 
    id: string; 
    date: string; 
    time?: string;
    services: string[]; 
    vehicleModel?: string; 
    locationType?: string;
    resourceType?: string;
    isUpcoming?: boolean;
    employeeName?: string;
  }>>([]);
  const actionSidebarRef = useRef<HTMLDivElement>(null);
  const [customerUpcomingJobs, setCustomerUpcomingJobs] = useState<Map<string, { 
    vehicleModel?: string;
    services: string[];
    date: string;
  }>>(new Map());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressCustomerIdRef = useRef<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterLastSeen, setFilterLastSeen] = useState('all');
  const [filterServices, setFilterServices] = useState<string[]>([]);
  const [filterStation, setFilterStation] = useState('all');
  const [formData, setFormData] = useState({
    customerPhone: '',
    customerName: '',
    customerEmail: '',
    address: '',
    locationType: '',
    customerType: '',
    vehicleModel: '',
    services: [] as string[],
    vcardSent: false,
    customerNotes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch upcoming jobs for all customers
  useEffect(() => {
    if (customers.length > 0 && !loading) {
      fetchUpcomingJobs();
    }
  }, [customers.length, loading]);

  const fetchUpcomingJobs = async () => {
    try {
      const response = await fetch('/api/detailer/calendar-events');
      if (response.ok) {
        const data = await response.json();
        const events = data.events || [];
        const now = new Date();
        
        const upcomingMap = new Map<string, { vehicleModel?: string; services: string[]; date: string }>();
        
        customers.forEach(customer => {
          const upcomingEvent = events.find((event: any) => {
            const eventDate = new Date(event.date || event.start || event.scheduledDate);
            return event.customerPhone === customer.customerPhone && 
                   eventDate >= now &&
                   (event.status === 'confirmed' || event.status === 'pending' || !event.status);
          });
          
          if (upcomingEvent) {
            upcomingMap.set(customer.id, {
              vehicleModel: upcomingEvent.vehicleModel || upcomingEvent.vehicleType,
              services: Array.isArray(upcomingEvent.services) ? upcomingEvent.services : (upcomingEvent.services ? [upcomingEvent.services] : []),
              date: upcomingEvent.date || upcomingEvent.start || upcomingEvent.scheduledDate
            });
          }
        });
        
        setCustomerUpcomingJobs(upcomingMap);
      }
    } catch (error) {
      console.error('Error fetching upcoming jobs:', error);
    }
  };

  // Close action sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionSidebarRef.current && !actionSidebarRef.current.contains(event.target as Node)) {
        setIsActionSidebarOpen(false);
        setSelectedCustomerData(null);
      }
    };

    if (isActionSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionSidebarOpen]);

  // Clear long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Handle long press to enter multi-select mode
  const handleLongPressStart = (customerId: string) => {
    longPressCustomerIdRef.current = customerId;
    longPressTimerRef.current = setTimeout(() => {
      setIsMultiSelectMode(true);
      handleSelectCustomer(customerId);
      longPressTimerRef.current = null;
    }, 500); // 500ms long press
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };


  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedCustomers(new Set());
    longPressCustomerIdRef.current = null;
  };

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
      const existingPhone = customer.customerPhone || '';
      setFormData({
        customerPhone: existingPhone ? formatPhoneNumber(existingPhone) : '',
        customerName: customer.customerName || '',
        customerEmail: customer.customerEmail || '',
        address: customer.address || '',
        locationType: customer.locationType || '',
        customerType: customer.customerType || '',
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
        customerType: '',
        vehicleModel: '',
        services: [],
        vcardSent: false,
        customerNotes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCustomerClick = async (customer: Customer) => {
    setSelectedCustomerData(customer);
    setIsActionSidebarOpen(true);
    
    // Fetch customer's past jobs/events
    try {
      // Fetch calendar events and resources in parallel
      const [eventsResponse, resourcesResponse] = await Promise.all([
        fetch('/api/detailer/calendar-events'),
        fetch('/api/detailer/resources')
      ]);
      
      if (eventsResponse.ok && resourcesResponse.ok) {
        const [eventsData, resourcesData] = await Promise.all([
          eventsResponse.json(),
          resourcesResponse.json()
        ]);
        
        const allEvents = eventsData.events || [];
        const resources = resourcesData.resources || [];
        
        // Create a map of resourceId to resource type
        const resourceMap = new Map<string, string>();
        resources.forEach((resource: any) => {
          resourceMap.set(resource.id, resource.type);
        });
        
        // Filter events for this customer (completed/confirmed, both past and upcoming)
        const now = new Date();
        const customerEvents = allEvents.filter((event: any) => {
          return event.customerPhone === customer.customerPhone && 
                 (event.status === 'completed' || event.status === 'confirmed' || !event.status);
        }).sort((a: any, b: any) => {
          const dateA = new Date(a.date || a.start || a.scheduledDate || 0).getTime();
          const dateB = new Date(b.date || b.start || b.scheduledDate || 0).getTime();
          return dateB - dateA; // Most recent first
        });
        
        // Transform to match the expected format with resource type, upcoming flag, time, and employee
        setCustomerPastJobs(customerEvents.map((event: any) => {
          const resourceType = event.resourceId ? resourceMap.get(event.resourceId) : null;
          const eventDate = new Date(event.date || event.start || event.scheduledDate);
          const isUpcoming = eventDate >= now;
          return {
            id: event.id,
            date: event.date || event.start || event.scheduledDate,
            time: event.time || null,
            services: Array.isArray(event.services) ? event.services : (event.services ? [event.services] : []),
            vehicleModel: event.vehicleModel || event.vehicleType,
            locationType: event.locationType || null,
            resourceType: resourceType || null,
            isUpcoming: isUpcoming,
            employeeName: event.employeeName || null
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching customer events:', error);
      setCustomerPastJobs([]);
    }
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
      customerType: '',
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

    // Extract digits only from formatted phone number
    const phoneDigits = formData.customerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      alert('Phone number must be 10 digits');
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
        customerPhone: phoneDigits,
        customerName: formData.customerName || undefined,
        customerEmail: formData.customerEmail || undefined,
        address: formData.address || undefined,
        locationType: formData.locationType || undefined,
        customerType: formData.customerType || undefined,
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
      return <BarsArrowUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <BarsArrowUpIcon className="w-4 h-4 text-gray-600" />
      : <BarsArrowDownIcon className="w-4 h-4 text-gray-600" />;
  };

  // Filter customers based on search query
  const filteredCustomers = React.useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase().trim();
    return customers.filter(customer => {
      const name = (customer.customerName || '').toLowerCase();
      const phone = (customer.customerPhone || '').toLowerCase();
      const vehicle = (customer.vehicle || customer.vehicleModel || '').toLowerCase();
      
      return name.includes(query) || phone.includes(query) || vehicle.includes(query);
    });
  }, [customers, searchQuery]);

  const sortedCustomers = React.useMemo(() => {
    const customersToSort = filteredCustomers;
    if (!sortConfig) return customersToSort;
    return [...customersToSort].sort((a, b) => {
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
  }, [filteredCustomers, sortConfig]);

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

  const handleDownloadTemplate = () => {
    // Create template CSV with headers and example row
    const headers = ['Phone', 'Name', 'Email', 'Address', 'Location Type', 'Customer Type', 'Vehicle', 'Vehicle Year', 'Vehicle Make', 'Vehicle Model', 'Services', 'Notes'];
    const exampleRow = [
      '+1234567890',
      'John Doe',
      'john@example.com',
      '123 Main St, Boston, MA 02101',
      'home',
      'returning',
      'Toyota Camry 2020',
      '2020',
      'Toyota',
      'Camry',
      'Express Detail; Full Detail',
      'Prefers morning appointments'
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'customer_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const validExtensions = ['.csv', '.xls', '.xlsx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        alert('Please upload a CSV or Excel file (.csv, .xls, .xlsx)');
        return;
      }
      
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    setImportLoading(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/detailer/customers/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import customers');
      }

      setImportResults(result);
      
      if (result.success > 0) {
        await fetchCustomers();
      }
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportResults(null);
  };

  // Get initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn) {
        const diff = e.clientX - resizeStartX;
        const newWidth = Math.max(50, resizeStartWidth + diff);
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // Handle call button
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  // Handle column resizing
  const handleResizeMouseDown = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[columnKey] || 150);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColumn) {
        const diff = e.clientX - resizeStartX;
        const newWidth = Math.max(50, resizeStartWidth + diff);
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  // Handle SMS button - start conversation with AI
  const handleSendSMS = async (customer: Customer) => {
    if (!customer.customerPhone) {
      alert('Customer phone number is required');
      return;
    }

    try {
      const response = await fetch('/api/detailer/start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerPhone: customer.customerPhone,
          customerName: customer.customerName || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // If conversation already exists, that's okay - redirect to messages
        if (response.status === 409) {
          window.location.href = '/detailer-dashboard/messages';
          return;
        }
        throw new Error(result.error || 'Failed to start conversation');
      }

      // Redirect to messages page to see the conversation
      window.location.href = '/detailer-dashboard/messages';
    } catch (err: any) {
      alert(err.message || 'Failed to send SMS');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className={`w-full ${isActionSidebarOpen ? 'pr-0 md:pr-[400px] lg:pr-[420px]' : 'pr-0 md:pr-16'}`}>
        {/* Header Section */}
        <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 md:border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 pl-10 md:pl-0">
              Customers
            </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="bg-black text-white w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 rounded-full text-sm md:text-base font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="hidden md:inline">Import Customers</span>
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="hidden md:flex bg-black text-white px-4 py-2 rounded-full font-semibold hover:bg-gray-800 transition items-center justify-center gap-2"
              >
                <FaPlus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 md:flex-none" style={{ maxWidth: '500px' }}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            {/* Filter Button */}
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition flex-shrink-0"
              aria-label="Filter"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 12h12M7 17h8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedCustomers.size > 0 && (
          <div className="px-4 md:px-6 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">
                {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleBulkDelete}
                className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium bg-red-500 text-white hover:bg-red-600 rounded-xl transition"
              >
                <span className="hidden sm:inline">Delete Selected</span>
                <span className="sm:hidden">Delete</span>
              </button>
              <button
                onClick={handleExportSelected}
                className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 rounded-xl transition hidden sm:block"
              >
                Export Selected
              </button>
              <button
                onClick={() => {
                  if (isMultiSelectMode) {
                    exitMultiSelectMode();
                  } else {
                    setSelectedCustomers(new Set());
                  }
                }}
                className="px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 rounded-xl transition"
              >
                <span className="hidden sm:inline">{isMultiSelectMode ? 'Done' : 'Clear Selection'}</span>
                <span className="sm:hidden">{isMultiSelectMode ? 'Done' : 'Clear'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile List View */}
        <div className="md:hidden pb-4">
        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : sortedCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 px-4">
            {searchQuery.trim() 
              ? `No customers found matching "${searchQuery}". Try a different search term.`
              : 'No customers found. Click "Add Customer" to create one.'}
          </div>
        ) : (
            <>
              {/* Customer List */}
              <div>
                {sortedCustomers.map((customer, index) => {
                  const upcomingJob = customerUpcomingJobs.get(customer.id);
                  return (
                    <div key={customer.id}>
                      {index > 0 && (
                        <div className="px-4">
                          <div className="border-t border-gray-200"></div>
                        </div>
                      )}
                      <div
                        className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition cursor-pointer active:bg-gray-100"
                        onClick={(e) => {
                          if (isMultiSelectMode) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectCustomer(customer.id);
                          } else {
                            handleCustomerClick(customer);
                          }
                        }}
                        onTouchStart={() => handleLongPressStart(customer.id)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={() => handleLongPressStart(customer.id)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                      >
                      {/* Checkbox - only show in multi-select mode */}
                      {isMultiSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer flex-shrink-0"
                        />
                      )}
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-700">
                          {getInitials(customer.customerName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {customer.customerName || 'Unnamed Customer'}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-1 flex-wrap">
                          {/* Phone Number */}
                          {customer.customerPhone && (
                            <span className="truncate">{customer.customerPhone}</span>
                          )}
                          {/* Vehicle */}
                          {(customer.vehicleModel || customer.vehicle) && (
                            <>
                              {customer.customerPhone && (
                                <span className="text-gray-400">•</span>
                              )}
                              <span className="truncate">{customer.vehicleModel || customer.vehicle}</span>
                            </>
                          )}
                          {/* Customer Type */}
                          {customer.customerType && (
                            <>
                              {(customer.customerPhone || customer.vehicleModel || customer.vehicle) && (
                                <span className="text-gray-400">•</span>
                              )}
                              <span className="capitalize">{customer.customerType}</span>
                            </>
                          )}
                          {/* Upcoming Job Info */}
                          {upcomingJob && (
                            <>
                              {(customer.customerPhone || customer.vehicleModel || customer.vehicle || customer.customerType) && (
                                <span className="text-gray-400">•</span>
                              )}
                              <span className="text-orange-600">Upcoming job</span>
                              {upcomingJob.services.length > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-500">{upcomingJob.services[0]}</span>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendSMS(customer);
                        }}
                        className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0"
                        title="Send SMS"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Floating Action Button - Mobile Only */}
        <button
          onClick={() => handleOpenModal()}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition flex items-center justify-center z-30"
          aria-label="Add Customer"
        >
          <FaPlus className="w-6 h-6" />
        </button>

        {/* Filter Modal - Mobile Only */}
        {isFilterModalOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setIsFilterModalOpen(false)}
            />
            {/* Filter Dialog - Bottom Sheet */}
            <div className="md:hidden fixed inset-x-0 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                  aria-label="Close filter"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Filter Content */}
              <div className="px-4 py-6 space-y-6">
                {/* Last seen Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Last seen</h3>
                  <div className="flex flex-wrap gap-2">
                    {['all', '30', '31-90', '91-120'].map((option) => {
                      const labels: { [key: string]: string } = {
                        'all': 'All time',
                        '30': 'Last 30 days',
                        '31-90': '31-90 days',
                        '91-120': '91-120 days'
                      };
                      const isSelected = filterLastSeen === option;
                      return (
                        <button
                          key={option}
                          onClick={() => setFilterLastSeen(option)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                            isSelected
                              ? 'text-white'
                              : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                          style={isSelected ? { backgroundColor: '#6B6A5E' } : {}}
                        >
                          {labels[option]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Services Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Services</h3>
                  <div className="space-y-3">
                    {[
                      { id: 'maintenance', label: 'Maintenance' },
                      { id: 'full-detail', label: 'Full detail' },
                      { id: 'high-ticket', label: 'High-ticket (ceramic, correction, etc.)' },
                      { id: 'first-time', label: 'First-time customer' }
                    ].map((service) => {
                      const isChecked = filterServices.includes(service.id);
                      return (
                        <label
                          key={service.id}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterServices([...filterServices, service.id]);
                              } else {
                                setFilterServices(filterServices.filter(s => s !== service.id));
                              }
                            }}
                            className="w-5 h-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                          />
                          <span className="text-sm text-gray-700">{service.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Station Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Station</h3>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'in-shop', 'mobile'].map((option) => {
                      const labels: { [key: string]: string } = {
                        'all': 'All stations',
                        'in-shop': 'In-shop',
                        'mobile': 'Mobile'
                      };
                      const isSelected = filterStation === option;
                      return (
                        <button
                          key={option}
                          onClick={() => setFilterStation(option)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                            isSelected
                              ? 'text-white'
                              : 'bg-white text-gray-700 border border-gray-300'
                          }`}
                          style={isSelected ? { backgroundColor: '#6B6A5E' } : {}}
                        >
                          {labels[option]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Desktop Table View */}
        {loading ? (
          <div className="hidden md:block text-center py-12 text-gray-600">Loading...</div>
        ) : error ? (
          <div className="hidden md:block text-center py-12 text-red-600">{error}</div>
        ) : sortedCustomers.length === 0 ? (
          <div className="hidden md:block text-center py-12 text-gray-500">
            {searchQuery.trim() 
              ? `No customers found matching "${searchQuery}". Try a different search term.`
              : 'No customers found. Click "Add Customer" to create one.'}
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === customers.length && customers.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                  </th>
                  {selectedCustomers.size > 0 && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    #
                  </th>
                  )}
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition relative"
                    onClick={() => handleSort('customerName')}
                    style={{ width: columnWidths.name, minWidth: columnWidths.name, maxWidth: columnWidths.name }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Name</span>
                      {getSortIcon('customerName')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 z-10"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'name')}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition relative"
                    onClick={() => handleSort('customerPhone')}
                    style={{ width: columnWidths.phone, minWidth: columnWidths.phone, maxWidth: columnWidths.phone }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Phone number</span>
                      {getSortIcon('customerPhone')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 z-10"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'phone')}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition relative"
                    onClick={() => handleSort('customerEmail')}
                    style={{ width: columnWidths.email, minWidth: columnWidths.email, maxWidth: columnWidths.email }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Email</span>
                      {getSortIcon('customerEmail')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 z-10"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'email')}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition relative"
                    onClick={() => handleSort('address')}
                    style={{ width: columnWidths.address, minWidth: columnWidths.address, maxWidth: columnWidths.address }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Address</span>
                      {getSortIcon('address')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 z-10"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'address')}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition relative"
                    onClick={() => handleSort('vehicle')}
                    style={{ width: columnWidths.vehicle, minWidth: columnWidths.vehicle, maxWidth: columnWidths.vehicle }}
                  >
                    <div className="flex items-center gap-1">
                      <span>Vehicle(s)</span>
                      {getSortIcon('vehicle')}
                    </div>
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 z-10"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'vehicle')}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                    style={{ width: columnWidths.services, minWidth: columnWidths.services, maxWidth: columnWidths.services }}
                  >
                    Service(s)
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-gray-400 z-10"
                      onMouseDown={(e) => handleResizeMouseDown(e, 'services')}
                    />
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                    style={{ width: columnWidths.action, minWidth: columnWidths.action, maxWidth: columnWidths.action }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCustomers.map((customer, index) => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => handleCustomerClick(customer)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {selectedCustomers.size > 0 && (
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    )}
                    <td 
                      className="px-4 py-4"
                      style={{ width: columnWidths.name, minWidth: columnWidths.name, maxWidth: columnWidths.name }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-700">
                            {getInitials(customer.customerName)}
                          </span>
                        </div>
                        <div className="font-medium text-gray-900 hover:text-gray-600 transition truncate min-w-0">
                        {customer.customerName || '-'}
                        </div>
                      </div>
                    </td>
                    <td 
                      className="px-4 py-4 text-sm text-gray-600 truncate"
                      style={{ width: columnWidths.phone, minWidth: columnWidths.phone, maxWidth: columnWidths.phone }}
                    >
                      <span className="truncate block">{customer.customerPhone || '-'}</span>
                    </td>
                    <td 
                      className="px-4 py-4 text-sm relative group truncate"
                      style={{ width: columnWidths.email, minWidth: columnWidths.email, maxWidth: columnWidths.email }}
                      onMouseEnter={(e) => {
                        if (customer.customerEmail && customer.customerEmail !== '-') {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            rowId: customer.id,
                            column: 'email',
                            content: customer.customerEmail,
                            x: rect.left + rect.width / 2,
                            y: rect.top
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoveredCell?.rowId === customer.id && hoveredCell?.column === 'email') {
                          setHoveredCell(null);
                        }
                      }}
                    >
                      <span className={`truncate block relative z-10 ${customer.customerEmail && customer.customerEmail !== '-' ? 'cursor-pointer text-gray-600 group-hover:text-black' : 'text-gray-600'}`}>
                      {customer.customerEmail || '-'}
                      </span>
                      {customer.customerEmail && customer.customerEmail !== '-' && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded" style={{ backgroundColor: '#F0F0EE' }} />
                      )}
                    </td>
                    <td 
                      className="px-4 py-4 text-sm truncate relative group"
                      style={{ width: columnWidths.address, minWidth: columnWidths.address, maxWidth: columnWidths.address }}
                      onMouseEnter={(e) => {
                        if (customer.address && customer.address !== '-') {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            rowId: customer.id,
                            column: 'address',
                            content: customer.address,
                            x: rect.left + rect.width / 2,
                            y: rect.top
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        if (hoveredCell?.rowId === customer.id && hoveredCell?.column === 'address') {
                          setHoveredCell(null);
                        }
                      }}
                    >
                      <span className={`truncate block relative z-10 ${customer.address && customer.address !== '-' ? 'cursor-pointer text-gray-600 group-hover:text-black' : 'text-gray-600'}`}>
                      {customer.address || '-'}
                      </span>
                      {customer.address && customer.address !== '-' && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded" style={{ backgroundColor: '#F0F0EE' }} />
                      )}
                    </td>
                    <td 
                      className="px-4 py-4 text-sm text-gray-600 truncate"
                      style={{ width: columnWidths.vehicle, minWidth: columnWidths.vehicle, maxWidth: columnWidths.vehicle }}
                    >
                      <span className="truncate block">{customer.vehicle || customer.vehicleModel || '-'}</span>
                    </td>
                    <td 
                      className="px-4 py-4 text-sm text-gray-600 truncate"
                      style={{ width: columnWidths.services, minWidth: columnWidths.services, maxWidth: columnWidths.services }}
                    >
                      <span className="truncate block">
                      {customer.services && customer.services.length > 0 
                          ? `(${customer.services.length}) ${customer.services.join(' + ')}`
                        : '-'}
                      </span>
                    </td>
                    <td 
                      className="px-4 py-4 whitespace-nowrap text-sm" 
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: columnWidths.action }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCall(customer.customerPhone);
                          }}
                          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                          title="Call"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendSMS(customer);
                          }}
                          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                          title="Send SMS"
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
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
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" 
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={handleCloseModal}
        >
          <div 
            className="rounded-xl shadow-xl max-w-2xl w-full p-6 my-8" 
            style={{ backgroundColor: '#F8F8F7' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
              {editingCustomer ? 'Edit' : 'Add'} Customer
            </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setFormData({ ...formData, customerPhone: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="(---) --- ----"
                  maxLength={16}
                  disabled={!!editingCustomer}
                />
                {editingCustomer && (
                  <p className="text-xs text-gray-500 mt-1">
                    Phone number cannot be changed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <AddressAutocompleteInput
                  value={formData.address}
                  onChange={(value) => setFormData({ ...formData, address: value })}
                  placeholder="123 Main St, City, State ZIP"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Type
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) => setFormData({ ...formData, locationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select location type</option>
                  <option value="pick up">Pick Up</option>
                  <option value="drop off">Drop Off</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Type
                </label>
                <select
                  value={formData.customerType}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select customer type</option>
                  <option value="new">New Customer</option>
                  <option value="returning">Returning Customer</option>
                  <option value="maintenance">Maintenance Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., Camry, Civic, F-150, Model 3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({ ...formData, customerNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Add notes about the customer (e.g., preferences, behavior, reminders)..."
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quick notes about customer preferences, behavior, or reminders for future reference
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition"
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

      {/* Hover Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-sm text-gray-900 max-w-md pointer-events-none"
          style={{
            left: `${hoveredCell.x}px`,
            top: `${hoveredCell.y - 5}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="whitespace-normal break-words">
            {hoveredCell.content}
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200" />
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
          <div className="rounded-xl shadow-xl max-w-2xl w-full p-6 my-8" style={{ backgroundColor: '#F8F8F7' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Import Customers
              </h2>
              <button
                onClick={handleCloseImportModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Import Instructions</h3>
                <ol className="text-sm text-gray-800 space-y-1 list-decimal list-inside">
                  <li>Download the template CSV file using the "Download Template" button below</li>
                  <li>Fill in your customer information following the template format</li>
                  <li>Phone number is required for each customer</li>
                  <li>Upload your completed CSV or Excel file (.csv, .xls, .xlsx)</li>
                  <li>Review the import results and fix any errors if needed</li>
                </ol>
              </div>

              <div>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2 border border-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (CSV or Excel)
                </label>
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                {importFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {importFile.name}
                  </p>
                )}
              </div>

              {importResults && (
                <div className={`rounded-lg p-4 ${importResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <h3 className="text-sm font-semibold mb-2">
                    {importResults.errors.length > 0 ? 'Import Completed with Errors' : 'Import Successful'}
                  </h3>
                  <p className="text-sm mb-2">
                    Successfully imported: <span className="font-semibold">{importResults.success}</span> customer(s)
                  </p>
                  {importResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold mb-1">Errors ({importResults.errors.length}):</p>
                      <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                        {importResults.errors.map((err, idx) => (
                          <p key={idx} className="text-red-700">
                            Row {err.row}: {err.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseImportModal}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition"
                >
                  {importResults ? 'Close' : 'Cancel'}
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importLoading}
                  className="flex-1 px-6 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Import</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop */}
      {isActionSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
          onClick={() => {
            setIsActionSidebarOpen(false);
            setSelectedCustomerData(null);
          }}
        />
      )}

      {/* Action Sidebar */}
      <div 
        ref={actionSidebarRef}
        className={`fixed top-0 right-0 h-full w-full md:w-[400px] lg:w-[420px] shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isActionSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`} style={{ backgroundColor: '#F8F8F7', borderLeft: '1px solid #E2E2DD', boxShadow: 'none' }}>
        <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#F8F8F7' }}>
          {/* Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ backgroundColor: '#E2E2DD' }}>
                  <Image 
                    src="/icons/layouting.png" 
                    alt="Customer Details" 
                    width={20} 
                    height={20}
                    className="object-contain"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2" style={{ borderColor: '#F8F8F7' }}></div>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Customer Details
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsActionSidebarOpen(false);
                  setSelectedCustomerData(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          {selectedCustomerData && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Customer Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer</h3>
                  <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#E2E2DD', borderRadius: '12px' }}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-base">
                        {selectedCustomerData.customerName || 'Unnamed Customer'}
                      </h4>
                      {selectedCustomerData.customerPhone && (
                        <span className="text-sm text-gray-600">
                          {selectedCustomerData.customerPhone}
                        </span>
                      )}
                    </div>
                    
                    {selectedCustomerData.customerEmail && (
                      <p className="text-sm text-gray-600 mb-2">
                        {selectedCustomerData.customerEmail}
                      </p>
                    )}
                    
                    {selectedCustomerData.address && (
                      <p className="text-sm text-gray-600 mb-3">
                        {selectedCustomerData.address}
                      </p>
                    )}

                    {/* Customer Type and Location Type */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {selectedCustomerData.customerType && (
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${
                          selectedCustomerData.customerType.toLowerCase() === 'new' 
                            ? 'bg-gray-200 text-gray-700'
                            : selectedCustomerData.customerType.toLowerCase() === 'returning'
                            ? 'bg-purple-200 text-purple-800'
                            : selectedCustomerData.customerType.toLowerCase() === 'maintenance'
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {selectedCustomerData.customerType === 'new' ? 'New Customer' : 
                           selectedCustomerData.customerType === 'returning' ? 'Returning Customer' :
                           selectedCustomerData.customerType === 'maintenance' ? 'Maintenance Customer' :
                           selectedCustomerData.customerType}
                        </span>
                      )}
                      
                      {selectedCustomerData.locationType && (
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${
                          (selectedCustomerData.locationType?.toLowerCase() === 'pick up' || selectedCustomerData.locationType?.toLowerCase() === 'pickup')
                            ? 'bg-blue-500 text-white'
                            : (selectedCustomerData.locationType?.toLowerCase() === 'drop off' || selectedCustomerData.locationType?.toLowerCase() === 'dropoff')
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {selectedCustomerData.locationType?.toLowerCase() === 'pickup' ? 'Pick Up' : 
                           selectedCustomerData.locationType?.toLowerCase() === 'dropoff' ? 'Drop Off' :
                           selectedCustomerData.locationType?.toLowerCase() === 'pick up' ? 'Pick Up' :
                           selectedCustomerData.locationType?.toLowerCase() === 'drop off' ? 'Drop Off' :
                           selectedCustomerData.locationType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                {(selectedCustomerData.vehicle || selectedCustomerData.vehicleModel) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Car model</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-white text-sm font-medium">
                        <span>{selectedCustomerData.vehicleModel || selectedCustomerData.vehicle}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customer Notes */}
                {selectedCustomerData && (selectedCustomerData as any).data && typeof (selectedCustomerData as any).data === 'object' && (selectedCustomerData as any).data.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#E2E2DD', borderRadius: '12px' }}>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {(selectedCustomerData as any).data.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Service History */}
                {customerPastJobs && customerPastJobs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Service History ({customerPastJobs.length})
                    </h3>
                    <div className="space-y-3">
                      {customerPastJobs.map((job, index) => (
                        <div 
                          key={job.id || index}
                          className="p-4 rounded-xl border" 
                          style={{ borderColor: '#E2E2DD', backgroundColor: 'white' }}
                        >
                          {/* Date and Time */}
                          <div className="mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {job.date ? (() => {
                                  try {
                                    const date = new Date(job.date);
                                    if (isNaN(date.getTime())) return 'Date unavailable';
                                    const dateStr = format(date, 'MMMM d, yyyy');
                                    if (job.time) {
                                      return `${dateStr} at ${job.time}`;
                                    }
                                    return dateStr;
                                  } catch (e) {
                                    return 'Date unavailable';
                                  }
                                })() : 'Date unavailable'}
                              </p>
                              {job.isUpcoming && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                  Upcoming
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Technician */}
                          {job.employeeName && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-600 mb-1">Technician</p>
                              <p className="text-sm text-gray-900">{job.employeeName}</p>
                            </div>
                          )}
                          
                          {/* Service */}
                          {job.services && job.services.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-600 mb-1">Service</p>
                              <p className="text-sm text-gray-900">
                                {Array.isArray(job.services) ? job.services.join(', ') : job.services}
                              </p>
                            </div>
                          )}
                          
                          {/* Pickup/Drop-off (only for BAY appointments) */}
                          {job.resourceType === 'bay' && job.locationType && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-600 mb-1">Pickup/Drop-off</p>
                              <p className="text-sm text-gray-900">
                                {job.locationType === 'pick up' || job.locationType.toLowerCase() === 'pickup' 
                                  ? 'Pick Up' 
                                  : job.locationType === 'drop off' || job.locationType.toLowerCase() === 'dropoff'
                                  ? 'Drop Off'
                                  : job.locationType}
                              </p>
                            </div>
                          )}
                          
                          {/* Vehicle */}
                          {job.vehicleModel && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Vehicle</p>
                              <p className="text-sm text-gray-900">{job.vehicleModel}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      handleOpenModal(selectedCustomerData);
                      setIsActionSidebarOpen(false);
                    }}
                    className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Sidebar - Only show when action panel is closed on desktop */}
      {!isActionSidebarOpen && (
        <div
          onClick={() => {
            // Open sidebar with first customer if available
            if (customers.length > 0) {
              handleCustomerClick(customers[0]);
            } else {
              setIsActionSidebarOpen(true);
            }
          }}
          className="hidden md:flex fixed right-0 top-0 h-full w-16 border-l border-gray-200 z-30 cursor-pointer transition-colors items-start justify-center"
          style={{ backgroundColor: '#F8F8F7', paddingTop: '32px' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#E8E8E7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F8F8F7'; }}
        >
          <Image 
            src="/icons/layouting.png" 
            alt="Action Panel" 
            width={28} 
            height={28}
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}

