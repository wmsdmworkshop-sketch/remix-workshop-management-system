import { isAuthorizedForJobCard } from "../api/routes/workshop.routes.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Hotfix P0-001 Service Advisor RLS Test Suite
 * =============================================================================
 */

function runRlsTests() {
  console.log("🧪 Running Hotfix P0-001 Service Advisor RLS Automated Tests...\n");

  const advisorA = {
    id: 22,
    username: "shashi_sa",
    full_name: "shashikumar",
    role: "service_advisor"
  };

  const advisorB = {
    id: 23,
    username: "mustafa_ladaf",
    full_name: "mustafa ladaf",
    role: "service_advisor"
  };

  const manager = {
    id: 26,
    username: "ahmed_wm",
    full_name: "ahmed hussain",
    role: "service_manager"
  };

  const admin = {
    id: 31,
    username: "admin",
    full_name: "Admin Operator",
    role: "admin"
  };

  const jobCardA = {
    job_id: 101,
    job_card_no: "JC-500171",
    service_advisor: "shashikumar",
    created_by: 22
  };

  const jobCardB = {
    job_id: 102,
    job_card_no: "JC-444519",
    service_advisor: "mustafa ladaf",
    created_by: 23
  };

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition: boolean, testName: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // Test 1: Advisor A can access own Job Card A
  assert(isAuthorizedForJobCard(jobCardA, advisorA) === true, "Advisor A can access own Job Card A");

  // Test 2: Advisor A CANNOT access Advisor B's Job Card B (Row-Level Security)
  assert(isAuthorizedForJobCard(jobCardB, advisorA) === false, "Advisor A CANNOT access Advisor B Job Card B (403 Forbidden)");

  // Test 3: Advisor B can access own Job Card B
  assert(isAuthorizedForJobCard(jobCardB, advisorB) === true, "Advisor B can access own Job Card B");

  // Test 4: Advisor B CANNOT access Advisor A's Job Card A
  assert(isAuthorizedForJobCard(jobCardA, advisorB) === false, "Advisor B CANNOT access Advisor A Job Card A (403 Forbidden)");

  // Test 5: Service Manager can access both Job Cards
  assert(isAuthorizedForJobCard(jobCardA, manager) === true, "Service Manager can access Job Card A");
  assert(isAuthorizedForJobCard(jobCardB, manager) === true, "Service Manager can access Job Card B");

  // Test 6: Admin can access both Job Cards
  assert(isAuthorizedForJobCard(jobCardA, admin) === true, "Admin can access Job Card A");
  assert(isAuthorizedForJobCard(jobCardB, admin) === true, "Admin can access Job Card B");

  console.log(`\n📊 RLS TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runRlsTests();
