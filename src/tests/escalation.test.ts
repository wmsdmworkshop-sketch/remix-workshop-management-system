// =============================================================================
// WOS SLA & Escalation Engine Test Suites (Sprint 6)
// Execution: npx tsx src/tests/escalation.test.ts
// =============================================================================

import { pool as db } from "../db/index";
import { EventBus } from "../core/event-bus";
import { SLAEngine } from "../core/sla/sla-engine";
import { SLAEscalationEngine } from "../core/sla/escalation-engine";
import { SLATimerManager } from "../core/sla/sla-timer-manager";

let mockDbState: any = {
  tbl_business_calendar: [],
  tbl_sla_policy: [],
  tbl_sla_instance: [],
  tbl_sla_timer: [],
  tbl_sla_escalation: [],
  tbl_sla_history: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("INSERT INTO tbl_sla_instance")) {
    mockDbState.tbl_sla_instance.push({
      instance_id: params[0], policy_id: params[1], entity_type: params[2], entity_id: params[3], status: params[4]
    });
    return [[], []];
  }
  if (query.includes("INSERT INTO tbl_sla_timer")) {
    mockDbState.tbl_sla_timer.push({
      timer_id: params[0], instance_id: params[1], start_time: params[2], target_breach_time: params[3], status: params[4]
    });
    return [[], []];
  }
  if (query.includes("INSERT INTO tbl_sla_history")) {
    mockDbState.tbl_sla_history.push({
      history_id: params[0], instance_id: params[1], action: params[2], details: params[3]
    });
    return [[], []];
  }
  if (query.includes("SELECT * FROM tbl_sla_policy")) {
    return [[{
      policy_id: "POL-1", policy_name: "Gate Entry Fast", sla_type: "GATE_ENTRY_SLA",
      workshop_id: null, service_type: null, customer_category: null, vehicle_category: null, operation_type: null,
      base_minutes_limit: 15, is_24x7: 0, is_active: 1
    }], []];
  }
  if (query.includes("SELECT t.timer_id, t.instance_id")) {
    // Escalate breached timers
    const breached = mockDbState.tbl_sla_timer.filter((t: any) => t.status === "RUNNING" && new Date(t.target_breach_time) <= new Date(params[0]));
    const result = breached.map((t: any) => {
      const inst = mockDbState.tbl_sla_instance.find((i: any) => i.instance_id === t.instance_id);
      return { ...t, policy_id: inst.policy_id, entity_type: inst.entity_type, entity_id: inst.entity_id };
    });
    return [result, []];
  }
  if (query.includes("SELECT * FROM tbl_sla_escalation")) {
    return [[{
      escalation_id: "ESC-1", policy_id: params[0], escalation_level: 1, trigger_minutes_after_breach: 0, target_role: "L1_SUPERVISOR", severity: "WARNING"
    }], []];
  }
  if (query.includes("UPDATE tbl_sla_timer SET status = 'STOPPED'")) {
    const timer = mockDbState.tbl_sla_timer.find((t: any) => t.instance_id === params[1] || t.timer_id === params[0]);
    if (timer) timer.status = 'STOPPED';
    return [[], []];
  }
  if (query.includes("UPDATE tbl_sla_instance SET status = 'RESOLVED'")) {
    const inst = mockDbState.tbl_sla_instance.find((i: any) => i.instance_id === params[1]);
    if (inst) inst.status = 'RESOLVED';
    return [[], []];
  }

  return [[], []];
};

async function runTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE SLA ENGINE TESTS (SPRINT 6)");
  console.log("=============================================================================");

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

  const bus = new EventBus();
  const slaEngine = new SLAEngine(bus);
  const escalationEngine = new SLAEscalationEngine(bus);
  
  slaEngine.subscribeToDomainEvents();

  let escalationEmitted = false;
  bus.subscribe("SLA_ESCALATED", (env) => {
    escalationEmitted = true;
  });

  console.log("\n--- Testing Timer Creation via Event Bus ---");
  await bus.publish("GATE_ENTRY_COMPLETED", { gateId: "G-123", workshopId: 1 }, { correlationId: "C1" } as any);
  
  // Wait for async processing
  await new Promise(r => setTimeout(r, 100));

  assert(mockDbState.tbl_sla_instance.length > 0, "SLA Instance created via event subscription");
  assert(mockDbState.tbl_sla_timer.length > 0, "SLA Timer created via event subscription");
  assert(mockDbState.tbl_sla_history.length > 0, "SLA History logged upon timer creation");

  console.log("\n--- Testing Escalation Engine ---");
  // Modify target breach time to force a breach
  mockDbState.tbl_sla_timer[0].target_breach_time = new Date(Date.now() - 100000).toISOString();

  await escalationEngine.detectBreachesAndEscalate();

  await new Promise(r => setTimeout(r, 100));

  assert(mockDbState.tbl_sla_timer[0].status === "STOPPED", "Breached timer status changed to STOPPED");
  assert(escalationEmitted, "SLA_ESCALATED event published to Event Bus");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
