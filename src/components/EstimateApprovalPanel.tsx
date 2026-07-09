import React, { useState } from "react";
import {
  DollarSign,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Clock,
  ChevronDown,
  Send,
  Wrench,
  Package,
  Calculator,
  ShieldAlert,
} from "lucide-react";
import FunnySpinner from "./FunnySpinner";
import { User } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface EstimateApprovalPanelProps {
  jcId: number;
  estimateAmount: number;
  labourTotal: number;
  partsTotal: number;
  currentUser?: User;
  onSuccess?: (status: "approved" | "rejected") => void;
  currentApprovalStatus?: string | null;
}

type Channel = "WhatsApp" | "Email" | "Verbal" | "SMS";

const CHANNELS: { value: Channel; label: string; icon: React.ReactNode }[] = [
  { value: "WhatsApp", label: "WhatsApp", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { value: "Email",    label: "Email",    icon: <Mail           className="h-3.5 w-3.5" /> },
  { value: "Verbal",   label: "Verbal",   icon: <Phone          className="h-3.5 w-3.5" /> },
  { value: "SMS",      label: "SMS",      icon: <MessageSquare  className="h-3.5 w-3.5" /> },
];

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  rejected: "bg-rose-500/10    text-rose-400    border-rose-500/30",
  pending:  "bg-amber-500/10   text-amber-400   border-amber-500/30",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EstimateApprovalPanel({
  jcId,
  estimateAmount,
  labourTotal,
  partsTotal,
  currentUser,
  onSuccess,
  currentApprovalStatus,
}: EstimateApprovalPanelProps) {
  const userRole = currentUser?.role ?? "";
  const isAdvisor = ["service_advisor", "advisor", "admin", "developer"].includes(userRole);

  const [channel, setChannel]   = useState<Channel>("WhatsApp");
  const [loading, setLoading]   = useState<"approve" | "reject" | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<"approved" | "rejected" | null>(null);

  // ── Role guard ─────────────────────────────────────────────────────────────
  if (!isAdvisor) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-500 text-sm">
        <ShieldAlert className="h-5 w-5 text-slate-600" />
        <span>Estimate approval is restricted to Service Advisors.</span>
      </div>
    );
  }

  const tax        = estimateAmount * 0.18;
  const grandTotal = estimateAmount + tax;
  const otherTotal = estimateAmount - labourTotal - partsTotal;

  const breakdownRows = [
    { label: "Labour",     amount: labourTotal,   icon: <Wrench    className="h-3.5 w-3.5 text-blue-400"   />, color: "text-blue-300" },
    { label: "Parts",      amount: partsTotal,    icon: <Package   className="h-3.5 w-3.5 text-violet-400" />, color: "text-violet-300" },
    { label: "Other",      amount: otherTotal,    icon: <DollarSign className="h-3.5 w-3.5 text-slate-400" />, color: "text-slate-300" },
    { label: "Subtotal",   amount: estimateAmount, icon: <Calculator className="h-3.5 w-3.5 text-slate-400" />, color: "text-slate-200", separator: true },
    { label: "GST (18%)",  amount: tax,            icon: null,                                                   color: "text-amber-300" },
    { label: "Grand Total",amount: grandTotal,     icon: null,                                                   color: "text-emerald-400", bold: true },
  ];

  const submit = async (status: "approved" | "rejected") => {
    setError(null);
    setLoading(status === "approved" ? "approve" : "reject");
    try {
      const res = await fetch(`/api/job-cards/${jcId}/estimate-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          approved_by: currentUser?.full_name ?? currentUser?.username ?? "Unknown",
          channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSubmitted(status);
      onSuccess?.(status);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (submitted) {
    const isApproved = submitted === "approved";
    return (
      <div className={`p-5 rounded-xl border text-sm flex items-center gap-4 ${
        isApproved
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-rose-500/5 border-rose-500/20"
      }`}>
        {isApproved
          ? <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
          : <XCircle      className="h-8 w-8 text-rose-400    flex-shrink-0" />
        }
        <div>
          <p className={`font-bold ${isApproved ? "text-emerald-300" : "text-rose-300"}`}>
            Estimate {isApproved ? "Approved" : "Rejected"}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">
            Sent via <span className="font-semibold text-slate-300">{channel}</span> by{" "}
            <span className="font-semibold text-slate-300">
              {currentUser?.full_name ?? "you"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + current status badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg">
            <BadgeCheck className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Estimate Approval</h3>
            <p className="text-[11px] text-slate-500">JC #{jcId} — Review and confirm with customer</p>
          </div>
        </div>
        {currentApprovalStatus && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            STATUS_STYLES[currentApprovalStatus] ?? STATUS_STYLES.pending
          }`}>
            {currentApprovalStatus}
          </span>
        )}
        {!currentApprovalStatus && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_STYLES.pending}`}>
            <Clock className="inline h-3 w-3 mr-1" />Awaiting
          </span>
        )}
      </div>

      {/* Cost Breakdown Table */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-700/40 flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cost Breakdown</span>
        </div>
        <table className="w-full">
          <tbody>
            {breakdownRows.map((row, i) => (
              <React.Fragment key={row.label}>
                {row.separator && <tr><td colSpan={2} className="border-t border-slate-700/60" /></tr>}
                <tr className={`${row.bold ? "bg-slate-800/40" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {row.icon}
                      {row.label}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-right text-xs font-${row.bold ? "black" : "semibold"} ${row.color}`}>
                    ₹{row.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Channel selector */}
      <div>
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" />
          Communication Channel
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CHANNELS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setChannel(value)}
              className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                channel === value
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                  : "bg-slate-800/60 border-slate-700/40 text-slate-400 hover:border-slate-600"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg text-xs text-rose-400">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => submit("rejected")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-sm font-bold transition-all disabled:opacity-50"
        >
          {loading === "reject"
            ? <FunnySpinner className="h-4 w-4" />
            : <XCircle className="h-4 w-4" />
          }
          Reject
        </button>
        <button
          onClick={() => submit("approved")}
          disabled={!!loading}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 text-sm font-bold transition-all disabled:opacity-50"
        >
          {loading === "approve"
            ? <FunnySpinner className="h-4 w-4" />
            : <CheckCircle2 className="h-4 w-4" />
          }
          Approve
        </button>
      </div>
    </div>
  );
}
