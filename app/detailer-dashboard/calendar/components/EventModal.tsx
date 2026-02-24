"use client";
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckIcon, PencilIcon, Bars3Icon } from '@heroicons/react/24/solid';
import { Clock, User, Search, Plus, X, ChevronDown, ChevronLeft, ChevronRight, Check, Calendar as CalendarIconLucide, MapPin, CreditCard, MessageSquare, Info } from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { format, parseISO, startOfMonth, getDay, getDaysInMonth, addMonths, subMonths, isToday, isSameDay } from 'date-fns';
import AddressAutocompleteInput from './AddressAutocompleteInput';
import { getCustomerTypeFromHistory } from '@/lib/customerType';
import { normalizeToE164 } from '@/lib/phone';
import VehicleChip from '@/app/components/vehicle/VehicleChip';
import VehiclePickerPopover from '@/app/components/vehicle/VehiclePickerPopover';

// Discard Changes Modal Component
const DiscardChangesModal = ({ 
  isOpen, 
  onKeepEditing, 
  onDiscard,
  isCreating = false 
}: { 
  isOpen: boolean; 
  onKeepEditing: () => void; 
  onDiscard: () => void;
  isCreating?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[300]">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isCreating ? 'Discard this event?' : 'Discard changes?'}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            You have unsaved changes. Updates will be lost.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onKeepEditing}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Keep editing
            </button>
            <button
              onClick={onDiscard}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              Discard event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Removed colorOptions - now using employees

type EventModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAddEvent?: (event: any) => void;
    onUpdateEvent?: (event: any) => void;
    editingEvent?: any | null;
    preSelectedResource?: { id: string; name: string; type: 'bay' | 'van' } | null;
    resources?: Array<{ id: string; name: string; type: 'bay' | 'van' }>;
    draftEvent?: { resourceId: string; startTime: string; endTime: string } | null;
    onOpenNewCustomerModal?: (initialName: string) => void;
    onOpenEditCustomerModal?: (customer: { customerName: string; customerPhone: string; customerAddress?: string; customerType?: string }) => void;
    newCustomerData?: { customerName: string; customerPhone: string; customerEmail?: string; address?: string; customerType?: string } | null;
    onRequestClose?: () => void; // Called when modal wants to close (checks for dirty state)
    renderMode?: 'panel' | 'drawer';
    showHeader?: boolean;
    showCloseButton?: boolean;
};

export default function EventModal({ isOpen, onClose, onAddEvent, onUpdateEvent, editingEvent = null, preSelectedResource, resources = [], draftEvent, onOpenNewCustomerModal, onOpenEditCustomerModal, newCustomerData, onRequestClose, renderMode = 'panel', showHeader = true, showCloseButton = true }: EventModalProps) {
    const { data: session } = useSession();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [employees, setEmployees] = useState<Array<{ id: string; name: string; color: string }>>([]);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [isBlockTime, setIsBlockTime] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false); // Default to timed events
    const [isMultiDay, setIsMultiDay] = useState(false); // Default to single-day events
    const [selectedResourceId, setSelectedResourceId] = useState<string>(preSelectedResource?.id || '');
    const [businessHours, setBusinessHours] = useState<any>(null);
    const [customers, setCustomers] = useState<Array<{ id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; services?: string[]; data?: any; completedServiceCount?: number; lastCompletedServiceAt?: string | null }>>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; pastJobs?: Array<{ id: string; date: string; services: string[]; vehicleModel?: string; employeeName?: string; eventNotes?: string }>; pastJobsTotal?: number; completedServiceCount?: number; lastCompletedServiceAt?: string | null } | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDetailsPopup, setShowCustomerDetailsPopup] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [locationType, setLocationType] = useState('');
    const [customerType, setCustomerType] = useState('');
    const [vehicles, setVehicles] = useState<Array<{ id: string; model: string }>>([]);
    const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
    const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([]);
    const [availableBundles, setAvailableBundles] = useState<Array<{ id: string; name: string; description?: string; price?: number; services?: Array<{ service: { id: string; name: string } }> }>>([]);
    const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; type: 'service' | 'bundle' }>>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [description, setDescription] = useState(''); // Event-specific notes
    const [customerNotes, setCustomerNotes] = useState(''); // Customer notes (persistent across jobs)
    const [isPaid, setIsPaid] = useState(true); // Payment status toggle - defaults to paid
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
    const customerCardRef = React.useRef<HTMLDivElement>(null);
    const customerDetailsPopupRef = React.useRef<HTMLDivElement>(null);
    const [popupPosition, setPopupPosition] = useState<{ top: number; right: number } | null>(null);
    const customerPopupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [startDatePickerMonth, setStartDatePickerMonth] = useState(new Date());
    const [endDatePickerMonth, setEndDatePickerMonth] = useState(new Date());
    const startDatePickerRef = useRef<HTMLDivElement>(null);
    const endDatePickerRef = useRef<HTMLDivElement>(null);

    const parseJobDate = (value: unknown) => {
        if (!value) return null;
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }
        if (typeof value === 'string') {
            const isoParsed = parseISO(value);
            if (!Number.isNaN(isoParsed.getTime())) return isoParsed;
            const fallback = new Date(value);
            if (!Number.isNaN(fallback.getTime())) return fallback;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                const dateOnly = new Date(`${value}T00:00:00`);
                return Number.isNaN(dateOnly.getTime()) ? null : dateOnly;
            }
        }
        return null;
    };
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (customerPopupTimeoutRef.current) {
                clearTimeout(customerPopupTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showStartDatePicker && startDatePickerRef.current && !startDatePickerRef.current.contains(e.target as Node)) {
                setShowStartDatePicker(false);
            }
            if (showEndDatePicker && endDatePickerRef.current && !endDatePickerRef.current.contains(e.target as Node)) {
                setShowEndDatePicker(false);
            }
        };
        if (showStartDatePicker || showEndDatePicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showStartDatePicker, showEndDatePicker]);
    
    // Store initial values to detect changes (empty form initially)
    const initialValuesRef = useRef({
      selectedEmployeeId: '',
      isBlockTime: false,
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      isAllDay: false,
      isMultiDay: false,
      selectedResourceId: preSelectedResource?.id || '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      locationType: '',
      customerType: '',
      vehicles: [] as Array<{ id: string; model: string }>,
      selectedServices: [] as Array<{ id: string; name: string; type: 'service' | 'bundle' }>,
      description: '',
      customerNotes: '',
      isPaid: true
    });

    // Check if form has been modified
    const checkIfDirty = () => {
      const current = {
        selectedEmployeeId,
        isBlockTime,
        startDate,
        endDate,
        startTime,
        endTime,
        isAllDay,
        isMultiDay,
        selectedResourceId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        locationType,
        customerType,
        vehicles: vehicles.map(v => v.model).sort().join(','),
        selectedServices: selectedServices.map(s => s.name).sort().join(','),
        description,
        customerNotes,
        isPaid
      };

      const initial = {
        selectedEmployeeId: initialValuesRef.current.selectedEmployeeId,
        isBlockTime: initialValuesRef.current.isBlockTime,
        startDate: initialValuesRef.current.startDate,
        endDate: initialValuesRef.current.endDate,
        startTime: initialValuesRef.current.startTime,
        endTime: initialValuesRef.current.endTime,
        isAllDay: initialValuesRef.current.isAllDay,
        isMultiDay: initialValuesRef.current.isMultiDay,
        selectedResourceId: initialValuesRef.current.selectedResourceId,
        customerName: initialValuesRef.current.customerName,
        customerPhone: initialValuesRef.current.customerPhone,
        customerEmail: initialValuesRef.current.customerEmail,
        customerAddress: initialValuesRef.current.customerAddress,
        locationType: initialValuesRef.current.locationType,
        customerType: initialValuesRef.current.customerType,
        vehicles: initialValuesRef.current.vehicles.map(v => v.model).sort().join(','),
        selectedServices: initialValuesRef.current.selectedServices.map(s => s.name).sort().join(','),
        description: initialValuesRef.current.description,
        customerNotes: initialValuesRef.current.customerNotes,
        isPaid: initialValuesRef.current.isPaid
      };

      return JSON.stringify(current) !== JSON.stringify(initial);
    };

    // Handle close with dirty check
    const handleClose = () => {
      if (checkIfDirty()) {
        if (onRequestClose) {
          onRequestClose();
        } else {
          onClose();
        }
      } else {
        onClose();
      }
    };

    // Reset form when modal closes
    useEffect(() => {
      if (!isOpen) {
        // Reset all form fields
        setSelectedEmployeeId('');
        setIsBlockTime(false);
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setIsAllDay(false);
        setIsMultiDay(false);
        setIsBlockTime(false);
        setSelectedResourceId(preSelectedResource?.id || '');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setLocationType('');
        setCustomerType('');
        setVehicles([]);
        setSelectedServices([]);
        setDescription('');
        setCustomerNotes('');
        setIsPaid(true);
        setSelectedCustomer(null);
        setCustomerSearch('');
        
        // Reset initial values
        initialValuesRef.current = {
          selectedEmployeeId: '',
          isBlockTime: false,
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: '',
          isAllDay: false,
          isMultiDay: false,
          selectedResourceId: preSelectedResource?.id || '',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          customerAddress: '',
          locationType: '',
          customerType: '',
          vehicles: [],
          selectedServices: [],
          description: '',
          customerNotes: '',
          isPaid: true
        };
      }
    }, [isOpen, preSelectedResource]);
    
    // Auto-generate title from selected services and bundles
    const title = selectedServices.map(s => s.name).join(', ') || '';
    
    // Filter customers based on typed search
    const filteredCustomers = customerSearch.trim()
        ? customers.filter(customer => {
            const name = (customer.customerName || '').toLowerCase();
            const phone = (customer.customerPhone || '').toLowerCase();
            const searchTerm = customerSearch.toLowerCase();
            return name.includes(searchTerm) || phone.includes(searchTerm);
        })
        : [];
    
    // Check if we should show "Add new customer" option
    // Show it if user has typed something and there are no exact matches, or always show it as last option
    const showAddNewCustomer = customerSearch.trim().length > 0;
    const totalSuggestions = filteredCustomers.length + (showAddNewCustomer ? 1 : 0);
    
    // Generate half-hour time options (12:00 AM to 11:30 PM)
    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute of [0, 30]) {
                const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                let hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const period = hour < 12 ? 'AM' : 'PM';
                const time12 = `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
                options.push({ value: time24, label: time12 });
            }
        }
        return options;
    };
    
    const timeOptions = generateTimeOptions();

    // Fetch employees and customers when modal opens
    useEffect(() => {
        if (isOpen) {
            // Fetch employees
            fetch('/api/detailer/employees')
                .then(res => res.json())
                .then(data => {
                    if (data.employees) {
                        setEmployees(data.employees.filter((e: any) => e.isActive));
                    }
                })
                .catch(err => console.error('Error fetching employees:', err));
            
            // Fetch customers
            fetch('/api/detailer/customers')
                .then(res => res.json())
                .then(data => {
                    if (data.customers) {
                        setCustomers(data.customers);
                    }
                })
                .catch(err => console.error('Error fetching customers:', err));
            
            // Fetch available services
            fetch('/api/detailer/services')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setAvailableServices(data);
                    }
                })
                .catch(err => console.error('Error fetching services:', err));
            
            // Fetch available bundles
            fetch('/api/detailer/bundles')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setAvailableBundles(data);
                    }
                })
                .catch(err => console.error('Error fetching bundles:', err));
        }
    }, [isOpen]);
    
    // Fetch customer's past bookings/jobs with employee/detailer information
    const fetchCustomerPastJobs = async (customerId: string, customerPhone: string) => {
        try {
            // Fetch calendar events which include both events and bookings with employee info
            const eventsResponse = await fetch('/api/detailer/calendar-events');
            if (eventsResponse.ok) {
                const eventsData = await eventsResponse.json();
                const allEvents = eventsData.events || [];
                const normalizedCustomerPhone = normalizeToE164(customerPhone) || customerPhone;
                const normalizedCustomerDigits = String(customerPhone || '').replace(/\D/g, '');
                const now = Date.now();
                
                // Filter events for this customer and get completed/confirmed ones
                const customerEvents = allEvents.filter((event: any) =>
                    (() => {
                        const eventPhone = event.customerPhone || '';
                        const normalizedEventPhone = normalizeToE164(eventPhone) || eventPhone;
                        if (normalizedCustomerPhone && normalizedEventPhone) {
                            return normalizedEventPhone === normalizedCustomerPhone;
                        }
                        const eventDigits = String(eventPhone).replace(/\D/g, '');
                        if (eventDigits && normalizedCustomerDigits && eventDigits === normalizedCustomerDigits) {
                            return true;
                        }
                        if (customerId) {
                            const eventCustomerId = event.customerId || event.customer?.id || event.customer?.customerId;
                            if (eventCustomerId && eventCustomerId === customerId) {
                                return true;
                            }
                        }
                        return false;
                    })() &&
                    (() => {
                        const status = String(event.status || '').toLowerCase();
                        if (status === 'cancelled' || status === 'canceled' || status === 'deleted') {
                            return false;
                        }
                        return true;
                    })() &&
                    (() => {
                        const end = event.end ? new Date(event.end).getTime() : null;
                        const start = event.start ? new Date(event.start).getTime() : null;
                        const candidate = end ?? start;
                        if (!candidate || Number.isNaN(candidate)) return false;
                        return candidate < now;
                    })()
                ).sort((a: any, b: any) => {
                    // Sort by date, most recent first
                    const dateA = new Date(a.start || a.date || 0).getTime();
                    const dateB = new Date(b.start || b.date || 0).getTime();
                    return dateB - dateA;
                });
                
                // Transform to match the expected format
                const jobs = customerEvents.map((event: any) => {
                    const startValue = event.start?.dateTime || event.start?.date || event.start;
                    const dateValue = startValue || event.end || event.date || event.scheduledDate || event.createdAt || event.updatedAt;
                    return {
                        id: event.id || event.bookingId,
                        date: dateValue,
                        services: event.services || (event.title ? [event.title] : []),
                        vehicleModel: event.vehicleModel || event.vehicleType,
                        employeeName: event.employeeName,
                        eventNotes: event.description || ''
                    };
                });
                return { jobs, totalCount: jobs.length };
            }
        } catch (error) {
            console.error('Error fetching customer bookings:', error);
        }
        return { jobs: [], totalCount: 0 };
    };

    // Handle customer selection from suggestions - show customer card
    const handleCustomerSelect = async (customer: { id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; services?: string[]; data?: any; completedServiceCount?: number; lastCompletedServiceAt?: string | null }) => {
        // Fetch past jobs for this customer
        const { jobs: pastJobs, totalCount: pastJobsTotal } = await fetchCustomerPastJobs(customer.id, customer.customerPhone);
        const computedCustomerType = customer.customerType
            ? customer.customerType.toLowerCase()
            : getCustomerTypeFromHistory({
                completedServiceCount: customer.completedServiceCount,
                lastCompletedServiceAt: customer.lastCompletedServiceAt,
                referenceDate: new Date()
              });
        
        // Set selected customer with past jobs
        setSelectedCustomer({
            id: customer.id,
            customerName: customer.customerName,
            customerPhone: customer.customerPhone,
            customerEmail: customer.customerEmail,
            address: customer.address,
            locationType: customer.locationType,
            customerType: computedCustomerType,
            vehicleModel: customer.vehicleModel,
            completedServiceCount: customer.completedServiceCount,
            lastCompletedServiceAt: customer.lastCompletedServiceAt,
            pastJobs: pastJobs.map((job: any) => ({
                id: job.id,
                date: job.date,
                services: Array.isArray(job.services) ? job.services : (job.services ? [job.services] : []),
                vehicleModel: job.vehicleModel,
                employeeName: job.employeeName,
                eventNotes: job.eventNotes || ''
            })),
            pastJobsTotal
        });
        
        // Also populate form fields for submission
        setCustomerName(customer.customerName || customer.customerPhone || '');
        setCustomerPhone(customer.customerPhone || '');
        setCustomerEmail(customer.customerEmail || '');
        setCustomerAddress(customer.address || '');
        setLocationType(customer.locationType || '');
        setCustomerType(computedCustomerType || '');
        
        // Populate customer notes from data.notes if available
        if (customer.data && typeof customer.data === 'object' && customer.data.notes) {
            setCustomerNotes(customer.data.notes || '');
        } else {
            setCustomerNotes('');
        }
        // Clear event-specific fields - each appointment starts fresh
        setDescription('');
        setSelectedServices([]);

        // Populate vehicles from customer's past jobs (unique models only)
        const uniqueVehicles = new Set<string>();
        pastJobs.forEach((job: any) => {
            if (job.vehicleModel) {
                job.vehicleModel.split(',').forEach((v: string) => {
                    const trimmed = v.trim();
                    if (trimmed) uniqueVehicles.add(trimmed);
                });
            }
        });
        if (uniqueVehicles.size > 0) {
            setVehicles(Array.from(uniqueVehicles).map((model, i) => ({ id: `vehicle-${Date.now()}-${i}`, model })));
        } else if (customer.vehicleModel) {
            // Fallback to snapshot if no past jobs have vehicle data
            const models = customer.vehicleModel.split(',').map((v: string) => v.trim()).filter(Boolean);
            setVehicles(models.map((model, i) => ({ id: `vehicle-${Date.now()}-${i}`, model })));
        } else {
            setVehicles([]);
        }
        
        // Clear search and hide suggestions
        setCustomerSearch('');
        setShowCustomerSuggestions(false);
        setSelectedCustomerIndex(-1);
    };
    
    // Handle clearing selected customer
    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setLocationType('');
        setCustomerType('');
        setVehicles([]);
        setSelectedServices([]);
        setServiceSearch('');
        setDescription('');
        setCustomerNotes('');
        setIsPaid(true);
    };
    
    // Handle "Add new customer" selection
    const handleAddNewCustomer = () => {
        // Close suggestions and open the new customer modal
        setShowCustomerSuggestions(false);
        setSelectedCustomerIndex(-1);
        if (onOpenNewCustomerModal) {
            onOpenNewCustomerModal(customerSearch);
        }
    };
    
    // Handle keyboard navigation in suggestions
    const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showCustomerSuggestions || totalSuggestions === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedCustomerIndex(prev => 
                prev < totalSuggestions - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedCustomerIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && selectedCustomerIndex >= 0) {
            e.preventDefault();
            // Check if "Add new customer" is selected (it's always the last item)
            if (selectedCustomerIndex === filteredCustomers.length) {
                handleAddNewCustomer();
            } else {
            handleCustomerSelect(filteredCustomers[selectedCustomerIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowCustomerSuggestions(false);
            setSelectedCustomerIndex(-1);
        }
    };

    const handleSubmit = async () => {
        if (!startDate) {
            alert('Please provide a start date.');
            return;
        }

        if (!isBlockTime && selectedServices.length === 0) {
            alert('Please select at least one service.');
            return;
        }

        // Resource is optional - no validation needed

        // For timed events, validate that times are provided
        if (!isAllDay && (!startTime || !endTime)) {
            alert('Please provide both start and end times for timed events.');
            return;
        }

        // For multi-day events, validate that end date is provided
        if (isMultiDay && !endDate) {
            alert('Please provide an end date for multi-day events.');
            return;
        }

        try {
            // Construct the start and end datetime strings
            let startDateTime = startDate;
            let endDateTime = isMultiDay ? (endDate || startDate) : startDate;
            let timeToStore = null;
            let startTimeToSend = null;
            let endTimeToSend = null;

            if (isAllDay && startTime && endTime) {
                // For all-day events with business hours, store the start time
                // The end time will be calculated on the backend
                startDateTime = `${startDate}T${startTime}`;
                endDateTime = `${startDate}T${endTime}`;
                timeToStore = startTime; // Store the business hours start time
            } else if (!isAllDay && startTime && endTime) {
                // For timed events, send times separately to avoid timezone issues
                // Construct datetime strings but also send times separately
                startDateTime = `${startDate}T${startTime}`;
                const endDateForTime = isMultiDay ? (endDate || startDate) : startDate;
                endDateTime = `${endDateForTime}T${endTime}`;
                // Store time as a range format for timed events
                const formatTo12Hour = (time24: string): string => {
                    if (!time24) return '';
                    const [hours, minutes] = time24.split(':').map(Number);
                    const period = hours >= 12 ? 'PM' : 'AM';
                    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
                };
                const startTime12 = formatTo12Hour(startTime);
                const endTime12 = formatTo12Hour(endTime);
                timeToStore = `${startTime12} to ${endTime12}`;
                startTimeToSend = startTime;
                endTimeToSend = endTime;
            }

            const payload = {
                title: isBlockTime
                    ? 'Blocked Time'
                    : (selectedServices.map(s => s.name).join(', ') || 'Untitled Event'),
                eventType: isBlockTime ? 'block' : 'appointment',
                employeeId: selectedEmployeeId || undefined,
                startDate: startDateTime,
                endDate: endDateTime,
                isAllDay,
                time: timeToStore, // Include time for all-day events with business hours, or time range for timed events
                startTime: startTimeToSend || undefined, // Send start time separately for timed events
                endTime: endTimeToSend || undefined, // Send end time separately for timed events
                description: description || '', // Event-specific notes
                customerNotes: isBlockTime ? undefined : (customerNotes || ''), // Customer notes (persistent)
                paid: isBlockTime ? undefined : isPaid, // Payment status
                resourceId: selectedResourceId || undefined,
                ...(isBlockTime
                    ? {}
                    : {
                          customerName: customerName || undefined,
                          customerPhone: customerPhone || undefined,
                          customerEmail: customerEmail || undefined,
                          customerAddress: customerAddress || undefined,
                          locationType: locationType || undefined,
                          customerType: customerType || undefined,
                          vehicleModel: vehicles.length > 0 ? vehicles.map(v => v.model).join(', ') : undefined,
                          vehicles: vehicles.length > 0 ? vehicles.map(v => v.model) : undefined,
                          services: selectedServices.length > 0 ? selectedServices.map(s => s.name) : undefined
                      })
            };

            const isEditing = !!editingEvent?.id;
            const response = await fetch(
                isEditing ? `/api/detailer/events/${editingEvent.id}` : '/api/detailer/events',
                {
                    method: isEditing ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (response.ok) {
                if (isEditing) {
                    const mergedEvent = {
                        ...(editingEvent || {}),
                        ...(result.event || {}),
                        ...payload,
                        id: editingEvent.id
                    };
                    onUpdateEvent?.(mergedEvent);
                    onClose();
                    return;
                }

                // Add to local state for immediate UI update
                const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
                onAddEvent?.({
                    id: `local-${Date.now()}`,
                    title: isBlockTime
                        ? 'Blocked Time'
                        : (selectedServices.map(s => s.name).join(', ') || 'Untitled Event'),
                    color: selectedEmployee?.color || 'blue',
                    employeeId: selectedEmployeeId,
                    date: new Date(startDate),
                    start: startDateTime,
                    end: endDateTime,
                    source: result.event.source || 'local',
                    allDay: isAllDay,
                    resourceId: selectedResourceId || undefined,
                    eventType: isBlockTime ? 'block' : 'appointment'
                });
                
                onClose(); // Close modal after adding
                // Reset form
                setSelectedEmployeeId('');
                setIsBlockTime(false);
                setStartDate('');
                setEndDate('');
                setStartTime('');
                setEndTime('');
                setIsAllDay(false); // Default to timed events
                setIsMultiDay(false); // Default to single-day events
                setSelectedResourceId(preSelectedResource?.id || '');
                setCustomerName('');
                setCustomerPhone('');
                setCustomerEmail('');
                setCustomerAddress('');
                setLocationType('');
                setVehicles([]);
                setSelectedServices([]);
                setServiceSearch('');
                setDescription('');
                setCustomerNotes('');
                setIsPaid(true);
                setShowCustomerSuggestions(false);
                setSelectedCustomerIndex(-1);
            } else {
                throw new Error(result.error || (isEditing ? 'Failed to update event' : 'Failed to create event'));
            }
        } catch (error) {
            console.error('Error saving event:', error);
            console.error('Failed to save event. Please try again.');
        }
    };
    
    // Fetch business hours when modal opens
    useEffect(() => {
        if (isOpen && session?.user?.id) {
            fetch('/api/detailer/profile')
                .then(res => res.json())
                .then(data => {
                    console.log('Fetched profile data:', data);
                    // API returns detailer object directly, not wrapped in profile
                    const businessHours = data.businessHours || data.profile?.businessHours;
                    if (businessHours) {
                        console.log('Business hours from API:', businessHours);
                        setBusinessHours(businessHours);
                    } else {
                        console.log('No business hours in profile data');
                    }
                })
                .catch(err => console.error('Error fetching business hours:', err));
        }
    }, [isOpen, session?.user?.id]);

    // Get day of week name from date string (YYYY-MM-DD)
    const getDayOfWeek = (dateString: string): string | null => {
        if (!dateString) return null;
        const date = new Date(dateString + 'T00:00:00');
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    };

    // Auto-populate times from business hours when all-day is checked and date is selected
    useEffect(() => {
        if (isAllDay && startDate && businessHours) {
            const dayOfWeek = getDayOfWeek(startDate);
            console.log('Looking for business hours:', { dayOfWeek, businessHours, startDate });
            
            if (dayOfWeek && businessHours[dayOfWeek]) {
                const dayHours = businessHours[dayOfWeek];
                console.log('Found hours for', dayOfWeek, ':', dayHours);
                
                // Handle both array format [open, close] and object format {open, close}
                let openTime: string | undefined;
                let closeTime: string | undefined;
                
                if (Array.isArray(dayHours) && dayHours.length >= 2) {
                    [openTime, closeTime] = dayHours;
                } else if (typeof dayHours === 'object' && dayHours !== null) {
                    openTime = (dayHours as any).open || (dayHours as any)[0];
                    closeTime = (dayHours as any).close || (dayHours as any)[1];
                }
                
                if (openTime && closeTime) {
                    // Convert to HH:MM format if needed (business hours might be in different format)
                    const formatTime = (time: string): string => {
                        if (!time) return '';
                        // If already in HH:MM format, return as is
                        if (time.match(/^\d{2}:\d{2}$/)) {
                            return time;
                        }
                        // Try to parse other formats (e.g., "09:00 AM" -> "09:00")
                        const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
                        if (timeMatch) {
                            const hours = timeMatch[1].padStart(2, '0');
                            const minutes = timeMatch[2];
                            return `${hours}:${minutes}`;
                        }
                        return time;
                    };
                    const formattedStart = formatTime(openTime);
                    const formattedEnd = formatTime(closeTime);
                    console.log('Setting times:', { formattedStart, formattedEnd });
                    setStartTime(formattedStart);
                    setEndTime(formattedEnd);
                } else {
                    console.log('No valid times found, clearing:', { openTime, closeTime });
                    // Clear times if day has no valid hours
                    setStartTime('');
                    setEndTime('');
                }
            } else {
                console.log('No business hours found for day, clearing times:', dayOfWeek);
                // Clear times if no business hours for this day
                setStartTime('');
                setEndTime('');
            }
        } else if (isAllDay && startDate && !businessHours) {
            // If business hours haven't loaded yet, clear times
            setStartTime('');
            setEndTime('');
        } else if (!isAllDay) {
            // When all-day is unchecked, don't auto-clear times (user might have set them manually)
            // Only clear if they were auto-populated from business hours
        }
    }, [isAllDay, startDate, businessHours]);
    
    // Update selectedResourceId when preSelectedResource changes
    React.useEffect(() => {
        if (preSelectedResource) {
            setSelectedResourceId(preSelectedResource.id);
        }
    }, [preSelectedResource]);
    
    // Pre-fill form when draftEvent is provided
    React.useEffect(() => {
        if (isOpen && draftEvent) {
            const start = new Date(draftEvent.startTime);
            const end = new Date(draftEvent.endTime);
            
            // Set date
            const dateStr = format(start, 'yyyy-MM-dd');
            setStartDate(dateStr);
            
            // Set times
            const startTimeStr = format(start, 'HH:mm');
            const endTimeStr = format(end, 'HH:mm');
            setStartTime(startTimeStr);
            setEndTime(endTimeStr);
            
            // Set resource
            setSelectedResourceId(draftEvent.resourceId);
            
            // Ensure it's not all-day
            setIsAllDay(false);
            setIsMultiDay(false);
            setIsBlockTime(false);
            
            // Update initial values after state is set
            setTimeout(() => {
                initialValuesRef.current = {
                    selectedEmployeeId: '',
                    isBlockTime: false,
                    startDate: dateStr,
                    endDate: '',
                    startTime: startTimeStr,
                    endTime: endTimeStr,
                    isAllDay: false,
                    isMultiDay: false,
                    selectedResourceId: draftEvent.resourceId,
                    customerName: '',
                    customerPhone: '',
                    customerEmail: '',
                    customerAddress: '',
                    locationType: '',
                    customerType: '',
                    vehicles: [],
                    selectedServices: [],
                    description: '',
                    customerNotes: '',
                    isPaid: true
                };
            }, 50);
        }
    }, [isOpen, draftEvent]);

    // Pre-fill form for editing existing events
    React.useEffect(() => {
        if (!isOpen || !editingEvent) return;

        const isEditingBlock = editingEvent.eventType === 'block';
        const eventStart = editingEvent.start || editingEvent.date || '';
        const eventEnd = editingEvent.end || editingEvent.start || editingEvent.date || '';

        const startDateObj = eventStart ? new Date(eventStart) : null;
        const endDateObj = eventEnd ? new Date(eventEnd) : null;
        const safeStartDate = startDateObj && !Number.isNaN(startDateObj.getTime()) ? format(startDateObj, 'yyyy-MM-dd') : '';
        const safeEndDate = endDateObj && !Number.isNaN(endDateObj.getTime()) ? format(endDateObj, 'yyyy-MM-dd') : '';
        const safeStartTime = startDateObj && !Number.isNaN(startDateObj.getTime()) ? format(startDateObj, 'HH:mm') : '';
        const safeEndTime = endDateObj && !Number.isNaN(endDateObj.getTime()) ? format(endDateObj, 'HH:mm') : '';

        setIsBlockTime(isEditingBlock);
        setSelectedEmployeeId(editingEvent.employeeId || '');
        setStartDate(safeStartDate);
        setEndDate(safeEndDate);
        setStartTime(safeStartTime);
        setEndTime(safeEndTime);
        setIsAllDay(!!editingEvent.allDay);
        setIsMultiDay(!!(safeStartDate && safeEndDate && safeStartDate !== safeEndDate));
        setSelectedResourceId(editingEvent.resourceId || preSelectedResource?.id || '');

        setCustomerName(editingEvent.customerName || '');
        setCustomerPhone(editingEvent.customerPhone || '');
        setCustomerEmail(editingEvent.customerEmail || '');
        setCustomerAddress(editingEvent.customerAddress || '');
        setLocationType(editingEvent.locationType || '');
        setCustomerType(editingEvent.customerType || '');
        setDescription(editingEvent.description || '');
        setCustomerNotes(editingEvent.customerNotes || '');
        setIsPaid(editingEvent.paid === true);

        const eventVehicleModels = Array.isArray(editingEvent.vehicles)
            ? editingEvent.vehicles
            : (editingEvent.vehicleModel ? String(editingEvent.vehicleModel).split(',').map((v: string) => v.trim()).filter(Boolean) : []);
        setVehicles(eventVehicleModels.map((model: string, idx: number) => ({ id: `vehicle-${Date.now()}-${idx}`, model })));

        const eventServicesList = Array.isArray(editingEvent.services)
            ? editingEvent.services
            : (editingEvent.services ? [editingEvent.services] : []);
        const mappedServices = eventServicesList
            .map((serviceName: string) => {
                const service = availableServices.find((s: { id: string; name: string }) => s.name === serviceName);
                if (service) return { id: service.id, name: service.name, type: 'service' as const };
                const bundle = availableBundles.find((b: { id: string; name: string }) => b.name === serviceName);
                if (bundle) return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                return { id: `temp-${serviceName}`, name: serviceName, type: 'service' as const };
            });
        setSelectedServices(mappedServices);

        if (!isEditingBlock && (editingEvent.customerName || editingEvent.customerPhone)) {
            setSelectedCustomer({
                id: editingEvent.customerId || `event-customer-${editingEvent.id || Date.now()}`,
                customerName: editingEvent.customerName || '',
                customerPhone: editingEvent.customerPhone || '',
                customerEmail: editingEvent.customerEmail || '',
                address: editingEvent.customerAddress || '',
                locationType: editingEvent.locationType || '',
                customerType: editingEvent.customerType || ''
            });
        } else {
            setSelectedCustomer(null);
        }

        initialValuesRef.current = {
            selectedEmployeeId: editingEvent.employeeId || '',
            isBlockTime: isEditingBlock,
            startDate: safeStartDate,
            endDate: safeEndDate,
            startTime: safeStartTime,
            endTime: safeEndTime,
            isAllDay: !!editingEvent.allDay,
            isMultiDay: !!(safeStartDate && safeEndDate && safeStartDate !== safeEndDate),
            selectedResourceId: editingEvent.resourceId || preSelectedResource?.id || '',
            customerName: editingEvent.customerName || '',
            customerPhone: editingEvent.customerPhone || '',
            customerEmail: editingEvent.customerEmail || '',
            customerAddress: editingEvent.customerAddress || '',
            locationType: editingEvent.locationType || '',
            customerType: editingEvent.customerType || '',
            vehicles: eventVehicleModels.map((model: string, idx: number) => ({ id: `vehicle-init-${idx}`, model })),
            selectedServices: mappedServices,
            description: editingEvent.description || '',
            customerNotes: editingEvent.customerNotes || '',
            isPaid: editingEvent.paid === true
        };
    }, [isOpen, editingEvent, preSelectedResource?.id, availableServices, availableBundles]);
    
    // Populate form when new customer is created or existing customer is edited
    React.useEffect(() => {
        if (isOpen && newCustomerData) {
            // Check if we're editing an existing customer (selectedCustomer exists and phone matches)
            const existingNormalized = selectedCustomer?.customerPhone ? (normalizeToE164(selectedCustomer.customerPhone) || selectedCustomer.customerPhone.replace(/\D/g, '')) : '';
            const newNormalized = newCustomerData.customerPhone ? (normalizeToE164(newCustomerData.customerPhone) || newCustomerData.customerPhone.replace(/\D/g, '')) : '';
            const isEditingExisting = selectedCustomer && existingNormalized && newNormalized && existingNormalized === newNormalized;

            if (isEditingExisting) {
                // Update the selected customer with edited data, preserving history
                setSelectedCustomer({
                    ...selectedCustomer,
                    customerName: newCustomerData.customerName,
                    customerPhone: newCustomerData.customerPhone,
                    address: newCustomerData.address || selectedCustomer.address || '',
                    customerType: newCustomerData.customerType || selectedCustomer.customerType
                });
                
                // Update form fields
                setCustomerName(newCustomerData.customerName || '');
                setCustomerPhone(newCustomerData.customerPhone || '');
                setCustomerAddress(newCustomerData.address || selectedCustomer.address || '');
                if (newCustomerData.customerType !== undefined) {
                    setCustomerType(newCustomerData.customerType || '');
                }
                return; // Don't fetch from API, we already have the updated data
            }
            
            // For newly created customers, use the data directly and fetch full customer details
            // First, set the customer immediately with the data we have
            const tempCustomerId = `temp-${Date.now()}`;
            setSelectedCustomer({
                id: tempCustomerId,
                customerName: newCustomerData.customerName,
                customerPhone: newCustomerData.customerPhone,
                customerEmail: newCustomerData.customerEmail,
                address: newCustomerData.address,
                customerType: newCustomerData.customerType,
                pastJobs: []
            });
            
            // Populate form fields immediately
            setCustomerName(newCustomerData.customerName || '');
            setCustomerPhone(newCustomerData.customerPhone || '');
            setCustomerEmail(newCustomerData.customerEmail || '');
            setCustomerAddress(newCustomerData.address || '');
            setCustomerType(newCustomerData.customerType || '');
            setCustomerSearch(''); // Clear search to show customer card
            
            // Then fetch full customer details from API to get ID and other fields
            fetch('/api/detailer/customers')
                .then(res => res.json())
                .then(async (data) => {
                    if (data.customers) {
                        setCustomers(data.customers);
                        // Find and select the new customer
                        const newCustomer = data.customers.find((c: any) => 
                            c.customerPhone === newCustomerData.customerPhone
                        );
                        if (newCustomer) {
                            // Fetch past jobs and set selected customer with full details
                            const { jobs: pastJobs, totalCount: pastJobsTotal } = await fetchCustomerPastJobs(newCustomer.id, newCustomer.customerPhone);
                            setSelectedCustomer({
                                id: newCustomer.id,
                                customerName: newCustomer.customerName,
                                customerPhone: newCustomer.customerPhone,
                                customerEmail: newCustomer.customerEmail,
                                address: newCustomer.address,
                                locationType: newCustomer.locationType,
                                vehicleModel: newCustomer.vehicleModel,
                                pastJobs: pastJobs.map((job: any) => ({
                                    id: job.id,
                                    date: job.date,
                                    services: Array.isArray(job.services) ? job.services : (job.services ? [job.services] : []),
                                    vehicleModel: job.vehicleModel,
                                    employeeName: job.employeeName,
                                    eventNotes: job.eventNotes || ''
                                })),
                                pastJobsTotal
                            });
                            
                            // Update form fields with full customer data
                            setCustomerName(newCustomer.customerName || newCustomer.customerPhone || '');
                            setCustomerPhone(newCustomer.customerPhone || '');
                            setCustomerEmail(newCustomer.customerEmail || '');
                            setCustomerAddress(newCustomer.address || '');
                            setLocationType(newCustomer.locationType || '');
                            
                            // Populate customer notes from data.notes if available
                            if (newCustomer.data && typeof newCustomer.data === 'object' && newCustomer.data.notes) {
                                setCustomerNotes(newCustomer.data.notes || '');
                            } else {
                                setCustomerNotes('');
                            }
                            setDescription(''); // Clear event notes for new event
                            
                            // Set vehicles from customer's vehicleModel if available
                            if (newCustomer.vehicleModel) {
                                setVehicles([{ id: `vehicle-${Date.now()}`, model: newCustomer.vehicleModel }]);
                            } else {
                                setVehicles([]);
                            }
                            // Set selected services from new customer
                            if (newCustomer.services && Array.isArray(newCustomer.services)) {
                                const matchedItems = newCustomer.services
                                    .map((serviceName: string) => {
                                        // Check services first
                                        const service = availableServices.find((s: { id: string; name: string }) => s.name === serviceName);
                                        if (service) {
                                            return { id: service.id, name: service.name, type: 'service' as const };
                                        }
                                        // Check bundles
                                        const bundle = availableBundles.find((b: { id: string; name: string }) => b.name === serviceName);
                                        if (bundle) {
                                            return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                                        }
                                        return null;
                                    })
                                    .filter((s: { id: string; name: string; type: 'service' | 'bundle' } | null): s is { id: string; name: string; type: 'service' | 'bundle' } => s !== null);
                                setSelectedServices(matchedItems);
                            } else {
                                setSelectedServices([]);
                            }
                            
                            // Update initial values after state is set
                            setTimeout(() => {
                                const currentVehicles = newCustomer.vehicleModel ? [{ id: `vehicle-${Date.now()}`, model: newCustomer.vehicleModel }] : [];
                                const currentServices = newCustomer.services && Array.isArray(newCustomer.services) 
                                    ? newCustomer.services
                                        .map((serviceName: string) => {
                                            const service = availableServices.find((s: { id: string; name: string }) => s.name === serviceName);
                                            if (service) {
                                                return { id: service.id, name: service.name, type: 'service' as const };
                                            }
                                            const bundle = availableBundles.find((b: { id: string; name: string }) => b.name === serviceName);
                                            if (bundle) {
                                                return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                                            }
                                            return null;
                                        })
                                        .filter((s: { id: string; name: string; type: 'service' | 'bundle' } | null): s is { id: string; name: string; type: 'service' | 'bundle' } => s !== null)
                                    : [];
                                
                                initialValuesRef.current = {
                                    selectedEmployeeId: '',
                                    isBlockTime: false,
                                    startDate: startDate,
                                    endDate: endDate,
                                    startTime: startTime,
                                    endTime: endTime,
                                    isAllDay: isAllDay,
                                    isMultiDay: isMultiDay,
                                    selectedResourceId: selectedResourceId,
                                    customerName: newCustomer.customerName || newCustomer.customerPhone || '',
                                    customerPhone: newCustomer.customerPhone || '',
                                    customerEmail: newCustomer.customerEmail || '',
                                    customerAddress: newCustomer.address || '',
                                    locationType: newCustomer.locationType || '',
                                    customerType: '',
                                    vehicles: currentVehicles,
                                    selectedServices: currentServices,
                                    description: '',
                                    customerNotes: (newCustomer.data && typeof newCustomer.data === 'object' && newCustomer.data.notes) ? newCustomer.data.notes : '',
                                    isPaid: true
                                };
                            }, 100);
                        }
                    }
                })
                .catch(err => console.error('Error fetching customers:', err));
        }
    }, [isOpen, newCustomerData, availableServices, availableBundles, selectedCustomer?.customerPhone]);
    
    // Reset selected customer and popup when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setSelectedCustomer(null);
            setCustomerSearch('');
            setShowCustomerDetailsPopup(false);
        }
    }, [isOpen]);
    
    // Reset all form fields when modal opens (unless there's a draftEvent or editingEvent)
    React.useEffect(() => {
        if (isOpen && !draftEvent && !editingEvent) {
            // Reset all form fields to ensure clean state
            setSelectedEmployeeId('');
            setIsBlockTime(false);
            setStartDate('');
            setEndDate('');
            setStartTime('');
            setEndTime('');
            setIsAllDay(false);
            setIsMultiDay(false);
            setSelectedResourceId(preSelectedResource?.id || '');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerEmail('');
            setCustomerAddress('');
            setLocationType('');
            setCustomerType('');
            setVehicles([]);
            setSelectedServices([]);
            setServiceSearch('');
            setDescription('');
            setCustomerNotes('');
            setIsPaid(true);
            setShowCustomerSuggestions(false);
            setSelectedCustomerIndex(-1);
            setSelectedCustomer(null);
            setCustomerSearch('');
        }
    }, [isOpen, draftEvent, editingEvent, preSelectedResource?.id]);

    useEffect(() => {
        if (!isBlockTime) return;
        setSelectedCustomer(null);
        setCustomerSearch('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setLocationType('');
        setCustomerType('');
        setVehicles([]);
        setSelectedServices([]);
        setServiceSearch('');
    }, [isBlockTime]);

    // Get the selected resource name for display
    const selectedResource = preSelectedResource || resources.find(r => r.id === selectedResourceId);

    if (!isOpen) return null;

    const wrapperClassName = renderMode === 'panel'
        ? "fixed top-0 right-0 h-full w-full md:w-[400px] lg:w-[420px] z-50 transform transition-transform duration-300 ease-in-out translate-x-0"
        : "h-full w-full";
    const wrapperStyle = renderMode === 'panel'
        ? { backgroundColor: '#F8F8F7', borderLeft: '1px solid #E2E2DD', boxShadow: 'none', pointerEvents: 'auto' as const }
        : { backgroundColor: '#F8F8F7', boxShadow: 'none', pointerEvents: 'auto' as const };
    // Padding is now handled per-section via Tailwind classes (px-5 py-4)
    const contentTouchAction = renderMode === 'drawer' ? 'pan-y' : undefined;
    const contentOverscrollX = renderMode === 'drawer' ? 'none' : undefined;

    return (
        <div className={wrapperClassName} style={wrapperStyle}>
            <div className="h-full flex flex-col overflow-x-visible" style={{ backgroundColor: 'white', pointerEvents: 'auto' }}>
                {showHeader && (
                    <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between border-b border-[#F0F0EE]">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleClose(); }}
                                className="p-1 hover:bg-[#f0f0ee] rounded transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4 text-[#6b6a5e]" />
                            </button>
                            <span className="text-sm font-medium text-[#2B2B26]">{editingEvent ? 'Edit Appointment' : 'New Appointment'}</span>
                            {selectedResource && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium text-[#6b6a5e]" style={{ backgroundColor: '#E2E2DD' }}>
                                    {selectedResource.name}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {showCloseButton && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleClose(); }}
                                    className="p-2 hover:bg-[#f0f0ee] rounded-lg transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4 text-[#6b6a5e]" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{
                        paddingTop: 0,
                        paddingBottom: '24px',
                        paddingLeft: 0,
                        paddingRight: 0,
                        boxSizing: 'border-box',
                        touchAction: contentTouchAction,
                        overscrollBehaviorX: contentOverscrollX
                    }}
                >
                <div className="divide-y divide-[#f0f0ee]">
                    {/* Block Time Toggle */}
                    <div className="px-5 py-4">
                        <div className="flex items-center justify-between p-3 bg-[#F8F8F7] rounded-xl border border-[#E2E2DD]">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#6b6a5e]" />
                                <span className="text-sm font-medium text-[#2B2B26]">Block Time</span>
                            </div>
                            <button
                                onClick={() => setIsBlockTime(!isBlockTime)}
                                className={`w-10 h-6 rounded-full transition-colors relative ${isBlockTime ? 'bg-[#FF3700]' : 'bg-[#c1c0b8]'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isBlockTime ? 'left-5' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Customer Selection */}
                    {!isBlockTime && (
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4 mb-3">
                            <User className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e]">Customer</span>
                        </div>
                        
                        {/* Search bar - only show when no customer is selected */}
                        {!selectedCustomer && (
                            <div className="ml-8 relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9e9d92]" />
                                    <input 
                                        type="text" 
                                        id="customer-search" 
                                        value={customerSearch} 
                                        onChange={e => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerSuggestions(true);
                                            setSelectedCustomerIndex(-1);
                                        }}
                                        onFocus={() => {
                                            if (customerSearch.trim().length > 0) {
                                                setShowCustomerSuggestions(true);
                                            }
                                        }}
                                        onBlur={() => {
                                            setTimeout(() => setShowCustomerSuggestions(false), 200);
                                        }}
                                        onKeyDown={handleCustomerSearchKeyDown}
                                        className="w-full pl-9 pr-3 py-2 bg-[#F8F8F7] border-0 rounded-xl text-sm placeholder:text-[#9e9d92] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10" 
                                        placeholder="Search customer..."
                                    />
                                </div>
                                {showCustomerSuggestions && customerSearch.trim().length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#deded9] rounded-lg shadow-lg max-h-48 overflow-auto">
                                        {filteredCustomers.map((customer, index) => (
                                            <button
                                                key={customer.id}
                                                onClick={() => handleCustomerSelect(customer)}
                                                className={`w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-3 ${
                                                    index === selectedCustomerIndex ? 'bg-[#F8F8F7]' : ''
                                                }`}
                                            >
                                                <div className="h-7 w-7 rounded-full bg-[#F0F0EE] flex items-center justify-center text-[10px] font-semibold text-[#57564d]">
                                                    {(customer.customerName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-[#2B2B26]">{customer.customerName || 'Unnamed Customer'}</p>
                                                    {customer.customerPhone && (
                                                        <p className="text-xs text-[#6b6a5e]">{customer.customerPhone}</p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                        {showAddNewCustomer && (
                                            <button
                                                onClick={handleAddNewCustomer}
                                                className={`w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-2 text-sm ${
                                                    filteredCustomers.length > 0 ? 'border-t border-[#deded9]' : ''
                                                }`}
                                            >
                                                <Plus className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="font-medium text-blue-600">Add new customer: &quot;{customerSearch}&quot;</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onOpenNewCustomerModal) {
                                            onOpenNewCustomerModal('');
                                        }
                                    }}
                                    className="mt-2 text-sm text-[#6b6a5e] hover:text-[#2B2B26] transition-colors flex items-center gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add new customer
                                </button>
                            </div>
                        )}
                            
                        {/* Customer card - show when customer is selected */}
                        {selectedCustomer && (
                            <div 
                                ref={customerCardRef}
                                className="ml-8 bg-[#F8F8F7] rounded-xl p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                        onMouseEnter={() => {
                                            if (customerPopupTimeoutRef.current) {
                                                clearTimeout(customerPopupTimeoutRef.current);
                                                customerPopupTimeoutRef.current = null;
                                            }
                                            if (customerCardRef.current) {
                                                const rect = customerCardRef.current.getBoundingClientRect();
                                                const actionPanelWidth = window.innerWidth >= 1024 ? 420 : window.innerWidth >= 768 ? 400 : window.innerWidth;
                                                const gap = 4;
                                                setPopupPosition({
                                                    top: rect.top,
                                                    right: actionPanelWidth + gap
                                                });
                                            }
                                            setShowCustomerDetailsPopup(true);
                                        }}
                                        onMouseLeave={() => {
                                            customerPopupTimeoutRef.current = setTimeout(() => {
                                                setShowCustomerDetailsPopup(false);
                                            }, 200);
                                        }}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-[11px] font-semibold text-[#57564d]">
                                            {(selectedCustomer.customerName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#2B2B26]">{selectedCustomer.customerName || 'Unnamed Customer'}</p>
                                            <p className="text-xs text-[#6b6a5e]">{selectedCustomer.customerPhone || 'No phone'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                if (onOpenEditCustomerModal) {
                                                    onOpenEditCustomerModal({
                                                        customerName: selectedCustomer.customerName || '',
                                                        customerPhone: selectedCustomer.customerPhone || '',
                                                        customerAddress: selectedCustomer.address || '',
                                                        customerType: selectedCustomer.customerType || ''
                                                    });
                                                }
                                            }}
                                            onMouseDown={(e) => { e.stopPropagation(); }}
                                            className="p-1 hover:bg-white rounded transition-colors"
                                            title="Edit customer"
                                        >
                                            <PencilIcon className="w-3.5 h-3.5 text-[#6b6a5e]" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleClearCustomer(); }}
                                            className="p-1 hover:bg-white rounded transition-colors"
                                            title="Remove customer"
                                        >
                                            <X className="h-3.5 w-3.5 text-[#6b6a5e]" />
                                        </button>
                                    </div>
                                </div>
                                
                                {selectedCustomer.address && (
                                    <div className="flex items-center gap-2 pl-11">
                                        <MapPin className="h-3 w-3 text-[#9e9d92] flex-shrink-0" />
                                        <span className="text-[11px] text-[#6b6a5e] truncate">{selectedCustomer.address}</span>
                                    </div>
                                )}

                                {(() => {
                                    const totalPastJobs = typeof selectedCustomer.pastJobsTotal === 'number'
                                        ? selectedCustomer.pastJobsTotal
                                        : (typeof selectedCustomer.completedServiceCount === 'number'
                                            ? selectedCustomer.completedServiceCount
                                            : (selectedCustomer.pastJobs ? selectedCustomer.pastJobs.length : 0));
                                    const pastJobs = selectedCustomer.pastJobs || [];
                                    const recentJobs = pastJobs.slice(0, 3);
                                    return totalPastJobs > 0 ? (
                                        <div className="mt-3 pt-3 border-t border-[#deded9]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="h-3 w-3 text-[#9e9d92]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
                                                <span className="text-[10px] font-medium text-[#9e9d92] uppercase">{totalPastJobs} Past Jobs</span>
                                            </div>
                                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                                {recentJobs.map((job, idx) => (
                                                    <div key={job.id || idx} className="py-1.5 px-2 bg-white rounded text-[10px]">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="font-medium text-[#2B2B26] truncate">
                                                                    {job.services && job.services.length > 0 ? (Array.isArray(job.services) ? job.services.join(', ') : job.services) : 'Service'}
                                                                </span>
                                                                {job.vehicleModel && (
                                                                    <>
                                                                        <span className="text-[#9e9d92]">&bull;</span>
                                                                        <span className="text-[#6b6a5e] truncate">{job.vehicleModel}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-shrink-0 text-[#9e9d92]">
                                                                {job.employeeName && (
                                                                    <>
                                                                        <span>{job.employeeName}</span>
                                                                        <span>&bull;</span>
                                                                    </>
                                                                )}
                                                                <span>
                                                                    {(() => {
                                                                        const parsed = parseJobDate(job.date);
                                                                        return parsed ? format(parsed, 'MMM d, yyyy') : '';
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {job.eventNotes && (
                                                            <p className="mt-1 text-[9px] text-[#6b6a5e] leading-tight line-clamp-2 italic">{job.eventNotes}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}
                        
                        {/* Customer Details Popup - appears outside action panel, adjacent to customer box */}
                        {showCustomerDetailsPopup && selectedCustomer && popupPosition && (
                            <>
                                {/* Popup Panel - Positioned to the left of action panel, adjacent to customer box */}
                                    <div 
                                        ref={customerDetailsPopupRef}
                                        className="fixed w-80 bg-white shadow-2xl z-[60] rounded-xl overflow-hidden" 
                                        onMouseEnter={() => {
                                            // Clear any pending timeout when hovering over popup
                                            if (customerPopupTimeoutRef.current) {
                                                clearTimeout(customerPopupTimeoutRef.current);
                                                customerPopupTimeoutRef.current = null;
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            // Close popup when leaving
                                            setShowCustomerDetailsPopup(false);
                                        }}
                                        style={{ 
                                            border: '1px solid #E2E2DD', 
                                            backgroundColor: '#F8F8F7', 
                                            maxHeight: '90vh',
                                            right: `${popupPosition.right}px`,
                                            top: `${popupPosition.top}px`,
                                        }}>
                                    <div className="flex flex-col overflow-hidden" style={{ backgroundColor: '#F8F8F7' }}>
                                        {/* Header */}
                                        <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: '#E2E2DD' }}>
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-base font-bold text-gray-900">Customer Details</h3>
                                                <button
                                                    onClick={() => setShowCustomerDetailsPopup(false)}
                                                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                                >
                                                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: 'calc(90vh - 60px)' }}>
                                            <div className="space-y-4">
                                                {/* Customer Information */}
                            <div>
                                                    <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">Contact Information</h4>
                                                    <div className="space-y-2.5">
                                                        <div>
                                                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Name</label>
                                                            <p className="text-sm text-gray-900 mt-0.5">
                                                                {selectedCustomer.customerName || 'Not provided'}
                                                            </p>
                            </div>
                            <div>
                                                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                                                            <p className="text-sm text-gray-900 mt-0.5">
                                                                {selectedCustomer.customerPhone || 'Not provided'}
                                                            </p>
                            </div>
                            <div>
                                                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                                            <p className="text-sm text-gray-900 mt-0.5">
                                                                {selectedCustomer.customerEmail || 'Not provided'}
                                                            </p>
                            </div>
                            <div>
                                                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Address</label>
                                                            <p className="text-sm text-gray-900 mt-0.5">
                                                                {selectedCustomer.address || 'Not provided'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Arrival</label>
                                                            <p className="text-sm text-gray-900 mt-0.5 capitalize">
                                                                {selectedCustomer.locationType || 'Not provided'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Past Jobs */}
                                                {selectedCustomer.pastJobs && selectedCustomer.pastJobs.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">
                                                            Past Jobs ({typeof selectedCustomer.pastJobsTotal === 'number' ? selectedCustomer.pastJobsTotal : selectedCustomer.pastJobs.length})
                                                        </h4>
                                                        <div className="space-y-2.5">
                                                            {selectedCustomer.pastJobs.map((job, index) => (
                                                                <div 
                                                                    key={job.id || index}
                                                                    className="p-3 rounded-lg border" 
                                                                    style={{ borderColor: '#E2E2DD', backgroundColor: 'white' }}
                                                                >
                                                       <div className="flex items-start justify-between mb-1.5">
                                                           <p className="text-xs font-semibold text-gray-900">
                                                               {(() => {
                                                                   const parsed = parseJobDate(job.date);
                                                                   return parsed ? format(parsed, 'MMMM d, yyyy') : 'Date unavailable';
                                                               })()}
                                                           </p>
                                                                        {job.employeeName && (
                                                                            <span className="text-[10px] text-gray-600 bg-gray-200 px-1.5 py-0.5 rounded-full">
                                                                                {job.employeeName}
                                                                            </span>
                                                                        )}
                            </div>
                                                                    {job.services && job.services.length > 0 && (
                                                                        <p className="text-xs text-gray-700 mb-1">
                                                                            {Array.isArray(job.services) ? job.services.join(', ') : job.services}
                                                                        </p>
                                                                    )}
                                                                    {job.vehicleModel && (
                                                                        <p className="text-[10px] text-gray-600">
                                                                            Vehicle: {job.vehicleModel}
                                                                        </p>
                                                                    )}
                        </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    )}

                    {!isBlockTime && selectedCustomer && (
                    <>
                    {/* Vehicle - only shown when customer is selected */}
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4 mb-3">
                            <svg className="h-4 w-4 text-[#9e9d92] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
                            <span className="text-sm text-[#6b6a5e]">Vehicle</span>
                        </div>
                        <div className="ml-8 flex flex-wrap gap-2">
                            {vehicles.map((vehicle) => (
                                <VehicleChip
                                  key={vehicle.id}
                                  model={vehicle.model}
                                  onRemove={() => setVehicles(vehicles.filter(v => v.id !== vehicle.id))}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() => setShowAddVehicleModal(true)}
                                className="px-3 py-1.5 rounded-xl text-sm bg-[#F8F8F7] text-[#6b6a5e] hover:bg-[#F0F0EE] transition-colors flex items-center gap-1"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add
                            </button>
                        </div>
                        
                        {showAddVehicleModal && (
                            <div className="fixed inset-0 flex items-center justify-center z-[70] p-4" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
                                <div className="rounded-xl shadow-xl w-full max-w-md bg-white" style={{ width: '400px' }}>
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0EE]">
                                        <span className="text-sm font-medium text-[#2B2B26]">Add Vehicle</span>
                                        <button
                                            onClick={() => { setShowAddVehicleModal(false); }}
                                            className="p-1 hover:bg-[#f0f0ee] rounded transition-colors"
                                        >
                                            <X className="h-4 w-4 text-[#6b6a5e]" />
                                        </button>
                                    </div>
                                    <div className="p-5 flex flex-col gap-3">
                                        <VehiclePickerPopover
                                          onSelect={(model) => {
                                            if (!vehicles.some((v) => v.model === model)) {
                                              setVehicles([...vehicles, { id: `vehicle-${Date.now()}`, model }]);
                                            }
                                            setShowAddVehicleModal(false);
                                          }}
                                          buttonLabel="Select manufacturer and model"
                                        />
                                        <button
                                          onClick={() => { setShowAddVehicleModal(false); }}
                                          className="w-full px-4 py-2 border border-[#deded9] rounded-xl text-sm text-[#6b6a5e] hover:bg-[#F8F8F7] transition-colors"
                                        >
                                          Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    </>
                    )}

                    {/* Services - Multi-select */}
                    {!isBlockTime && (
                    <div className="px-5 py-4">
                        <div className="flex items-start gap-4">
                            <Info className="h-4 w-4 text-[#9e9d92] flex-shrink-0 mt-2" />
                            <span className="text-sm text-[#6b6a5e] w-20 flex-shrink-0 mt-1.5">Services</span>
                            <div className="flex-1 relative">
                                <div 
                                    onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                                    className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[#F8F8F7] rounded-xl text-sm hover:bg-[#F0F0EE] cursor-pointer min-h-[36px] flex-wrap"
                                >
                                    {selectedServices.length > 0 ? (
                                        selectedServices.map((item) => (
                                            <span key={`${item.type}-${item.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#deded9] rounded text-xs">
                                                {item.name}
                                                {item.type === 'bundle' && (
                                                    <span className="text-[9px] px-1 py-0 rounded bg-blue-100 text-blue-700">Bundle</span>
                                                )}
                                                <X 
                                                    className="h-3 w-3 cursor-pointer hover:text-red-500" 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedServices(selectedServices.filter(s => !(s.id === item.id && s.type === item.type))); }} 
                                                />
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[#9e9d92]">Add services...</span>
                                    )}
                                    <ChevronDown className="h-4 w-4 text-[#9e9d92] ml-auto flex-shrink-0" />
                                </div>
                                {showServiceDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowServiceDropdown(false)} />
                                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#deded9] rounded-lg shadow-lg py-1 z-50 max-h-[200px] overflow-y-auto">
                                            {/* Search within dropdown */}
                                            <div className="px-3 py-2 border-b border-[#F0F0EE]">
                                                <input 
                                                    type="text" 
                                                    value={serviceSearch} 
                                                    onChange={e => setServiceSearch(e.target.value)}
                                                    className="w-full px-2 py-1 bg-[#F8F8F7] border-0 rounded text-sm placeholder:text-[#9e9d92] focus:outline-none"
                                                    placeholder="Search..."
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                />
                                            </div>
                                            {selectedServices.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedServices([])}
                                                    className="w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-2 text-sm text-[#9e9d92] border-b border-[#F0F0EE] transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                    <span>Clear all</span>
                                                </button>
                                            )}
                                            {availableBundles
                                                .filter(bundle => !serviceSearch.trim() || bundle.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                                .map((bundle) => {
                                                    const isSelected = selectedServices.some(s => s.id === bundle.id && s.type === 'bundle');
                                                    return (
                                                        <button
                                                            key={`bundle-${bundle.id}`}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedServices(selectedServices.filter(s => !(s.id === bundle.id && s.type === 'bundle')));
                                                                } else {
                                                                    setSelectedServices([...selectedServices, { id: bundle.id, name: bundle.name, type: 'bundle' }]);
                                                                }
                                                                setServiceSearch('');
                                                            }}
                                                            className="w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-2 text-sm transition-colors"
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#2B2B26] border-[#2B2B26]' : 'border-[#c1c0b8]'}`}>
                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <span>{bundle.name}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Bundle</span>
                                                        </button>
                                                    );
                                                })}
                                            {availableServices
                                                .filter(service => !serviceSearch.trim() || service.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                                .map((service) => {
                                                    const isSelected = selectedServices.some(s => s.id === service.id && s.type === 'service');
                                                    return (
                                                        <button
                                                            key={`service-${service.id}`}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedServices(selectedServices.filter(s => !(s.id === service.id && s.type === 'service')));
                                                                } else {
                                                                    setSelectedServices([...selectedServices, { id: service.id, name: service.name, type: 'service' }]);
                                                                }
                                                                setServiceSearch('');
                                                            }}
                                                            className="w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-2 text-sm transition-colors"
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#2B2B26] border-[#2B2B26]' : 'border-[#c1c0b8]'}`}>
                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <span>{service.name}</span>
                                                            {service.category && <span className="ml-auto text-xs text-[#9e9d92]">{service.category.name}</span>}
                                                        </button>
                                                    );
                                                })}
                                            {availableServices.filter(s => !serviceSearch.trim() || s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 &&
                                             availableBundles.filter(b => !serviceSearch.trim() || b.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-2 text-sm text-[#9e9d92]">No services or bundles found</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Day Select */}
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4">
                            <CalendarIconLucide className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e] w-20 flex-shrink-0">Day</span>
                            <div className="flex-1 relative" ref={startDatePickerRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (startDate) {
                                            setStartDatePickerMonth(new Date(startDate + 'T00:00:00'));
                                        }
                                        setShowStartDatePicker(!showStartDatePicker);
                                        setShowEndDatePicker(false);
                                    }}
                                    className="w-full px-3 py-1.5 bg-[#F8F8F7] border-0 rounded-xl text-sm text-left text-[#2B2B26] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10"
                                >
                                    {startDate ? format(new Date(startDate + 'T00:00:00'), 'MMM d, yyyy') : 'Select date'}
                                </button>
                                {showStartDatePicker && (
                                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] p-4" style={{ minWidth: '280px' }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <button type="button" onClick={() => setStartDatePickerMonth(subMonths(startDatePickerMonth, 1))} className="p-1 rounded hover:bg-gray-100">
                                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <h3 className="text-sm font-semibold text-gray-900">{format(startDatePickerMonth, 'MMMM yyyy')}</h3>
                                            <button type="button" onClick={() => setStartDatePickerMonth(addMonths(startDatePickerMonth, 1))} className="p-1 rounded hover:bg-gray-100">
                                                <ChevronRight className="w-4 h-4 text-gray-600" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                                <div key={d} className="text-xs font-medium text-gray-500 text-center py-1">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {Array(getDay(startOfMonth(startDatePickerMonth))).fill(null).map((_, i) => (
                                                <div key={`e-${i}`} className="p-2" />
                                            ))}
                                            {Array(getDaysInMonth(startDatePickerMonth)).fill(null).map((_, i) => {
                                                const day = i + 1;
                                                const date = new Date(startDatePickerMonth.getFullYear(), startDatePickerMonth.getMonth(), day);
                                                const dateStr = format(date, 'yyyy-MM-dd');
                                                const isTodayDate = isToday(date);
                                                const isSelected = startDate === dateStr;
                                                return (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => {
                                                            setStartDate(dateStr);
                                                            setShowStartDatePicker(false);
                                                        }}
                                                        className={`text-xs p-2 rounded hover:bg-gray-100 transition-colors ${
                                                            isSelected ? 'bg-black text-white' : isTodayDate ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isMultiDay && (
                            <div className="flex items-center gap-4 mt-3">
                                <div className="h-4 w-4 flex-shrink-0" />
                                <span className="text-sm text-[#6b6a5e] w-20 flex-shrink-0">End Day</span>
                                <div className="flex-1 relative" ref={endDatePickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (endDate) {
                                                setEndDatePickerMonth(new Date(endDate + 'T00:00:00'));
                                            } else if (startDate) {
                                                setEndDatePickerMonth(new Date(startDate + 'T00:00:00'));
                                            }
                                            setShowEndDatePicker(!showEndDatePicker);
                                            setShowStartDatePicker(false);
                                        }}
                                        className="w-full px-3 py-1.5 bg-[#F8F8F7] border-0 rounded-xl text-sm text-left text-[#2B2B26] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10"
                                    >
                                        {endDate ? format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy') : 'Select end date'}
                                    </button>
                                    {showEndDatePicker && (
                                        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] p-4" style={{ minWidth: '280px' }}>
                                            <div className="flex items-center justify-between mb-4">
                                                <button type="button" onClick={() => setEndDatePickerMonth(subMonths(endDatePickerMonth, 1))} className="p-1 rounded hover:bg-gray-100">
                                                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                                                </button>
                                                <h3 className="text-sm font-semibold text-gray-900">{format(endDatePickerMonth, 'MMMM yyyy')}</h3>
                                                <button type="button" onClick={() => setEndDatePickerMonth(addMonths(endDatePickerMonth, 1))} className="p-1 rounded hover:bg-gray-100">
                                                    <ChevronRight className="w-4 h-4 text-gray-600" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 mb-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                                    <div key={d} className="text-xs font-medium text-gray-500 text-center py-1">{d}</div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {Array(getDay(startOfMonth(endDatePickerMonth))).fill(null).map((_, i) => (
                                                    <div key={`e-${i}`} className="p-2" />
                                                ))}
                                                {Array(getDaysInMonth(endDatePickerMonth)).fill(null).map((_, i) => {
                                                    const day = i + 1;
                                                    const date = new Date(endDatePickerMonth.getFullYear(), endDatePickerMonth.getMonth(), day);
                                                    const dateStr = format(date, 'yyyy-MM-dd');
                                                    const isTodayDate = isToday(date);
                                                    const isSelected = endDate === dateStr;
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => {
                                                                setEndDate(dateStr);
                                                                setShowEndDatePicker(false);
                                                            }}
                                                            className={`text-xs p-2 rounded hover:bg-gray-100 transition-colors ${
                                                                isSelected ? 'bg-black text-white' : isTodayDate ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700'
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options: All day / Multi-day checkboxes */}
                        <div className="flex items-center gap-4 mt-3">
                            <div className="h-4 w-4 flex-shrink-0" />
                            <div className="w-20 flex-shrink-0" />
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isAllDay ? 'bg-[#2B2B26] border-[#2B2B26]' : 'border-[#c1c0b8]'}`}>
                                        {isAllDay && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-[#6b6a5e]">All day</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMultiDay(!isMultiDay)}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isMultiDay ? 'bg-[#2B2B26] border-[#2B2B26]' : 'border-[#c1c0b8]'}`}>
                                        {isMultiDay && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-[#6b6a5e]">Multi-day</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Time */}
                    {!isAllDay && (
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4">
                            <Clock className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e] w-20 flex-shrink-0">Time</span>
                            <div className="flex items-center gap-2 flex-1">
                                <select
                                    id="start-time"
                                    value={startTime}
                                    onChange={e => setStartTime(e.target.value)}
                                    className="px-3 py-1.5 bg-[#F8F8F7] border-0 rounded-xl text-sm text-[#2B2B26] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10 min-w-[100px]"
                                >
                                    <option value="">Start</option>
                                    {timeOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <span className="text-[#9e9d92]">&rarr;</span>
                                <select
                                    id="end-time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className="px-3 py-1.5 bg-[#F8F8F7] border-0 rounded-xl text-sm text-[#2B2B26] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10 min-w-[100px]"
                                >
                                    <option value="">End</option>
                                    {timeOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    )}

                    {isAllDay && startDate && (!startTime || !endTime) && (
                        <div className="px-5 py-3">
                            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                No business hours set for this day. Please set business hours in your profile settings.
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4 mb-3">
                            <MapPin className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e]">Location</span>
                        </div>
                        <div className="ml-8 space-y-3">
                            <select
                                id="station-select"
                                value={selectedResourceId}
                                onChange={e => setSelectedResourceId(e.target.value)}
                                className="w-full px-3 py-1.5 bg-[#F8F8F7] border-0 rounded-xl text-sm text-[#2B2B26] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10"
                            >
                                <option value="">Select station</option>
                                {resources.map((resource) => (
                                    <option key={resource.id} value={resource.id}>
                                        {resource.name}
                                    </option>
                                ))}
                            </select>

                            {!isBlockTime && !(selectedResourceId && resources.find(r => r.id === selectedResourceId)?.type === 'van') && (
                                <select
                                    id="location-type"
                                    value={locationType}
                                    onChange={e => setLocationType(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-[#F8F8F7] border-0 rounded-xl text-sm text-[#2B2B26] focus:outline-none focus:ring-2 focus:ring-[#2B2B26]/10"
                                >
                                    <option value="">Select location type</option>
                                    <option value="pick up">Pick-up at Bay</option>
                                    <option value="drop off">Drop-off at Bay</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Technician */}
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4">
                            <User className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e] w-20 flex-shrink-0">Technician</span>
                            <div className="flex-1 relative">
                                {employees.length === 0 ? (
                                    <p className="text-xs text-[#9e9d92]">No employees found</p>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#F8F8F7] rounded-xl text-sm hover:bg-[#F0F0EE] transition-colors"
                                        >
                                            {selectedEmployeeId ? (
                                                <>
                                                    {(() => {
                                                        const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
                                                        return selectedEmployee ? (
                                                            <>
                                                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedEmployee.color }} />
                                                                <span className="text-[#2B2B26]">{selectedEmployee.name}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[#9e9d92]">Select employee</span>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-3 h-3 rounded-full flex-shrink-0 bg-[#c1c0b8]" />
                                                    <span className="text-[#9e9d92]">No Technician</span>
                                                </>
                                            )}
                                            <ChevronDown className="h-4 w-4 text-[#9e9d92] ml-auto" />
                                        </button>
                                        {showEmployeeDropdown && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowEmployeeDropdown(false)} />
                                                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#deded9] rounded-lg shadow-lg py-1 z-50">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedEmployeeId(''); setShowEmployeeDropdown(false); }}
                                                        className="w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-2 text-sm transition-colors"
                                                    >
                                                        <span className="w-3 h-3 rounded-full bg-[#c1c0b8]" />
                                                        <span className="text-[#2B2B26]">No Technician</span>
                                                        {!selectedEmployeeId && <Check className="h-4 w-4 ml-auto text-[#2B2B26]" />}
                                                    </button>
                                                    {employees.map((employee) => {
                                                        const isSelected = selectedEmployeeId === employee.id;
                                                        return (
                                                            <button
                                                                key={employee.id}
                                                                type="button"
                                                                onClick={() => { setSelectedEmployeeId(employee.id); setShowEmployeeDropdown(false); }}
                                                                className="w-full px-3 py-2 text-left hover:bg-[#F8F8F7] flex items-center gap-2 text-sm transition-colors"
                                                            >
                                                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: employee.color }} />
                                                                <span className="text-[#2B2B26]">{employee.name}</span>
                                                                {isSelected && <Check className="h-4 w-4 ml-auto text-[#2B2B26]" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    {!isBlockTime && (
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4">
                            <CreditCard className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e] w-20 flex-shrink-0">Payment</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPaid}
                                    onChange={(e) => setIsPaid(e.target.checked)}
                                    className="w-4 h-4 rounded border-[#deded9] text-[#2B2B26] focus:ring-[#2B2B26]"
                                />
                                <span className="text-sm text-[#2B2B26]">Paid</span>
                            </label>
                        </div>
                    </div>
                    )}

                    {/* Customer Notes */}
                    {!isBlockTime && (
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4 mb-3">
                            <MessageSquare className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e]">Customer Notes</span>
                        </div>
                        <div className="ml-8">
                            <textarea 
                                id="customer-notes"
                                value={customerNotes} 
                                onChange={e => setCustomerNotes(e.target.value)} 
                                className="w-full p-3 border border-[#deded9] rounded-xl text-sm resize-none h-20 focus:outline-none focus:border-[#316bfe] bg-white text-[#2B2B26] placeholder:text-[#9e9d92]" 
                                placeholder="Customer prefers hand-wash only, always 5 minutes late..."
                            />
                        </div>
                    </div>
                    )}

                    {/* Event Notes */}
                    <div className="px-5 py-4">
                        <div className="flex items-center gap-4 mb-3">
                            <MessageSquare className="h-4 w-4 text-[#9e9d92] flex-shrink-0" />
                            <span className="text-sm text-[#6b6a5e]">{isBlockTime ? 'Notes' : 'Event Notes'}</span>
                        </div>
                        <div className="ml-8">
                            <textarea 
                                id="event-notes"
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-3 border border-[#deded9] rounded-xl text-sm resize-none h-20 focus:outline-none focus:border-[#316bfe] bg-white text-[#2B2B26] placeholder:text-[#9e9d92]" 
                                placeholder={isBlockTime ? 'Add any notes...' : 'Add event notes...'}
                            />
                        </div>
                    </div>

                    {/* Hidden customer status selector */}
                    {!isBlockTime && (
                        <input type="hidden" value={customerType} />
                    )}
                    </div>
                </div>

                <div className="flex-shrink-0 px-5 py-4 border-t border-[#F0F0EE]">
                    <button 
                        onClick={handleSubmit} 
                        className="w-full py-2.5 bg-[#2B2B26] text-white text-sm font-medium rounded-xl hover:bg-[#1a1a18] transition-colors"
                    >
                        {editingEvent ? 'Save changes' : (isBlockTime ? 'Create Block Time' : 'Create Appointment')}
                    </button>
                </div>
            </div>

            {/* Discard Changes Modal - moved to parent CalendarPage level */}
        </div>
    );
} 
