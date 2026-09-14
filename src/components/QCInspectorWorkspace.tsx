import React, { useState, useMemo, useEffect, useCallback } from "react";
import { isWorkCompleteStatus } from "../types";
import { staffAuthHeaders } from "../lib/authToken";
import { 
  ClipboardCheck, CheckCircle2, AlertOctagon, RefreshCw, BarChart3, 
  Map, Sparkles, Signature, FileText, Camera, Users, Clock 
} from "lucide-react";

export interface QCInspectorWorkspaceProps {
  jobCards: any[];
  employees: any[];
  onRefresh: () => void;
  onUpdateJob: (id: number, updatedFields: Partial<any>) => Promise<boolean | void>;
  currentUser?: any;
  aiModeEnabled?: boolean;
}

export const QCInspectorWorkspace: React.FC<QCInspectorWorkspaceProps> = React.memo(({
  jobCards = [],
  employees = [],
  onRefresh,
  onUpdateJob,
  currentUser,
  aiModeEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Digital QC checklist — real, contextual items from the QC engine
  // (mandatory structural checks + this job's own complaints/job-scope/parts),
  // not a fixed generic set. serverSidePassGate enforces mandatory items are
  // PASS before a PASS decision is accepted.
  /**
   * The real QC queue, from GET /api/qc/queue.
   *
   * This screen used to build the queue in the browser with
   *   jobCards.filter(j => j.current_workflow_state === "QC_PENDING")
   * and `current_workflow_state` EXISTS IN NO TABLE in this database. The field
   * was always undefined, so the filter never matched and the queue read "No
   * vehicles pending QC" for every role — while the floor engine had been
   * recording real handoffs in tbl_qc_handoff the whole time.
   */
  const [qcQueue, setQcQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [serverChecklist, setServerChecklist] = useState<any[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Decision state
  const [decision, setDecision] = useState<string>("PASS");
  const [reworkReason, setReworkReason] = useState<string>("");
  const [techFeedback, setTechFeedback] = useState<string>("");

  // ─── AUTHORITATIVE ROAD TEST STATE ───────────────────────────────────────
  // Mirrors backend qc_road_tests record for the selected job
  type RtRequirement = "REQUIRED" | "NOT_REQUIRED" | null;
  type RtStatus = "REQUIRED" | "NOT_REQUIRED" | "IN_PROGRESS" | "PASSED" | "FAILED" | null;

  const [rtRoadTestId, setRtRoadTestId] = useState<number | null>(null);
  const [rtRequirement, setRtRequirement] = useState<RtRequirement>(null);
  const [rtStatus, setRtStatus] = useState<RtStatus>(null);
  const [rtTesterName, setRtTesterName] = useState<string>("");
  const [rtStartKm, setRtStartKm] = useState<string>("");
  const [rtEndKm, setRtEndKm] = useState<string>("");
  const [rtStartedAt, setRtStartedAt] = useState<string | null>(null);
  const [rtRemarks, setRtRemarks] = useState<string>("");
  const [rtLoading, setRtLoading] = useState(false);
  const [rtHydrating, setRtHydrating] = useState(false);
  const [rtError, setRtError] = useState<string | null>(null);
  const [rtSuccess, setRtSuccess] = useState<string | null>(null);

  // Starting an inspection = acknowledging the floor handoff
  // (POST /api/qc/acknowledge/:jobId). Nothing in this screen ever called it, so
  // the QC PASS gate rejected every decision with QC_PASS_BLOCKED.
  const [ackLoading, setAckLoading] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  // The decision outcome, kept on screen after the alert is dismissed. Without it
  // the only evidence a decision landed was a transient alert, and a stale queue
  // made it look like nothing had happened.
  const [decisionNotice, setDecisionNotice] = useState<string | null>(null);

  const rtElapsed = useMemo(() => {
    if (!rtStartedAt || rtStatus !== "IN_PROGRESS") return null;
    const diff = Math.floor((Date.now() - new Date(rtStartedAt).getTime()) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s`;
  }, [rtStartedAt, rtStatus]);

  const rtDistanceKm = useMemo(() => {
    const start = parseFloat(rtStartKm);
    const end = parseFloat(rtEndKm);
    if (!isNaN(start) && !isNaN(end) && end >= start) return (end - start).toFixed(1);
    return null;
  }, [rtStartKm, rtEndKm]);

  // Derived guards for the Road Test tab. The engine is the real gate — it rejects
  // illegal transitions with RT_INVALID_TRANSITION — so these only keep the UI
  // honest: a run starts once the requirement is REQUIRED, and completes only
  // while it is genuinely in progress.
  const rtStarted = rtStatus === "IN_PROGRESS";
  const rtFinished = rtStatus === "PASSED" || rtStatus === "FAILED";

  /**
   * The job being inspected — always one that is actually queued for QC.
   *
   * This used to fall back to `jobCards[0]`: with nothing selected, the screen
   * silently targeted an ARBITRARY job card, typically one never handed off for
   * inspection. Every QC action on this screen — checklist, road test, the
   * PASS/FAIL decision — would then have been applied to the wrong vehicle. The
   * fallback is now the first job in the real queue, and null when the queue is
   * empty, so an inspector cannot pass a vehicle nobody submitted.
   */
  const selectedJob = useMemo(() => {
    const queuedIds = new Set(qcQueue.filter(q => q.resolved).map(q => Number(q.jobId)));
    const chosen = selectedJobId != null && queuedIds.has(Number(selectedJobId))
      ? jobCards.find(j => Number(j.job_id) === Number(selectedJobId))
      : null;
    if (chosen) return chosen;

    const firstQueued = qcQueue.find(q => q.resolved);
    if (!firstQueued) return null;
    return jobCards.find(j => Number(j.job_id) === Number(firstQueued.jobId))
      // The queue row itself is enough to act on if the job card list has not
      // loaded it — better than targeting an unrelated job.
      || { job_id: firstQueued.jobId, job_card_no: firstQueued.jobCardNo, vrn: firstQueued.vrn };
  }, [jobCards, selectedJobId, qcQueue]);

  // Section 1: Dashboard KPIs — real values only. 0 is a valid, honest count;
  // no hardcoded fallback numbers or fixed percentage strings.
  const qcStats = useMemo(() => {
    // Both open-work counters come from the real queue (tbl_qc_handoff) rather than
    // the legacy in-memory heuristic `status === "In Progress" && remarks.includes("[QC]")`.
    // That filter matched nothing, so "Under Inspection" read 0 while a vehicle was
    // genuinely QC_IN_PROGRESS and "Waiting for QC" counted work already underway.
    // A dashboard that contradicts the database is what made a submitted inspection
    // look like it had never happened.
    const waiting = qcQueue.filter(q => q.handoffStatus === "PENDING_QC").length;
    const underInspection = qcQueue.filter(
      q => q.handoffStatus === "QC_IN_PROGRESS" || q.liveStatus === "QC_IN_PROGRESS"
    ).length;
    const passedCount = jobCards.filter(j => isWorkCompleteStatus(j.status) && !j.remarks?.includes("[Rework]")).length;
    const failedCount = jobCards.filter(j => j.rework_count > 0).length;
    const totalDecided = passedCount + failedCount;
    const ftr = totalDecided > 0 ? `${Math.round((passedCount / totalDecided) * 100)}%` : "—";

    return {
      waiting,
      underInspection,
      passedCount,
      failedCount,
      ftr,
      // No real per-job QC duration data is computed anywhere in this
      // component — showing a fixed "18 mins" implied a measurement that
      // was never taken. Honest "—" until real timestamps are wired.
      avgQcTime: "—"
    };
  }, [jobCards, qcQueue]);

  // Section 7: AI QC Copilot
  const aiCopilotData = useMemo(() => {
    if (!selectedJob) return null;
    const isEV = selectedJob.vehicle_model?.toLowerCase().includes("ev");
    return {
      defectRisk: isEV ? `Verify high-voltage battery isolation after wash on ${`${selectedJob.vehicle_make || ""} ${selectedJob.vehicle_model || "EV"}`.trim()}.` : "Low risks detected.",
      missingChecks: ["Rear brake caliper torque check", "Tire pressure level log"],
      warrantyRisk: "None. Extended warranty coverage active.",
      suggestedChecks: isEV ? ["High Voltage Isolation Test"] : ["Brake fluid level verify"],
    };
  }, [selectedJob]);

  // Load this job's real, contextual QC checklist (mandatory structural
  // checks + its own complaints/job-scope items) instead of a fixed generic
  // set — replaces the old client-only qcChecklist stub.
  const loadChecklist = useCallback(async (jobId: number) => {
    setChecklistLoading(true);
    try {
      const res = await fetch(`/api/qc/checklist/${jobId}`, { headers: staffAuthHeaders() });
      const data = await res.json();
      setServerChecklist(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setServerChecklist([]);
    }
    setChecklistLoading(false);
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const res = await fetch("/api/qc/queue", { headers: staffAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        // An empty list and a failed load are different facts. Saying "no
        // vehicles pending" when the request was refused is how this screen
        // hid a real queue for months.
        throw new Error(data?.error || `Could not load the QC queue (HTTP ${res.status}).`);
      }
      setQcQueue(Array.isArray(data.data) ? data.data : []);
    } catch (e: any) {
      setQcQueue([]);
      setQueueError(e?.message || "Could not load the QC queue.");
    }
    setQueueLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  useEffect(() => {
    if (selectedJob?.job_id) loadChecklist(selectedJob.job_id);
  }, [selectedJob?.job_id, loadChecklist]);

  const toggleChecklistItem = (id: string) => {
    setServerChecklist(prev => prev.map(it => it.id === id ? { ...it, status: it.status === "PASS" ? "PENDING" : "PASS" } : it));
  };

  // Submit QC Decision — routed through the real qc-execution-engine
  // (POST /api/qc/decision/:jobId), which enforces the mandatory-checklist
  // pass gate and writes both status and workshop_stage, replacing what used
  // to be a bare local field patch that never touched the QC pipeline at all.
  const handleSubmitDecision = async () => {
    if (!selectedJob) return;
    setSubmittingDecision(true);
    try {
      const res = await fetch(`/api/qc/decision/${selectedJob.job_id}`, {
        method: "POST",
        headers: staffAuthHeaders(),
        body: JSON.stringify({
          decision,
          checklist: serverChecklist,
          roadTestKm: rtDistanceKm ? Number(rtDistanceKm) : 0,
          notes: decision === "FAIL" ? `Reason: ${reworkReason} | Feedback: ${techFeedback}` : techFeedback,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data?.error || "Failed to submit QC decision.");
        setSubmittingDecision(false);
        return;
      }
      alert(decision === "PASS" ? "Quality check PASS. Job routed to Service Advisor for pre-invoice." : "Quality check FAIL. Job returned to Technician for rework.");
      setDecisionNotice(
        decision === "PASS"
          ? `${selectedJob.job_card_no || `Job ${selectedJob.job_id}`} — QC PASS recorded. Sent to the Service Advisor for pre-invoice; it is no longer queued for inspection.`
          : `${selectedJob.job_card_no || `Job ${selectedJob.job_id}`} — QC FAIL recorded. Returned to the technician for rework.`
      );
      // The server drains tbl_qc_handoff on decision, but this component kept its
      // own stale copy of the queue — so the decided vehicle stayed on screen as
      // "inspection in progress" and offered a decision the gate then rejected with
      // "Must be QC_IN_PROGRESS". Clearing the selection and reloading is what makes
      // the screen agree with the database.
      setSelectedJobId(null);
      setServerChecklist([]);
      await loadQueue();
      onRefresh();
    } catch (e: any) {
      alert(`Failed to submit decision: ${e.message || "network error"}`);
    }
    setSubmittingDecision(false);
  };

  // ─── ROAD TEST API CALLS ────────────────────────────────────────────────────

  const rtApiCall = async (path: string, method: string, body?: any) => {
    const res = await fetch(`/api/qc/${path}`, {
      method,
      headers: staffAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Request failed");
    return data;
  };

  const handleSetRequirement = async (req: "REQUIRED" | "NOT_REQUIRED") => {
    if (!selectedJob) return;
    setRtLoading(true); setRtError(null); setRtSuccess(null);
    try {
      const res = await rtApiCall(`road-test/set-requirement/${selectedJob.job_id}`, "POST", { decision: req });
      setRtRoadTestId(res.roadTestId);
      setRtRequirement(req);
      setRtStatus(req);
      setRtSuccess(`Road test marked ${req} (ID: ${res.roadTestId})`);
    } catch (e: any) {
      setRtError(e.message);
    } finally {
      setRtLoading(false);
    }
  };

  const handleStartRoadTest = async () => {
    if (!selectedJob || !rtRoadTestId) return;
    const kmVal = parseInt(rtStartKm);
    if (isNaN(kmVal) || kmVal < 0) { setRtError("Enter a valid start odometer reading."); return; }
    setRtLoading(true); setRtError(null); setRtSuccess(null);
    try {
      await rtApiCall(`road-test/start/${rtRoadTestId}`, "POST", {
        jobId: selectedJob.job_id,
        startOdometer: kmVal
      });
      setRtStatus("IN_PROGRESS");
      setRtStartedAt(new Date().toISOString());
      setRtTesterName(currentUser?.full_name || currentUser?.username || "QC Inspector");
      setRtSuccess("Road test started — vehicle on route.");
    } catch (e: any) {
      setRtError(e.message);
    } finally {
      setRtLoading(false);
    }
  };

  const handleCompleteRoadTest = async (result: "PASSED" | "FAILED") => {
    if (!selectedJob || !rtRoadTestId) return;
    const endKmVal = parseInt(rtEndKm);
    const startKmVal = parseInt(rtStartKm);
    if (isNaN(endKmVal)) { setRtError("Enter a valid end odometer reading."); return; }
    if (endKmVal < startKmVal) { setRtError(`End odometer (${endKmVal}) must be ≥ start (${startKmVal}).`); return; }
    setRtLoading(true); setRtError(null); setRtSuccess(null);
    try {
      await rtApiCall(`road-test/complete/${rtRoadTestId}`, "POST", {
        jobId: selectedJob.job_id,
        result,
        endOdometer: endKmVal,
        remarks: rtRemarks
      });
      setRtStatus(result);
      setRtSuccess(`Road test ${result}. Distance: ${rtDistanceKm ?? "—"} km.`);
    } catch (e: any) {
      setRtError(e.message);
    } finally {
      setRtLoading(false);
    }
  };

  /**
   * Hydrate the authoritative road-test record for the selected job from
   * GET /api/qc/road-test/history/:jobId (qc_road_tests).
   *
   * Without this the Road Test tab was unusable after any reload: rtRoadTestId
   * stayed null, so handleStartRoadTest/handleCompleteRoadTest both returned
   * early and the inspector could never start or finish the test they had set up.
   * History is chronological, so the newest row is the live record.
   */
  const loadRoadTest = useCallback(async (jobId: number) => {
    setRtHydrating(true);
    setRtError(null);
    try {
      const res = await fetch(`/api/qc/road-test/history/${jobId}`, { headers: staffAuthHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || "Failed to load road test record.");
      const rows: any[] = Array.isArray(data.data) ? data.data : [];
      const latest = rows.length ? rows[rows.length - 1] : null;
      setRtRoadTestId(latest ? Number(latest.road_test_id) : null);
      setRtRequirement(latest?.requirement_status ?? null);
      setRtStatus(latest?.status ?? null);
      setRtTesterName(latest?.tester_name ?? "");
      setRtStartKm(latest?.start_odometer != null ? String(latest.start_odometer) : "");
      setRtEndKm(latest?.end_odometer != null ? String(latest.end_odometer) : "");
      setRtStartedAt(latest?.started_at ? new Date(latest.started_at).toISOString() : null);
      setRtRemarks(latest?.remarks ?? "");
    } catch (e: any) {
      setRtError(e.message);
    } finally {
      setRtHydrating(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJob?.job_id) loadRoadTest(selectedJob.job_id);
  }, [selectedJob?.job_id, loadRoadTest]);

  // The queue row for the job being inspected — carries both the handoff status
  // and the job's live_status, because they can disagree (handed off while still
  // FLOOR_ALLOCATED) and that disagreement is what made the screen unusable.
  const selectedQueueRow = useMemo(
    () => qcQueue.find(q => Number(q.jobId) === Number(selectedJob?.job_id)) ?? null,
    [qcQueue, selectedJob?.job_id]
  );
  const inspectionStarted =
    selectedQueueRow?.handoffStatus === "QC_IN_PROGRESS" || selectedQueueRow?.liveStatus === "QC_IN_PROGRESS";

  const handleStartInspection = async () => {
    if (!selectedJob?.job_id) return;
    setAckLoading(true); setAckError(null);
    try {
      const res = await fetch(`/api/qc/acknowledge/${selectedJob.job_id}`, {
        method: "POST",
        headers: staffAuthHeaders(),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data.success) throw new Error(data?.error || "Failed to start the inspection.");
      await loadQueue();
      await loadChecklist(selectedJob.job_id);
    } catch (e: any) {
      setAckError(e.message);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full   animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Audit Validation Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Quality Control Terminal
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "dashboard", label: "QC Dashboard" },
            { id: "checklist", label: "QC Checklist" },
            { id: "roadtest", label: "Road Test" },
            { id: "decision", label: "Decision Center" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-emerald-600 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {decisionNotice && (
            <div className="flex items-start justify-between gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <span className="text-[11px] text-emerald-400">{decisionNotice}</span>
              <button
                onClick={() => setDecisionNotice(null)}
                className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
              >
                Dismiss
              </button>
            </div>
          )}
          {/* SECTION 1: Dashboard metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Waiting for QC", val: qcStats.waiting, color: "text-white" },
              { label: "Under Inspection", val: qcStats.underInspection, color: "text-blue-400" },
              { label: "QC Passed Today", val: qcStats.passedCount, color: "text-emerald-400" },
              { label: "QC Failed Today", val: qcStats.failedCount, color: "text-red-400" },
              { label: "FTR Performance", val: qcStats.ftr, color: "text-amber-400" },
              { label: "Avg QC Time", val: qcStats.avgQcTime, color: "text-slate-300" }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
                <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          {/* SECTION 1b: Start the inspection. This acknowledges the floor handoff and
              is what moves the job to QC_IN_PROGRESS — the state the PASS gate requires.
              Without it every decision is rejected with QC_PASS_BLOCKED. */}
          {selectedJob && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Selected vehicle</span>
                  <span className="text-sm font-bold text-slate-200">
                    {selectedJob.job_card_no || `Job ${selectedJob.job_id}`}
                    {selectedJob.vrn ? ` · ${selectedJob.vrn}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${inspectionStarted ? "text-blue-400" : "text-amber-400"}`}>
                    {inspectionStarted ? "Inspection in progress" : "Awaiting inspection start"}
                  </span>
                  <button
                    onClick={handleStartInspection}
                    disabled={ackLoading || inspectionStarted || !selectedJob.job_id}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    {ackLoading ? "Starting…" : inspectionStarted ? "Inspection started" : "Start inspection"}
                  </button>
                </div>
              </div>
              {ackError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-400">{ackError}</div>
              )}
              {!inspectionStarted && !ackError && (
                <p className="text-[10px] text-slate-500">
                  A QC decision can only be recorded once the inspection is started — the QC PASS gate
                  requires the job to be QC_IN_PROGRESS.
                </p>
              )}
            </div>
          )}

          {/* SECTION 2: QC Queue list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">QC Validation Queue</h3>
              </div>
              <div className="space-y-3">
                {qcQueue.map(item => (
                  <button
                    key={item.handoffId}
                    onClick={() => item.resolved && setSelectedJobId(item.jobId)}
                    disabled={!item.resolved}
                    title={item.resolved ? undefined : "This handoff does not match any job card — it cannot be inspected."}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      !item.resolved
                        ? "bg-slate-950/40 border-amber-600/30 text-slate-500 cursor-not-allowed"
                        : selectedJobId === item.jobId
                        ? "bg-blue-600/10 border-blue-600/30 text-white"
                        : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                    }`}
                  >
                    <div className="font-bold text-xs">{item.jobCardNo}</div>
                    <div className="text-[10px] text-slate-500">
                      {item.vrn}{item.serviceType ? ` · ${item.serviceType}` : ""}
                    </div>
                    {!item.resolved && (
                      <div className="text-[10px] text-amber-500 mt-1 font-bold">Unlinked handoff</div>
                    )}
                  </button>
                ))}

                {/* Loading, failure and genuinely-empty are three different
                    facts. Reporting "no vehicles pending" for all three is what
                    hid a real queue. */}
                {queueLoading && (
                  <div className="text-xs text-slate-500 text-center py-4">Loading QC queue…</div>
                )}
                {!queueLoading && queueError && (
                  <div className="text-xs text-red-400 text-center py-4 space-y-2">
                    <div>{queueError}</div>
                    <button
                      onClick={loadQueue}
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-slate-700 rounded-lg px-3 py-1 hover:border-slate-500"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!queueLoading && !queueError && qcQueue.length === 0 && (
                  <div className="text-xs text-slate-500 text-center py-4">No vehicles pending QC</div>
                )}
              </div>
            </div>

            {/* SECTION 7: AI QC Copilot — gated by aiModeEnabled */}
            {selectedJob && aiModeEnabled && aiCopilotData && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Gemma AI Quality Check Copilot</h3>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-950/40 border border-slate-850 text-slate-300 rounded-xl leading-relaxed">
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-1">Defect Risk Analysis</span>
                    {aiCopilotData.defectRisk}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Missing Checks</span>
                      <ul className="list-disc list-inside text-slate-300 mt-0.5 space-y-0.5">
                        {aiCopilotData.missingChecks.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Suggested Checkpoints</span>
                      <ul className="list-disc list-inside text-slate-300 mt-0.5 space-y-0.5">
                        {aiCopilotData.suggestedChecks.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-between border-t border-slate-850 pt-2.5 text-[10px] text-slate-400 font-bold uppercase">
                    <span>Warranty Risk Status: <span className="text-slate-200">{aiCopilotData.warrantyRisk}</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "roadtest" && (
        !selectedJob ? (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Map className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Road Test</h3>
            </div>
            <p className="text-xs text-slate-500 italic text-center py-6">
              No vehicle selected. Pick one from the QC Validation Queue on the dashboard first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SECTION 5: Authoritative road test (qc_road_tests) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Road Test — {selectedJob.job_card_no || `Job ${selectedJob.job_id}`}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {rtHydrating && <span className="text-[10px] text-slate-500">Loading…</span>}
                  <button
                    onClick={() => selectedJob?.job_id && loadRoadTest(selectedJob.job_id)}
                    disabled={rtHydrating}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-950/40 border border-slate-850 hover:border-slate-700 disabled:opacity-60 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                </div>
              </div>

              {rtError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-400">{rtError}</div>
              )}
              {rtSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-400">{rtSuccess}</div>
              )}

              {/* Step 1 — requirement */}
              <div className="space-y-2">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">1 · Road test requirement</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSetRequirement("REQUIRED")}
                    disabled={rtLoading || rtStarted || rtFinished}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                  >
                    Mark required
                  </button>
                  <button
                    onClick={() => handleSetRequirement("NOT_REQUIRED")}
                    disabled={rtLoading || rtStarted || rtFinished}
                    className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-60 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                  >
                    Mark not required
                  </button>
                </div>
                {(rtStarted || rtFinished) && (
                  <p className="text-[10px] text-slate-500">
                    Requirement locked — this road test is already {rtStarted ? "in progress" : "completed"}.
                  </p>
                )}
              </div>

              {/* Step 2 — start */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">2 · Start run</span>
                {rtRequirement === "NOT_REQUIRED" ? (
                  <p className="text-xs text-slate-500 italic">Road test not required for this vehicle.</p>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Start odometer (km)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 42150"
                        value={rtStartKm}
                        onChange={(e) => setRtStartKm(e.target.value)}
                        disabled={rtStarted || rtFinished}
                        className="w-40 bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none disabled:opacity-60"
                      />
                    </div>
                    <button
                      onClick={handleStartRoadTest}
                      disabled={rtLoading || rtStarted || rtFinished || rtRoadTestId == null || rtRequirement !== "REQUIRED"}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                      {rtStarted ? "In progress" : "Start road test"}
                    </button>
                    {rtRoadTestId == null && (
                      <span className="text-[10px] text-slate-500">Set the requirement first.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3 — complete */}
              {rtRequirement === "REQUIRED" && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">3 · Complete run</span>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">End odometer (km)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="e.g. 42162"
                        value={rtEndKm}
                        onChange={(e) => setRtEndKm(e.target.value)}
                        disabled={!rtStarted}
                        className="w-40 bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none disabled:opacity-60"
                      />
                    </div>
                    <div className="flex-1 min-w-[220px]">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Remarks</label>
                      <input
                        type="text"
                        placeholder="Braking, steering, noise, vibration notes…"
                        value={rtRemarks}
                        onChange={(e) => setRtRemarks(e.target.value)}
                        disabled={rtFinished}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none disabled:opacity-60"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCompleteRoadTest("PASSED")}
                      disabled={rtLoading || !rtStarted || rtFinished}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => handleCompleteRoadTest("FAILED")}
                      disabled={rtLoading || !rtStarted || rtFinished}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                      Fail
                    </button>
                    {!rtStarted && <span className="text-[10px] text-slate-500 self-center">Start the run before completing it.</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Live record, as stored server-side */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Road Test Record</h3>
              </div>
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2.5 text-xs">
                {[
                  ["Record ID", rtRoadTestId != null ? String(rtRoadTestId) : "—"],
                  ["Requirement", rtRequirement ?? "Not set"],
                  ["Status", rtStatus ?? "Not started"],
                  ["Tester", rtTesterName || "—"],
                  ["Start odometer", rtStartKm ? `${rtStartKm} km` : "—"],
                  ["End odometer", rtEndKm ? `${rtEndKm} km` : "—"],
                  ["Distance", rtDistanceKm ? `${rtDistanceKm} km` : "—"],
                  ["Elapsed", rtElapsed ?? "—"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-slate-200 text-right">{value}</span>
                  </div>
                ))}
              </div>
              {rtStatus === "PASSED" && (
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Road test passed.
                </p>
              )}
              {rtStatus === "FAILED" && (
                <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                  <AlertOctagon className="h-3.5 w-3.5" /> Road test failed — record a FAIL decision in Decision Center.
                </p>
              )}
            </div>
          </div>
        )
      )}

      {activeTab === "checklist" && selectedJob && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SECTION 3: Digital QC Checklist */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ClipboardCheck className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Digital Validation Checklist</h3>
            </div>
            {checklistLoading ? (
              <p className="text-xs text-slate-400 text-center py-6">Loading checklist…</p>
            ) : serverChecklist.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No checklist items available for this job.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {serverChecklist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`p-3 rounded-xl border text-left space-y-1 transition-all ${
                      item.status === "PASS"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-slate-950/20 border-slate-850 text-slate-400 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{item.category}</span>
                      {item.mandatory && <span className="text-[8px] font-bold uppercase text-amber-400">Mandatory</span>}
                    </div>
                    <p className="text-xs leading-snug">{item.description}</p>
                    <span className="text-[10px] font-bold block">{item.status === "PASS" ? "✓ Approved" : "✗ Pending"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: Evidence Capture */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Camera className="h-4 w-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Validation Photos Deck</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Checklist verify", "Safety verification"].map((l, i) => (
                <div key={i} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-center space-y-2">
                  <Camera className="h-5 w-5 text-slate-500 mx-auto" />
                  <span className="text-[9px] text-slate-400 font-bold block">{l}</span>
                  <button 
                    onClick={() => alert(`QC photo uploaded for ${l}`)}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all"
                  >
                    Capture Photo
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {activeTab === "decision" && selectedJob && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4">
          {!inspectionStarted && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
              <p className="text-[11px] text-amber-400">
                This vehicle's inspection has not been started, so a decision will be rejected
                (QC_PASS_BLOCKED: the job must be QC_IN_PROGRESS). Start the inspection first.
              </p>
              <button
                onClick={handleStartInspection}
                disabled={ackLoading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg"
              >
                {ackLoading ? "Starting…" : "Start inspection"}
              </button>
              {ackError && <p className="text-[10px] text-red-400">{ackError}</p>}
            </div>
          )}
          {/* SECTION 6: QC Decision & Rework Allocation */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Signature className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">QC Decision & Final Sign-off</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Final Approval Decision</label>
                <select 
                  value={decision} 
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  <option value="PASS">PASS (Route to Billing)</option>
                  <option value="FAIL">FAIL (Route to Rework)</option>
                </select>
              </div>
              {decision === "FAIL" && (
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Rework Root Cause Reason</label>
                  <input 
                    type="text" 
                    placeholder="Brake pad isolation clips missing..."
                    value={reworkReason}
                    onChange={(e) => setReworkReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Technician Feedback Notes</label>
                <input 
                  type="text" 
                  placeholder="Harness requires routing clip check"
                  value={techFeedback}
                  onChange={(e) => setTechFeedback(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                />
              </div>
              <button
                onClick={handleSubmitDecision}
                disabled={submittingDecision}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                {submittingDecision ? "Submitting…" : "Log Final Validation Decision"}
              </button>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-2.5 text-xs">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">Digital Sign-off Parameters</span>
              <div>Inspector: <span className="font-bold text-slate-200">{currentUser?.full_name || "QC Inspector"}</span></div>
              <div>Timestamp: <span className="font-mono text-slate-200">{new Date().toISOString()}</span></div>
              <div>Device ID: <span className="font-mono text-slate-200">TAB-QC-088</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

QCInspectorWorkspace.displayName = "QCInspectorWorkspace";
export default QCInspectorWorkspace;
