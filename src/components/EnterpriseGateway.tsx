/**
 * =============================================================================
 * DWIP Enterprise V1.1.0 — Enterprise Operations Gateway
 * Modes: Operator Login | Administrator Health Console | Developer Recovery & AI Doctor
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  Activity, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Stethoscope, 
  Type, 
  Palette, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Zap, 
  Wrench, 
  UserCheck, 
  HelpCircle,
  Clock,
  Layers,
  Server
} from 'lucide-react';
import { THEME_CONFIGS, ThemeName, applyTheme, getStoredTheme, inspectFontStack } from '../services/themeEngine';

interface EnterpriseGatewayProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const EnterpriseGateway: React.FC<EnterpriseGatewayProps> = ({ onLoginSuccess }) => {
  // Navigation Tabs: 'operator' | 'administrator' | 'developer'
  const [activeTab, setActiveTab] = useState<'operator' | 'administrator' | 'developer'>('operator');

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

  // AI Doctor States
  const [aiDoctorResult, setAiDoctorResult] = useState<any>(null);
  const [aiDoctorLoading, setAiDoctorLoading] = useState(false);

  // Developer Unlock State
  const [unlockTarget, setUnlockTarget] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockResult, setUnlockResult] = useState<string | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);

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
      if (data.success) {
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
      setLoginError('Network connection error. AI Login Doctor available for diagnostics.');
    } finally {
      setLoginLoading(false);
    }
  };

  const runAiLoginDoctor = async () => {
    setAiDoctorLoading(true);
    setAiDoctorResult(null);
    try {
      const res = await fetch('/api/system/ai-doctor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier })
      });
      const data = await res.json();
      setAiDoctorResult(data);
    } catch (err: any) {
      setAiDoctorResult({ overallHealth: 'CRITICAL', error: err.message });
    } finally {
      setAiDoctorLoading(false);
    }
  };

  const runAiUiDoctor = async () => {
    setAiDoctorLoading(true);
    setAiDoctorResult(null);
    try {
      const res = await fetch('/api/system/ai-doctor/ui', { method: 'POST' });
      const data = await res.json();
      setAiDoctorResult(data);
    } catch (err: any) {
      setAiDoctorResult({ overallHealth: 'CRITICAL', error: err.message });
    } finally {
      setAiDoctorLoading(false);
    }
  };

  const runAiDeploymentDoctor = async () => {
    setAiDoctorLoading(true);
    setAiDoctorResult(null);
    try {
      const res = await fetch('/api/system/ai-doctor/deployment', { method: 'POST' });
      const data = await res.json();
      setAiDoctorResult(data);
    } catch (err: any) {
      setAiDoctorResult({ overallHealth: 'CRITICAL', error: err.message });
    } finally {
      setAiDoctorLoading(false);
    }
  };

  const handleDevUnlock = async () => {
    if (!unlockReason) {
      setUnlockResult('Reason is required for Developer Unlock action.');
      return;
    }
    setUnlockLoading(true);
    setUnlockResult(null);
    try {
      const res = await fetch('/api/system/auth-recovery/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: unlockTarget, override_reason: unlockReason })
      });
      const data = await res.json();
      setUnlockResult(data.message || data.error);
    } catch (err: any) {
      setUnlockResult('Unlock action failed: ' + err.message);
    } finally {
      setUnlockLoading(false);
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
              DWIP ENTERPRISE <span className="text-xs px-2 py-0.5 rounded bg-orange-600/30 text-orange-400 font-bold border border-orange-500/30">V1.1.0-dev</span>
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
          <button
            onClick={() => setActiveTab('developer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'developer' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            Developer Console
          </button>
        </div>
      </header>

      {/* ── GATEWAY CONTENT BODY ── */}
      <main className="w-full max-w-6xl mx-auto my-6 flex-1 flex flex-col justify-center">
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
                  placeholder="e.g. shashi_sa or 779550899"
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
                <p className="text-sm font-black text-white font-mono">{healthData?.buildInfo?.version || '1.1.0-dev'}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cloud Run Revision</span>
                <p className="text-xs font-black text-orange-400 font-mono truncate">{healthData?.buildInfo?.cloudRunRevision || 'dwip-enterprise-00041-9c4'}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Git Commit / Tag</span>
                <p className="text-sm font-black text-white font-mono">{healthData?.buildInfo?.gitCommit || 'v1.1.0'}</p>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Environment</span>
                <p className="text-sm font-black text-emerald-400 font-mono uppercase">{healthData?.buildInfo?.environment || 'Production'}</p>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DEVELOPER MODE */}
        {/* ========================================================================= */}
        {activeTab === 'developer' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-indigo-400" />
                  Developer Recovery Console & AI Doctor Engine
                </h2>
                <p className="text-xs text-slate-400">Diagnostic tools, AI Login Doctor, Font Manager, and Theme Engine</p>
              </div>
            </div>

            {/* AI DOCTOR ACTION BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={runAiLoginDoctor}
                disabled={aiDoctorLoading}
                className="p-4 rounded-xl bg-slate-900 border border-indigo-900/50 hover:border-indigo-500 text-left cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-indigo-400">
                  <Stethoscope className="h-5 w-5" />
                  <span className="text-[10px] font-mono group-hover:underline">Run Analysis</span>
                </div>
                <h3 className="font-bold text-xs text-white">AI Login Doctor</h3>
                <p className="text-[11px] text-slate-400">Inspects JWT, Rate Limiter, Session, User existence</p>
              </button>

              <button
                onClick={runAiUiDoctor}
                disabled={aiDoctorLoading}
                className="p-4 rounded-xl bg-slate-900 border border-emerald-900/50 hover:border-emerald-500 text-left cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-emerald-400">
                  <Type className="h-5 w-5" />
                  <span className="text-[10px] font-mono group-hover:underline">Run Analysis</span>
                </div>
                <h3 className="font-bold text-xs text-white">AI UI & Font Doctor</h3>
                <p className="text-[11px] text-slate-400">Inspects Inter font stack, CSS variables, Theme Engine</p>
              </button>

              <button
                onClick={runAiDeploymentDoctor}
                disabled={aiDoctorLoading}
                className="p-4 rounded-xl bg-slate-900 border border-amber-900/50 hover:border-amber-500 text-left cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-amber-400">
                  <Cpu className="h-5 w-5" />
                  <span className="text-[10px] font-mono group-hover:underline">Run Analysis</span>
                </div>
                <h3 className="font-bold text-xs text-white">AI Deployment Doctor</h3>
                <p className="text-[11px] text-slate-400">Inspects Cloud Run revision, RAM, Connection Pool</p>
              </button>
            </div>

            {/* AI DOCTOR ANALYSIS RESULTS */}
            {aiDoctorResult && (
              <div className="p-5 bg-slate-900/90 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4" />
                    AI Diagnostic Report ({aiDoctorResult.overallHealth || 'HEALTHY'})
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {aiDoctorResult.inspectedAt ? new Date(aiDoctorResult.inspectedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
                <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
                  {JSON.stringify(aiDoctorResult, null, 2)}
                </pre>
              </div>
            )}

            {/* THEME ENGINE & FONT MANAGEMENT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* THEME ENGINE */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Palette className="h-5 w-5 text-orange-400" />
                  <h3 className="font-bold text-sm">Theme Engine Controls</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(THEME_CONFIGS).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        currentTheme === t.id ? 'bg-orange-950/60 border-orange-500 text-orange-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="block font-bold text-xs">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* DEVELOPER RATE LIMIT UNLOCK */}
              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Unlock className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-bold text-sm">Developer Login Unlock</h3>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={unlockTarget}
                    onChange={(e) => setUnlockTarget(e.target.value)}
                    placeholder="Target Identifier / IP (Optional)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Mandatory Audit Reason (e.g. Dev Support)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    onClick={handleDevUnlock}
                    disabled={unlockLoading}
                    className="w-full h-9 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    Execute Unlock & Log Audit
                  </button>
                  {unlockResult && (
                    <p className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800">{unlockResult}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
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
        <div>
          <span>Revision: <strong className="text-slate-400 font-mono">{healthData?.buildInfo?.cloudRunRevision || 'dwip-enterprise-00041-9c4'}</strong></span>
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
