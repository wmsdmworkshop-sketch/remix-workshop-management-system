// ==========================================
// Customer Portal — Login Page (OTP Flow)
// ==========================================

import React, { useState, useRef } from "react";
import { requestOtp, verifyOtp } from "../hooks/useCustomerApi";

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleRequestOtp = async () => {
    setError("");
    if (mobile.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const normalizedMobile = mobile.startsWith("+91") ? mobile : `+91${mobile.replace(/\D/g, "")}`;
      const result = await requestOtp(normalizedMobile);
      if (result.success) {
        setStep("otp");
      } else {
        setError(result.error || "Failed to send OTP.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const normalizedMobile = mobile.startsWith("+91") ? mobile : `+91${mobile.replace(/\D/g, "")}`;
      const result = await verifyOtp(normalizedMobile, otpString);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Invalid OTP.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            <span style={s.logoLetter}>D</span>
          </div>
          <h1 style={s.title}>DWIP</h1>
          <p style={s.subtitle}>Devanand Motors Customer Portal</p>
        </div>

        {step === "mobile" ? (
          <>
            <div style={s.inputGroup}>
              <label style={s.label}>Mobile Number</label>
              <div style={s.phoneInput}>
                <span style={s.phonePrefix}>+91</span>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile.replace(/^\+91/, "")}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={s.input}
                  maxLength={10}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button
              onClick={handleRequestOtp}
              disabled={loading}
              style={{
                ...s.button,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Sending OTP..." : "Get OTP"}
            </button>

            <p style={s.hint}>
              We'll send a 6-digit verification code to your mobile number.
            </p>
          </>
        ) : (
          <>
            <p style={s.otpInfo}>
              Enter the OTP sent to <strong>+91 {mobile.replace(/^\+91/, "")}</strong>
            </p>

            <div style={s.otpRow}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  style={{
                    ...s.otpBox,
                    borderColor: digit ? "#1e3a5f" : "#d1d5db",
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading}
              style={{
                ...s.button,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>

            <button
              onClick={() => { setStep("mobile"); setOtp(["", "", "", "", "", ""]); setError(""); }}
              style={s.linkButton}
            >
              ← Change number
            </button>

            <p style={s.hint}>OTP expires in 15 minutes. For demo, use: 123456</p>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #1e3a5f 0%, #0f1f33 100%)",
    padding: 20,
    boxSizing: "border-box",
  },
  card: {
    background: "#ffffff",
    borderRadius: 20,
    padding: "36px 28px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  logoWrap: {
    textAlign: "center",
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: "linear-gradient(135deg, #d4a844, #c49536)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    boxShadow: "0 4px 14px rgba(212,168,68,0.3)",
  },
  logoLetter: {
    color: "#1e3a5f",
    fontSize: 28,
    fontWeight: 800,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1e3a5f",
    letterSpacing: 2,
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
    margin: 0,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  phoneInput: {
    display: "flex",
    alignItems: "center",
    border: "2px solid #d1d5db",
    borderRadius: 12,
    overflow: "hidden",
    transition: "border-color 0.2s",
  },
  phonePrefix: {
    padding: "12px 12px",
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: 600,
    fontSize: 15,
    borderRight: "1px solid #d1d5db",
  },
  input: {
    flex: 1,
    padding: "12px 14px",
    border: "none",
    fontSize: 16,
    fontWeight: 500,
    outline: "none",
    background: "transparent",
    letterSpacing: 1,
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
    boxShadow: "0 4px 14px rgba(30,58,95,0.3)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  linkButton: {
    display: "block",
    width: "100%",
    textAlign: "center",
    background: "none",
    border: "none",
    color: "#2d5a8e",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
    padding: 6,
  },
  error: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
    textAlign: "center",
  },
  hint: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 1.4,
  },
  otpInfo: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 1.5,
  },
  otpRow: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  otpBox: {
    width: 44,
    height: 52,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    border: "2px solid #d1d5db",
    borderRadius: 10,
    outline: "none",
    transition: "border-color 0.2s",
    color: "#1e3a5f",
  },
};
