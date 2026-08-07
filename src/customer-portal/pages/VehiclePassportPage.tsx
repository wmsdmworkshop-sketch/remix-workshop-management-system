// ============================================================
// Customer Portal V2 — Vehicle Passport Page
// ============================================================
// Complete digital service history for a single vehicle.
// Fetches and displays ALL job cards, services, parts, warranty, AMC.

import React, { useState, useEffect } from "react";
import { fetchVehiclePassport } from "../hooks/useCustomerApi";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";

interface PassportEntry {
  job_card_no: string;
  date_in: string;
  service_type: string;
  job_description: string;
  status: string;
  km_reading: number | null;
  invoice_no: string | null;
  invoice_amount: number | null;
  warranty_status: string | null;
  completed_at: string | null;
}

interface VehiclePassportData {
  vrn: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  total_visits: number;
  total_spend: number;
  max_km: number | null;
  warranty_valid_till: string | null;
  amc_plan: string | null;
  amc_valid_till: string | null;
  history: PassportEntry[];
}

interface VehiclePassportPageProps {
  vrn: string;
  onBack: () => void;
}

export function VehiclePassportPage({ vrn, onBack }: VehiclePassportPageProps) {
  const [data, setData] = useState<VehiclePassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [vrn]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchVehiclePassport(vrn);
      if (result.success && result.passport) {
        setData(result.passport);
      } else {
        setError(result.error || "Could not load vehicle passport.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "Invoiced" || status === "Delivered") return { bg: "#dcfce7", text: "#059669" };
    if (status === "Active" || status === "In Progress") return { bg: "#dbeafe", text: "#1e40af" };
    if (status === "Waiting") return { bg: "#fef3c7", text: "#92400e" };
    return { bg: "#f1f5f9", text: "#475569" };
  };

  return (
    <div style={s.page}>
      {/* Back Header */}
      <div style={s.backBar}>
        <button style={s.backBtn} onClick={onBack}>← Back</button>
        <h2 style={s.pageTitle}>Vehicle Passport</h2>
        <div style={s.vrnChip}>{vrn}</div>
      </div>

      {loading ? (
        <SkeletonLoader type="timeline" count={4} />
      ) : error ? (
        <EmptyState icon="⚠️" title="Failed to Load" subtitle={error} actionLabel="Retry" onAction={load} />
      ) : !data ? null : (
        <>
          {/* Vehicle Identity Card */}
          <div style={s.identityCard}>
            <div style={s.vehicleIcon}>🚛</div>
            <div style={s.vehicleDetails}>
              <div style={s.vehicleName}>{data.vehicle_make} {data.vehicle_model}</div>
              <div style={s.vehicleYear}>{data.vehicle_year}</div>
            </div>
            <div style={s.vrnLarge}>{vrn}</div>
          </div>

          {/* Stats Row */}
          <div style={s.statsRow}>
            <div style={s.stat}>
              <div style={s.statValue}>{data.total_visits}</div>
              <div style={s.statLabel}>Service Visits</div>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <div style={s.statValue}>
                ₹{(data.total_spend || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
              <div style={s.statLabel}>Total Spent</div>
            </div>
            <div style={s.statDivider} />
            <div style={s.stat}>
              <div style={s.statValue}>
                {data.max_km ? `${data.max_km.toLocaleString("en-IN")}` : "—"}
              </div>
              <div style={s.statLabel}>Last KM</div>
            </div>
          </div>

          {/* Warranty + AMC */}
          {(data.warranty_valid_till || data.amc_plan) && (
            <div style={s.coverageRow}>
              {data.warranty_valid_till && (
                <div style={s.coverageCard}>
                  <span style={s.coverageIcon}>🛡️</span>
                  <div>
                    <div style={s.coverageLabel}>Warranty</div>
                    <div style={s.coverageValue}>
                      Valid till {new Date(data.warranty_valid_till).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              )}
              {data.amc_plan && (
                <div style={{ ...s.coverageCard, background: "#fffbeb" }}>
                  <span style={s.coverageIcon}>📋</span>
                  <div>
                    <div style={s.coverageLabel}>AMC Plan</div>
                    <div style={s.coverageValue}>{data.amc_plan}</div>
                    {data.amc_valid_till && (
                      <div style={s.coverageExpiry}>
                        Till {new Date(data.amc_valid_till).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Service History Timeline */}
          <h3 style={s.sectionTitle}>📂 Complete Service History</h3>
          {data.history.length === 0 ? (
            <EmptyState icon="📋" title="No Service History" subtitle="No service records found for this vehicle." />
          ) : (
            <div style={s.timeline}>
              {data.history.map((entry, idx) => {
                const sc = statusColor(entry.status);
                return (
                  <div key={entry.job_card_no} style={s.timelineItem}>
                    {/* Connector line */}
                    {idx < data.history.length - 1 && <div style={s.connector} />}

                    {/* Timeline dot */}
                    <div style={{ ...s.dot, background: sc.text }} />

                    {/* Card */}
                    <div style={s.historyCard}>
                      <div style={s.historyTop}>
                        <div style={s.historyJcNo}>{entry.job_card_no}</div>
                        <div style={{ ...s.historyStatus, background: sc.bg, color: sc.text }}>
                          {entry.status}
                        </div>
                      </div>
                      <div style={s.historyDate}>
                        {entry.date_in ? new Date(entry.date_in).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        }) : "—"}
                        {entry.km_reading && (
                          <span style={s.historyKm}> · {entry.km_reading.toLocaleString("en-IN")} km</span>
                        )}
                      </div>
                      <div style={s.historyService}>{entry.service_type}</div>
                      {entry.job_description && (
                        <div style={s.historyDesc}>{entry.job_description}</div>
                      )}
                      {entry.invoice_no && (
                        <div style={s.historyInvoice}>
                          🧾 {entry.invoice_no}
                          {entry.invoice_amount != null && (
                            <strong> · ₹{entry.invoice_amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</strong>
                          )}
                        </div>
                      )}
                      {entry.warranty_status && entry.warranty_status !== "No Warranty" && (
                        <div style={s.historyWarranty}>🛡️ {entry.warranty_status}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Styles ----
const c = { primary: "#1e3a5f", accent: "#d4a844", text: "#1a1a2e", textSecondary: "#64748b", border: "#e2e8f0", success: "#059669" };

const s: Record<string, React.CSSProperties> = {
  page: { paddingBottom: 32 },
  backBar: {
    display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
  },
  backBtn: { background: "none", border: "none", color: c.primary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0 },
  pageTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: c.text, margin: 0, flex: 1 },
  vrnChip: {
    background: c.primary, color: "#fff", borderRadius: 8, padding: "3px 10px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
  },
  identityCard: {
    background: `linear-gradient(135deg, ${c.primary} 0%, #2d5a8e 100%)`,
    borderRadius: 16, padding: "20px 16px",
    display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
  },
  vehicleIcon: { fontSize: 40 },
  vehicleDetails: { flex: 1 },
  vehicleName: { color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Outfit', sans-serif" },
  vehicleYear: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },
  vrnLarge: {
    color: c.accent, fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14, fontWeight: 800, letterSpacing: 1,
  },
  statsRow: {
    background: "#fff", borderRadius: 14, padding: "16px 8px",
    display: "flex", justifyContent: "space-around", alignItems: "center",
    border: `1px solid ${c.border}`, marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  stat: { textAlign: "center" as const },
  statValue: { fontSize: 18, fontWeight: 800, color: c.primary, fontFamily: "'Outfit', sans-serif" },
  statLabel: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 36, background: c.border },
  coverageRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const },
  coverageCard: {
    flex: 1, minWidth: 140,
    background: "#f0f9ff", borderRadius: 12, padding: "10px 12px",
    display: "flex", gap: 8, alignItems: "flex-start",
    border: `1px solid #bae6fd`,
  },
  coverageIcon: { fontSize: 20, flexShrink: 0 },
  coverageLabel: { fontSize: 11, color: c.textSecondary, fontWeight: 600, marginBottom: 2 },
  coverageValue: { fontSize: 12, color: c.text, fontWeight: 600 },
  coverageExpiry: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  sectionTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: c.text, margin: "0 0 12px" },
  timeline: { position: "relative" as const, paddingLeft: 20 },
  timelineItem: { position: "relative" as const, marginBottom: 12 },
  connector: {
    position: "absolute" as const, left: -12, top: 20, bottom: -12,
    width: 2, background: c.border,
  },
  dot: {
    position: "absolute" as const, left: -16, top: 16,
    width: 10, height: 10, borderRadius: "50%",
    border: "2px solid #fff",
    boxShadow: "0 0 0 1px #e2e8f0",
  },
  historyCard: {
    background: "#fff", borderRadius: 12, padding: "12px 14px",
    border: `1px solid ${c.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  historyTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyJcNo: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: c.primary },
  historyStatus: { borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 },
  historyDate: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
  historyKm: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
  historyService: { fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 3 },
  historyDesc: { fontSize: 12, color: c.textSecondary, lineHeight: 1.4, marginBottom: 4 },
  historyInvoice: { fontSize: 12, color: "#047857", marginTop: 4 },
  historyWarranty: { fontSize: 12, color: "#1d4ed8", marginTop: 3 },
};
