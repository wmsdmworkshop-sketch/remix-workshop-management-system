import React, { useState, useEffect } from "react";
import {
  Sparkles, CheckCircle2, XCircle, Star, TrendingUp, Clock,
  BarChart3, ShieldAlert, BookOpen, User, RefreshCw
} from "lucide-react";
import { getStaffUserId, staffAuthHeaders } from "../lib/authToken";

interface AICopilotPanelProps {
  role: string;
  context: Record<string, any>;
  onRecommendationApproved?: () => void;
}

export const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ 
  role, 
  context,
  onRecommendationApproved 
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState("");

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/v2/graph/analytics", { headers: staffAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDispatch = async (suggestedPrompt?: string) => {
    setLoading(true);
    setResult(null);
    setRatingSubmitted(false);
    setUserRating(0);
    setFeedbackText("");

    const finalPrompt = suggestedPrompt || prompt;

    try {
      const res = await fetch("/api/v2/graph/recommendations", {
        method: "POST",
        headers: staffAuthHeaders(),
        body: JSON.stringify({ prompt: finalPrompt, role, context })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      }
    } catch (e: any) {
      alert(`Network Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!result?.recommendationId) return;
    // Authoritative authenticated user id. No placeholder/fallback — fail safe.
    const userId = getStaffUserId();
    if (userId == null) {
      alert("You must be signed in to approve a recommendation.");
      return;
    }
    try {
      const res = await fetch(`/api/v2/graph/recommendations/${result.recommendationId}/approve`, {
        method: "POST",
        headers: staffAuthHeaders(),
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setResult((prev: any) => ({ ...prev, status: "APPROVED" }));
        fetchAnalytics();
        if (onRecommendationApproved) onRecommendationApproved();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!result?.recommendationId) return;
    try {
      const res = await fetch(`/api/v2/graph/recommendations/${result.recommendationId}/reject`, {
        method: "POST",
        headers: staffAuthHeaders()
      });
      if (res.ok) {
        setResult((prev: any) => ({ ...prev, status: "REJECTED" }));
        fetchAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRate = async (stars: number) => {
    if (!result?.recommendationId) return;
    setUserRating(stars);
    try {
      await fetch(`/api/v2/graph/recommendations/${result.recommendationId}/rate`, {
        method: "POST",
        headers: staffAuthHeaders(),
        body: JSON.stringify({ rating: stars, comments: feedbackText })
      });
      setRatingSubmitted(true);
      fetchAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  // Pre-configured role recommendations context
  const getSuggestions = () => {
    switch (role) {
      case "Dealer Principal":
        return [
          "Explain strategic profitability growth opportunities",
          "Analyze dealership operational risks"
        ];
      case "GM Service":
        return [
          "Check active service level bottlenecks",
          "Identify parts shortage trends"
        ];
      case "workshop_manager":
      case "Workshop Manager":
        return [
          "Forecast parts reorder limits for EV models",
          "Check rework priority and target list"
        ];
      case "service_advisor":
      case "Service Advisor":
        return [
          "Verify repeat failure campaigns and circulars",
          "Optimize promised ETD delivery commit"
        ];
      case "technician":
      case "Technician":
        return [
          "Fetch repair DNA and torque guidance",
          "Verify wiring wiring loom layouts"
        ];
      case "warranty_advisor":
      case "Warranty Executive":
        return [
          "Check warranty claim approval probability",
          "Review goodwill recovery options"
        ];
      case "spares_manager":
      case "Parts Manager":
        return [
          "Check Fast/Slow moving spare stocks",
          "Forecast critical parts VOR orders"
        ];
      case "fleet_manager":
      case "Fleet Manager":
        return [
          "Analyze fleet relationship health score",
          "Predict steering failure risk in fleet Nexon EVs"
        ];
      case "customer":
      case "Customer":
        return [
          "Verify vehicle health check score",
          "Review pending campaign approvals"
        ];
      default:
        return ["Analyze operational history", "Explain EKG traversal connections"];
    }
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Gemma Hardened Copilot</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Role: {role}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setShowAnalytics(!showAnalytics);
            fetchAnalytics();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Performance Analytics
        </button>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top duration-200">
          <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> AI Hardening KPI Dashboard
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Acceptance Rate</span>
              <span className="text-sm font-black text-emerald-400">{analytics.metrics?.acceptanceRate}%</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Rejection Rate</span>
              <span className="text-sm font-black text-rose-400">{analytics.metrics?.rejectionRate}%</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Avg Confidence</span>
              <span className="text-sm font-black text-blue-400">{analytics.metrics?.averageConfidence}%</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Time Saved</span>
              <span className="text-sm font-black text-amber-400">{analytics.metrics?.timeSavedMinutes}m</span>
            </div>
          </div>
          {analytics.mostUsedSkills && analytics.mostUsedSkills.length > 0 && (
            <div className="space-y-1 bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-left">
              <span className="text-[8px] text-slate-400 font-bold uppercase block">Most Active Marketplace Skills</span>
              {analytics.mostUsedSkills.map((s: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[9px] text-slate-300 py-0.5 border-b border-slate-850 last:border-b-0">
                  <span className="font-bold">{s.skill_name}</span>
                  <span className="text-slate-500">{s.usage_count} uses</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* suggestions */}
      <div className="space-y-1.5">
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Context Suggestions</span>
        <div className="flex flex-wrap gap-2">
          {getSuggestions().map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(s);
                handleDispatch(s);
              }}
              className="text-[10px] px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-300 font-bold text-left transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input 
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Copilot or select a skill above..."
          className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500 transition-all"
        />
        <button
          onClick={() => handleDispatch()}
          disabled={loading || prompt.trim() === ""}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>

      {/* Recommendation Results card */}
      {result && (
        <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-4 shadow-inner animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase">AI Recommendation Output</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                result.status === "PENDING_APPROVAL" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                result.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                result.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}>
                {result.status}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">Confidence: <span className="text-amber-500">{(result.confidence * 100).toFixed(0)}%</span></span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
            {result.message}
          </p>

          {/* Details JSON details */}
          {result.details && (
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-850 text-[10px] text-slate-400 font-mono space-y-1">
              <div className="font-bold text-slate-300 uppercase tracking-wider mb-1">Causal Evidence Log:</div>
              <div>Action: <span className="text-slate-200">{result.details.action}</span></div>
              {result.details.reason && <div>Reason: <span className="text-slate-200">{result.details.reason}</span></div>}
              {result.details.estimatedValue !== undefined && <div>Value: <span className="text-emerald-400 font-bold">₹{result.details.estimatedValue}</span></div>}
              {result.details.claimNo && <div>Claim No: <span className="text-slate-200">{result.details.claimNo}</span></div>}
              {result.details.partNo && <div>Part No: <span className="text-slate-200">{result.details.partNo}</span></div>}
              {result.details.vin && <div>VIN: <span className="text-slate-200">{result.details.vin}</span></div>}
            </div>
          )}

          {/* Human Approval Gate */}
          {result.status === "PENDING_APPROVAL" && (
            <div className="flex gap-2 pt-2 border-t border-slate-900">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve Action
              </button>
              <button
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject & Learn
              </button>
            </div>
          )}

          {/* Learning Feedback Star rating Loop */}
          {(result.status === "EXECUTED" || result.status === "APPROVED" || result.status === "REJECTED") && (
            <div className="pt-3 border-t border-slate-900 space-y-2">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Rate this recommendation to train the graph:</span>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      key={stars}
                      onClick={() => handleRate(stars)}
                      className={`p-0.5 transition-all hover:scale-110 ${
                        stars <= userRating ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      <Star className="h-4 w-4 fill-current" />
                    </button>
                  ))}
                </div>
                {ratingSubmitted ? (
                  <span className="text-[9px] text-emerald-400 font-bold uppercase animate-pulse">Feedback registered! EKG updated.</span>
                ) : (
                  <input
                    type="text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Add comments (optional)..."
                    className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-[10px] focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
