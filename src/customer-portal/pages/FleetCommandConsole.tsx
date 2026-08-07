import React, { useState } from "react";
import { Truck, CheckCircle2, AlertTriangle, Shield, DollarSign, Clock, Users, FileText, ChevronRight, Sparkles } from "lucide-react";

export interface FleetVehicle {
  id: string;
  vrn: string;
  model: string;
  driverName: string;
  driverMobile: string;
  jobCardNo?: string;
  status: "In Workshop" | "On Road" | "Estimate Pending" | "Ready for Delivery";
  pendingEstimate?: number;
  odometerKm: number;
}

export const FleetCommandConsole: React.FC = () => {
  const [selectedFleetJobIds, setSelectedFleetJobIds] = useState<string[]>([]);
  const [bulkApprovedSuccess, setBulkApprovedSuccess] = useState<string | null>(null);

  const fleetVehicles: FleetVehicle[] = [
    { id: "flt-1", vrn: "KA-32-AA-5577", model: "Tata Signa 4825.TK", driverName: "Ramesh Pawar", driverMobile: "9845112233", jobCardNo: "JC-DevAus-AA1-2526-002338", status: "Estimate Pending", pendingEstimate: 14850, odometerKm: 142500 },
    { id: "flt-2", vrn: "KA-32-AA-8899", model: "Tata Prima 3530.K", driverName: "Suresh Patil", driverMobile: "9845223344", jobCardNo: "JC-DevAus-AA1-2526-002410", status: "In Workshop", pendingEstimate: 0, odometerKm: 98400 },
    { id: "flt-3", vrn: "KA-32-BB-1122", model: "Tata Ultra T.7", driverName: "Mahesh Naik", driverMobile: "9845334455", jobCardNo: "JC-DevAus-AA1-2526-002490", status: "Estimate Pending", pendingEstimate: 8400, odometerKm: 65200 },
    { id: "flt-4", vrn: "KA-32-CC-4455", model: "Tata Intra V50", driverName: "Anil Kumar", driverMobile: "9845445566", status: "On Road", odometerKm: 34100 },
    { id: "flt-5", vrn: "KA-32-DD-7788", model: "Tata LPT 1613", driverName: "Ganesh Rathod", driverMobile: "9845556677", status: "On Road", odometerKm: 215000 }
  ];

  const pendingEstimatesList = fleetVehicles.filter(v => v.status === "Estimate Pending" && v.pendingEstimate && v.pendingEstimate > 0);

  const toggleSelectVehicle = (id: string) => {
    setSelectedFleetJobIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkApprove = () => {
    if (selectedFleetJobIds.length === 0) return;
    setBulkApprovedSuccess(`Successfully bulk-approved ${selectedFleetJobIds.length} commercial fleet estimates! Work authorization dispatched to workshop supervisor.`);
    setSelectedFleetJobIds([]);
    setTimeout(() => setBulkApprovedSuccess(null), 5000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Fleet Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded uppercase tracking-wider">Commercial Fleet Ops</span>
              <h2 className="text-lg font-black tracking-tight text-white mt-1">Devanand Commercial Logistics Fleet</h2>
            </div>
          </div>

          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full">
            Fleet Uptime: 96.4%
          </span>
        </div>

        {/* Fleet KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Fleet Size</span>
            <span className="text-base font-extrabold text-white font-mono mt-0.5 block">5 Heavy Trucks</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Active in Workshop</span>
            <span className="text-base font-extrabold text-amber-400 font-mono mt-0.5 block">3 Commercial Vehicles</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pending Estimates</span>
            <span className="text-base font-extrabold text-indigo-400 font-mono mt-0.5 block">₹23,250 (2 Jobs)</span>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Maintenance</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 block">₹54,100 / Mo</span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {bulkApprovedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{bulkApprovedSuccess}</span>
        </div>
      )}

      {/* Bulk Estimate Approval Box */}
      {pendingEstimatesList.length > 0 && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">Bulk Commercial Estimate Approvals</h3>
            </div>

            <button
              onClick={handleBulkApprove}
              disabled={selectedFleetJobIds.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Approve Selected ({selectedFleetJobIds.length})
            </button>
          </div>

          <div className="space-y-2">
            {pendingEstimatesList.map(v => (
              <div 
                key={v.id}
                onClick={() => toggleSelectVehicle(v.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                  selectedFleetJobIds.includes(v.id)
                    ? "bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-600/20 font-bold"
                    : "bg-white/60 border-slate-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedFleetJobIds.includes(v.id)}
                    onChange={() => {}}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 h-4 w-4"
                  />
                  <div>
                    <span className="font-mono font-extrabold text-slate-900">{v.vrn}</span>
                    <span className="text-[10px] text-slate-500 font-medium ml-2">({v.model}) — Driver: {v.driverName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-extrabold text-indigo-700 text-sm">₹{v.pendingEstimate?.toLocaleString('en-IN')}</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">Estimate Ready</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fleet Roster Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Truck className="w-4 h-4 text-slate-700" />
          Active Fleet Vehicle Operations Roster
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="py-3 px-4">Vehicle VRN & Model</th>
                <th className="py-3 px-4">Assigned Driver</th>
                <th className="py-3 px-4">Job Card</th>
                <th className="py-3 px-4">Odometer</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fleetVehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <p className="font-mono font-extrabold text-slate-900">{v.vrn}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{v.model}</p>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    <p>{v.driverName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{v.driverMobile}</p>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {v.jobCardNo ? (
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                        {v.jobCardNo}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">No Active JC</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                    {v.odometerKm.toLocaleString()} KM
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      v.status === "On Road"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : v.status === "Estimate Pending"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
