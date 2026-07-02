import React, { useState, useEffect } from "react";
import {
  Award,
  Shield,
  TrendingUp,
  AlertTriangle,
  ChevronUp,
  Users,
  RefreshCw,
  Medal,
  Crown,
  Star,
  CheckCircle2,
  XCircle,
  ArrowUpCircle
} from "lucide-react";

interface CertStats {
  total_active_technicians: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  uncertified_count: number;
  gold_pct: number;
  silver_pct: number;
  bronze_pct: number;
  cpsc_l2_score: number;
  cpsc_l2_max: number;
  target_gold_pct: number;
  is_below_target: boolean;
  silver_upgrade_candidates: Array<{
    employee_id: number;
    full_name: string;
    certification_date?: string;
  }>;
}

interface CpscAlert {
  type: string;
  severity: string;
  message: string;
  gold_pct?: number;
  gold_count?: number;
  total?: number;
  deficit?: number;
  employees?: Array<{
    employee_id: number;
    full_name: string;
    certification_date?: string;
    certification_level?: string;
  }>;
}

export default function CpscCertificationPanel() {
  const [stats, setStats] = useState<CertStats | null>(null);
  const [alerts, setAlerts] = useState<CpscAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes] = await Promise.all([
        fetch("/api/workforce/certification-stats"),
        fetch("/api/workforce/cpsc-alerts")
      ]);
      const statsData = await statsRes.json();
      const alertsData = await alertsRes.json();
      setStats(statsData);
      setAlerts(alertsData.alerts || []);
    } catch (err) {
      console.error("Failed to fetch certification data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpgrade = async (employeeId: number) => {
    setUpgradeLoading(employeeId);
    try {
      const res = await fetch(`/api/employees/${employeeId}/certification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certification_level: "Gold", certification_date: new Date().toISOString().split("T")[0] })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Upgrade failed:", err);
    } finally {
      setUpgradeLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
        <span className="ml-2 text-slate-400 text-sm">Loading CPSC L2 data...</span>
      </div>
    );
  }

  if (!stats) return null;

  const gaugeAngle = (stats.gold_pct / 100) * 180;
  const targetAngle = (stats.target_gold_pct / 100) * 180;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 rounded-lg">
            <Shield className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">CPSC L2 — Certification Tracker</h2>
            <p className="text-xs text-slate-400">Customer Satisfaction Parameter Card • Workforce Certification Compliance</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Alert Banners */}
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            alert.severity === "High"
              ? "bg-rose-500/5 border-rose-500/20 text-rose-300"
              : "bg-amber-500/5 border-amber-500/20 text-amber-300"
          }`}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">{alert.message}</p>
            {alert.deficit && alert.deficit > 0 && (
              <p className="text-xs mt-1 opacity-80">
                Need {alert.deficit} more Gold certified technician{alert.deficit > 1 ? "s" : ""} to reach target.
              </p>
            )}
          </div>
        </div>
      ))}

      {/* CPSC Score + Gold Gauge Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPSC L2 Score Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPSC L2 Score</span>
          </div>
          <div className="flex items-end gap-1">
            <span className={`text-4xl font-black ${stats.cpsc_l2_score >= 30 ? "text-emerald-400" : stats.cpsc_l2_score >= 18 ? "text-amber-400" : "text-rose-400"}`}>
              {stats.cpsc_l2_score}
            </span>
            <span className="text-lg text-slate-500 font-bold mb-1">/{stats.cpsc_l2_max}</span>
          </div>
          <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                stats.cpsc_l2_score >= 30 ? "bg-emerald-500" : stats.cpsc_l2_score >= 18 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${(stats.cpsc_l2_score / stats.cpsc_l2_max) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-wider">
            {stats.cpsc_l2_score >= 30 ? "✓ Maximum Score Achieved" : `${30 - stats.cpsc_l2_score} pts to reach max`}
          </p>
        </div>

        {/* Gold % Gauge */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/30 via-amber-500 to-amber-500/30" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Gold Technician %</span>
          {/* Semi-circle gauge */}
          <div className="relative w-40 h-20 mb-2">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              {/* Background arc */}
              <path d="M 10 95 A 90 90 0 0 1 190 95" fill="none" stroke="#334155" strokeWidth="12" strokeLinecap="round" />
              {/* Target line */}
              <line
                x1={100 - 85 * Math.cos((targetAngle * Math.PI) / 180)}
                y1={95 - 85 * Math.sin((targetAngle * Math.PI) / 180)}
                x2={100 - 95 * Math.cos((targetAngle * Math.PI) / 180)}
                y2={95 - 95 * Math.sin((targetAngle * Math.PI) / 180)}
                stroke="#94a3b8" strokeWidth="2" strokeDasharray="3,3"
              />
              {/* Gauge arc */}
              <path
                d={`M 10 95 A 90 90 0 0 1 ${100 - 90 * Math.cos((gaugeAngle * Math.PI) / 180)} ${95 - 90 * Math.sin((gaugeAngle * Math.PI) / 180)}`}
                fill="none"
                stroke={stats.gold_pct >= 50 ? "#10b981" : stats.gold_pct >= 30 ? "#f59e0b" : "#ef4444"}
                strokeWidth="12"
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-end justify-center pb-0">
              <span className={`text-2xl font-black ${stats.gold_pct >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                {stats.gold_pct}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>Target: ≥{stats.target_gold_pct}%</span>
            {stats.gold_pct >= stats.target_gold_pct ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <XCircle className="h-3 w-3 text-rose-500" />
            )}
          </div>
        </div>

        {/* Active Technicians */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Technicians</span>
          </div>
          <span className="text-4xl font-black text-white">{stats.total_active_technicians}</span>
          <div className="mt-4 space-y-2">
            {[
              { label: "Gold", count: stats.gold_count, color: "bg-amber-500", icon: Crown },
              { label: "Silver", count: stats.silver_count, color: "bg-slate-400", icon: Medal },
              { label: "Bronze", count: stats.bronze_count, color: "bg-orange-700", icon: Star },
              { label: "Uncertified", count: stats.uncertified_count, color: "bg-slate-600", icon: XCircle },
            ].map(({ label, count, color, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <Icon className="h-3 w-3 text-slate-500" />
                  <span className="text-slate-400">{label}</span>
                </div>
                <span className="font-bold text-slate-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certification Breakdown Bars */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          Certification Distribution
        </h3>
        <div className="space-y-3">
          {[
            { label: "Gold", pct: stats.gold_pct, count: stats.gold_count, color: "bg-amber-500", emoji: "🥇" },
            { label: "Silver", pct: stats.silver_pct, count: stats.silver_count, color: "bg-slate-400", emoji: "🥈" },
            { label: "Bronze", pct: stats.bronze_pct, count: stats.bronze_count, color: "bg-orange-700", emoji: "🥉" },
          ].map(({ label, pct, count, color, emoji }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>{emoji}</span> {label}
                </span>
                <span className="text-slate-300 font-bold">{count} ({pct}%)</span>
              </div>
              <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-1000`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Silver Upgrade Candidates */}
      {stats.silver_upgrade_candidates.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
            Silver → Gold Upgrade Candidates
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            These technicians are Silver certified and recommended for Gold upgrade to improve CPSC L2 compliance.
          </p>
          <div className="space-y-2">
            {stats.silver_upgrade_candidates.map((c) => (
              <div
                key={c.employee_id}
                className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-700/30 rounded-lg hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                    {c.full_name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-200">{c.full_name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">
                      Certified: {c.certification_date || "N/A"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade(c.employee_id)}
                  disabled={upgradeLoading === c.employee_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {upgradeLoading === c.employee_id ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                  Upgrade to Gold
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
