import React, { useState, useMemo } from "react";
import { 
  Package, Search, Sparkles, Send, CheckCircle2, AlertTriangle, 
  TrendingUp, BarChart3, LayoutGrid, Calendar, Truck 
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

export interface PartsCommandCenterProps {
  jobCards: any[];
  onRefresh: () => void;
  currentUser?: any;
  aiModeEnabled?: boolean;
}

export const PartsCommandCenter: React.FC<PartsCommandCenterProps> = React.memo(({
  jobCards = [],
  onRefresh,
  currentUser,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("inventory");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Section 1: Parts inventory mockup database
  const inventoryItems = [
    { partNo: "TATA-2541-A1", desc: "Front Brake Pads (LPT 1613)", stock: 45, rack: "A1", bin: "12", demand: "High", price: 2400 },
    { partNo: "TATA-9982-E2", desc: "EV Coolant Seal Ring", stock: 12, rack: "E2", bin: "04", demand: "Medium", price: 450 },
    { partNo: "TATA-1123-M5", desc: "Fuel Filter Element (Signa)", stock: 8, rack: "M5", bin: "18", demand: "Critical", price: 1200 },
    { partNo: "TATA-8872-B3", desc: "HV Isolation Relay Unit", stock: 2, rack: "B3", bin: "01", demand: "High", price: 8500 }
  ];

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventoryItems.filter(item => 
      item.partNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, inventoryItems]);
  // Dynamic Spares KPIs Calculation
  const sparesKpis = useMemo(() => {
    const totalValuation = inventoryItems.reduce((sum, item) => sum + (item.stock * item.price), 0);
    const fastMoving = inventoryItems.filter(item => item.stock > 10).length;
    const deadStock = inventoryItems.filter(item => item.stock <= 2).length;
    const pendingPartsRequests = jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING").length;
    const fillRate = jobCards.length > 0 
      ? `${Math.max(0, Math.round(((jobCards.length - pendingPartsRequests) / jobCards.length) * 100))}%` 
      : "100%";

    return {
      fillRate,
      valuation: totalValuation >= 100000 
        ? `₹${(totalValuation / 100000).toFixed(2)} Lakhs` 
        : `₹${totalValuation.toLocaleString()}`,
      fastMoving: `${fastMoving} SKUs`,
      deadStock: `${deadStock} SKUs`
    };
  }, [inventoryItems, jobCards]);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              Parts Command Center
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Inventory & Spares Command
          </h1>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "inventory", label: "Inventory & Bins" },
            { id: "copilot", label: "AI Parts Copilot" },
            { id: "orders", label: "Emergency & POs" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "inventory" && (
        <div className="space-y-6">
          {/* Inventory search and metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Search className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Search Stock Catalog</h3>
              </div>
              <input 
                type="text" 
                placeholder="Search Part Number, Description, Rack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
              />
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {filteredInventory.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-200">{item.partNo}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc} • Rack {item.rack} / Bin {item.bin}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-200">Stock: {item.stock}</span>
                      <span className="block text-[9px] text-slate-500 font-bold uppercase mt-0.5">₹{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Spares KPIs</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fill Rate</span>
                  <span className="font-bold text-emerald-400">{sparesKpis.fillRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Inventory Valuation</span>
                  <span className="font-bold text-slate-200">{sparesKpis.valuation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fast Moving Items</span>
                  <span className="font-bold text-blue-400">{sparesKpis.fastMoving}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dead Stock SKUs</span>
                  <span className="font-bold text-red-400">{sparesKpis.deadStock}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "copilot" && (
        <AICopilotPanel 
          role="Parts Manager"
          context={{
            inventoryCount: inventoryItems.length,
            criticalStockList: inventoryItems.filter(i => i.demand === "Critical")
          }}
        />
      )}

      {activeTab === "orders" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Truck className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Emergency & Purchase Orders</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-200">PO #88921-T</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Supplier: Tata Motors Logistics • 45 Items</div>
              </div>
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 font-bold text-[10px] rounded">In Transit</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-200">Emergency Order #9910-VOR</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Vehicle on Road (VOR) priority • 1 HV Relay</div>
              </div>
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 font-bold text-[10px] rounded animate-pulse">Critical</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PartsCommandCenter.displayName = "PartsCommandCenter";
export default PartsCommandCenter;
