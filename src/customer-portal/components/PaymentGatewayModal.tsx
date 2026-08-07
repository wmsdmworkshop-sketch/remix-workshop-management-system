import React, { useState } from "react";
import { CreditCard, QrCode, DollarSign, CheckCircle2, ShieldCheck, Download, Smartphone, AlertCircle } from "lucide-react";
import { payInvoice } from "../hooks/useCustomerApi";

interface PaymentGatewayModalProps {
  invoiceNo: string;
  amount: number;
  vrn: string;
  jobCardNo?: string;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  invoiceNo,
  amount,
  vrn,
  jobCardNo = "",
  onClose,
  onPaymentSuccess
}) => {
  const [method, setMethod] = useState<"upi" | "card" | "netbanking" | "counter">("upi");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayNow = async () => {
    setPaying(true);
    setError(null);
    try {
      const res = await payInvoice({
        jobCardNo: jobCardNo || invoiceNo.replace(/^INV-?/, ""),
        method,
        amount,
      });
      if (res.success) {
        onPaymentSuccess();
      } else {
        setError(res.error || "Payment processing failed.");
      }
    } catch (err: any) {
      setError(err.message || "Payment processing failed.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Instant Payment Gateway</h3>
              <p className="text-[10px] text-slate-500 font-mono">Invoice: {invoiceNo} • VRN: {vrn}</p>
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

        {/* Invoice Amount Display */}
        <div className="bg-slate-950 text-white p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Payable Invoice Amount</span>
            <span className="text-xs text-slate-300">GST Inclusive Final Consolidated Invoice</span>
          </div>
          <span className="text-xl font-black text-emerald-400 font-mono">
            ₹{amount.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Select Payment Method */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Select Payment Method</label>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => setMethod("upi")}
              className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 cursor-pointer transition ${
                method === "upi"
                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-600/20"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>UPI (GPay / PhonePe)</span>
            </button>

            <button
              onClick={() => setMethod("card")}
              className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 cursor-pointer transition ${
                method === "card"
                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-600/20"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Credit / Debit Card</span>
            </button>

            <button
              onClick={() => setMethod("netbanking")}
              className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 cursor-pointer transition ${
                method === "netbanking"
                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-600/20"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Netbanking (All Banks)</span>
            </button>

            <button
              onClick={() => setMethod("counter")}
              className={`p-3 rounded-xl border text-left font-bold flex items-center gap-2 cursor-pointer transition ${
                method === "counter"
                  ? "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-600/20"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span>Pay at Workshop</span>
            </button>
          </div>
        </div>

        {/* Details based on method */}
        {method === "upi" && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-2">
            <div className="inline-block p-3 bg-white border border-slate-300 rounded-xl shadow-sm">
              <QrCode className="w-24 h-24 text-slate-900 mx-auto" />
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Scan QR or tap below to open Google Pay / PhonePe / Paytm / BHIM</p>
          </div>
        )}

        {/* Submit Payment */}
        <button
          onClick={handlePayNow}
          disabled={paying}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          {paying ? (
            <span>Processing Payment...</span>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Pay ₹{amount.toLocaleString('en-IN')} & Generate Receipt</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
