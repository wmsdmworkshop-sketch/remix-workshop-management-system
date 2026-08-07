import React, { useState, useEffect } from "react";
import { TrendingUp, Clock, DollarSign, Activity, Percent, Award, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function BusinessImpactTracker() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/pilot/roi")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMetrics(data.metrics);
        }
        setLoading(false);
      })
      .catch(err => console.error("ROI fetch failed:", err));
  }, []);

  const dummyGrowthData = [
    { name: "Labour Revenue", current: 48000, target: 40000 },
    { name: "Parts Revenue", current: 152000, target: 120000 }
  ];

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-orange-500 mr-2" />
        <span>Computing business impact metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Summary KPI grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Pilot Revenue</span>
            <h4 className="text-2xl font-extrabold text-green-500 mt-1">₹{metrics.totalRevenue.toLocaleString()}</h4>
            <p className="text-[10px] text-green-400 mt-0.5">Includes parts & labour splits</p>
          </div>
          <DollarSign className="w-8 h-8 text-green-600/30" />
        </div>

        {/* AI Time Saved */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Time Saved by AI</span>
            <h4 className="text-2xl font-extrabold text-blue-500 mt-1">{(metrics.aiTimeSavedMinutes / 60).toFixed(1)} hrs</h4>
            <p className="text-[10px] text-blue-400 mt-0.5">{metrics.aiTimeSavedMinutes} total minutes saved</p>
          </div>
          <Clock className="w-8 h-8 text-blue-600/30" />
        </div>

        {/* Tech Productivity */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Technician Productivity</span>
            <h4 className="text-2xl font-extrabold text-purple-500 mt-1">{metrics.technicianProductivityPercent}%</h4>
            <p className="text-[10px] text-purple-400 mt-0.5">Average across active bays</p>
          </div>
          <Percent className="w-8 h-8 text-purple-600/30" />
        </div>

        {/* Fleet Retention */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fleet Retention Index</span>
            <h4 className="text-2xl font-extrabold text-orange-500 mt-1">{metrics.fleetRetentionIndex}%</h4>
            <p className="text-[10px] text-orange-400 mt-0.5">Up +2.5% since P1 boot</p>
          </div>
          <Award className="w-8 h-8 text-orange-600/30" />
        </div>
      </div>

      {/* Charts & Splits */}
      <div className="grid grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-slate-300">Revenue Performance vs Target Goals</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dummyGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" fontSize={12} />
                <YAxis stroke="#475569" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                <Bar dataKey="current" fill="#f97316" radius={[4, 4, 0, 0]} name="Actual Revenue (₹)" />
                <Bar dataKey="target" fill="#475569" radius={[4, 4, 0, 0]} name="Target Baseline (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Efficiency */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
          <h3 className="text-lg font-semibold text-slate-300">Operational Gains</h3>
          
          <div className="space-y-4">
            {/* Bay Utilization */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Active Bay Utilization</span>
                <span className="font-bold text-orange-400">{metrics.bayUtilizationRate}%</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full" style={{ width: `${metrics.bayUtilizationRate}%` }} />
              </div>
            </div>

            {/* Repeat Complaints */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Repeat Complaints Rate</span>
                <span className="font-bold text-green-400">{metrics.repeatComplaintsRate}%</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                {/* Lower is better, render green */}
                <div className="bg-green-500 h-full" style={{ width: `${metrics.repeatComplaintsRate * 10}%` }} />
              </div>
            </div>

            {/* Customer CSAT/NPS */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Customer CSAT Rating</span>
                <span className="font-bold text-blue-400">{metrics.customerRetentionIndex}%</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${metrics.customerRetentionIndex}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
