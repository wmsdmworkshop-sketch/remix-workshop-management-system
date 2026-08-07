import React, { useState } from "react";
import { CheckCircle2, DollarSign, MessageSquare, PhoneCall, AlertCircle, FileText } from "lucide-react";
import { approveEstimate } from "../hooks/useCustomerApi";

interface EstimateItem {
  id: string;
  type: "Labor" | "Spares";
  description: string;
  amount: number;
}

interface EstimateApprovalModalProps {
  jobCardNo: string;
  vrn: string;
  totalEstimateAmount: number;
  laborAmount?: number;
  partsAmount?: number;
  items?: EstimateItem[];
  onClose: () => void;
  onApproveSuccess: () => void;
}

export const EstimateApprovalModal: React.FC<EstimateApprovalModalProps> = ({
  jobCardNo,
  vrn,
  totalEstimateAmount,
  laborAmount = 4500,
  partsAmount = 10350,
  items,
  onClose,
  onApproveSuccess
}) => {
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleItems: EstimateItem[] = items || [
    { id: "1", type: "Labor", description: "Brake System Servicing & Caliper Overhaul", amount: 2500 },
    { id: "2", type: "Labor", description: "Synthetic Engine Oil & Filter Change Labour", amount: 2000 },
    { id: "3", type: "Spares", description: "Front Brake Pads Set (OEM)", amount: 4850 },
    { id: "4", type: "Spares", description: "Synthetic Engine Oil 5W30 (7 Litres)", amount: 5500 }
  ];

  const handleApproveClick = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await approveEstimate(jobCardNo);
      if (res.success) {
        onApproveSuccess();
      } else {
        setError(res.error || "Failed to approve estimate.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve estimate.");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">1-Click Estimate Approval</h3>
              <p className="text-[10px] text-slate-500 font-mono">Job Card: {jobCardNo} • VRN: {vrn}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm px-2.5 py-1 bg-slate-100 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Itemized Estimate Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Itemized Labor & Spares Breakdown</h4>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 divide-y divide-slate-200/80 text-xs">
            {sampleItems.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded mr-2 uppercase ${
                    item.type === "Labor" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                  }`}>
                    {item.type}
                  </span>
                  <span className="font-semibold text-slate-800">{item.description}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">₹{item.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {/* Consolidated Total Box */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Estimated Amount</span>
              <span className="text-xs text-slate-300 font-medium">Includes Labour, Spares & Applicable GST</span>
            </div>
            <span className="text-xl font-black text-emerald-400 font-mono">
              ₹{totalEstimateAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleApproveClick}
            disabled={approving}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {approving ? (
              <span>Authorizing Repair...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>1-Click Approve Estimate & Begin Work</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => alert(`WhatsApp chat opened with Service Advisor for ${jobCardNo}`)}
              className="py-2.5 bg-[#25D366] hover:bg-green-600 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Advisor
            </button>
            <button
              onClick={() => alert("Advisor callback requested! Service Advisor will call within 5 mins.")}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-600" /> Request Callback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
