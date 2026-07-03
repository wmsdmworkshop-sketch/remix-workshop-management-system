import FunnySpinner from "./FunnySpinner";
import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Coffee,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Users,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  Maximize2
} from "lucide-react";
import { Employee, User } from "../types";
import SelfServiceAttendance from "./SelfServiceAttendance";

interface AttendanceRecord {
  attendance_id: number;
  employee_id: number;
  shift_date: string;
  check_in: string | null;
  check_out: string | null;
  shift_type: "Morning" | "Afternoon" | "Night";
  status: "Present" | "Absent" | "Leave" | "Half Day";
  notes?: string;
  employee_name?: string;
  employee_role?: string;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  face_photo_in?: string | null;
  face_photo_out?: string | null;
  face_match_score_in?: number | null;
  face_match_score_out?: number | null;
  is_approved?: boolean;
}

interface TodaySummary {
  date: string;
  total_technicians: number;
  present: number;
  absent: number;
  on_leave: number;
  not_marked: number;
  attendance_pct: number;
  records: AttendanceRecord[];
}

interface AttendanceShiftLogProps {
  employees: Employee[];
  currentUser?: User;
}

export default function AttendanceShiftLog({ employees, currentUser }: AttendanceShiftLogProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState<number>(0);
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");
  const [formShiftType, setFormShiftType] = useState<"Morning" | "Afternoon" | "Night">("Morning");
  const [formStatus, setFormStatus] = useState<"Present" | "Absent" | "Leave" | "Half Day">("Present");
  const [formNotes, setFormNotes] = useState("");

  const userRole = currentUser?.role || "technician";
  const isSelfService = userRole === "technician" || userRole === "breakdown";
  const empId = currentUser?.employee_id || 0;
  const canApprove = ["workshop_manager", "service_manager", "admin", "developer"].includes(userRole);

  const techRoles = ["Technician", "Electrician", "Add Tech"];
  const techEmployees = employees.filter(e => e.is_active && (techRoles.includes(e.role) || e.role.toLowerCase().includes("technician") || e.role.toLowerCase().includes("electrician")));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceRes, todayRes] = await Promise.all([
        fetch(`/api/workforce/attendance?start_date=${selectedDate}&end_date=${selectedDate}`),
        fetch("/api/workforce/attendance/today")
      ]);
      const attendanceData = await attendanceRes.json();
      const todayData = await todayRes.json();
      setRecords(attendanceData);
      setTodaySummary(todayData);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSelfService) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [selectedDate, isSelfService]);

  const handleSubmit = async () => {
    if (!formEmployeeId) return;
    setSaving(true);
    try {
      await fetch("/api/workforce/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: formEmployeeId,
          shift_date: selectedDate,
          check_in: formCheckIn || null,
          check_out: formCheckOut || null,
          shift_type: formShiftType,
          status: formStatus,
          notes: formNotes
        })
      });
      await fetchData();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (record: AttendanceRecord) => {
    try {
      const res = await fetch("/api/workforce/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: record.employee_id,
          shift_date: record.shift_date,
          status: record.status,
          is_approved: true
        })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Failed to approve record:", err);
    }
  };

  const resetForm = () => {
    setFormEmployeeId(0);
    setFormCheckIn("");
    setFormCheckOut("");
    setFormShiftType("Morning");
    setFormStatus("Present");
    setFormNotes("");
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    Present: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    Absent: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
    Leave: { icon: Coffee, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    "Half Day": { icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  };

  const shiftIcon: Record<string, any> = {
    Morning: Sun,
    Afternoon: Sunset,
    Night: Moon,
  };

  if (isSelfService) {
    return (
      <div className="py-4">
        <SelfServiceAttendance employeeId={empId} onSuccess={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Attendance & Shift Log</h2>
            <p className="text-xs text-slate-400">Automated Workforce Check-in Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Mark Attendance
          </button>
        </div>
      </div>

      {/* Today's Summary Cards */}
      {todaySummary && isToday && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Staff", value: todaySummary.total_technicians, icon: Users, color: "text-slate-400", bg: "bg-slate-500/10" },
            { label: "Present", value: todaySummary.present, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Absent", value: todaySummary.absent, icon: UserX, color: "text-rose-400", bg: "bg-rose-500/10" },
            { label: "On Leave", value: todaySummary.on_leave, icon: Coffee, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Not Marked", value: todaySummary.not_marked, icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} border border-slate-700/30 rounded-xl p-3 flex items-center gap-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
              <div>
                <div className={`text-xl font-black ${color}`}>{value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Rate Bar */}
      {todaySummary && isToday && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Attendance Rate</span>
            <span className={`text-lg font-black ${todaySummary.attendance_pct >= 80 ? "text-emerald-400" : todaySummary.attendance_pct >= 60 ? "text-amber-400" : "text-rose-400"}`}>
              {todaySummary.attendance_pct}%
            </span>
          </div>
          <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                todaySummary.attendance_pct >= 80 ? "bg-emerald-500" : todaySummary.attendance_pct >= 60 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${todaySummary.attendance_pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Date Selector */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="px-2 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold"
            >
              Today
            </button>
          )}
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 hover:bg-slate-800 rounded-lg transition-all text-slate-400 hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* New Attendance Form */}
      {showForm && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-blue-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Mark Attendance for {selectedDate}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employee */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Employee</label>
              <select
                value={formEmployeeId}
                onChange={(e) => setFormEmployeeId(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value={0}>Select employee...</option>
                {techEmployees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>{e.full_name} ({e.role})</option>
                ))}
              </select>
            </div>
            {/* Shift Type */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Shift Type</label>
              <div className="flex gap-2">
                {(["Morning", "Afternoon", "Night"] as const).map(shift => {
                  const ShiftIcon = shiftIcon[shift];
                  return (
                    <button
                      key={shift}
                      onClick={() => setFormShiftType(shift)}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg border text-xs font-bold transition-all ${
                        formShiftType === shift
                          ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                          : "bg-slate-900 border-slate-700/50 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <ShiftIcon className="h-3 w-3" />
                      {shift}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Status</label>
              <div className="flex gap-2 flex-wrap">
                {(["Present", "Absent", "Leave", "Half Day"] as const).map(s => {
                  const cfg = statusConfig[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setFormStatus(s)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        formStatus === s
                          ? `${cfg.bg} ${cfg.color}`
                          : "bg-slate-900 border-slate-700/50 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Check-in */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Check-in Time</label>
              <input
                type="time"
                value={formCheckIn}
                onChange={(e) => setFormCheckIn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Check-out */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Check-out Time</label>
              <input
                type="time"
                value={formCheckOut}
                onChange={(e) => setFormCheckOut(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Notes</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formEmployeeId || saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <FunnySpinner className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              Save Attendance
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <FunnySpinner className="h-5 w-5  text-blue-400" />
          <span className="ml-2 text-slate-400 text-sm">Loading attendance...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No attendance records for {selectedDate}</p>
          <p className="text-xs text-slate-500 mt-1">Click "Mark Attendance" to add records</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check-in</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check-out</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verif. Face</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verif. GPS</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Badge</th>
                <th className="text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const sc = statusConfig[r.status] || statusConfig.Present;
                const StatusIcon = sc.icon;
                const ShiftIcon = shiftIcon[r.shift_type] || Sun;

                // Biometric Match Scores
                const hasInPhoto = !!r.face_photo_in;
                const hasOutPhoto = !!r.face_photo_out;
                const scoreIn = r.face_match_score_in !== undefined && r.face_match_score_in !== null ? Math.round(r.face_match_score_in * 100) : null;
                const scoreOut = r.face_match_score_out !== undefined && r.face_match_score_out !== null ? Math.round(r.face_match_score_out * 100) : null;

                // Geolocation Links
                const hasInGps = r.check_in_lat && r.check_in_lng;
                const hasOutGps = r.check_out_lat && r.check_out_lng;

                return (
                  <tr key={r.attendance_id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    {/* Employee */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                          {(r.employee_name || "?").split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm font-semibold text-slate-200">{r.employee_name}</span>
                      </div>
                    </td>
                    
                    {/* Role */}
                    <td className="px-4 py-3 text-xs text-slate-400">{r.employee_role}</td>
                    
                    {/* Shift */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <ShiftIcon className="h-3 w-3" />
                        {r.shift_type}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {r.status}
                      </span>
                    </td>
                    
                    {/* Check In */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-300 font-mono">{r.check_in || "—"}</span>
                    </td>
                    
                    {/* Check Out */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-slate-300 font-mono">{r.check_out || "—"}</span>
                    </td>

                    {/* Face Biometric Match Photo & Score */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {hasInPhoto && (
                          <div className="relative group cursor-pointer" onClick={() => setSelectedPhoto(r.face_photo_in || null)}>
                            <img
                              src={`data:image/jpeg;base64,${r.face_photo_in}`}
                              alt="In Face"
                              className="w-6 h-6 rounded object-cover border border-slate-700 group-hover:border-blue-500 transition-all"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="h-2 w-2 text-white" />
                            </div>
                            <span className="block text-[8px] text-slate-500 text-center font-bold mt-0.5">IN: {scoreIn ?? "—"}%</span>
                          </div>
                        )}
                        {hasOutPhoto && (
                          <div className="relative group cursor-pointer" onClick={() => setSelectedPhoto(r.face_photo_out || null)}>
                            <img
                              src={`data:image/jpeg;base64,${r.face_photo_out}`}
                              alt="Out Face"
                              className="w-6 h-6 rounded object-cover border border-slate-700 group-hover:border-blue-500 transition-all"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Maximize2 className="h-2 w-2 text-white" />
                            </div>
                            <span className="block text-[8px] text-slate-500 text-center font-bold mt-0.5">OUT: {scoreOut ?? "—"}%</span>
                          </div>
                        )}
                        {!hasInPhoto && !hasOutPhoto && <span className="text-slate-600 text-xs">—</span>}
                      </div>
                    </td>

                    {/* GPS Map Pin */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {hasInGps ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${r.check_in_lat},${r.check_in_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-all border border-blue-500/20"
                            title="Check-in Location"
                          >
                            <MapPin className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600">IN: —</span>
                        )}
                        {hasOutGps ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${r.check_out_lat},${r.check_out_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded transition-all border border-amber-500/20"
                            title="Check-out Location"
                          >
                            <MapPin className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600">OUT: —</span>
                        )}
                      </div>
                    </td>

                    {/* Approved/Verification Status */}
                    <td className="px-4 py-3 text-center">
                      {r.is_approved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 uppercase">
                          <ShieldCheck className="h-3 w-3" />
                          Auto-Approved
                        </span>
                      ) : r.is_approved === false ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 uppercase">
                          <ShieldAlert className="h-3 w-3 animate-pulse" />
                          Pending Override
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Manual Entry</span>
                      )}
                    </td>

                    {/* Quick supervisor actions */}
                    <td className="px-4 py-3 text-center">
                      {r.is_approved === false && canApprove && (
                        <button
                          onClick={() => handleApprove(r)}
                          className="flex items-center gap-1.5 mx-auto px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          Approve
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

      {/* Profile/Captured Photo Modal Overlay */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-sm w-full bg-slate-900 border border-slate-800 rounded-xl p-3 animate-in zoom-in-95 duration-150">
            <img
              src={`data:image/jpeg;base64,${selectedPhoto}`}
              alt="Expanded biometric snapshot"
              className="w-full aspect-square object-cover rounded-lg border border-slate-800"
            />
            <div className="text-center text-xs text-slate-400 font-semibold mt-2.5">
              Captured Biometric ID Snap (Verification Audit Log)
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 text-white border border-slate-700 font-bold flex items-center justify-center hover:bg-slate-700 shadow-xl transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
