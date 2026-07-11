import React, { useState, useEffect, useMemo } from "react";
import { Search, Shield, Award, AlertTriangle, History, DollarSign, User } from "lucide-react";
import { JobCard } from "../../types";

export interface CustomerProfile {
  customerCode: string;
  name: string;
  mobile: string;
  gstin: string;
  isFleet: boolean;
  vehicles: Array<{
    vrn: string;
    make: string;
    model: string;
    year: number;
    warrantyStatus: string;
    hasAMC: boolean;
  }>;
  outstandingAmount: number;
  hasActiveWarranty: boolean;
  hasActiveAMC: boolean;
  repeatComplaintsCount: number;
  recentVisits: Array<{
    jobCardNo: string;
    date: string;
    status: string;
    complaints: string;
  }>;
}

export interface CustomerSearchProps {
  onSelectCustomer?: (customer: CustomerProfile) => void;
  isLoading?: boolean;
  error?: string | null;
}

export default function CustomerSearch({
  onSelectCustomer,
  isLoading: propIsLoading = false,
  error: propError = null,
}: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"all" | "mobile" | "name" | "gstin" | "fleet" | "code">("all");
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(propIsLoading);
  const [error, setError] = useState<string | null>(propError);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  // Load Job Cards from existing API on mount
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

  // Construct Customer Profiles from Job Cards
  const customerProfiles = useMemo(() => {
    const profilesMap = new Map<string, CustomerProfile>();

    jobCards.forEach((jc) => {
      const mobile = jc.customer_mobile ? jc.customer_mobile.trim() : "";
      if (!mobile) return;

      const name = jc.customer_name ? jc.customer_name.trim() : "Unknown Customer";
      const key = mobile.slice(-10); // Standardize on last 10 digits

      let profile = profilesMap.get(key);
      if (!profile) {
        // Deterministic mock generation based on mobile for parameters not in DB
        const suffix = mobile.slice(-4);
        const hasGstin = parseInt(suffix) % 2 === 0;
        const gstin = hasGstin ? `27AAAAA${suffix}A1Z2` : "N/A";
        const isFleet = jc.priority === "Fleet" || parseInt(suffix) % 3 === 0;
        const hasActiveAMC = parseInt(suffix) % 4 === 0;

        profile = {
          customerCode: `CUST-${suffix}`,
          name,
          mobile,
          gstin,
          isFleet,
          vehicles: [],
          outstandingAmount: 0,
          hasActiveWarranty: false,
          hasActiveAMC,
          repeatComplaintsCount: 0,
          recentVisits: [],
        };
        profilesMap.set(key, profile);
      }

      // Add vehicle if unique
      const vrn = jc.vrn ? jc.vrn.trim().toUpperCase() : "";
      if (vrn && !profile.vehicles.some((v) => v.vrn === vrn)) {
        profile.vehicles.push({
          vrn,
          make: jc.vehicle_make || "Tata",
          model: jc.vehicle_model || "Nexon",
          year: jc.vehicle_year || 2022,
          warrantyStatus: jc.warranty_status || "Standard",
          hasAMC: profile.hasActiveAMC,
        });
      }

      // Update outstanding amount (simulate from unpaid job cards)
      if (jc.status !== "Completed" && jc.status !== "Invoiced") {
        const labor = jc.labor_price || 0;
        const parts = jc.parts_price || 0;
        profile.outstandingAmount += (labor + parts);
      }

      // Update active warranty status flag
      if (jc.warranty_status === "Standard" || jc.warranty_status === "Extended") {
        profile.hasActiveWarranty = true;
      }

      // Update repeat complaints count
      if ((jc.rework_count && jc.rework_count > 0) || jc.status === "Rework") {
        profile.repeatComplaintsCount += 1;
      }

      // Add to recent visits
      profile.recentVisits.push({
        jobCardNo: jc.job_card_no,
        date: jc.created_at ? new Date(jc.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        status: jc.status,
        complaints: jc.job_description || "Routine maintenance check",
      });
    });

    return Array.from(profilesMap.values());
  }, [jobCards]);

  // Filter profiles based on search query and field
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return [];
    const query = searchTerm.toLowerCase().trim();

    return customerProfiles.filter((p) => {
      const matchMobile = p.mobile.includes(query);
      const matchName = p.name.toLowerCase().includes(query);
      const matchGstin = p.gstin.toLowerCase().includes(query);
      const matchFleet = p.isFleet && query === "fleet";
      const matchCode = p.customerCode.toLowerCase().includes(query);

      if (searchField === "mobile") return matchMobile;
      if (searchField === "name") return matchName;
      if (searchField === "gstin") return matchGstin;
      if (searchField === "fleet") return matchFleet;
      if (searchField === "code") return matchCode;

      return matchMobile || matchName || matchGstin || matchCode;
    });
  }, [customerProfiles, searchTerm, searchField]);

  const handleSelectCustomer = (customer: CustomerProfile) => {
    setSelectedCustomer(customer);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 space-y-6 max-w-4xl mx-auto" aria-label="Customer Demographics Search Panel">
      <div className="space-y-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <User className="text-orange-500 h-6 w-6" /> Customer Demographics Search
        </h2>
        <p className="text-xs text-slate-400">Search by Customer Name, Mobile, GSTIN, Fleet tag, or Customer Code.</p>
      </div>

      {/* Search Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 relative">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type search queries here..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            aria-label="Customer demographics search input"
          />
          <Search className="absolute left-3.5 top-3.5 text-slate-500 h-4.5 w-4.5" />
        </div>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as any)}
          className="p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500"
          aria-label="Filter search parameter selection"
        >
          <option value="all">All Fields</option>
          <option value="name">Customer Name</option>
          <option value="mobile">Mobile Number</option>
          <option value="gstin">GSTIN</option>
          <option value="fleet">Fleet Status</option>
          <option value="code">Customer Code</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-12 text-center text-slate-400 animate-pulse bg-slate-950 rounded-xl border border-slate-800" aria-live="polite">
          Syncing customer profiles registry...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl" role="alert">
          System Error: {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && searchTerm && filteredProfiles.length === 0 && (
        <div className="p-12 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
          No matching customer accounts found in system.
        </div>
      )}

      {/* Search Results List */}
      {!isLoading && filteredProfiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matching Accounts ({filteredProfiles.length})</h3>
          <div className="grid grid-cols-1 gap-2.5">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.customerCode}
                onClick={() => handleSelectCustomer(profile)}
                className={`p-4 bg-slate-950 hover:bg-slate-800/60 rounded-xl border transition-all text-left flex justify-between items-center ${
                  selectedCustomer?.customerCode === profile.customerCode ? "border-orange-500 bg-orange-500/5" : "border-slate-800"
                }`}
              >
                <div>
                  <h4 className="font-bold flex items-center gap-2">
                    {profile.name}
                    {profile.isFleet && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        Fleet
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Code: {profile.customerCode} | Mobile: {profile.mobile} | GSTIN: {profile.gstin}
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

      {/* Selected Customer Detailed Profile Panel */}
      {!isLoading && selectedCustomer && (
        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-black">{selectedCustomer.name}</h3>
            <p className="text-xs text-slate-400 mt-1">Customer Code: {selectedCustomer.customerCode} | GSTIN: {selectedCustomer.gstin}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Vehicles & Assets */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Vehicles</h4>
                <div className="space-y-2">
                  {selectedCustomer.vehicles.map((v) => (
                    <div key={v.vrn} className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{v.vrn}</p>
                        <p className="text-xs text-slate-400">{v.make} {v.model} ({v.year})</p>
                      </div>
                      <div className="flex gap-1">
                        {v.warrantyStatus !== "N/A" && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Warranty
                          </span>
                        )}
                        {v.hasAMC && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                            <Award className="h-3 w-3" /> AMC
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400">AMC Status</p>
                    <p className="text-xs font-bold mt-1">{selectedCustomer.hasActiveAMC ? "Active" : "None"}</p>
                  </div>
                  <Award className={`h-5 w-5 ${selectedCustomer.hasActiveAMC ? "text-green-500" : "text-slate-600"}`} />
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-slate-400">Warranty Status</p>
                    <p className="text-xs font-bold mt-1">{selectedCustomer.hasActiveWarranty ? "Active" : "None"}</p>
                  </div>
                  <Shield className={`h-5 w-5 ${selectedCustomer.hasActiveWarranty ? "text-blue-500" : "text-slate-600"}`} />
                </div>
              </div>
            </div>

            {/* Right Column: Complaints & History */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Repeat Complaints</h4>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs">Rework / Repeat Visits Flagged</p>
                    <p className="text-sm font-black mt-1">{selectedCustomer.repeatComplaintsCount} Incidents</p>
                  </div>
                  <AlertTriangle className={`h-5 w-5 ${selectedCustomer.repeatComplaintsCount > 0 ? "text-orange-500 animate-bounce" : "text-slate-600"}`} />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Visits History</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedCustomer.recentVisits.map((visit) => (
                    <div key={visit.jobCardNo} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/60 text-xs flex justify-between items-start">
                      <div>
                        <p className="font-bold flex items-center gap-1">
                          <History className="h-3.5 w-3.5 text-slate-500" /> {visit.jobCardNo}
                        </p>
                        <p className="text-slate-400 mt-0.5">{visit.complaints}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{visit.date}</span>
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
