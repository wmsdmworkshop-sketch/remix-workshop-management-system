import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  X,
  BellRing,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import FunnySpinner from "./FunnySpinner";
import { User } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface EscalationRecord {
  escalation_id:    number;
  jc_id:            number;
  job_card_no:      string;
  vrn:              string;
  customer_name:    string;
  job_status:       string;
  escalation_level: 1 | 2 | 3;
  escalated_to:     string;
  notes:            string | null;
  resolved:         boolean;
  acknowledged_by:  string | null;
  acknowledged_at:  string | null;
  escalated_at:     string;
}

interface ETDEscalationBannerProps {
  currentUser?: User;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 60_000; // 60 seconds

const LEVEL_CONFIG: Record<
  number,
  { label: string; style: string; barColor: string; dotColor: string }
> = {
  1: {
    label:    "L1 — Supervisor",
    style:    "bg-amber-500/10  border-amber-500/30  text-amber-400",
    barColor: "bg-amber-500",
    dotColor: "bg-amber-400",
  },
  2: {
    label:    "L2 — GM",
    style:    "bg-orange-500/10 border-orange-500/30 text-orange-400",
    barColor: "bg-orange-500",
    dotColor: "bg-orange-400",
  },
  3: {
    label:    "L3 — Auto ETD",
    style:    "bg-rose-500/10   border-rose-500/30   text-rose-400",
    barColor: "bg-rose-500",
    dotColor: "bg-rose-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function elapsedLabel(escalatedAt: string): string {
  const diffMs   = Date.now() - new Date(escalatedAt).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60)  return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)   return `${diffHrs}h ${diffMins % 60}m ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ETDEscalationBanner({ currentUser }: ETDEscalationBannerProps) {
  const userRole   = currentUser?.role ?? "";
  const canView    = ["gm", "manager", "workshop_manager", "service_manager", "admin", "developer"].includes(userRole);

  const [escalations, setEscalations]       = useState<EscalationRecord[]>([]);
  const [expanded,    setExpanded]          = useState(false);
  const [loading,     setLoading]           = useState(false);
  const [ackLoading,  setAckLoading]        = useState<number | null>(null);
  const [error,       setError]             = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchEscalations = useCallback(async () => {
    if (!canView) return;
    try {
      setLoading(true);
      const res  = await fetch("/api/etd-escalations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch escalations");
      setEscalations(Array.isArray(data.data) ? data.data : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchEscalations();
    intervalRef.current = setInterval(fetchEscalations, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEscalations]);

  // ── Acknowledge ────────────────────────────────────────────────────────────
  const acknowledge = async (escalationId: number) => {
    setAckLoading(escalationId);
    try {
      const res = await fetch(`/api/etd-escalations/${escalationId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acknowledged_by: currentUser?.full_name ?? currentUser?.username ?? "Unknown",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Acknowledge failed");
      // Optimistically remove from list
      setEscalations((prev) => prev.filter((e) => e.escalation_id !== escalationId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAckLoading(null);
    }
  };

  // ── Role guard (silent) ────────────────────────────────────────────────────
  if (!canView) return null;

  // ── Nothing to show ────────────────────────────────────────────────────────
  if (!loading && escalations.length === 0 && !error) return null;

  const count   = escalations.length;
  const highest = escalations.reduce((max, e) => Math.max(max, e.escalation_level), 1) as 1 | 2 | 3;
  const cfg     = LEVEL_CONFIG[highest];

  return (
    <div
      className={`sticky top-0 z-50 w-full border-b shadow-lg ${
        highest === 3
          ? "bg-rose-950/90   border-rose-700/60"
          : highest === 2
          ? "bg-orange-950/90 border-orange-700/60"
          : "bg-amber-950/90  border-amber-700/60"
      } backdrop-blur-sm`}
      role="alert"
      aria-live="assertive"
    >
      {/* Banner header row */}
      <div className="max-w-screen-2xl mx-auto px-4 py-2.5 flex items-center gap-3">
        {/* Pulsing dot */}
        <span className="relative flex-shrink-0">
          <span className={`absolute inline-flex h-3 w-3 rounded-full ${cfg.dotColor} opacity-75 animate-ping`} />
          <span className={`relative inline-flex h-3 w-3 rounded-full ${cfg.dotColor}`} />
        </span>

        <BellRing className={`h-4 w-4 flex-shrink-0 ${cfg.style.split(" ").find(c => c.startsWith("text-"))}`} />

        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white">
            {count} Unresolved ETD Escalation{count !== 1 ? "s" : ""}
          </span>
          <span className="hidden sm:inline text-xs text-white/50 ml-2">
            — Jobs opened without ETD set
          </span>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <span className="hidden md:flex items-center gap-1 text-[11px] text-white/40">
            <Clock className="h-3 w-3" />
            {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        {/* Manual refresh */}
        <button
          onClick={fetchEscalations}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-all disabled:opacity-40"
          title="Refresh now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Collapse</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> View All</>
          )}
        </button>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="max-w-screen-2xl mx-auto px-4 pb-3 space-y-2">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && escalations.length === 0 && (
            <div className="flex items-center gap-2 text-white/40 text-xs py-2">
              <FunnySpinner className="h-4 w-4" /> Loading escalations…
            </div>
          )}

          {/* Escalation cards */}
          {escalations.map((esc) => {
            const levelCfg = LEVEL_CONFIG[esc.escalation_level];
            return (
              <div
                key={esc.escalation_id}
                className="flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-3 hover:bg-black/40 transition-all"
              >
                {/* Level badge */}
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelCfg.style}`}>
                  L{esc.escalation_level}
                </span>

                {/* JC info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">{esc.job_card_no}</span>
                    <span className="text-[10px] text-white/50">{esc.vrn}</span>
                    {esc.customer_name && (
                      <span className="text-[10px] text-white/40 truncate max-w-[140px]">
                        {esc.customer_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {elapsedLabel(esc.escalated_at)}
                    </span>
                    <span className="text-[10px] text-white/30 capitalize">
                      → {esc.escalated_to}
                    </span>
                    {esc.notes && (
                      <span className="text-[10px] italic text-white/30 truncate max-w-[180px]">
                        {esc.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Job status badge */}
                <span className="hidden sm:block text-[10px] text-white/30 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full flex-shrink-0">
                  {esc.job_status}
                </span>

                {/* Acknowledge button */}
                <button
                  onClick={() => acknowledge(esc.escalation_id)}
                  disabled={ackLoading === esc.escalation_id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {ackLoading === esc.escalation_id
                    ? <FunnySpinner className="h-3.5 w-3.5" />
                    : <CheckCircle2  className="h-3.5 w-3.5" />
                  }
                  Acknowledge
                </button>
              </div>
            );
          })}

          {/* All acknowledged */}
          {!loading && escalations.length === 0 && (
            <div className="flex items-center gap-2 text-emerald-400/70 text-xs py-1">
              <CheckCircle2 className="h-4 w-4" />
              All escalations acknowledged — banner will hide on next refresh.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
