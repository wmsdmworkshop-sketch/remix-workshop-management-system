/**
 * =============================================================================
 * DWIP Enterprise Platform — Feature P1-003 Automated Unit Test Suite
 * Feature: Centralized Field-Level Role-Based Access Control (Field RBAC) Engine
 * =============================================================================
 */

import { evaluateFieldPermission, evaluateAllFieldPermissions } from '../services/fieldRbacEngine';

function runP1003Tests() {
  console.log("🧪 Running Feature P1-003 Enterprise Field RBAC Engine Unit Tests...\n");

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

  // Test 1: System Job Card Number is strictly LOCKED for ALL roles in ALL stages
  const eval1 = evaluateFieldPermission('developer', 'Draft', 'system_job_card_no');
  const eval2 = evaluateFieldPermission('service_advisor', 'Work In Progress', 'job_card_no');
  assert(eval1.isLocked && eval2.isLocked, "System JC Number is strictly LOCKED for ALL roles in ALL stages");

  // Test 2: Odometer editable in Draft status for Service Advisor, locked post-submission
  const odoDraft = evaluateFieldPermission('service_advisor', 'Draft', 'odometer');
  const odoWip = evaluateFieldPermission('service_advisor', 'Work In Progress', 'odometer');
  assert(odoDraft.canEdit && odoWip.isLocked, "Odometer editable in Draft status, locked post-submission for Service Advisor");

  // Test 3: GM / Developer role receives OVERRIDE permission on locked post-submission fields
  const odoGm = evaluateFieldPermission('gm', 'Work In Progress', 'odometer');
  const odoDev = evaluateFieldPermission('developer', 'Completed', 'odometer');
  assert(odoGm.canOverride && odoDev.canOverride, "GM / Developer role receives OVERRIDE permission post-submission");

  // Test 4: Approval-sensitive fields require approval post-submission for operational roles
  const warrantyAdvisor = evaluateFieldPermission('service_advisor', 'Work In Progress', 'warranty_type');
  const warrantyManager = evaluateFieldPermission('warranty_manager', 'Work In Progress', 'warranty_type');
  assert(warrantyAdvisor.requiresApproval && warrantyManager.canEdit, "Warranty Type requires approval post-submission for Service Advisor, editable for Warranty Manager");

  // Test 5: Field matrix evaluation returns full permissions dictionary
  const fields = ['system_job_card_no', 'odometer', 'warranty_type', 'goodwill', 'customer_complaint'];
  const matrix = evaluateAllFieldPermissions('service_advisor', 'Work In Progress', fields);
  assert(Object.keys(matrix).length === 5 && matrix['system_job_card_no'].isLocked && matrix['goodwill'].requiresApproval, "Field permission matrix evaluates dictionary correctly");

  console.log(`\n📊 P1-003 TEST RESULTS: ${passedCount} / ${totalCount} PASSED.`);
  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

runP1003Tests();
