import React, { useState, useEffect } from "react";
import { 
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
  HelpCircle
} from "lucide-react";
import UserManagement from "./components/UserManagement";
import { 
  RevenueDashboard, 
  GateEntryPanel, 
  TechnicianJobsPanel, 
  TechnicianKpiPanel, 
  TechnicianProfilePanel 
} from "./components/RoleSpecialPanels";
import { 
  ShieldAlert, 
  DollarSign, 
  Truck, 
  Award, 
  User as UserIcon,
  Briefcase,
  Package,
  ShieldCheck
} from "lucide-react";
import GateEntryManager from "./components/GateEntryManager";
import PartsWarrantyManager from "./components/PartsWarrantyManager";
import CashierManager from "./components/CashierManager";
import FunnyLoader from "./components/FunnyLoader";
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
import GoogleIntegration from "./components/GoogleIntegration";
import GeminiAssistant from "./components/GeminiAssistant";
import AuthScreen from "./components/AuthScreen";
import VehicleLookup from "./components/VehicleLookup";
import CpscCertificationPanel from "./components/CpscCertificationPanel";
import AttendanceShiftLog from "./components/AttendanceShiftLog";
import DmsImporterConsolidated from "./components/dms-import";
import FsbManager from "./components/fsb";
import QuerySearch from "./components/query";
import BillingExit from "./components/billing-exit";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState<string>("");

  const handleLookupVehicle = (vrn: string) => {
    setLookupQuery(vrn);
    setActiveTab("vehicle-lookup");
  };

  // Authentication State
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

  const userRole = user ? user.role : "reception";
  const isAdmin = userRole === "admin" || userRole === "developer";
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
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "fsb", label: "FSB Status", icon: ShieldCheck },
      { id: "query", label: "Multimedia Query", icon: HelpCircle },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "google", label: "Google Workspace", icon: Share2 },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
    ],
    admin: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "fsb", label: "FSB Status", icon: ShieldCheck },
      { id: "query", label: "Multimedia Query", icon: HelpCircle },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "users", label: "User Management", icon: ShieldAlert },
      { id: "google", label: "Google Workspace", icon: Share2 },
      { id: "assistant", label: "Gemini Copilot", icon: Sparkles },
    ],
    billing: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
    ],
    service_advisor: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    floor_supervisor: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    ],
    warranty_advisor: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "fsb", label: "FSB Status", icon: ShieldCheck },
    ],
    floor_incharge: [
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
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "fsb", label: "FSB Status", icon: ShieldCheck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
      { id: "revenue", label: "Revenue Split", icon: DollarSign },
    ],
    spares_manager: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
    ],
    dkam: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
    ],
    cashier: [
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
    tools_incharge: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
    ],
    security_agent: [
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
    ],
    breakdown: [
      { id: "tech-jobs", label: "My Jobs", icon: Wrench },
      { id: "tech-kpi", label: "My KPI", icon: TrendingUp },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
    ],
    dealer_principal: [
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
    service_manager: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "vehicle-lookup", label: "Vehicle History", icon: History },
      { id: "gate-entry", label: "Gate Entry", icon: Truck },
      { id: "parts-warranty", label: "Parts & Warranty", icon: Package },
      { id: "billing-exit", label: "Billing & Exit", icon: DollarSign },
      { id: "fsb", label: "FSB Status", icon: ShieldCheck },
      { id: "jobs", label: "Job Cards", icon: Wrench },
      { id: "productivity", label: "Productivity", icon: TrendingUp },
      { id: "bay-tat", label: "Bay Monitor", icon: Clock },
      { id: "employees", label: "Employee Directory", icon: Users },
      { id: "certification", label: "CPSC Certification", icon: Shield },
      { id: "attendance", label: "Attendance", icon: ClipboardCheck },
      { id: "dms-import", label: "DMS Import", icon: FileDown },
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
      { id: "tech-jobs", label: "My Jobs", icon: Wrench },
      { id: "tech-kpi", label: "My KPI", icon: TrendingUp },
      { id: "tech-profile", label: "My Profile", icon: UserIcon },
    ],
  };

  const isTabPermitted = (tabId: string) => {
    if (!user) return false;
    const permittedTabs = ROLE_TABS[user.role] || [];
    return permittedTabs.some(t => t.id === tabId);
  };

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
  const [batches, setBatches] = useState<DMSImportBatch[]>([]);
  const [importRows, setImportRows] = useState<DMSImportRow[]>([]);
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
  const fetchAllData = async () => {
    try {
      const [
        empRes,
        bayRes,
        srRes,
        jobRes,
        revRes,
        cfRes,
        reworkRes,
        alertRes,
        batchRes,
        splitRes
      ] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/bays"),
        fetch("/api/sr-types"),
        fetch("/api/job-cards"),
        fetch("/api/job-revenues"),
        fetch("/api/carry-forward"),
        fetch("/api/rework"),
        fetch("/api/alerts"),
        fetch("/api/dms/batches"),
        fetch("/api/revenue-splits")
      ]);

      setEmployees(await empRes.json());
      setBays(await bayRes.json());
      setSrTypes(await srRes.json());
      setRevenueSplits(await splitRes.json());

      const jobsData = await jobRes.json();
      setJobCards(jobsData.jobCards || []);
      setAllocations(jobsData.technicianMaps || []);
      setProjectedRevenue(jobsData.projectedRevenue || 0);
      setGeneratedRevenue(jobsData.generatedRevenue || 0);

      const revsData = await revRes.json();
      setRevenues(revsData.revenues || []);
      setSplitDetails(revsData.details || []);

      setCarryForwardLogs(await cfRes.json());
      setReworkLogs(await reworkRes.json());
      setAlertLogs(await alertRes.json());

      const batchesData = await batchRes.json();
      setBatches(batchesData.batches || []);
      setImportRows(batchesData.rows || []);
    } catch (error) {
      console.error("Error loading workshop data from server:", error);
    }
  };

  // Auth initiation on load
  useEffect(() => {
    const saved = localStorage.getItem("wms_user");
    if (saved) {
      fetchAllData();
    }
  }, []);

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

  const handleCreateJob = async (jobData: Partial<JobCard>) => {
    try {
      const res = await fetch("/api/job-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobData)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateJobStatus = async (id: number, status: JobCard["status"]) => {
    try {
      const res = await fetch(`/api/job-cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateJob = async (id: number, updatedFields: Partial<JobCard>) => {
    try {
      const res = await fetch(`/api/job-cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTechnicians = async (id: number, allocs: { employee_id: number; tech_role: string }[]) => {
    try {
      const res = await fetch(`/api/job-cards/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocations: allocs })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateRevenue = async (id: number, labour: number, parts: number) => {
    try {
      const res = await fetch(`/api/job-cards/${id}/revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labour_amount: labour, parts_amount: parts })
      });
      if (res.ok) fetchAllData();
    } catch (e) {
      console.error(e);
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

  const handleAddEmployee = async (employeeData: Partial<Employee>) => {
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        method: "DELETE"
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
        headers: { "Content-Type": "application/json" },
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
          fetchAllData();
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans text-slate-900">
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex flex-col h-screen overflow-y-auto fixed left-0 top-0 w-64 bg-[#1e293b] text-slate-400 p-5 shrink-0 justify-between z-40 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-700/50 pb-5">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-xl text-white">
              W
            </div>
            <div>
              <h2 className="font-bold text-slate-100 text-sm tracking-tight uppercase">WMS Workshop</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sync Engine</p>
            </div>
          </div>

          <nav className="space-y-1">
            {((user && ROLE_TABS[user.role]) || ROLE_TABS["reception"]).map((tab) => {
              const TabIcon = tab.icon;
              const activeJobCount = tab.id === "jobs" ? jobCards.filter(j => !j.gate_out_time && !['Closed', 'Cancelled'].includes(j.status)).length : 0;
              return (
                <button 
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setDashboardSelectedJob(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                    activeTab === tab.id ? "bg-slate-800 text-white border border-slate-700/50 shadow-sm" : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {tab.id === "jobs" && activeJobCount > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-[9px] font-extrabold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-orange-500/30 animate-pulse">
                      {activeJobCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          
          {(isAdmin || isDeveloper) && (
            <div className="pt-4 border-t border-slate-700/50 space-y-2">
              <button
                onClick={handleReloadDatabase}
                disabled={isReloading}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all border ${
                  reloadSuccess
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                } disabled:opacity-50 cursor-pointer`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? "animate-spin" : ""}`} />
                <span>{isReloading ? "Reloading..." : reloadSuccess ? "Reload Success!" : "Reload Database"}</span>
              </button>

              <button
                onClick={handleClearJobCards}
                disabled={isClearing}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-all border ${
                  clearSuccess
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-rose-950/25 hover:bg-rose-900/30 text-rose-300 border-rose-500/25 hover:border-rose-500/40"
                } disabled:opacity-50 cursor-pointer`}
              >
                <Database className={`h-3.5 w-3.5 ${isClearing ? "animate-pulse" : ""}`} />
                <span>{isClearing ? "Cleaning..." : clearSuccess ? "Clean Success!" : "Clean Job Cards"}</span>
              </button>
            </div>
          )}
        </div>

        {/* User context footer */}
        <div className="border-t border-slate-700/50 pt-4 flex flex-col gap-3">
          <div className="flex items-center space-x-3 px-2 py-2 mb-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">System Live • 2.4.1</span>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-orange-500 uppercase border border-slate-700 shrink-0">
                    {(user.username || "").slice(0, 2)}
                  </div>
                  <div className="truncate max-w-[120px]">
                    <p className="text-slate-200 truncate font-bold text-xs">{user.full_name || ""}</p>
                    <p className="text-[9px] text-orange-400 font-bold uppercase tracking-wider leading-none mt-0.5">{(user.role || "").split("_").join(" ")}</p>
                    <p className="text-[9px] text-slate-500 truncate leading-none mt-0.5">@{user.username || ""}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-orange-500 transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>

              {/* Dev Role Override Dropdown */}
              {user.username === "developer" && (
                <div className="pt-2.5 border-t border-slate-700/40 space-y-1">
                  <label className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest block">Dev Role Override</label>
                  <select
                    value={user.role || ""}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      const updatedUser = { ...user, role: newRole };
                      setUser(updatedUser);
                      localStorage.setItem("wms_user", JSON.stringify(updatedUser));
                      const permitted = ROLE_TABS[newRole] || [];
                      if (permitted.length > 0) {
                        setActiveTab(permitted[0].id);
                      }
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold cursor-pointer"
                  >
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                    <option value="dealer_principal">Dealer Principal</option>
                    <option value="workshop_manager">Workshop Manager</option>
                    <option value="billing">Billing (Accounts)</option>
                    <option value="cashier">Cashier</option>
                    <option value="service_advisor">Service Advisor</option>
                    <option value="floor_supervisor">Floor Supervisor</option>
                    <option value="floor_incharge">Floor Incharge</option>
                    <option value="warranty_advisor">Warranty Advisor</option>
                    <option value="warranty_manager">Warranty Manager</option>
                    <option value="spares_manager">Spares Manager</option>
                    <option value="dkam">D-KAM</option>
                    <option value="reception">Receptionist</option>
                    <option value="tools_incharge">Tools Incharge</option>
                    <option value="security_agent">Security Agent</option>
                    <option value="breakdown">Breakdown Personnel</option>
                    <option value="service_manager">Service Manager</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="accounts">Accounts fallback</option>
                    <option value="gate_personnel">Gate Personnel</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400">Not Signed In</div>
          )}
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden bg-[#1e293b] text-white p-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center font-bold text-sm text-white">W</div>
          <h2 className="font-bold text-sm uppercase tracking-tight">WMS Workshop</h2>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1e293b] text-slate-400 absolute top-14 left-0 w-full z-40 border-b border-slate-700/50 shadow-xl flex flex-col p-4 space-y-2">
          {((user && ROLE_TABS[user.role]) || ROLE_TABS["reception"]).map((tab) => (
            <button 
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); setDashboardSelectedJob(null); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-bold transition-all text-left ${
                activeTab === tab.id ? "bg-slate-800 text-white" : "hover:bg-slate-800/50 text-slate-300"
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}

          {(isAdmin || isDeveloper) && (
            <div className="pt-2 border-t border-slate-700/50 space-y-2">
              <button
                onClick={() => { handleReloadDatabase(); setMobileMenuOpen(false); }}
                disabled={isReloading}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold border ${
                  reloadSuccess
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                } disabled:opacity-50`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isReloading ? "animate-spin" : ""}`} />
                <span>{isReloading ? "Reloading..." : reloadSuccess ? "Reload Success!" : "Reload Database"}</span>
              </button>

              <button
                onClick={() => { handleClearJobCards(); setMobileMenuOpen(false); }}
                disabled={isClearing}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold border ${
                  clearSuccess
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-rose-950/25 hover:bg-rose-900/30 text-rose-300 border-rose-500/25 hover:border-rose-500/40"
                } disabled:opacity-50`}
              >
                <Database className={`h-3.5 w-3.5 ${isClearing ? "animate-pulse" : ""}`} />
                <span>{isClearing ? "Cleaning..." : clearSuccess ? "Clean Success!" : "Clean Job Cards"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Primary Main Stage */}
      <main className="md:ml-64 flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full min-h-screen overflow-y-auto">
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
            setIsAdmin={() => {}}
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
            batches={batches}
            rows={importRows}
            jobCards={jobCards}
            onImportRows={handleImportRows}
            onResolveRow={handleResolveRow}
          />
        )}

        {activeTab === "fsb" && (
          <FsbManager />
        )}

        {activeTab === "query" && (
          <QuerySearch />
        )}

        {activeTab === "billing-exit" && (
          <BillingExit />
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

        {activeTab === "assistant" && (
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
          <AttendanceShiftLog employees={employees} currentUser={user} />
        )}

        {activeTab === "revenue" && (
          <RevenueDashboard employees={employees} jobCards={jobCards} revenues={revenues} splitDetails={splitDetails} onRefresh={fetchAllData} />
        )}

        {activeTab === "gate-entry" && (
          <GateEntryManager 
            bays={bays} 
            jobCards={jobCards} 
            onCreateJob={handleCreateJob} 
            onUpdateJob={handleUpdateJob}
            onRefresh={fetchAllData} 
          />
        )}

        {activeTab === "parts-warranty" && (
          <PartsWarrantyManager 
            jobCards={jobCards} 
            onUpdateJob={handleUpdateJob}
            onRefresh={fetchAllData} 
          />
        )}

        {activeTab === "cashier-exit" && (
          <CashierManager 
            jobCards={jobCards} 
            onUpdateJob={handleUpdateJob}
            onRefresh={fetchAllData} 
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
      </main>

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

    </div>
  );
}
