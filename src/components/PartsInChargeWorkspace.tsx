import React, { useState, useEffect } from "react";
import { Package, Clock, CheckCircle2, AlertTriangle, Archive, RefreshCw } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export const PartsInChargeWorkspace: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState("queue");
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = getStaffToken();
      const res = await fetch("/api/parts/my-queue", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (requestId: string, action: string) => {
    try {
      const token = getStaffToken();
      const url = action === 'ACKNOWLEDGE' ? '/api/parts/acknowledge' :
                  action === 'FULFILL' ? '/api/parts/fulfill' : '/api/parts/backorder';
      
      const payload: any = { requestId };
      if (action === 'BACKORDER') payload.expectedDate = new Date(Date.now() + 86400000).toISOString();

      await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      fetchQueue();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-[#002f6c] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">MY RESPONSIBILITY</h1>
            <p className="text-sm opacity-90 text-blue-100">{currentUser?.full_name} • Parts In-Charge</p>
          </div>
          <button onClick={fetchQueue} className="p-2 bg-white/10 rounded-full active:bg-white/20">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveTab("queue")} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${activeTab === "queue" ? "bg-[#002f6c] text-white shadow" : "bg-white text-slate-600 border border-slate-200"}`}>
            MY QUEUE ({queue.length})
          </button>
          <button onClick={() => setActiveTab("fulfilled")} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${activeTab === "fulfilled" ? "bg-green-600 text-white shadow" : "bg-white text-slate-600 border border-slate-200"}`}>
            MY FULFILLED TODAY
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {activeTab === "queue" && queue.map(req => (
          <div key={req.request_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`p-3 text-white flex justify-between items-center ${req.urgency === 'URGENT' ? 'bg-red-600' : 'bg-slate-800'}`}>
              <div className="font-bold flex items-center">
                <Package className="w-4 h-4 mr-2" />
                {req.vrn}
              </div>
              <div className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-md">
                {req.urgency}
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Requested Part</div>
                  <div className="font-semibold text-lg text-slate-900">{req.part_code || 'Unknown Part'}</div>
                  <div className="text-sm text-slate-600">{req.part_description}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Qty</div>
                  <div className="font-bold text-2xl text-[#002f6c]">{req.quantity}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {req.requested_by?.substring(0, 2).toUpperCase() || 'TE'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{req.requested_by}</div>
                  <div className="text-xs text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(req.requested_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {req.status === 'PENDING' ? (
                  <button onClick={() => handleAction(req.request_id, 'ACKNOWLEDGE')} className="w-full py-4 bg-[#002f6c] text-white rounded-xl font-bold text-lg active:bg-blue-800 transition-colors shadow-sm">
                    ACKNOWLEDGE
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAction(req.request_id, 'FULFILL')} className="py-4 bg-green-600 text-white rounded-xl font-bold active:bg-green-700 transition-colors shadow-sm flex flex-col items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 mb-1" />
                      <span>FULFILL</span>
                    </button>
                    <button onClick={() => handleAction(req.request_id, 'BACKORDER')} className="py-4 bg-amber-500 text-white rounded-xl font-bold active:bg-amber-600 transition-colors shadow-sm flex flex-col items-center justify-center">
                      <Archive className="w-5 h-5 mb-1" />
                      <span>BACKORDER</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {activeTab === "queue" && queue.length === 0 && (
          <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
            <div className="text-lg font-semibold text-slate-700">Queue is Clear</div>
            <div className="text-sm text-slate-500">All parts requests have been processed.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartsInChargeWorkspace;
