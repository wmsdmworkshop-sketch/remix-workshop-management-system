// ============================================================
// Customer Portal V2 — Ownership Verification Modal
// ============================================================
// Step-by-step vehicle ownership verification.
// 5 methods: OTP reuse | Last 6 chassis | Invoice No. | JC No. | Manual Admin
// Only VERIFIED vehicles are permanently linked to the portal user account.

import React, { useState } from "react";
import { verifyVehicleOwnership } from "../hooks/useCustomerApi";

type VerificationMethod = "otp" | "chassis_last6" | "invoice_no" | "job_card_no" | "manual_admin";

interface OwnershipVerificationModalProps {
  vrn: string;
  mobile: string;
  onSuccess: (vrn: string) => void;
  onClose: () => void;
}

const METHODS: { id: VerificationMethod; label: string; icon: string; desc: string; placeholder: string }[] = [
  {
    id: "otp",
    label: "Mobile OTP",
    icon: "📱",
    desc: "Receive a 6-digit OTP on your registered mobile number",
    placeholder: "Enter 6-digit OTP",
  },
  {
    id: "chassis_last6",
    label: "Last 6 Digits of Chassis",
    icon: "🔢",
    desc: "Enter the last 6 characters of the Vehicle Chassis Number (from your RC or windshield)",
    placeholder: "e.g. AB1234",
  },
  {
    id: "invoice_no",
    label: "Invoice Number",
    icon: "🧾",
    desc: "Enter any past Invoice Number from Devanand Automobiles for this vehicle",
    placeholder: "e.g. INV-2024-0045",
  },
  {
    id: "job_card_no",
    label: "Job Card Number",
    icon: "📋",
    desc: "Enter any past Job Card Number issued for this vehicle",
    placeholder: "e.g. JC-2024-0123",
  },
  {
    id: "manual_admin",
    label: "Request Manual Verification",
    icon: "👤",
    desc: "Our team will verify your ownership within 24 hours after a manual review",
    placeholder: "Optional: Add a note for our team",
  },
];

export function OwnershipVerificationModal({ vrn, mobile, onSuccess, onClose }: OwnershipVerificationModalProps) {
  const [step, setStep] = useState<"method" | "verify" | "success" | "pending">("method");
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSelectMethod = (method: VerificationMethod) => {
    setSelectedMethod(method);
    setError("");
    setValue("");
    setStep("verify");
  };

  const handleVerify = async () => {
    if (!selectedMethod) return;
    if (selectedMethod !== "manual_admin" && value.trim().length < 2) {
      setError("Please enter a valid value.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await verifyVehicleOwnership(vrn, selectedMethod, value.trim());
      if (result.success) {
        if (selectedMethod === "manual_admin") {
          setStep("pending");
        } else {
          setStep("success");
          setTimeout(() => onSuccess(vrn), 1500);
        }
      } else {
        setError(result.error || "Verification failed. Please check your input and try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedMethodInfo = METHODS.find((m) => m.id === selectedMethod);

  return (
    <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        {/* Handle bar */}
        <div style={s.handle} />

        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>Verify Vehicle Ownership</h2>
          <div style={s.vrnChip}>{vrn}</div>
        </div>

        {/* ---- Step: Choose Method ---- */}
        {step === "method" && (
          <>
            <p style={s.subtitle}>Choose how you'd like to prove ownership of this vehicle:</p>
            <div style={s.methodList}>
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  style={s.methodBtn}
                  onClick={() => handleSelectMethod(m.id)}
                >
                  <span style={s.methodIcon}>{m.icon}</span>
                  <div style={s.methodText}>
                    <div style={s.methodLabel}>{m.label}</div>
                    <div style={s.methodDesc}>{m.desc}</div>
                  </div>
                  <span style={s.arrow}>›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ---- Step: Enter Value ---- */}
        {step === "verify" && selectedMethodInfo && (
          <>
            <button style={s.backBtn} onClick={() => { setStep("method"); setError(""); }}>
              ← Back
            </button>
            <div style={s.methodSelectedHeader}>
              <span style={s.methodSelectedIcon}>{selectedMethodInfo.icon}</span>
              <div>
                <div style={s.methodSelectedLabel}>{selectedMethodInfo.label}</div>
                <div style={s.methodSelectedDesc}>{selectedMethodInfo.desc}</div>
              </div>
            </div>

            <div style={s.inputGroup}>
              <input
                style={s.input}
                type={selectedMethodInfo.id === "otp" ? "number" : "text"}
                placeholder={selectedMethodInfo.placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={selectedMethodInfo.id === "otp" ? 6 : 100}
                autoFocus
              />
              {error && <div style={s.errorMsg}>⚠️ {error}</div>}
            </div>

            <button
              style={{ ...s.verifyBtn, opacity: loading ? 0.7 : 1 }}
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? "Verifying…" : (
                selectedMethodInfo.id === "manual_admin" ? "Submit for Manual Review" : "Verify Ownership"
              )}
            </button>
          </>
        )}

        {/* ---- Step: Success ---- */}
        {step === "success" && (
          <div style={s.resultBox}>
            <div style={s.resultIcon}>✅</div>
            <h3 style={s.resultTitle}>Vehicle Verified!</h3>
            <p style={s.resultSubtitle}>
              <strong>{vrn}</strong> has been linked to your account. It will now appear in your dashboard permanently.
            </p>
          </div>
        )}

        {/* ---- Step: Manual Pending ---- */}
        {step === "pending" && (
          <div style={s.resultBox}>
            <div style={s.resultIcon}>⏳</div>
            <h3 style={s.resultTitle}>Request Submitted</h3>
            <p style={s.resultSubtitle}>
              Our team will review your request and link <strong>{vrn}</strong> to your account within 24 hours.
              You'll receive an SMS confirmation once done.
            </p>
            <button style={s.doneBtn} onClick={onClose}>Done</button>
          </div>
        )}

        {/* Cancel */}
        {(step === "method" || step === "verify") && (
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
        )}
      </div>
    </div>
  );
}

// ---- Styles ----
const c = {
  primary: "#1e3a5f",
  accent: "#d4a844",
  text: "#1a1a2e",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  success: "#059669",
  danger: "#dc2626",
  bg: "#f8fafc",
};

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#ffffff",
    borderRadius: "20px 20px 0 0",
    padding: "16px 20px 32px",
    width: "100%",
    maxWidth: 560,
    maxHeight: "88vh",
    overflowY: "auto",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
  },
  handle: {
    width: 40, height: 4,
    background: "#e2e8f0",
    borderRadius: 2,
    margin: "0 auto 16px",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 18, fontWeight: 700, color: c.primary, margin: 0,
  },
  vrnChip: {
    background: c.primary, color: "#fff",
    borderRadius: 8, padding: "4px 12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13, fontWeight: 700,
  },
  subtitle: { fontSize: 13, color: c.textSecondary, margin: "0 0 16px" },
  methodList: { display: "flex", flexDirection: "column", gap: 8 },
  methodBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 12px",
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 12,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    transition: "background 0.15s",
  },
  methodIcon: { fontSize: 24, flexShrink: 0 },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 14, fontWeight: 600, color: c.text, marginBottom: 2 },
  methodDesc: { fontSize: 12, color: c.textSecondary, lineHeight: 1.4 },
  arrow: { fontSize: 20, color: c.textSecondary, flexShrink: 0 },
  backBtn: {
    background: "none", border: "none", color: c.primary,
    fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "0 0 12px", display: "block",
  },
  methodSelectedHeader: {
    display: "flex", gap: 12, alignItems: "flex-start",
    background: "#f0f7ff", borderRadius: 12, padding: 12, marginBottom: 16,
  },
  methodSelectedIcon: { fontSize: 28, flexShrink: 0 },
  methodSelectedLabel: { fontSize: 14, fontWeight: 600, color: c.primary, marginBottom: 4 },
  methodSelectedDesc: { fontSize: 12, color: c.textSecondary, lineHeight: 1.4 },
  inputGroup: { marginBottom: 16 },
  input: {
    width: "100%", boxSizing: "border-box" as const,
    padding: "14px 16px",
    border: `1.5px solid ${c.border}`,
    borderRadius: 10,
    fontSize: 16,
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    letterSpacing: 1,
  },
  errorMsg: {
    marginTop: 8, fontSize: 13, color: c.danger,
    background: "#fff5f5", borderRadius: 8, padding: "8px 12px",
  },
  verifyBtn: {
    width: "100%", padding: "14px",
    background: `linear-gradient(135deg, ${c.primary}, #2d5a8e)`,
    color: "#fff", border: "none", borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: "pointer",
    marginBottom: 8,
  },
  cancelBtn: {
    width: "100%", padding: "12px",
    background: "transparent",
    color: c.textSecondary,
    border: `1px solid ${c.border}`,
    borderRadius: 10, fontSize: 13, cursor: "pointer",
    marginTop: 8,
  },
  resultBox: { textAlign: "center" as const, padding: "20px 0 8px" },
  resultIcon: { fontSize: 56, marginBottom: 12 },
  resultTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20, fontWeight: 700, color: c.text, margin: "0 0 8px",
  },
  resultSubtitle: { fontSize: 14, color: c.textSecondary, lineHeight: 1.6 },
  doneBtn: {
    marginTop: 16, padding: "12px 32px",
    background: c.success, color: "#fff",
    border: "none", borderRadius: 10,
    fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
};
