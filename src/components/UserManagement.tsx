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
  Clock
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
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions' | 'profile-approvals'>('directory');
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

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
    { key: 'developer', label: 'Developer' }
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
    }
  }, [token]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName || !username || !password || !role) {
      setError("Please fill in all required fields.");
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
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          password,
          role,
          employee_id: employeeId ? Number(employeeId) : null,
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
        <div className="flex border-b border-slate-200 gap-4">
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              activeTab === 'directory'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            User Directory
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
              activeTab === 'permissions'
                ? 'border-orange-500 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab('profile-approvals')}
            className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
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

      {/* Add User Section */}
      {showAddForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-in zoom-in-95 duration-150">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-orange-500" />
            <span>New Operator Information</span>
          </h2>

          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
                Username (Lower case) *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. johndoe"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
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
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
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
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
                Link to Employee ID (Optional)
              </label>
              <input
                type="number"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
                Authorised Mobile No (for OTP)
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
              <label className="ds-label block text-[10px] font-bold uppercase tracking-wider   mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. operator@workshop.com"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={addLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {addLoading ? (
                  <FunnySpinner className="h-4 w-4" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create User</span>
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
                            <input
                              type="number"
                              value={editEmployeeId}
                              onChange={(e) => setEditEmployeeId(e.target.value)}
                              className="w-20 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:outline-none block"
                              placeholder="Emp ID"
                            />
                          ) : (
                            <span className="text-xs text-slate-500 font-mono">
                              {user.employee_id ? `#${user.employee_id}` : "—"}
                            </span>
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
