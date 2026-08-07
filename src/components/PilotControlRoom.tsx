import React, { useState, useEffect } from "react";
import { ShieldAlert, Users, Wrench, Activity, AlertOctagon, Cpu, Play, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PilotControlRoom() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/v1/pilot/control-room")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setData(data.metrics);
        }
        setLoading(false);
      })
      .catch(err => console.error("Control room fetch failed:", err));
  }, []);

  const dummyChartData = [
    { name: "Day 1", active: 2, completed: 5, adoption: 40 },
    { name: "Day 2", active: 4, completed: 8, adoption: 55 },
    { name: "Day 3", active: 5, completed: 12, adoption: 70 },
    { name: "Day 4", active: 3, completed: 15, adoption: 82 }
  ];

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-orange-500 mr-2" />
        <span>Loading Control Room telemetry data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Dashboard Top Alerts */}
      <div className="grid grid-cols-4 gap-4">
        {/* Day Count Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pilot Execution Duration</span>
            <h4 className="text-3xl font-extrabold text-orange-500 mt-1">Day {data.pilotDay}</h4>
          </div>
          <Activity className="w-10 h-10 text-orange-600/30" />
        </div>

        {/* Critical Bugs Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Blocker Bugs (Active)</span>
            <h4 className={`text-3xl font-extrabold mt-1 ${data.criticalBugs > 0 ? "text-red-500 animate-pulse" : "text-green-500"}`}>
              {data.criticalBugs}
            </h4>
          </div>
          <AlertOctagon className="w-10 h-10 text-red-600/30" />
        </div>

        {/* Adoption Index Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Staff Onboarding Adoption</span>
            <h4 className="text-3xl font-extrabold text-blue-500 mt-1">{data.adoptionRate}%</h4>
          </div>
          <Users className="w-10 h-10 text-blue-600/30" />
        </div>

        {/* Today's Jobs Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Workshop Load</span>
            <h4 className="text-3xl font-extrabold text-green-500 mt-1">{data.activeJobsToday} Jobs</h4>
          </div>
          <Wrench className="w-10 h-10 text-green-600/30" />
        </div>
      </div>

      {/* Main Grid: Telemetry & Chart */}
      <div className="grid grid-cols-3 gap-6">
        {/* Adoption and Jobs Charts */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-slate-300">Staff Adoption & Load Progression</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dummyChartData}>
                <defs>
                  <linearGradient id="colorAdoption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={12} />
                <YAxis stroke="#475569" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                <Area type="monotone" dataKey="adoption" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAdoption)" name="Staff Adoption %" />
                <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" name="Completed Jobs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Status */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
          <h3 className="text-lg font-semibold text-slate-300">System Telemetry & Health</h3>
          
          <div className="space-y-4">
            {/* DB Health */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-medium">Railway MySQL Connection</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                {data.systemHealth.dbStatus}
              </span>
            </div>

            {/* RAM usage */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-pink-500" />
                <span className="text-sm font-medium">Node Heap Allocation</span>
              </div>
              <span className="text-sm font-bold text-slate-300">{data.systemHealth.heapUsedMb} MB</span>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-850">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-teal-500" />
                <span className="text-sm font-medium">Application Uptime</span>
              </div>
              <span className="text-sm font-bold text-slate-300">{data.systemHealth.uptime}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

