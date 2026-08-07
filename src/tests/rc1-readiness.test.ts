import { ConfigurationEngine } from "../core/sys/configuration-engine";
import { ObservabilityEngine } from "../core/sys/observability-engine";
import { AuditEngine } from "../core/sys/audit-engine";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_system_configuration: [
    { config_key: "SLA_LIMIT", config_value: "48" }
  ],
  tbl_feature_flag: [
    { flag_key: "NEW_DASHBOARD", is_enabled: true }
  ],
  tbl_branch_configuration: [
    { branch_id: "BR-01", config_key: "SLA_LIMIT", config_value: "24" }
  ],
  tbl_job_execution: [],
  tbl_application_log: [],
  tbl_enterprise_audit: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("SELECT config_value FROM tbl_branch_configuration")) {
    const cfgs = mockDbState.tbl_branch_configuration.filter((c: any) => c.branch_id === params[0] && c.config_key === params[1]);
    return [cfgs, []];
  }

  if (query.includes("SELECT config_value FROM tbl_system_configuration")) {
    const cfgs = mockDbState.tbl_system_configuration.filter((c: any) => c.config_key === params[0]);
    return [cfgs, []];
  }

  if (query.includes("SELECT is_enabled, rollout_percentage FROM tbl_feature_flag")) {
    const flags = mockDbState.tbl_feature_flag.filter((f: any) => f.flag_key === params[0]);
    return [flags, []];
  }

  if (query.includes("INSERT INTO tbl_job_execution")) {
    mockDbState.tbl_job_execution.push({
      execution_id: params[0], job_name: params[1], start_time: params[2], end_time: params[3], status: params[4], duration_ms: params[6]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_application_log")) {
    mockDbState.tbl_application_log.push({
      log_id: params[0], level: params[1], module: params[2], correlation_id: params[3], message: params[4]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_enterprise_audit")) {
    mockDbState.tbl_enterprise_audit.push({
      audit_id: params[0], correlation_id: params[1], event_type: params[2], module: params[3],
      old_value_json: params[6], new_value_json: params[7], is_sensitive: params[9]
    });
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING RC-1 PRODUCTION READINESS TESTS");
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

  const configEngine = new ConfigurationEngine();
  const obsEngine = new ObservabilityEngine();
  const auditEngine = new AuditEngine();

  console.log("--- Configuration Management ---");
  const sysSla = await configEngine.getConfiguration("SLA_LIMIT");
  assert(sysSla === "48", "System-level configuration fetched correctly");

  const branchSla = await configEngine.getConfiguration("SLA_LIMIT", "BR-01");
  assert(branchSla === "24", "Branch-level configuration overrides system default");

  const flag = await configEngine.getFeatureFlag("NEW_DASHBOARD");
  assert(flag === true, "Feature flag evaluated correctly");

  console.log("\n--- Observability Engine ---");
  const start = new Date();
  const end = new Date(start.getTime() + 1500); // 1.5s
  await obsEngine.logExecution("NightlyBatch", start, end, "SUCCESS");
  assert(mockDbState.tbl_job_execution.length === 1, "Job execution logged");
  assert(mockDbState.tbl_job_execution[0].duration_ms === 1500, "Job duration calculated correctly");

  // Telemetry is async, wait briefly for it
  obsEngine.captureApplicationLog("ERROR", "FINANCE", "DB Connection Timeout", "CORR-999");
  await new Promise(r => setTimeout(r, 50)); 
  assert(mockDbState.tbl_application_log.length === 1, "Async telemetry captured");

  console.log("\n--- Enterprise Audit Center ---");
  const corrId = "CORR-001";
  await auditEngine.captureAudit({
    eventType: "FINANCE_POSTING",
    module: "FINANCE",
    userId: "USR-01",
    referenceId: "INV-001",
    isSensitive: false
  }, corrId, true); // Sync audit
  assert(mockDbState.tbl_enterprise_audit.length === 1, "Synchronous business-critical audit saved");

  const sensitivePayload = JSON.stringify({ panNumber: "ABCDE1234F", amount: 1000 });
  await auditEngine.captureAudit({
    eventType: "USER_UPDATE",
    module: "IDENTITY",
    userId: "USR-02",
    referenceId: "USR-02",
    newValueJson: sensitivePayload,
    isSensitive: true
  }, corrId, true);
  
  const sensitiveLog = mockDbState.tbl_enterprise_audit[1];
  assert(sensitiveLog.is_sensitive === true, "Sensitive flag respected");
  assert(sensitiveLog.new_value_json.includes("********"), "Sensitive values masked before persistence");
  assert(!sensitiveLog.new_value_json.includes("ABCDE1234F"), "Original sensitive data is not leaked");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
