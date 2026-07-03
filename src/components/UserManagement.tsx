import React, { useState, useEffect } from "react";
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
  ToggleRight
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
  const [activeTab, setActiveTab] = useState<'directory' | 'permissions'>('directory');
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const MODULES = [
    'Dashboard', 
    'Bay Queue', 
    'Job Cards', 
    'Revenue', 
    'Ledger', 
    'Warranty', 
    'FSB', 
    'Query', 
    'Billing', 
    'DMS Import', 
    'User Management'
  ];

  const ROLES = [
    { key: 'admin', label: 'Admin' },
    { key: 'service_manager', label: 'Manager' },
    { key: 'technician', label: 'Technician' },
    { key: 'reception', label: 'Receptionist' },
    { key: 'service_advisor', label: 'Service Advisor' },
    { key: 'developer', label: 'Developer' }
  ];

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const res = await fetch("/api/permissions");
      const data = await res.json();
      setPermissionsList(data);
    } catch (e) {
      console.error("Failed to fetch permissions:", e);
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchPermissions();
    }
  }, [activeTab]);

  const handleCheckboxChange = (module: string, roleKey: string, field: 'can_view' | 'can_edit' | 'can_comment', val: boolean) => {
    setPermissionsList(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(p => p.module_name === module && p.role_name === roleKey);
      if (idx !== -1) {
        copy[idx] = { ...copy[idx], [field]: val ? 1 : 0 };
      } else {
        copy.push({
          module_name: module,
          role_name: roleKey,
          can_view: field === 'can_view' ? (val ? 1 : 0) : 0,
          can_edit: field === 'can_edit' ? (val ? 1 : 0) : 0,
          can_comment: field === 'can_comment' ? (val ? 1 : 0) : 0
        });
      }
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

      setSuccess(`User "${fullName}" created successfully!`);
      setShowAddForm(false);
      // Reset form
      setFullName("");
      setUsername("");
      setPassword("");
      setRole("reception");
      setEmployeeId("");
      setMobileNo("");
      setEmail("");
      
      // Refresh list
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setAddLoading(false);
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
    setEditRole(user.role);
    setEditEmployeeId(user.employee_id ? String(user.employee_id) : "");
    setEditPassword("");
    setEditMobileNo(user.mobile_no || "");
    setEditEmail(user.email || "");
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-12 translate-x-12"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">System User Directory</h1>
                <p className="text-xs text-slate-400">Manage credentials, permissions and operator authorization roles</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/15 transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>{showAddForm ? "Cancel Form" : "Create Operator Account"}</span>
          </button>
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
        <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs animate-in slide-in-from-top-2 duration-200">
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Username (Lower case) *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. johndoe"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                System Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              >
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
                <option value="service_manager">Service Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="accounts">Accounts</option>
                <option value="service_advisor">Service Advisor</option>
                <option value="reception">Reception</option>
                <option value="gate_personnel">Gate Personnel</option>
                <option value="technician">Technician</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Link to Employee ID (Optional)
              </label>
              <input
                type="number"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. 1"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Authorised Mobile No (for OTP)
              </label>
              <input
                type="text"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. operator@workshop.com"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={addLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {addLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Controls Panel */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, name, full name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Filter:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full md:w-44 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              >
                <option value="All">All Roles</option>
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
                <option value="service_manager">Service Manager</option>
                <option value="supervisor">Supervisor</option>
                <option value="accounts">Accounts</option>
                <option value="service_advisor">Service Advisor</option>
                <option value="reception">Reception</option>
                <option value="gate_personnel">Gate Personnel</option>
                <option value="technician">Technician</option>
              </select>
            </div>
          </div>

          {/* Directory List Table */}
          {loading ? (
            <FunnyLoader message="Loading system users..." />
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-xs font-medium">No users found matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User Details</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Authorization</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linked Employee</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Activity</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isEditing = editingUserId === user.user_id;

                    return (
                      <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Name Details */}
                        <td className="p-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editFullName}
                                onChange={(e) => setEditFullName(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none block w-full"
                                placeholder="Full Name"
                              />
                              <input
                                type="text"
                                value={editMobileNo}
                                onChange={(e) => setEditMobileNo(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none block w-full"
                                placeholder="Mobile No for OTP"
                              />
                              <input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none block w-full"
                                placeholder="Email (Optional)"
                              />
                              <input
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none block w-full"
                                placeholder="Change Password"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-slate-800">{user.full_name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">@{user.username}</p>
                              {user.mobile_no && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">📱 {user.mobile_no}</p>
                              )}
                              {user.email && (
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">✉️ {user.email}</p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Role Badge */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value as any)}
                              className="px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                            >
                              <option value="developer">Developer</option>
                              <option value="admin">Admin</option>
                              <option value="service_manager">Service Manager</option>
                              <option value="supervisor">Supervisor</option>
                              <option value="accounts">Accounts</option>
                              <option value="service_advisor">Service Advisor</option>
                              <option value="reception">Reception</option>
                              <option value="gate_personnel">Gate Personnel</option>
                              <option value="technician">Technician</option>
                            </select>
                          ) : (
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                              {formatRoleName(user.role)}
                            </span>
                          )}
                        </td>

                        {/* Linked Employee */}
                        <td className="p-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editEmployeeId}
                              onChange={(e) => setEditEmployeeId(e.target.value)}
                              className="w-16 px-2 py-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                              placeholder="Emp ID"
                            />
                          ) : (
                            <span className="text-xs text-slate-500 font-mono">
                              {user.employee_id ? `#${user.employee_id}` : "—"}
                            </span>
                          )}
                        </td>

                        {/* Last Activity */}
                        <td className="p-4 text-xs text-slate-500 font-mono">
                          {user.last_login 
                            ? new Date(user.last_login).toLocaleString()
                            : "Never logged in"
                          }
                        </td>

                        {/* Toggle state */}
                        <td className="p-4">
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
                        <td className="p-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdateUser(user.user_id)}
                                disabled={editLoading}
                                className="px-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-[10px] uppercase shadow"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] uppercase"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded font-bold text-[10px] text-slate-600 uppercase tracking-wider transition-all"
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Role Permissions Matrix</h2>
              <p className="text-xs text-slate-500 mt-1">Configure view, edit, and comment access rights for each module per role.</p>
            </div>
            <button
              onClick={handleSavePermissions}
              disabled={saveLoading}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-orange-500/10 cursor-pointer"
            >
              {saveLoading ? "Saving Changes..." : "Save Permission Matrix"}
            </button>
          </div>

          {permissionsLoading ? (
            <FunnyLoader message="Loading permissions matrix..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-4 text-xs font-bold text-slate-700 w-44">Module Name</th>
                    {ROLES.map((role) => (
                      <th key={role.key} className="p-4 text-center text-xs font-bold text-slate-700">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES.map((moduleName) => (
                    <tr key={moduleName} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 text-xs font-bold text-slate-800">{moduleName}</td>
                      {ROLES.map((role) => {
                        const perm = permissionsList.find(p => p.module_name === moduleName && p.role_name === role.key) || {
                          can_view: 0,
                          can_edit: 0,
                          can_comment: 0
                        };

                        return (
                          <td key={role.key} className="p-4 text-center border-l border-slate-50">
                            <div className="flex flex-col items-center gap-2 justify-center">
                              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.can_view === 1 || perm.can_view === true}
                                  onChange={(e) => handleCheckboxChange(moduleName, role.key, 'can_view', e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                View
                              </label>
                              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.can_edit === 1 || perm.can_edit === true}
                                  onChange={(e) => handleCheckboxChange(moduleName, role.key, 'can_edit', e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Edit
                              </label>
                              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.can_comment === 1 || perm.can_comment === true}
                                  onChange={(e) => handleCheckboxChange(moduleName, role.key, 'can_comment', e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Comment
                              </label>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
