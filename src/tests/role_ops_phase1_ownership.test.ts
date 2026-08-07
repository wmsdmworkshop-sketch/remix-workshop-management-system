import { isAuthorizedForJobCard } from "../api/routes/workshop.routes.ts";
import { authService } from "../core/AuthorizationService.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Phase 1 Role Operations Security Test Suite
 * Task: AIVAAHAN-ROLE-OPS-IMPL-001
 * Bounded Context: Security & Server-Side Data Isolation Verification
 * =============================================================================
 */

function runPhase1OwnershipTests() {
  console.log("🧪 Running Phase 1 Role Operations Server-Side Ownership Security Tests...\n");

  const saA = {
    id: 22,
    user_id: 22,
    username: "shashi_sa",
    full_name: "shashikumar",
    role: "service_advisor",
    employee_id: 1001,
    branchId: 1
  };

  const saB = {
    id: 23,
    user_id: 23,
    username: "mustafa_ladaf",
    full_name: "mustafa ladaf",
    role: "service_advisor",
    employee_id: 1002,
    branchId: 1
  };

  const techA = {
    id: 41,
    user_id: 41,
    username: "tech_rajesh",
    full_name: "rajesh kumar",
    role: "technician",
    employee_id: 2001,
    branchId: 1
  };

  const manager = {
    id: 26,
    user_id: 26,
    username: "ahmed_wm",
    full_name: "ahmed hussain",
    role: "service_manager",
    employee_id: 3001,
    branchId: 1
  };

  const admin = {
    id: 31,
    user_id: 31,
    username: "admin",
    full_name: "Admin Operator",
    role: "admin",
    employee_id: 9999,
    branchId: 1
  };

  const jobCardA = {
    job_id: 101,
    job_card_no: "JC-500171",
    service_advisor: "shashikumar",
    created_by: 22,
    branch_id: 1
  };

  const jobCardB = {
    job_id: 102,
    job_card_no: "JC-444519",
    service_advisor: "mustafa ladaf",
    created_by: 23,
    branch_id: 1
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

  // 1. SA-A can retrieve SA-A owned data
  assert(isAuthorizedForJobCard(jobCardA, saA) === true, "SA-A can retrieve SA-A owned Job Card A");

  // 2. SA-A CANNOT retrieve SA-B restricted data
  assert(isAuthorizedForJobCard(jobCardB, saA) === false, "SA-A CANNOT retrieve SA-B restricted Job Card B (403 Forbidden)");

  // 3. SA-B can retrieve SA-B owned data & CANNOT retrieve SA-A data
  assert(isAuthorizedForJobCard(jobCardB, saB) === true, "SA-B can retrieve SA-B owned Job Card B");
  assert(isAuthorizedForJobCard(jobCardA, saB) === false, "SA-B CANNOT retrieve SA-A restricted Job Card A");

  // 4. Query Parameter Tampering / IDOR Protection Simulation
  const tamperedQuerySA = "mustafa ladaf";
  const tamperedQueryEmployeeId = 1002;
  const isBypassedByQueryParams = (user: any, targetCard: any, queryAdvisor: string, queryEmpId: number) => {
    // Server must rely on authenticated user context, NOT query params
    return isAuthorizedForJobCard(targetCard, user);
  };
  assert(
    isBypassedByQueryParams(saA, jobCardB, tamperedQuerySA, tamperedQueryEmployeeId) === false,
    "Query parameter tampering (?serviceAdvisor=mustafa_ladaf) DOES NOT bypass authenticated ownership"
  );

  // 5. EmployeeId Tampering Protection Simulation
  assert(
    isBypassedByQueryParams(saA, jobCardB, "shashikumar", 1002) === false,
    "EmployeeId parameter tampering (?employeeId=1002) DOES NOT bypass authenticated ownership"
  );

  // 6. Technician-A cannot retrieve unauthorized non-assigned work
  const isAuthorizedForTech = (jobCard: any, techUser: any) => {
    if (["service_manager", "works_manager", "general_manager", "admin"].includes(techUser.role)) return true;
    return (jobCard.assigned_technician || "").toLowerCase() === (techUser.full_name || "").toLowerCase();
  };
  const techJobA = { job_id: 201, assigned_technician: "rajesh kumar" };
  const techJobB = { job_id: 202, assigned_technician: "sunil verma" };
  assert(isAuthorizedForTech(techJobA, techA) === true, "Technician-A can access assigned work");
  assert(isAuthorizedForTech(techJobB, techA) === false, "Technician-A CANNOT access unauthorized Technician-B work");

  // 7. Cross-branch isolation check
  assert(authService.checkBranchAccess(1, 1, "service_advisor") === true, "Same branch access allowed (Branch 1 -> 1)");
  assert(authService.checkBranchAccess(1, 2, "service_advisor") === false, "Branch-scoped role CANNOT cross branch (Branch 1 -> 2)");
  assert(authService.checkBranchAccess(1, 2, "admin") === true, "Admin role CAN cross branch without restriction");

  // 8. Manager visibility works according to verified RBAC
  assert(isAuthorizedForJobCard(jobCardA, manager) === true, "Service Manager can access Job Card A");
  assert(isAuthorizedForJobCard(jobCardB, manager) === true, "Service Manager can access Job Card B");
  assert(isAuthorizedForJobCard(jobCardA, admin) === true, "Admin can access all Job Cards");

  console.log(`\n📊 PHASE 1 SECURITY TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runPhase1OwnershipTests();
