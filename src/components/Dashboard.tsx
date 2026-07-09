import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Car, 
  FileText, 
  CheckCircle2, 
  Users, 
  Clock, 
  Activity, 
  ShieldCheck, 
  UserPlus, 
  AlertCircle,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Send,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Camera
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { JobCard, Bay, AlertLog, Employee } from "../types";

interface DashboardProps {
  jobCards: JobCard[];
  bays: Bay[];
  alerts: AlertLog[];
  employees: Employee[];
  onAcknowledgeAlert: (id: number) => void;
  onSelectJob: (job: JobCard) => void;
  onTabChange: (tab: string) => void;
  projectedRevenue?: number;
  generatedRevenue?: number;
}

// Curated Luxury Color Palette
const COLORS = {
  primary: "#0B1220",
  secondary: "#111827",
  accentBlue: "#2563EB",
  accentCyan: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  glowCyan: "rgba(6, 182, 212, 0.15)",
  glowBlue: "rgba(37, 99, 235, 0.15)"
};

// Realistic mock data for rich visuals
const revenueTrendData = [
  { name: "09:00", projected: 120000, generated: 95000 },
  { name: "11:00", projected: 240000, generated: 210000 },
  { name: "13:00", projected: 380000, generated: 345000 },
  { name: "15:00", projected: 450000, generated: 480000 },
  { name: "17:00", projected: 550000, generated: 580000 },
  { name: "19:00", projected: 680000, generated: 710000 }
];

const productivityData = [
  { name: "Bay 1", efficiency: 94, jobs: 8 },
  { name: "Bay 2", efficiency: 88, jobs: 6 },
  { name: "Bay 3", efficiency: 75, jobs: 5 },
  { name: "Bay 4", efficiency: 98, jobs: 9 },
  { name: "Bay 5", efficiency: 82, jobs: 7 },
  { name: "Bay 6", efficiency: 91, jobs: 8 }
];

const vehicleCategoryData = [
  { name: "Prima HCV", value: 35, color: "#2563EB" },
  { name: "Signa MCV", value: 25, color: "#06B6D4" },
  { name: "Ultra LCV", value: 20, color: "#10B981" },
  { name: "Nexon EV Fleet", value: 15, color: "#8B5CF6" },
  { name: "Other", value: 5, color: "#6B7280" }
];

const attendanceTrendData = [
  { day: "Mon", attendance: 92 },
  { day: "Tue", attendance: 95 },
  { day: "Wed", attendance: 98 },
  { day: "Thu", attendance: 96 },
  { day: "Fri", attendance: 94 },
  { day: "Sat", attendance: 88 }
];

export default function Dashboard({
  jobCards,
  bays,
  alerts,
  employees,
  onAcknowledgeAlert,
  onSelectJob,
  onTabChange,
  projectedRevenue = 680000,
  generatedRevenue = 710000
}: DashboardProps) {
  const [activeSubView, setActiveSubView] = useState<"overview" | "workshop" | "workforce">("overview");
  const [warrantySearch, setWarrantySearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate rich metrics
  const vehiclesInsideCount = bays.filter(b => b.status === "Active").length;
  const openJobCardsCount = jobCards.filter(j => j.status === "Active" || j.status === "Waiting").length;
  const todayDeliveryCount = jobCards.filter(j => j.status === "Completed" || j.status === "Invoiced").length;
  const activeTechs = employees.filter(e => ["Technician", "Electrician", "Add Tech"].includes(e.role) && e.is_active);
  const attendanceRate = 96.4; // Realistic fixed KPI
  const bayUtilization = Math.round((bays.filter(b => b.status !== "Idle").length / bays.length) * 100) || 78;
  const warrantyPending = 14;
  const customersWaiting = stateAJobsCount();
  const activeOTRequests = 4;

  function stateAJobsCount() {
    return jobCards.filter(j => j.status === "Waiting" && !j.bay_id).length || 3;
  }

  // Mini-sparkline components using lightweight SVGs
  const Sparkline = ({ points, color }: { points: number[], color: string }) => {
    const width = 100;
    const height = 30;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-8 bg-[#0B1220] text-slate-100 min-h-screen p-1">
      {/* Top Welcome Panel with Glassmorphism */}
      <div className="relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-[#2563EB]/10 to-transparent pointer-events-none rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-radial from-[#06B6D4]/5 to-transparent pointer-events-none rounded-full blur-2xl -ml-36 -mb-36" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                SYSTEM LIVE • ASIA-SOUTH1
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DEVANAND WORKFORCE 1.1
            </h1>
            <p className="text-sm text-slate-400 max-w-xl font-medium">
              Enterprise fleet operations, automated bay allocations, and AI-powered warranty adjudication panel.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveSubView("overview")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                activeSubView === "overview" 
                  ? "bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white border-transparent shadow-lg shadow-[#2563EB]/25" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Control Center
            </button>
            <button 
              onClick={() => setActiveSubView("workshop")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                activeSubView === "workshop" 
                  ? "bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white border-transparent shadow-lg shadow-[#2563EB]/25" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Live Workshop ({bays.length} Bays)
            </button>
            <button 
              onClick={() => setActiveSubView("workforce")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                activeSubView === "workforce" 
                  ? "bg-gradient-to-r from-[#2563EB] to-[#06B6D4] text-white border-transparent shadow-lg shadow-[#2563EB]/25" 
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Team Roster ({employees.length})
            </button>
          </div>
        </div>
      </div>

      {activeSubView === "overview" && (
        <>
          {/* Hero KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Card 1: Today's Revenue */}
            <motion.div 
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="group relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between h-44"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#10B981] to-emerald-400" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today's Revenue</span>
                  <span className="text-3xl font-black tracking-tight text-white">₹{generatedRevenue.toLocaleString()}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10B981]">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>+12.4%</span>
                </div>
                <Sparkline points={[60, 62, 59, 68, 71, 74, 71]} color="#10B981" />
              </div>
            </motion.div>

            {/* Card 2: Vehicles Inside */}
            <motion.div 
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between h-44"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#2563EB] to-[#06B6D4]" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vehicles Inside</span>
                  <span className="text-3xl font-black tracking-tight text-white">{vehiclesInsideCount}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#2563EB]">
                  <Car className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">
                  <span>9 Active Bays</span>
                </div>
                <Sparkline points={[4, 5, 6, 5, 7, 8, 9]} color="#2563EB" />
              </div>
            </motion.div>

            {/* Card 3: Open Job Cards */}
            <motion.div 
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between h-44"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#F59E0B] to-amber-400" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Open Job Cards</span>
                  <span className="text-3xl font-black tracking-tight text-white">{openJobCardsCount}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#F59E0B]">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <span>Pending Assign</span>
                </div>
                <Sparkline points={[12, 10, 15, 13, 14, 11, 12]} color="#F59E0B" />
              </div>
            </motion.div>

            {/* Card 4: Today's Delivery */}
            <motion.div 
              whileHover={{ y: -5, scale: 1.01 }}
              className="group relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-lg flex flex-col justify-between h-44"
            >
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#06B6D4] to-cyan-300" />
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today's Delivery</span>
                  <span className="text-3xl font-black tracking-tight text-white">{todayDeliveryCount}</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[#06B6D4]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-full">
                  <span>98% On-Time</span>
                </div>
                <Sparkline points={[10, 12, 11, 14, 15, 16, 18]} color="#06B6D4" />
              </div>
            </motion.div>

          </div>

          {/* Secondary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Technicians Active</span>
                <span className="text-xl font-bold text-white">{activeTechs.length} Working</span>
              </div>
              <Users className="h-5 w-5 text-slate-500" />
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Attendance Ratio</span>
                <span className="text-xl font-bold text-emerald-400">{attendanceRate}%</span>
              </div>
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Bay Utilization</span>
                <span className="text-xl font-bold text-cyan-400">{bayUtilization}%</span>
              </div>
              <Clock className="h-5 w-5 text-cyan-500" />
            </div>

            <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Warranty Adjudication</span>
                <span className="text-xl font-bold text-amber-400">{warrantyPending} Pending</span>
              </div>
              <ShieldCheck className="h-5 w-5 text-amber-500" />
            </div>

          </div>

          {/* Interactive Analytics / Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Main Area Chart: Revenue Trend */}
            <div className="xl:col-span-2 rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Revenue Projection vs Realized</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time tracking of generated billing invoices.</p>
                </div>
                <span className="text-[10px] font-bold bg-[#2563EB]/10 text-[#2563EB] px-3 py-1 rounded-full border border-[#2563EB]/25">
                  TODAY
                </span>
              </div>
              
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="projColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="genColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} />
                    <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937", color: "#F3F4F6" }} />
                    <Area type="monotone" dataKey="projected" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#projColor)" name="Projected Target" />
                    <Area type="monotone" dataKey="generated" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#genColor)" name="Realized Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Vehicle Categories inside Workshop */}
            <div className="rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Fleet Mix Distribution</h3>
                <p className="text-xs text-slate-500 mt-0.5">Active vehicles inside the workshop by platform.</p>
              </div>
              
              <div className="h-56 relative flex items-center justify-center my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {vehicleCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1F2937" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{bays.filter(b => b.status !== "Idle").length || 9}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Bays</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {vehicleCategoryData.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                    <span className="text-slate-400">{v.name}:</span>
                    <span className="font-bold text-slate-200">{v.value}%</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* AI Copilot Smart panel & live alerts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* AI Adjudication & Warranty Advisor Panel */}
            <div className="xl:col-span-2 rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-radial from-[#06B6D4]/10 to-transparent pointer-events-none rounded-full blur-xl -mr-16 -mt-16" />
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/25 flex items-center justify-center text-[#06B6D4]">
                    <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">AI Warranty Adjudicator v1.1</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Auto-assess warranty claim eligibility for spare parts.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Search parts/jobs..."
                      value={warrantySearch}
                      onChange={(e) => setWarrantySearch(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#06B6D4] w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Mock AI Decisions */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded uppercase tracking-wider">Approved</span>
                      <span className="text-xs font-black text-emerald-400">94.8% Conf</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-200">Prima Cylinder Gasket</h4>
                    <p className="text-[10px] text-slate-500">Wear pattern matches thermal load tolerance index.</p>
                  </div>
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-2 py-0.5 rounded uppercase tracking-wider">Approved</span>
                      <span className="text-xs font-black text-emerald-400">89.2% Conf</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-200">Signa Air Brake Valve</h4>
                    <p className="text-[10px] text-slate-500">Pneumatic decay rate falls inside manufacturing deviation.</p>
                  </div>
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded uppercase tracking-wider">Flagged</span>
                      <span className="text-xs font-black text-red-400">91.4% Conf</span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-200">Ultra Clutch Plate</h4>
                    <p className="text-[10px] text-slate-500">Evidence of driver abuse (excessive slippage, burned facings).</p>
                  </div>
                </div>

                <div className="bg-[#06B6D4]/5 border border-[#06B6D4]/20 rounded-xl p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[#06B6D4] animate-ping" />
                    <p className="text-xs text-slate-300 font-medium">
                      <strong className="text-[#06B6D4]">AI Suggestion:</strong> Automatic approval recommended for Claim #CF-9080. Potential savings of ₹42,500 by sourcing remanufactured cylinders.
                    </p>
                  </div>
                  <button className="bg-[#06B6D4] hover:bg-cyan-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shrink-0">
                    Apply Suggestion
                  </button>
                </div>
              </div>
            </div>

            {/* Breach Alerts / Live updates Feed */}
            <div className="rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Live Breach Feed</h3>
                </div>
                <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/25">
                  {alerts.filter(a => a.status === "Active").length} ALERTS
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-56 pr-1 flex-1">
                {alerts.filter(a => a.status === "Active").length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs font-medium">
                    No active breach logs reported. All systems green.
                  </div>
                ) : (
                  alerts.filter(a => a.status === "Active").map((alert) => (
                    <div key={alert.alert_id} className="p-3 bg-slate-950/40 border border-slate-800/50 rounded-xl flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-300 leading-normal">{alert.alert_message}</p>
                        <p className="text-[10px] text-slate-500">{new Date(alert.created_at).toLocaleTimeString()}</p>
                      </div>
                      <button 
                        onClick={() => onAcknowledgeAlert(alert.alert_id)}
                        className="text-amber-500 font-bold hover:underline shrink-0 text-[10px] uppercase tracking-wider"
                      >
                        Clear
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {activeSubView === "workshop" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white uppercase">Live Workshop Bays</h2>
              <p className="text-xs text-slate-400">Real-time utilization monitoring of 12 bay spaces.</p>
            </div>
            <button 
              onClick={() => onTabChange("jobs")}
              className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20"
            >
              Allocate New Bay
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {bays.map((bay) => {
              const currentJob = jobCards.find(j => j.bay_id === bay.bay_id && ["Active", "Carry Forward", "Rework", "Completed"].includes(j.status));
              
              let cardStyle = "border-slate-800/60 bg-slate-900/40";
              let badgeStyle = "bg-slate-800 text-slate-300";
              
              if (bay.status === "Active") {
                cardStyle = "border-emerald-800/50 bg-emerald-950/10 shadow-lg shadow-emerald-500/2";
                badgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              } else if (bay.status === "Carry Forward") {
                cardStyle = "border-amber-800/50 bg-amber-950/10";
                badgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              } else if (bay.status === "Rework") {
                cardStyle = "border-red-800/50 bg-red-950/10 animate-pulse";
                badgeStyle = "bg-red-500/10 text-red-400 border border-red-500/20";
              }

              return (
                <div key={bay.bay_id} className={`rounded-[18px] border p-5 flex flex-col justify-between h-48 transition-all hover:scale-[1.01] ${cardStyle}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{bay.bay_type}</span>
                      <h4 className="text-base font-extrabold text-white mt-0.5">{bay.bay_name}</h4>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badgeStyle}`}>
                      {bay.status}
                    </span>
                  </div>

                  {currentJob ? (
                    <div 
                      onClick={() => onSelectJob(currentJob)}
                      className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-3 hover:border-slate-700/80 cursor-pointer transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-200">{currentJob.vrn}</span>
                        <span className="text-[10px] text-slate-500">ETD: {new Date(currentJob.etd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-1 font-medium">{currentJob.customer_name} • {currentJob.vehicle_make} {currentJob.vehicle_model}</p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-4 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-700 animate-ping" />
                      Idle & Available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubView === "workforce" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white uppercase">Workforce Live Roster</h2>
              <p className="text-xs text-slate-400">Roster, GPS status, and biometric certification checks.</p>
            </div>
            <button 
              onClick={() => onTabChange("employees")}
              className="bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg shadow-lg shadow-blue-500/20"
            >
              Add Employee
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.map((emp) => (
              <div key={emp.employee_id} className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-lg flex flex-col justify-between h-52 transition-all hover:y-[-2px]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#06B6D4] flex items-center justify-center font-black text-white text-sm">
                      {emp.full_name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">{emp.full_name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{emp.role} • {emp.employee_grade}</p>
                    </div>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${emp.is_active ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
                </div>

                <div className="space-y-2 border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between">
                    <span>GPS Lock:</span>
                    <span className="font-mono text-slate-300 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-cyan-400" /> Lat 18.52 / Lng 73.85
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Biometric Match:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Camera className="h-3 w-3" /> Face Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Certification:</span>
                    <span className="font-bold text-slate-300">{emp.certification_level || "Standard"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
