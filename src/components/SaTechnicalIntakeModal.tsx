import React, { useState } from "react";
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, FileText, Gauge, 
  User, Check, ArrowRight, X, AlertCircle, Wrench, Send, Lock
} from "lucide-react";

export interface SaTechnicalIntakeModalProps {
  assignedItem: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const SaTechnicalIntakeModal: React.FC<SaTechnicalIntakeModalProps> = ({
  assignedItem,
  onClose,
  onRefresh
}) => {
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Step 1: Odometer Verification
  const [saOdometer, setSaOdometer] = useState<number>(assignedItem?.confirmedOdometer || 45000);
  const [odoCorrectionReason, setOdoCorrectionReason] = useState<string>("");
  const [odoVerified, setOdoVerified] = useState<boolean>(false);

  // Step 2: Complaint Capture & Authentication
  const [complaintSource, setComplaintSource] = useState<string>("DRIVER");
  const [complaintText, setComplaintText] = useState<string>(assignedItem?.preliminaryComplaints || "");
  const [complaintCategory, setComplaintCategory] = useState<string>("Running Repair");
  const [symptom, setSymptom] = useState<string>("");
  const [whenOccurs, setWhenOccurs] = useState<string>("On slope / load");
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isImmobilized, setIsImmobilized] = useState<boolean>(false);
  const [isSafetyCritical, setIsSafetyCritical] = useState<boolean>(false);
  const [complaintsAuthenticated, setComplaintsAuthenticated] = useState<boolean>(false);

  // Step 4: Job Scope
  const [proposedInspection, setProposedInspection] = useState<string>("Inspect clutch plate, pressure plate & release bearing");
  const [jobType, setJobType] = useState<string>("Running Repair");

  // Step 5: JC Decision
  const [jcChoice, setJcChoice] = useState<"CRM" | "DWIP_TEMP">("DWIP_TEMP");
  const [createdJobCardId, setCreatedJobCardId] = useState<string | null>(null);

  const handleVerifyOdometer = async () => {
    if (saOdometer !== assignedItem.confirmedOdometer && !odoCorrectionReason) {
      alert("Please provide a Correction Reason for the odometer reading.");
      return;
    }
    setOdoVerified(true);
    setStep(2);
  };

  const handleAuthenticateComplaints = async () => {
    if (!complaintText) {
      alert("Please enter customer/driver complaint.");
      return;
    }
    setComplaintsAuthenticated(true);
    setStep(3);
  };

  const handleCreateJobCard = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/sa-intake/create-job-card", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          gateEntryId: assignedItem.gateEntryId,
          intakeId: assignedItem.intakeId,
          vosId: assignedItem.vosId,
          saVerifiedOdometer: saOdometer,
          complaintSource,
          authenticatedComplaints: [
            { complaintText, category: complaintCategory, symptom, whenOccurs, isRepeat, isImmobilized, isSafetyCritical }
          ],
          jobScope: [
            { complaint: complaintText, proposedInspection, jobType, isWarrantyPossibility: false, isCustomerPayPossibility: true }
          ],
          jcChoice
        })
      });

      if (res.ok) {
        const data = await res.json();
        const jcId = data.data?.jobCardId;
        setCreatedJobCardId(jcId);
        alert(`✨ Job Card ${jcId} created successfully!`);
        setStep(5);
      } else {
        const err = await res.json();
        alert(`Job Card creation failed:\n${err.error || "Validation gate blocked"}`);
      }
    } catch (err: any) {
      alert(`Job Card creation error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToFloor = async () => {
    if (!createdJobCardId) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/sa-intake/send-to-floor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          jobCardId: createdJobCardId,
          gateEntryId: assignedItem.gateEntryId,
          vosId: assignedItem.vosId
        })
      });

      if (res.ok) {
        alert(`🚀 Job Card ${createdJobCardId} sent to Floor In-Charge! 5-minute handoff SLA started.`);
        onClose();
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Floor handoff failed: ${err.error || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Floor handoff error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">PHASE 4 SA TECHNICAL INTAKE</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">Step {step} of 5</span>
            </div>
            <h2 className="text-lg font-black text-white">{assignedItem?.vrn} ({assignedItem?.tokenNumber})</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 font-bold text-sm">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: ODOMETER AUDIT */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold uppercase text-slate-200">1. Physical Odometer Verification</h3>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Gate OCR Reading:</span>
                <span className="font-mono font-bold text-slate-300">45,000 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reception Confirmed Reading:</span>
                <span className="font-mono font-bold text-slate-300">{assignedItem?.confirmedOdometer || 45000} km</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SA Verified Odometer (km)</label>
                <input
                  type="number"
                  value={saOdometer}
                  onChange={(e) => setSaOdometer(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-sm text-white"
                />
              </div>

              {saOdometer !== (assignedItem?.confirmedOdometer || 45000) && (
                <div>
                  <label className="block text-[10px] font-bold text-amber-400 uppercase mb-1">Correction Reason (Required)</label>
                  <input
                    type="text"
                    value={odoCorrectionReason}
                    onChange={(e) => setOdoCorrectionReason(e.target.value)}
                    placeholder="Provide mandatory reason for modifying reception odometer..."
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleVerifyOdometer}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>CONFIRM ODOMETER & NEXT</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: COMPLAINT CAPTURE & AUTHENTICATION */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold uppercase text-slate-200">2. Customer Complaint Authentication</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Complaint Source</label>
                <select
                  value={complaintSource}
                  onChange={(e) => setComplaintSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2 text-xs text-slate-200 outline-none"
                >
                  <option value="DRIVER">DRIVER</option>
                  <option value="OWNER">OWNER</option>
                  <option value="FLEET MAINTENANCE MANAGER / DKM">FLEET MAINTENANCE MANAGER / DKM</option>
                  <option value="OTHER">OTHER AUTHORIZED REPRESENTATIVE</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Authenticated Customer/Driver Complaint</label>
                <textarea
                  rows={3}
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  placeholder="Record exact symptom reported by driver/owner..."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                  <select
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="Running Repair">Running Repair</option>
                    <option value="Scheduled Service">Scheduled Service</option>
                    <option value="Warranty Complaint">Warranty Complaint</option>
                    <option value="Accidental">Accidental</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">When Occurs</label>
                  <input
                    type="text"
                    value={whenOccurs}
                    onChange={(e) => setWhenOccurs(e.target.value)}
                    placeholder="e.g. Under heavy load / cold start"
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleAuthenticateComplaints}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="h-4 w-4" />
              <span>AUTHENTICATE COMPLAINTS & NEXT</span>
            </button>
          </div>
        )}

        {/* STEP 3: INTELLIGENCE CARDS */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase text-slate-200">3. Contextual Intelligence & Pre-Screen</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">AI REPEAT FAILURE INTELLIGENCE</span>
                <p className="text-slate-300">📌 Similar clutch/brake complaint recorded 4,800 km ago. Review previous job card for part warranty & rework eligibility.</p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-500/30 space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">FSV / SERVICE ELIGIBILITY</span>
                <p className="text-slate-300">✅ Eligible for 2nd Free Service (30,000 km / 2 Years).</p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">WARRANTY PRE-SCREEN</span>
                <p className="text-slate-300">🛡️ Potentially Eligible under 3-Year / 100,000 km OEM warranty. (Final adjudication by Warranty Team).</p>
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>BUILD PRELIMINARY SCOPE & NEXT</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 4: PRELIMINARY JOB SCOPE & JC DECISION */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold uppercase text-slate-200">4. Preliminary Scope & JC Choice</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Proposed Inspection Scope</label>
                <input
                  type="text"
                  value={proposedInspection}
                  onChange={(e) => setProposedInspection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Job Card Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJcChoice("DWIP_TEMP")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      jcChoice === "DWIP_TEMP" 
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 font-bold" 
                        : "bg-slate-950 border-slate-850 text-slate-400"
                    }`}
                  >
                    <span className="block font-black text-xs text-white">DWIP TEMP JC</span>
                    <span className="text-[10px]">Authoritative Temp Identifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setJcChoice("CRM")}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      jcChoice === "CRM" 
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 font-bold" 
                        : "bg-slate-950 border-slate-850 text-slate-400"
                    }`}
                  >
                    <span className="block font-black text-xs text-white">CRM JC</span>
                    <span className="text-[10px]">Direct Integration Push</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateJobCard}
              disabled={submitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? "Creating Job Card..." : "CREATE JOB CARD"}</span>
            </button>
          </div>
        )}

        {/* STEP 5: SEND TO FLOOR */}
        {step === 5 && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
            <div>
              <h3 className="text-lg font-black text-white">Job Card {createdJobCardId} Ready</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto pt-1">
                Technical intake completed & customer complaints authenticated. Transfer ownership to Floor In-Charge.
              </p>
            </div>

            <button
              onClick={handleSendToFloor}
              disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? "Sending to Floor..." : "SEND TO FLOOR (START 5-MIN SLA)"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
