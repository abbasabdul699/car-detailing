"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { format, addMonths, subMonths, isToday, isSameDay, startOfMonth, getDay } from "date-fns";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────
type TodoItem = {
  id: string;
  title: string;
  subtitle: string | null;
  type: "needs_response" | "todo";
  status: "active" | "completed";
  priority: "high" | "medium" | "low";
  customerPhone: string | null;
  customerName: string | null;
  dueDate: string | null;
  dueTime: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type Message = {
  id: string;
  direction: string;
  content: string;
  channel?: string;
  createdAt: string;
};

type Conversation = {
  id: string;
  customerPhone: string;
  customerName: string | null;
  messages: Message[];
};

type CustomerSuggestion = {
  id: string;
  name: string;
  phone: string;
};

type CustomerProfile = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  locationType: string | null;
  customerType: string | null;
  vehicle: string | null;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  services: string[];
  data: any;
  createdAt: string | null;
  updatedAt: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return format(date, "MMM d");
};

// ─── Icons (inline SVGs to avoid dependency issues) ──────────────────
const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

const MessageSquareIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const CalendarSmallIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const TagIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </svg>
);

// ─── Main Component ──────────────────────────────────────────────────
export default function DetailerDashboardPage() {
  const { data: session, status } = useSession();
  const detailerId = session?.user?.id;

  // State
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [detailerName, setDetailerName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Conversation panel state
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Inline add todo state
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoSubtitle, setNewTodoSubtitle] = useState("");
  const [newTodoType, setNewTodoType] = useState<"todo" | "needs_response">("todo");
  const [newTodoCustomerName, setNewTodoCustomerName] = useState("");
  const [newTodoCustomerPhone, setNewTodoCustomerPhone] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // default to today
  });
  const [newTodoDueTime, setNewTodoDueTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0); // round up to next 30min
    return now.toTimeString().slice(0, 5); // "HH:MM"
  });
  const inlineTitleRef = useRef<HTMLInputElement>(null);

  // Mini calendar popup state
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const miniCalendarRef = useRef<HTMLDivElement>(null);

  // Custom time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);

  // @-mention state
  const [showAtMention, setShowAtMention] = useState(false);
  const [atMentionQuery, setAtMentionQuery] = useState("");
  const atMentionRef = useRef<HTMLDivElement>(null);

  // Customer info sidebar state
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerProfileLoading, setCustomerProfileLoading] = useState(false);

  // Customer autocomplete state
  const [allCustomers, setAllCustomers] = useState<CustomerSuggestion[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameSuggestionsRef = useRef<HTMLDivElement>(null);
  const phoneSuggestionsRef = useRef<HTMLDivElement>(null);

  // Derived state
  const activeTodos = todos.filter((t) => t.status === "active");
  const completedTodos = todos.filter((t) => t.status === "completed");
  const needsResponseItems = activeTodos.filter((t) => t.type === "needs_response");
  const todoItems = activeTodos.filter((t) => t.type === "todo");
  const selectedTodo = todos.find((t) => t.id === selectedTodoId) || null;

  const needsResponseDone = todos.filter((t) => t.type === "needs_response" && t.status === "completed").length;
  const needsResponseTotal = todos.filter((t) => t.type === "needs_response").length;
  const todoDone = todos.filter((t) => t.type === "todo" && t.status === "completed").length;
  const todoTotal = todos.filter((t) => t.type === "todo").length;

  // ─── Data Fetching ──────────────────────────────────────────────────
  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/detailer/todos");
      if (res.ok) {
        const data = await res.json();
        setTodos(data.todos || []);
      }
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetailerProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/detailer/profile");
      if (res.ok) {
        const data = await res.json();
        setDetailerName(data.firstName || data.businessName || "");
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/detailer/customers");
      if (res.ok) {
        const data = await res.json();
        const customers: CustomerSuggestion[] = (data.customers || []).map((c: any) => ({
          id: c.id,
          name: c.name || c.customerName || "",
          phone: c.phone || c.customerPhone || "",
        })).filter((c: CustomerSuggestion) => c.name || c.phone);
        setAllCustomers(customers);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  }, []);

  const fetchCustomerProfile = useCallback(async (phone: string) => {
    setCustomerProfileLoading(true);
    try {
      const res = await fetch("/api/detailer/customers");
      if (res.ok) {
        const data = await res.json();
        const customers = data.customers || [];
        const match = customers.find(
          (c: any) => c.customerPhone === phone || c.phone === phone
        );
        if (match) {
          setCustomerProfile({
            id: match.id,
            customerName: match.customerName || match.name || null,
            customerPhone: match.customerPhone || match.phone || "",
            customerEmail: match.customerEmail || null,
            address: match.address || null,
            locationType: match.locationType || null,
            customerType: match.customerType || null,
            vehicle: match.vehicle || null,
            vehicleYear: match.vehicleYear || null,
            vehicleMake: match.vehicleMake || null,
            vehicleModel: match.vehicleModel || null,
            services: match.services || [],
            data: match.data || null,
            createdAt: match.createdAt || null,
            updatedAt: match.updatedAt || null,
          });
        } else {
          setCustomerProfile(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch customer profile:", err);
      setCustomerProfile(null);
    } finally {
      setCustomerProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailerId) {
      fetchTodos();
      fetchDetailerProfile();
      fetchCustomers();
    }
  }, [detailerId, fetchTodos, fetchDetailerProfile, fetchCustomers]);

  // Filtered customer suggestions
  const nameFilteredCustomers = allCustomers.filter((c) =>
    c.name && newTodoCustomerName.trim().length > 0 &&
    c.name.toLowerCase().includes(newTodoCustomerName.toLowerCase())
  );
  const phoneFilteredCustomers = allCustomers.filter((c) =>
    c.phone && newTodoCustomerPhone.trim().length > 0 &&
    c.phone.includes(newTodoCustomerPhone)
  );

  // @-mention filtered customers (matches name or phone)
  const atMentionFiltered = allCustomers.filter((c) => {
    if (atMentionQuery.length === 0) return !!c.name;
    const q = atMentionQuery.toLowerCase();
    return (c.name && c.name.toLowerCase().includes(q)) || (c.phone && c.phone.includes(q));
  }).slice(0, 8);

  // Click-outside handler for suggestions dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        nameSuggestionsRef.current &&
        !nameSuggestionsRef.current.contains(e.target as Node) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(e.target as Node)
      ) {
        setShowNameSuggestions(false);
      }
      if (
        phoneSuggestionsRef.current &&
        !phoneSuggestionsRef.current.contains(e.target as Node) &&
        phoneInputRef.current &&
        !phoneInputRef.current.contains(e.target as Node)
      ) {
        setShowPhoneSuggestions(false);
      }
      if (
        atMentionRef.current &&
        !atMentionRef.current.contains(e.target as Node) &&
        inlineTitleRef.current &&
        !inlineTitleRef.current.contains(e.target as Node)
      ) {
        setShowAtMention(false);
      }
      if (
        miniCalendarRef.current &&
        !miniCalendarRef.current.contains(e.target as Node)
      ) {
        setShowMiniCalendar(false);
      }
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(e.target as Node)
      ) {
        setShowTimePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch conversation when a todo with customerPhone is selected
  const fetchConversationMessages = useCallback(async (phone: string) => {
    setConversationLoading(true);
    try {
      // Fetch all conversations (API returns a direct array)
      const res = await fetch("/api/detailer/conversations");
      if (res.ok) {
        const convos: any[] = await res.json();
        const match = convos.find(
          (c: any) => c.customerPhone === phone
        );
        if (match) {
          setConversationId(match.id);
          // Fetch full conversation with messages (API returns conversation object directly)
          const msgRes = await fetch(
            `/api/detailer/conversations?conversationId=${match.id}`
          );
          if (msgRes.ok) {
            const conversation = await msgRes.json();
            setConversationMessages(conversation.messages || []);
          }
        } else {
          setConversationId(null);
          setConversationMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
      setConversationId(null);
      setConversationMessages([]);
    } finally {
      setConversationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTodo?.customerPhone) {
      setConversationMessages([]);
      setConversationId(null);
      return;
    }
    fetchConversationMessages(selectedTodo.customerPhone);
  }, [selectedTodo?.customerPhone, selectedTodo?.id, fetchConversationMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // ─── CRUD Operations ────────────────────────────────────────────────
  const toggleTodoStatus = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "completed" : "active";
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? { ...t, status: newStatus as "active" | "completed", completedAt: newStatus === "completed" ? new Date().toISOString() : null }
          : t
      )
    );
    // If we're completing the selected item, move to next
    if (newStatus === "completed" && selectedTodoId === todoId) {
      const remaining = activeTodos.filter((t) => t.id !== todoId);
      setSelectedTodoId(remaining[0]?.id || null);
    }
    try {
      await fetch(`/api/detailer/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      // Revert on error
      fetchTodos();
    }
  };

  const createTodo = async () => {
    if (!newTodoTitle.trim()) return;
    try {
      const res = await fetch("/api/detailer/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle,
          subtitle: newTodoSubtitle || null,
          type: newTodoType,
          customerName: newTodoCustomerName || null,
          customerPhone: newTodoCustomerPhone || null,
          dueDate: newTodoDueDate || null,
          dueTime: newTodoDueTime || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTodos((prev) => [data.todo, ...prev]);
        // Reset inline form
        setShowInlineAdd(false);
        setNewTodoTitle("");
        setNewTodoSubtitle("");
        setNewTodoType("todo");
        setNewTodoCustomerName("");
        setNewTodoCustomerPhone("");
        const resetNow = new Date();
        setNewTodoDueDate(resetNow.toISOString().split("T")[0]);
        resetNow.setMinutes(Math.ceil(resetNow.getMinutes() / 30) * 30, 0, 0);
        setNewTodoDueTime(resetNow.toTimeString().slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to create todo:", err);
    }
  };

  const deleteTodo = async (todoId: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    if (selectedTodoId === todoId) setSelectedTodoId(null);
    try {
      await fetch(`/api/detailer/todos/${todoId}`, { method: "DELETE" });
    } catch (err) {
      fetchTodos();
    }
  };

  const handleOpenCustomerInfo = () => {
    if (selectedTodo?.customerPhone) {
      setShowCustomerInfo(true);
      fetchCustomerProfile(selectedTodo.customerPhone);
    }
  };

  // Handle @-mention in title input
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewTodoTitle(val);

    // Check if user is typing @mention
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " ")) {
      const query = textBeforeCursor.slice(atIndex + 1);
      // Only show if no space after query (still typing the mention)
      if (!query.includes(" ") || query.length === 0) {
        setAtMentionQuery(query);
        setShowAtMention(true);
        return;
      }
    }
    setShowAtMention(false);
  };

  const selectAtMention = (customer: CustomerSuggestion) => {
    // Remove the @query from the title text — the customer shows as an inline chip instead
    const cursorPos = inlineTitleRef.current?.selectionStart || newTodoTitle.length;
    const textBeforeCursor = newTodoTitle.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = newTodoTitle.slice(cursorPos);

    const newTitle = (newTodoTitle.slice(0, atIndex) + textAfterCursor).trim();
    setNewTodoTitle(newTitle);
    setNewTodoCustomerName(customer.name);
    setNewTodoCustomerPhone(customer.phone);
    setShowAtMention(false);

    // Refocus the input
    setTimeout(() => inlineTitleRef.current?.focus(), 50);
  };

  const selectCustomerSuggestion = (customer: CustomerSuggestion) => {
    setNewTodoCustomerName(customer.name);
    setNewTodoCustomerPhone(customer.phone);
    setShowNameSuggestions(false);
    setShowPhoneSuggestions(false);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedTodo?.customerPhone || !conversationId) return;
    
    const msgText = messageInput.trim();
    setSendingMessage(true);

    // Optimistic UI update
    const optimisticMsg: Message = {
      id: Date.now().toString(),
      direction: "outbound",
      content: msgText,
      createdAt: new Date().toISOString(),
    };
    setConversationMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput("");

    try {
      const res = await fetch("/api/detailer/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: msgText,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      // Refresh messages to get the real server-side message
      await fetchConversationMessages(selectedTodo.customerPhone);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error
      setConversationMessages((prev) =>
        prev.filter((m) => m.id !== optimisticMsg.id)
      );
      setMessageInput(msgText); // Restore the input
    } finally {
      setSendingMessage(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f5f3" }}>
        <div className="animate-pulse text-sm" style={{ color: "#9e9d92" }}>Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f5f5f3" }}>
        <div className="text-sm" style={{ color: "#9e9d92" }}>Not logged in</div>
      </div>
    );
  }

  // ─── Todo Card Component ────────────────────────────────────────────
  const TodoCard = ({ item, isCompleted = false }: { item: TodoItem; isCompleted?: boolean }) => {
    const isSelected = selectedTodoId === item.id;
    return (
      <div
        onClick={() => { setSelectedTodoId(item.id); setShowCustomerInfo(false); }}
        className={`group cursor-pointer transition-all rounded-lg border ${
          isCompleted
            ? isSelected
              ? "bg-[#f8f8f7] border-[#deded9]"
              : "bg-[#fafafa] border-[#f0f0ee] hover:border-[#deded9]"
            : isSelected
            ? "bg-[#f8f8f7] border-[#deded9]"
            : "bg-white border-[#f0f0ee] hover:border-[#deded9] hover:shadow-sm"
        }`}
      >
        <div className="px-3 py-3">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTodoStatus(item.id, item.status);
              }}
              className={`h-[18px] w-[18px] mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                isCompleted
                  ? "border-[#F97316] bg-[#F97316] hover:bg-[#EA580C] hover:border-[#EA580C]"
                  : "border-[#deded9] hover:border-[#6b6a5e] hover:bg-[#f0f0ee]"
              }`}
            >
              <CheckIcon
                className={`h-3 w-3 ${
                  isCompleted ? "text-white" : "text-transparent group-hover:text-[#6b6a5e]"
                }`}
              />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-[14px] leading-snug ${
                  isCompleted ? "text-[#9e9d92] line-through" : "text-[#2B2B26]"
                }`}
              >
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.customerName && (
                  <>
                    <span className="text-[12px] text-[#9e9d92]">{item.customerName}</span>
                    <span className="text-[10px] text-[#c1c0b8]">&middot;</span>
                  </>
                )}
                {item.dueDate ? (
                  <span className="text-[12px] text-[#9e9d92]">
                    {format(new Date(item.dueDate), "MMM d, yyyy")}
                    {item.dueTime && (() => {
                      const [h, m] = item.dueTime.split(":").map(Number);
                      const ampm = h >= 12 ? "PM" : "AM";
                      const h12 = h % 12 || 12;
                      return ` · ${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                    })()}
                  </span>
                ) : (
                  <span className="text-[12px] text-[#c1c0b8]">{getRelativeTime(item.createdAt)}</span>
                )}
              </div>
            </div>

            {/* Delete button (on hover) + chevron */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTodo(item.id);
                }}
                className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
              >
                <TrashIcon className="h-3.5 w-3.5 text-[#c1c0b8] hover:text-red-500" />
              </button>
              {!isCompleted && (
                <ChevronRightIcon className="h-4 w-4 text-[#c1c0b8] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen overflow-y-auto" style={{ backgroundColor: "#f5f5f3" }}>
      <div className="min-h-full flex flex-col">
        <div className="max-w-5xl w-full mx-auto px-4 md:px-5 py-8 md:py-12 mt-6">
          {/* ─── Greeting ─────────────────────────────────────────── */}
          <div className="mb-10">
            <h1 className="text-xl md:text-2xl font-medium text-[#2B2B26]">
              {getGreeting()}, {detailerName || "there"}
            </h1>
            <p className="text-sm text-[#9e9d92] mt-1">
              Your reminders
            </p>
          </div>

          {/* ─── Split Layout ─────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row gap-10">
            {/* ─── Left Panel: Todo List ────────────────────────── */}
            <div className="w-full md:w-[380px] shrink-0 space-y-6">
              {/* + Add reminder button */}
              {!showInlineAdd && (
                <button
                  onClick={() => {
                    setShowInlineAdd(true);
                    setTimeout(() => inlineTitleRef.current?.focus(), 50);
                  }}
                  className="w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium text-[#9e9d92] hover:text-[#2B2B26] hover:border-[#c1c0b8] transition-colors"
                  style={{ borderColor: "#deded9" }}
                >
                  <PlusIcon className="h-4 w-4" />
                  Add reminder
                </button>
              )}

              {/* Inline entry card */}
              {showInlineAdd && (
                <div className="bg-white rounded-lg border shadow-sm" style={{ borderColor: "#deded9" }}>
                  <div className="px-4 py-3">
                    {/* Top row: checkbox + inline customer chip + text input */}
                    <div className="flex items-center gap-3 relative flex-wrap">
                      <div className="h-[18px] w-[18px] rounded border-2 border-[#deded9] shrink-0" />

                      {/* Inline customer chip (replaces @mention text) */}
                      {newTodoCustomerName && (
                        <span className="inline-flex items-center gap-1 text-[13px] font-medium px-2 py-0.5 rounded bg-[#FFF7ED] border border-[#F97316] text-[#EA580C] shrink-0">
                          @{newTodoCustomerName}
                          <button
                            onClick={() => {
                              setNewTodoCustomerName("");
                              setNewTodoCustomerPhone("");
                            }}
                            className="ml-0.5 hover:text-[#C2410C] transition-colors"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </span>
                      )}

                      <input
                        ref={inlineTitleRef}
                        type="text"
                        value={newTodoTitle}
                        onChange={handleTitleChange}
                        onKeyDown={(e) => {
                          if (showAtMention) {
                            if (e.key === "Escape") { setShowAtMention(false); return; }
                            return;
                          }
                          if (e.key === "Enter" && (newTodoTitle.trim() || newTodoCustomerName)) createTodo();
                          if (e.key === "Escape") {
                            setShowInlineAdd(false);
                            setNewTodoTitle("");
                            setNewTodoSubtitle("");
                            setNewTodoType("todo");
                            setNewTodoCustomerName("");
                            setNewTodoCustomerPhone("");
                          }
                        }}
                        placeholder={newTodoCustomerName ? "Add a note..." : "Type your reminder... (use @ to tag a customer)"}
                        className="flex-1 min-w-[120px] text-sm text-[#2B2B26] placeholder:text-[#c1c0b8] focus:outline-none bg-transparent"
                      />

                      {/* @-mention dropdown */}
                      {showAtMention && atMentionFiltered.length > 0 && (
                        <div
                          ref={atMentionRef}
                          className="absolute z-50 left-6 top-9 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto w-60"
                          style={{ borderColor: "#deded9" }}
                        >
                          <div className="px-3 py-1.5 border-b" style={{ borderColor: "#f0f0ee" }}>
                            <span className="text-[11px] font-medium text-[#9e9d92] uppercase tracking-wide">Customers</span>
                          </div>
                          {atMentionFiltered.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => selectAtMention(c)}
                              className="w-full text-left px-3 py-2 hover:bg-[#f8f8f7] transition-colors border-b last:border-b-0"
                              style={{ borderColor: "#f0f0ee" }}
                            >
                              <p className="text-sm text-[#2B2B26] truncate">{c.name}</p>
                              {c.phone && (
                                <p className="text-[11px] text-[#9e9d92] truncate">{c.phone}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom row: date, time, type, delete */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {/* Date picker with mini calendar */}
                      <div className="relative" ref={miniCalendarRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMiniCalendar(!showMiniCalendar);
                            if (!showMiniCalendar && newTodoDueDate) {
                              setCalendarMonth(new Date(newTodoDueDate + "T00:00:00"));
                            }
                          }}
                          className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full border hover:bg-[#f8f8f7] transition-colors cursor-pointer"
                          style={{ borderColor: "#deded9", color: "#6b6a5e" }}
                        >
                          <CalendarSmallIcon className="h-3 w-3" />
                          <span>{newTodoDueDate ? format(new Date(newTodoDueDate + "T00:00:00"), "MMM d, yyyy") : "Date"}</span>
                        </button>

                        {showMiniCalendar && (
                          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] p-4" style={{ minWidth: "280px" }}>
                            {/* Month navigation */}
                            <div className="flex items-center justify-between mb-4">
                              <button
                                type="button"
                                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                              </button>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {format(calendarMonth, "MMMM yyyy")}
                              </h3>
                              <button
                                type="button"
                                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>

                            {/* Day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                                <div key={day} className="text-xs font-medium text-gray-500 text-center py-1">
                                  {day}
                                </div>
                              ))}
                            </div>

                            {/* Day grid */}
                            <div className="grid grid-cols-7 gap-1">
                              {Array(getDay(startOfMonth(calendarMonth)))
                                .fill(null)
                                .map((_, i) => (
                                  <div key={`empty-${i}`} className="p-2" />
                                ))}

                              {Array(getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()))
                                .fill(null)
                                .map((_, index) => {
                                  const day = index + 1;
                                  const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                                  const isTodayDate = isToday(date);
                                  const selectedDate = newTodoDueDate ? new Date(newTodoDueDate + "T00:00:00") : null;
                                  const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;

                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const yyyy = date.getFullYear();
                                        const mm = String(date.getMonth() + 1).padStart(2, "0");
                                        const dd = String(date.getDate()).padStart(2, "0");
                                        setNewTodoDueDate(`${yyyy}-${mm}-${dd}`);
                                        setShowMiniCalendar(false);
                                      }}
                                      className={`text-xs p-2 rounded hover:bg-gray-100 transition-colors ${
                                        isSelected
                                          ? "bg-black text-white"
                                          : isTodayDate
                                          ? "bg-gray-200 text-gray-900 font-semibold"
                                          : "text-gray-700"
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

                      {/* Time picker */}
                      <div className="relative" ref={timePickerRef}>
                        <button
                          type="button"
                          onClick={() => setShowTimePicker(!showTimePicker)}
                          className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full border hover:bg-[#f8f8f7] transition-colors cursor-pointer"
                          style={{ borderColor: "#deded9", color: "#6b6a5e" }}
                        >
                          <ClockIcon className="h-3 w-3" />
                          <span>
                            {newTodoDueTime
                              ? (() => {
                                  const [h, m] = newTodoDueTime.split(":").map(Number);
                                  const ampm = h >= 12 ? "PM" : "AM";
                                  const h12 = h % 12 || 12;
                                  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
                                })()
                              : "Time"}
                          </span>
                        </button>

                        {showTimePicker && (() => {
                          const [curH, curM] = (newTodoDueTime || "12:00").split(":").map(Number);
                          const curAmpm = curH >= 12 ? "PM" : "AM";
                          const curH12 = curH % 12 || 12;
                          const hours = Array.from({ length: 12 }, (_, i) => i + 1);
                          const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

                          const setTime = (h12: number, min: number, ampm: string) => {
                            let h24 = h12 % 12;
                            if (ampm === "PM") h24 += 12;
                            setNewTodoDueTime(`${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
                          };

                          return (
                            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] p-3" style={{ minWidth: "220px" }}>
                              <div className="flex gap-1" style={{ height: "200px" }}>
                                {/* Hours column */}
                                <div className="flex-1 overflow-y-auto scrollbar-thin">
                                  {hours.map((h) => (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => setTime(h, curM, curAmpm)}
                                      className={`w-full text-center text-sm py-1.5 rounded transition-colors ${
                                        curH12 === h
                                          ? "bg-[#F97316] text-white font-semibold"
                                          : "text-gray-700 hover:bg-[#FFF7ED]"
                                      }`}
                                    >
                                      {String(h).padStart(2, "0")}
                                    </button>
                                  ))}
                                </div>

                                {/* Minutes column */}
                                <div className="flex-1 overflow-y-auto scrollbar-thin">
                                  {minutes.map((m) => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => setTime(curH12, m, curAmpm)}
                                      className={`w-full text-center text-sm py-1.5 rounded transition-colors ${
                                        curM === m
                                          ? "bg-[#F97316] text-white font-semibold"
                                          : "text-gray-700 hover:bg-[#FFF7ED]"
                                      }`}
                                    >
                                      {String(m).padStart(2, "0")}
                                    </button>
                                  ))}
                                </div>

                                {/* AM/PM column */}
                                <div className="flex flex-col gap-1 justify-start">
                                  {["AM", "PM"].map((ap) => (
                                    <button
                                      key={ap}
                                      type="button"
                                      onClick={() => setTime(curH12, curM, ap)}
                                      className={`px-3 text-center text-sm py-1.5 rounded transition-colors ${
                                        curAmpm === ap
                                          ? "bg-[#F97316] text-white font-semibold"
                                          : "text-gray-700 hover:bg-[#FFF7ED]"
                                      }`}
                                    >
                                      {ap}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Done button */}
                              <button
                                type="button"
                                onClick={() => setShowTimePicker(false)}
                                className="w-full mt-2 py-1.5 text-sm font-medium text-white bg-[#F97316] rounded-lg hover:bg-[#EA580C] transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Type selector */}
                      <button
                        onClick={() => setNewTodoType(newTodoType === "todo" ? "needs_response" : "todo")}
                        className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full border hover:bg-[#f8f8f7] transition-colors"
                        style={{ borderColor: "#deded9", color: "#6b6a5e" }}
                        title="Toggle type"
                      >
                        <TagIcon className="h-3 w-3" />
                        {newTodoType === "todo" ? "To-do" : "Needs response"}
                      </button>

                      <div className="flex-1" />

                      {/* Delete / cancel */}
                      <button
                        onClick={() => {
                          setShowInlineAdd(false);
                          setNewTodoTitle("");
                          setNewTodoSubtitle("");
                          setNewTodoType("todo");
                          setNewTodoCustomerName("");
                          setNewTodoCustomerPhone("");
                        }}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-50 transition-colors"
                        title="Cancel"
                      >
                        <TrashIcon className="h-3.5 w-3.5 text-[#c1c0b8] hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Needs Response Section */}
              {(needsResponseItems.length > 0 || needsResponseTotal > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-[#f0f0ee] flex items-center justify-center">
                        <AlertTriangleIcon className="h-3 w-3 text-[#6b6a5e]" />
                      </div>
                      <span className="text-[13px] font-medium text-[#2B2B26]">Needs response</span>
                    </div>
                    <span className="text-[12px] text-[#9e9d92]">
                      {needsResponseDone}/{needsResponseTotal}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {needsResponseItems.map((item) => (
                      <TodoCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* To-dos Section */}
              {(todoItems.length > 0 || todoTotal > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-[#f0f0ee] flex items-center justify-center">
                        <CheckCircleIcon className="h-3 w-3 text-[#6b6a5e]" />
                      </div>
                      <span className="text-[13px] font-medium text-[#2B2B26]">To-dos</span>
                    </div>
                    <span className="text-[12px] text-[#9e9d92]">
                      {todoDone}/{todoTotal}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {todoItems.map((item) => (
                      <TodoCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Section */}
              {completedTodos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded bg-[#FFF7ED] flex items-center justify-center">
                        <CheckIcon className="h-3 w-3 text-[#F97316]" />
                      </div>
                      <span className="text-[13px] font-medium text-[#9e9d92]">Completed</span>
                    </div>
                    <span className="text-[12px] text-[#c1c0b8]">{completedTodos.length}</span>
                  </div>
                  <div className="space-y-1">
                    {completedTodos.map((item) => (
                      <TodoCard key={item.id} item={item} isCompleted />
                    ))}
                  </div>
                </div>
              )}

              {/* All caught up state */}
              {activeTodos.length === 0 && completedTodos.length === 0 && !loading && (
                <div className="text-center py-16">
                  <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-[#f0f0ee] flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-[#2B2B26]" />
                  </div>
                  <h3 className="text-base font-medium text-[#2B2B26]">All caught up!</h3>
                  <p className="text-sm text-[#838274] mt-1">
                    Add a task to get started.
                  </p>
                </div>
              )}
            </div>

            {/* ─── Right Panel: Conversation Preview ───────────── */}
            <div className="hidden md:flex flex-1 flex-col">
              {selectedTodo && selectedTodo.customerPhone ? (
                <div
                  className="bg-white rounded-xl border flex flex-col overflow-hidden max-w-[600px]"
                  style={{ borderColor: "#deded9", height: "600px" }}
                >
                  {/* Header */}
                  <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "#f0f0ee" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-[#deded9] flex items-center justify-center text-xs font-medium text-[#2B2B26]">
                        {selectedTodo.customerName ? getInitials(selectedTodo.customerName) : "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2B2B26]">
                          {selectedTodo.customerName || selectedTodo.customerPhone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href="/detailer-dashboard/messages"
                        className="h-7 w-7 rounded-md hover:bg-[#f8f8f7] flex items-center justify-center transition-colors"
                        title="Open in messages"
                      >
                        <MessageSquareIcon className="h-4 w-4 text-[#9e9d92]" />
                      </Link>
                      <button
                        onClick={handleOpenCustomerInfo}
                        className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                          showCustomerInfo
                            ? "bg-[#f0f0ee] text-[#2B2B26]"
                            : "hover:bg-[#f8f8f7] text-[#9e9d92]"
                        }`}
                        title="Customer info"
                      >
                        <InfoIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Conversation Thread */}
                  <div className="flex-1 overflow-y-auto px-5 flex flex-col-reverse pt-5 pb-2">
                    <div className="space-y-4 mt-auto">
                      {conversationLoading ? (
                        <div className="text-center py-12">
                          <p className="text-sm text-[#9e9d92] animate-pulse">Loading messages...</p>
                        </div>
                      ) : conversationMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-sm text-[#9e9d92]">
                            {conversationId ? "No previous messages" : "No conversation found"}
                          </p>
                          <p className="text-xs text-[#c1c0b8] mt-1">
                            {conversationId ? "Start the conversation below" : "This customer hasn\u0027t texted yet"}
                          </p>
                        </div>
                      ) : (
                        conversationMessages.map((msg) => (
                          <div key={msg.id} className="flex gap-3">
                            {msg.direction === "inbound" ? (
                              <>
                                <div className="h-7 w-7 rounded-full bg-[#deded9] flex items-center justify-center text-[10px] font-medium text-[#2B2B26] shrink-0">
                                  {selectedTodo.customerName ? getInitials(selectedTodo.customerName) : "?"}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-[#2B2B26]">
                                      {selectedTodo.customerName || "Customer"}
                                    </span>
                                    <span className="text-[10px] text-[#9e9d92]">
                                      {format(new Date(msg.createdAt), "h:mm a")}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#4a4a42] leading-snug">{msg.content}</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="h-7 w-7 rounded-full bg-[#F97316] flex items-center justify-center shrink-0">
                                  <span className="text-[10px] font-bold text-white">
                                    {detailerName ? getInitials(detailerName) : "Y"}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-[#2B2B26]">
                                      {detailerName || "You"}
                                    </span>
                                    <span className="text-[10px] text-[#9e9d92]">
                                      {format(new Date(msg.createdAt), "h:mm a")}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#4a4a42] leading-snug">{msg.content}</p>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* AI Summary */}
                  {selectedTodo.subtitle && (
                    <div className="mx-5 mt-4 mb-3 p-3 bg-[#f8f8f7] rounded-lg border" style={{ borderColor: "#deded9" }}>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-[#FF3700] flex items-center justify-center shrink-0">
                          <span className="text-[7px] font-bold text-white">AI</span>
                        </div>
                        <p className="text-[11px] text-[#9e9d92]">AI summary</p>
                      </div>
                      <p className="text-sm text-[#2B2B26] leading-snug mt-2 ml-6">{selectedTodo.subtitle}</p>
                    </div>
                  )}

                  {/* Input Area */}
                  <div className="px-5 py-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        disabled={!conversationId || sendingMessage}
                        placeholder={conversationId ? "Type a message..." : "No conversation available"}
                        className={`w-full bg-white border rounded-full py-3 pl-4 pr-12 text-sm text-[#2B2B26] placeholder:text-[#9e9d92] focus:outline-none focus:border-[#c1c0b8] transition-colors ${!conversationId ? "opacity-50 cursor-not-allowed" : ""}`}
                        style={{ borderColor: "#deded9" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) sendMessage();
                        }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageInput.trim() || sendingMessage || !conversationId}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                          messageInput.trim() && !sendingMessage && conversationId
                            ? "bg-[#F97316] text-white hover:bg-[#EA580C] hover:scale-105"
                            : "bg-[#deded9] text-[#9e9d92] cursor-not-allowed"
                        }`}
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3 px-1">
                      <Link
                        href="/detailer-dashboard/messages"
                        className="p-2 text-[#9e9d92] hover:text-[#2B2B26] hover:bg-[#f8f8f7] rounded-md transition-colors"
                        title="View full conversation"
                      >
                        <MessageSquareIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => toggleTodoStatus(selectedTodo.id, selectedTodo.status)}
                        className="text-xs text-[#838274] hover:text-[#2B2B26] transition-colors flex items-center gap-1.5"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        {selectedTodo.status === "completed" ? "Unmark as done" : "Mark as done"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedTodo ? (
                /* Selected todo without conversation */
                <div
                  className="bg-white rounded-xl border flex flex-col items-center justify-center max-w-[600px]"
                  style={{ borderColor: "#deded9", height: "400px" }}
                >
                  <div className="text-center px-6">
                    <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-[#f0f0ee] flex items-center justify-center">
                      <MessageSquareIcon className="h-5 w-5 text-[#9e9d92]" />
                    </div>
                    <h3 className="text-base font-medium text-[#2B2B26] mb-1">{selectedTodo.title}</h3>
                    {selectedTodo.subtitle && (
                      <p className="text-sm text-[#9e9d92] mb-4">{selectedTodo.subtitle}</p>
                    )}
                    <p className="text-xs text-[#c1c0b8]">No conversation linked to this task</p>
                    <button
                      onClick={() => toggleTodoStatus(selectedTodo.id, selectedTodo.status)}
                      className="mt-6 text-xs text-[#838274] hover:text-[#2B2B26] transition-colors flex items-center gap-1.5 mx-auto"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      {selectedTodo.status === "completed" ? "Unmark as done" : "Mark as done"}
                    </button>
                  </div>
                </div>
              ) : (
                /* No todo selected */
                <div
                  className="bg-white/50 rounded-xl border border-dashed flex flex-col items-center justify-center max-w-[600px]"
                  style={{ borderColor: "#deded9", height: "400px" }}
                >
                  <div className="text-center px-6">
                    <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-[#f0f0ee] flex items-center justify-center">
                      <CheckCircleIcon className="h-5 w-5 text-[#9e9d92]" />
                    </div>
                    <h3 className="text-base font-medium text-[#2B2B26] mb-1">Select a task</h3>
                    <p className="text-sm text-[#9e9d92]">
                      Click on a task to see details and conversation
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Customer Info Sidebar ───────────────────────────────────── */}
      {showCustomerInfo && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setShowCustomerInfo(false)}
          />
          <div
            className={`fixed top-0 right-0 h-full bg-[#F8F8F7] border-l z-40 transition-transform duration-300 ease-out w-full md:w-[400px] overflow-y-auto`}
            style={{ borderColor: "#E2E2DD" }}
          >
            {/* Sidebar Header */}
            <div className="sticky top-0 bg-[#F8F8F7] z-10 px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E2E2DD" }}>
              <h3 className="text-sm font-semibold text-[#2B2B26]">Customer Details</h3>
              <button
                onClick={() => setShowCustomerInfo(false)}
                className="h-7 w-7 rounded-md hover:bg-[#E2E2DD] flex items-center justify-center transition-colors"
              >
                <XIcon className="h-4 w-4 text-[#9e9d92]" />
              </button>
            </div>

            {customerProfileLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-[#9e9d92] animate-pulse">Loading customer info...</p>
              </div>
            ) : !customerProfile ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="h-12 w-12 mb-3 rounded-full bg-[#f0f0ee] flex items-center justify-center">
                  <InfoIcon className="h-5 w-5 text-[#9e9d92]" />
                </div>
                <p className="text-sm text-[#9e9d92]">No customer profile found</p>
                <p className="text-xs text-[#c1c0b8] mt-1">This customer doesn&apos;t have a profile yet</p>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-5">
                {/* Customer Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#deded9] flex items-center justify-center text-base font-semibold text-[#2B2B26] shrink-0">
                    {customerProfile.customerName ? getInitials(customerProfile.customerName) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-[#2B2B26] truncate">
                      {customerProfile.customerName || "Unnamed Customer"}
                    </h2>
                    {customerProfile.customerType && (
                      <span className="inline-block mt-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e8f5e9] text-[#2E7D32] capitalize">
                        {customerProfile.customerType}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact Info Card */}
                <div className="bg-white rounded-xl border p-4 space-y-3" style={{ borderColor: "#E2E2DD" }}>
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-4 w-4 text-[#9e9d92] shrink-0" />
                    <span className="text-sm text-[#2B2B26]">{customerProfile.customerPhone}</span>
                  </div>

                  {/* Email */}
                  {customerProfile.customerEmail && (
                    <div className="flex items-center gap-3">
                      <MailIcon className="h-4 w-4 text-[#9e9d92] shrink-0" />
                      <span className="text-sm text-[#2B2B26] truncate">{customerProfile.customerEmail}</span>
                    </div>
                  )}

                  {/* Address */}
                  {customerProfile.address && (
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-4 w-4 text-[#9e9d92] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm text-[#2B2B26]">{customerProfile.address}</span>
                        {customerProfile.locationType && (
                          <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#f0f0ee] text-[#6b6a5e] capitalize">
                            {customerProfile.locationType}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vehicle */}
                {(customerProfile.vehicleModel || customerProfile.vehicle) && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#9e9d92] uppercase tracking-wide mb-2">Vehicle</h4>
                    <div className="bg-white rounded-xl border p-4" style={{ borderColor: "#E2E2DD" }}>
                      <div className="flex items-center gap-3">
                        <CarIcon className="h-4 w-4 text-[#9e9d92] shrink-0" />
                        <span className="text-sm text-[#2B2B26]">
                          {[customerProfile.vehicleYear, customerProfile.vehicleMake, customerProfile.vehicleModel]
                            .filter(Boolean)
                            .join(" ") || customerProfile.vehicle}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Services */}
                {customerProfile.services && customerProfile.services.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#9e9d92] uppercase tracking-wide mb-2">Services</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {customerProfile.services.map((service, i) => (
                        <span
                          key={i}
                          className="inline-block text-[12px] font-medium px-2.5 py-1 rounded-full bg-white border text-[#2B2B26]"
                          style={{ borderColor: "#E2E2DD" }}
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {customerProfile.data && typeof customerProfile.data === "object" && customerProfile.data.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#9e9d92] uppercase tracking-wide mb-2">Notes</h4>
                    <div className="bg-white rounded-xl border p-4" style={{ borderColor: "#E2E2DD" }}>
                      <div className="flex items-start gap-3">
                        <FileTextIcon className="h-4 w-4 text-[#9e9d92] shrink-0 mt-0.5" />
                        <p className="text-sm text-[#2B2B26] whitespace-pre-wrap leading-relaxed">{customerProfile.data.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* View Full Profile Link */}
                <Link
                  href="/detailer-dashboard/customers"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#2B2B26] bg-white border rounded-xl hover:bg-[#f8f8f7] transition-colors"
                  style={{ borderColor: "#E2E2DD" }}
                >
                  View full profile
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal removed — inline entry replaces it */}
    </div>
  );
}
