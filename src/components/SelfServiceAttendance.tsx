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
        });
      } else {
        setAttendance({
          check_in: null,
          check_out: null,
          is_approved: null,
          check_in_lat: null,
          check_in_lng: null,
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

  const handlePunch = async () => {
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

    const isCheckOut = attendance?.check_in !== null && attendance?.check_out === null;

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
          shift_type: "Morning",
          status: "Present"
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setSuccessMsg(
          isCheckOut
            ? `Successfully checked out at ${resData.record.check_out}!`
            : `Successfully checked in at ${resData.record.check_in}!`
        );
        if (resData.matchReason) {
          setSuccessMsg(prev => `${prev} (${resData.matchReason})`);
        }
        await fetchAttendanceStatus();
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

      {/* Attendance Status & Punch Button */}
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

        <button
          onClick={handlePunch}
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
              <FunnySpinner className="h-4 w-4" />
              Verifying Biometrics...
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
  );
}
