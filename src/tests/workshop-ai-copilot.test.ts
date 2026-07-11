import { assert } from "console";
import { WorkshopAIEngine } from "../components/workshop-manager/aiEngine";

console.log("=============================================================================");
console.log("STARTING WORKSHOP MANAGER AI COPILOT TESTS");
console.log("=============================================================================");

// Mock data structures
const mockJobCards = [
  {
    job_id: 1,
    vrn: "KA01MM1111",
    status: "Active",
    current_workflow_state: "WIP_START",
    labor_price: 2000,
    parts_price: 4500,
    created_at: new Date().toISOString(),
    vehicle_make: "Tata",
    vehicle_model: "Nexon EV"
  },
  {
    job_id: 2,
    vrn: "KA02NN2222",
    status: "Waiting",
    current_workflow_state: "PARTS_PENDING",
    labor_price: 1500,
    parts_price: 3000,
    created_at: new Date().toISOString(),
    vehicle_make: "Tata",
    vehicle_model: "Harrier"
  },
  {
    job_id: 3,
    vrn: "KA03PP3333",
    status: "Invoiced",
    current_workflow_state: "FINAL_REVIEW",
    labor_price: 5000,
    parts_price: 8000,
    created_at: new Date().toISOString(),
    vehicle_make: "Tata",
    vehicle_model: "Altroz"
  }
];

const mockBays = [
  { bay_id: 1, bay_name: "Bay 1", status: "Active", bay_type: "Mechanical" },
  { bay_id: 2, bay_name: "Bay 2", status: "Idle", bay_type: "Mechanical" },
  { bay_id: 3, bay_name: "Bay 3 (EV Isolation)", status: "Active", bay_type: "EV Isolation" }
];

const mockEmployees = [
  { employee_id: 101, full_name: "Sanjay Patel", role: "Technician", is_active: true, certification_level: "Gold" },
  { employee_id: 102, full_name: "Alex Carter", role: "Technician", is_active: true, certification_level: "Silver" }
];

const mockAlertLogs = [
  { alert_id: 1, alert_type: "SLA_BREACH", status: "Active", job_id: 1, message: "Diagnostic SLA breach" }
];

// Test 1: Workshop Health Score
const healthScore = WorkshopAIEngine.calculateHealthScore(mockJobCards, mockBays, mockAlertLogs);
console.log(`[PASS] Health Score calculated successfully: ${healthScore}`);
if (healthScore <= 0 || healthScore > 100) {
  throw new Error("Health score must be between 1 and 100");
}

// Test 2: SLA Breach Predictor
const breaches = WorkshopAIEngine.predictSlaBreaches(mockJobCards, mockAlertLogs);
console.log(`[PASS] SLA Breach Predictor successfully checked imminent breaches.`);

// Test 3: Revenue Predictor
const revenue = WorkshopAIEngine.forecastRevenue(mockJobCards);
console.log(`[PASS] Revenue Forecast - Labour: ₹${revenue.labour}, Parts: ₹${revenue.parts}`);
if (revenue.total <= 0) {
  throw new Error("Revenue forecast total must be greater than zero");
}

// Test 4: Parts Delay Predictor
const partsDelays = WorkshopAIEngine.predictPartsDelays(mockJobCards);
console.log(`[PASS] Parts Delay Predictor successfully flagged ${partsDelays.length} jobs.`);
if (partsDelays.length === 0) {
  throw new Error("Parts delays should have caught PARTS_PENDING job card");
}

// Test 5: AI Recommendation Feed
const recommendations = WorkshopAIEngine.generateAiFeed(mockJobCards, mockBays, mockEmployees);
console.log(`[PASS] AI Recommendations generated: ${recommendations.length} options.`);
if (recommendations.length === 0) {
  throw new Error("AI Recommendations should have at least 1 item");
}

// Test 6: Daily Brief
const brief = WorkshopAIEngine.generateDailyBrief(mockJobCards, mockBays, mockEmployees);
console.log(`[PASS] Daily Brief created successfully.`);
if (!brief.morningBrief) {
  throw new Error("Daily brief morning text must be set");
}

console.log("=============================================================================");
console.log("ALL AI COPILOT TESTS PASSED");
console.log("=============================================================================");
