import { Router } from "express";
import { pool as db } from "../../src/db/index.ts";
import { EkgEngine } from "../../src/engines/ekg-engine.ts";
import { AiCopilotOrchestrator } from "../../src/engines/ai-copilot-orchestrator.ts";
import { globalEventBus } from "../../src/core/event-bus.ts";
import { makeSystemContext } from "../../src/core/business-context.ts";

const router = Router();

// ---- POST Graph Reasoning ----
router.post("/reasoning", async (req: any, res: any) => {
  const { message } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a query message." });
  }

  const query = message.trim().toLowerCase();

  try {
    // 1. Why did this vehicle fail?
    if (query.includes("why did") && (query.includes("vehicle") || query.includes("fail"))) {
      const match = message.match(/MH[0-9]{2}[A-Z]{2}[0-9]{4}/i) || message.match(/VIN-[0-9]+/i) || message.match(/[A-Z0-9-]{17}/i);
      const vin = match ? match[0] : "VIN-MOCK-NXN";
      const result = await EkgEngine.answerWhyVehicleFailed(vin);
      return res.json(result);
    }

    // 2. Who repaired similar vehicles?
    if (query.includes("who repaired") || query.includes("similar vehicles")) {
      const match = message.match(/MH[0-9]{2}[A-Z]{2}[0-9]{4}/i) || message.match(/VIN-[0-9]+/i) || message.match(/[A-Z0-9-]{17}/i);
      const vin = match ? match[0] : "VIN-MOCK-NXN";
      const result = await EkgEngine.answerWhoRepairedSimilarVehicles(vin);
      return res.json(result);
    }

    // 3. Which fleets have identical issues?
    if (query.includes("fleets") && (query.includes("identical issues") || query.includes("same issue"))) {
      const result = await EkgEngine.answerWhichFleetsHaveIdenticalIssues("PART-BOOSTER-2788");
      return res.json(result);
    }

    // 4. Which service circular solved this problem?
    if (query.includes("circular") && (query.includes("solved") || query.includes("problem") || query.includes("issue"))) {
      const result = await EkgEngine.answerWhichServiceCircularApplies("DTC-3104");
      return res.json(result);
    }

    // 5. Which technician has the highest success rate?
    if (query.includes("technician") && (query.includes("success rate") || query.includes("highest success"))) {
      const result = await EkgEngine.answerTechnicianSuccessRate("TECH-12");
      return res.json(result);
    }

    // 6. Which part causes repeat failures?
    if (query.includes("part") && (query.includes("repeat failures") || query.includes("causes"))) {
      const result = await EkgEngine.answerRepeatFailureParts("VIN-MOCK-NXN");
      return res.json(result);
    }

    // 7. Connection query: "How are X and Y connected?"
    if (query.includes("connected") || query.includes("connection") || query.includes("how are")) {
      // Find two nodes in the message
      const nodesMatch = message.match(/"([^"]+)"/g) || message.match(/'([^']+)'/g);
      let nodeA = "Customer-1";
      let nodeB = "CIRC-TATA-2026-08";

      if (nodesMatch && nodesMatch.length >= 2) {
        nodeA = nodesMatch[0].replace(/['"]/g, "");
        nodeB = nodesMatch[1].replace(/['"]/g, "");
      }

      const result = await EkgEngine.answerShortestPathConnection(nodeA, nodeB);
      return res.json(result);
    }

    // Default fallback
    res.json({
      answer: "I am evaluating the Enterprise Knowledge Graph. Please ask about failures, technicians, repeat parts, circulars, or connections between entities.",
      confidence: 0.85,
      reasoningPath: []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// HARDENED ENTERPRISE RECOMMENDATIONS & ANALYTICS APIs
// =============================================================================

// ---- POST Dispatch Recommendation ----
router.post("/recommendations", async (req: any, res: any) => {
  const { prompt, role, context } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });
  const userRole = role || "Service Advisor";

  try {
    const result = await AiCopilotOrchestrator.dispatch(prompt, userRole, context || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST Human Approve Recommendation ----
router.post("/recommendations/:id/approve", async (req: any, res: any) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    // 1. Fetch recommendation details
    const [recs] = await db.query("SELECT * FROM ai_recommendations WHERE recommendation_id = ?", [id]) as any[];
    if (recs.length === 0) return res.status(404).json({ error: "Recommendation not found." });

    const rec = recs[0];

    // 2. Update status in database
    await db.execute(
      `UPDATE ai_recommendations 
       SET approval_status = 'APPROVED', approved_by = ? 
       WHERE recommendation_id = ?`,
      [userId || 99, id]
    );

    // 3. Publish to event bus to trigger EKG reinforcement link creation
    await globalEventBus.publish("RECOMMENDATION_APPROVED", {
      recommendation_id: id,
      recommendation_type: rec.recommendation_type,
      details: JSON.parse(rec.details_json)
    }, makeSystemContext("SYSTEM"));

    res.json({ success: true, status: "APPROVED", message: "Recommendation approved successfully and EKG reinforcement loop triggered." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST Human Reject Recommendation ----
router.post("/recommendations/:id/reject", async (req: any, res: any) => {
  const { id } = req.params;

  try {
    // 1. Fetch recommendation details
    const [recs] = await db.query("SELECT * FROM ai_recommendations WHERE recommendation_id = ?", [id]) as any[];
    if (recs.length === 0) return res.status(404).json({ error: "Recommendation not found." });

    const rec = recs[0];

    // 2. Update status in database
    await db.execute(
      `UPDATE ai_recommendations 
       SET approval_status = 'REJECTED' 
       WHERE recommendation_id = ?`,
      [id]
    );

    // 3. Publish to event bus to register rejected learning case in EKG
    await globalEventBus.publish("RECOMMENDATION_REJECTED", {
      recommendation_id: id,
      recommendation_type: rec.recommendation_type,
      details: JSON.parse(rec.details_json)
    }, makeSystemContext("SYSTEM"));

    res.json({ success: true, status: "REJECTED", message: "Recommendation rejected successfully and stored as learning case in EKG." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST Submit Rating/Feedback ----
router.post("/recommendations/:id/rate", async (req: any, res: any) => {
  const { id } = req.params;
  const { rating, comments } = req.body;

  try {
    await db.execute(
      `UPDATE ai_recommendations 
       SET feedback_rating = ?, feedback_comments = ? 
       WHERE recommendation_id = ?`,
      [rating, comments || "", id]
    );
    res.json({ success: true, message: "Feedback submitted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- GET AI Performance Analytics ----
router.get("/analytics", async (req: any, res: any) => {
  try {
    // Total recommendations count
    const [totalRow] = await db.query("SELECT COUNT(*) as count FROM ai_recommendations") as any[];
    const total = totalRow[0].count || 0;

    // Approved recommendations count
    const [approvedRow] = await db.query("SELECT COUNT(*) as count FROM ai_recommendations WHERE approval_status = 'APPROVED'") as any[];
    const approved = approvedRow[0].count || 0;

    // Rejected recommendations count
    const [rejectedRow] = await db.query("SELECT COUNT(*) as count FROM ai_recommendations WHERE approval_status = 'REJECTED'") as any[];
    const rejected = rejectedRow[0].count || 0;

    const acceptedAndRejected = approved + rejected;
    const acceptanceRate = acceptedAndRejected > 0 ? (approved / acceptedAndRejected) * 100 : 0;
    const rejectionRate = acceptedAndRejected > 0 ? (rejected / acceptedAndRejected) * 100 : 0;

    // Average Confidence
    const [avgConfidenceRow] = await db.query("SELECT AVG(confidence_score) as avgConf FROM ai_recommendations") as any[];
    const avgConfidence = Number(avgConfidenceRow[0].avgConf || 0);

    // Total Time Saved
    const [timeSavedRow] = await db.query("SELECT SUM(time_saved_sec) as totalTime FROM ai_recommendations WHERE approval_status = 'APPROVED'") as any[];
    const totalTimeSavedSec = Number(timeSavedRow[0].totalTime || 0);

    // Most-used skills
    const [mostUsedSkills] = await db.query("SELECT skill_id, skill_name, usage_count FROM ai_copilot_skills ORDER BY usage_count DESC LIMIT 5") as any[];

    // Feedback rating split by role
    const [roleRatings] = await db.query(
      `SELECT role_submitting, AVG(feedback_rating) as avgRating, COUNT(*) as count 
       FROM ai_recommendations 
       WHERE feedback_rating IS NOT NULL 
       GROUP BY role_submitting`
    ) as any[];

    res.json({
      success: true,
      metrics: {
        totalRecommendations: total,
        approvedRecommendations: approved,
        rejectedRecommendations: rejected,
        acceptanceRate: Number(acceptanceRate.toFixed(2)),
        rejectionRate: Number(rejectionRate.toFixed(2)),
        averageConfidence: Number(avgConfidence.toFixed(2)),
        timeSavedSeconds: totalTimeSavedSec,
        timeSavedMinutes: Number((totalTimeSavedSec / 60).toFixed(2))
      },
      mostUsedSkills,
      feedbackScoreByRole: roleRatings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
