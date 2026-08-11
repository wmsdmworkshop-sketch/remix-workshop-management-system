import { WORKFLOW_CONFIG } from "../../engines/workflow/config";

export interface AIRecommendation {
  id: string;
  vehicle: string;
  suggestedBay: string;
  suggestedTechnician: string;
  predictedTat: string;
  predictedEtd: string;
  confidence: string;
  financialImpact: string;
  timeSaved: string;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
}

export interface DailyBrief {
  morningBrief: string;
  bottlenecks: string;
  todayRisks: string;
  expectedDeliveries: number;
  pendingParts: number;
  criticalCustomers: string[];
  revenueGap: number;
  recommendedActions: string[];
}

export class WorkshopAIEngine {
  /**
   * Computes the Live Workshop Health Score (0-100) based on active runtime telemetry.
   */
  public static calculateHealthScore(jobCards: any[], bays: any[], alertLogs: any[]): number {
    if (jobCards.length === 0) return 100;

    const totalJcs = jobCards.filter(j => ["Active", "Waiting", "Rework", "Carry Forward"].includes(j.status)).length;
    const activeBays = bays.filter(b => b.status !== "Idle" && b.status !== "Empty").length;
    const totalBays = bays.length || 1;
    const activeBreaches = alertLogs.filter(a => a.alert_type === "SLA_BREACH" && a.status === "Active").length;

    // 1. Bay Utilization score (ideal is 70-80% utilization)
    const bayUtil = (activeBays / totalBays) * 100;
    const bayScore = bayUtil > 85 ? Math.max(30, 100 - (bayUtil - 80) * 2) : Math.min(100, (bayUtil / 80) * 100);

    // 2. SLA compliance score
    const slaScore = Math.max(0, 100 - (activeBreaches * 15));

    // 3. Queue load index
    const queueScore = Math.max(30, 100 - Math.max(0, totalJcs - 12) * 5);

    return Math.round((bayScore * 0.35) + (slaScore * 0.45) + (queueScore * 0.20));
  }

  /**
   * Predicts SLA breaches across different time buckets.
   */
  public static predictSlaBreaches(jobCards: any[], alertLogs: any[]): any {
    const activeJobs = jobCards.filter(j => ["Active", "Waiting", "Rework"].includes(j.status));
    const predictions = {
      within30Mins: 0,
      within1Hour: 0,
      within2Hours: 0,
      highRiskJobs: [] as any[]
    };

    activeJobs.forEach(job => {
      const stateConfig = WORKFLOW_CONFIG[job.current_workflow_state || "GATE_IN"];
      if (!stateConfig) return;

      const limit = stateConfig.slaLimitMinutes || 30;
      // Real elapsed minutes in current state (from started_at/created_at). No mock.
      const startRef = job.started_at || job.created_at;
      if (!startRef) return; // cannot assess SLA without a real start time
      const elapsed = Math.max(0, Math.round((Date.now() - new Date(startRef).getTime()) / 60000));
      const remaining = limit - elapsed;

      if (remaining <= 10) {
        predictions.within30Mins++;
        predictions.highRiskJobs.push({ vrn: job.vrn, reason: "SLA Warning threshold breached", remaining: `${remaining}m` });
      } else if (remaining <= 30) {
        predictions.within1Hour++;
      } else if (remaining <= 60) {
        predictions.within2Hours++;
      }
    });

    return predictions;
  }

  /**
   * Estimates today's total revenue, labour split, parts split, and target gap.
   */
  public static forecastRevenue(jobCards: any[], targetRevenue = 500000): any {
    const invoicedJobs = jobCards.filter(j => j.status === "Invoiced");
    const activeJobs = jobCards.filter(j => ["Active", "Rework"].includes(j.status));

    // ACTUAL invoiced revenue only — no fabricated fallback. 0 when nothing invoiced.
    const currentLabour = invoicedJobs.reduce((sum, j) => sum + (j.labor_price || 0), 0);
    const currentParts = invoicedJobs.reduce((sum, j) => sum + (j.parts_price || 0), 0);
    const currentTotal = currentLabour + currentParts;

    // Pipeline projection uses only real prices already on the active job cards
    // (no fabricated per-job amounts). This feeds FORECAST, never ACTUAL.
    const pipelineEstimate = activeJobs.reduce((sum, j) => sum + (j.labor_price || 0) + (j.parts_price || 0), 0);
    const forecastEod = currentTotal + (pipelineEstimate * 0.7);
    const achievement = Math.round((currentTotal / targetRevenue) * 100);

    return {
      labour: currentLabour,
      parts: currentParts,
      total: currentTotal,
      forecastEod: Math.round(forecastEod),
      achievement,
      gap: Math.max(0, targetRevenue - currentTotal)
    };
  }

  /**
   * Predicts parts delay bottlenecks.
   */
  public static predictPartsDelays(jobCards: any[]): any[] {
    const pendingPartsJobs = jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING" || j.status === "Waiting");
    // Report ONLY real, on-record fields for parts-pending vehicles. Do NOT fabricate
    // part names, suppliers, ETAs, or alternates — those require authoritative parts data.
    return pendingPartsJobs.map((j, idx) => ({
      id: `parts-${idx}`,
      vehicle: `${j.vehicle_make || ""} ${j.vehicle_model || ""} (${j.vrn})`.trim(),
      delayedPart: j.parts_list || "Details unavailable",
      expectedDelay: j.pending_reason || "Unknown",
      supplier: null,
      alternatePart: null
    }));
  }

  /**
   * Recommends optimal layout adjustments dynamically using Gemma intelligence patterns.
   */
  public static generateAiFeed(jobCards: any[], bays: any[], employees: any[]): AIRecommendation[] {
    const unallocatedJcs = jobCards.filter(j => !j.bay_id && ["Waiting", "Active"].includes(j.status));
    const availableBays = bays.filter(b => b.status === "Idle" || b.status === "Empty");
    const availableTechs = employees.filter(e => e.role === "Technician" && e.is_active);

    const recs: AIRecommendation[] = [];

    unallocatedJcs.forEach((j, index) => {
      const isEV = j.vehicle_model?.toLowerCase().includes("ev");
      const matchedBay = isEV 
        ? bays.find(b => b.bay_name.toLowerCase().includes("ev")) || availableBays[0]
        : availableBays[0];

      const matchedTech = isEV
        ? employees.find(e => e.role === "Technician" && e.certification_level?.toLowerCase() === "gold") || availableTechs[0]
        : availableTechs[0];

      if (matchedBay && matchedTech) {
        // Real match on real job cards/bays/technicians. Metrics without a calibrated
        // model are shown as "—" (not fabricated numbers). No hardcoded fallback rec.
        recs.push({
          id: `ai-rec-${index}`,
          vehicle: `${j.vehicle_make || ""} ${j.vehicle_model || ""} (${j.vrn})`.trim(),
          suggestedBay: matchedBay.bay_name,
          suggestedTechnician: matchedTech.full_name,
          predictedTat: "—",
          predictedEtd: "—",
          confidence: "—",
          financialImpact: "—",
          timeSaved: "—",
          riskLevel: isEV ? "Low" : "Medium",
          reason: isEV
            ? "EV job matched to an EV-capable bay and a Gold-certified technician."
            : "Mechanical job matched to an available general bay and technician."
        });
      }
    });

    // No unallocated jobs → no recommendations (never a demo fallback rec).
    return recs;
  }

  /**
   * Generates the dynamic Manager Daily Brief summary.
   */
  public static generateDailyBrief(jobCards: any[], bays: any[], employees: any[]): DailyBrief {
    const totalJcs = jobCards.length;
    const completed = jobCards.filter(j => j.status === "Completed" || j.status === "Invoiced").length;
    const pendingParts = jobCards.filter(j => j.current_workflow_state === "PARTS_PENDING").length;
    const criticalCust = jobCards.filter(j => j.priority === "Express").map(j => j.customer_name);

    // All values derived from real job-card state. No hardcoded vehicles, capacities,
    // revenue gaps, or actions.
    const expressCount = criticalCust.length;
    const recommendedActions: string[] = [];
    if (pendingParts > 0) recommendedActions.push(`Follow up on ${pendingParts} parts-pending vehicle(s).`);
    if (expressCount > 0) recommendedActions.push(`Prioritise ${expressCount} express-priority vehicle(s) in the queue.`);

    return {
      morningBrief: `Shift has ${totalJcs} registered vehicle(s); ${completed} completed so far.`,
      bottlenecks: pendingParts > 2 ? `${pendingParts} vehicles waiting for OEM parts.` : "No major parts constraints.",
      todayRisks: expressCount > 0
        ? `${expressCount} express-priority vehicle(s) require close monitoring.`
        : "No specific risks flagged.",
      expectedDeliveries: Math.max(0, totalJcs - completed - pendingParts),
      pendingParts,
      criticalCustomers: criticalCust.slice(0, 3),
      revenueGap: 0, // no authoritative target/actual source wired here
      recommendedActions
    };
  }
}
