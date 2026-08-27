import React, { useState, useMemo } from "react";
import { Truck, AlertTriangle, Info } from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

/**
 * Fleet Intelligence Platform.
 *
 * IMPORTANT — read before adding a metric here.
 *
 * This workspace previously displayed a fabricated fleet: `totalVehicles = 42`
 * and `activeOnRoad = 37` were literals, so the header claimed 37 vehicles on
 * the road plus 42 in the workshop out of a fleet of 42. "Fleet Uptime SLA
 * 88.1%" was just 37/42, the relationship score of 88, the "18 minutes"
 * approval time, two breakdowns on the NH-48, and two AMC contracts worth
 * ₹4,50,000 and ₹78,000 were all hardcoded.
 *
 * The backing tables — fleet_passports, fleet_amc_contracts, fleet_breakdowns,
 * fleet_opportunities — are all empty in production. Until they are populated
 * and this component is wired to /api/fleet/*, the only number that can
 * honestly be shown is the one derived from the job cards passed in.
 *
 * Nothing in this file may display a figure it cannot source.
 */

interface FleetManagerWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
  aiModeEnabled?: boolean;
}

const NotProvisioned: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center space-y-2">
    <Info className="h-5 w-5 text-slate-500 mx-auto" />
    <p className="text-sm font-bold text-slate-300">{title}</p>
    <p className="text-xs text-slate-500 max-w-md mx-auto">{detail}</p>
  </div>
);

export const FleetManagerWorkspace: React.FC<FleetManagerWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("fleet-overview");

  // The single metric with a real source: job cards that have not gated out.
  const inWorkshop = useMemo(
    () => jobCards.filter(j => !j.gate_out_time).length,
    [jobCards]
  );

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Fleet Operations Control
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Fleet Intelligence Platform
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "fleet-overview", label: "Fleet Overview" },
            { id: "breakdowns", label: "Active Breakdowns" },
            { id: "contracts", label: "AMC & Contracts" },
            { id: "copilot", label: "Fleet Copilot" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "fleet-overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">
                Vehicles In Workshop
              </span>
              <span className="text-xl font-black text-amber-400">{inWorkshop}</span>
              <span className="text-[9px] text-slate-600 block">Open job cards without a gate-out</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">
                Fleet Size / Uptime SLA
              </span>
              <span className="text-xl font-black text-slate-600">—</span>
              <span className="text-[9px] text-slate-600 block">Requires a registered fleet passport</span>
            </div>
          </div>

          <NotProvisioned
            title="Fleet relationship scoring is not active"
            detail="Uptime, health scoring and approval-latency tracking need registered fleet
                    passports. No fleet has been onboarded yet, so no score can be calculated."
          />
        </div>
      )}

      {activeTab === "breakdowns" && (
        <div className="animate-in fade-in duration-200">
          <NotProvisioned
            title="No breakdowns recorded"
            detail="Live breakdown tracking activates once roadside incidents are logged
                    against a registered fleet."
          />
        </div>
      )}

      {activeTab === "contracts" && (
        <div className="animate-in fade-in duration-200">
          <NotProvisioned
            title="No AMC contracts on record"
            detail="Annual maintenance contracts and their remaining balances appear here
                    once they are registered against a fleet passport."
          />
        </div>
      )}

      {activeTab === "copilot" && (
        <div className="animate-in fade-in duration-200">
          {/* Only the measured value is passed. The copilot must not reason over
              numbers the workspace itself cannot source. */}
          <AICopilotPanel
            role="Fleet Manager"
            context={{ vehiclesInWorkshop: inWorkshop }}
          />
        </div>
      )}
    </div>
  );
});

FleetManagerWorkspace.displayName = "FleetManagerWorkspace";
export default FleetManagerWorkspace;
