import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { tabFromPath, pathFromTab, resolvePostLoginPath, isNonAppPath, DEFAULT_TAB } from "./lib/tabRoutes";
import {
  Video,
  LayoutDashboard,
  Wrench,
  Users, 
  FileDown, 
  Share2, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Lock,
  Sparkles,
  Loader2,
  TrendingUp,
  Clock,
  RefreshCw,
  Database,
  History,
  Car,
  ClipboardCheck,
  Shield,
  HelpCircle,
  Settings,
  ArrowLeft,
  ShieldAlert,
  DollarSign,
  Truck,
  Award,
  User as UserIcon,
  Briefcase,
  Package,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  AlertCircle,
  ClipboardCopy,
  FileText,
  Building,
  Smartphone,
  FileSpreadsheet,
  Terminal,
  Activity,
  Brain,
  ScrollText
} from "lucide-react";
import UserManagement from "./components/UserManagement";
import JcAuditLog from "./components/admin/JcAuditLog";
import {
  GateEntryPanel,
  TechnicianJobsPanel,
  TechnicianKpiPanel,
  TechnicianProfilePanel
} from "./components/RoleSpecialPanels";

import PartsWarrantyManager from "./components/PartsWarrantyManager";
import FunnyLoader from "./components/FunnyLoader";
import ServiceAdvisorWorkspace from "./components/ServiceAdvisorWorkspace";
import FloorSupervisorWorkspace from "./components/FloorSupervisorWorkspace";
import TechnicianWorkspace from "./components/TechnicianWorkspace";
import QCInspectorWorkspace from "./components/QCInspectorWorkspace";
import BillingWorkspace from "./components/BillingWorkspace";
import CashierWorkspace from "./components/CashierWorkspace";
import VehicleDeliveryWorkspace from "./components/VehicleDeliveryWorkspace";
import CustomerExperiencePlatform from "./components/CustomerExperiencePlatform";
import MobilePlatformWorkspace from "./components/MobilePlatformWorkspace";
import SecurityWorkspace from "./components/SecurityWorkspace";
import { 
  Employee, 
  Bay, 
  SRType, 
  JobCard, 
  JobTechnicianMap, 
  JobRevenue, 
  JobRevenueSplitDetail, 
  CarryForwardLog, 
  ReworkLog, 
  AlertLog, 
  DMSImportBatch, 
  DMSImportRow,
  RevenueSplitMaster,
  User
} from "./types";

// Import modular panels
import Dashboard from "./components/Dashboard";
import JobCardManager from "./components/JobCardManager";
import { getStaffToken, setStaffToken, clearStaffToken, staffAuthHeaders } from "./lib/authToken";
import EmployeeDirectory from "./components/EmployeeDirectory";
import ProductivityDashboard from "./components/ProductivityDashboard";
import ActiveBayTatMonitor from "./components/ActiveBayTatMonitor";
import LeaveManagement from "./components/LeaveManagement";
import HolidaysManagement from "./components/HolidaysManagement";
import TrainingDevelopment from "./components/TrainingDevelopment";
import GrievanceManagement from "./components/GrievanceManagement";
import EmployeePerformanceHub from "./components/EmployeePerformanceHub";
import DmsImporter from "./components/DmsImporter";
import EnterpriseMasterDataHub from "./components/EnterpriseMasterDataHub";
import AppShell from "./components/AppShell";
import GeminiAssistant from "./components/GeminiAssistant";
import AuthScreen from "./components/AuthScreen";
import VehicleLookup from "./components/VehicleLookup";
import CpscCertificationPanel from "./components/CpscCertificationPanel";
import AttendanceShiftLog from "./components/AttendanceShiftLog";
import OvertimeEmployeeDashboard from "./components/OvertimeEmployeeDashboard";
import OvertimeApprovalPortal from "./components/OvertimeApprovalPortal";
import BreakdownManagement from "./components/BreakdownManagement";

const GateEntryManager = React.lazy(() => import("./components/GateEntryManager"));
const BillingExit = React.lazy(() => import("./components/billing-exit"));
import ErrorBoundary from "./components/ErrorBoundary";

import UserOnboardingTour from "./components/UserOnboardingTour";
import AiBrainsPanel from "./components/AiBrainsPanel";
import StaffFeedbackWidget from "./components/StaffFeedbackWidget";
import LiveSupportPanel from "./components/LiveSupportPanel";
import MyWorkspace from "./components/MyWorkspace";
import { resolveMyWorkspaceComponent } from "./lib/myWorkspaceRouter";
import ExternalIntegrations from "./components/ExternalIntegrations";
import PlatformControlCenter from "./components/platform/PlatformControlCenter";
import { PartsInChargeWorkspace } from "./components/PartsInChargeWorkspace";
import { WarrantyClerkWorkspace } from "./components/WarrantyClerkWorkspace";
import ReceptionistWorkspace from "./components/ReceptionistWorkspace";
import ManagerAssignmentWorkspace from "./components/ManagerAssignmentWorkspace";

function darkenColor(hex: string, percent: number): string {
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  let num = parseInt(color, 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}

export default function App() {
  // ─── URL-BACKED NAVIGATION ────────────────────────────────────────────────
  //
  // activeTab used to be plain useState, so the URL never changed: every screen
  // was the bare domain. Refresh lost the screen, Back exited the app, and no
  // screen could be linked to.
  //
  // The URL is now the source of truth and `activeTab` is derived from it. The
  // setter keeps the exact signature the 83 existing setActiveTab() call sites
  // use — including the functional form setActiveTab(cur => …) — so no caller
  // changes; it pushes a history entry instead of setting state. That is what
  // makes deep links, Back/Forward and refresh work without touching the 19
  // components that navigate.
  //
  // The tab id IS the path segment (see lib/tabRoutes.ts), so a tab added to
  // ROLE_TABS gets a working URL with no extra wiring.
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = React.useMemo(() => {
    const fromUrl = tabFromPath(location.pathname);
    // A path Express owns should never have reached the React router; fall back
    // rather than rendering a screen named after someone else's URL.
    if (!fromUrl) return DEFAULT_TAB;
    return fromUrl;
  }, [location.pathname]);

  const setActiveTab = React.useCallback(
    (next: string | ((current: string) => string)) => {
      const current = tabFromPath(window.location.pathname) || DEFAULT_TAB;
      const target = typeof next === "function" ? next(current) : next;
      if (!target || target === current) return;
      navigate(pathFromTab(target));
    },
    [navigate]
  );
  const [lookupQuery, setLookupQuery] = useState<string>("");

  // Authentication State (Declared first so useEffect hooks can read user safely)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("wms_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => {
    try {
      return getStaffToken() || null;
    } catch {
      return null;
    }
  });
  const [needsAuth, setNeedsAuth] = useState(() => {
    try {
      return !localStorage.getItem("wms_user");
    } catch {
      return true;
    }
  });
  const [userPermissions, setUserPermissions] = useState<any[]>([]);

  // The path the visitor originally asked for, captured at first render before
  // anything can navigate away from it. Used to return them there after they
  // sign in — subject to their role permitting that screen. A ref, not state,
  // because reading it must never trigger a re-render mid-login, and it is
  // written exactly once per page load.
  const attemptedPathRef = React.useRef<string | null>(
    typeof window !== "undefined" &&
    window.location.pathname !== "/" &&
    !isNonAppPath(window.location.pathname)
      ? window.location.pathname + window.location.search
      : null
  );

  // Production hardening tab access guard
  useEffect(() => {
    const isRc1 = import.meta.env.VITE_WORKFORCE_PROFILE === "rc1";
    const isAdminOrDev = user?.role && ["admin", "developer", "dealer_principal", "gm_service", "workshop_manager"].includes(user.role);
    if (isRc1 && !isAdminOrDev) {
      const excludedTabs = [
        "breakdown",
        "customer-portal",
        "assistant",
        "live-support",
        "mobile-platform",
        "certification"
      ];
      if (excludedTabs.includes(activeTab)) {
        console.warn(`[SECURITY] Access to blocked tab '${activeTab}' prevented under RC1 profile.`);
        // replace, not push: a blocked URL must not become a history entry the
        // Back button lands on again. This guard already ran on [activeTab],
        // so it covers a typed or pasted URL as well as a nav click.
        navigate(pathFromTab(DEFAULT_TAB), { replace: true });
      }
    }
  }, [activeTab, user, navigate]);

  // Persist the active tab for Android process-death during native camera
  // capture (lowmemorykiller kills the process while the camera app is open;
  // sessionStorage is wiped with it, localStorage is not).
  //
  // This is no longer what restores the screen — the URL is, and it survives
  // the same kill because the WebView restores its location. The write is kept
  // as a diagnostic record of where the user was, and because a host that
  // relaunches at "/" rather than the last URL would otherwise lose it. It is
  // deliberately NOT read back on mount any more: doing so would fight the URL
  // for control of the screen, and a stale value would override a deep link.
  useEffect(() => {
    try {
      localStorage.setItem("dwip_active_tab", activeTab);
    } catch { /* ignore — storage may be unavailable */ }
  }, [activeTab]);


  // --- Toast notification system ---
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);
  const toastCounterRef = React.useRef(0);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++toastCounterRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    const duration = type === "error" ? 8000 : 4000;
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  // UX Settings & Brand Customization states
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wms_primary_color") || "#ff5500";
    }
    return "#ff5500";
  });
  const [mobileFriendly, setMobileFriendly] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("wms_mobile_friendly");
      return val === null ? true : val === "true";
    }
    return true;
  });
  const [showBottomNav, setShowBottomNav] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("wms_show_bottom_nav");
      return val === null ? true : val === "true";
    }
    return true;
  });
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showMobileMoreTabs, setShowMobileMoreTabs] = useState<boolean>(false);
  // AI Mode is workshop-wide server state, not a per-browser preference: it
  // gates real outbound AI calls (and API-key spend), so it must read the same
  // for everyone. The localStorage value is only a first paint hint until the
  // authoritative server value arrives.
  const [aiModeEnabled, setAiModeEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("wms_ai_mode");
      return val === null ? true : val === "true";
    }
    return true;
  });
  const [aiModeCanToggle, setAiModeCanToggle] = useState(false);
  const [aiModeCanRequest, setAiModeCanRequest] = useState(false);
  const [aiModePending, setAiModePending] = useState(0);

  // `token` MUST stay in the dependency list. authHeaders() closes over token,
  // so with an empty list this callback kept the value token held on the very
  // first render. On a page reload that is the localStorage token and all is
  // well — but on a fresh LOGIN token starts null, and this callback then sent
  // every /api/v1/ai-mode request with no Authorization header for the life of
  // the session. Production logged an unbroken run of 401s on this one route
  // while the rest of the app worked, because every other call builds its
  // headers from the current render.
  //
  // The visible symptom was a developer being told "Only a GM, Admin or
  // Developer can change AI Mode": the 401 hit the silent `return` below, so
  // canToggle never left its initial false.
  const refreshAiMode = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/v1/ai-mode", { headers: authHeaders() });
      if (!res.ok) {
        // Was a bare `return`. A permanent 401 or 500 here silently strips the
        // user's rights over AI Mode with no way to tell that from genuinely
        // lacking them, which is exactly how this went unnoticed.
        console.warn(`[AIMode] Could not read AI Mode state: HTTP ${res.status}. Controls stay disabled.`);
        return;
      }
      const data = await res.json();
      setAiModeEnabled(Boolean(data.enabled));
      setAiModeCanToggle(Boolean(data.canToggle));
      setAiModeCanRequest(Boolean(data.canRequest));
      setAiModePending(Number(data.pendingRequests || 0));
    } catch {
      /* non-fatal: keep the last known value */
    }
  }, [token]);

  // Handles a click on the AI Mode control. Approvers flip it directly;
  // managers / advisors raise an activation request instead; anyone else is
  // told plainly that they cannot change it.
  const handleAiModeClick = async () => {
    if (aiModeCanToggle) {
      const next = !aiModeEnabled;
      try {
        const res = await fetch("/api/v1/ai-mode", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ enabled: next })
        });
        if (res.ok) {
          setAiModeEnabled(next);
          showToast(`AI Mode ${next ? "enabled" : "disabled"} for the whole workshop.`, "success");
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || "Could not change AI Mode.", "error");
        }
      } catch {
        showToast("Network error changing AI Mode.", "error");
      }
      return;
    }

    if (aiModeCanRequest) {
      if (aiModeEnabled) {
        showToast("AI Mode is already on. Only a GM, Admin or Developer can switch it off.", "info");
        return;
      }
      try {
        const res = await fetch("/api/v1/ai-mode/request", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({})
        });
        const data = await res.json().catch(() => ({}));
        showToast(data.message || "AI Mode activation requested.", "info");
        refreshAiMode();
      } catch {
        showToast("Network error requesting AI Mode activation.", "error");
      }
      return;
    }

    showToast("Only a GM, Admin or Developer can change AI Mode.", "info");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("wms_primary_color", primaryColor);
      localStorage.setItem("wms_mobile_friendly", String(mobileFriendly));
      localStorage.setItem("wms_show_bottom_nav", String(showBottomNav));
      localStorage.setItem("wms_ai_mode", String(aiModeEnabled));
      
      // Inject css variables
      document.documentElement.style.setProperty("--brand-color", primaryColor);
      // Darken 10% for hover
      const hoverColor = darkenColor(primaryColor, 10);
      document.documentElement.style.setProperty("--brand-color-hover", hoverColor);
    }
  }, [primaryColor, mobileFriendly, showBottomNav, aiModeEnabled]);

  const handleLookupVehicle = (vrn: string) => {
    setLookupQuery(vrn);
    setActiveTab("vehicle-lookup");
  };

  // TAB MODULE MAPPING for Role-Based Access Control

  const TAB_MODULE_MAPPING: Record<string, string> = {
    dashboard: "Dashboard",
    "advisor-workspace": "Job Cards",
    "supervisor-workspace": "Job Cards",
    "technician-workspace": "Job Cards",
    "qc-workspace": "Job Cards",
    jobs: "Job Cards",
    "gate-entry": "Job Cards",
    "delivery-workspace": "Job Cards",
    "parts-warranty": "Warranty",
    "billing-workspace": "Billing",
    "cashier-workspace": "Billing",
    "billing-exit": "Billing",
    "dms-import": "DMS Import",
    "master-data-hub": "User Management",
    employees: "User Management",
    users: "User Management",
    breakdown: "Breakdowns",
  };

  const isTabPermitted = (tabId: string) => {
    if (!user) return false;
    if (user.role === "developer") return true;
    
    const mappedModule = TAB_MODULE_MAPPING[tabId];
    if (!mappedModule) return true;

    if (!userPermissions || userPermissions.length === 0) return true;

    const perm = userPermissions.find(p => p.module_name.toLowerCase() === mappedModule.toLowerCase());
    return perm ? perm.can_view === 1 : false;
  };

  const userRole = user ? user.role : "reception";
  const isAdmin = userRole === "admin" || userRole === "developer";
  const isManager = isAdmin || userRole === "service_manager" || userRole === "workshop_manager";
  const isDeveloper = userRole === "developer";
  const employeeId = user ? user.employee_id : null;

  const decodeToken = (t: string | null) => {
    if (!t) return null;
    try {
      return JSON.parse(atob(t.split(".")[1]));
    } catch {
      return null;
    }
  };

  const isTokenExpired = (t: string | null) => {
    const decoded = decodeToken(t);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  };

  const ROLE_TABS: Record<string, Array<{ id: string; label: string; icon: any }>> = {
    developer: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ClipboardCheck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "delivery-workspace", label: "Vehicle Delivery", icon: Truck },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "customer-portal", label: "Customer Portal", icon: UserIcon },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "oem-integrations", label: "External Integrations", icon: Share2 },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "breakdown", label: "Breakdowns", icon: AlertTriangle },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "master-data-hub", label: "Master Data Hub", icon: Database },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
      { id: "live-support", label: "Live Support", icon: HelpCircle },
      { id: "ai-brains", label: "AI Brains", icon: Brain },
      { id: "jc-audit-log", label: "JC Activity Log", icon: ScrollText },
    ],
    admin: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ClipboardCheck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "delivery-workspace", label: "Vehicle Delivery", icon: Truck },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "customer-portal", label: "Customer Portal", icon: UserIcon },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "oem-integrations", label: "External Integrations", icon: Share2 },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "breakdown", label: "Breakdowns", icon: AlertTriangle },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "master-data-hub", label: "Master Data Hub", icon: Database },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
      { id: "live-support", label: "Live Support", icon: HelpCircle },
      { id: "jc-audit-log", label: "JC Activity Log", icon: ScrollText },
    ],
    billing: [
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
    ],
    service_advisor: [
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    floor_supervisor: [
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    warranty_advisor: [
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    warranty: [
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    warranty_manager: [
      { id: "warranty-clerk-workspace", label: "Warranty Desk", icon: ShieldAlert },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    floor_incharge: [
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    workshop_manager: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
    ],
    service_manager: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
    ],
    works_manager: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
    ],
    general_manager: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
    gm_service: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
    ],
    spares_manager: [
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
    ],
    parts: [
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
    ],
    parts_incharge: [
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    warranty_clerk: [
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    dkam: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
    ],
    cashier: [
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
    ],
    reception: [
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
    ],
    receptionist: [
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
    ],
    tools_incharge: [
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
    ],
    security_agent: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "delivery-workspace", label: "Vehicle Delivery", icon: Truck },
    ],
    breakdown: [
      { id: "breakdown", label: "Breakdowns", icon: AlertTriangle },
      { id: "tech-kpi", label: "My KPI", icon: TrendingUp },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    dealer_principal: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "receptionist-workspace", label: "Reception Intake", icon: ClipboardCheck },
      { id: "manager-assignment-workspace", label: "SA Assignment", icon: Users },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ShieldAlert },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
    ],
    supervisor: [
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
    ],
    accounts: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
    ],
    gate_personnel: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    technician: [
      { id: "tech-kpi", label: "My KPI", icon: TrendingUp },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
  };

  /**
   * Gate-in is security and reception work. Every other role that carries the
   * Gate Entry tab (service advisor, workshop manager, supervisor) sees the
   * ledger read-only — no register form, no gate-out pass.
   */
  const GATE_IN_ROLES = [
    "security_agent", "gate_personnel", "reception", "receptionist", "admin", "developer",
  ];

  /**
   * ROLE_TABS is keyed snake_case, but user_access_master.user_role may hold the
   * Employee Directory's human title ("Service Advisor") because
   * createDefaultLoginForEmployee copies employees.role verbatim. A raw lookup
   * then misses, and the old `|| ROLE_TABS["reception"]` fallback silently
   * handed that user the RECEPTIONIST's screens — an advisor was shown Reception
   * Intake and Gate Entry and no Job Cards tab at all. Showing someone another
   * role's console is worse than showing them nothing, so there is no
   * cross-role fallback: an unknown role resolves to no tabs.
   */
  // Known role-title variants stored in user_access_master that map onto a
  // canonical console. These are the SAME role family (an Electrician is a
  // technician; a Biller does billing) — so showing them that console is
  // CORRECT resolution, not the cross-role fallback the note above warns against.
  const ROLE_ALIASES: Record<string, string> = {
    electrician: "technician",
    mechanical_helper: "technician",
    wheel_alignment: "technician",
    biller: "billing",
    parts_picker: "parts",
    spare_parts_manager: "spares_manager",
  };

  const tabsForRole = (role: any): Array<{ id: string; label: string; icon: any }> => {
    if (!role) return [];
    const key = String(role).toLowerCase().trim().replace(/[\s_]+/g, "_");
    const resolved = ROLE_TABS[key] || ROLE_TABS[ROLE_ALIASES[key]] || ROLE_TABS[String(role)];
    if (resolved) return resolved;
    // Unknown role: never show another role's operational console (worse than
    // nothing), but never a blank app either. Every authenticated staff member
    // gets the universal PERSONAL set so they can see their workspace and,
    // critically, punch their own attendance.
    return [
      { id: "my-workspace", label: "My Workspace", icon: ClipboardCheck },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
    ];
  };

  // Dynamically ensure every role has the "My Profile" tab
  Object.keys(ROLE_TABS).forEach(role => {
    const tabs = ROLE_TABS[role];
    // "MY RESPONSIBILITY" phase 3 — every staff member gets a personal My Workspace tab
    // (My Jobs / Pending / Breaches / Performance / Incentives / Attendance).
    if (!tabs.some(t => t.id === "my-workspace")) {
      tabs.unshift({ id: "my-workspace", label: "My Workspace", icon: ClipboardCheck });
    }
    // Every staff member punches their own attendance (geofenced self-service),
    // so the Attendance tab must exist for every role — previously it was only on
    // the roles that listed it explicitly, leaving others with no way to punch.
    if (!tabs.some(t => t.id === "attendance")) {
      tabs.push({ id: "attendance", label: "Attendance", icon: ClipboardCheck });
    }
    const breakdownRoles = ["service_manager", "workshop_manager", "supervisor", "floor_supervisor", "floor_incharge", "admin", "developer"];
    if (breakdownRoles.includes(role) && !tabs.some(t => t.id === "breakdown")) {
      const dbIdx = tabs.findIndex(t => t.id === "dashboard");
      const insertIdx = dbIdx !== -1 ? dbIdx + 1 : 0;
      tabs.splice(insertIdx, 0, { id: "breakdown", label: "Breakdowns", icon: AlertTriangle });
    }
    if (!tabs.some(t => t.id === "tech-profile")) {
      tabs.push({ id: "tech-profile", label: "My Profile", icon: UserIcon });
    }
    // Every employee can request leave, view the holiday calendar, and file
    // a grievance — these are personal/company-wide HR functions, not role-
    // gated operational screens. Write/approve actions are still enforced
    // server-side (HR_APPROVER_ROLES) regardless of nav visibility.
    if (!tabs.some(t => t.id === "leave-management")) {
      tabs.push({ id: "leave-management", label: "Leave Management", icon: ClipboardCheck });
    }
    if (!tabs.some(t => t.id === "holidays")) {
      tabs.push({ id: "holidays", label: "Holidays", icon: ClipboardCheck });
    }
    if (!tabs.some(t => t.id === "grievance")) {
      tabs.push({ id: "grievance", label: "Grievance", icon: ShieldAlert });
    }
    // Training records and the performance aggregation view are management-
    // facing (viewing/administering other employees' records), matching the
    // backend's own HR_APPROVER_ROLES gate.
    const hrApproverRoles = ["admin", "developer", "workshop_manager", "service_manager", "general_manager", "gm_service"];
    if (hrApproverRoles.includes(role)) {
      if (!tabs.some(t => t.id === "training-development")) {
        tabs.push({ id: "training-development", label: "Training & Development", icon: Shield });
      }
      if (!tabs.some(t => t.id === "employee-performance")) {
        tabs.push({ id: "employee-performance", label: "Employee Performance", icon: TrendingUp });
      }
    }
  });



  // Keep the active tab safe on user load or role change.
  //
  // This is also what makes a DEEP LINK safe: a URL naming a screen this role
  // does not have resolves here and is replaced with the role's own first
  // screen. It runs on [user, activeTab] rather than [user] alone, because with
  // URL navigation the tab can now change without the user changing — someone
  // can type or paste a path at any time, not only at load.
  //
  // `replace: true`, so the rejected URL does not become a history entry the
  // Back button bounces off. Client-side redirection is a usability control,
  // not the security boundary: every /api route enforces its own role check
  // server-side, so reaching a screen never grants its data.
  useEffect(() => {
    if (!user) return;
    const permitted = tabsForRole(user.role);
    if (permitted.length > 0 && !permitted.some(t => t.id === activeTab)) {
      navigate(pathFromTab(permitted[0].id), { replace: true });
    }
  }, [user, activeTab, navigate]);

  // Workshop Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [srTypes, setSrTypes] = useState<SRType[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  // P1/D-6: set when a workshop-data load fails, so screens can distinguish
  // "the request failed" from "there is nothing here".
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<JobTechnicianMap[]>([]);
  const [revenues, setRevenues] = useState<JobRevenue[]>([]);
  const [splitDetails, setSplitDetails] = useState<JobRevenueSplitDetail[]>([]);
  // KEPT despite having no reader today.
  //
  // Unlike the other dead state removed in this change, these are FETCHED from
  // live endpoints (/api/carry-forward, /api/rework) and kept current. Deleting
  // them would mean deleting those two requests as well — and carry-forward and
  // rework are real workflow features with working raise and resolve handlers
  // in this same file, so the data is loaded for a screen that has not been
  // built rather than for something abandoned.
  //
  // Removing the fetches would quietly take that away; leaving them loaded but
  // unread costs two requests per refresh. That trade is the owner's call, not
  // a cleanup decision, so it is recorded here rather than made silently.
  const [carryForwardLogs, setCarryForwardLogs] = useState<CarryForwardLog[]>([]);
  const [reworkLogs, setReworkLogs] = useState<ReworkLog[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [revenueSplits, setRevenueSplits] = useState<RevenueSplitMaster[]>([]);

  // Selected Job (navigated from dashboard)
  const [dashboardSelectedJob, setDashboardSelectedJob] = useState<JobCard | null>(null);
  const [jobsAssignFilter, setJobsAssignFilter] = useState<"sa" | "tech" | null>(null);

  // Revenue state for Projected vs Generated
  const [projectedRevenue, setProjectedRevenue] = useState<number>(0);
  const [generatedRevenue, setGeneratedRevenue] = useState<number>(0);

  // Database manual reload state
  const [isReloading, setIsReloading] = useState(false);
  const [reloadSuccess, setReloadSuccess] = useState(false);

  const handleReloadDatabase = async () => {
    setIsReloading(true);
    setReloadSuccess(false);
    try {
      // The endpoint now requires an admin/developer JWT.
      const res = await fetch("/api/db/reload", { method: "POST", headers: staffAuthHeaders() });
      if (res.ok) {
        await fetchAllData();
        setReloadSuccess(true);
        setTimeout(() => setReloadSuccess(false), 3000);
      } else {
        console.error("Failed to reload database:", await res.text());
      }
    } catch (e) {
      console.error("Error reloading database:", e);
    } finally {
      setIsReloading(false);
    }
  };

  // REMOVED: the "clear all job cards" feature.
  //
  // It deleted every job card, technician map, split revenue, rework and
  // carry-forward log, and reset bays and employee revenues — behind a modal
  // whose confirm button read "Yes, Destroy Data".
  //
  // It was unreachable: handleClearJobCards() (which was the only thing that
  // opened the modal) had no callers anywhere in the codebase, so the modal
  // could never be shown. It was also the one remaining write that sent NO
  // Authorization header and carried no client-side role check of its own.
  //
  // Removed rather than repaired. Wiring a token onto an unreachable
  // irreversible data-destruction button would make it reachable, which is a
  // decision for the owner and not a bug fix. The server endpoint
  // (POST /api/db/clear-job-cards) still exists and is properly guarded with
  // authenticateToken + requireRoles(["admin","developer"]), so the capability
  // remains available deliberately — it just no longer sits one stray onClick
  // away from wiping the workshop.

  // Fetch all database state from server
  const fetchAllData = async (authToken?: string) => {
    const activeToken = authToken || token;
    // P1/D-6: a failed load used to be logged to the console only, so the Job
    // Cards list rendered its "no job cards" empty state — a failed fetch was
    // indistinguishable from a genuinely empty workshop.
    setDataLoadError(null);
    if (!activeToken) {
      console.warn("Skipping fetchAllData: No active token available.");
      return;
    }

    try {
      const headers = {
        "Authorization": `Bearer ${activeToken}`
      };

      const [
        empRes,
        bayRes,
        srRes,
        jobRes,
        revRes,
        cfRes,
        reworkRes,
        alertRes,
        splitRes
      ] = await Promise.all([
        fetch("/api/employees", { headers }),
        fetch("/api/bays", { headers }),
        fetch("/api/sr-types", { headers }),
        fetch("/api/job-cards", { headers }),
        fetch("/api/job-revenues", { headers }),
        fetch("/api/carry-forward", { headers }),
        fetch("/api/rework", { headers }),
        fetch("/api/alerts", { headers }),
        fetch("/api/revenue-splits", { headers })
      ]);

      if (empRes.status === 401 || jobRes.status === 401) {
        console.warn("Session expired or invalid token. Logging out...");
        handleLogout();
        return;
      }

      // B-3: a failed request must NOT become an empty screen.
      //
      // These calls used to run .json() on every response without checking
      // res.ok. A 500 returns {"error": "..."} — valid JSON, so nothing threw,
      // it simply failed Array.isArray() and the state was set to []. The
      // workshop then showed ZERO bays (or employees, or service types) with no
      // error anywhere, because dataLoadError only catches a thrown exception
      // and a clean HTTP error never throws.
      //
      // readList keeps the last known value on failure instead of replacing it
      // with an empty one, and records which endpoints failed so the user is
      // told rather than shown a fabricated empty workshop.
      const failed: string[] = [];

      const readJson = async (res: Response, label: string): Promise<any | null> => {
        if (!res.ok) {
          console.error(`[fetchAllData] ${label} failed: HTTP ${res.status}`);
          failed.push(label);
          return null;
        }
        try {
          return await res.json();
        } catch (e: any) {
          console.error(`[fetchAllData] ${label} returned unreadable JSON: ${e?.message}`);
          failed.push(label);
          return null;
        }
      };

      /** Apply a list only when it genuinely arrived; otherwise keep what we have. */
      const applyList = <T,>(data: any, setter: (v: T[]) => void) => {
        if (Array.isArray(data)) setter(data as T[]);
      };

      const empJson = await readJson(empRes, "employees");
      applyList<Employee>(empJson, setEmployees);

      const bayJson = await readJson(bayRes, "bays");
      applyList<Bay>(bayJson, setBays);

      const srJson = await readJson(srRes, "service types");
      applyList<SRType>(srJson, setSrTypes);

      const splitJson = await readJson(splitRes, "revenue splits");
      applyList<RevenueSplitMaster>(splitJson, setRevenueSplits);

      const jobsData = await readJson(jobRes, "job cards");
      if (jobsData) {
        const rawJobs = jobsData.jobCards || jobsData.data || (Array.isArray(jobsData) ? jobsData : []);
        if (Array.isArray(rawJobs)) setJobCards(rawJobs);
        if (Array.isArray(jobsData.technicianMaps)) setAllocations(jobsData.technicianMaps);
        setProjectedRevenue(jobsData.projectedRevenue || 0);
        setGeneratedRevenue(jobsData.generatedRevenue || 0);
      }

      const revsData = await readJson(revRes, "job revenues");
      if (revsData) {
        if (Array.isArray(revsData.revenues)) setRevenues(revsData.revenues);
        if (Array.isArray(revsData.details)) setSplitDetails(revsData.details);
      }

      const cfJson = await readJson(cfRes, "carry forward");
      applyList<CarryForwardLog>(cfJson, setCarryForwardLogs);

      const reworkJson = await readJson(reworkRes, "rework");
      applyList<ReworkLog>(reworkJson, setReworkLogs);

      const alertJson = await readJson(alertRes, "alerts");
      applyList<AlertLog>(alertJson, setAlertLogs);

      // Say what could not be loaded. Screens already distinguish this from a
      // genuinely empty workshop via dataLoadError (P1/D-6).
      if (failed.length > 0) {
        setDataLoadError(
          `Could not load: ${failed.join(", ")}. Those screens are showing the last data received, not current data.`
        );
      }
    } catch (error: any) {
      console.error("Error loading workshop data from server:", error);
      setDataLoadError(
        error?.message ? `Could not load workshop data: ${error.message}` : "Could not load workshop data."
      );
    }
  };

  // Auth initiation on load
  useEffect(() => {
    const savedUser = localStorage.getItem("wms_user");
    const savedToken = getStaffToken();
    if (savedUser && savedToken) {
      fetchAllData(savedToken);
    }
  }, []);

  // Session Sync Engine: Poll /api/auth/me every 30 seconds.
  // FIX: was polling every 4s and had an infinite loop caused by depending on
  // [token, user?.role] — setUser() created a new object ref → user?.role
  // re-evaluated → effect re-ran → role detected as "changed" on every tick.
  // Fix: depend only on [token], use a ref for stable last-synced comparison.
  const lastSyncedUserRef = React.useRef<{ role?: string; full_name?: string; is_active?: boolean } | null>(null);

  useEffect(() => {
    if (!token || !user) return;

    lastSyncedUserRef.current = {
      role: user.role,
      full_name: user.full_name,
      is_active: user.is_active,
    };

    const syncSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.status === 401) {
          handleLogout();
          return;
        }
        if (res.ok) {
          const data = await res.json();
          const freshUser = data.user;
          const freshPermissions = data.permissions;

          if (freshPermissions && Array.isArray(freshPermissions)) {
            setUserPermissions(freshPermissions);
          }

          const prev = lastSyncedUserRef.current;
          const roleChanged   = freshUser?.role      !== prev?.role;
          const nameChanged   = freshUser?.full_name !== prev?.full_name;
          const activeChanged = freshUser?.is_active !== prev?.is_active;

          if (freshUser && (roleChanged || nameChanged || activeChanged)) {
            console.log("[Session Sync] Change detected. role:", prev?.role, "→", freshUser.role);
            lastSyncedUserRef.current = {
              role: freshUser.role,
              full_name: freshUser.full_name,
              is_active: freshUser.is_active,
            };
            setUser((prev: any) => {
              const updated = { ...prev, ...freshUser };
              localStorage.setItem("wms_user", JSON.stringify(updated));
              return updated;
            });
            const currentRoleTabs = tabsForRole(freshUser.role);
            setActiveTab((cur: string) =>
              currentRoleTabs.some((t: any) => t.id === cur)
                ? cur
                : (currentRoleTabs[0]?.id || "dashboard")
            );
          }
        }
      } catch (e) {
        // Silent fail — network blip should not disrupt the user
      }
    };

    syncSession();
    const intervalId = setInterval(syncSession, 30000);
    return () => clearInterval(intervalId);
  }, [token]);

  // AI Mode is global server state — pull it (and this user's rights over it)
  // whenever the session changes, and poll so a GM switching it off elsewhere
  // reaches every open session without a reload.
  useEffect(() => {
    if (!token) return;
    refreshAiMode();
    const id = setInterval(refreshAiMode, 60000);
    return () => clearInterval(id);
  }, [token, refreshAiMode]);

  const handleLogout = async () => {
    localStorage.removeItem("wms_user");
    clearStaffToken();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  // --- ACTIONS CONTROLLERS ---

  // Helper to build auth headers for API calls
  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  });

  // `silent` is for callers that render their own richer inline confirmation
  // (Gate Entry shows the job number, VRN and downstream routing). Without it
  // a single gate-in fired BOTH the generic toast and that banner, which on a
  // phone stacked on top of each other and covered the workspace header.
  // Callers that have no inline feedback of their own (Job Cards, the reception
  // panel) leave it off and keep relying on these toasts.
  const handleCreateJob = async (
    jobData: Partial<JobCard>,
    options?: { silent?: boolean }
  ) => {
    const silent = options?.silent === true;
    try {
      const res = await fetch("/api/job-cards", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        fetchAllData();
        if (data?.pendingApproval) {
          if (!silent) showToast(data.message || "Same-day re-entry sent for GM approval.", "info");
          return { success: false, pendingApproval: true, message: data.message };
        }
        if (!silent) showToast("Job card created successfully.", "success");
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        if (!silent) showToast(`Failed to create job card: ${err.error || res.statusText}`, "error");
        return { success: false, message: err.error || res.statusText };
      }
    } catch (e: any) {
      console.error(e);
      if (!silent) showToast("Network error creating job card. Please try again.", "error");
      return { success: false, message: "Network error creating job card." };
    }
  };

  const handleUpdateJobStatus = async (id: number, status: JobCard["status"]) => {
    try {
      const res = await fetch(`/api/job-cards/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAllData();
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to update job status: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error updating job status.", "error");
    }
  };

  const handleDeleteJob = async (id: number, reason: string) => {
    try {
      const res = await fetch(`/api/job-cards/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchAllData();
        showToast("Job card permanently deleted.", "success");
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to delete job card: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error deleting job card.", "error");
    }
  };

  /**
   * Returns whether the update was actually persisted.
   *
   * It used to return nothing, so a caller could not tell a saved write from a
   * refused one. The advisor's "Save Estimate & Lock" relied on that: it fired
   * "Estimate of ₹200 saved!" immediately, while the server was rejecting the
   * write because parts_amount was locked for that role. Both messages appeared
   * on screen at once, and the success one was false.
   */
  const handleUpdateJob = async (id: number, updatedFields: Partial<JobCard>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/job-cards/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        fetchAllData();
        return true;
      }
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      showToast(`Failed to update job card: ${err.error || res.statusText}`, "error");
      return false;
    } catch (e: any) {
      console.error(e);
      showToast("Network error updating job card.", "error");
      return false;
    }
  };

  const handleAssignTechnicians = async (id: number, allocs: { employee_id: number; tech_role: string }[]) => {
    try {
      const res = await fetch(`/api/job-cards/${id}/assign`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ allocations: allocs })
      });
      if (res.ok) {
        fetchAllData();
        showToast("Technicians assigned successfully.", "success");
        return true;
      }
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      showToast(`Failed to assign technicians: ${err.error || res.statusText}`, "error");
      // P1/D-5: the caller announced success regardless of the outcome. It now
      // depends on this returned value.
      return false;
    } catch (e: any) {
      console.error(e);
      showToast("Network error assigning technicians.", "error");
      return false;
    }
  };

  const handleCalculateRevenue = async (id: number, labour: number, parts: number) => {
    try {
      const res = await fetch(`/api/job-cards/${id}/revenue`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ labour_amount: labour, parts_amount: parts })
      });
      if (res.ok) {
        fetchAllData();
        showToast("Revenue calculated and saved.", "success");
        return true;
      }
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      showToast(`Revenue calculation failed: ${err.error || res.statusText}`, "error");
      // P1/D-5: see above — the caller now reports only what happened.
      return false;
    } catch (e: any) {
      console.error(e);
      showToast("Network error calculating revenue.", "error");
      return false;
    }
  };

  /**
   * The single write path for the master-data and workflow actions below.
   *
   * WHY THIS EXISTS
   *
   * Thirteen handlers sent `headers: { "Content-Type": "application/json" }`
   * with NO Authorization header, while every other handler used authHeaders().
   * Every one of those routes sits behind the global /api JWT gate, so they did
   * not fail sometimes — they returned 401 EVERY time. Verified against
   * production: /api/bays, /api/sr-types, /api/revenue-splits,
   * /api/carry-forward, /api/rework and /api/alerts/acknowledge all answer 401
   * without a token.
   *
   * They also ended at `if (res.ok) fetchAllData();` with no else, so the
   * rejection was invisible: the user clicked Add Bay, nothing happened, and
   * nothing said why. Ten user-facing features were dead in a way that looked
   * like a dead button — which is most likely why bay, SR-type and split
   * management appear unused.
   *
   * Routing them through one helper fixes both at once and stops the pattern
   * being re-introduced by the next handler copied from its neighbour. Each
   * route keeps its own server-side role gate (requireRoles), which is the
   * actual authority — this only ensures the request is allowed to reach it.
   */
  const submitWrite = async (
    url: string,
    options: { method?: string; body?: any; action: string }
  ): Promise<boolean> => {
    const { method = "POST", body, action } = options;
    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
      if (res.ok) {
        fetchAllData();
        return true;
      }
      const err = await res.json().catch(() => ({}));
      // A refused write must reach the user. 401/403 are reported in the terms
      // that actually apply rather than as a generic failure, because "you are
      // not permitted" and "the server is broken" call for different responses.
      if (res.status === 401) {
        showToast(`${action} failed: your session has expired. Sign in again.`, "error");
      } else if (res.status === 403) {
        showToast(`${action} failed: your role is not permitted to do this.`, "error");
      } else {
        showToast(`${action} failed: ${err.error || res.statusText || `HTTP ${res.status}`}`, "error");
      }
      return false;
    } catch (e: any) {
      console.error(`[${action}]`, e);
      showToast(`Network error — ${action.toLowerCase()} did not complete.`, "error");
      return false;
    }
  };

  const handleRaiseCarryForward = async (id: number, reason: string) =>
    submitWrite("/api/carry-forward", {
      body: { job_id: id, cf_reason: reason },
      action: "Raise carry forward"
    });

  const handleRaiseRework = async (id: number, reason: string, originalTechId: number) =>
    submitWrite("/api/rework", {
      body: { original_job_id: id, rework_reason: reason, original_tech_id: originalTechId },
      action: "Raise rework"
    });

  const handleResolveCarryForward = async (id: number, status: "Approved" | "Rejected") => {
    try {
      // authHeaders(), not a bare Content-Type. This route is behind the global
      // /api JWT gate, so without the token it returned 401 on every approval —
      // the error WAS reported here, but it could only ever say "access denied".
      const res = await fetch(`/api/carry-forward/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ cf_status: status, approved_by: user?.employee_id || 1 })
      });
      if (res.ok) {
        fetchAllData();
        showToast(`Carry forward request ${status.toLowerCase()} successfully.`, "success");
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to update carry forward: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error resolving carry forward.", "error");
    }
  };

  const handleResolveRework = async (id: number, status: "Approved" | "Rejected") => {
    try {
      // Same 401-on-every-call defect as the carry-forward resolver above.
      const res = await fetch(`/api/rework/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ rework_status: status, approved_by: user?.employee_id || 1 })
      });
      if (res.ok) {
        fetchAllData();
        showToast(`Rework request ${status.toLowerCase()} successfully.`, "success");
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to update rework request: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error resolving rework request.", "error");
    }
  };


  // Both handlers previously ended at `if (res.ok) fetchAllData();` with no else,
  // so a rejected save — an invalid mobile now returns 400 — looked exactly like
  // no click at all. Validation that the user cannot see is not validation.
  const handleAddEmployee = async (employeeData: Partial<Employee>) => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(employeeData)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error || `Could not add employee (HTTP ${res.status}).`);
        return;
      }
      fetchAllData();
    } catch (e: any) {
      console.error(e);
      alert(`Could not reach the server to add this employee. ${e?.message || ""}`.trim());
    }
  };

  const handleUpdateEmployee = async (id: number, employeeData: Partial<Employee>) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(employeeData)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error || `Could not save changes (HTTP ${res.status}).`);
        return;
      }
      fetchAllData();
    } catch (e: any) {
      console.error(e);
      alert(`Could not reach the server to save this employee. ${e?.message || ""}`.trim());
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    const emp = employees.find((e: any) => e.employee_id === id);
    const who = emp ? `${emp.full_name} (${emp.employee_code || `ID ${id}`})` : `employee ID ${id}`;
    if (!confirm(`Delete ${who}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      // A failed DELETE used to fall through this `if` with no else, so a
      // refused delete looked identical to no click at all. Every non-OK
      // response now reaches the user.
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.error || `Could not delete ${who} (HTTP ${res.status}).`);
        return;
      }
      fetchAllData();
    } catch (e: any) {
      console.error(e);
      alert(`Could not reach the server to delete ${who}. ${e?.message || ""}`.trim());
    }
  };

  const handleBulkImportEmployees = async (employeesList: any[]) => {
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ employees: employeesList })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) await fetchAllData();
      // The endpoint rejects rows with missing/invalid data instead of
      // fabricating values — surface those so a partial import isn't mistaken
      // for a full one.
      const rejected = Array.isArray(data?.rejected) ? data.rejected : [];
      if (rejected.length) {
        const preview = rejected.slice(0, 8)
          .map((r: any) => `Row ${r.row}${r.full_name ? ` (${r.full_name})` : ""}: ${(r.errors || []).join("; ")}`)
          .join("\n");
        alert(`Imported ${data?.count ?? 0} employee(s).\n${rejected.length} row(s) rejected for missing/invalid data:\n\n${preview}${rejected.length > 8 ? `\n…and ${rejected.length - 8} more.` : ""}`);
      }
      return data;
    } catch (e) {
      console.error(e);
    }
  };

  // All of these routed through the old no-Authorization pattern and therefore
  // returned 401 on every call, silently. They now go through submitWrite(),
  // which attaches the token and surfaces a refusal. Each route keeps its own
  // server-side requireRoles gate — verified present for every one of them.
  const handleAddBay = (bayData: any) =>
    submitWrite("/api/bays", { body: bayData, action: "Add bay" });

  const handleUpdateBay = (id: number, bayData: any) =>
    submitWrite(`/api/bays/${id}`, { method: "PUT", body: bayData, action: "Update bay" });

  const handleDeleteBay = (id: number) =>
    submitWrite(`/api/bays/${id}`, { method: "DELETE", action: "Delete bay" });

  const handleAddSRType = (srTypeData: any) =>
    submitWrite("/api/sr-types", { body: srTypeData, action: "Add service type" });

  const handleUpdateSRType = (id: number, srTypeData: any) =>
    submitWrite(`/api/sr-types/${id}`, { method: "PUT", body: srTypeData, action: "Update service type" });

  const handleDeleteSRType = (id: number) =>
    submitWrite(`/api/sr-types/${id}`, { method: "DELETE", action: "Delete service type" });

  const handleAddSplit = (splitData: any) =>
    submitWrite("/api/revenue-splits", { body: splitData, action: "Add revenue split" });

  const handleUpdateSplit = (id: number, splitData: any) =>
    submitWrite(`/api/revenue-splits/${id}`, { method: "PUT", body: splitData, action: "Update revenue split" });

  const handleDeleteSplit = (id: number) =>
    submitWrite(`/api/revenue-splits/${id}`, { method: "DELETE", action: "Delete revenue split" });

  const handleAcknowledgeAlert = (id: number) =>
    submitWrite("/api/alerts/acknowledge", { body: { alert_id: id }, action: "Acknowledge alert" });

  const handleImportRows = (fileName: string, rows: any[]) =>
    submitWrite("/api/dms/import", { body: { file_name: fileName, rows }, action: "DMS import" });

  const handleResolveRow = (rowId: number, status: DMSImportRow["match_status"], matchedJobId: number) =>
    submitWrite("/api/dms/resolve", {
      body: { row_id: rowId, match_status: status, matched_job_id: matchedJobId },
      action: "Resolve DMS row"
    });

  if (!user && !needsAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans">
        <FunnyLoader message="Verifying Operator Credentials..." />
      </div>
    );
  }

  if (!user && needsAuth) {
    return (
      <AuthScreen
        onAuthSuccess={(currentUser, currentToken) => {
          localStorage.setItem("wms_user", JSON.stringify(currentUser));
          setStaffToken(currentToken || "");
          setUser(currentUser);
          setToken(currentToken);
          setNeedsAuth(false);

          // AUTHORIZED RETURN AFTER LOGIN.
          //
          // Send the user back to the screen they originally asked for — a
          // bookmarked or shared link now survives the sign-in — but ONLY when
          // their role actually has that screen. resolvePostLoginPath falls
          // back to "/" otherwise, so a deep link cannot be used to reach, or
          // to probe the existence of, a screen the role does not carry.
          //
          // Computed from the role's OWN tab list rather than the rendered nav,
          // because permittedTabs is not in scope here and the nav additionally
          // filters on server permissions that have not loaded yet at this
          // moment. The [user, activeTab] guard above re-checks once they have.
          const permittedIds = tabsForRole(currentUser?.role).map((t: any) => t.id);
          const target = resolvePostLoginPath(attemptedPathRef.current, permittedIds);
          attemptedPathRef.current = null;
          // replace: the login screen should not sit in history behind them.
          navigate(target, { replace: true });

          // Pass token directly — React state is async so `token` is still null here
          fetchAllData(currentToken || undefined);
        }}
      />
    );
  }

  const baseTabs = tabsForRole(user?.role).filter(
    t => {
      if (t.id === "assistant" && !aiModeEnabled) return false;
      const isRc1 = import.meta.env.VITE_WORKFORCE_PROFILE === "rc1";
      if (isRc1) {
        const excludedTabs = [
          "breakdown",
          "customer-portal",
          "assistant",
          "live-support",
          "mobile-platform",
          "certification"
        ];
        if (excludedTabs.includes(t.id)) return false;
      }
      return isTabPermitted(t.id);
    }
  );

  const permittedTabs = [
    ...baseTabs,
    { id: "logout-deep-link", label: "Logout", icon: LogOut }
  ];

  return (
    <AppShell
      user={user}
      activeTab={activeTab}
      permittedTabs={permittedTabs}
      setActiveTab={setActiveTab}
      handleLogout={handleLogout}
      aiModeEnabled={aiModeEnabled}
      onToggleAiMode={handleAiModeClick}
      aiModeCanToggle={aiModeCanToggle}
      aiModeCanRequest={aiModeCanRequest}
      aiModePendingRequests={aiModePending}
    >

          {activeTab === "my-workspace" && (() => {
            // Individual-operator roles land on their own dedicated, already-
            // real workspace component (same one their former standalone tab
            // rendered, same props) instead of the generic summary — this is
            // what makes "My Workspace" genuinely personal per role. Manager-
            // tier and other roles with no dedicated component fall back to
            // the generic MyWorkspace.tsx below, unchanged.
            const DedicatedWorkspace = resolveMyWorkspaceComponent(user?.role);
            if (DedicatedWorkspace) {
              return (
                <DedicatedWorkspace
                  jobCards={jobCards}
                  bays={bays}
                  employees={employees}
                  alertLogs={alertLogs}
                  allocations={allocations}
                  onRefresh={fetchAllData}
                  onUpdateJob={handleUpdateJob}
                  onAssignTechnicians={handleAssignTechnicians}
                  currentUser={user}
                  aiModeEnabled={aiModeEnabled}
                />
              );
            }
            return (
              <MyWorkspace
                currentUser={user}
                onOpenJob={(job) => {
                  setDashboardSelectedJob(job);
                  setActiveTab("jobs");
                }}
              />
            );
          })()}

          {activeTab === "oem-integrations" && (
            <ExternalIntegrations />
          )}

          {activeTab === "dashboard" && (
            <Dashboard
              jobCards={jobCards}
              bays={bays}
              alerts={alertLogs}
              employees={employees}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onSelectJob={(job) => {
                setDashboardSelectedJob(job);
                setActiveTab("jobs");
              }}
              onTabChange={(tab) => setActiveTab(tab as any)}
              onPendingAssignDrill={(kind) => { setJobsAssignFilter(kind); setActiveTab("jobs"); }}
              projectedRevenue={projectedRevenue}
              generatedRevenue={generatedRevenue}
              aiModeEnabled={aiModeEnabled}
              canManageWorkforce={["admin", "developer", "workshop_manager", "service_manager", "gm_service"].includes(userRole)}
              currentUser={user}
              onRefresh={fetchAllData}
              allocations={allocations}
              onUpdateJob={handleUpdateJob}
              onAssignTechnicians={handleAssignTechnicians}
              onResolveCarryForward={handleResolveCarryForward}
              onResolveRework={handleResolveRework}
              onRaiseCarryForward={handleRaiseCarryForward}
              onRaiseRework={handleRaiseRework}
              revenues={revenues}
              splitDetails={splitDetails}
            />
          )}

          {activeTab === "vehicle-lookup" && (
            <VehicleLookup
              jobCards={jobCards}
              employees={employees}
              initialQuery={lookupQuery}
              onClearQuery={() => setLookupQuery("")}
            />
          )}

          {activeTab === "breakdown" && (
            <BreakdownManagement />
          )}

          {activeTab === "jobs" && (
            <JobCardManager 
              jobCards={jobCards || []}
              dataLoadError={dataLoadError}
              onRetryLoad={() => fetchAllData()}
              bays={bays || []}
              srTypes={srTypes || []}
              employees={employees || []}
              allocations={allocations || []}
              revenues={revenues || []}
              splitDetails={splitDetails || []}
              onCreateJob={handleCreateJob}
              onUpdateJob={handleUpdateJob}
              onUpdateJobStatus={handleUpdateJobStatus}
              onAssignTechnicians={handleAssignTechnicians}
              onCalculateRevenue={handleCalculateRevenue}
              onRaiseCarryForward={handleRaiseCarryForward}
              onRaiseRework={handleRaiseRework}
              onDeleteJob={handleDeleteJob}
              selectedJobExternal={dashboardSelectedJob}
              currentUserRole={userRole}
              currentUser={user}
              onLookupVehicle={handleLookupVehicle}
              aiModeEnabled={aiModeEnabled}
              initialAssignFilter={jobsAssignFilter}
              onClearAssignFilter={() => setJobsAssignFilter(null)}
            />
          )}

          {activeTab === "employees" && (
            <EmployeeDirectory 
              employees={employees}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onBulkImportEmployees={handleBulkImportEmployees}
              bays={bays}
              onAddBay={handleAddBay}
              onUpdateBay={handleUpdateBay}
              onDeleteBay={handleDeleteBay}
              srTypes={srTypes}
              onAddSRType={handleAddSRType}
              onUpdateSRType={handleUpdateSRType}
              onDeleteSRType={handleDeleteSRType}
              revenueSplits={revenueSplits}
              onAddSplit={handleAddSplit}
              onUpdateSplit={handleUpdateSplit}
              onDeleteSplit={handleDeleteSplit}
              isAdmin={isAdmin}
              setIsAdmin={() => {}}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "productivity" && (
            <ProductivityDashboard 
              employees={employees}
              jobCards={jobCards}
              onRefresh={fetchAllData}
              isAdmin={isAdmin}
              isManager={isManager}
              setIsAdmin={() => {}}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "bay-tat" && (
            <ActiveBayTatMonitor 
              jobCards={jobCards}
              bays={bays}
              employees={employees}
              onUpdateJob={handleUpdateJob}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "dms-import" && (
            <DmsImporter
              jobCards={jobCards}
              onImportRows={handleImportRows}
              onResolveRow={handleResolveRow}
              isAdmin={isAdmin}
              userRole={userRole}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "master-data-hub" && (
            <EnterpriseMasterDataHub />
          )}

          {["integration-monitor", "external-systems", "sync-queue", "api-logs", "health-dashboard", "integration-config"].includes(activeTab) && (
            <PlatformControlCenter initialTab={activeTab} />
          )}


           {activeTab === "billing-exit" && (
            <React.Suspense fallback={<FunnyLoader message="Loading checkout portal..." />}>
              <BillingExit 
                jobCards={jobCards}
                onUpdateJob={handleUpdateJob}
                onRefresh={fetchAllData}
              />
            </React.Suspense>
          )}

          {activeTab === "assistant" && aiModeEnabled && (
            <GeminiAssistant 
              employees={employees}
              bays={bays}
              jobCards={jobCards}
              alerts={alertLogs}
            />
          )}

          {activeTab === "users" && (
            <>
              {/* The server holds job cards, employees and permissions in an
                  in-memory cache loaded at boot. After a direct database change
                  this reloads it without a redeploy. handleReloadDatabase
                  existed but was never wired to anything. */}
              <div className="flex items-center justify-end gap-3 mb-3">
                {reloadSuccess && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1">
                    Cache reloaded from database.
                  </span>
                )}
                <button
                  onClick={handleReloadDatabase}
                  disabled={isReloading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 border border-slate-200 rounded-lg px-3 py-1.5 transition cursor-pointer"
                >
                  <Database className={`h-3.5 w-3.5 ${isReloading ? "animate-pulse" : ""}`} />
                  <span>{isReloading ? "Reloading…" : "Reload Database Cache"}</span>
                </button>
              </div>
              <UserManagement currentUser={user} token={token} />
            </>
          )}

          {activeTab === "certification" && (
            <CpscCertificationPanel />
          )}

          {activeTab === "attendance" && (
            <AttendanceShiftLog 
              employees={employees} 
              currentUser={user} 
              token={token} 
              jobCards={jobCards} 
            />
          )}

          {activeTab === "advisor-workspace" && (
            <ServiceAdvisorWorkspace 
              jobCards={jobCards}
              bays={bays}
              employees={employees}
              alertLogs={alertLogs}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              onAssignTechnicians={handleAssignTechnicians}
              currentUser={user}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "supervisor-workspace" && (
            <FloorSupervisorWorkspace 
              jobCards={jobCards}
              bays={bays}
              employees={employees}
              alertLogs={alertLogs}
              allocations={allocations}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              onAssignTechnicians={handleAssignTechnicians}
              currentUser={user}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "receptionist-workspace" && (
            <ReceptionistWorkspace
              currentUser={user}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "manager-assignment-workspace" && (
            <ManagerAssignmentWorkspace
              currentUser={user}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "technician-workspace" && (
            <TechnicianWorkspace 
              jobCards={jobCards}
              employees={employees}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              currentUser={user}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "qc-workspace" && (
            <QCInspectorWorkspace 
              jobCards={jobCards}
              employees={employees}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              currentUser={user}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "billing-workspace" && (
            <BillingWorkspace 
              jobCards={jobCards}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              currentUser={user}
            />
          )}

          {activeTab === "cashier-workspace" && (
            <CashierWorkspace 
              jobCards={jobCards}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              currentUser={user}
            />
          )}

          {activeTab === "delivery-workspace" && (
            <VehicleDeliveryWorkspace 
              jobCards={jobCards}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              currentUser={user}
            />
          )}

          {activeTab === "customer-portal" && (
            <CustomerExperiencePlatform 
              jobCards={jobCards}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "mobile-platform" && (
            <MobilePlatformWorkspace 
              jobCards={jobCards}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "ai-brains" && user?.role === "developer" && (
            <AiBrainsPanel />
          )}

          {activeTab === "jc-audit-log" && (
            ["admin", "developer"].includes(user?.role) ? <JcAuditLog /> : null
          )}

          {activeTab === "live-support" && (
            <LiveSupportPanel
              showToast={showToast}
            />
          )}


          {activeTab === "gate-entry" && (
            <ErrorBoundary fallbackMessage="Gate Inward Registry encountered an issue. Tap retry to restore.">
              <React.Suspense fallback={<FunnyLoader message="Loading gate registry..." />}>
                <GateEntryManager
                  bays={bays}
                  jobCards={jobCards}
                  onCreateJob={handleCreateJob}
                  onUpdateJob={handleUpdateJob}
                  onRefresh={fetchAllData}
                  readOnly={!GATE_IN_ROLES.includes(
                    String(user?.role || "").toLowerCase().trim().replace(/[\s_]+/g, "_")
                  )}
                />
              </React.Suspense>
            </ErrorBoundary>
          )}

          {activeTab === "security-workspace" && (
            <SecurityWorkspace 
              jobCards={jobCards}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              currentUser={user}
            />
          )}

          { activeTab === "parts-incharge-workspace" && (
            <PartsInChargeWorkspace currentUser={user} />
          )}

          { activeTab === "warranty-clerk-workspace" && (
            <WarrantyClerkWorkspace currentUser={user} />
          )}

          {activeTab === "parts-warranty" && (
            <PartsWarrantyManager 
              jobCards={jobCards} 
              onUpdateJob={handleUpdateJob}
              onRefresh={fetchAllData} 
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "tech-jobs" && (
            <TechnicianJobsPanel jobCards={jobCards} employeeId={employeeId} onUpdateJobStatus={handleUpdateJobStatus} onRefresh={fetchAllData} />
          )}

          {activeTab === "tech-kpi" && (
            <TechnicianKpiPanel employees={employees} employeeId={employeeId} />
          )}

          {activeTab === "tech-profile" && (
            <TechnicianProfilePanel employees={employees} employeeId={employeeId} />
          )}

          {activeTab === "leave-management" && (
            <LeaveManagement currentUser={user} />
          )}

          {activeTab === "holidays" && (
            <HolidaysManagement currentUser={user} />
          )}

          {activeTab === "grievance" && (
            <GrievanceManagement currentUser={user} />
          )}

          {activeTab === "training-development" && (
            <TrainingDevelopment employees={employees} currentUser={user} />
          )}

          {activeTab === "employee-performance" && (
            <EmployeePerformanceHub employees={employees} jobCards={jobCards} />
          )}

      {/* Bottom Navigation Bar - Mobile */}
      {showBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1e293b] border-t border-slate-700/50 flex items-center justify-around py-2 px-1 shadow-2xl">
          {/* Render first 4 permitted tabs */}
          {permittedTabs.slice(0, 4).map((tab) => {
            const TabIcon = tab.icon;
            const activeJobCount = tab.id === "jobs" ? jobCards.filter(j => !j.gate_out_time && !['Closed', 'Cancelled'].includes(j.status)).length : 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "logout-deep-link") {
                    handleLogout();
                  } else {
                    setActiveTab(tab.id);
                    setDashboardSelectedJob(null);
                  }
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 rounded-lg gap-0.5 text-center transition-all ${
                  isActive ? "text-brand" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="relative">
                  <TabIcon className="h-5 w-5" />
                  {tab.id === "jobs" && activeJobCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8px] font-extrabold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-md animate-pulse">
                      {activeJobCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold tracking-tight truncate max-w-[70px]">{tab.label}</span>
              </button>
            );
          })}
          
          {/* If there are more than 4 tabs, render a "More" button */}
          {permittedTabs.length > 4 && (
            <button
              onClick={() => setShowMobileMoreTabs(!showMobileMoreTabs)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-2.5 rounded-lg gap-0.5 text-center transition-all ${
                showMobileMoreTabs || !permittedTabs.slice(0, 4).some(t => t.id === activeTab) ? "text-brand" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] font-bold tracking-tight">More</span>
            </button>
          )}
        </nav>
      )}

      {/* Mobile More Tabs Overlay Bottom Sheet */}
      {showBottomNav && showMobileMoreTabs && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs flex items-end justify-end">
          <div className="bg-slate-900 border-t border-slate-800 w-full max-h-[70vh] rounded-t-2xl shadow-2xl p-5 space-y-4 overflow-y-auto animate-in slide-in-from-bottom duration-200 pb-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">All Modules</h3>
              <button 
                onClick={() => setShowMobileMoreTabs(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {permittedTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                const activeJobCount = tab.id === "jobs" ? jobCards.filter(j => !j.gate_out_time && !['Closed', 'Cancelled'].includes(j.status)).length : 0;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === "logout-deep-link") {
                        handleLogout();
                      } else {
                        setActiveTab(tab.id);
                        setShowMobileMoreTabs(false);
                        setDashboardSelectedJob(null);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border gap-1.5 transition-all text-center ${
                      isActive 
                        ? "bg-brand/10 border-brand/35 text-brand" 
                        : "bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                    }`}
                  >
                    <div className="relative">
                      <TabIcon className="h-5 w-5" />
                      {tab.id === "jobs" && activeJobCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[8px] font-extrabold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-md animate-pulse">
                          {activeJobCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold tracking-tight truncate max-w-[80px]">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* UX Settings Drawer Modal */}
      {showSettingsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-sm h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-brand/10 text-brand rounded-lg border border-brand/20">
                    <Settings className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">UX & Brand Customization</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Tata WMS Workshop Settings</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsDrawer(false)}
                  className="text-slate-400 hover:text-slate-200 font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Brand Settings */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Brand Settings</h4>
                
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)} 
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith("#") && val.length <= 7) {
                          setPrimaryColor(val);
                        }
                      }} 
                      placeholder="#ff5500"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">Mobile-friendly Layout</label>
                    <p className="text-[9px] text-slate-500 font-medium">Auto-responsive touch optimized grids</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={mobileFriendly} 
                      onChange={(e) => setMobileFriendly(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
              </div>

              {/* Layout Options */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">Layout Options</h4>

                <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">Bottom Navigation Bar</label>
                    <p className="text-[9px] text-slate-500 font-medium">Replaces side drawer on mobile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showBottomNav} 
                      onChange={(e) => setShowBottomNav(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
              </div>

              {/* AI Settings & Co-Pilot */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-850 pb-1">AI Co-Pilot Settings</h4>

                {/* AI Mode is workshop-wide and RBAC-gated — this control routes
                    through the same handler as the header toggle so it cannot be
                    used to bypass the GM/Admin/Developer restriction. */}
                <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">Enable AI features</label>
                    <p className="text-[9px] text-slate-500 font-medium">
                      {aiModeCanToggle
                        ? "Workshop-wide. Turning this off stops all AI calls and API-key spend."
                        : aiModeCanRequest
                          ? "Workshop-wide. You can request activation; a GM/Admin approves."
                          : "Workshop-wide. Only a GM, Admin or Developer can change this."}
                    </p>
                  </div>
                  <label className={`relative inline-flex items-center ${aiModeCanToggle || aiModeCanRequest ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                    <input
                      type="checkbox"
                      checked={aiModeEnabled}
                      onChange={handleAiModeClick}
                      disabled={!aiModeCanToggle && !aiModeCanRequest}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-end">
              <button 
                onClick={() => setShowSettingsDrawer(false)}
                className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer text-center uppercase tracking-wider"
              >
                Apply Customizations
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notifications.
          `w-full` on a fixed element anchored only by `right-4` resolves against
          the viewport, so on a phone the stack was a full 100vw wide and bled off
          the left edge, covering the workspace header and any inline banner
          underneath. Inset it on both sides on mobile and only let it collapse to
          a right-anchored column once there is room. */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-2 sm:w-full sm:max-w-sm pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium pointer-events-auto transition-all duration-300 ${
                toast.type === "success"
                  ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-100"
                  : toast.type === "error"
                  ? "bg-rose-900/90 border-rose-500/40 text-rose-100"
                  : "bg-slate-800/95 border-slate-600/50 text-slate-100"
              } backdrop-blur-md`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : toast.type === "error" ? (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
              )}
              <span className="flex-1 text-xs leading-relaxed whitespace-pre-line">{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      {user && (
        <>
          <UserOnboardingTour 
            employeeId={employeeId || 22} 
            role={userRole} 
            showToast={showToast} 
          />
          <StaffFeedbackWidget 
            employeeId={employeeId || 22} 
            role={userRole} 
            activeScreen={activeTab} 
            showToast={showToast} 
          />
        </>
      )}
    </AppShell>
  );
}
