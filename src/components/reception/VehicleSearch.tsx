import React, { useState, useEffect, useMemo } from "react";
import { Search, Shield, AlertCircle, Wrench, Clock, User, FileText, Camera, History } from "lucide-react";
import { JobCard } from "../../types";

export interface VehicleProfile {
  vrn: string;
  vin: string;
  engineNo: string;
  fleetNo: string;
  make: string;
  model: string;
  year: number;
  warrantyStatus: string;
  campaigns: string[];
  fsbs: string[];
  repeatComplaintsCount: number;
  lastAdvisor: string;
  lastTechnician: string;
  lastServiceDate: string;
  lastServiceType: string;
  outstandingAmount: number;
  previousPhotos: string[];
  timelineHistory: Array<{
    event: string;
    date: string;
    details: string;
  }>;
}

export interface VehicleSearchProps {
  onSelectVehicle?: (vehicle: VehicleProfile) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function VehicleSearch({
  onSelectVehicle,
  isLoading: propIsLoading = false,
  error: propError = null,
}: VehicleSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"all" | "vrn" | "vin" | "engine" | "fleet">("all");
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [error, setError] = useState<string | null>(propError);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile | null>(null);

  // Fetch job cards on mount
  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("wms_token");
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch("/api/job-cards", { headers });
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const data = await res.json();
        setJobCards(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Construct Vehicle Profiles from Job Cards
  const vehicleProfiles = useMemo(() => {
    const profilesMap = new Map<string, VehicleProfile>();

    // Sort by date ascending to let later ones override/populate "last" fields
    const sortedJobs = [...jobCards].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });

    sortedJobs.forEach((jc) => {
      const vrn = jc.vrn ? jc.vrn.trim().toUpperCase() : "";
      if (!vrn) return;

      let profile = profilesMap.get(vrn);
      if (!profile) {
        // Deterministic mock variables for details not present in database
        const numericPart = vrn.replace(/\D/g, "");
        const vin = jc.chassis_number || `MAT451206H${numericPart || "0777"}Z`;
        const engineNo = `6BT5.9-${numericPart || "4512"}-E3`;
        const fleetNo = jc.priority === "Fleet" ? `FLT-${numericPart.slice(-3) || "99"}` : "N/A";
        const hasCampaign = parseInt(numericPart || "0") % 2 === 0;
        const campaigns = hasCampaign ? ["DEF Quality Sensor Software Flash Required"] : [];
        const fsbs = ["FSB-2026-03: Heavy Axle Alignment Inspection Guidelines"];

        profile = {
          vrn,
          vin,
          engineNo,
          fleetNo,
          make: jc.vehicle_make || "Tata",
          model: jc.vehicle_model || "Prima",
          year: jc.vehicle_year || 2023,
          warrantyStatus: jc.warranty_status || "Standard",
          campaigns,
          fsbs,
          repeatComplaintsCount: 0,
          lastAdvisor: jc.service_advisor || "Not Assigned",
          lastTechnician: jc.technician_name || "Not Assigned",
          lastServiceDate: jc.created_at ? new Date(jc.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
          lastServiceType: jc.sr_type_master || "General Service",
          outstandingAmount: 0,
          previousPhotos: jc.numberplate_photo ? [jc.numberplate_photo] : [],
          timelineHistory: [],
        };
        profilesMap.set(vrn, profile);
      }

      // Update "last" attributes for later jobs
      if (jc.service_advisor) profile.lastAdvisor = jc.service_advisor;
      if (jc.technician_name) profile.lastTechnician = jc.technician_name;
      if (jc.created_at) {
        profile.lastServiceDate = new Date(jc.created_at).toLocaleDateString();
      }
      if (jc.sr_type_master) profile.lastServiceType = jc.sr_type_master;

      // Add photos if present
      if (jc.numberplate_photo && !profile.previousPhotos.includes(jc.numberplate_photo)) {
        profile.previousPhotos.push(jc.numberplate_photo);
      }
      if (jc.odometer_photo && !profile.previousPhotos.includes(jc.odometer_photo)) {
        profile.previousPhotos.push(jc.odometer_photo);
      }

      // Add to outstanding balance if unpaid
      if (jc.status !== "Completed" && jc.status !== "Invoiced") {
        const labor = jc.labor_price || 0;
        const parts = jc.parts_price || 0;
        profile.outstandingAmount += (labor + parts);
      }

      // Repeat complaints counter
      if ((jc.rework_count && jc.rework_count > 0) || jc.status === "Rework") {
        profile.repeatComplaintsCount += 1;
      }

      // Add timeline history event
      profile.timelineHistory.push({
        event: `Service: ${jc.job_card_no}`,
        date: jc.created_at ? new Date(jc.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        details: `Stage: ${jc.status} | Complaints: ${jc.job_description || "Routine maintenance check"}`,
      });
    });

    return Array.from(profilesMap.values());
  }, [jobCards]);

  // Filter based on input criteria
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return [];
    const query = searchTerm.toLowerCase().trim();

    return vehicleProfiles.filter((p) => {
      const matchVrn = p.vrn.toLowerCase().includes(query);
      const matchVin = p.vin.toLowerCase().includes(query);
      const matchEngine = p.engineNo.toLowerCase().includes(query);
      const matchFleet = p.fleetNo.toLowerCase().includes(query);

      if (searchField === "vrn") return matchVrn;
      if (searchField === "vin") return matchVin;
      if (searchField === "engine") return matchEngine;
      if (searchField === "fleet") return matchFleet;

      return matchVrn || matchVin || matchEngine || matchFleet;
    });
  }, [vehicleProfiles, searchTerm, searchField]);

  const handleSelectVehicle = (vehicle: VehicleProfile) => {
    setSelectedVehicle(vehicle);
    if (onSelectVehicle) {
      onSelectVehicle(vehicle);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-6 max-w-4xl mx-auto" aria-label="Vehicle Registry Search Console">
      <div className="space-y-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Search className="text-orange-500 h-6 w-6" /> Vehicle Registry Search
        </h2>
        <p className="text-xs text-slate-400">Search by Registration Number (VRN), VIN / Chassis, Engine Serial, or Fleet ID.</p>
      </div>

      {/* Search Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type vehicle plate or chassis details here..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            aria-label="Vehicle plate search input"
          />
          <Search className="absolute left-3.5 top-3.5 text-slate-500 h-4.5 w-4.5" />
        </div>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as any)}
          className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          aria-label="Filter parameter selection"
        >
          <option value="all">All Fields</option>
          <option value="vrn">Registration (VRN)</option>
          <option value="vin">VIN / Chassis</option>
          <option value="engine">Engine Serial</option>
          <option value="fleet">Fleet Number</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center text-slate-400 animate-pulse bg-slate-950 rounded-xl border border-slate-800" aria-live="polite">
          Syncing vehicle database indexes...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl" role="alert">
          System Error: {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && searchTerm && filteredProfiles.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
          No matching vehicle records registered in system.
        </div>
      )}

      {/* Search results list */}
      {!isLoading && filteredProfiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Vehicles ({filteredProfiles.length})</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.vrn}
                onClick={() => handleSelectVehicle(profile)}
                className={`p-4 bg-slate-950 hover:bg-slate-800/60 rounded-xl border transition-all text-left flex justify-between items-center ${
                  selectedVehicle?.vrn === profile.vrn ? "border-orange-500 bg-orange-500/5" : "border-slate-800"
                }`}
              >
                <div>
                  <h4 className="font-bold flex items-center gap-2">
                    {profile.vrn}
                    {profile.fleetNo !== "N/A" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Fleet: {profile.fleetNo}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    VIN: {profile.vin} | Engine: {profile.engineNo} | Make: {profile.make} {profile.model}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">₹{profile.outstandingAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">Outstanding</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Vehicle detailed metrics */}
      {!isLoading && selectedVehicle && (
        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-black">{selectedVehicle.vrn}</h3>
            <p className="text-xs text-slate-400 mt-1">
              VIN: {selectedVehicle.vin} | Engine: {selectedVehicle.engineNo} | Fleet: {selectedVehicle.fleetNo}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: Compliance & Technical */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400">Warranty Status</p>
                    <p className="text-xs font-bold mt-1">{selectedVehicle.warrantyStatus}</p>
                  </div>
                  <Shield className="h-5 w-5 text-blue-500" />
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400">Repeat Reworks</p>
                    <p className="text-xs font-bold mt-1">{selectedVehicle.repeatComplaintsCount} flags</p>
                  </div>
                  <AlertCircle className={`h-5 w-5 ${selectedVehicle.repeatComplaintsCount > 0 ? "text-orange-500" : "text-slate-600"}`} />
                </div>
              </div>

              {/* Active Campaigns */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Campaigns / Recalls</h4>
                {selectedVehicle.campaigns.length === 0 ? (
                  <p className="text-xs text-slate-500">No active recall campaigns pending.</p>
                ) : (
                  selectedVehicle.campaigns.map((c, i) => (
                    <div key={i} className="text-xs p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded">
                      ⚠️ {c}
                    </div>
                  ))
                )}
              </div>

              {/* FSBs */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Service Bulletins (FSB)</h4>
                {selectedVehicle.fsbs.map((f, i) => (
                  <div key={i} className="text-xs p-2 bg-slate-850 border border-slate-800 text-slate-300 rounded flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" /> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: Operations & History */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Repair Session</h4>
                <div className="text-xs space-y-1.5 text-slate-350">
                  <p className="flex justify-between"><span>Last Advisor:</span> <strong className="text-white">{selectedVehicle.lastAdvisor}</strong></p>
                  <p className="flex justify-between"><span>Last Technician:</span> <strong className="text-white">{selectedVehicle.lastTechnician}</strong></p>
                  <p className="flex justify-between"><span>Last Service:</span> <strong className="text-white">{selectedVehicle.lastServiceType} ({selectedVehicle.lastServiceDate})</strong></p>
                </div>
              </div>

              {/* Previous Photos */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inspection Photos Deck</h4>
                {selectedVehicle.previousPhotos.length === 0 ? (
                  <p className="text-xs text-slate-500">No active check-in photos recorded.</p>
                ) : (
                  <div className="flex gap-2">
                    {selectedVehicle.previousPhotos.map((url, i) => (
                      <div key={i} className="relative group h-14 w-20 bg-slate-800 rounded border border-slate-700 overflow-hidden">
                        <img src={url} alt="inspection snapshot" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previous Timeline History */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Timeline History</h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedVehicle.timelineHistory.map((item, i) => (
                    <div key={i} className="text-xs p-2 bg-slate-850 rounded border border-slate-800 flex justify-between items-start">
                      <div>
                        <p className="font-bold flex items-center gap-1">
                          <History className="h-3.5 w-3.5 text-slate-500" /> {item.event}
                        </p>
                        <p className="text-slate-400 mt-0.5">{item.details}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
