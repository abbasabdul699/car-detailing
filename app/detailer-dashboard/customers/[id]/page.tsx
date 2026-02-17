'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { formatPhoneDisplay, normalizeToE164 } from '@/lib/phone';
import { getCustomerTypeFromHistory } from '@/lib/customerType';

// ── Helpers ──────────────────────────────────────────────────────────

const getCleanDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  if (desc.includes('__METADATA__:')) {
    return desc.split('__METADATA__:')[0].trim();
  }
  return desc;
};

const extractNotesFromDescription = (desc: string | null | undefined): string => {
  if (!desc) return '';
  if (desc.includes('__METADATA__:')) return getCleanDescription(desc);
  const lines = desc.split('\n');
  const notesLine = lines.find(line => line.trim().toLowerCase().startsWith('notes:'));
  if (notesLine) return notesLine.split(':').slice(1).join(':').trim();
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
  return match ? match[1].trim() : '';
};

const normalizePhoneForMatch = (raw: string | null | undefined) => {
  if (!raw) return { e164: null as string | null, last10: null as string | null };
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
    const dateStr = format(date, 'MMM d, yyyy');
    if (timeValue) return `${dateStr} at ${timeValue}`;
    return dateStr;
  } catch {
    return 'Date unavailable';
  }
};

const getInitials = (name?: string | null): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ── Types ────────────────────────────────────────────────────────────

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

// Helpers for structured notes/vehicles
const getCustomerVehicles = (customer: Customer): string[] => {
  if (customer.data && typeof customer.data === 'object' && Array.isArray(customer.data.vehicles)) {
    return customer.data.vehicles.filter((v: any) => typeof v === 'string' && v.trim());
  }
  const legacy = customer.vehicleModel || customer.vehicle;
  return legacy ? [legacy] : [];
};

const getCustomerNotes = (customer: Customer): CustomerNote[] => {
  if (customer.data && typeof customer.data === 'object' && Array.isArray(customer.data.customerNotes)) {
    return customer.data.customerNotes;
  }
  if (customer.data && typeof customer.data === 'object' && customer.data.notes) {
    return [{
      id: 'legacy',
      text: customer.data.notes,
      createdAt: customer.updatedAt || new Date().toISOString(),
    }];
  }
  return [];
};

interface Job {
  id: string;
  date: string;
  time?: string | null;
  services: string[];
  vehicleModel?: string;
  locationType?: string;
  resourceType?: string | null;
  isUpcoming?: boolean;
  employeeName?: string | null;
  notes?: string;
}

// ── Component ────────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Notes state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const newNoteRef = useRef<HTMLTextAreaElement>(null);

  // Vehicles state
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehicleName, setNewVehicleName] = useState('');
  const newVehicleRef = useRef<HTMLInputElement>(null);

  // Hide hamburger menu on mobile for this page
  useEffect(() => {
    document.body.classList.add('customer-profile-open');
    return () => document.body.classList.remove('customer-profile-open');
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch customer data
  useEffect(() => {
    if (!customerId || !session?.user) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/detailer/customers/${customerId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setCustomer(data.customer);

        // Fetch jobs
        const [evRes, resRes] = await Promise.all([
          fetch('/api/detailer/calendar-events'),
          fetch('/api/detailer/resources'),
        ]);
        if (evRes.ok && resRes.ok) {
          const [evData, resData] = await Promise.all([evRes.json(), resRes.json()]);
          const allEvents = evData.events || [];
          const resources = resData.resources || [];
          const resourceMap = new Map<string, string>();
          resources.forEach((r: any) => resourceMap.set(r.id, r.type));

          const custPhones = normalizePhoneForMatch(data.customer.customerPhone);
          const matchesCustomer = (event: any) => {
            const ep = event.customerPhone || extractPhoneFromDescription(event.description);
            const eventPhones = normalizePhoneForMatch(ep);
            if (custPhones.e164 && eventPhones.e164 && custPhones.e164 === eventPhones.e164) return true;
            if (custPhones.last10 && eventPhones.last10 && custPhones.last10 === eventPhones.last10) return true;
            return false;
          };
          const isNotCancelled = (event: any) => {
            const status = typeof event.status === 'string' ? event.status.toLowerCase() : '';
            return status !== 'cancelled';
          };

          const now = new Date();
          const customerEvents = allEvents.filter((e: any) => matchesCustomer(e) && (isNotCancelled(e) || !e.status));
          const mapped: Job[] = customerEvents.map((event: any) => {
            const rt = event.resourceId ? resourceMap.get(event.resourceId) : null;
            const eventDateVal = getEventDateValue(event);
            const isUp = eventDateVal >= now.getTime();
            const notesFromDesc = extractNotesFromDescription(event.description);
            return {
              id: event.id,
              date: event.date || event.start || event.scheduledDate,
              time: event.time || null,
              services: Array.isArray(event.services) ? event.services : event.services ? [event.services] : [],
              vehicleModel: event.vehicleModel || event.vehicleType,
              locationType: event.locationType || null,
              resourceType: rt || null,
              isUpcoming: isUp,
              employeeName: event.employeeName || null,
              notes: event.notes || notesFromDesc || '',
            };
          });

          const upcoming = mapped.filter(j => {
            const t = j.date ? new Date(j.date).getTime() : 0;
            return t >= now.getTime();
          }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const past = mapped.filter(j => {
            const t = j.date ? new Date(j.date).getTime() : 0;
            return t < now.getTime();
          }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setJobs([...upcoming, ...past]);
        }
      } catch (err) {
        console.error('Error loading customer profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, session?.user]);

  // Derive customer type from history
  const getEffectiveCustomerType = (c: Customer) => {
    if (c.customerType && c.customerType !== 'new') return c.customerType;
    return getCustomerTypeFromHistory({ completedServiceCount: c.completedServiceCount, lastCompletedServiceAt: c.lastCompletedServiceAt });
  };

  // ── Note & Vehicle handlers ─────────────────────────────────────

  const handleAddNote = async (text: string) => {
    if (!customer || !text.trim()) { setIsAddingNote(false); setNewNoteText(''); return; }
    const currentNotes = getCustomerNotes(customer);
    const newNote: CustomerNote = { id: Date.now().toString(), text: text.trim(), createdAt: new Date().toISOString() };
    const updated = [...currentNotes, newNote];
    try {
      const res = await fetch(`/api/detailer/customers/${customer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: updated }),
      });
      if (res.ok) { const data = await res.json(); setCustomer(data.customer); }
    } catch (err) { console.error('Add note failed:', err); }
    finally { setIsAddingNote(false); setNewNoteText(''); }
  };

  const handleEditNote = async (noteId: string, newText: string) => {
    if (!customer || !newText.trim()) { setEditingNoteId(null); setEditingNoteText(''); return; }
    const currentNotes = getCustomerNotes(customer);
    const updated = currentNotes.map(n => n.id === noteId ? { ...n, text: newText.trim() } : n);
    try {
      const res = await fetch(`/api/detailer/customers/${customer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: updated }),
      });
      if (res.ok) { const data = await res.json(); setCustomer(data.customer); }
    } catch (err) { console.error('Edit note failed:', err); }
    finally { setEditingNoteId(null); setEditingNoteText(''); }
  };

  const handleRemoveNote = async (noteId: string) => {
    if (!customer) return;
    const currentNotes = getCustomerNotes(customer);
    const updated = currentNotes.filter(n => n.id !== noteId);
    try {
      const res = await fetch(`/api/detailer/customers/${customer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerNotes: updated }),
      });
      if (res.ok) { const data = await res.json(); setCustomer(data.customer); }
    } catch (err) { console.error('Remove note failed:', err); }
  };

  const handleAddVehicle = async (name: string) => {
    if (!customer || !name.trim()) { setIsAddingVehicle(false); setNewVehicleName(''); return; }
    const currentVehicles = getCustomerVehicles(customer);
    const updated = [...currentVehicles, name.trim()];
    try {
      const res = await fetch(`/api/detailer/customers/${customer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles: updated }),
      });
      if (res.ok) { const data = await res.json(); setCustomer(data.customer); }
    } catch (err) { console.error('Add vehicle failed:', err); }
    finally { setIsAddingVehicle(false); setNewVehicleName(''); }
  };

  const handleRemoveVehicle = async (index: number) => {
    if (!customer) return;
    const currentVehicles = getCustomerVehicles(customer);
    const updated = currentVehicles.filter((_, i) => i !== index);
    try {
      const res = await fetch(`/api/detailer/customers/${customer.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles: updated }),
      });
      if (res.ok) { const data = await res.json(); setCustomer(data.customer); }
    } catch (err) { console.error('Remove vehicle failed:', err); }
  };

  // ── Loading / not found states ───────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#F97316' }} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-3">
        <p className="text-sm" style={{ color: '#9e9d92' }}>Customer not found</p>
        <button
          onClick={() => router.push('/detailer-dashboard/customers')}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:opacity-90 text-white"
          style={{ backgroundColor: '#F97316' }}
        >
          Back to Customers
        </button>
      </div>
    );
  }

  const effectiveType = getEffectiveCustomerType(customer);
  const customerNotes = getCustomerNotes(customer);
  const vehicles = getCustomerVehicles(customer);
  const upcomingJobs = jobs.filter(j => j.isUpcoming);
  const pastJobs = jobs.filter(j => !j.isUpcoming);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between h-[60px] px-4 md:px-6 flex-shrink-0" style={{ borderBottom: '1px solid #F0F0EE' }}>
        <button
          onClick={() => router.push('/detailer-dashboard/customers')}
          className="flex items-center gap-1 transition-opacity hover:opacity-70"
        >
          <svg className="h-4 w-4" style={{ color: '#9e9d92' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-sm" style={{ color: '#2B2B26' }}>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 text-sm font-medium rounded-full text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#F97316' }}
          >
            Book Service
          </button>
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 rounded-lg transition-colors hover:bg-[#F8F8F7]"
              style={{ border: '1px solid #deded9' }}
            >
              <svg className="h-4 w-4" style={{ color: '#9e9d92' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
              </svg>
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg z-20 py-1 min-w-[120px]" style={{ border: '1px solid #F0F0EE' }}>
                <button
                  className="w-full px-3 py-2 text-left text-sm text-red-600 flex items-center gap-2 hover:bg-red-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-10">
        {/* Profile Header */}
        <div className="pt-4 md:pt-10 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              {/* Avatar */}
              <div
                className="h-14 w-14 md:h-20 md:w-20 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold mb-3 md:mb-4"
                style={{ backgroundColor: '#deded9', color: '#4a4a42' }}
              >
                {getInitials(customer.customerName)}
              </div>

              {/* Name + badge */}
              <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl md:text-4xl font-bold" style={{ color: '#2B2B26' }}>
                  {customer.customerName || 'Unnamed Customer'}
                </h1>
                <span
                  className="text-[10px] font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded uppercase tracking-wide"
                  style={{
                    backgroundColor: effectiveType === 'returning' || effectiveType === 'maintenance' ? '#f3e8ff' : '#e0f2e9',
                    color: effectiveType === 'returning' || effectiveType === 'maintenance' ? '#7c3aed' : '#0d9488',
                  }}
                >
                  {effectiveType === 'new' ? 'New' : effectiveType === 'returning' ? 'Repeat' : effectiveType === 'maintenance' ? 'Maintenance' : effectiveType || 'New'}
                </span>
              </div>

              {/* Contact info row */}
              <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 text-sm" style={{ color: '#838274' }}>
                {customer.customerPhone && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9e9d92' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {formatPhoneDisplay(customer.customerPhone)}
                  </span>
                )}
                {customer.customerEmail && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9e9d92' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span className="truncate">{customer.customerEmail}</span>
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#9e9d92' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                    </svg>
                    <span className="line-clamp-1">{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <section className="mb-8 md:mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: '#838274' }}>Notes</h3>
          <div className="flex flex-col md:flex-row md:flex-wrap gap-2 items-stretch">
            {customerNotes.map((note) => (
              <div key={note.id} className="px-3 py-3 rounded-lg w-full md:w-[200px] min-h-[72px] md:min-h-[80px] flex flex-col justify-between group relative" style={{ backgroundColor: '#F8F8F7', border: '1px solid #F0F0EE' }}>
                {editingNoteId === note.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editingNoteText}
                      onChange={(e) => setEditingNoteText(e.target.value)}
                      className="text-xs p-2 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditNote(note.id, editingNoteText)} className="text-[10px] font-medium px-2 py-1 rounded bg-black text-white">Save</button>
                      <button onClick={() => { setEditingNoteId(null); setEditingNoteText(''); }} className="text-[10px] font-medium px-2 py-1 rounded border" style={{ borderColor: '#deded9', color: '#838274' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs flex-1 cursor-pointer" style={{ color: '#2B2B26' }} onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.text); }}>{note.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px]" style={{ color: '#838274' }}>{format(new Date(note.createdAt), 'MMM d, yyyy')}</p>
                      <button onClick={() => handleRemoveNote(note.id)} className="opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5" style={{ opacity: 'inherit' }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {isAddingNote ? (
              <div className="px-3 py-3 rounded-lg w-full md:w-[200px] min-h-[72px] md:min-h-[80px] flex flex-col gap-2" style={{ border: '1px solid #F97316' }}>
                <textarea
                  ref={newNoteRef}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Write a note..."
                  className="text-xs p-2 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none flex-1"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(newNoteText); } }}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleAddNote(newNoteText)} className="text-[10px] font-medium px-2 py-1 rounded bg-black text-white">Save</button>
                  <button onClick={() => { setIsAddingNote(false); setNewNoteText(''); }} className="text-[10px] font-medium px-2 py-1 rounded border" style={{ borderColor: '#deded9', color: '#838274' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setIsAddingNote(true); setTimeout(() => newNoteRef.current?.focus(), 50); }}
                className="w-full md:w-[200px] min-h-[48px] md:min-h-[80px] rounded-lg flex items-center justify-center gap-2 transition-colors active:bg-gray-50"
                style={{ border: '1px dashed #deded9', color: '#838274' }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-sm">Add Note</span>
              </button>
            )}
          </div>
        </section>

        {/* Vehicles Section */}
        <section className="mb-8 md:mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: '#838274' }}>Vehicles</h3>
          <div className="flex flex-col md:flex-row md:flex-wrap gap-2 items-stretch md:items-center">
            {vehicles.map((v, idx) => (
              <div key={idx} className="px-3 py-2.5 md:py-2 rounded-lg flex items-center gap-2 w-full md:w-auto group" style={{ backgroundColor: '#F8F8F7', border: '1px solid #F0F0EE' }}>
                <div className="h-6 w-6 bg-white rounded flex items-center justify-center" style={{ border: '1px solid #F0F0EE' }}>
                  <svg className="h-3 w-3" style={{ color: '#838274' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <span className="text-xs font-bold flex-1" style={{ color: '#2B2B26' }}>{v}</span>
                <button onClick={() => handleRemoveVehicle(idx)} className="text-gray-400 hover:text-red-500 transition-opacity p-0.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {isAddingVehicle ? (
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  ref={newVehicleRef}
                  type="text"
                  value={newVehicleName}
                  onChange={(e) => setNewVehicleName(e.target.value)}
                  placeholder="e.g. 2024 BMW X5"
                  className="text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 flex-1 md:w-[180px]"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddVehicle(newVehicleName); if (e.key === 'Escape') { setIsAddingVehicle(false); setNewVehicleName(''); } }}
                />
                <button onClick={() => handleAddVehicle(newVehicleName)} className="text-[10px] font-medium px-2.5 py-2 rounded-lg bg-black text-white">Add</button>
                <button onClick={() => { setIsAddingVehicle(false); setNewVehicleName(''); }} className="text-[10px] font-medium px-2.5 py-2 rounded-lg border" style={{ borderColor: '#deded9', color: '#838274' }}>Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => { setIsAddingVehicle(true); setTimeout(() => newVehicleRef.current?.focus(), 50); }}
                className="w-full md:w-auto h-[44px] md:h-[38px] px-3 rounded-lg flex items-center justify-center gap-2 transition-colors active:bg-gray-50"
                style={{ border: '1px dashed #deded9', color: '#838274' }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-sm">Add Vehicle</span>
              </button>
            )}
          </div>
        </section>

        {/* Job History Section */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: '#838274' }}>Job History</h3>

          {jobs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Upcoming Jobs */}
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl relative transition-all"
                  style={{ backgroundColor: '#F8F8F7', border: '1px solid #F0F0EE' }}
                >
                  <span
                    className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}
                  >
                    Upcoming
                  </span>
                  <div className="flex items-center justify-between mb-2 pr-14">
                    <p className="text-sm font-bold" style={{ color: '#2B2B26' }}>
                      {job.services.length > 0 ? job.services.join(', ') : 'Service'}
                    </p>
                  </div>
                  <p className="text-[10px] mb-2" style={{ color: '#838274' }}>
                    {formatJobDateTime(job.date, job.time)}
                  </p>
                  <div className="space-y-2">
                    {job.vehicleModel && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: '#838274' }}>Vehicle</p>
                        <p className="text-xs font-medium" style={{ color: '#2B2B26' }}>{job.vehicleModel}</p>
                      </div>
                    )}
                    {job.employeeName && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: '#838274' }}>Technician</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-amber-800">{job.employeeName.charAt(0)}</span>
                          </div>
                          <p className="text-xs font-medium" style={{ color: '#2B2B26' }}>{job.employeeName}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Past Jobs */}
              {pastJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-xl transition-all"
                  style={{ backgroundColor: '#F8F8F7', border: '1px solid #F0F0EE' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: '#2B2B26' }}>
                      {job.services.length > 0 ? job.services.join(', ') : 'Service'}
                    </p>
                    <span className="text-[10px]" style={{ color: '#838274' }}>
                      {formatJobDateTime(job.date, undefined)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {job.vehicleModel && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: '#838274' }}>Vehicle</p>
                        <p className="text-xs font-medium" style={{ color: '#2B2B26' }}>{job.vehicleModel}</p>
                      </div>
                    )}
                    {job.employeeName && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: '#838274' }}>Technician</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-amber-800">{job.employeeName.charAt(0)}</span>
                          </div>
                          <p className="text-xs font-medium" style={{ color: '#2B2B26' }}>{job.employeeName}</p>
                        </div>
                      </div>
                    )}
                    {job.notes && (
                      <div>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: '#838274' }}>Notes</p>
                        <p className="text-xs line-clamp-2" style={{ color: '#2B2B26' }}>{job.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#838274' }}>
              <svg className="h-10 w-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm">No job history yet</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
