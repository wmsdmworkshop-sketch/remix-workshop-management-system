import { PredictionEngine } from "../core/ai/prediction-engine";
import { RecommendationEngine } from "../core/ai/recommendation-engine";
import { RootCauseEngine } from "../core/ai/root-cause-engine";
import { ExplainabilityFramework } from "../core/ai/explainability-framework";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_ai_prediction: [],
  tbl_ai_recommendation: [],
  tbl_ai_root_cause: [],
  tbl_ai_decision_log: [],
  tbl_exception_register: [
    { exception_id: "EXC-001", module: "ANALYTICS", reference_id: "ALRT-001" }
  ]
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("INSERT INTO tbl_ai_decision_log")) {
    mockDbState.tbl_ai_decision_log.push({
      decision_log_id: params[0],
      ai_output_type: params[1],
      reference_id: params[2],
      input_features_json: params[3],
      model_version: params[4],
      reasoning_trace: params[5]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_ai_prediction")) {
    mockDbState.tbl_ai_prediction.push({
      prediction_id: params[0],
      prediction_type: params[1],
      reference_module: params[2],
      reference_id: params[3],
      prediction: params[4],
      confidence_score: params[5]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_ai_recommendation")) {
    mockDbState.tbl_ai_recommendation.push({
      recommendation_id: params[0],
      module: params[1],
      reference_id: params[2],
      recommendation: params[3],
      priority: params[4],
      business_impact: params[5],
      confidence_score: params[6],
      reasoning_summary: params[7]
    });
    return [[], []];
  }

  if (query.includes("SELECT module, reference_id FROM tbl_exception_register WHERE exception_id = ?")) {
    const exc = mockDbState.tbl_exception_register.filter((e: any) => e.exception_id === params[0]);
    return [exc, []];
  }

  if (query.includes("INSERT INTO tbl_ai_root_cause")) {
    mockDbState.tbl_ai_root_cause.push({
      analysis_id: params[0],
      module: params[1],
      reference_id: params[2],
      root_cause: params[3],
      contributing_factors: params[4],
      confidence: params[5]
    });
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING AI INTELLIGENCE & DECISION SUPPORT TESTS (SPRINT 15)");
  console.log("=============================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const eventBus = new EventBus();
  const explainability = new ExplainabilityFramework();
  const predictionEngine = new PredictionEngine(eventBus, explainability);
  const recommendationEngine = new RecommendationEngine(eventBus, explainability);
  const rcaEngine = new RootCauseEngine(eventBus, explainability);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  console.log("--- Explainability Framework & Predictions ---");
  const predRes = await predictionEngine.generatePrediction(
    "WORKSHOP", "WS-01", "DelayRisk", "High Risk of Delay", 85,
    "Technician overload and parts shortage detected.", { openJcCount: 15, availableTechs: 2 }
  );
  assert(predRes.success, "Prediction generated successfully");
  assert(mockDbState.tbl_ai_prediction.length === 1, "Prediction saved to AI tables");
  
  const log = mockDbState.tbl_ai_decision_log.find((l: any) => l.reference_id === predRes.predictionId);
  assert(log !== undefined, "Explainability log created for prediction");
  assert(log.ai_output_type === "PREDICTION", "Log type is correct");
  assert(dispatchedEvents.some(e => e.topic === "AI_PREDICTION_CREATED"), "AI_PREDICTION_CREATED event dispatched");

  const badPredRes = await predictionEngine.generatePrediction(
    "WORKSHOP", "WS-01", "DelayRisk", "High Risk", 85, "", {}
  );
  assert(badPredRes.success === false, "Prediction blocked: missing reasoning trace");

  console.log("\n--- Recommendation Engine ---");
  const recRes = await recommendationEngine.generateRecommendation(
    "WORKSHOP", "WS-01", "Reassign 2 technicians to diagnostic bay.", "HIGH",
    "Reduce TAT by 15%", 92, "Current diagnostic bay TAT is breaching SLA.", { bayUtilization: 1.2 }
  );
  assert(recRes.success, "Recommendation generated successfully");
  assert(mockDbState.tbl_ai_recommendation.length === 1, "Recommendation saved to AI tables");
  assert(mockDbState.tbl_ai_decision_log.some((l: any) => l.reference_id === recRes.recommendationId), "Explainability log created for recommendation");
  assert(dispatchedEvents.some(e => e.topic === "AI_RECOMMENDATION_CREATED"), "AI_RECOMMENDATION_CREATED event dispatched");

  console.log("\n--- Root Cause Engine ---");
  const rcaRes = await rcaEngine.analyzeException(
    "EXC-001", "Parts unavailabilty in Central Warehouse", "Delayed PO approvals", 88, { pendingPoCount: 12 }
  );
  assert(rcaRes.success, "Root Cause generated successfully");
  assert(mockDbState.tbl_ai_root_cause.length === 1, "RCA saved to AI tables");
  assert(mockDbState.tbl_ai_root_cause[0].reference_id === "EXC-001", "RCA linked to Exception correctly");
  assert(mockDbState.tbl_ai_decision_log.some((l: any) => l.reference_id === rcaRes.analysisId), "Explainability log created for RCA");
  assert(dispatchedEvents.some(e => e.topic === "AI_ROOT_CAUSE_COMPLETED"), "AI_ROOT_CAUSE_COMPLETED event dispatched");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
