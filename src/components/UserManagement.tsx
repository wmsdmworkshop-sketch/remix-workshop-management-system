import FunnySpinner from "./FunnySpinner";
import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  UserX, 
  Search, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Key,
  Mail,
  Lock,
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  Sparkles,
  Sliders,
  Eye,
  Edit3,
  Bot,
  Zap,
  Database
} from "lucide-react";
import { User } from "../types";
import FunnyLoader from "./FunnyLoader";

interface UserManagementProps {
  currentUser: User | null;
  token: string | null;
}

export default function UserManagement({ currentUser, token }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Tabs and Permissions Matrix State
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions' | 'field-permissions' | 'ai-rbac' | 'live-bugs' | 'profile-approvals'>('permissions');
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Field-level security state
  const [fieldPermissionsList, setFieldPermissionsList] = useState<any[]>([]);
  const [selectedRoleForFields, setSelectedRoleForFields] = useState<string>("reception");
  const [fieldSaveLoading, setFieldSaveLoading] = useState(false);

  // DeepSeek AI RBAC Copilot State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiApplyLoading, setAiApplyLoading] = useState<boolean>(false);

  // Live Testing Bugs & DeepSeek Diagnostics State
  const [liveBugs, setLiveBugs] = useState<any[]>([]);
  // RBAC rules that live in source rather than a table. Served from the actual
  // constants, so what is shown here is always what is being enforced.
  const [rbacPolicy, setRbacPolicy] = useState<any>(null);
  const [bugsLoading, setBugsLoading] = useState<boolean>(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  // Profile update approvals state
  const [approvalRequests, setApprovalRequests] = useState<any[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSetting, setApprovalSetting] = useState<"auto_approve" | "require_approval">("auto_approve");
  const [settingSaveLoading, setSettingSaveLoading] = useState(false);

  const fetchApprovalRequests = async () => {
    setApprovalLoading(true);
    try {
      const res = await fetch("/api/my-profile/pending-requests", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalRequests(data.requests);
      }
    } catch (err) {
      console.error("Error loading approvals:", err);
    } finally {
      setApprovalLoading(false);
    }
  };

  const fetchApprovalSetting = async () => {
    try {
      const res = await fetch("/api/my-profile/settings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalSetting(data.setting_value);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const handleUpdateApprovalSetting = async (val: "auto_approve" | "require_approval") => {
    setSettingSaveLoading(true);
    try {
      const res = await fetch("/api/my-profile/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ setting_value: val })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalSetting(val);
        setSuccess("Approval setting updated successfully.");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to save approval setting.");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Network error: failed to update setting.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSettingSaveLoading(false);
    }
  };

  const handleResolveRequest = async (requestId: number, action: "Approve" | "Reject") => {
    try {
      const res = await fetch(`/api/my-profile/requests/${requestId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        fetchApprovalRequests();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to resolve request.");
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError("Network error: failed to resolve request.");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Only modules that actually gate access (see TAB_MODULE_MAPPING in App.tsx).
  // Bay Queue / Revenue / Ledger / FSB were never wired to enforcement and were removed.
  const MODULES = [
    'Dashboard',
    'Job Cards',
    'Warranty',
    'Query',
    'Billing',
    'DMS Import',
    'User Management',
    'Breakdowns'
  ];

  const ROLES = [
    { key: 'admin', label: 'Admin' },
    { key: 'service_manager', label: 'Service Manager' },
    { key: 'workshop_manager', label: 'Workshop Manager' },
    { key: 'technician', label: 'Technician' },
    { key: 'floor_supervisor', label: 'Floor Supervisor' },
    { key: 'floor_incharge', label: 'Floor Incharge' },
    { key: 'reception', label: 'Receptionist' },
    { key: 'service_advisor', label: 'Service Advisor' },
    { key: 'breakdown', label: 'Breakdown Assistant' },
    { key: 'spares_manager', label: 'Spares Manager' },
    { key: 'billing', label: 'Billing' },
    { key: 'cashier', label: 'Cashier' },
    { key: 'dealer_principal', label: 'Dealer Principal' },
    { key: 'gm_service', label: 'GM Service' },
    { key: 'security_agent', label: 'Security Agent' },
    { key: 'tools_incharge', label: 'Tools Incharge' },
    { key: 'dkam', label: 'DKAM' },
    // Presented as "Superadmin" in the UI; the underlying role value stays
    // 'developer' so all existing permissions/route-guards keep working.
    { key: 'developer', label: 'Superadmin' }
  ];

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const res = await fetch("/api/permissions", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      console.log("/api/permissions", data);
      setPermissionsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch permissions:", e);
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchPermissions();
    } else if (activeTab === 'profile-approvals') {
      fetchApprovalRequests();
      fetchApprovalSetting();
    }
  }, [activeTab]);

  // ---------------------------------------------------------------------------
  // Simplified permission model: 4 access levels + role presets.
  // Backend contract is unchanged (can_view / can_edit / can_comment as 0|1);
  // the UI just maps a single access level onto those three flags.
  // ---------------------------------------------------------------------------
  type AccessLevel = 'none' | 'view' | 'comment' | 'full';

  const LEVELS: Record<AccessLevel, { can_view: number; can_edit: number; can_comment: number }> = {
    none:    { can_view: 0, can_edit: 0, can_comment: 0 },
    view:    { can_view: 1, can_edit: 0, can_comment: 0 },
    comment: { can_view: 1, can_edit: 0, can_comment: 1 },
    full:    { can_view: 1, can_edit: 1, can_comment: 1 },
  };

  const LEVEL_OPTIONS: { value: AccessLevel; label: string }[] = [
    { value: 'none', label: 'No Access' },
    { value: 'view', label: 'View Only' },
    { value: 'comment', label: 'View + Comment' },
    { value: 'full', label: 'Full (Edit)' },
  ];

  // Modules that are administrative/sensitive — presets treat them more cautiously.
  const SENSITIVE_MODULES = ['User Management', 'DMS Import'];

  type PresetKey = 'none' | 'readonly' | 'operator' | 'manager' | 'admin';
  const PRESET_OPTIONS: { value: PresetKey; label: string; hint: string }[] = [
    { value: 'none', label: 'No Access', hint: 'Blocked from every module' },
    { value: 'readonly', label: 'Read-only', hint: 'View everything, change nothing' },
    { value: 'operator', label: 'Operator', hint: 'Full on daily work, no admin modules' },
    { value: 'manager', label: 'Manager', hint: 'Full access, view-only on User Management' },
    { value: 'admin', label: 'Admin', hint: 'Full control of everything' },
  ];

  const presetLevelFor = (preset: PresetKey, moduleName: string): AccessLevel => {
    switch (preset) {
      case 'none': return 'none';
      case 'readonly': return 'view';
      case 'operator': return SENSITIVE_MODULES.includes(moduleName) ? 'none' : 'full';
      case 'manager': return moduleName === 'User Management' ? 'view' : 'full';
      case 'admin': return 'full';
      default: return 'none';
    }
  };

  const getPerm = (moduleName: string, roleKey: string) =>
    permissionsList.find(p => p.module_name === moduleName && p.role_name === roleKey) ||
    { can_view: 0, can_edit: 0, can_comment: 0 };

  const permToLevel = (perm: any): AccessLevel => {
    const on = (v: any) => v === 1 || v === true;
    if (on(perm.can_edit)) return 'full';
    if (on(perm.can_comment)) return 'comment';
    if (on(perm.can_view)) return 'view';
    return 'none';
  };

  // Which preset (if any) exactly describes this role's current permissions.
  const detectPreset = (roleKey: string): PresetKey | 'custom' => {
    const presets: PresetKey[] = ['none', 'readonly', 'operator', 'manager', 'admin'];
    for (const pk of presets) {
      if (MODULES.every(m => permToLevel(getPerm(m, roleKey)) === presetLevelFor(pk, m))) return pk;
    }
    return 'custom';
  };

  const setModuleLevel = (moduleName: string, roleKey: string, level: AccessLevel) => {
    const p = LEVELS[level];
    setPermissionsList(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(x => x.module_name === moduleName && x.role_name === roleKey);
      if (idx !== -1) copy[idx] = { ...copy[idx], ...p };
      else copy.push({ module_name: moduleName, role_name: roleKey, ...p });
      return copy;
    });
  };

  const applyPreset = (roleKey: string, preset: PresetKey) => {
    setPermissionsList(prev => {
      const copy = [...prev];
      MODULES.forEach(m => {
        const p = LEVELS[presetLevelFor(preset, m)];
        const idx = copy.findIndex(x => x.module_name === m && x.role_name === roleKey);
        if (idx !== -1) copy[idx] = { ...copy[idx], ...p };
        else copy.push({ module_name: m, role_name: roleKey, ...p });
      });
      return copy;
    });
  };

  const handleSavePermissions = async () => {
    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: permissionsList })
      });
      if (res.ok) {
        setSuccess("Permission Matrix updated successfully!");
        fetchPermissions();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update Permission Matrix.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Roles list from DB
  const [dbRoles, setDbRoles] = useState<{ role_id: number; role_name: string; permission_level: string }[]>([]);
  
  // Add Role Form State
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newPermissionLevel, setNewPermissionLevel] = useState("limited");
  const [roleAddLoading, setRoleAddLoading] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDbRoles(data);
      }
    } catch (e) {
      console.error("Failed to fetch roles:", e);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const allRoles = useMemo(() => {
    const list = [...ROLES];
    dbRoles.forEach(r => {
      const key = r.role_name;
      if (!list.some(item => item.key === key)) {
        list.push({
          key,
          label: r.role_name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        });
      }
    });
    return list;
  }, [dbRoles]);

  // Employee Directory state for Single Source of Truth linking
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [empSearch, setEmpSearch] = useState("");

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load employees for UserManagement:", e);
    }
  };

  // Add User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<User["role"]>("reception");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<User["role"]>("reception");
  const [editEmployeeId, setEditEmployeeId] = useState<string>("");
  const [editPassword, setEditPassword] = useState("");
  const [editMobileNo, setEditMobileNo] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users directory.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
      fetchEmployees();
    }
  }, [token]);

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmp(emp);
    setEmployeeId(String(emp.employee_id));
    setFullName(emp.full_name);
    setMobileNo(emp.mobile || "");
    setEmail(emp.email || "");

    // Suggested sanitized username
    if (!username) {
      if (emp.email && emp.email.includes("@")) {
        setUsername(emp.email.split("@")[0].toLowerCase().replace(/[^a-z0-9._]/g, ""));
      } else {
        setUsername(emp.full_name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._]/g, ""));
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employeeId || Number(employeeId) <= 0) {
      setError("Please select an employee from the Employee Directory. Arbitrary user creation is prohibited.");
      return;
    }

    if (!username || !password || !role) {
      setError("Please fill in all required fields.");
      return;
    }

    if (selectedEmp && selectedEmp.has_login_account) {
      setError(`Employee '${selectedEmp.full_name}' already has a linked active user account (@${selectedEmp.linked_username}). Duplicate accounts for the same employee are not permitted.`);
      return;
    }

    setAddLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName.trim() || (selectedEmp ? selectedEmp.full_name : ""),
          username: username.trim().toLowerCase(),
          password,
          role,
          employee_id: Number(employeeId),
          mobile_no: mobileNo.trim() || undefined,
          email: email.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user.");
      }

      const createdUser: User = data.user || {
        user_id: data.user_id || Date.now(),
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        role: role,
        employee_id: employeeId ? Number(employeeId) : null,
        is_active: 1,
        created_at: new Date().toISOString(),
        mobile_no: mobileNo.trim() || undefined,
        email: email.trim() || undefined
      };

      setSuccess(`User "${fullName}" (${username.trim().toLowerCase()}) created successfully with Auto-RBAC privileges!`);
      setShowAddForm(false);
      
      // Instantly prepend new user to top of state list so it displays at Row #1
      setUsers(prev => [createdUser, ...prev.filter(u => u.username !== createdUser.username)]);

      // Reset form
      setFullName("");
      setUsername("");
      setPassword("");
      setRole("reception");
      setEmployeeId("");
      setMobileNo("");
      setEmail("");
      
      // Refresh list from server to sync backend state
      await fetchUsers();
      if (activeTab === 'permissions') {
        fetchPermissions();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setRoleAddLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          role_name: newRoleName.trim(),
          permission_level: newPermissionLevel
        })
      });
      if (res.ok) {
        setSuccess(`Role "${newRoleName}" added successfully!`);
        setNewRoleName("");
        setShowAddRoleModal(false);
        fetchRoles();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save new role.");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setRoleAddLoading(false);
    }
  };

  const handleUpdateUser = async (userId: number) => {
    setError(null);
    setSuccess(null);
    setEditLoading(true);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: editFullName.trim(),
          username: editUsername.trim().toLowerCase(),
          role: editRole,
          employee_id: editEmployeeId ? Number(editEmployeeId) : null,
          password: editPassword ? editPassword : undefined,
          mobile_no: editMobileNo.trim() || undefined,
          email: editEmail.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user.");
      }

      setSuccess("User updated successfully!");
      setEditingUserId(null);
      setEditPassword("");
      setEditMobileNo("");
      setEditEmail("");
      setEditUsername("");
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update user.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    setError(null);
    setSuccess(null);
    const newActiveState = !user.is_active;

    try {
      const response = await fetch(`/api/users/${user.user_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          is_active: newActiveState
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to toggle user state.");
      }

      setSuccess(`User "${user.full_name}" has been ${newActiveState ? "activated" : "deactivated"}.`);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to toggle user status.");
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.user_id);
    setEditFullName(user.full_name);
    setEditUsername(user.username || "");
    setEditRole(user.role);
    setEditEmployeeId(user.employee_id ? String(user.employee_id) : "");
    setEditPassword("");
    setEditMobileNo(user.mobile_no || "");
    setEditEmail(user.email || "");
  };

  const filteredUsers = useMemo(() => {
    const list = users.filter(user => {
      const matchesSearch = 
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === "All" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    // Always sort newest created user first (user_id DESC)
    return list.sort((a, b) => Number(b.user_id || 0) - Number(a.user_id || 0));
  }, [users, searchTerm, roleFilter]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "developer":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "admin":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "service_manager":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "supervisor":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "accounts":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "service_advisor":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "reception":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "gate_personnel":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "technician":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatRoleName = (role: string) => {
    return role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="ds-button-primary absolute top-0 right-0 w-64 h-64  /10 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="ds-button-primary p-2.5  /20 text-orange-400 rounded-xl border border-orange-500/30">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">System User Directory</h1>
                <p className="text-xs text-slate-400">Manage credentials, permissions and operator authorization roles</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
              <button
                onClick={() => setShowAddRoleModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
              >
                <Shield className="h-4 w-4" />
                <span>Add New Role</span>
              </button>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="ds-button-primary flex items-center gap-2 px-4 py-2.5   hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/15 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>{showAddForm ? "Cancel Form" : "Create Operator Account"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
        <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            User Directory
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Screen & Module Access (RBAC)
          </button>
          <button
            onClick={() => setActiveTab('field-permissions')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'field-permissions'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-blue-600" />
            <span>Field-Level Security</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('policy');
              if (!rbacPolicy) {
                fetch("/api/rbac/policy", { headers: { Authorization: `Bearer ${token}` } })
                  .then(r => r.json())
                  .then(d => { if (d.success) setRbacPolicy(d); else setError(d.error || "Could not load the policy."); })
                  .catch(e => setError(e.message));
              }
            }}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'policy'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>Policy (Read-Only)</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-rbac')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ai-rbac'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span>DeepSeek Security Copilot</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('live-bugs');
              setBugsLoading(true);
              fetch("/api/v1/pilot/live-bugs", {
                headers: { "Authorization": `Bearer ${token}` }
              })
                .then(r => r.json())
                .then(d => { if (d.success) setLiveBugs(d.bugs || []); })
                .catch(err => console.error("Error loading bugs:", err))
                .finally(() => setBugsLoading(false));
            }}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'live-bugs'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-red-500" />
            <span>Live UAT Bugs & Screenshots</span>
          </button>
          <button
            onClick={() => setActiveTab('profile-approvals')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition whitespace-nowrap ${
              activeTab === 'profile-approvals'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Profile Approvals
          </button>
        </div>
      )}

      {/* Success/Error Alerts */}
      {error && (
        <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs animate-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="ds-button-success rounded-xl  /10 p-4 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs animate-in slide-in-from-top-2 duration-200">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add User Section — Authoritative Employee Directory Linking */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-150 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-orange-500" />
              <span>Create User from Employee Directory</span>
            </h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Single Source of Truth
            </span>
          </div>

          {/* 1. Employee Directory Selection */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Step 1: Select Employee from Directory *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Search by employee name or code..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
              <div>
                <select
                  value={employeeId}
                  onChange={(e) => {
                    const emp = employees.find(em => String(em.employee_id) === e.target.value);
                    if (emp) handleSelectEmployee(emp);
                    else {
                      setSelectedEmp(null);
                      setEmployeeId("");
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">-- Choose Employee ({employees.length} available) --</option>
                  {employees
                    .filter(e => {
                      if (!empSearch.trim()) return true;
                      const q = empSearch.toLowerCase();
                      return (
                        e.full_name?.toLowerCase().includes(q) ||
                        e.employee_code?.toLowerCase().includes(q) ||
                        e.role?.toLowerCase().includes(q)
                      );
                    })
                    .map(e => (
                      <option key={e.employee_id} value={e.employee_id}>
                        {e.employee_code || `EMP${e.employee_id}`} — {e.full_name} ({e.role || "Staff"}) {e.has_login_account ? `[Linked: @${e.linked_username}]` : "[No Account]"}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Selected Employee Preview Card */}
            {selectedEmp && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-sm flex items-center justify-center">
                      {selectedEmp.full_name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">{selectedEmp.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Code: {selectedEmp.employee_code || `EMP${selectedEmp.employee_id}`} | ID: #{selectedEmp.employee_id}
                      </p>
                    </div>
                  </div>
                  <div>
                    {selectedEmp.has_login_account ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                        Linked: @{selectedEmp.linked_username}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                        Eligible for Account
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] pt-2 border-t border-slate-100 font-medium text-slate-600">
                  <div><span className="font-bold text-slate-400 uppercase text-[9px] block">Role / Designation</span>{selectedEmp.designation || selectedEmp.role || "Staff"}</div>
                  <div><span className="font-bold text-slate-400 uppercase text-[9px] block">Department</span>{selectedEmp.department || "Operations"}</div>
                  <div><span className="font-bold text-slate-400 uppercase text-[9px] block">Mobile</span>{selectedEmp.mobile || "—"}</div>
                  <div><span className="font-bold text-slate-400 uppercase text-[9px] block">Status</span>{selectedEmp.is_active ? "Active Duty" : "Inactive"}</div>
                </div>

                {selectedEmp.has_login_account && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>This employee already has an active login account (@{selectedEmp.linked_username}). Duplicate user accounts for the same employee are prohibited.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Login Account Credentials */}
          <form onSubmit={handleAddUser} className="space-y-4">
            <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
              Step 2: Define Login Credentials & Role
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="ds-label block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Full Name (from Employee)
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Auto-filled from Employee"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="ds-label block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Username (Lower case) *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. shashi.patil"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono font-semibold"
                />
              </div>

              <div>
                <label className="ds-label block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="ds-label block text-[10px] font-bold uppercase tracking-wider mb-1">
                  System Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-semibold text-slate-800"
                >
                  {allRoles.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Mobile Number (for OTP/SMS)
                </label>
                <input
                  type="text"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>

              <div>
                <label className="ds-label block text-[10px] font-bold uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. employee@workshop.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedEmp(null);
                  setEmployeeId("");
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading || !selectedEmp || selectedEmp.has_login_account}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {addLoading ? (
                  <FunnySpinner className="h-4 w-4" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create & Link User Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory & Filter Controls */}
      {activeTab === 'directory' && (
        <div className="bg-zinc-950/90 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl backdrop-blur-md">

          {/* Account creation now lives in Employee Directory, so accounts and
              employee records stay one identity in one place. This tab remains
              for viewing/editing existing accounts and role assignment. */}
          <div className="p-3 bg-orange-500/10 border-b border-orange-500/20 text-orange-300 text-xs flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span>Creating new login accounts has moved to <strong>Employee Directory</strong> — open an employee's record there and use "Create Login". This tab is for managing existing accounts.</span>
          </div>

          {/* Controls Panel */}
          <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search user, name, full name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">Filter:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full md:w-44 px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-semibold text-zinc-100"
              >
                <option value="All">All Roles</option>
                {allRoles.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory List Table */}
          {loading ? (
            <FunnyLoader message="Loading system users..." />
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <p className="text-xs font-medium">No users found matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table w-full text-left border-collapse block md:table">
                <thead className="ds-th hidden md:table-header-group">
                  <tr className="border-b border-zinc-800 bg-zinc-900/90">
                    <th className="ds-th p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User Details</th>
                    <th className="ds-th p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">System Authorization</th>
                    <th className="ds-th p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Linked Employee</th>
                    <th className="ds-th p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Last Activity</th>
                    <th className="ds-th p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="ds-th p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 block md:table-row-group">
                  {filteredUsers.map((user) => {
                    const isEditing = editingUserId === user.user_id;

                    return (
                      <tr key={user.user_id} className="ds-table-row block md:table-row hover:bg-zinc-900/60 transition-colors p-4 md:p-0 border-b border-zinc-800/80 md:border-0 space-y-3 md:space-y-0">
                        {/* Name Details */}
                        <td className="ds-td block md:table-cell p-0 md:p-4">
                          <span className="block md:hidden text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">User Details</span>
                          {isEditing ? (
                            <div className="space-y-2">
                               <div>
                                 <label className="text-[9px] font-bold text-orange-400 uppercase tracking-wider block mb-0.5">Full Name</label>
                                 <input
                                   type="text"
                                   value={editFullName}
                                   onChange={(e) => setEditFullName(e.target.value)}
                                   className="px-2.5 py-1.5 bg-black border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full"
                                   placeholder="Full Name"
                                 />
                               </div>
                               <div>
                                 <label className="text-[9px] font-bold text-orange-400 uppercase tracking-wider block mb-0.5">Username / Login Handle</label>
                                 <input
                                   type="text"
                                   value={editUsername}
                                   onChange={(e) => setEditUsername(e.target.value)}
                                   className="px-2.5 py-1.5 bg-black border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full"
                                   placeholder="Username (Login Handle)"
                                 />
                               </div>
                               <div>
                                 <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Mobile Number</label>
                                 <input
                                   type="text"
                                   value={editMobileNo}
                                   onChange={(e) => setEditMobileNo(e.target.value)}
                                   className="px-2.5 py-1.5 bg-black border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full"
                                   placeholder="Mobile Number"
                                 />
                               </div>
                               <div>
                                 <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">Email Address</label>
                                 <input
                                   type="email"
                                   value={editEmail}
                                   onChange={(e) => setEditEmail(e.target.value)}
                                   className="px-2.5 py-1.5 bg-black border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full"
                                   placeholder="Email Address"
                                 />
                               </div>
                               <div>
                                 <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">New Password</label>
                                 <input
                                   type="password"
                                   value={editPassword}
                                   onChange={(e) => setEditPassword(e.target.value)}
                                   className="px-2.5 py-1.5 bg-black border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full"
                                   placeholder="New Password (blank to keep)"
                                 />
                               </div>
                             </div>
                          ) : (
                            <div>
                              <h3 className="font-bold text-zinc-100 text-xs flex items-center gap-1.5">
                                {user.full_name}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">👤 {user.username}</p>
                              {user.mobile_no && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">📞 {user.mobile_no}</p>
                              )}
                              {user.email && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">✉️ {user.email}</p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Role Badge */}
                        <td className="ds-td block md:table-cell p-0 md:p-4">
                          <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">System Authorization</span>
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full"
                            >
                              {allRoles.map((r) => (
                                <option key={r.key} value={r.key}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                              {formatRoleName(user.role)}
                            </span>
                          )}
                        </td>

                        {/* Linked Employee */}
                        <td className="ds-td block md:table-cell p-0 md:p-4">
                          <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Linked Employee</span>
                          {isEditing ? (
                            <select
                              value={editEmployeeId}
                              onChange={(e) => setEditEmployeeId(e.target.value)}
                              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block w-full max-w-[200px]"
                            >
                              <option value="">-- No Employee Linked --</option>
                              {employees.map((emp) => (
                                <option key={emp.employee_id} value={emp.employee_id}>
                                  {emp.employee_code || `EMP${emp.employee_id}`} - {emp.full_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            (() => {
                              const linkedEmp = employees.find(e => Number(e.employee_id) === Number(user.employee_id));
                              if (linkedEmp) {
                                return (
                                  <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-200 block">
                                      {linkedEmp.full_name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {linkedEmp.employee_code || `EMP${linkedEmp.employee_id}`}
                                    </span>
                                  </div>
                                );
                              }
                              if (user.employee_id) {
                                return <span className="text-xs text-slate-400 font-mono">#{user.employee_id}</span>;
                              }
                              return (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/40 uppercase tracking-wider">
                                  Unlinked
                                </span>
                              );
                            })()
                          )}
                        </td>

                        {/* Last Activity */}
                        <td className="ds-td block md:table-cell p-0 md:p-4 text-xs text-slate-500 font-mono">
                          <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Activity</span>
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleString()
                            : "Never logged in"
                          }
                        </td>

                        {/* Toggle state */}
                        <td className="ds-td block md:table-cell p-0 md:p-4">
                          <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={currentUser?.user_id === user.user_id}
                            className="focus:outline-none transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title={currentUser?.user_id === user.user_id ? "Cannot deactivate yourself" : "Toggle active status"}
                          >
                            {user.is_active ? (
                              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                <ToggleRight className="h-6 w-6 text-emerald-500" />
                                <span>Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-400 font-medium text-xs">
                                <ToggleLeft className="h-6 w-6 text-slate-300" />
                                <span>Inactive</span>
                              </div>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="ds-td block md:table-cell p-0 md:p-4 text-left md:text-right">
                          <span className="block md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Actions</span>
                          {isEditing ? (
                            <div className="flex justify-start md:justify-end gap-2">
                              <button
                                onClick={() => handleUpdateUser(user.user_id)}
                                disabled={editLoading}
                                className="ds-button-success ds-button-success px-2 py-1.5   hover:  text-white rounded font-bold text-[10px] uppercase shadow cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] uppercase cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded font-bold text-[10px] text-slate-600 uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Edit Profile
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-zinc-950/90 rounded-2xl border border-zinc-800 shadow-2xl p-6 space-y-6 backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Role Access Control</h2>
              <p className="text-xs text-zinc-400 mt-1">Pick an access preset per role, then expand to fine-tune individual modules if needed.</p>
            </div>
            <button
              onClick={handleSavePermissions}
              disabled={saveLoading}
              className="ds-button-primary px-6 py-2.5 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-orange-950/40 cursor-pointer"
            >
              {saveLoading ? "Saving Changes..." : "Save Permission Matrix"}
            </button>
          </div>

          {permissionsLoading ? (
            <FunnyLoader message="Loading role access..." />
          ) : (
            <div className="space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-zinc-500 border border-zinc-800/70 rounded-lg px-3 py-2">
                <span className="font-bold text-zinc-400 uppercase tracking-wider">Access levels:</span>
                <span><span className="text-zinc-300 font-semibold">No Access</span> — hidden</span>
                <span><span className="text-zinc-300 font-semibold">View Only</span> — read</span>
                <span><span className="text-zinc-300 font-semibold">View + Comment</span> — read &amp; note</span>
                <span><span className="text-zinc-300 font-semibold">Full (Edit)</span> — read, edit &amp; comment</span>
              </div>

              <div className="border border-zinc-800 rounded-xl divide-y divide-zinc-800/80 overflow-hidden max-h-[62vh] overflow-y-auto">
                {ROLES.map((role) => {
                  const preset = detectPreset(role.key);
                  const isOpen = expandedRole === role.key;
                  const grantedCount = MODULES.filter(m => permToLevel(getPerm(m, role.key)) !== 'none').length;

                  return (
                    <div key={role.key} className="bg-zinc-950/60">
                      {/* Role header row */}
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-zinc-900/50 transition">
                        <div className="min-w-[160px] flex-1">
                          <div className="text-sm font-bold text-zinc-100">{role.label}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {grantedCount} of {MODULES.length} modules accessible
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Preset</span>
                          <select
                            value={preset}
                            onChange={(e) => applyPreset(role.key, e.target.value as PresetKey)}
                            className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-semibold px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-orange-500 cursor-pointer"
                          >
                            {preset === 'custom' && <option value="custom">Custom</option>}
                            {PRESET_OPTIONS.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => setExpandedRole(isOpen ? null : role.key)}
                          className="text-[11px] font-bold text-orange-400 hover:text-orange-300 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-orange-500/40 transition"
                        >
                          {isOpen ? 'Hide modules' : 'Customize'}
                        </button>
                      </div>

                      {/* Per-module override grid */}
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 bg-black/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {MODULES.map((moduleName) => {
                            const level = permToLevel(getPerm(moduleName, role.key));
                            return (
                              <div key={moduleName} className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800/70 rounded-lg px-3 py-2">
                                <span className="text-[11px] font-semibold text-zinc-300 truncate">{moduleName}</span>
                                <select
                                  value={level}
                                  onChange={(e) => setModuleLevel(moduleName, role.key, e.target.value as AccessLevel)}
                                  className={`shrink-0 rounded-md text-[11px] font-semibold px-2 py-1 focus:outline-none cursor-pointer border ${
                                    level === 'none'
                                      ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                      : 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                                  }`}
                                >
                                  {LEVEL_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'field-permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="h-4 w-4 text-blue-600" />
                <span>Field-Level Access Control Matrix (FLS)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Configure exactly which fields each role can view, edit, or are locked down. Stored permanently in MySQL.</p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Select Role:</span>
              <select
                value={selectedRoleForFields}
                onChange={(e) => setSelectedRoleForFields(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold px-3 py-1.5 text-slate-800 focus:outline-none"
              >
                {ROLES.map(r => (
                  <option key={r.key} value={r.key}>{r.label} ({r.key})</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  setFieldSaveLoading(true);
                  try {
                    const res = await fetch("/api/rbac/field-permissions", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                      },
                      body: JSON.stringify({ fieldPermissions: fieldPermissionsList })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setSuccess("Field permissions saved permanently to MySQL database.");
                      setTimeout(() => setSuccess(null), 3000);
                    } else {
                      setError(data.error || "Failed to save field permissions.");
                    }
                  } catch (e: any) {
                    setError(e.message || "Network error saving field permissions.");
                  } finally {
                    setFieldSaveLoading(false);
                  }
                }}
                disabled={fieldSaveLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {fieldSaveLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                <span>Save to MySQL</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="ds-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="ds-th pb-3 pr-4">Field Name</th>
                  <th className="ds-th pb-3 pr-4">Description</th>
                  <th className="ds-th pb-3 pr-4">Workflow Stage</th>
                  <th className="ds-th pb-3 text-right">Access Permission Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {[
                  { key: "service_advisor", label: "Service Advisor Assignment", desc: "Allows assigning/changing the Service Advisor on Job Cards" },
                  { key: "technician_name", label: "Technician & Laborers Allocation", desc: "Allows assigning technicians or specialist laborers" },
                  { key: "bay_no", label: "Bay Allocation", desc: "Controls bay mapping and bay movement" },
                  { key: "odometer", label: "Odometer (KM Reading)", desc: "Controls odometer entry and verification" },
                  { key: "customer_name", label: "Customer Name", desc: "Customer identity and billing name" },
                  { key: "customer_mobile", label: "Customer Mobile", desc: "Customer contact number" },
                  { key: "vehicle_model", label: "Vehicle Model / Chassis", desc: "Vehicle model designation" },
                  { key: "priority", label: "Service Priority", desc: "Normal vs Express urgent service tagging" },
                  { key: "labour_amount", label: "Labour Cost & Rates", desc: "Labour charges estimation and billing" },
                  { key: "parts_amount", label: "Parts Amount", desc: "Parts requisitions and cost calculations" },
                  { key: "discount", label: "Discount & Financial Waiver", desc: "Commercial discounts and financial overrides" },
                  { key: "job_description", label: "Customer Voice & Complaints", desc: "Detailed complaint logs and service requests" },
                  { key: "pending_reason", label: "Pending Delay Reason", desc: "Stoppage, parts delay or approval bottleneck notes" },
                  { key: "remarks", label: "Supervisor Remarks", desc: "Floor notes and handover instructions" },
                  { key: "date_completed", label: "Completion Date & Signoff", desc: "Job card closing and final QC timestamp" },
                ].map((field) => {
                  const existing = fieldPermissionsList.find(
                    (fp) => fp.role === selectedRoleForFields && fp.field_name === field.key
                  );
                  const currentLevel = existing?.permission_level || (
                    selectedRoleForFields === "admin" || selectedRoleForFields === "developer" ? "OVERRIDE" :
                    selectedRoleForFields === "reception" && ["service_advisor", "technician_name", "bay_no", "discount", "labour_amount", "parts_amount"].includes(field.key) ? "LOCKED" :
                    "EDIT"
                  );

                  return (
                    <tr key={field.key} className="ds-table-row hover:bg-slate-50/50">
                      <td className="ds-td py-3.5 pr-4">
                        <div className="font-bold text-slate-800">{field.label}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{field.key}</div>
                      </td>
                      <td className="ds-td py-3.5 pr-4 text-slate-500 text-xs">{field.desc}</td>
                      <td className="ds-td py-3.5 pr-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">ANY STAGE</span>
                      </td>
                      <td className="ds-td py-3.5 text-right">
                        <select
                          value={currentLevel}
                          onChange={(e) => {
                            const newLevel = e.target.value;
                            setFieldPermissionsList((prev) => {
                              const filtered = prev.filter(
                                (fp) => !(fp.role === selectedRoleForFields && fp.field_name === field.key)
                              );
                              return [...filtered, {
                                role: selectedRoleForFields,
                                workflow_stage: "ANY",
                                field_name: field.key,
                                permission_level: newLevel
                              }];
                            });
                          }}
                          className={`rounded-lg text-xs font-bold px-3 py-1.5 border focus:outline-none cursor-pointer ${
                            currentLevel === "EDIT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            currentLevel === "VIEW_ONLY" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            currentLevel === "HIDDEN" ? "bg-slate-100 text-slate-500 border-slate-200" :
                            currentLevel === "LOCKED" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          <option value="EDIT">✏️ EDIT (Editable)</option>
                          <option value="VIEW_ONLY">👁️ VIEW ONLY (Read-Only)</option>
                          <option value="LOCKED">🔒 LOCKED (Non-Editable)</option>
                          <option value="HIDDEN">🚫 HIDDEN (Invisible)</option>
                          <option value="OVERRIDE">⚡ OVERRIDE (Superuser)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'policy' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" /> Enforced Policy — Read Only
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              {rbacPolicy?.note || "These rules are defined in source and enforced server-side."}
              {" "}They are shown here so the full access picture is visible in one place.
              Unlike the tabs above, they cannot be edited from this screen.
            </p>
          </div>

          {!rbacPolicy ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading policy…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {rbacPolicy.groups?.map((g: any) => (
                  <div key={g.key} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{g.title}</h4>
                      <code className="text-[10px] text-slate-400 font-mono">{g.source}</code>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {g.roles?.length ? g.roles.map((r: string) => (
                        <span key={r} className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                          {r}
                        </span>
                      )) : <span className="text-[11px] text-slate-400 italic">No roles.</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Stage Ownership
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-3">
                  A job card sitting in one of these stages is treated as that role&apos;s
                  responsibility even when nobody has assigned it.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-4 font-bold">Role</th>
                        <th className="py-2 pr-4 font-bold">Workflow stages</th>
                        <th className="py-2 pr-4 font-bold">Status fallback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rbacPolicy.stageOwnership?.map((s: any) => (
                        <tr key={s.role} className="border-b border-slate-100 align-top">
                          <td className="py-2 pr-4 text-xs font-mono font-bold text-slate-800 whitespace-nowrap">{s.role}</td>
                          <td className="py-2 pr-4 text-[11px] text-slate-600 font-mono">
                            {s.states?.join(", ") || "—"}
                            {s.flag && <div className="text-[10px] text-indigo-600 mt-0.5">flag: {s.flag}</div>}
                          </td>
                          <td className="py-2 pr-4 text-[11px] text-slate-500">{s.statuses?.join(", ") || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Field Permission Levels</h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-2.5">
                  The only values Field-Level Security accepts. Anything else is refused on save.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rbacPolicy.fieldLevels?.map((l: string) => (
                    <span key={l} className="text-[11px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">{l}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'ai-rbac' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>DeepSeek AI Security & Access Copilot</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Describe desired security policies or user access rules in plain English. DeepSeek will configure module and field permissions automatically.
              </p>
            </div>
            <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full text-[10px] font-bold">
              Powered by DeepSeek-V4
            </span>
          </div>

          {/* Prompt input */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Instruction Prompt for DeepSeek AI
            </label>
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Lock receptionist Afroz to only see Gate Entry and Reception Intake. Make all post-intake fields (bay allocation, technician, advisor) completely read-only and locked for reception."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 self-center">Quick Templates:</span>
              {[
                "Lock Receptionist Afroz to only view Gate Entry and Reception Intake, and lock all bay/technician fields",
                "Allow Floor Incharge to assign Service Advisors, allocate Bays, and manage Technicians",
                "Make Odometer, Customer Mobile, and Discount locked for Service Advisors once Job is Active",
                "Strictly restrict Cashier to Invoicing and Billing with read-only access to Job Cards"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(chip)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition"
                >
                  {chip.slice(0, 50)}...
                </button>
              ))}
            </div>

            <button
              onClick={async () => {
                if (!aiPrompt.trim()) return;
                setAiLoading(true);
                setAiResult(null);
                try {
                  const res = await fetch("/api/rbac/ai-assist", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ prompt: aiPrompt })
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    setAiResult(data);
                  } else {
                    setError(data.error || "DeepSeek failed to generate security policy.");
                  }
                } catch (e: any) {
                  setError(e.message || "Network error communicating with DeepSeek.");
                } finally {
                  setAiLoading(false);
                }
              }}
              disabled={aiLoading || !aiPrompt.trim()}
              className="ds-button-primary bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              <span>{aiLoading ? "DeepSeek is Reasoning..." : "Generate Security Policy with DeepSeek"}</span>
            </button>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Zap className="h-4 w-4" />
                  <span>DeepSeek Security Policy Plan Generated</span>
                </div>
                <span className="text-[10px] text-slate-400">{aiResult.modelUsed || "DeepSeek"}</span>
              </div>

              <div className="text-xs text-slate-300 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50">
                <span className="font-bold text-orange-400 block mb-1">Architect Rationale:</span>
                {aiResult.explanation}
              </div>

              {/* Proposed Role Permissions */}
              {aiResult.rolePermissions && aiResult.rolePermissions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Module Permissions to Apply:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {aiResult.rolePermissions.map((rp: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px]">
                        <span className="font-bold text-white uppercase">{rp.role_name}</span>
                        <div className="text-slate-400 mt-0.5">{rp.module_name}</div>
                        <div className="mt-1 flex gap-2 font-mono text-[10px]">
                          <span className={rp.can_view ? "text-emerald-400" : "text-red-400"}>View: {rp.can_view ? "YES" : "NO"}</span>
                          <span className={rp.can_edit ? "text-emerald-400" : "text-red-400"}>Edit: {rp.can_edit ? "YES" : "NO"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Field Permissions */}
              {aiResult.fieldPermissions && aiResult.fieldPermissions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Field-Level Rules to Apply:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {aiResult.fieldPermissions.map((fp: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px]">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white uppercase">{fp.role}</span>
                          <span className="bg-orange-500/20 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded">{fp.permission_level}</span>
                        </div>
                        <div className="text-slate-400 font-mono text-[10px] mt-1">{fp.field_name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={async () => {
                    setAiApplyLoading(true);
                    try {
                      // 1. Apply module permissions if present
                      if (aiResult.rolePermissions && aiResult.rolePermissions.length > 0) {
                        await fetch("/api/permissions", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({ permissions: aiResult.rolePermissions })
                        });
                      }
                      // 2. Apply field permissions if present
                      if (aiResult.fieldPermissions && aiResult.fieldPermissions.length > 0) {
                        await fetch("/api/rbac/field-permissions", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({ fieldPermissions: aiResult.fieldPermissions })
                        });
                      }
                      setSuccess("DeepSeek security policy applied permanently to MySQL database!");
                      setTimeout(() => setSuccess(null), 4000);
                    } catch (e: any) {
                      setError(e.message || "Failed to apply AI policy.");
                    } finally {
                      setAiApplyLoading(false);
                    }
                  }}
                  disabled={aiApplyLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {aiApplyLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  <span>{aiApplyLoading ? "Saving to Database..." : "Apply Policy Permanently to Database"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'live-bugs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                <span>Live UAT Bug Reports, User Feedback & DeepSeek Triage</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time feedback captured from testing users with device metadata, user screenshots, and automated DeepSeek root-cause triage.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                {liveBugs.length} Total Reports
              </span>
              <button
                onClick={() => {
                  setBugsLoading(true);
                  fetch("/api/v1/pilot/live-bugs", {
                    headers: { "Authorization": `Bearer ${token}` }
                  })
                    .then(r => r.json())
                    .then(d => { if (d.success) setLiveBugs(d.bugs || []); })
                    .catch(err => console.error("Error loading bugs:", err))
                    .finally(() => setBugsLoading(false));
                }}
                disabled={bugsLoading}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${bugsLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              {/* One cumulative prompt for everything that needs a code fix,
                  rather than copying each bug's prompt separately. */}
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/v1/pilot/feedback/ide-prompt", {
                      headers: { "Authorization": `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                      setError(data.error || "Could not build the IDE prompt.");
                      return;
                    }
                    await navigator.clipboard.writeText(data.prompt);
                    setSuccess(`Copied one cumulative IDE prompt covering ${data.count} report(s).`);
                    setTimeout(() => setSuccess(null), 4000);
                  } catch (e: any) {
                    setError(e.message);
                  }
                }}
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Copy Cumulative IDE Prompt</span>
              </button>
            </div>
          </div>

          {bugsLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : liveBugs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
              No live testing bugs reported yet. Users can report bugs from any screen using the bottom-right Feedback button.
            </div>
          ) : (
            <div className="space-y-4">
              {liveBugs.map((bug: any) => (
                <div key={bug.feedback_id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-slate-300 transition">
                  <div className="flex justify-between items-start flex-wrap gap-2 border-b border-slate-200/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{bug.employee_name || `Employee #${bug.employee_id}`}</span>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">{bug.role}</span>
                        <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{bug.screen_id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        📅 {new Date(bug.created_at).toLocaleString()} • Type: <span className="font-bold text-slate-600">{bug.feedback_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                        bug.ai_severity === "CRITICAL" ? "bg-red-100 text-red-700 border border-red-200" :
                        bug.ai_severity === "HIGH" ? "bg-orange-100 text-orange-700 border border-orange-200" :
                        bug.ai_severity === "MEDIUM" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}>
                        {bug.ai_severity || "MEDIUM"}
                      </span>
                    </div>
                  </div>

                  {/* User Message */}
                  <div className="text-xs text-slate-700 font-medium bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">User Description:</span>
                    {bug.message}
                  </div>

                  {/* Screenshot Thumbnail */}
                  {bug.screenshot_base64 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Attached Screenshot:</span>
                      <img
                        src={bug.screenshot_base64}
                        alt="User bug screenshot"
                        onClick={() => setSelectedScreenshot(bug.screenshot_base64)}
                        className="h-28 rounded-xl border border-slate-300 shadow-sm object-cover cursor-pointer hover:opacity-90 transition hover:ring-2 hover:ring-orange-500"
                      />
                    </div>
                  )}

                  {/* DeepSeek AI Diagnostics Card */}
                  {bug.ai_analysis && (
                    <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 text-orange-400 text-xs font-bold">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>DeepSeek AI Root Cause & Diagnostics</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">STATUS: {bug.ai_status || "TRIAGED"}</span>
                      </div>

                      <div className="text-xs text-slate-300">
                        <span className="text-slate-400 font-bold block mb-0.5">Root Cause:</span>
                        {bug.ai_analysis}
                      </div>

                      {bug.ai_suggested_fix && (
                        <div className="text-xs text-emerald-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px]">
                          <span className="text-slate-400 font-sans font-bold block mb-0.5">Suggested Fix:</span>
                          {bug.ai_suggested_fix}
                        </div>
                      )}

                      {/* In-House Auto-Fix Action */}
                      {bug.in_house_action && (
                        <div className="bg-blue-950/50 border border-blue-900/60 p-3 rounded-lg flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">⚡ In-House Fix Available:</span>
                            <span className="text-xs text-slate-200 font-mono">{bug.in_house_action}</span>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                // The server reads the stored action itself; it
                                // must never be handed something to execute.
                                const res = await fetch(`/api/v1/pilot/feedback/${bug.feedback_id}/apply-in-house-fix`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                  },
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  setSuccess(data.message || "In-house fix applied and marked resolved.");
                                  setTimeout(() => setSuccess(null), 4000);
                                  bug.ai_status = "RESOLVED_IN_HOUSE";
                                  setLiveBugs([...liveBugs]);
                                } else if (res.status === 422) {
                                  // Needs a code change - it moves to the IDE queue.
                                  bug.ai_status = "NEEDS_CODE_FIX";
                                  setLiveBugs([...liveBugs]);
                                  setError(data.error || "This report needs a code fix.");
                                } else {
                                  setError(data.error || "Failed to apply in-house fix.");
                                }
                              } catch (e: any) {
                                setError(e.message);
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                          >
                            Apply In-House Fix
                          </button>
                        </div>
                      )}

                      {/* IDE Agent Prompt for Development */}
                      {bug.ide_agent_prompt && (
                        <div className="bg-purple-950/40 border border-purple-900/50 p-3 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              <span>Antigravity IDE Agent Prompt:</span>
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(bug.ide_agent_prompt);
                                setSuccess("IDE Agent prompt copied to clipboard! Paste it into Antigravity IDE.");
                                setTimeout(() => setSuccess(null), 3000);
                              }}
                              className="text-[10px] font-bold text-purple-300 hover:text-white bg-purple-900/60 hover:bg-purple-800 px-2 py-1 rounded transition cursor-pointer"
                            >
                              📋 Copy Prompt for IDE
                            </button>
                          </div>
                          <pre className="text-[11px] text-purple-200 font-mono whitespace-pre-wrap bg-slate-950 p-2.5 rounded-md border border-purple-900/30 overflow-x-auto">
                            {bug.ide_agent_prompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Screenshot Modal Lightbox */}
          {selectedScreenshot && (
            <div 
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setSelectedScreenshot(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-700">
                <button
                  onClick={() => setSelectedScreenshot(null)}
                  className="absolute top-4 right-4 bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full cursor-pointer z-10"
                >
                  ✕
                </button>
                <img
                  src={selectedScreenshot}
                  alt="Full screen preview"
                  className="max-h-[85vh] max-w-full rounded-xl object-contain"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profile-approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Profile Update Approval Queue</h2>
              <p className="text-xs text-slate-400 mt-1">Configure approval policy and resolve pending employee profile change requests.</p>
            </div>
            
            {/* Setting controller */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Approval Policy:</span>
              <select
                value={approvalSetting}
                onChange={(e) => handleUpdateApprovalSetting(e.target.value as any)}
                disabled={settingSaveLoading}
                className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 text-slate-800 focus:outline-none"
              >
                <option value="auto_approve">Auto-Approve Updates</option>
                <option value="require_approval">Require HR/Admin Approval</option>
              </select>
            </div>
          </div>

          {approvalLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : approvalRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
              No pending profile update requests in approval queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="ds-table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="ds-th pb-3 pr-4">Employee</th>
                    <th className="ds-th pb-3 pr-4">Current Value</th>
                    <th className="ds-th pb-3 pr-4">Requested Update</th>
                    <th className="ds-th pb-3 pr-4">Request Log</th>
                    <th className="ds-th pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {approvalRequests.map((req: any) => {
                    const changes = [];
                    if (req.mobile !== req.current_mobile) changes.push({ name: "Phone", old: req.current_mobile || "None", new: req.mobile });
                    if (req.alt_mobile !== req.current_alt_mobile) changes.push({ name: "Alt Phone", old: req.current_alt_mobile || "None", new: req.alt_mobile });
                    if (req.email !== req.current_email) changes.push({ name: "Email", old: req.current_email || "None", new: req.email });

                    return (
                      <tr key={req.request_id} className="ds-table-row hover:bg-slate-50/50">
                        <td className="ds-td py-4 pr-4">
                          <div className="font-bold text-slate-800 uppercase">{req.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{req.employee_code || `EMP0${req.employee_id}`}</div>
                        </td>
                        <td className="ds-td py-4 pr-4">
                          <div className="space-y-1 font-mono text-[10px] text-slate-400">
                            {changes.map((c, i) => (
                              <div key={i}><span className="font-bold">{c.name}:</span> {c.old}</div>
                            ))}
                          </div>
                        </td>
                        <td className="ds-td py-4 pr-4">
                          <div className="space-y-1 font-mono text-[10px] text-orange-600 font-bold">
                            {changes.map((c, i) => (
                              <div key={i}><span className="text-slate-400 font-normal">{c.name}:</span> {c.new}</div>
                            ))}
                          </div>
                        </td>
                        <td className="ds-td py-4 pr-4 text-[10px] text-slate-400 space-y-0.5">
                          <div>📅 {new Date(req.created_at).toLocaleString()}</div>
                          <div className="font-mono text-[9px]">💻 {req.ip_address}</div>
                        </td>
                        <td className="ds-td py-4 text-right flex justify-end gap-2 items-center">
                          <button
                            onClick={() => handleResolveRequest(req.request_id, "Approve")}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveRequest(req.request_id, "Reject")}
                            className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl flex flex-col p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Add New Operator Role</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Register a custom access tier</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoleSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="ds-label block text-[10px] font-bold   uppercase tracking-wider mb-1">Role Key Name *</label>
                <input 
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Workshop Supervisor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="ds-label block text-[10px] font-bold   uppercase tracking-wider mb-1">Default Permission Level *</label>
                <select
                  value={newPermissionLevel}
                  onChange={(e) => setNewPermissionLevel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="full">Full Access (All Modules Edit)</option>
                  <option value="limited">Limited Access (View and select edits)</option>
                  <option value="read">Read Only (Dashboard/Logs view only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleAddLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {roleAddLoading ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
