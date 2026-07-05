// ==========================================
// Customer Portal — Login & Signup Page (OTP / Social)
// ==========================================

import React, { useState, useRef } from "react";
import { requestOtp, verifyOtp, signupCustomer } from "../hooks/useCustomerApi";

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  
  // Login States
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Signup States
  const [signupName, setSignupName] = useState("");
  const [signupMobile, setSignupMobile] = useState("");

  // Social Login Mock States
  const [socialModal, setSocialModal] = useState<"none" | "google" | "whatsapp">("none");
  const [socialStep, setSocialStep] = useState<"select" | "link">("select");
  const [selectedSocialName, setSelectedSocialName] = useState("");
  const [selectedSocialEmail, setSelectedSocialEmail] = useState("");
  const [linkMobile, setLinkMobile] = useState("");

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

  const handleMobileSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (signupName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (signupMobile.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const normalizedMobile = signupMobile.startsWith("+91") ? signupMobile : `+91${signupMobile.replace(/\D/g, "")}`;
      const result = await signupCustomer(signupName.trim(), normalizedMobile, "mobile");
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Registration failed.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (linkMobile.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number to link your profile.");
      return;
    }

    setLoading(true);
    try {
      const normalizedMobile = linkMobile.startsWith("+91") ? linkMobile : `+91${linkMobile.replace(/\D/g, "")}`;
      const result = await signupCustomer(selectedSocialName, normalizedMobile, socialModal);
      if (result.success) {
        setSocialModal("none");
        onSuccess();
      } else {
        setError(result.error || "Linking account failed.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const startGoogleSignup = (name: string, email: string) => {
    setSelectedSocialName(name);
    setSelectedSocialEmail(email);
    setSocialStep("link");
  };

  const startWhatsAppSignup = () => {
    setSelectedSocialName("WhatsApp User");
    setSocialStep("link");
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

        {/* Tab Row (Only when in initial step) */}
        {step === "mobile" && (
          <div style={s.tabRow}>
            <button
              onClick={() => { setActiveTab("login"); setError(""); }}
              style={{
                ...s.tab,
                ...(activeTab === "login" ? s.activeTab : {}),
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab("signup"); setError(""); }}
              style={{
                ...s.tab,
                ...(activeTab === "signup" ? s.activeTab : {}),
              }}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Login Mode */}
        {activeTab === "login" ? (
          step === "mobile" ? (
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

              {/* Social Logins */}
              <div style={s.socialGroup}>
                <div style={s.dividerContainer}>
                  <span style={s.dividerText}>or continue with</span>
                </div>
                
                <button 
                  onClick={() => { setSocialModal("google"); setSocialStep("select"); setError(""); }} 
                  style={s.googleBtn}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Google Account</span>
                </button>

                <button 
                  onClick={() => { setSocialModal("whatsapp"); setSocialStep("select"); setError(""); }} 
                  style={s.whatsappBtn}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965-1.862-1.863-4.334-2.888-6.966-2.889-5.442 0-9.87 4.372-9.875 9.8.002 1.8.497 3.554 1.436 5.097l-.993 3.626 3.7-.971zm11.237-7.303c-.3-.15-1.772-.875-2.046-.975-.276-.1-.477-.15-.677.15-.2.3-.777.975-.951 1.174-.175.2-.35.226-.65.076-.3-.15-1.267-.467-2.414-1.492-.893-.797-1.496-1.782-1.672-2.082-.176-.3-.019-.462.13-.611.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.677-1.633-.927-2.232-.243-.585-.49-.506-.677-.516-.174-.008-.375-.01-.576-.01-.2 0-.527.075-.803.375-.276.3-1.053 1.025-1.053 2.5 0 1.475 1.077 2.9 1.227 3.1.15.2 2.118 3.235 5.132 4.537.717.31 1.277.494 1.713.633.72.228 1.376.196 1.894.118.577-.087 1.772-.725 2.022-1.425.25-.7.25-1.3 0-1.425-.075-.125-.275-.2-.575-.35z"/>
                  </svg>
                  <span>WhatsApp Account</span>
                </button>
              </div>
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
          )
        ) : (
          /* Signup Mode */
          <form onSubmit={handleMobileSignup} style={s.form}>
            <div style={s.inputGroup}>
              <label style={s.label}>Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                style={s.textInput}
                required
                autoFocus
              />
            </div>

            <div style={s.inputGroup}>
              <label style={s.label}>Mobile Number</label>
              <div style={s.phoneInput}>
                <span style={s.phonePrefix}>+91</span>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={signupMobile}
                  onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={s.input}
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...s.button,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Registering..." : "Register & Sign Up"}
            </button>

            <p style={s.hint}>
              Registering will immediately create your profile. You can configure vehicles and faults inside.
            </p>

            {/* Social Signups */}
            <div style={s.socialGroup}>
              <div style={s.dividerContainer}>
                <span style={s.dividerText}>or sign up with</span>
              </div>
              
              <button 
                type="button"
                onClick={() => { setSocialModal("google"); setSocialStep("select"); setError(""); }} 
                style={s.googleBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google Account</span>
              </button>

              <button 
                type="button"
                onClick={() => { setSocialModal("whatsapp"); setSocialStep("select"); setError(""); }} 
                style={s.whatsappBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965-1.862-1.863-4.334-2.888-6.966-2.889-5.442 0-9.87 4.372-9.875 9.8.002 1.8.497 3.554 1.436 5.097l-.993 3.626 3.7-.971zm11.237-7.303c-.3-.15-1.772-.875-2.046-.975-.276-.1-.477-.15-.677.15-.2.3-.777.975-.951 1.174-.175.2-.35.226-.65.076-.3-.15-1.267-.467-2.414-1.492-.893-.797-1.496-1.782-1.672-2.082-.176-.3-.019-.462.13-.611.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.677-1.633-.927-2.232-.243-.585-.49-.506-.677-.516-.174-.008-.375-.01-.576-.01-.2 0-.527.075-.803.375-.276.3-1.053 1.025-1.053 2.5 0 1.475 1.077 2.9 1.227 3.1.15.2 2.118 3.235 5.132 4.537.717.31 1.277.494 1.713.633.72.228 1.376.196 1.894.118.577-.087 1.772-.725 2.022-1.425.25-.7.25-1.3 0-1.425-.075-.125-.275-.2-.575-.35z"/>
                </svg>
                <span>WhatsApp Account</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ======================================= */}
      {/* SOCIAL FLOW OVERLAY MODALS (SIMULATED) */}
      {/* ======================================= */}
      {socialModal !== "none" && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>
                {socialModal === "google" ? "Sign in with Google" : "Link WhatsApp Profile"}
              </h3>
              <button onClick={() => setSocialModal("none")} style={s.closeBtn}>✕</button>
            </div>

            {socialModal === "google" && socialStep === "select" && (
              <div style={s.modalBody}>
                <p style={s.modalDesc}>Select an account to continue to Devanand Motors:</p>
                <div style={s.googleAccountList}>
                  <div 
                    onClick={() => startGoogleSignup("Jaffer Jaffer", "jaffer@gmail.com")}
                    style={s.googleAccountItem}
                  >
                    <div style={s.avatar}>JJ</div>
                    <div>
                      <div style={s.accountName}>Jaffer Jaffer</div>
                      <div style={s.accountEmail}>jaffer@gmail.com</div>
                    </div>
                  </div>
                  <div 
                    onClick={() => startGoogleSignup("Sayeed Jaffer", "sayeed.jaffer@devanand.com")}
                    style={s.googleAccountItem}
                  >
                    <div style={s.avatar}>SJ</div>
                    <div>
                      <div style={s.accountName}>Sayeed Jaffer</div>
                      <div style={s.accountEmail}>sayeed.jaffer@devanand.com</div>
                    </div>
                  </div>
                  <div 
                    onClick={() => startGoogleSignup("Guest User", "guest.user@gmail.com")}
                    style={s.googleAccountItem}
                  >
                    <div style={s.avatar}>GU</div>
                    <div>
                      <div style={s.accountName}>Guest User</div>
                      <div style={s.accountEmail}>guest.user@gmail.com</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {socialModal === "whatsapp" && socialStep === "select" && (
              <div style={s.modalBody}>
                <div style={s.qrSection}>
                  <div style={s.qrBox}>
                    {/* Simulated QR Code matrix */}
                    <div style={s.qrGrid}>
                      {[...Array(64)].map((_, i) => (
                        <div 
                          key={i} 
                          style={{
                            background: (i % 2 === 0 && i % 3 === 0) || (i > 16 && i < 28) || i === 0 || i === 7 || i === 56 || i === 63 ? "#000000" : "#ffffff",
                            width: "100%",
                            height: "100%"
                          }} 
                        />
                      ))}
                    </div>
                  </div>
                  <p style={s.qrText}>
                    Scan this QR code using your WhatsApp Web scanner to sync instantly, or click below to link your mobile number directly.
                  </p>
                  <button 
                    onClick={startWhatsAppSignup}
                    style={s.linkOptionBtn}
                  >
                    Link with Mobile Number Instead
                  </button>
                </div>
              </div>
            )}

            {socialStep === "link" && (
              <form onSubmit={handleSocialLinkSubmit} style={s.modalBody}>
                <p style={s.modalDesc}>
                  Enter your mobile number to link your <strong>{socialModal === "google" ? "Google Account" : "WhatsApp"}</strong> profile:
                </p>

                <div style={s.inputGroup}>
                  <label style={s.label}>Mobile Number</label>
                  <div style={s.phoneInput}>
                    <span style={s.phonePrefix}>+91</span>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={linkMobile}
                      onChange={(e) => setLinkMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      style={s.input}
                      maxLength={10}
                      inputMode="numeric"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p style={s.error}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  style={s.button}
                >
                  {loading ? "Linking Profile..." : "Confirm & Link Account"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
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
    borderRadius: 24,
    padding: "36px 28px",
    width: "100%",
    maxWidth: 380,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
  },
  logoWrap: {
    textAlign: "center",
    marginBottom: 20,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "linear-gradient(135deg, #d4a844, #c49536)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    boxShadow: "0 4px 14px rgba(212,168,68,0.3)",
  },
  logoLetter: {
    color: "#1e3a5f",
    fontSize: 26,
    fontWeight: 800,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: "#1e3a5f",
    letterSpacing: 2,
    margin: "0 0 2px",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 500,
    margin: 0,
  },
  tabRow: {
    display: "flex",
    borderBottom: "2px solid #f1f5f9",
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    padding: "10px 0",
    textAlign: "center",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    outline: "none",
    transition: "all 0.2s",
  },
  activeTab: {
    color: "#1e3a5f",
    borderBottom: "3px solid #1e3a5f",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  inputGroup: {
    marginBottom: 16,
    textAlign: "left",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #d1d5db",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    background: "transparent",
    color: "#1e3a5f",
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
    background: "#f8fafc",
    color: "#475569",
    fontWeight: 700,
    fontSize: 14,
    borderRight: "2px solid #d1d5db",
  },
  input: {
    flex: 1,
    padding: "12px 14px",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    background: "transparent",
    color: "#1e3a5f",
    letterSpacing: 0.5,
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #1e3a5f, #2d5a8e)",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
    boxShadow: "0 4px 14px rgba(30,58,95,0.25)",
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
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 10,
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
    width: 42,
    height: 48,
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
    border: "2px solid #d1d5db",
    borderRadius: 10,
    outline: "none",
    transition: "border-color 0.2s",
    color: "#1e3a5f",
  },
  socialGroup: {
    marginTop: 20,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  dividerContainer: {
    textAlign: "center",
    margin: "-8px 0 10px",
    background: "#ffffff",
    display: "inline-block",
    alignSelf: "center",
    padding: "0 10px",
  },
  dividerText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 650,
    textTransform: "uppercase",
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "11px",
    background: "#ffffff",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  whatsappBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "11px",
    background: "#25d366",
    border: "none",
    borderRadius: 12,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 750,
    cursor: "pointer",
    transition: "opacity 0.2s",
    boxShadow: "0 2px 4px rgba(37,211,102,0.2)",
  },

  // Modal Overlays
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
  },
  modalCard: {
    background: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 360,
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#1e3a5f",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "left",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
    lineHeight: 1,
  },
  modalBody: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  modalDesc: {
    fontSize: 12,
    color: "#475569",
    margin: 0,
    textAlign: "left",
    lineHeight: 1.5,
  },
  googleAccountList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  googleAccountItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    border: "2px solid #f1f5f9",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  accountName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e3a5f",
  },
  accountEmail: {
    fontSize: 10,
    color: "#64748b",
  },
  qrSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  qrBox: {
    width: 140,
    height: 140,
    padding: 10,
    background: "#ffffff",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    boxSizing: "border-box",
  },
  qrGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: 2,
    width: "100%",
    height: "100%",
  },
  qrText: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 1.4,
    textAlign: "center",
    margin: 0,
  },
  linkOptionBtn: {
    width: "100%",
    padding: "10px",
    background: "none",
    border: "2px solid #25d366",
    color: "#25d366",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 750,
    cursor: "pointer",
    marginTop: 6,
  },
};
