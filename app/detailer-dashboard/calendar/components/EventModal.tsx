"use client";
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, CheckIcon, PencilIcon, Bars3Icon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import AddressAutocompleteInput from './AddressAutocompleteInput';
import { getCustomerTypeFromHistory } from '@/lib/customerType';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
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
    onAddEvent: (event: any) => void;
    preSelectedResource?: { id: string; name: string; type: 'bay' | 'van' } | null;
    resources?: Array<{ id: string; name: string; type: 'bay' | 'van' }>;
    draftEvent?: { resourceId: string; startTime: string; endTime: string } | null;
    onOpenNewCustomerModal?: (initialName: string) => void;
    onOpenEditCustomerModal?: (customer: { customerName: string; customerPhone: string; customerAddress?: string }) => void;
    newCustomerData?: { customerName: string; customerPhone: string; customerEmail?: string; address?: string } | null;
    onRequestClose?: () => void; // Called when modal wants to close (checks for dirty state)
    renderMode?: 'panel' | 'drawer';
    showHeader?: boolean;
    showCloseButton?: boolean;
};

export default function EventModal({ isOpen, onClose, onAddEvent, preSelectedResource, resources = [], draftEvent, onOpenNewCustomerModal, onOpenEditCustomerModal, newCustomerData, onRequestClose, renderMode = 'panel', showHeader = true, showCloseButton = true }: EventModalProps) {
    const { data: session } = useSession();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [employees, setEmployees] = useState<Array<{ id: string; name: string; color: string }>>([]);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(false); // Default to timed events
    const [isMultiDay, setIsMultiDay] = useState(false); // Default to single-day events
    const [selectedResourceId, setSelectedResourceId] = useState<string>(preSelectedResource?.id || '');
    const [businessHours, setBusinessHours] = useState<any>(null);
    const [customers, setCustomers] = useState<Array<{ id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; services?: string[]; data?: any; completedServiceCount?: number; lastCompletedServiceAt?: string | null }>>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; pastJobs?: Array<{ id: string; date: string; services: string[]; vehicleModel?: string; employeeName?: string }>; completedServiceCount?: number; lastCompletedServiceAt?: string | null } | null>(null);
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
    const [newVehicleModel, setNewVehicleModel] = useState('');
    const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([]);
    const [availableBundles, setAvailableBundles] = useState<Array<{ id: string; name: string; description?: string; price?: number; services?: Array<{ service: { id: string; name: string } }> }>>([]);
    const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; type: 'service' | 'bundle' }>>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showServiceDropdown, setShowServiceDropdown] = useState(false);
    const [description, setDescription] = useState('');
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
    const customerCardRef = React.useRef<HTMLDivElement>(null);
    const customerDetailsPopupRef = React.useRef<HTMLDivElement>(null);
    const [popupPosition, setPopupPosition] = useState<{ top: number; right: number } | null>(null);
    const customerPopupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (customerPopupTimeoutRef.current) {
                clearTimeout(customerPopupTimeoutRef.current);
            }
        };
    }, []);
    
    // Store initial values to detect changes (empty form initially)
    const initialValuesRef = useRef({
      selectedEmployeeId: '',
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
      description: ''
    });

    // Check if form has been modified
    const checkIfDirty = () => {
      const current = {
        selectedEmployeeId,
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
        description
      };

      const initial = {
        selectedEmployeeId: initialValuesRef.current.selectedEmployeeId,
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
        description: initialValuesRef.current.description
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
        setDescription('');
        setSelectedCustomer(null);
        setCustomerSearch('');
        
        // Reset initial values
        initialValuesRef.current = {
          selectedEmployeeId: '',
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
          description: ''
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
                
                // Filter events for this customer and get completed/confirmed ones
                const customerEvents = allEvents.filter((event: any) => 
                    event.customerPhone === customerPhone && 
                    (event.status === 'confirmed' || event.status === 'completed' || !event.status) // Include events without status
                ).sort((a: any, b: any) => {
                    // Sort by date, most recent first
                    const dateA = new Date(a.start || a.date || 0).getTime();
                    const dateB = new Date(b.start || b.date || 0).getTime();
                    return dateB - dateA;
                }).slice(0, 10); // Get last 10 events
                
                // Transform to match the expected format
                return customerEvents.map((event: any) => ({
                    id: event.id || event.bookingId,
                    date: event.start || event.date || event.scheduledDate,
                    services: event.services || (event.title ? [event.title] : []),
                    vehicleModel: event.vehicleModel || event.vehicleType,
                    employeeName: event.employeeName
                }));
            }
        } catch (error) {
            console.error('Error fetching customer bookings:', error);
        }
        return [];
    };

    // Handle customer selection from suggestions - show customer card
    const handleCustomerSelect = async (customer: { id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; services?: string[]; data?: any; completedServiceCount?: number; lastCompletedServiceAt?: string | null }) => {
        // Fetch past jobs for this customer
        const pastJobs = await fetchCustomerPastJobs(customer.id, customer.customerPhone);
        const computedCustomerType = customer.customerType?.toLowerCase() === 'maintenance'
            ? 'maintenance'
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
                date: job.scheduledDate || job.createdAt,
                services: Array.isArray(job.services) ? job.services : (job.services ? [job.services] : []),
                vehicleModel: job.vehicleType || job.vehicleModel,
                employeeName: job.employeeName
            }))
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
            setDescription(customer.data.notes || '');
        } else {
            setDescription('');
        }
        
        // Set vehicles - if customer has vehicleModel, add it as a vehicle
        if (customer.vehicleModel) {
            setVehicles([{ id: `vehicle-${Date.now()}`, model: customer.vehicleModel }]);
        } else {
            setVehicles([]);
        }
        // Set selected services from customer's services
        if (customer.services && Array.isArray(customer.services)) {
            // Find matching services from available services and bundles
            const matchedItems = customer.services
                .map(serviceName => {
                    // Check services first
                    const service = availableServices.find(s => s.name === serviceName);
                    if (service) {
                        return { id: service.id, name: service.name, type: 'service' as const };
                    }
                    // Check bundles
                    const bundle = availableBundles.find(b => b.name === serviceName);
                    if (bundle) {
                        return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                    }
                    return null;
                })
                .filter((s): s is { id: string; name: string; type: 'service' | 'bundle' } => s !== null);
            setSelectedServices(matchedItems);
        } else {
            setSelectedServices([]);
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
        if (selectedServices.length === 0 || !startDate) {
            // Basic validation
            alert('Please select at least one service and provide a start date.');
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

            const response = await fetch('/api/detailer/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: selectedServices.map(s => s.name).join(', ') || 'Untitled Event', // Use selected services as the title
                    employeeId: selectedEmployeeId || undefined,
                    startDate: startDateTime,
                    endDate: endDateTime,
                    isAllDay,
                    time: timeToStore, // Include time for all-day events with business hours, or time range for timed events
                    startTime: startTimeToSend || undefined, // Send start time separately for timed events
                    endTime: endTimeToSend || undefined, // Send end time separately for timed events
                    description: description || '',
                    resourceId: selectedResourceId || undefined,
                    customerName: customerName || undefined,
                    customerPhone: customerPhone || undefined,
                    customerEmail: customerEmail || undefined,
                    customerAddress: customerAddress || undefined,
                    locationType: locationType || undefined,
                    customerType: customerType || undefined,
                    vehicleModel: vehicles.length > 0 ? vehicles.map(v => v.model).join(', ') : undefined,
                    vehicles: vehicles.length > 0 ? vehicles.map(v => v.model) : undefined,
                    services: selectedServices.length > 0 ? selectedServices.map(s => s.name) : undefined
                }),
            });

            const result = await response.json();

            if (response.ok) {
                // Add to local state for immediate UI update
                const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
                onAddEvent({
                    id: `local-${Date.now()}`,
                    title: selectedServices.map(s => s.name).join(', ') || 'Untitled Event', // Use selected services as the title
                    color: selectedEmployee?.color || 'blue',
                    employeeId: selectedEmployeeId,
                    date: new Date(startDate),
                    start: startDateTime,
                    end: endDateTime,
                    source: result.event.source || 'local',
                    allDay: isAllDay,
                    resourceId: selectedResourceId || undefined
                });
                
                onClose(); // Close modal after adding
                // Reset form
                setSelectedEmployeeId('');
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
                setShowCustomerSuggestions(false);
                setSelectedCustomerIndex(-1);
            } else {
                throw new Error(result.error || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            console.error('Failed to create event. Please try again.');
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
            
            // Update initial values after state is set
            setTimeout(() => {
                initialValuesRef.current = {
                    selectedEmployeeId: '',
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
                    description: ''
                };
            }, 50);
        }
    }, [isOpen, draftEvent]);
    
    // Populate form when new customer is created or existing customer is edited
    React.useEffect(() => {
        if (isOpen && newCustomerData) {
            // Check if we're editing an existing customer (selectedCustomer exists and phone matches)
            if (selectedCustomer && selectedCustomer.customerPhone === newCustomerData.customerPhone) {
                // Update the selected customer with edited data
                setSelectedCustomer({
                    ...selectedCustomer,
                    customerName: newCustomerData.customerName,
                    customerPhone: newCustomerData.customerPhone,
                    address: newCustomerData.address || ''
                });
                
                // Update form fields
                setCustomerName(newCustomerData.customerName || '');
                setCustomerPhone(newCustomerData.customerPhone || '');
                setCustomerAddress(newCustomerData.address || '');
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
                pastJobs: []
            });
            
            // Populate form fields immediately
            setCustomerName(newCustomerData.customerName || '');
            setCustomerPhone(newCustomerData.customerPhone || '');
            setCustomerEmail(newCustomerData.customerEmail || '');
            setCustomerAddress(newCustomerData.address || '');
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
                            const pastJobs = await fetchCustomerPastJobs(newCustomer.id, newCustomer.customerPhone);
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
                                    date: job.scheduledDate || job.createdAt,
                                    services: Array.isArray(job.services) ? job.services : (job.services ? [job.services] : []),
                                    vehicleModel: job.vehicleType || job.vehicleModel
                                }))
                            });
                            
                            // Update form fields with full customer data
                            setCustomerName(newCustomer.customerName || newCustomer.customerPhone || '');
                            setCustomerPhone(newCustomer.customerPhone || '');
                            setCustomerEmail(newCustomer.customerEmail || '');
                            setCustomerAddress(newCustomer.address || '');
                            setLocationType(newCustomer.locationType || '');
                            
                            // Populate customer notes from data.notes if available
                            if (newCustomer.data && typeof newCustomer.data === 'object' && newCustomer.data.notes) {
                                setDescription(newCustomer.data.notes || '');
                            } else {
                                setDescription('');
                            }
                            
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
                                    description: (newCustomer.data && typeof newCustomer.data === 'object' && newCustomer.data.notes) ? newCustomer.data.notes : ''
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
    
    // Reset all form fields when modal opens (unless there's a draftEvent)
    React.useEffect(() => {
        if (isOpen && !draftEvent) {
            // Reset all form fields to ensure clean state
            setSelectedEmployeeId('');
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
            setShowCustomerSuggestions(false);
            setSelectedCustomerIndex(-1);
            setSelectedCustomer(null);
            setCustomerSearch('');
        }
    }, [isOpen, draftEvent, preSelectedResource?.id]);

    // Get the selected resource name for display
    const selectedResource = preSelectedResource || resources.find(r => r.id === selectedResourceId);

    if (!isOpen) return null;

    const wrapperClassName = renderMode === 'panel'
        ? "fixed top-0 right-0 h-full w-full md:w-[400px] lg:w-[420px] z-50 transform transition-transform duration-300 ease-in-out translate-x-0"
        : "h-full w-full";
    const wrapperStyle = renderMode === 'panel'
        ? { backgroundColor: '#F8F8F7', borderLeft: '1px solid #E2E2DD', boxShadow: 'none', pointerEvents: 'auto' }
        : { backgroundColor: '#F8F8F7', boxShadow: 'none', pointerEvents: 'auto' };
    const contentPaddingTop = renderMode === 'drawer' ? '12px' : '24px';
    const contentPaddingLeft = renderMode === 'drawer' ? '24px' : 'max(24px, env(safe-area-inset-left))';
    const contentPaddingRight = renderMode === 'drawer' ? '24px' : 'max(24px, env(safe-area-inset-right))';
    const contentTouchAction = renderMode === 'drawer' ? 'pan-y' : undefined;
    const contentOverscrollX = renderMode === 'drawer' ? 'none' : undefined;

    return (
        <div className={wrapperClassName} style={wrapperStyle}>
            <div className="h-full flex flex-col overflow-x-visible" style={{ backgroundColor: '#F8F8F7', pointerEvents: 'auto' }}>
                {showHeader && (
                    <div className="flex-shrink-0 px-6 pt-6 pb-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <button
                                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex items-center"
                                    aria-label="Menu"
                                >
                                    <Bars3Icon className="w-6 h-6 text-gray-700" />
                                </button>
                                <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ backgroundColor: '#E2E2DD' }}>
                                    <Image 
                                        src="/icons/layouting.png" 
                                        alt="Create Event" 
                                        width={20} 
                                        height={20}
                                        className="object-contain"
                                    />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2" style={{ borderColor: '#F8F8F7' }}></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold text-gray-900">Create event</h2>
                                {selectedResource && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-gray-700" style={{ backgroundColor: '#E2E2DD' }}>
                                        {selectedResource.type === 'bay' ? (
                                                <Image src="/icons/bay.svg" alt="Bay" width={12} height={12} className="object-contain" />
                                        ) : (
                                                <Image src="/icons/van.svg" alt="Van" width={12} height={12} className="object-contain" />
                                        )}
                                        {selectedResource.name}
                                    </span>
                                )}
                                </div>
                            </div>
                            {showCloseButton && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleClose();
                                    }} 
                                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                    aria-label="Close"
                                >
                                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                                </button>
                            )}
                        </div>
                            {resources.length > 0 && !preSelectedResource && (
                                <select
                                    value={selectedResourceId}
                                    onChange={(e) => setSelectedResourceId(e.target.value)}
                                className="mt-3 px-3 py-2 text-sm border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                style={{ borderColor: '#E2E2DD' }}
                                >
                                    <option value="">Select a resource (required)</option>
                                    {resources.map((resource) => (
                                        <option key={resource.id} value={resource.id}>
                                            {resource.name} ({resource.type === 'bay' ? 'Bay' : 'Van'})
                                        </option>
                                    ))}
                                </select>
                                )}
                    </div>
                )}

                <div
                    className="flex-1 overflow-y-auto overflow-x-hidden"
                    style={{
                        paddingTop: contentPaddingTop,
                        paddingBottom: '24px',
                        paddingLeft: contentPaddingLeft,
                        paddingRight: contentPaddingRight,
                        boxSizing: 'border-box',
                        touchAction: contentTouchAction,
                        overscrollBehaviorX: contentOverscrollX
                    }}
                >
                <div className="space-y-3">
                    {/* Customer Information */}
                    <div className={renderMode === 'drawer' ? 'pt-0' : 'pt-2'}>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer</h3>
                        
                        {/* Search bar - only show when no customer is selected */}
                        {!selectedCustomer && (
                            <div className="relative">
                                <div className="relative">
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
                                            // Delay hiding suggestions to allow click on suggestion
                                            setTimeout(() => setShowCustomerSuggestions(false), 200);
                                        }}
                                        onKeyDown={handleCustomerSearchKeyDown}
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent pl-10" 
                                        placeholder="Search existing customers"
                                        style={{ borderColor: '#E2E2DD' }}
                                    />
                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                {showCustomerSuggestions && customerSearch.trim().length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto" style={{ borderColor: '#E2E2DD' }}>
                                        {filteredCustomers.map((customer, index) => (
                                            <div
                                                key={customer.id}
                                                onClick={() => handleCustomerSelect(customer)}
                                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                                    index === selectedCustomerIndex 
                                                        ? 'bg-gray-100' 
                                                        : ''
                                                }`}
                                            >
                                                <div className="font-medium text-gray-900">
                                                    {customer.customerName || 'Unnamed Customer'}
                                                </div>
                                                {customer.customerPhone && (
                                                    <div className="text-sm text-gray-500">
                                                        {customer.customerPhone}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {/* Always show "Add new customer" as the last option */}
                                        {showAddNewCustomer && (
                                            <div
                                                onClick={handleAddNewCustomer}
                                                className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                                                    filteredCustomers.length > 0 ? 'border-t' : ''
                                                } ${
                                                    filteredCustomers.length === selectedCustomerIndex 
                                                        ? 'bg-gray-100' 
                                                        : ''
                                                }`}
                                                style={{ borderColor: '#E2E2DD' }}
                                            >
                                                <div className="font-medium text-blue-600 flex items-center gap-2">
                                                    <span>+</span>
                                                    <span>Add new customer: "{customerSearch}"</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                            
                        {/* "New customer" button - only show when no customer is selected */}
                        {!selectedCustomer && (
                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onOpenNewCustomerModal) {
                                            onOpenNewCustomerModal('');
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    style={{ borderColor: '#E2E2DD' }}
                                >
                                    <span className="text-gray-600">+</span>
                                    <span>New customer</span>
                                </button>
                            </div>
                        )}
                            
                        {/* Customer card - show when customer is selected (replaces search bar) */}
                        {selectedCustomer && (
                            <div 
                                ref={customerCardRef}
                                className="bg-gray-50 rounded-xl p-4 border relative" 
                                style={{ borderColor: '#E2E2DD' }}
                            >
                                <div className="flex items-start justify-between">
                                    <div 
                                        className="flex-1 pr-8 hover:bg-gray-100 -m-2 p-2 rounded-lg transition-colors"
                                        onMouseEnter={() => {
                                            // Clear any pending timeout
                                            if (customerPopupTimeoutRef.current) {
                                                clearTimeout(customerPopupTimeoutRef.current);
                                                customerPopupTimeoutRef.current = null;
                                            }
                                            
                                            if (customerCardRef.current) {
                                                const rect = customerCardRef.current.getBoundingClientRect();
                                                // Position popup to the left of the action panel, adjacent to customer box
                                                // Action panel is fixed right-0 with width 400px (md) or 420px (lg)
                                                const actionPanelWidth = window.innerWidth >= 1024 ? 420 : window.innerWidth >= 768 ? 400 : window.innerWidth;
                                                const popupWidth = 320; // w-80 = 320px
                                                const gap = 4; // 4px gap between popup and action panel
                                                
                                                setPopupPosition({
                                                    top: rect.top, // Align top with customer card
                                                    right: actionPanelWidth + gap // Position to the left of action panel with gap
                                                });
                                            }
                                            setShowCustomerDetailsPopup(true);
                                        }}
                                        onMouseLeave={() => {
                                            // Add a small delay before closing to allow moving to popup
                                            customerPopupTimeoutRef.current = setTimeout(() => {
                                                setShowCustomerDetailsPopup(false);
                                            }, 200);
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-semibold text-gray-900 text-base">
                                                {selectedCustomer.customerName || 'Unnamed Customer'}
                                            </h4>
                                            {selectedCustomer.customerPhone && (
                                                <span className="text-sm text-gray-600 ml-2">
                                                    {selectedCustomer.customerPhone}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {selectedCustomer.address && (
                                            <p className="text-sm text-gray-600 mb-3">
                                                {selectedCustomer.address}
                                            </p>
                                        )}
                                        
                                        {selectedCustomer.pastJobs && selectedCustomer.pastJobs.length > 0 && (
                                            <div className="mt-3">
                                                <p className="font-semibold text-sm text-gray-900 mb-1">
                                                    {selectedCustomer.pastJobs.length} Past {selectedCustomer.pastJobs.length === 1 ? 'job' : 'jobs'}
                                                </p>
                                                {selectedCustomer.pastJobs[0] && selectedCustomer.pastJobs[0].date && (
                                                    <p className="text-sm text-gray-600">
                                                        Last detail: {(() => {
                                                            try {
                                                                const date = new Date(selectedCustomer.pastJobs[0].date);
                                                                if (isNaN(date.getTime())) return 'Date unavailable';
                                                                return format(date, 'MMMM d, yyyy');
                                                            } catch (e) {
                                                                return 'Date unavailable';
                                                            }
                                                        })()}
                                                        {selectedCustomer.pastJobs[0].services && selectedCustomer.pastJobs[0].services.length > 0 && (
                                                            <span>, {Array.isArray(selectedCustomer.pastJobs[0].services) ? selectedCustomer.pastJobs[0].services.join(', ') : selectedCustomer.pastJobs[0].services}</span>
                                                        )}
                                                        {selectedCustomer.pastJobs[0].vehicleModel && (
                                                            <span> on a {selectedCustomer.pastJobs[0].vehicleModel}</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0" style={{ position: 'relative', zIndex: 20 }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                console.log('Edit button clicked in EventModal');
                                                // Always call the handler if it exists
                                                if (onOpenEditCustomerModal) {
                                                    console.log('Calling onOpenEditCustomerModal with:', {
                                                        customerName: selectedCustomer.customerName || '',
                                                        customerPhone: selectedCustomer.customerPhone || '',
                                                        customerAddress: selectedCustomer.address || ''
                                                    });
                                                    onOpenEditCustomerModal({
                                                        customerName: selectedCustomer.customerName || '',
                                                        customerPhone: selectedCustomer.customerPhone || '',
                                                        customerAddress: selectedCustomer.address || ''
                                                    });
                                                } else {
                                                    console.error('onOpenEditCustomerModal is not available');
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                            }}
                                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                            style={{ position: 'relative', zIndex: 20, pointerEvents: 'auto' }}
                                            title="Edit customer"
                                        >
                                            <PencilIcon className="w-4 h-4 text-gray-700" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClearCustomer();
                                            }}
                                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                            title="Remove customer"
                                        >
                                            <XMarkIcon className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </div>
                                </div>
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
                                                            Past Jobs ({selectedCustomer.pastJobs.length})
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
                                                               {job.date ? (() => {
                                                                   try {
                                                                       const date = new Date(job.date);
                                                                       if (isNaN(date.getTime())) return 'Date unavailable';
                                                                       return format(date, 'MMMM d, yyyy');
                                                                   } catch (e) {
                                                                       return 'Date unavailable';
                                                                   }
                                                               })() : 'Date unavailable'}
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

                    {/* Vehicle Information */}
                    <div className="pt-2">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Car model</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            {vehicles.map((vehicle) => (
                                <div
                                    key={vehicle.id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-white text-sm font-medium"
                                >
                                    <span>{vehicle.model}</span>
                                    <button
                                        onClick={() => setVehicles(vehicles.filter(v => v.id !== vehicle.id))}
                                        className="hover:bg-gray-700 rounded-full p-0.5 transition-colors"
                                        type="button"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => setShowAddVehicleModal(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                style={{ borderColor: '#E2E2DD' }}
                            >
                                <span className="text-gray-600">+</span>
                                <span>Add car model</span>
                            </button>
                        </div>
                        
                        {/* Add Vehicle Modal */}
                        {showAddVehicleModal && (
                            <div className="fixed inset-0 flex items-center justify-center z-[70] p-4" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
                                <div className="rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: '#F8F8F7', width: '400px' }}>
                                    <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#E2E2DD' }}>
                                        <h2 className="text-xl font-bold text-gray-900">Add Car Model</h2>
                                        <button
                                            onClick={() => {
                                                setShowAddVehicleModal(false);
                                                setNewVehicleModel('');
                                            }}
                                            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <XMarkIcon className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                    <div className="p-6">
                    <div>
                                            <label htmlFor="new-vehicle-model" className="block text-sm font-medium text-gray-700 mb-2">
                                Vehicle Model
                            </label>
                            <input 
                                type="text" 
                                                id="new-vehicle-model" 
                                                value={newVehicleModel} 
                                                onChange={e => setNewVehicleModel(e.target.value)} 
                                                className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent" 
                                placeholder="e.g., Camry, Civic, F-150, Model 3"
                                                style={{ borderColor: '#E2E2DD' }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && newVehicleModel.trim()) {
                                                        e.preventDefault();
                                                        setVehicles([...vehicles, { id: `vehicle-${Date.now()}`, model: newVehicleModel.trim() }]);
                                                        setNewVehicleModel('');
                                                        setShowAddVehicleModal(false);
                                                    }
                                                }}
                            />
                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <button
                                                onClick={() => {
                                                    setShowAddVehicleModal(false);
                                                    setNewVehicleModel('');
                                                }}
                                                className="flex-1 px-6 py-2 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                                                style={{ borderColor: '#E2E2DD' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (newVehicleModel.trim()) {
                                                        setVehicles([...vehicles, { id: `vehicle-${Date.now()}`, model: newVehicleModel.trim() }]);
                                                        setNewVehicleModel('');
                                                        setShowAddVehicleModal(false);
                                                    }
                                                }}
                                                disabled={!newVehicleModel.trim()}
                                                className="px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                                <span>Add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Services */}
                    <div className="pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Details</h3>
                        <div className="relative">
                            <div className="relative">
                            <input 
                                type="text" 
                                    id="service-search" 
                                    value={serviceSearch} 
                                    onChange={e => {
                                        setServiceSearch(e.target.value);
                                        setShowServiceDropdown(true);
                                    }}
                                    onFocus={() => {
                                        if (serviceSearch.trim().length > 0 || availableServices.length > 0) {
                                            setShowServiceDropdown(true);
                                        }
                                    }}
                                    onBlur={() => {
                                        // Delay hiding dropdown to allow click on checkbox
                                        setTimeout(() => setShowServiceDropdown(false), 200);
                                    }}
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent pr-10" 
                                    placeholder="Select service"
                                    style={{ borderColor: '#E2E2DD' }}
                                />
                                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                
                            {/* Service & Bundle Dropdown with Checkboxes */}
                            {showServiceDropdown && (
                                <div className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto top-full" style={{ borderColor: '#E2E2DD' }}>
                                    {/* Bundles Section - Show First */}
                                    {availableBundles
                                        .filter(bundle => {
                                            if (!serviceSearch.trim()) return true;
                                            return bundle.name.toLowerCase().includes(serviceSearch.toLowerCase());
                                        })
                                        .map((bundle) => {
                                            const isSelected = selectedServices.some(s => s.id === bundle.id && s.type === 'bundle');
                                            return (
                                                <label
                                                    key={`bundle-${bundle.id}`}
                                                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedServices([...selectedServices, { id: bundle.id, name: bundle.name, type: 'bundle' }]);
                                                            } else {
                                                                setSelectedServices(selectedServices.filter(s => !(s.id === bundle.id && s.type === 'bundle')));
                                                            }
                                                            setServiceSearch('');
                                                        }}
                                                        className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <div className="ml-3 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900">{bundle.name}</span>
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Bundle</span>
                        </div>
                                                        {bundle.price && (
                                                            <span className="text-xs text-gray-500">${bundle.price}</span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    
                                    {/* Services Section - Show After Bundles */}
                                    {availableBundles.filter(bundle => {
                                        if (!serviceSearch.trim()) return true;
                                        return bundle.name.toLowerCase().includes(serviceSearch.toLowerCase());
                                    }).length > 0 && availableServices.filter(service => {
                                        if (!serviceSearch.trim()) return true;
                                        return service.name.toLowerCase().includes(serviceSearch.toLowerCase());
                                    }).length > 0 && (
                                        <div className="border-t" style={{ borderColor: '#E2E2DD' }}></div>
                                    )}
                                    {availableServices
                                        .filter(service => {
                                            if (!serviceSearch.trim()) return true;
                                            return service.name.toLowerCase().includes(serviceSearch.toLowerCase());
                                        })
                                        .map((service) => {
                                            const isSelected = selectedServices.some(s => s.id === service.id && s.type === 'service');
                                            return (
                                                <label
                                                    key={`service-${service.id}`}
                                                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedServices([...selectedServices, { id: service.id, name: service.name, type: 'service' }]);
                                                            } else {
                                                                setSelectedServices(selectedServices.filter(s => !(s.id === service.id && s.type === 'service')));
                                                            }
                                                            setServiceSearch('');
                                                        }}
                                                        className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span className="ml-3 text-sm text-gray-900">{service.name}</span>
                                                    {service.category && (
                                                        <span className="ml-auto text-xs text-gray-500">{service.category.name}</span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    
                                    {availableServices.filter(service => {
                                        if (!serviceSearch.trim()) return true;
                                        return service.name.toLowerCase().includes(serviceSearch.toLowerCase());
                                    }).length === 0 && 
                                    availableBundles.filter(bundle => {
                                        if (!serviceSearch.trim()) return true;
                                        return bundle.name.toLowerCase().includes(serviceSearch.toLowerCase());
                                    }).length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-500">No services or bundles found</div>
                                    )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Selected Services & Bundles Tags */}
                            {selectedServices.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    {selectedServices.map((item) => (
                                        <div
                                            key={`${item.type}-${item.id}`}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-white text-sm font-medium"
                                        >
                                            <span>{item.name}</span>
                                            {item.type === 'bundle' && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white">Bundle</span>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedServices(selectedServices.filter(s => !(s.id === item.id && s.type === item.type)));
                                                }}
                                                className="hover:bg-gray-700 rounded-full p-0.5 transition-colors"
                                                type="button"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                        </div>
                    </div>

                    {/* Date and Time Section */}
                    <div className="pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Scheduling</h3>
                        
                        {/* All-Day and Multi-Day Toggles */}
                        <div className="mb-4 flex items-center gap-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isAllDay}
                                    onChange={(e) => setIsAllDay(e.target.checked)}
                                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                                />
                                <span className="text-sm font-medium text-gray-700">All-day event</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isMultiDay}
                                    onChange={(e) => setIsMultiDay(e.target.checked)}
                                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                                />
                                <span className="text-sm font-medium text-gray-700">Multi-day event</span>
                            </label>
                        </div>

                        {/* Date and Time Inputs */}
                        <div className="space-y-4">
                            {/* First Row: Dates */}
                            {isMultiDay ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date *
                                        </label>
                                        <input 
                                            type="date" 
                                            id="start-date" 
                                            value={startDate} 
                                            onChange={e => setStartDate(e.target.value)} 
                                            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent" 
                                            style={{ borderColor: '#E2E2DD', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date *
                                        </label>
                                        <input 
                                            type="date" 
                                            id="end-date" 
                                            value={endDate} 
                                            onChange={e => setEndDate(e.target.value)} 
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent" 
                                        style={{ borderColor: '#E2E2DD', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date *
                                    </label>
                                    <input 
                                        type="date" 
                                        id="start-date" 
                                        value={startDate} 
                                        onChange={e => setStartDate(e.target.value)} 
                                        className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent" 
                                        style={{ borderColor: '#E2E2DD', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                                    />
                                </div>
                            )}

                            {/* Second Row: Times (only for multi-day or when not all-day) */}
                            {isMultiDay && !isAllDay && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Time *
                                        </label>
                                        <select
                                            id="start-time"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            style={{ borderColor: '#E2E2DD' }}
                                        >
                                            <option value="">Select start time</option>
                                            {timeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-2">
                                            End Time *
                                        </label>
                                        <select
                                            id="end-time"
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            style={{ borderColor: '#E2E2DD' }}
                                        >
                                            <option value="">Select end time</option>
                                            {timeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Single day, not all-day: Show times in one row */}
                            {!isMultiDay && !isAllDay && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                        <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Time *
                                        </label>
                                        <select
                                            id="start-time"
                                            value={startTime}
                                            onChange={e => setStartTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            style={{ borderColor: '#E2E2DD' }}
                                        >
                                            <option value="">Select start time</option>
                                            {timeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                            </div>
                            <div>
                                        <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 mb-2">
                                            End Time *
                                        </label>
                                        <select
                                            id="end-time"
                                            value={endTime}
                                            onChange={e => setEndTime(e.target.value)}
                                            className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                            style={{ borderColor: '#E2E2DD' }}
                                        >
                                            <option value="">Select end time</option>
                                            {timeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                            </div>
                        </div>
                    )}

                            {/* All-day: Show business hours (disabled) */}
                            {isAllDay && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Time (Business Hours)
                                        </label>
                                        <input 
                                            type="time" 
                                            value={startTime} 
                                            disabled
                                            className="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed" 
                                            style={{ borderColor: '#E2E2DD' }}
                                        />
                                    </div>
                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Time (Business Hours)
                                        </label>
                                        <input 
                                            type="time" 
                                            value={endTime} 
                                            disabled
                                            className="w-full px-4 py-2.5 border rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed" 
                                            style={{ borderColor: '#E2E2DD' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Warning message only if no business hours */}
                            {isAllDay && startDate && (!startTime || !endTime) && (
                                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    No business hours set for this day. Please set business hours in your profile settings.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Employee Selection */}
                    <div className="pt-4">
                        <label htmlFor="employee-select" className="block text-sm font-semibold text-gray-900 mb-2">
                            Assign Employee *
                        </label>
                        {employees.length === 0 ? (
                            <p className="text-sm text-gray-500 mb-2">
                                No active employees found. Please add employees in the Resources page.
                            </p>
                        ) : (
                            <div className="relative">
                                <button
                                    type="button"
                                    id="employee-select"
                                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                                    onBlur={() => {
                                        // Delay hiding dropdown to allow click on option
                                        setTimeout(() => setShowEmployeeDropdown(false), 200);
                                    }}
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent pr-10 text-left flex items-center gap-3"
                                    style={{ borderColor: '#E2E2DD' }}
                                >
                                    {selectedEmployeeId ? (
                                        <>
                                            {(() => {
                                                const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
                                                return selectedEmployee ? (
                                                    <>
                                                        <span 
                                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: selectedEmployee.color }}
                                                        />
                                                        <span className="text-sm">{selectedEmployee.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-gray-500">Select an employee</span>
                                                );
                                            })()}
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-500">Select an employee</span>
                                    )}
                                </button>
                                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                
                                {/* Employee Dropdown */}
                                {showEmployeeDropdown && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-60 overflow-auto top-full" style={{ borderColor: '#E2E2DD' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedEmployeeId('');
                                                setShowEmployeeDropdown(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 ${
                                                !selectedEmployeeId ? 'bg-gray-50' : ''
                                            }`}
                                        >
                                            <span className="text-sm text-gray-500">Select an employee</span>
                                        </button>
                                        {employees.map((employee) => {
                                            const isSelected = selectedEmployeeId === employee.id;
                                            return (
                                                <button
                                                    key={employee.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEmployeeId(employee.id);
                                                        setShowEmployeeDropdown(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 ${
                                                        isSelected ? 'bg-gray-50' : ''
                                                    }`}
                                                >
                                                    <span 
                                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: employee.color }}
                                                    />
                                                    <span className="text-sm text-gray-900">{employee.name}</span>
                                                    {isSelected && (
                                                        <svg className="ml-auto w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Station and Arrival */}
                    <div className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Station Dropdown */}
                            <div>
                                <label htmlFor="station-select" className="block text-sm font-semibold text-gray-900 mb-2">
                                    Station
                                </label>
                                <select
                                    id="station-select"
                                    value={selectedResourceId}
                                    onChange={e => setSelectedResourceId(e.target.value)}
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                    style={{ borderColor: '#E2E2DD' }}
                                >
                                    <option value="">Select station</option>
                                    {resources.map((resource) => (
                                        <option key={resource.id} value={resource.id}>
                                            {resource.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Arrival Dropdown */}
                            <div>
                                <label htmlFor="location-type" className="block text-sm font-semibold text-gray-900 mb-2">
                                    Arrival
                                </label>
                                <select
                                    id="location-type"
                                    value={locationType}
                                    onChange={e => setLocationType(e.target.value)}
                                    disabled={selectedResourceId ? resources.find(r => r.id === selectedResourceId)?.type === 'van' : false}
                                    className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                                    style={{ borderColor: '#E2E2DD' }}
                                >
                                    <option value="">Select location type</option>
                                    <option value="pick up">Pick Up</option>
                                    <option value="drop off">Drop Off</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Customer Notes */}
                    <div className="pt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Notes</h3>
                        <div>
                            <textarea 
                                id="customer-notes"
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                rows={4}
                                className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none" 
                                placeholder="e.g., Customer prefers hand-wash only, always 5 minutes late, prefers early morning appointments..."
                                style={{ borderColor: '#E2E2DD' }}
                            />
                        </div>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 p-6" style={{ backgroundColor: '#F8F8F7' }}>
                    <div className="flex gap-3">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleClose();
                            }} 
                            className="flex-1 px-6 py-2 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors" 
                            style={{ borderColor: '#E2E2DD' }}
                        >
                            Cancel
                    </button>
                        <button onClick={handleSubmit} className="flex-1 px-6 py-2 bg-[#2b2b26] text-white rounded-xl hover:bg-[#4a4844] transition-colors flex items-center justify-center gap-2">
                            <CheckIcon className="w-5 h-5" />
                            <span>Accept</span>
                    </button>
                    </div>
                </div>
            </div>

            {/* Discard Changes Modal - moved to parent CalendarPage level */}
        </div>
    );
} 
