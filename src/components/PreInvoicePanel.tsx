import React, { useState } from "react";
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  MessageSquare,
  Mail,
  Phone,
  Wrench,
  Package,
  DollarSign,
  Calculator,
  Hash,
} from "lucide-react";
import FunnySpinner from "./FunnySpinner";
import { User } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface InvoiceLineItem {
  description: string;
  qty:         number;
  unitPrice:   number;
  amount:      number;
  category:    "labour" | "parts" | "other";
}

interface InvoiceData {
  lineItems:    InvoiceLineItem[];
  subtotal:     number;
  taxRate?:     number;   // default 0.18
  taxAmount?:   number;
  grandTotal:   number;
  invoiceNo?:   string;
}

interface PreInvoicePanelProps {
  jcId:          number;
  customerMobile: string;
  invoiceData:   InvoiceData;
  currentUser?:  User;
  onSuccess?:    () => void;
}

type SendVia = "WhatsApp" | "Email" | "SMS" | "Verbal";

const SEND_CHANNELS: { value: SendVia; label: string; icon: React.ReactNode }[] = [
  { value: "WhatsApp", label: "WhatsApp", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { value: "Email",    label: "Email",    icon: <Mail           className="h-3.5 w-3.5" /> },
  { value: "SMS",      label: "SMS",      icon: <MessageSquare  className="h-3.5 w-3.5" /> },
  { value: "Verbal",   label: "Verbal",   icon: <Phone          className="h-3.5 w-3.5" /> },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  labour: <Wrench    className="h-3 w-3 text-blue-400"   />,
  parts:  <Package   className="h-3 w-3 text-violet-400" />,
  other:  <DollarSign className="h-3 w-3 text-slate-400" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PreInvoicePanel({
  jcId,
  customerMobile,
  invoiceData,
  currentUser,
  onSuccess,
}: PreInvoicePanelProps) {
  const userRole  = currentUser?.role ?? "";
  const isAdvisor = ["service_advisor", "advisor", "admin", "developer"].includes(userRole);

  const [sentTo,   setSentTo]   = useState(customerMobile);
  const [sentVia,  setSentVia]  = useState<SendVia>("WhatsApp");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [sent,     setSent]     = useState(false);

  // ── Role guard ─────────────────────────────────────────────────────────────
  if (!isAdvisor) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-slate-500 text-sm">
        <ShieldAlert className="h-5 w-5 text-slate-600" />
        <span>Pre-invoice is restricted to Service Advisors.</span>
      </div>
    );
  }

  const tax       = invoiceData.taxAmount ?? invoiceData.subtotal * (invoiceData.taxRate ?? 0.18);
  const taxRate   = invoiceData.taxRate ?? 0.18;
  const invoiceNo = invoiceData.invoiceNo ?? `PRE-${jcId}-${Date.now().toString(36).toUpperCase()}`;

  const handleSend = async () => {
    if (!sentTo.trim() || !invoiceNo) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/job-cards/${jcId}/pre-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent_to:    sentTo.trim(),
          sent_via:   sentVia,
          invoice_no: invoiceNo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setSent(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Confirmation state ─────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="p-5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-center gap-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="font-bold text-sm text-emerald-300">Pre-Invoice Sent!</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Sent to <span className="font-semibold text-slate-300">{sentTo}</span> via{" "}
            <span className="font-semibold text-slate-300">{sentVia}</span>
          </p>
          <p className="text-slate-500 text-[11px] mt-0.5">Invoice ref: {invoiceNo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-500/10 rounded-lg">
          <FileText className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Pre-Invoice</h3>
          <p className="text-[11px] text-slate-500">JC #{jcId} — Send invoice to customer for review</p>
        </div>
      </div>

      {/* Invoice breakdown (read-only) */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
        {/* Invoice header */}
        <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice Breakdown</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">
            {invoiceNo}
          </span>
        </div>

        {/* Line items */}
        <div className="divide-y divide-slate-700/30">
          {invoiceData.lineItems.map((item, i) => (
            <div key={i} className="flex items-center px-4 py-2.5 gap-3">
              <span className="flex-shrink-0">{CATEGORY_ICONS[item.category]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{item.description}</p>
                <p className="text-[10px] text-slate-600">
                  {item.qty} × ₹{item.unitPrice.toLocaleString("en-IN")}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-300 flex-shrink-0">
                ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-slate-700/50 divide-y divide-slate-700/20">
          <div className="flex justify-between px-4 py-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calculator className="h-3 w-3" /> Subtotal
            </span>
            <span className="text-slate-300 font-semibold">
              ₹{invoiceData.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between px-4 py-2 text-xs">
            <span className="text-slate-400">GST ({(taxRate * 100).toFixed(0)}%)</span>
            <span className="text-amber-400 font-semibold">
              ₹{tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between px-4 py-3 bg-slate-800/40">
            <span className="text-sm font-bold text-white">Grand Total</span>
            <span className="text-sm font-black text-emerald-400">
              ₹{invoiceData.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Recipient input */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Send To
        </label>
        <input
          type="text"
          value={sentTo}
          onChange={(e) => setSentTo(e.target.value)}
          placeholder="Mobile / Email"
          className="w-full bg-slate-900/60 border border-slate-700/50 focus:border-blue-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
        />
      </div>

      {/* Channel selector */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Send Via
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SEND_CHANNELS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setSentVia(value)}
              className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg border text-[11px] font-semibold transition-all ${
                sentVia === value
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-300"
                  : "bg-slate-800/60  border-slate-700/40  text-slate-400 hover:border-slate-600"
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

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={loading || !sentTo.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-orange-500/15 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? <><FunnySpinner className="h-4 w-4" /> Sending…</>
          : <><Send className="h-4 w-4" /> Send Pre-Invoice</>
        }
      </button>
    </div>
  );
}
