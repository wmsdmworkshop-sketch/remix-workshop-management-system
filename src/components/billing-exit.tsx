import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, AlertCircle, FileText, Search, ShieldCheck } from 'lucide-react';
import { JobCard } from '../types';

export default function BillingExit() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Dialog state
  const [billingJobId, setBillingJobId] = useState<number | null>(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchJobCards();
  }, []);

  const fetchJobCards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/job-cards');
      const data = await res.json();
      const jobCardsArray = Array.isArray(data) ? data : (data.jobCards || []);
      // Filter: gate_out_time is null AND billing_status !== 'Invoiced' AND invoice_no does not start with 'IDEVAN2627'
      const filtered = jobCardsArray.filter((jc: JobCard) => {
        const isStillInWorkshop = jc.gate_out_time === null || jc.gate_out_time === undefined || jc.gate_out_time === '';
        const isNotInvoiced = jc.billing_status !== 'Invoiced';
        const isNotOldBilled = !(jc.invoice_no && jc.invoice_no.startsWith('IDEVAN2627'));
        return isStillInWorkshop && isNotInvoiced && isNotOldBilled;
      });
      setJobCards(filtered);
    } catch (e) {
      console.error('Failed to fetch job cards for billing:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsBilledSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingJobId) return;

    setFormError('');
    setActionLoading(true);

    // Invoice pattern: IDEVAN[0-9]{4}[0-9]{6}
    const invoicePattern = /^IDEVAN\d{4}\d{6}$/;
    if (!invoicePattern.test(invoiceNo)) {
      setFormError('Invoice number must match pattern: IDEVAN[YYYY][6-digit-no] (e.g. IDEVAN2026123456)');
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/job-cards/${billingJobId}/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_no: invoiceNo })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg('Job card successfully marked as Billed!');
        setBillingJobId(null);
        setInvoiceNo('');
        fetchJobCards();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setFormError(data.error || 'Failed to update billing status.');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredList = jobCards.filter(
    (jc) =>
      jc.job_card_no.toLowerCase().includes(search.toLowerCase()) ||
      jc.vrn.toLowerCase().includes(search.toLowerCase()) ||
      jc.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <DollarSign className="w-8 h-8 text-indigo-600" />
          Billing & Gate Exit Manager
        </h1>
        <p className="text-slate-500 mt-1">
          Perform cashier validation, generate final invoices, and mark vehicle records as billed to permit gate pass exit clearance.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {/* Main Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search bar */}
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">Pending Billing Queue</h2>
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 h-5 text-slate-400" />
            </span>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Search VRN, Job Card No, Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 pl-6">Job Card No</th>
                <th className="p-4">VRN</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Odometer</th>
                <th className="p-4">Workshop Stage</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Loading billing queue...
                  </td>
                </tr>
              ) : filteredList.map((jc) => (
                <tr key={jc.job_id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 pl-6 font-semibold text-slate-900">{jc.job_card_no}</td>
                  <td className="p-4 font-mono font-bold text-slate-800">{jc.vrn}</td>
                  <td className="p-4">{jc.customer_name}</td>
                  <td className="p-4">{jc.km_reading ? `${jc.km_reading} KM` : 'N/A'}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                      {jc.workshop_stage || 'Ready'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => {
                        setBillingJobId(jc.job_id);
                        setInvoiceNo('');
                        setFormError('');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wide transition active:scale-[0.98] shadow-sm hover:shadow"
                    >
                      Mark as Billed
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No pending vehicles requiring billing in the workshop.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark As Billed Modal Dialog */}
      {billingJobId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Provide Invoice Details
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter the final DMS system invoice number to complete checkout.
              </p>
            </div>

            <form onSubmit={handleMarkAsBilledSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="IDEVAN2026123456"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
                />
                <span className="text-[10px] text-slate-400 mt-1.5 block">Format: IDEVAN[4-digit-year][6-digit-sequence]</span>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setBillingJobId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {actionLoading ? 'Saving...' : 'Confirm Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
