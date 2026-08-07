import React, { useState, useEffect } from "react";
import { ShieldAlert, Clock, CheckCircle2, AlertOctagon, XCircle, FileWarning, RefreshCw, FileText } from "lucide-react";

export const WarrantyClerkWorkspace: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState("queue");
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [documentGaps, setDocumentGaps] = useState<any>(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("dwip_token");
      const res = await fetch("/api/warranty/my-queue", {
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

  const handleAction = async (reviewId: string, action: string, decision?: string, notes?: string) => {
    try {
      const token = localStorage.getItem("dwip_token");
      let url = '';
      let method = 'POST';
      let body: any = { reviewId };

      if (action === 'ACKNOWLEDGE') {
        url = '/api/warranty/acknowledge';
      } else if (action === 'ELIGIBILITY') {
        url = `/api/warranty/eligibility-check/${reviewId}`;
        method = 'GET';
        body = undefined;
      } else if (action === 'GAPS') {
        url = `/api/warranty/document-gaps/${reviewId}`;
        method = 'GET';
        body = undefined;
      } else if (action === 'ADJUDICATE') {
        url = '/api/warranty/adjudicate';
        body = { reviewId, decision, notes };
      }

      const options: any = {
        method,
        headers: { "Authorization": `Bearer ${token}` }
      };

      if (method === 'POST') {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }

      const res = await fetch(url, options);
      const data = await res.json();

      if (res.ok) {
        if (action === 'ELIGIBILITY') setEligibility(data);
        else if (action === 'GAPS') setDocumentGaps(data);
        else {
          fetchQueue();
          setSelectedReview(null);
          setEligibility(null);
          setDocumentGaps(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <div className="bg-[#5a1b8c] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">MY RESPONSIBILITY</h1>
            <p className="text-sm opacity-90 text-purple-100">{currentUser?.full_name} • Warranty Clerk</p>
          </div>
          <button onClick={fetchQueue} className="p-2 bg-white/10 rounded-full active:bg-white/20">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setActiveTab("queue")} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${activeTab === "queue" ? "bg-[#5a1b8c] text-white shadow" : "bg-white text-slate-600 border border-slate-200"}`}>
            MY QUEUE ({queue.length})
          </button>
          <button onClick={() => setActiveTab("adjudicated")} className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${activeTab === "adjudicated" ? "bg-green-600 text-white shadow" : "bg-white text-slate-600 border border-slate-200"}`}>
            MY ADJUDICATED TODAY
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {activeTab === "queue" && queue.map(rev => (
          <div key={rev.review_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`p-3 text-white flex justify-between items-center bg-slate-800`}>
              <div className="font-bold flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" />
                {rev.vrn}
              </div>
              <div className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-md">
                {rev.status}
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Complaint</div>
                <div className="font-semibold text-slate-900">{rev.complaint}</div>
              </div>

              <div className="flex justify-between items-start pt-2 border-t border-slate-100">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Failed Part</div>
                  <div className="font-semibold text-slate-800">{rev.failed_part || 'Unknown'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Odometer</div>
                  <div className="font-bold text-[#5a1b8c]">{rev.gate_odometer || 0} km</div>
                </div>
              </div>

              {selectedReview === rev.review_id ? (
                <div className="pt-4 space-y-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleAction(rev.review_id, 'ELIGIBILITY')} className="py-3 bg-purple-100 text-purple-700 rounded-xl font-bold active:bg-purple-200 transition-colors shadow-sm flex flex-col items-center justify-center border border-purple-200">
                      <ShieldAlert className="w-4 h-4 mb-1" />
                      <span className="text-xs">CHECK ELIGIBILITY</span>
                    </button>
                    <button onClick={() => handleAction(rev.review_id, 'GAPS')} className="py-3 bg-blue-100 text-blue-700 rounded-xl font-bold active:bg-blue-200 transition-colors shadow-sm flex flex-col items-center justify-center border border-blue-200">
                      <FileWarning className="w-4 h-4 mb-1" />
                      <span className="text-xs">REVIEW DOCUMENTS</span>
                    </button>
                  </div>
                  
                  {eligibility && (
                    <div className={`p-3 rounded-lg border flex items-start space-x-2 ${eligibility.eligible ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      {eligibility.eligible ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                      <div>
                        <div className="font-bold text-sm">Eligibility: {eligibility.result}</div>
                      </div>
                    </div>
                  )}

                  {documentGaps && documentGaps.hasGaps && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 space-y-2">
                      <div className="flex items-center space-x-2 font-bold text-sm">
                        <AlertOctagon className="w-4 h-4" />
                        <span>AI SUGGESTION: Document Gaps Detected</span>
                      </div>
                      <ul className="text-xs list-disc pl-5">
                        {documentGaps.gaps.map((gap: string) => <li key={gap}>{gap}</li>)}
                      </ul>
                      <button className="w-full py-2 mt-2 bg-amber-200 text-amber-900 rounded-lg font-bold text-xs active:bg-amber-300 transition-colors">
                        ALERT SERVICE ADVISOR
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button onClick={() => handleAction(rev.review_id, 'ADJUDICATE', 'APPROVE', 'Approved automatically')} className="py-4 bg-green-600 text-white rounded-xl font-bold active:bg-green-700 transition-colors shadow-sm flex flex-col items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 mb-1" />
                      <span>APPROVE</span>
                    </button>
                    <button onClick={() => handleAction(rev.review_id, 'ADJUDICATE', 'REJECT', 'Rejected by clerk')} className="py-4 bg-red-500 text-white rounded-xl font-bold active:bg-red-600 transition-colors shadow-sm flex flex-col items-center justify-center">
                      <XCircle className="w-5 h-5 mb-1" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  {rev.status === 'PENDING' ? (
                    <button onClick={() => handleAction(rev.review_id, 'ACKNOWLEDGE')} className="w-full py-4 bg-[#5a1b8c] text-white rounded-xl font-bold text-lg active:bg-purple-800 transition-colors shadow-sm">
                      ACKNOWLEDGE
                    </button>
                  ) : (
                    <button onClick={() => setSelectedReview(rev.review_id)} className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold text-lg active:bg-slate-700 transition-colors shadow-sm flex items-center justify-center">
                      <FileText className="w-5 h-5 mr-2" />
                      REVIEW & ADJUDICATE
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {activeTab === "queue" && queue.length === 0 && (
          <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
            <div className="text-lg font-semibold text-slate-700">Queue is Clear</div>
            <div className="text-sm text-slate-500">All warranty reviews have been processed.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarrantyClerkWorkspace;
