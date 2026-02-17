"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Trash2,
  Check,
  Upload,
  Car,
  MapPin,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────

interface FollowupData {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  vehicleInfo: string | null;
  vehicles: string[];
  lastService: string | null;
  daysSinceVisit: number | null;
  scheduledDate: string;
  scheduledTime: string | null;
  draftMessage: string | null;
  priority: string;
  status: string;
  channel: string;
  notes: string | null;
  reasonLine: string | null;
  confidenceScore: number | null;
  tags: string[];
  locationType: string | null;
}

type ViewMode = "day" | "week" | "month";
type ImportModalStep = "upload" | "loading" | "confirm";

// ─── Helpers ─────────────────────────────────────────────────────────

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function generateMockFollowups(): FollowupData[] {
  const customerData = [
    { name: "Hamed Sayed", vehicles: ["Range Rover", "Mercedes"], service: "Premium", visits: 8, dormantMonths: 8, locationType: "Van" as const, reason: "Regular customer, 8 months overdue", score: 72 },
    { name: "Sam Doty", vehicles: ["Forester"], service: "Express", visits: 1, dormantMonths: 3, locationType: "Drop-off" as const, reason: "Good candidate for Premium upgrade", score: 45 },
    { name: "Kartik Shetty", vehicles: ["Civic"], service: "Express", visits: 1, dormantMonths: 7, locationType: "Drop-off" as const, reason: "Offering mobile service to bring them back", score: 38 },
    { name: "Sherrie Delinsky", vehicles: ["BMW ix", "Range Rover", "Forester", "XC90"], service: "Premium", visits: 6, dormantMonths: 17, locationType: "Van" as const, reason: "Was coming regularly, slowed down", score: 55 },
    { name: "Zaid Ashai", vehicles: ["Lucid Air", "Rivian", "Tesla"], service: "Platinum", visits: 3, dormantMonths: 36, locationType: "Pick-up" as const, reason: "Long shot — 3 years dormant but multi-vehicle", score: 28 },
    { name: "Matthew Weinzieri", vehicles: ["Forester", "Outback"], service: "Interior", visits: 3, dormantMonths: 4, locationType: "Van" as const, reason: "Seasonal — spring is a good time for a deep clean", score: 62 },
    { name: "Gina Medow", vehicles: ["XC60"], service: "Platinum", visits: 1, dormantMonths: 10, locationType: "Drop-off" as const, reason: "Platinum customer, hasn't been back in 10 months", score: 41 },
    { name: "Amy Fournier", vehicles: ["A6", "Promaster", "Tacoma"], service: "Premium", visits: 2, dormantMonths: 17, locationType: "Van" as const, reason: "Multi-vehicle household, hasn't been in 17 months", score: 35 },
    { name: "Marcus Thompson", vehicles: ["BMW X5"], service: "Full Detail", visits: 5, dormantMonths: 6, locationType: "Van" as const, reason: "Regular customer, 6 months overdue", score: 68 },
    { name: "Jennifer Walsh", vehicles: ["Tesla Model 3", "Audi Q5"], service: "Ceramic Coating", visits: 4, dormantMonths: 5, locationType: "Drop-off" as const, reason: "Was upgrading services, then stopped", score: 58 },
    { name: "David Kim", vehicles: ["Mercedes GLC"], service: "Interior", visits: 2, dormantMonths: 9, locationType: "Pick-up" as const, reason: "Interior customers often move to Premium", score: 44 },
    { name: "Sarah Martinez", vehicles: ["Porsche Cayenne"], service: "Premium", visits: 7, dormantMonths: 3, locationType: "Van" as const, reason: "Regular customer, due for seasonal detail", score: 75 },
    { name: "Robert Chen", vehicles: ["Lexus RX", "BMW 7 Series"], service: "Full Detail", visits: 3, dormantMonths: 11, locationType: "Drop-off" as const, reason: "Multi-vehicle household, high chance of return", score: 52 },
    { name: "Amanda Foster", vehicles: ["Range Rover Sport"], service: "Platinum", visits: 9, dormantMonths: 4, locationType: "Van" as const, reason: "Could be ready for the Platinum package", score: 80 },
    { name: "Michael Park", vehicles: ["Audi A6"], service: "Express", visits: 1, dormantMonths: 14, locationType: "Drop-off" as const, reason: "Good candidate for Premium upgrade", score: 32 },
    { name: "Lisa Rodriguez", vehicles: ["Mercedes S-Class"], service: "Premium", visits: 6, dormantMonths: 7, locationType: "Van" as const, reason: "Regular customer, 7 months overdue", score: 65 },
    { name: "James Wilson", vehicles: ["Tacoma", "4Runner"], service: "Exterior Wash", visits: 2, dormantMonths: 5, locationType: "Drop-off" as const, reason: "Seasonal — spring is a good time for a full detail", score: 48 },
    { name: "Emily Chang", vehicles: ["Tesla Model Y"], service: "Ceramic Coating", visits: 4, dormantMonths: 8, locationType: "Pick-up" as const, reason: "Was coming regularly, slowed down", score: 56 },
    { name: "Chris Anderson", vehicles: ["BMW X3"], service: "Interior", visits: 1, dormantMonths: 6, locationType: "Van" as const, reason: "Interior customers often move to Premium", score: 42 },
    { name: "Nicole Brooks", vehicles: ["Volvo XC90", "Honda CR-V"], service: "Full Detail", visits: 3, dormantMonths: 10, locationType: "Drop-off" as const, reason: "Multi-vehicle household, hasn't been in 10 months", score: 47 },
    { name: "Daniel Lee", vehicles: ["Rivian R1S"], service: "Premium", visits: 5, dormantMonths: 4, locationType: "Van" as const, reason: "Regular customer, due for seasonal detail", score: 70 },
    { name: "Rachel Cooper", vehicles: ["Audi e-tron"], service: "Express", visits: 2, dormantMonths: 12, locationType: "Drop-off" as const, reason: "Offering mobile service to bring them back", score: 36 },
    { name: "Kevin Wright", vehicles: ["Ford F-150", "Mustang Mach-E"], service: "Full Detail", visits: 4, dormantMonths: 6, locationType: "Van" as const, reason: "Was upgrading services, then stopped", score: 54 },
    { name: "Maria Santos", vehicles: ["Lexus NX"], service: "Platinum", visits: 8, dormantMonths: 3, locationType: "Pick-up" as const, reason: "Regular customer, due for follow-up", score: 78 },
    { name: "Tyler Blake", vehicles: ["Jeep Grand Cherokee"], service: "Interior", visits: 1, dormantMonths: 15, locationType: "Drop-off" as const, reason: "Due for a follow-up based on service cadence", score: 30 },
  ];

  const times = ["09:00", "10:30", "11:00", "13:00", "14:30", "15:00", "16:30"];
  const today = new Date();

  return customerData.map((customer, i) => {
    const daysOffset = Math.floor((i / customerData.length) * 30) + Math.floor(Math.random() * 3);
    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + daysOffset);
    const dateStr = `${scheduledDate.getFullYear()}-${(scheduledDate.getMonth() + 1).toString().padStart(2, "0")}-${scheduledDate.getDate().toString().padStart(2, "0")}`;
    const firstName = customer.name.split(" ")[0];
    const days = customer.dormantMonths * 30;
    const timeAgo = customer.dormantMonths <= 1 ? "about a month" : `${customer.dormantMonths} months`;

    const tags: string[] = [customer.service];
    tags.push(`${customer.visits} ${customer.visits === 1 ? "visit" : "visits"}`);
    tags.push(customer.locationType);
    if (customer.vehicles.length > 1) tags.push("Multi-vehicle");

    return {
      id: `followup-${i}`,
      customerName: customer.name,
      customerPhone: `(555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerEmail: `${firstName.toLowerCase()}@gmail.com`,
      vehicleInfo: customer.vehicles.join(" + "),
      vehicles: customer.vehicles,
      lastService: customer.service,
      daysSinceVisit: days,
      scheduledDate: dateStr,
      scheduledTime: times[i % times.length],
      draftMessage: `Hi ${firstName}, it's been ${timeAgo} since your last ${customer.service.toLowerCase()}. Your ${customer.vehicles[0]} could probably use some attention. Want to schedule something this week?`,
      priority: days > 90 ? "high" : days > 60 ? "medium" : "low",
      status: "scheduled",
      channel: i % 2 === 0 ? "sms" : "email",
      notes: null,
      reasonLine: customer.reason,
      confidenceScore: customer.score,
      tags,
      locationType: customer.locationType,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────

export default function FollowupsPage() {
  // Board state
  const [followups, setFollowups] = useState<FollowupData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Card interactions
  const [infoHoverId, setInfoHoverId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importModalStep, setImportModalStep] = useState<ImportModalStep>("upload");
  const [importPreviewData, setImportPreviewData] = useState<FollowupData[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [importSearchText, setImportSearchText] = useState("");
  const [importSortBy, setImportSortBy] = useState<"name" | "recent">("name");
  const [importSortDir, setImportSortDir] = useState<"asc" | "desc">("asc");
  const [loadingStep, setLoadingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading state for API
  const [isLoading, setIsLoading] = useState(true);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch followups from API
  const fetchFollowups = useCallback(async () => {
    try {
      const res = await fetch("/api/detailer/followups");
      if (res.ok) {
        const data = await res.json();
        setFollowups(
          data.followups.map((f: Record<string, unknown>) => ({
            ...f,
            scheduledDate:
              typeof f.scheduledDate === "string"
                ? f.scheduledDate.split("T")[0]
                : new Date(f.scheduledDate as string).toISOString().split("T")[0],
          }))
        );
      }
    } catch {
      // API not available, will show empty state
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  // ─── CSV Upload Handler ──────────────────────────────────────────

  const handleCSVUpload = (_file: File) => {
    setImportModalStep("loading");
    setLoadingStep(0);
    setTimeout(() => setLoadingStep(1), 800);
    setTimeout(() => setLoadingStep(2), 1600);
    setTimeout(() => setLoadingStep(3), 2400);
    setTimeout(() => setLoadingStep(4), 3200);
    setTimeout(() => {
      const data = generateMockFollowups();
      setImportPreviewData(data);
      setImportSelectedIds(new Set(data.map((d) => d.id)));
      setImportModalStep("confirm");
    }, 4000);
  };

  // ─── Import Confirm Handler ──────────────────────────────────────

  const handleImportConfirm = async () => {
    const selected = importPreviewData.filter((d) => importSelectedIds.has(d.id));
    try {
      const res = await fetch("/api/detailer/followups/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followups: selected }),
      });
      if (res.ok) {
        await fetchFollowups();
      } else {
        setFollowups(selected);
      }
    } catch {
      setFollowups(selected);
    }
    setShowImportModal(false);
    setImportModalStep("upload");
  };

  // ─── Delete Handler ──────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setFollowups((prev) => prev.filter((f) => f.id !== id));
    setDeleteConfirmId(null);
    try {
      await fetch(`/api/detailer/followups/${id}`, { method: "DELETE" });
    } catch {
      // Already removed from local state
    }
  };

  // ─── Column Computation ──────────────────────────────────────────

  const today = new Date();
  const colCount = isMobileView ? 2 : 4;

  const getColumnsForMode = (): { start: Date; end: Date; label: string; subLabel?: string }[] => {
    const d = currentDate;
    if (viewMode === "day") {
      return Array.from({ length: colCount }, (_, i) => {
        const day = new Date(d);
        day.setDate(d.getDate() + i);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        return { start: new Date(day), end: dayEnd, label: DAY_NAMES[day.getDay()], subLabel: String(day.getDate()) };
      });
    } else if (viewMode === "week") {
      const sunday = new Date(d);
      sunday.setDate(d.getDate() - d.getDay());
      return Array.from({ length: colCount }, (_, i) => {
        const weekStart = new Date(sunday);
        weekStart.setDate(sunday.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(weekStart),
          end: weekEnd,
          label: `${SHORT_MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${SHORT_MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}`,
        };
      });
    } else {
      return Array.from({ length: colCount }, (_, i) => {
        const monthStart = new Date(d.getFullYear(), d.getMonth() + i, 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + i + 1, 0, 23, 59, 59, 999);
        return { start: monthStart, end: monthEnd, label: MONTH_NAMES[monthStart.getMonth()], subLabel: String(monthStart.getFullYear()) };
      });
    }
  };

  const getPeriodLabel = () => {
    const cols = getColumnsForMode();
    const start = cols[0].start;
    const end = cols[cols.length - 1].end;
    if (isMobileView) {
      if (viewMode === "day") {
        return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
      }
      return `${SHORT_MONTH_NAMES[start.getMonth()]}, ${start.getFullYear()}`;
    }
    if (viewMode === "day") {
      return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else if (viewMode === "week") {
      return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
    } else {
      if (start.getFullYear() === end.getFullYear()) {
        return `${SHORT_MONTH_NAMES[start.getMonth()]} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
      }
      return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getFullYear()} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    }
  };

  const navigatePeriod = (direction: number) => {
    const d = new Date(currentDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + direction * colCount);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + direction * colCount * 7);
    } else {
      d.setMonth(d.getMonth() + direction * colCount);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const columns = getColumnsForMode();

  // ─── Render ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-full">
        <div className="w-5 h-5 rounded-full border-2 border-[#e8e8e6] border-t-[#FF3700] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white h-full">
      {/* Board */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e8e8e6] px-4 md:px-6 py-5 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base md:text-sm font-medium text-[#2B2B26]">
                {getPeriodLabel()}
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 mr-1">
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setImportModalStep("upload");
                  }}
                  className="p-1 hover:bg-[#e5e5e3] rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-[#6b6a5e]" />
                </button>
                <button
                  onClick={() => navigatePeriod(-1)}
                  className="p-1 hover:bg-[#e5e5e3] rounded-md transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-[#6b6a5e]" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-2 py-0.5 text-[11px] font-medium text-[#6b6a5e] hover:text-[#2B2B26] hover:bg-[#e5e5e3] rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigatePeriod(1)}
                  className="p-1 hover:bg-[#e5e5e3] rounded-md transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-[#6b6a5e]" />
                </button>
              </div>
              {/* Desktop view mode toggle */}
              <div className="hidden md:flex items-center bg-gray-100 rounded-full p-1">
                {(["day", "week", "month"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-3 py-1 text-sm font-medium rounded-full transition-colors capitalize",
                      viewMode === mode
                        ? "bg-white text-gray-800 shadow"
                        : "text-gray-500 hover:bg-gray-200"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {/* Mobile view mode dropdown */}
              <div className="relative md:hidden">
                <button
                  onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                  className="flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800 capitalize"
                >
                  {viewMode}
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </button>
                {showViewModeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowViewModeDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 py-1 z-50 min-w-[120px]">
                      {(["day", "week", "month"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setViewMode(mode);
                            setShowViewModeDropdown(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2 text-left text-sm font-medium capitalize transition-colors",
                            viewMode === mode
                              ? "bg-gray-50 text-gray-900"
                              : "text-gray-500 hover:bg-gray-50"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="flex-1 overflow-y-auto pb-24 md:pb-4">
          <div className="flex gap-0 px-2 md:px-4 pt-3 w-full">
            {columns.map((col, colIdx) => {
              const colFollowups = followups
                .filter((f) => {
                  const fDate = new Date(f.scheduledDate + "T00:00:00");
                  return fDate >= col.start && fDate <= col.end;
                })
                .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
              const isCurrentPeriod = today >= col.start && today <= col.end;
              const colKey = `${col.start.getFullYear()}-${(col.start.getMonth() + 1).toString().padStart(2, "0")}-${col.start.getDate().toString().padStart(2, "0")}`;

              return (
                <div key={colIdx} className="flex-1 min-w-0 px-1 md:px-1.5" data-col={colKey}>
                  {/* Column header */}
                  <div className="flex items-center gap-2 py-2 px-1 mb-2 sticky top-0">
                    {isCurrentPeriod && <div className="w-2 h-2 rounded-full bg-[#FF3700] shrink-0" />}
                    <span
                      className={cn(
                        "text-xs font-medium truncate",
                        isCurrentPeriod ? "text-[#FF3700]" : "text-[#6b6a5e]"
                      )}
                    >
                      {col.label}
                    </span>
                    {col.subLabel && (
                      <span
                        className={cn(
                          "text-xs",
                          isCurrentPeriod ? "text-[#FF3700] font-semibold" : "text-[#9e9d92]"
                        )}
                      >
                        {col.subLabel}
                      </span>
                    )}
                    {colFollowups.length > 0 && (
                      <span className="text-[10px] text-[#9e9d92] ml-auto">
                        {colFollowups.length}
                      </span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[100px]">
                    {colFollowups.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-[#c1c0b8]">No follow-ups</p>
                      </div>
                    ) : (
                      colFollowups.map((followup) => (
                        <div key={followup.id} className="relative">
                          <div className="bg-white rounded-md border border-[#e8e8e6] p-3.5 transition-colors hover:border-[#d4d4cf]">
                            {/* Name + info + actions row */}
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-[13px] font-semibold text-[#2B2B26]">
                                {followup.customerName}
                              </p>
                              {/* Info hover */}
                              <div
                                className="relative"
                                onMouseEnter={() => setInfoHoverId(followup.id)}
                                onMouseLeave={() => setInfoHoverId(null)}
                              >
                                <Info className="h-3 w-3 text-[#c1c0b8] cursor-pointer hover:text-[#9e9d92] transition-colors" />
                                {infoHoverId === followup.id && (
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[300px] z-50">
                                    <div
                                      className="bg-white rounded-lg p-3.5 shadow-lg border border-[#e8e8e6]"
                                      onMouseEnter={() => setInfoHoverId(followup.id)}
                                      onMouseLeave={() => setInfoHoverId(null)}
                                    >
                                      {/* Customer header */}
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="h-8 w-8 rounded-full bg-[#f0f0ee] flex items-center justify-center text-[11px] font-semibold text-[#57564d]">
                                          {getInitials(followup.customerName)}
                                        </div>
                                        <div>
                                          <p className="text-[13px] font-medium text-[#2B2B26]">
                                            {followup.customerName}
                                          </p>
                                          <p className="text-[11px] text-[#9e9d92]">
                                            {followup.customerPhone}
                                          </p>
                                        </div>
                                      </div>
                                      {/* Stats */}
                                      <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-[#e8e8e6]">
                                        <div className="text-center">
                                          <p className="text-[14px] font-semibold text-[#2B2B26]">
                                            {followup.daysSinceVisit != null
                                              ? `${Math.round(followup.daysSinceVisit / 30)}mo`
                                              : "—"}
                                          </p>
                                          <p className="text-[10px] text-[#9e9d92]">Dormant</p>
                                        </div>
                                        <div className="text-center">
                                          <p className="text-[14px] font-semibold text-[#2B2B26]">
                                            {followup.lastService || "—"}
                                          </p>
                                          <p className="text-[10px] text-[#9e9d92]">Last Service</p>
                                        </div>
                                      </div>
                                      {/* Vehicles */}
                                      {followup.vehicles.length > 0 && (
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <Car className="h-3 w-3 text-[#9e9d92]" />
                                          <span className="text-[11px] text-[#6b6a5e]">
                                            {followup.vehicles.join(", ")}
                                          </span>
                                        </div>
                                      )}
                                      {/* Location */}
                                      {followup.locationType && (
                                        <div className="flex items-center gap-1.5 mb-3">
                                          <MapPin className="h-3 w-3 text-[#9e9d92]" />
                                          <span className="text-[11px] text-[#6b6a5e]">
                                            {followup.locationType} service
                                          </span>
                                        </div>
                                      )}
                                      {/* Draft message */}
                                      {followup.draftMessage && (
                                        <div className="border-t border-[#e8e8e6] pt-3">
                                          <div className="flex items-center gap-1.5 mb-2">
                                            <History className="h-3 w-3 text-[#9e9d92]" />
                                            <span className="text-[10px] font-medium text-[#9e9d92] uppercase tracking-wide">
                                              Draft Message
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-[#6b6a5e] leading-[1.5]">
                                            {followup.draftMessage}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* Confidence + delete */}
                              <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                {followup.confidenceScore != null && (
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      followup.confidenceScore >= 60
                                        ? "bg-[#22C55E]"
                                        : followup.confidenceScore >= 40
                                          ? "bg-[#EAB308]"
                                          : "bg-[#F97316]"
                                    )}
                                  />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(followup.id);
                                  }}
                                  className="text-[#d4d4cf] hover:text-[#EF4444] transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            {/* Vehicle info */}
                            <p className="text-[11px] text-[#9e9d92] mb-1">
                              {followup.vehicles.length <= 2
                                ? followup.vehicles.join(" + ")
                                : `${followup.vehicles.slice(0, 2).join(" + ")} +${followup.vehicles.length - 2} more`}
                            </p>

                            {/* Reason */}
                            {followup.reasonLine && (
                              <p className="text-[12px] text-[#6b6a5e] mb-2.5 leading-[1.4]">
                                {followup.reasonLine}
                              </p>
                            )}

                            {/* Tags */}
                            {followup.tags.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {followup.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#f0f0ee] text-[#6b6a5e]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative bg-white rounded-xl border border-[#e8e8e6] shadow-xl z-10 w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <Trash2 className="h-4 w-4 text-[#EF4444]" />
              </div>
              <div>
                <h3 className="text-[14px] font-medium text-[#2B2B26]">
                  Remove from outreach?
                </h3>
                <p className="text-[12px] text-[#9e9d92]">
                  {followups.find((f) => f.id === deleteConfirmId)?.customerName} will be removed
                  from the follow-ups board.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-[#6b6a5e] bg-[#f0f0ee] rounded-lg hover:bg-[#e8e8e6] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2 text-[13px] font-medium text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowImportModal(false);
              setImportModalStep("upload");
            }}
          />
          <div
            className={cn(
              "relative bg-white rounded-xl border border-[#e8e8e6] shadow-xl z-10 w-full mx-4",
              importModalStep === "confirm" ? "max-w-2xl" : "max-w-md"
            )}
          >
            {/* Upload Step */}
            {importModalStep === "upload" && (
              <div className="p-6 text-center">
                <h2 className="text-sm font-medium text-[#2B2B26] mb-1">
                  Import customers + jobs
                </h2>
                <p className="text-[13px] text-[#9e9d92] mb-6">
                  Upload a CSV or XLS file with your customer and job data.
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-[#deded9] rounded-xl p-10 cursor-pointer hover:border-[#FF3700] transition-colors group mb-4"
                >
                  <div className="flex flex-col items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-[#f5f5f4] flex items-center justify-center group-hover:bg-[#FFF0EB] transition-colors">
                      <Upload className="h-5 w-5 text-[#9e9d92] group-hover:text-[#FF3700] transition-colors" />
                    </div>
                    <p className="text-[13px] text-[#6b6a5e]">
                      Drop file here, or{" "}
                      <span className="text-[#FF3700] group-hover:underline">browse</span>
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCSVUpload(file);
                  }}
                />
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportModalStep("upload");
                  }}
                  className="text-[12px] text-[#9e9d92] hover:text-[#6b6a5e] transition-colors mt-2"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Loading Step */}
            {importModalStep === "loading" && (
              <div className="p-6">
                <p className="text-[13px] text-[#9e9d92] mb-5">
                  Preparing your follow-ups board...
                </p>
                <div className="space-y-3">
                  {[
                    "Reading file",
                    "Analyzing history",
                    "Finding opportunities",
                    "Scheduling outreach",
                    "Drafting messages",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      {i < loadingStep ? (
                        <Check className="h-4 w-4 text-[#22C55E] shrink-0" />
                      ) : i === loadingStep ? (
                        <div className="h-4 w-4 flex items-center justify-center shrink-0">
                          <div className="w-3 h-3 rounded-full border border-[#c1c0b8] border-t-[#FF3700] animate-spin" />
                        </div>
                      ) : (
                        <div className="h-4 w-4 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#deded9]" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "text-[13px]",
                          i < loadingStep
                            ? "text-[#6b6a5e] line-through"
                            : i === loadingStep
                              ? "text-[#2B2B26]"
                              : "text-[#c1c0b8]"
                        )}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Step */}
            {importModalStep === "confirm" &&
              (() => {
                const filtered = importPreviewData
                  .filter((d) => {
                    if (!importSearchText) return true;
                    const q = importSearchText.toLowerCase();
                    return (
                      d.customerName.toLowerCase().includes(q) ||
                      (d.vehicleInfo || "").toLowerCase().includes(q) ||
                      (d.lastService || "").toLowerCase().includes(q) ||
                      (d.customerPhone || "").toLowerCase().includes(q)
                    );
                  })
                  .sort((a, b) => {
                    if (importSortBy === "name") {
                      const cmp = a.customerName.localeCompare(b.customerName);
                      return importSortDir === "asc" ? cmp : -cmp;
                    } else {
                      const aVal = a.daysSinceVisit ?? 0;
                      const bVal = b.daysSinceVisit ?? 0;
                      return importSortDir === "asc" ? aVal - bVal : bVal - aVal;
                    }
                  });
                const allSelected = filtered.length > 0 && filtered.every((d) => importSelectedIds.has(d.id));

                return (
                  <div className="flex flex-col max-h-[80vh]">
                    {/* Confirm header */}
                    <div className="p-4 border-b border-[#e8e8e6]">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-medium text-[#2B2B26]">
                          Review customers
                        </h2>
                        <span className="text-[12px] text-[#9e9d92]">
                          {importSelectedIds.size} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9e9d92]" />
                          <input
                            type="text"
                            value={importSearchText}
                            onChange={(e) => setImportSearchText(e.target.value)}
                            placeholder="Search customers..."
                            className="w-full pl-8 pr-3 py-1 text-[12px] bg-[#f5f5f4] border border-[#e8e8e6] rounded-md text-[#2B2B26] placeholder-[#9e9d92] focus:outline-none focus:border-[#c1c0b8]"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (importSortBy === "name") {
                              setImportSortBy("recent");
                              setImportSortDir("asc");
                            } else {
                              setImportSortBy("name");
                              setImportSortDir("asc");
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#f5f5f4] border border-[#e8e8e6] rounded-md text-[12px] text-[#6b6a5e] hover:bg-[#ececea] transition-colors whitespace-nowrap"
                        >
                          {importSortBy === "name" ? "Name A\u2013Z" : "Most recent"}
                          <ChevronDown className="h-3 w-3 text-[#9e9d92]" />
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-y-auto overflow-x-auto flex-1">
                      <table className="w-full min-w-[640px]">
                        <thead className="sticky top-0 bg-[#fafaf9]">
                          <tr className="text-[11px] text-[#9e9d92] uppercase">
                            <th className="text-left px-4 py-2 w-10">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => {
                                  if (allSelected) {
                                    setImportSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      filtered.forEach((d) => next.delete(d.id));
                                      return next;
                                    });
                                  } else {
                                    setImportSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      filtered.forEach((d) => next.add(d.id));
                                      return next;
                                    });
                                  }
                                }}
                                className="rounded border-[#deded9]"
                              />
                            </th>
                            <th className="text-left px-3 py-2 min-w-[160px]">Name</th>
                            <th className="text-left px-3 py-2 min-w-[100px]">Vehicle</th>
                            <th className="text-left px-3 py-2 min-w-[130px]">Last Service</th>
                            <th className="text-left px-3 py-2 min-w-[90px]">Last Visit</th>
                            <th className="text-left px-3 py-2 min-w-[130px]">Phone</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((d) => {
                            const vehicleModel = (d.vehicleInfo || "").replace(/^\d{4}\s+/, "");
                            return (
                              <tr
                                key={d.id}
                                className="border-t border-[#f0f0ee] hover:bg-[#fafaf9] transition-colors"
                              >
                                <td className="px-4 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={importSelectedIds.has(d.id)}
                                    onChange={() => {
                                      setImportSelectedIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(d.id)) next.delete(d.id);
                                        else next.add(d.id);
                                        return next;
                                      });
                                    }}
                                    className="rounded border-[#deded9]"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-[13px] text-[#2B2B26] whitespace-nowrap">
                                  {d.customerName}
                                </td>
                                <td className="px-3 py-2.5 text-[13px] text-[#6b6a5e] whitespace-nowrap">
                                  {vehicleModel}
                                </td>
                                <td className="px-3 py-2.5 text-[13px] text-[#6b6a5e] truncate max-w-[130px]">
                                  {d.lastService}
                                </td>
                                <td className="px-3 py-2.5 text-[13px] text-[#6b6a5e] whitespace-nowrap">
                                  {d.daysSinceVisit ?? 0} days
                                </td>
                                <td className="px-3 py-2.5 text-[13px] text-[#6b6a5e] whitespace-nowrap">
                                  {d.customerPhone}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Confirm footer */}
                    <div className="p-4 border-t border-[#e8e8e6] flex items-center justify-between">
                      <button
                        onClick={() => {
                          setShowImportModal(false);
                          setImportModalStep("upload");
                        }}
                        className="text-[13px] text-[#6b6a5e] hover:text-[#2B2B26] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImportConfirm}
                        className="px-4 py-2 bg-[#FF3700] hover:bg-[#e63200] text-white text-[13px] font-medium rounded-lg transition-colors"
                      >
                        Import {importSelectedIds.size} records
                      </button>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}
