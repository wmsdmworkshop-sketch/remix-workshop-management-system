import React from "react";
import { User, Car, AlertCircle, Clock, ShieldCheck, MapPin, Wrench, ListOrdered, Calendar } from "lucide-react";

export interface PreviewData {
  customerName: string;
  customerMobile: string;
  vrn: string;
  make: string;
  model: string;
  complaint: string;
  advisor: string;
  priority: "Normal" | "Express";
  estimatedTat: string;
  suggestedBay: string;
  suggestedTechnician: string;
  queue: string;
  estimatedDelivery: string;

  // Phase 7.1J Reception AI fields
  previousHistory: string;
  repeatComplaint: string;
  warranty: string;
  fsb: string;
  campaign: string;
  advisorRecommendation: string;
  technicianRecommendation: string;
  bayRecommendation: string;
  predictedTat: string;
  confidence: string; // e.g. "95%"
  explainability: string;
  overrideStatus: string; // e.g., "Standard (No Override)" or "Overridden by Supervisor"
}

export interface JobCardPreviewProps {
  data?: PreviewData | null;
  isLoading?: boolean;
  error?: string | null;
  onClose?: () => void;
}

export default function JobCardPreview({
  data = null,
  isLoading = false,
  error = null,
  onClose,
}: JobCardPreviewProps) {
  if (isLoading) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3 animate-pulse">
        <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto text-orange-500">
          <Clock className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Compiling live workspace telemetry...</p>
        <p className="text-xs text-slate-500">Calculating TAT & routing metrics via Gemma-4 AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-slate-950 border border-red-900/50 rounded-2xl text-center space-y-2" role="alert">
        <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-sm font-bold text-red-400">Preview Failure</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 bg-slate-900/50 backdrop-blur-xs text-center border-2 border-dashed border-slate-800 rounded-2xl">
        <Wrench className="h-8 w-8 text-slate-700 mx-auto mb-2.5" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No active details compiled</p>
        <p className="text-[10px] text-slate-500 mt-1">Fill out the vehicle & complaint registration form to render a live preview.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 text-white rounded-2xl border border-slate-850 shadow-2xl overflow-hidden max-w-2xl w-full mx-auto" aria-label="Job Card Preview Dialog">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-xs">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Reception AI Integration Preview</h3>
            <p className="text-[10px] text-white/70 font-semibold">Gemma-4 Intelligent Diagnostic Dashboard</p>
          </div>
        </div>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg font-black transition-colors focus:outline-none p-1"
          >
            ×
          </button>
        )}
      </div>

      <div className="p-5 space-y-5 text-xs max-h-[80dvh] overflow-y-auto">
        {/* Core Vehicle Info Slip */}
        <div className="grid grid-cols-2 gap-4 border-b border-slate-900 pb-4">
          <div>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black block mb-0.5">Customer & VRN</span>
            <p className="font-bold text-slate-200">{data.customerName} ({data.customerMobile})</p>
            <p className="text-[10px] text-orange-400 font-bold font-mono mt-0.5 uppercase">{data.vrn}</p>
          </div>
          <div>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black block mb-0.5">Vehicle Profile</span>
            <p className="font-bold text-slate-200">{data.make} {data.model}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Estimated ETD: {data.estimatedDelivery}</p>
          </div>
        </div>

        {/* --- GEMMA-4 RECEPTION AI ANALYTICS --- */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                🧠 Gemma-4 Diagnostic & Routing Engine
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] uppercase font-black text-slate-450">Confidence:</span>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {data.confidence}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Historical Profile */}
            <div className="space-y-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
              <span className="text-[8.5px] uppercase font-black text-slate-400 block border-b border-slate-800 pb-1">
                Vehicle Telemetry & History
              </span>
              <div className="space-y-2">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Previous History</span>
                  <span className="text-slate-200 font-semibold">{data.previousHistory}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Repeat Complaint Status</span>
                  <span className={`font-black ${data.repeatComplaint.toLowerCase().includes("yes") || data.repeatComplaint.toLowerCase().includes("rework") ? "text-amber-400 animate-pulse" : "text-emerald-400"}`}>
                    {data.repeatComplaint}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Warranty Details</span>
                  <span className="text-slate-200 font-semibold">{data.warranty}</span>
                </div>
              </div>
            </div>

            {/* Campaign & Bulletins */}
            <div className="space-y-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
              <span className="text-[8.5px] uppercase font-black text-slate-400 block border-b border-slate-800 pb-1">
                Recalls & Service Bulletins
              </span>
              <div className="space-y-2">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Field Service Bulletins (FSB)</span>
                  <span className="text-slate-200 font-semibold">{data.fsb}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Recall Campaigns</span>
                  <span className="text-slate-200 font-semibold">{data.campaign}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Override Status</span>
                  <span className="text-slate-200 font-mono font-bold text-[9px] bg-slate-800 px-1 py-0.5 rounded border border-slate-700">
                    {data.overrideStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Routing Recommendations */}
            <div className="space-y-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850 md:col-span-2">
              <span className="text-[8.5px] uppercase font-black text-slate-400 block border-b border-slate-800 pb-1">
                AI Optimization Recommendations
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Advisor Rec</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{data.advisorRecommendation}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Technician Rec</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{data.technicianRecommendation}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Bay Rec</span>
                  <span className="text-slate-200 font-semibold block mt-0.5">{data.bayRecommendation}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block font-bold">Predicted TAT</span>
                  <span className="text-emerald-400 font-bold block mt-0.5">{data.predictedTat}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Explainability & Justification */}
          <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg space-y-1">
            <span className="text-[8px] uppercase font-black text-emerald-400 tracking-wider block">
              💡 Explainability Justification
            </span>
            <p className="text-[10px] text-slate-350 leading-relaxed italic">
              {data.explainability}
            </p>
          </div>
        </div>

        {/* Original Complaint Log */}
        <div className="space-y-1">
          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black block">Logged Complaint Description</span>
          <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 text-slate-350 leading-relaxed italic whitespace-pre-wrap">
            {data.complaint || "No description logged."}
          </div>
        </div>
      </div>
    </div>
  );
}
