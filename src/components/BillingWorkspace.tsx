import React, { useState, useMemo, useEffect, useCallback } from "react";
import MediaAttach from "./MediaAttach";
import { getStaffToken } from "../lib/authToken";
import {
  FileText, ShieldCheck, CheckCircle2,
  AlertTriangle, Clock, FileDown
} from "lucide-react";

export interface BillingWorkspaceProps {
  jobCards: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<boolean | void>;
  currentUser?: any;
}

/**
 * Billing Officer terminal — wired to the real billing-engine.ts chain
 * (billing.routes.ts, mounted at /api/billing): my-queue -> acknowledge ->
 * validate -> crm-invoice. Pre-invoice compile/review/send-to-customer is the
 * SA's own step (ServiceAdvisorWorkspace), not this screen's job — this
 * screen only ever sees a pre-invoice once the SA has handed it off.
 *
 * Replaces what used to be an entirely client-side GST calculator (fixed
 * 9%/9% CGST/SGST on labor_price/parts_price fallback constants) whose
 * "Finalize & Dispatch" button just patched local job-card fields with no
 * real invoice, validation, or CRM evidence record behind it.
 */
export const BillingWorkspace: React.FC<BillingWorkspaceProps> = React.memo(({
  jobCards = [],
  onRefresh,
  currentUser
}) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedPi, setSelectedPi] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; blockers: any[] } | null>(null);

  // CRM invoice capture form
  const [crmInvoiceNumber, setCrmInvoiceNumber] = useState("");
  const [crmInvoiceDate, setCrmInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [crmInvoiceAmount, setCrmInvoiceAmount] = useState<number>(0);
  const [invoiceEvidenceId, setInvoiceEvidenceId] = useState<string>("");
  const [varianceAcknowledged, setVarianceAcknowledged] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const res = await fetch("/api/billing/my-queue", { headers: authHeaders() });
      const data = await res.json();
      setQueue(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setQueue([]);
    }
    setLoadingQueue(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // The job card matching the selected pre-invoice (for VRN/job-card-no
  // context used by MediaAttach and the evidence lookup).
  const selectedJob = useMemo(() => {
    if (!selectedPi) return null;
    return jobCards.find(j => j.job_id === selectedPi.job_id) || null;
  }, [jobCards, selectedPi]);

  useEffect(() => {
    if (selectedPi) {
      setCrmInvoiceAmount(selectedPi.grand_total || 0);
      setValidation(null);
      setInvoiceEvidenceId("");
      setVarianceAcknowledged(false);
    }
  }, [selectedPi?.pre_invoice_id]);

  const handleAcknowledge = async (pi: any) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/acknowledge/${pi.pre_invoice_id}`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to acknowledge."); setBusy(false); return; }
      await loadQueue();
      setSelectedPi({ ...pi, status: "BILLING_IN_PROGRESS" });
    } catch (e: any) {
      alert(`Failed to acknowledge: ${e.message || "network error"}`);
    }
    setBusy(false);
  };

  const handleValidate = async () => {
    if (!selectedPi) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/billing/validate/${selectedPi.pre_invoice_id}`, { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Validation request failed."); setBusy(false); return; }
      setValidation(data.data);
    } catch (e: any) {
      alert(`Validation failed: ${e.message || "network error"}`);
    }
    setBusy(false);
  };

  // Pull the most recently uploaded INVOICE-category evidence for this job so
  // the officer isn't asked to hand-type an internal evidence id.
  const fetchLatestInvoiceEvidence = async () => {
    if (!selectedJob?.job_card_no) return;
    try {
      const res = await fetch(`/api/evidence/job-card/${encodeURIComponent(selectedJob.job_card_no)}`, { headers: authHeaders() });
      const data = await res.json();
      const invoiceEvidence = (data?.records || []).find((r: any) => r.ocr_type === "INVOICE" || r.category === "INVOICE");
      if (invoiceEvidence?.evidence_id) setInvoiceEvidenceId(invoiceEvidence.evidence_id);
      else alert("No invoice document found yet — upload one below first, then try again.");
    } catch {
      alert("Failed to look up uploaded invoice evidence.");
    }
  };

  const handleCaptureCrmInvoice = async () => {
    if (!selectedPi) return;
    if (!crmInvoiceNumber.trim()) { alert("Enter the CRM invoice number."); return; }
    if (!invoiceEvidenceId) { alert("Attach the invoice PDF/photo and link its evidence id first."); return; }
    if (!confirm(`Confirm CRM invoice ${crmInvoiceNumber} for ₹${crmInvoiceAmount.toLocaleString("en-IN")}? This is a human confirmation of the final invoice details.`)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/billing/crm-invoice/${selectedPi.pre_invoice_id}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          crm_invoice_number: crmInvoiceNumber.trim(),
          crm_invoice_date: crmInvoiceDate,
          crm_invoice_amount: crmInvoiceAmount,
          invoice_pdf_evidence_id: invoiceEvidenceId,
          human_confirmed: true,
          variance_acknowledged: varianceAcknowledged,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to capture CRM invoice."); setBusy(false); return; }
      alert(`Invoice ${crmInvoiceNumber} recorded. Job moved to Cashier.`);
      setSelectedPi(null);
      await loadQueue();
      onRefresh();
    } catch (e: any) {
      alert(`Failed to capture CRM invoice: ${e.message || "network error"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full animate-pulse" />
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
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Billing Queue</h3>
          </div>
          <div className="space-y-3">
            {loadingQueue ? (
              <p className="text-xs text-slate-400 text-center py-6">Loading queue…</p>
            ) : queue.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No pre-invoices handed off to billing yet.</p>
            ) : (
              queue.map(pi => (
                <button
                  key={pi.pre_invoice_id}
                  onClick={() => setSelectedPi(pi)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedPi?.pre_invoice_id === pi.pre_invoice_id
                      ? "bg-blue-600/10 border-blue-600/30 text-white"
                      : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                  }`}
                >
                  <div className="font-mono text-xs font-bold">{pi.vrn}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{pi.customer_name} • ₹{Number(pi.grand_total || 0).toLocaleString("en-IN")}</div>
                  <div className="text-[9px] font-bold uppercase mt-1 text-amber-400">{pi.status}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedPi && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <FileText className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pre-Invoice ({selectedPi.vrn}) — {selectedPi.status}</h3>
            </div>

            <div className="border border-slate-850 p-4 rounded-xl bg-slate-950/40 text-xs space-y-2">
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-sm text-emerald-400">
                <span>Grand Total (server-computed)</span>
                <span>₹{Number(selectedPi.grand_total || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {selectedPi.status === "BILLING_HANDED_OFF" && (
              <button
                onClick={() => handleAcknowledge(selectedPi)}
                disabled={busy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                Acknowledge Handoff
              </button>
            )}

            {selectedPi.status === "BILLING_IN_PROGRESS" && (
              <>
                <button
                  onClick={handleValidate}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-850 hover:border-slate-800 disabled:opacity-60 text-slate-200 text-xs font-bold rounded-xl transition-all"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Run Billing Validation
                </button>

                {validation && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1 ${validation.valid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    <div className="flex items-center gap-1.5 font-bold uppercase">
                      {validation.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      {validation.valid ? "All checks passed" : `${validation.blockers.length} blocker(s)`}
                    </div>
                    {!validation.valid && (
                      <ul className="list-disc list-inside space-y-0.5">
                        {validation.blockers.map((b: any, i: number) => <li key={i}>[{b.code}] {b.description}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                {validation?.valid && (
                  <div className="space-y-4 pt-2 border-t border-slate-850">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">CRM Invoice Capture</h4>

                    {selectedJob && (
                      <MediaAttach
                        jobCardNo={selectedJob.job_card_no}
                        vrn={selectedJob.vrn}
                        title="Invoice PDF / Photo"
                        categories={[{ key: "INVOICE", label: "Bill / Invoice" }]}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">CRM Invoice Number</label>
                        <input
                          type="text"
                          value={crmInvoiceNumber}
                          onChange={(e) => setCrmInvoiceNumber(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Invoice Date</label>
                        <input
                          type="date"
                          value={crmInvoiceDate}
                          onChange={(e) => setCrmInvoiceDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Invoice Amount (INR)</label>
                        <input
                          type="number"
                          value={crmInvoiceAmount}
                          onChange={(e) => setCrmInvoiceAmount(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button
                          onClick={fetchLatestInvoiceEvidence}
                          className="px-3 py-2 bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-300 text-[10px] font-bold uppercase rounded-xl"
                        >
                          {invoiceEvidenceId ? "Evidence linked ✓" : "Link uploaded invoice"}
                        </button>
                      </div>
                    </div>

                    {Math.abs(crmInvoiceAmount - Number(selectedPi.grand_total || 0)) > 0.02 * Number(selectedPi.grand_total || 1) && (
                      <label className="flex items-center gap-2 text-[11px] text-amber-400">
                        <input type="checkbox" checked={varianceAcknowledged} onChange={(e) => setVarianceAcknowledged(e.target.checked)} />
                        CRM amount differs from the pre-invoice total by more than 2% — acknowledge this variance
                      </label>
                    )}

                    <button
                      onClick={handleCaptureCrmInvoice}
                      disabled={busy}
                      className="ds-button-success px-5 py-2 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                      Confirm Invoice & Send to Cashier
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

BillingWorkspace.displayName = "BillingWorkspace";
export default BillingWorkspace;
