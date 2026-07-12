import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Camera, Trash2, Check, RefreshCw, Sparkles } from "lucide-react";

export interface InspectionData {
  tyresOk: boolean;
  lightsOk: boolean;
  glassOk: boolean;
  batteryOk: boolean;
  cabinOk: boolean;
  bodyOk: boolean;
  documentsOk: boolean;
  accessoriesOk: boolean;
  fuelPercent: number;
  defPercent: number;
  photos: string[];
  notes: string;
}

export interface InspectionChecklistProps {
  isLoading?: boolean;
  error?: string | null;
  onSubmitInspection?: (data: InspectionData) => void;
}

export default function InspectionChecklist({
  isLoading = false,
  error = null,
  onSubmitInspection,
}: InspectionChecklistProps) {
  const [tyresOk, setTyresOk] = useState(true);
  const [lightsOk, setLightsOk] = useState(true);
  const [glassOk, setGlassOk] = useState(true);
  const [batteryOk, setBatteryOk] = useState(true);
  const [cabinOk, setCabinOk] = useState(true);
  const [bodyOk, setBodyOk] = useState(true);
  const [documentsOk, setDocumentsOk] = useState(true);
  const [accessoriesOk, setAccessoriesOk] = useState(true);
  const [fuelPercent, setFuelPercent] = useState(50);
  const [defPercent, setDefPercent] = useState(70);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulated photo capture and OCR scanner
  const handleCapturePhoto = (zone: string) => {
    setPhotos((prev) => [...prev, `http://localhost:3000/inspections/photo-${zone}-${Date.now()}.jpg`]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: InspectionData = {
      tyresOk,
      lightsOk,
      glassOk,
      batteryOk,
      cabinOk,
      bodyOk,
      documentsOk,
      accessoriesOk,
      fuelPercent,
      defPercent,
      photos,
      notes,
    };
    if (onSubmitInspection) {
      onSubmitInspection(data);
    }
    setSuccessMsg("Inspection checklist validated and compiled successfully!");
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-900 text-slate-400 animate-pulse rounded-2xl border border-slate-800" aria-live="polite">
        Loading inspection wizard specs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-900 text-red-500 rounded-2xl border border-slate-800" role="alert">
        Inspection check error: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-6 max-w-2xl mx-auto" aria-label="Walk Around Inspection Wizard">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="text-orange-500 h-5 w-5" /> Walk-Around Vehicle Inspection
        </h2>
        <p className="text-xs text-slate-400 mt-1">Check vehicle systems, record fuel/DEF levels, and attach check-in photos.</p>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-green-950/20 border border-green-500/30 text-green-400 rounded-xl text-xs flex items-center gap-2" role="status">
          <CheckCircle2 className="h-4 w-4 text-green-500" /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Systems Checklist Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Systems Inspection Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Tyres Check", state: tyresOk, setter: setTyresOk, desc: "Inspect tread wear and pressures" },
              { label: "Exterior Lights & Indicators", state: lightsOk, setter: setLightsOk, desc: "Check headlights and indicator beams" },
              { label: "Glass & Windshield", state: glassOk, setter: setGlassOk, desc: "Verify mirrors and windshield cracks" },
              { label: "Battery Terminals", state: batteryOk, setter: setBatteryOk, desc: "Verify terminal corrosion levels" },
              { label: "Cabin Interiors", state: cabinOk, setter: setCabinOk, desc: "Seats, dashboard status check" },
              { label: "Body Paint & Dents", state: bodyOk, setter: setBodyOk, desc: "Record scratches and outer damage" },
              { label: "Vehicle Documents (RC/Ins)", state: documentsOk, setter: setDocumentsOk, desc: "Validate registration documents" },
              { label: "Accessories (Toolkit/Jack)", state: accessoriesOk, setter: setAccessoriesOk, desc: "Confirm stepney and emergency jack" },
            ].map((item, index) => (
              <div key={index} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => item.setter(!item.state)}
                  className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                    item.state ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                  aria-label={`Toggle status for ${item.label}`}
                >
                  {item.state ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {item.state ? "OK" : "Damage"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sliders for Fuel and DEF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="fuelSlider" className="ds-label text-xs   font-bold uppercase">Fuel Level (%)</label>
              <span className="text-sm font-black text-orange-500">{fuelPercent}%</span>
            </div>
            <input
              id="fuelSlider"
              type="range"
              min="0"
              max="100"
              value={fuelPercent}
              onChange={(e) => setFuelPercent(Number(e.target.value))}
              className="w-full accent-orange-500"
              aria-label="Fuel percentage level slider"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="defSlider" className="ds-label text-xs   font-bold uppercase">Diesel Exhaust Fluid (DEF) (%)</label>
              <span className="text-sm font-black text-blue-500">{defPercent}%</span>
            </div>
            <input
              id="defSlider"
              type="range"
              min="0"
              max="100"
              value={defPercent}
              onChange={(e) => setDefPercent(Number(e.target.value))}
              className="w-full accent-blue-500"
              aria-label="DEF level percentage slider"
            />
          </div>
        </div>

        {/* Photo Upload Deck */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inspection Photo Deck</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Front Profile", zone: "front" },
              { label: "Rear Profile", zone: "rear" },
              { label: "Dashboard/KM", zone: "dash" },
              { label: "Tyres/Underbody", zone: "tyres" },
            ].map((btn, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleCapturePhoto(btn.zone)}
                className="p-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5 transition-all"
                aria-label={`Capture ${btn.label} photo`}
              >
                <Camera className="h-4.5 w-4.5 text-orange-500" />
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Captured Photos List */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {photos.map((url, i) => (
                <div key={i} className="relative group h-14 w-20 bg-slate-900 rounded border border-slate-700 overflow-hidden">
                  <img src={url} alt="Walkaround snap" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400"
                    aria-label="Remove captured inspection photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Note area */}
        <div className="space-y-1">
          <label htmlFor="inspectNotes" className="ds-label text-xs  ">Additional Remarks / Observations</label>
          <textarea
            id="inspectNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any specific observations or note customer instructions..."
            className="w-full h-16 p-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs focus:outline-none focus:border-orange-500"
            aria-label="Inspection additional remarks input"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          Verify & Complete Walk-Around Inspection
        </button>
      </form>
    </div>
  );
}
