import React, { useState, useRef, useEffect } from "react";
import { 
  Wrench, 
  User as UserIcon, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ArrowLeft
} from "lucide-react";
import { User } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (user: User, token: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // OTP State
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMobile, setOtpMobile] = useState("");
  const [otpUsername, setOtpUsername] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Forgot Password State
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"none" | "request" | "verify">("none");
  const [resetMobile, setResetMobile] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");


  useEffect(() => {
    if (otpStep && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Please try again.");
      }

      // Check if server returned a JWT directly (new flow)
      if (data.token && data.user) {
        onAuthSuccess(data.user, data.token);
        return;
      }

      // Server returned OTP required (old flow) — show OTP input
      if (data.otpRequired) {
        setOtpStep(true);
        setOtpUsername(data.username || username.trim());
        setOtpMobile(data.mobile || "");
        return;
      }

      // Unexpected response
      throw new Error("Unexpected server response. Please try again.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.length < 4) {
      setError("Please enter a valid OTP code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: otpUsername, otp: otpCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "OTP verification failed. Please try again.");
      }

      if (data.token && data.user) {
        onAuthSuccess(data.user, data.token);
      } else {
        throw new Error("Invalid response from OTP verification.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setOtpStep(false);
    setOtpCode("");
    setOtpMobile("");
    setOtpUsername("");
    setForgotPasswordStep("none");
    setResetMobile("");
    setResetOtp("");
    setNewPassword("");
    setError(null);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!resetMobile) {
      setError("Please enter your registered mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_no: resetMobile })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request OTP.");
      setForgotPasswordStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!resetOtp || !newPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile_no: resetMobile, otp: resetOtp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");
      alert("Password reset successfully. You can now login with your new password.");
      handleBackToLogin();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-orange-500/20">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">WMS Workshop</h1>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest leading-none">Management & Sync System</p>
          </div>
        </div>
        
        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-slate-100">
          {forgotPasswordStep !== "none" ? "Reset Password" : otpStep ? "OTP Verification" : "Sign in to your account"}
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          {forgotPasswordStep === "request" 
            ? "Enter your authorized mobile number to receive an OTP"
            : forgotPasswordStep === "verify" 
              ? `Enter the OTP sent to your registered mobile (****${resetMobile.slice(-4)})`
              : otpStep 
                ? `Enter the OTP sent to your registered mobile${otpMobile ? ` (****${otpMobile.slice(-4)})` : ""}`
                : "Enter your operator username and password below"
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-800 py-8 px-4 shadow-xl rounded-2xl border border-slate-700/50 sm:px-10">
          
          {/* Error Banner */}
          {error && (
            <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs animate-shake mb-6">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!otpStep && forgotPasswordStep === "none" ? (
            /* ======= LOGIN FORM ======= */
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Username
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                    placeholder="e.g. developer"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-400 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordStep("request")}
                    className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="login-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/15 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <FunnySpinner className="h-4 w-4" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : forgotPasswordStep === "request" ? (
            /* ======= FORGOT PASSWORD REQUEST FORM ======= */
            <form className="space-y-6" onSubmit={handleResetRequest}>
              <div>
                <label htmlFor="resetMobile" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Authorized Mobile No
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="resetMobile"
                    name="resetMobile"
                    type="text"
                    required
                    value={resetMobile}
                    onChange={(e) => setResetMobile(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-orange-500/15 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <><FunnySpinner className="h-4 w-4" /><span>Sending OTP...</span></>
                  ) : (
                    <><span>Send Reset OTP</span><ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  disabled={loading}
                  className="w-full py-3 px-4 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : forgotPasswordStep === "verify" ? (
            /* ======= FORGOT PASSWORD VERIFY FORM ======= */
            <form className="space-y-6" onSubmit={handleResetVerify}>
              <div>
                <label htmlFor="resetOtp" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enter OTP Code
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <input
                    id="resetOtp"
                    name="resetOtp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium tracking-[0.5em] text-center text-lg"
                    placeholder="• • • • • •"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  New Password
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-400 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={loading || resetOtp.length < 6}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/15 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <><FunnySpinner className="h-4 w-4" /><span>Resetting...</span></>
                  ) : (
                    <><ShieldCheck className="h-4 w-4" /><span>Reset Password</span></>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  disabled={loading}
                  className="w-full py-3 px-4 border border-slate-600 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* ======= OTP VERIFICATION FORM ======= */
            <form className="space-y-6" onSubmit={handleOtpVerify}>
              <div className="flex items-center justify-center mb-2">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="h-7 w-7 text-emerald-400" />
                </div>
              </div>

              <div>
                <label htmlFor="otp" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enter OTP Code
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <input
                    ref={otpInputRef}
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium tracking-[0.5em] text-center text-lg"
                    placeholder="• • • • • •"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500 text-center">
                  Check server console for OTP code (SMS integration pending)
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  id="verify-otp-btn"
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-emerald-500/15 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <FunnySpinner className="h-4 w-4" />
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verify & Sign In</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 focus:outline-none transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Help Section — only show on login step */}
          {!otpStep && (
            <div className="mt-6 pt-5 border-t border-slate-700/50 flex flex-col items-center">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 font-medium focus:outline-none"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Need help logging in?</span>
              </button>

              {showHelp && (
                <div className="mt-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/40 w-full text-slate-400 space-y-2 text-[11px] leading-relaxed">
                  <p className="font-semibold text-slate-300">Default Demo Credentials:</p>
                  <div className="grid grid-cols-2 gap-2 text-slate-400">
                    <div className="p-2 bg-slate-900/80 rounded-lg">
                      <p className="font-bold text-orange-400 uppercase tracking-widest text-[9px]">Developer</p>
                      <p className="mt-1">User: <strong className="text-white">developer</strong></p>
                      <p>Pass: <strong className="text-white">Dev@DWIP2026</strong></p>
                    </div>
                    <div className="p-2 bg-slate-900/80 rounded-lg">
                      <p className="font-bold text-indigo-400 uppercase tracking-widest text-[9px]">Admin</p>
                      <p className="mt-1">User: <strong className="text-white">admin</strong></p>
                      <p>Pass: <strong className="text-white">Admin@DWIP2026</strong></p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
