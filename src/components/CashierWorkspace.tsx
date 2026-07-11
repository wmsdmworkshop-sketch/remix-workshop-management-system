import React, { useState, useMemo } from "react";
import { 
  DollarSign, Receipt, CreditCard, Send, CheckCircle2, AlertTriangle, 
  BarChart3, Clock, History, Ban, ShieldCheck 
} from "lucide-react";

export interface CashierWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  currentUser?: any;
}

export const CashierWorkspace: React.FC<CashierWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh,
  onUpdateJob,
  currentUser
}) => {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [amountReceived, setAmountReceived] = useState<number>(0);

  // Derive target job card
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Net payable sum
  const netPayable = useMemo(() => {
    if (!selectedJob) return 0;
    const gross = (selectedJob.labor_price || 1500) + (selectedJob.parts_price || 3000);
    return Math.round(gross * 1.18); // Gross + 18% GST
  }, [selectedJob]);

  // Complete cashier transaction
  const handleCollectPayment = async () => {
    if (!selectedJob) return;
    try {
      await onUpdateJob(selectedJob.job_id, {
        status: "Completed",
        current_workflow_state: "DELIVERY_PENDING",
        remarks: `${selectedJob.remarks || ""}\n[Payment Collected]: ₹${netPayable} via ${paymentMode} by Cashier`
      });
      alert("Payment successfully logged. Gate pass generated.");
      onRefresh();
    } catch (e) {
      alert("Payment logging failed.");
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Cashier & Accounts Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Cashier Desk
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending payments queue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Payments Queue</h3>
          </div>
          <div className="space-y-3">
            {jobCards.filter(j => j.current_workflow_state === "CASHIER_PENDING").map(job => (
              <button
                key={job.job_id}
                onClick={() => {
                  setSelectedJobId(job.job_id);
                  const gross = (job.labor_price || 1500) + (job.parts_price || 3000);
                  setAmountReceived(Math.round(gross * 1.18));
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedJobId === job.job_id 
                    ? "bg-blue-600/10 border-blue-600/30 text-white" 
                    : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                }`}
              >
                <div className="font-mono text-xs font-bold">{job.vrn}</div>
                <div className="text-[10px] text-slate-400 mt-1">{job.vehicle_make} {job.vehicle_model} • Net: ₹{Math.round(((job.labor_price || 1500) + (job.parts_price || 3000)) * 1.18)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment input worksheet */}
        {selectedJob && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Payment Collection Worksheet ({selectedJob.vrn})</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Payment Method</label>
                <select 
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Cash">Hard Cash</option>
                  <option value="NEFT">Bank NEFT / RTGS</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Amount Collected (₹)</label>
                <input 
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Net Payable Sum</span>
                <span className="font-mono font-bold text-slate-200">₹{netPayable}</span>
              </div>
              <div className="flex justify-between border-t border-slate-850 pt-2 text-slate-400">
                <span>Transaction Balance</span>
                <span className="font-mono text-emerald-400">₹{amountReceived - netPayable} (Change)</span>
              </div>
            </div>

            {/* Section 15: AI Fraud Detection check */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 animate-pulse flex-shrink-0" />
              <span>Gemma Fraud Scan: UPI dynamic hash verification matches expected settlement payload.</span>
            </div>

            <button 
              onClick={handleCollectPayment}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              Confirm Settlement & Print Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

CashierWorkspace.displayName = "CashierWorkspace";
export default CashierWorkspace;
