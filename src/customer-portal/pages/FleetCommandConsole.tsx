import React, { useEffect, useState } from "react";
import { Truck, AlertTriangle, Loader2 } from "lucide-react";
import { fetchVehicles, fetchJobs } from "../hooks/useCustomerApi";

/**
 * Fleet console for the signed-in customer.
 *
 * Every row and count here comes from /api/customer/vehicles and
 * /api/customer/jobs, both scoped server-side to the authenticated mobile
 * number.
 *
 * This page previously rendered five hardcoded vehicles — other people's
 * registration numbers, driver names and mobile numbers — plus invented KPIs
 * (96.4% uptime, "₹54,100 / Mo") and a "bulk approve" button whose handler
 * only set a success message and called no API at all. A customer could be
 * told their repairs were authorised while the workshop was never notified.
 *
 * Driver name/mobile and estimate amounts are deliberately absent: the
 * customer-safe payloads (buildVehicleView / sanitizeJobCard) do not carry
 * them, and nothing here may display a figure it cannot source.
 */

interface VehicleView {
  vrn: string;
  vehicle_model: string;
  vehicle_make: string;
  vehicle_year: number;
  active_jobs: number;
  last_service_date: string | null;
  total_visits: number;
}

interface JobView {
  job_card_no: string;
  vrn: string;
  status: string;
  km_reading: number | null;
  service_type: string;
  gate_out_time: string | null;
}

export const FleetCommandConsole: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleView[]>([]);
  const [jobs, setJobs] = useState<JobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [v, j] = await Promise.all([fetchVehicles(), fetchJobs()]);
        if (cancelled) return;
        setVehicles(Array.isArray(v?.vehicles) ? v.vehicles : []);
        setJobs(Array.isArray(j?.jobs) ? j.jobs : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Could not load your fleet.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** Latest open job per VRN, so the roster can show a live job card number. */
  const openJobByVrn = new Map<string, JobView>();
  for (const j of jobs) {
    if (!j.gate_out_time && !openJobByVrn.has(j.vrn)) openJobByVrn.set(j.vrn, j);
  }
  const inWorkshop = openJobByVrn.size;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 p-8 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your fleet…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Fleet header — counts only, each derived from the rows below */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded uppercase tracking-wider">
              Fleet Operations
            </span>
            <h2 className="text-lg font-black tracking-tight text-white mt-1">Your Vehicles</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vehicles Registered</span>
            <span className="text-base font-extrabold text-white font-mono mt-0.5 block">{vehicles.length}</span>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Currently in Workshop</span>
            <span className="text-base font-extrabold text-amber-400 font-mono mt-0.5 block">{inWorkshop}</span>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-700" /> Vehicle Roster
        </h3>

        {vehicles.length === 0 ? (
          <p className="py-8 text-center text-slate-500 text-xs font-medium">
            No vehicles are linked to your account yet. They appear here once a job card
            has been raised against your registered mobile number.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Open Job Card</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Last Service</th>
                  <th className="py-3 px-4 text-right">Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => {
                  const open = openJobByVrn.get(v.vrn);
                  const model = [v.vehicle_make, v.vehicle_model].filter(Boolean).join(" ");
                  return (
                    <tr key={v.vrn} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <p className="font-mono font-extrabold text-slate-900">{v.vrn}</p>
                        {model && <p className="text-[10px] text-slate-500 font-medium">{model}</p>}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {open ? (
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                            {open.job_card_no}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No open job</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {open?.km_reading != null ? `${open.km_reading.toLocaleString("en-IN")} KM` : "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {v.last_service_date
                          ? new Date(v.last_service_date).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        {v.total_visits}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
