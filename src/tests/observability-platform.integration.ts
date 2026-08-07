import http from "http";

function assertEquals(a: any, b: any, msg = "Assertion failed") {
  if (a !== b) {
    throw new Error(`${msg}: expected ${b}, got ${a}`);
  }
}

function assertExists(val: any, msg = "Value should exist") {
  if (val === undefined || val === null) {
    throw new Error(msg);
  }
}

async function requestGet(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3001${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse json response from ${path}`));
        }
      });
    }).on("error", (err) => reject(err));
  });
}

async function main() {
  console.log("=============================================================================");
  console.log("RUNNING OBSERVABILITY PLATFORM SUITE");
  console.log("=============================================================================");

  try {
    // 1. Epic 1: Distributed Trace Check
    console.log("Test: GET /api/v1/devops/traces/TR-EOP-9911");
    const traceRes = await requestGet("/api/v1/devops/traces/TR-EOP-9911");
    assertEquals(traceRes.success, true, "Trace API success flag");
    assertExists(traceRes.traceId, "OpenTelemetry compatible traceId exists");
    assertExists(traceRes.spanId, "OpenTelemetry compatible spanId exists");
    assertEquals(traceRes.correlationId, "TR-EOP-9911", "Correlation ID matches");
    assertEquals(traceRes.stages.length > 0, true, "Trace stages returned");
    console.log("[OK] Distributed tracing verification completed.");

    // 2. Epic 2: Live Event stream registry
    console.log("Test: GET /api/v1/devops/events");
    const eventRes = await requestGet("/api/v1/devops/events");
    assertEquals(eventRes.success, true, "Event stream registry API success");
    assertEquals(eventRes.events.length > 0, true, "Event registry has items");
    console.log("[OK] Live event registry verification completed.");

    // 3. Epic 3: Vehicle Journey timeline stages
    console.log("Test: GET /api/v1/devops/timeline");
    const timelineRes = await requestGet("/api/v1/devops/timeline");
    assertEquals(timelineRes.success, true, "Timeline API success flag");
    assertEquals(timelineRes.timeline.length > 0, true, "Timeline stages returned");
    console.log("[OK] Vehicle Journey Replay verification completed.");

    // 4. Epic 5: Database Operations & Health Telemetries
    console.log("Test: GET /api/v1/devops/database/ops");
    const dbRes = await requestGet("/api/v1/devops/database/ops");
    assertEquals(dbRes.success, true, "Database telemetry success flag");
    assertExists(dbRes.activeConnections, "activeConnections field");
    assertExists(dbRes.queryDurationAverageMs, "queryDurationAverageMs field");
    console.log("[OK] Database telemetry verification completed.");

    // 5. Epic 4: AI Reasoning audits
    console.log("Test: GET /api/v1/devops/ai");
    const aiRes = await requestGet("/api/v1/devops/ai");
    assertEquals(aiRes.success, true, "AI reasoning success flag");
    assertExists(aiRes.reasoning.copilotUsed, "Copilot identifier field");
    assertExists(aiRes.reasoning.explainability.why, "AI explainability why statement");
    console.log("[OK] AI reasoning audit verification completed.");

    console.log("\n=============================================================================");
    console.log("OBSERVABILITY SUITE PASSED COMPLETELY");
    console.log("=============================================================================");
  } catch (err: any) {
    console.error("OBSERVABILITY SUITE FAILED:", err.message);
    throw err;
  }
}

main();
