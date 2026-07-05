// ==========================================
// Customer Portal — Dashboard Page
// ==========================================
// Shows vehicle cards + active job status cards + real-time status alerts & WS progress channel.

import React, { useState, useEffect } from "react";
import { fetchVehicles, fetchJobs } from "../hooks/useCustomerApi";
import type { CustomerJobView, CustomerVehicleView } from "../types";

interface ActionAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  job_card_no: string;
  severity: "success" | "warning" | "info";
}

interface DashboardPageProps {
  onJobClick: (jobCardNo: string) => void;
}

export function DashboardPage({ onJobClick }: DashboardPageProps) {
  const [vehicles, setVehicles] = useState<CustomerVehicleView[]>([]);
  const [jobs, setJobs] = useState<CustomerJobView[]>([]);
  const [alerts, setAlerts] = useState<ActionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    loadData();
    setupWebSocket();
    loadAlerts();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehicleRes, jobsRes] = await Promise.all([
        fetchVehicles(),
        fetchJobs(),
      ]);
      setVehicles(vehicleRes.vehicles || []);
      setJobs(jobsRes.jobs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetch("/api/customer/alerts", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("customer_token")}`,
        },
      });
      const data = await res.json();
      if (data.alerts) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.warn("Failed to load customer alerts:", err);
    }
  };

  // Real-time Status progress channel via WebSocket
  const setupWebSocket = () => {
    const token = localStorage.getItem("customer_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/customer/live-progress?token=${token}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[CustomerPortal] Live Progress WebSocket connected");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.type === "status_update") {
          console.log("[CustomerPortal] WS Status update received:", update);
          
          // Update active job status in real time
          setJobs((prevJobs) =>
            prevJobs.map((j) =>
              j.job_card_no === update.job_card_no
                ? { ...j, status: update.status, progress_pct: update.progress_pct, etd: update.etd }
                : j
            )
          );

          // Update active vehicle status in list
          setVehicles((prevVehicles) =>
            prevVehicles.map((v) =>
              v.vrn === update.vrn
                ? { ...v, active_jobs: update.status === "Completed" || update.status === "Invoiced" ? Math.max(0, v.active_jobs - 1) : v.active_jobs }
                : v
            )
          );

          // Refresh alerts automatically
          loadAlerts();
        }
      } catch (err) {
        console.error("[CustomerPortal] Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log("[CustomerPortal] Live Progress WebSocket disconnected");
      setWsConnected(false);
      // Auto reconnect after 5 seconds
      setTimeout(setupWebSocket, 5000);
    };

    return ws;
  };

  const activeJobs = jobs.filter(
    (j) => j.status === "Active" || j.status === "Waiting"
  );
  const completedJobs = jobs.filter(
    (j) => j.status === "Completed" || j.status === "Invoiced"
  );

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading your vehicles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.errorWrap}>
        <p style={s.errorText}>⚠️ {error}</p>
        <button onClick={loadData} style={s.retryBtn}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Live Status Channel Status bar */}
      <div style={{
        ...s.liveStatusBar,
        background: wsConnected ? "#ecfdf5" : "#fef2f2",
        color: wsConnected ? "#047857" : "#b91c1c",
      }}>
        <span style={{
          ...s.liveDot,
          background: wsConnected ? "#10b981" : "#ef4444",
        }} />
        {wsConnected ? "Real-time Status Channel Connected" : "Status Channel Reconnecting..."}
      </div>

      {/* Action Alerts / Notifications Section */}
      {alerts.length > 0 && (
        <div style={s.alertsSection}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                ...s.alertBanner,
                background: alert.severity === "success" ? "#ecfdf5" : alert.severity === "warning" ? "#fffbeb" : "#eff6ff",
                borderLeft: `5px solid ${alert.severity === "success" ? "#10b981" : alert.severity === "warning" ? "#f59e0b" : "#3b82f6"}`,
              }}
              onClick={() => onJobClick(alert.job_card_no)}
            >
              <div style={s.alertContent}>
                <span style={s.alertIcon}>
                  {alert.severity === "success" ? "🎉" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <div>
                  <h4 style={s.alertTitle}>{alert.title}</h4>
                  <p style={s.alertMessage}>{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Services Section */}
      {activeJobs.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>🔧 Active Services</h2>
          {activeJobs.map((job) => (
            <div
              key={job.job_card_no}
              style={s.jobCard}
              onClick={() => onJobClick(job.job_card_no)}
            >
              <div style={s.jobHeader}>
                <span style={s.vrn}>{job.vrn}</span>
                <span style={{
                  ...s.statusBadge,
                  background: job.status === "Active" ? "#dbeafe" : "#fef3c7",
                  color: job.status === "Active" ? "#1e40af" : "#92400e",
                }}>
                  {job.status}
                </span>
              </div>
              <p style={s.jobModel}>{job.vehicle_make} {job.vehicle_model} ({job.vehicle_year})</p>
              <p style={s.jobService}>{job.service_type}</p>

              {/* Progress Bar */}
              {job.progress_pct !== null && job.progress_pct !== undefined && (
                <div style={s.progressWrap}>
                  <div style={s.progressBar}>
                    <div
                      style={{
                        ...s.progressFill,
                        width: `${Math.min(100, job.progress_pct)}%`,
                        background: job.progress_pct >= 80
                          ? "linear-gradient(90deg, #059669, #10b981)"
                          : "linear-gradient(90deg, #1e3a5f, #2d5a8e)",
                      }}
                    />
                  </div>
                  <span style={s.progressText}>{job.progress_pct}%</span>
                </div>
              )}

              {/* ETA */}
              {job.etd && (
                <p style={s.eta}>
                  ⏰ Ready by: {new Date(job.etd).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}

              <div style={s.tapHint}>
                Tap for details →
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Vehicles Summary */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>🚗 My Vehicles</h2>
        {vehicles.length === 0 ? (
          <p style={s.emptyText}>No vehicles found.</p>
        ) : (
          vehicles.map((v) => (
            <div key={v.vrn} style={s.vehicleCard}>
              <div style={s.vehicleHeader}>
                <div style={s.vehicleIcon}>🚘</div>
                <div>
                  <p style={s.vehicleVrn}>{v.vrn}</p>
                  <p style={s.vehicleModel}>{v.vehicle_make} {v.vehicle_model} ({v.vehicle_year})</p>
                </div>
              </div>
              <div style={s.vehicleStats}>
                <div style={s.stat}>
                  <span style={s.statValue}>{v.total_visits}</span>
                  <span style={s.statLabel}>Visits</span>
                </div>
                <div style={s.stat}>
                  <span style={s.statValue}>{v.active_jobs}</span>
                  <span style={s.statLabel}>Active</span>
                </div>
                <div style={s.stat}>
                  <span style={s.statValue}>
                    {v.last_service_date
                      ? new Date(v.last_service_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                      : "—"}
                  </span>
                  <span style={s.statLabel}>Last Visit</span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Recent Completed */}
      {completedJobs.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>✅ Completed Services</h2>
          {completedJobs.slice(0, 5).map((job) => (
            <div
              key={job.job_card_no}
              style={s.completedCard}
              onClick={() => onJobClick(job.job_card_no)}
            >
              <div style={s.completedRow}>
                <div>
                  <p style={s.completedVrn}>{job.vrn} — {job.vehicle_model}</p>
                  <p style={s.completedService}>{job.service_type}</p>
                </div>
                <div style={s.completedRight}>
                  <span style={{ ...s.statusBadge, background: "#dcfce7", color: "#166534" }}>
                    {job.status}
                  </span>
                  {job.completed_at && (
                    <p style={s.completedDate}>
                      {new Date(job.completed_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  loadingWrap: { textAlign: "center", padding: "60px 20px" },
  spinner: {
    width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#1e3a5f",
    borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
  },
  loadingText: { color: "#64748b", fontSize: 14 },
  errorWrap: { textAlign: "center", padding: "40px 20px" },
  errorText: { color: "#dc2626", fontSize: 14, marginBottom: 12 },
  retryBtn: {
    padding: "10px 24px", background: "#1e3a5f", color: "#fff", border: "none",
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  liveStatusBar: {
    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
    borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 16,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: "50%", display: "inline-block",
  },
  alertsSection: { marginBottom: 20 },
  alertBanner: {
    borderRadius: 12, padding: "12px 16px", marginBottom: 8, cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  alertContent: { display: "flex", gap: 12, alignItems: "center" },
  alertIcon: { fontSize: 20 },
  alertTitle: { fontSize: 13, fontWeight: 700, margin: "0 0 2px", color: "#1a1a2e" },
  alertMessage: { fontSize: 12, margin: 0, color: "#475569" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#1e3a5f", marginBottom: 12 },
  jobCard: {
    background: "#ffffff", borderRadius: 14, padding: "16px", marginBottom: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0",
    cursor: "pointer", transition: "transform 0.15s",
  },
  jobHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  vrn: { fontSize: 16, fontWeight: 700, color: "#1e3a5f", letterSpacing: 0.5 },
  statusBadge: {
    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  jobModel: { fontSize: 13, color: "#475569", margin: "0 0 2px" },
  jobService: { fontSize: 12, color: "#94a3b8", margin: "0 0 10px" },
  progressWrap: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  progressBar: { flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, transition: "width 0.5s ease" },
  progressText: { fontSize: 12, fontWeight: 700, color: "#1e3a5f", minWidth: 32 },
  eta: { fontSize: 12, color: "#d97706", fontWeight: 500, margin: 0 },
  tapHint: { fontSize: 11, color: "#94a3b8", textAlign: "right", marginTop: 6 },
  vehicleCard: {
    background: "#ffffff", borderRadius: 14, padding: "16px", marginBottom: 10,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0",
  },
  vehicleHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  vehicleIcon: { fontSize: 28 },
  vehicleVrn: { fontSize: 15, fontWeight: 700, color: "#1e3a5f", margin: 0, letterSpacing: 0.5 },
  vehicleModel: { fontSize: 12, color: "#64748b", margin: 0 },
  vehicleStats: {
    display: "flex", justifyContent: "space-around",
    borderTop: "1px solid #f1f5f9", paddingTop: 10,
  },
  stat: { textAlign: "center" },
  statValue: { display: "block", fontSize: 16, fontWeight: 700, color: "#1e3a5f" },
  statLabel: { fontSize: 10, color: "#94a3b8", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 },
  emptyText: { color: "#94a3b8", fontSize: 14, textAlign: "center", padding: 20 },
  completedCard: {
    background: "#ffffff", borderRadius: 12, padding: "12px 14px", marginBottom: 8,
    border: "1px solid #e2e8f0", cursor: "pointer",
  },
  completedRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  completedVrn: { fontSize: 14, fontWeight: 600, color: "#1e3a5f", margin: 0 },
  completedService: { fontSize: 12, color: "#94a3b8", margin: "2px 0 0" },
  completedRight: { textAlign: "right" },
  completedDate: { fontSize: 11, color: "#94a3b8", margin: "4px 0 0" },
};
