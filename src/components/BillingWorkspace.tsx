import React, { useState, useMemo } from "react";
import { 
  FileText, Percent, ShieldCheck, Mail, Send, CheckCircle2, 
  AlertTriangle, DollarSign, Users, Clock, History, FileDown 
} from "lucide-react";

export interface BillingWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<void>;
  currentUser?: any;
}

export const BillingWorkspace: React.FC<BillingWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh,
  onUpdateJob,
  currentUser
}) => {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [billingType, setBillingType] = useState<string>("Retail");

  // Derive target job card
  const selectedJob = useMemo(() => {
    return jobCards.find(j => j.job_id === selectedJobId) || jobCards[0] || null;
  }, [jobCards, selectedJobId]);

  // Invoice calculations
  const invoiceData = useMemo(() => {
    if (!selectedJob) return null;
    const labor = selectedJob.labor_price || 1500;
    const parts = selectedJob.parts_price || 3000;
    const gross = labor + parts;
    const discount = Math.round(gross * (discountPercent / 100));
    const taxable = gross - discount;
    const cgst = Math.round(taxable * 0.09);
    const sgst = Math.round(taxable * 0.09);
    const total = taxable + cgst + sgst;

    return { labor, parts, gross, discount, taxable, cgst, sgst, total };
  }, [selectedJob, discountPercent]);

  // Complete billing
  const handleCompleteBilling = async () => {
    if (!selectedJob || !invoiceData) return;
    try {
      await onUpdateJob(selectedJob.job_id, {
        status: "Completed",
        current_workflow_state: "CASHIER_PENDING",
        remarks: `${selectedJob.remarks || ""}\n[Billing Finalized]: Total Invoice: ₹${invoiceData.total} | GST: ₹${invoiceData.cgst + invoiceData.sgst}`
      });
      alert("Invoice successfully generated and sent to Cashier desk.");
      onRefresh();
    } catch (e) {
      alert("Failed to finalize invoice.");
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
              Billing & Invoicing Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Billing Terminal
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs queue waiting for billing */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Billing queue</h3>
          </div>
          <div className="space-y-3">
            {jobCards.filter(j => j.current_workflow_state === "BILLING_PENDING").map(job => (
              <button
                key={job.job_id}
                onClick={() => setSelectedJobId(job.job_id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedJobId === job.job_id 
                    ? "bg-blue-600/10 border-blue-600/30 text-white" 
                    : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                }`}
              >
                <div className="font-mono text-xs font-bold">{job.vrn}</div>
                <div className="text-[10px] text-slate-400 mt-1">{job.vehicle_make} {job.vehicle_model} • ₹{(job.labor_price || 0) + (job.parts_price || 0)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Invoice details and inputs */}
        {selectedJob && invoiceData && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <FileText className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Invoice Worksheet ({selectedJob.vrn})</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Billing Channel</label>
                <select 
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="Retail">Retail Billing</option>
                  <option value="Fleet">Fleet Billing</option>
                  <option value="Insurance">Insurance Claim</option>
                  <option value="Warranty">Warranty Settlement</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Discounts (%)</label>
                <input 
                  type="number"
                  min={0}
                  max={50}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Calculations layout table */}
            <div className="border border-slate-850 p-4 rounded-xl bg-slate-950/40 text-xs space-y-2">
              <div className="flex justify-between">
                <span>Labour charges</span>
                <span>₹{invoiceData.labor}</span>
              </div>
              <div className="flex justify-between">
                <span>Parts charges</span>
                <span>₹{invoiceData.parts}</span>
              </div>
              <div className="flex justify-between border-t border-slate-850 pt-2 text-slate-400">
                <span>Gross Total</span>
                <span>₹{invoiceData.gross}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Discount Applied</span>
                <span>-₹{invoiceData.discount}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST (9%)</span>
                <span>₹{invoiceData.cgst}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST (9%)</span>
                <span>₹{invoiceData.sgst}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-sm text-emerald-400">
                <span>Net Payable Invoice</span>
                <span>₹{invoiceData.total}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => alert("Invoice PDF download started.")}
                className="flex items-center gap-1 px-4 py-2 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-all"
              >
                <FileDown className="h-3.5 w-3.5" /> PDF Invoice
              </button>
              <button 
                onClick={handleCompleteBilling}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors ml-auto"
              >
                Finalize & Dispatch Invoice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

BillingWorkspace.displayName = "BillingWorkspace";
export default BillingWorkspace;
