// ============================================================
// Customer Portal V2 — Smart Vehicle Discovery Page
// ============================================================
// Shown once after first login (or when no verified vehicles exist).
// Auto-discovers vehicles associated with the customer's mobile number.
// Each vehicle requires ownership verification before being permanently linked.

import React, { useState, useEffect } from "react";
import { discoverVehicles } from "../hooks/useCustomerApi";
import { OwnershipVerificationModal } from "../components/OwnershipVerificationModal";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { EmptyState } from "../components/EmptyState";

interface DiscoveredVehicle {
  vrn: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  last_service_date: string | null;
  total_visits: number;
  chassis_last6_hint: string; // last 2 chars of chassis (hint only — not full chassis)
}

interface VehicleDiscoveryPageProps {
  mobile: string;
  onComplete: () => void; // called when user finishes discovery (skip or verify)
}

export function VehicleDiscoveryPage({ mobile, onComplete }: VehicleDiscoveryPageProps) {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<DiscoveredVehicle[]>([]);
  const [verifyingVrn, setVerifyingVrn] = useState<string | null>(null);
  const [linkedVrns, setLinkedVrns] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    loadDiscoveredVehicles();
  }, []);

  const loadDiscoveredVehicles = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await discoverVehicles();
      if (result.success && result.vehicles) {
        setVehicles(result.vehicles);
      } else {
        setError(result.error || "Could not search for vehicles.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuccess = (vrn: string) => {
    setLinkedVrns((prev) => new Set([...prev, vrn]));
    setVerifyingVrn(null);
  };

  const maskedMobile = mobile.length >= 10
    ? mobile.slice(0, -5).replace(/\d/g, "X") + mobile.slice(-5)
    : mobile;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerIcon}>🔍</div>
        <h1 style={s.title}>Vehicles Found</h1>
        <p style={s.subtitle}>
          We found the following vehicles associated with your mobile number{" "}
          <strong style={{ color: c.accent }}>{maskedMobile}</strong>.
          Verify ownership to permanently link them to your account.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader type="vehicle-card" count={3} />
      ) : error ? (
        <EmptyState
          icon="⚠️"
          title="Could Not Load Vehicles"
          subtitle={error}
          actionLabel="Try Again"
          onAction={loadDiscoveredVehicles}
        />
      ) : vehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title="No Vehicles Found"
          subtitle="No vehicles are linked to your mobile number in our records. You can add a vehicle manually or visit the workshop to get started."
          actionLabel="Continue to Dashboard"
          onAction={onComplete}
        />
      ) : (
        <>
          <div style={s.count}>
            <span style={s.countBadge}>{vehicles.length}</span>
            {vehicles.length === 1 ? " vehicle" : " vehicles"} found
          </div>

          <div style={s.vehicleList}>
            {vehicles.map((v) => {
              const isLinked = linkedVrns.has(v.vrn);
              return (
                <div key={v.vrn} style={{ ...s.vehicleCard, ...(isLinked ? s.vehicleCardLinked : {}) }}>
                  {/* Vehicle Header */}
                  <div style={s.cardHeader}>
                    <div style={s.vrnBadge}>{v.vrn}</div>
                    {isLinked && (
                      <div style={s.linkedBadge}>✅ Verified & Linked</div>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div style={s.vehicleInfo}>
                    <div style={s.vehicleModel}>
                      {v.vehicle_make} {v.vehicle_model}
                      {v.vehicle_year ? ` (${v.vehicle_year})` : ""}
                    </div>
                    <div style={s.vehicleMeta}>
                      <span>🔧 {v.total_visits} service visit{v.total_visits !== 1 ? "s" : ""}</span>
                      {v.last_service_date && (
                        <span>
                          📅 Last: {new Date(v.last_service_date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {!isLinked ? (
                    <button
                      style={s.verifyBtn}
                      onClick={() => setVerifyingVrn(v.vrn)}
                    >
                      🔒 Verify & Link This Vehicle
                    </button>
                  ) : (
                    <div style={s.linkedNote}>
                      This vehicle will now appear in your dashboard permanently.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div style={s.footer}>
            {linkedVrns.size > 0 ? (
              <button style={s.continueBtn} onClick={onComplete}>
                ✅ Continue to My Dashboard ({linkedVrns.size} vehicle{linkedVrns.size !== 1 ? "s" : ""} linked)
              </button>
            ) : (
              <button style={s.skipBtn} onClick={onComplete}>
                Skip for Now — I'll verify later
              </button>
            )}
          </div>
        </>
      )}

      {/* Ownership Verification Modal */}
      {verifyingVrn && (
        <OwnershipVerificationModal
          vrn={verifyingVrn}
          mobile={mobile}
          onSuccess={() => handleVerifySuccess(verifyingVrn)}
          onClose={() => setVerifyingVrn(null)}
        />
      )}
    </div>
  );
}

// ---- Styles ----
const c = {
  bg: "#fafaf9",
  surface: "#ffffff",
  primary: "#1e3a5f",
  accent: "#d4a844",
  text: "#1a1a2e",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  success: "#059669",
};

const s: Record<string, React.CSSProperties> = {
  page: { padding: "0 0 24px 0" },
  header: {
    textAlign: "center",
    padding: "24px 16px 20px",
    background: `linear-gradient(135deg, ${c.primary} 0%, #2d5a8e 100%)`,
    borderRadius: 16,
    marginBottom: 20,
    color: "#fff",
  },
  headerIcon: { fontSize: 40, marginBottom: 8 },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    margin: 0,
    lineHeight: 1.5,
  },
  count: {
    fontSize: 13,
    color: c.textSecondary,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  countBadge: {
    background: c.accent,
    color: c.primary,
    borderRadius: 12,
    padding: "1px 10px",
    fontWeight: 700,
    fontSize: 14,
  },
  vehicleList: { display: "flex", flexDirection: "column", gap: 12 },
  vehicleCard: {
    background: c.surface,
    borderRadius: 14,
    padding: 16,
    border: `1.5px solid ${c.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  vehicleCardLinked: {
    border: `1.5px solid ${c.success}`,
    background: "#f0fdf4",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  vrnBadge: {
    background: c.primary,
    color: "#fff",
    borderRadius: 8,
    padding: "4px 12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 1,
  },
  linkedBadge: {
    background: "#dcfce7",
    color: c.success,
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  vehicleInfo: { marginBottom: 12 },
  vehicleModel: {
    fontSize: 15,
    fontWeight: 600,
    color: c.text,
    marginBottom: 4,
  },
  vehicleMeta: {
    display: "flex",
    gap: 14,
    fontSize: 12,
    color: c.textSecondary,
    flexWrap: "wrap" as const,
  },
  verifyBtn: {
    width: "100%",
    padding: "12px",
    background: `linear-gradient(135deg, ${c.primary}, #2d5a8e)`,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.3,
  },
  linkedNote: {
    fontSize: 12,
    color: c.success,
    textAlign: "center" as const,
    fontWeight: 500,
  },
  footer: { marginTop: 20 },
  continueBtn: {
    width: "100%",
    padding: "14px",
    background: `linear-gradient(135deg, ${c.success}, #10b981)`,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  skipBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: c.textSecondary,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    fontSize: 13,
    cursor: "pointer",
  },
};
