import React, { useMemo } from "react";
import { Sparkles, ArrowRight, CheckCircle2, ChevronRight, XCircle } from "lucide-react";

export interface MockAIRecommendation {
  id: string;
  vehicle: string;
  suggestedBay: string;
  suggestedTechnician: string;
  predictedTat: string;
  predictedEtd: string;
  confidence: string;
  reason: string;
}

export interface AIRecommendationPanelProps {
  recommendations?: MockAIRecommendation[];
  onApplyOverride?: (id: string) => void;
  isLoading?: boolean;
  hasError?: boolean;
}

export const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = React.memo(({
  recommendations = [],
  onApplyOverride,
  isLoading = false,
  hasError = false,
}) => {
  const defaultRecs = useMemo<MockAIRecommendation[]>(() => [
    {
      id: "ai-1",
      vehicle: "Tata Nexon EV (MH12TM9090)",
      suggestedBay: "Bay 3 (EV specialized)",
      suggestedTechnician: "Sanjay Patel (EV Specialist)",
      predictedTat: "45 mins",
      predictedEtd: "18:30 PM",
      confidence: "96%",
      reason: "Drivetrain isolation error code requires specialized insulation test equipment matches Sanjay's Gold CPSC Tier and Bay 3's high-voltage isolation gear."
    },
    {
      id: "ai-2",
      vehicle: "Tata Safari (KA03MM1234)",
      suggestedBay: "Bay 1 (Heavy Lift)",
      suggestedTechnician: "Alex Carter (Senior Mechanic)",
      predictedTat: "90 mins",
      predictedEtd: "19:15 PM",
      confidence: "91%",
      reason: "Front suspension strut replacement aligns with heavy lift requirements and Alex's high turnaround safety record."
    }
  ], []);

  const activeRecs = recommendations.length > 0 ? recommendations : defaultRecs;

  if (hasError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
        Failed to load AI recommendations.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 animate-pulse">
        <div className="h-4 w-40 bg-slate-800 rounded" />
        <div className="h-20 w-full bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4 shrink-0">
        <Sparkles className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Gemma-4 Layout Optimizations</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
        {activeRecs.map((rec) => (
          <div key={rec.id} className="border border-slate-800 rounded-xl p-3 bg-slate-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200">{rec.vehicle}</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
                {rec.confidence} Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-800/40 py-2.5">
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Bay Recommendation</p>
                <p className="font-bold text-slate-300 mt-0.5">{rec.suggestedBay}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Technician Assignment</p>
                <p className="font-bold text-slate-300 mt-0.5">{rec.suggestedTechnician}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{rec.reason}</p>

            <div className="flex items-center justify-between pt-1 border-t border-slate-850">
              <div className="text-[9px] text-slate-500 font-semibold uppercase">
                Est. TAT: <span className="text-emerald-400 font-bold font-mono">{rec.predictedTat}</span>
              </div>
              {onApplyOverride && (
                <button
                  onClick={() => onApplyOverride(rec.id)}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-md transition-colors flex items-center gap-1"
                >
                  Apply Recommendation <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

AIRecommendationPanel.displayName = "AIRecommendationPanel";
