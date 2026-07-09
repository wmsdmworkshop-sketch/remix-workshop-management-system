import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  ShieldAlert, 
  TrendingUp, 
  Search,
  Database,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";

interface ExceptionItem {
  job_card_id?: number | string;
  job_card_no?: string;
  chassis_no?: string;
  registration_no?: string;
  customer_name?: string;
  invoice_no?: string;
  count?: number;
}

interface ExceptionReportData {
  missingInvoice: ExceptionItem[];
  missingVehicle: ExceptionItem[];
  missingCustomer: ExceptionItem[];
  missingJobCard: ExceptionItem[];
  duplicateJobCards: ExceptionItem[];
  duplicateInvoices: ExceptionItem[];
}

export default function ExceptionReport() {
  const [data, setData] = useState<ExceptionReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeExceptionTab, setActiveExceptionTab] = useState<keyof ExceptionReportData>("missingInvoice");

  const runScan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/validation/exception-report");
      const report = await res.json();
      setData(report);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  const getTabLabel = (key: keyof ExceptionReportData) => {
    switch (key) {
      case "missingInvoice": return "Missing Invoices";
      case "missingVehicle": return "Unregistered Vehicles";
      case "missingCustomer": return "Missing Owners";
      case "missingJobCard": return "Orphan Invoices";
      case "duplicateJobCards": return "Duplicate Job Cards";
      case "duplicateInvoices": return "Duplicate Invoices";
      default: return "";
    }
  };

  const getCount = (key: keyof ExceptionReportData) => {
    if (!data) return 0;
    return data[key]?.length || 0;
  };

  return (
    <div className="space-y-8 bg-[#0B1220] text-slate-100 min-h-screen p-1 font-sans">
      
      {/* Top Welcome Panel with Glassmorphism */}
      <div className="relative overflow-hidden rounded-[18px] bg-slate-900/60 border border-slate-800/80 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-radial from-[#2563EB]/10 to-transparent pointer-events-none rounded-full blur-3xl -mr-48 -mt-48" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                WMS AUDIT ENGINE ACTIVE
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              EXCEPTION REPORTS
            </h1>
            <p className="text-sm text-slate-400 max-w-xl font-medium">
              Real-time integrity scans across completed job cards, matching invoices, and vehicle masters.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={runScan}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-950/30 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 
              {loading ? "Scanning..." : "Re-Run Integrity Scan"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {(Object.keys(data || {}) as Array<keyof ExceptionReportData>).map((key) => {
          const count = getCount(key);
          return (
            <button
              key={key}
              onClick={() => setActiveExceptionTab(key)}
              className={`p-4 rounded-[18px] border text-left transition-all flex flex-col justify-between h-28 relative ${
                activeExceptionTab === key
                  ? "bg-slate-900 border-[#06B6D4] shadow-lg shadow-[#06B6D4]/5"
                  : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80"
              }`}
            >
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-normal">{getTabLabel(key)}</span>
              <span className={`text-2xl font-black ${count > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Audit Detail Stage */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-[18px] p-5 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Audit Logs: {getTabLabel(activeExceptionTab)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Displays records flagged for validation mismatches.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Job Card / Invoice No</th>
                <th className="py-3 px-4">Chassis No</th>
                <th className="py-3 px-4">Registration No</th>
                <th className="py-3 px-4">Owner Name / Count</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 text-xs italic">
                    Running live database validation rules...
                  </td>
                </tr>
              ) : !data || getCount(activeExceptionTab) === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> All checks passed. Zero integrity exceptions found for this rule!
                  </td>
                </tr>
              ) : (
                data[activeExceptionTab].map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-800/40 hover:bg-slate-950/40 transition-colors text-slate-300">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {item.job_card_no || item.invoice_no || "N/A"}
                    </td>
                    <td className="py-3.5 px-4 font-mono">{item.chassis_no || "N/A"}</td>
                    <td className="py-3.5 px-4 font-mono">{item.registration_no || "N/A"}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {item.customer_name || item.count || "Unknown"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
