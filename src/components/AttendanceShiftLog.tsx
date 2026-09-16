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
  ThumbsUp
} from "lucide-react";
import { Employee, User } from "../types";
import { getStaffToken } from "../lib/authToken";
import SelfServiceAttendance from "./SelfServiceAttendance";
import OvertimeEmployeeDashboard from "./OvertimeEmployeeDashboard";
import OvertimeApprovalPortal from "./OvertimeApprovalPortal";

interface AttendanceRecord {
  attendance_id: number;
  employee_id: number;
  shift_date: string;
  check_in: string | null;
  check_out: string | null;
  shift_type: "Morning" | "Afternoon" | "Night";
  status: "Present" | "Absent" | "Leave" | "Half Day" | "Weekly Off" | "Holiday";
  notes?: string;
  employee_name?: string;
  employee_role?: string;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  face_photo_in?: string | null;
  face_photo_out?: string | null;
  // Existence flags from the day-list endpoint — the base64 bytes themselves are
  // fetched per record from /api/workforce/attendance/:id/evidence.
  has_face_photo_in?: boolean;
  has_face_photo_out?: boolean;
  face_match_score_in?: number | null;
  face_match_score_out?: number | null;
  is_approved?: boolean | null;
  is_late?: boolean;
  late_reason?: string | null;
  is_overtime?: boolean;
  overtime_hours?: number | null;
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
  token?: string | null;
  jobCards?: any[];
}

// The MySQL pool is configured with dateStrings:true, so a TIMESTAMP arrives as a
// bare "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker. `new Date(...)` would read
// it as the VIEWER's local time and shift it (5h30m early for an IST site), so the
// Z is added explicitly before rendering in the site's timezone.
const fmtIst = (v?: string | null) => {
  if (!v) return "—";
  let iso = v;
  // Only a BARE datetime (no trailing Z or +offset) needs the UTC marker added.
  // Appending it blindly would produce "...Z.000Z" for a value that already had
  // one, which parses as Invalid Date.
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(v)) {
    iso = `${v.replace(" ", "T")}Z`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

const safeJson = (v: any) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };

export default function AttendanceShiftLog({ employees, currentUser, token, jobCards }: AttendanceShiftLogProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  // Approval review. Approving a punch is the act of vouching for someone's
  // recorded arrival, so the Approve button opens a panel that first SHOWS the
  // evidence: the punch photo, the enrolled reference it was compared against,
  // the GPS fix and the real geofence verdict — plus what has already happened
  // to the record. The day list ships only photo-EXISTENCE flags, not the bytes,
  // so the evidence is fetched for the single record under review.
  const [reviewRow, setReviewRow] = useState<any | null>(null);
  const [evidence, setEvidence] = useState<any | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [approving, setApproving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"attendance" | "overtime" | "overtime-approvals">("attendance");
  const isRc1 = import.meta.env.VITE_WORKFORCE_PROFILE === "rc1";

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState<number>(0);
  const [formCheckIn, setFormCheckIn] = useState("");
  const [formCheckOut, setFormCheckOut] = useState("");
  const [formShiftType, setFormShiftType] = useState<"Morning" | "Afternoon" | "Night">("Morning");
  const [formStatus, setFormStatus] = useState<"Present" | "Absent" | "Leave" | "Half Day">("Present");
  const [formNotes, setFormNotes] = useState("");

  // Admin/superadmin manual time correction
  const [editRow, setEditRow] = useState<any | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editStatus, setEditStatus] = useState<AttendanceRecord["status"]>("Present");
  const [savingEdit, setSavingEdit] = useState(false);

  const userRole = currentUser?.role || "technician";
  const empId = currentUser?.employee_id || 0;
  // Managers/admin/dev may VIEW the workshop-wide table and APPROVE flagged records.
  // gm_service added — Floor Incharge/Spares/Warranty/Workshop Manager/BD/CSC
  // all report up to GM Service, who previously had no approval visibility.
  const canApprove = ["workshop_manager", "service_manager", "gm_service", "admin", "developer"].includes(userRole);
  // Only the superadmin tier may CREATE attendance for OTHER employees. (No
  // dedicated HR role exists yet; add it here and on the server when it does.)
  const canMarkOthers = ["admin", "developer"].includes(userRole);
  // Only the superadmin tier may correct a recorded punch time.
  const canEditTime = ["admin", "developer"].includes(userRole);
  // Everyone who cannot at least view/approve gets the self-punch screen only.
  const isSelfService = !canApprove;

  const techRoles = ["Technician", "Electrician", "Add Tech"];
  const techEmployees = employees.filter(e => e.is_active && (techRoles.includes(e.role) || e.role.toLowerCase().includes("technician") || e.role.toLowerCase().includes("electrician")));

  const fetchData = async () => {
    setLoading(true);
    try {
      const authHeaders: HeadersInit = { Authorization: `Bearer ${token || getStaffToken()}` };
      const [attendanceRes, todayRes] = await Promise.all([
        fetch(`/api/workforce/attendance?start_date=${selectedDate}&end_date=${selectedDate}`, { headers: authHeaders }),
        fetch("/api/workforce/attendance/today", { headers: authHeaders })
      ]);
      const attendanceData = await attendanceRes.json();
      const todayData = await todayRes.json();
      console.log("/api/workforce/attendance", attendanceData);
      setRecords(Array.isArray(attendanceData) ? attendanceData : []);
      console.log("/api/workforce/attendance/today", todayData);
      setTodaySummary(todayData && typeof todayData === "object" ? todayData : {});
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || getStaffToken()}` },
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

  const openReview = async (record: AttendanceRecord) => {
    const id = Number(record.attendance_id);
    // A synthetic "Not Marked" roster row carries a negative placeholder id and
    // has no punch behind it, so there is no evidence to fetch.
    if (!Number.isInteger(id) || id <= 0) return;
    setReviewRow(record);
    setEvidence(null);
    setEvidenceError(null);
    setLoadingEvidence(true);
    try {
      const res = await fetch(`/api/workforce/attendance/${id}/evidence`, {
        headers: { Authorization: `Bearer ${token || getStaffToken()}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEvidenceError(data?.error || `Could not load punch evidence (HTTP ${res.status}).`);
      } else {
        setEvidence(data);
      }
    } catch (err: any) {
      setEvidenceError(err?.message || "Network error while loading punch evidence.");
    } finally {
      setLoadingEvidence(false);
    }
  };

  // Approval submits the AUTHORITATIVE values read back from the server, never the
  // possibly-stale roster row. The payload is deliberately an approval and nothing
  // else — no check_in/check_out/face_photo — so the server sees it as a pure
  // approval flip and leaves the recorded punch untouched.
  const handleApprove = async () => {
    const rec = evidence?.record;
    if (!rec) return;
    setApproving(true);
    try {
      const res = await fetch("/api/workforce/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || getStaffToken()}` },
        body: JSON.stringify({
          employee_id: rec.employee_id,
          shift_date: rec.shift_date,
          status: rec.status,
          is_approved: true
        })
      });
      if (res.ok) {
        setReviewRow(null);
        setEvidence(null);
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to approve this record.");
      }
    } catch (err: any) {
      alert(err?.message || "Network error while approving.");
    } finally {
      setApproving(false);
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

  // Roster view: show ALL active staff for the day (merged with punch records),
  // so unmarked staff appear too — not just whoever punched.
  const rosterRows: any[] = (() => {
    const byEmp = new Map((records || []).map((r) => [Number(r.employee_id), r]));
    const active = (employees || []).filter((e: any) => e.is_active);
    const rows: any[] = active.map((e: any) => byEmp.get(Number(e.employee_id)) || {
      attendance_id: -Number(e.employee_id),
      employee_id: e.employee_id,
      employee_name: e.full_name,
      employee_role: e.role,
      shift_date: selectedDate,
      check_in: null, check_out: null, shift_type: "Morning",
      status: "Not Marked", is_approved: null,
    });
    // Safety: any punched record whose employee isn't in the active roster.
    (records || []).forEach((r) => {
      if (!active.some((e: any) => Number(e.employee_id) === Number(r.employee_id))) rows.push(r);
    });
    return rows.sort((a, b) => (b.check_in ? 1 : 0) - (a.check_in ? 1 : 0));
  })();

  // Admin/superadmin: save a manual check-in/out time correction.
  const handleSaveEdit = async () => {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/workforce/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || getStaffToken()}` },
        body: JSON.stringify({
          employee_id: editRow.employee_id,
          shift_date: selectedDate,
          check_in: editIn || null,
          check_out: editOut || null,
          status: editStatus,
          is_edit: true,
        }),
      });
      if (res.ok) {
        await fetchData();
        setEditRow(null);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Failed to update attendance time.");
      }
    } catch (e: any) {
      alert(e.message || "Network error while updating time.");
    } finally {
      setSavingEdit(false);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    Present: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    Absent: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
    Leave: { icon: Coffee, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    "Half Day": { icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    "Not Marked": { icon: AlertCircle, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  };

  const shiftIcon: Record<string, any> = {
    Morning: Sun,
    Afternoon: Sunset,
    Night: Moon,
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex border-b border-slate-800 space-x-6 mb-6">
        <button
          type="button"
          onClick={() => setActiveSubTab("attendance")}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeSubTab === "attendance" 
              ? "border-[#06B6D4] text-[#06B6D4]" 
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Attendance</span>
        </button>
        {!isRc1 && (
          <button
            type="button"
            onClick={() => setActiveSubTab("overtime")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeSubTab === "overtime" 
                ? "border-[#06B6D4] text-[#06B6D4]" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Overtime</span>
          </button>
        )}
        {!isRc1 && canApprove && (
          <button
            type="button"
            onClick={() => setActiveSubTab("overtime-approvals")}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeSubTab === "overtime-approvals" 
                ? "border-[#06B6D4] text-[#06B6D4]" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Overtime Approvals</span>
          </button>
        )}
      </div>

      {!isRc1 && activeSubTab === "overtime" && (
        <OvertimeEmployeeDashboard currentUser={currentUser} token={token} employees={employees} jobCards={jobCards} />
      )}

      {!isRc1 && activeSubTab === "overtime-approvals" && canApprove && (
        <OvertimeApprovalPortal currentUser={currentUser} token={token} employees={employees} jobCards={jobCards} />
      )}

      {activeSubTab === "attendance" && (
        isSelfService ? (
          <div className="py-4">
            <SelfServiceAttendance employeeId={empId} onSuccess={() => {}} />
          </div>
        ) : (
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
            className="ds-button-secondary flex items-center gap-1.5 px-3 py-1.5     border border-slate-700/50 rounded-lg text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          {canMarkOthers && (
            <button
              onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Mark Attendance
            </button>
          )}
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
              <label className="ds-label block text-xs font-bold   mb-1">Employee</label>
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
              <label className="ds-label block text-xs font-bold   mb-1">Shift Type</label>
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
              <label className="ds-label block text-xs font-bold   mb-1">Status</label>
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
              <label className="ds-label block text-xs font-bold   mb-1">Check-in Time</label>
              <input
                type="time"
                value={formCheckIn}
                onChange={(e) => setFormCheckIn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Check-out */}
            <div>
              <label className="ds-label block text-xs font-bold   mb-1">Check-out Time</label>
              <input
                type="time"
                value={formCheckOut}
                onChange={(e) => setFormCheckOut(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Notes */}
            <div>
              <label className="ds-label block text-xs font-bold   mb-1">Notes</label>
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
              className="ds-button-secondary px-4 py-2     text-slate-300 rounded-lg text-xs font-bold transition-all"
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
      ) : rosterRows.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No attendance records for {selectedDate}</p>
          <p className="text-xs text-slate-500 mt-1">Click "Mark Attendance" to add records</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl overflow-x-auto">
          <table className="ds-table w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="ds-th text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="ds-th text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check-in</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Check-out</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verif. Face</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verif. GPS</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Badge</th>
                <th className="ds-th text-center px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {rosterRows.map(r => {
                const sc = statusConfig[r.status] || statusConfig.Present;
                const StatusIcon = sc.icon;
                const ShiftIcon = shiftIcon[r.shift_type] || Sun;

                // Biometric Match Scores. `has_face_photo_*` is the list endpoint's
                // existence flag; `face_photo_*` remains a fallback for any caller
                // that still sends the bytes inline.
                const hasInPhoto = !!(r.has_face_photo_in || r.face_photo_in);
                const hasOutPhoto = !!(r.has_face_photo_out || r.face_photo_out);
                const scoreIn = r.face_match_score_in !== undefined && r.face_match_score_in !== null ? Math.round(r.face_match_score_in * 100) : null;
                const scoreOut = r.face_match_score_out !== undefined && r.face_match_score_out !== null ? Math.round(r.face_match_score_out * 100) : null;

                // Geolocation Links
                const hasInGps = r.check_in_lat && r.check_in_lng;
                const hasOutGps = r.check_out_lat && r.check_out_lng;

                // is_approved is a MySQL tinyint(1), so it arrives as the NUMBER 0 or
                // 1 — never `false`. The old `r.is_approved === false` test therefore
                // never matched, and every punch whose verification did not pass was
                // displayed as "Manual Entry", i.e. "a supervisor typed this in",
                // which mislabels precisely the rows a manager has to review. null is
                // the one state that really does mean a manual entry: no verification
                // was ever attempted.
                const approved = r.is_approved === true || Number(r.is_approved) === 1;
                const verificationPending = !approved && r.is_approved !== null && r.is_approved !== undefined;

                return (
                  <tr key={r.attendance_id} className="ds-table-row border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    {/* Employee */}
                    <td className="ds-td px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                          {(r.employee_name || "?").split(" ").map(n => n[0]).join("")}
                        </div>
                        <span className="text-sm font-semibold text-slate-200">{r.employee_name}</span>
                      </div>
                    </td>
                    
                    {/* Role */}
                    <td className="ds-td px-4 py-3 text-xs text-slate-400">{r.employee_role}</td>
                    
                    {/* Shift */}
                    <td className="ds-td px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <ShiftIcon className="h-3 w-3" />
                        {r.shift_type}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td className="ds-td px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {r.status}
                      </span>
                    </td>
                    
                    {/* Check In */}
                    <td className="ds-td px-4 py-3 text-center">
                      <span className="text-xs text-slate-300 font-mono">{r.check_in || "—"}</span>
                    </td>
                    
                    {/* Check Out */}
                    <td className="ds-td px-4 py-3 text-center">
                      <span className="text-xs text-slate-300 font-mono">{r.check_out || "—"}</span>
                    </td>

                    {/* Face Biometric Match Photo & Score */}
                    <td className="ds-td px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {hasInPhoto && (
                          <button type="button" onClick={() => openReview(r)}
                            className="px-1.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded transition-all"
                            title="View the check-in photo, its location and the verification result">
                            <span className="block text-[9px] font-black leading-none">IN</span>
                            <span className="block text-[8px] leading-none mt-0.5">{scoreIn ?? "—"}%</span>
                          </button>
                        )}
                        {hasOutPhoto && (
                          <button type="button" onClick={() => openReview(r)}
                            className="px-1.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded transition-all"
                            title="View the check-out photo, its location and the verification result">
                            <span className="block text-[9px] font-black leading-none">OUT</span>
                            <span className="block text-[8px] leading-none mt-0.5">{scoreOut ?? "—"}%</span>
                          </button>
                        )}
                        {!hasInPhoto && !hasOutPhoto && <span className="text-slate-600 text-xs">—</span>}
                      </div>
                    </td>

                    {/* GPS Map Pin */}
                    <td className="ds-td px-4 py-3 text-center">
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

                    {/* Verification / approval status */}
                    <td className="ds-td px-4 py-3 text-center">
                      {approved ? (
                        <span
                          className="ds-button-success inline-flex items-center gap-1 text-[10px] font-black text-emerald-400  /10 px-2 py-0.5 rounded border border-emerald-500/25 uppercase"
                          title="Verified or approved. Open Review to see who approved it and whether verification actually ran."
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Approved
                        </span>
                      ) : verificationPending ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 uppercase"
                          title="Verification did not pass or could not run. Open Review to see the photo, the location and the reason."
                        >
                          <ShieldAlert className="h-3 w-3 animate-pulse" />
                          Pending Review
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-bold text-slate-500 uppercase"
                          title="No verification was attempted for this record."
                        >
                          Manual Entry
                        </span>
                      )}
                    </td>

                    {/* Quick supervisor actions */}
                    <td className="ds-td px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!approved && r.check_in && canApprove && (
                          <button
                            onClick={() => openReview(r)}
                            className="ds-button-success ds-button-success flex items-center gap-1.5 px-2 py-1   hover:  text-white rounded text-[10px] font-black uppercase tracking-wider transition-all"
                            title="See the punch photo and location before approving"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            Review
                          </button>
                        )}
                        {canEditTime && (
                          <button
                            onClick={() => {
                              setEditRow(r);
                              setEditIn(r.check_in || "");
                              setEditOut(r.check_out || "");
                              setEditStatus(r.status === "Not Marked" ? "Present" : r.status);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-700/60 hover:bg-slate-600 text-slate-200 rounded text-[10px] font-black uppercase tracking-wider transition-all"
                            title="Correct check-in / check-out time"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

          </div>
        )
      )}

      {/* Admin/superadmin: manual time-correction modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => !savingEdit && setEditRow(null)}>
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Edit Attendance Time</h3>
              <p className="text-xs text-slate-400 mt-0.5">{editRow.employee_name} • {selectedDate}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check-in</label>
                <input type="time" value={editIn} onChange={(e) => setEditIn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Check-out</label>
                <input type="time" value={editOut} onChange={(e) => setEditOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as AttendanceRecord["status"])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                {(["Present", "Absent", "Leave", "Half Day", "Weekly Off", "Holiday"] as const).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-500">Recorded to the edit-audit trail. Leave a field blank to clear it.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditRow(null)} disabled={savingEdit}
                className="ds-button-secondary px-4 py-2 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50">Cancel</button>
              <button onClick={handleSaveEdit} disabled={savingEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5">
                {savingEdit ? <FunnySpinner className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                Save Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approver review panel — photo + location + what already happened */}
      {reviewRow && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-sm"
          onClick={() => !approving && setReviewRow(null)}
        >
          <div
            className="relative w-full max-w-2xl my-8 bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">Review Punch Evidence</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {reviewRow.employee_name} • {reviewRow.employee_role} • {reviewRow.shift_date}
                </p>
              </div>
              <button
                onClick={() => setReviewRow(null)}
                disabled={approving}
                className="ds-button-secondary w-8 h-8 rounded-full text-white border border-slate-700 font-bold flex items-center justify-center disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {loadingEvidence && (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400">
                <FunnySpinner className="h-4 w-4" /> Loading punch evidence…
              </div>
            )}

            {evidenceError && (
              <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300">{evidenceError}</p>
              </div>
            )}

            {evidence && (
              <>
                {/* Why this record is sitting here at all. A failed verification
                    stores only a 0 score, so the flag is otherwise unexplainable
                    to the person being asked to clear it. */}
                {evidence.review_reason && (
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                    <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Why this needs review</p>
                      <p className="text-xs text-amber-200/90 mt-0.5">{evidence.review_reason}</p>
                    </div>
                  </div>
                )}

                {/* What the punch looked like, against what it is compared to. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Check-in photo</div>
                    {evidence.photos?.check_in ? (
                      <img
                        src={`data:image/jpeg;base64,${evidence.photos.check_in}`}
                        alt="Check-in punch photo"
                        onClick={() => setSelectedPhoto(evidence.photos.check_in)}
                        className="w-full h-44 object-cover rounded border border-slate-800 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-44 rounded border border-slate-800 flex flex-col items-center justify-center text-center px-3">
                        <ShieldAlert className="h-5 w-5 text-amber-400 mb-1.5" />
                        <p className="text-[11px] text-amber-400 font-bold">No punch photo recorded</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          This punch carries no biometric capture, so no face match could run.
                        </p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Captured at <span className="font-mono text-slate-200">{evidence.record?.check_in || "—"}</span>
                      {/* The match score is only meaningful when a photo exists to
                          compare. With no photo the stored score is the unrun
                          default (100%), so reporting it would claim a match that
                          never happened. */}
                      {!!evidence.photos?.check_in && evidence.record?.face_match_score_in != null && (
                        <> • match <span className="font-mono text-slate-200">{Math.round(Number(evidence.record.face_match_score_in) * 100)}%</span></>
                      )}
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Enrolled reference photo</div>
                    {evidence.photos?.reference ? (
                      <img
                        src={`data:image/jpeg;base64,${evidence.photos.reference}`}
                        alt="Enrolled reference photo"
                        onClick={() => setSelectedPhoto(evidence.photos.reference)}
                        className="w-full h-44 object-cover rounded border border-slate-800 cursor-pointer"
                      />
                    ) : (
                      <div className="w-full h-44 rounded border border-slate-800 flex flex-col items-center justify-center text-center px-3">
                        <AlertCircle className="h-5 w-5 text-slate-500 mb-1.5" />
                        <p className="text-[11px] text-slate-400 font-bold">No reference photo enrolled</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          The face match has nothing to compare against — a common reason a punch is left unverified.
                        </p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {evidence.employee?.full_name || "—"} • {evidence.employee?.designation || evidence.employee?.role || "—"}
                    </p>
                  </div>
                </div>

                {evidence.photos?.check_out && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Check-out photo</div>
                    <img
                      src={`data:image/jpeg;base64,${evidence.photos.check_out}`}
                      alt="Check-out punch photo"
                      onClick={() => setSelectedPhoto(evidence.photos.check_out)}
                      className="w-full h-40 object-cover rounded border border-slate-800 cursor-pointer"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { k: "Check-in", v: evidence.record?.check_in || "—" },
                    { k: "Check-out", v: evidence.record?.check_out || "—" },
                    { k: "Shift", v: evidence.record?.shift_type || "—" },
                    { k: "Status", v: evidence.record?.status || "—" },
                  ].map((f) => (
                    <div key={f.k} className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{f.k}</div>
                      <div className="text-xs font-mono text-slate-200 mt-0.5">{f.v}</div>
                    </div>
                  ))}
                </div>

                {(evidence.record?.is_late || evidence.record?.is_overtime || evidence.record?.late_reason) && (
                  <div className="flex flex-wrap gap-2">
                    {evidence.record?.is_late && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded">
                        Marked late{evidence.record.late_reason ? `: ${evidence.record.late_reason}` : ""}
                      </span>
                    )}
                    {evidence.record?.is_overtime && (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-1 rounded">
                        Overtime {evidence.record.overtime_hours || 0}h
                      </span>
                    )}
                  </div>
                )}

                {/* Location — the GPS fix the punch was recorded at, and the REAL
                    geofence verdict. With no perimeter configured there is no
                    verdict, and that is stated rather than shown as a pass. */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recorded location at check-in</span>
                  </div>
                  {evidence.record?.check_in_lat != null && evidence.record?.check_in_lng != null ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-slate-200">
                          {Number(evidence.record.check_in_lat).toFixed(6)}, {Number(evidence.record.check_in_lng).toFixed(6)}
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${evidence.record.check_in_lat},${evidence.record.check_in_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline"
                        >
                          Open in Google Maps ↗
                        </a>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {evidence.geofence?.configured ? (
                          evidence.geofence.inside_on_check_in === true ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded">
                              <ShieldCheck className="h-3 w-3" /> Inside the workshop perimeter
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-1 rounded">
                              <ShieldAlert className="h-3 w-3" /> Outside the workshop perimeter
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            No workshop perimeter is configured, so no geofence verdict exists for this punch.
                          </span>
                        )}
                        {evidence.geofence?.distance_from_centre_m != null && (
                          <span className="text-[10px] text-slate-400">
                            {evidence.geofence.distance_from_centre_m} m from the perimeter centre
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-400">
                      No GPS fix was recorded with this punch — the location cannot be verified.
                    </p>
                  )}
                </div>

                {Array.isArray(evidence.audit_trail) && evidence.audit_trail.length > 0 && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      What has already happened to this record
                    </div>
                    <div className="space-y-1.5">
                      {evidence.audit_trail.map((a: any, i: number) => {
                        const after = safeJson(a.after_json);
                        return (
                          <div key={i} className="text-[11px] text-slate-400 flex flex-wrap items-baseline gap-x-2">
                            <span className="font-mono text-slate-500">{fmtIst(a.created_at)}</span>
                            <span className="font-bold text-slate-300">{String(a.action || "EDIT").replace(/_/g, " ")}</span>
                            {a.changed_by && <span>by {a.changed_by}</span>}
                            {after && (
                              <span className="text-slate-500">
                                → in <span className="font-mono">{after.check_in || "—"}</span>, out{" "}
                                <span className="font-mono">{after.check_out || "—"}</span>
                              </span>
                            )}
                            {!a.before_json && (
                              <span className="text-slate-600 italic">(no previous value captured)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800">
                  <p className="text-[10px] text-slate-500 max-w-md">
                    Approving flips the approval flag only. It does{" "}
                    <span className="text-slate-300 font-bold">not</span> change the recorded check-in time, photo or
                    location.
                  </p>
                  <div className="flex justify-end gap-2 shrink-0">
                    <button
                      onClick={() => setReviewRow(null)}
                      disabled={approving}
                      className="ds-button-secondary px-4 py-2 text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    {evidence.record?.is_approved === true ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> Already approved
                      </span>
                    ) : evidence.viewer?.may_approve && evidence.record?.check_in ? (
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="ds-button-success flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {approving ? <FunnySpinner className="h-3 w-3" /> : <ThumbsUp className="h-3 w-3" />}
                        Approve Attendance
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-3 py-2 text-[11px] text-slate-500">
                        Your role cannot approve attendance.
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
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
              className="ds-button-secondary absolute -top-3 -right-3 w-8 h-8 rounded-full   text-white border border-slate-700 font-bold flex items-center justify-center   shadow-xl transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
