import type {
  HealthAnalysisProvider,
  VehicleEvent,
  VehicleRepair,
  VehiclePartHistory,
  VehicleAccident,
  VehicleHealthReport,
  SubsystemHealth,
} from "./types.ts";

export class RuleBasedHealthProvider implements HealthAnalysisProvider {
  readonly providerId = "rule-based-health-analyzer";

  async analyzeHealth(
    events: VehicleEvent[],
    repairs: VehicleRepair[],
    parts: VehiclePartHistory[],
    accidents: VehicleAccident[]
  ): Promise<VehicleHealthReport> {
    const now = new Date().toISOString();

    // 1. Filter events based on verification level requirement (Level 3-5 only)
    const validEvents = events.filter(e => e.verificationLevel >= 3);
    const validRepairs = repairs.filter(r => r.verificationLevel >= 3);
    const validParts = parts.filter(p => p.verificationLevel >= 3);
    const validAccidents = accidents.filter(a => a.verificationLevel >= 3);

    // Helper to evaluate health scores
    const evaluateSubsystem = (
      name: string,
      baseScore: number,
      checkFn: (issues: string[]) => void
    ): SubsystemHealth => {
      const activeIssues: string[] = [];
      checkFn(activeIssues);

      // Apply deductions
      const deductionPerIssue = 15;
      const score = Math.max(0, Math.min(100, baseScore - (activeIssues.length * deductionPerIssue)));

      let reasoning = `Subsystem ${name} shows optimal parameters.`;
      if (activeIssues.length > 0) {
        reasoning = `Deductions applied due to: ${activeIssues.join(", ")}.`;
      }

      return {
        score,
        reasoning,
        lastChecked: now,
        activeIssues,
      };
    };

    // Subsystem calculations
    const engine = evaluateSubsystem("Engine", 100, (issues) => {
      if (validEvents.some(e => e.eventType === "ENGINE_OVERHAUL")) {
        issues.push("Past major engine overhaul event detected");
      }
      if (validRepairs.some(r => r.repairType.toLowerCase().includes("engine"))) {
        issues.push("Reported engine repair in database");
      }
    });

    const transmission = evaluateSubsystem("Transmission", 100, (issues) => {
      if (validEvents.some(e => e.eventType === "TRANSMISSION_REPAIR")) {
        issues.push("Previous transmission repair logged");
      }
    });

    const brake = evaluateSubsystem("Brake", 100, (issues) => {
      if (validRepairs.some(r => r.repairType.toLowerCase().includes("brake"))) {
        issues.push("Recent brake repairs or pad replacements");
      }
    });

    const suspension = evaluateSubsystem("Suspension", 100, (issues) => {
      if (validEvents.some(e => e.eventType === "SUSPENSION_REPAIR")) {
        issues.push("Suspension repair or shock replacement logged");
      }
    });

    const electrical = evaluateSubsystem("Electrical", 100, (issues) => {
      if (validEvents.some(e => e.eventType === "BATTERY_REPLACEMENT")) {
        issues.push("Battery has been replaced recently");
      }
    });

    const cooling = evaluateSubsystem("Cooling", 100, (issues) => {
      if (validRepairs.some(r => r.repairType.toLowerCase().includes("radiator") || r.repairType.toLowerCase().includes("coolant"))) {
        issues.push("Cooling system repairs found");
      }
    });

    const tyre = evaluateSubsystem("Tyre", 100, (issues) => {
      if (validEvents.some(e => e.eventType === "TYRE_REPLACEMENT")) {
        issues.push("Tyres replaced recently");
      }
    });

    const cabin = evaluateSubsystem("Cabin", 100, (issues) => {
      if (validEvents.some(e => e.eventType === "BODY_FABRICATION")) {
        issues.push("Body fabrication or panel work detected");
      }
    });

    // Deduct overall score based on accidents severity
    let overallDeduction = 0;
    validAccidents.forEach(acc => {
      if (acc.severity === "TOTAL_LOSS") overallDeduction += 50;
      else if (acc.severity === "SEVERE") overallDeduction += 30;
      else if (acc.severity === "MODERATE") overallDeduction += 15;
      else if (acc.severity === "MINOR") overallDeduction += 5;
    });

    const scores = [engine.score, transmission.score, brake.score, suspension.score, electrical.score, cooling.score, tyre.score, cabin.score];
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const overallScore = Math.round(Math.max(0, avgScore - overallDeduction));

    return {
      overallScore,
      engine,
      transmission,
      brake,
      suspension,
      electrical,
      cooling,
      tyre,
      cabin,
      updatedAt: now,
    };
  }
}
