// ============================================================
// Customer Portal V2 — Warranty Center Page
// ============================================================
// Real-time warranty status, coverage remaining, and claims list.

import React, { useState, useEffect } from "react";
import { fetchWarrantyStatus } from "../hooks/useCustomerApi";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";

interface WarrantyClaim {
  claim_id: string;
  job_card_no: string;
  date: string;
  description: string;
  status: "Approved" | "Rejected" | "Pending" | "In Review";
  amount_covered: number | null;
}

interface WarrantyData {
  vrn: string;
  vehicle_make: string;
  vehicle_model: string;
  warranty_type: "OEM" | "Extended" | "AMC" | "None";
  warranty_start: string | null;
  warranty_end: string | null;
  km_limit: number | null;
  km_covered: number | null;
  days_remaining: number | null;
  km_remaining: number | null;
  coverage_summary: string;
  claims: WarrantyClaim[];
}

interface WarrantyCenterPageProps {
  vrn?: string; // optional — if not provided, shows picker
}

export function WarrantyCenterPage({ vrn: initialVrn }: WarrantyCenterPageProps) {
  const [vrn] = useState(initialVrn || "");
  const [data, setData] = useState<WarrantyData | null>(null);
  const [loading, setLoading] = useState(!!initialVrn);
  const [error, setError] = useState("");

  useEffect(() => {
    if (vrn) loadWarranty(vrn);
  }, [vrn]);

  const loadWarranty = async (v: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchWarrantyStatus(v);
      if (result.success && result.warranty) {
        setData(result.warranty);
      } else {
        setError(result.error || "Could not load warranty information.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const claimStatusColor = (status: string) => {
    if (status === "Approved") return { bg: "#dcfce7", text: "#059669" };
    if (status === "Rejected") return { bg: "#fee2e2", text: "#dc2626" };
    if (status === "In Review") return { bg: "#dbeafe", text: "#1e40af" };
    return { bg: "#fef3c7", text: "#92400e" };
  };

  const warrantyTypeColor = (type: string) => {
    if (type === "OEM") return { bg: "#1e3a5f", text: "#fff" };
    if (type === "Extended") return { bg: "#2d5a8e", text: "#fff" };
    if (type === "AMC") return { bg: "#d4a844", text: "#1e3a5f" };
    return { bg: "#e2e8f0", text: "#475569" };
  };

  // Coverage percentage calculation
  const coveragePct = data?.days_remaining != null && data?.warranty_start && data?.warranty_end
    ? Math.max(0, Math.min(100, Math.round(
        (data.days_remaining / ((new Date(data.warranty_end).getTime() - new Date(data.warranty_start).getTime()) / 86400000)) * 100
      )))
    : null;

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}>🛡️ Warranty Center</h2>

      {loading ? (
        <SkeletonLoader type="vehicle-card" count={2} />
      ) : error ? (
        <EmptyState icon="⚠️" title="Failed to Load" subtitle={error} />
      ) : !vrn || !data ? (
        <EmptyState
          icon="🛡️"
          title="No Vehicle Selected"
          subtitle="Go to a vehicle's detail page and tap 'Warranty Center' to view coverage."
        />
      ) : (
        <>
          {/* Vehicle Header */}
          <div style={s.vehicleHeader}>
            <div>
              <div style={s.vehicleName}>{data.vehicle_make} {data.vehicle_model}</div>
              <div style={s.vrnBadge}>{vrn}</div>
            </div>
            <div style={{
              ...s.warrantyTypeBadge,
              background: warrantyTypeColor(data.warranty_type).bg,
              color: warrantyTypeColor(data.warranty_type).text,
            }}>
              {data.warranty_type} WARRANTY
            </div>
          </div>

          {/* Coverage Card */}
          {data.warranty_type !== "None" ? (
            <div style={s.coverageCard}>
              <div style={s.coverageHeader}>
                <div style={s.coverageTitle}>Coverage Status</div>
                {data.days_remaining != null && (
                  <div style={{
                    ...s.daysRemaining,
                    color: data.days_remaining < 30 ? "#dc2626" : data.days_remaining < 90 ? "#d97706" : "#059669",
                  }}>
                    {data.days_remaining > 0 ? `${data.days_remaining} days left` : "Expired"}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {coveragePct !== null && (
                <div style={s.progressWrap}>
                  <div style={s.progressTrack}>
                    <div style={{
                      ...s.progressFill,
                      width: `${coveragePct}%`,
                      background: coveragePct > 50 ? "#059669" : coveragePct > 20 ? "#d97706" : "#dc2626",
                    }} />
                  </div>
                  <div style={s.progressLabel}>{coveragePct}% remaining</div>
                </div>
              )}

              {/* Dates */}
              <div style={s.datesRow}>
                {data.warranty_start && (
                  <div style={s.dateItem}>
                    <div style={s.dateLabel}>Start Date</div>
                    <div style={s.dateValue}>
                      {new Date(data.warranty_start).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                )}
                {data.warranty_end && (
                  <div style={s.dateItem}>
                    <div style={s.dateLabel}>End Date</div>
                    <div style={s.dateValue}>
                      {new Date(data.warranty_end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                )}
                {data.km_remaining != null && (
                  <div style={s.dateItem}>
                    <div style={s.dateLabel}>KM Remaining</div>
                    <div style={s.dateValue}>{data.km_remaining.toLocaleString("en-IN")} km</div>
                  </div>
                )}
              </div>

              {/* Coverage Summary */}
              <div style={s.coverageSummary}>📋 {data.coverage_summary}</div>
            </div>
          ) : (
            <div style={s.noWarrantyCard}>
              <div style={s.noWarrantyIcon}>⚠️</div>
              <div style={s.noWarrantyText}>
                <strong>No Active Warranty</strong>
                <br />
                <span style={{ fontSize: 13 }}>Consider an AMC plan to protect your vehicle.</span>
              </div>
            </div>
          )}

          {/* Claims History */}
          <h3 style={s.sectionTitle}>📋 Warranty Claims ({data.claims.length})</h3>
          {data.claims.length === 0 ? (
            <EmptyState
              icon="✅"
              title="No Claims Filed"
              subtitle="No warranty claims have been raised for this vehicle."
            />
          ) : (
            <div style={s.claimsList}>
              {data.claims.map((claim) => {
                const sc = claimStatusColor(claim.status);
                return (
                  <div key={claim.claim_id} style={s.claimCard}>
                    <div style={s.claimTop}>
                      <div style={s.claimJcNo}>{claim.job_card_no}</div>
                      <div style={{ ...s.claimStatus, background: sc.bg, color: sc.text }}>
                        {claim.status}
                      </div>
                    </div>
                    <div style={s.claimDate}>
                      {new Date(claim.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div style={s.claimDesc}>{claim.description}</div>
                    {claim.amount_covered != null && (
                      <div style={s.claimAmount}>
                        💰 ₹{claim.amount_covered.toLocaleString("en-IN")} covered under warranty
                      </div>
                    )}
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
const c = { primary: "#1e3a5f", accent: "#d4a844", text: "#1a1a2e", textSecondary: "#64748b", border: "#e2e8f0" };

const s: Record<string, React.CSSProperties> = {
  page: { paddingBottom: 32 },
  pageTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: c.text, margin: "0 0 16px" },
  vehicleHeader: {
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    border: `1px solid ${c.border}`, marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  vehicleName: { fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 4 },
  vrnBadge: {
    display: "inline-block",
    background: c.primary, color: "#fff",
    borderRadius: 6, padding: "2px 8px",
    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
  },
  warrantyTypeBadge: {
    borderRadius: 10, padding: "6px 14px",
    fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
  },
  coverageCard: {
    background: "#fff", borderRadius: 16, padding: 16,
    border: `1px solid ${c.border}`, marginBottom: 20,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  },
  coverageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  coverageTitle: { fontSize: 14, fontWeight: 700, color: c.text },
  daysRemaining: { fontSize: 13, fontWeight: 700 },
  progressWrap: { marginBottom: 14 },
  progressTrack: { height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 4, transition: "width 0.8s ease" },
  progressLabel: { fontSize: 12, color: c.textSecondary, textAlign: "right" as const },
  datesRow: { display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 12 },
  dateItem: { flex: 1, minWidth: 90 },
  dateLabel: { fontSize: 11, color: c.textSecondary, marginBottom: 2 },
  dateValue: { fontSize: 13, fontWeight: 600, color: c.text },
  coverageSummary: {
    fontSize: 13, color: "#1e40af",
    background: "#eff6ff", borderRadius: 8, padding: "8px 12px",
    lineHeight: 1.5,
  },
  noWarrantyCard: {
    background: "#fff5f5", borderRadius: 14, padding: "14px 16px",
    border: "1px solid #fca5a5", display: "flex", gap: 12, alignItems: "center", marginBottom: 20,
  },
  noWarrantyIcon: { fontSize: 28 },
  noWarrantyText: { fontSize: 14, color: "#7f1d1d", lineHeight: 1.5 },
  sectionTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: c.text, margin: "0 0 10px" },
  claimsList: { display: "flex", flexDirection: "column", gap: 10 },
  claimCard: {
    background: "#fff", borderRadius: 12, padding: "12px 14px",
    border: `1px solid ${c.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  claimTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  claimJcNo: { fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: c.primary },
  claimStatus: { borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 },
  claimDate: { fontSize: 12, color: c.textSecondary, marginBottom: 4 },
  claimDesc: { fontSize: 13, color: c.text, lineHeight: 1.4 },
  claimAmount: { fontSize: 12, color: "#047857", marginTop: 6, fontWeight: 600 },
};
