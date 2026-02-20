"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Car,
  MapPin,
  Mail,
  Clock,
  Brain,
  User,
  Phone,
  History,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  aiReasoning: string | null;
}

type ViewMode = "day" | "week" | "month";

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

function formatScheduledTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const hr = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hr}:${m.toString().padStart(2, "0")} ${p}`;
}

function formatScheduledDateTime(date: string, time: string): string {
  const d = new Date(date + "T00:00:00");
  return `${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${formatScheduledTime(time)}`;
}

function formatCardTime(date: string, time: string, viewMode: ViewMode): string {
  if (viewMode === "day") return formatScheduledTime(time);
  const d = new Date(date + "T00:00:00");
  return `${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${formatScheduledTime(time)}`;
}

function formatLastVisit(days: number): string {
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}yr ago`;
}

function getLastVisitDotColor(days: number): string {
  if (days <= 60) return "bg-[#22C55E]";
  if (days <= 120) return "bg-[#EAB308]";
  return "bg-[#F97316]";
}

const LOADING_STEPS = [
  "Analyzing customers...",
  "Generating messages...",
  "Scheduling outreach...",
  "Building your board...",
];

// ─── Component ───────────────────────────────────────────────────────

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowupData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<FollowupData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchFollowups = useCallback(async () => {
    try {
      const res = await fetch("/api/detailer/followups");
      if (res.ok) {
        const data = await res.json();
        const mapped = data.followups.map((f: Record<string, unknown>) => ({
          ...f,
          scheduledDate:
            typeof f.scheduledDate === "string"
              ? f.scheduledDate.split("T")[0]
              : new Date(f.scheduledDate as string).toISOString().split("T")[0],
        }));
        return mapped as FollowupData[];
      }
    } catch {
      // API not available
    }
    return [];
  }, []);

  const generateFollowups = useCallback(async (regenerate = false) => {
    setIsGenerating(true);
    setGeneratingStep(0);
    setErrorMessage(null);

    const stepInterval = setInterval(() => {
      setGeneratingStep((prev) => {
        if (prev >= LOADING_STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    try {
      const res = await fetch("/api/detailer/followups/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });

      if (!res.ok) {
        clearInterval(stepInterval);
        let errorMsg = `Generation failed (${res.status})`;
        try {
          const body = await res.json();
          if (body.error) errorMsg = body.error;
        } catch {
          if (res.status === 504) {
            errorMsg = "The request timed out. Please try again — this can happen with many customers.";
          }
        }
        setErrorMessage(errorMsg);
        return;
      }

      const body = await res.json();

      if (body.count === 0) {
        clearInterval(stepInterval);
        setErrorMessage("No eligible customers found. Make sure your customers have at least one completed service.");
        return;
      }

      clearInterval(stepInterval);
      setGeneratingStep(LOADING_STEPS.length - 1);
      await new Promise((r) => setTimeout(r, 600));
      const data = await fetchFollowups();
      setFollowups(data);
    } catch (err) {
      console.error("Generate followups error:", err);
      setErrorMessage("Failed to connect to the server. Please try again.");
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  }, [fetchFollowups]);

  useEffect(() => {
    (async () => {
      const data = await fetchFollowups();
      setFollowups(data);
      setIsLoading(false);
    })();
  }, [fetchFollowups]);

  const handleRegenerate = async () => {
    setFollowups([]);
    generateFollowups(true);
  };

  const handleDelete = async (id: string) => {
    setFollowups((prev) => prev.filter((f) => f.id !== id));
    setDeleteConfirmId(null);
    if (drawerData?.id === id) setDrawerData(null);
    try {
      await fetch(`/api/detailer/followups/${id}`, { method: "DELETE" });
    } catch { /* already removed from local state */ }
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
      if (viewMode === "day") return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
      return `${SHORT_MONTH_NAMES[start.getMonth()]}, ${start.getFullYear()}`;
    }
    if (viewMode === "month") {
      if (start.getFullYear() === end.getFullYear()) return `${SHORT_MONTH_NAMES[start.getMonth()]} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
      return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getFullYear()} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${SHORT_MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${SHORT_MONTH_NAMES[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  };

  const navigatePeriod = (direction: number) => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + direction * colCount);
    else if (viewMode === "week") d.setDate(d.getDate() + direction * colCount * 7);
    else d.setMonth(d.getMonth() + direction * colCount);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());
  const columns = getColumnsForMode();

  // ─── Render: Loading / Generating ─────────────────────────────────

  if (isLoading && !isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-full">
        <div className="w-5 h-5 rounded-full border-2 border-[#e8e8e6] border-t-[#FF3700] animate-spin" />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-full">
        <div className="w-full max-w-sm px-6">
          <p className="text-sm font-medium text-[#2B2B26] mb-5">Preparing your outreach board...</p>
          <div className="space-y-3">
            {LOADING_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i < generatingStep ? (
                  <Check className="h-4 w-4 text-[#22C55E] shrink-0" />
                ) : i === generatingStep ? (
                  <div className="h-4 w-4 flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 rounded-full border border-[#c1c0b8] border-t-[#FF3700] animate-spin" />
                  </div>
                ) : (
                  <div className="h-4 w-4 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#deded9]" />
                  </div>
                )}
                <span className={cn(
                  "text-[13px]",
                  i < generatingStep ? "text-[#6b6a5e] line-through" : i === generatingStep ? "text-[#2B2B26]" : "text-[#c1c0b8]"
                )}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Empty State ──────────────────────────────────────────

  if (!isGenerating && followups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-full">
        <div className="text-center max-w-md px-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF0EB] flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-[#FF3700]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#2B2B26] mb-1.5">No outreach scheduled yet</h2>
          <p className="text-[13px] text-[#9e9d92] mb-6 leading-relaxed">
            Generate personalized follow-up messages for your past customers. AI will analyze their history and create targeted outreach.
          </p>
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
              <p className="text-[12px] text-[#991B1B]">{errorMessage}</p>
            </div>
          )}
          <button
            onClick={() => generateFollowups(false)}
            className="px-5 py-2.5 bg-[#FF3700] hover:bg-[#e63200] text-white text-[13px] font-medium rounded-lg transition-colors"
          >
            Generate Outreach
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Board ─────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-white h-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e8e8e6] px-4 md:px-6 py-5 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-base md:text-sm font-medium text-[#2B2B26]">{getPeriodLabel()}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="p-1 hover:bg-[#e5e5e3] rounded-md transition-colors disabled:opacity-50"
                title="Regenerate outreach"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-[#6b6a5e]", isGenerating && "animate-spin")} />
              </button>
              <div className="flex items-center gap-0.5 mr-1">
                <button onClick={() => navigatePeriod(-1)} className="p-1 hover:bg-[#e5e5e3] rounded-md transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5 text-[#6b6a5e]" />
                </button>
                <button onClick={goToToday} className="px-2 py-0.5 text-[11px] font-medium text-[#6b6a5e] hover:text-[#2B2B26] hover:bg-[#e5e5e3] rounded-md transition-colors">
                  Today
                </button>
                <button onClick={() => navigatePeriod(1)} className="p-1 hover:bg-[#e5e5e3] rounded-md transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 text-[#6b6a5e]" />
                </button>
              </div>
              <div className="hidden md:flex bg-[#f0f0ee] rounded-lg p-0.5">
                {(["day", "week", "month"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors capitalize",
                      viewMode === mode ? "bg-[#e2e1dd] text-[#2B2B26] shadow-sm" : "text-[#6b6a5e] hover:text-[#2B2B26]"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="relative md:hidden">
                <button
                  onClick={() => setShowViewModeDropdown(!showViewModeDropdown)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-[#f0f0ee] text-[#2B2B26] capitalize"
                >
                  {viewMode}
                  <ChevronDown className="h-3 w-3 text-[#6b6a5e]" />
                </button>
                {showViewModeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowViewModeDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-[#F0F0EE] rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                      {(["day", "week", "month"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setViewMode(mode); setShowViewModeDropdown(false); }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-[12px] capitalize transition-colors",
                            viewMode === mode ? "bg-[#f8f8f7] font-medium text-[#2B2B26]" : "text-[#6b6a5e] hover:bg-[#f8f8f7]"
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

              return (
                <div key={colIdx} className="flex-1 min-w-0 px-1 md:px-1.5">
                  {/* Column header */}
                  <div className="flex items-center gap-2 py-2 px-1 mb-2 sticky top-0">
                    {isCurrentPeriod && <div className="w-2 h-2 rounded-full bg-[#FF3700] shrink-0" />}
                    <span className={cn("text-xs font-medium truncate", isCurrentPeriod ? "text-[#FF3700]" : "text-[#6b6a5e]")}>
                      {col.label}
                    </span>
                    {col.subLabel && (
                      <span className={cn("text-xs", isCurrentPeriod ? "text-[#FF3700] font-semibold" : "text-[#9e9d92]")}>
                        {col.subLabel}
                      </span>
                    )}
                    {colFollowups.length > 0 && (
                      <span className="text-[10px] text-[#9e9d92] ml-auto">{colFollowups.length}</span>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[100px]">
                    {colFollowups.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-xs text-[#c1c0b8]">No follow-ups</p>
                      </div>
                    ) : (
                      colFollowups.map((followup) => {
                        const isExpanded = expandedMessageId === followup.id;
                        return (
                          <div key={followup.id} className="relative">
                            <div
                              className="bg-white rounded-md border border-[#e8e8e6] p-3.5 transition-colors shadow-[0_1px_2px_0_rgba(0,0,0,0.06)] cursor-pointer hover:border-[#d4d4cf]"
                              onClick={() => setDrawerData(followup)}
                            >
                              {/* Row 1: Name + time + delete */}
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[13px] font-semibold text-[#2B2B26] truncate">{followup.customerName}</p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {followup.scheduledTime && (
                                    <span className="text-[10px] text-[#9e9d92] whitespace-nowrap">
                                      {formatCardTime(followup.scheduledDate, followup.scheduledTime, viewMode)}
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(followup.id); }}
                                    className="text-[#d4d4cf] hover:text-[#EF4444] transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Message with more/less */}
                              {followup.draftMessage && (
                                <div className="mb-2">
                                  {isExpanded ? (
                                    <p className="text-[11.5px] text-[#2B2B26] leading-[1.5]">
                                      {followup.draftMessage}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setExpandedMessageId(null); }}
                                        className="text-[#9e9d92] hover:text-[#6b6a5e] ml-1 text-[11px] font-medium"
                                      >
                                        less
                                      </button>
                                    </p>
                                  ) : (
                                    <div className="flex items-baseline gap-0 overflow-hidden">
                                      <span className="text-[11.5px] text-[#2B2B26] leading-[1.5] truncate min-w-0">
                                        {followup.draftMessage}
                                      </span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setExpandedMessageId(followup.id); }}
                                        className="text-[#FF3700] hover:text-[#e63200] text-[11px] font-medium ml-1 shrink-0"
                                      >
                                        more
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Row 3: Tags */}
                              <div className="flex items-center gap-1 overflow-hidden">
                                {followup.daysSinceVisit != null && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[1px] bg-white border border-[#e8e8e6] text-[#6b6a5e] shrink-0">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", getLastVisitDotColor(followup.daysSinceVisit))} />
                                    {formatLastVisit(followup.daysSinceVisit)}
                                  </span>
                                )}
                                {(() => {
                                  const maxVisible = 2;
                                  const visibleTags = followup.tags.slice(0, maxVisible);
                                  const remaining = followup.tags.length - maxVisible;
                                  return (
                                    <>
                                      {visibleTags.map((tag, idx) => (
                                        <span key={idx} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[1px] bg-white border border-[#e8e8e6] text-[#6b6a5e] shrink-0">
                                          {tag}
                                        </span>
                                      ))}
                                      {remaining > 0 && (
                                        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[1px] bg-white border border-[#e8e8e6] text-[#9e9d92] shrink-0">
                                          +{remaining}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })
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
                <h3 className="text-[14px] font-medium text-[#2B2B26]">Remove from outreach?</h3>
                <p className="text-[12px] text-[#9e9d92]">
                  {followups.find((f) => f.id === deleteConfirmId)?.customerName} will be removed from the outbound queue.
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

      {/* Outbound Detail Drawer */}
      <AnimatePresence>
        {drawerData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerData(null)}
              className="fixed inset-0 bg-black/5 z-[100]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 35, stiffness: 400 }}
              className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-xl z-[101] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="h-[60px] px-5 flex items-center justify-between border-b border-[#F0F0EE] flex-shrink-0">
                <span className="text-sm font-medium text-[#2B2B26]">Outreach Details</span>
                <button onClick={() => setDrawerData(null)} className="p-1.5 hover:bg-[#f8f8f7] rounded transition-colors">
                  <X className="h-4 w-4 text-[#9e9d92]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Customer Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-12 w-12 rounded-full bg-[#f0f0ee] flex items-center justify-center text-[#4a4a42] text-base font-bold flex-shrink-0">
                      {getInitials(drawerData.customerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-medium text-[#2B2B26]">{drawerData.customerName}</h2>
                      <p className="text-[12px] text-[#9e9d92]">{drawerData.vehicles.join(" + ")}</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="p-3 text-center">
                      <p className="text-[15px] font-semibold text-[#2B2B26]">{drawerData.confidenceScore ?? "—"}</p>
                      <p className="text-[10px] text-[#9e9d92]">Score</p>
                    </div>
                    <div className="p-3 text-center border-x border-[#F0F0EE]">
                      <p className="text-[15px] font-semibold text-[#2B2B26]">{drawerData.lastService || "—"}</p>
                      <p className="text-[10px] text-[#9e9d92]">Last Service</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[15px] font-semibold text-[#2B2B26]">
                        {drawerData.daysSinceVisit != null ? `${Math.round(drawerData.daysSinceVisit / 30)}mo` : "—"}
                      </p>
                      <p className="text-[10px] text-[#9e9d92]">Since Last Visit</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {drawerData.daysSinceVisit != null && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[1px] bg-white border border-[#e8e8e6] text-[#6b6a5e]">
                        <div className={cn("w-1.5 h-1.5 rounded-full", getLastVisitDotColor(drawerData.daysSinceVisit))} />
                        {formatLastVisit(drawerData.daysSinceVisit)}
                      </span>
                    )}
                    {drawerData.tags.map((tag, idx) => (
                      <span key={idx} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[1px] bg-white border border-[#e8e8e6] text-[#6b6a5e]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Draft Message Section */}
                <div className="border-t border-[#F0F0EE]">
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="h-3.5 w-3.5 text-[#9e9d92]" />
                      <span className="text-[11px] font-medium text-[#9e9d92] uppercase tracking-wide">Draft Message</span>
                      <span className="text-[10px] text-[#9e9d92] ml-auto">via {drawerData.channel}</span>
                    </div>
                    <div className="bg-[#f8f8f7] rounded-lg p-4">
                      <p className="text-[13px] text-[#2B2B26] leading-[1.6]">{drawerData.draftMessage}</p>
                    </div>
                    {drawerData.scheduledTime && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <Clock className="h-3 w-3 text-[#9e9d92]" />
                        <span className="text-[11px] text-[#9e9d92]">
                          Scheduled for {formatScheduledDateTime(drawerData.scheduledDate, drawerData.scheduledTime)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Reasoning Section */}
                {drawerData.aiReasoning && (
                  <div className="border-t border-[#F0F0EE]">
                    <div className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-3.5 w-3.5 text-[#9e9d92]" />
                        <span className="text-[11px] font-medium text-[#9e9d92] uppercase tracking-wide">AI Reasoning</span>
                      </div>
                      <p className="text-[12px] text-[#6b6a5e] leading-[1.6]">{drawerData.aiReasoning}</p>
                    </div>
                  </div>
                )}

                {/* Contact Section */}
                <div className="border-t border-[#F0F0EE]">
                  <div className="px-6 py-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-3.5 w-3.5 text-[#9e9d92]" />
                      <span className="text-[11px] font-medium text-[#9e9d92] uppercase tracking-wide">Contact</span>
                    </div>
                    <div className="space-y-2">
                      {drawerData.customerPhone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-[#9e9d92]" />
                          <span className="text-[12px] text-[#6b6a5e]">{drawerData.customerPhone}</span>
                        </div>
                      )}
                      {drawerData.customerEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-[#9e9d92]" />
                          <span className="text-[12px] text-[#6b6a5e]">{drawerData.customerEmail}</span>
                        </div>
                      )}
                      {drawerData.vehicles.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Car className="h-3 w-3 text-[#9e9d92]" />
                          <span className="text-[12px] text-[#6b6a5e]">{drawerData.vehicles.join(", ")}</span>
                        </div>
                      )}
                      {drawerData.locationType && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-[#9e9d92]" />
                          <span className="text-[12px] text-[#6b6a5e]">{drawerData.locationType} service</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason Line */}
                {drawerData.reasonLine && (
                  <div className="border-t border-[#F0F0EE]">
                    <div className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-3.5 w-3.5 text-[#9e9d92]" />
                        <span className="text-[11px] font-medium text-[#9e9d92] uppercase tracking-wide">Outreach Reason</span>
                      </div>
                      <p className="text-[12px] text-[#6b6a5e] leading-[1.6]">{drawerData.reasonLine}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
