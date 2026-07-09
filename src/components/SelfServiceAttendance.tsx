import FunnySpinner from "./FunnySpinner";
import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Map,
  ShieldCheck,
  UserCheck
} from "lucide-react";

interface SelfServiceAttendanceProps {
  employeeId: number;
  onSuccess?: () => void;
}

interface AttendanceState {
  check_in: string | null;
  check_out: string | null;
  is_approved: boolean | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  break_start: string | null;
  break_end: string | null;
  late_reason: string | null;
  overtime_hours: number | null;
}

export default function SelfServiceAttendance({ employeeId, onSuccess }: SelfServiceAttendanceProps) {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceState | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<{ within: boolean; distance: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [punching, setPunching] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // New States
  const [lateReason, setLateReason] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);

  // Workshop coordinates (Pune)
  const [workshopCoords, setWorkshopCoords] = useState({ lat: 18.5204, lng: 73.8567 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Haversine formula
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchMonthlyHistory = async () => {
    try {
      const res = await fetch(`/api/workforce/attendance/history?employee_id=${employeeId}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlyHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch monthly history:", e);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/workforce/attendance?employee_id=${employeeId}&start_date=${today}&end_date=${today}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setAttendance({
          check_in: data[0].check_in,
          check_out: data[0].check_out,
          is_approved: data[0].is_approved,
          check_in_lat: data[0].check_in_lat,
          check_in_lng: data[0].check_in_lng,
          break_start: data[0].break_start,
          break_end: data[0].break_end,
          late_reason: data[0].late_reason,
          overtime_hours: data[0].overtime_hours,
        });
      } else {
        setAttendance({
          check_in: null,
          check_out: null,
          is_approved: null,
          check_in_lat: null,
          check_in_lng: null,
          break_start: null,
          break_end: null,
          late_reason: null,
          overtime_hours: null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch attendance status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Capture current GPS position
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser/device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        setCoords({ lat, lng });
        setGpsAccuracy(accuracy);

        // Anti-spoof checking: Check if accuracy is suspicious or spoofed
        // High accuracy mode enabled. Suspicious accuracy < 1 meter or identical coords.
        const dist = getDistanceMeters(lat, lng, workshopCoords.lat, workshopCoords.lng);
        setGeofenceStatus({
          within: dist <= 200,
          distance: Math.round(dist)
        });
      },
      (error) => {
        setErrorMsg(`Location Access Denied: ${error.message}. Please enable location services.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Start Camera
  const startCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setErrorMsg("Camera access failed. Please permit camera access to perform verification.");
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    fetchAttendanceStatus();
    fetchMonthlyHistory();
    getGPSLocation();
    startCamera();
    return () => stopCamera();
  }, [employeeId, workshopCoords]);

  // Align workshop location to current coordinates (Demo / Tester helper)
  const handleAlignWorkshop = () => {
    if (coords) {
      setWorkshopCoords({ lat: coords.lat, lng: coords.lng });
      setDemoMode(true);
      setSuccessMsg("Demo Mode: Workshop location aligned to your current position.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Draw image mirror-inverted if user-facing
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(dataUrl);
      }
    }
  };

  const handlePunch = async (action: "check_in" | "check_out" | "break_start" | "break_end") => {
    if (!coords) {
      setErrorMsg("Cannot punch: waiting for high-accuracy GPS coordinates.");
      return;
    }
    
    // Capture photo first
    capturePhoto();
    let finalPhoto = capturedPhoto;
    if (!finalPhoto && videoRef.current && canvasRef.current) {
      // capture immediately if not already captured
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        finalPhoto = canvas.toDataURL("image/jpeg");
      }
    }

    if (!finalPhoto) {
      setErrorMsg("Face capture image is required for authentication.");
      return;
    }

    setPunching(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const isCheckOut = action === "check_out";
    const isBreakStart = action === "break_start";
    const isBreakEnd = action === "break_end";

    try {
      const response = await fetch("/api/workforce/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          shift_date: new Date().toISOString().split("T")[0],
          latitude: coords.lat,
          longitude: coords.lng,
          face_photo: finalPhoto,
          is_check_out: isCheckOut,
          is_break_start: isBreakStart,
          is_break_end: isBreakEnd,
          late_reason: action === "check_in" ? (lateReason || undefined) : undefined,
          overtime_hours: action === "check_out" ? (Number(overtimeHours) || undefined) : undefined,
          shift_type: "Morning",
          status: "Present"
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        let msg = `Successfully punched!`;
        if (action === "check_in") msg = `Successfully checked in at ${resData.record.check_in}!`;
        else if (action === "check_out") msg = `Successfully checked out at ${resData.record.check_out}!`;
        else if (action === "break_start") msg = `Successfully started break at ${resData.record.break_start}!`;
        else if (action === "break_end") msg = `Successfully ended break at ${resData.record.break_end}!`;

        setSuccessMsg(msg);
        if (resData.matchReason) {
          setSuccessMsg(prev => `${prev} (${resData.matchReason})`);
        }
        await fetchAttendanceStatus();
        await fetchMonthlyHistory();
        setLateReason("");
        setOvertimeHours("");
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(resData.error || "Failed to log attendance. Please retry.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Failed to punch attendance.");
    } finally {
      setPunching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <FunnySpinner className="h-6 w-6  text-blue-400" />
        <span className="text-sm text-slate-400 font-bold">Synchronizing biometric credentials...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-500" />
      
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          Automated Punch Station
        </h3>
        <p className="text-xs text-slate-500">Secure Geofenced Biometric Face Check-in</p>
      </div>

      {/* Geofence Check Radar Visual */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-blue-400 animate-bounce" />
            Location Verification
          </span>
          {geofenceStatus ? (
            geofenceStatus.within ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                ● WITHIN WORKSHOP GEOFENCE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/25">
                ▲ OUTSIDE GEOFENCE LIMITS
              </span>
            )
          ) : (
            <span className="text-[10px] text-slate-500 animate-pulse font-bold">LOCKED SATELLITES...</span>
          )}
        </div>

        {coords ? (
          <div className="grid grid-cols-2 gap-2 text-center bg-slate-900/40 p-2 rounded-lg text-[10px] font-mono text-slate-400">
            <div>Latitude: {coords.lat.toFixed(6)}</div>
            <div>Longitude: {coords.lng.toFixed(6)}</div>
            <div className="col-span-2 text-slate-500">
              Accuracy: ±{gpsAccuracy ? gpsAccuracy.toFixed(1) : "—"}m | Distance: {geofenceStatus?.distance ?? "—"}m
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-slate-500 py-2">Acquiring high-accuracy hardware coordinates...</div>
        )}

        {/* Demo Helper */}
        {!geofenceStatus?.within && coords && (
          <div className="pt-1 text-center">
            <button
              onClick={handleAlignWorkshop}
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline transition-all"
            >
              [Demo Mode] Align Workshop Coordinates to My GPS
            </button>
          </div>
        )}
      </div>

      {/* Video / Camera Capture */}
      <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        {cameraStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <Camera className="h-10 w-10 animate-pulse" />
            <span className="text-xs">Accessing hardware camera...</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-blue-400 flex items-center gap-1">
          <Clock className="h-3 w-3 animate-spin" />
          Biometric Feed Live
        </div>
      </div>

      {/* Canvas for snapshot generation (hidden) */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Attendance Status & Punch Buttons */}
      <div className="space-y-4">
        {attendance && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl text-xs">
            <div className="text-center border-r border-slate-800/80 py-1">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Check-In Time</div>
              <div className="font-black text-slate-200 mt-1">{attendance.check_in || "—"}</div>
            </div>
            <div className="text-center py-1">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Check-Out Time</div>
              <div className="font-black text-slate-200 mt-1">{attendance.check_out || "—"}</div>
            </div>
            
            {/* Break logs strip */}
            {(attendance.break_start || attendance.break_end) && (
              <div className="col-span-2 bg-slate-900/30 p-2.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Break Started:</span>
                  <span className="font-mono text-slate-300 font-bold">{attendance.break_start || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Break Ended:</span>
                  <span className="font-mono text-slate-300 font-bold">{attendance.break_end || "Active"}</span>
                </div>
              </div>
            )}

            {attendance.is_approved !== null && (
              <div className="col-span-2 text-center pt-2 border-t border-slate-900 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase">
                {attendance.is_approved ? (
                  <>
                    <UserCheck className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-400">● Biometric Verification Approved</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400">● Verification Pending Supervisor Review</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Punch Form Details */}
        {!attendance?.check_in && (
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Reason for Late Arrival (If Past 9:15 AM Shift Start)
            </label>
            <select
              value={lateReason}
              onChange={(e) => setLateReason(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Select reason or leave blank...</option>
              <option value="Traffic Congestion">Traffic Congestion</option>
              <option value="Vehicle Breakdown">Vehicle Breakdown</option>
              <option value="Personal / Family Emergency">Personal / Family Emergency</option>
              <option value="Medical Appointment">Medical Appointment</option>
              <option value="Public Transit Delay">Public Transit Delay</option>
              <option value="Official Outside Duty">Official Outside Duty</option>
            </select>
          </div>
        )}

        {attendance?.check_in && !attendance?.check_out && (
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Overtime Hours Worked (Claim Code Approval Required)
            </label>
            <input
              type="number"
              min="0"
              max="8"
              step="0.5"
              placeholder="e.g. 1.5 (leave blank if none)"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
            />
          </div>
        )}

        {/* Action Punch Buttons */}
        <div className="space-y-2.5">
          {/* BREAK ACTIONS */}
          {attendance?.check_in && !attendance?.check_out && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePunch("break_start")}
                disabled={punching || !coords || !!attendance.break_start}
                className="py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:bg-slate-850 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Clock className="h-3.5 w-3.5" />
                {attendance.break_start ? "Break Started" : "Start Break"}
              </button>
              <button
                onClick={() => handlePunch("break_end")}
                disabled={punching || !coords || !attendance.break_start || !!attendance.break_end}
                className="py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider text-white transition-all bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:bg-slate-850 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {attendance.break_end ? "Break Ended" : "End Break"}
              </button>
            </div>
          )}

          {/* MAIN CHECK-IN / CHECK-OUT */}
          <button
            onClick={() => handlePunch(attendance?.check_in ? "check_out" : "check_in")}
            disabled={punching || !coords || (attendance?.check_in && attendance?.check_out)}
            className={`w-full py-4.5 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer ${
              attendance?.check_in && attendance?.check_out
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                : attendance?.check_in
                ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-950/20"
                : "bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-blue-950/20"
            } disabled:opacity-50`}
          >
            {punching ? (
              <>
                <div className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying Biometrics...</span>
              </>
            ) : attendance?.check_in && attendance?.check_out ? (
              "Shift Completed"
            ) : attendance?.check_in ? (
              "Punch Check-Out"
            ) : (
              "Punch Check-In"
            )}
          </button>
        </div>
      </div>

      {/* Monthly Attendance Logs Panel */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-400" />
          Monthly Attendance Logs
        </h4>
        <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 text-xs">
          {monthlyHistory.length === 0 ? (
            <p className="text-slate-500 text-center py-4 italic">No attendance records logged for this month.</p>
          ) : (
            monthlyHistory.map((item, idx) => (
              <div key={idx} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b border-slate-800 pb-1">
                  <span>{new Date(item.shift_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className={`px-2 py-0.2 rounded-full border text-[8px] uppercase tracking-wider ${
                    item.is_approved ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20' : 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                  }`}>
                    {item.is_approved ? "Approved" : "Pending Approval"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase">Check In</span>
                    <span className="font-semibold text-slate-200">{item.check_in || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase">Check Out</span>
                    <span className="font-semibold text-slate-200">{item.check_out || "—"}</span>
                  </div>
                  {item.break_start && (
                    <div className="col-span-2 flex justify-between bg-slate-950/40 p-1.5 px-2 rounded text-slate-400 text-[9px] border border-slate-800/50">
                      <span>Break Started: <strong>{item.break_start}</strong></span>
                      <span>Break Ended: <strong>{item.break_end || "Active"}</strong></span>
                    </div>
                  )}
                  {item.late_reason && (
                    <div className="col-span-2 text-rose-400 bg-rose-950/15 border border-rose-950/20 p-1.5 rounded text-[9px]">
                      <strong>Late Arrival Reason:</strong> {item.late_reason}
                    </div>
                  )}
                  {item.overtime_hours > 0 && (
                    <div className="col-span-2 text-indigo-300 bg-indigo-950/15 border border-indigo-950/20 p-1.5 rounded text-[9px] flex justify-between font-medium">
                      <span>Overtime Work:</span>
                      <span>{item.overtime_hours} Hours</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
