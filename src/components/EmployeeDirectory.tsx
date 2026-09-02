import { useEscapeKey } from "../hooks/useEscapeKey";
import React, { useState, useEffect } from "react";
import { staffAuthHeaders } from "../lib/authToken";
import { 
  Plus, 
  Users, 
  UserCheck, 
  Award, 
  Phone, 
  DollarSign, 
  Search, 
  Filter, 
  Edit3, 
  X, 
  Check, 
  ToggleLeft, 
  ToggleRight, 
  Briefcase,
  Lock,
  Unlock,
  Trash2,
  Database,
  FileSpreadsheet,
  Settings,
  Shield,
  HelpCircle,
  User
} from "lucide-react";
import { Employee, Bay, SRType, RevenueSplitMaster } from "../types";
import { EditJustificationModal } from "./EditJustificationModal";

/**
 * Mobile validation, mirroring the server's validateMobileInput.
 *
 * The field must hold a real 10-digit Indian mobile (starting 6-9). A +91
 * country code or a leading trunk 0 is accepted and stripped, because those are
 * unambiguous. Nothing else is — the server previously allowed "10 to 15
 * digits", which let malformed numbers into the directory that downstream code
 * then had to guess ten digits out of.
 *
 * Returns the normalised number, or an error message to show under the field.
 */
const MOBILE_RULE = /^[6-9]\d{9}$/;

function normaliseMobileInput(raw: any): string {
  const original = String(raw ?? "").trim();
  if (!original) return "";
  let digits = original.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return MOBILE_RULE.test(digits) ? digits : "";
}

function mobileFieldError(raw: any, opts: { required?: boolean } = {}): string | null {
  const original = String(raw ?? "").trim();
  if (!original) return opts.required ? "Mobile number is required." : null;
  if (normaliseMobileInput(original)) return null;
  const digits = original.replace(/\D/g, "");
  return `Must be a valid 10-digit Indian mobile starting with 6-9 — this has ${digits.length} digit${digits.length === 1 ? "" : "s"}. A +91 prefix or leading 0 is fine.`;
}

interface EmployeeDirectoryProps {
  employees: Employee[];
  onAddEmployee: (employeeData: Partial<Employee>) => void;
  onUpdateEmployee: (id: number, employeeData: Partial<Employee>) => void;
  onDeleteEmployee: (id: number) => void;
  onBulkImportEmployees: (employeesList: any[]) => void;
  
  // Master Data
  bays: Bay[];
  onAddBay: (bayData: any) => void;
  onUpdateBay: (id: number, bayData: any) => void;
  onDeleteBay: (id: number) => void;

  srTypes: SRType[];
  onAddSRType: (srTypeData: any) => void;
  onUpdateSRType: (id: number, srTypeData: any) => void;
  onDeleteSRType: (id: number) => void;

  revenueSplits: RevenueSplitMaster[];
  onAddSplit: (splitData: any) => void;
  onUpdateSplit: (id: number, splitData: any) => void;
  onDeleteSplit: (id: number) => void;

  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  onRefresh?: () => Promise<void>;
}

export default function EmployeeDirectory({ 
  employees, 
  onAddEmployee, 
  onUpdateEmployee,
  onDeleteEmployee,
  onBulkImportEmployees,
  bays,
  onAddBay,
  onUpdateBay,
  onDeleteBay,
  srTypes,
  onAddSRType,
  onUpdateSRType,
  onDeleteSRType,
  revenueSplits,
  onAddSplit,
  onUpdateSplit,
  onDeleteSplit,
  isAdmin,
  setIsAdmin,
  onRefresh
}: EmployeeDirectoryProps) {
  // Admin Login / Credentials state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  useEscapeKey(() => setShowAdminLogin(false), showAdminLogin);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Login-account linkage, fetched from the real /api/users list (single
  // source of truth: user_access_master / users). Never guessed per-employee.
  const [accountsByEmployeeId, setAccountsByEmployeeId] = useState<Map<number, string>>(new Map());
  const [creatingLoginFor, setCreatingLoginFor] = useState<number | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [loginCreationResult, setLoginCreationResult] = useState<{ username: string; temp_password: string; full_name: string }[] | null>(null);

  const fetchAccountLinks = async () => {
    try {
      const res = await fetch("/api/users", { headers: staffAuthHeaders() });
      if (res.ok) {
        const users = await res.json();
        const map = new Map<number, string>();
        for (const u of Array.isArray(users) ? users : []) {
          if (u.employee_id) map.set(Number(u.employee_id), u.username);
        }
        setAccountsByEmployeeId(map);
      }
    } catch (e) {
      // Quiet fail — badges just show "No Login Account" until this loads.
    }
  };

  useEffect(() => {
    fetchAccountLinks();
  }, []);

  const handleCreateLogin = async (empId: number) => {
    setCreatingLoginFor(empId);
    try {
      const res = await fetch(`/api/employees/${empId}/create-default-login`, {
        method: "POST",
        headers: staffAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginCreationResult([{ username: data.username, temp_password: data.temp_password, full_name: data.full_name }]);
        await fetchAccountLinks();
      } else {
        alert(data.error || "Failed to create login account.");
      }
    } catch (e: any) {
      alert(e.message || "Network error while creating login account.");
    } finally {
      setCreatingLoginFor(null);
    }
  };

  const handleBulkCreateLogins = async () => {
    if (!confirm("Create a default login account for every active employee who doesn't have one yet? Existing accounts are never touched.")) return;
    setBulkCreating(true);
    try {
      const res = await fetch("/api/employees/bulk-create-logins", {
        method: "POST",
        headers: staffAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginCreationResult(data.created);
        await fetchAccountLinks();
        if (data.skippedCount > 0) {
          console.warn("Bulk login creation skipped:", data.skipped);
        }
      } else {
        alert(data.error || "Bulk login creation failed.");
      }
    } catch (e: any) {
      alert(e.message || "Network error during bulk login creation.");
    } finally {
      setBulkCreating(false);
    }
  };

  // Standard Workshop Roles list
  const STANDARD_ROLES = [
    "Technician",
    "Co-Technician",
    "Asst Technician",
    "Electrician",
    "Asst Electrician",
    "Add Tech",
    "Asst Add Tech",
    "Supervisor",
    "Floor Incharge",
    "Service Advisor",
    "Biller",
    "Driver",
    "Oil Incharge",
    "Tools Incharge",
    "Mechanical Helper",
    "Bay Reporter",
    "Warranty Assistant",
    "BD Assistant",
    "Service Engineer"
  ];

  // Dynamically combine with existing employee roles to ensure we don't miss anything
  const AVAILABLE_ROLES = Array.from(new Set([
    ...STANDARD_ROLES,
    ...employees.map(e => e.role)
  ].filter(Boolean)));

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState("Technician");
  const [customRoleText, setCustomRoleText] = useState("");
  const [grade, setGrade] = useState<Employee["employee_grade"]>("Junior");
  const [basicSalary, setBasicSalary] = useState(25000);
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [editMobileError, setEditMobileError] = useState<string | null>(null);
  const [employeeCode, setEmployeeCode] = useState("");
  
  // Add Form Certification States
  const [certificationLevel, setCertificationLevel] = useState("Not Certified");
  const [certificationDate, setCertificationDate] = useState("");
  const [certificationExpiryDate, setCertificationExpiryDate] = useState("");
  const [certificationRemarks, setCertificationRemarks] = useState("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Inline editing state for staff
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSelectedRole, setEditSelectedRole] = useState("Technician");
  const [editCustomRoleText, setEditCustomRoleText] = useState("");
  const [editGrade, setEditGrade] = useState<Employee["employee_grade"]>("Junior");
  const [editSalary, setEditSalary] = useState(25000);
  const [editMobile, setEditMobile] = useState("");
  const [editCode, setEditCode] = useState("");

  // Edit Form Certification States
  const [editCertificationLevel, setEditCertificationLevel] = useState("Not Certified");
  const [editCertificationDate, setEditCertificationDate] = useState("");
  const [editCertificationExpiryDate, setEditCertificationExpiryDate] = useState("");
  const [editCertificationRemarks, setEditCertificationRemarks] = useState("");
  // External-system ids (canonical here on the employee master).
  const [editCrmId, setEditCrmId] = useState("");
  const [editLmsId, setEditLmsId] = useState("");
  // Pending edit awaiting a justification (every edit must be justified).
  const [pendingEdit, setPendingEdit] = useState<{ label: string; run: (reason: string) => Promise<void> | void } | null>(null);

  // Bulk CSV import states
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [csvText, setCsvText] = useState(
    `ABDUL GANI SHEK,Break down Co-ordinator,18080\n` +
    `ALTAF HUSSAIN,Jr. technician,16480\n` +
    `ASHFAQ HUSSAIN,Jr. technician,18000\n` +
    `ASIF,electrician,15040\n` +
    `FAKIRAAPA,Sr. Electrician,25000\n` +
    `HAMEED PATEL,Alignment Technician,18000\n` +
    `HANUMATH RAYA,Jr. technician,12960\n` +
    `JAGADISH,Break down assistant,18000\n` +
    `LOKU,Sr. Technician,25000\n` +
    `MALLINATH,Sr. Technician,25000\n` +
    `MANJUNATH,Warranty assistant,14080\n` +
    `MD GOUSE,Jr. technician,18000\n` +
    `MD JAVEED,Sr. Technician,25000\n` +
    `Afroz,Bay reporter,12000\n` +
    `MEHMOOD,Helper,10080\n` +
    `MOHAMMED SHOAIB,Sr. Technician,18080\n` +
    `MOHSIN NAWAZ,Jr. elecrician,16000\n` +
    `MUSTAFA,Service Advisor,12000\n` +
    `MUZAMILL,Electrician Trainee,12000\n` +
    `NAGESH,Jr. technician,15040\n` +
    `PRABHULING,Parts,16000\n` +
    `RAGHUVENDRA KULKARNI,Floor Supervisor,20000\n` +
    `RAJKUMAR AMABARAYA MENTE,Sr. Technician,25000\n` +
    `REVANSIDAPPA,Oil Room Incharge,10080\n` +
    `SANGAPPA,Sr. Technician,24160\n` +
    `SHARNBASAPPA,Jr. technician,15040\n` +
    `SHASHIKUMAR,Service Advisor,17440\n` +
    `SIRAJ AHMED,Sr. Technician,21000\n` +
    `SRINATH M. N,Jr. technician,15040\n` +
    `SURESH SHIVAJI NATIKAR,Parts Helper,16960\n` +
    `UMAKANTA,Helper,15040\n` +
    `YUNUS ALI,Sr. Electrician,25000\n` +
    `Ahmed hussain,Managenent Trainee,30000\n` +
    `Azhar,Electrician trainee,12000\n` +
    `Danish,Electrician trainee,12000\n` +
    `Md jaffer,Electrician trainee,12000\n` +
    `Md saleem,Jr. technician,12000\n` +
    `Md Mubeen,Jr. technician,12000`
  );

  // Master console tabs
  const [adminTab, setAdminTab] = useState<"bays" | "srtypes" | "splits">("bays");

  // New Bay state
  const [newBayCode, setNewBayCode] = useState("");
  const [newBayName, setNewBayName] = useState("");
  const [newBayType, setNewBayType] = useState<Bay["bay_type"]>("General");

  // New SRType state
  const [newSRCode, setNewSRCode] = useState("");
  const [newSRName, setNewSRName] = useState("");
  const [newSRDuration, setNewSRDuration] = useState(120);

  // New Split state
  const [newSplitCode, setNewSplitCode] = useState("");
  const [newSplitLabel, setNewSplitLabel] = useState("");
  const [newSplitPCount, setNewSplitPCount] = useState(2);
  const [newSplitTech, setNewSplitTech] = useState(60);
  const [newSplitCoTech, setNewSplitCoTech] = useState(40);
  const [newSplitElec, setNewSplitElec] = useState(0);
  const [newSplitAddTech, setNewSplitAddTech] = useState(0);
  const [newSplitUsesSal, setNewSplitUsesSal] = useState(false);
  const [newSplitSenior, setNewSplitSenior] = useState(false);

  // States and handler for purging incorrect customer imports
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  useEscapeKey(() => setShowPurgeConfirm(false), showPurgeConfirm);
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; msg: string } | null>(null);

  const handlePurgeMistakes = async () => {
    setIsPurging(true);
    setPurgeResult(null);
    try {
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("wms_token") : null;
      const res = await fetch("/api/employees/purge-mistakes", {
        method: "POST",
        headers: token
          ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
          : { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setPurgeResult({
          success: true,
          msg: `Successfully cleaned roster! Purged ${data.purgedCount} non-employee rows. Remaining roster size: ${data.afterCount} real technicians.`
        });
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        setPurgeResult({
          success: false,
          msg: data.error || "Failed to purge incorrect records."
        });
      }
    } catch (err) {
      console.error(err);
      setPurgeResult({
        success: false,
        msg: "An error occurred while cleaning the roster."
      });
    } finally {
      setIsPurging(false);
    }
  };

  // handle admin login
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

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
  };

  // Bulk parser
  const handleParseAndImport = () => {
    if (!csvText.trim()) return;

    const lines = csvText.split("\n");
    const parsed: any[] = [];
    
    lines.forEach((line) => {
      const parts = line.split(",");
      if (parts.length >= 2) {
        const name = parts[0]?.trim();
        const roleName = parts[1]?.trim() || "Technician";
        const salary = Number(parts[2]?.trim()) || 15000;
        
        if (name) {
          // Generate simple code & properties
          const isSenior = salary >= 20000 || roleName.toLowerCase().includes("supervisor") || roleName.toLowerCase().includes("manager");

          // Mobile comes from the CSV (4th column) or stays blank.
          //
          // This used to invent one: `+9198765${random 6 digits}`, which is +91
          // followed by ELEVEN digits — not a valid Indian number at all. That
          // is where MUSTAFA's "+9198765186525" and REVANSIDAPPA's
          // "+9198765341681" came from; they were never real phone numbers.
          // Fabricated contact details are worse than none: mobile_no is the
          // password-reset lookup key, so a made-up number is a made-up
          // recovery route.
          const csvMobile = normaliseMobileInput(parts[3]);

          parsed.push({
            full_name: name,
            role: roleName,
            basic_salary: salary,
            employee_grade: isSenior ? "Senior" : "Junior",
            mobile: csvMobile,
            is_active: true
          });
        }
      }
    });

    if (parsed.length > 0) {
      onBulkImportEmployees(parsed);
      setShowBulkPanel(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobile || !employeeCode) return;

    // Block submission on an invalid mobile and show why, rather than letting
    // the server reject it after the fact.
    const mobileErr = mobileFieldError(mobile, { required: true });
    if (mobileErr) {
      setMobileError(mobileErr);
      return;
    }

    const finalRole = selectedRole === "custom" ? customRoleText.trim() : selectedRole;
    if (!finalRole) return;

    onAddEmployee({
      full_name: fullName,
      employee_code: employeeCode.toUpperCase(),
      role: finalRole,
      employee_grade: grade,
      basic_salary: Number(basicSalary),
      mobile: normaliseMobileInput(mobile),
      certification_level: certificationLevel,
      certification_date: certificationDate || null,
      certification_expiry_date: certificationExpiryDate || null,
      certification_remarks: certificationRemarks || null
    });

    // Reset Form
    setFullName("");
    setEmployeeCode("");
    setMobile("");
    setBasicSalary(25000);
    setSelectedRole("Technician");
    setCustomRoleText("");
    setCertificationLevel("Not Certified");
    setCertificationDate("");
    setCertificationExpiryDate("");
    setCertificationRemarks("");
    setShowAddForm(false);
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.employee_id);
    setEditName(emp.full_name);
    
    if (AVAILABLE_ROLES.includes(emp.role)) {
      setEditSelectedRole(emp.role);
      setEditCustomRoleText("");
    } else {
      setEditSelectedRole("custom");
      setEditCustomRoleText(emp.role);
    }

    setEditGrade(emp.employee_grade);
    setEditSalary(emp.basic_salary);
    setEditMobile(emp.mobile);
    setEditCode(emp.employee_code);

    setEditCertificationLevel(emp.certification_level || "Not Certified");
    setEditCertificationDate(emp.certification_date || "");
    setEditCertificationExpiryDate(emp.certification_expiry_date || "");
    setEditCertificationRemarks(emp.certification_remarks || "");
    setEditCrmId(emp.crm_id || "");
    setEditLmsId(emp.lms_id || "");
    // Surface a pre-existing bad value immediately rather than only on save.
    setEditMobileError(mobileFieldError(emp.mobile, { required: true }));
  };

  const handleSaveEdit = (id: number) => {
    if (!editName || !editMobile || !editCode) return;

    // Refuse to save an invalid mobile. Legacy rows may already hold one, so the
    // error appears at save time rather than blocking the whole edit panel.
    const editErr = mobileFieldError(editMobile, { required: true });
    if (editErr) {
      setEditMobileError(editErr);
      return;
    }

    const finalEditRole = editSelectedRole === "custom" ? editCustomRoleText.trim() : editSelectedRole;
    if (!finalEditRole) return;

    const payload = {
      full_name: editName,
      employee_code: editCode.toUpperCase(),
      role: finalEditRole,
      employee_grade: editGrade,
      basic_salary: Number(editSalary),
      mobile: normaliseMobileInput(editMobile),
      certification_level: editCertificationLevel,
      certification_date: editCertificationDate || null,
      certification_expiry_date: editCertificationExpiryDate || null,
      certification_remarks: editCertificationRemarks || null,
      crm_id: editCrmId.trim() || null,
      lms_id: editLmsId.trim() || null
    };
    // Every edit needs a justification.
    setPendingEdit({
      label: `Employee: ${editName}`,
      run: async (reason) => { await onUpdateEmployee(id, { ...payload, justification: reason }); setEditingId(null); },
    });
  };

  const toggleStatus = (emp: Employee) => {
    setPendingEdit({
      label: `${emp.full_name} — ${emp.is_active ? "deactivate" : "activate"}`,
      run: async (reason) => { await onUpdateEmployee(emp.employee_id, { is_active: !emp.is_active, justification: reason }); },
    });
  };

  // Add Bay
  const handleAddNewBay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBayCode || !newBayName) return;
    onAddBay({
      bay_code: newBayCode.toUpperCase(),
      bay_name: newBayName,
      bay_type: newBayType,
      status: "Idle",
      is_active: true
    });
    setNewBayCode("");
    setNewBayName("");
  };

  // Add SR Type
  const handleAddNewSRType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSRCode || !newSRName) return;
    onAddSRType({
      sr_type_code: newSRCode.toUpperCase(),
      sr_type_name: newSRName,
      default_duration_mins: Number(newSRDuration),
      is_active: true
    });
    setNewSRCode("");
    setNewSRName("");
  };

  // Add Split Combination
  const handleAddNewSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSplitCode || !newSplitLabel) return;
    onAddSplit({
      combination_code: newSplitCode.toUpperCase(),
      combination_label: newSplitLabel,
      person_count: Number(newSplitPCount),
      tech_pct: Number(newSplitTech),
      co_tech_pct: Number(newSplitCoTech),
      electrician_pct: Number(newSplitElec),
      add_tech_pct: Number(newSplitAddTech),
      uses_salary_wt: newSplitUsesSal,
      senior_override: newSplitSenior,
      is_active: true
    });
    setNewSplitCode("");
    setNewSplitLabel("");
  };

  // Compute live roster statistics
  const totalCount = employees.length;
  const activeCount = employees.filter(e => e.is_active).length;
  const activeSpecialists = employees.filter(e => e.is_active && ["Technician", "Electrician", "Add Tech", "Asst Technician", "Asst Electrician"].some(r => e.role.toLowerCase().includes(r.toLowerCase()))).length;
  const activeMonthlyPayroll = employees.reduce((sum, e) => sum + (e.is_active ? e.basic_salary : 0), 0);

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.mobile.includes(searchQuery) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "All" || emp.role === roleFilter;
    
    const matchesStatus = 
      statusFilter === "All" || 
      (statusFilter === "Active" && emp.is_active) || 
      (statusFilter === "Inactive" && !emp.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Unique roles from database to populate role filter dynamically
  const uniqueRoles = Array.from(new Set(employees.map(e => e.role)));

  return (
    <div className="space-y-6">
      
      {/* Header and Admin Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 uppercase">Employee & Master Data</h1>
            {isAdmin ? (
              <span className="ds-button-primary flex items-center gap-1 text-[10px]   text-white font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-2xs">
                <Shield className="h-3 w-3" /> Master Admin Mode
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] bg-slate-200 text-slate-500 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                Read-Only Roster
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">Manage technicians, workshop bays, repair categories, and commissions split setups.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {isAdmin ? (
            <>
              <button 
                onClick={() => { setShowPurgeConfirm(true); setPurgeResult(null); }}
                className="ds-button-danger   hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Purge mistakenly imported customer rows"
              >
                <Trash2 className="h-4 w-4" />
                Clean Directory
              </button>
              <button 
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="ds-button-success   hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Import CSV
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="ds-button-primary   hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {showAddForm ? "Hide Form" : "Add Employee"}
              </button>
              <button
                onClick={handleBulkCreateLogins}
                disabled={bulkCreating}
                title="Creates a default login (username = employee code) for every active employee who doesn't have one yet. Never touches existing accounts."
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <User className="h-4 w-4" />
                {bulkCreating ? "Creating Logins..." : "Create Logins for All"}
              </button>
              <button 
                onClick={handleLogoutAdmin}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                Lock Admin
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="ds-button-primary   hover:bg-orange-600 text-white font-bold text-xs px-4 py-2.5 rounded transition-all flex items-center gap-1.5 shadow-xs cursor-pointer animate-pulse"
            >
              <Unlock className="h-4 w-4" />
              Unlock Admin Console
            </button>
          )}
        </div>
      </div>

      {/* Default Login Creation Results — temp passwords shown once, must be handed to the employee now */}
      {loginCreationResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-orange-500" />
                {loginCreationResult.length} Login{loginCreationResult.length !== 1 ? "s" : ""} Created
              </h3>
              <button onClick={() => setLoginCreationResult(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Temporary passwords are shown only once. Share these with each employee — they'll be required to set a real password on first login.
            </p>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {loginCreationResult.map((r, i) => (
                <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{r.full_name}</span>
                  <span className="font-mono text-slate-600">@{r.username} / {r.temp_password}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setLoginCreationResult(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Admin Login Modal / Panel */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-orange-500" />
                Master Admin Login
              </h3>
              <button onClick={() => { setShowAdminLogin(false); setPinError(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleVerifyAdmin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Enter Master PIN (Hint: admin123)</label>
                <input 
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-center text-sm font-bold tracking-widest focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                />
                {pinError && (
                  <p className="text-rose-600 text-[10px] font-bold mt-1 text-center">Invalid Admin Credentials. Try again.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setShowAdminLogin(false); setPinError(false); }} 
                  className="text-xs font-bold px-4 py-2 bg-slate-100 rounded text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="ds-button-primary text-xs font-bold px-5 py-2   hover:bg-orange-600 rounded text-white shadow-sm cursor-pointer"
                >
                  Unlock Systems
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider">Total Registered Staff</p>
            <p className="text-xl font-black text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider">Active Staff Members</p>
            <p className="text-xl font-black text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider">Active Core Technicians</p>
            <p className="text-xl font-black text-slate-900">{activeSpecialists}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-600 font-extrabold uppercase tracking-wider">Active Roster Base Payroll</p>
            {isAdmin ? (
              <p className="text-xl font-black text-slate-900">₹{activeMonthlyPayroll.toLocaleString()}</p>
            ) : (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                <Lock className="h-3 w-3 inline text-slate-400" /> ₹•••••• <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Admin Only</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CSV Bulk Import Panel */}
      {isAdmin && showBulkPanel && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
                Bulk CSV Employees Sheet Import
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Parse dynamic comma-separated rows. Formats: Name, Role, Basic Salary</p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowBulkPanel(false)} 
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Paste Employee Sheet Rows Below</label>
              <textarea 
                rows={10}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none leading-relaxed shadow-inner"
                placeholder="Name, Role, MonthlySalary"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs leading-relaxed font-semibold text-slate-700">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-orange-500" />
                How to Import
              </h4>
              <p className="text-slate-700">We've prefilled your exact parsed employee list! Simply click <strong className="text-slate-900 font-black">Parse & Bulk Save</strong> below to commit all 42 employees to the database in one single sweep!</p>
              <ul className="list-disc pl-4 space-y-1 mt-2 text-[11px] text-slate-600 font-medium">
                <li>Sequential code identifiers (<strong className="text-slate-800">EMP00x</strong>) will be auto-generated.</li>
                <li>Salary of <strong className="text-slate-800">₹20,000+</strong> automatically upgrades staff to <strong className="text-slate-800">Senior Grade</strong>.</li>
                <li>Saves instantly into the persistent JSON database.</li>
              </ul>
              <div className="pt-2 border-t border-slate-200 mt-4 flex">
                <button 
                  onClick={handleParseAndImport}
                  className="ds-button-success w-full hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer text-center uppercase tracking-wider"
                >
                  Parse & Bulk Save Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Form Inline */}
      {isAdmin && showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-slate-200 max-w-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Register New Staff Member</h2>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee Code*</label>
              <input 
                type="text" 
                required 
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP008"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name*</label>
              <input 
                type="text" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role*</label>
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
              >
                {AVAILABLE_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="custom">Other (Type Custom...)</option>
              </select>
              {selectedRole === "custom" && (
                <input 
                  type="text" 
                  required
                  value={customRoleText}
                  onChange={(e) => setCustomRoleText(e.target.value)}
                  placeholder="Enter custom role"
                  className="mt-1.5 w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skill Grade*</label>
              <select 
                value={grade}
                onChange={(e) => setGrade(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
              >
                <option value="Junior">Junior Grade</option>
                <option value="Senior">Senior Grade</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Basic Salary (₹)*</label>
              <input 
                type="number" 
                required 
                value={basicSalary}
                onChange={(e) => setBasicSalary(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number*</label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={(e) => { setMobile(e.target.value); if (mobileError) setMobileError(null); }}
                onBlur={(e) => setMobileError(mobileFieldError(e.target.value, { required: true }))}
                placeholder="10-digit mobile, e.g. 9876543210"
                aria-invalid={!!mobileError}
                className={`w-full bg-slate-50 border rounded p-2 text-xs font-semibold focus:ring-1 focus:outline-hidden ${
                  mobileError
                    ? "border-rose-400 focus:ring-rose-500"
                    : "border-slate-200 focus:ring-orange-500"
                }`}
              />
              {mobileError && (
                <p className="text-[10px] font-semibold text-rose-600 mt-1">{mobileError}</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-2">CPSC Certification Management</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Certification Level</label>
                <select 
                  value={certificationLevel}
                  onChange={(e) => setCertificationLevel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Not Certified">Not Certified</option>
                  <option value="Bronze">Bronze Level</option>
                  <option value="Silver">Silver Level</option>
                  <option value="Gold">Gold Level</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Certification Date</label>
                <input 
                  type="date" 
                  value={certificationDate}
                  onChange={(e) => setCertificationDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                <input 
                  type="date" 
                  value={certificationExpiryDate}
                  onChange={(e) => setCertificationExpiryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks</label>
                <input 
                  type="text" 
                  value={certificationRemarks}
                  onChange={(e) => setCertificationRemarks(e.target.value)}
                  placeholder="Certification Remarks"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="text-xs font-bold px-4 py-2 bg-slate-100 rounded text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="ds-button-primary text-xs font-bold px-5 py-2   hover:bg-orange-600 rounded text-white shadow-sm transition-colors cursor-pointer"
            >
              Register Employee
            </button>
          </div>
        </form>
      )}

      {/* MASTER DATA MANAGEMENT TABS (IF ADMIN) */}
      {isAdmin && (
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Admin Master Database Tables</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Edit system presets dynamically</p>
              </div>
            </div>

            <div className="flex gap-2 bg-slate-850 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setAdminTab("bays")}
                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all cursor-pointer ${
                  adminTab === "bays" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Workshop Bays ({bays.length})
              </button>
              <button 
                onClick={() => setAdminTab("srtypes")}
                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all cursor-pointer ${
                  adminTab === "srtypes" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Service Types ({srTypes.length})
              </button>
              <button 
                onClick={() => setAdminTab("splits")}
                className={`text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all cursor-pointer ${
                  adminTab === "splits" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Revenue Split Rules ({revenueSplits.length})
              </button>
            </div>
          </div>

          {/* TAB 1: BAYS */}
          {adminTab === "bays" && (
            <div className="space-y-4">
              <form onSubmit={handleAddNewBay} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-850 p-3.5 rounded border border-slate-800">
                <div>
                  <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Bay Code</label>
                  <input 
                    type="text"
                    required
                    value={newBayCode}
                    onChange={(e) => setNewBayCode(e.target.value)}
                    placeholder="e.g. B07"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Bay Name / Label</label>
                  <input 
                    type="text"
                    required
                    value={newBayName}
                    onChange={(e) => setNewBayName(e.target.value)}
                    placeholder="Bay 07 (Diagnostic)"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Bay Type</label>
                  <select
                    value={newBayType}
                    onChange={(e) => setNewBayType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  >
                    <option value="General">General Repair</option>
                    <option value="Express">Express Service</option>
                    <option value="Electrical">Electrical Work</option>
                    <option value="Body Shop">Body Shop</option>
                  </select>
                </div>
                <div>
                  <button 
                    type="submit"
                    className="ds-button-primary w-full   hover:bg-orange-600 text-white font-bold text-xs py-2 rounded transition-colors cursor-pointer"
                  >
                    Create Bay
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bays.map((bay) => (
                  <div key={bay.bay_id} className="bg-slate-850 p-3 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white">{bay.bay_name} <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight ml-1">({bay.bay_code})</span></p>
                      <p className="text-[9px] text-slate-500 font-extrabold uppercase mt-0.5">Type: {bay.bay_type} • Status: {bay.status}</p>
                    </div>
                    <button 
                      onClick={() => onDeleteBay(bay.bay_id)}
                      className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded cursor-pointer transition-colors"
                      title="Delete Bay"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SERVICE TYPES */}
          {adminTab === "srtypes" && (
            <div className="space-y-4">
              <form onSubmit={handleAddNewSRType} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-slate-850 p-3.5 rounded border border-slate-800">
                <div>
                  <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Code</label>
                  <input 
                    type="text"
                    required
                    value={newSRCode}
                    onChange={(e) => setNewSRCode(e.target.value)}
                    placeholder="e.g. DI"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Category / Service Name</label>
                  <input 
                    type="text"
                    required
                    value={newSRName}
                    onChange={(e) => setNewSRName(e.target.value)}
                    placeholder="Engine Diagnostics"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Default Standard Mins</label>
                  <input 
                    type="number"
                    required
                    value={newSRDuration}
                    onChange={(e) => setNewSRDuration(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <button 
                    type="submit"
                    className="ds-button-primary w-full   hover:bg-orange-600 text-white font-bold text-xs py-2 rounded transition-colors cursor-pointer"
                  >
                    Create Category
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {srTypes.map((sr) => (
                  <div key={sr.sr_type_id} className="bg-slate-850 p-3 rounded border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white">{sr.sr_type_name} <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight ml-1">({sr.sr_type_code})</span></p>
                      <p className="text-[9px] text-slate-500 font-extrabold uppercase mt-0.5">Standard Duration: {sr.default_duration_mins} Mins</p>
                    </div>
                    <button 
                      onClick={() => onDeleteSRType(sr.sr_type_id)}
                      className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded cursor-pointer transition-colors"
                      title="Delete Service Type"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE SPLITS */}
          {adminTab === "splits" && (
            <div className="space-y-4">
              <form onSubmit={handleAddNewSplit} className="bg-slate-850 p-4 rounded border border-slate-800 space-y-3.5">
                <h4 className="text-[10px] font-extrabold text-orange-500 uppercase tracking-wider">Register Custom Split Combination Code</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Combination Code</label>
                    <input 
                      type="text"
                      required
                      value={newSplitCode}
                      onChange={(e) => setNewSplitCode(e.target.value)}
                      placeholder="e.g. MY_THREE_TECH"
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Visual Label</label>
                    <input 
                      type="text"
                      required
                      value={newSplitLabel}
                      onChange={(e) => setNewSplitLabel(e.target.value)}
                      placeholder="My Custom Split Rule"
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="ds-label text-[9px] font-extrabold   uppercase tracking-wider block mb-1">Min Staff Count</label>
                    <input 
                      type="number"
                      required
                      value={newSplitPCount}
                      onChange={(e) => setNewSplitPCount(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-xs text-white focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="ds-label text-[9px] font-bold   block mb-1">Primary Tech (%)</label>
                    <input type="number" value={newSplitTech} onChange={(e) => setNewSplitTech(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1" />
                  </div>
                  <div>
                    <label className="ds-label text-[9px] font-bold   block mb-1">Co-Tech (%)</label>
                    <input type="number" value={newSplitCoTech} onChange={(e) => setNewSplitCoTech(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1" />
                  </div>
                  <div>
                    <label className="ds-label text-[9px] font-bold   block mb-1">Electrician (%)</label>
                    <input type="number" value={newSplitElec} onChange={(e) => setNewSplitElec(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1" />
                  </div>
                  <div>
                    <label className="ds-label text-[9px] font-bold   block mb-1">Add Tech (%)</label>
                    <input type="number" value={newSplitAddTech} onChange={(e) => setNewSplitAddTech(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded p-1" />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newSplitUsesSal} onChange={(e) => setNewSplitUsesSal(e.target.checked)} className="accent-orange-500" />
                    <span>Uses Salary Weightage (Ignore Percentages)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newSplitSenior} onChange={(e) => setNewSplitSenior(e.target.checked)} className="accent-orange-500" />
                    <span>Senior Override Enabled</span>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    className="ds-button-primary   hover:bg-orange-600 text-white font-extrabold text-xs px-5 py-2 rounded transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Add Combination Split Rule
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {revenueSplits.map((split) => (
                  <div key={split.split_id} className="bg-slate-850 p-3 rounded border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{split.combination_label} <span className="font-mono text-slate-400 ml-1">({split.combination_code})</span></p>
                      <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                        {split.uses_salary_wt ? (
                          <span className="text-orange-400 font-bold">Dynamic Basic Salary Split Weightage</span>
                        ) : (
                          `Tech: ${split.tech_pct}%, Co-Tech: ${split.co_tech_pct}%, Electrician: ${split.electrician_pct}%, Add Tech: ${split.add_tech_pct}%`
                        )}
                        {split.senior_override && " • (Senior Grade Tech +10%)"}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDeleteSplit(split.split_id)}
                      className="p-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded cursor-pointer transition-colors"
                      title="Delete Split Combination"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-3xs flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by staff name, code, phone or role..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto items-center">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role:</span>
          </div>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
          >
            <option value="All">All Roles</option>
            {uniqueRoles.map((r, idx) => (
              <option key={idx} value={r}>{r}</option>
            ))}
          </select>

          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Roster Cards Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
          <p className="text-xs font-bold">No registered staff found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => {
            const isEditing = editingId === emp.employee_id;

            let roleColor = "bg-slate-100 text-slate-800 border-slate-200";
            const roleLower = emp.role.toLowerCase();
            if (roleLower.includes("technician")) roleColor = "bg-orange-50 text-orange-800 border-orange-200/50";
            else if (roleLower.includes("electrician")) roleColor = "bg-amber-50 text-amber-800 border-amber-200/50";
            else if (roleLower.includes("add tech")) roleColor = "bg-purple-50 text-purple-800 border-purple-200/50";
            else if (roleLower.includes("supervisor")) roleColor = "bg-red-50 text-red-800 border-red-200/50";
            else if (roleLower.includes("manager")) roleColor = "bg-green-50 text-green-800 border-green-200/50";

            return (
              <div 
                key={emp.employee_id} 
                className={`bg-white border rounded-xl p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                  isEditing 
                    ? "border-orange-500/50 ring-1 ring-orange-100" 
                    : !emp.is_active 
                    ? "border-slate-200 opacity-65 bg-slate-50/50" 
                    : "border-slate-200"
                }`}
              >
                {isEditing ? (
                  // EDIT MODE
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h4 className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider">Editing Staff Details</h4>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="ds-label text-[9px] font-bold   uppercase tracking-wider">Code</label>
                          <input 
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold uppercase focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="ds-label text-[9px] font-bold   uppercase tracking-wider">Mobile</label>
                          <input
                            type="text"
                            value={editMobile}
                            onChange={(e) => { setEditMobile(e.target.value); if (editMobileError) setEditMobileError(null); }}
                            onBlur={(e) => setEditMobileError(mobileFieldError(e.target.value))}
                            placeholder="10-digit mobile"
                            aria-invalid={!!editMobileError}
                            className={`w-full bg-slate-50 border rounded px-2 py-1 font-semibold focus:ring-1 focus:outline-hidden ${
                              editMobileError
                                ? "border-rose-400 focus:ring-rose-500"
                                : "border-slate-200 focus:ring-orange-500"
                            }`}
                          />
                          {editMobileError && (
                            <p className="text-[9px] font-semibold text-rose-600 mt-1">{editMobileError}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="ds-label text-[9px] font-bold   uppercase tracking-wider">Full Name</label>
                        <input 
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="ds-label text-[9px] font-bold   uppercase tracking-wider block mb-1">Role</label>
                          <select 
                            value={editSelectedRole}
                            onChange={(e) => setEditSelectedRole(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                          >
                            {AVAILABLE_ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                            <option value="custom">Other (Type Custom...)</option>
                          </select>
                          {editSelectedRole === "custom" && (
                            <input 
                              type="text" 
                              required
                              value={editCustomRoleText}
                              onChange={(e) => setEditCustomRoleText(e.target.value)}
                              placeholder="Enter custom role"
                              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                            />
                          )}
                        </div>
                        <div>
                          <label className="ds-label text-[9px] font-bold   uppercase tracking-wider">Grade</label>
                          <select 
                            value={editGrade}
                            onChange={(e) => setEditGrade(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                          >
                            <option value="Junior">Junior</option>
                            <option value="Senior">Senior</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="ds-label text-[9px] font-bold   uppercase tracking-wider">Basic Salary (₹)</label>
                        <input 
                          type="number"
                          value={editSalary}
                          onChange={(e) => setEditSalary(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="border-t border-slate-100 pt-2 space-y-2">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">CPSC Certification</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="ds-label text-[9px] font-bold   uppercase tracking-wider block mb-1">Level</label>
                            <select 
                              value={editCertificationLevel}
                              onChange={(e) => setEditCertificationLevel(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            >
                              <option value="Not Certified">Not Certified</option>
                              <option value="Bronze">Bronze</option>
                              <option value="Silver">Silver</option>
                              <option value="Gold">Gold</option>
                            </select>
                          </div>
                          <div>
                            <label className="ds-label text-[9px] font-bold   uppercase tracking-wider block mb-1">Remarks</label>
                            <input 
                              type="text" 
                              value={editCertificationRemarks}
                              onChange={(e) => setEditCertificationRemarks(e.target.value)}
                              placeholder="Remarks"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="ds-label text-[9px] font-bold   uppercase tracking-wider block mb-1">Date</label>
                            <input 
                              type="date" 
                              value={editCertificationDate ? editCertificationDate.split("T")[0] : ""}
                              onChange={(e) => setEditCertificationDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="ds-label text-[9px] font-bold   uppercase tracking-wider block mb-1">Expiry Date</label>
                            <input 
                              type="date" 
                              value={editCertificationExpiryDate ? editCertificationExpiryDate.split("T")[0] : ""}
                              onChange={(e) => setEditCertificationExpiryDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2 space-y-2 mt-2">
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">External System IDs</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="ds-label text-[9px] font-bold uppercase tracking-wider block mb-1">CRM / Siebel ID</label>
                            <input
                              type="text"
                              value={editCrmId}
                              onChange={(e) => setEditCrmId(e.target.value)}
                              placeholder="e.g. CSP_100B210"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="ds-label text-[9px] font-bold uppercase tracking-wider block mb-1">LMS ID <span className="text-slate-400 normal-case">(training)</span></label>
                            <input
                              type="text"
                              value={editLmsId}
                              onChange={(e) => setEditLmsId(e.target.value)}
                              placeholder="Learning Mgmt System id"
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-[10px] font-bold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSaveEdit(emp.employee_id)}
                        className="ds-button-primary text-[10px] font-bold px-3 py-1.5   hover:bg-orange-600 text-white rounded shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // DISPLAY MODE
                  <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 font-black text-xs ${
                            !emp.is_active ? "bg-slate-200 text-slate-400" : "bg-orange-500/10 text-orange-600"
                          }`}>
                            {emp.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 truncate">
                              {emp.full_name}
                            </h3>
                            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">{emp.employee_code}</p>
                          </div>
                        </div>

                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 truncate max-w-[120px] ${roleColor}`}>
                          {emp.role}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3 mt-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Award className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] font-semibold">Grade: <strong className="text-slate-800 font-bold">{emp.employee_grade}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-[11px] font-bold">{emp.mobile}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-3 mt-2 border-t border-slate-100/50">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Basic Salary:
                        </span>
                        {isAdmin ? (
                          <span className="font-extrabold text-slate-900">₹{emp.basic_salary.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">/ MO</span></span>
                        ) : (
                          <span className="font-bold text-slate-400 flex items-center gap-1 text-[11px]">
                            <Lock className="h-3 w-3 text-slate-400" /> ₹•••••• <span className="text-[9px] font-bold text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Admin Only</span>
                          </span>
                        )}
                      </div>

                      {/* CPSC Certification Status */}
                      <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-slate-100/50">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> Certification:
                        </span>
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            emp.certification_level === "Gold" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            emp.certification_level === "Silver" ? "bg-slate-400/10 text-slate-600 border-slate-400/20" :
                            emp.certification_level === "Bronze" ? "bg-amber-600/10 text-amber-800 border-amber-600/20" :
                            "bg-slate-200 text-slate-500 border-slate-200"
                          }`}>
                            {emp.certification_level || "Not Certified"}
                          </span>
                          {emp.certification_date && (
                            <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                              Exp: {new Date(emp.certification_expiry_date || "").toLocaleDateString()}
                            </span>
                          )}
                          {emp.certification_remarks && (
                            <span className="text-[9px] italic text-slate-500 mt-0.5 truncate max-w-[150px]" title={emp.certification_remarks}>
                              "{emp.certification_remarks}"
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Login Account Status Badge — backed by the real /api/users list */}
                      <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-slate-100/50">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Login Account:
                        </span>
                        {accountsByEmployeeId.has(emp.employee_id) ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                            Active: @{accountsByEmployeeId.get(emp.employee_id)}
                          </span>
                        ) : isAdmin ? (
                          <button
                            onClick={() => handleCreateLogin(emp.employee_id)}
                            disabled={creatingLoginFor === emp.employee_id}
                            className="text-[9px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wider cursor-pointer hover:bg-orange-100 disabled:opacity-50"
                          >
                            {creatingLoginFor === emp.employee_id ? "Creating..." : "+ Create Login"}
                          </button>
                        ) : (
                          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider">
                            No Login Account
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <div>
                        {isAdmin && (
                          <button 
                            onClick={() => toggleStatus(emp)}
                            className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                              emp.is_active 
                                ? "text-rose-600 hover:text-rose-800" 
                                : "text-emerald-600 hover:text-emerald-800"
                            }`}
                          >
                            {emp.is_active ? (
                              <>
                                <ToggleRight className="h-4.5 w-4.5 text-rose-500" /> Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4.5 w-4.5 text-slate-400" /> Activate
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => startEdit(emp)}
                              className="text-[9px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button 
                              onClick={() => onDeleteEmployee(emp.employee_id)}
                              className="text-[9px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Purge / Clean Directory Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-rose-800">Clean Employee Directory</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Purge mistakenly imported customer rows</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-semibold space-y-3 leading-relaxed">
              <p>
                Your directory currently includes some customers or job cards that were mistakenly registered as employees during a previous bulk import (raising the count to 211).
              </p>
              <div className="font-bold text-slate-700 bg-slate-50 p-3 border border-slate-200 rounded-lg space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">This action will automatically filter out any employee rows with:</span>
                <span className="block text-[11px] font-medium text-slate-600 pl-2">
                  • Role set to a Job Card number (e.g. starting with "JC-")<br />
                  • Corporate customer or transport company names (e.g., translines, roadlines, logistics)
                </span>
              </div>
              <p className="text-[11px] text-rose-600 font-extrabold uppercase">
                ⚠️ All 7 default real technicians and regular manual registrants will be kept perfectly safe.
              </p>
            </div>

            {purgeResult && (
              <div className={`p-3 rounded-lg text-xs font-bold border ${purgeResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
                {purgeResult.msg}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button 
                type="button" 
                disabled={isPurging}
                onClick={() => { setShowPurgeConfirm(false); setPurgeResult(null); }}
                className="w-1/2 text-center text-xs font-bold py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-all cursor-pointer disabled:opacity-50"
              >
                {purgeResult?.success ? "Close" : "Cancel"}
              </button>
              {!purgeResult?.success && (
                <button 
                  type="button"
                  disabled={isPurging}
                  onClick={handlePurgeMistakes}
                  className="ds-button-danger w-1/2 text-center text-xs font-bold py-2.5   hover:bg-rose-700 text-white rounded shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isPurging ? "Cleaning..." : "Yes, Purge Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingEdit && (
        <EditJustificationModal
          entityLabel={pendingEdit.label}
          onConfirm={async (reason) => { await pendingEdit.run(reason); setPendingEdit(null); }}
          onClose={() => setPendingEdit(null)}
        />
      )}
    </div>
  );
}
