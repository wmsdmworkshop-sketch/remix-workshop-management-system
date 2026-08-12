import { pool as db } from "../db/index.ts";
import http from "http";

function assertEquals(a: any, b: any, msg = "Assertion failed") {
  if (a !== b) {
    throw new Error(`${msg}: expected ${b}, got ${a}`);
  }
}

function assertExists(val: any, msg = "Value does not exist") {
  if (val === undefined || val === null) {
    throw new Error(msg);
  }
}

async function httpRequest(url: string, method = "GET", body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log("=============================================================================");
  console.log("STARTING PILOT OPERATIONS & DEPLOYMENT PLATFORM UNIT TESTS");
  console.log("=============================================================================");

  const baseUrl = "http://localhost:3001/api/v1/pilot";

  try {
    // 1. Epic 1: Day Zero Configurations
    console.log("--- Testing Epic 1: Day Zero Configurations ---");
    const setupPayload = {
      dealerName: "Devanand Automobiles Test Branch",
      tataDealerCode: "TATA-TEST-99",
      gstNo: "27TEST9999Z1Z1",
      labourRate: "500",
      bayCount: "15"
    };

    const saveRes = await httpRequest(`${baseUrl}/setup`, "POST", setupPayload);
    assertEquals(saveRes.success, true, "Save setup failed");

    const getRes = await httpRequest(`${baseUrl}/setup`);
    assertEquals(getRes.success, true, "Get setup failed");
    assertEquals(getRes.config.dealerName, "Devanand Automobiles Test Branch", "Dealer name mismatch");
    assertEquals(getRes.config.tataDealerCode, "TATA-TEST-99", "Dealer code mismatch");
    assertEquals(getRes.config.gstNo, "27TEST9999Z1Z1", "GST number mismatch");
    assertEquals(getRes.config.labourRate, "500", "Labour rate mismatch");

    // 2. Epic 2: Master Data Validation
    console.log("--- Testing Epic 2: Master Data Validation ---");
    const validateRes = await httpRequest(`${baseUrl}/setup/master-data/validate`);
    assertEquals(validateRes.success, true, "Master data validation failed");
    assertExists(validateRes.healthScore, "Health score does not exist");
    assertExists(validateRes.duplicates, "Duplicates object does not exist");
    assertExists(validateRes.missingData, "Missing data object does not exist");

    // 3. Epic 3: User Onboarding Progress
    console.log("--- Testing Epic 3: User Onboarding Progress ---");
    const onboardingRes = await httpRequest(`${baseUrl}/onboarding/progress?employee_id=22&role=service_advisor`);
    assertEquals(onboardingRes.success, true, "Get onboarding failed");
    assertEquals(onboardingRes.progress.employee_id, 22, "Employee ID mismatch");
    assertEquals(onboardingRes.progress.role, "service_advisor", "Role mismatch");
    assertExists(onboardingRes.progress.checklist, "Checklist does not exist");

    const updatedChecklist = onboardingRes.progress.checklist.map((item: any) => {
      if (item.id === "tour") {
        return { ...item, completed: true };
      }
      return item;
    });

    const updateOnboardingRes = await httpRequest(`${baseUrl}/onboarding/progress`, "POST", {
      employee_id: 22,
      role: "service_advisor",
      checklist: updatedChecklist
    });
    assertEquals(updateOnboardingRes.success, true, "Update onboarding progress failed");
    assertEquals(updateOnboardingRes.completion_percentage > 0, true, "Percentage did not increment");

    // 4. Epic 5: Staff Feedback Engine & Epic 8: Backlog Engine
    console.log("--- Testing Epic 5 & 8: Staff Feedback & Backlog Engines ---");
    const feedbackPayload = {
      employee_id: 22,
      role: "service_advisor",
      screen_id: "advisor-workspace",
      feedback_type: "BUG",
      message: "The save estimate button crashed when I clicked it.",
      rating: 2
    };

    const feedbackRes = await httpRequest(`${baseUrl}/feedback`, "POST", feedbackPayload);
    assertEquals(feedbackRes.success, true, "Submit feedback failed");
    assertExists(feedbackRes.feedback_id, "Feedback ID missing");
    assertExists(feedbackRes.backlog_id, "Backlog ID missing");

    // Verify it exists in backlog
    const backlogRes = await httpRequest(`${baseUrl}/backlog`);
    assertEquals(backlogRes.success, true, "Fetch backlog failed");
    const loggedBug = backlogRes.backlog.find((item: any) => item.backlog_id === feedbackRes.backlog_id);
    assertExists(loggedBug, "Feedback bug not automatically added to backlog");
    assertEquals(loggedBug.category, "BUG", "Backlog category mismatch");
    assertEquals(loggedBug.priority, "CRITICAL", "Backlog priority was not escalated heuristically");

    // 5. Epic 6: Business Impact Tracker
    console.log("--- Testing Epic 6: Business Impact Tracker ---");
    const roiRes = await httpRequest(`${baseUrl}/roi`);
    assertEquals(roiRes.success, true, "Get ROI failed");
    assertExists(roiRes.metrics.totalRevenue, "Total revenue missing");
    assertExists(roiRes.metrics.aiTimeSavedMinutes, "AI time saved missing");
    assertExists(roiRes.metrics.bayUtilizationRate, "Bay utilization missing");

    // 6. Epic 7: Live Support Mode & Maintenance settings
    console.log("--- Testing Epic 7: Live Support Mode ---");
    const supportRes = await httpRequest(`${baseUrl}/support/status`);
    assertEquals(supportRes.success, true, "Get support status failed");
    assertEquals(supportRes.maintenanceMode, "OFF", "Maintenance mode should default to OFF");

    const toggleRes = await httpRequest(`${baseUrl}/support/toggle`, "POST", {
      settings_key: "maintenance_mode",
      settings_value: "ON"
    });
    assertEquals(toggleRes.success, true, "Toggle maintenance mode failed");
    assertEquals(toggleRes.settings_value, "ON", "Value mismatch");

    const supportRes2 = await httpRequest(`${baseUrl}/support/status`);
    assertEquals(supportRes2.maintenanceMode, "ON", "Maintenance mode did not persist");

    // Restore to OFF
    await httpRequest(`${baseUrl}/support/toggle`, "POST", {
      settings_key: "maintenance_mode",
      settings_value: "OFF"
    });

    // 7. Epic 10: Version 1.1 Planner Roadmap rankings
    console.log("--- Testing Epic 10: Version 1.1 Roadmap Planner ---");
    // Seed items
    await httpRequest(`${baseUrl}/backlog`, "POST", {
      title: "Quick win feature",
      description: "Low effort, high value",
      category: "ENHANCEMENT",
      business_value: 90,
      development_effort: 1, // very low effort
      roi: 90,
      operational_impact: 85
    });

    await httpRequest(`${baseUrl}/backlog`, "POST", {
      title: "Hard expensive feature",
      description: "High effort, low value",
      category: "ENHANCEMENT",
      business_value: 20,
      development_effort: 10, // high effort
      roi: 10,
      operational_impact: 15
    });

    const plannerRes = await httpRequest(`${baseUrl}/planner/v11`);
    assertEquals(plannerRes.success, true, "Get planner failed");
    const roadmap = plannerRes.roadmap;
    const quickWinIndex = roadmap.findIndex((item: any) => item.title === "Quick win feature");
    const hardFeatureIndex = roadmap.findIndex((item: any) => item.title === "Hard expensive feature");
    assertEquals(quickWinIndex < hardFeatureIndex, true, "Prioritization ranking did not sort quick win above hard feature");

    console.log("=============================================================================");
    console.log("PILOT OPERATIONS PLATFORM TESTS RESULTS: 7 passed, 0 failed");
    console.log("=============================================================================");
  } catch (err: any) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

// Run test if invoked directly
if (process.argv[1].endsWith("pilot-platform.test.ts")) {
  run().then(() => {
    db.end();
    process.exit(0);
  });
}
export { run };
