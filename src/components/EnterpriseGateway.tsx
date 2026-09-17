/**
 * =============================================================================
 * DWIP Enterprise — Enterprise Operations Gateway (the sign-in screen)
 * Modes: Operator Login | Administrator Health Console
 * =============================================================================
 *
 * WHY THERE IS NO "DEVELOPER CONSOLE" TAB ANY MORE — removed 2026-09-17
 *
 * It was a "Developer Recovery Console & AI Doctor Engine": three AI Doctor
 * cards and a "Developer Login Unlock", each wired to an endpoint that DOES
 * NOT EXIST anywhere in this repository:
 *
 *   POST /api/system/ai-doctor/login
 *   POST /api/system/ai-doctor/ui
 *   POST /api/system/ai-doctor/deployment
 *   POST /api/system/auth-recovery/unlock
 *
 * Grep for `ai-doctor` / `auth-recovery` returns no router, mounted or
 * otherwise — the only hits were the four fetch() calls that used to live in
 * this file. Those paths are also absent from PUBLIC_API_PATHS in server.ts, so
 * the global JWT gate answered 401 first, and this component caught that and
 * rendered it as a DIAGNOSTIC VERDICT — `{overallHealth: 'CRITICAL'}` or
 * "Unlock action failed" — so a feature that was never built PRESENTED AS A
 * FAILED CHECK. That is the worst possible failure mode for a diagnostics tool.
 *
 * It could not have worked as designed either: its stated purpose is rescuing a
 * LOCKED-OUT account, but the request carried no credential, so the auth gate
 * would have refused it even if the route existed.
 *
 * This is the same defect class AGENTS.md already pruned twice on 2026-09-06 —
 * `OperationsCommandCenter.tsx` and `DevOpsDashboard.tsx`, both removed for
 * "calling API endpoints that don't exist". This instance survived that sweep
 * because it lives on the login page, which nobody re-audited.
 *
 * DO NOT RE-ADD a control here until its endpoint exists and is covered by a
 * test. This screen is served to anyone, unauthenticated, at any app path.
 *
 * The THEME ENGINE was NOT dead and was kept — it moved into Administrator Mode
 * below. It is client-side only: applyTheme() sets the theme class on <html> and
 * persists the choice in localStorage, so no server call is involved.
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Lock, 
  Eye, 
  EyeOff, 
  Palette, 
  RefreshCw, 
  AlertCircle, 
  UserCheck
} from 'lucide-react';
import { THEME_CONFIGS, ThemeName, applyTheme, getStoredTheme, inspectFontStack } from '../services/themeEngine';
import { PlayQr, PLAY_URL } from './PlayStoreQr';

interface EnterpriseGatewayProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const EnterpriseGateway: React.FC<EnterpriseGatewayProps> = ({ onLoginSuccess }) => {
  // Navigation Tabs: 'operator' | 'administrator' | 'developer'
  const [activeTab, setActiveTab] = useState<'operator' | 'administrator'>('operator');

  // Operator Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Theme & Typography State
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('enterprise-dark');
  const [fontMetrics, setFontMetrics] = useState<any>(null);

  // Administrator & Health Gateway Data
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Forced password change (first login on a default account). The temp
  // password just used to log in is held in `password` above and reused as
  // current_password — never persisted, never sent anywhere else.
  const [pendingLogin, setPendingLogin] = useState<{ token: string; user: any } | null>(null);
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');
  const [forceChangeLoading, setForceChangeLoading] = useState(false);
  const [forceChangeError, setForceChangeError] = useState<string | null>(null);

  // Initial Load & Keyboard Listeners
  useEffect(() => {
    const savedTheme = getStoredTheme();
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
    setFontMetrics(inspectFontStack());
    fetchSystemHealth();
  }, []);

  const handleThemeChange = (newTheme: ThemeName) => {
    setCurrentTheme(newTheme);
    applyTheme(newTheme);
  };

  const fetchSystemHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/system/health-gateway');
      const data = await res.json();
      if (data && (data.success || data.status === 'ok' || data.buildInfo)) {
        setHealthData(data);
      }
    } catch (err) {
      console.error('Failed to fetch health gateway data:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setLoginError('Please enter both identifier and password.');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password })
      });
      const data = await res.json();

      if (res.ok && data.token && data.user) {
        if (data.user.must_change_password) {
          // Hold the session in memory only — nothing persisted to storage
          // and no app access until a real password replaces the temp one.
          setPendingLogin({ token: data.token, user: data.user });
          return;
        }
        if (rememberMe) {
          localStorage.setItem('dwip_auth_token', data.token);
          localStorage.setItem('dwip_auth_user', JSON.stringify(data.user));
        } else {
          sessionStorage.setItem('dwip_auth_token', data.token);
          sessionStorage.setItem('dwip_auth_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.token, data.user);
      } else {
        setLoginError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      // Was: "...AI Login Doctor available for diagnostics." — that console was
      // removed (see the header note), so the message pointed the operator at a
      // panel that no longer exists on this screen. State the fact, offer the only
      // action that actually exists (try again), and name who to call if it persists.
      setLoginError(
        'Could not reach the server. Check this device\'s network connection and try again — ' +
        'if it still fails, tell the workshop IT/administrator that sign-in is not responding.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForceChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingLogin) return;
    setForceChangeError(null);
    if (forceNewPassword.length < 8) {
      setForceChangeError('New password must be at least 8 characters.');
      return;
    }
    if (forceNewPassword !== forceConfirmPassword) {
      setForceChangeError('Passwords do not match.');
      return;
    }
    if (forceNewPassword === password) {
      setForceChangeError('New password must be different from the temporary one.');
      return;
    }
    setForceChangeLoading(true);
    try {
      const res = await fetch('/api/my-profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pendingLogin.token}` },
        body: JSON.stringify({ current_password: password, new_password: forceNewPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedUser = { ...pendingLogin.user, must_change_password: false };
        if (rememberMe) {
          localStorage.setItem('dwip_auth_token', pendingLogin.token);
          localStorage.setItem('dwip_auth_user', JSON.stringify(updatedUser));
        } else {
          sessionStorage.setItem('dwip_auth_token', pendingLogin.token);
          sessionStorage.setItem('dwip_auth_user', JSON.stringify(updatedUser));
        }
        onLoginSuccess(pendingLogin.token, updatedUser);
      } else {
        setForceChangeError(data.error || 'Failed to change password.');
      }
    } catch (err: any) {
      setForceChangeError('Network error while changing password.');
    } finally {
      setForceChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* ── GATEWAY TOP NAVBAR ── */}
      <header className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-950/40">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              DWIP ENTERPRISE
              {/* Read from /api/health, not hardcoded. This badge said
                  v1.1.0-rc.1 through every release since, contradicting the
                  revision shown in the footer of the same page. While the
                  health check is in flight it shows nothing rather than a
                  stale or invented version. */}
              {healthData?.buildInfo?.version && (
                <span className="text-xs px-2 py-0.5 rounded bg-orange-600/30 text-orange-400 font-bold border border-orange-500/30">
                  {healthData.buildInfo.version}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Operations & Diagnostics Gateway</p>
          </div>
        </div>

        {/* MODE SWITCH TABS */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('operator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'operator' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Operator Mode
          </button>
          <button
            onClick={() => { setActiveTab('administrator'); fetchSystemHealth(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'administrator' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Administrator Mode
          </button>
        </div>
      </header>

      {/* ── GATEWAY CONTENT BODY ── */}
      <main className="w-full max-w-6xl mx-auto my-6 flex-1 flex flex-col justify-center">
        {pendingLogin ? (
          <div className="max-w-md mx-auto w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="space-y-1 text-center">
              <Lock className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-white tracking-tight">Set a New Password</h2>
              <p className="text-xs text-slate-400">
                Welcome, {pendingLogin.user.full_name || pendingLogin.user.username}. This account is using a temporary password and must set a real one before continuing.
              </p>
            </div>

            {forceChangeError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{forceChangeError}</span>
              </div>
            )}

            <form onSubmit={handleForceChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={8}
                  value={forceNewPassword}
                  onChange={(e) => setForceNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={forceConfirmPassword}
                  onChange={(e) => setForceConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={forceChangeLoading}
                className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-950/40 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {forceChangeLoading ? 'Saving...' : 'Set Password & Continue'}
              </button>
            </form>
          </div>
        ) : (
        <>
        {/* ========================================================================= */}
        {/* 1. OPERATOR MODE */}
        {/* ========================================================================= */}
        {activeTab === 'operator' && (
          <div className="max-w-md mx-auto w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold text-white tracking-tight">Operator Login</h2>
              <p className="text-xs text-slate-400">Enter your credentials to access workshop operations</p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleOperatorLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Identifier (Username / Mobile / Email)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username, mobile number or email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>Remember Session</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Press Enter ↵</span>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-950/40 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Sign In to Operations</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ADMINISTRATOR MODE */}
        {/* ========================================================================= */}
        {activeTab === 'administrator' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-500" />
                  Production System Health & Build Console
                </h2>
                <p className="text-xs text-slate-400">Live operational status monitoring across Cloud Run and Cloud SQL</p>
              </div>
              <button
                onClick={fetchSystemHealth}
                disabled={healthLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                Refresh Status
              </button>
            </div>

            {/* DYNAMIC BUILD METADATA CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Build Version</span>
                <p className="text-sm font-black text-white font-mono">{healthData?.buildInfo?.version || 'unavailable'}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cloud Run Revision</span>
                <p className="text-xs font-black text-orange-400 font-mono truncate">{healthData?.buildInfo?.cloudRunRevision || 'loading...'}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Git Commit / Tag</span>
                <p className="text-sm font-black text-white font-mono">{healthData?.buildInfo?.gitCommit || 'unavailable'}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Environment</span>
                <p className="text-sm font-black text-emerald-400 font-mono uppercase">{healthData?.buildInfo?.environment || 'unknown'}</p>
              </div>
            </div>

            {/* SERVICES STATUS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {healthData?.services && Object.entries(healthData.services).map(([key, svc]: [string, any]) => (
                <div key={key} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{key}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      svc.status === 'Healthy' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' : 'bg-amber-950 text-amber-400 border border-amber-800/80'
                    }`}>
                      {svc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{svc.message}</p>
                </div>
              ))}
            </div>

            {/* APPEARANCE — the surviving real control from the removed Developer
                Console tab. Theme is a client-side preference (applyTheme() sets a
                class on <html> and stores it in localStorage), so there is no
                server call here and no reason to restrict it by role. */}
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-slate-300">
                <Palette className="h-5 w-5 text-orange-400" />
                <h3 className="font-bold text-sm">Theme</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.values(THEME_CONFIGS).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      currentTheme === t.id ? 'bg-orange-950/60 border-orange-500 text-orange-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="block font-bold text-xs">{t.name}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">{t.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Developer Console removed 2026-09-17 — all four of its actions called an
            endpoint that does not exist. See the file header for the full record. */}

        </>
        )}
      </main>

      {/* ── GATEWAY FOOTER ── */}
      <footer className="w-full max-w-6xl mx-auto pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-3">
          <span>DWIP Enterprise Platform</span>
          <span>•</span>
          <span>Typography: <strong className="text-slate-400">{fontMetrics?.primary || 'Inter'}</strong></span>
          <span>•</span>
          <span>Theme: <strong className="text-slate-400">{THEME_CONFIGS[currentTheme]?.name}</strong></span>
        </div>
        {/* Get the employee app — scan or tap to install from Google Play. */}
        <a href={PLAY_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-slate-300 transition-colors" title="Get the AiVaahan DWIP app on Google Play">
          <span className="bg-white p-0.5 rounded"><PlayQr className="w-8 h-8 block" /></span>
          <span>Get the app on <strong className="text-slate-300">Google Play</strong></span>
        </a>
        <div>
          <span>Revision: <strong className="text-slate-400 font-mono">{healthData?.buildInfo?.cloudRunRevision || 'loading...'}</strong></span>
        </div>
      </footer>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-sm text-white">Forgot Password Support</h3>
            <p className="text-xs text-slate-400">
              Please contact your Workshop Administrator or Service Manager to reset your operator password.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full h-9 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
