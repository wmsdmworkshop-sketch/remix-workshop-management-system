// ==========================================
// Customer Portal — Job Detail Page
// ==========================================
// Shows single job timeline, progress ring, and details.

import React, { useState, useEffect } from "react";
import { fetchJobDetail } from "../hooks/useCustomerApi";
import type { CustomerJobView } from "../types";

interface JobDetailPageProps {
  jobCardNo: string;
  onBack: () => void;
}

export function JobDetailPage({ jobCardNo, onBack }: JobDetailPageProps) {
  const [job, setJob] = useState<CustomerJobView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadJob();
  }, [jobCardNo]);

  const loadJob = async () => {
    setLoading(true);
    try {
      const res = await fetchJobDetail(jobCardNo);
      setJob(res.job || null);
    } catch (err: any) {
      setError(err.message || "Failed to load job details.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={s.errorWrap}>
        <p style={s.errorText}>⚠️ {error || "Job not found."}</p>
        <button onClick={onBack} style={s.backBtn}>← Back to Dashboard</button>
      </div>
    );
  }

  const progress = job.progress_pct ?? 0;
  const statusSteps = getStatusSteps(job);

  return (
    <div>
      {/* Back Button */}
      <button onClick={onBack} style={s.backBtn}>← Back</button>

      {/* Progress Ring + Status */}
      <div style={s.heroCard}>
        <div style={s.heroTop}>
          <ProgressRing progress={progress} size={90} />
          <div style={s.heroInfo}>
            <p style={s.heroVrn}>{job.vrn}</p>
            <p style={s.heroModel}>{job.vehicle_make} {job.vehicle_model}</p>
            <span style={{
              ...s.statusBadge,
              background: getStatusColor(job.status).bg,
              color: getStatusColor(job.status).text,
            }}>
              {job.status}
            </span>
          </div>
        </div>
      </div>

      {/* Job Details Card */}
      <div style={s.detailCard}>
        <h3 style={s.cardTitle}>Service Details</h3>
        <DetailRow label="Job Card" value={job.job_card_no} />
        <DetailRow label="Service Type" value={job.service_type} />
        <DetailRow label="Priority" value={job.priority} highlight={job.priority === "Express"} />
        <DetailRow label="Description" value={job.job_description} />
        {job.km_reading && <DetailRow label="KM Reading" value={`${job.km_reading.toLocaleString()} km`} />}
        {job.warranty_status && <DetailRow label="Warranty" value={job.warranty_status} />}
      </div>

      {/* Timeline Card */}
      <div style={s.detailCard}>
        <h3 style={s.cardTitle}>Service Timeline</h3>
        <div style={s.timeline}>
          {statusSteps.map((step, i) => (
            <div key={i} style={s.timelineStep}>
              <div style={{
                ...s.timelineDot,
                background: step.completed ? "#059669" : "#d1d5db",
                boxShadow: step.completed ? "0 0 0 3px rgba(5,150,105,0.2)" : "none",
              }}>
                {step.completed ? "✓" : (i + 1)}
              </div>
              {i < statusSteps.length - 1 && (
                <div style={{
                  ...s.timelineLine,
                  background: step.completed ? "#059669" : "#e2e8f0",
                }} />
              )}
              <div style={s.timelineContent}>
                <p style={{
                  ...s.timelineLabel,
                  color: step.completed ? "#1e3a5f" : "#94a3b8",
                  fontWeight: step.current ? 700 : 500,
                }}>
                  {step.label}
                </p>
                {step.time && (
                  <p style={s.timelineTime}>{step.time}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ETA Card */}
      {job.etd && job.status !== "Completed" && job.status !== "Invoiced" && (
        <div style={s.etaCard}>
          <p style={s.etaLabel}>⏰ Estimated Ready By</p>
          <p style={s.etaValue}>
            {new Date(job.etd).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
      )}

      {/* Invoice Card */}
      {job.invoice_no && (
        <div style={s.invoiceCard}>
          <p style={s.invoiceLabel}>📄 Invoice & Documents</p>
          <p style={s.invoiceValue}>{job.invoice_no}</p>
          <button
            style={s.invoiceBtn}
            onClick={async () => {
              try {
                const res = await fetch(`/api/customer/vault/link/${job.invoice_no}`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("customer_token")}`,
                  },
                });
                const data = await res.json();
                if (data.url) {
                  window.open(data.url, "_blank");
                } else {
                  alert(data.error || "Failed to retrieve invoice link.");
                }
              } catch (e) {
                alert("Failed to download document from Vault.");
              }
            }}
          >
            📥 Download Secure Invoice (Vault)
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function DetailRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={s.detailRow}>
      <span style={s.detailLabel}>{label}</span>
      <span style={{
        ...s.detailValue,
        color: highlight ? "#d97706" : "#1a1a2e",
        fontWeight: highlight ? 700 : 500,
      }}>
        {value}
      </span>
    </div>
  );
}

function ProgressRing({ progress, size }: { progress: number; size: number }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const color = progress >= 80 ? "#059669" : progress >= 40 ? "#d97706" : "#1e3a5f";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
      }}>
        <span style={{ fontSize: 20, fontWeight: 800, color }}>{progress}%</span>
      </div>
    </div>
  );
}

// ---- Helpers ----

function getStatusSteps(job: CustomerJobView) {
  const steps = [
    {
      label: "Vehicle Received",
      completed: true,
      current: job.status === "Waiting",
      time: job.date_in ? new Date(job.date_in).toLocaleString("en-IN", { timeStyle: "short" }) : null,
    },
    {
      label: "Service In Progress",
      completed: job.status === "Active" || job.status === "Completed" || job.status === "Invoiced",
      current: job.status === "Active",
      time: null,
    },
    {
      label: "Service Completed",
      completed: job.status === "Completed" || job.status === "Invoiced",
      current: job.status === "Completed",
      time: job.completed_at ? new Date(job.completed_at).toLocaleString("en-IN", { timeStyle: "short" }) : null,
    },
    {
      label: "Ready for Pickup",
      completed: job.status === "Invoiced",
      current: job.status === "Invoiced",
      time: job.gate_out_time || null,
    },
  ];
  return steps;
}

function getStatusColor(status: string) {
  switch (status) {
    case "Active": return { bg: "#dbeafe", text: "#1e40af" };
    case "Waiting": return { bg: "#fef3c7", text: "#92400e" };
    case "Completed": return { bg: "#dcfce7", text: "#166534" };
    case "Invoiced": return { bg: "#f3e8ff", text: "#7e22ce" };
    default: return { bg: "#f1f5f9", text: "#475569" };
  }
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
  backBtn: {
    background: "none", border: "none", color: "#1e3a5f", fontSize: 14,
    fontWeight: 600, cursor: "pointer", padding: "8px 0", marginBottom: 12,
    display: "block",
  },
  heroCard: {
    background: "#ffffff", borderRadius: 16, padding: 20, marginBottom: 14,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0",
  },
  heroTop: { display: "flex", alignItems: "center", gap: 18 },
  heroInfo: { flex: 1 },
  heroVrn: { fontSize: 18, fontWeight: 800, color: "#1e3a5f", margin: "0 0 2px", letterSpacing: 0.5 },
  heroModel: { fontSize: 13, color: "#64748b", margin: "0 0 8px" },
  statusBadge: {
    display: "inline-block", fontSize: 11, fontWeight: 700, padding: "4px 12px",
    borderRadius: 20, textTransform: "uppercase", letterSpacing: 0.5,
  },
  detailCard: {
    background: "#ffffff", borderRadius: 14, padding: "16px", marginBottom: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0",
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1e3a5f", margin: "0 0 12px" },
  detailRow: {
    display: "flex", justifyContent: "space-between", padding: "6px 0",
    borderBottom: "1px solid #f8fafc",
  },
  detailLabel: { fontSize: 13, color: "#94a3b8", fontWeight: 500 },
  detailValue: { fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "60%", wordBreak: "break-word" },
  timeline: { position: "relative", paddingLeft: 4 },
  timelineStep: { display: "flex", alignItems: "flex-start", marginBottom: 18, position: "relative" },
  timelineDot: {
    width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff",
    flexShrink: 0, zIndex: 1,
  },
  timelineLine: {
    position: "absolute", left: 12, top: 26, width: 2, height: "calc(100% - 8px)",
  },
  timelineContent: { marginLeft: 12, paddingTop: 3 },
  timelineLabel: { fontSize: 13, margin: 0 },
  timelineTime: { fontSize: 11, color: "#94a3b8", margin: "2px 0 0" },
  etaCard: {
    background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: 14,
    padding: "14px 16px", marginBottom: 12, textAlign: "center",
  },
  etaLabel: { fontSize: 13, color: "#92400e", fontWeight: 600, margin: "0 0 4px" },
  etaValue: { fontSize: 16, color: "#78350f", fontWeight: 800, margin: 0 },
  invoiceCard: {
    background: "linear-gradient(135deg, #f3e8ff, #ede9fe)", borderRadius: 14,
    padding: "14px 16px", marginBottom: 12, textAlign: "center",
  },
  invoiceLabel: { fontSize: 13, color: "#7e22ce", fontWeight: 600, margin: "0 0 4px" },
  invoiceValue: { fontSize: 18, color: "#581c87", fontWeight: 800, margin: 0, letterSpacing: 1 },
  invoiceBtn: {
    display: "inline-block",
    marginTop: 10,
    padding: "8px 16px",
    background: "#1e3a5f",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(30,58,95,0.2)",
  },
};
