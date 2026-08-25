import React from "react";
import { 
  LayoutDashboard, Truck, Wrench, Package, Users, TrendingUp, Settings, 
  HelpCircle, User, LogOut, ChevronRight, Bell, Search, Activity, Sparkles, Building,
  Menu, X, KeyRound, ClipboardCheck
} from "lucide-react";
import ChangePasswordModal from "./ChangePasswordModal";

export interface TabItem {
  id: string;
  label: string;
  icon: any;
}

export const WORKSPACE_MAPPING: Record<string, string> = {
  "my-workspace": "my-workspace",
  dashboard: "dashboard",
  "workshop-cockpit": "executive",
  "executive-cockpit": "executive",
  "dealer-principal-cockpit": "executive",
  jobs: "workshop",
  "gate-entry": "workshop",
  "bay-tat": "workshop",
  "delivery-workspace": "workshop",
  "billing-exit": "workshop",
  "billing-workspace": "workshop",
  "cashier-workspace": "workshop",
  "receptionist-workspace": "workshop",
  "manager-assignment-workspace": "workshop",
  "security-workspace": "workshop",
  "advisor-workspace": "service",
  "supervisor-workspace": "service",
  "technician-workspace": "service",
  "qc-workspace": "service",
  "customer-portal": "service",
  breakdown: "service",
  "vehicle-lookup": "service",
  "parts-command": "parts",
  "parts-warranty": "parts",
  "parts-incharge-workspace": "parts",
  "warranty-clerk-workspace": "parts",
  employees: "workforce",
  attendance: "workforce",
  productivity: "workforce",
  certification: "workforce",
  "tech-kpi": "workforce",
  "tech-profile": "workforce",
  "gm-command": "executive",
  "powerbi-analytics": "executive",
  "roi-tracker": "executive",
  revenue: "executive",
  "fleet-manager-workspace": "executive",
  users: "admin",
  google: "admin",
  assistant: "admin",
  "setup-wizard": "admin",
  "pilot-control-room": "admin",
  "live-support": "admin",
  "devops-dashboard": "admin",
  "ai-brains": "admin",
  "cctv-safety": "admin",
  "oem-integrations": "admin",
  "operations-console": "admin",
  "system-hardening": "admin",
  "exception-report": "admin",
  query: "admin",
  "dms-import": "admin",
  "master-data-hub": "admin",
  "mobile-platform": "admin",
  "integration-monitor": "admin",
  "external-systems": "admin",
  "sync-queue": "admin",
  "api-logs": "admin",
  "health-dashboard": "admin",
  "integration-config": "admin",
};

export const WORKSPACES = [
  { id: "my-workspace", label: "My Workspace", icon: ClipboardCheck },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workshop", label: "Workshop Operations", icon: Truck },
  { id: "service", label: "Service Operations", icon: Wrench },
  { id: "parts", label: "Parts & Warranty", icon: Package },
  { id: "workforce", label: "Workforce", icon: Users },
  { id: "executive", label: "Executive", icon: TrendingUp },
  { id: "admin", label: "Administration", icon: Settings },
];

interface AppShellProps {
  user: any;
  activeTab: string;
  permittedTabs: TabItem[];
  setActiveTab: (tabId: string) => void;
  handleLogout: () => void;
  aiModeEnabled?: boolean;
  onToggleAiMode?: () => void;
  /** True when this user may flip AI Mode directly (GM / Admin / Developer). */
  aiModeCanToggle?: boolean;
  /** True when this user may only REQUEST activation (Manager / Advisor). */
  aiModeCanRequest?: boolean;
  /** Pending activation requests — shown to approvers as a badge. */
  aiModePendingRequests?: number;
  children: React.ReactNode;
}

export default function AppShell({
  user,
  activeTab,
  permittedTabs,
  setActiveTab,
  handleLogout,
  aiModeEnabled = true,
  onToggleAiMode,
  aiModeCanToggle = false,
  aiModeCanRequest = false,
  aiModePendingRequests = 0,
  children
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("wms_token") : null;
      const res = await fetch("/api/notifications", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      }
    } catch {
      /* non-fatal: leave notifications as-is */
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 60000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Determine current active workspace
  const activeWorkspace = WORKSPACE_MAPPING[activeTab] || "dashboard";

  // Filter sub-tabs that are permitted for the user and belong to the active workspace
  const workspaceSubTabs = (permittedTabs || []).filter(
    t => WORKSPACE_MAPPING[t.id] === activeWorkspace && t.id !== "logout-deep-link"
  );

  // Workspaces the user can actually reach — powers the mobile bottom nav bar.
  const accessibleWorkspaces = WORKSPACES.filter(
    ws => (permittedTabs || []).some(t => WORKSPACE_MAPPING[t.id] === ws.id)
  );
  // On a phone, show up to 4 primary workspaces in the thumb bar + a "More" that opens
  // the full drawer; if 5 or fewer, show them all.
  const bottomBarPrimary = accessibleWorkspaces.length <= 5 ? accessibleWorkspaces : accessibleWorkspaces.slice(0, 4);
  const bottomBarHasMore = accessibleWorkspaces.length > 5;

  const handleWorkspaceClick = (workspaceId: string) => {
    // Find first permitted sub-tab in this workspace
    const firstSubTab = (permittedTabs || []).find(t => WORKSPACE_MAPPING[t.id] === workspaceId);
    if (firstSubTab) {
      setActiveTab(firstSubTab.id);
    }
    setMobileMenuOpen(false);
  };

  const getWorkspaceTitle = () => {
    const ws = WORKSPACES.find(w => w.id === activeWorkspace);
    return ws ? ws.label : "Dashboard";
  };

  const getWorkspaceIcon = () => {
    const ws = WORKSPACES.find(w => w.id === activeWorkspace);
    const IconComponent = ws ? ws.icon : LayoutDashboard;
    return <IconComponent className="h-5 w-5 text-orange-500" />;
  };

  // Find active sub-tab label
  const activeSubTab = (permittedTabs || []).find(t => t.id === activeTab);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black flex font-sans text-zinc-100">
      
      {/* MOBILE DRAWER BACKDROP & OVERLAY (Shown when mobileMenuOpen is true) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-72 h-full bg-zinc-950 border-r border-zinc-800 p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center font-black text-xl text-white shadow-lg">
                    W
                  </div>
                  <div>
                    <h2 className="font-extrabold text-white text-xs tracking-wide uppercase">DWIP Enterprise</h2>
                    <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wider mt-0.5 leading-none">
                      Workshop Intelligence
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {WORKSPACES.map(ws => {
                  const Icon = ws.icon;
                  const isSelected = activeWorkspace === ws.id;
                  const hasAccess = permittedTabs.some(t => WORKSPACE_MAPPING[t.id] === ws.id);
                  if (!hasAccess) return null;

                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleWorkspaceClick(ws.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-gradient-to-r from-orange-600/20 to-amber-600/10 text-white border-orange-500/40 shadow-lg"
                          : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span>{ws.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. DESKTOP LEFT SIDEBAR (Hidden on Mobile <768px, Visible on Desktop md:flex) */}
      <aside className="hidden md:flex w-64 h-screen bg-zinc-950/90 border-r border-zinc-800/80 backdrop-blur-md flex-col justify-between p-5 shrink-0 z-40 shadow-2xl overflow-y-auto">
        <div className="flex flex-col space-y-6">
          
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center font-black text-xl text-white shadow-lg">
              W
            </div>
            <div>
              <h2 className="font-extrabold text-white text-xs tracking-wide uppercase">DWIP Enterprise</h2>
              <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wider mt-0.5 leading-none">
                Devanand Workshop Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Workspaces */}
          <nav className="space-y-1">
            {WORKSPACES.map(ws => {
              const Icon = ws.icon;
              const isSelected = activeWorkspace === ws.id;
              const hasAccess = permittedTabs.some(t => WORKSPACE_MAPPING[t.id] === ws.id);
              if (!hasAccess) return null;

              return (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceClick(ws.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-600/20 to-amber-600/10 text-white border-orange-500/40 shadow-lg"
                      : "bg-transparent border-transparent hover:bg-zinc-900 hover:text-white text-zinc-400"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{ws.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Workspace settings */}
        <div className="pt-4 border-t border-zinc-800/80 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <HelpCircle className="h-4 w-4" />
            <span>Help</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Right Area (Fixed Viewport, Scrollable Content) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        
        {/* 2. TOP HEADER */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Mobile Hamburger Button */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-orange-500/40 shrink-0"
              title="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative w-40 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search..."
                className="w-full bg-black border border-zinc-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-zinc-400 shrink-0">
            {/* AI Mode ON / OFF Toggle Switch */}
            {onToggleAiMode && (
              <button
                onClick={onToggleAiMode}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  aiModeEnabled 
                    ? "bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-lg" 
                    : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                }`}
                title={
                  aiModeCanToggle
                    ? `AI Copilot ${aiModeEnabled ? "ENABLED" : "DISABLED"} workshop-wide — click to ${aiModeEnabled ? "disable" : "enable"}`
                    : aiModeCanRequest
                      ? aiModeEnabled
                        ? "AI Copilot ENABLED. Only a GM, Admin or Developer can switch it off."
                        : "AI Copilot DISABLED — click to request activation from a GM/Admin"
                      : `AI Copilot ${aiModeEnabled ? "ENABLED" : "DISABLED"} — only a GM, Admin or Developer can change this`
                }
              >
                <Sparkles className={`h-3.5 w-3.5 ${aiModeEnabled ? "text-purple-400 animate-pulse" : "text-zinc-500"}`} />
                <span className="hidden sm:inline">AI Mode</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wider ${
                  aiModeEnabled ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {aiModeEnabled ? "ON" : "OFF"}
                </span>
                {/* Approvers see how many activation requests are waiting. */}
                {aiModeCanToggle && aiModePendingRequests > 0 && (
                  <span className="ml-0.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                    {aiModePendingRequests}
                  </span>
                )}
              </button>
            )}

            <div className="relative">
              <button
                className="relative p-1 hover:text-white"
                title="Notifications"
                onClick={() => {
                  const next = !notifOpen;
                  setNotifOpen(next);
                  if (next) fetchNotifications();
                }}
              >
                <Bell className={`h-4 w-4 ${notifications.some((n: any) => n.severity === "critical") ? "text-red-400 animate-pulse" : ""}`} />
                {notifications.length > 0 && (
                  <span
                    className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full text-[9px] font-black text-white ${
                      notifications.some((n: any) => n.severity === "critical") ? "bg-red-500" : "bg-orange-500"
                    }`}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      Notifications
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-zinc-500">No new notifications</div>
                    ) : (
                      notifications.map((n: any) => (
                        <button
                          key={n.id}
                          onClick={() => { if (n.link) setActiveTab(n.link); setNotifOpen(false); }}
                          className="w-full text-left px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/50 flex gap-2 items-start"
                          title={n.link ? `Go to ${n.link.replace(/-/g, " ")}` : undefined}
                        >
                          {/* Severity rail so a breach is distinguishable at a glance. */}
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              n.severity === "critical"
                                ? "bg-red-500 animate-pulse"
                                : n.severity === "warning"
                                  ? "bg-amber-500"
                                  : "bg-zinc-600"
                            }`}
                          />
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-zinc-200">{n.title}</span>
                            <span className="block text-[11px] text-zinc-400">{n.message}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block"></div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-900 transition-colors"
                title="Account menu"
              >
                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-300 border border-zinc-700">
                  {(user?.username || user?.full_name || "User")[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-zinc-200 hidden sm:inline">{user?.username || user?.full_name || "User"}</span>
                <ChevronRight className={`h-3 w-3 text-zinc-500 transition-transform ${userMenuOpen ? "rotate-90" : ""}`} />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <div className="text-xs font-bold text-zinc-200 truncate">{user?.full_name || user?.username || "User"}</div>
                      <div className="text-[10px] text-zinc-500 capitalize">{(user?.role || "").replace(/_/g, " ")}</div>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); setShowChangePassword(true); }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-orange-400" /> Change Password
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-red-300 hover:bg-zinc-800 flex items-center gap-2 border-t border-zinc-800"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

        {/* 3. WORKSPACE HEADER */}
        <div className="bg-[#111827]/20 border-b border-slate-800/60 p-3 sm:p-4 sm:px-6 flex flex-col gap-2 sm:gap-3 shrink-0">
          {/* Breadcrumb + badges — hidden on phones to save vertical space */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>DWIP ERP</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-300">{getWorkspaceTitle()}</span>
              {activeSubTab && (
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-[#06B6D4]">{activeSubTab.label}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-[9px] rounded-lg tracking-wider">
                LIVE PILOT
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded font-medium">
                Devanand Automobiles
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 shrink">
              {getWorkspaceIcon()}
              {/* On a phone the mobile title renders the ACTIVE sub-tab name, which
                  the tab strip beside it already shows highlighted. Rendering both
                  only competed for width and left the title clipped to "Gat…", so
                  hide it on mobile whenever a strip is present and let the strip
                  own the row. With no strip there is nothing else naming the view,
                  so the title stays. */}
              <h2 className={`text-base sm:text-lg font-extrabold text-white leading-none truncate ${workspaceSubTabs.length > 1 ? "hidden sm:block" : ""}`}>
                <span className="sm:hidden">{activeSubTab?.label || getWorkspaceTitle()}</span>
                <span className="hidden sm:inline">{getWorkspaceTitle()} Workspace</span>
              </h2>
            </div>

            {/* 4. WORKSPACE NAVIGATION
                min-w-0 below is load-bearing: a flex item defaults to
                min-width:auto, so with shrink-0 buttons inside, this strip refused
                to shrink below its full content width and `overflow-x-auto` never
                engaged — it just squeezed the title instead. */}
            {workspaceSubTabs.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-850/60 overflow-x-auto min-w-0 scrollbar-none">
                {workspaceSubTabs.map(tab => {
                  const isTabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                        isTabActive 
                          ? "bg-slate-800 text-[#06B6D4] shadow-md border border-slate-700/50" 
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5. PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6 bg-[#0B1220]">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* 6. MOBILE BOTTOM NAV — thumb-reachable primary workspace switcher (phones only) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {bottomBarPrimary.map(ws => {
          const Icon = ws.icon;
          const isActive = activeWorkspace === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => handleWorkspaceClick(ws.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem] transition-colors ${
                isActive ? "text-orange-400" : "text-zinc-400 active:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-orange-400" : ""}`} />
              <span className="text-[9px] font-bold leading-none truncate max-w-[4.5rem]">{ws.label.split(" ")[0]}</span>
              {isActive && <span className="absolute top-0 h-0.5 w-8 bg-orange-400 rounded-full" />}
            </button>
          );
        })}
        {bottomBarHasMore && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem] text-zinc-400 active:text-white"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[9px] font-bold leading-none">More</span>
          </button>
        )}
      </nav>

    </div>
  );
}
