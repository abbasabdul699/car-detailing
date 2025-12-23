"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/solid";
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
  getDay
} from 'date-fns';
import { ChevronDownIcon, Cog8ToothIcon, FunnelIcon, UsersIcon } from '@heroicons/react/24/outline';
import { XMarkIcon, PencilIcon, CheckIcon } from '@heroicons/react/24/solid';
import EventModal from './components/EventModal';
import AddressAutocompleteInput from './components/AddressAutocompleteInput';
import NewCustomerModal from './components/NewCustomerModal';

// Event Edit Form Component
const EventEditForm = ({ event, resources, onSave, onCancel }: { 
  event: any, 
  resources: Array<{ id: string, name: string, type: 'bay' | 'van' }>,
  onSave: (data: any) => void,
  onCancel: () => void
}) => {
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
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState(event.resourceId || '');
  const [description, setDescription] = useState(event.description || '');
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
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([]);
  const [availableBundles, setAvailableBundles] = useState<Array<{ id: string; name: string; description?: string; price?: number; services?: Array<{ service: { id: string; name: string } }> }>>([]);
  const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; type: 'service' | 'bundle' }>>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  
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
  }, []);

  // Initialize selected services from event data
  useEffect(() => {
    if (event.services && availableServices.length > 0) {
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
    if (selectedServices.length === 0 || !startDate) {
      alert('Please select at least one service and provide a start date.');
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
    let startDateTime = startDate;
    let endDateTime = isMultiDay ? (endDate || startDate) : startDate;
    let timeToStore = null;
    let startTimeToSend = null;
    let endTimeToSend = null;

    // Helper function to convert 24-hour format (HH:mm) to 12-hour format (h:mm AM/PM)
    const formatTo12Hour = (time24: string): string => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
    };

    if (isAllDay && startTime && endTime) {
      startDateTime = `${startDate}T${startTime}`;
      endDateTime = `${startDate}T${endTime}`;
      timeToStore = startTime;
    } else if (!isAllDay && startTime && endTime) {
      // For timed events, send times separately to avoid timezone issues
      startDateTime = `${startDate}T${startTime}`;
      const endDateForTime = isMultiDay ? (endDate || startDate) : startDate;
      endDateTime = `${endDateForTime}T${endTime}`;
      // Format as time range: "7:00 AM to 12:00 PM"
      const startTime12 = formatTo12Hour(startTime);
      const endTime12 = formatTo12Hour(endTime);
      timeToStore = `${startTime12} to ${endTime12}`;
      startTimeToSend = startTime;
      endTimeToSend = endTime;
    }

    onSave({
      title: selectedServices.map(s => s.name).join(', '), // Use selected services as the title
      employeeId: selectedEmployeeId || undefined,
      startDate: startDateTime,
      endDate: endDateTime,
      isAllDay,
      time: timeToStore,
      startTime: startTimeToSend || undefined, // Send start time separately for timed events
      endTime: endTimeToSend || undefined, // Send end time separately for timed events
      description,
      resourceId: selectedResourceId || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerAddress: customerAddress || undefined,
      customerType: customerType || undefined,
      locationType: locationType || undefined,
      vehicleModel: vehicles.length > 0 ? vehicles.map(v => v.model).join(', ') : undefined,
      vehicles: vehicles.length > 0 ? vehicles.map(v => v.model) : undefined,
      services: selectedServices.map(s => s.name)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Event</h3>
      </div>


      {/* Employee Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Assign Employee</label>
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
                    {selectedEmployee.imageUrl ? (
                      <img 
                        src={selectedEmployee.imageUrl} 
                        alt={selectedEmployee.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border"
                        style={{ borderColor: '#E2E2DD' }}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        selectedEmployee.color === 'blue' ? 'bg-blue-500' :
                        selectedEmployee.color === 'green' ? 'bg-green-500' :
                        selectedEmployee.color === 'orange' ? 'bg-orange-500' :
                        selectedEmployee.color === 'red' ? 'bg-red-500' :
                        selectedEmployee.color === 'gray' ? 'bg-gray-500' :
                        'bg-blue-500'
                      }`}>
                        {selectedEmployee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
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
                    {employee.imageUrl ? (
                      <img 
                        src={employee.imageUrl} 
                        alt={employee.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border"
                        style={{ borderColor: '#E2E2DD' }}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                        employee.color === 'blue' ? 'bg-blue-500' :
                        employee.color === 'green' ? 'bg-green-500' :
                        employee.color === 'orange' ? 'bg-orange-500' :
                        employee.color === 'red' ? 'bg-red-500' :
                        employee.color === 'gray' ? 'bg-gray-500' :
                        'bg-blue-500'
                      }`}>
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                    )}
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

      {/* Customer Type and Location Type Selection */}
      <div className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Type Dropdown */}
          <div>
            <label htmlFor="customer-type-select" className="block text-sm font-semibold text-gray-900 mb-2">
              Customer Type
            </label>
            <select
              id="customer-type-select"
              value={customerType}
              onChange={e => setCustomerType(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              style={{ borderColor: '#E2E2DD' }}
            >
              <option value="">Select customer type</option>
              <option value="new">New Customer</option>
              <option value="returning">Returning Customer</option>
              <option value="maintenance">Maintenance Customer</option>
            </select>
          </div>
          
          {/* Location Type Dropdown */}
          <div>
            <label htmlFor="location-type-select" className="block text-sm font-semibold text-gray-900 mb-2">
              Location Type
            </label>
            <select
              id="location-type-select"
              value={locationType}
              onChange={e => setLocationType(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              style={{ borderColor: '#E2E2DD' }}
            >
              <option value="">Select location type</option>
              <option value="pickup">Pick Up</option>
              <option value="dropoff">Drop Off</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date and Time Section */}
      <div className="border-t border-gray-200 pt-6">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          )}

          {/* Second Row: Times */}
          {isMultiDay && !isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {!isMultiDay && !isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* All-day: Show business hours (disabled) */}
          {isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time (Business Hours)</label>
                <input
                  type="time"
                  value={startTime}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time (Business Hours)</label>
                <input
                  type="time"
                  value={endTime}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
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

      {/* Resource */}
      {resources.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resource</label>
          <select
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">No resource</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name} ({resource.type === 'bay' ? 'Bay' : 'Van'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Customer Information */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="e.g., John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Phone</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="e.g., (123) 456-7890"
              />
            </div>
          </div>
          <div>
            <label htmlFor="customer-address" className="block text-sm font-medium text-gray-700 mb-2">Customer Address</label>
            <AddressAutocompleteInput
              id="customer-address"
              value={customerAddress}
              onChange={setCustomerAddress}
              placeholder="Start typing address..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Used for marketing and determining closest location for van services</p>
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
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

      {/* Customer Notes */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Notes</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="e.g., Customer prefers hand-wash only, always 5 minutes late, prefers early morning appointments..."
          />
          <p className="mt-1 text-xs text-gray-500">Add quick notes about customer preferences, behavior, or reminders</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-2 border rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          style={{ borderColor: '#E2E2DD' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <CheckIcon className="w-5 h-5" />
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

// #region Helper Functions & Components
const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const eventColors: { [key: string]: { bg: string, border: string } } = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-500' },
  green: { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-500' },
  red: { bg: 'bg-red-100 dark:bg-red-900', border: 'border-red-500' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-900', border: 'border-gray-500' },
};

const MonthView = ({ date, events, selectedEvent, onEventClick, scale = 1.0 }: { date: Date, events: any[], selectedEvent: string | null, onEventClick: (event: any) => void, scale?: number }) => {
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
        if (event.status === 'pending') return 'new';
        return 'repeat';
    };

    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();

    // Calculate row height based on scale - recalibrated so current 200% becomes new 100%
    // Base values doubled: 80 -> 160, so 100% now = old 200%, and 200% will be even wider
    const scaledRowHeight = 160 * scale; // Base row height that scales with slider
    
    return (
        <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700 flex-1" style={{ gridAutoRows: `${scaledRowHeight}px` }}>
            {daysOfWeek.map((day) => (
                <div key={day} className="py-2 text-center font-semibold text-[10px] md:text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <span className="md:hidden">{day.slice(0,3)}</span>
                    <span className="hidden md:inline">{day}</span>
                </div>
            ))}
            {Array(firstDay).fill(null).map((_, index) => (
                <div key={`empty-${index}`} className="border-r border-b border-gray-200 dark:border-gray-700"></div>
            ))}
            {Array(daysInMonth).fill(null).map((_, index) => {
                const day = index + 1;
                const currentDate = new Date(year, month, day);
                const dayEvents = events.filter(e => {
                  const currentDateStr = format(currentDate, 'yyyy-MM-dd');
                  
                  // For local events (including bookings and google-synced), use the date field
                  if ((e.source === 'local' || e.source === 'local-booking' || e.source === 'local-google-synced') && e.date) {
                    let eventDate;
                    if (typeof e.date === 'string') {
                      eventDate = e.date; // Already in YYYY-MM-DD format
                    } else {
                      eventDate = format(e.date, 'yyyy-MM-dd');
                    }
                    return eventDate === currentDateStr;
                  }
                  
                  // For Google Calendar events, use start/end dates
                  if (e.source === 'google' && e.start) {
                    // Extract date from start time (handle both datetime and date-only formats)
                    let eventStartDate;
                    if (e.start.includes('T')) {
                      // DateTime format: "2025-01-15T10:00:00Z" -> "2025-01-15"
                      eventStartDate = e.start.split('T')[0];
                    } else {
                      // Date-only format: "2025-01-15" -> "2025-01-15"
                      eventStartDate = e.start;
                    }
                    return eventStartDate === currentDateStr;
                  }
                  
                  // Check if this is a multi-day event by comparing start and end dates
                  if (e.start && e.end) {
                    const eventStart = new Date(e.start);
                    const eventEnd = new Date(e.end);
                    
                    // Check if current day falls within the event's date range
                    const currentDay = new Date(currentDate);
                    currentDay.setHours(0, 0, 0, 0);
                    eventStart.setHours(0, 0, 0, 0);
                    eventEnd.setHours(0, 0, 0, 0);
                    return currentDay >= eventStart && currentDay <= eventEnd;
                  }
                  
                  // For single-day events with date field, use the existing logic
                  if (e.date) {
                    let eventDate;
                    if (typeof e.date === 'string') {
                      eventDate = e.date; // Already in YYYY-MM-DD format
                    } else {
                      eventDate = format(e.date, 'yyyy-MM-dd');
                    }
                    return eventDate === currentDateStr;
                  }
                  
                  return false;
                });
                const scaledPadding = 8 * scale; // Doubled from 4 to 8 (recalibrated baseline)
                return (
                    <div key={day} className="flex-1 border-r border-b border-gray-200 dark:border-gray-700 flex flex-col" style={{ padding: `${scaledPadding}px` }}>
                        <div className="text-xs md:text-sm font-medium text-gray-800 dark:text-gray-200">{day}</div>
                        <div className="mt-1 overflow-y-auto flex flex-col" style={{ gap: `${8 * scale}px` }}>
                            {dayEvents.map((event, eventIndex) => {
                                const isSelected = selectedEvent === event.id;
                                const scaledEventPadding = 12 * scale; // Doubled from 6 to 12 (recalibrated baseline)
                                const baseClasses = `${eventColors[event.color]?.bg} rounded-xl dark:text-white cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col`;
                                const selectedClasses = isSelected ? 'ring-2 ring-gray-400 ring-opacity-50 shadow-lg scale-105' : '';
                                
                                // For all-day events, show them at the top with a special indicator
                                if (event.allDay) {
                                    return (
                                        <div 
                                            key={eventIndex} 
                                            className={`${baseClasses} ${selectedClasses} border-l-4 ${eventColors[event.color]?.border}`}
                                            onClick={() => onEventClick(event)}
                                            style={{ padding: `${scaledEventPadding}px` }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                            {event.employeeImageUrl ? (
                                                <img 
                                                    src={event.employeeImageUrl} 
                                                    alt={event.employeeName || 'Employee'}
                                                    className="rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                                    style={{ width: `${8 * scale}px`, height: `${8 * scale}px` }}
                                                />
                                            ) : event.employeeName ? (
                                                <div className="rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-600 flex-shrink-0" style={{ width: `${8 * scale}px`, height: `${8 * scale}px` }}>
                                                    <span className="text-[7px] font-semibold text-gray-700 dark:text-gray-300">
                                                        {event.employeeName.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {event.source === 'google' && (
                                                <svg className="text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ width: `${6 * scale}px`, height: `${6 * scale}px` }}>
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                </svg>
                                            )}
                                                <span className="text-sm md:text-base font-semibold truncate">{event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service'}</span>
                                            </div>
                                            {formatTimeRange(event) && (
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                                                    {formatTimeRange(event)}
                                                </span>
                                            )}
                                            {(event.vehicleType || event.vehicleModel) ? (
                                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5 truncate">{event.vehicleType || event.vehicleModel}</span>
                                            ) : null}
                                            <div className="mt-auto pt-2">
                                                {getCustomerType(event) === 'new' && (
                                                    <span className="text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                        New customer
                                                    </span>
                                                )}
                                                {getCustomerType(event) === 'repeat' && (
                                                    <span className="text-xs font-semibold bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded mt-0.5 inline-block truncate">
                                                        Repeat ...
                                                    </span>
                                                )}
                                                {(event.customerName || event.customerPhone) && (
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate font-semibold block">
                                                        {event.customerName || 'Customer'}{event.customerPhone ? ` (${event.customerPhone})` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // For timed events, show them normally with customer details
                                return (
                                    <div 
                                        key={eventIndex} 
                                        className={`${baseClasses} ${selectedClasses} items-start`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick(event);
                                        }}
                                        style={{ padding: `${scaledEventPadding}px` }}
                                    >
                                        <div className="flex items-center gap-1.5 w-full">
                                        {event.employeeImageUrl ? (
                                            <img 
                                                src={event.employeeImageUrl} 
                                                alt={event.employeeName || 'Employee'}
                                                className="rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                                style={{ width: `${12 * scale}px`, height: `${12 * scale}px` }}
                                            />
                                        ) : event.employeeName ? (
                                            <div className="rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-600 flex-shrink-0" style={{ width: `${12 * scale}px`, height: `${12 * scale}px` }}>
                                                <span className="text-[9px] font-semibold text-gray-700 dark:text-gray-300">
                                                    {event.employeeName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        ) : null}
                                        {event.source === 'google' && (
                                            <svg className="text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ width: `${6 * scale}px`, height: `${6 * scale}px` }}>
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                            <span className="truncate text-sm md:text-base font-semibold flex-1">{event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service'}</span>
                                        </div>
                                        {formatTimeRange(event) && (
                                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5 truncate text-left w-full">
                                                {formatTimeRange(event)}
                                            </span>
                                        )}
                                        {(event.vehicleType || event.vehicleModel) ? (
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5 truncate text-left w-full">{event.vehicleType || event.vehicleModel}</span>
                                        ) : null}
                                        <div className="mt-auto pt-2 w-full">
                                            {getCustomerType(event) === 'new' && (
                                                <span className="text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left">
                                                    New customer
                                                </span>
                                            )}
                                            {getCustomerType(event) === 'repeat' && (
                                                <span className="text-xs font-semibold bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left truncate">
                                                    Repeat ...
                                                </span>
                                            )}
                                            {(event.customerName || event.customerPhone) && (
                                                <span className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate font-semibold block text-left w-full">
                                                    {event.customerName || 'Customer'}{event.customerPhone ? ` (${event.customerPhone})` : ''}
                                                </span>
                                            )}
                                        </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Event Hover Popup Component
const EventHoverPopup = ({ 
    event, 
    position, 
    formatTimeRange, 
    getCustomerType,
    onMouseEnter,
    onMouseLeave 
}: { 
    event: any;
    position: { top: number; left: number } | null;
    formatTimeRange: (event: any) => string;
    getCustomerType: (event: any) => string;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) => {
    if (!event || !position) return null;

    const eventColor = event.color || 'blue';
    const eventColors: Record<string, { bg: string; border: string }> = {
        blue: { bg: 'bg-blue-100', border: 'border-blue-500' },
        green: { bg: 'bg-green-100', border: 'border-green-500' },
        red: { bg: 'bg-red-100', border: 'border-red-500' },
        yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500' },
        purple: { bg: 'bg-purple-100', border: 'border-purple-500' },
        orange: { bg: 'bg-orange-100', border: 'border-orange-500' },
        pink: { bg: 'bg-pink-100', border: 'border-pink-500' },
        indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500' },
    };
    const colorConfig = eventColors[eventColor] || eventColors.blue;

    const serviceName = event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service';
    const vehicleModel = event.vehicleType || event.vehicleModel;
    const timeRange = formatTimeRange(event);
    const customerType = getCustomerType(event);
    const paymentStatus = event.paymentStatus || event.status;
    const bookingSource = event.source;

    return (
        <div
            className="fixed bg-white shadow-2xl z-[100] rounded-xl overflow-hidden pointer-events-auto"
            style={{
                border: '1px solid #E2E2DD',
                backgroundColor: '#FFFFFF',
                width: '400px',
                top: `${position.top}px`,
                left: `${position.left}px`,
                maxWidth: 'calc(100vw - 32px)',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
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
                        {vehicleModel && (
                            <div className="text-base font-medium mt-1.5" style={{ color: 'rgba(64, 64, 58, 0.7)' }}>
                                {vehicleModel}
                            </div>
                        )}
                    </div>
                    {paymentStatus === 'paid' || paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold flex-shrink-0">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                            </svg>
                            PAID
                        </span>
                    ) : null}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                    {event.locationType && (
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
                    )}
                    {event.customerType === 'new' && (
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            New Customer
                        </span>
                    )}
                    {event.customerType === 'returning' && (
                        <span className="text-xs font-semibold bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded">
                            Returning Customer
                        </span>
                    )}
                    {event.customerType === 'maintenance' && (
                        <span className="text-xs font-semibold bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded">
                            Maintenance Customer
                        </span>
                    )}
                    {!event.customerType && customerType === 'new' && (
                        <span className="text-xs font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                            New customer
                        </span>
                    )}
                    {!event.customerType && customerType === 'repeat' && (
                        <span className="text-xs font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: '#AE5AEF' }}>
                            Repeat customer
                        </span>
                    )}
                </div>

                {/* Customer Information */}
                {(event.customerName || event.customerPhone) && (
                    <div className="text-base text-gray-700">
                        <span className="font-semibold">{event.customerName || 'Customer'}</span>
                        {event.customerPhone && (
                            <span className="text-gray-600 ml-1">({event.customerPhone})</span>
                        )}
                    </div>
                )}

                {/* Assigned Employee */}
                {event.employeeName && (
                    <div className="flex items-center gap-3">
                        {event.employeeImageUrl ? (
                            <img
                                src={event.employeeImageUrl}
                                alt={event.employeeName}
                                className="w-10 h-10 rounded-full object-cover border border-gray-300"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center border border-gray-300">
                                <span className="text-base font-semibold text-gray-700">
                                    {event.employeeName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        )}
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

                {/* Description */}
                {event.description && (
                    <div className="text-sm border-t border-gray-200 pt-4 mt-4">
                        <div className="line-clamp-3">
                            <span className="font-semibold text-gray-700">Notes: </span>
                            <span className="text-gray-600">{event.description}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const WeekView = ({ date, events, onEventClick, resources = [], scale = 1.0, businessHours, onResourceSelect, onOpenModal, draftEvent, onDraftEventUpdate }: { 
  date: Date, 
  events: any[], 
  onEventClick: (event: any) => void, 
  resources?: Array<{ id: string, name: string, type: 'bay' | 'van' }>, 
  scale?: number, 
  businessHours?: any,
  onResourceSelect?: (resource: { id: string, name: string, type: 'bay' | 'van' }) => void,
  onOpenModal?: (draftEvent?: { resourceId: string; startTime: string; endTime: string; date: Date }) => void,
  draftEvent?: { resourceId: string; startTime: string; endTime: string; date: Date } | null,
  onDraftEventUpdate?: (draftEvent: { resourceId: string; startTime: string; endTime: string; date: Date }) => void
}) => {
    // Hover state for event popup
    const [hoveredEvent, setHoveredEvent] = useState<any | null>(null);
    const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const timeColumnScrollRef = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    // Selected cell state for highlighting
    const [selectedCell, setSelectedCell] = useState<{ day: Date; resourceId: string; slotIndex: number } | null>(null);

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

    // Handle event hover
    const handleEventMouseEnter = (event: any, element: HTMLElement) => {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        
        // Get element position relative to viewport (for fixed positioning)
        const rect = element.getBoundingClientRect();
        
        // Position popup to the right of the event card
        const popupWidth = 400; // Increased for better desktop visibility
        const gap = 8; // 8px gap
        let left = rect.right + gap;
        let top = rect.top;
        
        // Check if popup would overflow right side of viewport
        if (left + popupWidth > window.innerWidth) {
            // Position to the left instead
            left = rect.left - popupWidth - gap;
            // If still overflow on left, position at left edge
            if (left < 0) {
                left = 8;
            }
        }
        
        // Check if popup would overflow bottom of viewport
        const popupHeight = 300; // Estimated height
        if (top + popupHeight > window.innerHeight) {
            top = window.innerHeight - popupHeight - 8;
        }
        
        // Ensure popup doesn't go above viewport
        if (top < 8) {
            top = 8;
        }
        
        setHoveredEvent(event);
        setPopupPosition({ top, left });
    };

    // Handle event mouse leave
    const handleEventMouseLeave = () => {
        // Small delay to allow moving mouse to popup
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredEvent(null);
            setPopupPosition(null);
        }, 100);
    };

    // Handle popup mouse enter (keep it open when hovering over popup)
    const handlePopupMouseEnter = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    // Handle popup mouse leave
    const handlePopupMouseLeave = () => {
        setHoveredEvent(null);
        setPopupPosition(null);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Sync time column scroll with main content scroll
    useEffect(() => {
        const mainScroll = mainScrollRef.current;
        const timeColumnScroll = timeColumnScrollRef.current;
        
        if (!mainScroll || !timeColumnScroll) return;

        const handleScroll = () => {
            if (timeColumnScroll.scrollTop !== mainScroll.scrollTop) {
                timeColumnScroll.scrollTop = mainScroll.scrollTop;
            }
        };

        mainScroll.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            mainScroll.removeEventListener('scroll', handleScroll);
        };
    }, []);

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
        if (event.status === 'pending') return 'new';
        return 'repeat';
    };

    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
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
    
    const scaledTimeColumnWidth = 80 * scale;
    const scaledTimeSlotHeight = 96 * scale; // Increased from 64 to 96 for taller default boxes
    const scaledColumnMinWidth = 100 * scale;

    // Use resources if available, otherwise create a default "Station" resource
    const displayResources = resources.length > 0 ? resources : [{ id: 'station', name: 'Station', type: 'bay' as const }];
    const totalColumns = weekDays.length * displayResources.length;

    return (
        <div className="flex border-t border-l border-gray-200 dark:border-gray-700 w-full h-full" style={{ height: '100%', overflow: 'visible' }}>
            {/* Main scrollable container - contains both time column and main content */}
            <div 
                ref={mainScrollRef}
                className="flex-1 min-h-0 overflow-x-auto overflow-y-auto"
                id="week-view-scroll-container"
                style={{ 
                    position: 'relative',
                    height: '100%',
                    maxHeight: '100%',
                    minWidth: 0
                }}
            >
                {/* Inner flex container for time column and main content */}
                <div className="flex" style={{ minHeight: '100%' }}>
                    {/* Time column - sticky on left, inside scroll container */}
                    <div
                      className="border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900"
                      style={{ 
                        position: 'sticky', 
                        left: 0, 
                        zIndex: 60, 
                        width: `${scaledTimeColumnWidth}px`,
                        alignSelf: 'flex-start'
                      }}
                    >
                        {/* Sticky header for time column - matches the height of the main header */}
                        <div 
                          className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" 
                          style={{ 
                            height: `calc(${80 * scale}px + 2px)`, /* Adjusted for better alignment with calender slots during week view */
                            boxSizing: 'border-box',
                            position: 'sticky',
                            top: 0,
                            zIndex: 70,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                          }}
                        ></div>
                        {/* Time slots - these will scroll with the main content */}
                        <div 
                            ref={timeColumnScrollRef}
                            className="flex-1 overflow-y-auto"
                            style={{ 
                                minHeight: `${timeSlots.length * scaledTimeSlotHeight}px`,
                                scrollbarWidth: 'thin'
                            }}
                            onScroll={(e) => {
                                // Sync main content scroll with time column scroll
                                if (mainScrollRef.current && e.currentTarget.scrollTop !== mainScrollRef.current.scrollTop) {
                                    mainScrollRef.current.scrollTop = e.currentTarget.scrollTop;
                                }
                            }}
                        >
                        {timeSlots.map(slot => (
                                <div key={slot} className="flex items-center justify-center text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700" style={{ height: `${scaledTimeSlotHeight}px`, fontSize: `${0.75 * scale}rem`, boxSizing: 'border-box' }}>
                                {slot}
                            </div>
                        ))}
                    </div>
                    </div>
                    
                    {/* Main content area */}
                    <div className="flex-1 min-w-0">
                        {/* Sticky header container - direct child of scroll container */}
                        <div 
                          className="flex-shrink-0 sticky top-0 z-50 bg-white dark:bg-gray-900"
                          style={{ 
                            minWidth: `calc(${totalColumns} * ${scaledColumnMinWidth}px)`,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                          }}
                        >
                    {/* First row: Day headers spanning all resources for each day */}
                    <div className="grid border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(${scaledColumnMinWidth}px, 1fr))` }}>
                        {weekDays.map(day => (
                            <div 
                                key={`day-header-${day.toString()}`} 
                                className="text-center flex items-center justify-center text-xs font-semibold uppercase border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" 
                                style={{ 
                                    gridColumn: `span ${displayResources.length}`,
                                    height: `${40 * scale}px`, 
                                    boxSizing: 'border-box'
                                }}
                            >
                                <span>{format(day, 'EEE')} {format(day, 'M/d')}</span>
                            </div>
                        ))}
                    </div>
                    
                    {/* Second row: Resource headers for each day */}
                    <div className="grid border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(${scaledColumnMinWidth}px, 1fr))` }}>
                        {weekDays.map(day => 
                            displayResources.map((resource, resourceIndex) => (
                                <div 
                                    key={`resource-header-${day.toString()}-${resource.id}`} 
                                    className="text-center flex flex-row items-center justify-center gap-1 text-xs font-semibold border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" 
                                    style={{ 
                                        height: `${40 * scale}px`, 
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span>{resource.name}</span>
                                    {onOpenModal && onResourceSelect && (
                                        <button 
                                            className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 relative" 
                                            style={{ zIndex: 9999, position: 'relative' }}
                                            onClick={(e) => {
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
                                            }}
                                        >
                                            <PlusIcon className="w-3 h-3 inline" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
                
                {/* Scrollable grid content */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${totalColumns}, minmax(${scaledColumnMinWidth}px, 1fr))`,
                    minWidth: `calc(${totalColumns} * ${scaledColumnMinWidth}px)`,
                    width: 'max-content'
                  }}
                >
                    
                    {/* Time slot rows with events - each resource column gets its own wrapper */}
                    {weekDays.map(day => 
                        displayResources.map((resource) => {
                            // Create a wrapper for this resource column that contains all time slots
                            const dayIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                            const resourceIndex = displayResources.findIndex(r => r.id === resource.id);
                            const columnIndex = (dayIndex * displayResources.length) + resourceIndex;
                            
                            // Filter events for this day and resource
                            const dayEvents = (events || []).filter(e => {
                                if (!e) return false;
                                // Filter by resource
                                if (e.resourceId && e.resourceId !== resource.id) return false;
                                
                                // Check if event is on the current day
                                        let eventStartDate;
                                if (e.start) {
                                        if (e.start.includes('T')) {
                                            eventStartDate = e.start.split('T')[0];
                                        } else {
                                            eventStartDate = e.start;
                                        }
                                } else if (e.date) {
                                    eventStartDate = typeof e.date === 'string' ? e.date : format(e.date, 'yyyy-MM-dd');
                                } else {
                                    eventStartDate = '';
                                }
                                
                                const currentDateStr = format(day, 'yyyy-MM-dd');
                                return eventStartDate === currentDateStr;
                            });
                            
                            // Separate all-day events from timed events
                            const allDayEvents = dayEvents.filter(e => e && e.allDay);
                            const timedEvents = dayEvents.filter(e => e && !e.allDay && e.start && e.end);
                            const totalTimeSlotHeight = timeSlots.length * scaledTimeSlotHeight;
                            
                            return (
                                <div
                                    key={`resource-column-${day.toString()}-${resource.id}`}
                                    className="relative"
                                    style={{ gridColumn: columnIndex + 1 }}
                                >
                                    {/* Render all-day events as blocks spanning entire day height */}
                                    {allDayEvents.map((event, i) => {
                                        if (!event) return null;
                                        const eventColor = event.color || 'blue';
                                        const colorConfig = eventColors[eventColor] || eventColors.blue;
                                        return (
                                            <div
                                                key={`all-day-${i}-${event.id || i}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick(event);
                                                }}
                                                onMouseEnter={(e) => handleEventMouseEnter(event, e.currentTarget)}
                                                onMouseLeave={handleEventMouseLeave}
                                                className={`absolute w-[95%] left-1 top-0 ${colorConfig.bg} p-1.5 rounded-xl flex flex-col items-start text-xs dark:text-white cursor-pointer hover:shadow-lg transition-all z-10`}
                                                style={{
                                                    pointerEvents: 'auto',
                                                    height: `${totalTimeSlotHeight}px`,
                                                    top: `${i * 40}px`, // Stack multiple all-day events vertically
                                                    zIndex: 5
                                                }}
                                            >
                                                <div className="flex items-center gap-1.5 w-full">
                                                    {event.employeeImageUrl ? (
                                                        <img 
                                                            src={event.employeeImageUrl} 
                                                            alt={event.employeeName || 'Employee'}
                                                            className="w-6 h-6 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                                        />
                                                    ) : event.employeeName ? (
                                                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-600 flex-shrink-0">
                                                            <span className="text-[9px] font-semibold text-gray-700 dark:text-gray-300">
                                                                {event.employeeName.charAt(0).toUpperCase()}
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
                                                    <span className="truncate font-semibold text-sm md:text-base flex-1">{event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service'}</span>
                                                </div>
                                                {(event.customerName || event.customerPhone) && (
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate font-semibold text-left w-full">
                                                        {event.customerName || 'Customer'}{event.customerPhone ? ` (${event.customerPhone})` : ''}
                                                    </span>
                                                )}
                                                {getCustomerType(event) === 'new' && (
                                                    <span className="text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left">
                                                        New customer
                                                    </span>
                                                )}
                                                {getCustomerType(event) === 'repeat' && (
                                                    <span className="text-xs font-semibold bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded mt-0.5 inline-block text-left truncate">
                                                        Repeat ...
                                                    </span>
                                                )}
                                                {(event.vehicleType || event.vehicleModel) ? (
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5 truncate text-left w-full">{event.vehicleType || event.vehicleModel}</span>
                                                ) : null}
                                                {event.services && (Array.isArray(event.services) ? event.services.length > 0 : event.services) ? (
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-0.5 truncate text-left w-full">
                                                        {Array.isArray(event.services) ? event.services.join(', ') : event.services}
                                                    </span>
                                                ) : null}
                                                {formatTimeRange(event) && (
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5 truncate text-left w-full">
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
                                        
                                        return (
                                            <div 
                                                key={`${slot}-${day.toString()}-${resource.id}`} 
                                                className={`border-r border-b border-gray-200 dark:border-gray-700 relative cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? 'bg-blue-50/30 dark:bg-blue-900/20 border-2 border-dashed border-blue-400' 
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                                }`}
                                                style={{ 
                                                    height: `${scaledTimeSlotHeight}px`, 
                                                    boxSizing: 'border-box'
                                                }}
                                                onClick={(e) => {
                                                    // Only handle clicks on blank space, not on events
                                                    const target = e.target as HTMLElement;
                                                    const isEventClick = target.closest('.absolute') && 
                                                        (target.classList.contains('cursor-pointer') || 
                                                         target.closest('[class*="border-l-4"]') ||
                                                         target.closest('[class*="border-dashed"]'));
                                                    
                                                    if (!isEventClick && (target === e.currentTarget || target.classList.contains('border-r'))) {
                                                        const slotHour = parseSlotHour(slot);
                                                        if (slotHour !== null && onOpenModal && onResourceSelect) {
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
                                                className="absolute w-[95%] left-1 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 pointer-events-auto z-10"
                                                style={{ 
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                    minHeight: `${scaledTimeSlotHeight * 0.5}px`
                                                }}
                                            >
                                                <div className="p-2 flex items-center justify-center h-full relative">
                                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">New event</span>
                                                    
                                                    {/* Drag handle on the right edge */}
                                                    {onDraftEventUpdate && (
                                                        <div
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                
                                                                const startX = e.clientX;
                                                                const startWidth = scaledColumnMinWidth;
                                                                const startTime = new Date(draftStart);
                                                                const startEndTime = new Date(draftEnd);
                                                                
                                                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                                                    const deltaX = moveEvent.clientX - startX;
                                                                    const newWidth = Math.max(avgHourWidth, startWidth + deltaX);
                                                                    
                                                                    const hoursFromStart = newWidth / avgHourWidth;
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
                                                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center cursor-ew-resize hover:bg-blue-600 transition-colors shadow-lg z-20"
                                                            style={{ cursor: 'ew-resize' }}
                                                        >
                                                            <ChevronRightIcon className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    
                                    {/* Render timed events positioned absolutely within this resource column */}
                                    {timedEvents.map((event, i) => {
                                        if (!event || !event.start || !event.end) return null;
                                        // Calculate position and height based on actual start/end times
                                        const startTime = new Date(event.start);
                                        const endTime = new Date(event.end);
                                        
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
                                        
                                        const eventColor = event.color || 'blue';
                                        const colorConfig = eventColors[eventColor] || eventColors.blue;
                                        
                                        return (
                                    <div 
                                        key={`event-${i}-${event.id || i}-${resource.id}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEventClick(event);
                                        }}
                                        onMouseEnter={(e) => handleEventMouseEnter(event, e.currentTarget)}
                                        onMouseLeave={handleEventMouseLeave}
                                    className={`absolute w-[95%] left-1 ${colorConfig.bg} p-1.5 rounded-xl flex flex-col items-start text-xs dark:text-white cursor-pointer hover:shadow-lg transition-all z-10`}
                                    style={{ 
                                        pointerEvents: 'auto',
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        minHeight: `${scaledTimeSlotHeight * 0.5}px`
                                    }}
                                    >
                                        {/* Service name - large and bold */}
                                        <div className="flex items-center gap-1.5 w-full mb-1">
                                        {event.source === 'google' && (
                                            <svg className="w-3 h-3 text-gray-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                            <span className="truncate font-bold text-lg md:text-xl flex-1">
                                                {event.title || event.eventName || (Array.isArray(event.services) ? event.services.join(' + ') : event.services) || 'Service'}
                                            </span>
                                        </div>
                                        
                                        {/* Time range - split into two lines */}
                                        {formatTimeRange(event) && (() => {
                                            const timeRange = formatTimeRange(event);
                                            const [startTime, endTime] = timeRange.split(' - ');
                                            return (
                                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 text-left w-full">
                                                    <div>{startTime}</div>
                                                    {endTime && <div className="text-gray-600 dark:text-gray-400">- {endTime}</div>}
                                                </div>
                                            );
                                        })()}
                                        
                                        {/* Customer name */}
                                        {event.customerName && (
                                            <span className="text-xs text-gray-700 dark:text-gray-300 mb-1 truncate font-semibold text-left w-full">
                                                {event.customerName}
                                            </span>
                                        )}
                                        
                                        {/* Vehicle */}
                                        {(event.vehicleType || event.vehicleModel) && (
                                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 truncate text-left w-full">
                                                {event.vehicleType || event.vehicleModel}
                                            </span>
                                        )}
                                        
                                        {/* Customer Type Tag, Location Type Tag, and Technician icon at bottom */}
                                        <div className="mt-auto flex flex-col items-center w-full pt-1 gap-1">
                                            {/* Location Type Tag - Only for Bay columns, above customer type */}
                                            {resource.type === 'bay' && event.locationType && (
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-block text-center ${
                                                    (event.locationType?.toLowerCase() === 'pick up' || event.locationType?.toLowerCase() === 'pickup')
                                                        ? 'bg-blue-500 text-white'
                                                        : (event.locationType?.toLowerCase() === 'drop off' || event.locationType?.toLowerCase() === 'dropoff')
                                                        ? 'bg-pink-500 text-white'
                                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {event.locationType?.toLowerCase() === 'pickup' ? 'Pick Up' : 
                                                     event.locationType?.toLowerCase() === 'dropoff' ? 'Drop Off' :
                                                     event.locationType}
                                            </span>
                                        )}
                                            
                                            {/* Customer Type Tag - Below location type (if present) */}
                                            {event.customerType && (
                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded inline-block text-center ${
                                                    event.customerType.toLowerCase() === 'new' 
                                                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        : event.customerType.toLowerCase() === 'returning'
                                                        ? 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                        : event.customerType.toLowerCase() === 'maintenance'
                                                        ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                    {event.customerType === 'new' ? 'New Customer' : 
                                                     event.customerType === 'returning' ? 'Returning Customer' :
                                                     event.customerType === 'maintenance' ? 'Maintenance Customer' :
                                                     event.customerType}
                                            </span>
                                            )}
                                            
                                            {/* Fallback: Show old customer type logic if customerType is not set */}
                                            {!event.customerType && getCustomerType(event) === 'repeat' && (
                                                <span className="text-xs font-semibold bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded inline-block text-center">
                                                    Repeat ...
                                            </span>
                                        )}
                                            
                                            {/* Technician icon */}
                                            {event.employeeImageUrl ? (
                                                <img 
                                                    src={event.employeeImageUrl} 
                                                    alt={event.employeeName || 'Employee'}
                                                    className="w-14 h-14 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                                                />
                                            ) : event.employeeName ? (
                                                <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-600 flex-shrink-0">
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                        {event.employeeName.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            ) : null}
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
            {/* Event Hover Popup */}
            <EventHoverPopup
                event={hoveredEvent}
                position={popupPosition}
                formatTimeRange={formatTimeRange}
                getCustomerType={getCustomerType}
                onMouseEnter={handlePopupMouseEnter}
                onMouseLeave={handlePopupMouseLeave}
            />
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
  columnWidths
}: { 
  draftEvent: { resourceId: string; startTime: string; endTime: string },
  left: number,
  width: number,
  onDraftEventUpdate?: (draftEvent: { resourceId: string; startTime: string; endTime: string }) => void,
  date: Date,
  columnWidths: number[]
}) => {
  // Calculate average hour width for drag calculations
  const avgHourWidth = columnWidths.reduce((sum, w) => sum + w, 0) / columnWidths.length;
  
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
      className="absolute top-2 bottom-2 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/30 dark:bg-blue-900/20 pointer-events-none"
      style={{ 
        left: `${left}px`, 
        width: `${width}px`,
        minWidth: '100px',
        zIndex: 10
      }}
    >
      <div className="p-2 flex items-center justify-center h-full relative">
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">New event</span>
        
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

const DayView = ({ date, events, resources, onEventClick, onResourceSelect, onOpenModal, draftEvent, onDraftEventUpdate, scale = 1.0 }: { 
  date: Date, 
  events: any[], 
  resources: Array<{ id: string, name: string, type: 'bay' | 'van' }>,
  onEventClick: (event: any) => void,
  onResourceSelect: (resource: { id: string, name: string, type: 'bay' | 'van' }) => void,
  onOpenModal: (draftEvent?: { resourceId: string; startTime: string; endTime: string }) => void,
  draftEvent?: { resourceId: string; startTime: string; endTime: string } | null,
  onDraftEventUpdate?: (draftEvent: { resourceId: string; startTime: string; endTime: string }) => void,
  scale?: number
}) => {
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolledTo6AM = useRef(false);
  // Store a single base width for all columns (uniform width)
  const [baseColumnWidth, setBaseColumnWidth] = useState<number>(() => {
    // Load from localStorage or default to 120px
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dayViewBaseColumnWidth');
      if (saved) {
        try {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        } catch (e) {
          console.error('Error parsing saved column width:', e);
        }
      }
    }
    return 120;
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

  // Save base column width to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dayViewBaseColumnWidth', baseColumnWidth.toString());
    }
  }, [baseColumnWidth]);

  // Calculate cumulative widths for event positioning (with scale applied)
  const getCumulativeWidth = (index: number) => {
    return columnWidths.slice(0, index).reduce((sum, width) => sum + (width * scale), 0);
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

  // Scroll to 6 AM on initial load (6 AM is at index 6)
  useEffect(() => {
    if (containerRef.current && !hasScrolledTo6AM.current) {
      const scrollContainer = containerRef.current;
      // 6 AM is at index 6 (0=12 AM, 1=1 AM, ..., 6=6 AM)
      const scrollTo6AM = () => {
        scrollContainer.scrollLeft = getCumulativeWidth(6); // Scroll to 6 AM position
        hasScrolledTo6AM.current = true;
      };
      // Use a small delay to ensure DOM is ready
      const timeoutId = setTimeout(scrollTo6AM, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [baseColumnWidth, scale]); // Re-run when base column width or scale changes

  // Reset scroll flag when date changes
  useEffect(() => {
    hasScrolledTo6AM.current = false;
  }, [date]);

  // Filter events for the current day
  const dayEvents = events.filter(e => {
    let eventStartDate;
    if (e.start) {
      eventStartDate = e.start.includes('T') ? e.start.split('T')[0] : e.start;
    } else {
      eventStartDate = '';
    }
    const currentDateStr = format(date, 'yyyy-MM-dd');
    return eventStartDate === currentDateStr;
  });

  // Calculate event position and width based on start/end time using dynamic column widths
  const getEventPosition = (event: any) => {
    if (!event.start || !event.end) return { left: 0, width: 0 };
    
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0); // Start at midnight (12 AM)
    
    const startHour = startTime.getHours();
    const startMinutes = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinutes = endTime.getMinutes();
    
    // Calculate left position: sum of widths of all columns before start hour + fraction of start hour column
    let left = getCumulativeWidth(startHour);
    const startHourFraction = startMinutes / 60;
    left += (columnWidths[startHour] * scale) * startHourFraction;

    // Calculate width: from start to end
    let endPosition = getCumulativeWidth(endHour);
    const endHourFraction = endMinutes / 60;
    endPosition += (columnWidths[endHour] * scale) * endHourFraction;
    
    const width = Math.max(100, endPosition - left);
    
    return { left, width };
  };

  // Determine customer type (new vs repeat) - check if customer has previous bookings
  const getCustomerType = (event: any) => {
    // For now, we'll use status to determine - pending usually means new
    // In the future, we can check booking history
    if (event.status === 'pending') return 'new';
    // If it's confirmed and has bookingId, it might be a repeat customer
    // This is a simplified check - you may want to enhance this
    return 'repeat';
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

  // Calculate dynamic height for each row
  // All rows get equal height to fit the screen
  const calculateRowHeight = (index: number, totalResources: number) => {
    // All rows get equal space (100% / totalResources)
    return `${100 / totalResources}%`;
  };

  return (
    <div className="flex flex-col h-full max-h-full w-full overflow-hidden">
      {/* Scrollable container for header and rows */}
      <div className="flex-1 min-h-0 min-w-0 overflow-x-auto overflow-y-auto" id="calendar-scroll-container" ref={containerRef} style={{ position: 'relative' }}>
        <div style={{ minWidth: `${totalColumnWidth + 128}px` }}>
      {/* Header with time slots - sticky when scrolling down */}
         <div className="flex bg-white dark:bg-white flex-shrink-0 sticky top-0 z-50" style={{ minWidth: `${totalColumnWidth + 128}px`, width: 'max-content', boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)' }}>
          <div className="w-32 flex-shrink-0 p-2 bg-white dark:bg-white sticky left-0 z-60" style={{ borderRight: '1px solid #F0F0EE' }}>
          </div>
          <div className="flex flex-shrink-0" style={{ minWidth: `${totalColumnWidth}px`, width: `${totalColumnWidth}px` }}>
            {timeSlots.map((slot, index) => (
              <div 
                key={slot} 
                className="flex-shrink-0 p-2 bg-white dark:bg-white relative group"
                style={{ 
                  width: `${columnWidths[index] * scale}px`,
                  borderRight: '1px solid #F0F0EE'
                }}
              >
                <div className="text-xs font-semibold text-black text-left">
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
            ))}
          </div>
        </div>

        {/* Resource rows container - needs fixed height for percentage-based row heights */}
        <div 
          className="flex flex-col"
          style={{ 
            minWidth: `${totalColumnWidth + 128}px`,
            height: containerHeight > 0 ? `${containerHeight}px` : 'auto'
          }}
        >
          {resources.map((resource, index) => {
          const resourceEvents = dayEvents.filter(e => e.resourceId === resource.id);
            const rowHeight = calculateRowHeight(index, resources.length);
          
          return (
            <div 
              key={resource.id} 
                className="flex flex-shrink-0"
                style={{ height: rowHeight, minHeight: `${120 * scale}px`, borderBottom: '1px solid #F0F0EE' }}
            >
              {/* Resource name column */}
                <div className="w-32 flex-shrink-0 p-3 bg-white dark:bg-white sticky left-0 z-20" style={{ isolation: 'isolate', borderRight: '1px solid #F0F0EE' }}>
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
                      <button 
                        className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mt-1 relative" 
                        style={{ zIndex: 9999, position: 'relative' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onResourceSelect(resource);
                          onOpenModal();
                        }}
                      >
                      <PlusIcon className="w-4 h-4 inline" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Time slots row with events */}
                <div 
                  className="flex-1 min-w-0 relative"
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
                <div className="flex relative h-full flex-shrink-0" style={{ minWidth: `${totalColumnWidth}px`, width: `${totalColumnWidth}px` }}>
                  {/* Time slot columns */}
                  {timeSlots.map((slot, index) => (
                    <div 
                      key={slot} 
                      className="time-slot-cell flex-shrink-0 h-full cursor-pointer hover:bg-[#F7F7F5] dark:hover:bg-[gray-800/50] transition-colors"
                      style={{ 
                        width: `${columnWidths[index] * scale}px`,
                        borderRight: '1px solid #F0F0EE' 
                      }}
                    />
                  ))}
                  
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
                      />
                    );
                  })()}
                  
                  {/* Event blocks positioned absolutely */}
                  {resourceEvents.map((event) => {
                    const { left, width } = getEventPosition(event);
                    const customerType = getCustomerType(event);
                    const isPending = event.status === 'pending';
                    const eventColor = event.color || 'blue'; // Use employee's color, default to blue
                    
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`absolute top-2 bottom-2 rounded-xl p-2 cursor-pointer transition-all hover:shadow-lg ${
                          isPending 
                            ? 'border-2 border-dashed border-gray-400 bg-white dark:bg-gray-700' 
                            : `${eventColors[eventColor]?.bg || eventColors.blue.bg} border-l-4 ${eventColors[eventColor]?.border || eventColors.blue.border}`
                        }`}
                        style={{ 
                          left: `${left}px`, 
                          width: `${width}px`,
                          minWidth: '100px'
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {event.employeeImageUrl ? (
                            <img 
                              src={event.employeeImageUrl} 
                              alt={event.employeeName || 'Employee'}
                              className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                            />
                          ) : event.employeeName ? (
                            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border border-gray-300 dark:border-gray-600 flex-shrink-0">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                {event.employeeName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ) : null}
                          <div className="text-base font-semibold text-gray-900 dark:text-white flex-1 truncate">
                            {Array.isArray(event.services) ? event.services.join(' + ') : event.services || 'Service'}
                          </div>
                        </div>
                        {formatTimeRange(event) && (
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {formatTimeRange(event)}
                          </div>
                        )}
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                          {event.vehicleType || 'Vehicle'}
                        </div>
                        <div className="mt-auto pt-2">
                          {!isPending && customerType === 'new' && (
                            <div className="mb-1">
                              <span className="text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                New customer
                              </span>
                            </div>
                          )}
                          {!isPending && customerType === 'repeat' && (
                            <div className="mb-1">
                              <span className="text-xs font-semibold bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded">
                                Repeat customer
                              </span>
                            </div>
                          )}
                          {(event.customerName || event.customerPhone) && (
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              {event.customerName || 'Customer'}{event.customerPhone ? ` (${event.customerPhone})` : ''}
                            </div>
                          )}
                        </div>
                        {isPending && (
                          <div className="absolute top-1 right-1">
                            <span className="text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1 rounded">
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
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedResource, setSelectedResource] = useState<{ id: string; name: string; type: 'bay' | 'van' } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [draftEvent, setDraftEvent] = useState<{ resourceId: string; startTime: string; endTime: string } | null>(null);

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
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [customerPastJobs, setCustomerPastJobs] = useState<Array<{ id: string; date: string; services: string[]; vehicleModel?: string; employeeName?: string }>>([]);
  const [showEmployeeSwitchDropdown, setShowEmployeeSwitchDropdown] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showCustomerDetailsPopup, setShowCustomerDetailsPopup] = useState(false);
  const [customerPopupPosition, setCustomerPopupPosition] = useState<{ top: number; right: number } | null>(null);
  const employeeSwitchRef = useRef<HTMLDivElement>(null);
  const eventDetailsCustomerCardRef = useRef<HTMLDivElement>(null);
  const customerDetailsPopupRef = useRef<HTMLDivElement>(null);
  const [resources, setResources] = useState<Array<{ id: string, name: string, type: 'bay' | 'van' }>>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: string; name: string; color: string; imageUrl?: string }>>([]);
  const [isActionSidebarOpen, setIsActionSidebarOpen] = useState(false);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]); // Array of employee IDs
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerModalInitialName, setNewCustomerModalInitialName] = useState('');
  const [newCustomerData, setNewCustomerData] = useState<{ customerName: string; customerPhone: string; customerEmail?: string; address?: string } | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);
  const actionSidebarRef = useRef<HTMLDivElement>(null);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bottomSheetTouchStartRef = useRef<{ y: number; time: number } | null>(null);
  const session = useSession();
  const detailerId = session.data?.user?.id;
  const [teamEmployees, setTeamEmployees] = useState<Array<{ id: string; name: string; imageUrl?: string; email?: string; phone?: string }>>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  
  const [eventVehicles, setEventVehicles] = useState<Array<{ id: string; model: string }>>([]);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [availableServices, setAvailableServices] = useState<Array<{ id: string; name: string; category?: { name: string } }>>([]);
  const [availableBundles, setAvailableBundles] = useState<Array<{ id: string; name: string; description?: string; price?: number; services?: Array<{ service: { id: string; name: string } }> }>>([]);
  const [selectedServices, setSelectedServices] = useState<Array<{ id: string; name: string; type: 'service' | 'bundle' }>>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [businessHours, setBusinessHours] = useState<any>(null);
  
  // Filter bookings by selected technicians
  const filteredBookings = useMemo(() => {
    if (selectedTechnicians.length === 0) {
      return bookings;
    }
    return bookings.filter((event: any) => {
      // Check if event has employeeId that matches selected technicians
      if (event.employeeId && selectedTechnicians.includes(event.employeeId)) {
        return true;
      }
      // Check if event has employeeName that matches selected technicians
      if (event.employeeName) {
        // Find employee by name in the teamEmployees list
        const employee = teamEmployees.find((emp: any) => emp.name === event.employeeName);
        if (employee && selectedTechnicians.includes(employee.id)) {
          return true;
        }
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
  
  console.log('Session status:', session.status, 'Session data:', session.data);
  
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
      if (e.date) {
        eventDate = typeof e.date === 'string' ? e.date : format(e.date, 'yyyy-MM-dd');
      } else if (e.start) {
        eventDate = e.start.includes('T') ? e.start.split('T')[0] : e.start;
      }
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

  // Swipe gesture handlers for mobile - swipe down from week to month, swipe up from month to week
  useEffect(() => {
    if (!isMobile) return;

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

  // Close team dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
    };

    if (isTeamDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTeamDropdownOpen]);

  // Close employee switch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeSwitchRef.current && !employeeSwitchRef.current.contains(event.target as Node)) {
        setShowEmployeeSwitchDropdown(false);
      }
    };

    if (showEmployeeSwitchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmployeeSwitchDropdown]);

  // Close action sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionSidebarRef.current && !actionSidebarRef.current.contains(event.target as Node)) {
        setIsActionSidebarOpen(false);
        setSelectedEventData(null);
        setSelectedEvent(null);
        setIsEditingNotes(false); // Reset notes edit mode when closing sidebar
        setShowCustomerDetailsPopup(false); // Close customer popup when closing sidebar
      }
    };

    if (isActionSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionSidebarOpen]);

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

  // Close customer details popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the customer card and the popup
      if (
        showCustomerDetailsPopup &&
        eventDetailsCustomerCardRef.current &&
        customerDetailsPopupRef.current &&
        !eventDetailsCustomerCardRef.current.contains(target) &&
        !customerDetailsPopupRef.current.contains(target)
      ) {
        setShowCustomerDetailsPopup(false);
      }
    };

    if (showCustomerDetailsPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDetailsPopup]);

  // Cleanup notes save timeout on unmount or event change
  useEffect(() => {
    return () => {
      if (notesSaveTimeoutRef.current) {
        clearTimeout(notesSaveTimeoutRef.current);
      }
    };
  }, [selectedEventData?.id]);

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
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading calendar...</div>
      </div>
    );
  }
  
  // Show error state if not authenticated (AFTER all hooks)
  if (session.status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600 dark:text-red-400">Please log in to view your calendar.</div>
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
      
      // Set the events in state
      console.log('About to call setBookings with:', allEvents.length, 'events');
      setBookings(allEvents);
      
      // Filter today's events
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const todayEventsList = allEvents.filter((e: any) => {
        let eventDate;
        if (e.date) {
          eventDate = typeof e.date === 'string' ? e.date : format(e.date, 'yyyy-MM-dd');
        } else if (e.start) {
          eventDate = e.start.includes('T') ? e.start.split('T')[0] : e.start;
        }
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
    // Don't add to local events state - let fetchCalendarEvents handle it
    // Refresh the calendar events to include the new event from the database
    setTimeout(() => {
    fetchCalendarEvents();
    }, 500); // Small delay to ensure database write is complete
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
    setSelectedEvent(event.id);
    setSelectedEventData(event);
    // Don't open action panel - bottom sheet will show event details
    setEventDetailsOpen(false); // Close modal if it was open
    setIsEditingNotes(false); // Reset notes edit mode when selecting a new event
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
    setShowEmployeeSwitchDropdown(false);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventData?.id) return;
    
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this event? This will remove it from both Reeva Detailer and Google Calendar.'
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the calendar events
        fetchCalendarEvents();
        // Close the modal
        handleCloseEventDetails();
        // Show success message
        alert('Event deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to delete event: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handlePrev = () => {
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
      else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
      else setCurrentDate(addDays(currentDate, 1));
  };

  const renderHeaderDate = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
    }
    // Day view: Show month, day of month, and year (e.g., "December 5, 2025")
    return format(currentDate, 'MMMM d, yyyy');
  };

  // Mobile calendar view render function
  const renderMobileCalendar = () => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
    
    // Filter events for the current day
    const dayEvents = bookings.filter((event: any) => {
      let eventDate;
      if (event.start) {
        eventDate = event.start.includes('T') ? event.start.split('T')[0] : event.start;
      } else if (event.date) {
        eventDate = typeof event.date === 'string' ? event.date : format(new Date(event.date), 'yyyy-MM-dd');
      } else {
        return false;
      }
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
      
      if (event.start && event.start.includes('T')) {
        const eventStart = new Date(event.start);
        startHour = eventStart.getHours();
        startMinute = eventStart.getMinutes();
        
        if (event.end && event.end.includes('T')) {
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
      const duration = Math.max(endMinutes - startMinutes, 30); // Minimum 30 minutes
      
      const top = ((startHour - 6) * 60 + startMinute) * 2;
      const height = duration * 2;
      
      return { top, height };
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
        className="h-full flex flex-col pb-16 md:pb-0" 
        style={{ backgroundColor: '#f9f7fa' }}
        onTouchStart={handleMobileTouchStart}
        onTouchEnd={handleMobileTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-gray-900 pl-12 md:pl-0" style={{ fontFamily: 'Helvetica Neue', fontSize: '20px' }}>{renderHeaderDate()}</h1>
            </div>
          <div className="flex items-center gap-3">
            {/* Today Button - Shows current day number */}
            <button
              onClick={() => setCurrentDate(new Date())}
              className="w-8 h-8 text-white rounded-xl flex items-center justify-center font-semibold transition"
              style={{ backgroundColor: '#4A4844' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3A3834'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4A4844'}
              aria-label="Go to today"
            >
              {new Date().getDate()}
            </button>
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
        <div className={`flex-1 overflow-y-auto ${isActionSidebarOpen ? 'z-0' : ''}`}>
          <div className="flex flex-col h-full">
            {/* Resource Headers */}
            <div className={`flex border-b border-gray-200 sticky top-0 ${isActionSidebarOpen ? 'z-0' : 'z-10'}`} style={{ backgroundColor: '#f9f7fa' }}>
              <div className="w-16 flex-shrink-0 border-r border-gray-200"></div>
              {displayResources.map((resource) => (
                <div key={resource.id} className="flex-1 border-r border-gray-200 last:border-r-0 px-2 py-2 text-center">
                  <span className="text-sm font-semibold text-gray-900">{resource.name.toUpperCase()}</span>
          </div>
              ))}
        </div>

        {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto px-0">
              <div className="flex relative" style={{ minHeight: '960px' }}>
                {/* Time Column */}
                <div className={`w-16 flex-shrink-0 border-r border-gray-200 relative ${isActionSidebarOpen ? 'z-0' : 'z-10'}`} style={{ backgroundColor: '#f9f7fa' }}>
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: '120px' }}>
                      <div className="absolute left-2 top-0 text-xs font-medium text-gray-500">
                  {hour === 12 ? '12:00 PM' : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
                </div>
                    </div>
                  ))}
                </div>

                {/* Resource Columns */}
                {displayResources.map((resource) => {
                  const resourceEvents = dayEvents.filter((event: any) => event.resourceId === resource.id);
                  
                  return (
                    <div key={resource.id} className="flex-1 relative border-r border-gray-200 last:border-r-0">
                      {/* Time slot lines */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-t border-gray-200"
                          style={{ top: `${(hour - 6) * 120}px` }}
                        />
                      ))}

                      {/* Current time indicator for this column */}
            {isSameDay(currentTime, currentDate) && currentHour >= 6 && currentHour < 22 && (
              <div
                          className="absolute left-0 right-0 z-10"
                style={{ top: `${currentTop}px` }}
              >
                <div className="relative">
                  <div className="absolute left-0 w-2 h-2 rounded-full bg-purple-500" style={{ top: '-4px' }} />
                  <div className="absolute left-0 right-0 border-t-2 border-dotted border-purple-500" />
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
                        const isRepeatCustomer = event.customerId && event.customerId !== 'new';
                
                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                            className={`absolute left-1 right-1 rounded-lg p-2 cursor-pointer ${eventBgColor} ${eventTextColor} border-l-4`}
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
                            <div className="font-semibold text-xs mb-1">
                              {serviceName}
                    </div>
                            
                            {/* Badges */}
                            <div className="flex flex-wrap gap-1 mb-1">
                              {locationType && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-pink-200 text-pink-800">
                                  {locationType}
                                </span>
                              )}
                              {isRepeatCustomer && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-200 text-purple-800">
                                  Repeat customer
                                </span>
                              )}
                            </div>
                            
                            {/* Customer Info */}
                            {event.customerName && (
                              <div className="text-[10px] font-medium mt-1">
                                {event.customerName}
                              </div>
                            )}
                            {event.customerPhone && (
                              <div className="text-[10px] text-gray-600 mt-0.5">
                                {event.customerPhone}
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
            className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            aria-label="Filter employees"
          >
            <FunnelIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            {selectedTechnicians.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                {selectedTechnicians.length}
              </span>
            )}
          </button>
          
          {/* Add Event Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-black dark:bg-gray-900 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-700 transition"
            aria-label="Add event"
          >
            <PlusIcon className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Employee Filter Dropdown - Mobile */}
        {isTeamDropdownOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
              onClick={() => setIsTeamDropdownOpen(false)}
            />
            <div className="fixed bottom-24 right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-40 w-64 max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Employees</h3>
          <button
                    onClick={() => setIsTeamDropdownOpen(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
                    <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => {
                    setSelectedTechnicians([]);
                    setIsTeamDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                    selectedTechnicians.length === 0
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All Employees
                </button>
                {teamEmployees.map((employee) => {
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
                      }}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left flex items-center gap-3 ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {employee.imageUrl ? (
                        <img
                          src={employee.imageUrl}
                          alt={employee.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <UsersIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                      )}
                      <span>{employee.name}</span>
                      {isSelected && (
                        <CheckIcon className="w-5 h-5 ml-auto" />
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

  // Render mobile view if on mobile
  if (isMobile && viewMode === 'day') {
    return (
      <>
        {renderMobileCalendar()}
        {/* Keep modals and sidebars */}
        <EventModal 
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedResource(null);
              setDraftEvent(null);
              setNewCustomerData(null);
            }}
            onAddEvent={handleAddEvent}
            preSelectedResource={selectedResource}
            resources={resources.length > 0 ? resources : []}
            draftEvent={draftEvent}
            onOpenNewCustomerModal={(initialName) => {
              setNewCustomerModalInitialName(initialName);
              setIsNewCustomerModalOpen(true);
            }}
            newCustomerData={newCustomerData}
        />
        {eventDetailsOpen && selectedEventData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedEventData.title || selectedEventData.eventName}
                  </h3>
                  <button
                    onClick={handleCloseEventDetails}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseEventDetails}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg"
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
        {selectedEventData && (
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
            onClick={() => {
              setSelectedEventData(null);
              setSelectedEvent(null);
            }}
          />
        )}
        {/* Bottom Sheet - Mobile - Only for event details */}
        {selectedEventData && (
        <div 
          ref={bottomSheetRef}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[9999] transform transition-transform duration-300 ease-out translate-y-0"
          style={{ 
            maxHeight: '85vh', 
            minHeight: '200px',
            isolation: 'isolate'
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            bottomSheetTouchStartRef.current = {
              y: touch.clientY,
              time: Date.now()
            };
          }}
          onTouchEnd={(e) => {
            if (!bottomSheetTouchStartRef.current) return;
            
            const touch = e.changedTouches[0];
            const deltaY = touch.clientY - bottomSheetTouchStartRef.current.y;
            const deltaTime = Date.now() - bottomSheetTouchStartRef.current.time;
            
            // Swipe down to close (minimum 100px down, within 500ms)
            if (deltaY > 100 && deltaTime < 500) {
              setSelectedEventData(null);
              setSelectedEvent(null);
            }
            
            bottomSheetTouchStartRef.current = null;
          }}
        >
          {/* Drag Handle and Close Button */}
          <div className="flex items-center justify-between pt-3 pb-2 px-4">
            <div className="flex-1 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <button
              onClick={() => {
                setSelectedEventData(null);
                setSelectedEvent(null);
              }}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ maxHeight: 'calc(85vh - 20px)' }}>
            {selectedEventData && (
              <div className="space-y-4">
                {/* Service Name and Vehicle */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {Array.isArray(selectedEventData.services) 
                        ? selectedEventData.services.join(', ')
                        : (selectedEventData.services || selectedEventData.title || selectedEventData.eventName || 'Event')}
                    </h3>
                  </div>
                  {(selectedEventData.vehicleType || selectedEventData.vehicleModel) && (
                    <p className="text-base text-gray-700 ml-4">
                      {selectedEventData.vehicleType || selectedEventData.vehicleModel}
                    </p>
                  )}
                  
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-3 ml-4">
                    {selectedEventData.locationType && (
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        (selectedEventData.locationType?.toLowerCase() === 'drop off' || selectedEventData.locationType?.toLowerCase() === 'dropoff')
                          ? 'bg-pink-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {selectedEventData.locationType?.toLowerCase() === 'dropoff' ? 'Drop off' : 
                         selectedEventData.locationType?.toLowerCase() === 'drop off' ? 'Drop off' :
                         selectedEventData.locationType?.toLowerCase() === 'pickup' ? 'Pick up' :
                         selectedEventData.locationType?.toLowerCase() === 'pick up' ? 'Pick up' :
                         selectedEventData.locationType}
                      </span>
                    )}
                    {selectedEventData.customerId && selectedEventData.customerId !== 'new' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500 text-white">
                        Repeat customer
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Information Card */}
                {(selectedEventData.customerName || selectedEventData.customerPhone || selectedEventData.customerAddress) && (
                  <div className="bg-gray-50 rounded-xl p-4 border" style={{ borderColor: '#E2E2DD' }}>
                    <div className="flex items-start gap-3 mb-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-700 font-semibold text-sm">
                          {selectedEventData.customerName 
                            ? selectedEventData.customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                            : '??'}
                        </span>
                      </div>
                      
                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        {selectedEventData.customerName && (
                          <h4 className="font-semibold text-gray-900 text-base mb-1">
                            {selectedEventData.customerName}
                          </h4>
                        )}
                        {selectedEventData.customerPhone && (
                          <p className="text-sm text-gray-600 mb-2">
                            {selectedEventData.customerPhone}
                          </p>
                        )}
                        {selectedEventData.customerAddress && (
                          <p className="text-sm text-gray-600 underline">
                            {selectedEventData.customerAddress}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Past Jobs */}
                    {customerPastJobs && customerPastJobs.length > 0 && (
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E2E2DD' }}>
                        <p className="font-semibold text-sm text-gray-900 mb-2">
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
                              <span>. {customerPastJobs[0].vehicleModel}</span>
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 h-full flex flex-col overflow-hidden w-full max-w-full min-w-0" style={{ position: 'relative' }}>
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0 pr-24">
            <div className="flex items-center space-x-2 relative">
                <button 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {renderHeaderDate()}
                </h2>
                </button>
                <button onClick={handlePrev} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeftIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => {
                    setCurrentDate(new Date());
                    setIsDatePickerOpen(false);
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Today
                </button>
                <button onClick={handleNext} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronRightIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </button>
                <div className="relative flex items-center gap-2 overflow-hidden" ref={teamDropdownRef}>
                  <button
                    onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 flex-shrink-0"
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
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
                        className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* Legacy Team Dropdown - keeping for now but can be removed */}
                  {false && isTeamDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[320px] max-w-md max-h-[500px] overflow-y-auto">
                      <div className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          Team - {format(currentDate, 'EEEE, MMMM d, yyyy')}
                        </h3>
                        {isLoadingEmployees ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading employees...</div>
                        ) : teamEmployees.length === 0 ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400 py-4">No employees found</div>
                        ) : (
                          <div className="space-y-3">
                            {teamEmployees.map((employee: any) => {
                              // Filter events for the selected date
                              const selectedDateStr = format(currentDate, 'yyyy-MM-dd');
                              const dayEvents = bookings.filter((event: any) => {
                                let eventDate;
                                if (event.start) {
                                  eventDate = event.start.includes('T') ? event.start.split('T')[0] : event.start;
                                } else if (event.date) {
                                  eventDate = typeof event.date === 'string' ? event.date : format(new Date(event.date), 'yyyy-MM-dd');
                                } else {
                                  return false;
                                }
                                return eventDate === selectedDateStr;
                              });

                              // For now, show all events for the day since there's no direct employee-event link
                              // In the future, we can add employeeId to events or link employees to resources
                              // For now, we'll show events that might be assigned to this employee
                              // This is a placeholder - you may want to add employeeId to events later
                              const employeeEvents = dayEvents; // Show all events for now

                              return (
                                <div key={employee.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0">
                                  <div className="flex items-center gap-3 mb-2">
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
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                                        {employee.name}
                                      </div>
                                      {employee.email && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
                                            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                          >
                                            {event.start && event.start.includes('T') ? (
                                              <span className="font-medium">{format(parseISO(event.start), 'h:mm a')}</span>
                                            ) : null}
                                            {event.start && event.start.includes('T') ? ' - ' : ''}
                                            <span>{event.title || event.eventName || 'Untitled Event'}</span>
                                            {resource && (
                                              <span className="ml-1 text-gray-500 dark:text-gray-400">
                                                ({resource.name})
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="ml-13 text-xs text-gray-400 dark:text-gray-500 italic">
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
                  <div ref={datePickerRef} className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4" style={{ minWidth: '280px' }}>
                    <div className="flex items-center justify-between mb-4">
                <button
                        onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                        <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {format(currentDate, 'MMMM yyyy')}
                      </h3>
                      <button
                        onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                        <div key={day} className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1">
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
                            className={`text-xs p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              isSelected
                                ? 'bg-black text-white dark:bg-gray-600 dark:text-white'
                                : isTodayDate
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold'
                                : 'text-gray-700 dark:text-gray-300'
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
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                    {(['day', 'week', 'month'] as const).map(view => (
                         <button 
                            key={view}
                            onClick={() => setViewMode(view)}
                            className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${viewMode === view ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
                {/* Floating Zoom Slider */}
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 shadow-sm border border-gray-200 dark:border-gray-700">
                    <Image 
                        src="/icons/zoom-in.svg" 
                        alt="Zoom" 
                        width={16} 
                        height={16}
                        className="text-gray-500 dark:text-gray-400"
                    />
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={calendarScale}
                        onChange={(e) => setCalendarScale(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-600 dark:accent-gray-400"
                        style={{
                            background: `linear-gradient(to right, #4B5563 0%, #4B5563 ${((calendarScale - 0.5) / 1.5) * 100}%, #E5E7EB ${((calendarScale - 0.5) / 1.5) * 100}%, #E5E7EB 100%)`
                        }}
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[2.5rem] text-right">
                        {Math.round(calendarScale * 100)}%
                    </span>
                </div>
            </div>
        </div>
        
        <div 
          className={`flex-1 min-h-0 ${viewMode === 'month' ? 'min-w-0 overflow-hidden' : 'min-w-0'} ${isActionSidebarOpen ? 'pr-0 md:pr-[400px] lg:pr-[420px]' : 'pr-16'}`}
          style={{ transition: 'padding-right 0.3s ease-in-out' }}
        >
          {isLoadingEvents ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-gray-600 dark:text-gray-400">Loading calendar events...</div>
            </div>
          ) : (
            <>
              {viewMode === 'month' && <MonthView date={currentDate} events={filteredBookings} selectedEvent={selectedEvent} onEventClick={handleEventClick} scale={calendarScale} />}
              {viewMode === 'week' && <WeekView 
                date={currentDate} 
                events={filteredBookings} 
                onEventClick={handleEventClick} 
                resources={resources.length > 0 ? resources : [{ id: 'station', name: 'Station', type: 'bay' }]} 
                scale={calendarScale} 
                businessHours={businessHours}
                onResourceSelect={setSelectedResource}
                onOpenModal={(draft) => {
                  if (draft) {
                    setDraftEvent({
                      resourceId: draft.resourceId,
                      startTime: draft.startTime,
                      endTime: draft.endTime
                    });
                  }
                  setIsModalOpen(true);
                }}
                draftEvent={draftEvent ? {
                  resourceId: draftEvent.resourceId,
                  startTime: draftEvent.startTime,
                  endTime: draftEvent.endTime,
                  date: currentDate
                } : null}
                onDraftEventUpdate={(updatedDraft) => {
                  setDraftEvent({
                    resourceId: updatedDraft.resourceId,
                    startTime: updatedDraft.startTime,
                    endTime: updatedDraft.endTime
                  });
                }}
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
                  onOpenModal={(draft) => {
                    if (draft) {
                      setDraftEvent(draft);
                    }
                    setIsModalOpen(true);
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
            onClose={() => {
              setIsModalOpen(false);
              setSelectedResource(null);
              setDraftEvent(null);
              setNewCustomerData(null);
            }}
            onAddEvent={handleAddEvent}
            preSelectedResource={selectedResource}
            resources={resources.length > 0 ? resources : []}
            draftEvent={draftEvent}
            onOpenNewCustomerModal={(initialName) => {
              setNewCustomerModalInitialName(initialName);
              setIsNewCustomerModalOpen(true);
            }}
            newCustomerData={newCustomerData}
        />

        {/* Event Details Modal */}
        {eventDetailsOpen && selectedEventData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedEventData.title || selectedEventData.eventName}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseEventDetails}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Event Details */}
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
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
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.allDay ? 'All-day event' : 'Timed event'}
                    </span>
                  </div>

                  {/* Source */}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
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
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEventData.description}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseEventDetails}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  
                  {/* Show delete button for local events */}
                  {(selectedEventData.source === 'local' || selectedEventData.source === 'local-google-synced') && (
                    <button
                      onClick={handleDeleteEvent}
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

        {/* Action Sidebar Backdrop */}
        {isActionSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[85]"
            onClick={() => setIsActionSidebarOpen(false)}
          />
        )}
        
        {/* Action Sidebar */}
        <div 
          ref={actionSidebarRef}
          className={`fixed top-0 right-0 h-full w-full md:w-[400px] lg:w-[420px] shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out ${
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
                      alt="Event Details" 
                      width={20} 
                      height={20}
                      className="object-contain"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2" style={{ borderColor: '#F8F8F7' }}></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Event Details
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
                    setIsActionSidebarOpen(false);
                    setSelectedEventData(null);
                    setSelectedEvent(null);
                    setIsEditingNotes(false); // Reset notes edit mode when closing sidebar
                    setShowCustomerDetailsPopup(false); // Close customer popup when closing sidebar
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content - Show event details if event is selected, otherwise show today's events */}
            <div className="flex-1 overflow-y-auto pb-32">
              {selectedEventData ? (
                isEditingEvent ? (
                  // Show edit form
                  <div className="p-6">
                  <EventEditForm
                    event={selectedEventData}
                    resources={resources}
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
                          
                          // Construct start and end fields from the saved data for proper form initialization
                          let updatedEventData = { ...selectedEventData, ...updatedData };
                          
                          // Map startDate/endDate to start/end for form initialization
                          if (updatedData.startDate) {
                            updatedEventData.start = updatedData.startDate;
                          }
                          if (updatedData.endDate) {
                            updatedEventData.end = updatedData.endDate;
                          } else if (updatedData.startDate) {
                            // If only startDate is provided, use it for end as well
                            updatedEventData.end = updatedData.startDate;
                          }
                          
                          // Also include the time field if it was updated
                          if (updatedData.time !== undefined) {
                            updatedEventData.time = updatedData.time;
                          }
                          
                          // Update selected event data with computed fields
                          setSelectedEventData(updatedEventData);
                          alert('Event updated successfully!');
                        } else {
                          const error = await response.json();
                          alert(`Failed to update event: ${error.error}`);
                        }
                      } catch (error) {
                        console.error('Error updating event:', error);
                        alert('Failed to update event. Please try again.');
                      }
                    }}
                    onCancel={() => {
                      setIsEditingEvent(false);
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
                    {(selectedEventData.customerName || selectedEventData.customerPhone) ? (
                      <div 
                        ref={eventDetailsCustomerCardRef}
                        className="bg-gray-50 rounded-xl p-4 border relative cursor-pointer hover:bg-gray-100 transition-colors" 
                        style={{ borderColor: '#E2E2DD' }}
                        onClick={() => {
                          if (eventDetailsCustomerCardRef.current) {
                            const rect = eventDetailsCustomerCardRef.current.getBoundingClientRect();
                            // Position popup to the left of the action panel, adjacent to customer box
                            // Action panel is fixed right-0 with width 400px
                            const actionPanelWidth = 400;
                            const popupWidth = 320; // w-80 = 320px
                            const gap = 4; // 4px gap between popup and action panel
                            
                            setCustomerPopupPosition({
                              top: rect.top, // Align top with customer card
                              right: actionPanelWidth + gap // Position to the left of action panel with gap
                            });
                          }
                          setShowCustomerDetailsPopup(true);
                        }}
                      >
                        <div className="pr-8">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-base">
                              {selectedEventData.customerName || 'Unnamed Customer'}
                            </h4>
                            {selectedEventData.customerPhone && (
                              <span className="text-sm text-gray-600">
                                {selectedEventData.customerPhone}
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
                      <p className="text-sm text-gray-500 italic">No customer information available</p>
                    )}
                  </div>

                  {/* Customer Details Popup - appears outside action panel, adjacent to customer box */}
                  {showCustomerDetailsPopup && selectedEventData && customerPopupPosition && (
                    <>
                      {/* Popup Panel - Positioned to the left of action panel, adjacent to customer box */}
                      <div 
                        ref={customerDetailsPopupRef}
                        className="fixed w-80 bg-white shadow-2xl z-[60] rounded-xl overflow-hidden" style={{ 
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
                                      {selectedEventData.customerPhone || 'Not provided'}
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
                                    <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Location Type</label>
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

                      {/* Customer Type and Location Type */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Information</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Customer Type Tag */}
                          {selectedEventData.customerType && (
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${
                              selectedEventData.customerType.toLowerCase() === 'new' 
                                ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                : selectedEventData.customerType.toLowerCase() === 'returning'
                                ? 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                : selectedEventData.customerType.toLowerCase() === 'maintenance'
                                ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {selectedEventData.customerType === 'new' ? 'New Customer' : 
                               selectedEventData.customerType === 'returning' ? 'Returning Customer' :
                               selectedEventData.customerType === 'maintenance' ? 'Maintenance Customer' :
                               selectedEventData.customerType}
                            </span>
                          )}
                          
                          {/* Location Type Tag */}
                          {selectedEventData.locationType && (
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block ${
                              (selectedEventData.locationType?.toLowerCase() === 'pick up' || selectedEventData.locationType?.toLowerCase() === 'pickup')
                                ? 'bg-blue-500 text-white'
                                : (selectedEventData.locationType?.toLowerCase() === 'drop off' || selectedEventData.locationType?.toLowerCase() === 'dropoff')
                                ? 'bg-pink-500 text-white'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
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
                        <div className="flex flex-wrap items-center gap-2">
                          {eventVehicles.map((vehicle) => (
                            <div
                              key={vehicle.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-white text-sm font-medium"
                            >
                              <span>{vehicle.model}</span>
                              <button
                                onClick={async () => {
                                  const updatedVehicles = eventVehicles.filter(v => v.id !== vehicle.id);
                                  setEventVehicles(updatedVehicles);
                                  
                                  // Update event
                                  if (selectedEventData?.id) {
                                    try {
                                      const vehicleModels = updatedVehicles.map(v => v.model);
                                      const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ 
                                          vehicleModel: vehicleModels.length > 0 ? vehicleModels.join(', ') : undefined,
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
                                }}
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
                                    onKeyDown={async (e) => {
                                      if (e.key === 'Enter' && newVehicleModel.trim()) {
                                        e.preventDefault();
                                        await handleAddVehicle(newVehicleModel.trim());
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
                                    onClick={async () => {
                                      if (newVehicleModel.trim()) {
                                        await handleAddVehicle(newVehicleModel.trim());
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

                      {/* Services (Job Details) */}
                      <div>
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
                                          onChange={async (e) => {
                                            let updatedServices: Array<{ id: string; name: string; type: 'service' | 'bundle' }>;
                                            if (e.target.checked) {
                                              updatedServices = [...selectedServices, { id: bundle.id, name: bundle.name, type: 'bundle' as const }];
                                            } else {
                                              updatedServices = selectedServices.filter(s => !(s.id === bundle.id && s.type === 'bundle'));
                                            }
                                            setSelectedServices(updatedServices);
                                            setServiceSearch('');
                                            
                                            // Update event
                                            if (selectedEventData?.id) {
                                              try {
                                                const serviceNames = updatedServices.map(s => s.name);
                                                const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ services: serviceNames }),
                                                });
                                                
                                                if (response.ok) {
                                                  const updatedData = await response.json();
                                                  setSelectedEventData({ ...selectedEventData, ...updatedData });
                                                  fetchCalendarEvents();
                                                }
                                              } catch (error) {
                                                console.error('Error updating services:', error);
                                              }
                                            }
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
                                          onChange={async (e) => {
                                            let updatedServices: Array<{ id: string; name: string; type: 'service' | 'bundle' }>;
                                            if (e.target.checked) {
                                              updatedServices = [...selectedServices, { id: service.id, name: service.name, type: 'service' as const }];
                                            } else {
                                              updatedServices = selectedServices.filter(s => !(s.id === service.id && s.type === 'service'));
                                            }
                                            setSelectedServices(updatedServices);
                                            setServiceSearch('');
                                            
                                            // Update event
                                            if (selectedEventData?.id) {
                                              try {
                                                const serviceNames = updatedServices.map(s => s.name);
                                                const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ services: serviceNames }),
                                                });
                                                
                                                if (response.ok) {
                                                  const updatedData = await response.json();
                                                  setSelectedEventData({ ...selectedEventData, ...updatedData });
                                                  fetchCalendarEvents();
                                                }
                                              } catch (error) {
                                                console.error('Error updating services:', error);
                                              }
                                            }
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
                                    onClick={async () => {
                                      const updatedServices = selectedServices.filter(s => !(s.id === item.id && s.type === item.type));
                                      setSelectedServices(updatedServices);
                                      
                                      // Update event
                                      if (selectedEventData?.id) {
                                        try {
                                          const serviceNames = updatedServices.map(s => s.name);
                                          const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ services: serviceNames }),
                                          });
                                          
                                          if (response.ok) {
                                            const updatedData = await response.json();
                                            setSelectedEventData({ ...selectedEventData, ...updatedData });
                                            fetchCalendarEvents();
                                          }
                                        } catch (error) {
                                          console.error('Error updating services:', error);
                                        }
                                      }
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

                      {/* Date and Time (Scheduling) */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Scheduling</h3>
                    {(selectedEventData.date || selectedEventData.start) && (() => {
                      // Prioritize the 'date' field which should be in YYYY-MM-DD format from the API
                      // Only use 'start' as fallback if 'date' is not available
                      let dateStr = '';
                      
                      if (selectedEventData.date) {
                        // The 'date' field from API should already be in YYYY-MM-DD format
                        if (typeof selectedEventData.date === 'string' && selectedEventData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          dateStr = selectedEventData.date;
                        } else {
                          // If it's not in the expected format, try to extract it using UTC
                          const date = new Date(selectedEventData.date);
                          dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                        }
                      } else if (selectedEventData.start) {
                        // Fallback to 'start' field if 'date' is not available
                        const eventDate = selectedEventData.start;
                        if (typeof eventDate === 'string') {
                          if (eventDate.includes('T')) {
                            // Extract date part from ISO string
                            dateStr = eventDate.split('T')[0];
                          } else if (eventDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            dateStr = eventDate;
                          } else {
                            const date = new Date(eventDate);
                            dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                          }
                        } else {
                          const date = new Date(eventDate);
                          dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
                        }
                      }
                      
                      if (!dateStr) return null;
                      
                      // Format the date string directly to avoid timezone conversion
                      // Parse YYYY-MM-DD and format it manually
                      const [year, month, day] = dateStr.split('-').map(Number);
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      
                      // Create a UTC date to get the day of week
                      const utcDate = new Date(Date.UTC(year, month - 1, day));
                      const dayOfWeek = dayNames[utcDate.getUTCDay()];
                      const monthName = monthNames[month - 1];
                      
                      const formattedDate = `${dayOfWeek}, ${monthName} ${day}, ${year}`;
                      
                      // Format time if available (for non-all-day events)
                      let timeDisplay = '';
                      if (!selectedEventData.allDay && selectedEventData.start && selectedEventData.end) {
                        timeDisplay = ` @ ${format(new Date(selectedEventData.start), 'h:mm a')} - ${format(new Date(selectedEventData.end), 'h:mm a')}`;
                      }
                      
                      return (
                        <p className="text-sm text-gray-900">
                          {formattedDate}{timeDisplay}
                        </p>
                      );
                    })()}
                  </div>

                      {/* Technician/Employee */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Technician</h3>
                    {selectedEventData.employeeId ? (() => {
                      const assignedEmployee = allEmployees.find(e => e.id === selectedEventData.employeeId);
                      return assignedEmployee ? (
                        <div className="relative" ref={employeeSwitchRef}>
                          <div 
                            className="bg-white rounded-xl p-4 border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ borderColor: '#E2E2DD' }}
                            onClick={() => setShowEmployeeSwitchDropdown(!showEmployeeSwitchDropdown)}
                          >
                            <div className="flex items-center gap-3">
                              {assignedEmployee.imageUrl ? (
                                <img 
                                  src={assignedEmployee.imageUrl} 
                                  alt={assignedEmployee.name}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 border"
                                  style={{ borderColor: '#E2E2DD' }}
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                                  assignedEmployee.color === 'blue' ? 'bg-blue-500' :
                                  assignedEmployee.color === 'green' ? 'bg-green-500' :
                                  assignedEmployee.color === 'orange' ? 'bg-orange-500' :
                                  assignedEmployee.color === 'red' ? 'bg-red-500' :
                                  assignedEmployee.color === 'gray' ? 'bg-gray-500' :
                                  'bg-blue-500'
                                }`}>
                                  {assignedEmployee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                              <span className="text-sm font-medium text-gray-900">
                                {assignedEmployee.name}
                              </span>
                        </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowEmployeeSwitchDropdown(!showEmployeeSwitchDropdown);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span className="text-sm text-gray-900">Switch</span>
                            </button>
                        </div>
                          
                          {/* Employee Dropdown */}
                          {showEmployeeSwitchDropdown && (
                            <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#E2E2DD' }}>
                              {allEmployees.map((employee) => (
                                <button
                                  key={employee.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ employeeId: employee.id }),
                                      });

                                      if (response.ok) {
                                        const updatedData = await response.json();
                                        setSelectedEventData({ ...selectedEventData, employeeId: employee.id });
                                        fetchCalendarEvents();
                                        setShowEmployeeSwitchDropdown(false);
                                      } else {
                                        const error = await response.json();
                                        alert(`Failed to update employee: ${error.error}`);
                                      }
                                    } catch (error) {
                                      console.error('Error updating employee:', error);
                                      alert('Failed to update employee. Please try again.');
                                    }
                                  }}
                                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                                    selectedEventData.employeeId === employee.id ? 'bg-gray-50' : ''
                                  }`}
                                >
                                  {employee.imageUrl ? (
                                    <img 
                                      src={employee.imageUrl} 
                                      alt={employee.name}
                                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 border"
                                      style={{ borderColor: '#E2E2DD' }}
                                    />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                                      employee.color === 'blue' ? 'bg-blue-500' :
                                      employee.color === 'green' ? 'bg-green-500' :
                                      employee.color === 'orange' ? 'bg-orange-500' :
                                      employee.color === 'red' ? 'bg-red-500' :
                                      employee.color === 'gray' ? 'bg-gray-500' :
                                      'bg-blue-500'
                                    }`}>
                                      {employee.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                                  <span className="text-sm text-gray-900">{employee.name}</span>
                                  {selectedEventData.employeeId === employee.id && (
                                    <svg className="w-4 h-4 text-gray-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                  </div>
                    )}
                  </div>
                      ) : null;
                    })() : (
                      <div className="relative" ref={employeeSwitchRef}>
                        <div 
                          className="bg-white rounded-xl p-4 border flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                          style={{ borderColor: '#E2E2DD' }}
                          onClick={() => setShowEmployeeSwitchDropdown(!showEmployeeSwitchDropdown)}
                        >
                          <span className="text-sm text-gray-500">No technician assigned</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEmployeeSwitchDropdown(!showEmployeeSwitchDropdown);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="text-sm text-gray-900">Assign</span>
                          </button>
                  </div>

                        {/* Employee Dropdown */}
                        {showEmployeeSwitchDropdown && (
                          <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: '#E2E2DD' }}>
                            {allEmployees.map((employee) => (
                    <button
                                key={employee.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                          try {
                            const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ employeeId: employee.id }),
                            });

                            if (response.ok) {
                                      const updatedData = await response.json();
                                      setSelectedEventData({ ...selectedEventData, employeeId: employee.id });
                              fetchCalendarEvents();
                                      setShowEmployeeSwitchDropdown(false);
                            } else {
                              const error = await response.json();
                                      alert(`Failed to update employee: ${error.error}`);
                            }
                          } catch (error) {
                                    console.error('Error updating employee:', error);
                                    alert('Failed to update employee. Please try again.');
                                  }
                                }}
                                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                                  employee.color === 'blue' ? 'bg-blue-500' :
                                  employee.color === 'green' ? 'bg-green-500' :
                                  employee.color === 'orange' ? 'bg-orange-500' :
                                  employee.color === 'red' ? 'bg-red-500' :
                                  employee.color === 'gray' ? 'bg-gray-500' :
                                  'bg-blue-500'
                                }`}>
                                  {employee.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-900">{employee.name}</span>
                    </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                    
                    // Get service name
                    const serviceName = Array.isArray(event.services) 
                      ? event.services.join(' + ') 
                      : event.services || event.title || 'Service';
                    
                    // Get vehicle type
                    const vehicleType = event.vehicleType || 'Vehicle';
                    
                    // Get customer info
                    const customerName = event.customerName || 'Customer';
                    const customerPhone = event.customerPhone || event.phone || '';
                    
                    return (
                      <div key={event.id || index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        {/* Service name with red bullet */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
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
                        <div className="text-xs text-gray-500 mb-16 ml-4">
                          {vehicleType}
                        </div>
                        
                        {/* Customer info and Action buttons - aligned horizontally */}
                        <div className="flex items-center justify-between ml-4">
                          <div className="flex flex-col">
                            {customerPhone && (
                              <div className="text-sm text-gray-500 mb-1">
                                {customerPhone}
                              </div>
                            )}
                            <div className="text-gray-900 font-semibold" style={{ fontSize: '18px' }}>
                              {customerName}
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex gap-2 items-center">
                          <button 
                            onClick={async () => {
                              // Handle cancel/delete
                              if (event.id) {
                                const confirmDelete = window.confirm(
                                  'Are you sure you want to delete this event?'
                                );
                                
                                if (!confirmDelete) return;
                                
                                try {
                                  const response = await fetch(`/api/detailer/events/${event.id}`, {
                                    method: 'DELETE',
                                  });

                                  if (response.ok) {
                                    fetchCalendarEvents();
                                    alert('Event deleted successfully!');
                                  } else {
                                    const error = await response.json();
                                    alert(`Failed to delete event: ${error.error}`);
                                  }
                                } catch (error) {
                                  console.error('Error deleting event:', error);
                                  alert('Failed to delete event. Please try again.');
                                }
                              }
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
                                    alert('Booking confirmed successfully!');
                                  } else {
                                    const error = await response.json();
                                    alert(`Failed to confirm booking: ${error.error}`);
                                  }
                                } catch (error) {
                                  console.error('Error confirming booking:', error);
                                  alert('Failed to confirm booking. Please try again.');
                                }
                              } else if (event.status === 'pending') {
                                // For events without bookingId, just refresh (they're already created)
                                fetchCalendarEvents();
                                alert('Event accepted!');
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
            
            {/* Customer Notes - keep inside scrollable content */}
            {selectedEventData && !isEditingEvent && (
              <div className="p-6 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Add notes</h3>
                  {!isEditingNotes && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit notes"
                    >
                      <PencilIcon className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    value={selectedEventData.description || ''}
                    readOnly={!isEditingNotes}
                    onChange={(e) => {
                      if (!isEditingNotes) return;
                      
                      const newDescription = e.target.value;
                      // Update local state immediately for responsive UI
                      setSelectedEventData({ ...selectedEventData, description: newDescription });
                      
                      // Clear existing timeout
                      if (notesSaveTimeoutRef.current) {
                        clearTimeout(notesSaveTimeoutRef.current);
                      }
                      
                      // Debounce the API call - save after user stops typing for 500ms
                      notesSaveTimeoutRef.current = setTimeout(async () => {
                        if (!selectedEventData?.id) return;
                        
                        // Capture the current description at the time of save
                        const descriptionToSave = newDescription;
                        
                        try {
                          const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ description: descriptionToSave }),
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            console.error('Failed to update notes:', error);
                            // Note: We don't revert on error since the user has already typed more
                          }
                          // Don't call fetchCalendarEvents() - it's not necessary and can cause refresh
                        } catch (error) {
                          console.error('Error updating notes:', error);
                          // Note: We don't revert on error since the user has already typed more
                        }
                      }, 500);
                    }}
                    onBlur={() => {
                      // Auto-save and exit edit mode when clicking outside
                      if (isEditingNotes) {
                        setIsEditingNotes(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent Enter from causing any form submission
                      if (e.key === 'Enter' && e.ctrlKey) {
                        // Allow Ctrl+Enter for new lines
                        return;
                      }
                      // Exit edit mode on Escape
                      if (e.key === 'Escape' && isEditingNotes) {
                        setIsEditingNotes(false);
                      }
                    }}
                    placeholder={isEditingNotes ? "Type notes" : "No notes added"}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none ${
                      !isEditingNotes ? 'bg-gray-50 cursor-default' : ''
                    }`}
                    style={{ borderColor: '#E2E2DD', minHeight: '100px' }}
                    rows={4}
                  />
                </div>
              </div>
            )}
            </div>
            
            {/* Footer - Action Buttons (only show when viewing event details, not editing) */}
            {selectedEventData && !isEditingEvent && (
              <div className="flex-shrink-0 p-6" style={{ backgroundColor: '#F8F8F7' }}>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={async () => {
                      if (selectedEventData?.id) {
                        const confirmDelete = window.confirm(
                          'Are you sure you want to delete this event? This will remove it from both Reeva Detailer and Google Calendar.'
                        );
                        
                        if (!confirmDelete) return;
                        
                        try {
                          const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
                            method: 'DELETE',
                          });

                          if (response.ok) {
                            fetchCalendarEvents();
                            setSelectedEventData(null);
                            setSelectedEvent(null);
                            setIsActionSidebarOpen(false);
                            alert('Event deleted successfully!');
                          } else {
                            const error = await response.json();
                            alert(`Failed to delete event: ${error.error}`);
                          }
                        } catch (error) {
                          console.error('Error deleting event:', error);
                          alert('Failed to delete event. Please try again.');
                        }
                      }
                    }}
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
          }}
          onSuccess={(customer) => {
            // Store the new customer data to populate EventModal form
            setNewCustomerData(customer);
            
            // Close modal
            setIsNewCustomerModalOpen(false);
            setNewCustomerModalInitialName('');
          }}
          initialName={newCustomerModalInitialName}
        />
    </div>
  );
} 
