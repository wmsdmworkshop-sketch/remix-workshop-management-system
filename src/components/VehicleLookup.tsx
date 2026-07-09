import React, { useState, useEffect } from "react";
import { 
  Search, 
  Car, 
  Wrench, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  ClipboardList, 
  Calendar, 
  ArrowRight, 
  History, 
  Sparkles,
  ChevronRight,
  Shield,
  Tag
} from "lucide-react";
import { JobCard, Employee } from "../types";

interface VehicleLookupProps {
  jobCards: JobCard[];
  employees: Employee[];
  initialQuery?: string;
  onClearQuery?: () => void;
}

export default function VehicleLookup({ jobCards, employees, initialQuery = "", onClearQuery }: VehicleLookupProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    jobCards: JobCard[];
    technicianMaps: any[];
    revenues: any[];
    reworkLogs: any[];
    carryForwardLogs: any[];
    last_service_date?: string | null;
    odometer_reading?: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync with initialQuery if changed externally (e.g., from Dashboard)
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performLookup(initialQuery);
    }
  }, [initialQuery]);

  const performLookup = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("wms_token");
      const response = await fetch(`/api/vehicle/history?query=${encodeURIComponent(queryText.trim())}`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error("Failed to retrieve vehicle service history");
      }
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(searchQuery);
  };

  const handleQuickSearch = (vrn: string) => {
    setSearchQuery(vrn);
    performLookup(vrn);
  };

  const handleClear = () => {
    setSearchQuery("");
    setResults(null);
    setError(null);
    if (onClearQuery) onClearQuery();
  };

  // Extract unique vehicles from active/loaded jobCards as suggestions
  const vehicleSuggestions = React.useMemo(() => {
    const uniqueMap = new Map<string, { vrn: string; model: string; make: string }>();
    jobCards.forEach(jc => {
      if (jc.vrn && !uniqueMap.has(jc.vrn)) {
        uniqueMap.set(jc.vrn, {
          vrn: jc.vrn,
          model: jc.vehicle_model,
          make: jc.vehicle_make
        });
      }
    });
    return Array.from(uniqueMap.values()).slice(0, 4);
  }, [jobCards]);

  // Derive aggregated info about the vehicle if search results are found
  const vehicleSummary = React.useMemo(() => {
    if (!results || results.jobCards.length === 0) return null;
    
    // Sort job cards chronologically (latest first) to find latest stats
    const sortedJobs = [...results.jobCards].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const latestJob = sortedJobs[0];
    const totalVisits = results.jobCards.length;
    
    // Find maximum mileage (km_reading)
    const maxKm = Math.max(...results.jobCards.map(j => j.km_reading || 0));
    
    // Calculate total spend (if revenues are loaded)
    let totalSpend = 0;
    if (results.revenues && results.revenues.length > 0) {
      results.revenues.forEach(r => {
        totalSpend += (Number(r.labour_amount) || 0) + (Number(r.parts_amount) || 0);
      });
    } else {
      // Fallback: sum of labor_price + parts_price if defined
      results.jobCards.forEach(jc => {
        const parts = (jc as any).parts_price ? Number((jc as any).parts_price) : 0;
        const labor = (jc as any).labor_price ? Number((jc as any).labor_price) : 0;
        totalSpend += parts + labor;
      });
    }

    // Determine common services
    const services = results.jobCards.map(j => j.vehicle_model || j.job_description);

    return {
      vrn: latestJob.vrn,
      vin: latestJob.vin || "MAT" + Math.floor(10000000000000 + Math.random() * 90000000000000), // Fallback mock VIN if null
      make: latestJob.vehicle_make || "Tata",
      model: latestJob.vehicle_model || "Commercial Vehicle",
      year: latestJob.vehicle_year || 2024,
      customerName: latestJob.customer_name,
      customerMobile: latestJob.customer_mobile,
      lastKm: maxKm,
      totalVisits,
      totalSpend,
      latestVisitDate: latestJob.created_at,
      latestStatus: latestJob.status
    };
  }, [results]);

  // Color-coded helpers for status tags
  const getStatusBadge = (status: JobCard["status"]) => {
    switch (status) {
      case "Invoiced":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Invoiced & Paid</span>;
      case "Completed":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Ready / Completed</span>;
      case "Active":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse"><Clock className="w-3.5 h-3.5" /> Work-In-Progress</span>;
      case "Carry Forward":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Carried Forward</span>;
      case "Rework":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Rework Job</span>;
      case "Cancelled":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">Cancelled</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30">Waiting</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100 pb-12" id="vehicle-lookup-panel">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium tracking-wider uppercase mb-1">
            <History className="w-4 h-4" />
            <span>Diagnostic Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Vehicle Lookup & Service Ledger
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Retrieve absolute historic repair chronologies, diagnostics ledger, and billing summaries by Registration No. or Chassis VIN.
          </p>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-6 shadow-md shadow-slate-950/20">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Enter Vehicle Registration (VRN) or Chassis VIN Number
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Car className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="e.g. MH-12-AB-1234 or VIN Chassis..."
                className="block w-full pl-11 pr-10 py-3 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-mono tracking-wide"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm shadow-indigo-950/35"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Searching DB...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Retrieve Records</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* QUICK SUGGESTIONS */}
        {vehicleSuggestions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Workshop Presets:
            </span>
            {vehicleSuggestions.map((v) => (
              <button
                key={v.vrn}
                onClick={() => handleQuickSearch(v.vrn)}
                className="px-2.5 py-1 text-xs bg-slate-950/50 hover:bg-slate-800 text-indigo-300 hover:text-white rounded border border-slate-800 hover:border-slate-700 transition-all font-mono"
              >
                {v.vrn} <span className="text-[10px] text-slate-500 font-sans">({v.model || "Tata"})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-400 text-sm">Query Failed</h4>
            <p className="text-red-300/80 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* RESULTS BUNDLE */}
      {results && results.jobCards.length === 0 && !loading && (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
          <Car className="w-12 h-12 text-slate-600 mx-auto stroke-[1.5]" />
          <h3 className="font-semibold text-slate-300 text-base">No Records Registered</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto px-4">
            No historical service events, repairs, or job cards were detected for query <span className="font-mono text-indigo-400 font-semibold">"{searchQuery}"</span>. Double check the spelling or format.
          </p>
        </div>
      )}

      {results && results.jobCards.length > 0 && vehicleSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* VEHICLE PROFILE CARD */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-5 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Vehicle Profile</span>
                {getStatusBadge(vehicleSummary.latestStatus)}
              </div>

              {/* VRN Plate */}
              <div className="text-center py-4 bg-slate-950/60 border border-slate-800/80 rounded-lg shadow-inner">
                <div className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mb-1">REGISTRATION NUMBER</div>
                <div className="inline-block px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-500 font-bold tracking-wider font-mono text-xl uppercase shadow-sm">
                  {vehicleSummary.vrn}
                </div>
              </div>

              {/* Specs & Info */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Make / Manufacturer</span>
                  <span className="font-medium text-white">{vehicleSummary.make}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Model Series</span>
                  <span className="font-medium text-white">{vehicleSummary.model}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Year of Build</span>
                  <span className="font-medium text-white">{vehicleSummary.year}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Chassis VIN</span>
                  <span className="font-mono font-medium text-slate-300 text-xs select-all bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {vehicleSummary.vin}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Last Recorded Odometer</span>
                  <span className="font-semibold text-indigo-400 font-mono">
                    {vehicleSummary.lastKm.toLocaleString()} KM
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800/80 my-4 pt-4 space-y-3">
                <div className="text-xs text-slate-500 tracking-wider font-semibold uppercase">PRIMARY CUSTOMER</div>
                <div className="flex items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{vehicleSummary.customerName}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span className="font-mono">{vehicleSummary.customerMobile}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Ledger Stats */}
              <div className="border-t border-slate-800/80 pt-4 grid grid-cols-2 gap-3">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/40 text-center">
                  <div className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold mb-1">TOTAL VISITS</div>
                  <div className="text-xl font-bold text-white font-mono">{vehicleSummary.totalVisits}</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/40 text-center">
                  <div className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold mb-1">LIFETIME SPEND</div>
                  <div className="text-xl font-bold text-indigo-400 font-mono">
                    ₹{vehicleSummary.totalSpend.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SERVICE HISTORY CHRONOLOGY TIMELINE */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  Chronological Repair & Diagnostics Ledger
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  Order: Newest to Oldest
                </span>
              </div>

              {/* Last Service Date & Odometer reading info header */}
              {(results.last_service_date || results.odometer_reading) && (
                <div className="mb-6 p-4 bg-slate-950/80 border border-slate-800/85 rounded-xl flex items-center gap-2.5 text-slate-300 font-mono text-xs tracking-wide shadow-inner">
                  <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    Last Service: {results.last_service_date ? (() => {
                      const d = new Date(results.last_service_date);
                      if (isNaN(d.getTime())) return results.last_service_date;
                      const dd = String(d.getDate()).padStart(2, '0');
                      const mm = String(d.getMonth() + 1).padStart(2, '0');
                      const yyyy = d.getFullYear();
                      return `${dd}/${mm}/${yyyy}`;
                    })() : "N/A"} | ODO: {results.odometer_reading ? results.odometer_reading.toLocaleString() : "XXXXX"} km
                  </span>
                </div>
              )}

              {/* Timeline Container */}
              <div className="relative border-l border-slate-800 pl-6 ml-3 space-y-8">
                
                {results.jobCards
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((job, idx) => {
                    // Extract job revenue details
                    const jobRev = results.revenues.find(r => r.job_id === job.job_id);
                    const laborAmt = jobRev ? Number(jobRev.labour_amount) : ((job as any).labor_price ? Number((job as any).labor_price) : 0);
                    const partsAmt = jobRev ? Number(jobRev.parts_amount) : ((job as any).parts_price ? Number((job as any).parts_price) : 0);
                    const totalAmt = jobRev ? Number(jobRev.total_amount) : (laborAmt + partsAmt);

                    // Check if there are carry forwards or reworks
                    const jobCarryForward = results.carryForwardLogs.find(c => c.job_id === job.job_id);
                    const jobRework = results.reworkLogs.find(r => r.original_job_id === job.job_id || r.new_job_id === job.job_id);

                    return (
                      <div key={job.job_id} className="relative group" id={`history-jc-${job.job_card_no}`}>
                        {/* Timeline node marker */}
                        <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-slate-950 border-2 border-indigo-500 group-hover:scale-110 group-hover:border-indigo-400 transition-transform duration-150 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:bg-indigo-400"></div>
                        </div>

                        {/* Event Card */}
                        <div className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/80 hover:border-slate-700/60 rounded-xl p-5 transition-all duration-200 shadow-sm space-y-4">
                          
                          {/* Top Row: Meta and Date */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 font-mono rounded">
                                {job.job_card_no}
                              </span>
                              <h3 className="font-bold text-white text-sm tracking-tight group-hover:text-indigo-400 transition-colors">
                                {job.vehicle_model || "General Diagnostics"}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{new Date(job.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                          </div>

                          {/* Quick details strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900/35 border border-slate-800/50 rounded-lg p-3 text-xs">
                            <div>
                              <div className="text-slate-500">SERVICE CLASSIFICATION</div>
                              <div className="font-semibold text-slate-300 mt-0.5">
                                {job.sr_type_id === 4 ? "Quick / Oil Change" : job.sr_type_id === 3 ? "Electrical Service" : job.sr_type_id === 2 ? "Periodic Maintenance" : "General Repair"}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500">MILEAGE READING</div>
                              <div className="font-semibold text-slate-300 mt-0.5 font-mono">
                                {job.km_reading?.toLocaleString() || "0"} KM
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500">SERVICE ADVISOR ID</div>
                              <div className="font-semibold text-indigo-300 mt-0.5 truncate">
                                {job.service_advisor || "Unassigned"}
                              </div>
                            </div>
                          </div>

                          {/* Complaints and job description */}
                          <div className="space-y-1.5 text-sm">
                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-slate-400" />
                              JOB DESCRIPTION & COMPLAINTS REPORTED
                            </div>
                            <p className="text-slate-300 bg-slate-900/10 p-3 rounded border border-slate-850/60 leading-relaxed text-xs">
                              {job.job_description || "No description provided."}
                            </p>
                          </div>

                          {/* Technical remarks & Diagnostics notes */}
                          {(job.remarks || job.delay_notes || job.pending_reason) && (
                            <div className="space-y-2 pt-2 border-t border-slate-900">
                              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <ClipboardList className="w-3 h-3 text-amber-500/80" />
                                TECHNICAL NOTES & REMARKS
                              </div>
                              <div className="grid grid-cols-1 gap-2.5">
                                {job.remarks && (
                                  <div className="text-xs bg-indigo-950/10 border border-indigo-950/30 p-2.5 rounded text-slate-300">
                                    <span className="font-semibold text-indigo-400">Advisor Notes:</span> {job.remarks}
                                  </div>
                                )}
                                {job.delay_notes && (
                                  <div className="text-xs bg-amber-950/15 border border-amber-900/20 p-2.5 rounded text-amber-300">
                                    <span className="font-semibold text-amber-400">Delay Factor:</span> {job.delay_notes}
                                  </div>
                                )}
                                {job.pending_reason && (
                                  <div className="text-xs bg-slate-900/60 border border-slate-800/80 p-2.5 rounded text-slate-400">
                                    <span className="font-semibold text-slate-300">Pending Root Cause:</span> {job.pending_reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Logistics / State Logs (Rework / Carry Forward) */}
                          {(jobCarryForward || jobRework) && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {jobCarryForward && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  <ArrowRight className="w-3 h-3 text-indigo-400" />
                                  <span>Carried Forward (Reason: {jobCarryForward.cf_reason})</span>
                                </div>
                              )}
                              {jobRework && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>Rework Incident (Reason: {jobRework.rework_reason})</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Financial invoice ledger */}
                          <div className="flex justify-between items-center bg-slate-900/20 border-t border-slate-800/60 pt-3.5 mt-2.5 text-xs">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(job.status)}
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 font-mono text-xs">
                              {partsAmt > 0 && (
                                <span>Parts: <span className="text-slate-300">₹{partsAmt.toLocaleString()}</span></span>
                              )}
                              {laborAmt > 0 && (
                                <span>Labor: <span className="text-slate-300">₹{laborAmt.toLocaleString()}</span></span>
                              )}
                              <span className="text-slate-400">Total Bill: <span className="text-indigo-400 font-bold">₹{totalAmt.toLocaleString()}</span></span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
