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
  ArrowRight, 
  History, 
  Sparkles,
  ChevronRight,
  Shield,
  Tag,
  FileText,
  Download,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  FileCheck,
  Receipt,
  ExternalLink,
  MapPin,
  TrendingUp,
  RotateCcw,
  Calendar,
  Zap,
  Gauge
} from "lucide-react";
import { JobCard, Employee } from "../types";
import type { VehiclePassportAggregate, VisitLedgerEntry } from "../engines/vehicle-passport/types";

interface VehicleLookupProps {
  jobCards: JobCard[];
  employees: Employee[];
  initialQuery?: string;
  onClearQuery?: () => void;
}

export default function VehicleLookup({ jobCards, employees, initialQuery = "", onClearQuery }: VehicleLookupProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [passportAggregate, setPassportAggregate] = useState<VehiclePassportAggregate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [tmsa, setTmsa] = useState<{ loading: boolean; note: string | null; error: boolean; canRefetch: boolean }>({ loading: false, note: null, error: false, canRefetch: false });

  const tmsaLookup = async (force = false) => {
    const vrn = searchQuery.trim();
    if (!vrn) return;
    setTmsa({ loading: true, note: null, error: false, canRefetch: false });
    try {
      const token = localStorage.getItem("wms_token") || localStorage.getItem("dwip_token") || localStorage.getItem("token") || "";
      const resp = await fetch(`/api/vehicle/tmsa-lookup?vrn=${encodeURIComponent(vrn)}${force ? "&refresh=1" : ""}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 503 || data.unavailable) {
        setTmsa({ loading: false, error: true, canRefetch: false, note: data.message || "TMSA-CV is not configured yet. Add the official API key in External Integrations." });
        return;
      }
      if (!resp.ok) {
        setTmsa({ loading: false, error: true, canRefetch: false, note: data.error || "TMSA lookup failed." });
        return;
      }
      const when = data.fetched_at ? new Date(data.fetched_at).toLocaleString() : "";
      const note = data.cached
        ? `Served from our saved TMSA record${when ? ` (fetched ${when})` : ""} — no new TMSA call.`
        : `Fetched fresh from TMSA-CV and saved for next time.`;
      setTmsa({ loading: false, error: false, canRefetch: true, note });
      // When the official schema is known, map data.data into the passport aggregate here.
      console.log("[TMSA] official data:", data.data, "cached:", data.cached);
    } catch (e: any) {
      setTmsa({ loading: false, error: true, canRefetch: false, note: e.message || "TMSA lookup failed." });
    }
  };

  // Sync with initialQuery if changed externally
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performLookup(initialQuery);
    }
  }, [initialQuery]);

  const performLookup = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      setError(null);
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token") || "";
      const response = await fetch(`/api/vehicle/history?query=${encodeURIComponent(queryText.trim())}`, {
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        throw new Error("Failed to retrieve vehicle passport aggregate");
      }
      const data = await response.json();
      if (data.passportAggregate) {
        setPassportAggregate(data.passportAggregate);
        if (data.passportAggregate.visitLedger && data.passportAggregate.visitLedger.length > 0) {
          setExpandedVisitId(data.passportAggregate.visitLedger[0].visitId);
        }
      } else {
        throw new Error("Vehicle passport record not found.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching vehicle passport.");
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
    setPassportAggregate(null);
    setError(null);
    if (onClearQuery) onClearQuery();
  };

  const toggleVisitExpand = (visitId: string) => {
    setExpandedVisitId(prev => prev === visitId ? null : visitId);
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

  return (
    <div className="space-y-6 text-slate-100 pb-12" id="vehicle-passport-panel">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium tracking-wider uppercase mb-1">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>DWIP Enterprise Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Vehicle Passport™ 360° Operational Dossier
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Single Source of Truth for vehicle history, merged operational ledger, warranty coverage, and consolidated financial journey.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            EAR-001 Certified Domain Model
          </span>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-6 shadow-md shadow-slate-950/20">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Search Vehicle Passport by Chassis VIN, Registration No (VRN), Engine No, Job Card No, Invoice No, Customer Name, or Mobile
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Car className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Enter VIN, VRN (MH12AB1234), JC No (JC-2026-1001), Engine, Customer..."
                className="w-full pl-11 pr-10 py-3 bg-slate-950/70 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-mono tracking-wide"
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
                  <span>Fetching Passport...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Retrieve Passport</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => tmsaLookup(false)}
              disabled={tmsa.loading || !searchQuery.trim()}
              title="Fetch the official record from Tata TMSA-CV. Cached after the first pull — later lookups load from our DB with no new TMSA call."
              className="px-4 py-3 bg-orange-600/90 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm"
            >
              {tmsa.loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                : <span>TMSA Lookup</span>}
            </button>
          </div>
          {tmsa.note && (
            <p className={`mt-2 text-xs ${tmsa.error ? "text-amber-400" : "text-emerald-400"}`}>
              {tmsa.note}
              {tmsa.canRefetch && (
                <button type="button" onClick={() => tmsaLookup(true)} className="ml-2 underline text-orange-300 hover:text-orange-200">
                  Re-fetch from TMSA
                </button>
              )}
            </p>
          )}
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

      {/* VEHICLE PASSPORT AGGREGATE DISPLAY */}
      {passportAggregate && (
        <div className="space-y-6">
          
          {/* TOP LIFETIME SUMMARY HEADER BANNER */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
            
            {/* Header Identity Row */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold font-mono text-lg rounded">
                    {passportAggregate.passport.registrationNo}
                  </span>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {passportAggregate.passport.make} {passportAggregate.passport.model}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded font-mono">
                    {passportAggregate.passport.productLine || "Commercial Vehicles"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400 font-mono">
                  <span>CHASSIS: <strong className="text-slate-200">{passportAggregate.passport.vin}</strong></span>
                  <span>ENGINE: <strong className="text-slate-200">{passportAggregate.passport.engineNo}</strong></span>
                  <span>CUSTOMER: <strong className="text-indigo-400">{passportAggregate.customer.customerName}</strong> ({passportAggregate.customer.customerMobile})</span>
                </div>
              </div>

              {/* Health & Trust Score Badges */}
              <div className="flex items-center gap-4">
                <div className="text-center px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">PASSPORT SCORE</div>
                  <div className="text-xl font-bold text-indigo-400 font-mono">{passportAggregate.passport.passportScore}/100</div>
                </div>
                <div className="text-center px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">HEALTH INDEX</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">{passportAggregate.passport.healthScore}%</div>
                </div>
                <div className="text-center px-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">TRUST LEVEL</div>
                  <div className="text-xl font-bold text-sky-400 font-mono">{passportAggregate.passport.trustScore}%</div>
                </div>
              </div>
            </div>

            {/* Vehicle Master Metadata Fields (Req 5) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 text-xs">
              <div>
                <span className="text-slate-500 block">ORIGINAL SALE DATE</span>
                <span className="font-semibold text-slate-200 font-mono mt-0.5 block">
                  {passportAggregate.passport.originalSaleDate || "15-Apr-2022"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">TM INVOICE DATE</span>
                <span className="font-semibold text-slate-200 font-mono mt-0.5 block">
                  {passportAggregate.passport.tmInvoiceDate || "10-Apr-2022"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">DATE OF REGISTRATION</span>
                <span className="font-semibold text-slate-200 font-mono mt-0.5 block">
                  {passportAggregate.passport.dateOfRegistration || "20-Apr-2022"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">WARRANTY EXPIRY DATE</span>
                <span className="font-semibold text-amber-400 font-mono mt-0.5 block">
                  {passportAggregate.passport.warrantyExpiryDate || "15-Apr-2025"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">WARRANTY EXPIRY KM</span>
                <span className="font-semibold text-amber-400 font-mono mt-0.5 block">
                  {(passportAggregate.passport.warrantyExpiryKm || 300000).toLocaleString()} KM
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">WARRANTY EXPIRY HOURS</span>
                <span className="font-semibold text-amber-400 font-mono mt-0.5 block">
                  {(passportAggregate.passport.warrantyExpiryHours || 10000).toLocaleString()} HRS
                </span>
              </div>
            </div>

            {/* Lifetime Summary KPI Row (Req 6) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">TOTAL VISITS</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">{passportAggregate.lifetimeSummary.totalVisits}</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">LIFETIME SPEND</div>
                <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5">₹{passportAggregate.lifetimeSummary.lifetimeSpend.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">LABOUR / SPARES</div>
                <div className="text-xs font-bold text-slate-300 font-mono mt-1">{passportAggregate.lifetimeSummary.labourSparesRatio}</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">REPEAT REPAIR INDEX</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{passportAggregate.lifetimeSummary.repeatRepairIndex}%</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">ACTIVE WARRANTY</div>
                <div className="text-xs font-semibold text-amber-400 mt-1 truncate">{passportAggregate.lifetimeSummary.activeWarrantyStatus}</div>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">ACTIVE AMC</div>
                <div className="text-xs font-semibold text-sky-400 mt-1 truncate">{passportAggregate.lifetimeSummary.activeAmcStatus}</div>
              </div>
            </div>
          </div>

          {/* CHRONOLOGICAL VISIT LEDGER (Req 7) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-400" />
                Chronological Visit & Service Ledger
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Showing {passportAggregate.visitLedger.length} Operational Visits (Newest First)
              </span>
            </div>

            <div className="space-y-4">
              {passportAggregate.visitLedger.map((visit, index) => {
                const isExpanded = expandedVisitId === visit.visitId;

                return (
                  <div 
                    key={visit.visitId} 
                    className="bg-slate-950/70 border border-slate-800/90 rounded-xl overflow-hidden hover:border-slate-700/80 transition-all duration-150"
                  >
                    {/* VISIT HEADER (Prioritizes JC No, Invoice No, Gate Timestamps, Service Type) */}
                    <div 
                      onClick={() => toggleVisitExpand(visit.visitId)}
                      className="p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 hover:bg-slate-900/70 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold font-mono text-sm rounded">
                          JC: {visit.jobCardNo}
                        </span>
                        {visit.invoiceNo && visit.invoiceNo !== "Not Generated" ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold font-mono text-xs rounded">
                            INV: {visit.invoiceNo}
                          </span>
                        ) : visit.visitStatus === "INVOICED" || visit.visitStatus === "Invoiced" ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold font-mono text-xs rounded">
                            INVOICED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold font-mono text-xs rounded">
                            Pending Final Invoice
                          </span>
                        )}
                        <span className="text-sm font-bold text-white">
                          {visit.serviceType}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {visit.visitStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Gate In: {new Date(visit.gateInTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-slate-500" />
                          <span>{visit.odometerKm.toLocaleString()} KM</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[10px]">FINAL CONSOLIDATED INVOICE</span>
                          {visit.invoiceNo && visit.invoiceNo !== "Not Generated" ? (
                            <span className="text-emerald-400 font-bold text-sm">
                              {visit.commercialBilling.finalConsolidatedInvoiceAmount > 0 
                                ? `₹${visit.commercialBilling.finalConsolidatedInvoiceAmount.toLocaleString()}`
                                : "₹0.00 (Warranty Covered)"}
                            </span>
                          ) : visit.commercialBilling.finalConsolidatedInvoiceAmount > 0 ? (
                            <span className="text-indigo-400 font-bold text-sm">
                              ₹{visit.commercialBilling.finalConsolidatedInvoiceAmount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-xs italic">
                              Pending Billing
                            </span>
                          )}
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* EXPANDABLE DETAIL BODY */}
                    {isExpanded && (
                      <div className="p-6 border-t border-slate-800/80 bg-slate-950 space-y-6 text-xs">
                        
                        {/* Operational KPIs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800/50">
                          <div>
                            <span className="text-slate-500 block">STAY DURATION</span>
                            <span className="font-semibold text-slate-200 font-mono mt-0.5 block">{visit.kpis.stayDurationHours} Hours</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">ACTIVE REPAIR TIME</span>
                            <span className="font-semibold text-slate-200 font-mono mt-0.5 block">{visit.kpis.activeRepairHours} Hours</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">SLA STATUS</span>
                            <span className={`font-semibold font-mono mt-0.5 block ${visit.kpis.slaStatus === 'WITHIN_SLA' ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {visit.kpis.slaStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">QC RESULT</span>
                            <span className="font-semibold text-emerald-400 font-mono mt-0.5 block">{visit.kpis.qcResult}</span>
                          </div>
                        </div>

                        {/* Complaints & Diagnostics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider block">COMPLAINTS REPORTED</span>
                            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                              {visit.complaints.map((c, i) => (
                                <p key={i} className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                  {c}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider block">DIAGNOSTIC SUMMARY</span>
                            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-slate-300">
                              {visit.diagnosticSummary || "Not Recorded"}
                            </div>
                          </div>
                        </div>

                        {/* UNIFIED FINANCIAL JOURNEY & COMMERCIAL BILLING BREAKDOWN */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                          
                          {/* Financial Journey */}
                          <div className="space-y-3">
                            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-sky-400" />
                              Financial Journey Timeline
                            </h4>
                            <div className="space-y-2 font-mono">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Initial Estimate:</span>
                                <span className="text-slate-200">₹{visit.financialJourney.initialEstimateAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Approved Addendums:</span>
                                <span className="text-slate-200">₹{visit.financialJourney.approvedAddendumsAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Final Gross Invoice:</span>
                                <span className="text-slate-200">₹{visit.financialJourney.finalInvoiceAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-800 pt-1 text-emerald-400">
                                <span>Warranty / Offsets:</span>
                                <span>-₹{visit.financialJourney.warrantyOffsetAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-800 pt-1 text-indigo-400 font-bold">
                                <span>Net Customer Settled:</span>
                                <span>₹{visit.financialJourney.netSettledAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Commercial Billing Breakdown */}
                          <div className="space-y-3">
                            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-emerald-400" />
                              Commercial Billing Breakdown
                            </h4>
                            <div className="space-y-2 font-mono">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Gross Labour:</span>
                                <span className="text-slate-200">₹{visit.commercialBilling.grossLabourAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Gross Spares:</span>
                                <span className="text-slate-200">₹{visit.commercialBilling.grossSparesAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Consumables & Aux:</span>
                                <span className="text-slate-200">₹{visit.commercialBilling.consumablesFee.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Taxes (18% GST):</span>
                                <span className="text-slate-200">₹{visit.commercialBilling.taxAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-800 pt-1 text-indigo-400 font-bold text-sm">
                                <span>Final Consolidated Invoice:</span>
                                <span>₹{visit.commercialBilling.finalConsolidatedInvoiceAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* QUICK DOCUMENT ACTIONS */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
                          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-2">Quick Document Actions:</span>
                          <a 
                            href={visit.quickActions.jobCardPdfUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 rounded font-mono text-xs flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Job Card PDF
                          </a>
                          <a 
                            href={visit.quickActions.gatePassUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 rounded font-mono text-xs flex items-center gap-1.5"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            Gate Pass
                          </a>
                          {visit.quickActions.taxInvoiceUrl && (
                            <a 
                              href={visit.quickActions.taxInvoiceUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 rounded font-mono text-xs flex items-center gap-1.5"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              Tax Invoice
                            </a>
                          )}
                          <a 
                            href={visit.quickActions.qcReportUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded font-mono text-xs flex items-center gap-1.5"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Inspection Report
                          </a>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
