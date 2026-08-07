import React, { useState, useEffect } from "react";
import { 
  DollarSign, Clock, ShieldCheck, CreditCard, Send, CheckCircle2, AlertTriangle 
} from "lucide-react";

export interface CashierWorkspaceProps {
  currentUser?: any;
}

export const CashierWorkspace: React.FC<CashierWorkspaceProps> = ({ currentUser }) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [myCredits, setMyCredits] = useState<any[]>([]);
  const [paidToday, setPaidToday] = useState<any[]>([]);
  const [gatePassReady, setGatePassReady] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  // Form states
  const [paymentMode, setPaymentMode] = useState<string>("UPI");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [creditReason, setCreditReason] = useState<string>("");

  const fetchData = async () => {
    try {
      const qRes = await fetch("/api/gate-out/cashier-queue", { headers: { Authorization: `Bearer ${currentUser?.token}` } });
      const cRes = await fetch("/api/gate-out/my-credit-requests", { headers: { Authorization: `Bearer ${currentUser?.token}` } });
      const pRes = await fetch("/api/gate-out/paid-today", { headers: { Authorization: `Bearer ${currentUser?.token}` } });
      const gpRes = await fetch("/api/gate-out/gate-pass-ready", { headers: { Authorization: `Bearer ${currentUser?.token}` } });

      if (qRes.ok) setQueue(await qRes.json());
      if (cRes.ok) setMyCredits(await cRes.json());
      if (pRes.ok) setPaidToday(await pRes.json());
      if (gpRes.ok) setGatePassReady(await gpRes.json());
    } catch (e) {
      console.error("Failed to fetch cashier data", e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleClaim = async (jobId: string) => {
    try {
      const res = await fetch("/api/gate-out/claim-task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
        body: JSON.stringify({ jobId, taskType: "CASHIER" })
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to claim: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch("/api/gate-out/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
        body: JSON.stringify({ 
          jobId: selectedJob.job_id, 
          amount: amountReceived, 
          paymentMode, 
          referenceNumber 
        })
      });
      if (res.ok) {
        alert("Payment recorded successfully");
        setSelectedJob(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to record payment: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRequestCredit = async () => {
    if (!selectedJob) return;
    if (!creditReason) return alert("Reason required for credit");
    try {
      const res = await fetch("/api/gate-out/request-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
        body: JSON.stringify({ 
          jobId: selectedJob.job_id, 
          amount: amountReceived, 
          reason: creditReason 
        })
      });
      if (res.ok) {
        alert("Credit requested successfully");
        setSelectedJob(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to request credit: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGatePass = async (jobId: string) => {
    try {
      const res = await fetch("/api/gate-out/create-gate-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        alert("Gate Pass created successfully");
        fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to create Gate Pass: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // UI helpers
  const myQueue = queue.filter(j => j.claimed_by === String(currentUser?.id || 1));
  const unassignedQueue = queue.filter(j => !j.claimed_by);
  const othersQueue = queue.filter(j => j.claimed_by && j.claimed_by !== String(currentUser?.id || 1));

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Cashier Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Cashier Desk
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Queues */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
              <Clock className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">My Tasks</h3>
            </div>
            {myQueue.length === 0 && <p className="text-xs text-slate-500">No tasks claimed.</p>}
            <div className="space-y-3">
              {myQueue.map(job => (
                <div key={job.job_id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                  <div className="font-mono text-xs font-bold text-emerald-400">{job.vrn}</div>
                  <div className="text-[10px] text-slate-400 mb-2">Net: ₹{job.crm_invoice_amount}</div>
                  
                  {job.payment_mode || job.credit_status === 'GM_APPROVED' || job.mgp_status === 'APPROVED' ? (
                    <button 
                      onClick={() => handleCreateGatePass(job.job_id)}
                      className="ds-button-success w-full py-2 text-xs font-bold uppercase rounded-lg"
                    >
                      Generate Gate Pass
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setSelectedJob(job);
                        setAmountReceived(job.crm_invoice_amount);
                      }}
                      className="w-full py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 text-xs font-bold uppercase rounded-lg"
                    >
                      Process Payment / Credit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
              <Clock className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Unassigned / Pending</h3>
            </div>
            {unassignedQueue.length === 0 && <p className="text-xs text-slate-500">No unassigned tasks.</p>}
            <div className="space-y-3">
              {unassignedQueue.map(job => (
                <div key={job.job_id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-mono text-xs font-bold text-blue-400">{job.vrn}</div>
                    <div className="text-[10px] text-slate-400">Net: ₹{job.crm_invoice_amount}</div>
                  </div>
                  <button 
                    onClick={() => handleClaim(job.job_id)}
                    className="px-3 py-1 bg-slate-800 text-slate-200 text-[10px] font-bold uppercase rounded-lg border border-slate-700"
                  >
                    Claim
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column: Active Work */}
        <div className="lg:col-span-2 space-y-6">
          {selectedJob ? (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Action: {selectedJob.vrn}</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Amount (₹)</label>
                  <input 
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Payment Method</label>
                  <select 
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Hard Cash</option>
                    <option value="NEFT">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {['UPI', 'CARD', 'NEFT'].includes(paymentMode) && (
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Reference Number</label>
                  <input 
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                    placeholder="Enter TXN ID"
                  />
                </div>
              )}

              <button 
                onClick={handleRecordPayment}
                className="ds-button-success w-full py-3 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Record Payment
              </button>

              <div className="border-t border-slate-800 pt-4 mt-4">
                <h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Or Request Credit Exception</h4>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-2 text-xs text-slate-200 outline-none"
                    placeholder="Reason for credit..."
                  />
                  <button 
                    onClick={handleRequestCredit}
                    className="px-4 bg-orange-600/20 text-orange-400 border border-orange-600/30 text-xs font-bold rounded-xl"
                  >
                    Raise Request
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
              <ShieldCheck className="h-12 w-12 text-slate-700 mb-4" />
              <h3 className="text-slate-300 font-bold">No Active Task</h3>
              <p className="text-xs text-slate-500 mt-2">Claim a task from the queue to process payment or credit.</p>
            </div>
          )}

          {/* Paid / Gate Pass lists */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-2">Completed Today (Payments)</h3>
              <div className="space-y-2">
                {paidToday.map(p => (
                  <div key={p.payment_id} className="text-xs flex justify-between">
                    <span className="font-mono text-slate-300">{p.vrn}</span>
                    <span className="text-emerald-400">₹{p.amount} ({p.payment_mode})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-800 pb-2">Pending My Credits</h3>
              <div className="space-y-2">
                {myCredits.map(c => (
                  <div key={c.credit_request_id} className="text-xs flex justify-between">
                    <span className="font-mono text-slate-300">{c.vrn}</span>
                    <span className="text-orange-400">{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierWorkspace;
