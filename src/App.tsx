import React, { useState, useEffect } from "react";
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
  Server,
  Terminal,
  Activity
} from "lucide-react";
import UserManagement from "./components/UserManagement";
import { 
  RevenueDashboard, 
  GateEntryPanel, 
  TechnicianJobsPanel, 
  TechnicianKpiPanel, 
  TechnicianProfilePanel 
} from "./components/RoleSpecialPanels";

import PartsWarrantyManager from "./components/PartsWarrantyManager";
import CashierManager from "./components/CashierManager";
import FunnyLoader from "./components/FunnyLoader";
import WorkshopDashboard from "./components/workshop-manager/WorkshopDashboard";
import ExecutiveDashboard from "./components/workshop-manager/ExecutiveDashboard";
import ServiceAdvisorWorkspace from "./components/ServiceAdvisorWorkspace";
import FloorSupervisorWorkspace from "./components/FloorSupervisorWorkspace";
import TechnicianWorkspace from "./components/TechnicianWorkspace";
import QCInspectorWorkspace from "./components/QCInspectorWorkspace";
import PartsCommandCenter from "./components/PartsCommandCenter";
import BillingWorkspace from "./components/BillingWorkspace";
import CashierWorkspace from "./components/CashierWorkspace";
import VehicleDeliveryWorkspace from "./components/VehicleDeliveryWorkspace";
import GMServiceCommandCenter from "./components/GMServiceCommandCenter";
import DealerPrincipalCommandCenter from "./components/DealerPrincipalCommandCenter";
import CustomerExperiencePlatform from "./components/CustomerExperiencePlatform";
import MobilePlatformWorkspace from "./components/MobilePlatformWorkspace";
import PowerBiAnalytics from "./components/PowerBiAnalytics";
import SystemHardeningMetrics from "./components/SystemHardeningMetrics";
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
import EmployeeDirectory from "./components/EmployeeDirectory";
import ProductivityDashboard from "./components/ProductivityDashboard";
import ActiveBayTatMonitor from "./components/ActiveBayTatMonitor";
import DmsImporter from "./components/DmsImporter";
import EnterpriseMasterDataHub from "./components/EnterpriseMasterDataHub";
import AppShell from "./components/AppShell";
import GoogleIntegration from "./components/GoogleIntegration";
import GeminiAssistant from "./components/GeminiAssistant";
import AuthScreen from "./components/AuthScreen";
import VehicleLookup from "./components/VehicleLookup";
import CpscCertificationPanel from "./components/CpscCertificationPanel";
import AttendanceShiftLog from "./components/AttendanceShiftLog";
import OvertimeEmployeeDashboard from "./components/OvertimeEmployeeDashboard";
import OvertimeApprovalPortal from "./components/OvertimeApprovalPortal";
import QuerySearch from "./components/query";
import BreakdownManagement from "./components/BreakdownManagement";
import ExceptionReport from "./components/ExceptionReport";

const GateEntryManager = React.lazy(() => import("./components/GateEntryManager"));
const BillingExit = React.lazy(() => import("./components/billing-exit"));

import DealerSetupWizard from "./components/DealerSetupWizard";
import UserOnboardingTour from "./components/UserOnboardingTour";
import PilotControlRoom from "./components/PilotControlRoom";
import StaffFeedbackWidget from "./components/StaffFeedbackWidget";
import BusinessImpactTracker from "./components/BusinessImpactTracker";
import LiveSupportPanel from "./components/LiveSupportPanel";
import DevOpsDashboard from "./components/DevOpsDashboard";
import CctvFloorSafety from "./components/CctvFloorSafety";
import MyWorkspace from "./components/MyWorkspace";
import OperationsCommandCenter from "./components/OperationsCommandCenter";
import PlatformControlCenter from "./components/platform/PlatformControlCenter";
import { PartsInChargeWorkspace } from "./components/PartsInChargeWorkspace";
import { WarrantyClerkWorkspace } from "./components/WarrantyClerkWorkspace";

function darkenColor(hex: string, percent: number): string {
  let num = parseInt(hex.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      return localStorage.getItem("wms_token");
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);

  // Production hardening tab access guard
  useEffect(() => {
    const isRc1 = import.meta.env.VITE_WORKFORCE_PROFILE === "rc1";
    const isAdminOrDev = user?.role && ["admin", "developer", "dealer_principal", "gm_service", "workshop_manager"].includes(user.role);
    if (isRc1 && !isAdminOrDev) {
      const excludedTabs = [
        "breakdown",
        "customer-portal",
        "assistant",
        "devops-dashboard",
        "operations-console",
        "setup-wizard",
        "pilot-control-room",
        "roi-tracker",
        "live-support",
        "system-hardening",
        "mobile-platform",
        "certification"
      ];
      if (excludedTabs.includes(activeTab)) {
        console.warn(`[SECURITY] Access to blocked tab '${activeTab}' prevented under RC1 profile.`);
        setActiveTab("dashboard");
      }
    }
  }, [activeTab, user]);


  // --- Toast notification system ---
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);
  let toastCounter = 0;
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = ++toastCounter;
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
  const [aiModeEnabled, setAiModeEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("wms_ai_mode");
      return val === null ? true : val === "true";
    }
    return true;
  });

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
    "workshop-cockpit": "Dashboard",
    "executive-cockpit": "Dashboard",
    "dealer-principal-cockpit": "Dashboard",
    "advisor-workspace": "Job Cards",
    "supervisor-workspace": "Job Cards",
    "technician-workspace": "Job Cards",
    "qc-workspace": "Job Cards",
    jobs: "Job Cards",
    "gate-entry": "Job Cards",
    "delivery-workspace": "Job Cards",
    "parts-command": "Warranty",
    "parts-warranty": "Warranty",
    "billing-workspace": "Billing",
    "cashier-workspace": "Billing",
    "billing-exit": "Billing",
    "dms-import": "DMS Import",
    "master-data-hub": "User Management",
    employees: "User Management",
    users: "User Management",
    breakdown: "Breakdowns",
    query: "Query",
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
      { id: "operations-console", label: "Operations Cockpit", icon: Activity },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ClipboardCheck },
      { id: "parts-command", label: "Parts Command", icon: Package },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "delivery-workspace", label: "Vehicle Delivery", icon: Truck },
      { id: "gm-command", label: "GM Command", icon: Building },
      { id: "dealer-principal-cockpit", label: "Dealer Principal", icon: Sparkles },
      { id: "customer-portal", label: "Customer Portal", icon: UserIcon },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "powerbi-analytics", label: "Power BI Analytics", icon: FileSpreadsheet },
      { id: "system-hardening", label: "System Hardening", icon: Server },
      { id: "cctv-safety", label: "CCTV & Safety", icon: Video },
      { id: "executive-cockpit", label: "Executive Cockpit", icon: ShieldAlert },
      { id: "workshop-cockpit", label: "Operational Cockpit", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "breakdown", label: "Breakdowns", icon: AlertTriangle },
      { id: "exception-report", label: "Exceptions", icon: AlertOctagon },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "query", label: "Multimedia Query", icon: HelpCircle },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "master-data-hub", label: "Master Data Hub", icon: Database },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "google", label: "Google Workspace", icon: Share2 },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
      { id: "setup-wizard", label: "Setup Wizard", icon: Building },
      { id: "pilot-control-room", label: "Pilot Control Room", icon: Activity },
      { id: "roi-tracker", label: "Business ROI Tracker", icon: TrendingUp },
    ],
    admin: [
      { id: "operations-console", label: "Operations Cockpit", icon: Activity },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "qc-workspace", label: "QC Workspace", icon: ClipboardCheck },
      { id: "parts-command", label: "Parts Command", icon: Package },
      { id: "billing-workspace", label: "Billing Workspace", icon: FileText },
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "security-workspace", label: "Security Gate Out", icon: ShieldAlert },
      { id: "delivery-workspace", label: "Vehicle Delivery", icon: Truck },
      { id: "gm-command", label: "GM Command", icon: Building },
      { id: "dealer-principal-cockpit", label: "Dealer Principal", icon: Sparkles },
      { id: "customer-portal", label: "Customer Portal", icon: UserIcon },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "powerbi-analytics", label: "Power BI Analytics", icon: FileSpreadsheet },
      { id: "system-hardening", label: "System Hardening", icon: Server },
      { id: "cctv-safety", label: "CCTV & Safety", icon: Video },
      { id: "executive-cockpit", label: "Executive Cockpit", icon: ShieldAlert },
      { id: "workshop-cockpit", label: "Operational Cockpit", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "breakdown", label: "Breakdowns", icon: AlertTriangle },
      { id: "exception-report", label: "Exceptions", icon: AlertOctagon },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "query", label: "Multimedia Query", icon: HelpCircle },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "master-data-hub", label: "Master Data Hub", icon: Database },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "google", label: "Google Workspace", icon: Share2 },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
      { id: "setup-wizard", label: "Setup Wizard", icon: Building },
      { id: "pilot-control-room", label: "Pilot Control Room", icon: Activity },
      { id: "roi-tracker", label: "Business ROI Tracker", icon: TrendingUp },
    ],
    billing: [
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
    ],
    service_advisor: [
      { id: "advisor-workspace", label: "Advisor Workspace", icon: ClipboardCopy },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    floor_supervisor: [
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    warranty_advisor: [
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    warranty: [
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "warranty-clerk-workspace", label: "Warranty Desk (Mobile)", icon: ShieldAlert },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "jobs", label: "Job Cards", icon: Wrench },
    ],
    floor_incharge: [
      { id: "supervisor-workspace", label: "Supervisor Workspace", icon: Users },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    workshop_manager: [
      { id: "workshop-cockpit", label: "Operational Cockpit", icon: LayoutDashboard },
      { id: "executive-cockpit", label: "Executive Cockpit", icon: ShieldAlert },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
    ],
    gm_service: [
      { id: "gm-command", label: "GM Command", icon: Building },
      { id: "executive-cockpit", label: "Executive Cockpit", icon: ShieldAlert },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "workshop-cockpit", label: "Operational Cockpit", icon: LayoutDashboard },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
    ],
    spares_manager: [
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "parts-command", label: "Parts Command", icon: Package },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
    ],
    parts: [
      { id: "parts-incharge-workspace", label: "Parts Desk (Mobile)", icon: Package },
      { id: "parts-command", label: "Parts Command", icon: Package },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
      { id: "cashier-workspace", label: "Cashier Desk", icon: DollarSign },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
    ],
    reception: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    receptionist: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    tools_incharge: [
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
    security_agent: [
      { id: "security-workspace", label: "Security Workspace", icon: ShieldAlert },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    breakdown: [
      { id: "breakdown", label: "Breakdowns", icon: AlertTriangle },
      { id: "tech-kpi", label: "My KPI", icon: TrendingUp },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    dealer_principal: [
      { id: "dealer-principal-cockpit", label: "Dealer Principal", icon: Sparkles },
      { id: "mobile-platform", label: "Mobile Platform", icon: Smartphone },
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
    ],
    supervisor: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
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
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
    ],
    gate_personnel: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    technician: [
      { id: "technician-workspace", label: "Technician Workspace", icon: Wrench },
      { id: "tech-kpi", label: "My KPI", icon: TrendingUp },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
  };

  // Dynamically ensure every role has the "My Profile" tab
  Object.keys(ROLE_TABS).forEach(role => {
    const tabs = ROLE_TABS[role];
    // "MY RESPONSIBILITY" phase 3 — every staff member gets a personal My Workspace tab
    // (My Jobs / Pending / Breaches / Performance / Incentives / Attendance).
    if (!tabs.some(t => t.id === "my-workspace")) {
      tabs.unshift({ id: "my-workspace", label: "My Workspace", icon: ClipboardCheck });
    }
    const attendanceIdx = tabs.findIndex(t => t.id === "attendance");
    const breakdownRoles = ["service_manager", "workshop_manager", "supervisor", "floor_supervisor", "floor_incharge", "admin", "developer"];
    if (breakdownRoles.includes(role) && !tabs.some(t => t.id === "breakdown")) {
      const dbIdx = tabs.findIndex(t => t.id === "dashboard");
      const insertIdx = dbIdx !== -1 ? dbIdx + 1 : 0;
      tabs.splice(insertIdx, 0, { id: "breakdown", label: "Breakdowns", icon: AlertTriangle });
    }
    if (!tabs.some(t => t.id === "tech-profile")) {
      tabs.push({ id: "tech-profile", label: "My Profile", icon: UserIcon });
    }
  });



  // Keep active tab safe on user load or role change
  useEffect(() => {
    if (user) {
      const permittedTabs = ROLE_TABS[user.role] || [];
      if (permittedTabs.length > 0 && !permittedTabs.some(t => t.id === activeTab)) {
        setActiveTab(permittedTabs[0].id);
      }
    }
  }, [user]);

  // Workshop Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bays, setBays] = useState<Bay[]>([]);
  const [srTypes, setSrTypes] = useState<SRType[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [allocations, setAllocations] = useState<JobTechnicianMap[]>([]);
  const [revenues, setRevenues] = useState<JobRevenue[]>([]);
  const [splitDetails, setSplitDetails] = useState<JobRevenueSplitDetail[]>([]);
  const [carryForwardLogs, setCarryForwardLogs] = useState<CarryForwardLog[]>([]);
  const [reworkLogs, setReworkLogs] = useState<ReworkLog[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [revenueSplits, setRevenueSplits] = useState<RevenueSplitMaster[]>([]);

  // Selected Job (navigated from dashboard)
  const [dashboardSelectedJob, setDashboardSelectedJob] = useState<JobCard | null>(null);
  
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
      const res = await fetch("/api/db/reload", { method: "POST" });
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

  // Clear all job cards data (start fresh)
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  const handleClearJobCards = () => {
    setShowClearConfirmModal(true);
  };

  const performClearJobCards = async () => {
    setShowClearConfirmModal(false);
    setIsClearing(true);
    setClearSuccess(false);
    try {
      const res = await fetch("/api/db/clear-job-cards", { method: "POST" });
      if (res.ok) {
        await fetchAllData();
        setClearSuccess(true);
        setTimeout(() => setClearSuccess(false), 3000);
      } else {
        console.error("Failed to clear job cards:", await res.text());
      }
    } catch (e) {
      console.error("Error clearing job cards:", e);
    } finally {
      setIsClearing(false);
    }
  };

  // Fetch all database state from server
  const fetchAllData = async (authToken?: string) => {
    const activeToken = authToken || token;
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

      const empJson = await empRes.json();
      console.log("/api/employees", empJson);
      setEmployees(Array.isArray(empJson) ? empJson : []);

      const bayJson = await bayRes.json();
      console.log("/api/bays", bayJson);
      setBays(Array.isArray(bayJson) ? bayJson : []);

      const srJson = await srRes.json();
      console.log("/api/sr-types", srJson);
      setSrTypes(Array.isArray(srJson) ? srJson : []);

      const splitJson = await splitRes.json();
      console.log("/api/revenue-splits", splitJson);
      setRevenueSplits(Array.isArray(splitJson) ? splitJson : []);

      const jobsData = await jobRes.json();
      console.log("/api/job-cards", jobsData);
      const rawJobs = jobsData ? (jobsData.jobCards || jobsData.data || (Array.isArray(jobsData) ? jobsData : [])) : [];
      setJobCards(Array.isArray(rawJobs) ? rawJobs : []);
      setAllocations(jobsData && Array.isArray(jobsData.technicianMaps) ? jobsData.technicianMaps : []);
      setProjectedRevenue(jobsData ? jobsData.projectedRevenue || 0 : 0);
      setGeneratedRevenue(jobsData ? jobsData.generatedRevenue || 0 : 0);

      const revsData = await revRes.json();
      console.log("/api/job-revenues", revsData);
      setRevenues(revsData && Array.isArray(revsData.revenues) ? revsData.revenues : []);
      setSplitDetails(revsData && Array.isArray(revsData.details) ? revsData.details : []);

      const cfJson = await cfRes.json();
      console.log("/api/carry-forward", cfJson);
      setCarryForwardLogs(Array.isArray(cfJson) ? cfJson : []);

      const reworkJson = await reworkRes.json();
      console.log("/api/rework", reworkJson);
      setReworkLogs(Array.isArray(reworkJson) ? reworkJson : []);

      const alertJson = await alertRes.json();
      console.log("/api/alerts", alertJson);
      setAlertLogs(Array.isArray(alertJson) ? alertJson : []);
    } catch (error) {
      console.error("Error loading workshop data from server:", error);
    }
  };

  // Auth initiation on load
  useEffect(() => {
    const savedUser = localStorage.getItem("wms_user");
    const savedToken = localStorage.getItem("wms_token");
    if (savedUser && savedToken) {
      fetchAllData(savedToken);
    }
  }, []);

  // Session Sync Engine: Poll /api/auth/me every 4 seconds.
  // If the user's role or details changed in the DB (e.g., by an admin), update context instantly.
  useEffect(() => {
    if (!token || !user) return;

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

          if (freshUser && (
            freshUser.role !== user.role ||
            freshUser.full_name !== user.full_name ||
            freshUser.is_active !== user.is_active
          )) {
            console.log("[Session Sync] Role change detected. Refreshing context...", freshUser);
            const updatedUser = { ...user, ...freshUser };
            localStorage.setItem("wms_user", JSON.stringify(updatedUser));
            setUser(updatedUser);
            // Redirect to first valid tab if current tab is no longer accessible
            const currentRoleTabs = ROLE_TABS[freshUser.role] || ROLE_TABS["reception"] || [];
            if (!currentRoleTabs.some(t => t.id === activeTab)) {
              setActiveTab(currentRoleTabs[0]?.id || "dashboard");
            }
          }
        }
      } catch (e) {
        // Silent fail — network blip should not disrupt the user
      }
    };

    // Initial sync on mount + login
    syncSession();
    const intervalId = setInterval(syncSession, 4000);
    return () => clearInterval(intervalId);
  }, [token, user?.role]);

  const handleLogin = async () => {
    // Custom database JWT authentication is handled by AuthScreen
  };

  const handleLogout = async () => {
    localStorage.removeItem("wms_user");
    localStorage.removeItem("wms_token");
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

  const handleCreateJob = async (jobData: Partial<JobCard>) => {
    try {
      const res = await fetch("/api/job-cards", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(jobData)
      });
      if (res.ok) {
        fetchAllData();
        showToast("Job card created successfully.", "success");
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to create job card: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error creating job card. Please try again.", "error");
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

  const handleUpdateJob = async (id: number, updatedFields: Partial<JobCard>) => {
    try {
      const res = await fetch(`/api/job-cards/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        fetchAllData();
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to update job card: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error updating job card.", "error");
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
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Failed to assign technicians: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error assigning technicians.", "error");
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
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        showToast(`Revenue calculation failed: ${err.error || res.statusText}`, "error");
      }
    } catch (e: any) {
      console.error(e);
      showToast("Network error calculating revenue.", "error");
    }
  };

  const handleRaiseCarryForward = async (id: number, reason: string) => {
    try {
      const res = await fetch("/api/carry-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: id, cf_reason: reason })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRaiseRework = async (id: number, reason: string, originalTechId: number) => {
    try {
      const res = await fetch("/api/rework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ original_job_id: id, rework_reason: reason, original_tech_id: originalTechId })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveCarryForward = async (id: number, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/carry-forward/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/rework/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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


  const handleAddEmployee = async (employeeData: Partial<Employee>) => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(employeeData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateEmployee = async (id: number, employeeData: Partial<Employee>) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(employeeData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkImportEmployees = async (employeesList: any[]) => {
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ employees: employeesList })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBay = async (bayData: any) => {
    try {
      const res = await fetch("/api/bays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bayData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateBay = async (id: number, bayData: any) => {
    try {
      const res = await fetch(`/api/bays/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bayData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBay = async (id: number) => {
    try {
      const res = await fetch(`/api/bays/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSRType = async (srTypeData: any) => {
    try {
      const res = await fetch("/api/sr-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(srTypeData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSRType = async (id: number, srTypeData: any) => {
    try {
      const res = await fetch(`/api/sr-types/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(srTypeData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSRType = async (id: number) => {
    try {
      const res = await fetch(`/api/sr-types/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSplit = async (splitData: any) => {
    try {
      const res = await fetch("/api/revenue-splits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(splitData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSplit = async (id: number, splitData: any) => {
    try {
      const res = await fetch(`/api/revenue-splits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(splitData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSplit = async (id: number) => {
    try {
      const res = await fetch(`/api/revenue-splits/${id}`, {
        method: "DELETE"
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledgeAlert = async (id: number) => {
    try {
      const res = await fetch("/api/alerts/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: id })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportRows = async (fileName: string, rows: any[]) => {
    try {
      const res = await fetch("/api/dms/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: fileName, rows })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveRow = async (rowId: number, status: DMSImportRow["match_status"], matchedJobId: number) => {
    try {
      const res = await fetch("/api/dms/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row_id: rowId, match_status: status, matched_job_id: matchedJobId })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

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
          localStorage.setItem("wms_token", currentToken || "");
          setUser(currentUser);
          setToken(currentToken);
          setNeedsAuth(false);
          
          // Removed DealerSetupWizard intercept as per GA Release requirements
          
          // Pass token directly — React state is async so `token` is still null here
          fetchAllData(currentToken || undefined);
        }} 
      />
    );
  }

  const baseTabs = ((user && ROLE_TABS[user.role]) || ROLE_TABS["reception"] || []).filter(
    t => {
      if (t.id === "assistant" && !aiModeEnabled) return false;
      const isRc1 = import.meta.env.VITE_WORKFORCE_PROFILE === "rc1";
      if (isRc1) {
        const excludedTabs = [
          "breakdown",
          "customer-portal",
          "assistant",
          "devops-dashboard",
          "operations-console",
          "setup-wizard",
          "pilot-control-room",
          "roi-tracker",
          "live-support",
          "system-hardening",
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
      onToggleAiMode={() => setAiModeEnabled(prev => !prev)}
    >

          {activeTab === "my-workspace" && (
            <MyWorkspace
              currentUser={user}
              onOpenJob={(job) => {
                setDashboardSelectedJob(job);
                setActiveTab("jobs");
              }}
            />
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
              projectedRevenue={projectedRevenue}
              generatedRevenue={generatedRevenue}
              aiModeEnabled={aiModeEnabled}
              canManageWorkforce={["admin", "developer", "workshop_manager", "service_manager", "gm_service"].includes(userRole)}
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

          {activeTab === "exception-report" && (
            <ExceptionReport />
          )}

          {activeTab === "jobs" && (
            <JobCardManager 
              jobCards={jobCards || []}
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
              selectedJobExternal={dashboardSelectedJob}
              currentUserRole={userRole}
              currentUser={user}
              onLookupVehicle={handleLookupVehicle}
              aiModeEnabled={aiModeEnabled}
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


          {activeTab === "query" && (
            <QuerySearch aiModeEnabled={aiModeEnabled} />
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

          {activeTab === "google" && (
            <GoogleIntegration 
              user={user}
              token={token}
              needsAuth={needsAuth}
              isLoggingIn={isLoggingIn}
              onLogin={handleLogin}
              onLogout={handleLogout}
              jobCards={jobCards}
            />
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
            <UserManagement currentUser={user} token={token} />
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

          {activeTab === "revenue" && (
            <RevenueDashboard employees={employees} jobCards={jobCards} revenues={revenues} splitDetails={splitDetails} onRefresh={fetchAllData} />
          )}

          {activeTab === "workshop-cockpit" && (
            <WorkshopDashboard 
              jobCards={jobCards}
              bays={bays}
              employees={employees}
              allocations={allocations}
              alertLogs={alertLogs}
              onRefresh={fetchAllData}
              onUpdateJob={handleUpdateJob}
              onAssignTechnicians={handleAssignTechnicians}
              onResolveCarryForward={handleResolveCarryForward}
              onResolveRework={handleResolveRework}
              onRaiseCarryForward={handleRaiseCarryForward}
              onRaiseRework={handleRaiseRework}
              currentUser={user}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "executive-cockpit" && (
            <ExecutiveDashboard 
              jobCards={jobCards}
              bays={bays}
              employees={employees}
              alertLogs={alertLogs}
              onRefresh={fetchAllData}
              onSelectWorkshopTab={(workshopName) => {
                setActiveTab("workshop-cockpit");
              }}
              onSelectVehicle={(jobId) => {
                const job = jobCards.find(j => j.job_id === jobId);
                if (job) setDashboardSelectedJob(job);
                setActiveTab("jobs");
              }}
              onSelectEmployee={(empId) => {
                setActiveTab("employees");
              }}
              aiModeEnabled={aiModeEnabled}
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

          {activeTab === "parts-command" && (
            <PartsCommandCenter 
              jobCards={jobCards}
              onRefresh={fetchAllData}
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

          {activeTab === "gm-command" && (
            <GMServiceCommandCenter 
              jobCards={jobCards}
              onRefresh={fetchAllData}
              aiModeEnabled={aiModeEnabled}
            />
          )}

          {activeTab === "dealer-principal-cockpit" && (
            <DealerPrincipalCommandCenter 
              jobCards={jobCards}
              onRefresh={fetchAllData}
              aiModeEnabled={aiModeEnabled}
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

          {activeTab === "powerbi-analytics" && (
            <PowerBiAnalytics 
              jobCards={jobCards}
              onRefresh={fetchAllData}
            />
          )}

           {activeTab === "system-hardening" && (
            <SystemHardeningMetrics 
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === "setup-wizard" && (
            <DealerSetupWizard 
              onSetupComplete={fetchAllData}
              showToast={showToast}
            />
          )}

          {activeTab === "pilot-control-room" && (
            <PilotControlRoom />
          )}

          {activeTab === "roi-tracker" && (
            <BusinessImpactTracker />
          )}

          {activeTab === "live-support" && (
            <LiveSupportPanel 
              showToast={showToast}
            />
          )}

          {activeTab === "devops-dashboard" && (
            <DevOpsDashboard />
          )}

          {activeTab === "cctv-safety" && (
            <CctvFloorSafety />
          )}

          {activeTab === "operations-console" && (
            <OperationsCommandCenter />
          )}

          {activeTab === "gate-entry" && (
            <React.Suspense fallback={<FunnyLoader message="Loading gate registry..." />}>
              <GateEntryManager 
                bays={bays} 
                jobCards={jobCards} 
                onCreateJob={handleCreateJob} 
                onUpdateJob={handleUpdateJob}
                onRefresh={fetchAllData} 
              />
            </React.Suspense>
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

          {activeTab === "cashier-exit" && (
            <CashierManager 
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

      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
            
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg">
                <Database className="h-6 w-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Irreversible Data Destruction
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Are you absolutely sure you want to clean all job cards data? This operation is permanent and will perform the following actions:
                </p>
                <ul className="mt-2 text-[11px] text-slate-400 list-disc pl-4 space-y-1">
                  <li>Delete all Job Cards &amp; active records</li>
                  <li>Delete technician maps &amp; split revenues</li>
                  <li>Clear all Rework &amp; Carry Forward logs</li>
                  <li>Reset all workshop bays status to <span className="text-emerald-400 font-semibold animate-pulse">Idle</span></li>
                  <li>Reset employees&apos; allocated revenues to <span className="text-emerald-400 font-semibold">0</span></li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-bold transition-all cursor-pointer"
              >
                Cancel, Keep Data
              </button>
              <button
                onClick={performClearJobCards}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold shadow-lg shadow-rose-900/25 transition-all cursor-pointer animate-pulse"
              >
                Yes, Destroy Data
              </button>
            </div>
          </div>
        </div>
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

                <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wide">Enable AI features</label>
                    <p className="text-[9px] text-slate-500 font-medium">Toggle suggestion widgets & OCR uploaders</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={aiModeEnabled} 
                      onChange={(e) => setAiModeEnabled(e.target.checked)} 
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
      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
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
