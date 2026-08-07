import { KPIAggregationEngine } from "../core/analytics/kpi-aggregation-engine";
import { AlertEngine } from "../core/analytics/alert-engine";
import { DashboardEngine } from "../core/analytics/dashboard-engine";
import { ReportEngine } from "../core/analytics/report-engine";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_kpi_catalog: [
    { kpi_id: "KPI-001", kpi_name: "Workshop Revenue", default_target: 100000 }
  ],
  tbl_kpi_snapshot: [],
  tbl_alert_rule: [
    { rule_id: "RULE-001", kpi_id: "KPI-001", threshold: 80000, operator: '<', priority: 'CRITICAL', status: 'ACTIVE' }
  ],
  tbl_alert_history: [],
  tbl_exception_register: [],
  tbl_dashboard: [
    { dashboard_id: "DASH-DP", dashboard_name: "Dealer Principal", user_role: "DEALER_PRINCIPAL", status: "ACTIVE" }
  ],
  tbl_dashboard_widget: [
    { widget_id: "WID-001", dashboard_id: "DASH-DP", widget_type: "KPI", chart_type: "NUMBER_CARD", sequence: 1, configuration_json: '{"kpi": "KPI-001"}' }
  ],
  tbl_report_definition: [
    { report_def_id: "RDEF-001", module: "WORKSHOP", query_json: "{}" }
  ],
  tbl_report_history: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("SELECT default_target FROM tbl_kpi_catalog")) {
    const cat = mockDbState.tbl_kpi_catalog.filter((c: any) => c.kpi_id === params[0]);
    return [cat, []];
  }

  if (query.includes("SELECT kpi_value FROM tbl_kpi_snapshot WHERE kpi_id = ? AND branch_id <=> ? ORDER BY snapshot_time DESC LIMIT 1")) {
    const snaps = mockDbState.tbl_kpi_snapshot.filter((s: any) => s.kpi_id === params[0] && s.branch_id === params[1]);
    return [snaps.length > 0 ? [snaps[snaps.length - 1]] : [], []];
  }

  if (query.includes("SELECT MAX(version) as max_v FROM tbl_kpi_snapshot")) {
    const snaps = mockDbState.tbl_kpi_snapshot.filter((s: any) => s.kpi_id === params[0] && s.branch_id === params[1]);
    if (snaps.length > 0) {
      return [[{ max_v: Math.max(...snaps.map((s: any) => s.version)) }], []];
    }
    return [[{ max_v: null }], []];
  }

  if (query.includes("INSERT INTO tbl_kpi_snapshot")) {
    mockDbState.tbl_kpi_snapshot.push({
      snapshot_id: params[0], kpi_id: params[1], run_id: params[2], version: params[3],
      branch_id: params[4], business_unit: params[5], kpi_value: params[6], target: params[7],
      variance: params[8], trend: params[9]
    });
    return [[], []];
  }

  if (query.includes("SELECT kpi_id, kpi_value FROM tbl_kpi_snapshot WHERE snapshot_id = ?")) {
    const snap = mockDbState.tbl_kpi_snapshot.filter((s: any) => s.snapshot_id === params[0]);
    return [snap, []];
  }

  if (query.includes("SELECT rule_id, threshold, operator, priority FROM tbl_alert_rule")) {
    const rules = mockDbState.tbl_alert_rule.filter((r: any) => r.kpi_id === params[0] && r.status === 'ACTIVE');
    return [rules, []];
  }

  if (query.includes("INSERT INTO tbl_alert_history")) {
    mockDbState.tbl_alert_history.push({
      alert_id: params[0], rule_id: params[1], actual_value: params[2], threshold: params[3]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_exception_register")) {
    mockDbState.tbl_exception_register.push({
      exception_id: params[0], reference_id: params[2], description: params[3], severity: params[4], status: 'OPEN'
    });
    return [[], []];
  }

  if (query.includes("SELECT dashboard_id, dashboard_name FROM tbl_dashboard")) {
    const dbds = mockDbState.tbl_dashboard.filter((d: any) => d.user_role === params[0] && d.status === 'ACTIVE');
    return [dbds, []];
  }

  if (query.includes("SELECT widget_id, widget_type, chart_type, configuration_json FROM tbl_dashboard_widget")) {
    const widgets = mockDbState.tbl_dashboard_widget.filter((w: any) => w.dashboard_id === params[0]);
    return [widgets, []];
  }

  if (query.includes("SELECT query_json, module FROM tbl_report_definition")) {
    const defs = mockDbState.tbl_report_definition.filter((r: any) => r.report_def_id === params[0]);
    return [defs, []];
  }

  if (query.includes("INSERT INTO tbl_report_history")) {
    mockDbState.tbl_report_history.push({
      report_history_id: params[0], report_def_id: params[1], generated_by: params[2], parameters_json: params[3], output_format: params[4]
    });
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE MIS & ANALYTICS TESTS (SPRINT 14)");
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
  const kpiEngine = new KPIAggregationEngine(eventBus);
  const alertEngine = new AlertEngine(eventBus);
  const dashboardEngine = new DashboardEngine();
  const reportEngine = new ReportEngine(eventBus);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  console.log("--- KPI Snapshot Versioning & Trends ---");
  const snapRes1 = await kpiEngine.aggregateAndSnapshot("KPI-001", 105000, "BR-01");
  assert(snapRes1.success, "KPI Snapshot 1 generated successfully");
  const snap1 = mockDbState.tbl_kpi_snapshot.find((s: any) => s.snapshot_id === snapRes1.snapshotId);
  assert(snap1.version === 1, "First snapshot is version 1");
  assert(snap1.trend === "FLAT", "First snapshot trend is FLAT");
  assert(snap1.variance === 5000, "Variance calculated correctly (+5000 against 100k target)");
  assert(dispatchedEvents.some(e => e.topic === "KPI_REFRESHED"), "KPI_REFRESHED event dispatched");

  const snapRes2 = await kpiEngine.aggregateAndSnapshot("KPI-001", 90000, "BR-01");
  assert(snapRes2.success, "KPI Snapshot 2 generated successfully");
  const snap2 = mockDbState.tbl_kpi_snapshot.find((s: any) => s.snapshot_id === snapRes2.snapshotId);
  assert(snap2.version === 2, "Second snapshot is version 2");
  assert(snap2.trend === "DOWN", "Second snapshot trend is DOWN (90k < 105k)");
  assert(snap2.variance === -10000, "Variance calculated correctly (-10000 against 100k target)");

  console.log("\n--- Alert Engine & Exception Register ---");
  dispatchedEvents = [];
  // Evaluate the 90k snapshot against rule (threshold < 80k) -> no trigger
  await alertEngine.evaluateSnapshotAgainstRules(snapRes2.snapshotId!);
  assert(mockDbState.tbl_alert_history.length === 0, "No alert raised for 90k (threshold is <80k)");

  // Create a 70k snapshot
  const snapRes3 = await kpiEngine.aggregateAndSnapshot("KPI-001", 70000, "BR-01");
  await alertEngine.evaluateSnapshotAgainstRules(snapRes3.snapshotId!);
  
  assert(mockDbState.tbl_alert_history.length === 1, "Alert triggered for 70k snapshot");
  assert(mockDbState.tbl_exception_register.length === 1, "Exception Register entry created for CRITICAL alert");
  assert(dispatchedEvents.some(e => e.topic === "ALERT_RAISED"), "ALERT_RAISED event dispatched");
  assert(dispatchedEvents.some(e => e.topic === "EXCEPTION_LOGGED"), "EXCEPTION_LOGGED event dispatched");

  console.log("\n--- Role-Based Dashboard Engine ---");
  const dashConfig = await dashboardEngine.getDashboardConfigForRole("DEALER_PRINCIPAL");
  assert(dashConfig !== null, "Dashboard config retrieved for DP role");
  assert(dashConfig.dashboardName === "Dealer Principal", "Correct dashboard returned");
  assert(dashConfig.widgets.length === 1, "Widgets array parsed and sorted successfully");

  console.log("\n--- Reporting Engine ---");
  dispatchedEvents = [];
  const repRes = await reportEngine.executeReport("RDEF-001", { dateRange: "Q1" }, "SYS_ADMIN", "PDF");
  assert(repRes.success, "Report generated and logged to history successfully");
  assert(mockDbState.tbl_report_history.length === 1, "Report execution history saved");
  assert(dispatchedEvents.some(e => e.topic === "REPORT_GENERATED"), "REPORT_GENERATED event dispatched");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
