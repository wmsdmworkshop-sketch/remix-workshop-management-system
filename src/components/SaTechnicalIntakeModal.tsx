import React, { useState } from "react";
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, FileText, Gauge, 
  User, Check, ArrowRight, X, AlertCircle, Wrench, Send, Lock, ExternalLink
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

  // Step 1: Odometer Verification.
  // Real readings only — never a fabricated fallback. The reception-confirmed
  // reading is the baseline the SA verifies against; if reception never captured
  // one, fall back to the gate OCR reading; if neither exists, start blank so the
  // SA must physically enter the true reading rather than confirm an invented one.
  const receptionOdo: number | null = assignedItem?.confirmedOdometer ?? null;
  const gateOdo: number | null = assignedItem?.gateOdometer ?? null;
  const odoBaseline: number | null = receptionOdo ?? gateOdo;
  const [saOdometer, setSaOdometer] = useState<number | "">(odoBaseline ?? "");
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
  const [crmJcNumber, setCrmJcNumber] = useState<string>("");
  const [createdJobCardId, setCreatedJobCardId] = useState<string | null>(null);
  /** Whether the server's automatic floor handoff succeeded during creation. */
  const [floorHandoffDone, setFloorHandoffDone] = useState(false);

  // The real Siebel CRM-DMS workshop login the dealership uses. The previous
  // value (crm.tatamotors.com) was a generic guess that does not land on the
  // workshop application, so advisors had to navigate manually. Overridable per
  // environment in case Tata changes the endpoint.
  const CRM_PORTAL_URL =
    import.meta.env.VITE_CRM_PORTAL_URL ||
    "https://crmdms.inservices.tatamotors.com/siebel/app/workshop/enu?SWECmd=Login&SWECM=S&SRN=";

  // Dynamic Service Schedule & Circular Audit State
  const [eligibilityData, setEligibilityData] = useState<any | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(false);

  const fetchScheduleEligibility = async (odometer: number | "", complaints: string) => {
    if (!assignedItem?.vrn) return;
    // No reading yet → don't query eligibility against a blank/zero odometer.
    if (odometer === "" || !(Number(odometer) > 0)) return;
    setLoadingEligibility(true);
    try {
      const res = await fetch(`/api/vehicles/${encodeURIComponent(assignedItem.vrn)}/schedule-eligibility?odometer=${odometer}&complaint=${encodeURIComponent(complaints)}`);
      const data = await res.json();
      if (data.success) {
        setEligibilityData(data);
      }
    } catch (err) {
      console.error("[SaIntake] Error fetching schedule eligibility:", err);
    } finally {
      setLoadingEligibility(false);
    }
  };

  React.useEffect(() => {
    if (assignedItem?.vrn) {
      fetchScheduleEligibility(saOdometer, complaintText);
    }
  }, [assignedItem?.vrn]);

  const handleVerifyOdometer = async () => {
    // The SA must enter a real physical reading — no confirming a blank/invented one.
    if (saOdometer === "" || Number.isNaN(Number(saOdometer)) || Number(saOdometer) <= 0) {
      alert("Enter the physically verified odometer reading (km).");
      return;
    }
    // A correction reason is required only when a real baseline existed and the SA changed it.
    if (odoBaseline != null && Number(saOdometer) !== odoBaseline && !odoCorrectionReason) {
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
    // Refresh evaluation with latest verified odometer & authenticated complaints
    fetchScheduleEligibility(saOdometer, complaintText);
    setStep(3);
  };

  const handleCreateJobCard = async () => {
    if (jcChoice === "CRM" && !crmJcNumber.trim()) {
      alert("Please enter or paste the CRM Job Card Number (or switch to DWIP TEMP JC to create instantly).");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token") || "";
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
          saVerifiedOdometer: Number(saOdometer),
          complaintSource,
          authenticatedComplaints: [
            { complaintText, category: complaintCategory, symptom, whenOccurs, isRepeat, isImmobilized, isSafetyCritical }
          ],
          jobScope: [
            { complaint: complaintText, proposedInspection, jobType, isWarrantyPossibility: false, isCustomerPayPossibility: true }
          ],
          jcChoice,
          crmJcNumber: crmJcNumber.trim() || undefined
        })
      });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok && data.success) {
          const jcId = data.data?.jobCardId || (jcChoice === "CRM" ? crmJcNumber.trim() : "DWIP-TEMP");
          setCreatedJobCardId(jcId);

          // The floor handoff is automatic — a created job card IS floor work,
          // so the server pushes it as part of creation. Report what actually
          // happened rather than claiming success unconditionally: if the
          // handoff did not complete, the advisor needs to know the vehicle is
          // not yet in the floor queue and can retry from step 5.
          const handoff = data.data?.floorHandoff;
          setFloorHandoffDone(Boolean(handoff?.success));
          if (handoff?.success) {
            alert(`✨ Job Card ${jcId} created and sent to Floor In-Charge.\n5-minute handoff SLA started.`);
          } else {
            alert(
              `✨ Job Card ${jcId} created.\n\n⚠️ Automatic floor handoff did not complete — use "Send to Floor" to push it manually.`
            );
          }
          setStep(5);
        } else {
          alert(`Job Card creation failed:\n${data.error || "Validation gate blocked"}`);
        }
      } else {
        const rawText = await res.text();
        alert(`Server error (${res.status}): ${rawText.slice(0, 150)}`);
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
                <span className="font-mono font-bold text-slate-300">
                  {gateOdo != null ? `${gateOdo.toLocaleString("en-IN")} km` : "Not captured"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reception Confirmed Reading:</span>
                <span className="font-mono font-bold text-slate-300">
                  {receptionOdo != null ? `${receptionOdo.toLocaleString("en-IN")} km` : "Not captured"}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SA Verified Odometer (km)</label>
                <input
                  type="number"
                  value={saOdometer}
                  placeholder={odoBaseline == null ? "Enter physically verified reading" : undefined}
                  onChange={(e) => setSaOdometer(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-sm text-white"
                />
              </div>

              {odoBaseline != null && saOdometer !== "" && Number(saOdometer) !== odoBaseline && (
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase text-slate-200">3. Contextual Intelligence & Pre-Screen</h3>
              </div>
              {eligibilityData && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {eligibilityData.productLine || "M&HCV"} | Sale: {eligibilityData.dateOfSale || "—"} ({eligibilityData.ageYears} yrs)
                </span>
              )}
            </div>

            {loadingEligibility ? (
              <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-xs text-slate-400">Auditing against official Tata Motors service circulars (SC/2023/133, SC/2024/63, SC/2023/129)...</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* 1. Repeat Failure Intelligence */}
                <div className={`bg-slate-950 p-3.5 rounded-xl border space-y-1 ${
                  eligibilityData?.repeatFailureIntelligence?.hasRepeatIssue ? "border-amber-500/50" : "border-slate-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">AI REPEAT FAILURE INTELLIGENCE</span>
                    {eligibilityData?.repeatFailureIntelligence?.hasRepeatIssue && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">REPEAT ALERT</span>
                    )}
                  </div>
                  <p className="text-slate-300">
                    📌 {eligibilityData?.repeatFailureIntelligence?.description || "No repeat complaints recorded in recent service history."}
                  </p>
                </div>

                {/* 2. Free Service (FSV) / Schedule Service Eligibility */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-500/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">FSV / SERVICE ELIGIBILITY</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Circular {eligibilityData?.serviceEligibility?.circularReference || "SC/2023/133"}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium">
                    {eligibilityData?.serviceEligibility?.isEligible ? "✅" : "ℹ️"} {eligibilityData?.serviceEligibility?.description || "Auditing service schedule against PPL interval circulars."}
                  </p>
                  {eligibilityData?.serviceEligibility && (
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                      <span>Due Interval: <strong className="text-slate-200">{Number(eligibilityData.serviceEligibility.dueIntervalKm).toLocaleString()} km</strong></span>
                      <span>•</span>
                      <span>PPL: <strong className="text-slate-200">{eligibilityData.productLine}</strong></span>
                      <span>•</span>
                      <span>Past Visits: <strong className="text-slate-200">{eligibilityData.serviceVisitsCount}</strong></span>
                    </div>
                  )}
                </div>

                {/* 3. Warranty Pre-Screen */}
                <div className={`bg-slate-950 p-3.5 rounded-xl border space-y-1.5 ${
                  eligibilityData?.warrantyPreScreen?.status === "ACTIVE" 
                    ? "border-emerald-500/40" 
                    : eligibilityData?.warrantyPreScreen?.status === "EXTENDED_DRIVELINE_ONLY"
                    ? "border-amber-500/40"
                    : "border-slate-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">WARRANTY PRE-SCREEN</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Circular {eligibilityData?.warrantyPreScreen?.circularReference || "SC/2023/129"}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium">
                    🛡️ {eligibilityData?.warrantyPreScreen?.description || "Potentially Eligible under OEM warranty."}
                  </p>
                  {eligibilityData?.warrantyPreScreen && (
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                      <span>Base Warranty: <strong className="text-slate-200">{eligibilityData.warrantyPreScreen.baseWarrantyLimit}</strong></span>
                      <span>•</span>
                      <span>Driveline: <strong className="text-slate-200">{eligibilityData.warrantyPreScreen.drivelineWarrantyLimit}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                <div className="grid grid-cols-2 gap-3 mb-3">
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
                    <span className="text-[10px]">Instant Local Identifier</span>
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
                    <span className="text-[10px]">Direct CRM JC / Order No</span>
                  </button>
                </div>

                {jcChoice === "CRM" && (
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-500/40 space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-blue-400 uppercase">
                        CRM Job Card Number / Order No <span className="text-red-400">*</span>
                      </label>
                      <a
                        href={CRM_PORTAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 text-[10px] font-bold rounded-lg border border-blue-500/40 transition-all cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open Tata CRM ↗</span>
                      </a>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={crmJcNumber}
                        onChange={(e) => setCrmJcNumber(e.target.value)}
                        placeholder="e.g. 444519 or JC-2026-00892"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono placeholder:text-slate-500 outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      💡 Click <strong>"Open Tata CRM ↗"</strong> to open CRM in a new tab, create the Job Card, and paste the generated CRM JC number above.
                    </p>
                  </div>
                )}

                {jcChoice === "DWIP_TEMP" && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 mb-3">
                    ⚡ An authoritative Temporary Job Card (<code>DWIP-TEMP-SEDAM-...</code>) will be generated instantly. You can paste the CRM Job Card Number anytime later to reconcile.
                  </div>
                )}
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
              <h3 className="text-lg font-black text-white">
                Job Card {createdJobCardId} {floorHandoffDone ? "Sent to Floor" : "Ready"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto pt-1">
                {floorHandoffDone
                  ? "Technical intake completed and ownership transferred to Floor In-Charge. The 5-minute handoff SLA is running. Technician and bay allocation is done by the floor supervisor, workshop manager or service manager."
                  : "Technical intake completed & customer complaints authenticated. Automatic floor handoff did not complete — push it manually below."}
              </p>
            </div>

            {/* The handoff is automatic on creation, so this is a RECOVERY control,
                not a required step. Showing it as the primary action implied the
                vehicle was still waiting on the advisor when it was already in the
                floor queue. The server call is idempotent, so a retry is safe. */}
            {floorHandoffDone ? (
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>DONE</span>
              </button>
            ) : (
              <button
                onClick={handleSendToFloor}
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? "Sending to Floor..." : "RETRY SEND TO FLOOR"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
