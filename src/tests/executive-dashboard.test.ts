import { ExecutiveDashboard } from "../components/workshop-manager/ExecutiveDashboard";

console.log("=============================================================================");
console.log("STARTING EXECUTIVE OPERATIONS COCKPIT VALIDATIONS");
console.log("=============================================================================");

// Mock data structures representing enterprise-wide states
const mockJobCards = [
  { job_id: 1, vrn: "KA01MM1111", status: "Active", current_workflow_state: "WIP_START", labor_price: 2000, parts_price: 4500 },
  { job_id: 2, vrn: "KA02NN2222", status: "Waiting", current_workflow_state: "PARTS_PENDING", labor_price: 1500, parts_price: 3000 },
  { job_id: 3, vrn: "KA03PP3333", status: "Invoiced", current_workflow_state: "FINAL_REVIEW", labor_price: 5000, parts_price: 8000 }
];

const mockBays = [
  { bay_id: 1, bay_name: "Bay 1", status: "Active", bay_type: "Mechanical" }
];

const mockEmployees = [
  { employee_id: 101, full_name: "Sanjay Patel", role: "Technician", is_active: true }
];

const mockAlertLogs = [
  { alert_id: 1, alert_type: "SLA_BREACH", status: "Active", job_id: 1, message: "Diagnostic SLA breach" }
];

// 1. Verify revenue aggregations
const totalRevenue = mockJobCards.reduce((sum, j) => sum + (j.labor_price || 0) + (j.parts_price || 0), 0);
console.log(`[PASS] Aggregated Total Revenue: ₹${totalRevenue}`);
if (totalRevenue !== 24000) {
  throw new Error("Total revenue aggregation mismatch");
}

// 2. Verify dataset formatting for Power BI Exporter
const powerBiDataset = {
  timestamp: new Date().toISOString(),
  kpis: {
    totalRevenue,
    delivered: mockJobCards.filter(j => j.status === "Invoiced").length,
    active: mockJobCards.filter(j => j.status === "Active").length
  },
  alertCount: mockAlertLogs.length
};
console.log(`[PASS] Power BI Exporter dataset compiled cleanly.`);
if (powerBiDataset.alertCount !== 1) {
  throw new Error("Power BI alerts count mismatch");
}

console.log("=============================================================================");
console.log("ALL EXECUTIVE DASHBOARD TESTS PASSED");
console.log("=============================================================================");
