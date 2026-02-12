"use client";
import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef, Fragment, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon as ChevronDownIconSolid, PlusIcon } from "@heroicons/react/24/solid";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays, 
  subDays, 
  addMonths, 
  subMonths,
  parseISO,
  isToday,
  isSameDay,
  startOfMonth,
  endOfMonth,
  getDay,
  isBefore,
  startOfDay
} from 'date-fns';
import { ChevronDownIcon, Cog8ToothIcon, FunnelIcon, UsersIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { XMarkIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/solid';
import EventModal from './components/EventModal';
import AddressAutocompleteInput from './components/AddressAutocompleteInput';
import NewCustomerModal from './components/NewCustomerModal';
import { formatPhoneDisplay } from '@/lib/phone';
import { getCustomerTypeFromHistory } from '@/lib/customerType';
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/app/components/ui/hover-card";

// Discard Changes Modal Component
const DiscardChangesModal = ({ 
  isOpen, 
  onKeepEditing, 
  onDiscard,
  isCreating = false 
}: { 
  isOpen: boolean; 
  onKeepEditing: (e?: React.MouseEvent) => void; 
  onDiscard: () => void;
  isCreating?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
      onClick={(e) => {
        // Prevent backdrop click from closing modal - user must choose an action
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isCreating ? 'Discard this event?' : 'Discard changes?'}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            You have unsaved changes. Updates will be lost.
          </p>
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onKeepEditing(e);
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Keep editing
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDiscard();
              }}
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

// Helper function to extract clean description from event description (handle both clean and metadata formats)
const getCleanDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  // If description contains metadata marker, extract the clean part
  if (desc.includes('__METADATA__:')) {
    const parts = desc.split('__METADATA__:');
    return parts[0].trim();
  }
  return desc;
};

const getEventDateString = (event: any): string => {
  if (!event) return '';
  if (event.start) {
    if (typeof event.start === 'string') {
      return event.start.includes('T') ? event.start.split('T')[0] : event.start;
    }
    const startDate = new Date(event.start);
    if (!Number.isNaN(startDate.getTime())) {
      return format(startDate, 'yyyy-MM-dd');
    }
  }
  if (event.date) {
    return typeof event.date === 'string' ? event.date : format(new Date(event.date), 'yyyy-MM-dd');
  }
  return '';
};

const getEmployeeInitials = (name?: string): string => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    const word = parts[0];
    return word.slice(0, 2).toUpperCase();
  }
  return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
};

const getEmployeeBadgeClass = (color?: string): string => {
  switch ((color || '').toLowerCase()) {
    case 'blue':
      return 'bg-blue-500 text-white';
    case 'green':
      return 'bg-green-500 text-white';
    case 'orange':
      return 'bg-orange-500 text-white';
    case 'red':
      return 'bg-red-500 text-white';
    case 'gray':
      return 'bg-gray-400 text-gray-900';
    case 'purple':
      return 'bg-purple-500 text-white';
    case 'pink':
      return 'bg-pink-500 text-white';
    default:
      return 'bg-gray-400 text-gray-900';
  }
};

const isEventUnpaid = (event: any): boolean => {
  if (!event) return false;
  // Check the `paid` field from Event model (false = unpaid, true = paid)
  if (event.paid !== undefined) return event.paid === false;
  // Fallback for bookings that use paymentStatus/status
  const paymentStatus = (event.paymentStatus ?? event.status ?? '').toString().toLowerCase();
  return paymentStatus === 'unpaid';
};

// Event Edit Form Component
const EventEditForm = forwardRef<{ handleCancel: () => void; handleSubmit: () => void }, {
  event: any, 
  resources: Array<{ id: string, name: string, type: 'bay' | 'van' }>,
  onSave: (data: any) => void,
  onCancel: () => void,
  onDirtyChange?: (isDirty: boolean) => void,
  onRequestDiscard?: () => void,
  onEditCustomer?: () => void
}>(({ event, resources, onSave, onCancel, onDirtyChange, onRequestDiscard, onEditCustomer }, ref) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(event.employeeId || '');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string; color: string; imageUrl?: string }>>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState(() => {
    const eventDate = event.date || event.start;
    if (!eventDate) return '';
    
    // Extract date part directly from ISO string to avoid timezone issues
    if (typeof eventDate === 'string') {
      // If it's an ISO string, extract the date part (YYYY-MM-DD)
      if (eventDate.includes('T')) {
        return eventDate.split('T')[0];
      }
      // If it's already in YYYY-MM-DD format
      if (eventDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        return eventDate;
      }
    }
    
    // Fallback to formatting the date object
    const date = new Date(eventDate);
    // Use UTC methods to avoid timezone conversion
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [startTime, setStartTime] = useState(() => {
    if (event.start && event.end && !event.allDay) {
      return format(new Date(event.start), 'HH:mm');
    } else if (event.time) {
      // Check if time is in range format: "7:00 AM to 12:00 PM"
      const timeRangeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeRangeMatch) {
        // Extract start time and convert to 24-hour format
        let startHour = parseInt(timeRangeMatch[1]);
        const startMin = timeRangeMatch[2];
        const startPeriod = timeRangeMatch[3].toUpperCase();
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        return `${String(startHour).padStart(2, '0')}:${startMin}`;
      }
      // If not a range, try to parse as single time
      return event.time;
    }
    return '';
  });
  const [endTime, setEndTime] = useState(() => {
    if (event.start && event.end && !event.allDay) {
      return format(new Date(event.end), 'HH:mm');
    } else if (event.time) {
      // Check if time is in range format: "7:00 AM to 12:00 PM"
      const timeRangeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeRangeMatch) {
        // Extract end time and convert to 24-hour format
        let endHour = parseInt(timeRangeMatch[4]);
        const endMin = timeRangeMatch[5];
        const endPeriod = timeRangeMatch[6].toUpperCase();
        if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
        if (endPeriod === 'AM' && endHour === 12) endHour = 0;
        return `${String(endHour).padStart(2, '0')}:${endMin}`;
      }
    }
    return '';
  });
  const [isAllDay, setIsAllDay] = useState(event.allDay || false);
  const [isMultiDay, setIsMultiDay] = useState(() => {
    // Check if event spans multiple days
    if (event.start && event.end) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return start.getTime() !== end.getTime();
    }
    return false;
  });
  const [endDate, setEndDate] = useState(() => {
    // Extract end date from event.end
    if (event.end) {
      const eventEndDate = event.end;
      if (typeof eventEndDate === 'string') {
        if (eventEndDate.includes('T')) {
          return eventEndDate.split('T')[0];
        }
        if (eventEndDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          return eventEndDate;
        }
      }
      const date = new Date(eventEndDate);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  });
  const [selectedResourceId, setSelectedResourceId] = useState(event.resourceId || '');
  const [description, setDescription] = useState(getCleanDescription(event.description));
  const [customerNotes, setCustomerNotes] = useState(event.customerNotes || '');
  const [isPaid, setIsPaid] = useState(event.paid === true);
  const isBlockEvent = event?.eventType === 'block';
  const [businessHours, setBusinessHours] = useState<any>(null);
  const [customerName, setCustomerName] = useState(event.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(event.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(event.customerAddress || '');
  const [customerType, setCustomerType] = useState(event.customerType || '');
  const [locationType, setLocationType] = useState(event.locationType || '');
  const [vehicles, setVehicles] = useState<Array<{ id: string; model: string }>>(() => {
    // Initialize vehicles from event data
    let vehicleList: Array<{ id: string; model: string }> = [];
    if (event.vehicles && Array.isArray(event.vehicles)) {
      vehicleList = event.vehicles.map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v }));
    } else if (event.vehicleType || event.vehicleModel) {
      const vehicleStr = event.vehicleType || event.vehicleModel || '';
      if (vehicleStr.includes(',')) {
        vehicleList = vehicleStr.split(',').map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v.trim() })).filter((v: { id: string; model: string }) => v.model);
      } else if (vehicleStr) {
        vehicleList = [{ id: 'vehicle-0', model: vehicleStr }];
      }
    }
    return vehicleList;
  });
  const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([]);
  const [availableBundles, setAvailableBundles] = useState<Array<{ id: string; name: string; description?: string; price?: number; services?: Array<{ service: { id: string; name: string } }> }>>([]);
  const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; type: 'service' | 'bundle' }>>([]);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const newVehicleModelInputRef = useRef<HTMLInputElement | null>(null);
  
  // Store initial values to detect changes
  const initialValuesRef = useRef({
    selectedEmployeeId: event.employeeId || '',
    startDate: '',
    startTime: '',
    endTime: '',
    isAllDay: event.allDay || false,
    selectedResourceId: event.resourceId || '',
    description: event.description || '',
    customerNotes: event.customerNotes || '',
    isPaid: event.paid === true,
    customerName: event.customerName || '',
    customerPhone: event.customerPhone || '',
    customerAddress: event.customerAddress || '',
    customerType: event.customerType || '',
    locationType: event.locationType || '',
    vehicles: [] as Array<{ id: string; model: string }>,
    selectedServices: [] as Array<{ id: string; name: string; type: 'service' | 'bundle' }>
  });

  // Initialize initial values after state is set
  useEffect(() => {
    const eventDate = event.date || event.start;
    let dateStr = '';
    if (eventDate) {
      if (typeof eventDate === 'string') {
        if (eventDate.includes('T')) {
          dateStr = eventDate.split('T')[0];
        } else if (eventDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          dateStr = eventDate;
        }
      } else {
        const date = new Date(eventDate);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
    }

    let timeStr = '';
    if (event.start && event.end && !event.allDay) {
      timeStr = format(new Date(event.start), 'HH:mm');
    }

    let endTimeStr = '';
    if (event.start && event.end && !event.allDay) {
      endTimeStr = format(new Date(event.end), 'HH:mm');
    }

    let vehicleList: Array<{ id: string; model: string }> = [];
    if (event.vehicles && Array.isArray(event.vehicles)) {
      vehicleList = event.vehicles.map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v }));
    } else if (event.vehicleType || event.vehicleModel) {
      const vehicleStr = event.vehicleType || event.vehicleModel || '';
      if (vehicleStr.includes(',')) {
        vehicleList = vehicleStr.split(',').map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v.trim() })).filter((v: { id: string; model: string }) => v.model);
      } else if (vehicleStr) {
        vehicleList = [{ id: 'vehicle-0', model: vehicleStr }];
      }
    }

    let servicesList: Array<{ id: string; name: string; type: 'service' | 'bundle' }> = [];
    if (event.services) {
      const eventServicesList = Array.isArray(event.services) ? event.services : [event.services];
      servicesList = eventServicesList.map((serviceName: string) => ({ 
        id: `temp-${serviceName}`, 
        name: serviceName, 
        type: 'service' as const 
      }));
    }

    initialValuesRef.current = {
      selectedEmployeeId: event.employeeId || '',
      startDate: dateStr,
      startTime: timeStr,
      endTime: endTimeStr,
      isAllDay: event.allDay || false,
      selectedResourceId: event.resourceId || '',
      description: event.description || '',
      customerNotes: event.customerNotes || '',
      isPaid: event.paid === true,
      customerName: event.customerName || '',
      customerPhone: event.customerPhone || '',
      customerAddress: event.customerAddress || '',
      customerType: event.customerType || '',
      locationType: event.locationType || '',
      vehicles: vehicleList,
      selectedServices: servicesList
    };
    setSelectedServices(servicesList);
  }, []);

  useEffect(() => {
    if (!showAddVehicleModal) return;
    const rafId = requestAnimationFrame(() => {
      newVehicleModelInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(rafId);
  }, [showAddVehicleModal]);

  // Update customer fields when event prop changes (e.g., after editing customer)
  useEffect(() => {
    setCustomerName(event.customerName || '');
    setCustomerPhone(event.customerPhone || '');
    setCustomerAddress(event.customerAddress || '');
  }, [event.customerName, event.customerPhone, event.customerAddress]);

  // Check if form has been modified
  const checkIfDirty = () => {
    const current = {
      selectedEmployeeId,
      startDate,
      startTime,
      endTime,
      isAllDay,
      selectedResourceId,
      description,
      customerNotes,
      isPaid,
      customerName,
      customerPhone,
      customerAddress,
      customerType,
      locationType,
      vehicles: vehicles.map(v => v.model).sort().join(','),
      selectedServices: selectedServices.map(s => s.name).sort().join(',')
    };

    const initial = {
      selectedEmployeeId: initialValuesRef.current.selectedEmployeeId,
      startDate: initialValuesRef.current.startDate,
      startTime: initialValuesRef.current.startTime,
      endTime: initialValuesRef.current.endTime,
      isAllDay: initialValuesRef.current.isAllDay,
      selectedResourceId: initialValuesRef.current.selectedResourceId,
      description: initialValuesRef.current.description,
      customerNotes: initialValuesRef.current.customerNotes,
      isPaid: initialValuesRef.current.isPaid,
      customerName: initialValuesRef.current.customerName,
      customerPhone: initialValuesRef.current.customerPhone,
      customerAddress: initialValuesRef.current.customerAddress,
      customerType: initialValuesRef.current.customerType,
      locationType: initialValuesRef.current.locationType,
      vehicles: initialValuesRef.current.vehicles.map(v => v.model).sort().join(','),
      selectedServices: initialValuesRef.current.selectedServices.map(s => s.name).sort().join(',')
    };

    return JSON.stringify(current) !== JSON.stringify(initial);
  };

  // Track dirty state and notify parent
  useEffect(() => {
    if (onDirtyChange) {
      const isDirty = checkIfDirty();
      onDirtyChange(isDirty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId, startDate, startTime, endTime, isAllDay, selectedResourceId, description, customerNotes, isPaid,
      customerName, customerPhone, customerAddress, customerType, locationType, vehicles.length, selectedServices.length]);

  // Handle cancel with dirty check
  const handleCancel = () => {
    if (checkIfDirty()) {
      if (onRequestDiscard) {
        onRequestDiscard();
      }
    } else {
      onCancel();
    }
  };
  
  // Auto-generate title from selected services
  const title = selectedServices.map(s => s.name).join(', ') || '';

  // Fetch employees
  useEffect(() => {
    fetch('/api/detailer/employees')
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          setEmployees(data.employees.filter((e: any) => e.isActive));
        }
      })
      .catch(err => console.error('Error fetching employees:', err));
  }, []);

  // Fetch services and bundles
  useEffect(() => {
    fetch('/api/detailer/services')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableServices(data);
        } else if (Array.isArray(data?.services)) {
          setAvailableServices(data.services);
        } else {
          setAvailableServices([]);
        }
      })
      .catch(err => console.error('Error fetching services:', err));
    
    fetch('/api/detailer/bundles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableBundles(data);
        } else if (Array.isArray(data?.bundles)) {
          setAvailableBundles(data.bundles);
        } else {
          setAvailableBundles([]);
        }
      })
      .catch(err => console.error('Error fetching bundles:', err));
  }, []);

  // Initialize selected services from event data
  useEffect(() => {
    if (event.services) {
      const eventServicesList = Array.isArray(event.services) ? event.services : [event.services];
      const matchedItems: Array<{ id: string; name: string; type: 'service' | 'bundle' }> = eventServicesList
        .map((serviceName: string) => {
          const service = availableServices.find((s: any) => s.name === serviceName);
          if (service) {
            return { id: service.id, name: service.name, type: 'service' as const };
          }
          const bundle = availableBundles.find((b: any) => b.name === serviceName);
          if (bundle) {
            return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
          }
          // If not found, create a placeholder
          return { id: `temp-${Date.now()}-${Math.random()}`, name: serviceName, type: 'service' as const };
        })
        .filter((s: { id: string; name: string; type: 'service' | 'bundle' } | null): s is { id: string; name: string; type: 'service' | 'bundle' } => s !== null);
      setSelectedServices(matchedItems);
    }
  }, [event.services, availableServices, availableBundles]);

  // Parse metadata from description if customerType or locationType are not set
  useEffect(() => {
    if ((!event.customerType || !event.locationType) && event.description && event.description.includes('__METADATA__:')) {
      const parts = event.description.split('__METADATA__:');
      try {
        const metadata = JSON.parse(parts[1] || '{}');
        if (!event.customerType && metadata.customerType) {
          setCustomerType(metadata.customerType);
        }
        if (!event.locationType && metadata.locationType) {
          setLocationType(metadata.locationType);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [event.description, event.customerType, event.locationType]);

  // Update date and times when event prop changes (e.g., after saving)
  useEffect(() => {
    // Update startDate if event.date or event.start changes
    if (event.date || event.start) {
      const eventDate = event.date || event.start;
      if (typeof eventDate === 'string') {
        if (eventDate.includes('T')) {
          setStartDate(eventDate.split('T')[0]);
        } else if (eventDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          setStartDate(eventDate);
        }
      } else {
        const date = new Date(eventDate);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        setStartDate(`${year}-${month}-${day}`);
      }
    }
    
    // Update times
    if (event.start && event.end && !event.allDay) {
      setStartTime(format(new Date(event.start), 'HH:mm'));
      setEndTime(format(new Date(event.end), 'HH:mm'));
    } else if (event.time) {
      // Check if time is in range format: "7:00 AM to 12:00 PM"
      const timeRangeMatch = event.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s+to\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeRangeMatch) {
        // Extract start time and convert to 24-hour format
        let startHour = parseInt(timeRangeMatch[1]);
        const startMin = timeRangeMatch[2];
        const startPeriod = timeRangeMatch[3].toUpperCase();
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        setStartTime(`${String(startHour).padStart(2, '0')}:${startMin}`);
        
        // Extract end time and convert to 24-hour format
        let endHour = parseInt(timeRangeMatch[4]);
        const endMin = timeRangeMatch[5];
        const endPeriod = timeRangeMatch[6].toUpperCase();
        if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
        if (endPeriod === 'AM' && endHour === 12) endHour = 0;
        setEndTime(`${String(endHour).padStart(2, '0')}:${endMin}`);
      }
    }
  }, [event.date, event.start, event.end, event.time, event.allDay]);

  // Update description when event changes (e.g., after saving)
  useEffect(() => {
    const cleanDesc = getCleanDescription(event.description);
    setDescription(cleanDesc);
  }, [event.description]);

  // Update paid status when event changes
  useEffect(() => {
    setIsPaid(event.paid === true);
  }, [event.paid]);

  // Update customer notes when event changes (e.g., after saving or switching events)
  useEffect(() => {
    setCustomerNotes(event.customerNotes || '');
  }, [event.customerNotes]);

  // Fetch business hours
  useEffect(() => {
    fetch('/api/detailer/profile')
      .then(res => res.json())
      .then(data => {
        const businessHours = data.businessHours || data.profile?.businessHours;
        if (businessHours) {
          setBusinessHours(businessHours);
        }
      })
      .catch(err => console.error('Error fetching business hours:', err));
  }, []);

  // Close employee dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };

    if (showEmployeeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmployeeDropdown]);

  // Get day of week name from date string
  const getDayOfWeek = (dateString: string): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T00:00:00');
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  // Auto-populate times from business hours when all-day is checked
  useEffect(() => {
    if (isAllDay && startDate && businessHours) {
      const dayOfWeek = getDayOfWeek(startDate);
      if (dayOfWeek && businessHours[dayOfWeek]) {
        const dayHours = businessHours[dayOfWeek];
        let openTime: string | undefined;
        let closeTime: string | undefined;
        
        if (Array.isArray(dayHours) && dayHours.length >= 2) {
          [openTime, closeTime] = dayHours;
        } else if (typeof dayHours === 'object' && dayHours !== null) {
          openTime = (dayHours as any).open || (dayHours as any)[0];
          closeTime = (dayHours as any).close || (dayHours as any)[1];
        }
        
        if (openTime && closeTime) {
          const formatTime = (time: string): string => {
            if (!time) return '';
            if (time.match(/^\d{2}:\d{2}$/)) {
              return time;
            }
            const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const hours = timeMatch[1].padStart(2, '0');
              const minutes = timeMatch[2];
              return `${hours}:${minutes}`;
            }
            return time;
          };
          setStartTime(formatTime(openTime));
          setEndTime(formatTime(closeTime));
        } else {
          setStartTime('');
          setEndTime('');
        }
      } else {
        setStartTime('');
        setEndTime('');
      }
    }
  }, [isAllDay, startDate, businessHours]);

  const handleSubmit = () => {
    if (!startDate) {
      alert('Please provide a start date.');
      return;
    }

    if (!isBlockEvent && selectedServices.length === 0) {
      alert('Please select at least one service.');
      return;
    }

    if (!isAllDay && (!startTime || !endTime)) {
      alert('Please provide both start and end times for timed events.');
      return;
    }

    if (isMultiDay && !endDate) {
      alert('Please provide an end date for multi-day events.');
      return;
    }

    // Construct the start and end datetime strings
    // For the API, we need to send date and time separately when we have time fields
    let startDateTime = startDate;
    let endDateTime = isMultiDay ? (endDate || startDate) : startDate;
    let timeToStore = null;
    let startTimeToSend = null;
    let endTimeToSend = null;

    // Helper function to convert 24-hour format (HH:mm) to 12-hour format (h:mm AM/PM)
    const formatTo12Hour = (time24: string): string => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':').map(Number);
      // Handle edge cases: 12:00-12:59 is PM, 0:00-11:59 is AM
      const period = hours >= 12 ? 'PM' : 'AM';
      // Convert to 12-hour format: 0->12, 1-11->1-11, 12->12, 13-23->1-11
      const hours12 = hours === 0 ? 12 : hours === 12 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    };

    if (isAllDay && startTime && endTime) {
      startDateTime = `${startDate}T${startTime}`;
      endDateTime = isMultiDay ? `${endDate}T${endTime}` : `${startDate}T${endTime}`;
      timeToStore = startTime;
    } else if (!isAllDay && startTime && endTime) {
      // For timed events, send date and time separately to avoid timezone issues
      // The API expects: startDate (date only), endDate (date only), startTime (HH:mm), endTime (HH:mm)
      startDateTime = startDate; // Keep as date only (YYYY-MM-DD)
      const endDateForTime = isMultiDay ? (endDate || startDate) : startDate;
      endDateTime = endDateForTime; // Keep as date only (YYYY-MM-DD)
      // Format as time range: "7:00 AM to 12:00 PM"
      const startTime12 = formatTo12Hour(startTime);
      const endTime12 = formatTo12Hour(endTime);
      timeToStore = `${startTime12} to ${endTime12}`;
      startTimeToSend = startTime; // Send as HH:mm format
      endTimeToSend = endTime; // Send as HH:mm format
    }

    onSave({
      title: isBlockEvent
        ? (event.title || 'Blocked Time')
        : selectedServices.map(s => s.name).join(', '), // Use selected services as the title
      eventType: isBlockEvent ? 'block' : (event.eventType || 'appointment'),
      employeeId: selectedEmployeeId || undefined,
      startDate: startDateTime,
      endDate: endDateTime,
      isAllDay,
      isMultiDay: isMultiDay, // Send isMultiDay flag
      time: timeToStore,
      startTime: startTimeToSend || undefined, // Send start time separately for timed events
      endTime: endTimeToSend || undefined, // Send end time separately for timed events
      description, // Event-specific notes
      customerNotes: isBlockEvent ? undefined : customerNotes, // Customer notes (persistent across jobs)
      paid: isPaid, // Payment status
      resourceId: selectedResourceId || undefined,
      ...(isBlockEvent
        ? {}
        : {
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            customerAddress: customerAddress || undefined,
            customerType: customerType || undefined,
            locationType: locationType || undefined,
            vehicleModel: vehicles.length > 0 ? vehicles.map(v => v.model).join(', ') : undefined,
            vehicles: vehicles.length > 0 ? vehicles.map(v => v.model) : undefined,
            services: selectedServices.map(s => s.name)
          })
    });
  };

  // Expose handlers via ref
  useImperativeHandle(ref, () => ({
    handleCancel,
    handleSubmit
  }));

  return (
    <div className="space-y-6 px-3 md:px-0 overflow-x-visible pt-10" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Customer Information */}
      {!isBlockEvent && (
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer</h3>
        {(customerName || customerPhone || customerAddress) ? (
                <div 
            className="bg-gray-50 rounded-xl p-4 border relative" 
                  style={{ borderColor: '#E2E2DD' }}
                >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-base">
                    {customerName || 'Unnamed Customer'}
                  </h4>
                  {customerPhone && (
                    <span className="text-sm text-gray-600 ml-2">
                      {formatPhoneDisplay(customerPhone)}
                    </span>
                  )}
                  </div>
                {customerAddress && (
                  <p className="text-sm text-gray-600">
                    {customerAddress}
                  </p>
            )}
              </div>
              <div className="flex items-center gap-2">
                {onEditCustomer && (
                  <button
                    onClick={onEditCustomer}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Edit customer"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-700" />
                  </button>
            )}
          </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">No customer information available</div>
        )}
      </div>
      )}

      {/* Station, Arrival, Customer Status */}
      <div className="pt-2" style={{ width: '100%', maxWidth: '100%' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ width: '100%', maxWidth: '100%' }}>
          {/* Station Dropdown */}
          <div>
            <label htmlFor="station-select" className="block text-sm font-semibold text-gray-900 mb-2 whitespace-nowrap">
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
          {!isBlockEvent ? (
            <div>
              <label htmlFor="location-type-select" className="block text-sm font-semibold text-gray-900 mb-2 whitespace-nowrap">
                Arrival
              </label>
              <select
                id="location-type-select"
                value={locationType}
                onChange={e => setLocationType(e.target.value)}
                disabled={selectedResourceId ? resources.find(r => r.id === selectedResourceId)?.type === 'van' : false}
                className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                style={{ borderColor: '#E2E2DD' }}
              >
                <option value="">Select location type</option>
                <option value="pickup">Pick Up</option>
                <option value="dropoff">Drop Off</option>
              </select>
            </div>
          ) : (
            <div />
          )}

          {!isBlockEvent ? (
            <div>
              <label htmlFor="customer-status-select" className="block text-sm font-semibold text-gray-900 mb-2 whitespace-nowrap">
                Customer Status
              </label>
              <select
                id="customer-status-select"
                value={customerType}
                onChange={e => setCustomerType(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                style={{ borderColor: '#E2E2DD' }}
              >
                <option value="new">New</option>
                <option value="returning">Repeat</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Vehicle Information */}
      {!isBlockEvent && (
      <div className="border-t border-gray-200 pt-6">
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
                    ref={newVehicleModelInputRef}
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
      )}

      {/* Services */}
      {!isBlockEvent && (
      <div className="border-t border-gray-200 pt-6">
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
      )}

      {/* Employee Selection */}
      <div className="border-t border-gray-200 pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isBlockEvent ? 'Technician (optional)' : 'Assign Employee'}
        </label>
        {employees.length === 0 ? (
          <p className="text-sm text-gray-500 mb-2">
            No active employees found. Please add employees in the Resources page.
          </p>
        ) : (
          <div className="relative" ref={employeeDropdownRef}>
            {selectedEmployeeId ? (() => {
              const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
              return selectedEmployee ? (
                <div 
                  className="bg-white rounded-xl p-4 border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E2E2DD' }}
                  onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${getEmployeeBadgeClass(selectedEmployee.color)}`}>
                      {getEmployeeInitials(selectedEmployee.name)}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedEmployee.name}
                    </span>
                  </div>
                  <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${showEmployeeDropdown ? 'rotate-180' : ''}`} />
                </div>
              ) : null;
            })() : (
              <div 
                className="bg-white rounded-xl p-4 border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E2E2DD' }}
                onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
              >
                <span className="text-sm text-gray-500">No employee assigned</span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${showEmployeeDropdown ? 'rotate-180' : ''}`} />
              </div>
            )}
            
            {/* Employee Dropdown */}
            {showEmployeeDropdown && (
              <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#E2E2DD' }}>
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => {
                      setSelectedEmployeeId(employee.id);
                      setShowEmployeeDropdown(false);
                    }}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      selectedEmployeeId === employee.id ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getEmployeeBadgeClass(employee.color)}`}>
                      {getEmployeeInitials(employee.name)}
                    </div>
                    <span className="text-sm text-gray-900">{employee.name}</span>
                    {selectedEmployeeId === employee.id && (
                      <svg className="w-4 h-4 text-gray-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date and Time Section */}
      <div className="border-t border-gray-200 pt-6" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Scheduling</h3>
        
        {/* All-Day and Multi-Day Toggles */}
        <div className="mb-4 flex items-center gap-6" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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
        <div className="space-y-4" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {/* First Row: Dates */}
          {isMultiDay ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4" style={{ width: '100%' }}>
              <div className="mb-3 md:mb-0" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'visible' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                />
              </div>
              <div style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'visible' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '100%', overflow: 'visible' }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
              />
            </div>
          )}

          {/* Second Row: Times */}
          {isMultiDay && !isAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4" style={{ width: '100%' }}>
              <div className="mb-3 md:mb-0" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'visible' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                />
              </div>
              <div style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'visible' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                />
              </div>
            </div>
          )}

          {!isMultiDay && !isAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-4" style={{ width: '100%' }}>
              <div className="mb-3 md:mb-0" style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'visible' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                />
              </div>
              <div style={{ minWidth: 0, width: '100%', maxWidth: '100%', overflow: 'visible' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full min-w-0 px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
                />
              </div>
            </div>
          )}

          {/* All-day: Show business hours (disabled) */}
          {isAllDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time (Business Hours)</label>
                <input
                  type="time"
                  value={startTime}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time (Business Hours)</label>
                <input
                  type="time"
                  value={endTime}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {isAllDay && startDate && (!startTime || !endTime) && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No business hours set for this day. Please set business hours in your profile settings.
            </div>
          )}
        </div>
      </div>

      {/* Payment Status Toggle */}
      {!isBlockEvent && (
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Payment Status</h3>
              <p className="text-xs text-gray-500 mt-0.5">{isPaid ? 'Marked as paid' : 'Marked as unpaid'}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPaid(!isPaid)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${isPaid ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPaid ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Customer Notes - persistent across jobs */}
      {!isBlockEvent && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Notes</h3>
          <div>
            <textarea
              value={customerNotes}
              onChange={e => setCustomerNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              style={{ boxSizing: 'border-box' }}
              placeholder="e.g., Customer prefers hand-wash only, always 5 minutes late, prefers early morning appointments..."
            />
            <p className="mt-1 text-xs text-gray-500">These notes stay with the customer and will appear on all their future jobs</p>
          </div>
        </div>
      )}

      {/* Event Notes - specific to this event/job */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {isBlockEvent ? 'Notes' : 'Event Notes'}
        </h3>
        <div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            style={{ boxSizing: 'border-box' }}
            placeholder={isBlockEvent ? 'Add any notes...' : 'e.g., Customer wants extra attention on door panel scratches, bring ceramic spray...'}
          />
          {!isBlockEvent && (
            <p className="mt-1 text-xs text-gray-500">These notes are specific to this event only</p>
          )}
        </div>
      </div>
    </div>
  );
});

// #region Helper Functions & Components
const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const eventColors: { [key: string]: { bg: string, border: string } } = {
  blue: { bg: 'bg-blue-100', border: 'border-blue-500' },
  green: { bg: 'bg-green-100', border: 'border-green-500' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-500' },
  red: { bg: 'bg-red-100', border: 'border-red-500' },
  gray: { bg: 'bg-gray-100', border: 'border-gray-500' },
};

const MonthView = ({ date, events, selectedEvent, onEventClick, scale = 1.0, resources = [], onDayClick, onDateNumberClick, onOpenModal, onViewDay }: { date: Date, events: any[], selectedEvent: string | null, onEventClick: (event: any) => void, scale?: number, resources?: Array<{ id: string, name: string, type: 'bay' | 'van' }>, onDayClick?: (day: Date, dayEvents: any[]) => void, onDateNumberClick?: (day: Date) => void, onOpenModal?: (draftEvent?: { resourceId: string; startTime: string; endTime: string; date: Date }) => void, onViewDay?: (day: Date) => void }) => {
    const [focusedDayIndex, setFocusedDayIndex] = useState<number | null>(null);
    const dayCellRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const monthRef = useRef(date.getMonth());
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; day: Date; dayEvents: any[] } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    
    // Debug: Log first event with customer data
    if (events.length > 0) {
        const firstEvent = events[0];
        console.log('MonthView - First event sample:', {
            title: firstEvent.title,
            customerName: firstEvent.customerName,
            customerPhone: firstEvent.customerPhone,
            vehicleType: firstEvent.vehicleType,
            vehicleModel: firstEvent.vehicleModel,
            services: firstEvent.services
        });
    }

    // Format time range for event cards (e.g., "9:00 AM - 11:00 AM")
    const formatTimeRange = (event: any): string => {
        if (event.start && event.end && !event.allDay) {
            try {
                const startTime = new Date(event.start);
                const endTime = new Date(event.end);
                const startFormatted = format(startTime, 'h:mm a');
                const endFormatted = format(endTime, 'h:mm a');
                return `${startFormatted} - ${endFormatted}`;
            } catch (e) {
                console.error('Error formatting time range:', e);
            }
        }
        // Fallback to event.time if available
        if (event.time) {
            // If time is in 24-hour format, convert to 12-hour
            if (event.time.match(/^\d{2}:\d{2}$/)) {
                const [hours, minutes] = event.time.split(':').map(Number);
                const period = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12;
                return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
            }
            return event.time;
        }
        return '';
    };

    // Get customer type for event
    const getCustomerType = (event: any): string => {
        return getCustomerTypeFromHistory({
            completedServiceCount: event.completedServiceCount,
            lastCompletedServiceAt: event.lastCompletedServiceAt,
            referenceDate: event.start || event.date || new Date()
        });
    };

    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get the first day of the month and the last day of the month
    const firstDayOfMonth = startOfMonth(date);
    const lastDayOfMonth = endOfMonth(date);
    
    // Get the start of the week for the first day of the month (Sunday = 0)
    const calendarStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 0 });
    
    // Get the end of the week for the last day of the month
    const calendarEnd = endOfWeek(lastDayOfMonth, { weekStartsOn: 0 });
    
    // Generate all dates in the calendar view (including previous and next month dates)
    const allDates = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    // Calculate number of weeks needed
    const numWeeks = Math.ceil(allDates.length / 7);
    
    // Reset focus when month changes
    useEffect(() => {
        if (monthRef.current !== month) {
            monthRef.current = month;
            setFocusedDayIndex(null);
            // Find first day of current month and set it as focusable
            const firstCurrentMonthIndex = allDates.findIndex(d => 
                d.getMonth() === month && d.getFullYear() === year
            );
            if (firstCurrentMonthIndex >= 0) {
                setFocusedDayIndex(firstCurrentMonthIndex);
            }
        }
    }, [month, year, allDates]);
    
    // Close context menu when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
                setContextMenu(null);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu(null);
            }
        };

        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [contextMenu]);
    
    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, currentIndex: number, currentDate: Date, dayEvents: any[]) => {
        let newIndex = currentIndex;
        
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                newIndex = Math.min(currentIndex + 1, allDates.length - 1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                newIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                newIndex = Math.min(currentIndex + 7, allDates.length - 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                newIndex = Math.max(currentIndex - 7, 0);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (onDayClick) {
                    onDayClick(currentDate, dayEvents);
                }
                return;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = allDates.length - 1;
                break;
            default:
                return;
        }
        
        setFocusedDayIndex(newIndex);
        // Focus the new day cell
        setTimeout(() => {
            const newCell = dayCellRefs.current[newIndex];
            if (newCell) {
                newCell.focus();
            }
        }, 0);
    };
    
    return (
        <div 
            className="grid grid-cols-7 border-t border-l border-gray-200 flex-1 h-full" 
            style={{ 
                gridTemplateRows: `40px repeat(${numWeeks}, minmax(0, 1fr))`,
                minHeight: 0
            }}
        >
            {daysOfWeek.map((day) => (
                <div key={day} className="py-2 text-center font-semibold text-[10px] md:text-xs text-gray-600 uppercase tracking-wider border-r border-b border-gray-200 flex-shrink-0" style={{ height: '40px' }}>
                    <span className="md:hidden">{day.slice(0,3)}</span>
                    <span className="hidden md:inline">{day}</span>
                </div>
            ))}
            {allDates.map((currentDate, dateIndex) => {
                // Check if this date is in the current month
                const isCurrentMonth = currentDate.getMonth() === month && currentDate.getFullYear() === year;
                const day = currentDate.getDate();
                const dayEvents = events.filter(e => {
                  if (!e) return false;
                  const currentDateStr = format(currentDate, 'yyyy-MM-dd');
                  
                  // First check if this is a multi-day event that spans this date
                  if (e.start && e.end) {
                    const eventStart = new Date(e.start);
                    const eventEnd = new Date(e.end);
                    const currentDay = new Date(currentDate);
                    currentDay.setHours(0, 0, 0, 0);
                    eventStart.setHours(0, 0, 0, 0);
                    eventEnd.setHours(0, 0, 0, 0);
                    if (currentDay >= eventStart && currentDay <= eventEnd) {
                      return true;
                    }
                  }
                  
                  // Extract event date - check start first, then date field (matching WeekView logic)
                  const eventStartDate = getEventDateString(e);
                  if (!eventStartDate) return false;
                  
                  // Check if event matches current date
                  return eventStartDate === currentDateStr;
                });
                const scaledPadding = 8 * scale; // Doubled from 4 to 8 (recalibrated baseline)
                
                // Check if this day is in the past
                const today = startOfDay(new Date());
                const dayDate = startOfDay(currentDate);
                const isPast = isBefore(dayDate, today);
                const isTodayDate = isToday(currentDate);
                
                // Count jobs and group by resource
                const jobCount = dayEvents.length;
                const isBusy = jobCount >= 6;
                
                // Group events by resource and count drop-offs/pick-ups
                const resourceStats: Record<string, { dropOff: number; pickUp: number; name: string; total: number }> = {};
                
                dayEvents.forEach(event => {
                    const resourceId = event.resourceId || 'unassigned';
                    const resource = resources.find(r => r.id === resourceId);
                    const resourceName = resource ? resource.name : 'Unassigned';
                    
                    if (!resourceStats[resourceId]) {
                        resourceStats[resourceId] = { dropOff: 0, pickUp: 0, name: resourceName, total: 0 };
                    }
                    
                    // Count all events for this resource
                    resourceStats[resourceId].total++;
                    
                    const locationType = event.locationType?.toLowerCase() || '';
                    if (locationType === 'drop off' || locationType === 'dropoff') {
                        resourceStats[resourceId].dropOff++;
                    } else if (locationType === 'pick up' || locationType === 'pickup') {
                        resourceStats[resourceId].pickUp++;
                    }
                });
                
                // Sort resources: Bays first, then Vans, by name
                const sortedResources = Object.entries(resourceStats).sort(([idA, statsA], [idB, statsB]) => {
                    const resourceA = resources.find(r => r.id === idA);
                    const resourceB = resources.find(r => r.id === idB);
                    if (resourceA?.type !== resourceB?.type) {
                        if (resourceA?.type === 'bay') return -1;
                        if (resourceB?.type === 'bay') return 1;
                    }
                    return statsA.name.localeCompare(statsB.name);
                });
                
                                    const dateLabel = format(currentDate, 'MMMM d, yyyy');
                                    const jobLabel = `${jobCount} ${jobCount === 1 ? 'job' : 'jobs'}`;
                                    const ariaLabel = `${dateLabel}, ${jobLabel}`;
                                    
                                    // Make first day of current month focusable if no day is focused yet
                                    const isFirstDayOfMonth = isCurrentMonth && dateIndex === allDates.findIndex(d => 
                                        d.getMonth() === month && d.getFullYear() === year
                                    );
                                    const shouldBeFocusable = focusedDayIndex === dateIndex || (focusedDayIndex === null && isFirstDayOfMonth);
                
                                    return (
                    <div 
                        key={`${currentDate.getTime()}-${dateIndex}`} 
                        ref={(el) => { dayCellRefs.current[dateIndex] = el; }}
                        className="border-r border-b border-gray-200 flex flex-col relative hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none" 
                        style={{ padding: `${scaledPadding}px`, minHeight: 0 }}
                        onClick={() => {
                            if (onDayClick) {
                                onDayClick(currentDate, dayEvents);
                            }
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            // Calculate position, ensuring menu stays within viewport
                            const menuWidth = 180;
                            const menuHeight = 100; // Approximate height
                            let x = e.clientX;
                            let y = e.clientY;
                            
                            // Adjust if menu would overflow right edge
                            if (x + menuWidth > window.innerWidth) {
                                x = window.innerWidth - menuWidth - 8;
                            }
                            
                            // Adjust if menu would overflow bottom edge
                            if (y + menuHeight > window.innerHeight) {
                                y = window.innerHeight - menuHeight - 8;
                            }
                            
                            // Ensure menu doesn't go off left or top
                            x = Math.max(8, x);
                            y = Math.max(8, y);
                            
                            setContextMenu({
                                x,
                                y,
                                day: currentDate,
                                dayEvents: dayEvents
                            });
                        }}
                        onKeyDown={(e) => handleKeyDown(e, dateIndex, currentDate, dayEvents)}
                        tabIndex={shouldBeFocusable ? 0 : -1}
                        aria-label={ariaLabel}
                    >
                        {/* Day number and Job count - stacked vertically */}
                        <div className="flex flex-col mb-1">
                            {/* Day number - centered */}
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDateNumberClick) {
                                            onDateNumberClick(currentDate);
                                        } else if (onDayClick) {
                                            onDayClick(currentDate, dayEvents);
                                        }
                                    }}
                                    className="cursor-pointer hover:underline hover:text-gray-900 transition-colors"
                                    aria-label={`View week of: ${format(currentDate, 'MMMM d, yyyy')}`}
                                >
                                <span className={`text-xs md:text-sm font-medium ${isTodayDate ? 'w-6 h-6 rounded-full text-white flex items-center justify-center' : isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`} style={{ 
                                    opacity: isPast && isCurrentMonth ? 0.5 : 1,
                                backgroundColor: isTodayDate ? '#F97316' : undefined
                            }}>
                                {day}
                            </span>
                                </button>
                            </div>
                            {/* Job count badge - only show for current month, left-aligned below date */}
                            {isCurrentMonth && (
                                <div className="flex items-center gap-1.5 mt-1" style={{ opacity: isPast ? 0.5 : 1 }}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                                        jobCount === 0 
                                            ? 'bg-gray-400' 
                                            : isBusy 
                                            ? 'bg-gray-800' 
                                            : 'bg-gray-800'
                                    }`} style={{ fontWeight: 900 }}>
                                        {jobCount}
                                    </div>
                                    <span className="text-xs font-medium text-gray-700">
                                        {jobCount === 1 ? 'Job' : 'Jobs'}
                                    </span>
                                </div>
                            )}
                                            </div>
                        
                        {/* Resource breakdown - only show for current month */}
                        {isCurrentMonth && (
                        <div className="flex-1 overflow-y-auto text-xs text-gray-600 space-y-0.5">
                            {sortedResources.length > 0 ? (
                                sortedResources.map(([resourceId, stats]) => {
                                    // Show total count with location type breakdown if applicable
                                    // If all jobs are the same type, show just that type
                                    // Otherwise show the breakdown
                                    let details = '';
                                    if (stats.total === stats.pickUp && stats.pickUp > 0) {
                                        // All jobs are Pick-up
                                        details = `: ${stats.total} Pick-up${stats.total > 1 ? 's' : ''}`;
                                    } else if (stats.total === stats.dropOff && stats.dropOff > 0) {
                                        // All jobs are Drop-off
                                        details = `: ${stats.total} Drop-off${stats.total > 1 ? 's' : ''}`;
                                    } else {
                                        // Mixed or unknown types - show breakdown
                                        const parts: string[] = [];
                                        if (stats.dropOff > 0) {
                                            parts.push(`${stats.dropOff} Drop-off${stats.dropOff > 1 ? 's' : ''}`);
                                        }
                                        if (stats.pickUp > 0) {
                                            parts.push(`${stats.pickUp} Pick-up${stats.pickUp > 1 ? 's' : ''}`);
                                        }
                                        // If there are jobs without a locationType, show the total
                                        const jobsWithoutType = stats.total - stats.dropOff - stats.pickUp;
                                        if (jobsWithoutType > 0) {
                                            parts.push(`${jobsWithoutType} Job${jobsWithoutType > 1 ? 's' : ''}`);
                                        }
                                        details = parts.length > 0 ? `: ${parts.join(', ')}` : `: ${stats.total} Job${stats.total > 1 ? 's' : ''}`;
                                    }
                                return (
                                        <div key={resourceId} className="truncate">
                                            {stats.name}{details}
                                            </div>
                                    );
                                })
                            ) : jobCount > 0 ? (
                                <div className="text-gray-500">No resource assigned</div>
                                        ) : null}
                        </div>
                        )}
                    </div>
                );
            })}
            
            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed bg-white shadow-lg rounded-xl border border-gray-200 py-1 z-[100] min-w-[180px]"
                    style={{
                        left: `${contextMenu.x}px`,
                        top: `${contextMenu.y}px`,
                        transform: 'translateY(-8px)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {onOpenModal && (
                        <button
                            onClick={() => {
                                const clickedDate = new Date(contextMenu.day);
                                clickedDate.setHours(9, 0, 0, 0);
                                const endDate = new Date(clickedDate);
                                endDate.setHours(10, 0, 0, 0);
                                
                                onOpenModal({
                                    resourceId: resources.length > 0 ? resources[0].id : '',
                                    startTime: clickedDate.toISOString(),
                                    endTime: endDate.toISOString(),
                                    date: contextMenu.day
                                });
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create event
                        </button>
                    )}
                    {onViewDay && (
                        <button
                            onClick={() => {
                                onViewDay(contextMenu.day);
                                setContextMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View in day-view
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Event Hover Content Component
const EventHoverContent = ({
    event,
    formatTimeRange,
    getCustomerType,
    resources
}: {
    event: any;
    formatTimeRange: (event: any) => string;
    getCustomerType: (event: any) => string;
    resources?: Array<{ id: string, name: string, type: 'bay' | 'van' }>;
}) => {
    if (!event) return null;

    const isBlockEvent = event.eventType === 'block';

    const serviceName = isBlockEvent ? 'Blocked Time' : (event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service');
    const vehicleModel = event.vehicleType || event.vehicleModel;
    const timeRange = formatTimeRange(event);
    const customerStatus = getCustomerType(event);
    const normalizedOverride = event.customerType ? String(event.customerType).toLowerCase() : '';
    const effectiveCustomerType = normalizedOverride || customerStatus;
    const eventIsPaid = event.paid === true;
    const bookingSource = event.source;
    
    // Find the resource for this event to check if it's a van
    const eventResource = resources?.find(r => r.id === event.resourceId);
    const isVan = eventResource?.type === 'van';

    return (
        <div
            className="bg-white shadow-2xl rounded-xl overflow-hidden"
            style={{
                border: '1px solid #E2E2DD',
                backgroundColor: '#FFFFFF',
                width: '400px',
                maxWidth: 'calc(100vw - 32px)'
            }}
        >
            <div className="p-5 space-y-4">
                {/* Header with Service Name, Time, and Payment Status */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                            {serviceName}
                        </h3>
                        {/* Time Range */}
                        {timeRange && (
                            <div className="text-base font-semibold mt-1.5" style={{ color: 'rgba(64, 64, 58, 0.7)' }}>
                                {timeRange}
                            </div>
                        )}
                        {/* Vehicle */}
                        {!isBlockEvent && vehicleModel && (
                            <div className="text-base font-medium mt-1.5" style={{ color: 'rgba(64, 64, 58, 0.7)' }}>
                                {vehicleModel}
                            </div>
                        )}
                    </div>
                    {!isBlockEvent && (
                        eventIsPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 bg-green-100 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Paid
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 bg-red-50 text-red-600 border border-red-200">
                                Unpaid
                            </span>
                        )
                    )}
                </div>

                {/* Tags */}
                {!isBlockEvent && (
                <div className="flex flex-wrap items-center gap-2">
                    {/* Show "Van" tag for van resources, or locationType (Drop off/Pick up) for bay resources */}
                    {isVan ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            Van
                        </span>
                    ) : event.locationType ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            event.locationType.toLowerCase() === 'pick up' || event.locationType.toLowerCase() === 'pickup'
                                ? 'bg-blue-100 text-blue-700'
                                : event.locationType.toLowerCase() === 'drop off' || event.locationType.toLowerCase() === 'dropoff'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                            {event.locationType?.toLowerCase() === 'pickup' ? 'Pick Up' : 
                             event.locationType?.toLowerCase() === 'dropoff' ? 'Drop Off' :
                             event.locationType?.toLowerCase() === 'pick up' ? 'Pick Up' :
                             event.locationType?.toLowerCase() === 'drop off' ? 'Drop Off' :
                             event.locationType}
                        </span>
                    ) : null}
                    {effectiveCustomerType === 'new' && (
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            New Customer
                        </span>
                    )}
                    {effectiveCustomerType === 'returning' && (
                        <span className="text-xs font-semibold bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                            Repeat Customer
                        </span>
                    )}
                    {effectiveCustomerType === 'maintenance' && (
                        <span className="text-xs font-semibold bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                            Maintenance Customer
                        </span>
                    )}
                </div>
                )}

                {/* Customer Information */}
                {!isBlockEvent && (event.customerName || event.customerPhone) && (
                    <div className="text-base text-gray-700">
                        <span className="font-semibold">{event.customerName || 'Customer'}</span>
                        {event.customerPhone && (
                            <span className="text-gray-600 ml-1">({formatPhoneDisplay(event.customerPhone)})</span>
                        )}
                    </div>
                )}
                {/* Address */}
                {!isBlockEvent && (event.customerAddress || event.address) && (
                    <div className="text-sm text-gray-600">
                        {event.customerAddress || event.address}
                    </div>
                )}

                {/* Assigned Employee */}
                {event.employeeName && (
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-gray-300 ${getEmployeeBadgeClass(event.color)}`}>
                            <span className="text-base font-semibold">
                                {getEmployeeInitials(event.employeeName)}
                            </span>
                        </div>
                        <span className="text-base text-gray-700">{event.employeeName}</span>
                    </div>
                )}

                {/* Booking Source - Only show for Google Calendar and Woocommerce, hide Local */}
                {bookingSource && bookingSource !== 'local' && bookingSource !== 'local-booking' && bookingSource !== 'local-google-synced' && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        {bookingSource === 'google' && (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        )}
                        {bookingSource === 'woocommerce' && (
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">W</span>
                        )}
                        <span className="capitalize">{bookingSource === 'woocommerce' ? 'Woocommerce' : bookingSource}</span>
                    </div>
                )}

                {/* Customer Notes */}
                {event.customerNotes && (
                    <div className="text-sm border-t border-gray-200 pt-4 mt-4">
                        <div className="line-clamp-2">
                            <span className="font-semibold text-gray-700">Customer Notes: </span>
                            <span className="text-gray-600">{event.customerNotes}</span>
                        </div>
                    </div>
                )}
                {/* Event Notes */}
                {event.description && (
                    <div className={`text-sm ${!event.customerNotes ? 'border-t border-gray-200 pt-4 mt-4' : 'mt-2'}`}>
                        <div className="line-clamp-2">
                            <span className="font-semibold text-gray-700">{event.eventType === 'block' ? 'Notes: ' : 'Event Notes: '}</span>
                            <span className="text-gray-600">{event.description}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const WeekView = ({ date, events, onEventClick, resources = [], scale = 1.0, businessHours, onResourceSelect, onOpenModal, draftEvent, onDraftEventUpdate, numberOfDays, isMobile, onTouchStart, onTouchMove, onTouchEnd, onDayHeaderClick }: { 
  date: Date, 
  events: any[], 
  onEventClick: (event: any) => void, 
  resources?: Array<{ id: string, name: string, type: 'bay' | 'van' }>, 
  scale?: number, 
  businessHours?: any,
  onResourceSelect?: (resource: { id: string, name: string, type: 'bay' | 'van' }) => void,
  onOpenModal?: (draftEvent?: { resourceId: string; startTime: string; endTime: string; date: Date }) => void,
  draftEvent?: { resourceId: string; startTime: string; endTime: string; date: Date } | null,
  onDraftEventUpdate?: (draftEvent: { resourceId: string; startTime: string; endTime: string; date: Date }) => void,
  numberOfDays?: number | null,
  isMobile?: boolean,
  onTouchStart?: (e: React.TouchEvent) => void,
  onTouchEnd?: (e: React.TouchEvent) => void,
  onTouchMove?: (e: React.TouchEvent) => void,
  onDayHeaderClick?: (day: Date) => void
}) => {
    const mainScrollRef = useRef<HTMLDivElement>(null);
    // Selected cell state for highlighting
    const [selectedCell, setSelectedCell] = useState<{ day: Date; resourceId: string; slotIndex: number } | null>(null);
    const [hoveredColumn, setHoveredColumn] = useState<{ day: Date; resourceId: string } | null>(null);
    const [hoveredCell, setHoveredCell] = useState<{ day: Date; resourceId: string; slotIndex: number } | null>(null);

    // Debug: Log first event with customer data
    if (events.length > 0) {
        const firstEvent = events[0];
        console.log('WeekView - First event sample:', {
            title: firstEvent.title,
            customerName: firstEvent.customerName,
            customerPhone: firstEvent.customerPhone,
            vehicleType: firstEvent.vehicleType,
            vehicleModel: firstEvent.vehicleModel,
            services: firstEvent.services
        });
    }

    // Format time range for event cards (e.g., "9:00 AM - 11:00 AM")
    const formatTimeRange = (event: any): string => {
        if (event.start && event.end && !event.allDay) {
            try {
                const startTime = new Date(event.start);
                const endTime = new Date(event.end);
                const startFormatted = format(startTime, 'h:mm a');
                const endFormatted = format(endTime, 'h:mm a');
                return `${startFormatted} - ${endFormatted}`;
            } catch (e) {
                console.error('Error formatting time range:', e);
            }
        }
        // Fallback to event.time if available
        if (event.time) {
            // If time is in 24-hour format, convert to 12-hour
            if (event.time.match(/^\d{2}:\d{2}$/)) {
                const [hours, minutes] = event.time.split(':').map(Number);
                const period = hours >= 12 ? 'PM' : 'AM';
                const hours12 = hours % 12 || 12;
                return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
            }
            return event.time;
        }
        return '';
    };

    // Format date and time range for hover popup (includes dates for multi-day events)
    const formatDateTimeRange = (event: any): string => {
        if (!event.start || !event.end) return formatTimeRange(event);
        
        try {
            const startTime = new Date(event.start);
            const endTime = new Date(event.end);
            
            // Check if it's a multi-day event
            const startDate = new Date(startTime);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(endTime);
            endDate.setHours(0, 0, 0, 0);
            const isMultiDay = startDate.getTime() !== endDate.getTime();
            
            if (isMultiDay) {
                // Format as: "Wednesday, December 31, 2025 - Friday, January 2, 2026 @ 7:00 AM - 6:00 PM"
                const startDateFormatted = format(startTime, 'EEEE, MMMM d, yyyy');
                const endDateFormatted = format(endTime, 'EEEE, MMMM d, yyyy');
                const startTimeFormatted = format(startTime, 'h:mm a');
                const endTimeFormatted = format(endTime, 'h:mm a');
                return `${startDateFormatted} - ${endDateFormatted} @ ${startTimeFormatted} - ${endTimeFormatted}`;
            } else {
                // Single day: format as: "Wednesday, December 31, 2025 @ 7:00 AM - 6:00 PM"
                const dateFormatted = format(startTime, 'EEEE, MMMM d, yyyy');
                const startTimeFormatted = format(startTime, 'h:mm a');
                const endTimeFormatted = format(endTime, 'h:mm a');
                return `${dateFormatted} @ ${startTimeFormatted} - ${endTimeFormatted}`;
            }
        } catch (e) {
            console.error('Error formatting date time range:', e);
            return formatTimeRange(event);
        }
    };

    const renderEventHoverCard = (key: string, event: any, content: ReactElement) => {
        if (isMobile) {
            return <Fragment key={key}>{content}</Fragment>;
        }
        return (
            <HoverCard key={key} openDelay={150} closeDelay={100}>
                <HoverCardTrigger asChild>{content}</HoverCardTrigger>
                <HoverCardContent
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="w-auto p-0 border-none bg-transparent shadow-none"
                >
                    <EventHoverContent
                        event={event}
                        formatTimeRange={formatDateTimeRange}
                        getCustomerType={getCustomerType}
                        resources={displayResources}
                    />
                </HoverCardContent>
            </HoverCard>
        );
    };

    // Get customer type for event
    const getCustomerType = (event: any): string => {
        return getCustomerTypeFromHistory({
            completedServiceCount: event.completedServiceCount,
            lastCompletedServiceAt: event.lastCompletedServiceAt,
            referenceDate: event.start || event.date || new Date()
        });
    };

    // Calculate days based on numberOfDays parameter or default to week
    let weekDays: Date[];
    if (numberOfDays && numberOfDays >= 2 && numberOfDays <= 7) {
      // Custom number of days starting from the current date
      weekDays = Array.from({ length: numberOfDays }, (_, i) => addDays(date, i));
    } else {
      // Default to full week
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
      weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    
    // Helper function to parse hour from time slot string (e.g., "7am" -> 7, "12pm" -> 12, "1pm" -> 13)
    const parseSlotHour = (slot: string): number | null => {
        if (!slot) return null;
        const match = slot.match(/(\d+)(am|pm)/i);
        if (!match) return null;
        let hour = parseInt(match[1]);
        const period = match[2].toLowerCase();
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        return hour;
    };
    
    // Helper function to check if an hour (0-23) on a specific day is within working hours
    const isWithinWorkingHours = (hour: number, day: Date): boolean => {
        // If no business hours configured, show all hours as working (white)
        if (!businessHours) {
            return true;
        }

        // Map JavaScript day index (0=Sunday) to full day names used in MongoDB
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = day.getDay();
        const dayKey = dayNames[dayOfWeek];
        const dayHours = businessHours[dayKey];

        // If day is not set, closed, or invalid, all hours are non-working (grey)
        if (!dayHours || !Array.isArray(dayHours) || dayHours.length < 2) {
            return false;
        }

        const [openTime, closeTime] = dayHours;
        
        // If times are empty or invalid, day is closed - all hours are non-working (grey)
        if (!openTime || !closeTime || openTime.trim() === '' || closeTime.trim() === '') {
            return false;
        }

        // Parse times (format: "HH:MM" in 24-hour format, e.g., "07:00", "20:00")
        const [openHour] = openTime.split(':').map(Number);
        const [closeHour] = closeTime.split(':').map(Number);

        // Check if hour is within working hours (openHour <= hour < closeHour)
        return hour >= openHour && hour < closeHour;
    };
    
    // Generate time slots based on business hours
    const generateTimeSlots = (): string[] => {
        if (!businessHours) {
            // Fallback to default hours if no business hours
            const slots: string[] = [];
            for (let hour = 7; hour <= 11; hour++) {
                slots.push(`${hour}am`);
            }
            slots.push('12pm');
            for (let hour = 1; hour <= 7; hour++) {
                slots.push(`${hour}pm`);
            }
            return slots;
        }

        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        let earliestHour = 24;
        let latestHour = 0;

        // Find earliest opening and latest closing across all days in the week
        weekDays.forEach(day => {
            const dayOfWeek = day.getDay();
            const dayKey = dayNames[dayOfWeek];
            const dayHours = businessHours[dayKey];
            
            if (dayHours && Array.isArray(dayHours) && dayHours.length >= 2) {
                const [openTime, closeTime] = dayHours;
                if (openTime && closeTime) {
                    const [openHour] = openTime.split(':').map(Number);
                    const [closeHour] = closeTime.split(':').map(Number);
                    if (openHour < earliestHour) earliestHour = openHour;
                    if (closeHour > latestHour) latestHour = closeHour;
                }
            }
        });

        // If no valid hours found, use defaults
        if (earliestHour === 24 || latestHour === 0) {
            earliestHour = 7;
            latestHour = 20;
        }

        // Generate slots from earliest to latest hour (up to but not including closing hour)
        const slots: string[] = [];
        for (let hour = earliestHour; hour < latestHour; hour++) {
            if (hour === 0) {
                slots.push('12am');
            } else if (hour < 12) {
                slots.push(`${hour}am`);
            } else if (hour === 12) {
                slots.push('12pm');
            } else {
                slots.push(`${hour - 12}pm`);
            }
        }
        
        return slots;
    };

    const timeSlots = generateTimeSlots();

    const formatSlotLabel = (slot: string) => {
      const match = slot.match(/^(\d+)(am|pm)$/i);
      if (!match) return slot;
      const hour = match[1];
      const period = match[2].toUpperCase();
      return `${hour} ${period}`;
    };

    const scaledTimeColumnWidth = isMobile ? 48 : 80 * scale; // 48px for mobile (reduced from 64px)
    const scaledTimeSlotHeight = 96 * scale; // Increased from 64 to 96 for taller default boxes
    const scaledColumnMinWidth = 100 * scale;

    // Use resources if available, otherwise create a default "Station" resource
    const displayResources = resources.length > 0 ? resources : [{ id: 'station', name: 'Station', type: 'bay' as const }];
    const totalColumns = weekDays.length * displayResources.length;

    return (
        <div className="flex flex-col w-full h-full overflow-hidden" style={{ height: '100%', maxHeight: '100%', overflow: 'hidden', borderRight: 'none', backgroundColor: isMobile ? '#f9f7fa' : undefined }}>
            {/* Main scrollable container - contains both time column and main content */}
            <div 
                ref={mainScrollRef}
                className="flex-1 min-h-0 overflow-y-auto"
                id="week-view-scroll-container"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ 
                    position: 'relative',
                    height: '100%',
                    maxHeight: '100%',
                    minWidth: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                }}
            >
                {/* Sticky header - must be inside scroll container */}
                    <div
                  className="flex-shrink-0 sticky top-0 z-50"
                      style={{ 
                        position: 'sticky', 
                     backgroundColor: isMobile ? '#f9f7fa' : 'white',
                    isolation: 'isolate',
                    top: 0,
                    zIndex: 50,
                    boxShadow: 'none'
                  }}
                >
                    {/* Inner flex container for time column header and main header */}
                    <div className="flex border-b border-gray-100">
                        {/* Time column header spacer */}
                        <div
                           className="flex-shrink-0"
                          style={{ 
                            width: `${scaledTimeColumnWidth}px`,
                            height: `${56 * scale}px`, 
                            boxSizing: 'border-box',
                             boxShadow: 'none',
                             backgroundColor: isMobile ? '#f9f7fa' : 'white'
                          }}
                        ></div>
                        
                        {/* Main header content */}
                    <div className="flex-1 min-w-0">
                    {/* First row: Day headers spanning all resources for each day */}
                             <div className="grid" style={{ gridTemplateColumns: `repeat(${totalColumns}, 1fr)`, backgroundColor: isMobile ? '#f9f7fa' : 'white' }}>
                        {weekDays.map(day => {
                            const isCurrentDay = isToday(day);
                            const fullDayName = format(day, 'EEEE');
                            const dayNameMap: { [key: string]: string } = {
                                'Monday': 'Mon',
                                'Tuesday': 'Tue',
                                'Wednesday': 'Wed',
                                'Thursday': 'Thu',
                                'Friday': 'Fri',
                                'Saturday': 'Sat',
                                'Sunday': 'Sun'
                            };
                            const dayName = dayNameMap[fullDayName] || fullDayName;
                            const dayNumber = format(day, 'd');
                            return (
                            <div 
                                key={`day-header-${day.toString()}`} 
                                 className="text-center flex items-center justify-center text-xs"
                                style={{ 
                                    gridColumn: `span ${displayResources.length}`,
                                    height: `${24 * scale}px`, 
                                    boxSizing: 'border-box',
                                    color: isCurrentDay ? '#57564D' : undefined,
                                    fontSize: '11px',
                                    fontFamily: 'Inter',
                                    fontWeight: isCurrentDay ? '700' : '400',
                                    wordWrap: 'break-word',
                                     padding: isCurrentDay ? '10px 12px' : undefined,
                                     backgroundColor: isMobile ? '#f9f7fa' : 'white'
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDayHeaderClick) {
                                            onDayHeaderClick(day);
                                        }
                                    }}
                                    className="flex items-center cursor-pointer hover:underline hover:text-gray-900 transition-colors"
                                    style={{ gap: '4px' }}
                                    aria-label={`View day: ${format(day, 'MMMM d, yyyy')}`}
                                >
                                    {dayName} {isCurrentDay ? (
                                        <span 
                                            style={{
                                                backgroundColor: '#FF3700',
                                                color: '#FFFFFF',
                                                borderRadius: '4px',
                                                padding: '2px 6px',
                                                fontSize: '12px',
                                                fontWeight: '700'
                                            }}
                                        >
                                            {dayNumber}
                                        </span>
                                    ) : (
                                        dayNumber
                                    )}
                                </button>
                            </div>
                            );
                        })}
                    </div>
                    
                    {/* Second row: Resource headers for each day */}
                     <div className="relative grid border-b border-gray-100" style={{ gridTemplateColumns: `repeat(${totalColumns}, 1fr)`, backgroundColor: isMobile ? '#f9f7fa' : 'white' }}>
                        {/* Station header cell - positioned absolutely to align with time column - hidden in mobile */}
                        {!isMobile && (
                        <div
                               className="absolute border-r border-gray-100 text-center flex flex-row items-center justify-center z-10"
                            style={{ 
                                left: `-${scaledTimeColumnWidth}px`,
                                width: `${scaledTimeColumnWidth}px`,
                                height: `${32 * scale}px`, 
                                boxSizing: 'border-box',
                                padding: '4px 8px',
                                color: '#57564D',
                                fontSize: '10px',
                                fontFamily: 'Helvetica Neue',
                                fontWeight: '400',
                                   wordWrap: 'break-word',
                                   backgroundColor: isMobile ? '#f9f7fa' : 'white'
                            }}
                        >
                            <span>Station</span>
                        </div>
                        )}
                        
                        {/* Resource headers grid */}
                        {weekDays.map((day, dayIndex) => 
                            displayResources.map((resource, resourceIndex) => {
                                const columnIndex = (dayIndex * displayResources.length) + resourceIndex;
                                const isDayBoundary = resourceIndex === displayResources.length - 1;
                                return (
                                <div 
                                    key={`resource-header-${day.toString()}-${resource.id}`} 
                                            className={`text-center flex flex-row items-center justify-center gap-1 ${isDayBoundary ? 'border-r border-gray-100 ' : ''}bg-white ${onOpenModal && onResourceSelect ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                                        style={{ 
                                            gridColumn: columnIndex + 1,
                                            height: `${32 * scale}px`, 
                                            boxSizing: 'border-box',
                                            padding: '4px 8px',
                                            color: '#57564D',
                                            fontSize: '10px',
                                            fontFamily: 'Helvetica Neue',
                                            fontWeight: '400',
                                            wordWrap: 'break-word'
                                        }}
                                                onClick={onOpenModal && onResourceSelect ? (e) => {
                                                    e.stopPropagation();
                                                    onResourceSelect(resource);
                                                    // Get first time slot hour for default start time
                                                    const firstSlotHour = parseSlotHour(timeSlots[0]) || 7;
                                                    const clickedDate = new Date(day);
                                                    clickedDate.setHours(firstSlotHour, 0, 0, 0);
                                                    const endDate = new Date(clickedDate);
                                                    endDate.setHours(firstSlotHour + 1, 0, 0, 0);
                                                    onOpenModal({
                                                        resourceId: resource.id,
                                                        startTime: clickedDate.toISOString(),
                                                        endTime: endDate.toISOString(),
                                                        date: day
                                                    });
                                                } : undefined}
                                            >
                                                <span>{resource.name === 'Station' ? '' : resource.name}</span>
                                                {onOpenModal && onResourceSelect && !isMobile && (
                                                    <PlusIcon className="w-3 h-3 inline text-gray-600" />
                                        )}
                                    </div>
                                    );
                                })
                            )}
                    </div>
                        </div>
                    </div>
                </div>
                
                {/* Inner flex container for time column and main content */}
                <div className="flex" style={{ minHeight: '100%' }}>
                    {/* Time column - sticky on left, inside scroll container */}
                    <div
                      className="border-r border-gray-100 flex-shrink-0 flex flex-col"
                      style={{ 
                        position: 'sticky', 
                        left: 0, 
                        zIndex: 40, 
                        width: `${scaledTimeColumnWidth}px`,
                        alignSelf: 'flex-start',
                        boxSizing: 'border-box',
                        boxShadow: 'none',
                        backgroundColor: isMobile ? '#f9f7fa' : 'white'
                      }}
                    >
                        {/* Time slots - these will scroll with the main content */}
                        <div 
                            className="flex-1"
                            style={{ 
                                minHeight: `${timeSlots.length * scaledTimeSlotHeight}px`
                            }}
                        >
                        {timeSlots.map((slot, index) => (
                                <div key={slot} style={{ height: `${scaledTimeSlotHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: '8px', color: '#57564D', fontSize: 10, fontFamily: 'Inter', fontWeight: '400', wordWrap: 'break-word', boxSizing: 'border-box', backgroundColor: isMobile ? '#f9f7fa' : 'transparent' }}>
                                <span style={{ lineHeight: 1, margin: 0, padding: 0, marginTop: '-2px' }}>{index === 0 ? '' : formatSlotLabel(slot)}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                    
                    {/* Main content area */}
                    <div className="flex-1 min-w-0 relative">
                {/* Scrollable grid content */}
                <div
                  className="grid w-full relative"
                  style={{
                    gridTemplateColumns: `repeat(${totalColumns}, 1fr)`
                  }}
                >
                    {/* Current time indicator - spans across all columns for current day */}
                    {(() => {
                        const now = new Date();
                        const currentDayIndex = weekDays.findIndex(day => isSameDay(day, now));
                        if (currentDayIndex === -1) return null;
                        
                        const currentHour = now.getHours();
                        const currentMinutes = now.getMinutes();
                        
                        // Check if current time is within the visible time slots range
                        if (timeSlots.length === 0) return null;
                        const firstSlotHour = parseSlotHour(timeSlots[0]) || 0;
                        const lastSlotHour = parseSlotHour(timeSlots[timeSlots.length - 1]);
                        
                        if (lastSlotHour === null) return null;
                        
                        // Check if current time is within the displayed hours
                        // The last slot represents the hour before closing, so we check up to lastSlotHour
                        // If current time is past lastSlotHour, it's outside the visible range, so don't show
                        if (currentHour < firstSlotHour || currentHour > lastSlotHour) return null;
                        
                        // Find which time slot the current time falls into
                        let slotIndex = -1;
                        for (let i = 0; i < timeSlots.length; i++) {
                            const slot = timeSlots[i];
                            const slotHour = parseSlotHour(slot);
                            if (slotHour !== null && currentHour >= slotHour) {
                                slotIndex = i;
                            } else if (slotHour !== null && currentHour < slotHour) {
                                break;
                            }
                        }
                        
                        if (slotIndex === -1) return null;
                        
                        // Calculate vertical position
                        const slotStartHour = parseSlotHour(timeSlots[slotIndex]) || firstSlotHour;
                        const hoursFromSlotStart = currentHour - slotStartHour;
                        const minutesOffset = (hoursFromSlotStart * 60 + currentMinutes) / 60;
                        const top = (slotIndex * scaledTimeSlotHeight) + (minutesOffset * scaledTimeSlotHeight);
                        
                        // Calculate which columns to span (all resources for the current day)
                        const dayStartColumn = currentDayIndex * displayResources.length;
                        const dayEndColumn = dayStartColumn + displayResources.length;
                        
                        return (
                            <div
                                className="absolute z-30 pointer-events-none"
                                style={{
                                    top: `${top}px`,
                                    left: `calc(${dayStartColumn} * (100% / ${totalColumns}))`,
                                    width: `calc(${displayResources.length} * (100% / ${totalColumns}))`,
                                    height: '2px'
                                }}
                            >
                                {/* Vertical line on the left side - extends above and below */}
                                <div
                                    className="absolute"
                                    style={{
                                        left: '0',
                                        top: '-10px',
                                        width: '2px',
                                        height: '22px',
                                        backgroundColor: '#FF3700'
                                    }}
                                />
                                {/* Divider before main indicator */}
                                <div
                                    className="absolute left-0 right-0"
                                    style={{
                                        top: '-1px',
                                        height: '1px',
                                        backgroundColor: 'rgba(255, 55, 0, 0.2)' // #FF3700 at 20% opacity
                                    }}
                                />
                                {/* Main indicator line */}
                                <div
                                    className="absolute left-0 right-0"
                                    style={{
                                        height: '2px',
                                        backgroundColor: '#FF3700'
                                    }}
                                />
                                {/* Divider after main indicator */}
                                <div
                                    className="absolute left-0 right-0"
                                    style={{
                                        top: '2px',
                                        height: '1px',
                                        backgroundColor: 'rgba(255, 55, 0, 0.2)' // #FF3700 at 20% opacity
                                    }}
                                />
                            </div>
                        );
                    })()}
                    
                    {/* Time slot rows with events - each resource column gets its own wrapper */}
                    {weekDays.map((day, dayIndex) => 
                        displayResources.map((resource, resourceIndex) => {
                            // Create a wrapper for this resource column that contains all time slots
                            const columnIndex = (dayIndex * displayResources.length) + resourceIndex;
                            const isDayBoundary = resourceIndex === displayResources.length - 1;
                            
                            // Filter events for this day and resource
                            const dayEvents = (events || []).filter(e => {
                                if (!e) return false;
                                // Filter by resource
                                if (e.resourceId && e.resourceId !== resource.id) return false;
                                
                                const currentDateStr = format(day, 'yyyy-MM-dd');
                                
                                // Check if this is a multi-day event that spans this date
                                if (e.start && e.end) {
                                    const eventStart = new Date(e.start);
                                    const eventEnd = new Date(e.end);
                                    const currentDay = new Date(day);
                                    currentDay.setHours(0, 0, 0, 0);
                                    eventStart.setHours(0, 0, 0, 0);
                                    eventEnd.setHours(0, 0, 0, 0);
                                    // Check if current day is within the event's date range
                                    if (currentDay >= eventStart && currentDay <= eventEnd) {
                                        return true;
                                    }
                                }
                                
                                // Check if event is on the current day (single-day events)
                                const eventStartDate = getEventDateString(e);
                                return eventStartDate === currentDateStr;
                            });
                            
                            // Separate all-day events from timed events
                            const allDayEvents = dayEvents.filter(e => e && e.allDay);
                            const timedEvents = dayEvents.filter(e => e && !e.allDay && e.start && e.end);
                            const totalTimeSlotHeight = timeSlots.length * scaledTimeSlotHeight;
                            
                            return (
                                <div
                                    key={`resource-column-${day.toString()}-${resource.id}`}
                                    className={`relative group ${isDayBoundary ? 'border-r border-gray-100' : ''}`}
                                    style={{ 
                                        gridColumn: columnIndex + 1,
                                        height: `${totalTimeSlotHeight}px`,
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={isMobile ? undefined : () => {
                                        setHoveredColumn({ day, resourceId: resource.id });
                                    }}
                                    onMouseLeave={isMobile ? undefined : () => {
                                        setHoveredColumn(null);
                                    }}
                                >
                                    {!isMobile && hoveredColumn && hoveredColumn.resourceId === resource.id && format(hoveredColumn.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') && (
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{ backgroundColor: 'rgba(226, 226, 221, 0.08)', zIndex: 1 }}
                                        />
                                    )}
                                    {/* Render all-day events as blocks spanning entire day height */}
                                    {allDayEvents.map((event, i) => {
                                        if (!event) return null;
                                        const isBlockEvent = event.eventType === 'block';
                                        const eventColor = event.color || 'blue';
                                        const colorConfig = isBlockEvent ? eventColors.gray : (eventColors[eventColor] || eventColors.blue);
                                        const isUnpaid = isEventUnpaid(event);
                                        const cardKey = `all-day-${i}-${event.id || i}`;
                                        
                                        // Check if event is in the past (on a past day)
                                        const now = new Date();
                                        const isPastDay = isBefore(day, now);
                                        
                                        return renderEventHoverCard(
                                            cardKey,
                                            event,
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick(event);
                                                }}
                                                className={`absolute w-[95%] left-1 top-0 ${isUnpaid ? 'border-2 border-red-400 bg-transparent' : colorConfig.bg} p-1.5 rounded-xl flex flex-col items-start text-xs cursor-pointer hover:shadow-lg transition-all z-10`}
                                                style={{
                                                    pointerEvents: 'auto',
                                                    height: `${totalTimeSlotHeight}px`,
                                                    top: `${i * 40}px`, // Stack multiple all-day events vertically
                                                    zIndex: 5,
                                                    opacity: isPastDay ? 0.5 : 1,
                                                    backgroundColor: isUnpaid ? 'transparent' : undefined
                                                }}
                                            >
                                                <div className="flex items-center gap-1.5 w-full">
                                                    {event.employeeName ? (
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border border-gray-300 flex-shrink-0 ${getEmployeeBadgeClass(event.color)}`}>
                                                            <span className="text-[9px] font-semibold">
                                                                {getEmployeeInitials(event.employeeName)}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {event.source === 'google' && (
                                                        <svg className="w-3 h-3 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                        </svg>
                                                    )}
                                                    <span className="truncate font-semibold text-sm md:text-base flex-1">
                                                        {isBlockEvent ? 'Blocked Time' : (event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service')}
                                                    </span>
                                                </div>
                                                {!isBlockEvent && (event.customerName || event.customerPhone) && (
                                                    <span className="text-xs text-gray-700 mt-0.5 truncate font-semibold text-left w-full">
                                                        {event.customerName || 'Customer'}{event.customerPhone ? ` (${formatPhoneDisplay(event.customerPhone)})` : ''}
                                                    </span>
                                                )}
                                                {(() => {
                                                    if (isBlockEvent) return null;
                                                    const effectiveType = event.customerType
                                                        ? String(event.customerType).toLowerCase()
                                                        : getCustomerType(event);
                                                    if (effectiveType === 'new') {
                                                        return (
                                                            <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left">
                                                                New customer
                                                            </span>
                                                        );
                                                    }
                                                    if (effectiveType === 'returning') {
                                                        return (
                                                            <span className="text-xs font-semibold bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left truncate">
                                                                Repeat ...
                                                            </span>
                                                        );
                                                    }
                                                    if (effectiveType === 'maintenance') {
                                                        return (
                                                            <span className="text-xs font-semibold bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left truncate">
                                                                Maintenance
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                {!isBlockEvent && (event.vehicleType || event.vehicleModel) ? (
                                                    <span className="text-xs font-semibold text-gray-600 mt-0.5 truncate text-left w-full">{event.vehicleType || event.vehicleModel}</span>
                                                ) : null}
                                                {!isBlockEvent && event.services && (Array.isArray(event.services) ? event.services.length > 0 : event.services) ? (
                                                    <span className="text-xs font-semibold text-gray-600 mt-0.5 truncate text-left w-full">
                                                        {Array.isArray(event.services) ? event.services.join(', ') : event.services}
                                                    </span>
                                                ) : null}
                                                {formatTimeRange(event) && (
                                                    <span className="text-xs font-semibold text-gray-700 mt-0.5 truncate text-left w-full">
                                                        {formatTimeRange(event)}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Time slot rows */}
                                    {timeSlots.map((slot, slotIndex) => {
                                        const isSelected = selectedCell?.day && 
                                            selectedCell?.resourceId === resource.id && 
                                            selectedCell?.slotIndex === slotIndex &&
                                            format(selectedCell.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

                                        const isHovered = hoveredCell?.day &&
                                            hoveredCell?.resourceId === resource.id &&
                                            hoveredCell?.slotIndex === slotIndex &&
                                            format(hoveredCell.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                                        
                                        const slotHour = parseSlotHour(slot);
                                        const isWorkingHour = slotHour !== null ? isWithinWorkingHours(slotHour, day) : true;
                                        
                                        return (
                                            <div 
                                                key={`${slot}-${day.toString()}-${resource.id}`} 
                                                className={`calendar-week-slot border-b border-gray-100 relative cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? 'bg-[#F9F9F7] border-2 border-dashed border-[#E4E3DE]' 
                                                        : `${isWorkingHour ? 'bg-white' : 'bg-[#FAFAFB]'}`
                                                }`}
                                                style={{ 
                                                    height: `${scaledTimeSlotHeight}px`, 
                                                    boxSizing: 'border-box',
                                                    backgroundColor: isSelected
                                                        ? undefined
                                                        : isHovered
                                                            ? '#F3F4F6'
                                                            : (isWorkingHour ? 'white' : '#FAFAFB')
                                                }}
                                                onMouseEnter={isMobile ? undefined : () => {
                                                    setHoveredCell({ day, resourceId: resource.id, slotIndex });
                                                }}
                                                onMouseLeave={isMobile ? undefined : () => setHoveredCell(null)}
                                                onClick={(e) => {
                                                    // Only handle clicks on blank space, not on events
                                                    const target = e.target as HTMLElement;
                                                    const isEventClick = target.closest('.absolute') && 
                                                        (target.classList.contains('cursor-pointer') || 
                                                         target.closest('[class*="border-l-4"]') ||
                                                         target.closest('[class*="border-dashed"]'));
                                                    
                                                    if (!isEventClick && (target === e.currentTarget || target.classList.contains('calendar-week-slot'))) {
                                                        const slotHour = parseSlotHour(slot);
                                                        if (slotHour !== null && onOpenModal && onResourceSelect) {
                                                            // Stop propagation to prevent interference with modal
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            
                                                            // Highlight the selected cell
                                                            setSelectedCell({
                                                                day: day,
                                                                resourceId: resource.id,
                                                                slotIndex: slotIndex
                                                            });
                                                            
                                                            const clickedDate = new Date(day);
                                                            clickedDate.setHours(slotHour, 0, 0, 0);
                                                            const endDate = new Date(clickedDate);
                                                            endDate.setHours(slotHour + 1, 0, 0, 0);
                                                            
                                                            onResourceSelect(resource);
                                                            onOpenModal({
                                                                resourceId: resource.id,
                                                                startTime: clickedDate.toISOString(),
                                                                endTime: endDate.toISOString(),
                                                                date: day
                                                            });
                                                            
                                                            // Clear selection after a short delay to show the highlight
                                                            setTimeout(() => {
                                                                setSelectedCell(null);
                                                            }, 300);
                                                        }
                                                    }
                                                }}
                                            >
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Draft event (dotted card) */}
                                    {draftEvent && draftEvent.resourceId === resource.id && (() => {
                                        const draftStart = new Date(draftEvent.startTime);
                                        const draftEnd = new Date(draftEvent.endTime);
                                        const draftDate = new Date(draftEvent.date || draftStart);
                                        
                                        // Check if draft event is for this day
                                        if (format(draftDate, 'yyyy-MM-dd') !== format(day, 'yyyy-MM-dd')) {
                                            return null;
                                        }
                                        
                                        const draftStartHour = draftStart.getHours();
                                        const draftStartMinutes = draftStart.getMinutes();
                                        const firstSlotHour = parseSlotHour(timeSlots[0]) || 0;
                                        const hoursFromSlotStart = draftStartHour - firstSlotHour;
                                        const minutesOffset = (hoursFromSlotStart * 60 + draftStartMinutes) / 60;
                                        
                                        const top = (0 * scaledTimeSlotHeight) + (minutesOffset * scaledTimeSlotHeight);
                                        
                                        const durationMs = draftEnd.getTime() - draftStart.getTime();
                                        const durationHours = durationMs / (1000 * 60 * 60);
                                        const height = Math.max(scaledTimeSlotHeight * 0.5, durationHours * scaledTimeSlotHeight);
                                        
                                        // Calculate width for drag functionality
                                        const avgHourWidth = scaledColumnMinWidth;
                                        
                                        return (
                                            <div
                                                className="absolute w-[95%] left-1 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/30 pointer-events-auto z-10"
                                                style={{ 
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                    minHeight: `${scaledTimeSlotHeight * 0.5}px`
                                                }}
                                            >
                                                <div className="p-2 flex items-center justify-center h-full relative">
                                                    <span className="text-sm font-medium text-blue-600">New event</span>
                                                    
                                                    {/* Drag handle on the bottom edge */}
                                                    {onDraftEventUpdate && (
                                                        <div
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                
                                                                const startY = e.clientY;
                                                                const startHeight = height;
                                                                const startTime = new Date(draftStart);
                                                                const startEndTime = new Date(draftEnd);
                                                                
                                                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                                                    const deltaY = moveEvent.clientY - startY;
                                                                    const newHeight = Math.max(scaledTimeSlotHeight * 0.5, startHeight + deltaY);
                                                                    
                                                                    const hoursFromStart = newHeight / scaledTimeSlotHeight;
                                                                    const roundedHours = Math.max(0.5, Math.round(hoursFromStart * 2) / 2);
                                                                    
                                                                    const newEnd = new Date(startTime);
                                                                    newEnd.setHours(startTime.getHours() + Math.floor(roundedHours));
                                                                    newEnd.setMinutes((roundedHours % 1) * 60);
                                                                    
                                                                    if (newEnd.getTime() !== startEndTime.getTime() && onDraftEventUpdate) {
                                                                        onDraftEventUpdate({
                                                                            ...draftEvent,
                                                                            endTime: newEnd.toISOString(),
                                                                            date: day
                                                                        });
                                                                    }
                                                                };
                                                                
                                                                const handleMouseUp = () => {
                                                                    document.removeEventListener('mousemove', handleMouseMove);
                                                                    document.removeEventListener('mouseup', handleMouseUp);
                                                                };
                                                                
                                                                document.addEventListener('mousemove', handleMouseMove);
                                                                document.addEventListener('mouseup', handleMouseUp);
                                                            }}
                                                            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-ns-resize hover:bg-blue-600 transition-colors shadow-lg z-20"
                                                            style={{ cursor: 'ns-resize' }}
                                                        >
                                                            <ChevronDownIconSolid className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    
                                    {/* Render timed events positioned absolutely within this resource column */}
                                    {timedEvents.map((event, i) => {
                                        if (!event || !event.start || !event.end) return null;
                                        const isBlockEvent = event.eventType === 'block';
                                        // Calculate position and height based on actual start/end times
                                        const eventStartTime = new Date(event.start);
                                        const eventEndTime = new Date(event.end);
                                        
                                        // For multi-day events, adjust start/end times based on current day
                                        const currentDayStart = new Date(day);
                                        currentDayStart.setHours(0, 0, 0, 0);
                                        const currentDayEnd = new Date(day);
                                        currentDayEnd.setHours(23, 59, 59, 999);
                                        
                                        const eventStartDay = new Date(eventStartTime);
                                        eventStartDay.setHours(0, 0, 0, 0);
                                        const eventEndDay = new Date(eventEndTime);
                                        eventEndDay.setHours(0, 0, 0, 0);
                                        
                                        // Determine if this is a multi-day event and which day we're on
                                        const isMultiDayEvent = eventStartDay.getTime() !== eventEndDay.getTime();
                                        const isStartDay = currentDayStart.getTime() === eventStartDay.getTime();
                                        const isEndDay = currentDayStart.getTime() === eventEndDay.getTime();
                                        const isIntermediateDay = isMultiDayEvent && !isStartDay && !isEndDay;
                                        
                                        // Helper function to get business hours bounds for a specific day
                                        const getBusinessHoursBounds = (date: Date): { open: Date; close: Date } | null => {
                                            if (!businessHours) return null;
                                            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                            const dayOfWeek = days[date.getDay()];
                                            const dayHours = businessHours[dayOfWeek];
                                            
                                            if (!dayHours) return null;
                                            
                                            let openTime: string | undefined;
                                            let closeTime: string | undefined;
                                            
                                            if (Array.isArray(dayHours) && dayHours.length >= 2) {
                                                [openTime, closeTime] = dayHours;
                                            } else if (typeof dayHours === 'object' && dayHours !== null) {
                                                openTime = (dayHours as any).open || (dayHours as any)[0];
                                                closeTime = (dayHours as any).close || (dayHours as any)[1];
                                            }
                                            
                                            if (!openTime || !closeTime) return null;
                                            
                                            // Parse time strings (e.g., "7:00 AM" or "07:00")
                                            const parseTime = (timeStr: string): { hour: number; minute: number } => {
                                                let hour = 0;
                                                let minute = 0;
                                                
                                                // Check if 12-hour format
                                                const pmMatch = timeStr.match(/(\d+):(\d+)\s*PM/i);
                                                const amMatch = timeStr.match(/(\d+):(\d+)\s*AM/i);
                                                
                                                if (pmMatch) {
                                                    hour = parseInt(pmMatch[1]);
                                                    minute = parseInt(pmMatch[2]);
                                                    if (hour !== 12) hour += 12;
                                                } else if (amMatch) {
                                                    hour = parseInt(amMatch[1]);
                                                    minute = parseInt(amMatch[2]);
                                                    if (hour === 12) hour = 0;
                                                } else {
                                                    // 24-hour format
                                                    const parts = timeStr.split(':');
                                                    hour = parseInt(parts[0]);
                                                    minute = parseInt(parts[1] || '0');
                                                }
                                                
                                                return { hour, minute };
                                            };
                                            
                                            const open = parseTime(openTime);
                                            const close = parseTime(closeTime);
                                            
                                            const openDate = new Date(date);
                                            openDate.setHours(open.hour, open.minute, 0, 0);
                                            
                                            const closeDate = new Date(date);
                                            closeDate.setHours(close.hour, close.minute, 0, 0);
                                            
                                            return { open: openDate, close: closeDate };
                                        };
                                        
                                        // Calculate the actual start and end times for this day, clamped to business hours
                                        let startTime: Date;
                                        let endTime: Date;
                                        
                                        const businessBounds = getBusinessHoursBounds(day);
                                        
                                        if (isStartDay) {
                                            // On start day: use event start time, end at business close or event end if same day
                                            startTime = eventStartTime;
                                            if (isEndDay) {
                                                endTime = eventEndTime;
                                            } else if (businessBounds) {
                                                endTime = businessBounds.close;
                                            } else {
                                                endTime = currentDayEnd;
                                            }
                                        } else if (isEndDay) {
                                            // On end day: start at business open, use event end time
                                            if (businessBounds) {
                                                startTime = businessBounds.open;
                                            } else {
                                                startTime = currentDayStart;
                                            }
                                            endTime = eventEndTime;
                                        } else if (isIntermediateDay) {
                                            // On intermediate days: span from business open to business close
                                            if (businessBounds) {
                                                startTime = businessBounds.open;
                                                endTime = businessBounds.close;
                                            } else {
                                                startTime = currentDayStart;
                                                endTime = currentDayEnd;
                                            }
                                        } else {
                                            // Single day event
                                            startTime = eventStartTime;
                                            endTime = eventEndTime;
                                        }
                                        
                                        let startHour = startTime.getHours();
                                        let startMinutes = startTime.getMinutes();
                                                    
                                        const displayedTime = formatTimeRange(event);
                                        let verifiedStartHour = startHour;
                                        
                                        if (displayedTime) {
                                            const timeMatch = displayedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                            if (timeMatch) {
                                                let displayedHour = parseInt(timeMatch[1]);
                                                const isPM = timeMatch[3].toUpperCase() === 'PM';
                                                if (isPM && displayedHour !== 12) {
                                                    displayedHour += 12;
                                                } else if (!isPM && displayedHour === 12) {
                                                    displayedHour = 0;
                                                }
                                                
                                                if (displayedHour !== startHour) {
                                                    console.warn(`Hour mismatch for event "${event.title || event.eventName}": calculated=${startHour}, displayed=${displayedHour}. Using displayed hour.`);
                                                    verifiedStartHour = displayedHour;
                                                }
                                            }
                                        }
                                        
                                        // Find which time slot this event starts in
                                        let slotIndex = -1;
                                        for (let i = 0; i < timeSlots.length; i++) {
                                            const slot = timeSlots[i];
                                            const slotHour = parseSlotHour(slot);
                                            if (slotHour !== null && verifiedStartHour >= slotHour) {
                                                slotIndex = i;
                                            } else if (slotHour !== null && verifiedStartHour < slotHour) {
                                                break;
                                            }
                                        }
                                        
                                        // If event starts before first slot, use first slot
                                        if (slotIndex === -1) slotIndex = 0;
                                        
                                        // Calculate offset within the slot
                                        const firstSlotHour = parseSlotHour(timeSlots[0]) || 0;
                                        const slotStartHour = parseSlotHour(timeSlots[slotIndex]) || firstSlotHour;
                                        const hoursFromSlotStart = verifiedStartHour - slotStartHour;
                                        const minutesOffset = (hoursFromSlotStart * 60 + startMinutes) / 60;
                                        
                                        const top = (slotIndex * scaledTimeSlotHeight) + (minutesOffset * scaledTimeSlotHeight);
                                        
                                        const durationMs = endTime.getTime() - startTime.getTime();
                                        const durationHours = durationMs / (1000 * 60 * 60);
                                        const height = Math.max(scaledTimeSlotHeight * 0.5, durationHours * scaledTimeSlotHeight);
                                        
                                        const eventColor = isBlockEvent ? 'gray' : (event.color || 'blue');
                                        const colorConfig = eventColors[eventColor] || eventColors.blue;
                                        
                                        // Map event colors to light background colors for cards
                                        const eventBackgroundColors: { [key: string]: string } = {
                                            blue: '#def2ff',   // Light blue (original)
                                            green: '#dcfce7',   // Light green
                                            orange: '#ffedd5',  // Light orange
                                            red: '#fee2e2',     // Light red
                                            gray: '#f3f4f6',    // Light gray
                                        };
                                        const cardBackgroundColor = eventBackgroundColors[eventColor] || eventBackgroundColors.blue;
                                        
                                        // Check if event is in the past (end time is before current time, or on a past day)
                                        const now = new Date();
                                        const todayStart = startOfDay(now);
                                        const dayStart = startOfDay(day);
                                        const isPastDay = isBefore(dayStart, todayStart);
                                        const isPastEvent = isPastDay || (isSameDay(day, now) && endTime < now);
                                        const isUnpaid = isEventUnpaid(event);
                                        
                                        // Adaptive content visibility based on card height (in pixels) - matching Figma designs
                                        // If card is less than or equal to one hour tall, hide time, employee image, and comments
                                        // Use actual duration in hours, not calculated height, to avoid Math.max precision issues
                                        const oneHourHeight = scaledTimeSlotHeight; // Height of one hour in pixels (e.g., 96px)
                                        // Hide time, notes, and employee image when duration is <= 1 hour
                                        // Only show these elements when duration is strictly greater than 1 hour
                                        const isAtLeastOneHour = durationHours > 1.0;
                                        
                                        // Smallest (< 25px): Title + pink indicator bar
                                        // 2nd (>= 25px): Title + Time + Drop-off button
                                        // 3rd (>= 55px): Title + Time + Vehicle + Notes + Both buttons
                                        // 4th (>= 85px): Title + Time + Vehicle + Notes + Customer name + Both buttons + Profile picture
                                        // Largest (>= 100px): Title + Time + Vehicle + Notes + Customer name + Customer phone + Both buttons + Profile picture
                                        const isSmallest = height < 25; // Show only title + indicator bar
                                        
                                        // Hide time, notes, and employee image if card is less than one hour tall
                                        // These elements require the card to be at least one hour tall to display
                                        const showTime = height >= 25 && isAtLeastOneHour;
                                        const showLocationButton = !isBlockEvent && height >= 25; // Show location button starting from 2nd design
                                        const showVehicle = !isBlockEvent && height >= 55; // Show vehicle starting from 3rd design
                                        const showNotes = height >= 55 && isAtLeastOneHour; // Hide notes if less than one hour
                                        const showRepeatButton = !isBlockEvent && height >= 55; // Show repeat button starting from 3rd design
                                        const showCustomerName = !isBlockEvent && height >= 85; // Show customer name starting from 4th design
                                        const showTechPicture = height >= 85 && isAtLeastOneHour; // Hide employee image if less than one hour
                                        const showCustomerPhone = !isBlockEvent && height >= 100; // Show customer phone starting from largest design
                                        const showCustomerAddress = !isBlockEvent && showCustomerPhone;
                                        const addressLine = (() => {
                                            const city = (event as any).customerCity || (event as any).city;
                                            const rawAddress = event.customerAddress || (event as any).address;
                                            if (rawAddress && city) return `${rawAddress}, ${city}`;
                                            if (rawAddress) {
                                                const parts = String(rawAddress)
                                                    .split(',')
                                                    .map((part) => part.trim())
                                                    .filter(Boolean);
                                                if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
                                                if (parts.length === 1) return parts[0];
                                            }
                                            if (city) return String(city);
                                            return '';
                                        })();
                                        
                                        // Calculate max lines for notes (max 2 lines)
                                        const notesMaxLines = height >= 45 ? 2 : 0;
                                        
                                        // Format time for display (ensure format: 9:00 - 10:00 AM)
                                        const formatTimeDisplay = (timeRange: string) => {
                                            if (!timeRange) return '';
                                            // Format should be: "9:00 AM - 10:00 AM"
                                            // If already in correct format, return as is
                                            if (timeRange.includes('AM') || timeRange.includes('PM')) {
                                                return timeRange;
                                            }
                                            return timeRange;
                                        };
                                        
                                        return renderEventHoverCard(
                                            `event-${i}-${event.id || i}-${resource.id}`,
                                            event,
                                    <div 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            // Ensure event click works even when modal/draft is open
                                            onEventClick(event);
                                        }}
                                    className={`absolute w-[95%] left-1 rounded-[6px] flex flex-col items-start cursor-pointer hover:shadow-lg transition-all z-20`}
                                    style={{ 
                                        pointerEvents: 'auto',
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        minHeight: `${scaledTimeSlotHeight * 0.5}px`,
                                        opacity: isPastEvent ? 0.5 : 1,
                                        backgroundColor: isUnpaid ? 'transparent' : cardBackgroundColor,
                                        border: isUnpaid ? '2px solid #f87171' : undefined,
                                        paddingTop: '8px',
                                        paddingBottom: '8px',
                                        paddingLeft: '7px',
                                        paddingRight: '7px',
                                        justifyContent: 'space-between'
                                    }}
                                    >
                                        {/* Top Section: Title, Time, Vehicle, Notes */}
                                        <div className="flex flex-col items-start w-full" style={{ gap: '4px' }}>
                                            {/* UNPAID badge */}
                                            {isUnpaid && !isBlockEvent && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 leading-none uppercase">Unpaid</span>
                                            )}
                                            {/* 1. Service/Title - Always visible */}
                                            <div className="flex items-center gap-1.5 w-full">
                                        {event.source === 'google' && (
                                            <svg className="w-3 h-3 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                            <span 
                                                className="truncate flex-1"
                                                style={{
                                                    fontSize: '12px',
                                                        fontFamily: "'Helvetica Neue', sans-serif",
                                                    fontWeight: 500,
                                                    color: '#062F4B',
                                                        lineHeight: 'normal',
                                                        whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {isBlockEvent ? 'Blocked Time' : (event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service')}
                                            </span>
                                        </div>
                                        
                                            {/* Time - Show if height >= 25px */}
                                            {showTime && formatTimeRange(event) && (
                                                <div 
                                                    style={{
                                                        fontSize: '10px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontWeight: 500,
                                                        color: '#062F4B',
                                                        lineHeight: 'normal'
                                                    }}
                                                >
                                                    {formatTimeDisplay(formatTimeRange(event))}
                                                </div>
                                            )}
                                        
                                            {/* Vehicle - Show if height >= 55px */}
                                        {showVehicle && (event.vehicleType || event.vehicleModel) && (
                                                <div 
                                                    className="w-full"
                                                style={{
                                                    fontSize: '10px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontWeight: 500,
                                                    color: '#062F4B',
                                                        lineHeight: 'normal'
                                                }}
                                            >
                                                {event.vehicleType || event.vehicleModel}
                                                </div>
                                        )}
                                        
                                            {/* Notes - Show if height >= 55px */}
                                            {showNotes && event.description && (
                                            <div 
                                                    className="w-full"
                                                style={{
                                                    fontSize: '10px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontWeight: 500,
                                                    color: 'rgba(6, 47, 75, 0.70)',
                                                        lineHeight: 'normal'
                                                }}
                                            >
                                                    {event.description}
                                            </div>
                                        )}
                                        </div>
                                        
                                        {/* Bottom Section: Customer Info, Action Buttons, Profile Picture */}
                                        <div className="flex flex-col items-start w-full" style={{ gap: '8px' }}>
                                            {/* Customer Name + Phone - Show name if height >= 85px, phone if height >= 100px */}
                                            {(showCustomerName || showCustomerPhone) && (event.customerName || event.customerPhone) && (
                                                <div className="flex flex-col items-start w-full" style={{ gap: '2px' }}>
                                                    {showCustomerName && event.customerName && (
                                                    <div 
                                                            className="w-full"
                                                        style={{
                                                            fontSize: '10px',
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontWeight: 500,
                                                            color: '#062F4B',
                                                                lineHeight: 'normal'
                                                        }}
                                                    >
                                                        {event.customerName}
                                                    </div>
                                                )}
                                                    {showCustomerPhone && event.customerPhone && (
                                                    <div 
                                                            className="w-full"
                                                        style={{
                                                            fontSize: '10px',
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontWeight: 500,
                                                                color: 'rgba(6, 47, 75, 0.70)',
                                                                lineHeight: 'normal'
                                                        }}
                                                    >
                                                        {formatPhoneDisplay(event.customerPhone)}
                                                    </div>
                                                )}
                                                    {showCustomerAddress && addressLine && (
                                                    <div 
                                                            className="w-full"
                                                        style={{
                                                            fontSize: '10px',
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontWeight: 500,
                                                                color: 'rgba(6, 47, 75, 0.60)',
                                                                lineHeight: 'normal'
                                                        }}
                                                    >
                                                        {addressLine}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                            {/* Action Buttons */}
                                            {(() => {
                                                // Smallest design: show pink indicator bar
                                                if (isSmallest) {
                                                    return (
                                                        <div className="w-full" style={{ height: '8px', display: 'flex', alignItems: 'flex-end' }}>
                                                            <div 
                                                    style={{
                                                                    height: '3px',
                                                                    width: '100%',
                                                                    backgroundColor: '#d43b88',
                                                                    borderRadius: '2px'
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                }
                                                
                                                // 2nd design and up: show location button(s)
                                                if (showLocationButton || showRepeatButton) {
                                                    return (
                                                        <div className="flex flex-col items-start w-full" style={{ gap: '4px' }}>
                                                            {/* Location Button - Show if height >= 25px */}
                                                            {showLocationButton && (() => {
                                                                if (resource.type === 'bay' && event.locationType) {
                                                                    const locationLower = event.locationType.toLowerCase();
                                                                    const isPickup = locationLower === 'pick up' || locationLower === 'pickup';
                                                                    const isDropoff = locationLower === 'drop off' || locationLower === 'dropoff';
                                                                    return (
                                                                        <div 
                                                                            className="flex items-center justify-center w-full"
                                                    style={{
                                                                                height: '15px',
                                                                                backgroundColor: isPickup ? '#3B82F6' : isDropoff ? '#d43b88' : '#E5E7EB',
                                                                                borderRadius: '2px',
                                                                                paddingLeft: '3px',
                                                                                paddingRight: '3px',
                                                                                paddingTop: '2px',
                                                                                paddingBottom: '2px'
                                                                            }}
                                                                        >
                                                                            <span 
                                                                                style={{
                                                                                    fontSize: '10px',
                                                                                    fontFamily: "'Inter', sans-serif",
                                                                                    fontWeight: 600,
                                                                                    color: 'white',
                                                                                    lineHeight: 'normal',
                                                                                    textAlign: 'center',
                                                                                    whiteSpace: 'nowrap',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    width: '100%'
                                                                                }}
                                                                            >
                                                                                {isPickup ? 'Pick Up' : isDropoff ? 'Drop Off' : event.locationType}
                                            </span>
                                                                        </div>
                                                                    );
                                                                } else if (resource.type === 'van') {
                                                                    return (
                                                                        <div 
                                                                            className="flex items-center justify-center w-full"
                                                                            style={{
                                                                                height: '15px',
                                                                                backgroundColor: '#E5E7EB',
                                                                                borderRadius: '2px',
                                                                                paddingLeft: '3px',
                                                                                paddingRight: '3px',
                                                                                paddingTop: '2px',
                                                                                paddingBottom: '2px'
                                                                            }}
                                                                        >
                                                                            <span 
                                                                                style={{
                                                                                    fontSize: '10px',
                                                                                    fontFamily: "'Inter', sans-serif",
                                                                                    fontWeight: 600,
                                                                                    color: '#374151',
                                                                                    lineHeight: 'normal',
                                                                                    textAlign: 'center',
                                                                                    whiteSpace: 'nowrap'
                                                                                }}
                                                                            >
                                                    Van
                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            })()}
                                            
                                                            {/* Repeat/New Customer Button - Show if height >= 55px */}
                                                            {showRepeatButton && (() => {
                                                const customerType = event.customerType
                                                  ? String(event.customerType).toLowerCase()
                                                  : getCustomerType(event);
                                                if (customerType === 'returning') {
                                                    return (
                                                                        <div 
                                                                            className="flex items-center justify-center w-full"
                                                                            style={{
                                                                                height: '15px',
                                                                                backgroundColor: '#ae5aef',
                                                                                borderRadius: '2px',
                                                                                paddingLeft: '3px',
                                                                                paddingRight: '3px',
                                                                                paddingTop: '2px',
                                                                                paddingBottom: '2px'
                                                                            }}
                                                                        >
                                                                            <span 
                                                                                style={{
                                                                                    fontSize: '10px',
                                                                                    fontFamily: "'Inter', sans-serif",
                                                                                    fontWeight: 600,
                                                                                    color: 'white',
                                                                                    lineHeight: 'normal',
                                                                                    textAlign: 'center',
                                                                                    whiteSpace: 'nowrap',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    width: '100%'
                                                                                }}
                                                                            >
                                                                                Repeat...
                                            </span>
                                                                        </div>
                                                    );
                                                } else if (customerType === 'new') {
                                                    return (
                                                                        <div 
                                                                            className="flex items-center justify-center w-full"
                                                                            style={{
                                                                                height: '15px',
                                                                                backgroundColor: '#ae5aef',
                                                                                borderRadius: '2px',
                                                                                paddingLeft: '3px',
                                                                                paddingRight: '3px',
                                                                                paddingTop: '2px',
                                                                                paddingBottom: '2px'
                                                                            }}
                                                                        >
                                                                            <span 
                                                                                style={{
                                                                                    fontSize: '10px',
                                                                                    fontFamily: "'Inter', sans-serif",
                                                                                    fontWeight: 600,
                                                                                    color: 'white',
                                                                                    lineHeight: 'normal',
                                                                                    textAlign: 'center',
                                                                                    whiteSpace: 'nowrap',
                                                                                    overflow: 'hidden',
                                                                                    textOverflow: 'ellipsis',
                                                                                    width: '100%'
                                                                                }}
                                                                            >
                                                            New Customer
                                                        </span>
                                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        
                                            {/* Profile Picture - Show if height >= 85px */}
                                        {showTechPicture && (
                                                <div className="relative shrink-0" style={{ width: '24px', height: '24px' }}>
                                            {event.employeeName ? (
                                                        <div className={`w-full h-full rounded-full flex items-center justify-center ${getEmployeeBadgeClass(event.color)}`}>
                                                            <span style={{ fontSize: '9px', fontWeight: 600 }}>
                                                        {getEmployeeInitials(event.employeeName)}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                        )}
                                        </div>
                                    </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Draft Event Card Component with drag functionality
const DraftEventCard = ({ 
  draftEvent, 
  left, 
  width, 
  onDraftEventUpdate,
  date,
  columnWidths,
  scale = 1.0
}: { 
  draftEvent: { resourceId: string; startTime: string; endTime: string },
  left: number,
  width: number,
  onDraftEventUpdate?: (draftEvent: { resourceId: string; startTime: string; endTime: string }) => void,
  date: Date,
  columnWidths: number[],
  scale?: number
}) => {
  // Calculate average hour width for drag calculations (must account for scale)
  const avgHourWidth = (columnWidths.reduce((sum, w) => sum + w, 0) / columnWidths.length) * scale;
  
  // Handle drag to extend event duration
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = width;
    const startTime = new Date(draftEvent.startTime);
    const startEndTime = new Date(draftEvent.endTime);
    const startHour = startTime.getHours();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(avgHourWidth, startWidth + deltaX); // Minimum 1 average hour
      
      // Calculate hours from the start time using average width
      const hoursFromStart = newWidth / avgHourWidth;
      // Round to nearest 0.5 hour (30 minutes)
      const roundedHours = Math.max(0.5, Math.round(hoursFromStart * 2) / 2);
      
      const newEnd = new Date(startTime);
      newEnd.setHours(startTime.getHours() + Math.floor(roundedHours));
      newEnd.setMinutes((roundedHours % 1) * 60);
      
      // Only update if the end time actually changed
      if (newEnd.getTime() !== startEndTime.getTime() && onDraftEventUpdate) {
        onDraftEventUpdate({
          ...draftEvent,
          endTime: newEnd.toISOString()
        });
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <div
      className="absolute top-2 bottom-2 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/30 pointer-events-none"
      style={{ 
        left: `${left}px`, 
        width: `${width}px`,
        minWidth: '0px', // Don't enforce minimum - let width be exactly what it should be
        zIndex: 10
      }}
    >
      <div className="p-2 flex items-center justify-center h-full relative">
        <span className="text-sm font-medium text-blue-600">New event</span>
        
        {/* Drag handle on the right edge */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-ew-resize hover:bg-blue-600 transition-colors shadow-lg z-20 pointer-events-auto"
          style={{ cursor: 'ew-resize' }}
        >
          <ChevronRightIcon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
};

const DayView = ({ date, events, resources, onEventClick, onResourceSelect, onOpenModal, draftEvent, onDraftEventUpdate, scale = 1.0, businessHours, onEventDrop, scrollToTime, isMobile }: { 
  date: Date, 
  events: any[], 
  resources: Array<{ id: string, name: string, type: 'bay' | 'van' }>,
  onEventClick: (event: any) => void,
  onResourceSelect: (resource: { id: string, name: string, type: 'bay' | 'van' }) => void,
  onOpenModal: (draftEvent?: { resourceId: string; startTime: string; endTime: string }) => void,
  draftEvent?: { resourceId: string; startTime: string; endTime: string } | null,
  onDraftEventUpdate?: (draftEvent: { resourceId: string; startTime: string; endTime: string }) => void,
  scale?: number,
  businessHours?: any,
  onEventDrop?: (eventId: string, newResourceId: string) => Promise<void>,
  scrollToTime?: number | null, // Hour (0-23) to scroll to
  isMobile?: boolean
}) => {
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragOverResourceId, setDragOverResourceId] = useState<string | null>(null);
  const [hoveredResourceId, setHoveredResourceId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledTo6AM = useRef(false);
  const hasScrolledToTime = useRef(false);
  const [hoveredSlot, setHoveredSlot] = useState<{ resourceId: string; slotIndex: number } | null>(null);
  // Store a single base width for all columns (uniform width)
  const [baseColumnWidth, setBaseColumnWidth] = useState<number>(() => {
    // Load from localStorage or default to 120px
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dayViewBaseColumnWidth');
      if (saved) {
        try {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed > 0) {
            return Math.min(parsed, 120);
          }
        } catch (e) {
          console.error('Error parsing saved column width:', e);
        }
      }
    }
    return 96;
  });
  // Create uniform column widths array from base width
  const columnWidths = Array(24).fill(baseColumnWidth);
  const [resizingColumn, setResizingColumn] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Generate hourly time slots for entire 24 hours (12 AM to 11 PM)
  const timeSlots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    timeSlots.push(`${hour12} ${period}`);
  }

  // Helper function to check if an hour (0-23) is within working hours
  const isWithinWorkingHours = (hour: number): boolean => {
    // If no business hours configured, show all hours as working (white)
    if (!businessHours) {
      return true;
    }

    // Map JavaScript day index (0=Sunday) to full day names used in MongoDB
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = date.getDay();
    const dayKey = dayNames[dayOfWeek];
    const dayHours = businessHours[dayKey];

    // If day is not set, closed, or invalid, all hours are non-working (grey)
    if (!dayHours || !Array.isArray(dayHours) || dayHours.length < 2) {
      return false;
    }

    const [openTime, closeTime] = dayHours;
    
    // If times are empty or invalid, day is closed - all hours are non-working (grey)
    if (!openTime || !closeTime || openTime.trim() === '' || closeTime.trim() === '') {
      return false;
    }

    // Parse times (format: "HH:MM" in 24-hour format, e.g., "07:00", "20:00")
    const [openHour] = openTime.split(':').map(Number);
    const [closeHour] = closeTime.split(':').map(Number);

    // Check if hour is within working hours (openHour <= hour < closeHour)
    return hour >= openHour && hour < closeHour;
  };

  // Save base column width to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dayViewBaseColumnWidth', baseColumnWidth.toString());
    }
  }, [baseColumnWidth]);

  // Calculate cumulative widths for event positioning (with scale applied)
  // Ensure precision by rounding to avoid floating point errors
  const getCumulativeWidth = (index: number) => {
    const sum = columnWidths.slice(0, index).reduce((acc, width) => acc + (width * scale), 0);
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(sum * 100) / 100;
  };

  // Calculate total width of all columns (with scale applied)
  const totalColumnWidth = columnWidths.reduce((sum, width) => sum + (width * scale), 0);

  // Handle resize start
  const handleResizeStart = (columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnIndex);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = baseColumnWidth;
  };

  // Handle resize move - update all columns to the same width
  useEffect(() => {
    if (resizingColumn === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current;
      const newWidth = Math.max(80, Math.min(300, resizeStartWidth.current + diff)); // Min 80px, max 300px
      
      // Update base width, which will update all columns uniformly
      setBaseColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  // Measure container height for dynamic row sizing
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        // Get the scroll container (the parent with id="calendar-scroll-container")
        const scrollContainer = containerRef.current;
        if (scrollContainer) {
          // Get header height (approximately 60px)
          const header = scrollContainer.querySelector('.sticky.top-0') as HTMLElement;
          const headerHeight = header ? header.offsetHeight : 60;
          setContainerHeight(scrollContainer.clientHeight - headerHeight);
        }
      }
    };
    
    // Use a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateHeight, 100);
    window.addEventListener('resize', updateHeight);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateHeight);
    };
  }, [resources.length]); // Recalculate when resources change

  // Scroll to specific time if provided, otherwise scroll to 6 AM on initial load
  useEffect(() => {
    if (containerRef.current) {
      const scrollContainer = containerRef.current;
      
      // If scrollToTime is provided, scroll to that time
      if (scrollToTime !== null && scrollToTime !== undefined && !hasScrolledToTime.current) {
        const scrollToTimeSlot = () => {
          const targetHour = Math.max(0, Math.min(23, scrollToTime)); // Clamp to 0-23
          scrollContainer.scrollLeft = getCumulativeWidth(targetHour);
          hasScrolledToTime.current = true;
          hasScrolledTo6AM.current = true; // Mark as scrolled so 6 AM scroll doesn't override
        };
        const timeoutId = setTimeout(scrollToTimeSlot, 200);
        return () => clearTimeout(timeoutId);
      } 
      // Otherwise, scroll to 6 AM on initial load (6 AM is at index 6)
      else if (!hasScrolledTo6AM.current) {
        const scrollTo6AM = () => {
          scrollContainer.scrollLeft = getCumulativeWidth(6); // Scroll to 6 AM position
          hasScrolledTo6AM.current = true;
        };
        const timeoutId = setTimeout(scrollTo6AM, 150);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [baseColumnWidth, scale, scrollToTime]); // Re-run when base column width, scale, or scrollToTime changes

  // Reset scroll flags when date changes
  useEffect(() => {
    hasScrolledTo6AM.current = false;
    hasScrolledToTime.current = false;
  }, [date]);

  // Calculate current time position for indicator line
  // Note: new Date() uses the user's local timezone automatically
  // getHours() and getMinutes() return local time values
  const currentTime = new Date();
  const isToday = isSameDay(date, currentTime);
  const currentHour = currentTime.getHours(); // Local time hour (0-23)
  const currentMinutes = currentTime.getMinutes(); // Local time minutes (0-59)
  
  // Calculate left position for current time line (similar to event positioning)
  const getCurrentTimePosition = () => {
    if (!isToday) return null;
    
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    let left = getCumulativeWidth(currentHour);
    const hourFraction = currentMinutes / 60;
    const hourWidth = columnWidths[currentHour] * scale;
    left += hourWidth * hourFraction;
    
    return Math.round(left * 100) / 100;
  };
  
  const currentTimeLeft = getCurrentTimePosition();

  // Filter events for the current day
  const dayEvents = events.filter(e => {
    if (!e) return false;
    const currentDateStr = format(date, 'yyyy-MM-dd');
    
    // Check if this is a multi-day event that spans this date
    if (e.start && e.end) {
      const eventStart = new Date(e.start);
      const eventEnd = new Date(e.end);
      const currentDay = new Date(date);
      currentDay.setHours(0, 0, 0, 0);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      // Check if current day is within the event's date range
      if (currentDay >= eventStart && currentDay <= eventEnd) {
        return true;
      }
    }
    
    // Check if event is on the current day (single-day events)
    const eventStartDate = getEventDateString(e);
    return eventStartDate === currentDateStr;
  });

  // Helper function to get business hours bounds for a specific day
  const getBusinessHoursBounds = (date: Date): { open: Date; close: Date } | null => {
    if (!businessHours) return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = days[date.getDay()];
    const dayHours = businessHours[dayOfWeek];
    
    if (!dayHours) return null;
    
    let openTime: string | undefined;
    let closeTime: string | undefined;
    
    if (Array.isArray(dayHours) && dayHours.length >= 2) {
      [openTime, closeTime] = dayHours;
    } else if (typeof dayHours === 'object' && dayHours !== null) {
      openTime = (dayHours as any).open || (dayHours as any)[0];
      closeTime = (dayHours as any).close || (dayHours as any)[1];
    }
    
    if (!openTime || !closeTime) return null;
    
    // Parse time strings (e.g., "7:00 AM" or "07:00")
    const parseTime = (timeStr: string): { hour: number; minute: number } => {
      let hour = 0;
      let minute = 0;
      
      // Check if 12-hour format
      const pmMatch = timeStr.match(/(\d+):(\d+)\s*PM/i);
      const amMatch = timeStr.match(/(\d+):(\d+)\s*AM/i);
      
      if (pmMatch) {
        hour = parseInt(pmMatch[1]);
        minute = parseInt(pmMatch[2]);
        if (hour !== 12) hour += 12;
      } else if (amMatch) {
        hour = parseInt(amMatch[1]);
        minute = parseInt(amMatch[2]);
        if (hour === 12) hour = 0;
      } else {
        // 24-hour format
        const parts = timeStr.split(':');
        hour = parseInt(parts[0]);
        minute = parseInt(parts[1] || '0');
      }
      
      return { hour, minute };
    };
    
    const open = parseTime(openTime);
    const close = parseTime(closeTime);
    
    const openDate = new Date(date);
    openDate.setHours(open.hour, open.minute, 0, 0);
    
    const closeDate = new Date(date);
    closeDate.setHours(close.hour, close.minute, 0, 0);
    
    return { open: openDate, close: closeDate };
  };

  // Calculate event position and width based on start/end time using dynamic column widths
  const getEventPosition = (event: any) => {
    if (!event.start || !event.end) return { left: 0, width: 0 };
    
    const eventStartTime = new Date(event.start);
    const eventEndTime = new Date(event.end);
    const currentDayStart = new Date(date);
    currentDayStart.setHours(0, 0, 0, 0);
    const currentDayEnd = new Date(date);
    currentDayEnd.setHours(23, 59, 59, 999);
    
    const eventStartDay = new Date(eventStartTime);
    eventStartDay.setHours(0, 0, 0, 0);
    const eventEndDay = new Date(eventEndTime);
    eventEndDay.setHours(0, 0, 0, 0);
    
    // Determine if this is a multi-day event and which day we're on
    const isMultiDayEvent = eventStartDay.getTime() !== eventEndDay.getTime();
    const isStartDay = currentDayStart.getTime() === eventStartDay.getTime();
    const isEndDay = currentDayStart.getTime() === eventEndDay.getTime();
    const isIntermediateDay = isMultiDayEvent && !isStartDay && !isEndDay;
    
    // Calculate the actual start and end times for this day, clamped to business hours
    let startTime: Date;
    let endTime: Date;
    
    const businessBounds = getBusinessHoursBounds(date);
    
    if (isStartDay) {
      // On start day: use event start time, end at business close or event end if same day
      startTime = eventStartTime;
      if (isEndDay) {
        endTime = eventEndTime;
      } else if (businessBounds) {
        endTime = businessBounds.close;
      } else {
        endTime = currentDayEnd;
      }
    } else if (isEndDay) {
      // On end day: start at business open, use event end time
      if (businessBounds) {
        startTime = businessBounds.open;
      } else {
        startTime = currentDayStart;
      }
      endTime = eventEndTime;
    } else if (isIntermediateDay) {
      // On intermediate days: span from business open to business close
      if (businessBounds) {
        startTime = businessBounds.open;
        endTime = businessBounds.close;
      } else {
        startTime = currentDayStart;
        endTime = currentDayEnd;
      }
    } else {
      // Single day event
      startTime = eventStartTime;
      endTime = eventEndTime;
    }
    
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinutes = endTime.getMinutes();
    
    // Calculate left position: sum of widths of all columns before start hour + fraction of start hour column
    // Use exact same calculation as rendered columns: columnWidths[index] * scale
    let left = getCumulativeWidth(startHour);
    const startHourFraction = startMinutes / 60;
    const startHourWidth = columnWidths[startHour] * scale;
    left += startHourWidth * startHourFraction;

    // Calculate end position: sum of widths up to end hour + fraction of end hour column
    let endPosition = getCumulativeWidth(endHour);
    const endHourFraction = endMinutes / 60;
    const endHourWidth = columnWidths[endHour] * scale;
    endPosition += endHourWidth * endHourFraction;
    
    // Width is the difference between end and start positions
    // Ensure we use exact pixel values without rounding errors
    const calculatedWidth = endPosition - left;
    // Don't enforce minimum width - let it be exactly what it should be based on time duration
    // At lower zoom levels, widths will be smaller, which is correct
    const width = Math.round(calculatedWidth * 100) / 100; // Round to 2 decimal places for precision
    
    return { left: Math.round(left * 100) / 100, width };
  };

  // Determine customer type (new vs returning) - check if customer has previous bookings
  const getCustomerType = (event: any) => {
    return getCustomerTypeFromHistory({
      completedServiceCount: event.completedServiceCount,
      lastCompletedServiceAt: event.lastCompletedServiceAt,
      referenceDate: event.start || event.date || new Date()
    });
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    // If already in 12-hour format, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    // Otherwise, try to parse and format
    return timeStr;
  };

  // Format time range for event cards (e.g., "9:00 AM - 11:00 AM")
  const formatTimeRange = (event: any): string => {
    if (event.start && event.end && !event.allDay) {
      try {
        const startTime = new Date(event.start);
        const endTime = new Date(event.end);
        const startFormatted = format(startTime, 'h:mm a');
        const endFormatted = format(endTime, 'h:mm a');
        return `${startFormatted} - ${endFormatted}`;
      } catch (e) {
        console.error('Error formatting time range:', e);
      }
    }
    // Fallback to event.time if available
    if (event.time) {
      // If time is in 24-hour format, convert to 12-hour
      if (event.time.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = event.time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      return event.time;
    }
    return '';
  };

  const renderEventHoverCard = (key: string, event: any, content: ReactElement) => {
    if (isMobile) {
      return <Fragment key={key}>{content}</Fragment>;
    }
    return (
      <HoverCard key={key} openDelay={150} closeDelay={100}>
        <HoverCardTrigger asChild>{content}</HoverCardTrigger>
        <HoverCardContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-auto p-0 border-none bg-transparent shadow-none"
        >
          <EventHoverContent
            event={event}
            formatTimeRange={formatTimeRange}
            getCustomerType={getCustomerType}
            resources={resources}
          />
        </HoverCardContent>
      </HoverCard>
    );
  };

  // Calculate dynamic height for each row
  // All rows get equal height to fit the screen
  const calculateRowHeight = (index: number, totalResources: number) => {
    // All rows get equal space (100% / totalResources)
    return `${100 / totalResources}%`;
  };

  return (
    <div className="flex flex-col h-full max-h-full w-full overflow-hidden">
      {/* Scrollable container for header and rows */}
      <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto" id="calendar-scroll-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <div style={{ minWidth: `${totalColumnWidth + 128}px` }}>
      {/* Header with time slots - sticky when scrolling down */}
         <div className="flex bg-white flex-shrink-0 sticky top-0 z-50" style={{ minWidth: `${totalColumnWidth + 128}px`, width: 'max-content', position: 'relative' }}>
          <div className="w-32 flex-shrink-0 p-2 bg-white sticky left-0 z-[100] flex items-center justify-center" style={{ 
            isolation: 'isolate', 
            borderRight: '1px solid #F0F0EE', 
            boxShadow: 'none',
            position: 'sticky',
            backgroundColor: 'white',
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}>
            <div className="text-xs font-semibold text-black"></div>
          </div>
          <div className="flex flex-shrink-0" style={{ minWidth: `${totalColumnWidth}px`, width: `${totalColumnWidth}px`, position: 'relative', zIndex: 1, transform: 'translateZ(0)' }}>
            {timeSlots.map((slot, index) => {
              const hour = index; // hour is 0-23 (0 = 12 AM, 23 = 11 PM)
              const isWorkingHour = isWithinWorkingHours(hour);
              const is12PM = slot === '12 PM';
              return (
                <div 
                  key={slot} 
                  className="flex-shrink-0 p-2 relative group"
                  style={{ 
                    width: `${columnWidths[index] * scale}px`,
                    borderRight: '1px solid #F0F0EE',
                    overflow: 'hidden',
                    backgroundColor: isWorkingHour ? 'white' : '#FAFAFB'
                  }}
                >
                <div className={`text-xs text-black text-left whitespace-nowrap ${is12PM ? 'font-bold' : 'font-semibold'}`} style={{ overflow: 'hidden', textOverflow: 'clip' }}>
                  {slot}
                </div>
                {/* Resize handle */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                  onMouseDown={(e) => handleResizeStart(index, e)}
                  style={{
                    cursor: resizingColumn === index ? 'col-resize' : 'col-resize',
                    backgroundColor: resizingColumn === index ? '#60a5fa' : 'transparent',
                    opacity: resizingColumn === index ? 1 : undefined
                  }}
                />
              </div>
              );
            })}
          </div>
        </div>

        {/* Resource rows container - needs fixed height for percentage-based row heights */}
        <div 
          className="flex flex-col relative"
          style={{ 
            minWidth: `${totalColumnWidth + 128}px`,
            height: containerHeight > 0 ? `${containerHeight}px` : 'auto'
          }}
        >
          {/* Current time indicator line - spans all resources */}
          {isToday && currentTimeLeft !== null && (
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{
                left: `${currentTimeLeft + 128}px`, // 128px is the width of the resource name column (w-32 = 128px)
                width: '2px',
                backgroundColor: '#FF3700',
              }}
            >
              {/* Horizontal line indicator on the left side at the top */}
              <div
                className="absolute"
                style={{
                  left: '-10px',
                  top: '0',
                  width: '10px',
                  height: '2px',
                  backgroundColor: '#FF3700'
                }}
              />
              {/* Horizontal line indicator on the right side at the top */}
              <div
                className="absolute"
                style={{
                  right: '-10px',
                  top: '0',
                  width: '10px',
                  height: '2px',
                  backgroundColor: '#FF3700'
                }}
              />
              {/* Divider before main indicator */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: '-1px',
                  height: '1px',
                  backgroundColor: 'rgba(255, 55, 0, 0.2)' // #FF3700 at 20% opacity
                }}
              />
              {/* Divider after main indicator */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: '2px',
                  height: '1px',
                  backgroundColor: 'rgba(255, 55, 0, 0.2)' // #FF3700 at 20% opacity
                }}
              />
            </div>
          )}
          {resources.map((resource, index) => {
          // Filter events for this resource - match WeekView logic exactly
          const resourceEvents = dayEvents.filter(e => {
            // If event has resourceId, it must match this resource
            if (e.resourceId && e.resourceId !== resource.id) return false;
            // If event has no resourceId, show it on all resources (matching WeekView behavior)
            return true;
          });
            const rowHeight = calculateRowHeight(index, resources.length);
            const isDragOver = dragOverResourceId === resource.id;
          
          return (
            <div 
              key={resource.id} 
                className="flex flex-shrink-0"
                style={{ 
                  height: rowHeight, 
                  minHeight: `${120 * scale}px`, 
                  borderBottom: '1px solid #F0F0EE',
                  backgroundColor: isDragOver ? '#E0F2FE' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={() => {
                  setHoveredResourceId(resource.id);
                }}
                onMouseLeave={() => {
                  setHoveredResourceId(null);
                  setHoveredTimeSlot(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverResourceId(resource.id);
                }}
                onDragLeave={(e) => {
                  // Only clear if we're leaving the entire row, not just moving to a child
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX;
                  const y = e.clientY;
                  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                    setDragOverResourceId(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverResourceId(null);
                  
                  const eventId = e.dataTransfer.getData('text/plain');
                  if (eventId && draggedEventId === eventId && onEventDrop) {
                    // Check if event is being moved to a different resource
                    const event = dayEvents.find((ev: any) => ev.id === eventId);
                    if (event && event.resourceId !== resource.id) {
                      try {
                        await onEventDrop(eventId, resource.id);
                      } catch (error) {
                        console.error('Error moving event:', error);
                      }
                    }
                  }
                  setDraggedEventId(null);
                }}
            >
              {/* Resource name column */}
                <div 
                  className="w-32 flex-shrink-0 p-3 bg-white sticky left-0 z-30 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ isolation: 'isolate', borderRight: '1px solid #F0F0EE' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onResourceSelect(resource);
                    onOpenModal();
                  }}
                >
                <div className="flex items-center gap-2">
                  {resource.type === 'bay' ? (
                      <Image 
                        src="/icons/bay.svg" 
                        alt="Bay" 
                        width={20} 
                        height={20}
                        className="object-contain"
                      />
                    ) : (
                      <Image 
                        src="/icons/van.svg" 
                        alt="Van" 
                        width={20} 
                        height={20}
                        className="object-contain"
                      />
                    )}
                    <div className="relative" style={{ zIndex: 9999, position: 'relative' }}>
                      <div className="text-sm font-semibold text-black">
                      {resource.name.toUpperCase()}
                    </div>
                      <div className="text-xs text-gray-600 mt-1">
                      <PlusIcon className="w-4 h-4 inline" /> Add
                      </div>
                  </div>
                </div>
              </div>

              {/* Time slots row with events */}
                <div 
                  className="flex-1 min-w-0 relative"
                  style={{ position: 'relative', left: 0, overflow: 'hidden' }}
                  onClick={(e) => {
                    // Only handle clicks on blank space, not on events
                    const target = e.target as HTMLElement;
                    // Check if click is on an event (events have specific classes)
                    const isEventClick = target.closest('.absolute') && 
                      (target.classList.contains('cursor-pointer') || 
                       target.closest('[class*="border-l-4"]') ||
                       target.closest('[class*="border-dashed"]'));
                    
                    if (!isEventClick && (target === e.currentTarget || target.classList.contains('time-slot-cell'))) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      
                      // Calculate which column was clicked based on actual column widths
                      let clickedSlotIndex = -1;
                      let cumulativeWidth = 0;
                      for (let i = 0; i < columnWidths.length; i++) {
                        const columnWidth = columnWidths[i] * scale;
                        if (x >= cumulativeWidth && x < cumulativeWidth + columnWidth) {
                          clickedSlotIndex = i;
                          break;
                        }
                        cumulativeWidth += columnWidth;
                      }
                      
                      if (clickedSlotIndex >= 0 && clickedSlotIndex < timeSlots.length) {
                        const slot = timeSlots[clickedSlotIndex];
                        // Parse time slot to get hour
                        const parseTimeSlot = (slotStr: string): number => {
                          const match = slotStr.match(/(\d+)\s+(AM|PM)/);
                          if (!match) return 0;
                          let hour = parseInt(match[1]);
                          const period = match[2];
                          if (period === 'PM' && hour !== 12) hour += 12;
                          if (period === 'AM' && hour === 12) hour = 0;
                          return hour;
                        };
                        
                        const clickedHour = parseTimeSlot(slot);
                        const clickedDate = new Date(date);
                        clickedDate.setHours(clickedHour, 0, 0, 0);
                        const endDate = new Date(clickedDate);
                        endDate.setHours(clickedHour + 1, 0, 0, 0);
                        
                        onResourceSelect(resource);
                        onOpenModal({
                          resourceId: resource.id,
                          startTime: clickedDate.toISOString(),
                          endTime: endDate.toISOString()
                        });
                      }
                    }
                  }}
                >
                {hoveredResourceId === resource.id && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: 'rgba(226, 226, 221, 0.08)', zIndex: 1 }}
                  />
                )}
                <div className="flex relative h-full flex-shrink-0" style={{ minWidth: `${totalColumnWidth}px`, width: `${totalColumnWidth}px` }}>
                  {/* Time slot columns */}
                  {timeSlots.map((slot, index) => {
                    const hour = index; // hour is 0-23 (0 = 12 AM, 23 = 11 PM)
                    const isWorkingHour = isWithinWorkingHours(hour);
                    const isHovered = hoveredSlot?.resourceId === resource.id && hoveredSlot?.slotIndex === index;
                    return (
                      <div 
                        key={slot} 
                        className="time-slot-cell flex-shrink-0 h-full cursor-pointer transition-colors"
                        style={{ 
                          width: `${columnWidths[index] * scale}px`,
                          borderRight: '1px solid #F0F0EE',
                          backgroundColor: isHovered ? '#F3F4F6' : (isWorkingHour ? 'white' : '#FAFAFB')
                        }}
                        onMouseEnter={() => setHoveredSlot({ resourceId: resource.id, slotIndex: index })}
                        onMouseLeave={() => setHoveredSlot(null)}
                      />
                    );
                  })}
                  
                  {/* Draft event (dotted card) */}
                  {draftEvent && draftEvent.resourceId === resource.id && (() => {
                    const { left, width } = getEventPosition({
                      start: draftEvent.startTime,
                      end: draftEvent.endTime
                    });
                    
                    return (
                      <DraftEventCard
                        key="draft-event"
                        draftEvent={draftEvent}
                        left={left}
                        width={width}
                        onDraftEventUpdate={onDraftEventUpdate}
                        date={date}
                        columnWidths={columnWidths}
                        scale={scale}
                      />
                    );
                  })()}
                  
                  {/* Event blocks positioned absolutely */}
                  {resourceEvents.filter(event => event && event.start && event.end).map((event, index) => {
                    const { left, width } = getEventPosition(event);
                    // Skip events with 0 width (events without proper start/end times)
                    if (width <= 0) return null;
                    
                    const isBlockEvent = event.eventType === 'block';
                    const customerType = isBlockEvent
                      ? null
                      : (event.customerType
                        ? String(event.customerType).toLowerCase()
                        : getCustomerType(event));
                    const isPending = event.status === 'pending';
                    const isUnpaid = isEventUnpaid(event);
                    const eventColor = isBlockEvent ? 'gray' : (event.color || 'blue');
                    const addressLine = (() => {
                      const city = (event as any).customerCity || (event as any).city;
                      const rawAddress = event.customerAddress || (event as any).address;
                      if (rawAddress && city) return `${rawAddress}, ${city}`;
                      if (rawAddress) {
                        const parts = String(rawAddress)
                          .split(',')
                          .map((part) => part.trim())
                          .filter(Boolean);
                        if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
                        if (parts.length === 1) return parts[0];
                      }
                      if (city) return String(city);
                      return '';
                    })();
                    
                    // Check if event is in the past (end time is before current time, or on a past day)
                    const now = new Date();
                    const todayStart = startOfDay(now);
                    const dateStart = startOfDay(date);
                    const isPastDay = isBefore(dateStart, todayStart);
                    let isPastEvent = isPastDay;
                    if (!isPastDay && event.end) {
                        const eventEndTime = new Date(event.end);
                        isPastEvent = eventEndTime < now;
                    }
                    
                    return renderEventHoverCard(
                      `day-event-${event.id || index}`,
                      event,
                      <div
                        draggable={!isPending}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', event.id);
                          setDraggedEventId(event.id);
                        }}
                        onDragEnd={(e) => {
                          setDraggedEventId(null);
                          setDragOverResourceId(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Ensure event click works even when modal/draft is open
                          onEventClick(event);
                        }}
                        className={`absolute top-2 bottom-2 rounded-xl p-2 transition-all hover:shadow-lg ${
                          isPending 
                            ? 'border-2 border-dashed border-gray-400 bg-white cursor-not-allowed' 
                            : isUnpaid
                              ? 'border-2 border-red-400 bg-transparent cursor-move'
                              : `${eventColors[eventColor]?.bg || eventColors.blue.bg} border-l-4 ${eventColors[eventColor]?.border || eventColors.blue.border} cursor-move`
                        }`}
                        style={{ 
                          left: `${Math.max(0, left)}px`, 
                          width: `${width}px`,
                          minWidth: '100px',
                          pointerEvents: 'auto',
                          zIndex: draggedEventId === event.id ? 25 : 15,
                          opacity: isPastEvent || draggedEventId === event.id ? 0.5 : 1
                        }}
                      >
                        {isUnpaid && !isBlockEvent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 leading-none uppercase mb-1 inline-block">Unpaid</span>
                        )}
                        <div className="flex items-center gap-2 mb-1">
                          {event.employeeName ? (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-gray-300 flex-shrink-0 ${getEmployeeBadgeClass(event.color)}`}>
                              <span className="text-xs font-semibold">
                                {getEmployeeInitials(event.employeeName)}
                              </span>
                            </div>
                          ) : null}
                          <div className="text-base font-semibold text-gray-900 flex-1 truncate">
                            {isBlockEvent ? 'Blocked Time' : (Array.isArray(event.services) ? event.services.join(' + ') : event.services || 'Service')}
                          </div>
                        </div>
                        {formatTimeRange(event) && (
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {formatTimeRange(event)}
                          </div>
                        )}
                        {!isBlockEvent && (
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            {event.vehicleType || 'Vehicle'}
                          </div>
                        )}
                        {!isBlockEvent && event.description && (
                          <div className="text-xs text-gray-600 mb-1">
                            {event.description}
                          </div>
                        )}
                        <div className="mt-auto pt-2">
                          {/* Location Type Tag - Only for Bay resources */}
                          {!isBlockEvent && resource.type === 'bay' && event.locationType && (
                            <div className="mb-1">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-block ${
                                (event.locationType?.toLowerCase() === 'pick up' || event.locationType?.toLowerCase() === 'pickup')
                                  ? 'bg-blue-500 text-white'
                                  : (event.locationType?.toLowerCase() === 'drop off' || event.locationType?.toLowerCase() === 'dropoff')
                                  ? 'bg-pink-500 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {event.locationType?.toLowerCase() === 'pickup' ? 'Pick Up' : 
                                 event.locationType?.toLowerCase() === 'dropoff' ? 'Drop Off' :
                                 event.locationType?.toLowerCase() === 'pick up' ? 'Pick Up' :
                                 event.locationType?.toLowerCase() === 'drop off' ? 'Drop Off' :
                                 event.locationType}
                              </span>
                            </div>
                          )}
                          {!isBlockEvent && !isPending && customerType === 'new' && (
                            <div className="mb-1">
                              <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                New customer
                              </span>
                            </div>
                          )}
                          {!isBlockEvent && !isPending && customerType === 'returning' && (
                            <div className="mb-1">
                              <span className="text-xs font-semibold bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">
                                Repeat customer
                              </span>
                            </div>
                          )}
                          {!isBlockEvent && (event.customerName || event.customerPhone) && (
                            <div className="flex flex-col">
                              <div className="text-xs font-semibold text-gray-600">
                                {event.customerName || 'Customer'}
                              </div>
                              {event.customerPhone && (
                                <div className="text-xs text-gray-600">
                                  {formatPhoneDisplay(event.customerPhone)}
                                </div>
                              )}
                            </div>
                          )}
                          {!isBlockEvent && addressLine && (
                            <div className="text-xs font-semibold text-gray-500">
                              {addressLine}
                            </div>
                          )}
                        </div>
                        {isPending && (
                          <div className="absolute top-1 right-1">
                            <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1 rounded">
                              Pending
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        </div>
        </div>
      </div>
    </div>
  );
};
// #endregion

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | number>('day');
  const [numberOfDays, setNumberOfDays] = useState<number | null>(7); // For custom day views (2-7), preset to 7 for week view
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
  const [isDaysSubmenuOpen, setIsDaysSubmenuOpen] = useState(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scrollToTime, setScrollToTime] = useState<number | null>(null); // Hour (0-23) to scroll to after event creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{ id: string; name: string; type: 'bay' | 'van' } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [draftEvent, setDraftEvent] = useState<{ resourceId: string; startTime: string; endTime: string; date?: Date } | null>(null);
  const [pendingDraftEvent, setPendingDraftEvent] = useState<{ resourceId: string; startTime: string; endTime: string; date?: Date } | null>(null);

  const today = new Date();
  const [events, setEvents] = useState([
    { date: addDays(today, 1), title: 'Team Sync', color: 'blue' },
    { date: addDays(today, 2), title: 'Creative Brainstorming Session', color: 'blue' },
    { date: today, title: 'Interview with John', color: 'green' },
    { date: addDays(today, -5), title: 'Design Review', color: 'orange' },
    { date: addDays(today, 10), title: 'Project Kick-off', color: 'red' },
  ]);
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEventData, setSelectedEventData] = useState<any>(null);
  const optimisticCustomerRemovalRef = useRef<string | null>(null); // Track event ID with optimistic customer removal
  const optimisticCustomerUpdateRef = useRef<string | null>(null); // Track event ID with optimistic customer update
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isEditFormDirty, setIsEditFormDirty] = useState(false);
  const [bottomSheetState, setBottomSheetState] = useState<'hidden' | 'minimized' | 'full'>('hidden');
  const [isBottomSheetMenuOpen, setIsBottomSheetMenuOpen] = useState(false);
  const [createSheetState, setCreateSheetState] = useState<'hidden' | 'minimized' | 'full'>('hidden');
  const [createSheetDragY, setCreateSheetDragY] = useState(0);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showEventModalDiscardModal, setShowEventModalDiscardModal] = useState(false);
  const [customerPastJobs, setCustomerPastJobs] = useState<Array<{ id: string; date: string; services: string[]; vehicleModel?: string; employeeName?: string }>>([]);
  const [showCustomerDetailsPopup, setShowCustomerDetailsPopup] = useState(false);
  const [customerPopupPosition, setCustomerPopupPosition] = useState<{ top: number; right: number } | null>(null);
  const eventDetailsCustomerCardRef = useRef<HTMLDivElement>(null);
  const customerDetailsPopupRef = useRef<HTMLDivElement>(null);
  const customerPopupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [resources, setResources] = useState<Array<{ id: string, name: string, type: 'bay' | 'van' }>>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; name: string; color: string; imageUrl?: string }>>([]);
  const [isActionSidebarOpen, setIsActionSidebarOpen] = useState(false);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<any[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [isMobileViewDropdownOpen, setIsMobileViewDropdownOpen] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]); // Array of employee IDs
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerModalInitialName, setNewCustomerModalInitialName] = useState('');
  const [newCustomerData, setNewCustomerData] = useState<{ customerName: string; customerPhone: string; customerEmail?: string; address?: string; customerType?: string } | null>(null);
  const [editingCustomerData, setEditingCustomerData] = useState<{ customerName: string; customerPhone: string; customerAddress?: string; customerType?: string } | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [eventDetailsCustomers, setEventDetailsCustomers] = useState<Array<{ id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; services?: string[]; data?: any }>>([]);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const mobileTeamDropdownRef = useRef<HTMLDivElement>(null);
  const mobileViewDropdownRef = useRef<HTMLDivElement>(null);
  const actionSidebarRef = useRef<HTMLDivElement>(null);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const createSheetRef = useRef<HTMLDivElement>(null);

  const eventEditFormRef = useRef<{ handleCancel: () => void; handleSubmit: () => void } | null>(null);
  const mobileEventEditFormRef = useRef<{ handleCancel: () => void; handleSubmit: () => void } | null>(null);
  const bottomSheetTouchStartRef = useRef<{ y: number; time: number } | null>(null);
  const createSheetTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const createSheetContentTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const bottomSheetMenuRef = useRef<HTMLDivElement>(null);
  const eventTapRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const session = useSession();
  const detailerId = session.data?.user?.id;
  const isDev = process.env.NODE_ENV !== "production";
  const lastAuthGateLogRef = useRef<string | null>(null);
  const [teamEmployees, setTeamEmployees] = useState<Array<{ id: string; name: string; imageUrl?: string; email?: string; phone?: string }>>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  
  const [eventVehicles, setEventVehicles] = useState<Array<{ id: string; model: string }>>([]);
  const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([]);
  const [availableBundles, setAvailableBundles] = useState<Array<{ id: string; name: string; description?: string; price?: number; services?: Array<{ service: { id: string; name: string } }> }>>([]);
  const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; type: 'service' | 'bundle' }>>([]);
  const [businessHours, setBusinessHours] = useState<any>(null);
  const [bottomSheetDragY, setBottomSheetDragY] = useState(0);
  const bottomSheetIgnoreClickRef = useRef(false);
  const createSheetIgnoreClickRef = useRef(false);
  const [mobileDraftSelection, setMobileDraftSelection] = useState<{ resourceId: string; startMinutes: number; durationMinutes: number } | null>(null);
  const draftResizeRef = useRef<{ handle: 'top' | 'bottom'; startY: number; startMinutes: number; durationMinutes: number; resourceId: string } | null>(null);
  const draftResizeBodyStyleRef = useRef<{ overflow: string; touchAction: string } | null>(null);
  const [isDraftResizing, setIsDraftResizing] = useState(false);
  const [deletedEventToast, setDeletedEventToast] = useState<{ isOpen: boolean; isActive: boolean; eventName: string } | null>(null);
  const deletedEventRef = useRef<any>(null);
  const deleteToastShowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteToastHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deleteToastCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const getPhoneHref = (phone?: string) => (phone || '').replace(/[^\d+]/g, '');

  const closeBottomSheet = (options?: { resetEditFormData?: boolean }) => {
    setBottomSheetState('hidden');
    setIsBottomSheetMenuOpen(false);
    setBottomSheetDragY(0);
    setTimeout(() => {
      setSelectedEventData(null);
      setSelectedEvent(null);
      setIsActionSidebarOpen(false);
      setIsEditingEvent(false);
      setIsEditFormDirty(false);
      if (options?.resetEditFormData) {
        setEditFormData(null);
      }
    }, 300);
  };

  const requestCloseBottomSheet = () => {
    if (isEditFormDirty) {
      setShowDiscardModal(true);
      return;
    }
    closeBottomSheet();
  };

  const minimizeBottomSheet = () => {
    setBottomSheetDragY(0);
    setIsBottomSheetMenuOpen(false);
    setBottomSheetState('minimized');
  };

  const closeCreateSheet = () => {
    setCreateSheetState('hidden');
    setCreateSheetDragY(0);
    setIsModalOpen(false);
    setSelectedResource(null);
    setDraftEvent(null);
    setNewCustomerData(null);
    setMobileDraftSelection(null);
  };

  const minimizeCreateSheet = () => {
    setCreateSheetDragY(0);
    setCreateSheetState('minimized');
  };
  
  // Filter bookings by selected technicians
  const filteredBookings = useMemo(() => {
    if (selectedTechnicians.length === 0) {
      return bookings;
    }
    return bookings.filter((event: any) => {
      if (!event) return false;
      
      // Check if event has employeeId that matches selected technicians
      if (event.employeeId && selectedTechnicians.includes(event.employeeId)) {
        return true;
      }
      
      // Check if event has employeeName that matches selected technicians
      if (event.employeeName) {
        // Find employee by name in the teamEmployees list (case-insensitive match)
        const employee = teamEmployees.find((emp: any) => 
          emp.name && event.employeeName && 
          emp.name.toLowerCase().trim() === event.employeeName.toLowerCase().trim()
        );
        if (employee && selectedTechnicians.includes(employee.id)) {
          return true;
        }
      }
      
      // Also check for assignedTo field (alternative field name)
      if (event.assignedTo) {
        if (selectedTechnicians.includes(event.assignedTo)) {
          return true;
        }
        // Try to match by name if assignedTo is a name
        const employee = teamEmployees.find((emp: any) => 
          emp.name && event.assignedTo && 
          emp.name.toLowerCase().trim() === event.assignedTo.toLowerCase().trim()
        );
        if (employee && selectedTechnicians.includes(employee.id)) {
          return true;
        }
      }
      
      // Also check for technicianId field (alternative field name)
      if (event.technicianId && selectedTechnicians.includes(event.technicianId)) {
        return true;
      }
      
      return false;
    });
  }, [bookings, selectedTechnicians, teamEmployees]);
  
  // Calendar zoom scales - separate for each view (0.5 = smaller, 1.0 = normal, 2.0 = larger)
  const [dayScale, setDayScale] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarDayScale');
      if (saved) return parseFloat(saved);
      // Migration: check for old single scale value
      const oldScale = localStorage.getItem('calendarScale');
      if (oldScale) {
        const oldValue = parseFloat(oldScale);
        // Migrate old value to day and week views (unchanged)
        // For month view, convert: old 200% (2.0) becomes new 100% (1.0)
        localStorage.setItem('calendarDayScale', oldValue.toString());
        localStorage.setItem('calendarWeekScale', oldValue.toString());
        localStorage.setItem('calendarMonthScale', (oldValue / 2.0).toString());
        localStorage.removeItem('calendarScale');
        return oldValue;
      }
      return 1.0;
    }
    return 1.0;
  });
  
  const [weekScale, setWeekScale] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarWeekScale');
      if (saved) return parseFloat(saved);
      // Migration: check for old single scale value
      const oldScale = localStorage.getItem('calendarScale');
      if (oldScale) {
        return parseFloat(oldScale);
      }
      return 1.0;
    }
    return 1.0;
  });
  
  const [monthScale, setMonthScale] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendarMonthScale');
      if (saved) return parseFloat(saved);
      // Migration: check for old single scale value
      const oldScale = localStorage.getItem('calendarScale');
      if (oldScale) {
        const oldValue = parseFloat(oldScale);
        // Convert old scale to new scale: old 200% (2.0) becomes new 100% (1.0)
        // Formula: newValue = oldValue / 2.0 (since we doubled all base values)
        return oldValue / 2.0;
      }
      return 1.0; // Default to 100% (which looks like old 200% due to recalibration)
    }
    return 1.0;
  });
  
  // Get the current scale based on view mode
  const calendarScale = viewMode === 'day' ? dayScale : viewMode === 'week' ? weekScale : monthScale;

  // Ensure numberOfDays is set to 7 when in week view
  useEffect(() => {
    if (viewMode === 'week' && numberOfDays !== 7) {
      setNumberOfDays(7);
    } else if (viewMode !== 'week' && typeof viewMode !== 'number' && numberOfDays !== null) {
      setNumberOfDays(null);
    }
  }, [viewMode, numberOfDays]);
  
  // Set the current scale based on view mode
  const setCalendarScale = (value: number) => {
    if (viewMode === 'day') {
      setDayScale(value);
    } else if (viewMode === 'week') {
      setWeekScale(value);
    } else {
      setMonthScale(value);
    }
  };
  
  // Save scales to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarDayScale', dayScale.toString());
    }
  }, [dayScale]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarWeekScale', weekScale.toString());
    }
  }, [weekScale]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarMonthScale', monthScale.toString());
    }
  }, [monthScale]);
  
  if (isDev) {
    const rawCookie = typeof document !== "undefined" ? document.cookie || "" : "";
    const authGateKey = `${session.status}:${detailerId ?? "no-detailer"}`;
    if (lastAuthGateLogRef.current !== authGateKey) {
      lastAuthGateLogRef.current = authGateKey;
      console.log("[calendar][auth-gate]", {
        status: session.status,
        userId: session.data?.user?.id,
        email: session.data?.user?.email,
        role: (session.data?.user as any)?.role,
        businessName: (session.data?.user as any)?.businessName,
        detailerId,
        cookies: {
          hasDefaultSessionCookie: rawCookie.includes("next-auth.session-token"),
          hasDetailerSessionCookie: rawCookie.includes("next-auth.detailer.session-token"),
          rawLength: rawCookie.length,
        },
        note: "httpOnly auth cookies are not visible via document.cookie",
      });
    }
  }
  
  console.log('Calendar component render - bookings state:', bookings.length, bookings.map(b => ({ title: b.title, date: b.date, allDay: b.allDay, color: b.color })));

  // Monitor bookings state changes and update today's events
  useEffect(() => {
    console.log('Bookings state changed:', bookings.length, 'events');
    if (bookings.length > 0) {
      console.log('Sample booking:', bookings[0]);
    }
    
    // Filter today's events
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayEventsList = bookings.filter((e: any) => {
      let eventDate;
      eventDate = getEventDateString(e);
      return eventDate === todayStr;
    });
    setTodayEvents(todayEventsList);
  }, [bookings]);

  // Fetch employees
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!detailerId) return;
      setIsLoadingEmployees(true);
      try {
        const response = await fetch('/api/detailer/employees');
        if (response.ok) {
          const data = await response.json();
          setTeamEmployees(data.employees || []);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [detailerId]);

  // Fetch business hours
  useEffect(() => {
    if (!detailerId) return;
    fetch('/api/detailer/profile')
      .then(res => res.json())
      .then(data => {
        const businessHours = data.businessHours || data.profile?.businessHours;
        if (businessHours) {
          setBusinessHours(businessHours);
        }
      })
      .catch(err => console.error('Error fetching business hours:', err));
  }, [detailerId]);

  // Mobile detection and current time updates
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(timeInterval);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);


  // Swipe gesture handlers for mobile - swipe down from week to month, swipe up from month to week
  useEffect(() => {
    if (!isMobile || typeof viewMode === 'number') return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only track if starting from the top area (week header/navigation) or if in week/month view
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Optional: prevent default scrolling if we detect a clear vertical swipe
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      
      // If it's a clear vertical swipe (more vertical than horizontal), allow it
      // But don't prevent default unless we're sure it's a swipe gesture
      if (Math.abs(deltaY) > 30 && deltaY > deltaX * 2) {
        // This is likely a swipe, but we'll let it pass to not interfere with scrolling
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Check for swipe gesture
      const minSwipeDistance = 80; // Minimum pixels to register as swipe
      const maxSwipeTime = 500; // Maximum time in ms for a swipe

      // Horizontal swipe for day navigation (day view only)
      if (viewMode === 'day' && Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < Math.abs(deltaX) * 0.5 && deltaTime < maxSwipeTime) {
        // Swipe right: previous day
        if (deltaX > 0) {
          e.preventDefault();
          setCurrentDate(subDays(currentDate, 1));
        }
        // Swipe left: next day
        else if (deltaX < 0) {
          e.preventDefault();
          setCurrentDate(addDays(currentDate, 1));
        }
        touchStartRef.current = null;
        return;
      }

      // Vertical swipe for week/month view transitions
      const maxHorizontalMovement = 100; // Maximum horizontal movement allowed for vertical swipes
      if (
        Math.abs(deltaY) > minSwipeDistance &&
        Math.abs(deltaX) < maxHorizontalMovement &&
        deltaTime < maxSwipeTime
      ) {
        // Swipe down: week -> month
        if (deltaY > 0 && viewMode === 'week') {
          e.preventDefault();
          setViewMode('month');
        }
        // Swipe up: month -> week  
        else if (deltaY < 0 && viewMode === 'month') {
          e.preventDefault();
          setViewMode('week');
        }
      }

      touchStartRef.current = null;
    };

    // Add listeners on mobile for view transitions and day navigation
    if (isMobile) {
      const calendarContainer = document.getElementById('calendar-scroll-container') || document.body;
      calendarContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
      calendarContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
      calendarContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        calendarContainer.removeEventListener('touchstart', handleTouchStart);
        calendarContainer.removeEventListener('touchmove', handleTouchMove);
        calendarContainer.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile, viewMode, currentDate]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };

    if (isDatePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    console.log('useEffect triggered - detailerId:', detailerId, 'session status:', session.status, 'currentDate:', currentDate);
    console.log('Session data:', session.data);
    if (detailerId && session.status === 'authenticated') {
      console.log('Calling fetchCalendarEvents...');
      fetchCalendarEvents();
      fetchResources();
      fetchEmployees();
    } else {
      console.log('Not calling fetchCalendarEvents - detailerId:', detailerId, 'session status:', session.status);
    }
  }, [detailerId, currentDate, session.status]);

  const fetchResources = async () => {
    if (!detailerId || session.status !== 'authenticated') {
      return;
    }
    
    try {
      setIsLoadingResources(true);
      const response = await fetch('/api/detailer/resources');
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setResources([]);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const fetchEmployees = async () => {
    if (!detailerId || session.status !== 'authenticated') {
      return;
    }
    
    try {
      const response = await fetch('/api/detailer/employees');
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      setAllEmployees(data.employees || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setAllEmployees([]);
    }
  };

  // Fetch past jobs when event data is selected and has customer info
  useEffect(() => {
    const fetchCustomerPastJobs = async (customerPhone: string) => {
      if (!customerPhone) return [];
      
      try {
        // Fetch calendar events which include both events and bookings with employee info
        const eventsResponse = await fetch('/api/detailer/calendar-events');
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          const allEvents = eventsData.events || [];
          
          // Filter events for this customer and get completed/confirmed ones
          const customerEvents = allEvents.filter((event: any) => 
            event.customerPhone === customerPhone && 
            (event.status === 'completed' || event.status === 'confirmed')
          );
          
          // Map to past jobs format
          return customerEvents.map((event: any) => ({
            id: event.id,
            date: event.date || event.scheduledDate || event.start || event.createdAt,
            services: Array.isArray(event.services) ? event.services : (event.services ? [event.services] : []),
            vehicleModel: event.vehicleType || event.vehicleModel,
            employeeName: event.employeeName || (event.employeeId ? allEmployees.find(e => e.id === event.employeeId)?.name : undefined)
          }));
        }
      } catch (error) {
        console.error('Error fetching customer past jobs:', error);
      }
      return [];
    };

    if (selectedEventData?.customerPhone) {
      fetchCustomerPastJobs(selectedEventData.customerPhone).then(jobs => {
        setCustomerPastJobs(jobs);
      });
    } else {
      setCustomerPastJobs([]);
    }
  }, [selectedEventData?.customerPhone, allEmployees]);

  // Fetch customers for Event Details panel when it opens or when customer is removed
  useEffect(() => {
    if (isActionSidebarOpen && selectedEventData && !isEditingEvent) {
      // Fetch customers when Event Details panel is open
      fetch('/api/detailer/customers')
        .then(res => res.json())
        .then(data => {
          if (data.customers) {
            setEventDetailsCustomers(data.customers);
          }
        })
        .catch(err => console.error('Error fetching customers:', err));
    }
  }, [isActionSidebarOpen, selectedEventData, isEditingEvent]);

  // Handle customer selection in Event Details panel
  const handleEventDetailsCustomerSelect = async (customer: { id: string; customerName?: string; customerPhone: string; customerEmail?: string; address?: string; locationType?: string; customerType?: string; vehicleModel?: string; services?: string[]; data?: any }) => {
    if (!selectedEventData || !selectedEventData.id) return;

    const eventId = selectedEventData.id;

    try {
      const response = await fetch(`/api/detailer/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.customerName || null,
          customerPhone: customer.customerPhone,
          customerAddress: customer.address || null
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Customer update response:', responseData);
        
        // Clear optimistic removal ref since we're adding a customer
        optimisticCustomerRemovalRef.current = null;
        
        // Track optimistic customer update to prevent fetchCalendarEvents from overwriting
        optimisticCustomerUpdateRef.current = eventId;
        
        // Clear search
        setEventDetailsCustomerSearch('');
        setShowEventDetailsCustomerSuggestions(false);
        
        // Use the server response to update state - this ensures we have the exact data the server saved
        if (responseData.event) {
          const serverEvent = responseData.event;
          console.log('Server event customer data:', {
            customerName: serverEvent.customerName,
            customerPhone: serverEvent.customerPhone,
            customerAddress: serverEvent.customerAddress
          });
          
          const updatedEventData = {
            ...selectedEventData,
            customerName: serverEvent.customerName || null,
            customerPhone: serverEvent.customerPhone || null,
            customerAddress: serverEvent.customerAddress || null
          };
          setSelectedEventData(updatedEventData);
          
          // Also update the bookings state so the calendar card reflects the change immediately
          setBookings((prevBookings) =>
            prevBookings.map((event: any) =>
              event.id === eventId
                ? {
                    ...event,
                    customerName: serverEvent.customerName || null,
                    customerPhone: serverEvent.customerPhone || null,
                    customerAddress: serverEvent.customerAddress || null
                  }
                : event
            )
          );
        } else {
          console.error('No event in response:', responseData);
        }
        
        // Clear the optimistic update ref after a delay to allow normal syncing to resume
        // We don't need to call fetchCalendarEvents here since we've already updated state from the API response
        // If something else triggers fetchCalendarEvents, the ref will prevent it from overwriting our state
        setTimeout(() => {
          if (optimisticCustomerUpdateRef.current === eventId) {
            optimisticCustomerUpdateRef.current = null;
          }
        }, 3000);
      } else {
        const error = await response.json();
        console.error('Failed to update customer:', error);
        console.error('Response status:', response.status);
        // Revert optimistic update on error
        fetchCalendarEvents().catch(err => {
          console.error('Failed to revert optimistic update:', err);
        });
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      // Revert optimistic update on error
      fetchCalendarEvents().catch(err => {
        console.error('Failed to revert optimistic update:', err);
      });
    }
  };

  // Close team dropdown when clicking outside (desktop and mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedOnDesktopDropdown = teamDropdownRef.current?.contains(target);
      const clickedOnMobileDropdown = mobileTeamDropdownRef.current?.contains(target);
      const clickedOnFilterButton = (target as Element)?.closest('button[aria-label="Filter employees"]');
      
      // Close if clicked outside both dropdowns and not on the filter button
      if (isTeamDropdownOpen && !clickedOnDesktopDropdown && !clickedOnMobileDropdown && !clickedOnFilterButton) {
        setIsTeamDropdownOpen(false);
      }
    };

    const handleScroll = () => {
    if (isTeamDropdownOpen) {
        setIsTeamDropdownOpen(false);
      }
    };

    if (isTeamDropdownOpen) {
      // Use a small delay to avoid immediate closure when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('touchstart', handleClickOutside, true);
        window.addEventListener('scroll', handleScroll, true);
      }, 100);

    return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('touchstart', handleClickOutside, true);
        window.removeEventListener('scroll', handleScroll, true);
    };
    }
  }, [isTeamDropdownOpen]);

  // Close action sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close sidebar if discard modal is open or if we're editing with dirty changes
      if (showDiscardModal || (isEditingEvent && isEditFormDirty)) {
        return;
      }
      if (actionSidebarRef.current && !actionSidebarRef.current.contains(event.target as Node)) {
        setIsActionSidebarOpen(false);
        setSelectedEventData(null);
        setSelectedEvent(null);
        setShowCustomerDetailsPopup(false); // Close customer popup when closing sidebar
        setSelectedDay(null);
        setSelectedDayEvents([]);
      }
    };

    if (isActionSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionSidebarOpen, showDiscardModal, isEditingEvent, isEditFormDirty]);

  // Hide hamburger menu when action panel is open
  useEffect(() => {
    if (isActionSidebarOpen) {
      document.body.classList.add('action-panel-open');
    } else {
      document.body.classList.remove('action-panel-open');
    }
    return () => {
      document.body.classList.remove('action-panel-open');
    };
  }, [isActionSidebarOpen]);

  // Hide hamburger menu when Create Event modal is open
  useEffect(() => {
    if (isModalOpen && !isMobile) {
      document.body.classList.add('event-modal-open');
    } else {
      document.body.classList.remove('event-modal-open');
    }
    return () => {
      document.body.classList.remove('event-modal-open');
    };
  }, [isModalOpen, isMobile]);

  useEffect(() => {
    const shouldLockOverscroll = isMobile && (
      (isEditingEvent && bottomSheetState === 'full' && !!selectedEventData) ||
      (isModalOpen && createSheetState === 'full')
    );
    if (shouldLockOverscroll) {
      document.body.classList.add('bottom-sheet-open');
    } else {
      document.body.classList.remove('bottom-sheet-open');
    }
    return () => {
      document.body.classList.remove('bottom-sheet-open');
    };
  }, [isMobile, isEditingEvent, bottomSheetState, selectedEventData]);

  // Animate bottom sheet slide up/down
  useEffect(() => {
    if (selectedEventData && isMobile && isEditingEvent) {
      // Trigger slide up animation - start in minimized state
      setTimeout(() => {
        setBottomSheetState('minimized');
      }, 10);
    } else {
      // Trigger slide down animation - hide
      setBottomSheetState('hidden');
    }
  }, [selectedEventData, isMobile, isEditingEvent]);

  useEffect(() => {
    if (isModalOpen && isMobile) {
      setTimeout(() => {
        setCreateSheetState('minimized');
      }, 10);
    } else {
      setCreateSheetState('hidden');
      setCreateSheetDragY(0);
    }
  }, [isModalOpen, isMobile]);

  // Close bottom sheet menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bottomSheetMenuRef.current && !bottomSheetMenuRef.current.contains(event.target as Node)) {
        setIsBottomSheetMenuOpen(false);
      }
    };

    if (isBottomSheetMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBottomSheetMenuOpen]);

  // Close view dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
        setIsDaysSubmenuOpen(false);
      }
    };

    if (isViewDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isViewDropdownOpen]);

  // Close mobile view dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedOnDropdown = mobileViewDropdownRef.current?.contains(target);
      const clickedOnButton = (target as Element)?.closest('button[aria-label="Select view"]');
      
      if (isMobileViewDropdownOpen && !clickedOnDropdown && !clickedOnButton) {
        setIsMobileViewDropdownOpen(false);
      }
    };

    const handleScroll = () => {
      if (isMobileViewDropdownOpen) {
        setIsMobileViewDropdownOpen(false);
      }
    };

    if (isMobileViewDropdownOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
        document.addEventListener('touchstart', handleClickOutside, true);
        window.addEventListener('scroll', handleScroll, true);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('touchstart', handleClickOutside, true);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isMobileViewDropdownOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (customerPopupTimeoutRef.current) {
        clearTimeout(customerPopupTimeoutRef.current);
      }
    };
  }, []);

  // Fetch services and bundles when event is selected
  useEffect(() => {
    if (selectedEventData) {
      fetch('/api/detailer/services')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAvailableServices(data);
          }
        })
        .catch(err => console.error('Error fetching services:', err));
      
      fetch('/api/detailer/bundles')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAvailableBundles(data);
          }
        })
        .catch(err => console.error('Error fetching bundles:', err));
    }
  }, [selectedEventData]);

  // Show loading state while session is loading (AFTER all hooks)
  if (session.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading calendar...</div>
      </div>
    );
  }
  
  // Show error state if not authenticated (AFTER all hooks)
  if (session.status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Please log in to view your calendar.</div>
      </div>
    );
  }

  // Authenticated but missing required detailer context
  if (session.status === "authenticated" && !detailerId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-700">
          Complete setup to access your calendar.{" "}
          <Link href="/detailer-dashboard/profile" className="text-green-600 underline">
            Go to profile setup
          </Link>
        </div>
      </div>
    );
  }

  const fetchCalendarEvents = async () => {
    console.log('fetchCalendarEvents called - detailerId:', detailerId, 'session status:', session.status);
    if (!detailerId || session.status !== 'authenticated') {
      console.log('fetchCalendarEvents early return - detailerId:', detailerId, 'session status:', session.status);
      return;
    }
    
    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    try {
      setIsLoadingEvents(true);
      console.log('Fetching calendar events for month:', monthStr);
      
      // Fetch all events from the calendar-events API (includes both local and Google events)
      const response = await fetch(`/api/detailer/calendar-events?month=${monthStr}`);
      console.log('Calendar events API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Calendar events API response data:', data);
      
      const allEvents = data.events || [];
      console.log('Setting bookings state with:', allEvents.length, 'events');
      console.log('Event sources:', allEvents.map((e: any) => ({ title: e.title, source: e.source, color: e.color })));
      console.log('Current month being fetched:', monthStr);
      console.log('Sample events:', allEvents.slice(0, 3));
      
      // If we have an optimistic customer update/removal, preserve it in the bookings array
      setBookings((prevBookings) => {
        const optimisticEventId = optimisticCustomerUpdateRef.current || optimisticCustomerRemovalRef.current;
        if (optimisticEventId) {
          // Find the optimistic update in the previous bookings state
          let optimisticEvent = prevBookings.find((e: any) => e.id === optimisticEventId);
          // If not found in prevBookings, try selectedEventData as fallback
          if (!optimisticEvent && selectedEventData && selectedEventData.id === optimisticEventId) {
            optimisticEvent = selectedEventData;
          }
          if (optimisticEvent) {
            // Merge the optimistic event into the server events, preserving the optimistic customer data
            const mergedEvents = allEvents.map((e: any) => 
              e.id === optimisticEventId ? optimisticEvent : e
            );
            console.log('Preserving optimistic update for event:', optimisticEventId);
            return mergedEvents;
          }
        }
        // No optimistic update, use server data
        console.log('About to call setBookings with:', allEvents.length, 'events');
        return allEvents;
      });
      
      // If we have a selected event, sync selectedEventData with fresh data from server
      // BUT skip syncing if we have an optimistic customer update/removal in progress
      if (selectedEventData && selectedEventData.id) {
        // Don't sync if we have an optimistic customer removal or update for this event
        if (!(optimisticCustomerRemovalRef.current === selectedEventData.id || 
              optimisticCustomerUpdateRef.current === selectedEventData.id)) {
          // Only sync if there's no optimistic update in progress
          const updatedEvent = allEvents.find((e: any) => e.id === selectedEventData.id);
          if (updatedEvent) {
            setSelectedEventData(updatedEvent);
          }
        }
      }
      
      // Filter today's events
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayEventsList = allEvents.filter((e: any) => {
        const eventDate = getEventDateString(e);
        return eventDate === todayStr;
      });
      setTodayEvents(todayEventsList);
      
      console.log('setBookings called with:', allEvents.length, 'events');
      
      // Debug: Check if setBookings actually worked
      setTimeout(() => {
        console.log('After setBookings - bookings state should be:', allEvents.length);
      }, 100);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setBookings([]); // Set empty array on error
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleAddEvent = (newEvent: any) => {
    // Navigate to the date of the newly created event
    let eventDate: Date | null = null;
    
    // Prefer using the start string which contains the full datetime
    if (newEvent.start) {
      try {
        // Parse the start string (format: "2025-12-26T12:00")
        // Extract just the date part to avoid timezone conversion issues
        const startStr = String(newEvent.start);
        const dateMatch = startStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          // Create date in local timezone to avoid UTC conversion
          const year = parseInt(dateMatch[1], 10);
          const month = parseInt(dateMatch[2], 10) - 1; // Month is 0-indexed
          const day = parseInt(dateMatch[3], 10);
          eventDate = new Date(year, month, day);
        }
      } catch (e) {
        console.error('Error parsing event start date:', e);
      }
    } else if (newEvent.date) {
      // Fallback to date field if start is not available
      if (newEvent.date instanceof Date) {
        eventDate = newEvent.date;
      } else {
        // Parse date string and create in local timezone
        const dateStr = String(newEvent.date);
        const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1], 10);
          const month = parseInt(dateMatch[2], 10) - 1;
          const day = parseInt(dateMatch[3], 10);
          eventDate = new Date(year, month, day);
        }
      }
    }
    
    if (eventDate && !isNaN(eventDate.getTime())) {
      setCurrentDate(eventDate);
    }
    
    // Extract hour from event start time to scroll to that time slot
    if (newEvent.start) {
      try {
        const startStr = String(newEvent.start);
        // Parse the time portion from the start string (format: "2025-12-26T12:00")
        const timeMatch = startStr.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          setScrollToTime(hour);
          // Clear scrollToTime after a delay to allow the scroll to happen
          setTimeout(() => {
            setScrollToTime(null);
          }, 1000);
        }
      } catch (e) {
        console.error('Error parsing event start time for scroll:', e);
      }
    }
    
    // Refresh the calendar events to include the new event from the database
    setTimeout(() => {
      fetchCalendarEvents();
    }, 500); // Small delay to ensure database write is complete
  };

  const handleEventDrop = async (eventId: string, newResourceId: string) => {
    // Optimistically update the local state immediately for instant UI feedback
    setBookings((prevBookings) => 
      prevBookings.map((event: any) => 
        event.id === eventId 
          ? { ...event, resourceId: newResourceId }
          : event
      )
    );

    // Update API in the background - don't await to avoid blocking
    try {
      const response = await fetch(`/api/detailer/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId: newResourceId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Revert optimistic update on error
        fetchCalendarEvents().catch(err => {
          console.error('Failed to revert optimistic update:', err);
        });
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      // Success - no need to refresh since we already optimistically updated
      // The optimistic update is sufficient for smooth UX
    } catch (error) {
      console.error('Error updating event resource:', error);
      // Revert optimistic update on error by refreshing from server
      fetchCalendarEvents().catch(err => {
        console.error('Failed to revert optimistic update:', err);
      });
      throw error;
    }
  };

  const handleEventClick = (event: any) => {
    console.log('Event clicked:', {
      id: event.id,
      title: event.title,
      date: event.date,
      start: event.start,
      allDay: event.allDay,
      rawEvent: event
    });
    
    // If we're creating a new event (modal open or draft exists), close it first
    // The modal's own close handler will check for unsaved changes and show discard modal if needed
    // We'll use a flag to indicate we want to switch to an existing event after closing
    if (isModalOpen) {
      // Trigger the modal's close handler which will check for dirty state
      // We need to close the modal, but the modal should handle the discard check
      // Since we can't directly call the modal's handleClose, we'll close it and let the modal handle it
      // Actually, we should close the modal first, then open the event
      // The modal's onClose will be called, which currently just closes it
      // We need to update the modal's onClose to check for dirty state
      setIsModalOpen(false);
      setDraftEvent(null);
      setSelectedResource(null);
    } else if (draftEvent) {
      // If draft exists but modal not open, just clear it
      setDraftEvent(null);
    }
    
    setSelectedEvent(event.id);
    setSelectedEventData(event);
    // Clear optimistic customer update refs when selecting a new event
    optimisticCustomerRemovalRef.current = null;
    optimisticCustomerUpdateRef.current = null;
    // On mobile: always open in edit mode in bottom sheet. On desktop: open action sidebar in view mode
    if (isMobile) {
      setIsEditingEvent(true); // Mobile: always in edit mode
      setIsActionSidebarOpen(false); // Don't open desktop sidebar on mobile
      setBottomSheetState('minimized'); // Start minimized on mobile
    } else {
      setIsActionSidebarOpen(true); // Desktop: open action sidebar
      setIsEditingEvent(false); // Desktop: start in view mode
    }
    setEventDetailsOpen(false); // Close modal if it was open
    setIsEditFormDirty(false); // Reset dirty state
    setShowCustomerDetailsPopup(false); // Close customer popup when selecting a new event
    
    // Initialize vehicles from event data
    let vehicleList: Array<{ id: string; model: string }> = [];
    if (event.vehicles && Array.isArray(event.vehicles)) {
      vehicleList = event.vehicles.map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v }));
    } else if (event.vehicleType || event.vehicleModel) {
      const vehicleStr = event.vehicleType || event.vehicleModel || '';
      if (vehicleStr.includes(',')) {
        vehicleList = vehicleStr.split(',').map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v.trim() })).filter((v: { id: string; model: string }) => v.model);
      } else if (vehicleStr) {
        vehicleList = [{ id: 'vehicle-0', model: vehicleStr }];
      }
    }
    setEventVehicles(vehicleList);
    
    // Initialize selected services from event data
    if (event.services) {
      // Fetch services and bundles first, then match
      Promise.all([
        fetch('/api/detailer/services').then(res => res.json()).catch(() => []),
        fetch('/api/detailer/bundles').then(res => res.json()).catch(() => [])
      ]).then(([servicesData, bundlesData]) => {
        const services = Array.isArray(servicesData) ? servicesData : [];
        const bundles = Array.isArray(bundlesData) ? bundlesData : [];
        setAvailableServices(services);
        setAvailableBundles(bundles);
        
        // Match event services to available services/bundles
        const eventServicesList = Array.isArray(event.services) ? event.services : [event.services];
        const matchedItems: Array<{ id: string; name: string; type: 'service' | 'bundle' }> = eventServicesList
          .map((serviceName: string) => {
            const service = services.find((s: any) => s.name === serviceName);
            if (service) {
              return { id: service.id, name: service.name, type: 'service' as const };
            }
            const bundle = bundles.find((b: any) => b.name === serviceName);
            if (bundle) {
              return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
            }
            // If not found, create a placeholder
            return { id: `temp-${Date.now()}-${Math.random()}`, name: serviceName, type: 'service' as const };
          })
          .filter((s: { id: string; name: string; type: 'service' | 'bundle' } | null): s is { id: string; name: string; type: 'service' | 'bundle' } => s !== null);
        setSelectedServices(matchedItems);
      });
    } else {
      setSelectedServices([]);
    }
  };

  const getCreateDraftSummary = () => {
    if (!draftEvent) return null;
    const start = new Date(draftEvent.startTime);
    const end = new Date(draftEvent.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const resource = resources.find(r => r.id === draftEvent.resourceId);
    return {
      time: `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`,
      resource: resource ? resource.name : ''
    };
  };

  const handleAddVehicle = async (vehicleModel: string) => {
    const newVehicle = { id: `vehicle-${Date.now()}`, model: vehicleModel };
    const updatedVehicles = [...eventVehicles, newVehicle];
    setEventVehicles(updatedVehicles);
    setNewVehicleModel('');
    setShowAddVehicleModal(false);
    
    // Update event
    if (selectedEventData?.id) {
      try {
        const vehicleModels = updatedVehicles.map(v => v.model);
        const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            vehicleModel: vehicleModels.join(', '),
            vehicles: vehicleModels
          }),
        });
        
        if (response.ok) {
          const updatedData = await response.json();
          setSelectedEventData({ ...selectedEventData, ...updatedData });
          fetchCalendarEvents();
        }
      } catch (error) {
        console.error('Error updating vehicles:', error);
      }
    }
  };

  const handleCloseEventDetails = () => {
    setEventDetailsOpen(false);
    setSelectedEvent(null);
    setSelectedEventData(null);
    setCustomerPastJobs([]);
    setIsActionSidebarOpen(false);
  };

  const clearDeleteToastTimeouts = () => {
    if (deleteToastShowTimeoutRef.current) {
      clearTimeout(deleteToastShowTimeoutRef.current);
      deleteToastShowTimeoutRef.current = null;
    }
    if (deleteToastHideTimeoutRef.current) {
      clearTimeout(deleteToastHideTimeoutRef.current);
      deleteToastHideTimeoutRef.current = null;
    }
    if (deleteToastCloseTimeoutRef.current) {
      clearTimeout(deleteToastCloseTimeoutRef.current);
      deleteToastCloseTimeoutRef.current = null;
    }
  };

  const showDeletedEventToast = (eventData: any) => {
    clearDeleteToastTimeouts();
    deletedEventRef.current = eventData;
    const eventName = eventData?.title || eventData?.eventName || 'Event';
    setDeletedEventToast({ isOpen: true, isActive: false, eventName });

    deleteToastShowTimeoutRef.current = setTimeout(() => {
      setDeletedEventToast((prev) => (prev ? { ...prev, isActive: true } : prev));
    }, 100);

    deleteToastHideTimeoutRef.current = setTimeout(() => {
      setDeletedEventToast((prev) => (prev ? { ...prev, isActive: false } : prev));
      deleteToastCloseTimeoutRef.current = setTimeout(() => {
        setDeletedEventToast(null);
        deletedEventRef.current = null;
      }, 300);
    }, 5100);
  };

  const dismissDeletedEventToast = () => {
    clearDeleteToastTimeouts();
    setDeletedEventToast((prev) => (prev ? { ...prev, isActive: false } : prev));
    deleteToastCloseTimeoutRef.current = setTimeout(() => {
      setDeletedEventToast(null);
      deletedEventRef.current = null;
    }, 200);
  };

  const handleUndoDelete = async () => {
    const eventData = deletedEventRef.current;
    if (!eventData) return;
    clearDeleteToastTimeouts();

    const normalizeDateValue = (value: any) => {
      if (!value) return undefined;
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') return value;
      return undefined;
    };

    const payload = {
      title: eventData.title || eventData.eventName || 'Untitled Event',
      employeeId: eventData.employeeId || undefined,
      startDate: normalizeDateValue(eventData.startDate || eventData.start || eventData.startTime),
      endDate: normalizeDateValue(eventData.endDate || eventData.end || eventData.endTime),
      isAllDay: !!(eventData.allDay || eventData.isAllDay),
      time: eventData.time || undefined,
      startTime: eventData.startTime || undefined,
      endTime: eventData.endTime || undefined,
      description: eventData.description || '',
      customerNotes: eventData.customerNotes || undefined,
      paid: eventData.paid === true,
      resourceId: eventData.resourceId || undefined,
      customerName: eventData.customerName || undefined,
      customerPhone: eventData.customerPhone || undefined,
      customerEmail: eventData.customerEmail || undefined,
      customerAddress: eventData.customerAddress || undefined,
      locationType: eventData.locationType || undefined,
      customerType: eventData.customerType || undefined,
      vehicleModel: eventData.vehicleModel || undefined,
      vehicles: eventData.vehicles || undefined,
      services: eventData.services || undefined
    };

    try {
      const response = await fetch('/api/detailer/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const restoredEvent = {
          ...eventData,
          ...(result.event || {}),
          id: result.event?.id || result.id || eventData.id
        };
        fetchCalendarEvents();
        setSelectedEvent(restoredEvent.id);
        setSelectedEventData(restoredEvent);
        setEventDetailsOpen(false);
        if (isMobile) {
          setIsEditingEvent(true);
          setIsActionSidebarOpen(false);
          setBottomSheetState('minimized');
        } else {
          setIsActionSidebarOpen(true);
          setIsEditingEvent(false);
        }
      } else {
        const error = await response.json();
        console.error('Failed to undo delete:', error.error || error);
      }
    } catch (error) {
      console.error('Error undoing delete:', error);
    } finally {
      dismissDeletedEventToast();
    }
  };

  const handleDeleteEvent = async (eventData?: any) => {
    const targetEvent = eventData || selectedEventData;
    if (!targetEvent?.id) return;

    try {
      const response = await fetch(`/api/detailer/events/${targetEvent.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCalendarEvents();
        closeBottomSheet();
        closeCreateSheet();
        handleCloseEventDetails();
        showDeletedEventToast({ ...targetEvent });
      } else {
        const error = await response.json();
        console.error('Failed to delete event:', error.error);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const deleteToastPortal = deletedEventToast?.isOpen && isMounted
    ? createPortal(
        <div
          data-delete-toast
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10050] pointer-events-none"
          style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
        >
          <div
            className={`pointer-events-auto w-[370px] max-w-[calc(100vw-24px)] bg-white rounded-2xl border border-gray-200 shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all duration-300 ${
              deletedEventToast.isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
            style={{ padding: '12px' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100">
                  <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                  </svg>
                </span>
                <span>Event deleted</span>
              </div>
              <button
                onClick={dismissDeletedEventToast}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-700">{deletedEventToast.eventName}</div>
              <button
                onClick={handleUndoDelete}
                className="px-3 py-1.5 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Undo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const handlePrev = () => {
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
      else if (typeof viewMode === 'number') setCurrentDate(subDays(currentDate, viewMode));
      else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
      else if (typeof viewMode === 'number') setCurrentDate(addDays(currentDate, viewMode));
      else setCurrentDate(addDays(currentDate, 1));
  };

  const renderHeaderDate = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM, yyyy');
    if (viewMode === 'week') {
        return format(currentDate, 'MMMM, yyyy');
    }
    if (typeof viewMode === 'number') {
        const endDate = addDays(currentDate, viewMode - 1);
        return `${format(currentDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`;
    }
    // Day view: Show day of week, month, and day (e.g., "Wednesday, November 17")
    return format(currentDate, 'EEEE, MMMM d');
  };

  const renderMobileHeaderDate = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM, yyyy');
    if (viewMode === 'week') {
        return format(currentDate, 'MMMM, yyyy');
    }
    if (typeof viewMode === 'number') {
        const endDate = addDays(currentDate, viewMode - 1);
        return `${format(currentDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`;
    }
    // Day view for mobile: Show month and year only (e.g., "January 2025")
    return format(currentDate, 'MMMM yyyy');
  };

  // Mobile calendar view render function
  const renderMobileCalendar = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
    
    // Filter events for the current day (using filteredBookings to respect employee filter)
    const dayEvents = filteredBookings.filter((event: any) => {
      const eventDate = getEventDateString(event);
      return eventDate === format(currentDate, 'yyyy-MM-dd');
    });

    // Get current hour and minute for the time line
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTop = ((currentHour - 6) * 60 + currentMinute) * 2; // 2px per minute, starting from 6 AM

    // Use resources if available, otherwise create default resources
    const displayResources = resources.length > 0 ? resources : [
      { id: 'default-bay-1', name: 'B1', type: 'bay' as const },
      { id: 'default-bay-2', name: 'B2', type: 'bay' as const },
      { id: 'default-van-1', name: 'V1', type: 'van' as const }
    ];

    // Event colors mapping
    const eventColors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-500' },
      green: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-500' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-500' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-500' },
      red: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-500' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-500' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-500' },
    };

    const getEventPosition = (event: any) => {
      let startHour = 6;
      let startMinute = 0;
      let endHour = 7;
      let endMinute = 0;
      
      if (event.start && (typeof event.start === 'string' || event.start instanceof Date)) {
        const eventStart = new Date(event.start);
        startHour = eventStart.getHours();
        startMinute = eventStart.getMinutes();
        
        if (event.end && (typeof event.end === 'string' || event.end instanceof Date)) {
          const eventEnd = new Date(event.end);
          endHour = eventEnd.getHours();
          endMinute = eventEnd.getMinutes();
        } else {
          endHour = startHour + 1;
        }
      } else if (event.time) {
        const [time, period] = event.time.split(' ');
        const [hours, minutes] = time.split(':');
        startHour = parseInt(hours);
        if (period === 'PM' && startHour !== 12) startHour += 12;
        if (period === 'AM' && startHour === 12) startHour = 0;
        startMinute = parseInt(minutes || '0');
        endHour = startHour + 1;
      }

      // Calculate duration in minutes
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const duration = Math.max(endMinutes - startMinutes, minDraftDurationMinutes); // Minimum 30 minutes
      
      const top = ((startHour - 6) * 60 + startMinute) * 2;
      const height = duration * 2;
      
      return { top, height };
    };

    const totalMinutes = hours.length * 60;
    const highlightDurationMinutes = 60;
    const minDraftDurationMinutes = 30;

    const updateDraftEventTimes = (resourceId: string, startMinutes: number, durationMinutes: number) => {
      const startDate = new Date(currentDate);
      startDate.setHours(6 + Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + durationMinutes);
      setDraftEvent({
        resourceId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        date: currentDate
      });
    };

    const handleEmptySlotClick = (
      e: React.MouseEvent<HTMLDivElement>,
      resourceId: string
    ) => {
      if (isEditingEvent || isModalOpen) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetY = e.clientY - rect.top;
      const minutesFromTop = Math.max(0, Math.min(totalMinutes - highlightDurationMinutes, Math.round((offsetY / 2) / 30) * 30));
      const startMinutes = minutesFromTop;

      setMobileDraftSelection({
        resourceId,
        startMinutes,
        durationMinutes: highlightDurationMinutes
      });

      const startDate = new Date(currentDate);
      startDate.setHours(6 + Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + highlightDurationMinutes);

      setSelectedResource(displayResources.find(r => r.id === resourceId) || null);
      setDraftEvent({
        resourceId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        date: currentDate
      });
      setIsModalOpen(true);
    };

    const handleDraftResizeStart = (handle: 'top' | 'bottom') => (e: React.TouchEvent) => {
      if (!mobileDraftSelection) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDraftResizing(true);
      if (!draftResizeBodyStyleRef.current) {
        draftResizeBodyStyleRef.current = {
          overflow: document.body.style.overflow,
          touchAction: document.body.style.touchAction
        };
      }
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      const touch = e.touches[0];
      draftResizeRef.current = {
        handle,
        startY: touch.clientY,
        startMinutes: mobileDraftSelection.startMinutes,
        durationMinutes: mobileDraftSelection.durationMinutes,
        resourceId: mobileDraftSelection.resourceId
      };

      const handleMove = (moveEvent: TouchEvent) => {
        if (!draftResizeRef.current) return;
        moveEvent.preventDefault();
        const moveTouch = moveEvent.touches[0];
        const deltaY = moveTouch.clientY - draftResizeRef.current.startY;
        const deltaMinutes = Math.round(deltaY / 40) * 30;
        const startMinutes = draftResizeRef.current.startMinutes;
        const durationMinutes = draftResizeRef.current.durationMinutes;
        let newStartMinutes = startMinutes;
        let newDurationMinutes = durationMinutes;

        if (draftResizeRef.current.handle === 'top') {
          const maxStart = startMinutes + durationMinutes - minDraftDurationMinutes;
          newStartMinutes = Math.max(0, Math.min(startMinutes + deltaMinutes, maxStart));
          newDurationMinutes = durationMinutes - (newStartMinutes - startMinutes);
        } else {
          const maxDuration = totalMinutes - startMinutes;
          newDurationMinutes = Math.max(minDraftDurationMinutes, Math.min(durationMinutes + deltaMinutes, maxDuration));
        }

        if (
          newStartMinutes !== mobileDraftSelection.startMinutes ||
          newDurationMinutes !== mobileDraftSelection.durationMinutes
        ) {
          setMobileDraftSelection({
            resourceId: draftResizeRef.current.resourceId,
            startMinutes: newStartMinutes,
            durationMinutes: newDurationMinutes
          });
          updateDraftEventTimes(draftResizeRef.current.resourceId, newStartMinutes, newDurationMinutes);
        }
      };

      const handleScrollBlock = (moveEvent: TouchEvent) => {
        moveEvent.preventDefault();
      };

      const handleEnd = () => {
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchmove', handleScrollBlock, true);
        window.removeEventListener('touchend', handleEnd);
        draftResizeRef.current = null;
        setIsDraftResizing(false);
        if (draftResizeBodyStyleRef.current) {
          document.body.style.overflow = draftResizeBodyStyleRef.current.overflow;
          document.body.style.touchAction = draftResizeBodyStyleRef.current.touchAction;
          draftResizeBodyStyleRef.current = null;
        }
      };

      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchmove', handleScrollBlock, { passive: false, capture: true });
      window.addEventListener('touchend', handleEnd);
    };

    const handleDraftResizePointerStart = (handle: 'top' | 'bottom') => (e: React.PointerEvent) => {
      if (!mobileDraftSelection) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDraftResizing(true);
      if (!draftResizeBodyStyleRef.current) {
        draftResizeBodyStyleRef.current = {
          overflow: document.body.style.overflow,
          touchAction: document.body.style.touchAction
        };
      }
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      const target = e.currentTarget as HTMLElement;
      if (target.setPointerCapture) {
        target.setPointerCapture(e.pointerId);
      }
      draftResizeRef.current = {
        handle,
        startY: e.clientY,
        startMinutes: mobileDraftSelection.startMinutes,
        durationMinutes: mobileDraftSelection.durationMinutes,
        resourceId: mobileDraftSelection.resourceId
      };

      const handleMove = (moveEvent: PointerEvent) => {
        if (!draftResizeRef.current) return;
        moveEvent.preventDefault();
        const deltaY = moveEvent.clientY - draftResizeRef.current.startY;
        const deltaMinutes = Math.round(deltaY / 40) * 30;
        const startMinutes = draftResizeRef.current.startMinutes;
        const durationMinutes = draftResizeRef.current.durationMinutes;
        let newStartMinutes = startMinutes;
        let newDurationMinutes = durationMinutes;

        if (draftResizeRef.current.handle === 'top') {
          const maxStart = startMinutes + durationMinutes - minDraftDurationMinutes;
          newStartMinutes = Math.max(0, Math.min(startMinutes + deltaMinutes, maxStart));
          newDurationMinutes = durationMinutes - (newStartMinutes - startMinutes);
        } else {
          const maxDuration = totalMinutes - startMinutes;
          newDurationMinutes = Math.max(minDraftDurationMinutes, Math.min(durationMinutes + deltaMinutes, maxDuration));
        }

        if (
          newStartMinutes !== mobileDraftSelection.startMinutes ||
          newDurationMinutes !== mobileDraftSelection.durationMinutes
        ) {
          setMobileDraftSelection({
            resourceId: draftResizeRef.current.resourceId,
            startMinutes: newStartMinutes,
            durationMinutes: newDurationMinutes
          });
          updateDraftEventTimes(draftResizeRef.current.resourceId, newStartMinutes, newDurationMinutes);
        }
      };

      const handleEnd = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleEnd);
        draftResizeRef.current = null;
        setIsDraftResizing(false);
        if (draftResizeBodyStyleRef.current) {
          document.body.style.overflow = draftResizeBodyStyleRef.current.overflow;
          document.body.style.touchAction = draftResizeBodyStyleRef.current.touchAction;
          draftResizeBodyStyleRef.current = null;
        }
      };

      window.addEventListener('pointermove', handleMove, { passive: false });
      window.addEventListener('pointerup', handleEnd);
    };

    // Touch handlers for day navigation
    const handleMobileTouchStart = (e: React.TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    };

    const handleMobileTouchMove = (e: React.TouchEvent) => {
      if (draftResizeRef.current) {
        e.preventDefault();
        return;
      }
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // If it's a clear horizontal swipe, prevent default to avoid scroll jitter
      if (deltaX > 30 && deltaX > deltaY * 1.5) {
        e.preventDefault();
      }
    };

    const handleMobileTouchEnd = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      const minSwipeDistance = 80;
      const maxSwipeTime = 500;

      // Horizontal swipe for day navigation
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < Math.abs(deltaX) * 0.5 && deltaTime < maxSwipeTime) {
        // Swipe right: previous day
        if (deltaX > 0) {
          setCurrentDate(subDays(currentDate, 1));
        }
        // Swipe left: next day
        else if (deltaX < 0) {
          setCurrentDate(addDays(currentDate, 1));
        }
      }

      touchStartRef.current = null;
    };

    return (
      <div 
        className="absolute inset-0 flex flex-col md:relative md:h-full md:pb-16" 
        style={{ 
          backgroundColor: '#f9f7fa',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          paddingTop: 'max(env(safe-area-inset-top), 0px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 0px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 0px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
          zIndex: 0,
          minHeight: '-webkit-fill-available',
          touchAction: isDraftResizing ? 'none' : 'pan-y',
          overscrollBehavior: isDraftResizing ? 'none' : 'contain'
        }}
        onTouchStart={handleMobileTouchStart}
        onTouchMove={handleMobileTouchMove}
        onTouchEnd={handleMobileTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="font-bold text-gray-900 pl-12 md:pl-0 text-[20px] md:text-xl cursor-pointer hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'Helvetica Neue' }}
            >
              {renderMobileHeaderDate()}
            </button>
            {/* Date Picker Popup for Mobile */}
            {isDatePickerOpen && (
              <div 
                  ref={datePickerRef} 
                  className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[100] p-4 md:hidden"
                  style={{ 
                    maxHeight: '70vh',
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                    >
                      <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                    </button>
                    <h3 className="text-base font-semibold text-gray-900">
                      {format(currentDate, 'MMMM yyyy')}
                    </h3>
                    <button
                      onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                    >
                      <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
                    {/* Empty cells for days before month starts */}
                    {Array(getDay(startOfMonth(currentDate))).fill(null).map((_, index) => (
                      <div key={`empty-${index}`} className="aspect-square"></div>
                    ))}
                    
                    {/* Days of the month */}
                    {Array(getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())).fill(null).map((_, index) => {
                      const day = index + 1;
                      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isTodayDate = isToday(date);
                      const isSelected = isSameDay(date, currentDate);
                      
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            setCurrentDate(date);
                            setIsDatePickerOpen(false);
                          }}
                          className={`aspect-square flex items-center justify-center text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-[#FF3700] text-white rounded-full'
                              : isTodayDate
                              ? 'bg-gray-100 text-gray-900 font-semibold rounded-lg'
                              : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg'
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
          <div className="flex items-center gap-3">
            {/* Today Button - Shows current day number */}
            <button
              onClick={() => setCurrentDate(new Date())}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-semibold transition"
              style={{ 
                backgroundColor: isSameDay(currentDate, new Date()) ? '#E2E2DD' : '#FF3700',
                color: isSameDay(currentDate, new Date()) ? '#4A4844' : '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                if (!isSameDay(currentDate, new Date())) {
                  e.currentTarget.style.backgroundColor = '#E03000';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSameDay(currentDate, new Date())) {
                  e.currentTarget.style.backgroundColor = '#FF3700';
                }
              }}
              aria-label="Go to today"
            >
              {new Date().getDate()}
            </button>
            {/* View Selector Button - Mobile Only */}
            <div className="relative">
              <button
                onClick={() => setIsMobileViewDropdownOpen(!isMobileViewDropdownOpen)}
                className="px-2 h-8 rounded-xl flex items-center gap-1 font-semibold transition border border-gray-300 bg-white hover:bg-gray-50"
                aria-label="Select view"
              >
                <span className="text-xs text-gray-700">
                  {typeof viewMode === 'string' && viewMode === 'day' ? '1' : typeof viewMode === 'number' ? viewMode : '1'}
                </span>
                <span className="text-xs text-gray-700">day</span>
              </button>
              {/* View Dropdown - Mobile */}
              {isMobileViewDropdownOpen && (
                <div 
                  ref={mobileViewDropdownRef}
                  className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                  style={{ minWidth: '120px', zIndex: 100 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-2">
                    {[1, 2, 3].map((days) => {
                      const isSelected = (typeof viewMode === 'string' && viewMode === 'day' && days === 1) || (typeof viewMode === 'number' && viewMode === days);
                      return (
                        <button
                          key={days}
                          onClick={() => {
                            if (days === 1) {
                              setViewMode('day');
                              setNumberOfDays(null);
                            } else {
                              setViewMode(days);
                              setNumberOfDays(days);
                            }
                            setIsMobileViewDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-sm font-medium transition-colors text-left flex items-center justify-between hover:bg-gray-50"
                        >
                          <span className="text-gray-900">{days} Day{days > 1 ? 's' : ''}</span>
                          {isSelected && (
                            <CheckIcon className="w-4 h-4 text-black" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
              <button
              onClick={() => setIsActionSidebarOpen(!isActionSidebarOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition"
              aria-label="Action Panel"
            >
              <Image 
                src="/icons/layouting.png" 
                alt="Action Panel" 
                width={20} 
                height={20}
                className="object-contain"
              />
            </button>
          </div>
        </div>

        {/* Calendar Grid with Resource Columns */}
        <div
          className={`flex-1 overflow-y-auto ${isActionSidebarOpen ? 'z-0' : ''}`}
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex flex-col h-full">
            {/* Day of Week Row */}
            <div className={`flex border-b border-gray-100 sticky top-0 ${isActionSidebarOpen ? 'z-0' : 'z-10'}`} style={{ backgroundColor: '#f9f7fa' }}>
              <div className="w-16 flex-shrink-0 border-r border-gray-100"></div>
              <div className={`flex-1 px-2 py-2 ${isMobile && viewMode === 'day' ? 'text-left' : 'text-center'}`}>
                <span className="text-sm font-semibold text-gray-900">{format(currentDate, 'EEE d')}</span>
              </div>
            </div>
            {/* Resource Headers */}
            <div className={`flex border-b border-gray-100 sticky ${isActionSidebarOpen ? 'z-0' : 'z-10'}`} style={{ backgroundColor: '#f9f7fa', top: '40px' }}>
              <div className="w-16 flex-shrink-0 border-r border-gray-100"></div>
              {displayResources.map((resource) => (
                <div key={resource.id} className="flex-1 border-r border-gray-100 last:border-r-0 px-2 py-2 text-center">
                  <span className="text-sm font-semibold text-gray-900">{resource.name.toUpperCase()}</span>
          </div>
              ))}
        </div>

        {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto px-0">
              <div className="flex relative" style={{ minHeight: '960px' }}>
                {/* Time Column */}
                <div className={`w-16 flex-shrink-0 border-r border-gray-100 relative ${isActionSidebarOpen ? 'z-0' : 'z-10'}`} style={{ backgroundColor: '#f9f7fa' }}>
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: '120px' }}>
                      <div className="absolute right-2 top-0 text-xs font-medium text-gray-500 text-right">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
                    </div>
                  ))}
                </div>

                {/* Resource Columns */}
                {displayResources.map((resource) => {
                  const resourceEvents = dayEvents.filter((event: any) => event.resourceId === resource.id);
                  
                  return (
                    <div
                      key={resource.id}
                      className="flex-1 relative"
                      onClick={(e) => handleEmptySlotClick(e, resource.id)}
                    >
                      {/* Time slot lines */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-gray-200"
                          style={{ top: `${(hour - 6) * 120}px` }}
                        />
                      ))}

                      {mobileDraftSelection?.resourceId === resource.id && (
                        <div
                          className="absolute left-1 right-1 rounded-xl border-2 bg-gray-300/70 pointer-events-auto"
                          style={{
                            borderColor: '#4A4844',
                            top: `${mobileDraftSelection.startMinutes * 2}px`,
                            height: `${mobileDraftSelection.durationMinutes * 2}px`
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <div
                            className="absolute -top-2 left-3 w-5 h-5 rounded-full border-2 border-gray-500 bg-white"
                            onTouchStart={handleDraftResizeStart('top')}
                            onPointerDown={handleDraftResizePointerStart('top')}
                            onTouchMove={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            style={{ touchAction: 'none' }}
                          />
                          <div
                            className="absolute -bottom-2 right-3 w-5 h-5 rounded-full border-2 border-gray-500 bg-white"
                            onTouchStart={handleDraftResizeStart('bottom')}
                            onPointerDown={handleDraftResizePointerStart('bottom')}
                            onTouchMove={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            style={{ touchAction: 'none' }}
                          />
                        </div>
                      )}

                      {/* Current time indicator for this column */}
            {isSameDay(currentTime, currentDate) && currentHour >= 6 && currentHour < 22 && (
              <div
                          className="absolute left-0 right-0 z-10"
                style={{ top: `${currentTop}px` }}
              >
                <div className="relative">
                  <div className="absolute left-0 w-2 h-2 rounded-full" style={{ top: '-4px', backgroundColor: '#FF3700' }} />
                  <div className="absolute left-0 right-0 border-t-2 border-dotted" style={{ borderColor: '#FF3700' }} />
                </div>
              </div>
            )}

                      {/* Events in this resource column */}
                      {resourceEvents.map((event: any) => {
                const { top, height } = getEventPosition(event);
                const color = event.color || 'blue';
                const eventColor = eventColors[color] || eventColors.blue;
                        
                        // Determine event color based on service type or default
                        let eventBgColor = 'bg-pink-100';
                        let eventTextColor = 'text-pink-900';
                        let eventBorderColor = 'border-pink-500';
                        
                        if (color && eventColors[color]) {
                          eventBgColor = eventColors[color].bg;
                          eventTextColor = eventColors[color].text;
                          eventBorderColor = eventColors[color].border;
                        }
                        
                        const serviceName = Array.isArray(event.services) 
                          ? event.services.join(', ') 
                          : (event.services || event.title || event.eventName || 'Event');
                        
                        const locationType = event.locationType || event.customerAddress ? 'Drop off' : null;
                        const effectiveCustomerType = event.customerType
                          ? String(event.customerType).toLowerCase()
                          : getCustomerTypeFromHistory({
                              completedServiceCount: event.completedServiceCount,
                              lastCompletedServiceAt: event.lastCompletedServiceAt,
                              referenceDate: event.start || event.date || new Date()
                            });
                        const showEmployeeAvatar = height >= 85;
                
                return (
                  <div
                    key={event.id}
                    onClickCapture={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      const touch = e.touches[0];
                      eventTapRef.current = {
                        x: touch.clientX,
                        y: touch.clientY,
                        time: Date.now()
                      };
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      if (!eventTapRef.current) return;
                      const touch = e.changedTouches[0];
                      const deltaX = Math.abs(touch.clientX - eventTapRef.current.x);
                      const deltaY = Math.abs(touch.clientY - eventTapRef.current.y);
                      const deltaTime = Date.now() - eventTapRef.current.time;
                      if (deltaX < 24 && deltaY < 24 && deltaTime < 700) {
                        handleEventClick(event);
                      }
                      eventTapRef.current = null;
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      eventTapRef.current = {
                        x: e.clientX,
                        y: e.clientY,
                        time: Date.now()
                      };
                    }}
                    onPointerUp={(e) => {
                      e.stopPropagation();
                      if (!eventTapRef.current) return;
                      const deltaX = Math.abs(e.clientX - eventTapRef.current.x);
                      const deltaY = Math.abs(e.clientY - eventTapRef.current.y);
                      const deltaTime = Date.now() - eventTapRef.current.time;
                      if (deltaX < 24 && deltaY < 24 && deltaTime < 700) {
                        handleEventClick(event);
                      }
                      eventTapRef.current = null;
                    }}
                            className={`absolute left-1 right-1 rounded-lg p-2 cursor-pointer z-20 flex flex-col ${eventBgColor} ${eventTextColor} border-l-4`}
                    role="button"
                    tabIndex={0}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                              minHeight: '60px',
                              borderLeftColor: color === 'blue' ? '#3b82f6' : 
                                            color === 'green' ? '#10b981' : 
                                            color === 'yellow' ? '#eab308' : 
                                            color === 'orange' ? '#f97316' :
                                            color === 'red' ? '#ef4444' :
                                            color === 'purple' ? '#a855f7' :
                                            '#ec4899', // pink default
                            }}
                          >
                            <div className="font-semibold text-sm mb-1">
                              {serviceName}
                    </div>
                            
                            {/* Customer Info */}
                            {event.customerName && (
                              <div className="text-[12px] font-semibold mt-1">
                                {event.customerName}
                              </div>
                            )}
                            {event.customerPhone && (
                              <div className="text-[12px] text-gray-700 mt-0.5">
                                {formatPhoneDisplay(event.customerPhone)}
                              </div>
                            )}
                            {/* Badges */}
                            {(locationType || effectiveCustomerType) && (
                              <div className="mt-auto pt-2 flex flex-wrap gap-1">
                                {locationType && (
                                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-pink-200 text-pink-800">
                                    {locationType}
                                  </span>
                                )}
                                {effectiveCustomerType === 'returning' && (
                                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-200 text-purple-800">
                                    Repeat customer
                                  </span>
                                )}
                                {effectiveCustomerType === 'new' && (
                                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-200 text-gray-700">
                                    New customer
                                  </span>
                                )}
                                {effectiveCustomerType === 'maintenance' && (
                                  <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-200 text-blue-800">
                                    Maintenance customer
                                  </span>
                                )}
                              </div>
                            )}
                            {showEmployeeAvatar && event.employeeName && (
                              <div className="pt-2 flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center border border-gray-200 ${getEmployeeBadgeClass(event.color)}`}>
                                  <span className="text-[11px] font-semibold">
                                    {getEmployeeInitials(event.employeeName)}
                                  </span>
                                </div>
                                {event.employeeName && (
                                  <span className="text-[12px] font-semibold text-gray-800 truncate">
                                    {event.employeeName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                );
              })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
          {/* Filter Employee Button */}
          <button
            onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
            className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition"
            aria-label="Filter employees"
          >
            <FunnelIcon className="w-6 h-6 text-gray-700" />
            {selectedTechnicians.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {selectedTechnicians.length}
              </span>
            )}
          </button>
          
          {/* Add Event Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-black rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition"
            aria-label="Add event"
          >
            <PlusIcon className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Employee Filter Dropdown - Mobile */}
        {isTeamDropdownOpen && (
          <>
            {/* Backdrop overlay - closes on tap */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsTeamDropdownOpen(false)}
            />
            <div 
              ref={mobileTeamDropdownRef}
              className="fixed right-6 bg-white z-40 rounded-2xl shadow-2xl overflow-hidden" 
              style={{ bottom: 'calc(5.5rem + 3.5rem + 0.75rem)', width: 'calc(100vw - 3rem)', maxWidth: '400px', maxHeight: 'calc(85vh - 8rem)' }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="px-4 py-4 flex flex-col" style={{ gap: '12px' }}>
                {teamEmployees.map((employee) => {
                  // If no technicians selected, all are considered selected (showing all)
                  const isSelected = selectedTechnicians.length === 0 || selectedTechnicians.includes(employee.id);
                  return (
                    <button
                      key={employee.id}
                      onClick={() => {
                        // If all are selected (empty array), selecting one means selecting only that one
                        if (selectedTechnicians.length === 0) {
                          // First selection: select only this employee
                          setSelectedTechnicians([employee.id]);
                        } else if (isSelected) {
                          // Deselecting: remove from array
                          const newSelection = selectedTechnicians.filter(id => id !== employee.id);
                          // If all are deselected, go back to showing all (empty array)
                          setSelectedTechnicians(newSelection.length === 0 ? [] : newSelection);
                        } else {
                          // Selecting: add to array
                          setSelectedTechnicians([...selectedTechnicians, employee.id]);
                        }
                      }}
                    className="w-full px-4 py-2 text-sm font-medium transition-colors text-left flex items-center gap-3 bg-transparent hover:bg-gray-50"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEmployeeBadgeClass(employee.color)}`}>
                        <span className="text-[11px] font-semibold">
                          {getEmployeeInitials(employee.name)}
                        </span>
                      </div>
                    <span className="text-gray-900">{employee.name}</span>
                      {isSelected && (
                      <CheckIcon className="w-5 h-5 ml-auto text-black" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render mobile view if on mobile (1, 2, or 3 day views)
  if (isMobile && (viewMode === 'day' || (typeof viewMode === 'number' && viewMode >= 1 && viewMode <= 3))) {
    // For 1 day view, use the mobile calendar renderer
    if (viewMode === 'day') {
    return (
        <div className="fixed inset-0 md:relative" style={{ zIndex: 0 }}>
        {renderMobileCalendar()}
        {/* Keep modals and sidebars */}
        {isModalOpen && createSheetState === 'full' && (
          <div
            className="md:hidden fixed inset-0 z-[79]"
            onClick={() => {
              if (createSheetIgnoreClickRef.current) {
                return;
              }
              minimizeCreateSheet();
            }}
          />
        )}
        {isModalOpen && createSheetState !== 'hidden' && (
          <div
            ref={createSheetRef}
            className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F8F8F7] rounded-t-3xl shadow-2xl z-[9998] transform transition-all duration-300 ease-out overflow-x-hidden"
            style={{
              maxHeight: createSheetState === 'minimized' ? '360px' : '85vh',
              height: createSheetState === 'minimized' ? '360px' : 'auto',
              minHeight: createSheetState === 'minimized' ? '360px' : '200px',
              isolation: 'isolate',
              width: '100%',
              maxWidth: '100vw',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              transform: `translate3d(0, ${createSheetDragY}px, 0)`
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              createSheetContentTouchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY
              };
              const target = e.target as Element;
              const isHandle = target.closest('[data-create-sheet-handle]');
              if (!isHandle) {
                createSheetTouchStartRef.current = null;
                return;
              }
              createSheetTouchStartRef.current = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
              };
              setCreateSheetDragY(0);
              createSheetIgnoreClickRef.current = false;
            }}
            onTouchMove={(e) => {
              if (createSheetContentTouchStartRef.current) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - createSheetContentTouchStartRef.current.x;
                const deltaY = touch.clientY - createSheetContentTouchStartRef.current.y;
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
                  e.preventDefault();
                }
              }
              if (createSheetRef.current && createSheetTouchStartRef.current) {
                const touch = e.touches[0];
                const currentY = touch.clientY;
                const startY = createSheetTouchStartRef.current?.y || currentY;
                const deltaY = currentY - startY;
                const deltaX = touch.clientX - (createSheetTouchStartRef.current?.x || touch.clientX);
                const dragY = Math.max(0, deltaY);
                if (dragY > 0) {
                  setCreateSheetDragY(dragY);
                }
                if (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10) {
                  e.preventDefault();
                }
              }
            }}
            onTouchEnd={(e) => {
              if (!createSheetTouchStartRef.current) {
                createSheetContentTouchStartRef.current = null;
                return;
              }
              const currentSheetState = createSheetState;
              const touch = e.changedTouches[0];
              const deltaY = touch.clientY - createSheetTouchStartRef.current.y;
              const deltaTime = Date.now() - createSheetTouchStartRef.current.time;
              const swipeThreshold = 50;
              const timeThreshold = 500;
              const sheetHeight = createSheetRef.current?.getBoundingClientRect().height || 0;
              const closeThreshold = sheetHeight ? Math.min(180, sheetHeight * 0.25) : 120;

              createSheetIgnoreClickRef.current = true;
              window.setTimeout(() => {
                createSheetIgnoreClickRef.current = false;
              }, 250);

              if (currentSheetState === 'full') {
                if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                  minimizeCreateSheet();
                } else {
                  setCreateSheetDragY(0);
                }
              } else if (currentSheetState === 'minimized') {
                if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                  closeCreateSheet();
                } else if (deltaY < -swipeThreshold && deltaTime < timeThreshold) {
                  setCreateSheetState('full');
                } else {
                  setCreateSheetDragY(0);
                }
              } else {
                setCreateSheetDragY(0);
              }

              createSheetTouchStartRef.current = null;
              createSheetContentTouchStartRef.current = null;
            }}
          >
            <div className="flex flex-col px-4 pt-2 pb-2 sticky top-0 z-20 bg-[#F8F8F7]" data-create-sheet-handle>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8" />
                <div className="flex-1 flex justify-center">
                  <div style={{ width: '46px', height: '3px' }}>
                    <div style={{ width: '100%', height: '100%', background: '#D9D9D9', borderRadius: 1000 }} />
                  </div>
                </div>
                <button
                  onClick={closeCreateSheet}
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="pt-2 pb-1">
                <div className="text-base font-semibold text-gray-900">Create event</div>
              </div>
            </div>

            <EventModal
              isOpen={isModalOpen}
              renderMode="drawer"
              showHeader={false}
              showCloseButton={false}
              onClose={closeCreateSheet}
              onAddEvent={handleAddEvent}
              preSelectedResource={selectedResource}
              resources={resources.length > 0 ? resources : []}
              draftEvent={draftEvent}
              onOpenNewCustomerModal={(initialName) => {
                setNewCustomerModalInitialName(initialName);
                setIsNewCustomerModalOpen(true);
              }}
              onOpenEditCustomerModal={(customer) => {
                console.log('onOpenEditCustomerModal called in CalendarPage with:', customer);
                setEditingCustomerData({
                  customerName: customer.customerName,
                  customerPhone: customer.customerPhone,
                  customerAddress: customer.customerAddress || '',
                  customerType: customer.customerType || ''
                });
                setIsEditingCustomer(true);
                setIsNewCustomerModalOpen(true);
                console.log('State updated - isEditingCustomer:', true, 'isNewCustomerModalOpen:', true);
              }}
              onRequestClose={() => {
                setShowEventModalDiscardModal(true);
              }}
              newCustomerData={newCustomerData}
            />
          </div>
        )}
        {eventDetailsOpen && selectedEventData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedEventData.title || selectedEventData.eventName}
                  </h3>
                  <button
                    onClick={handleCloseEventDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseEventDetails}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <NewCustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => setIsNewCustomerModalOpen(false)}
          initialName={newCustomerModalInitialName}
          onSuccess={(customerData: any) => {
            setNewCustomerData(customerData);
            setIsNewCustomerModalOpen(false);
          }}
        />
        {/* Bottom Sheet Backdrop - Mobile - Only for event details */}
        {selectedEventData && isMobile && isEditingEvent && bottomSheetState === 'full' && (
          <div
            className="md:hidden fixed inset-0 z-[80]"
            onClick={() => {
              if (bottomSheetIgnoreClickRef.current) {
                return;
              }
              if (bottomSheetState === 'full') {
                minimizeBottomSheet();
                return;
              }
              requestCloseBottomSheet();
            }}
          />
        )}
        {/* Bottom Sheet - Mobile - Only for event editing (always in edit mode) */}
        {selectedEventData && isMobile && isEditingEvent && bottomSheetState !== 'hidden' && (
          <div 
          ref={bottomSheetRef}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[9999] transform transition-all duration-300 ease-out overflow-x-hidden"
          style={{ 
            maxHeight: bottomSheetState === 'minimized' ? '200px' : '85vh',
            height: bottomSheetState === 'minimized' ? '200px' : 'auto',
            minHeight: bottomSheetState === 'minimized' ? '200px' : '200px',
            isolation: 'isolate',
            width: '100%',
            maxWidth: '100vw',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
            transform: `translate3d(0, ${bottomSheetDragY}px, 0)`
          }}
          onTouchStart={(e) => {
            const target = e.target as Element;
            const isHandle = target.closest('[data-bottom-sheet-handle]');
            if (!isHandle) {
              bottomSheetTouchStartRef.current = null;
              return;
            }
            const touch = e.touches[0];
            bottomSheetTouchStartRef.current = {
              y: touch.clientY,
              time: Date.now()
            };
            setBottomSheetDragY(0);
            bottomSheetIgnoreClickRef.current = false;
          }}
          onTouchMove={(e) => {
            // Prevent scrolling when swiping the bottom sheet
            if (bottomSheetRef.current && bottomSheetTouchStartRef.current) {
              const touch = e.touches[0];
              const currentY = touch.clientY;
              const startY = bottomSheetTouchStartRef.current?.y || currentY;
              const deltaY = currentY - startY;
              const dragY = Math.max(0, deltaY);
              if (dragY > 0) {
                setBottomSheetDragY(dragY);
              }
              
              // Only prevent default if we're actually dragging the sheet
              if (Math.abs(deltaY) > 10) {
                e.preventDefault();
              }
            }
          }}
          onTouchEnd={(e) => {
            if (!bottomSheetTouchStartRef.current) return;
            
            const currentSheetState = bottomSheetState;
            const touch = e.changedTouches[0];
            const deltaY = touch.clientY - bottomSheetTouchStartRef.current.y;
            const deltaTime = Date.now() - bottomSheetTouchStartRef.current.time;
            const swipeThreshold = 50; // Minimum swipe distance
            const timeThreshold = 500; // Maximum swipe time
            const sheetHeight = bottomSheetRef.current?.getBoundingClientRect().height || 0;
            const closeThreshold = sheetHeight ? Math.min(180, sheetHeight * 0.25) : 120;
            
            bottomSheetIgnoreClickRef.current = true;
            window.setTimeout(() => {
              bottomSheetIgnoreClickRef.current = false;
            }, 250);

            // Determine next state based on current state and swipe direction
            if (currentSheetState === 'full') {
              if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                minimizeBottomSheet();
              } else {
                setBottomSheetDragY(0);
              }
            } else if (currentSheetState === 'minimized') {
              if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                requestCloseBottomSheet();
              } else if (deltaY < -swipeThreshold && deltaTime < timeThreshold) {
                setBottomSheetState('full');
              } else {
                setBottomSheetDragY(0);
              }
            } else {
              setBottomSheetDragY(0);
            }
            
            bottomSheetTouchStartRef.current = null;
          }}
        >
          {/* Drag Handle and Action Buttons */}
          <div
            className={`flex items-center justify-between px-4 sticky top-0 z-20 bg-white ${
              bottomSheetState === 'minimized' ? 'pt-2 pb-1' : 'pt-3 pb-2'
            }`}
            data-bottom-sheet-handle
          >
            <div className="flex-1 flex justify-center">
              <div style={{ width: '46px', height: '3px', marginLeft: '3rem' }}>
                <div style={{ width: '100%', height: '100%', background: '#D9D9D9', borderRadius: 1000 }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative" ref={bottomSheetMenuRef}>
                <button
                  onClick={() => setIsBottomSheetMenuOpen(!isBottomSheetMenuOpen)}
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  aria-label="More options"
                >
                  <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Dropdown menu */}
                {isBottomSheetMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
                    <button
                      onClick={async () => {
                        setIsBottomSheetMenuOpen(false);
                        await handleDeleteEvent(selectedEventData);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Event
                    </button>
                  </div>
                )}
              </div>
              
              {/* Close button - hides the drawer */}
              <button
                onClick={requestCloseBottomSheet}
                className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Minimized View - Customer Card Only */}
          {bottomSheetState === 'minimized' && (
            <div
              className="px-4 pb-4 cursor-pointer overflow-x-hidden"
              style={{ width: '100%', maxWidth: '100%' }}
              onClick={() => setBottomSheetState('full')}
            >
            <div className="pt-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Event Details</h3>
                {(selectedEventData?.customerName || selectedEventData?.customerPhone || selectedEventData?.customerAddress) ? (
                  <div
                    className="bg-gray-50 rounded-xl p-4 border"
                    style={{ borderColor: '#E2E2DD' }}
                  >
                    <div className="flex items-start justify-between">
                          <div className="flex-1 pr-8">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-base">
                                {selectedEventData.customerName || 'Unnamed Customer'}
                              </h4>
                              {selectedEventData.customerPhone && (
                                <span className="text-sm text-gray-600 ml-2">
                                  {formatPhoneDisplay(selectedEventData.customerPhone)}
                                </span>
                              )}
                            </div>
                            {selectedEventData.customerAddress && (
                              <p className="text-sm text-gray-600">
                                {selectedEventData.customerAddress}
                              </p>
                            )}
                          </div>
                          {selectedEventData.customerPhone && (
                            <div className="flex flex-col gap-2">
                              <a
                                href={`tel:${getPhoneHref(selectedEventData.customerPhone)}`}
                                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                                aria-label="Call customer"
                              >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 5.5A2.5 2.5 0 014.5 3h2a2.5 2.5 0 012.5 2.5v1.1c0 .5-.2 1-.6 1.4l-1 1a14.7 14.7 0 006.2 6.2l1-1c.4-.4.9-.6 1.4-.6h1.1A2.5 2.5 0 0121 16.5v2A2.5 2.5 0 0118.5 21h-.6C9 21 2 14 2 5.1V5.5z" />
                                </svg>
                              </a>
                              <a
                                href={`sms:${getPhoneHref(selectedEventData.customerPhone)}`}
                                className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                                aria-label="Message customer"
                              >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5m7-10a2 2 0 00-2-2H6a2 2 0 00-2 2v12l4-3h10a2 2 0 002-2V4z" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No customer information available</div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          {bottomSheetState === 'full' && (
            <>
              <div
                className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24"
                style={{
                  maxHeight: 'calc(85vh - 80px)',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-y'
                }}
              >
                {selectedEventData && isEditingEvent && (
                  <EventEditForm
                    ref={mobileEventEditFormRef}
                    event={selectedEventData}
                    resources={resources}
                    onDirtyChange={(isDirty) => setIsEditFormDirty(isDirty)}
                    onRequestDiscard={() => setShowDiscardModal(true)}
                    onEditCustomer={() => {
                      // Set up customer data for editing
                      setEditingCustomerData({
                        customerName: selectedEventData.customerName || '',
                        customerPhone: selectedEventData.customerPhone || '',
                        customerAddress: selectedEventData.customerAddress || '',
                        customerType: selectedEventData.customerType || ''
                      });
                      setIsEditingCustomer(true);
                      setIsNewCustomerModalOpen(true);
                    }}
                    onSave={async (updatedData: any) => {
                      try {
                        const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(updatedData),
                        });

                        if (response.ok) {
                          const result = await response.json();
                          fetchCalendarEvents();
                          setIsEditFormDirty(false);

                          const serverEvent = result?.event || null;
                          if (serverEvent) {
                            setSelectedEventData(serverEvent);
                            
                            const eventServicesList = Array.isArray(serverEvent.services) ? serverEvent.services : serverEvent.services ? [serverEvent.services] : [];
                            if (eventServicesList.length > 0) {
                              const matchedItems: Array<{ id: string; name: string; type: 'service' | 'bundle' }> = eventServicesList
                                .map((serviceName: string) => {
                                  const service = availableServices.find((s: any) => s.name === serviceName);
                                  if (service) {
                                    return { id: service.id, name: service.name, type: 'service' as const };
                                  }
                                  const bundle = availableBundles.find((b: any) => b.name === serviceName);
                                  if (bundle) {
                                    return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                                  }
                                  return { id: `temp-${serviceName}`, name: serviceName, type: 'service' as const };
                                })
                                .filter((s) => s !== null);
                              setSelectedServices(matchedItems);
                            } else {
                              setSelectedServices([]);
                            }

                            if (serverEvent.vehicles && Array.isArray(serverEvent.vehicles)) {
                              setEventVehicles(serverEvent.vehicles.map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v })));
                            } else if (serverEvent.vehicleModel) {
                              setEventVehicles([{ id: 'vehicle-0', model: serverEvent.vehicleModel }]);
                            } else {
                              setEventVehicles([]);
                            }
                          } else {
                            let updatedEventData = { ...selectedEventData, ...updatedData };
                            
                            if (updatedData.startDate) {
                              updatedEventData.start = updatedData.startDate;
                            }
                            if (updatedData.endDate) {
                              updatedEventData.end = updatedData.endDate;
                            } else if (updatedData.startDate) {
                              updatedEventData.end = updatedData.startDate;
                            }
                            
                            if (updatedData.time !== undefined) {
                              updatedEventData.time = updatedData.time;
                            }
                            
                            setSelectedEventData(updatedEventData);
                          }
                        } else {
                          const error = await response.json();
                          console.error('Failed to update event:', error.error);
                        }
                      } catch (error) {
                        console.error('Error updating event:', error);
                      }
                    }}
                    onCancel={() => {
                      // onCancel is called after user confirms discard in modal
                      // Hide the bottom sheet
                      closeBottomSheet({ resetEditFormData: true });
                    }}
                  />
                )}
              </div>

              {/* Fixed Action Buttons - Mobile Bottom Sheet - Only in full state */}
              {selectedEventData && isEditingEvent && (
                <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                  <div className="flex gap-3">
                    <button
                      onClick={requestCloseBottomSheet}
                      className="flex-1 px-6 py-2 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                      style={{ borderColor: '#E2E2DD' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (mobileEventEditFormRef.current) {
                          mobileEventEditFormRef.current.handleSubmit();
                        } else {
                          console.error('Mobile EventEditForm ref is not set');
                        }
                      }}
                      className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckIcon className="w-5 h-5" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>
    );
    } else {
      // For 2-3 day views, use WeekView with numberOfDays
      // Swipe handlers for 2-3 day views
      const handleMultiDayTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now()
        };
      };

      const handleMultiDayTouchMove = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
        
        // If it's a clear horizontal swipe (more horizontal than vertical), prevent default scrolling
        if (deltaX > 30 && deltaX > deltaY * 1.5) {
          e.preventDefault();
        }
      };

      const handleMultiDayTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartRef.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const deltaTime = Date.now() - touchStartRef.current.time;

        const minSwipeDistance = 80;
        const maxSwipeTime = 500;

        // Horizontal swipe for multi-day navigation
        if (typeof viewMode === 'number' && viewMode >= 2 && viewMode <= 3 && Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < Math.abs(deltaX) * 0.5 && deltaTime < maxSwipeTime) {
          // Prevent default to avoid scrolling interference
          e.preventDefault();
          // Swipe right: previous period
          if (deltaX > 0) {
            setCurrentDate(subDays(currentDate, viewMode));
          }
          // Swipe left: next period
          else if (deltaX < 0) {
            setCurrentDate(addDays(currentDate, viewMode));
          }
        }

        touchStartRef.current = null;
      };

      return (
        <div className="fixed inset-0 md:relative" style={{ zIndex: 0 }}>
          <div className="h-full flex flex-col">
            {/* Mobile Header */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 bg-[#f9f7fa] border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 relative">
                  <button
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="font-bold text-gray-900 text-[20px] cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ fontFamily: 'Helvetica Neue', marginLeft: '2.5rem' }}
                  >
                    {renderMobileHeaderDate()}
                  </button>
                  {/* Date Picker Popup for Mobile - 2-3 day view */}
                  {isDatePickerOpen && (
                    <div 
                      ref={datePickerRef} 
                      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[100] p-4 md:hidden"
                      style={{ 
                        maxHeight: '70vh',
                        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                          className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                        >
                          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <h3 className="text-base font-semibold text-gray-900">
                          {format(currentDate, 'MMMM yyyy')}
                        </h3>
                        <button
                          onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                          className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200"
                        >
                          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 120px)' }}>
                        {/* Empty cells for days before month starts */}
                        {Array(getDay(startOfMonth(currentDate))).fill(null).map((_, index) => (
                          <div key={`empty-${index}`} className="aspect-square"></div>
                        ))}
                        
                        {/* Days of the month */}
                        {Array(getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())).fill(null).map((_, index) => {
                          const day = index + 1;
                          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                          const isTodayDate = isToday(date);
                          const isSelected = isSameDay(date, currentDate);

                          return (
                            <button
                              key={day}
                              onClick={() => {
                                setCurrentDate(date);
                                setIsDatePickerOpen(false);
                              }}
                              className={`aspect-square flex items-center justify-center text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'bg-[#FF3700] text-white rounded-full'
                                  : isTodayDate
                                  ? 'bg-gray-100 text-gray-900 font-semibold rounded-lg'
                                  : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg'
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-semibold transition"
                    style={{ 
                      backgroundColor: isSameDay(currentDate, new Date()) ? '#E2E2DD' : '#FF3700',
                      color: isSameDay(currentDate, new Date()) ? '#4A4844' : '#FFFFFF'
                    }}
                    aria-label="Go to today"
                  >
                    {new Date().getDate()}
                  </button>
                  {/* View Selector Button - Mobile Only */}
                  <div className="relative">
                    <button
                      onClick={() => setIsMobileViewDropdownOpen(!isMobileViewDropdownOpen)}
                      className="px-2 h-8 rounded-xl flex items-center gap-1 font-semibold transition border border-gray-300 bg-white hover:bg-gray-50"
                      aria-label="Select view"
                    >
                      <span className="text-xs text-gray-700">
                        {typeof viewMode === 'string' && viewMode === 'day' ? '1' : typeof viewMode === 'number' ? viewMode : '1'}
                      </span>
                      <span className="text-xs text-gray-700">day</span>
                    </button>
                    {/* View Dropdown - Mobile */}
                    {isMobileViewDropdownOpen && (
                      <div 
                        ref={mobileViewDropdownRef}
                        className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                        style={{ minWidth: '120px', zIndex: 100 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="py-2">
                          {[1, 2, 3].map((days) => {
                            const isSelected = (typeof viewMode === 'string' && viewMode === 'day' && days === 1) || (typeof viewMode === 'number' && viewMode === days);
                            return (
                              <button
                                key={days}
                                onClick={() => {
                                  if (days === 1) {
                                    setViewMode('day');
                                    setNumberOfDays(null);
                                  } else {
                                    setViewMode(days);
                                    setNumberOfDays(days);
                                  }
                                  setIsMobileViewDropdownOpen(false);
                                }}
                                className="w-full px-4 py-2 text-sm font-medium transition-colors text-left flex items-center justify-between hover:bg-gray-50"
                              >
                                <span className="text-gray-900">{days} Day{days > 1 ? 's' : ''}</span>
                                {isSelected && (
                                  <CheckIcon className="w-4 h-4 text-black" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* WeekView for multi-day */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <WeekView
                date={currentDate}
                events={filteredBookings}
                onEventClick={handleEventClick}
                resources={resources}
                scale={weekScale}
                businessHours={businessHours}
                onResourceSelect={setSelectedResource}
                onOpenModal={() => setIsModalOpen(true)}
                draftEvent={draftEvent && draftEvent.date ? { ...draftEvent, date: draftEvent.date } : null}
                onDraftEventUpdate={(event) => setDraftEvent({ ...event, date: event.date || currentDate })}
                numberOfDays={typeof viewMode === 'number' ? viewMode : null}
                isMobile={isMobile}
                onTouchStart={handleMultiDayTouchStart}
                onTouchMove={handleMultiDayTouchMove}
                onTouchEnd={handleMultiDayTouchEnd}
              />
            </div>
          </div>
          {/* Floating Action Buttons */}
          <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
            {/* Filter Employee Button */}
            <button
              onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
              className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition"
              aria-label="Filter employees"
            >
              <FunnelIcon className="w-6 h-6 text-gray-700" />
              {selectedTechnicians.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {selectedTechnicians.length}
                </span>
              )}
            </button>
            
            {/* Add Event Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-14 h-14 bg-black rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition"
              aria-label="Add event"
            >
              <PlusIcon className="w-7 h-7 text-white" />
            </button>
          </div>
          {/* Keep modals and sidebars - same as 1 day view */}
          {isModalOpen && createSheetState === 'full' && (
            <div
              className="md:hidden fixed inset-0 z-[79]"
              onClick={() => {
                if (createSheetIgnoreClickRef.current) {
                  return;
                }
                minimizeCreateSheet();
              }}
            />
          )}
          {isModalOpen && createSheetState !== 'hidden' && (
            <div
              ref={createSheetRef}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F8F8F7] rounded-t-3xl shadow-2xl z-[9998] transform transition-all duration-300 ease-out overflow-x-hidden"
              style={{
              maxHeight: createSheetState === 'minimized' ? '360px' : '85vh',
              height: createSheetState === 'minimized' ? '360px' : 'auto',
              minHeight: createSheetState === 'minimized' ? '360px' : '200px',
                isolation: 'isolate',
                width: '100%',
                maxWidth: '100vw',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                transform: `translate3d(0, ${createSheetDragY}px, 0)`
              }}
              onTouchStart={(e) => {
                const touch = e.touches[0];
                createSheetContentTouchStartRef.current = {
                  x: touch.clientX,
                  y: touch.clientY
                };
                const target = e.target as Element;
                const isHandle = target.closest('[data-create-sheet-handle]');
                if (!isHandle) {
                  createSheetTouchStartRef.current = null;
                  return;
                }
              createSheetTouchStartRef.current = {
                y: touch.clientY,
                x: touch.clientX,
                time: Date.now()
              };
                setCreateSheetDragY(0);
                createSheetIgnoreClickRef.current = false;
              }}
              onTouchMove={(e) => {
                if (createSheetContentTouchStartRef.current) {
                  const touch = e.touches[0];
                  const deltaX = touch.clientX - createSheetContentTouchStartRef.current.x;
                  const deltaY = touch.clientY - createSheetContentTouchStartRef.current.y;
                  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
                    e.preventDefault();
                  }
                }
                if (createSheetRef.current && createSheetTouchStartRef.current) {
                  const touch = e.touches[0];
                const currentY = touch.clientY;
                const startY = createSheetTouchStartRef.current?.y || currentY;
                const deltaY = currentY - startY;
                const deltaX = touch.clientX - (createSheetTouchStartRef.current?.x || touch.clientX);
                const dragY = Math.max(0, deltaY);
                if (dragY > 0) {
                  setCreateSheetDragY(dragY);
                }
                if (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10) {
                  e.preventDefault();
                }
              }
            }}
              onTouchEnd={(e) => {
                if (!createSheetTouchStartRef.current) {
                  createSheetContentTouchStartRef.current = null;
                  return;
                }
                const currentSheetState = createSheetState;
                const touch = e.changedTouches[0];
                const deltaY = touch.clientY - createSheetTouchStartRef.current.y;
                const deltaTime = Date.now() - createSheetTouchStartRef.current.time;
                const swipeThreshold = 50;
                const timeThreshold = 500;
                const sheetHeight = createSheetRef.current?.getBoundingClientRect().height || 0;
                const closeThreshold = sheetHeight ? Math.min(180, sheetHeight * 0.25) : 120;

                createSheetIgnoreClickRef.current = true;
                window.setTimeout(() => {
                  createSheetIgnoreClickRef.current = false;
                }, 250);

                if (currentSheetState === 'full') {
                  if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                    minimizeCreateSheet();
                  } else {
                    setCreateSheetDragY(0);
                  }
                } else if (currentSheetState === 'minimized') {
                  if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                    closeCreateSheet();
                  } else if (deltaY < -swipeThreshold && deltaTime < timeThreshold) {
                    setCreateSheetState('full');
                  } else {
                    setCreateSheetDragY(0);
                  }
                } else {
                  setCreateSheetDragY(0);
                }

                createSheetTouchStartRef.current = null;
                createSheetContentTouchStartRef.current = null;
              }}
            >
              <div className="flex flex-col px-4 pt-2 pb-2 sticky top-0 z-20 bg-[#F8F8F7]" data-create-sheet-handle>
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8" />
                  <div className="flex-1 flex justify-center">
                    <div style={{ width: '46px', height: '3px' }}>
                      <div style={{ width: '100%', height: '100%', background: '#D9D9D9', borderRadius: 1000 }} />
                    </div>
                  </div>
                  <button
                    onClick={closeCreateSheet}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="pt-2 pb-1">
                  <div className="text-base font-semibold text-gray-900">Create event</div>
                </div>
              </div>

              <EventModal
                isOpen={isModalOpen}
                renderMode="drawer"
                showHeader={false}
                showCloseButton={false}
                onClose={closeCreateSheet}
                onAddEvent={handleAddEvent}
                preSelectedResource={selectedResource}
                resources={resources.length > 0 ? resources : []}
                draftEvent={draftEvent}
                onOpenNewCustomerModal={(initialName) => {
                  setNewCustomerModalInitialName(initialName);
                  setIsNewCustomerModalOpen(true);
                }}
                onOpenEditCustomerModal={(customer) => {
                setEditingCustomerData({
                    customerName: customer.customerName,
                    customerPhone: customer.customerPhone,
                    customerAddress: customer.customerAddress || '',
                    customerType: customer.customerType || ''
                  });
                  setIsEditingCustomer(true);
                  setIsNewCustomerModalOpen(true);
                }}
                onRequestClose={() => {
                  setShowEventModalDiscardModal(true);
                }}
                newCustomerData={newCustomerData}
              />
            </div>
          )}
          <NewCustomerModal
            isOpen={isNewCustomerModalOpen}
            onClose={() => setIsNewCustomerModalOpen(false)}
            initialName={newCustomerModalInitialName}
            onSuccess={(customerData: any) => {
              setNewCustomerData(customerData);
              setIsNewCustomerModalOpen(false);
            }}
          />
          {/* Bottom Sheet Backdrop - Mobile - Only for event details */}
          {selectedEventData && isMobile && isEditingEvent && bottomSheetState === 'full' && (
            <div
              className="md:hidden fixed inset-0 z-[80]"
              onClick={() => {
                if (bottomSheetIgnoreClickRef.current) {
                  return;
                }
                if (bottomSheetState === 'full') {
                  minimizeBottomSheet();
                  return;
                }
                requestCloseBottomSheet();
              }}
            />
          )}
          {/* Bottom Sheet - Mobile - Only for event editing (always in edit mode) */}
          {selectedEventData && isMobile && isEditingEvent && bottomSheetState !== 'hidden' && (
          <div 
            ref={bottomSheetRef}
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[9999] transform transition-all duration-300 ease-out overflow-x-hidden"
            style={{ 
              maxHeight: bottomSheetState === 'minimized' ? '200px' : '85vh',
              height: bottomSheetState === 'minimized' ? '200px' : 'auto',
              minHeight: bottomSheetState === 'minimized' ? '200px' : '200px',
              isolation: 'isolate',
              width: '100%',
              maxWidth: '100vw',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              transform: `translate3d(0, ${bottomSheetDragY}px, 0)`
            }}
            onTouchStart={(e) => {
              const target = e.target as Element;
              const isHandle = target.closest('[data-bottom-sheet-handle]');
              if (!isHandle) {
                bottomSheetTouchStartRef.current = null;
                return;
              }
              const touch = e.touches[0];
              bottomSheetTouchStartRef.current = {
                y: touch.clientY,
                time: Date.now()
              };
              setBottomSheetDragY(0);
              bottomSheetIgnoreClickRef.current = false;
            }}
            onTouchMove={(e) => {
              // Prevent scrolling when swiping the bottom sheet
              if (bottomSheetRef.current && bottomSheetTouchStartRef.current) {
                const touch = e.touches[0];
                const currentY = touch.clientY;
                const startY = bottomSheetTouchStartRef.current?.y || currentY;
                const deltaY = currentY - startY;
                const dragY = Math.max(0, deltaY);
                if (dragY > 0) {
                  setBottomSheetDragY(dragY);
                }
                
                // Only prevent default if we're actually dragging the sheet
                if (Math.abs(deltaY) > 10) {
                  e.preventDefault();
                }
              }
            }}
            onTouchEnd={(e) => {
              if (!bottomSheetTouchStartRef.current) return;
              
              const currentSheetState = bottomSheetState;
              const touch = e.changedTouches[0];
              const deltaY = touch.clientY - bottomSheetTouchStartRef.current.y;
              const deltaTime = Date.now() - bottomSheetTouchStartRef.current.time;
              const swipeThreshold = 50; // Minimum swipe distance
              const timeThreshold = 500; // Maximum swipe time
              const sheetHeight = bottomSheetRef.current?.getBoundingClientRect().height || 0;
              const closeThreshold = sheetHeight ? Math.min(180, sheetHeight * 0.25) : 120;
              
              bottomSheetIgnoreClickRef.current = true;
              window.setTimeout(() => {
                bottomSheetIgnoreClickRef.current = false;
              }, 250);

              // Determine next state based on current state and swipe direction
              if (currentSheetState === 'full') {
                if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                  minimizeBottomSheet();
                } else {
                  setBottomSheetDragY(0);
                }
              } else if (currentSheetState === 'minimized') {
                if (deltaY > closeThreshold || (Math.abs(deltaY) > swipeThreshold && deltaTime < timeThreshold && deltaY > 0)) {
                  requestCloseBottomSheet();
                } else if (deltaY < -swipeThreshold && deltaTime < timeThreshold) {
                  setBottomSheetState('full');
                } else {
                  setBottomSheetDragY(0);
                }
              } else {
                setBottomSheetDragY(0);
              }
              
              bottomSheetTouchStartRef.current = null;
            }}
          >
            {/* Drag Handle and Action Buttons */}
            <div
              className={`flex items-center justify-between px-4 sticky top-0 z-20 bg-white ${
                bottomSheetState === 'minimized' ? 'pt-2 pb-1' : 'pt-3 pb-2'
              }`}
              data-bottom-sheet-handle
            >
              <div className="flex-1 flex justify-center">
                <div style={{ width: '46px', height: '3px', marginLeft: '3rem' }}>
                  <div style={{ width: '100%', height: '100%', background: '#D9D9D9', borderRadius: 1000 }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" ref={bottomSheetMenuRef}>
                  <button
                    onClick={() => setIsBottomSheetMenuOpen(!isBottomSheetMenuOpen)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    aria-label="More options"
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  {/* Dropdown menu */}
                  {isBottomSheetMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
                      <button
                        onClick={async () => {
                          setIsBottomSheetMenuOpen(false);
                          await handleDeleteEvent(selectedEventData);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 rounded-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Event
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Close button - hides the drawer */}
                <button
                  onClick={requestCloseBottomSheet}
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Minimized View - Customer Card Only */}
            {bottomSheetState === 'minimized' && (
              <div
                className="px-4 pb-4 cursor-pointer overflow-x-hidden"
                style={{ width: '100%', maxWidth: '100%' }}
                onClick={() => setBottomSheetState('full')}
              >
                <div className="pt-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Event Details</h3>
                  {(selectedEventData?.customerName || selectedEventData?.customerPhone || selectedEventData?.customerAddress) ? (
                    <div
                      className="bg-gray-50 rounded-xl p-4 border"
                      style={{ borderColor: '#E2E2DD' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-8">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-base">
                              {selectedEventData.customerName || 'Unnamed Customer'}
                            </h4>
                            {selectedEventData.customerPhone && (
                              <span className="text-sm text-gray-600 ml-2">
                                {formatPhoneDisplay(selectedEventData.customerPhone)}
                              </span>
                            )}
                          </div>
                          {selectedEventData.customerAddress && (
                            <p className="text-sm text-gray-600">
                              {selectedEventData.customerAddress}
                            </p>
                          )}
                        </div>
                        {selectedEventData.customerPhone && (
                          <div className="flex flex-col gap-2">
                            <a
                              href={`tel:${getPhoneHref(selectedEventData.customerPhone)}`}
                              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                              aria-label="Call customer"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 5.5A2.5 2.5 0 014.5 3h2a2.5 2.5 0 012.5 2.5v1.1c0 .5-.2 1-.6 1.4l-1 1a14.7 14.7 0 006.2 6.2l1-1c.4-.4.9-.6 1.4-.6h1.1A2.5 2.5 0 0121 16.5v2A2.5 2.5 0 0118.5 21h-.6C9 21 2 14 2 5.1V5.5z" />
                              </svg>
                            </a>
                            <a
                              href={`sms:${getPhoneHref(selectedEventData.customerPhone)}`}
                              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                              aria-label="Message customer"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h8m-8 4h5m7-10a2 2 0 00-2-2H6a2 2 0 00-2 2v12l4-3h10a2 2 0 002-2V4z" />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No customer information available</div>
                  )}
                </div>
              </div>
            )}

            {/* Content */}
            {bottomSheetState === 'full' && (
              <>
                <div
                  className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24"
                  style={{
                    maxHeight: 'calc(85vh - 80px)',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                  }}
                >
                  {selectedEventData && isEditingEvent && (
                    <EventEditForm
                      ref={mobileEventEditFormRef}
                      event={selectedEventData}
                      resources={resources}
                      onDirtyChange={(isDirty) => setIsEditFormDirty(isDirty)}
                      onRequestDiscard={() => setShowDiscardModal(true)}
                      onEditCustomer={() => {
                        // Set up customer data for editing
                        setEditingCustomerData({
                          customerName: selectedEventData.customerName || '',
                          customerPhone: selectedEventData.customerPhone || '',
                          customerAddress: selectedEventData.customerAddress || '',
                          customerType: selectedEventData.customerType || ''
                        });
                        setIsEditingCustomer(true);
                        setIsNewCustomerModalOpen(true);
                      }}
                      onSave={async (updatedData: any) => {
                        try {
                          const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedData),
                          });

                          if (response.ok) {
                            const result = await response.json();
                            fetchCalendarEvents();
                            setIsEditFormDirty(false);

                            const serverEvent = result?.event || null;
                            if (serverEvent) {
                              setSelectedEventData(serverEvent);
                              
                              const eventServicesList = Array.isArray(serverEvent.services) ? serverEvent.services : serverEvent.services ? [serverEvent.services] : [];
                              if (eventServicesList.length > 0) {
                                const matchedItems: Array<{ id: string; name: string; type: 'service' | 'bundle' }> = eventServicesList
                                  .map((serviceName: string) => {
                                    const service = availableServices.find((s: any) => s.name === serviceName);
                                    if (service) {
                                      return { id: service.id, name: service.name, type: 'service' as const };
                                    }
                                    const bundle = availableBundles.find((b: any) => b.name === serviceName);
                                    if (bundle) {
                                      return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                                    }
                                    return { id: `temp-${serviceName}`, name: serviceName, type: 'service' as const };
                                  })
                                  .filter((s) => s !== null);
                                setSelectedServices(matchedItems);
                              } else {
                                setSelectedServices([]);
                              }

                              if (serverEvent.vehicles && Array.isArray(serverEvent.vehicles)) {
                                setEventVehicles(serverEvent.vehicles.map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v })));
                              } else if (serverEvent.vehicleModel) {
                                setEventVehicles([{ id: 'vehicle-0', model: serverEvent.vehicleModel }]);
                              } else {
                                setEventVehicles([]);
                              }
                            } else {
                              let updatedEventData = { ...selectedEventData, ...updatedData };
                              
                              if (updatedData.startDate) {
                                updatedEventData.start = updatedData.startDate;
                              }
                              if (updatedData.endDate) {
                                updatedEventData.end = updatedData.endDate;
                              } else if (updatedData.startDate) {
                                updatedEventData.end = updatedData.startDate;
                              }
                              
                              if (updatedData.time !== undefined) {
                                updatedEventData.time = updatedData.time;
                              }
                              
                              setSelectedEventData(updatedEventData);
                            }
                          } else {
                            const error = await response.json();
                            console.error('Failed to update event:', error.error);
                          }
                        } catch (error) {
                          console.error('Error updating event:', error);
                        }
                      }}
                      onCancel={() => {
                        // onCancel is called after user confirms discard in modal
                        // Hide the bottom sheet
                        closeBottomSheet({ resetEditFormData: true });
                      }}
                    />
                  )}
                </div>

                {/* Fixed Action Buttons - Mobile Bottom Sheet - Only in full state */}
                {selectedEventData && isEditingEvent && (
                  <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                    <div className="flex gap-3">
                      <button
                        onClick={requestCloseBottomSheet}
                        className="flex-1 px-6 py-2 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                        style={{ borderColor: '#E2E2DD' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (mobileEventEditFormRef.current) {
                            mobileEventEditFormRef.current.handleSubmit();
                          } else {
                            console.error('Mobile EventEditForm ref is not set');
                          }
                        }}
                        className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckIcon className="w-5 h-5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          )}
          {/* Employee Filter Dropdown - Mobile */}
          {isTeamDropdownOpen && (
            <>
              {/* Backdrop overlay - closes on tap */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsTeamDropdownOpen(false)}
              />
              <div
                ref={mobileTeamDropdownRef}
                className="fixed right-6 bg-white z-40 rounded-2xl shadow-2xl overflow-hidden"
                style={{ bottom: 'calc(5.5rem + 3.5rem + 0.75rem)', width: 'calc(100vw - 3rem)', maxWidth: '400px', maxHeight: 'calc(85vh - 8rem)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-4 flex flex-col" style={{ gap: '12px' }}>
                  {teamEmployees.map((employee) => {
                    // If no technicians selected, all are considered selected (showing all)
                    const isSelected = selectedTechnicians.length === 0 || selectedTechnicians.includes(employee.id);
                    return (
                      <button
                        key={employee.id}
                        onClick={() => {
                          if (isSelected) {
                            // If currently selected, deselect it
                            const newSelection = selectedTechnicians.filter(id => id !== employee.id);
                            setSelectedTechnicians(newSelection);
                          } else {
                            // If not selected, add it to selection
                            setSelectedTechnicians([...selectedTechnicians, employee.id]);
                          }
                        }}
                        className="w-full px-4 py-2 text-sm font-medium transition-colors text-left flex items-center gap-3 bg-transparent hover:bg-gray-50"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getEmployeeBadgeClass(employee.color)}`}>
                          <span className="font-semibold text-xs">
                            {getEmployeeInitials(employee.name)}
                          </span>
                        </div>
                        <span className="text-gray-900">{employee.name}</span>
                        {isSelected && (
                          <CheckIcon className="w-5 h-5 ml-auto text-black" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
        )}
        {deleteToastPortal}
        </div>
    );
  }
  }

  return (
    <div className="bg-white h-full flex flex-col overflow-hidden w-full max-w-full min-w-0" style={{ position: 'relative', height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0 pr-24">
            <div className="flex items-center space-x-2 relative">
                <button 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="p-2 rounded-md hover:bg-gray-100"
                >
                <h2 className="text-xl font-semibold text-gray-700">
                    {renderHeaderDate()}
                </h2>
                </button>
                <div className="relative flex items-center gap-2 overflow-hidden" ref={teamDropdownRef}>
                  <button
                    onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 rounded-full transition-colors flex items-center gap-1 flex-shrink-0"
                    style={{
                      backgroundColor: '#F3F4F6',
                      border: '1px solid #E2E2DD',
                      borderRadius: '9999px'
                    }}
                  >
                    Team
                    {!isTeamDropdownOpen && <ChevronRightIcon className="w-4 h-4 transition-transform duration-300" />}
                  </button>
                  
                  {/* Team Tags - shown to the right of Team button with slide animation */}
                  {teamEmployees.length > 0 && (
                    <div 
                      className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${
                        isTeamDropdownOpen 
                          ? 'opacity-100 translate-x-0 max-w-[1000px]' 
                          : 'opacity-0 -translate-x-4 max-w-0 pointer-events-none'
                      }`}
                      style={{
                        transitionProperty: 'opacity, transform, max-width',
                      }}
                    >
                      {/* All tag */}
                      <button
                        onClick={() => {
                          setSelectedTechnicians([]);
                          setIsTeamDropdownOpen(false);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex-shrink-0 whitespace-nowrap ${
                          selectedTechnicians.length === 0
                            ? 'bg-gray-700 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        All
                      </button>
                      {/* Technician tags */}
                      {teamEmployees.map((employee, index) => {
                        const isSelected = selectedTechnicians.includes(employee.id);
                        return (
                          <button
                            key={employee.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTechnicians(selectedTechnicians.filter(id => id !== employee.id));
                              } else {
                                setSelectedTechnicians([...selectedTechnicians, employee.id]);
                              }
                              // Keep dropdown open so user can select multiple
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex-shrink-0 whitespace-nowrap ${
                              isSelected
                                ? 'bg-gray-700 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            style={{
                              transitionDelay: isTeamDropdownOpen ? `${index * 30}ms` : '0ms',
                            }}
                          >
                            {employee.name}
                          </button>
                        );
                      })}
                      {/* Left arrow at the end when open */}
                      <button
                        onClick={() => setIsTeamDropdownOpen(false)}
                        className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Legacy Team Dropdown - keeping for now but can be removed */}
                  {false && isTeamDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[320px] max-w-md max-h-[500px] overflow-y-auto">
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                          Team - {format(currentDate, 'EEEE, MMMM d, yyyy')}
                        </h3>
                        {isLoadingEmployees ? (
                          <div className="text-sm text-gray-500 py-4">Loading employees...</div>
                        ) : teamEmployees.length === 0 ? (
                          <div className="text-sm text-gray-500 py-4">No employees found</div>
                        ) : (
                          <div className="space-y-3">
                            {teamEmployees.map((employee: any) => {
                              // Filter events for the selected date
                              const selectedDateStr = format(currentDate, 'yyyy-MM-dd');
                              const dayEvents = bookings.filter((event: any) => {
                                const eventDate = getEventDateString(event);
                                return eventDate === selectedDateStr;
                              });

                              // For now, show all events for the day since there's no direct employee-event link
                              // In the future, we can add employeeId to events or link employees to resources
                              // For now, we'll show events that might be assigned to this employee
                              // This is a placeholder - you may want to add employeeId to events later
                              const employeeEvents = dayEvents; // Show all events for now

                              return (
                                <div key={employee.id} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getEmployeeBadgeClass(employee.color)}`}>
                                      <span className="font-semibold text-sm">
                                        {getEmployeeInitials(employee.name)}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {employee.name}
                                      </div>
                                      {employee.email && (
                                        <div className="text-xs text-gray-500 truncate">
                                          {employee.email}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {employeeEvents.length > 0 ? (
                                    <div className="ml-13 space-y-1">
                                      {employeeEvents.map((event: any) => {
                                        const resource = event.resourceId ? resources.find(r => r.id === event.resourceId) : null;
                                        return (
                                          <div 
                                            key={event.id} 
                                            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700"
                                          >
                                            {typeof event.start === 'string' && event.start.includes('T') ? (
                                              <span className="font-medium">{format(parseISO(event.start), 'h:mm a')}</span>
                                            ) : event.start instanceof Date ? (
                                              <span className="font-medium">{format(event.start, 'h:mm a')}</span>
                                            ) : null}
                                            {typeof event.start === 'string' && event.start.includes('T') ? ' - ' : event.start instanceof Date ? ' - ' : ''}
                                            <span>{event.title || event.eventName || 'Untitled Event'}</span>
                                            {resource && (
                                              <span className="ml-1 text-gray-500">
                                                ({resource.name})
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="ml-13 text-xs text-gray-400 italic">
                                      No jobs scheduled
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Mini Calendar Popup */}
                {isDatePickerOpen && (
                  <div ref={datePickerRef} className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] p-4" style={{ minWidth: '280px' }}>
                    <div className="flex items-center justify-between mb-4">
                <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="p-1 rounded hover:bg-gray-100"
                >
                        <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                </button>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {format(currentDate, 'MMMM yyyy')}
                      </h3>
                      <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before month starts */}
                      {Array(getDay(startOfMonth(currentDate))).fill(null).map((_, index) => (
                        <div key={`empty-${index}`} className="p-2"></div>
                      ))}
                      
                      {/* Days of the month */}
                      {Array(getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())).fill(null).map((_, index) => {
                        const day = index + 1;
                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const isTodayDate = isToday(date);
                        const isSelected = isSameDay(date, currentDate);
                        
                        return (
                          <button
                            key={day}
                            onClick={() => {
                              setCurrentDate(date);
                              setIsDatePickerOpen(false);
                            }}
                            className={`text-xs p-2 rounded hover:bg-gray-100 transition-colors ${
                              isSelected
                                ? 'bg-black text-white'
                                : isTodayDate
                                ? 'bg-gray-200 text-gray-900 font-semibold'
                                : 'text-gray-700'
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
            <div className="flex items-center space-x-4">
                {/* Custom Days Dropdown - show when custom days selected, or as option next to week */}
                <div className="relative" ref={viewDropdownRef}>
                    {(typeof viewMode === 'number' || viewMode === 'week') && (
                        <>
                            {typeof viewMode === 'number' ? (
                         <button 
                                    onClick={() => {
                                        setIsViewDropdownOpen(!isViewDropdownOpen);
                                        setIsDaysSubmenuOpen(false);
                                    }}
                                    className="px-3 py-1 text-sm font-medium text-gray-800 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-1"
                                    style={{ 
                                        backgroundColor: '#F8F8F7',
                                        border: '1px solid #E2E2DD',
                                        borderRadius: '9999px'
                                    }}
                                >
                                    {`${viewMode} days`}
                                    <ChevronDownIcon className="w-4 h-4" />
                        </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setIsViewDropdownOpen(!isViewDropdownOpen);
                                        setIsDaysSubmenuOpen(false);
                                    }}
                                    className="px-3 py-1 text-sm font-medium text-gray-800 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-1"
                                    style={{ 
                                        backgroundColor: '#F8F8F7',
                                        border: '1px solid #E2E2DD',
                                        borderRadius: '9999px'
                                    }}
                                    title="Custom days"
                                >
                                    <span>7 days</span>
                                    <ChevronDownIcon className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}
                    {isViewDropdownOpen && (
                        <div 
                            className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-[100] min-w-[140px]"
                            style={{ backgroundColor: '#2B2B26', borderRadius: '8px' }}
                        >
                            <div className="py-1">
                                {[2, 3, 4, 5, 6, 7].map((days) => (
                                    <button
                                        key={days}
                                        onClick={() => {
                                            setViewMode(days);
                                            setNumberOfDays(days);
                                            setIsViewDropdownOpen(false);
                                        }}
                                        className="w-full text-left py-2 text-sm text-white hover:bg-opacity-80 transition-colors flex items-center"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            paddingLeft: '20px',
                                            paddingRight: '16px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#40403A';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <span className="flex items-center gap-2 justify-between w-full">
                                            <span>{days} days</span>
                                            {viewMode === days && <CheckIcon className="w-4 h-4" />}
                                        </span>
                        </button>
                    ))}
                </div>
                        </div>
                    )}
                </div>
                {/* Add Event Button (Month View Only) */}
                {viewMode === 'month' && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors mr-2"
                    style={{ backgroundColor: '#1f2a38' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a3644'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1f2a38'}
                    aria-label="Add event"
                  >
                    <PlusIcon className="w-5 h-5 text-white" />
                  </button>
                )}
                {/* View Mode Toggle Buttons */}
                <div className="flex items-center bg-gray-100 rounded-full p-1">
                    {(['day', 'week', 'month'] as const).map(view => {
                        const isActive = typeof viewMode === 'string' 
                            ? viewMode === view 
                            : view === 'week' && typeof viewMode === 'number';
                        return (
                <button
                                key={view}
                  onClick={() => {
                                    setViewMode(view);
                                    if (view === 'week') {
                                        setNumberOfDays(7);
                                    } else {
                                        setNumberOfDays(null);
                                    }
                                }}
                                className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
                                    isActive
                                        ? 'bg-white text-gray-800 shadow' 
                                        : 'text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {view}
                </button>
                        );
                    })}
                </div>
                <button
                  onClick={() => {
                    setCurrentDate(new Date());
                    setIsDatePickerOpen(false);
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                        style={{
                    backgroundColor: '#F8F8F7', 
                    boxShadow: 'none', 
                    borderRadius: '9999px',
                    border: '1px solid #E2E2DD'
                  }}
                >
                  Today
                </button>
                {/* Navigation Arrows */}
                <div className="flex items-center space-x-1">
                    <button onClick={handlePrev} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <button onClick={handleNext} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>
        </div>
        
        <div 
          className={`flex-1 min-h-0 ${viewMode === 'month' ? 'min-w-0 overflow-hidden' : viewMode === 'week' || typeof viewMode === 'number' ? 'min-w-0 overflow-hidden' : 'min-w-0'} ${isActionSidebarOpen && viewMode !== 'week' && typeof viewMode !== 'number' ? 'pr-0 md:pr-[400px] lg:pr-[420px]' : !isActionSidebarOpen ? 'pr-16' : 'pr-0'}`}
          style={{ 
            transition: (viewMode === 'week' || typeof viewMode === 'number') ? 'none' : 'padding-right 0.3s ease-in-out', 
            flex: 1,
            minHeight: 0,
            overflow: (viewMode === 'week' || typeof viewMode === 'number') ? 'hidden' : undefined,
            position: 'relative'
          }}
        >
          {isLoadingEvents ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600">Loading calendar events...</div>
            </div>
          ) : (
            <>
              {viewMode === 'month' && <MonthView 
                date={currentDate} 
                events={filteredBookings} 
                selectedEvent={selectedEvent} 
                onEventClick={handleEventClick} 
                scale={calendarScale} 
                resources={resources.length > 0 ? resources : [{ id: 'station', name: 'Station', type: 'bay' }]}
                onDateNumberClick={(day) => {
                  setCurrentDate(day);
                  setViewMode('week');
                }}
                onDayClick={(day, dayEvents) => {
                  setSelectedDay(day);
                  setSelectedDayEvents(dayEvents);
                  setIsActionSidebarOpen(true);
                  setSelectedEventData(null);
                  setSelectedEvent(null);
                  setIsEditingEvent(false);
                }}
                onOpenModal={(draft) => {
                  // Check for unsaved changes in edit form
                  if (isEditingEvent && isEditFormDirty) {
                    // Store the draft event to open after discard confirmation
                    if (draft) {
                      setPendingDraftEvent(draft);
                    } else {
                      setPendingDraftEvent(null);
                    }
                    // Show discard modal
                    setShowDiscardModal(true);
                  } else {
                    // No unsaved changes, proceed with opening modal
                    if (draft) {
                      setDraftEvent({
                        resourceId: draft.resourceId,
                        startTime: draft.startTime,
                        endTime: draft.endTime,
                        date: draft.date
                      });
                    }
                    setIsModalOpen(true);
                  }
                }}
                onViewDay={(day) => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
              />}
              {(viewMode === 'week' || typeof viewMode === 'number') && <WeekView 
                date={currentDate} 
                events={filteredBookings} 
                onEventClick={handleEventClick} 
                resources={resources.length > 0 ? resources : [{ id: 'station', name: 'Station', type: 'bay' }]} 
                scale={calendarScale} 
                businessHours={businessHours}
                onDayHeaderClick={(day) => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
                onResourceSelect={setSelectedResource}
                onOpenModal={(draft) => {
                  if (draft) {
                    setDraftEvent({
                      resourceId: draft.resourceId,
                      startTime: draft.startTime,
                      endTime: draft.endTime,
                      date: draft.date
                    });
                  }
                  setIsModalOpen(true);
                }}
                draftEvent={draftEvent ? {
                  resourceId: draftEvent.resourceId,
                  startTime: draftEvent.startTime,
                  endTime: draftEvent.endTime,
                  date: draftEvent.date || currentDate
                } : null}
                onDraftEventUpdate={(updatedDraft) => {
                  setDraftEvent({
                    resourceId: updatedDraft.resourceId,
                    startTime: updatedDraft.startTime,
                    endTime: updatedDraft.endTime,
                    date: updatedDraft.date
                  });
                }}
                numberOfDays={typeof viewMode === 'number' ? viewMode : null}
              />}
              {viewMode === 'day' && (
                <DayView 
                  date={currentDate} 
                  events={filteredBookings} 
                  resources={resources.length > 0 ? resources : [
                    { id: 'default-bay-1', name: 'Bay 1', type: 'bay' },
                    { id: 'default-bay-2', name: 'Bay 2', type: 'bay' },
                    { id: 'default-van-1', name: 'Van 1', type: 'van' }
                  ]}
                  onEventClick={handleEventClick}
                  onResourceSelect={setSelectedResource}
                  businessHours={businessHours}
                  onEventDrop={handleEventDrop}
                  scrollToTime={scrollToTime}
                  isMobile={isMobile}
                  onOpenModal={(draft) => {
                    // Check for unsaved changes in edit form
                    if (isEditingEvent && isEditFormDirty) {
                      // Store the draft event to open after discard confirmation
                      if (draft) {
                        setPendingDraftEvent(draft);
                      } else {
                        setPendingDraftEvent(null);
                      }
                      // Show discard modal
                      setShowDiscardModal(true);
                    } else {
                      // No unsaved changes, proceed with opening modal
                      if (draft) {
                        setDraftEvent(draft);
                      }
                      setIsModalOpen(true);
                    }
                  }}
                  draftEvent={draftEvent}
                  onDraftEventUpdate={(updatedDraft) => {
                    setDraftEvent(updatedDraft);
                  }}
                  scale={calendarScale}
                />
              )}
            </>
          )}
        </div>

        <EventModal 
            isOpen={isModalOpen}
            onClose={closeCreateSheet}
            onAddEvent={handleAddEvent}
            preSelectedResource={selectedResource}
            resources={resources.length > 0 ? resources : []}
            draftEvent={draftEvent}
            onOpenNewCustomerModal={(initialName) => {
              setNewCustomerModalInitialName(initialName);
              setIsNewCustomerModalOpen(true);
            }}
            onOpenEditCustomerModal={(customer) => {
              console.log('onOpenEditCustomerModal called in CalendarPage with:', customer);
              // Set up customer data for editing
              setEditingCustomerData({
                customerName: customer.customerName,
                customerPhone: customer.customerPhone,
                customerAddress: customer.customerAddress || '',
                customerType: customer.customerType || ''
              });
              setIsEditingCustomer(true);
              setIsNewCustomerModalOpen(true);
              console.log('State updated - isEditingCustomer:', true, 'isNewCustomerModalOpen:', true);
            }}
            onRequestClose={() => {
              setShowEventModalDiscardModal(true);
            }}
            newCustomerData={newCustomerData}
        />

        {/* Event Details Modal */}
        {eventDetailsOpen && selectedEventData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {selectedEventData.source === 'google' && (
                      <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedEventData.title || selectedEventData.eventName}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseEventDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Event Details */}
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.allDay 
                        ? format(parseISO(selectedEventData.start), 'EEEE, MMMM d, yyyy')
                        : `${format(parseISO(selectedEventData.start), 'EEEE, MMMM d • h:mm a')} - ${format(parseISO(selectedEventData.end || selectedEventData.start), 'h:mm a')}`
                      }
                    </span>
                  </div>

                  {/* Event Type */}
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.allDay ? 'All-day event' : 'Timed event'}
                    </span>
                  </div>

                  {/* Source */}
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.source === 'google' ? 'Google Calendar' : 'Local event'}
                    </span>
                  </div>

                  {/* Description if available */}
                  {selectedEventData.description && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{selectedEventData.description}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseEventDetails}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                  
                  {/* Show delete button for local events */}
                  {(selectedEventData.source === 'local' || selectedEventData.source === 'local-google-synced') && (
                    <button
                      onClick={() => handleDeleteEvent(selectedEventData)}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                    >
                      Delete Event
                    </button>
                  )}
                  
                  {/* Show Google Calendar button for Google events */}
                  {selectedEventData.source === 'google' && (
                    <button
                      onClick={() => window.open('https://calendar.google.com', '_blank')}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Open in Google Calendar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Sidebar Backdrop - removed blur and shadow per user request */}
        {/* Click-outside functionality is handled by the useEffect hook */}
        
        {/* Modal Backdrop - removed blur and shadow per user request */}
        {/* Note: Events have z-index 20, so they'll be above this backdrop (z-45) and clickable */}
        {/* Backdrop removed - no blur or shadow outside Create Event modal */}

        {/* Discard Changes Modal - Rendered at top level to appear centered on screen */}
        <DiscardChangesModal
          isOpen={showDiscardModal}
          onKeepEditing={(e) => {
            // Stop any event propagation to prevent click outside handlers
            if (e) {
              e.stopPropagation();
              e.preventDefault();
            }
            // Just close the modal, keep everything else as is
            // The sidebar and edit state should remain as they were
            setShowDiscardModal(false);
            // Clear any pending draft event since user chose to keep editing
            setPendingDraftEvent(null);
          }}
          onDiscard={() => {
            const wasEditing = isEditingEvent;
            setShowDiscardModal(false);
            setIsEditingEvent(false);
            setIsEditFormDirty(false);
            
            // If there's a pending draft event (from clicking empty space while editing), open it now
            if (pendingDraftEvent) {
              setDraftEvent(pendingDraftEvent);
              setIsModalOpen(true);
              setPendingDraftEvent(null);
            }
            
            // If closing from edit form cancel, just exit edit mode
            // If closing from sidebar X, close the sidebar
            // On mobile, close the bottom sheet
            if (!wasEditing && !pendingDraftEvent) {
              setIsActionSidebarOpen(false);
              setSelectedEventData(null);
              setSelectedEvent(null);
              setShowCustomerDetailsPopup(false);
            } else if (wasEditing && isMobile) {
              // On mobile, if discarding from edit form, animate slide down then close
              setBottomSheetState('hidden');
              setTimeout(() => {
                setSelectedEventData(null);
                setSelectedEvent(null);
                setIsActionSidebarOpen(false);
              }, 300); // Wait for animation to complete
            }
          }}
          isCreating={false}
        />
        
        {/* Discard Changes Modal for Create Event Panel */}
        <DiscardChangesModal
          isOpen={showEventModalDiscardModal}
          onKeepEditing={(e) => {
            // Stop any event propagation to prevent click outside handlers
            if (e) {
              e.stopPropagation();
              e.preventDefault();
            }
            // Just close the modal, keep EventModal open
            setShowEventModalDiscardModal(false);
          }}
          onDiscard={() => {
            setShowEventModalDiscardModal(false);
            closeCreateSheet();
          }}
          isCreating={true}
        />
        
        {/* Manual QA (sidebar):
            - Open event in day/week: read-only display, no edit icons or dropdowns.
            - Click Edit Event: fields editable and services remain selected.
            - Edit notes/services, Save: values persist in view mode.
            - Cancel edit: returns to view mode without changes. */}
        {/* Action Sidebar */}
        <div 
          ref={actionSidebarRef}
          className={`fixed top-0 right-0 h-full w-full md:w-[400px] lg:w-[420px] z-[90] transform transition-transform duration-300 ease-in-out ${
            isActionSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`} style={{ 
            backgroundColor: '#F8F8F7', 
            borderLeft: (viewMode === 'week' || typeof viewMode === 'number') ? 'none' : '1px solid #E2E2DD', 
            boxShadow: 'none' 
          }}>
          <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#F8F8F7' }}>
            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ backgroundColor: '#E2E2DD' }}>
                    <Image 
                      src="/icons/layouting.png" 
                      alt="Event Details" 
                      width={20} 
                      height={20}
                      className="object-contain"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2" style={{ borderColor: '#F8F8F7' }}></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      {viewMode === 'month' && selectedDay && !selectedEventData 
                        ? format(selectedDay, 'MMMM d, yyyy')
                        : 'Event Details'}
                    </h2>
                    {selectedEventData?.resourceId && (() => {
                      const resource = resources.find(r => r.id === selectedEventData.resourceId);
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-gray-700" style={{ backgroundColor: '#E2E2DD' }}>
                          {resource?.type === 'bay' ? (
                            <Image src="/icons/bay.svg" alt="Bay" width={12} height={12} className="object-contain" />
                          ) : (
                            <Image src="/icons/van.svg" alt="Van" width={12} height={12} className="object-contain" />
                          )}
                          {resource?.name || 'Unknown'}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (isEditingEvent && isEditFormDirty) {
                      setShowDiscardModal(true);
                    } else {
                      setIsActionSidebarOpen(false);
                      setSelectedEventData(null);
                      setSelectedEvent(null);
                      setIsEditingEvent(false);
                      setShowCustomerDetailsPopup(false);
                      setSelectedDay(null);
                      setSelectedDayEvents([]);
                    }
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content - Show event details if event is selected, otherwise show selected day's events (month view) or today's events */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedEventData ? (
                isEditingEvent ? (
                  // Show edit form
                  <div className="px-6 pt-6 pb-24">
                  <EventEditForm
                    ref={eventEditFormRef}
                    event={selectedEventData}
                    resources={resources}
                    onDirtyChange={(isDirty) => setIsEditFormDirty(isDirty)}
                    onRequestDiscard={() => setShowDiscardModal(true)}
                    onEditCustomer={() => {
                      // Set up customer data for editing
                      setEditingCustomerData({
                        customerName: selectedEventData.customerName || '',
                        customerPhone: selectedEventData.customerPhone || '',
                        customerAddress: selectedEventData.customerAddress || '',
                        customerType: selectedEventData.customerType || ''
                      });
                      setIsEditingCustomer(true);
                      setIsNewCustomerModalOpen(true);
                    }}
                    onSave={async (updatedData: any) => {
                      try {
                        const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(updatedData),
                        });

                        if (response.ok) {
                          const result = await response.json();
                          fetchCalendarEvents();
                          setIsEditingEvent(false);
                          setIsEditFormDirty(false);

                          const serverEvent = result?.event || null;
                          if (serverEvent) {
                            setSelectedEventData(serverEvent);
                            
                            // Refresh services from server response to keep selection in sync
                            const eventServicesList = Array.isArray(serverEvent.services) ? serverEvent.services : serverEvent.services ? [serverEvent.services] : [];
                            if (eventServicesList.length > 0) {
                              const matchedItems: Array<{ id: string; name: string; type: 'service' | 'bundle' }> = eventServicesList
                                .map((serviceName: string) => {
                                  const service = availableServices.find((s: any) => s.name === serviceName);
                                  if (service) {
                                    return { id: service.id, name: service.name, type: 'service' as const };
                                  }
                                  const bundle = availableBundles.find((b: any) => b.name === serviceName);
                                  if (bundle) {
                                    return { id: bundle.id, name: bundle.name, type: 'bundle' as const };
                                  }
                                  return { id: `temp-${serviceName}`, name: serviceName, type: 'service' as const };
                                })
                                .filter((s) => s !== null);
                              setSelectedServices(matchedItems);
                            } else {
                              setSelectedServices([]);
                            }

                            // Refresh vehicles from server response
                            if (serverEvent.vehicles && Array.isArray(serverEvent.vehicles)) {
                              setEventVehicles(serverEvent.vehicles.map((v: string, idx: number) => ({ id: `vehicle-${idx}`, model: v })));
                            } else if (serverEvent.vehicleModel) {
                              setEventVehicles([{ id: 'vehicle-0', model: serverEvent.vehicleModel }]);
                            } else {
                              setEventVehicles([]);
                            }
                          } else {
                            // Fallback to local data if server response is missing
                            let updatedEventData = { ...selectedEventData, ...updatedData };
                            
                            if (updatedData.startDate) {
                              updatedEventData.start = updatedData.startDate;
                            }
                            if (updatedData.endDate) {
                              updatedEventData.end = updatedData.endDate;
                            } else if (updatedData.startDate) {
                              updatedEventData.end = updatedData.startDate;
                            }
                            
                            if (updatedData.time !== undefined) {
                              updatedEventData.time = updatedData.time;
                            }
                            
                            setSelectedEventData(updatedEventData);
                          }
                        } else {
                          const error = await response.json();
                          console.error('Failed to update event:', error.error);
                        }
                      } catch (error) {
                        console.error('Error updating event:', error);
                      }
                    }}
                    onCancel={() => {
                      // onCancel is called after user confirms discard in modal
                      setIsEditingEvent(false);
                      setIsEditFormDirty(false);
                      setEditFormData(null);
                    }}
                  />
                  </div>
                ) : (
                  // Show selected event details
                  <div className="p-6">
                    <div className="space-y-3">
                      {/* Customer Information */}
                      <div className="pt-2">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer</h3>
                    {(selectedEventData.customerName || selectedEventData.customerPhone || selectedEventData.customerAddress) ? (
                      <div 
                        ref={eventDetailsCustomerCardRef}
                        className="bg-gray-50 rounded-xl p-4 border relative" 
                        style={{ borderColor: '#E2E2DD' }}
                      >
                        <div 
                          className="hover:bg-gray-100 -m-2 p-2 rounded-lg transition-colors"
                          onMouseEnter={() => {
                            if (customerPopupTimeoutRef.current) {
                              clearTimeout(customerPopupTimeoutRef.current);
                              customerPopupTimeoutRef.current = null;
                            }
                            
                            if (eventDetailsCustomerCardRef.current) {
                              const rect = eventDetailsCustomerCardRef.current.getBoundingClientRect();
                              const actionPanelWidth = 400;
                              const gap = 4;
                              
                              setCustomerPopupPosition({
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
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-base">
                              {selectedEventData.customerName || 'Unnamed Customer'}
                            </h4>
                            {selectedEventData.customerPhone && (
                              <span className="text-sm text-gray-600 ml-2">
                                {formatPhoneDisplay(selectedEventData.customerPhone)}
                              </span>
                            )}
                          </div>
                        
                          {selectedEventData.customerAddress && (
                            <p className="text-sm text-gray-600 mb-3">
                              {selectedEventData.customerAddress}
                            </p>
                          )}
                        
                          {customerPastJobs && customerPastJobs.length > 0 && (
                            <div className="mt-3">
                              <p className="font-semibold text-sm text-gray-900 mb-1">
                                {customerPastJobs.length} Past {customerPastJobs.length === 1 ? 'job' : 'jobs'}
                              </p>
                              {customerPastJobs[0] && customerPastJobs[0].date && (
                                <p className="text-sm text-gray-600">
                                  Last detail: {(() => {
                                    try {
                                      const date = new Date(customerPastJobs[0].date);
                                      if (isNaN(date.getTime())) return 'Date unavailable';
                                      return format(date, 'MMMM d, yyyy');
                                    } catch (e) {
                                      return 'Date unavailable';
                                    }
                                  })()}
                                  {customerPastJobs[0].services && customerPastJobs[0].services.length > 0 && (
                                    <span>, {Array.isArray(customerPastJobs[0].services) ? customerPastJobs[0].services.join(' + ') : customerPastJobs[0].services}</span>
                                  )}
                                  {customerPastJobs[0].vehicleModel && (
                                    <span> on a {customerPastJobs[0].vehicleModel}</span>
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No customer information available</div>
                    )}
                  </div>

                  {/* Customer Details Popup - appears outside action panel, adjacent to customer box */}
                  {showCustomerDetailsPopup && selectedEventData && customerPopupPosition && (
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
                          right: `${customerPopupPosition.right}px`,
                          top: `${customerPopupPosition.top}px`,
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
                                      {selectedEventData.customerName || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                                    <p className="text-sm text-gray-900 mt-0.5">
                                      {selectedEventData.customerPhone ? formatPhoneDisplay(selectedEventData.customerPhone) : 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Email</label>
                                    <p className="text-sm text-gray-900 mt-0.5">
                                      {selectedEventData.customerEmail || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Address</label>
                                    <p className="text-sm text-gray-900 mt-0.5">
                                      {selectedEventData.customerAddress || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Arrival</label>
                                    <p className="text-sm text-gray-900 mt-0.5 capitalize">
                                      {selectedEventData.locationType || 'Not provided'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Past Jobs */}
                              {customerPastJobs && customerPastJobs.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">
                                    Past Jobs ({customerPastJobs.length})
                                  </h4>
                                  <div className="space-y-2.5">
                                    {customerPastJobs.map((job, index) => (
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

                      {selectedEventData?.eventType !== 'block' && (
                      <>
                        {/* Customer Type and Location Type */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Information</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Customer Type Tag */}
                            {selectedEventData && (() => {
                              const customerStatus = getCustomerTypeFromHistory({
                                completedServiceCount: selectedEventData.completedServiceCount,
                                lastCompletedServiceAt: selectedEventData.lastCompletedServiceAt,
                                referenceDate: selectedEventData.start || selectedEventData.date || new Date()
                              });
                              const normalizedOverride = selectedEventData.customerType
                                ? String(selectedEventData.customerType).toLowerCase()
                                : '';
                              const effectiveCustomerType = normalizedOverride || customerStatus;

                              return (
                                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${
                                  effectiveCustomerType === 'new'
                                    ? 'bg-gray-200 text-gray-700'
                                    : effectiveCustomerType === 'returning'
                                    ? 'bg-purple-200 text-purple-800'
                                    : effectiveCustomerType === 'maintenance'
                                    ? 'bg-blue-200 text-blue-800'
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {effectiveCustomerType === 'new' ? 'New Customer' : 
                                   effectiveCustomerType === 'returning' ? 'Repeat Customer' :
                                   effectiveCustomerType === 'maintenance' ? 'Maintenance Customer' :
                                   effectiveCustomerType}
                                </span>
                              );
                            })()}
                            
                            {/* Location Type Tag */}
                            {selectedEventData.locationType && (
                              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${
                                (selectedEventData.locationType?.toLowerCase() === 'pick up' || selectedEventData.locationType?.toLowerCase() === 'pickup')
                                  ? 'bg-blue-500 text-white'
                                  : (selectedEventData.locationType?.toLowerCase() === 'drop off' || selectedEventData.locationType?.toLowerCase() === 'dropoff')
                                  ? 'bg-pink-500 text-white'
                                  : 'bg-gray-200 text-gray-700'
                              }`}>
                                {selectedEventData.locationType?.toLowerCase() === 'pickup' ? 'Pick Up' : 
                                 selectedEventData.locationType?.toLowerCase() === 'dropoff' ? 'Drop Off' :
                                 selectedEventData.locationType?.toLowerCase() === 'pick up' ? 'Pick Up' :
                                 selectedEventData.locationType?.toLowerCase() === 'drop off' ? 'Drop Off' :
                                 selectedEventData.locationType}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vehicle Information (Car Model) */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-4">Car model</h3>
                          {eventVehicles.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {eventVehicles.map((vehicle) => (
                                <div
                                  key={vehicle.id}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-white text-sm font-medium"
                                >
                                  <span>{vehicle.model}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No car model provided</div>
                          )}
                        </div>

                        {/* Services (Job Details) */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Details</h3>
                          {selectedServices.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {selectedServices.map((item) => (
                                <div
                                  key={`${item.type}-${item.id}`}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-white text-sm font-medium"
                                >
                                  <span>{item.name}</span>
                                  {item.type === 'bundle' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white">Bundle</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No services selected</div>
                          )}
                        </div>
                      </>
                      )}

                      {/* Date and Time (Scheduling) */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Scheduling</h3>
                    {(selectedEventData.date || selectedEventData.start) && (() => {
                      // Helper function to format a date string to "Day, Month Day, Year"
                      const formatDateDisplay = (dateStr: string): string => {
                        const [year, month, day] = dateStr.split('-').map(Number);
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const utcDate = new Date(Date.UTC(year, month - 1, day));
                        const dayOfWeek = dayNames[utcDate.getUTCDay()];
                        const monthName = monthNames[month - 1];
                        return `${dayOfWeek}, ${monthName} ${day}, ${year}`;
                      };
                      
                      // Extract start date
                      let startDateStr = '';
                      if (selectedEventData.start) {
                        const eventStart = selectedEventData.start;
                        if (typeof eventStart === 'string') {
                          startDateStr = eventStart.includes('T') ? eventStart.split('T')[0] : eventStart;
                        } else {
                          const date = new Date(eventStart);
                          startDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                        }
                      } else if (selectedEventData.date) {
                        if (typeof selectedEventData.date === 'string' && selectedEventData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          startDateStr = selectedEventData.date;
                        } else {
                          const date = new Date(selectedEventData.date);
                          startDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                        }
                      }
                      
                      // Extract end date (for multi-day events)
                      let endDateStr = '';
                      if (selectedEventData.end) {
                        const eventEnd = selectedEventData.end;
                        if (typeof eventEnd === 'string') {
                          endDateStr = eventEnd.includes('T') ? eventEnd.split('T')[0] : eventEnd;
                        } else {
                          const date = new Date(eventEnd);
                          endDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                        }
                      }
                      
                      if (!startDateStr) return null;
                      
                      // Check if it's a multi-day event
                      const isMultiDay = endDateStr && startDateStr !== endDateStr;
                      
                      // Format the date(s)
                      const formattedStartDate = formatDateDisplay(startDateStr);
                      const formattedEndDate = isMultiDay ? formatDateDisplay(endDateStr) : '';
                      
                      // Format time if available (for non-all-day events)
                      let timeDisplay = '';
                      if (!selectedEventData.allDay && selectedEventData.start && selectedEventData.end) {
                        const startDate = typeof selectedEventData.start === 'string' 
                          ? parseISO(selectedEventData.start) 
                          : new Date(selectedEventData.start);
                        const endDate = typeof selectedEventData.end === 'string' 
                          ? parseISO(selectedEventData.end) 
                          : new Date(selectedEventData.end);
                        timeDisplay = ` @ ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
                      }
                      
                      // Combine date(s) and time
                      const dateDisplay = isMultiDay 
                        ? `${formattedStartDate} - ${formattedEndDate}`
                        : formattedStartDate;
                      
                      return (
                        <p className="text-sm text-gray-900">
                          {dateDisplay}{timeDisplay}
                        </p>
                      );
                    })()}
                  </div>

                      {/* Technician/Employee */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Technician</h3>
                    {(() => {
                      const assignedEmployee = selectedEventData.employeeId
                        ? allEmployees.find(e => e.id === selectedEventData.employeeId)
                        : null;
                      return assignedEmployee ? (
                        <div className="bg-white rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: '#E2E2DD' }}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${getEmployeeBadgeClass(assignedEmployee.color)}`}>
                            {getEmployeeInitials(assignedEmployee.name)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {assignedEmployee.name}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No technician assigned</div>
                      );
                    })()}
                  </div>
                    </div>
                  </div>
                )
              ) : (viewMode === 'month' && selectedDay) ? (
                selectedDayEvents.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 mt-8">
                    <p>No events for {format(selectedDay, 'MMMM d, yyyy')}</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="space-y-4">
                      {selectedDayEvents.map((event, index) => {
                        // Format time range
                        let timeRange = '';
                        if (event.start && event.end) {
                          const startTime = new Date(event.start);
                          const endTime = new Date(event.end);
                          const startFormatted = format(startTime, 'h:mm a');
                          const endFormatted = format(endTime, 'h:mm a');
                          timeRange = `${startFormatted} - ${endFormatted}`;
                        } else if (event.time) {
                          timeRange = event.time;
                        }
                        
                        const isBlockEvent = event.eventType === 'block';
                        // Get service name
                        const serviceName = isBlockEvent
                          ? 'Blocked Time'
                          : (Array.isArray(event.services) 
                              ? event.services.join(' + ') 
                              : event.services || event.title || 'Service');
                        
                        // Get vehicle type
                        const vehicleType = isBlockEvent ? '' : (event.vehicleType || 'Vehicle');
                        
                        // Get customer info
                        const customerName = isBlockEvent ? '' : (event.customerName || 'Customer');
                        const customerPhone = isBlockEvent ? '' : (event.customerPhone || event.phone || '');
                        const addressLine = (() => {
                          const city = (event as any).customerCity || (event as any).city;
                          const rawAddress = event.customerAddress || (event as any).address;
                          if (rawAddress && city) return `${rawAddress}, ${city}`;
                          if (rawAddress) {
                            const parts = String(rawAddress)
                              .split(',')
                              .map((part) => part.trim())
                              .filter(Boolean);
                            if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
                            if (parts.length === 1) return parts[0];
                          }
                          if (city) return String(city);
                          return '';
                        })();
                        const resource = resources.find((r) => r.id === event.resourceId);
                        const stationLabel = resource?.name || 'Station';
                        const locationLower = (event.locationType || '').toLowerCase();
                        const isPickup = locationLower === 'pick up' || locationLower === 'pickup';
                        const isDropoff = locationLower === 'drop off' || locationLower === 'dropoff';
                        const customerStatus = isBlockEvent ? null : getCustomerTypeFromHistory({
                          completedServiceCount: event.completedServiceCount,
                          lastCompletedServiceAt: event.lastCompletedServiceAt,
                          referenceDate: event.start || event.date || new Date()
                        });
                        const assignedEmployee = event.employeeId
                          ? allEmployees.find((emp) => emp.id === event.employeeId)
                          : null;
                        const techColor = isBlockEvent
                          ? '#6B7280'
                          : assignedEmployee?.color === 'green'
                          ? '#10B981'
                          : assignedEmployee?.color === 'orange'
                          ? '#F97316'
                          : assignedEmployee?.color === 'red'
                          ? '#EF4444'
                          : assignedEmployee?.color === 'gray'
                          ? '#6B7280'
                          : '#3B82F6';
                        
                        return (
                          <div key={event.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" style={{ borderLeft: `4px solid ${techColor}` }}>
                            {/* Service name + Station + Tech */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isBlockEvent ? 'bg-gray-400' : 'bg-red-500'}`}></div>
                                <div>
                                  <div className="font-bold text-gray-900 text-sm">
                                    {serviceName}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {stationLabel}
                                  </div>
                                </div>
                              </div>
                              {assignedEmployee && (
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${getEmployeeBadgeClass(assignedEmployee.color)}`}
                                >
                                  {getEmployeeInitials(assignedEmployee.name)}
                                </div>
                              )}
                            </div>
                            
                            {/* Time */}
                            {timeRange && (
                              <div className="text-xs text-gray-500 mb-1 ml-4">
                                {timeRange}
                              </div>
                            )}
                            
                            {/* Vehicle */}
                            {!isBlockEvent && (
                              <div className="text-xs text-gray-500 mb-16 ml-4">
                                {vehicleType}
                              </div>
                            )}

                            {/* Tags */}
                            {!isBlockEvent && (
                              <div className="flex items-center gap-2 mb-3 ml-4">
                                {(isPickup || isDropoff) && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded inline-block ${
                                    isPickup ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                                  }`}>
                                    {isPickup ? 'Pick Up' : 'Drop Off'}
                                  </span>
                                )}
                                {customerStatus && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded inline-block ${
                                    customerStatus === 'new' ? 'bg-gray-200 text-gray-700' : 'bg-purple-200 text-purple-800'
                                  }`}>
                                    {customerStatus === 'new' ? 'New' : 'Repeat'}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Customer info and Action buttons - aligned horizontally */}
                            <div className="flex items-center justify-between ml-4">
                              {!isBlockEvent && (
                                <div className="flex flex-col">
                                  {customerPhone && (
                                    <div className="text-sm text-gray-500 mb-1">
                                      {formatPhoneDisplay(customerPhone)}
                                    </div>
                                  )}
                                  {addressLine && (
                                    <div className="text-xs text-gray-500 mb-1 truncate max-w-[220px]">
                                      {addressLine}
                                    </div>
                                  )}
                                  <div className="text-gray-900 font-semibold" style={{ fontSize: '18px' }}>
                                    {customerName}
                                  </div>
                                </div>
                              )}
                              
                              {/* Action buttons */}
                              <div className="flex gap-2 items-center">
                                <button 
                                  onClick={async () => {
                                    await handleDeleteEvent(event);
                                    setSelectedDayEvents(selectedDayEvents.filter(e => e.id !== event.id));
                                  }}
                                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                                >
                                  <XMarkIcon className="w-4 h-4 text-gray-700" />
                                </button>
                                <button 
                                  onClick={() => {
                                    // Handle edit - show event details
                                    setSelectedEventData(event);
                                    setSelectedEvent(event.id);
                                    setIsEditingEvent(false);
                                  }}
                                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                                >
                                  <PencilIcon className="w-4 h-4 text-gray-700" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : todayEvents.length === 0 ? (
                <div className="p-6 text-center text-gray-500 mt-8">
                  <p>No events for today</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {todayEvents.map((event, index) => {
                    // Format time range
                    let timeRange = '';
                    if (event.start && event.end) {
                      const startTime = new Date(event.start);
                      const endTime = new Date(event.end);
                      const startFormatted = format(startTime, 'h:mm a');
                      const endFormatted = format(endTime, 'h:mm a');
                      timeRange = `${startFormatted} - ${endFormatted}`;
                    } else if (event.time) {
                      timeRange = event.time;
                    }
                    
                    const isBlockEvent = event.eventType === 'block';
                    // Get service name
                    const serviceName = isBlockEvent
                      ? 'Blocked Time'
                      : (Array.isArray(event.services) 
                        ? event.services.join(' + ') 
                        : event.services || event.title || 'Service');
                    
                    // Get vehicle type
                    const vehicleType = isBlockEvent ? '' : (event.vehicleType || 'Vehicle');
                    
                    // Get customer info
                    const customerName = isBlockEvent ? '' : (event.customerName || 'Customer');
                    const customerPhone = isBlockEvent ? '' : (event.customerPhone || event.phone || '');
                    
                    return (
                      <div key={event.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        {/* Service name with red bullet */}
                        <div className="flex items-start gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isBlockEvent ? 'bg-gray-400' : 'bg-red-500'}`}></div>
                          <div className="font-bold text-gray-900 text-sm">
                            {serviceName}
                          </div>
                        </div>
                        
                        {/* Time */}
                        {timeRange && (
                          <div className="text-xs text-gray-500 mb-1 ml-4">
                            {timeRange}
                          </div>
                        )}
                        
                        {/* Vehicle */}
                        {!isBlockEvent && (
                          <div className="text-xs text-gray-500 mb-16 ml-4">
                            {vehicleType}
                          </div>
                        )}
                        
                        {/* Customer info and Action buttons - aligned horizontally */}
                        <div className="flex items-center justify-between ml-4">
                          {!isBlockEvent && (
                            <div className="flex flex-col">
                              {customerPhone && (
                                <div className="text-sm text-gray-500 mb-1">
                                  {formatPhoneDisplay(customerPhone)}
                                </div>
                              )}
                              <div className="text-gray-900 font-semibold" style={{ fontSize: '18px' }}>
                                {customerName}
                              </div>
                            </div>
                          )}
                          
                          {/* Action buttons */}
                          <div className="flex gap-2 items-center">
                          <button 
                            onClick={async () => {
                              await handleDeleteEvent(event);
                            }}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4 text-gray-700" />
                          </button>
                          <button 
                            onClick={() => {
                              // Handle edit
                              setSelectedEventData(event);
                              setEventDetailsOpen(true);
                            }}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors"
                          >
                            <PencilIcon className="w-4 h-4 text-gray-700" />
                          </button>
                          <button 
                            onClick={async () => {
                              // Handle accept - update booking status if it's a booking
                              if (event.bookingId && event.status === 'pending') {
                                try {
                                  const response = await fetch('/api/bookings', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      bookingId: event.bookingId,
                                      status: 'confirmed'
                                    })
                                  });

                                  if (response.ok) {
                                    fetchCalendarEvents();
                                  } else {
                                    const error = await response.json();
                                    console.error('Failed to confirm booking:', error.error);
                                  }
                                } catch (error) {
                                  console.error('Error confirming booking:', error);
                                }
                              } else if (event.status === 'pending') {
                                // For events without bookingId, just refresh (they're already created)
                                fetchCalendarEvents();
                              }
                            }}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center gap-2 transition-colors"
                          >
                            <CheckIcon className="w-4 h-4 text-white" />
                            <span className="text-white text-sm font-medium">Accept</span>
                          </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            
            {/* Payment Status + Notes sections - keep inside scrollable content */}
            {selectedEventData && !isEditingEvent && (
              <div className="p-6 pt-0 space-y-4">
                {/* Payment Status Toggle */}
                {selectedEventData.eventType !== 'block' && (
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Payment Status</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{selectedEventData.paid === true ? 'Marked as paid' : 'Marked as unpaid'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const newPaid = !(selectedEventData.paid === true);
                          // Optimistic update
                          setSelectedEventData({ ...selectedEventData, paid: newPaid });
                          // Also update events list optimistically
                          setEvents((prev: any[]) => prev.map((e: any) => e.id === selectedEventData.id ? { ...e, paid: newPaid } : e));
                          try {
                            await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ paid: newPaid }),
                            });
                            fetchCalendarEvents();
                          } catch (err) {
                            // Revert on error
                            setSelectedEventData({ ...selectedEventData, paid: !newPaid });
                            setEvents((prev: any[]) => prev.map((e: any) => e.id === selectedEventData.id ? { ...e, paid: !newPaid } : e));
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${selectedEventData.paid === true ? 'bg-orange-500' : 'bg-gray-300'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${selectedEventData.paid === true ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  </div>
                )}
                {/* Customer Notes - persistent across jobs */}
                {selectedEventData.eventType !== 'block' && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Notes</h3>
                    <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {selectedEventData.customerNotes || <span className="text-gray-400 italic">No customer notes</span>}
                    </div>
                  </div>
                )}
                {/* Event Notes - specific to this event */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {selectedEventData.eventType === 'block' ? 'Notes' : 'Event Notes'}
                  </h3>
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {getCleanDescription(selectedEventData.description) || <span className="text-gray-400 italic">{selectedEventData.eventType === 'block' ? 'No notes added' : 'No event notes'}</span>}
                  </div>
                </div>
              </div>
            )}
            </div>
            
            {/* Footer - Action Buttons (only show when viewing event details, not editing) */}
            {selectedEventData && !isEditingEvent && (
              <div className="flex-shrink-0 p-6" style={{ backgroundColor: '#F8F8F7' }}>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => handleDeleteEvent(selectedEventData)}
                    className="flex-1 px-4 py-2 bg-[#FFDDDD] hover:bg-[#FFC1C1] text-[#DE0000] rounded-xl font-medium transition-colors"
                  >
                    Delete Event
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingEvent(true);
                      // Initialize form data from selected event
                      const eventDate = selectedEventData.date || selectedEventData.start;
                      let dateStr = '';
                      if (eventDate) {
                        // Extract date part directly from ISO string to avoid timezone issues
                        if (typeof eventDate === 'string') {
                          if (eventDate.includes('T')) {
                            dateStr = eventDate.split('T')[0];
                          } else if (eventDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                            dateStr = eventDate;
                          }
                        }
                        if (!dateStr) {
                          // Fallback to formatting the date object using UTC
                          const date = new Date(eventDate);
                          const year = date.getUTCFullYear();
                          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                          const day = String(date.getUTCDate()).padStart(2, '0');
                          dateStr = `${year}-${month}-${day}`;
                        }
                      }
                      let startTimeStr = '';
                      let endTimeStr = '';
                      
                      if (selectedEventData.start && selectedEventData.end && !selectedEventData.allDay) {
                        startTimeStr = format(new Date(selectedEventData.start), 'HH:mm');
                        endTimeStr = format(new Date(selectedEventData.end), 'HH:mm');
                      } else if (selectedEventData.time) {
                        startTimeStr = selectedEventData.time;
                      }
                      
                      setEditFormData({
                        title: selectedEventData.title || selectedEventData.eventName || '',
                        color: selectedEventData.color || 'blue',
                        eventType: selectedEventData.eventType || 'appointment',
                        startDate: dateStr,
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                        isAllDay: selectedEventData.allDay || false,
                        isMultiDay: false,
                        description: selectedEventData.description || '',
                        resourceId: selectedEventData.resourceId || '',
                        customerName: selectedEventData.customerName || '',
                        customerPhone: selectedEventData.customerPhone || '',
                        customerAddress: selectedEventData.customerAddress || '',
                        vehicleModel: selectedEventData.vehicleType || selectedEventData.vehicleModel || '',
                        services: Array.isArray(selectedEventData.services) 
                          ? selectedEventData.services.join(', ') 
                          : (selectedEventData.services || ''),
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Edit Event
                  </button>
                </div>

                {/* Back button */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setSelectedEventData(null);
                      setSelectedEvent(null);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    ← Back to events list
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Action Buttons - Only show when editing event */}
          {isEditingEvent && selectedEventData && (
            <div className="flex-shrink-0 p-6 border-t border-gray-200" style={{ backgroundColor: '#F8F8F7', position: 'sticky', bottom: 0, zIndex: 10 }}>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (eventEditFormRef.current) {
                      eventEditFormRef.current.handleCancel();
                    }
                  }}
                  className="flex-1 px-6 py-2 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#E2E2DD' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (eventEditFormRef.current) {
                      eventEditFormRef.current.handleSubmit();
                    } else {
                      console.error('EventEditForm ref is not set');
                    }
                  }}
                  className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Column Sidebar - Only show when action panel is closed */}
        {!isActionSidebarOpen && (
          <div
            onClick={() => setIsActionSidebarOpen(true)}
            className="fixed right-0 top-0 h-full w-16 border-l border-gray-200 z-30 cursor-pointer transition-colors flex items-start justify-center"
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

        {/* New Customer Modal - Rendered at page level, outside action panel */}
        <NewCustomerModal
          isOpen={isNewCustomerModalOpen}
          onClose={() => {
            setIsNewCustomerModalOpen(false);
            setNewCustomerModalInitialName('');
            setIsEditingCustomer(false);
            setEditingCustomerData(null);
          }}
          onSuccess={async (customer) => {
            if (isEditingCustomer) {
              if (selectedEventData) {
                // Update the event data with edited customer information
                const updatedEventData = {
                  ...selectedEventData,
                  customerName: customer.customerName,
                  customerPhone: customer.customerPhone,
                  customerAddress: customer.address || ''
                };
                setSelectedEventData(updatedEventData);
                
                // If editing from Event Details view (not edit mode), save to database
                if (!isEditingEvent && selectedEventData.id) {
                  try {
                    const eventId = selectedEventData.id;
                    
                    // Track optimistic customer update BEFORE making API call to prevent fetchCalendarEvents from overwriting
                    optimisticCustomerUpdateRef.current = eventId;
                    
                    const response = await fetch(`/api/detailer/events/${eventId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        customerName: customer.customerName,
                        customerPhone: customer.customerPhone,
                        customerAddress: customer.address || ''
                      }),
                    });

                    if (response.ok) {
                      const responseData = await response.json();
                      console.log('Customer edit response:', responseData);
                      
                      // Use the server response to update state - this ensures we have the exact data the server saved
                      if (responseData.event) {
                        const serverEvent = responseData.event;
                        console.log('Server event customer data after edit:', {
                          customerName: serverEvent.customerName,
                          customerPhone: serverEvent.customerPhone,
                          customerAddress: serverEvent.customerAddress
                        });
                        
                        // Use server response data, fallback to customer data we sent if server data is missing
                        const finalCustomerName = serverEvent.customerName !== undefined ? serverEvent.customerName : customer.customerName;
                        const finalCustomerPhone = serverEvent.customerPhone !== undefined ? serverEvent.customerPhone : customer.customerPhone;
                        const finalCustomerAddress = serverEvent.customerAddress !== undefined ? serverEvent.customerAddress : (customer.address || '');
                        
                        const updatedEventData = {
                          ...selectedEventData,
                          customerName: finalCustomerName || null,
                          customerPhone: finalCustomerPhone || null,
                          customerAddress: finalCustomerAddress || null
                        };
                        setSelectedEventData(updatedEventData);
                        console.log('Updated selectedEventData with:', {
                          customerName: updatedEventData.customerName,
                          customerPhone: updatedEventData.customerPhone,
                          customerAddress: updatedEventData.customerAddress
                        });
                        
                        // Also update the bookings state so the calendar card reflects the change immediately
                        setBookings((prevBookings) =>
                          prevBookings.map((event: any) =>
                            event.id === eventId
                              ? {
                                  ...event,
                                  customerName: finalCustomerName || null,
                                  customerPhone: finalCustomerPhone || null,
                                  customerAddress: finalCustomerAddress || null
                                }
                              : event
                          )
                        );
                      } else {
                        console.error('No event in response after customer edit:', responseData);
                        // Fallback: use the customer data we sent
                        const updatedEventData = {
                          ...selectedEventData,
                          customerName: customer.customerName || null,
                          customerPhone: customer.customerPhone || null,
                          customerAddress: customer.address || null
                        };
                        setSelectedEventData(updatedEventData);
                        setBookings((prevBookings) =>
                          prevBookings.map((event: any) =>
                            event.id === eventId
                              ? {
                                  ...event,
                                  customerName: customer.customerName || null,
                                  customerPhone: customer.customerPhone || null,
                                  customerAddress: customer.address || null
                                }
                              : event
                          )
                        );
                      }
                      
                      // Refresh customers list to show updated customer data
                      fetch('/api/detailer/customers')
                        .then(res => res.json())
                        .then(data => {
                          if (data.customers) {
                            setEventDetailsCustomers(data.customers);
                          }
                        })
                        .catch(err => console.error('Error fetching customers:', err));
                      
                      // Clear the optimistic update ref after a delay to allow normal syncing to resume
                      setTimeout(() => {
                        if (optimisticCustomerUpdateRef.current === eventId) {
                          optimisticCustomerUpdateRef.current = null;
                        }
                      }, 3000);
                    } else {
                      const error = await response.json();
                      console.error('Failed to update customer:', error);
                      // Revert optimistic update on error
                      fetchCalendarEvents().catch(err => {
                        console.error('Failed to revert optimistic update:', err);
                      });
                    }
                  } catch (error) {
                    console.error('Error updating customer:', error);
                    // Revert optimistic update on error
                    fetchCalendarEvents().catch(err => {
                      console.error('Failed to revert optimistic update:', err);
                    });
                  }
                } else {
                  // If in edit mode, mark form as dirty
                  setIsEditFormDirty(true);
                }
              } else if (isModalOpen) {
                // Editing customer from Create Event panel - update the customer data
                setNewCustomerData(customer);
              }
            } else {
              // New customer created (not editing)
              if (selectedEventData && selectedEventData.id && !isEditingEvent) {
                // If we're in Event Details panel and there's no customer, add the new customer to the event
                if (!selectedEventData.customerName && !selectedEventData.customerPhone) {
                  try {
                    const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        customerName: customer.customerName,
                        customerPhone: customer.customerPhone,
                        customerAddress: customer.address || ''
                      }),
                    });

                    if (response.ok) {
                      // Update local state
                      const updatedEventData = {
                        ...selectedEventData,
                        customerName: customer.customerName,
                        customerPhone: customer.customerPhone,
                        customerAddress: customer.address || ''
                      };
                      setSelectedEventData(updatedEventData);
                      
                      // Clear search
                      setEventDetailsCustomerSearch('');
                      setShowEventDetailsCustomerSuggestions(false);
                      
                      // Refresh customers list
                      fetch('/api/detailer/customers')
                        .then(res => res.json())
                        .then(data => {
                          if (data.customers) {
                            setEventDetailsCustomers(data.customers);
                          }
                        })
                        .catch(err => console.error('Error fetching customers:', err));
                      
                      // Refresh calendar to show updated data
                      fetchCalendarEvents();
                    } else {
                      const error = await response.json();
                      console.error('Failed to add customer to event:', error.error);
                    }
                  } catch (error) {
                    console.error('Error adding customer to event:', error);
                  }
                } else {
                  // Store the new customer data to populate EventModal form
                  setNewCustomerData(customer);
                }
              } else {
                // Store the new customer data to populate EventModal form
                setNewCustomerData(customer);
              }
            }
            
            // Close modal
            setIsNewCustomerModalOpen(false);
            setNewCustomerModalInitialName('');
            setIsEditingCustomer(false);
            setEditingCustomerData(null);
          }}
          initialName={newCustomerModalInitialName}
          existingCustomer={editingCustomerData || undefined}
          isEditMode={isEditingCustomer}
        />
        {deleteToastPortal}
    </div>
  );
} 
