"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine, ChevronRight, ChevronLeft, ChevronDown, Check, X,
  Pencil, Globe, Plus, Trash2, Download, Clock
} from "lucide-react";

const ACCENT = "#FB4803";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_SECONDARY = "#6B7280";

interface OnboardingAnalytics {
  totalCustomers: number;
  churnRate: number;
  lostCustomers: number;
  atRiskCount: number;
  atRiskRate: number;
  churnedCount: number;
  estimatedRevenueLost: number;
  multiVehicleCount: number;
  multiVehicleReturnRate: number;
  singleVehicleReturnRate: number;
  hasMultiVehicleData: boolean;
  expressUpgradeRate: number;
  hasServiceData: boolean;
  mobileReturnRate: number;
  shopReturnRate: number;
  hasLocationData: boolean;
  mobileCount: number;
  shopCount: number;
  peakMonth: string | null;
  slowMonth: string | null;
  peakToSlowRatio: number;
  hasSeasonalData: boolean;
  flaggedCount: number;
  hasNotesData: boolean;
  avgLifetimeValue: number;
  avgVisitsPerCustomer: number;
}

const stepVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const TOTAL_STEPS = 10;

function ProgressBar({ step }: { step: number }) {
  const progress = step === 0 ? 0 : (step / (TOTAL_STEPS - 1)) * 100;
  return (
    <div className="fixed top-0 left-0 right-0 z-[110] h-[2px] bg-black/5">
      <motion.div
        className="h-full rounded-r-full"
        style={{ backgroundColor: ACCENT }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

function LoadingCircle({ active, completed }: { active: boolean; completed: boolean }) {
  if (completed) {
    return <Check className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />;
  }
  if (active) {
    return (
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="#E5E5E5" strokeWidth="2" />
        <path d="M14 8a6 6 0 00-6-6" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return <div className="w-2 h-2 rounded-full bg-[#D1D5DB]" />;
}

function getInsights(analytics: OnboardingAnalytics) {
  const insights: { stat: string; heading: string; body: string }[] = [];

  // Multi-vehicle insight
  if (analytics.hasMultiVehicleData && analytics.multiVehicleCount > 0) {
    const ratio = analytics.singleVehicleReturnRate > 0
      ? Math.round(analytics.multiVehicleReturnRate / analytics.singleVehicleReturnRate)
      : 0;
    if (ratio >= 2) {
      insights.push({
        stat: `${ratio}x`,
        heading: "higher return rate for multi-vehicle households",
        body: `${analytics.multiVehicleCount.toLocaleString()} multi-vehicle customers \u2014 ${analytics.multiVehicleReturnRate}% return vs ${analytics.singleVehicleReturnRate}% for single-vehicle.`,
      });
    } else {
      insights.push({
        stat: `${analytics.multiVehicleCount}`,
        heading: analytics.multiVehicleCount === 1 ? "multi-vehicle household" : "multi-vehicle households",
        body: `${analytics.multiVehicleReturnRate}% return rate for multi-vehicle vs ${analytics.singleVehicleReturnRate}% for single-vehicle customers.`,
      });
    }
  }

  // Service upgrade insight
  if (analytics.hasServiceData && analytics.expressUpgradeRate > 0) {
    insights.push({
      stat: `${analytics.expressUpgradeRate}%`,
      heading: "of basic-tier customers also booked premium",
      body: "Entry-level services are your gateway. Carbon suggests upgrades when customers are ready.",
    });
  }

  // Location insight
  if (analytics.hasLocationData && analytics.mobileCount > 0 && analytics.shopCount > 0) {
    const mobileHigher = analytics.mobileReturnRate > analytics.shopReturnRate;
    const ratio = mobileHigher && analytics.shopReturnRate > 0
      ? Math.round((analytics.mobileReturnRate / analytics.shopReturnRate) * 10) / 10
      : !mobileHigher && analytics.mobileReturnRate > 0
        ? Math.round((analytics.shopReturnRate / analytics.mobileReturnRate) * 10) / 10
        : 0;

    if (ratio >= 1.3) {
      insights.push({
        stat: `${ratio}x`,
        heading: `higher return rate for ${mobileHigher ? "mobile" : "shop"} customers`,
        body: `Mobile: ${analytics.mobileReturnRate}% return. Shop: ${analytics.shopReturnRate}% return. Carbon targets the right channel for each customer.`,
      });
    } else {
      insights.push({
        stat: `${analytics.mobileCount + analytics.shopCount}`,
        heading: "customers with location data",
        body: `Mobile: ${analytics.mobileReturnRate}% return (${analytics.mobileCount} customers). Shop: ${analytics.shopReturnRate}% return (${analytics.shopCount} customers).`,
      });
    }
  }

  // Seasonal insight
  if (analytics.hasSeasonalData && analytics.peakMonth && analytics.slowMonth) {
    insights.push({
      stat: `${analytics.peakToSlowRatio}x`,
      heading: `more traffic in ${analytics.peakMonth} compared to ${analytics.slowMonth}`,
      body: "Carbon focuses outreach on slow months when you have capacity.",
    });
  }

  // Flagged customers insight
  if (analytics.hasNotesData && analytics.flaggedCount > 0) {
    insights.push({
      stat: `${analytics.flaggedCount}`,
      heading: analytics.flaggedCount === 1 ? "customer flagged to avoid" : "customers flagged to avoid",
      body: "Flagged automatically from notes. Carbon will never contact them.",
    });
  }

  // Lifetime value insight
  if (analytics.avgLifetimeValue > 0) {
    insights.push({
      stat: `$${analytics.avgLifetimeValue.toLocaleString()}`,
      heading: "average lifetime value per customer",
      body: `With ${analytics.avgVisitsPerCustomer > 0 ? analytics.avgVisitsPerCustomer : "~2"} visits on average. Winning back even a fraction means significant revenue.`,
    });
  }

  // If we have very little data, add generic but honest insights
  if (insights.length === 0) {
    insights.push({
      stat: `${analytics.totalCustomers}`,
      heading: analytics.totalCustomers === 1 ? "customer imported" : "customers imported",
      body: "Add more data fields like visit dates, services, and notes to unlock deeper insights.",
    });
  }

  return insights;
}

const REVIEW_MESSAGES = [
  {
    name: "Hamed Sayed",
    vehicles: "Range Rover + Mercedes",
    location: "Van",
    confidence: "high" as const,
    message: "Hey Hamed, it\u2019s been a few months \u2014 are the Range Rover or the Mercedes due for a cleanup? We\u2019ve got some openings this week if you want us to swing by.",
  },
  {
    name: "Sam Doty",
    vehicles: "Forester",
    location: "Shop Pick Up",
    confidence: "medium" as const,
    message: "Hi Sam, how\u2019s the Forester holding up since the Express wash? A lot of our customers end up trying the Premium \u2014 it covers the full interior too.",
  },
  {
    name: "Rachel Kim",
    vehicles: "Tesla Model 3 + Audi Q5",
    location: "Van",
    confidence: "high" as const,
    message: "Hey Rachel, noticed it\u2019s been a while since we last detailed the Tesla and Q5. Want us to come by and get them both looking fresh?",
  },
];

function CountUp({ target, suffix = "", duration = 1000 }: { target: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <span>{value.toLocaleString()}{suffix}</span>;
}

function StepNav({ onBack, onNext, nextLabel = "Continue", backLabel = "Back", nextColor, hideChevron }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; backLabel?: string; nextColor?: string; hideChevron?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-4 mt-auto shrink-0">
      {onBack ? (
        <button
          onClick={onBack}
          className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: TEXT_SECONDARY }}
        >
          <ChevronLeft className="w-4 h-4" /> {backLabel}
        </button>
      ) : (
        <div />
      )}
      {onNext ? (
        <motion.button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 text-white font-medium rounded-full px-5 py-2 text-sm"
          style={{ backgroundColor: nextColor || TEXT_PRIMARY }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {nextLabel} {!hideChevron && <ChevronRight className="w-4 h-4" />}
        </motion.button>
      ) : (
        <div />
      )}
    </div>
  );
}

function StepContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={`w-full max-w-[520px] mx-auto px-6 ${className}`}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

function ScrollStepContainer({ children, className = "", maxWidth = "700px" }: {
  children: React.ReactNode; className?: string; maxWidth?: string;
}) {
  return (
    <motion.div
      className={`w-full mx-auto px-6 flex flex-col pb-14 ${className}`}
      style={{ maxWidth }}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────
function Step0Welcome({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-[100] flex items-center justify-center"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0 }}
    >
      <div className="absolute inset-0 backdrop-blur-[16px] bg-black/10" />
      <div
        className="relative z-10 bg-white rounded-2xl px-10 py-12 md:px-14 md:py-16 max-w-[420px] w-[calc(100%-40px)] text-center"
        style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.06)" }}
      >
        <h1 className="text-[22px] font-normal mb-3" style={{ color: TEXT_PRIMARY, lineHeight: 1.3 }}>
          Get customers back
        </h1>
        <p className="text-sm font-light mb-6 leading-relaxed" style={{ color: TEXT_SECONDARY }}>
          Set up your AI assistant to re-engage past customers and grow your revenue.
        </p>
        <motion.button
          onClick={onStart}
          className="w-full py-3 text-[14px] font-normal text-white rounded-full transition-colors"
          style={{ backgroundColor: ACCENT }}
          whileHover={{ backgroundColor: "#e04200" }}
          whileTap={{ scale: 0.98 }}
        >
          Get started
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Step 1: CSV Upload ──────────────────────────────────────────────
function Step1Upload({ onAnalyze }: { onAnalyze: (count: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const ext = "." + selectedFile.name.split(".").pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError("Please upload a CSV or Excel file (.csv, .xlsx)");
      return;
    }
    setFile(selectedFile);
    setUploadError(null);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Name", "Phone", "Email",
      "Address 1", "Address 2", "City", "State", "Zip Code",
      "Vehicles", "Services", "Customer Type",
      "First Visit", "Last Visit", "Visits", "Lifetime Value",
      "Location", "Technician", "Notes", "Pets", "Kids", "State Valid"
    ];
    const exampleRow = [
      "John Doe", "+1234567890", "john@example.com",
      "123 Main St", "Apt 4", "Boston", "MA", "02101",
      "Toyota Camry 2020; Honda Civic 2018", "Express Detail; Full Detail", "returning",
      "2023-07-01", "2026-01-05", "5", "$1,272.00",
      "home", "Mike", "Prefers morning appointments", "", "", "TRUE"
    ];
    const csvContent = [
      headers.join(","),
      exampleRow.map(cell => `"${cell}"`).join(",")
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", "customer_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/detailer/customers/import", {
        method: "POST",
        body: formData,
        headers: { Accept: "text/event-stream" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to import customers");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming not supported");

      const decoder = new TextDecoder();
      let buffer = "";
      let successCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataMatch = line.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;
          try {
            const event = JSON.parse(dataMatch[1]);
            if (event.type === "complete") {
              successCount = event.success || 0;
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (parseErr: unknown) {
            const msg = parseErr instanceof Error ? parseErr.message : "";
            if (msg && msg !== "Unexpected end of JSON input") throw parseErr;
          }
        }
      }

      setUploading(false);
      onAnalyze(successCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setUploadError(msg);
      setUploading(false);
    }
  };

  return (
    <StepContainer className="text-center">
      <h2 className="text-lg font-medium mb-1.5" style={{ color: TEXT_PRIMARY }}>Import your customers</h2>
      <p className="text-sm font-light mb-6" style={{ color: TEXT_SECONDARY }}>
        Upload your customer data and we&apos;ll find opportunities you&apos;re missing.
      </p>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging ? "border-[#FB4803] bg-[#FB4803]/5" : "border-[#E5E5E5] hover:border-[#BFBFBF]"}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) handleFileSelect(droppedFile);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
          }}
        />
        <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2.5" style={{ backgroundColor: ACCENT }}>
          <ArrowDownToLine className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm" style={{ color: TEXT_PRIMARY }}>Drag and drop your CSV here</p>
        <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>or click to browse</p>
        <p className="text-[11px] mt-2.5" style={{ color: "#BFBFBF" }}>Supports .csv, .xlsx</p>
      </div>

      {file && (
        <motion.div
          className="mt-3 flex items-center justify-between"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm" style={{ color: TEXT_PRIMARY }}>
            {file.name} <span style={{ color: TEXT_SECONDARY }}>{formatFileSize(file.size)}</span>
          </p>
          <button onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} className="p-1 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY }} />
          </button>
        </motion.div>
      )}

      {uploadError && (
        <motion.p
          className="mt-2 text-xs text-red-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {uploadError}
        </motion.p>
      )}

      {file && (
        <motion.div className="mt-4 flex justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.button
            onClick={handleAnalyze}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 text-white font-medium rounded-full px-5 py-2 text-sm disabled:opacity-60"
            style={{ backgroundColor: ACCENT }}
            whileHover={!uploading ? { scale: 1.02 } : {}}
            whileTap={!uploading ? { scale: 0.98 } : {}}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Importing...
              </span>
            ) : (
              <>Analyze <ChevronRight className="w-4 h-4" /></>
            )}
          </motion.button>
        </motion.div>
      )}

      <div className="mt-4 flex justify-center">
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
          style={{ color: TEXT_SECONDARY }}
        >
          <Download className="w-3.5 h-3.5" /> Download template
        </button>
      </div>

      <div className="mt-5 pt-5 border-t border-black/[0.04]">
        <p className="text-xs mb-2.5" style={{ color: TEXT_SECONDARY }}>Or connect your CRM <span style={{ color: "#BFBFBF" }}>(coming soon)</span></p>
        <div className="flex flex-wrap gap-2 justify-center">
          {["Urable", "Jobber", "Housecall Pro", "Square"].map((crm) => (
            <button
              key={crm}
              className="px-3 py-1.5 text-xs rounded-full border border-[#E5E5E5] text-[#BFBFBF] cursor-not-allowed"
              disabled
            >
              {crm}
            </button>
          ))}
        </div>
      </div>
    </StepContainer>
  );
}

// ─── Step 2: Analyzing ───────────────────────────────────────────────
function Step2Analyzing({ customerCount, onComplete }: { customerCount: number; onComplete: (analytics: OnboardingAnalytics) => void }) {
  const [completedLines, setCompletedLines] = useState<number[]>([]);
  const [activeLine, setActiveLine] = useState(0);
  const analyticsRef = useRef<OnboardingAnalytics | null>(null);
  const fetchStarted = useRef(false);

  const messages = [
    `Reading ${customerCount.toLocaleString()} customers`,
    "Scanning vehicle data & multi-car households",
    "Mapping service history and upgrade patterns",
    "Calculating return probabilities by segment",
    "Analyzing seasonal demand patterns",
    "Flagging customers from notes",
  ];

  useEffect(() => {
    if (fetchStarted.current) return;
    fetchStarted.current = true;

    fetch("/api/detailer/onboarding/analytics")
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Analytics API failed")))
      .then(data => { analyticsRef.current = data; })
      .catch(err => {
        console.warn("[onboarding] Analytics fetch failed:", err.message);
        analyticsRef.current = {
          totalCustomers: customerCount,
          churnRate: 78,
          lostCustomers: Math.round(customerCount * 0.78),
          atRiskCount: Math.round(customerCount * 0.15),
          atRiskRate: 15,
          churnedCount: Math.round(customerCount * 0.63),
          estimatedRevenueLost: Math.round(customerCount * 0.78 * 348),
          multiVehicleCount: 0, multiVehicleReturnRate: 0, singleVehicleReturnRate: 0, hasMultiVehicleData: false,
          expressUpgradeRate: 0, hasServiceData: false,
          mobileReturnRate: 0, shopReturnRate: 0, hasLocationData: false, mobileCount: 0, shopCount: 0,
          peakMonth: null, slowMonth: null, peakToSlowRatio: 0, hasSeasonalData: false,
          flaggedCount: 0, hasNotesData: false,
          avgLifetimeValue: 0, avgVisitsPerCustomer: 0,
        };
      });
  }, [customerCount]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    messages.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setActiveLine(i);
        if (i > 0) {
          setCompletedLines((prev) => [...prev, i - 1]);
        }
      }, i * 1500));
    });
    timers.push(setTimeout(() => {
      setCompletedLines((prev) => [...prev, messages.length - 1]);
    }, messages.length * 1500));
    timers.push(setTimeout(() => {
      if (analyticsRef.current) {
        onComplete(analyticsRef.current);
      } else {
        const poll = setInterval(() => {
          if (analyticsRef.current) {
            clearInterval(poll);
            onComplete(analyticsRef.current);
          }
        }, 200);
        setTimeout(() => clearInterval(poll), 10000);
      }
    }, messages.length * 1500 + 800));
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete]);

  return (
    <StepContainer>
      <h2 className="text-lg font-medium mb-6" style={{ color: TEXT_PRIMARY }}>Analyzing your customers...</h2>
      <div className="space-y-3.5">
        {messages.map((msg, i) => {
          const isCompleted = completedLines.includes(i);
          const isActive = activeLine === i && !isCompleted;
          const isPending = i > activeLine;
          return (
            <motion.div
              key={i}
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: isPending ? 0.3 : 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LoadingCircle active={isActive} completed={isCompleted} />
              </div>
              <span className="text-sm" style={{ color: isCompleted ? "#22c55e" : isActive ? TEXT_PRIMARY : TEXT_SECONDARY }}>
                {msg}
              </span>
            </motion.div>
          );
        })}
      </div>
    </StepContainer>
  );
}

// ─── Step 3: Summary ─────────────────────────────────────────────────
function Step3Summary({ analytics, onViewInsights }: { analytics: OnboardingAnalytics; onViewInsights: () => void }) {
  const customerCount = analytics.totalCustomers;
  const churnRate = analytics.churnRate;
  const lostCount = analytics.lostCustomers;
  const revenueLeft = Math.round(analytics.estimatedRevenueLost / 1000);
  const isLowChurn = churnRate <= 10;

  // For low churn, show active retention rate instead
  const displayRate = isLowChurn ? (100 - churnRate) : churnRate;
  const highlightCount = isLowChurn ? displayRate : churnRate;
  const [animatedCount, setAnimatedCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = 40;
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      setAnimatedCount(Math.round(progress * highlightCount));
      if (frame >= totalFrames) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StepContainer className="max-w-[480px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white rounded-xl border border-[#e0e0de] p-6"
      >
        <div className="text-left mb-8">
          <div className="text-5xl font-light tracking-tight" style={{ color: TEXT_PRIMARY }}>
            <CountUp target={displayRate} suffix="%" duration={1200} />
          </div>
          {isLowChurn ? (
            <p className="text-sm mt-1.5 font-light" style={{ color: TEXT_SECONDARY }}>
              of your customers are still active
            </p>
          ) : (
            <p className="text-sm mt-1.5 font-light" style={{ color: TEXT_SECONDARY }}>
              need attention or never came back
            </p>
          )}
        </div>

        <div className="flex gap-[4px] items-end mb-5" style={{ height: "120px" }}>
          {Array.from({ length: 10 }).map((_, col) => {
            const darkInCol = Math.min(Math.max(highlightCount - col * 10, 0), 10);
            const animDarkInCol = Math.min(Math.max(animatedCount - col * 10, 0), 10);
            return (
              <div key={col} className="flex-1 flex flex-col-reverse gap-[3px] h-full">
                {Array.from({ length: 10 }).map((_, row) => {
                  const isDark = row < darkInCol;
                  const animDark = row < animDarkInCol;
                  return (
                    <motion.div
                      key={row}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: isDark ? (col * 10 + row) * 0.008 : 0.008 * highlightCount }}
                      className="w-full rounded-[2px]"
                      style={{
                        height: "calc((100% - 27px) / 10)",
                        backgroundColor: animDark
                          ? (isLowChurn ? "#22c55e" : "#C8C3BC")
                          : "#EDEAE6",
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mb-8">
          {isLowChurn ? (
            <>
              <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
                {(customerCount - lostCount).toLocaleString()} / {customerCount.toLocaleString()} customers active
              </p>
              {analytics.atRiskCount > 0 ? (
                <p className="text-xs" style={{ color: "#eab308" }}>
                  {analytics.atRiskCount} at risk of leaving
                </p>
              ) : (
                <p className="text-xs" style={{ color: "#22c55e" }}>
                  All customers in good standing
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
                {lostCount.toLocaleString()} / {customerCount.toLocaleString()} customers at risk
              </p>
              <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
                ~${revenueLeft > 0 ? `${revenueLeft.toLocaleString()}K` : `${analytics.estimatedRevenueLost.toLocaleString()}`} revenue at risk
              </p>
            </>
          )}
        </div>

        <motion.button
          onClick={onViewInsights}
          className="w-full inline-flex items-center justify-center gap-1.5 text-white font-medium rounded-full px-8 py-3 text-sm"
          style={{ backgroundColor: "#1A1A1A" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLowChurn ? (
            <>View insights <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Let&apos;s fix that <ChevronRight className="w-4 h-4" /></>
          )}
        </motion.button>
      </motion.div>
    </StepContainer>
  );
}

// ─── Step 4: Insights carousel ───────────────────────────────────────
function Step4Insights({ analytics, onContinue, onBack }: { analytics: OnboardingAnalytics; onContinue: () => void; onBack: () => void }) {
  const insights = getInsights(analytics);
  const [currentInsight, setCurrentInsight] = useState(0);
  const [direction, setDirection] = useState(1);
  const [viewedInsights, setViewedInsights] = useState<Set<number>>(new Set([0]));
  const isLast = currentInsight === insights.length - 1;
  const allViewed = viewedInsights.size === insights.length;

  return (
    <StepContainer className="max-w-[480px]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white rounded-xl border border-[#e0e0de] p-6"
      >
        <div className="text-left mb-6">
          <h2 className="text-lg font-medium mb-1" style={{ color: TEXT_PRIMARY }}>Actionable insights</h2>
          <p className="text-sm font-light" style={{ color: TEXT_SECONDARY }}>
            What we&apos;ll use to bring customers back and find upsell opportunities.
          </p>
        </div>

        <div className="min-h-[140px] flex flex-col justify-center mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentInsight}
              initial={{ opacity: 0, x: direction * 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-4xl font-light tracking-tight mb-0.5" style={{ color: TEXT_PRIMARY }}>
                {insights[currentInsight].stat}
              </div>
              <h3 className="text-sm font-normal mb-2" style={{ color: TEXT_PRIMARY }}>
                {insights[currentInsight].heading}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                {insights[currentInsight].body}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => { setDirection(-1); setCurrentInsight((prev) => Math.max(0, prev - 1)); }}
            disabled={currentInsight === 0}
            className="p-2 rounded-full hover:bg-black/[0.04] transition-colors disabled:opacity-20"
          >
            <ChevronLeft className="w-5 h-5" style={{ color: TEXT_PRIMARY }} />
          </button>

          <div className="flex items-center gap-1.5">
            {insights.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === currentInsight ? 16 : 6,
                  height: 6,
                  backgroundColor: i === currentInsight ? TEXT_PRIMARY : "#D9D9D9",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => {
              const next = Math.min(insights.length - 1, currentInsight + 1);
              setDirection(1);
              setCurrentInsight(next);
              setViewedInsights((prev) => new Set(prev).add(next));
            }}
            disabled={isLast}
            className="p-1 rounded-full transition-colors disabled:opacity-30"
          >
            {!isLast ? (
              <div className="w-7 h-7 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            ) : (
              <ChevronRight className="w-5 h-5" style={{ color: TEXT_PRIMARY }} />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-[#e0e0de] -mx-6 px-6">
          <button
            onClick={onBack}
            className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: TEXT_SECONDARY }}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <motion.button
            onClick={onContinue}
            disabled={!allViewed}
            className="inline-flex items-center gap-1.5 text-white font-medium rounded-full px-5 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: TEXT_PRIMARY }}
            whileHover={allViewed ? { scale: 1.02 } : {}}
            whileTap={allViewed ? { scale: 0.98 } : {}}
          >
            Continue <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </StepContainer>
  );
}

// ─── Step 5: Services ────────────────────────────────────────────────
function Step5Services({ onContinue, onBack }: { onContinue: (services: { name: string; price: string; duration: string; description: string }[]) => void; onBack: () => void }) {
  const [phase, setPhase] = useState<"choose" | "rows">("choose");
  const [services, setServices] = useState([{ name: "", price: "", duration: "", description: "" }]);
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  const isValidUrl = (s: string) => {
    try { const u = new URL(s.includes("://") ? s : `https://${s}`); return !!u.hostname.includes("."); } catch { return false; }
  };

  const handleExtract = async () => {
    if (!isValidUrl(url)) return;
    setExtracting(true);
    setExtractError("");

    try {
      const res = await fetch("/api/detailer/extract-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setExtractError(data.error || "Failed to extract services. Try again or enter manually.");
        setExtracting(false);
        return;
      }

      if (data.services && data.services.length > 0) {
        setServices(data.services);
        setPhase("rows");
      } else {
        setExtractError("No services found on this page. Try a different URL or enter manually.");
      }
    } catch {
      setExtractError("Something went wrong. Check your connection and try again.");
    }

    setExtracting(false);
  };

  const updateService = (index: number, field: string, value: string) => {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const deleteService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDuration = (mins: string) => {
    const m = parseInt(mins);
    if (!m || m <= 0) return "";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h}h ${r}m` : `${h}h`;
  };

  const addService = () => {
    setServices((prev) => [...prev, { name: "", price: "", duration: "", description: "" }]);
  };

  if (phase === "choose") {
    return (
      <ScrollStepContainer className="text-center">
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-lg font-medium mb-1.5" style={{ color: TEXT_PRIMARY }}>Your services</h2>
          <p className="text-sm font-light mb-8" style={{ color: TEXT_SECONDARY }}>
            Add your services and pricing so Carbon can estimate revenue accurately.
          </p>

          <div className="max-w-[400px] w-full">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#E5E5E5] bg-white text-sm mb-3">
              <Globe className="w-4 h-4 text-[#BFBFBF] shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setExtractError(""); }}
                placeholder="https://yoursite.com"
                className="w-full outline-none text-sm text-left placeholder:text-[#D1D5DB]"
                style={{ color: TEXT_PRIMARY }}
              />
            </div>

            <motion.button
              onClick={handleExtract}
              disabled={extracting}
              className="w-full py-2.5 text-sm font-medium rounded-full text-white disabled:opacity-40 mb-4"
              style={{ backgroundColor: ACCENT }}
              whileHover={!extracting ? { scale: 1.01 } : {}}
              whileTap={!extracting ? { scale: 0.99 } : {}}
            >
              {extracting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Scanning website...
                </span>
              ) : "Extract from website"}
            </motion.button>

            {extractError && (
              <motion.p
                className="text-xs text-red-500 mb-3 text-left"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {extractError}
              </motion.p>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-black/[0.06]" />
              <span className="text-xs" style={{ color: "#BFBFBF" }}>or</span>
              <div className="flex-1 h-px bg-black/[0.06]" />
            </div>

            <button
              onClick={() => setPhase("rows")}
              className="w-full py-2.5 text-sm font-medium rounded-full border border-[#E5E5E5] hover:border-[#BFBFBF] transition-colors"
              style={{ color: TEXT_PRIMARY }}
            >
              Enter manually
            </button>

            <button
              onClick={onBack}
              className="mt-6 text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: TEXT_SECONDARY }}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>
      </ScrollStepContainer>
    );
  }

  return (
    <ScrollStepContainer>
      <div className="flex-1">
        <h2 className="text-lg font-medium mb-1.5" style={{ color: TEXT_PRIMARY }}>Your services</h2>
        <p className="text-sm font-light mb-5" style={{ color: TEXT_SECONDARY }}>
          Confirm your services and pricing below.
        </p>

        <div className="space-y-3">
          {services.map((service, i) => (
            <div key={i} className="relative group rounded-xl border border-[#EBEBEB] bg-white p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => updateService(i, "name", e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                  className="flex-1 min-w-0 text-sm font-medium outline-none placeholder:text-[#D1D5DB]"
                  style={{ color: TEXT_PRIMARY }}
                  placeholder="Service name"
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="text-sm" style={{ color: "#BFBFBF" }}>$</span>
                  <input
                    type="text"
                    value={service.price}
                    onChange={(e) => updateService(i, "price", e.target.value.replace(/[^0-9]/g, ""))}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                    className="w-12 outline-none text-sm font-medium text-right"
                    style={{ color: TEXT_PRIMARY }}
                    placeholder="—"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3 h-3 shrink-0" style={{ color: "#BFBFBF" }} />
                <input
                  type="text"
                  value={service.duration || ""}
                  onChange={(e) => updateService(i, "duration", e.target.value.replace(/[^0-9]/g, ""))}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                  className="w-12 outline-none text-xs placeholder:text-[#D1D5DB]"
                  style={{ color: TEXT_SECONDARY }}
                  placeholder="mins"
                />
                {service.duration && (
                  <span className="text-xs" style={{ color: "#BFBFBF" }}>min {formatDuration(service.duration) ? `(${formatDuration(service.duration)})` : ""}</span>
                )}
              </div>
              <textarea
                value={service.description}
                onChange={(e) => updateService(i, "description", e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                className="w-full text-xs leading-relaxed outline-none resize-none placeholder:text-[#D1D5DB]"
                style={{ color: TEXT_SECONDARY }}
                placeholder="What's included in this service..."
                rows={2}
              />
              {services.length > 1 && (
                <button
                  onClick={() => deleteService(i)}
                  className="absolute right-1 top-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#BFBFBF" }} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addService}
          className="flex items-center gap-1 mt-3 text-xs hover:opacity-70 transition-opacity"
          style={{ color: TEXT_SECONDARY }}
        >
          <Plus className="w-3.5 h-3.5" /> Add service
        </button>

        <StepNav
          onBack={() => setPhase("choose")}
          onNext={() => onContinue(services)}
        />
      </div>
    </ScrollStepContainer>
  );
}

// ─── Time Dropdown ───────────────────────────────────────────────────
function TimeDropdown({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[#EBEBEB] bg-white hover:border-[#C8C0B8] transition-colors min-w-[110px] justify-between"
        style={{ color: TEXT_PRIMARY }}
      >
        <span>{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "#BFBFBF" }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full rounded-xl border border-[#EBEBEB] bg-white shadow-sm z-10 py-1 max-h-40 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${opt === value ? "bg-[#F7F5F3] font-medium" : "hover:bg-[#FAFAFA]"}`}
              style={{ color: opt === value ? TEXT_PRIMARY : TEXT_SECONDARY }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Preferences ─────────────────────────────────────────────
function Step6Preferences({ onContinue, onBack }: { onContinue: (prefs: { tone: string; customTone: string; upsellEnabled: boolean; mobileService: string; sendWindow: { start: string; end: string; includeWeekends: boolean } }) => void; onBack: () => void }) {
  const [tone, setTone] = useState("professional");
  const [customTone, setCustomTone] = useState("");
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [mobileService, setMobileService] = useState("yes");
  const [sendStart, setSendStart] = useState("9:00 AM");
  const [sendEnd, setSendEnd] = useState("7:00 PM");
  const [includeWeekends, setIncludeWeekends] = useState(true);

  const RadioOption = ({ value, current, onSelect, label, children }: {
    value: string; current: string; onSelect: (v: string) => void;
    label: string; children?: React.ReactNode;
  }) => (
    <label className="flex items-center gap-3 cursor-pointer" data-testid={`radio-${value}`}>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${current === value ? "border-[#FB4803]" : "border-[#D1D5DB]"}`}>
        {current === value && <div className="w-2 h-2 rounded-full bg-[#FB4803]" />}
      </div>
      <div className="flex-1">
        <span className="text-sm" style={{ color: TEXT_PRIMARY }}>{label}</span>
        {current === value && children}
      </div>
    </label>
  );

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-xl border border-[#EBEBEB] bg-white p-4">
      {children}
    </div>
  );

  return (
    <ScrollStepContainer>
      <div className="flex-1">
        <h2 className="text-lg font-medium mb-1.5" style={{ color: TEXT_PRIMARY }}>Set your preferences</h2>
        <p className="text-sm font-light mb-5" style={{ color: TEXT_SECONDARY }}>
          Control how Carbon reaches out. Change anytime in Settings.
        </p>

        <div className="space-y-3">
          <SectionCard>
            <h3 className="text-[13px] font-medium mb-3" style={{ color: TEXT_PRIMARY }}>Tone</h3>
            <div className="space-y-2.5" onClick={(e) => {
              const label = (e.target as HTMLElement).closest("[data-testid]");
              if (label) {
                const v = label.getAttribute("data-testid")?.replace("radio-", "");
                if (v && ["casual", "professional", "custom"].includes(v)) setTone(v);
              }
            }}>
              <RadioOption value="casual" current={tone} onSelect={setTone} label="Friendly and casual" />
              <RadioOption value="professional" current={tone} onSelect={setTone} label="Professional and warm" />
              <RadioOption value="custom" current={tone} onSelect={setTone} label="Match my style">
                <textarea
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  placeholder="Paste how you usually text customers"
                  className="w-full mt-2 px-3 py-2 text-sm rounded-lg border border-[#E5E5E5] outline-none resize-none h-14"
                  style={{ color: TEXT_PRIMARY }}
                />
              </RadioOption>
            </div>
          </SectionCard>

          <SectionCard>
            <h3 className="text-[13px] font-medium mb-3" style={{ color: TEXT_PRIMARY }}>Upselling</h3>
            <div className="space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setUpsellEnabled(true)}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${upsellEnabled ? "border-[#FB4803]" : "border-[#D1D5DB]"}`}>
                  {upsellEnabled && <div className="w-2 h-2 rounded-full bg-[#FB4803]" />}
                </div>
                <span className="text-sm" style={{ color: TEXT_PRIMARY }}>Yes, suggest upgrades</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer" onClick={() => setUpsellEnabled(false)}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!upsellEnabled ? "border-[#FB4803]" : "border-[#D1D5DB]"}`}>
                  {!upsellEnabled && <div className="w-2 h-2 rounded-full bg-[#FB4803]" />}
                </div>
                <span className="text-sm" style={{ color: TEXT_PRIMARY }}>No, same service only</span>
              </label>
            </div>
          </SectionCard>

          <SectionCard>
            <h3 className="text-[13px] font-medium mb-3" style={{ color: TEXT_PRIMARY }}>Mobile service</h3>
            <div className="space-y-2.5" onClick={(e) => {
              const label = (e.target as HTMLElement).closest("[data-testid]");
              if (label) {
                const v = label.getAttribute("data-testid")?.replace("radio-", "");
                if (v && ["mobile-yes", "mobile-no", "mobile-hide"].includes(v)) setMobileService(v.replace("mobile-", ""));
              }
            }}>
              <RadioOption value="yes" current={mobileService} onSelect={setMobileService} label="Offer mobile as an option" />
              <RadioOption value="no" current={mobileService} onSelect={setMobileService} label="Keep same location" />
              <RadioOption value="hide" current={mobileService} onSelect={setMobileService} label="We don't offer mobile" />
            </div>
          </SectionCard>

          <SectionCard>
            <h3 className="text-[13px] font-medium mb-3" style={{ color: TEXT_PRIMARY }}>Send window (Weekdays)</h3>
            <div className="flex items-center gap-3">
              <TimeDropdown
                value={sendStart}
                onChange={setSendStart}
                options={["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM"]}
              />
              <span className="text-xs" style={{ color: TEXT_SECONDARY }}>to</span>
              <TimeDropdown
                value={sendEnd}
                onChange={setSendEnd}
                options={["5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"]}
              />
            </div>
            <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
              <button
                onClick={() => setIncludeWeekends((v) => !v)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${includeWeekends ? "border-[#1A1A1A] bg-[#1A1A1A]" : "border-[#D1D5DB]"}`}
              >
                {includeWeekends && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className="text-sm" style={{ color: TEXT_PRIMARY }}>Include weekends</span>
            </label>
          </SectionCard>
        </div>

        <StepNav onBack={onBack} onNext={() => onContinue({ tone, customTone, upsellEnabled, mobileService, sendWindow: { start: sendStart, end: sendEnd, includeWeekends } })} />
      </div>
    </ScrollStepContainer>
  );
}

// ─── Step 7: Offers ──────────────────────────────────────────────────
function Step7Offers({ onContinue, onBack }: { onContinue: (offers: { mode: "ai" | "custom" | "none"; maxDiscount: string; customOffers: { description: string }[] }) => void; onBack: () => void }) {
  const [mode, setMode] = useState<"ai" | "custom" | "none">("ai");
  const [maxDiscount, setMaxDiscount] = useState("10");
  const [customOffers, setCustomOffers] = useState([{ description: "" }]);

  const addOffer = () => setCustomOffers((prev) => [...prev, { description: "" }]);
  const removeOffer = (i: number) => setCustomOffers((prev) => prev.filter((_, j) => j !== i));
  const updateOffer = (i: number, value: string) =>
    setCustomOffers((prev) => prev.map((o, j) => j === i ? { ...o, description: value } : o));

  return (
    <ScrollStepContainer>
      <div className="flex-1">
        <h2 className="text-lg font-medium mb-1.5" style={{ color: TEXT_PRIMARY }}>Offers</h2>
        <p className="text-sm font-light mb-5" style={{ color: TEXT_SECONDARY }}>
          Choose how you&apos;d like to handle discounts and promotions.
        </p>

        <div className="space-y-3">
          {/* AI option */}
          <div
            onClick={() => setMode("ai")}
            className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${mode === "ai" ? "border-[#D5CEC7] bg-white" : "border-[#EBEBEB] bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === "ai" ? "border-[#FB4803]" : "border-[#D1D5DB]"}`}>
                {mode === "ai" && <div className="w-2 h-2 rounded-full bg-[#FB4803]" />}
              </div>
              <div className="flex-1">
                <span className="text-sm" style={{ color: TEXT_PRIMARY }}>Let AI create offers</span>
                <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>Carbon will generate personalized offers for each customer.</p>
                {mode === "ai" && (
                  <div className="mt-3 pt-3 border-t border-[#E5E0DB]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px]" style={{ color: TEXT_PRIMARY }}>Max discount</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={maxDiscount}
                          onChange={(e) => setMaxDiscount(e.target.value.replace(/[^0-9]/g, ""))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-14 px-2 py-1 text-sm rounded-lg border border-[#E5E5E5] outline-none text-center bg-white"
                          style={{ color: TEXT_PRIMARY }}
                        />
                        <span className="text-sm" style={{ color: TEXT_SECONDARY }}>%</span>
                      </div>
                    </div>
                    <p className="text-[11px] mt-2" style={{ color: "#AFAFAF" }}>
                      AI will only use discounts when it&apos;s likely to win back a customer, and will never exceed this limit.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom option */}
          <div
            onClick={() => setMode("custom")}
            className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${mode === "custom" ? "border-[#D5CEC7] bg-white" : "border-[#EBEBEB] bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === "custom" ? "border-[#FB4803]" : "border-[#D1D5DB]"}`}>
                {mode === "custom" && <div className="w-2 h-2 rounded-full bg-[#FB4803]" />}
              </div>
              <div className="flex-1">
                <span className="text-sm" style={{ color: TEXT_PRIMARY }}>My own offers</span>
                <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>Create your own offers and Carbon will include them when relevant.</p>
                {mode === "custom" && (
                  <div className="mt-3 pt-3 border-t border-[#E5E0DB]" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2.5">
                      {customOffers.map((offer, i) => (
                        <div key={i} className="relative">
                          <div className="flex items-start gap-2">
                            <textarea
                              value={offer.description}
                              onChange={(e) => updateOffer(i, e.target.value)}
                              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300)}
                              placeholder={'e.g. "15% off any full detail for customers who haven\'t visited in 6+ months"'}
                              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-[#E5E5E5] outline-none bg-white resize-none leading-relaxed"
                              style={{ color: TEXT_PRIMARY }}
                              rows={2}
                            />
                            <button
                              onClick={() => removeOffer(i)}
                              className="p-1 mt-1.5 hover:bg-black/5 rounded shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#BFBFBF" }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addOffer}
                      className="flex items-center gap-1 mt-3 text-xs hover:opacity-70 transition-opacity"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add offer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* No offers option */}
          <div
            onClick={() => setMode("none")}
            className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${mode === "none" ? "border-[#D5CEC7] bg-white" : "border-[#EBEBEB] bg-white"}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${mode === "none" ? "border-[#FB4803]" : "border-[#D1D5DB]"}`}>
                {mode === "none" && <div className="w-2 h-2 rounded-full bg-[#FB4803]" />}
              </div>
              <div className="flex-1">
                <span className="text-sm" style={{ color: TEXT_PRIMARY }}>No discounts/offers</span>
                <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>Messages will focus on service quality without discounts.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <StepNav onBack={onBack} onNext={() => onContinue({ mode, maxDiscount, customOffers })} />
        </div>
      </div>
    </ScrollStepContainer>
  );
}

// ─── Step 8: Review Outreach ─────────────────────────────────────────
function Step8ReviewBatch({ customerCount, onApprove, onBack }: { customerCount: number; onApprove: (messages: { name: string; message: string; status: string }[]) => void; onBack: () => void }) {
  const [messages, setMessages] = useState(
    REVIEW_MESSAGES.map((m) => ({ ...m, status: "pending" as "pending" | "approved" | "skipped", editing: false, editText: m.message }))
  );

  const updateMessage = (index: number, updates: Partial<(typeof messages)[0]>) => {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  };

  const confidenceColor = (c: string) => c === "high" ? "#22c55e" : c === "medium" ? "#eab308" : "#f97316";

  return (
    <ScrollStepContainer>
      <div className="flex-1">
        <h2 className="text-lg font-medium mb-1.5" style={{ color: TEXT_PRIMARY }}>Review your first outreach</h2>
        <p className="text-sm font-light mb-5" style={{ color: TEXT_SECONDARY }}>
          Here are the first 3 of {customerCount.toLocaleString()} messages Carbon will send.
        </p>

        <div className="space-y-2.5">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 transition-colors ${msg.status === "approved" ? "border-l-[3px] border-l-[#22c55e] border-t border-r border-b border-black/[0.04] bg-[#f8fdf8]" : msg.status === "skipped" ? "opacity-35 border-black/[0.04]" : "border-black/[0.04]"}`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{msg.name}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: confidenceColor(msg.confidence) }} />
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: TEXT_SECONDARY }}>
                    {msg.vehicles} &middot; {msg.location}
                  </p>
                </div>
              </div>

              {msg.editing ? (
                <div className="mt-2">
                  <textarea
                    value={msg.editText}
                    onChange={(e) => updateMessage(i, { editText: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-lg border border-[#E5E5E5] outline-none resize-none h-20"
                    style={{ color: TEXT_PRIMARY }}
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => updateMessage(i, { message: msg.editText, editing: false })}
                      className="px-3 py-1 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: ACCENT }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => updateMessage(i, { editing: false, editText: msg.message })}
                      className="px-3 py-1 text-xs rounded-full"
                      style={{ color: TEXT_SECONDARY }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: TEXT_PRIMARY }}>
                  &ldquo;{msg.message}&rdquo;
                </p>
              )}

              {msg.status === "pending" && !msg.editing && (
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-black/[0.04]">
                  <button
                    onClick={() => updateMessage(i, { editing: true })}
                    className="text-xs flex items-center gap-1 hover:opacity-70"
                    style={{ color: TEXT_SECONDARY }}
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => updateMessage(i, { status: "skipped" })}
                    className="text-xs px-2 py-1 rounded-full hover:bg-black/5"
                    style={{ color: TEXT_SECONDARY }}
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-center mt-4 pb-2" style={{ color: TEXT_SECONDARY }}>
          Messages will be spaced throughout the next {customerCount <= 50 ? "24 hours" : customerCount <= 200 ? "48 hours" : "72 hours"}.
        </p>

        <StepNav
          onBack={onBack}
          onNext={() => onApprove(messages.map((m) => ({ name: m.name, message: m.message, status: m.status })))}
          nextLabel="Approve"
          hideChevron
          nextColor={ACCENT}
        />
      </div>
    </ScrollStepContainer>
  );
}

// ─── Step 9: iPhone-style "hello" welcome animation ──────────────────
function Step9Welcome({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<"logo" | "text" | "fade">("logo");

  useEffect(() => {
    const textTimer = setTimeout(() => setPhase("text"), 1800);
    const fadeTimer = setTimeout(() => setPhase("fade"), 4000);
    const finishTimer = setTimeout(onFinish, 4800);
    return () => { clearTimeout(textTimer); clearTimeout(fadeTimer); clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <motion.div
        className="text-center flex flex-col items-center"
        animate={{
          opacity: phase === "fade" ? 0 : 1,
          scale: phase === "fade" ? 0.95 : 1,
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Spinning logo */}
        <motion.img
          src="/REEVA%20LOGO.png"
          alt="Reeva"
          className="w-24 h-24 md:w-32 md:h-32 mb-8"
          initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
          animate={{
            opacity: phase === "logo" ? 1 : phase === "text" ? 1 : 0,
            scale: phase === "logo" ? 1 : phase === "text" ? 0.85 : 0.7,
            rotate: 0,
          }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { type: "spring", stiffness: 100, damping: 12 },
            rotate: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
          }}
        />

        {/* Welcome text */}
        <motion.h1
          className="font-extralight tracking-tight"
          style={{
            fontSize: "clamp(48px, 12vw, 96px)",
            color: TEXT_PRIMARY,
            lineHeight: 1.1,
          }}
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{
            opacity: phase === "text" || phase === "fade" ? 1 : 0,
            y: phase === "text" || phase === "fade" ? 0 : 30,
            scale: phase === "text" || phase === "fade" ? 1 : 0.9,
          }}
          transition={{
            type: "spring",
            stiffness: 120,
            damping: 14,
          }}
        >
          Welcome to Carbon
        </motion.h1>
        <motion.p
          className="text-sm font-light mt-4"
          style={{ color: TEXT_SECONDARY }}
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: phase === "text" ? 1 : 0,
            y: phase === "text" ? 0 : 10,
          }}
          transition={{ duration: 0.5 }}
        >
          Let&apos;s grow your business.
        </motion.p>
      </motion.div>
    </div>
  );
}

// ─── Main Overlay ────────────────────────────────────────────────────
export default function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [analytics, setAnalytics] = useState<OnboardingAnalytics | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lifted survey state
  const surveyServicesRef = useRef<{ name: string; price: string; duration: string; description: string }[]>([]);
  const surveyPreferencesRef = useRef<{ tone: string; customTone: string; upsellEnabled: boolean; mobileService: string; sendWindow: { start: string; end: string; includeWeekends: boolean } } | null>(null);
  const surveyOffersRef = useRef<{ mode: "ai" | "custom" | "none"; maxDiscount: string; customOffers: { description: string }[] } | null>(null);

  const goTo = useCallback((s: number) => {
    setStep(s);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 0 }), 50);
  }, []);

  const [overlayFading, setOverlayFading] = useState(false);

  const saveSurveyData = useCallback(async (messages: { name: string; message: string; status: string }[]) => {
    try {
      await fetch("/api/detailer/onboarding/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: surveyServicesRef.current,
          preferences: surveyPreferencesRef.current,
          offers: surveyOffersRef.current,
          messages,
        }),
      });
    } catch (err) {
      console.error("Failed to save survey data:", err);
    }
  }, []);

  const handleFinish = useCallback(() => {
    fetch("/api/detailer/onboarding", { method: "POST" }).catch(() => {});
    setOverlayFading(true);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[90] md:left-16"
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        opacity: overlayFading ? 0 : 1,
        transition: "opacity 600ms ease-out",
        pointerEvents: overlayFading ? "none" : "auto",
      }}
    >
      {step > 0 && step < 9 && <ProgressBar step={step} />}

      {step !== 2 && step !== 9 && (
        <button
          onClick={() => {
            fetch("/api/detailer/onboarding", { method: "POST" }).catch(() => {});
            setOverlayFading(true);
            setTimeout(onComplete, 600);
          }}
          className="fixed top-4 right-4 z-[120] p-2 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Close onboarding"
        >
          <X className="w-5 h-5" style={{ color: TEXT_SECONDARY }} />
        </button>
      )}

      {step !== 0 && step !== 9 && (
        <div
          className="fixed inset-0 md:left-16 z-[95] transition-opacity duration-500"
          style={{
            backgroundColor: step === 3 || step === 4 ? "#F5F5F4" : "#FFFFFF",
          }}
        />
      )}

      <div
        ref={scrollRef}
        className={`fixed inset-0 md:left-16 z-[100] flex ${step >= 5 && step <= 8 ? "items-start pt-10" : "items-center"} justify-center overflow-y-auto overflow-x-hidden py-8 md:py-12`}
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Step0Welcome key="step0" onStart={() => goTo(1)} />
          )}
          {step === 1 && (
            <Step1Upload
              key="step1"
              onAnalyze={(count) => {
                setCustomerCount(count);
                goTo(2);
              }}
            />
          )}
          {step === 2 && (
            <Step2Analyzing key="step2" customerCount={customerCount} onComplete={(a) => { setAnalytics(a); goTo(3); }} />
          )}
          {step === 3 && analytics && (
            <Step3Summary key="step3" analytics={analytics} onViewInsights={() => goTo(4)} />
          )}
          {step === 4 && analytics && (
            <Step4Insights key="step4" analytics={analytics} onContinue={() => goTo(5)} onBack={() => goTo(3)} />
          )}
          {step === 5 && (
            <Step5Services key="step5" onContinue={(services) => { surveyServicesRef.current = services; goTo(6); }} onBack={() => goTo(4)} />
          )}
          {step === 6 && (
            <Step6Preferences key="step6" onContinue={(prefs) => { surveyPreferencesRef.current = prefs; goTo(7); }} onBack={() => goTo(5)} />
          )}
          {step === 7 && (
            <Step7Offers key="step7" onContinue={(offers) => { surveyOffersRef.current = offers; goTo(8); }} onBack={() => goTo(6)} />
          )}
          {step === 8 && (
            <Step8ReviewBatch key="step8" customerCount={analytics?.totalCustomers ?? customerCount} onApprove={(messages) => { saveSurveyData(messages); goTo(9); }} onBack={() => goTo(7)} />
          )}
          {step === 9 && (
            <Step9Welcome key="step9" onFinish={handleFinish} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
