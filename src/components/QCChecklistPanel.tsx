import React, { useState } from "react";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import FunnySpinner from "./FunnySpinner";
import { User } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ItemStatus = "pass" | "fail" | "na" | null;

interface ChecklistItem {
  id: number;
  label: string;
  status: ItemStatus;
}

interface QCChecklistPanelProps {
  jcId: number;
  supervisorId?: number;
  currentUser?: User;
  onSuccess?: (qcStatus: "passed" | "failed") => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial checklist items
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ITEMS: Omit<ChecklistItem, "status">[] = [
  { id: 1, label: "Work completed as per JC description" },
  { id: 2, label: "Test drive completed" },
  { id: 3, label: "No abnormal noise or vibration" },
  { id: 4, label: "Vehicle interior/exterior cleaned" },
  { id: 5, label: "All tools and parts accounted for" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function deriveOverallStatus(items: ChecklistItem[]): "passed" | "failed" | "incomplete" {
  const allAnswered = items.every((i) => i.status !== null);
  if (!allAnswered) return "incomplete";
  return items.some((i) => i.status === "fail") ? "failed" : "passed";
}

const TOGGLE_OPTIONS: { value: ItemStatus; label: string; icon: React.ReactNode; style: string }[] = [
  {
    value: "pass",
    label: "Pass",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    style: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
  },
  {
    value: "fail",
    label: "Fail",
    icon: <XCircle className="h-3.5 w-3.5" />,
    style: "bg-rose-500/15 border-rose-500/40 text-rose-400",
  },
  {
    value: "na",
    label: "N/A",
    icon: <MinusCircle className="h-3.5 w-3.5" />,
    style: "bg-slate-600/30 border-slate-500/40 text-slate-400",
  },
];

function statusBadgeStyle(s: "passed" | "failed" | "incomplete") {
  if (s === "passed")    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (s === "failed")    return "bg-rose-500/10    text-rose-400    border-rose-500/30";
  return                        "bg-amber-500/10   text-amber-400   border-amber-500/30";
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function QCChecklistPanel({
  jcId,
  supervisorId,
  currentUser,
  onSuccess,
}: QCChecklistPanelProps) {
  const userRole = currentUser?.role ?? "";
  const isSupervisor = ["supervisor", "workshop_manager", "service_manager", "admin", "developer"].includes(userRole);

  const [items, setItems] = useState<ChecklistItem[]>(
    DEFAULT_ITEMS.map((item) => ({ ...item, status: null }))
  );
  const [remarks, setRemarks]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<"passed" | "failed" | null>(null);

  // ── Role guard ─────────────────────────────────────────────────────────────
  if (!isSupervisor) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-500 text-sm">
        <ShieldAlert className="h-5 w-5 text-slate-600" />
        <span>QC Checklist is restricted to Floor Supervisors.</span>
      </div>
    );
  }

  const setItemStatus = (id: number, status: ItemStatus) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  const overallStatus  = deriveOverallStatus(items);
  const hasFailedItem  = items.some((i) => i.status === "fail");
  const allAnswered    = items.every((i) => i.status !== null);
  const canSubmit      = allAnswered && (!hasFailedItem || remarks.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const checklist = items.map((item) => ({
        id:     item.id,
        label:  item.label,
        status: item.status,
      }));
      const res = await fetch(`/api/job-cards/${jcId}/qc-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qc_status:   overallStatus === "passed" ? "passed" : "failed",
          checked_by:  currentUser?.full_name ?? currentUser?.username ?? "Unknown",
          fail_reason: hasFailedItem ? remarks : undefined,
          checklist,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const result = overallStatus === "passed" ? "passed" : "failed";
      setSubmitted(result);
      onSuccess?.(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    const passed = submitted === "passed";
    return (
      <div className={`p-5 rounded-xl border flex items-center gap-4 ${
        passed
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-rose-500/5 border-rose-500/20"
      }`}>
        {passed
          ? <ShieldCheck className="h-8 w-8 text-emerald-400 flex-shrink-0" />
          : <AlertTriangle className="h-8 w-8 text-rose-400   flex-shrink-0" />
        }
        <div>
          <p className={`font-bold text-sm ${passed ? "text-emerald-300" : "text-rose-300"}`}>
            QC {passed ? "Passed" : "Failed"}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            Checked by <span className="font-semibold text-slate-300">
              {currentUser?.full_name ?? "you"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 rounded-lg">
            <ClipboardCheck className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">QC Checklist</h3>
            <p className="text-[11px] text-slate-500">JC #{jcId} — Supervisor quality inspection</p>
          </div>
        </div>
        {allAnswered && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusBadgeStyle(overallStatus)}`}>
            {overallStatus === "incomplete" ? "In Progress" : overallStatus}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
          <span>Checklist Progress</span>
          <span>{items.filter((i) => i.status !== null).length}/{items.length} items</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              hasFailedItem ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{ width: `${(items.filter((i) => i.status !== null).length / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-all ${
              item.status === "pass"
                ? "bg-emerald-500/5  border-emerald-500/15"
                : item.status === "fail"
                ? "bg-rose-500/5     border-rose-500/15"
                : item.status === "na"
                ? "bg-slate-800/30   border-slate-700/30"
                : "bg-slate-800/60   border-slate-700/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-slate-700/60 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {item.id}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">{item.label}</p>
              </div>
              {/* Pass / Fail / NA toggle buttons */}
              <div className="flex gap-1.5 flex-shrink-0">
                {TOGGLE_OPTIONS.map(({ value, label, icon, style }) => (
                  <button
                    key={value}
                    onClick={() => setItemStatus(item.id, item.status === value ? null : value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                      item.status === value
                        ? style
                        : "bg-slate-800 border-slate-700/40 text-slate-500 hover:border-slate-600"
                    }`}
                  >
                    {icon}
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Remarks — required if any item failed */}
      {hasFailedItem && (
        <div
          className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2"
          role="alert"
        >
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
            <AlertTriangle className="h-4 w-4" />
            One or more items failed — remarks required
          </div>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Describe the issue(s) found..."
            className="w-full bg-slate-900/60 border border-rose-500/20 focus:border-rose-500/50 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none resize-none transition-colors"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg text-xs text-rose-400">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
          canSubmit && !loading
            ? overallStatus === "passed"
              ? "bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400"
              : "bg-rose-600/20    hover:bg-rose-600/30    border border-rose-500/30    text-rose-400"
            : "bg-slate-800/50 border border-slate-700/30 text-slate-600 cursor-not-allowed"
        }`}
      >
        {loading
          ? <><FunnySpinner className="h-4 w-4" /> Submitting…</>
          : <><Send className="h-4 w-4" />
              Submit QC — {!allAnswered ? "Answer all items" : overallStatus === "passed" ? "Passed" : "Failed"}
            </>
        }
      </button>

      {!canSubmit && hasFailedItem && remarks.trim().length === 0 && (
        <p className="text-center text-[11px] text-rose-400/70">Add remarks for failed items before submitting.</p>
      )}
    </div>
  );
}
