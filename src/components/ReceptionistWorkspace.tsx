import React, { useState, useEffect, useMemo } from "react";
import { 
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, Search, Filter, 
  ShieldAlert, RefreshCw, ChevronRight, FileText, Gauge, User, Check, ArrowRight,
  Camera, ImageOff, X
} from "lucide-react";

export interface ReceptionistWorkspaceProps {
  currentUser?: any;
  onRefresh?: () => void;
}

export const ReceptionistWorkspace: React.FC<ReceptionistWorkspaceProps> = React.memo(({
  currentUser,
  onRefresh
}) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArrival, setSelectedArrival] = useState<any | null>(null);
  // Full-size gate-photo viewer. Holds the arrival whose photo is open.
  const [photoViewer, setPhotoViewer] = useState<any | null>(null);

  // Intake modal form states
  const [visitCategory, setVisitCategory] = useState<string>("Scheduled Service");
  const [preliminaryComplaints, setPreliminaryComplaints] = useState<string>("");
  const [confirmedOdometer, setConfirmedOdometer] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/pipeline/reception/queue", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch reception queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenIntakeModal = (arrival: any) => {
    setSelectedArrival(arrival);
    setConfirmedOdometer(arrival.odometer || 0);
    setCorrectionReason("");
  };

  const handleSubmitIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArrival) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/pipeline/reception/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          gateEntryId: selectedArrival.gateEntryId,
          visitCategory,
          preliminaryComplaints,
          confirmedOdometer: Number(confirmedOdometer),
          correctionReason: confirmedOdometer !== selectedArrival.odometer ? correctionReason : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✨ Intake accepted! Token ${data.data?.tokenNumber} generated and vehicle pushed to Manager Assignment Queue.`);
        setSelectedArrival(null);
        fetchQueue();
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        alert(`Failed to accept intake: ${err.error || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Intake acceptance error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6 pb-24" lang="en">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-black text-xl">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400">
                RECEPTION DESK • MY WORKSPACE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active Queue
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {currentUser?.full_name || currentUser?.name || currentUser?.username || "Receptionist"}
            </h1>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* MY NEW ARRIVALS Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              MY NEW ARRIVALS ({queue.length})
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            5-Minute Handoff SLA Monitored
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No pending vehicle arrivals.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All Security Gate-In arrivals have been accepted by Reception.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map(item => (
              <div 
                key={item.gateEntryId}
                className={`p-4 rounded-2xl border transition-all space-y-3 shadow-lg ${
                  item.isBreached 
                    ? "bg-red-950/20 border-red-500/40" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-base font-black text-white block">
                      {item.vrn}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Gate ID: {item.gateEntryId}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    item.isBreached 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}>
                    {item.isBreached ? "SLA BREACHED" : "AWAITING INTAKE"}
                  </span>
                </div>

                {/* Gate photo. Absent for most historic arrivals (no evidence row
                    was ever linked to a gate entry before this was built), and
                    on Cloud Run the local-disk fallback is wiped on each deploy
                    — so the empty state is the honest common case, never a
                    placeholder image or a broken <img>. */}
                {item.photoUrl ? (
                  <button
                    type="button"
                    onClick={() => setPhotoViewer(item)}
                    className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500/60 transition-all group cursor-pointer"
                    title="View full-size gate photo"
                  >
                    <img
                      src={item.photoUrl}
                      alt={`Gate capture for ${item.vrn}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // The file is gone (deploy wiped the disk). Say so
                        // rather than showing a broken image icon.
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const parent = el.parentElement;
                        if (parent && !parent.querySelector("[data-photo-missing]")) {
                          const note = document.createElement("div");
                          note.setAttribute("data-photo-missing", "1");
                          note.className = "absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 bg-slate-950/60 font-bold uppercase tracking-wider";
                          note.textContent = "Photo no longer stored";
                          parent.appendChild(note);
                        }
                      }}
                    />
                    <span className="absolute top-1.5 left-1.5 text-[9px] font-black uppercase tracking-wider bg-slate-950/80 text-blue-300 px-1.5 py-0.5 rounded">
                      <Camera className="h-2.5 w-2.5 inline mr-0.5 -mt-0.5" />
                      {item.photoType || "GATE PHOTO"}
                    </span>
                    {item.ocrConfidence != null && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold bg-slate-950/80 text-slate-300 px-1.5 py-0.5 rounded">
                        {Math.round(item.ocrConfidence * 100)}%
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="w-full h-10 rounded-xl border border-dashed border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <ImageOff className="h-3 w-3" />
                    No gate photo captured
                  </div>
                )}

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 text-xs space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Captured Odometer:</span>
                    <span className="font-mono font-bold text-slate-200">{item.odometer || 0} km</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Entry Source:</span>
                    <span className="font-bold text-blue-400">{item.source || "OCR"}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Waiting Time:</span>
                    <span className={`font-mono font-bold ${item.isBreached ? "text-red-400" : "text-amber-400"}`}>
                      {item.waitingMins} mins {item.isBreached ? "(Escalated)" : ""}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenIntakeModal(item)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>ACCEPT VEHICLE</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intake Modal */}
      {selectedArrival && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">STAGE 03-06 RECEPTION INTAKE</span>
                <h3 className="text-lg font-black text-white">{selectedArrival.vrn}</h3>
              </div>
              <button onClick={() => setSelectedArrival(null)} className="text-slate-400 hover:text-slate-200 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmitIntake} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preliminary Visit Category</label>
                <select
                  value={visitCategory}
                  onChange={(e) => setVisitCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  {[
                    "General Check-up", "Free Service", "Scheduled Service", "Running Repair",
                    "Warranty Complaint", "Breakdown Follow-up", "Accidental Repair", "Campaign", "Aggregate Complaint", "Other"
                  ].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preliminary Complaints & Remarks</label>
                <textarea
                  rows={3}
                  value={preliminaryComplaints}
                  onChange={(e) => setPreliminaryComplaints(e.target.value)}
                  placeholder="Customer reported complaints, noise issues, maintenance requests..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none resize-none"
                />
              </div>

              {/* The gate photo, here so the receptionist verifies against the
                  actual image rather than confirming a number blind. The photo
                  may be a dashboard shot read for both plate and odometer, so
                  its type is labelled rather than assumed. */}
              {selectedArrival.photoUrl && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      Gate capture — {selectedArrival.photoType || "photo"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoViewer(selectedArrival)}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase cursor-pointer"
                    >
                      View full size
                    </button>
                  </div>
                  <img
                    src={selectedArrival.photoUrl}
                    alt={`Gate capture for ${selectedArrival.vrn}`}
                    className="w-full max-h-52 object-contain rounded-lg bg-slate-900 cursor-zoom-in"
                    onClick={() => setPhotoViewer(selectedArrival)}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                  {(selectedArrival.ocrReadVrn || selectedArrival.ocrReadOdometer != null) && (
                    <div className="text-[10px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-850">
                      <p className="font-bold uppercase tracking-wider text-slate-500">What the camera read</p>
                      {selectedArrival.ocrReadVrn && (
                        <div className="flex justify-between">
                          <span>Plate:</span>
                          <span className="font-mono text-slate-300">{selectedArrival.ocrReadVrn}</span>
                        </div>
                      )}
                      {selectedArrival.ocrReadOdometer != null && (
                        <div className="flex justify-between">
                          <span>Odometer:</span>
                          <span className="font-mono text-slate-300">{selectedArrival.ocrReadOdometer} km</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Security OCR Odometer:</span>
                  <span className="font-mono font-bold text-slate-300">{selectedArrival.odometer || 0} km</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirmed Odometer (km)</label>
                  <input
                    type="number"
                    value={confirmedOdometer}
                    onChange={(e) => setConfirmedOdometer(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white"
                  />
                </div>
                {confirmedOdometer !== selectedArrival.odometer && (
                  <div>
                    <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Correction Reason (Required)</label>
                    <input
                      type="text"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="OCR misread digit / Instrument cluster verification..."
                      required
                      className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedArrival(null)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  {submitting ? "Processing Intake..." : "Complete Intake & Push to Manager"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Full-size gate photo viewer */}
      {photoViewer && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPhotoViewer(null)}
        >
          <div className="max-w-4xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-lg font-black text-white">{photoViewer.vrn}</span>
                <p className="text-[11px] text-slate-400">
                  {photoViewer.photoType || "Gate photo"}
                  {photoViewer.photoCapturedAt ? ` • ${new Date(photoViewer.photoCapturedAt).toLocaleString()}` : ""}
                  {photoViewer.ocrConfidence != null ? ` • OCR confidence ${Math.round(photoViewer.ocrConfidence * 100)}%` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoViewer(null)}
                className="p-2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close photo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={photoViewer.photoUrl}
              alt={`Gate capture for ${photoViewer.vrn}`}
              className="w-full max-h-[75vh] object-contain rounded-2xl border border-slate-800 bg-slate-900"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

ReceptionistWorkspace.displayName = "ReceptionistWorkspace";
export default ReceptionistWorkspace;
