import React, { useState, useEffect } from "react";
import { AlertTriangle, MapPin, Phone, CheckCircle2, Navigation, AlertCircle } from "lucide-react";
import { dispatchSOS } from "../hooks/useCustomerApi";

interface SOSRoadsideAssistModalProps {
  vrn: string;
  onClose: () => void;
}

export const SOSRoadsideAssistModal: React.FC<SOSRoadsideAssistModalProps> = ({
  vrn,
  onClose
}) => {
  const [location, setLocation] = useState("National Highway 65, near Solapur - Gulbarga Toll Plaza");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [issue, setIssue] = useState("Engine Breakdown / Sudden Power Loss");
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ ticketNo?: string; qrtName?: string; etaMinutes?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocation(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Live Location Detected)`);
        },
        () => {
          /* Fallback location kept */
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const handleDispatchSOS = async () => {
    setDispatching(true);
    setError(null);
    try {
      const res = await dispatchSOS({
        vrn,
        location_text: location,
        lat: coords.lat,
        lng: coords.lng,
        issue_type: issue,
      });
      if (res.success) {
        setTicketResult({
          ticketNo: res.ticketNo,
          qrtName: res.qrtName,
          etaMinutes: res.etaMinutes,
        });
        setDispatched(true);
      } else {
        setError(res.error || "SOS dispatch failed.");
      }
    } catch (err: any) {
      setError(err.message || "SOS dispatch failed.");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-rose-700 uppercase">1-Tap Emergency Breakdown Assist</h3>
              <p className="text-[10px] text-slate-500 font-mono">Vehicle: {vrn} • 24/7 Priority Hotline</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2.5 py-1 bg-slate-100 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!dispatched ? (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Detected Live GPS Location</span>
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700 uppercase">Describe Breakdown Issue</label>
              <select
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800"
              >
                <option value="Engine Breakdown / Sudden Power Loss">Engine Breakdown / Sudden Power Loss</option>
                <option value="Flat Tyre / Burst Tyre on Highway">Flat Tyre / Burst Tyre on Highway</option>
                <option value="Battery Dead / Starter Fault">Battery Dead / Starter Fault</option>
                <option value="Brake System Failure">Brake System Failure</option>
                <option value="Fuel Exhaustion / Towing Request">Fuel Exhaustion / Towing Request</option>
              </select>
            </div>

            <button
              onClick={handleDispatchSOS}
              disabled={dispatching}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{dispatching ? "Dispatching Breakdown Team..." : "1-Tap Dispatch Tow Truck & Mobile Tech"}</span>
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl space-y-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-extrabold text-emerald-900 uppercase">Towing Team Dispatched!</h4>
            <p className="text-xs text-emerald-800">
              {ticketResult?.qrtName || "Mobile Assistance Unit"} dispatched for <strong>{vrn}</strong>. Ticket: <strong>{ticketResult?.ticketNo}</strong>. Estimated arrival: <strong>{ticketResult?.etaMinutes || 18} minutes</strong>.
            </p>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Track Live Rescue Team
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

