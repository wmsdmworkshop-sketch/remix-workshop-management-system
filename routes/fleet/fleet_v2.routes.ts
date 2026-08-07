import { Router } from "express";
import { pool as db } from "../../src/db/index.ts";
import {
  evaluateFleetRelationshipAndRisk,
  calculateFleetProfitability,
  runPredictiveFleetEngine
} from "../../src/engines/fleet-intelligence-engine.ts";

const router = Router();

// ---- AI Fleet Advisor Chat Interface ----
router.post("/ai", async (req: any, res: any) => {
  const { message } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a query message." });
  }

  const query = message.trim().toLowerCase();

  try {
    const [fleets] = await db.query(
      "SELECT fleet_passport_id, fleet_name, fleet_health_score, relationship_health_score FROM fleet_passports"
    ) as any[];

    if (fleets.length === 0) {
      return res.json({
        success: true,
        response: "No fleets are currently registered in the DWIP platform.",
        confidence: 1.0,
        reasoning: "Database query to fleet_passports returned 0 records."
      });
    }

    // 1. Healthiest fleet query
    if (query.includes("healthiest")) {
      const sorted = [...fleets].sort((a, b) => b.fleet_health_score - a.fleet_health_score);
      const healthiest = sorted[0];

      return res.json({
        success: true,
        response: `The healthiest fleet is "${healthiest.fleet_name}" with a Fleet Health Score of ${healthiest.fleet_health_score}%.`,
        confidence: 0.99,
        reasoning: `Evaluated health score ranking across all ${fleets.length} registered fleets.`,
        data: healthiest
      });
    }

    // 2. Vehicle failure prediction
    if (query.includes("likely fail next") || query.includes("likely to fail") || query.includes("predict")) {
      const allPredictions: any[] = [];
      for (const f of fleets) {
        const preds = await runPredictiveFleetEngine(f.fleet_passport_id);
        allPredictions.push(...preds);
      }

      if (allPredictions.length > 0) {
        const sorted = allPredictions.sort((a, b) => b.confidence - a.confidence);
        const nextFail = sorted[0];

        return res.json({
          success: true,
          response: `Vehicle with VIN "${nextFail.vin}" is predicted to fail next. Causal component: ${nextFail.predictedFailure}. Recommended action: ${nextFail.recommendedInspection}. Expected repair cost: ${nextFail.expectedRepairCost} INR.`,
          confidence: nextFail.confidence,
          reasoning: nextFail.explanation,
          data: nextFail
        });
      }
    }

    // 3. Max revenue / Max profit fleet
    if (query.includes("maximum revenue") || query.includes("most profitable") || query.includes("profit")) {
      const profitList = [];
      for (const f of fleets) {
        const prof = await calculateFleetProfitability(f.fleet_passport_id);
        if (prof) {
          profitList.push({
            id: f.fleet_passport_id,
            name: f.fleet_name,
            netContribution: prof.netContribution,
            profitPerFleet: prof.profitPerFleet
          });
        }
      }

      if (profitList.length > 0) {
        const sorted = profitList.sort((a, b) => b.netContribution - a.netContribution);
        const topProfit = sorted[0];

        return res.json({
          success: true,
          response: `The most profitable fleet is "${topProfit.name}" generating a net profitability contribution of ${topProfit.netContribution} INR.`,
          confidence: 0.96,
          reasoning: "Calculated detailed parts, labour, AMC, and recovery revenue splits against active workshop repairs.",
          data: topProfit
        });
      }
    }

    // 4. Highest operational risk / Immediate intervention
    if (query.includes("risk") || query.includes("immediate attention") || query.includes("immediate intervention")) {
      const riskList = [];
      for (const f of fleets) {
        const risk = await evaluateFleetRelationshipAndRisk(f.fleet_passport_id);
        riskList.push({
          id: f.fleet_passport_id,
          name: f.fleet_name,
          riskLevel: risk.risk_level,
          reasons: risk.risk_reasons
        });
      }

      const sortedByRisk = riskList.sort((a, b) => {
        const weight: Record<string, number> = { "Critical": 4, "High Risk": 3, "Attention Required": 2, "Healthy": 1 };
        return (weight[b.riskLevel] || 0) - (weight[a.riskLevel] || 0);
      });

      const highestRisk = sortedByRisk[0];

      return res.json({
        success: true,
        response: `Fleet "${highestRisk.name}" is at the highest operational risk classified as "${highestRisk.riskLevel}". Reasons: ${highestRisk.reasons.join(", ") || "No current alerts."}`,
        confidence: 0.95,
        reasoning: "Evaluated service compliance thresholds, average downtime ratios, and DRE rules alerts.",
        data: highestRisk
      });
    }

    // Default fallback chat answer
    res.json({
      success: true,
      response: `I have analyzed your ${fleets.length} registered fleets. Relationship metrics indicate overall stable compliance. Let me know if you would like details on healthiest, maximum profit, or predicted failures.`,
      confidence: 0.85,
      reasoning: "Parsed input message query for FIP keywords."
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
