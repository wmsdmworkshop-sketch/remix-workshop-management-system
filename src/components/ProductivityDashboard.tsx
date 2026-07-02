import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Percent, 
  Upload, 
  Search, 
  User, 
  Edit2, 
  Check, 
  X, 
  FileSpreadsheet, 
  BarChart3, 
  PieChart, 
  Activity, 
  UserCheck, 
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Shield,
  Unlock
} from "lucide-react";
import { Employee, JobCard } from "../types";
import ProductivityCalculator from "./ProductivityCalculator";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart as RechartsPie,
  Pie
} from "recharts";

interface ProductivityProps {
  employees: Employee[];
  jobCards: JobCard[];
  onRefresh: () => Promise<void>;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

// Initial spreadsheet raw data copy-pasted for quick restore / default seeding
const DEFAULT_SHEETS_DATA = `Employee Name,Role,Allocated Revenue,Target,% to Target,paid,TML Claim
FAKIRAAPA,Sr. Electrician,"54,594.10","75,000.00",72.79%,0.00%,50.88%
SIRAJ AHMED,Sr. Technician,"36,466.01","63,000.00",57.88%,0.00%,43.48%
LOKU,Sr. Technician,"36,234.64","75,000.00",48.31%,0.00%,28.95%
ASHFAQ HUSSAIN,Jr. technician,"34,091.03","54,000.00",63.13%,0.00%,42.42%
MUZAMILL,Electrician Trainee,"31,861.80","36,000.00",88.50%,0.00%,65.00%
MALLINATH,Sr. Technician,"29,570.68","75,000.00",39.43%,0.00%,47.83%
MOHSIN NAWAZ,Jr. elecrician,"29,521.17","48,000.00",61.50%,0.00%,47.54%
MD JAVEED,Sr. Technician,"29,505.49","75,000.00",39.34%,0.00%,50.00%
SRINATH M. N,Jr. technician,"29,143.43","45,120.00",64.59%,0.00%,40.91%
RAJKUMAR AMABARAYA MENTE,Sr. Technician,"27,500.08","75,000.00",36.67%,0.00%,56.25%
NAGESH,Jr. technician,"25,615.61","45,120.00",56.77%,0.00%,33.33%
UMAKANTA,Helper,"24,210.46","45,120.00",53.66%,0.00%,75.00%
ALTAF HUSSAIN,Jr. technician,"21,704.33","49,440.00",43.90%,0.00%,64.52%
MOHAMMED SHOAIB,Sr. Technician,"20,399.84","54,240.00",37.61%,0.00%,45.45%
ASIF,electrician,"16,739.92","45,120.00",37.10%,0.00%,44.74%
MD ABDUL KHADEER,Sr. Electrician,"14,030.55","45,120.00",31.10%,0.00%,52.63%
MEHMOOD,Helper,"12,330.43","30,240.00",40.78%,0.00%,47.06%
SANGAPPA,Sr. Technician,"12,098.54","72,480.00",16.69%,0.00%,45.95%
MD GOUSE,Jr. technician,"9,751.05","54,000.00",18.06%,0.00%,45.71%
SHARNBASAPPA,Jr. technician,"6,987.96","45,120.00",15.49%,0.00%,71.43%
HUNCHIRAY,Jr. technician,"6,212.70","42,240.00",14.71%,0.00%,50.00%
Azhar,Electrician trainee,"4,723.30","36,000.00",13.12%,0.00%,54.17%
HAMEED PATEL,Alignment Technician,"4,071.00","54,000.00",7.54%,0.00%,92.00%
HANUMATH RAYA,Jr. technician,"1,361.72","38,880.00",3.50%,0.00%,0.00%
aslam,technician trainee,"1,292.10","36,000.00",3.59%,0.00%,55.56%
MOHAMMED ZAKI,Jr. technician,590.00,"48,000.00",1.23%,0.00%,51.61%
MAHMED ALTAF AHMED,Jr.Electrician,0.00,"45,120.00",0.00%,0.00%,100.00%`;

export default function ProductivityDashboard({ employees, jobCards, onRefresh, isAdmin, setIsAdmin }: ProductivityProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"table" | "charts" | "importer" | "calculator">("table");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Admin Login / Credentials state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleVerifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "admin123") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setPinError(false);
      setAdminPin("");
    } else {
      setPinError(true);
    }
  };
  
  // Paste import state
  const [pastedText, setPastedText] = useState("");
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    allocated_revenue: number;
    target_revenue: number;
    paid_pct: string;
    tml_claim_pct: string;
  }>({
    allocated_revenue: 0,
    target_revenue: 0,
    paid_pct: "0.00%",
    tml_claim_pct: "0.00%"
  });

  // Filter employees strictly to match Google Sheets formula for productive workshop staff
  const productiveEmployees = useMemo(() => {
    return employees.filter(emp => {
      const r = (emp.role || "").toLowerCase();
      return /.*(technician|mechanic|helper|electrician|elecrician).*/i.test(r) && !/.*parts.*/i.test(r);
    });
  }, [employees]);

  // Unique roles for filtering
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    productiveEmployees.forEach(emp => {
      if (emp.role) roles.add(emp.role);
    });
    return ["All", ...Array.from(roles)];
  }, [productiveEmployees]);

  // Handle parsing CSV/TSV
  const handleParseText = (textToParse: string) => {
    if (!textToParse.trim()) {
      setImportPreview([]);
      return;
    }

    const lines = textToParse.split(/\r?\n/);
    const parsed: any[] = [];
    
    let headerNameIdx = -1;
    let headerRoleIdx = -1;
    let headerRevIdx = -1;
    let headerTargetIdx = -1;
    let headerPaidIdx = -1;
    let headerTmlIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Split by tab or comma
      const cols = line.includes("\t") ? line.split("\t") : line.split(",");
      const cleanCols = cols.map(c => c.replace(/^["']|["']$/g, "").trim());

      // Try to identify header row
      const isHeaderRow = cleanCols.some(c => {
        const cLower = c.toLowerCase();
        return (
          ["employee name", "employee", "name", "staff name"].includes(cLower) ||
          ["allocated revenue", "revenue", "allocated"].includes(cLower) ||
          ["target", "target revenue"].includes(cLower)
        );
      });

      if (isHeaderRow && headerNameIdx === -1) {
        cleanCols.forEach((col, idx) => {
          const cLower = col.toLowerCase();
          // Avoid matching customer name, job card, or vehicle columns
          if (cLower.includes("name") && !["customer", "job", "vehicle", "vrn", "car", "model"].some(x => cLower.includes(x))) {
            headerNameIdx = idx;
          } else if (cLower.includes("role") || cLower.includes("designation") || cLower.includes("title")) {
            headerRoleIdx = idx;
          } else if (cLower.includes("allocated") || cLower.includes("revenue") || cLower.includes("labour")) {
            headerRevIdx = idx;
          } else if (cLower.includes("target") || cLower.includes("goal")) {
            headerTargetIdx = idx;
          } else if (cLower.includes("paid") && !cLower.includes("unpaid")) {
            headerPaidIdx = idx;
          } else if (cLower.includes("tml") || cLower.includes("claim")) {
            headerTmlIdx = idx;
          }
        });
        continue;
      }

      // Reconciled fallback column indices: name=0, role=1, allocated=2, target=3, paid=5, tml=6
      const nameIdx = headerNameIdx !== -1 ? headerNameIdx : 0;
      const roleIdx = headerRoleIdx !== -1 ? headerRoleIdx : 1;
      const revIdx = headerRevIdx !== -1 ? headerRevIdx : 2;
      const targetIdx = headerTargetIdx !== -1 ? headerTargetIdx : 3;
      const paidIdx = headerPaidIdx !== -1 ? headerPaidIdx : 5;
      const tmlIdx = headerTmlIdx !== -1 ? headerTmlIdx : 6;

      const name = cleanCols[nameIdx];
      // Skip if name is empty, numeric, a title line, or matches header names
      if (!name || name.toLowerCase().includes("dashboard") || name.toLowerCase() === "employee name" || name.trim() === "" || name.toLowerCase() === "name") {
        continue;
      }

      const role = cleanCols[roleIdx] || "Technician";

      // Rigorously filter out customer, vehicle, invoice, and summary rows
      const nameLower = name.toLowerCase();
      const roleLower = role.toLowerCase();

      const isJobCard = /^jc\d+/i.test(nameLower) || nameLower.includes("jc-") || nameLower.includes("job card") || nameLower.includes("jobcard");
      const isVrn = /^[a-z]{2}[- ]?\d/i.test(nameLower) || /\d{2}[a-z]{2}\d{4}/i.test(nameLower) || /^[a-z]{2}\d{2}[a-z]/i.test(nameLower);
      const isVehicleModel = ["hyundai", "maruti", "tata", "nexon", "swift", "i20", "honda", "toyota", "mahindra", "suzuki", "scorpio", "alto", "baleno", "creta"].some(v => nameLower.includes(v) || roleLower.includes(v));
      const isSummary = ["total", "grand total", "summary", "average", "dashboard", "report", "subtotal", "aggregate"].some(s => nameLower === s || nameLower.includes(s));
      const hasPhone = /\d{10}/.test(name) || name.startsWith("+91") || name.startsWith("091");
      const isCustomerRow = nameLower.includes("customer") || roleLower.includes("customer");

      if (isJobCard || isVrn || isVehicleModel || isSummary || hasPhone || isCustomerRow) {
        continue; // Skip customer/vehicle/invoice row to prevent customer-as-employee confusion
      }
      
      // Clean numeric values
      const cleanNum = (val: string) => {
        if (!val) return 0;
        const stripped = val.replace(/[^\d.-]/g, "");
        return parseFloat(stripped) || 0;
      };

      const allocated_revenue = cleanNum(cleanCols[revIdx]);
      const target_revenue = cleanNum(cleanCols[targetIdx]);
      const paid_pct = cleanCols[paidIdx] || "0.00%";
      const tml_claim_pct = cleanCols[tmlIdx] || "0.00%";

      parsed.push({
        full_name: name,
        role: role,
        allocated_revenue,
        target_revenue,
        paid_pct,
        tml_claim_pct
      });
    }

    setImportPreview(parsed);
  };

  // Submit bulk update to backend
  const handleImportSubmit = async () => {
    if (importPreview.length === 0) return;
    
    setIsImporting(true);
    setImportStatus({ type: null, msg: "" });

    try {
      const res = await fetch("/api/employees/bulk-productivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: importPreview, isAdmin: isAdmin })
      });

      const data = await res.json();
      if (data.success) {
        let msg = `Successfully synchronized productivity metrics! Updated: ${data.updatedCount} existing employees.`;
        if (isAdmin) {
          msg += ` Registered ${data.addedCount} new employee profiles.`;
        } else if (data.skippedCount > 0) {
          msg += ` Skipped ${data.skippedCount} non-registered employee/customer records (Admin Mode required to auto-create profiles).`;
        } else {
          msg += ` (No new profiles created as Admin Mode is inactive.)`;
        }

        setImportStatus({
          type: "success",
          msg: msg
        });
        setPastedText("");
        setImportPreview([]);
        await onRefresh();
        setTimeout(() => setActiveTab("table"), 3000);
      } else {
        setImportStatus({ type: "error", msg: data.error || "Failed to import metrics." });
      }
    } catch (error: any) {
      setImportStatus({ type: "error", msg: error.message || "Network error occurred." });
    } finally {
      setIsImporting(false);
    }
  };

  // Pre-load default sheets sample
  const handleLoadSample = () => {
    setPastedText(DEFAULT_SHEETS_DATA);
    handleParseText(DEFAULT_SHEETS_DATA);
  };

  // Inline edit action
  const startEditing = (emp: Employee) => {
    setEditingId(emp.employee_id);
    setEditForm({
      allocated_revenue: emp.allocated_revenue || 0,
      target_revenue: emp.target_revenue || 0,
      paid_pct: emp.paid_pct || "0.00%",
      tml_claim_pct: emp.tml_claim_pct || "0.00%"
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveInlineEdit = async (empId: number) => {
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setEditingId(null);
        await onRefresh();
      } else {
        alert("Failed to save changes.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving employee productivity.");
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortArrow = (field: string) => {
    if (sortField !== field) {
      return <span className="ml-1 text-slate-300">↕</span>;
    }
    return sortDirection === "asc" 
      ? <span className="ml-1 text-sky-600 font-extrabold">↑</span> 
      : <span className="ml-1 text-sky-600 font-extrabold">↓</span>;
  };

  // Filter, Search & Sort Employees
  const filteredEmployees = useMemo(() => {
    let result = productiveEmployees.filter(emp => {
      const name = emp.full_name || "";
      const code = emp.employee_code || "";
      const role = emp.role || "";
      
      const matchesSearch = 
        name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        code.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesRole = roleFilter === "All" || role.toLowerCase().trim() === roleFilter.toLowerCase().trim();
      return matchesSearch && matchesRole;
    });

    if (sortField) {
      result = [...result].sort((a: any, b: any) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "pct_target") {
          const revA = a.allocated_revenue || 0;
          const targetA = a.target_revenue || 0;
          valA = targetA > 0 ? (revA / targetA) : 0;

          const revB = b.allocated_revenue || 0;
          const targetB = b.target_revenue || 0;
          valB = targetB > 0 ? (revB / targetB) : 0;
        } else if (sortField === "paid_pct" || sortField === "tml_claim_pct") {
          const cleanA = String(a[sortField] || "0").replace(/[^0-9.]/g, "");
          const cleanB = String(b[sortField] || "0").replace(/[^0-9.]/g, "");
          valA = parseFloat(cleanA) || 0;
          valB = parseFloat(cleanB) || 0;
        }

        if (typeof valA === "string") {
          const strA = valA.toLowerCase();
          const strB = (valB || "").toLowerCase();
          return sortDirection === "asc" 
            ? strA.localeCompare(strB) 
            : strB.localeCompare(strA);
        } else {
          const numA = Number(valA || 0);
          const numB = Number(valB || 0);
          return sortDirection === "asc" 
            ? numA - numB 
            : numB - numA;
        }
      });
    }

    return result;
  }, [productiveEmployees, searchTerm, roleFilter, sortField, sortDirection]);

  // Aggregate Metrics
  const summaryStats = useMemo(() => {
    let totalRevenue = 0;
    let totalTarget = 0;
    let hasTargetCount = 0;

    productiveEmployees.forEach(emp => {
      const rev = emp.allocated_revenue || 0;
      const target = emp.target_revenue || 0;
      totalRevenue += rev;
      totalTarget += target;
      if (target > 0) {
        hasTargetCount++;
      }
    });

    const averageAchievement = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;

    // Find top performer by percentage
    let topPerformerName = "N/A";
    let topPerformerPct = 0;

    productiveEmployees.forEach(emp => {
      const rev = emp.allocated_revenue || 0;
      const target = emp.target_revenue || 0;
      if (target > 0) {
        const pct = (rev / target) * 100;
        if (pct > topPerformerPct) {
          topPerformerPct = pct;
          topPerformerName = emp.full_name;
        }
      }
    });

    return {
      totalRevenue,
      totalTarget,
      averageAchievement,
      hasTargetCount,
      topPerformerName,
      topPerformerPct
    };
  }, [productiveEmployees]);

  // Format charts data (only include employees who have an allocated revenue or target > 0)
  const chartData = useMemo(() => {
    return productiveEmployees
      .filter(emp => (emp.allocated_revenue || 0) > 0 || (emp.target_revenue || 0) > 0)
      .map(emp => {
        const rev = emp.allocated_revenue || 0;
        const target = emp.target_revenue || 0;
        const pct = target > 0 ? Math.round((rev / target) * 100) : 0;
        return {
          name: emp.full_name.split(" ").slice(0, 2).join(" "), // Abbreviate long names
          "Allocated Revenue": rev,
          "Target": target,
          "Achievement %": pct
        };
      })
      .sort((a, b) => b["Allocated Revenue"] - a["Allocated Revenue"]);
  }, [productiveEmployees]);

  return (
    <div className="space-y-6" id="productivity-dashboard-root">
      {/* 1. Header & Quick View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-orange-500" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Workshop Productivity</h1>
            </div>
            {isAdmin ? (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                <Shield className="h-3 w-3" /> Admin Mode Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 shrink-0">
                <Lock className="h-3 w-3" /> Read-Only Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Employee targets, revenue allocations, and achievement metrics synced from Sheets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            id="tab-btn-table"
            onClick={() => setActiveTab("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
              activeTab === "table" 
                ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Roster Metrics
          </button>
          <button 
            id="tab-btn-charts"
            onClick={() => setActiveTab("charts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
              activeTab === "charts" 
                ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Performance Charts
          </button>
          <button 
            id="tab-btn-importer"
            onClick={() => setActiveTab("importer")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
              activeTab === "importer" 
                ? "bg-orange-500 text-white border-orange-600 shadow-sm" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Paste Sheets Report
          </button>
          <button 
            id="tab-btn-calculator"
            onClick={() => setActiveTab("calculator")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
              activeTab === "calculator" 
                ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            Productivity Calculator
          </button>
        </div>
      </div>

      {/* 2. Key Productivity Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between" id="metric-total-rev">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Allocated Rev</p>
            <p className="text-xl font-black text-slate-900">₹{summaryStats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between" id="metric-total-target">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Shop Target</p>
            <p className="text-xl font-black text-slate-900">₹{summaryStats.totalTarget.toLocaleString()}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Target className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between" id="metric-shop-ach">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Achievement %</p>
            <p className="text-xl font-black text-slate-900">
              {summaryStats.averageAchievement.toFixed(2)}%
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between" id="metric-top-performer">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Performer</p>
            <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{summaryStats.topPerformerName}</p>
            <p className="text-[10px] font-bold text-emerald-600">{summaryStats.topPerformerPct.toFixed(1)}% achieved</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* 3. Render Tabs */}
      {activeTab === "table" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-4">
          
          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                id="search-employee-productivity"
                type="text"
                placeholder="Search employee by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs font-medium placeholder-slate-400 focus:outline-hidden focus:border-slate-300 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select
                id="role-filter-dropdown"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:outline-hidden"
              >
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role === "All" ? "All Roles" : role}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="productivity-roster-table">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th onClick={() => handleSort("full_name")} className="p-3 cursor-pointer select-none hover:bg-slate-100 transition-colors">
                    <span className="flex items-center gap-1">Employee Name {renderSortArrow("full_name")}</span>
                  </th>
                  <th onClick={() => handleSort("role")} className="p-3 cursor-pointer select-none hover:bg-slate-100 transition-colors">
                    <span className="flex items-center gap-1">Role {renderSortArrow("role")}</span>
                  </th>
                  <th onClick={() => handleSort("allocated_revenue")} className="p-3 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors">
                    <span className="flex items-center justify-end gap-1">Allocated Revenue {renderSortArrow("allocated_revenue")}</span>
                  </th>
                  <th onClick={() => handleSort("target_revenue")} className="p-3 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors">
                    <span className="flex items-center justify-end gap-1">Target {renderSortArrow("target_revenue")}</span>
                  </th>
                  <th onClick={() => handleSort("pct_target")} className="p-3 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors" style={{ width: "160px" }}>
                    <span className="flex items-center justify-center gap-1">% to Target {renderSortArrow("pct_target")}</span>
                  </th>
                  <th onClick={() => handleSort("paid_pct")} className="p-3 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors">
                    <span className="flex items-center justify-end gap-1">Paid % {renderSortArrow("paid_pct")}</span>
                  </th>
                  <th onClick={() => handleSort("tml_claim_pct")} className="p-3 text-right cursor-pointer select-none hover:bg-slate-100 transition-colors">
                    <span className="flex items-center justify-end gap-1">TML Claim % {renderSortArrow("tml_claim_pct")}</span>
                  </th>
                  <th className="p-3 text-center select-none">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                      No employees found matching the filters. Paste a sheets report to import metrics.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isEditing = editingId === emp.employee_id;
                    const rev = emp.allocated_revenue || 0;
                    const target = emp.target_revenue || 0;
                    const pct = target > 0 ? (rev / target) * 100 : 0;
                    
                    // Determine progress bar color
                    let barColor = "bg-red-500";
                    let textColor = "text-red-700 bg-red-50 border-red-100";
                    if (pct >= 75) {
                      barColor = "bg-emerald-500";
                      textColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                    } else if (pct >= 40) {
                      barColor = "bg-orange-500";
                      textColor = "text-orange-700 bg-orange-50 border-orange-100";
                    }

                    return (
                      <tr key={emp.employee_id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                        
                        {/* Name */}
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {emp.full_name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div>
                              <p className="leading-tight">{emp.full_name}</p>
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{emp.employee_code}</span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="p-3 text-slate-500 text-[11px] font-bold uppercase">{emp.role}</td>

                        {/* Allocated Revenue */}
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.allocated_revenue}
                              onChange={(e) => setEditForm({ ...editForm, allocated_revenue: Number(e.target.value) })}
                              className="w-24 text-right bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-900">₹{rev.toLocaleString()}</span>
                          )}
                        </td>

                        {/* Target */}
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={editForm.target_revenue}
                              onChange={(e) => setEditForm({ ...editForm, target_revenue: Number(e.target.value) })}
                              className="w-24 text-right bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-mono font-bold text-slate-950">₹{target.toLocaleString()}</span>
                          )}
                        </td>

                        {/* % to Target */}
                        <td className="p-3 text-center">
                          <div className="space-y-1 flex flex-col items-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${textColor}`}>
                              {pct.toFixed(1)}%
                            </span>
                            {target > 0 && (
                              <div className="w-28 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Paid % */}
                        <td className="p-3 text-right font-mono text-[11px]">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editForm.paid_pct}
                              onChange={(e) => setEditForm({ ...editForm, paid_pct: e.target.value })}
                              className="w-16 text-right bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-bold text-slate-500">{emp.paid_pct || "0.00%"}</span>
                          )}
                        </td>

                        {/* TML Claim % */}
                        <td className="p-3 text-right font-mono text-[11px]">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={editForm.tml_claim_pct}
                              onChange={(e) => setEditForm({ ...editForm, tml_claim_pct: e.target.value })}
                              className="w-16 text-right bg-slate-50 border border-slate-300 rounded p-1 text-xs font-bold"
                            />
                          ) : (
                            <span className="font-bold text-slate-600">{emp.tml_claim_pct || "0.00%"}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => saveInlineEdit(emp.employee_id)}
                                className="p-1 rounded bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 transition-colors"
                                title="Save"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={cancelEditing}
                                className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            isAdmin ? (
                              <button 
                                onClick={() => startEditing(emp)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-700 transition-all shadow-2xs"
                                title="Edit Metrics"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => setShowAdminLogin(true)}
                                className="p-1.5 rounded-lg border border-dashed border-slate-200 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
                                title="Unlock Admin Mode to Edit"
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Recharts Visualization Panel */}
      {activeTab === "charts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="productivity-charts-grid">
          
          {/* Chart 1: Revenue vs Target */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Employee Revenue vs Target</h3>
                <p className="text-[10px] text-slate-400 font-medium">Comparison of actual allocated rupees and target goal.</p>
              </div>
              <Activity className="h-4 w-4 text-orange-500" />
            </div>

            <div className="h-80 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(0, 10)} margin={{ top: 20, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Allocated Revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Target" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Top Achievement % */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Top Performers (% Achieved)</h3>
                <p className="text-[10px] text-slate-400 font-medium">Percentage progress of target achievement (Top 10 staff).</p>
              </div>
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>

            <div className="h-80 w-full text-xs text-slate-600">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[...chartData].sort((a,b) => b["Achievement %"] - a["Achievement %"]).slice(0, 10)} 
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" tickLine={false} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="Achievement %" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => {
                      const pct = entry["Achievement %"];
                      const color = pct >= 75 ? "#10b981" : pct >= 40 ? "#f97316" : "#ef4444";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: TML Claim Percent Analysis */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 lg:col-span-2">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Paid % vs TML Claim % Breakdown</h3>
                <p className="text-[10px] text-slate-400 font-medium">Analyzing TML Claim percentages across workshop technicians.</p>
              </div>
              <Percent className="h-4 w-4 text-emerald-500" />
            </div>

            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={productiveEmployees
                    .filter(e => e.tml_claim_pct && parseFloat(e.tml_claim_pct) > 0)
                    .map(e => ({
                      name: e.full_name,
                      "TML Claim %": parseFloat(e.tml_claim_pct || "0"),
                      "Paid %": parseFloat(e.paid_pct || "0")
                    }))
                    .slice(0, 15)
                  }
                  margin={{ top: 10, right: 20, left: 10, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" angle={-15} textAnchor="end" tickLine={false} />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="TML Claim %" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Paid %" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Tab: Paste Sheets Importer */}
      {activeTab === "importer" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6" id="productivity-importer-stage">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase">Paste Google Sheets Productivity Report</h3>
            <p className="text-xs text-slate-500 leading-normal">
              Copy-paste directly from your Google Sheets. The parser automatically reconciles columns, cleans monetary strings (removes commas, ₹ symbols), and matches employees by name. If you are an Admin and an employee does not exist, they will be auto-created; otherwise new records are skipped to keep your roster accurate.
            </p>
          </div>

          {!isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 font-semibold shadow-2xs animate-pulse">
              <div className="flex gap-2">
                <Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase text-[10px] text-amber-800 tracking-wider">Read-Only Sync Enabled</p>
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed mt-0.5">
                    You are currently not in Admin Mode. Synchronizing this sheet will update targets and revenues for **existing employees only**, safely skipping any non-employee or customer entries.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminLogin(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Unlock className="h-3 w-3" />
                Unlock Admin Mode
              </button>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-lg border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Load Sample Data
            </button>
            <button
              onClick={() => { setPastedText(""); setImportPreview([]); setImportStatus({ type: null, msg: "" }); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 bg-white hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            <textarea
              id="raw-sheets-pasted-text"
              rows={10}
              placeholder="Paste spreadsheet rows here (e.g. Employee Name,Role,Allocated Revenue,Target,% to Target,paid,TML Claim...)"
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                handleParseText(e.target.value);
              }}
              className="w-full font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-4 focus:outline-hidden focus:border-slate-300 focus:bg-white transition-all shadow-inner placeholder-slate-400"
            />
          </div>

          {importStatus.type && (
            <div className={`p-4 rounded-xl border text-xs font-medium ${
              importStatus.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                : "bg-red-50 text-red-800 border-red-200"
            }`}>
              {importStatus.msg}
            </div>
          )}

          {/* Parsed Preview */}
          {importPreview.length > 0 && (
            <div className="space-y-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Parsed Preview ({importPreview.length} Rows)</span>
                <button
                  id="submit-sync-productivity-btn"
                  onClick={handleImportSubmit}
                  disabled={isImporting}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Synchronizing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Commit & Sync Database
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto border border-slate-200/60 rounded-lg bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse font-medium">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5 text-right">Revenue</th>
                      <th className="p-2.5 text-right">Target</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">TML Claim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 text-slate-700">
                        <td className="p-2.5 font-bold text-slate-900">{item.full_name}</td>
                        <td className="p-2.5 uppercase text-[10px] text-slate-500">{item.role}</td>
                        <td className="p-2.5 text-right font-mono text-slate-900">₹{item.allocated_revenue.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-slate-900">₹{item.target_revenue.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{item.paid_pct}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{item.tml_claim_pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "calculator" && (
        <ProductivityCalculator 
          employees={employees}
          jobCards={jobCards}
          onRefresh={onRefresh}
        />
      )}

      {/* Admin Verification Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Verify Admin Access</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Input standard management console PIN</p>
              </div>
            </div>

            <form onSubmit={handleVerifyAdmin} className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Access PIN</label>
                <input 
                  type="password"
                  required
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold tracking-widest focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  maxLength={10}
                />
              </div>

              {pinError && (
                <p className="text-[10px] text-rose-500 font-extrabold uppercase">Incorrect PIN. Please try again.</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setShowAdminLogin(false); setPinError(false); setAdminPin(""); }}
                  className="w-1/2 text-center text-xs font-bold py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 text-center text-xs font-bold py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow-sm transition-all cursor-pointer"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
