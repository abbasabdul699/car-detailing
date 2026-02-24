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
import { formatPhoneDisplay, normalizeToE164 } from '@/lib/phone';
import { getCustomerTypeFromHistory } from '@/lib/customerType';
import {
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { VEHICLE_BY_BRAND, getBrandForModel } from './vehicle-brands';
import VehicleChip from '@/app/components/vehicle/VehicleChip';
import VehiclePickerPopover from '@/app/components/vehicle/VehiclePickerPopover';
import ManufacturerLogo from '@/app/components/vehicle/ManufacturerLogo';

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

// Format duration in minutes to human-readable string
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`;
};

// Helper function to extract clean description from event description (handle both clean and metadata formats)
const getCleanDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  if (desc.includes('__METADATA__:')) {
    const parts = desc.split('__METADATA__:');
    return parts[0].trim();
  }
  return desc;
};

const extractNotesFromDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  if (desc.includes('__METADATA__:')) {
    return getCleanDescription(desc);
  }
  const lines = desc.split('\n');
  const notesLine = lines.find(line => line.trim().toLowerCase().startsWith('notes:'));
  if (notesLine) {
    return notesLine.split(':').slice(1).join(':').trim();
  }
  return desc.trim();
};

const getEventDateValue = (event: any): number => {
  const raw = event?.date || event?.start || event?.scheduledDate;
  if (!raw) return 0;
  const date = new Date(raw);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const extractPhoneFromDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  const match = desc.match(/Phone:\s*([^\n]+)/i);
  if (!match) return '';
  return match[1].trim();
};

const normalizePhoneForMatch = (raw: string | null | undefined) => {
  if (!raw) {
    return { e164: null as string | null, last10: null as string | null };
  }
  const e164 = normalizeToE164(raw) || null;
  const digits = raw.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : null;
  return { e164, last10 };
};

const formatJobDateTime = (dateValue?: string | null, timeValue?: string | null) => {
  if (!dateValue) return 'Date unavailable';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Date unavailable';
    const dateStr = format(date, 'MMMM d, yyyy');
    if (timeValue) {
      return `${dateStr} at ${timeValue}`;
    }
    return dateStr;
  } catch {
    return 'Date unavailable';
  }
};

interface CustomerNote {
  id: string;
  text: string;
  createdAt: string;
}

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
  completedServiceCount?: number;
  lastCompletedServiceAt?: string | null;
  data?: any;
}

// Helper: get all vehicles for a customer (backward compat with single vehicleModel)
const getCustomerVehicles = (customer: Customer): string[] => {
  if (customer.data && typeof customer.data === 'object' && Array.isArray(customer.data.vehicles)) {
    return customer.data.vehicles.filter((v: any) => typeof v === 'string' && v.trim());
  }
  // Fallback to legacy single vehicle field
  const legacy = customer.vehicleModel || customer.vehicle;
  return legacy ? [legacy] : [];
};

// Helper: get all customer notes (backward compat with single data.notes string)
const getCustomerNotes = (customer: Customer): CustomerNote[] => {
  if (customer.data && typeof customer.data === 'object' && Array.isArray(customer.data.customerNotes)) {
    return customer.data.customerNotes;
  }
  // Fallback to legacy single notes string
  if (customer.data && typeof customer.data === 'object' && customer.data.notes) {
    return [{
      id: 'legacy',
      text: customer.data.notes,
      createdAt: customer.updatedAt || new Date().toISOString(),
    }];
  }
  return [];
};

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
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; success: number; errorCount: number } | null>(null);
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
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{
    id: string;
    date: string;
    time?: string;
    services: string[];
    vehicleModel?: string;
    locationType?: string;
    resourceType?: string;
    isUpcoming?: boolean;
    employeeName?: string;
    notes?: string;
    duration?: number;
    totalPrice?: number;
  } | null>(null);
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
    notes?: string;
    duration?: number;
    totalPrice?: number;
  }>>([]);
  const actionSidebarRef = useRef<HTMLDivElement>(null);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  // Inline editing state for customer profile sidebar
  const [editingField, setEditingField] = useState<'email' | 'phone' | 'address' | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editingValueRef = useRef('');
  const [isSavingField, setIsSavingField] = useState(false);
  // Vehicle add state
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  // Note add state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  // Vehicle brand picker state
  const [showVehicleSearch, setShowVehicleSearch] = useState(false);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const vehiclePopupRef = useRef<HTMLDivElement>(null);
  // Swipe-to-close refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Track if Google Places selection just happened (to skip blur save)
  const addressPlaceSelectedRef = useRef(false);
  const addressSaveInProgressRef = useRef(false);
  // Helper to update editingValue and keep the ref in sync
  const updateEditingValue = (val: string) => {
    setEditingValue(val);
    editingValueRef.current = val;
  };
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

  // Notion-style secondary sidebar & filters
  const [contactView, setContactView] = useState<'customers' | 'prospects'>('customers');
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(true);
  const [contactsFilterValue, setContactsFilterValue] = useState('all');
  const [contactsSortValue, setContactsSortValue] = useState('lastVisit');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const PAGE_SIZE_OPTIONS = [25, 50, 75, 100, 125];
  const [showContactsFilter, setShowContactsFilter] = useState(false);
  const [showContactsSort, setShowContactsSort] = useState(false);
  const contactsFilterRef = useRef<HTMLDivElement>(null);
  const contactsSortRef = useRef<HTMLDivElement>(null);

  const getEffectiveCustomerType = (customer: Customer) => {
    if (customer.customerType?.toLowerCase() === 'maintenance') {
      return 'maintenance';
    }
    return getCustomerTypeFromHistory({
      completedServiceCount: customer.completedServiceCount,
      lastCompletedServiceAt: customer.lastCompletedServiceAt
    });
  };
  const [formData, setFormData] = useState({
    customerPhone: '',
    customerName: '',
    customerEmail: '',
    address: '',
    locationType: '',
    customerType: '',
    vehicleModel: '',
    vehicles: [] as string[],
    services: [] as string[],
    vcardSent: false,
    customerNotes: ''
  });

  const addVehicleToForm = (model: string) => {
    const trimmed = model.trim();
    if (!trimmed) return;
    setFormData((prev) => {
      if (prev.vehicles.includes(trimmed)) return prev;
      return { ...prev, vehicles: [...prev.vehicles, trimmed] };
    });
  };

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
      // Don't close if clicking on Google Places autocomplete dropdown
      const target = event.target as HTMLElement;
      if (target.closest('.pac-container')) return;
      // Don't close sidebar if the job detail modal is open (clicks on modal backdrop shouldn't close the drawer)
      if (isJobModalOpen) return;
      if (actionSidebarRef.current && !actionSidebarRef.current.contains(event.target as Node)) {
        setIsActionSidebarOpen(false);
        setSelectedCustomerData(null);
        setEditingField(null);
        setIsAddingVehicle(false);
        setIsAddingNote(false);
        setEditingNoteId(null);
        setEditingNoteText('');
        setShowVehicleSearch(false);
        setHoveredBrand(null);
      }
    };

    if (isActionSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionSidebarOpen, isJobModalOpen]);

  // Toggle body class to hide hamburger menu when customer profile sidebar is open
  useEffect(() => {
    if (isActionSidebarOpen) {
      document.body.classList.add('customer-profile-open');
    } else {
      document.body.classList.remove('customer-profile-open');
    }
    return () => {
      document.body.classList.remove('customer-profile-open');
    };
  }, [isActionSidebarOpen]);

  // Click-outside handler for vehicle brand picker popup
  useEffect(() => {
    const handleVehiclePopupClickOutside = (event: MouseEvent) => {
      if (vehiclePopupRef.current && !vehiclePopupRef.current.contains(event.target as Node)) {
        setShowVehicleSearch(false);
        setHoveredBrand(null);
        setVehicleSearchQuery('');
      }
    };
    if (showVehicleSearch) {
      document.addEventListener('mousedown', handleVehiclePopupClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleVehiclePopupClickOutside);
    };
  }, [showVehicleSearch]);

  const normalizedVehicleSearch = vehicleSearchQuery.trim().toLowerCase();
  const filteredVehicleBrands = Object.entries(VEHICLE_BY_BRAND)
    .filter(([brand, models]) => {
      if (!normalizedVehicleSearch) return true;
      return (
        brand.toLowerCase().includes(normalizedVehicleSearch) ||
        models.some((model: string) => model.toLowerCase().includes(normalizedVehicleSearch))
      );
    })
    .map(([brand]) => brand);
  const activeVehicleBrand =
    hoveredBrand && filteredVehicleBrands.includes(hoveredBrand)
      ? hoveredBrand
      : filteredVehicleBrands[0] || null;
  const activeBrandMatchesSearch =
    !!activeVehicleBrand &&
    !!normalizedVehicleSearch &&
    activeVehicleBrand.toLowerCase().includes(normalizedVehicleSearch);
  const filteredVehicleModels = activeVehicleBrand
    ? VEHICLE_BY_BRAND[activeVehicleBrand].filter((model: string) =>
        !normalizedVehicleSearch || activeBrandMatchesSearch || model.toLowerCase().includes(normalizedVehicleSearch)
      )
    : [];

  // Clear long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isJobModalOpen) {
      setSelectedJob(null);
    }
  }, [isJobModalOpen]);

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

  // Inline save for individual field edits in customer profile sidebar
  const handleInlineFieldSave = async (field: 'email' | 'phone' | 'address', value: string) => {
    if (!selectedCustomerData) return;
    
    // Build the PATCH body based on which field was edited
    const body: Record<string, any> = {};
    if (field === 'email') {
      // If value unchanged, skip
      if (value === (selectedCustomerData.customerEmail || '')) { setEditingField(null); return; }
      body.customerEmail = value || '';
    } else if (field === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits === (selectedCustomerData.customerPhone || '').replace(/\D/g, '')) { setEditingField(null); return; }
      if (digits.length !== 10 && digits.length !== 0) { setEditingField(null); return; } // silently skip invalid
      body.customerPhone = digits;
    } else if (field === 'address') {
      if (value === (selectedCustomerData.address || '')) { setEditingField(null); return; }
      body.address = value || '';
    }

    setIsSavingField(true);
    try {
      const response = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = await response.json();
        // Update the selected customer data in place
        setSelectedCustomerData(data.customer);
        // Refresh the main customer list
        await fetchCustomers();
      }
    } catch (err) {
      console.error('Inline save failed:', err);
    } finally {
      setIsSavingField(false);
      setEditingField(null);
    }
  };

  // Add a vehicle to the customer's vehicles array
  const handleAddVehicle = async (name: string) => {
    if (!selectedCustomerData || !name.trim()) { setIsAddingVehicle(false); setNewVehicleName(''); return; }
    const currentVehicles = getCustomerVehicles(selectedCustomerData);
    const updated = [...currentVehicles, name.trim()];
    try {
      const response = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles: updated }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerData(data.customer);
        await fetchCustomers();
      }
    } catch (err) { console.error('Add vehicle failed:', err); }
    finally { setIsAddingVehicle(false); setNewVehicleName(''); }
  };

  // Remove a vehicle by index
  const handleRemoveVehicle = async (index: number) => {
    if (!selectedCustomerData) return;
    const currentVehicles = getCustomerVehicles(selectedCustomerData);
    const updated = currentVehicles.filter((_, i) => i !== index);
    try {
      const response = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles: updated }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerData(data.customer);
        await fetchCustomers();
      }
    } catch (err) { console.error('Remove vehicle failed:', err); }
  };

  // Add a customer note
  const handleAddNote = async (text: string) => {
    if (!selectedCustomerData || !text.trim()) { setIsAddingNote(false); setNewNoteText(''); return; }
    const currentNotes = getCustomerNotes(selectedCustomerData);
    const newNote: CustomerNote = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...currentNotes, newNote];
    try {
      const response = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: updated }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerData(data.customer);
        await fetchCustomers();
      }
    } catch (err) { console.error('Add note failed:', err); }
    finally { setIsAddingNote(false); setNewNoteText(''); }
  };

  // Remove a customer note by id
  const handleRemoveNote = async (noteId: string) => {
    if (!selectedCustomerData) return;
    const currentNotes = getCustomerNotes(selectedCustomerData);
    const updated = currentNotes.filter(n => n.id !== noteId);
    try {
      const response = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: updated }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerData(data.customer);
        await fetchCustomers();
      }
    } catch (err) { console.error('Remove note failed:', err); }
  };

  // Edit a customer note by id
  const handleEditNote = async (noteId: string, newText: string) => {
    if (!selectedCustomerData || !newText.trim()) { setEditingNoteId(null); setEditingNoteText(''); return; }
    const currentNotes = getCustomerNotes(selectedCustomerData);
    const updated = currentNotes.map(n => n.id === noteId ? { ...n, text: newText.trim() } : n);
    try {
      const response = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: updated }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerData(data.customer);
        await fetchCustomers();
      }
    } catch (err) { console.error('Edit note failed:', err); }
    finally { setEditingNoteId(null); setEditingNoteText(''); }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      // Extract notes from data.notes if it exists
      const notes = (customer as any).data && typeof (customer as any).data === 'object' && (customer as any).data.notes 
        ? (customer as any).data.notes 
        : '';
      const existingPhone = customer.customerPhone || '';
      const existingVehicles = getCustomerVehicles(customer);
      setFormData({
        customerPhone: existingPhone ? formatPhoneNumber(existingPhone) : '',
        customerName: customer.customerName || '',
        customerEmail: customer.customerEmail || '',
        address: customer.address || '',
        locationType: customer.locationType || '',
        customerType: customer.customerType || '',
        vehicleModel: customer.vehicleModel || '',
        vehicles: existingVehicles,
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
        vehicles: [],
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
        
        const customerPhones = normalizePhoneForMatch(customer.customerPhone);

        const matchesCustomer = (event: any) => {
          const eventPhoneRaw = event.customerPhone || extractPhoneFromDescription(event.description);
          const eventPhones = normalizePhoneForMatch(eventPhoneRaw);
          if (customerPhones.e164 && eventPhones.e164 && customerPhones.e164 === eventPhones.e164) {
            return true;
          }
          if (customerPhones.last10 && eventPhones.last10 && customerPhones.last10 === eventPhones.last10) {
            return true;
          }
          return false;
        };

        const isNotCancelled = (event: any) => {
          const status = typeof event.status === 'string' ? event.status.toLowerCase() : '';
          return status !== 'cancelled';
        };

        // Filter events for this customer (all except cancelled, both past and upcoming)
        const now = new Date();
        const customerEvents = allEvents.filter((event: any) => {
          return matchesCustomer(event) && (isNotCancelled(event) || !event.status);
        });
        
        // Transform to match the expected format with resource type, upcoming flag, time, employee, and notes
        const jobs = customerEvents.map((event: any) => {
          const resourceType = event.resourceId ? resourceMap.get(event.resourceId) : null;
          const eventDateValue = getEventDateValue(event);
          const isUpcoming = eventDateValue >= now.getTime();
          const notesFromDescription = extractNotesFromDescription(event.description);
          return {
            id: event.id,
            date: event.date || event.start || event.scheduledDate,
            time: event.time || null,
            services: Array.isArray(event.services) ? event.services : (event.services ? [event.services] : []),
            vehicleModel: event.vehicleModel || event.vehicleType,
            locationType: event.locationType || null,
            resourceType: resourceType || null,
            isUpcoming: isUpcoming,
            employeeName: event.employeeName || null,
            notes: event.notes || notesFromDescription || '',
            duration: event.duration || null,
            totalPrice: event.totalPrice || null,
          };
        });

        const upcoming = jobs
          .filter(job => {
            const time = job.date ? new Date(job.date).getTime() : 0;
            return time >= now.getTime();
          })
          .sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateA - dateB;
          });

        const past = jobs
          .filter(job => {
            const time = job.date ? new Date(job.date).getTime() : 0;
            return time < now.getTime();
          })
          .sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
        
        setCustomerPastJobs([...upcoming, ...past]);
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
      vehicles: [],
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
        vehicleModel: formData.vehicles.length > 0 ? formData.vehicles[0] : (formData.vehicleModel || undefined),
        vehicles: formData.vehicles.length > 0 ? formData.vehicles : undefined,
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

  // Close filter/sort dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contactsFilterRef.current && !contactsFilterRef.current.contains(e.target as Node)) {
        setShowContactsFilter(false);
      }
      if (contactsSortRef.current && !contactsSortRef.current.contains(e.target as Node)) {
        setShowContactsSort(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset filter/sort defaults when switching views
  React.useEffect(() => {
    setContactsFilterValue('all');
    setContactsSortValue(contactView === 'customers' ? 'lastVisit' : 'newest');
  }, [contactView]);

  // ─── Notion-style computed helpers ──────────────────────────────────
  const getDaysSinceVisit = (customer: Customer): number | null => {
    if (!customer.lastCompletedServiceAt) return null;
    const last = new Date(customer.lastCompletedServiceAt);
    if (isNaN(last.getTime())) return null;
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getReengageStatus = (customer: Customer): { label: string; color: string } => {
    const upcoming = customerUpcomingJobs.get(customer.id);
    if (upcoming) return { label: 'Just Booked', color: 'text-emerald-600 bg-emerald-50' };
    const days = getDaysSinceVisit(customer);
    if (days === null) return { label: 'New', color: 'text-blue-600 bg-blue-50' };
    if (days > 45) return { label: 'Overdue', color: 'text-red-600 bg-red-50' };
    if (days > 25) return { label: 'Due Soon', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Active', color: 'text-emerald-600 bg-emerald-50' };
  };

  const getCustomerStatus = (customer: Customer): { label: string; color: string } => {
    const upcoming = customerUpcomingJobs.get(customer.id);
    if (upcoming) {
      try {
        const d = new Date(upcoming.date);
        const dateStr = format(d, 'MMM d, yyyy');
        return { label: `Scheduled: ${dateStr}`, color: 'bg-[#E3F2FD] text-[#1565C0]' };
      } catch {
        return { label: 'Scheduled', color: 'bg-[#E3F2FD] text-[#1565C0]' };
      }
    }
    const count = customer.completedServiceCount || 0;
    if (count >= 2) return { label: `Repeat: ${count} past jobs`, color: 'bg-[#F3E5F5] text-[#7B1FA2]' };
    return { label: 'Lead', color: 'bg-[#E8F5E9] text-[#2E7D32]' };
  };

  // Split customers into customers (have visits) and prospects (new/no visits)
  const getVehicleSortValue = (customer: Customer): string => {
    const vehicleRaw = (customer.vehicleModel || customer.vehicle || '').trim();
    if (!vehicleRaw || vehicleRaw === '-' || vehicleRaw === '—') return 'zzzzzz';
    const make = getBrandForModel(vehicleRaw) || '';
    return `${make} ${vehicleRaw}`.trim().toLowerCase();
  };

  const toggleVehicleColumnSort = () => {
    setContactsSortValue((prev) => (prev === 'vehicleAsc' ? 'vehicleDesc' : 'vehicleAsc'));
  };

  const actualCustomers = React.useMemo(() => {
    return filteredCustomers.filter(c => (c.completedServiceCount || 0) >= 1 || customerUpcomingJobs.has(c.id));
  }, [filteredCustomers, customerUpcomingJobs]);

  const prospectCustomers = React.useMemo(() => {
    return filteredCustomers.filter(c => (c.completedServiceCount || 0) === 0 && !customerUpcomingJobs.has(c.id));
  }, [filteredCustomers, customerUpcomingJobs]);

  // Apply Notion-style filtering and sorting for customers view
  const notionFilteredCustomers = React.useMemo(() => {
    const base = contactView === 'customers' ? actualCustomers : prospectCustomers;
    let filtered = base;
    if (contactView === 'customers') {
      if (contactsFilterValue === 'frequent') filtered = filtered.filter(c => (c.completedServiceCount || 0) >= 5);
      else if (contactsFilterValue === 'regular') filtered = filtered.filter(c => { const ct = c.completedServiceCount || 0; return ct >= 2 && ct <= 4; });
      else if (contactsFilterValue === 'new') filtered = filtered.filter(c => (c.completedServiceCount || 0) === 1);
    }
    // Sort
    return [...filtered].sort((a, b) => {
      if (contactsSortValue === 'vehicleAsc' || contactsSortValue === 'vehicleDesc') {
        const aVehicle = getVehicleSortValue(a);
        const bVehicle = getVehicleSortValue(b);
        return contactsSortValue === 'vehicleAsc'
          ? aVehicle.localeCompare(bVehicle)
          : bVehicle.localeCompare(aVehicle);
      }
      if (contactView === 'customers') {
        if (contactsSortValue === 'lastVisit') {
          const aTime = a.lastCompletedServiceAt ? new Date(a.lastCompletedServiceAt).getTime() : 0;
          const bTime = b.lastCompletedServiceAt ? new Date(b.lastCompletedServiceAt).getTime() : 0;
          return bTime - aTime;
        }
        if (contactsSortValue === 'mostVisits') return (b.completedServiceCount || 0) - (a.completedServiceCount || 0);
        if (contactsSortValue === 'name') return (a.customerName || '').localeCompare(b.customerName || '');
        if (contactsSortValue === 'totalSpend') return (b.completedServiceCount || 0) - (a.completedServiceCount || 0); // Proxy since no real spend data
      } else {
        if (contactsSortValue === 'newest') {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        }
        if (contactsSortValue === 'oldest') {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        }
        if (contactsSortValue === 'name') return (a.customerName || '').localeCompare(b.customerName || '');
      }
      return 0;
    });
  }, [contactView, actualCustomers, prospectCustomers, contactsFilterValue, contactsSortValue, customerUpcomingJobs]);

  const totalPages = Math.ceil(notionFilteredCustomers.length / itemsPerPage);
  const paginatedCustomers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return notionFilteredCustomers.slice(start, start + itemsPerPage);
  }, [notionFilteredCustomers, currentPage, itemsPerPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, contactView, contactsFilterValue, contactsSortValue]);

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

  const handleDeleteAll = async () => {
    if (customers.length === 0) return;
    if (!window.confirm(`DELETE ALL ${customers.length} customers? This cannot be undone.`)) return;
    if (!window.confirm('Are you really sure? This will permanently remove every customer.')) return;

    try {
      const res = await fetch('/api/detailer/customers/delete-all', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      const data = await res.json();
      alert(`Deleted ${data.count} customers.`);
      setSelectedCustomers(new Set());
      await fetchCustomers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
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
    const headers = [
      'Name', 'Phone', 'Email',
      'Address 1', 'Address 2', 'City', 'State', 'Zip Code',
      'Vehicles', 'Services', 'Customer Type',
      'First Visit', 'Last Visit', 'Visits', 'Lifetime Value',
      'Location', 'Technician', 'Notes', 'Pets', 'Kids', 'State Valid'
    ];
    const exampleRow = [
      'John Doe',
      '+1234567890',
      'john@example.com',
      '123 Main St', 'Apt 4', 'Boston', 'MA', '02101',
      'Toyota Camry 2020; Honda Civic 2018',
      'Express Detail; Full Detail',
      'returning',
      '2023-07-01', '2026-01-05', '5', '$1,272.00',
      'home', 'Mike', 'Prefers morning appointments', '', '', 'TRUE'
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
    setImportProgress(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await fetch('/api/detailer/customers/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to import customers');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const dataMatch = line.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;

          try {
            const event = JSON.parse(dataMatch[1]);

            if (event.type === 'init') {
              setImportProgress({ current: 0, total: event.total, success: 0, errorCount: 0 });
            } else if (event.type === 'progress') {
              setImportProgress({
                current: event.current,
                total: event.total,
                success: event.success,
                errorCount: event.errorCount,
              });
            } else if (event.type === 'complete') {
              setImportResults({ success: event.success, errors: event.errors });
              setImportProgress(null);
              if (event.success > 0) {
                await fetchCustomers();
              }
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (parseErr: any) {
            if (parseErr.message && parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    } finally {
      setImportLoading(false);
      setImportProgress(null);
    }
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportResults(null);
    setImportProgress(null);
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

  // Handle SMS button - start conversation with AI and navigate directly to the chat
  const handleSendSMS = async (customer: Customer) => {
    if (!customer.customerPhone) {
      alert('Customer phone number is required');
      return;
    }

    // Normalize phone to digits for the URL param
    const phoneDigits = customer.customerPhone.replace(/\D/g, '');

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
        // If conversation already exists, that's okay - redirect to messages with phone param
        if (response.status === 409) {
          router.push(`/detailer-dashboard/messages?phone=${encodeURIComponent(phoneDigits)}`);
          return;
        }
        throw new Error(result.error || 'Failed to start conversation');
      }

      // Redirect to messages page with phone param to auto-select the conversation
      router.push(`/detailer-dashboard/messages?phone=${encodeURIComponent(phoneDigits)}`);
    } catch (err: any) {
      alert(err.message || 'Failed to send SMS');
    }
  };

  return (
    <div className="h-full min-h-0 flex bg-white overflow-hidden">
      {/* ═══ Secondary Sidebar (Desktop) ═══ */}
      {secondarySidebarOpen && (
        <div className="hidden md:flex flex-col w-[200px] border-r border-[#F0F0EE] bg-white shrink-0">
          <div className="px-5 h-[52px] border-b border-[#F0F0EE] flex items-center">
            <h2 className="text-sm font-semibold text-[#2B2B26]">Contacts</h2>
          </div>
          <div className="py-3 px-3 space-y-0.5">
            <button
              onClick={() => setContactView('customers')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                contactView === 'customers'
                  ? 'bg-[#f0f0ee] text-[#2B2B26] font-medium'
                  : 'text-[#6b6a5e] hover:bg-[#f8f8f7] hover:text-[#2B2B26]'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
              <span>Customers</span>
              <span className="ml-auto text-[10px] text-[#9e9d92]">{actualCustomers.length}</span>
            </button>
            <button
              onClick={() => setContactView('prospects')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                contactView === 'prospects'
                  ? 'bg-[#f0f0ee] text-[#2B2B26] font-medium'
                  : 'text-[#6b6a5e] hover:bg-[#f8f8f7] hover:text-[#2B2B26]'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              <span>Prospects</span>
              <span className="ml-auto text-[10px] text-[#9e9d92]">{prospectCustomers.length}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ Main Content ═══ */}
      <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isActionSidebarOpen ? 'md:pr-[400px] lg:pr-[420px]' : ''}`}>
        {/* ── Mobile Header ── */}
        <div className="md:hidden px-4 pt-4 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#2B2B26] pl-10">{contactView === 'customers' ? 'Customers' : 'Prospects'}</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsImportModalOpen(true)} className="w-9 h-9 bg-[#2B2B26] text-white rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </button>
            </div>
          </div>
          {/* Mobile view toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setContactView('customers')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${contactView === 'customers' ? 'bg-[#2B2B26] text-white' : 'bg-[#f0f0ee] text-[#6b6a5e]'}`}>Customers</button>
            <button onClick={() => setContactView('prospects')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${contactView === 'prospects' ? 'bg-[#2B2B26] text-white' : 'bg-[#f0f0ee] text-[#6b6a5e]'}`}>Prospects</button>
          </div>
          {/* Mobile search */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-[#9e9d92]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-3 py-2 text-sm border border-[#deded9] rounded-lg focus:outline-none focus:border-[#9e9d92]" />
            </div>
            <button onClick={() => setIsFilterModalOpen(true)} className="w-9 h-9 rounded-lg border border-[#deded9] flex items-center justify-center hover:bg-[#f8f8f7]">
              <svg className="w-4 h-4 text-[#6b6a5e]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 12h12M7 17h8" /></svg>
            </button>
          </div>
        </div>

        {/* ── Desktop Header Row ── */}
        <div className="hidden md:flex h-[52px] px-4 bg-white border-b border-[#F0F0EE] items-center gap-3">
          <button
            onClick={() => setSecondarySidebarOpen(!secondarySidebarOpen)}
            className="p-1.5 text-[#57564d] hover:text-[#2B2B26] hover:bg-[#f8f8f7] rounded-md transition-colors"
            title={secondarySidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {secondarySidebarOpen ? (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
            ) : (
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            )}
          </button>
          <h1 className="text-sm font-semibold text-[#2B2B26]">{contactView === 'customers' ? 'Customers' : 'Prospects'}</h1>
          <div className="flex-1" />
          {/* Search in toolbar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <svg className="h-3.5 w-3.5 text-[#9e9d92]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-8 pr-3 py-1.5 text-[12px] border border-[#deded9] rounded-md focus:outline-none focus:border-[#9e9d92] w-[180px] bg-white text-[#2B2B26] placeholder:text-[#9e9d92]" />
          </div>
          <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6b6a5e] hover:text-[#2B2B26] hover:bg-[#f8f8f7] rounded-md transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <span>Import</span>
          </button>
          <button onClick={handleDeleteAll} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-full transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            <span>Delete All</span>
          </button>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#F97316] hover:bg-[#EA580C] rounded-full transition-colors">
            <FaPlus className="w-3 h-3" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* ── Desktop Filter/Sort Row ── */}
        <div className="hidden md:flex h-10 px-4 bg-white border-b border-[#F0F0EE] items-center gap-2">
          <div className="relative" ref={contactsFilterRef}>
            <button
              onClick={() => { setShowContactsFilter(!showContactsFilter); setShowContactsSort(false); }}
              className={`flex items-center gap-1.5 px-2 py-1 text-[13px] rounded-md transition-colors ${
                showContactsFilter || contactsFilterValue !== 'all'
                  ? 'text-[#2B2B26] bg-[#f0f0ee]'
                  : 'text-[#6b6a5e] hover:bg-[#f8f8f7] hover:text-[#2B2B26]'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>
              <span>Filter</span>
              {contactsFilterValue !== 'all' && <span className="ml-0.5 px-1.5 py-0.5 bg-[#2B2B26] text-white text-[10px] rounded-full">1</span>}
            </button>
            {showContactsFilter && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-[#F0F0EE] rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                {contactView === 'customers' ? (
                  <>
                    <button onClick={() => { setContactsFilterValue('all'); setShowContactsFilter(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsFilterValue === 'all' ? 'bg-[#f8f8f7] font-medium' : ''}`}>All Customers</button>
                    <button onClick={() => { setContactsFilterValue('frequent'); setShowContactsFilter(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsFilterValue === 'frequent' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Frequent (5+ visits)</button>
                    <button onClick={() => { setContactsFilterValue('regular'); setShowContactsFilter(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsFilterValue === 'regular' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Regular (2-4 visits)</button>
                    <button onClick={() => { setContactsFilterValue('new'); setShowContactsFilter(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsFilterValue === 'new' ? 'bg-[#f8f8f7] font-medium' : ''}`}>New (1 visit)</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setContactsFilterValue('all'); setShowContactsFilter(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsFilterValue === 'all' ? 'bg-[#f8f8f7] font-medium' : ''}`}>All Prospects</button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative" ref={contactsSortRef}>
            <button
              onClick={() => { setShowContactsSort(!showContactsSort); setShowContactsFilter(false); }}
              className={`flex items-center gap-1.5 px-2 py-1 text-[13px] rounded-md transition-colors ${
                showContactsSort
                  ? 'text-[#2B2B26] bg-[#f0f0ee]'
                  : 'text-[#6b6a5e] hover:bg-[#f8f8f7] hover:text-[#2B2B26]'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
              <span>Sort</span>
            </button>
            {showContactsSort && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-[#F0F0EE] rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
                {contactView === 'customers' ? (
                  <>
                    <button onClick={() => { setContactsSortValue('lastVisit'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'lastVisit' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Last Visit</button>
                    <button onClick={() => { setContactsSortValue('mostVisits'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'mostVisits' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Most Visits</button>
                    <button onClick={() => { setContactsSortValue('name'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'name' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Name A-Z</button>
                    <button onClick={() => { setContactsSortValue('totalSpend'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'totalSpend' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Total Spend</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setContactsSortValue('newest'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'newest' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Newest First</button>
                    <button onClick={() => { setContactsSortValue('oldest'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'oldest' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Oldest First</button>
                    <button onClick={() => { setContactsSortValue('name'); setShowContactsSort(false); }} className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#f8f8f7] ${contactsSortValue === 'name' ? 'bg-[#f8f8f7] font-medium' : ''}`}>Name A-Z</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Bulk Actions (preserved) ── */}
        {selectedCustomers.size > 0 && (
          <div className="px-4 py-2 bg-[#f8f8f7] border-b border-[#F0F0EE] flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-[#2B2B26]">{selectedCustomers.size} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkDelete} className="px-2.5 py-1 text-[11px] font-medium bg-red-500 text-white hover:bg-red-600 rounded-md transition">Delete</button>
              <button onClick={handleExportSelected} className="px-2.5 py-1 text-[11px] font-medium bg-[#6b6a5e] text-white hover:bg-[#57564d] rounded-md transition hidden sm:block">Export</button>
              <button onClick={() => { if (isMultiSelectMode) exitMultiSelectMode(); else setSelectedCustomers(new Set()); }} className="px-2.5 py-1 text-[11px] font-medium bg-[#6b6a5e] text-white hover:bg-[#57564d] rounded-md transition">{isMultiSelectMode ? 'Done' : 'Clear'}</button>
            </div>
          </div>
        )}

        {/* ── Mobile List View ── */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-scroll overscroll-contain pb-20">
          {loading ? (
            <div className="text-center py-12 text-[#9e9d92] text-sm">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 text-sm">{error}</div>
          ) : notionFilteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-[#9e9d92] text-sm px-4">
              {searchQuery.trim() ? `No results for "${searchQuery}"` : `No ${contactView} found.`}
            </div>
          ) : (
            <div>
              {paginatedCustomers.map((customer, index) => {
                const upcomingJob = customerUpcomingJobs.get(customer.id);
                return (
                  <div key={customer.id}>
                    {index > 0 && <div className="px-4"><div className="border-t border-[#F0F0EE]" /></div>}
                    <div
                      className="px-4 py-3 flex items-center gap-3 hover:bg-[#f8f8f7] transition cursor-pointer active:bg-[#f0f0ee]"
                      onClick={(e) => { if (isMultiSelectMode) { e.preventDefault(); handleSelectCustomer(customer.id); } else { handleCustomerClick(customer); } }}
                      onTouchStart={() => handleLongPressStart(customer.id)}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(customer.id)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                    >
                      {isMultiSelectMode && <input type="checkbox" checked={selectedCustomers.has(customer.id)} onChange={() => handleSelectCustomer(customer.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-[#deded9] flex-shrink-0" />}
                      <div className="w-9 h-9 rounded-full bg-[#deded9] flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-medium text-[#40403a]">{getInitials(customer.customerName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[13px] text-[#2B2B26] truncate">{customer.customerName || 'Unnamed'}</div>
                        <div className="text-[11px] text-[#9e9d92] mt-0.5 flex items-center gap-1 flex-wrap">
                          {customer.customerPhone && <span className="truncate">{formatPhoneDisplay(customer.customerPhone)}</span>}
                          {(customer.vehicleModel || customer.vehicle) && <><span className="text-[#c1c0b8]">·</span><span className="truncate">{customer.vehicleModel || customer.vehicle}</span></>}
                          {upcomingJob && <><span className="text-[#c1c0b8]">·</span><span className="text-[#F97316]">Upcoming</span></>}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleSendSMS(customer); }} className="w-8 h-8 rounded-full bg-[#f0f0ee] hover:bg-[#deded9] flex items-center justify-center transition flex-shrink-0">
                        <svg className="w-4 h-4 text-[#6b6a5e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Mobile Pagination */}
          {!loading && notionFilteredCustomers.length > itemsPerPage && (
            <div className="flex flex-col gap-2 px-4 py-3 border-t border-[#F0F0EE]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9e9d92]">{((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, notionFilteredCustomers.length)} of {notionFilteredCustomers.length}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-1.5 py-1 rounded-md border border-[#deded9] text-[#40403a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0ee] transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-1.5 py-1 rounded-md border border-[#deded9] text-[#40403a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0ee] transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#9e9d92]">Per page:</span>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-[11px] text-[#40403a] border border-[#deded9] rounded-md px-1.5 py-0.5 bg-white">
                  {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button - Mobile */}
        <button onClick={() => handleOpenModal()} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#F97316] text-white rounded-full shadow-lg hover:bg-[#EA580C] transition flex items-center justify-center z-30">
          <FaPlus className="w-5 h-5" />
        </button>

        {/* ── Filter Modal (Mobile) ── */}
        {isFilterModalOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsFilterModalOpen(false)} />
            <div className="md:hidden fixed inset-x-0 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#F0F0EE] px-4 py-4 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-lg font-semibold text-[#2B2B26]">Filter</h2>
                <button onClick={() => setIsFilterModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f8f8f7]"><XMarkIcon className="w-5 h-5 text-[#6b6a5e]" /></button>
              </div>
              <div className="px-4 py-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#2B2B26] mb-3">Last seen</h3>
                  <div className="flex flex-wrap gap-2">
                    {['all', '30', '31-90', '91-120'].map((opt) => {
                      const labels: Record<string, string> = { 'all': 'All time', '30': 'Last 30 days', '31-90': '31-90 days', '91-120': '91-120 days' };
                      return <button key={opt} onClick={() => setFilterLastSeen(opt)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${filterLastSeen === opt ? 'bg-[#2B2B26] text-white' : 'bg-white text-[#6b6a5e] border border-[#deded9]'}`}>{labels[opt]}</button>;
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#2B2B26] mb-3">Services</h3>
                  <div className="space-y-3">
                    {[{ id: 'maintenance', label: 'Maintenance' }, { id: 'full-detail', label: 'Full detail' }, { id: 'high-ticket', label: 'High-ticket' }, { id: 'first-time', label: 'First-time customer' }].map((s) => (
                      <label key={s.id} className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={filterServices.includes(s.id)} onChange={(e) => e.target.checked ? setFilterServices([...filterServices, s.id]) : setFilterServices(filterServices.filter(x => x !== s.id))} className="w-5 h-5 rounded border-[#deded9]" />
                        <span className="text-sm text-[#40403a]">{s.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ Desktop Table View ═══ */}
        <div className="hidden md:block flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-[#9e9d92] text-sm">Loading...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-600 text-sm">{error}</div>
          ) : notionFilteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-[#9e9d92] text-sm">
              {searchQuery.trim() ? `No results for "${searchQuery}"` : `No ${contactView} found. Click "Add Customer" to create one.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#F0F0EE]">
                    <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[180px] whitespace-nowrap">Name</th>
                    {contactView === 'customers' ? (
                      <>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[160px] whitespace-nowrap">Status</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[150px] whitespace-nowrap">
                          <button
                            type="button"
                            onClick={toggleVehicleColumnSort}
                            className="inline-flex items-center gap-1 hover:text-[#57564d] transition-colors"
                            title="Sort by vehicle"
                          >
                            <span>Vehicle</span>
                            <span className="text-[9px]">
                              {contactsSortValue === 'vehicleAsc' ? 'A-Z' : contactsSortValue === 'vehicleDesc' ? 'Z-A' : '↕'}
                            </span>
                          </button>
                        </th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[160px] whitespace-nowrap">Phone</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[160px] whitespace-nowrap">Email</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[150px] whitespace-nowrap">Services</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[120px] whitespace-nowrap">Lifetime Value</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[80px] whitespace-nowrap">Visits</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[120px] whitespace-nowrap">Days Since Visit</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[120px] whitespace-nowrap">Re-engage Status</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[160px] whitespace-nowrap">Phone</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[160px] whitespace-nowrap">Email</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[150px] whitespace-nowrap">
                          <button
                            type="button"
                            onClick={toggleVehicleColumnSort}
                            className="inline-flex items-center gap-1 hover:text-[#57564d] transition-colors"
                            title="Sort by vehicle"
                          >
                            <span>Vehicle</span>
                            <span className="text-[9px]">
                              {contactsSortValue === 'vehicleAsc' ? 'A-Z' : contactsSortValue === 'vehicleDesc' ? 'Z-A' : '↕'}
                            </span>
                          </button>
                        </th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[150px] whitespace-nowrap">Services</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[140px] whitespace-nowrap">First Contact</th>
                        <th className="px-3 py-2 text-[10px] font-medium text-[#9e9d92] min-w-[140px] whitespace-nowrap">Last Updated</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e6]">
                  {paginatedCustomers.map((customer) => {
                    const status = getCustomerStatus(customer);
                    const reengage = getReengageStatus(customer);
                    const daysSince = getDaysSinceVisit(customer);
                    const visits = customer.completedServiceCount || 0;
                    const importedLtv = customer.data?.importedLifetimeValue;
                    const estimatedValue = typeof importedLtv === 'number' ? importedLtv : visits * 150;
                    const services = customer.services || [];
                    const vehicleDisplayRaw = (customer.vehicleModel || customer.vehicle || '—').trim();
                    const vehicleDisplay = vehicleDisplayRaw || '—';
                    const showVehicleIcon = vehicleDisplay !== '—' && vehicleDisplay !== '-';
                    const vehicleBrand = showVehicleIcon ? getBrandForModel(vehicleDisplay) : null;

                    return (
                      <tr
                        key={customer.id}
                        onClick={() => handleCustomerClick(customer)}
                        className="hover:bg-[#f8f8f7] cursor-pointer group"
                      >
                        {/* Name */}
                        <td className="px-3 py-1.5 border-r border-[#F0F0EE] min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all group-hover:bg-[#deded9] group-hover:shadow-sm">
                              <div className="h-5 w-5 rounded-full bg-[#deded9] flex items-center justify-center font-medium text-[8px] text-[#40403a] flex-shrink-0">
                                {getInitials(customer.customerName)}
                              </div>
                              <p className="font-medium text-[11px] text-[#2B2B26] whitespace-nowrap">{customer.customerName || '—'}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/detailer-dashboard/customers/${customer.id}`);
                                }}
                                className="h-4 w-4 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F0F0EE]"
                                title="View profile"
                              >
                                <svg className="h-2.5 w-2.5 text-[#2B2B26]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" /></svg>
                              </button>
                            </div>
                          </div>
                        </td>

                        {contactView === 'customers' ? (
                          <>
                            {/* Status */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-medium tracking-wide whitespace-nowrap ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            {/* Vehicle */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-normal text-[#40403a] whitespace-nowrap">
                                {showVehicleIcon ? <ManufacturerLogo manufacturerName={vehicleBrand} className="h-5 w-5" alt={vehicleBrand || 'Vehicle'} /> : null}
                                <span>{vehicleDisplay}</span>
                              </span>
                            </td>
                            {/* Phone */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#40403a] whitespace-nowrap">{formatPhoneDisplay(customer.customerPhone)}</span>
                            </td>
                            {/* Email */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#40403a] whitespace-nowrap">{customer.customerEmail || '—'}</span>
                            </td>
                            {/* Services */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <div className="flex items-center gap-1 relative">
                                {services.length === 0 ? (
                                  <span className="text-[9px] text-[#9e9d92]">—</span>
                                ) : (
                                  <>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap bg-[#F0F0EE] text-[#40403a]">{services[0]}</span>
                                    {services.length > 1 && (
                                      <div className="relative group/badge inline-flex items-center">
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap bg-[#deded9] text-[#57564d] cursor-pointer hover:bg-[#c1c0b8] peer">+{services.length - 1}</span>
                                        <div className="absolute left-0 top-full mt-1 z-50 hidden peer-hover:flex flex-wrap gap-1 p-2 bg-white border border-[#deded9] rounded-md shadow-lg max-w-[200px] pointer-events-none">
                                          {services.map((s, i) => <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap bg-[#F0F0EE] text-[#40403a]">{s}</span>)}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            {/* Lifetime Value */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#40403a] whitespace-nowrap">${estimatedValue.toLocaleString()}</span>
                            </td>
                            {/* Visits */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#40403a] whitespace-nowrap">{visits} {visits === 1 ? 'visit' : 'visits'}</span>
                            </td>
                            {/* Days Since Visit */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#57564d] whitespace-nowrap">{daysSince !== null ? `${daysSince} days ago` : '—'}</span>
                            </td>
                            {/* Re-engage Status */}
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap ${reengage.color}`}>{reengage.label}</span>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Phone */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#40403a] whitespace-nowrap">{formatPhoneDisplay(customer.customerPhone)}</span>
                            </td>
                            {/* Email */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#40403a] whitespace-nowrap">{customer.customerEmail || '—'}</span>
                            </td>
                            {/* Vehicle */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-normal text-[#40403a] whitespace-nowrap">
                                {showVehicleIcon ? <ManufacturerLogo manufacturerName={vehicleBrand} className="h-5 w-5" alt={vehicleBrand || 'Vehicle'} /> : null}
                                <span>{vehicleDisplay}</span>
                              </span>
                            </td>
                            {/* Services */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <div className="flex items-center gap-1">
                                {services.length === 0 ? (
                                  <span className="text-[9px] text-[#9e9d92]">—</span>
                                ) : (
                                  <>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap bg-[#F0F0EE] text-[#40403a]">{services[0]}</span>
                                    {services.length > 1 && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap bg-[#deded9] text-[#57564d]">+{services.length - 1}</span>}
                                  </>
                                )}
                              </div>
                            </td>
                            {/* First Contact */}
                            <td className="px-3 py-1.5 border-r border-[#F0F0EE]">
                              <span className="text-[11px] font-normal text-[#57564d] whitespace-nowrap">
                                {customer.createdAt ? format(new Date(customer.createdAt), 'MMM d, yyyy') : '—'}
                              </span>
                            </td>
                            {/* Last Updated */}
                            <td className="px-3 py-1.5">
                              <span className="text-[11px] font-normal text-[#57564d] whitespace-nowrap">
                                {customer.updatedAt ? format(new Date(customer.updatedAt), 'MMM d, yyyy') : '—'}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Desktop Pagination */}
          {!loading && notionFilteredCustomers.length > itemsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0F0EE] bg-white sticky bottom-0">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#9e9d92]">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, notionFilteredCustomers.length)} of {notionFilteredCustomers.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#9e9d92]">Per page:</span>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-[11px] text-[#40403a] border border-[#deded9] rounded-md px-1.5 py-0.5 bg-white cursor-pointer hover:border-[#c1c0b8] transition">
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2 py-1 text-[11px] font-medium rounded-md border border-[#deded9] text-[#40403a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0ee] transition">First</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-1.5 py-1 rounded-md border border-[#deded9] text-[#40403a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0ee] transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
                <span className="px-2 text-[11px] text-[#57564d]">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-1.5 py-1 rounded-md border border-[#deded9] text-[#40403a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0ee] transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1 text-[11px] font-medium rounded-md border border-[#deded9] text-[#40403a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0ee] transition">Last</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[10001] p-4 overflow-y-auto" 
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
                  Customer Name
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
                  Vehicles
                </label>
                {formData.vehicles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formData.vehicles.map((v, i) => (
                      <VehicleChip
                        key={i}
                        model={v}
                        logoClassName="h-5 w-5 rounded-sm bg-white p-0.5"
                        onRemove={() => setFormData({ ...formData, vehicles: formData.vehicles.filter((_, idx) => idx !== i) })}
                      />
                    ))}
                  </div>
                )}
                <VehiclePickerPopover onSelect={addVehicleToForm} buttonLabel={formData.vehicles.length > 0 ? 'Add another vehicle' : 'Add vehicle'} />
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
        <div className="fixed inset-0 flex items-center justify-center z-[10001] p-4 overflow-y-auto" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
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
                  <li>Download the template CSV file using the &quot;Download Template&quot; button below</li>
                  <li>Fill in your customer information following the template format</li>
                  <li>Phone number is required for each customer</li>
                  <li>Multiple vehicles can be separated by semicolons (e.g. &quot;Toyota Camry 2020; Honda Civic 2018&quot;)</li>
                  <li>Multiple services can be separated by semicolons (e.g. &quot;Express Detail; Full Detail&quot;)</li>
                  <li>Lifetime Value should be in dollar format (e.g. &quot;$1,272.00&quot;)</li>
                  <li>Days Since Visit and Re-engage Status are auto-calculated from Last Visit</li>
                  <li>Upload your completed CSV file (.csv)</li>
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

              {importProgress && (
                <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-blue-900">Importing Customers...</h3>
                    <span className="text-sm font-bold text-blue-700">
                      {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-blue-700">
                      {importProgress.current.toLocaleString()} of {importProgress.total.toLocaleString()} customers processed
                    </p>
                    <p className="text-xs text-blue-600">
                      {importProgress.success.toLocaleString()} saved{importProgress.errorCount > 0 ? ` · ${importProgress.errorCount} errors` : ''}
                    </p>
                  </div>
                </div>
              )}

              {importResults && (
                <div className={`rounded-lg p-4 ${importResults.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <h3 className="text-sm font-semibold mb-2">
                    {importResults.errors.length > 0 ? 'Import Completed with Errors' : 'Import Successful'}
                  </h3>
                  <p className="text-sm mb-2">
                    Successfully imported: <span className="font-semibold">{importResults.success.toLocaleString()}</span> customer(s)
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
                  disabled={importLoading}
                  className="flex-1 px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <span>
                        {importProgress
                          ? `${Math.round((importProgress.current / importProgress.total) * 100)}%`
                          : 'Starting...'}
                      </span>
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

      {/* Job Detail Modal - z-[200] to appear above drawer (z-[101]) */}
      <AnimatePresence>
        {isJobModalOpen && selectedJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
              onClick={(e) => { e.stopPropagation(); setIsJobModalOpen(false); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none"
            >
              <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border pointer-events-auto" style={{ borderColor: '#E2E2DD' }}>
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b" style={{ borderColor: '#F0F0EE' }}>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: '#2B2B26' }}>Service Details</h3>
                    <p className="text-sm" style={{ color: '#6b6a5e' }}>{formatJobDateTime(selectedJob.date, selectedJob.time)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsJobModalOpen(false); }}
                    className="p-1 rounded-lg hover:bg-[#f8f8f7] transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" style={{ color: '#9e9d92' }} />
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {selectedJob.isUpcoming && (
                    <span className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
                      Upcoming
                    </span>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Service</p>
                      <p className="text-sm font-medium" style={{ color: '#2B2B26' }}>
                        {selectedJob.services && selectedJob.services.length > 0
                          ? selectedJob.services.join(', ')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Technician</p>
                      {selectedJob.employeeName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: '#EAB308' }}>
                            {selectedJob.employeeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 1)}
                          </div>
                          <span className="text-sm" style={{ color: '#2B2B26' }}>{selectedJob.employeeName}</span>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: '#2B2B26' }}>—</p>
                      )}
                    </div>
                    {selectedJob.totalPrice != null && selectedJob.totalPrice > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Price</p>
                        <p className="text-sm font-bold" style={{ color: '#2B2B26' }}>${selectedJob.totalPrice}</p>
                      </div>
                    )}
                    {selectedJob.duration != null && selectedJob.duration > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Duration</p>
                        <p className="text-sm font-medium" style={{ color: '#2B2B26' }}>{formatDuration(selectedJob.duration)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Vehicle</p>
                      <p className="text-sm" style={{ color: '#2B2B26' }}>{selectedJob.vehicleModel || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Pickup/Drop-off</p>
                      <p className="text-sm" style={{ color: '#2B2B26' }}>
                        {selectedJob.resourceType === 'bay' && selectedJob.locationType
                          ? (selectedJob.locationType === 'pick up' || selectedJob.locationType.toLowerCase() === 'pickup'
                            ? 'Pick Up'
                            : selectedJob.locationType === 'drop off' || selectedJob.locationType.toLowerCase() === 'dropoff'
                            ? 'Drop Off'
                            : selectedJob.locationType)
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {selectedJob.notes && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Job Notes</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: '#2B2B26' }}>
                        {selectedJob.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-5 pt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsJobModalOpen(false); }}
                    className="w-full px-4 py-2.5 text-white text-sm font-medium rounded-xl transition-colors"
                    style={{ backgroundColor: '#2B2B26' }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = '#1a1a17'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = '#2B2B26'; }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Animated Profile Drawer */}
      <AnimatePresence>
        {isActionSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsActionSidebarOpen(false);
                setSelectedCustomerData(null);
                setEditingField(null);
                setIsAddingVehicle(false);
                setIsAddingNote(false);
                setEditingNoteId(null);
                setEditingNoteText('');
                setShowVehicleSearch(false);
                setHoveredBrand(null);
              }}
              className="fixed inset-0 bg-black/5 z-[100]"
            />

            {/* Drawer */}
            <motion.div
              ref={actionSidebarRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 35, stiffness: 400 }}
              className="fixed top-0 right-0 h-full w-full md:w-[440px] bg-white shadow-xl z-[101] flex flex-col"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(e) => {
                if (!touchStartRef.current) return;
                const touch = e.changedTouches[0];
                const deltaX = touch.clientX - touchStartRef.current.x;
                const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
                if (deltaX > 80 && deltaY < 60) {
                  setIsActionSidebarOpen(false);
                  setSelectedCustomerData(null);
                  setEditingField(null);
                  setIsAddingVehicle(false);
                  setIsAddingNote(false);
                  setEditingNoteId(null);
                  setEditingNoteText('');
                  setShowVehicleSearch(false);
                  setHoveredBrand(null);
                }
                touchStartRef.current = null;
              }}
            >
              {/* Header */}
              <div className="h-[60px] px-4 flex items-center justify-between border-b border-[#F0F0EE] flex-shrink-0">
                <button
                  onClick={() => {
                    setIsActionSidebarOpen(false);
                    setSelectedCustomerData(null);
                    setExpandedJobs(new Set());
                    setEditingField(null);
                    setIsAddingVehicle(false);
                    setIsAddingNote(false);
                    setEditingNoteId(null);
                    setEditingNoteText('');
                    setShowVehicleSearch(false);
                    setHoveredBrand(null);
                  }}
                  className="p-1.5 hover:bg-[#f8f8f7] rounded transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" style={{ color: '#9e9d92' }} />
                </button>
                <div />
              </div>

              {/* Scrollable Content */}
              {selectedCustomerData && (
                <div className="flex-1 overflow-y-auto pb-20">
                  {/* Profile Header - horizontal layout */}
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#deded9' }}>
                        <span className="text-xl font-bold" style={{ color: '#4a4a42' }}>
                          {(selectedCustomerData.customerName || 'U')
                            .split(' ')
                            .map((w: string) => w[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                        <span className="text-xl font-semibold" style={{ color: '#2B2B26' }}>
                          {selectedCustomerData.customerName || 'Unnamed Customer'}
                        </span>
                        {(() => {
                          const effectiveCustomerType = getEffectiveCustomerType(selectedCustomerData);
                          const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
                            new: { bg: '#F0F0EE', text: '#6b6a5e', label: 'New Customer' },
                            returning: { bg: '#f3e8ff', text: '#7c3aed', label: 'Returning Customer' },
                            maintenance: { bg: '#dbeafe', text: '#2563eb', label: 'Maintenance Customer' },
                          };
                          const cfg = typeConfig[effectiveCustomerType] || typeConfig.new;
                          return (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                              style={{ backgroundColor: cfg.bg, color: cfg.text }}
                            >
                              {cfg.label}
                            </span>
                          );
                        })()}
                        {customerPastJobs && customerPastJobs.length > 0 && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
                          >
                            {customerPastJobs.length} job{customerPastJobs.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {selectedCustomerData.locationType && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
                          >
                            {selectedCustomerData.locationType?.toLowerCase() === 'pickup' || selectedCustomerData.locationType?.toLowerCase() === 'pick up'
                              ? 'Pick Up'
                              : selectedCustomerData.locationType?.toLowerCase() === 'dropoff' || selectedCustomerData.locationType?.toLowerCase() === 'drop off'
                              ? 'Drop Off'
                              : selectedCustomerData.locationType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info - Notion-style property rows */}
                  <div className="px-6 space-y-0.5">
                    {/* Email Row */}
                    <div
                      className="flex items-center py-2 -mx-2 px-2 rounded cursor-pointer hover:bg-[#f8f8f7] transition-colors"
                      onClick={() => {
                        if (editingField !== 'email') {
                          setEditingField('email');
                          updateEditingValue(selectedCustomerData.customerEmail || '');
                        }
                      }}
                    >
                      <div className="w-24 flex items-center gap-2" style={{ color: '#9e9d92' }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span className="text-xs">Email</span>
                      </div>
                      {editingField === 'email' ? (
                        <input
                          type="email"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => updateEditingValue(e.target.value)}
                          onBlur={() => handleInlineFieldSave('email', editingValueRef.current)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') { setEditingField(null); } }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm flex-1 bg-transparent outline-none border-none p-0 m-0"
                          style={{ color: '#2B2B26', caretColor: '#FF3700' }}
                          placeholder="Add email..."
                        />
                      ) : (
                        <span className="text-sm" style={{ color: selectedCustomerData.customerEmail ? '#2B2B26' : '#9e9d92' }}>
                          {selectedCustomerData.customerEmail || 'Add email...'}
                        </span>
                      )}
                    </div>

                    {/* Phone Row */}
                    <div
                      className="flex items-center py-2 -mx-2 px-2 rounded cursor-pointer hover:bg-[#f8f8f7] transition-colors"
                      onClick={() => {
                        if (editingField !== 'phone') {
                          setEditingField('phone');
                          const raw = selectedCustomerData.customerPhone || '';
                          const digits = raw.replace(/\D/g, '').slice(-10);
                          updateEditingValue(digits ? formatPhoneNumber(digits) : '');
                        }
                      }}
                    >
                      <div className="w-24 flex items-center gap-2" style={{ color: '#9e9d92' }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                        <span className="text-xs">Phone</span>
                      </div>
                      {editingField === 'phone' ? (
                        <input
                          type="tel"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => updateEditingValue(formatPhoneNumber(e.target.value))}
                          onBlur={() => handleInlineFieldSave('phone', editingValueRef.current)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } if (e.key === 'Escape') { setEditingField(null); } }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm flex-1 bg-transparent outline-none border-none p-0 m-0"
                          style={{ color: '#2B2B26', caretColor: '#FF3700' }}
                          placeholder="(---) --- ----"
                          maxLength={16}
                        />
                      ) : (
                        <span className="text-sm" style={{ color: selectedCustomerData.customerPhone ? '#2B2B26' : '#9e9d92' }}>
                          {selectedCustomerData.customerPhone ? formatPhoneDisplay(selectedCustomerData.customerPhone) : 'Add phone...'}
                        </span>
                      )}
                    </div>

                    {/* Address Row */}
                    <div
                      className="flex items-center py-2 -mx-2 px-2 rounded cursor-pointer hover:bg-[#f8f8f7] transition-colors"
                      onClick={() => {
                        if (editingField !== 'address') {
                          setEditingField('address');
                          updateEditingValue(selectedCustomerData.address || '');
                        }
                      }}
                    >
                      <div className="w-24 flex items-center gap-2" style={{ color: '#9e9d92' }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                        </svg>
                        <span className="text-xs">Address</span>
                      </div>
                      {editingField === 'address' ? (
                        <AddressAutocompleteInput
                          autoFocus
                          value={editingValue}
                          onChange={(val) => updateEditingValue(val)}
                          onPlaceSelected={(address) => {
                            addressPlaceSelectedRef.current = true;
                            addressSaveInProgressRef.current = true;
                            updateEditingValue(address);
                            handleInlineFieldSave('address', address).finally(() => {
                              addressSaveInProgressRef.current = false;
                            });
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              if (addressPlaceSelectedRef.current) {
                                addressPlaceSelectedRef.current = false;
                                return;
                              }
                              if (addressSaveInProgressRef.current) return;
                              handleInlineFieldSave('address', editingValueRef.current);
                            }, 250);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addressPlaceSelectedRef.current = true;
                              handleInlineFieldSave('address', editingValueRef.current);
                            }
                            if (e.key === 'Escape') { setEditingField(null); }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm flex-1 bg-transparent outline-none border-none p-0 m-0"
                          style={{ color: '#2B2B26', caretColor: '#FF3700' }}
                          placeholder="Add address..."
                        />
                      ) : (
                        <span className="text-sm" style={{ color: selectedCustomerData.address ? '#2B2B26' : '#9e9d92' }}>
                          {selectedCustomerData.address || 'Add address...'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F0F0EE] mx-6 my-4" />

                  {/* Vehicles */}
                  <div className="px-6 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: '#9e9d92' }}>Vehicles</span>
                      <div className="relative" ref={vehiclePopupRef}>
                        <button
                          onClick={() => {
                            const next = !showVehicleSearch;
                            setShowVehicleSearch(next);
                            setHoveredBrand(null);
                            setVehicleSearchQuery('');
                          }}
                          className="text-xs hover:text-[#FF3700] transition-colors flex items-center gap-0.5"
                          style={{ color: '#9e9d92' }}
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                        {showVehicleSearch && (
                          <div
                            className="absolute top-full right-0 mt-1 bg-white border border-[#deded9] rounded-lg shadow-lg z-50 transition-all duration-200"
                            style={{ width: activeVehicleBrand ? '320px' : '220px' }}
                          >
                            <div className="p-2 border-b border-[#F0F0EE]">
                              <input
                                type="text"
                                value={vehicleSearchQuery}
                                onChange={(e) => setVehicleSearchQuery(e.target.value)}
                                placeholder="Search make or model..."
                                className="w-full px-2 py-1.5 text-xs border border-[#deded9] rounded-md outline-none focus:border-[#9e9d92]"
                              />
                            </div>
                            <div className="flex">
                              <div className="w-44 max-h-56 overflow-y-auto border-r border-[#F0F0EE]">
                                {filteredVehicleBrands.map((brand) => (
                                  <button
                                    key={brand}
                                    onMouseEnter={() => setHoveredBrand(brand)}
                                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                                      activeVehicleBrand === brand ? 'bg-[#f8f8f7]' : 'hover:bg-[#f8f8f7]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 w-5 bg-white rounded flex items-center justify-center overflow-hidden">
                                        <ManufacturerLogo manufacturerName={brand} className="h-4 w-4" alt={brand} />
                                      </div>
                                      <span>{brand}</span>
                                    </div>
                                    <svg className="h-3 w-3" style={{ color: '#9e9d92' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                  </button>
                                ))}
                                {filteredVehicleBrands.length === 0 && (
                                  <p className="px-3 py-2 text-xs text-[#9e9d92]">No brands found</p>
                                )}
                              </div>
                              {activeVehicleBrand && (
                                <div className="w-[140px] max-h-56 overflow-y-auto">
                                  {filteredVehicleModels.map((model: string) => (
                                    <button
                                      key={model}
                                      onClick={() => {
                                        handleAddVehicle(model);
                                        setShowVehicleSearch(false);
                                        setHoveredBrand(null);
                                        setVehicleSearchQuery('');
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-[#f8f8f7] transition-colors"
                                    >
                                      {model}
                                    </button>
                                  ))}
                                  {filteredVehicleModels.length === 0 && (
                                    <p className="px-3 py-2 text-xs text-[#9e9d92]">No models found</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const vehicles = getCustomerVehicles(selectedCustomerData);
                        if (vehicles.length === 0) {
                          return <p className="text-xs italic" style={{ color: '#9e9d92' }}>No vehicles added</p>;
                        }
                        return vehicles.map((v, i) => {
                          const brand = getBrandForModel(v);
                          return (
                            <div key={i} className="bg-[#f8f8f7] px-2.5 py-1.5 rounded flex items-center gap-2 relative group">
                              {vehicles.length > 1 && (
                                <button
                                  onClick={() => handleRemoveVehicle(i)}
                                  className="absolute -top-1 -right-1 p-0.5 bg-white rounded-full border border-[#deded9] opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                                  style={{ color: '#9e9d92' }}
                                >
                                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                              <div className="h-5 w-5 bg-white rounded flex items-center justify-center overflow-hidden">
                                {brand ? (
                                  <ManufacturerLogo manufacturerName={brand} className="h-4 w-4" alt={brand} />
                                ) : (
                                  <span className="text-[10px] text-[#9e9d92]">C</span>
                                )}
                              </div>
                              <span className="text-sm" style={{ color: '#2B2B26' }}>{v}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F0F0EE] mx-6 my-4" />

                  {/* Notes */}
                  <div className="px-6 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: '#9e9d92' }}>Customer Notes</span>
                      <button
                        onClick={() => { setIsAddingNote(true); setNewNoteText(''); }}
                        className="text-xs hover:text-[#FF3700] transition-colors"
                        style={{ color: '#9e9d92' }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {isAddingNote && (
                        <div className="bg-white rounded-lg border border-[#166BFF] p-3">
                          <textarea
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            placeholder="Write a note..."
                            className="w-full text-sm leading-relaxed outline-none resize-none min-h-[60px] bg-transparent"
                            style={{ color: '#2B2B26' }}
                            autoFocus
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => { setIsAddingNote(false); setNewNoteText(''); }}
                              className="px-2.5 py-1 text-xs rounded transition-colors hover:bg-[#f8f8f7]"
                              style={{ color: '#6b6a5e' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddNote(newNoteText)}
                              className="px-2.5 py-1 text-xs text-white rounded transition-colors"
                              style={{ backgroundColor: '#2B2B26' }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                      {(() => {
                        const notes = getCustomerNotes(selectedCustomerData);
                        if (notes.length === 0 && !isAddingNote) {
                          return <p className="text-xs italic" style={{ color: '#9e9d92' }}>No notes added</p>;
                        }
                        return notes.map((note) => (
                          <div
                            key={note.id}
                            className={`p-3 rounded-lg relative group ${
                              editingNoteId === note.id
                                ? 'bg-white border border-[#166BFF]'
                                : 'bg-[#f8f8f7] hover:bg-[#f8f8f7]'
                            }`}
                          >
                            {editingNoteId === note.id ? (
                              <>
                                <textarea
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  className="w-full text-sm leading-relaxed outline-none resize-none min-h-[60px] bg-transparent"
                                  style={{ color: '#2B2B26' }}
                                  autoFocus
                                  rows={3}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    onClick={() => { setEditingNoteId(null); setEditingNoteText(''); }}
                                    className="px-2.5 py-1 text-xs rounded transition-colors hover:bg-[#f8f8f7]"
                                    style={{ color: '#6b6a5e' }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEditNote(note.id, editingNoteText)}
                                    className="px-2.5 py-1 text-xs text-white rounded transition-colors"
                                    style={{ backgroundColor: '#2B2B26' }}
                                  >
                                    Save
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); }}
                                    className="p-1 transition-colors hover:text-[#2B2B26]"
                                    style={{ color: '#9e9d92' }}
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleRemoveNote(note.id)}
                                    className="p-1 transition-colors hover:text-red-500"
                                    style={{ color: '#9e9d92' }}
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                  </button>
                                </div>
                                <p className="text-sm leading-relaxed pr-12" style={{ color: '#2B2B26' }}>{note.text}</p>
                                <p className="text-xs mt-1.5" style={{ color: '#9e9d92' }}>
                                  {(() => { try { return format(new Date(note.createdAt), 'MMM d, yyyy'); } catch { return ''; } })()}
                                </p>
                              </>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F0F0EE] mx-6 my-4" />

                  {/* Job History - Card style */}
                  <div className="px-6 mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-wider block mb-3" style={{ color: '#9e9d92' }}>
                      Job History
                    </span>
                    <div className="space-y-3">
                      {customerPastJobs && customerPastJobs.length > 0 ? (
                        customerPastJobs.map((job, index) => {
                          const serviceName = job.services && job.services.length > 0
                            ? (Array.isArray(job.services) ? job.services.join(', ') : job.services)
                            : 'Service';
                          const initials = job.employeeName
                            ? job.employeeName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 1)
                            : '?';
                          return (
                            <div
                              key={job.id || index}
                              className="bg-white border border-[#E8E8E6] rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
                              onClick={() => {
                                setSelectedJob(job);
                                setIsJobModalOpen(true);
                              }}
                            >
                              {/* Header: service name + upcoming badge or date */}
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="text-[15px] font-semibold" style={{ color: '#2B2B26' }}>{serviceName}</h4>
                                {job.isUpcoming ? (
                                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
                                    Upcoming
                                  </span>
                                ) : (
                                  <span className="text-xs flex-shrink-0 ml-3" style={{ color: '#9e9d92' }}>
                                    {(() => {
                                      try {
                                        return format(new Date(job.date), 'MMM d, yyyy');
                                      } catch { return ''; }
                                    })()}
                                  </span>
                                )}
                              </div>
                              {/* Date line */}
                              <p className="text-xs mb-3" style={{ color: '#6b6a5e' }}>
                                {formatJobDateTime(job.date, job.time)}
                              </p>

                              {/* Price */}
                              {job.totalPrice != null && job.totalPrice > 0 && (
                                <div className="mb-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9e9d92' }}>Price</p>
                                  <p className="text-base font-bold" style={{ color: '#2B2B26' }}>${job.totalPrice}</p>
                                </div>
                              )}

                              {/* Duration */}
                              {job.duration != null && job.duration > 0 && (
                                <div className="mb-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9e9d92' }}>Duration</p>
                                  <p className="text-sm font-medium" style={{ color: '#2B2B26' }}>{formatDuration(job.duration)}</p>
                                </div>
                              )}

                              {/* Technician */}
                              {job.employeeName && (
                                <div className="mb-2.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9e9d92' }}>Technician</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: '#EAB308' }}>
                                      {initials}
                                    </div>
                                    <span className="text-sm" style={{ color: '#2B2B26' }}>{job.employeeName}</span>
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              {job.notes && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9e9d92' }}>Notes</p>
                                  <p className="text-sm italic" style={{ color: '#6b6a5e' }}>{job.notes}</p>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs italic" style={{ color: '#9e9d92' }}>No past jobs yet</p>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-[#F0F0EE] mx-6 my-4" />

                  {/* Activity */}
                  <div className="px-6 pb-6">
                    <span className="text-xs font-medium block mb-3" style={{ color: '#9e9d92' }}>Activity</span>
                    <div className="space-y-3">
                      {(() => {
                        // Generate activity from past jobs
                        if (!customerPastJobs || customerPastJobs.length === 0) {
                          return <p className="text-xs italic" style={{ color: '#9e9d92' }}>No activity yet</p>;
                        }
                        return customerPastJobs.map((job, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#FF3700' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm" style={{ color: '#2B2B26' }}>
                                <span className="font-medium">
                                  {job.isUpcoming ? 'Booked' : 'Completed'}
                                </span>
                                <span style={{ color: '#6b6a5e' }}>
                                  {' — '}
                                  {job.services && job.services.length > 0
                                    ? (Array.isArray(job.services) ? job.services.join(', ') : job.services)
                                    : 'Service'}
                                </span>
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: '#9e9d92' }}>
                                {formatJobDateTime(job.date, job.time)}
                              </p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Fixed buttons at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-[#F0F0EE] flex gap-2">
                <button
                  onClick={() => {
                    setIsActionSidebarOpen(false);
                    setSelectedCustomerData(null);
                    router.push('/detailer-dashboard/calendar');
                  }}
                  className="flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#FF3700' }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = '#E63200'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = '#FF3700'; }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  Book Service
                </button>
                <button
                  onClick={async () => {
                    if (!selectedCustomerData?.id) return;
                    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
                    try {
                      const res = await fetch(`/api/detailer/customers/${selectedCustomerData.id}`, { method: 'DELETE' });
                      if (!res.ok) throw new Error('Failed to delete');
                      setIsActionSidebarOpen(false);
                      setSelectedCustomerData(null);
                      setCustomers(prev => prev.filter(c => c.id !== selectedCustomerData.id));
                    } catch (err) {
                      console.error('Delete failed:', err);
                      alert('Failed to delete customer. Please try again.');
                    }
                  }}
                  className="py-2.5 px-3 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                  title="Delete customer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      
    </div>
  );
}
