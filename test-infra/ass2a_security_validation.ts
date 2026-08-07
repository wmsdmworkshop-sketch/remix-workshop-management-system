import { authService, PermissionAction } from "../src/core/AuthorizationService.ts";
import { pool } from "../src/db/index.ts";

const results: any[] = [];

function assert(condition: boolean, testName: string, evidence: string) {
  if (condition) {
    results.push({ test: testName, status: 'PASS', evidence });
    console.log(`[PASS] ${testName}`);
  } else {
    results.push({ test: testName, status: 'FAIL', evidence });
    console.log(`[FAIL] ${testName} - ${evidence}`);
  }
}

// Mock the DB Pool
pool.getConnection = async () => {
  return {
    query: async (sql: string, params: any[]) => {
      // Mock user_delegations
      if (sql.includes("user_delegations")) {
        // user 102 delegated to user 105 for module 'Inventory'
        if (params[0] === 105 && params[1] === "Inventory") {
          return [[{ delegator_id: 102 }]];
        }
        return [[]];
      }
      
      // Mock user role fetch for delegator
      if (sql.includes("SELECT r.role_name FROM users u JOIN roles r")) {
        if (params[0] === 102) {
          return [[{ role_name: "Inventory Manager" }]];
        }
        return [[]];
      }
      
      // Mock user_overrides
      if (sql.includes("user_overrides")) {
        // user 201 has explicit override REVOKE 'can_edit' on 'Workshop'
        if (params[0] === 201 && params[1] === "can_edit" && params[2] === "Workshop") {
          return [[{ is_allowed: 0 }]];
        }
        // user 202 has explicit override GRANT 'can_approve' on 'Finance'
        if (params[0] === 202 && params[1] === "can_approve" && params[2] === "Finance") {
          return [[{ is_allowed: 1 }]];
        }
        return [[]];
      }

      // Mock role_permissions
      if (sql.includes("role_permissions")) {
        // role "Service Advisor" on "Workshop"
        if (params[0] === "Service Advisor" && params[1] === "Workshop") {
          return [[{ can_view: 1, can_create: 1, can_edit: 1, can_delete: 0, can_approve: 0 }]];
        }
        // role "Inventory Manager" on "Inventory"
        if (params[0] === "Inventory Manager" && params[1] === "Inventory") {
          return [[{ can_view: 1, can_create: 1, can_edit: 1, can_delete: 1, can_approve: 1 }]];
        }
        // role "Technician" on "Workshop"
        if (params[0] === "Technician" && params[1] === "Workshop") {
          return [[{ can_view: 1, can_create: 0, can_edit: 0, can_delete: 0 }]];
        }
        return [[]];
      }
      return [[]];
    },
    release: () => {}
  } as any;
};

async function runValidation() {
  console.log("Starting Enterprise Security Validation (Phase 3.5)...");
  
  // 1. Deny-by-default
  authService.invalidateCache();
  let perm = await authService.checkPermission(999, 99, "Unknown Role", "SecretModule", "view");
  assert(perm === false, "Deny-by-default", "Unknown role and module correctly denied access.");

  // 2. Super Admin Check
  authService.invalidateCache();
  perm = await authService.checkPermission(1, 1, "Developer", "SecretModule", "delete");
  assert(perm === true, "Super Admin Check", "Developer role bypasses all checks and grants 'delete' on 'SecretModule'.");

  // 3. Role Resolution
  authService.invalidateCache();
  perm = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
  assert(perm === true, "Role Resolution (Grant)", "Service Advisor role correctly granted 'create' on 'Workshop'.");
  
  perm = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "approve");
  assert(perm === false, "Role Resolution (Deny)", "Service Advisor role correctly denied 'approve' on 'Workshop'.");

  // 4. Hierarchical Expansion
  authService.invalidateCache();
  // Service Advisor has can_edit=1, can_create=1. By hierarchy, edit/create implies view.
  // Wait, let's test a role that ONLY has can_edit, but asks for view.
  // We'll mock the DB to return can_edit=1, can_view=0 (even though not typical).
  const origQuery = pool.getConnection;
  pool.getConnection = async () => ({
    query: async (sql, params) => {
      if (sql.includes("role_permissions")) return [[{ can_edit: 1, can_view: 0 }]];
      if (sql.includes("user_delegations") || sql.includes("user_overrides")) return [[]];
      return [[]];
    },
    release: () => {}
  } as any);
  perm = await authService.checkPermission(900, 9, "Custom Role", "TestModule", "view");
  assert(perm === true, "Hierarchical Expansion", "Role with only 'can_edit' implicitly granted 'view' via hierarchical expansion algorithm.");
  pool.getConnection = origQuery; // restore original mock

  // 5. Delegation
  authService.invalidateCache();
  // user 105 asks for 'edit' on 'Inventory' (they have role Technician, so normally denied).
  // But user 102 (Inventory Manager) delegated to user 105.
  perm = await authService.checkPermission(105, 3, "Technician", "Inventory", "edit");
  assert(perm === true, "Delegation", "User 105 (Technician) granted 'edit' on 'Inventory' via active delegation from User 102 (Inventory Manager).");

  // 6. User Overrides (Revoke)
  authService.invalidateCache();
  // user 201 is Service Advisor, asks for 'edit' on 'Workshop'. Normally true. 
  // But has an override revoking 'edit'.
  perm = await authService.checkPermission(201, 2, "Service Advisor", "Workshop", "edit");
  assert(perm === false, "User Override (Revoke)", "User 201 (Service Advisor) explicitly revoked 'edit' on 'Workshop' via user_overrides override.");

  // 7. User Overrides (Grant)
  authService.invalidateCache();
  // user 202 is Technician, asks for 'approve' on 'Finance'. Normally false.
  // But has an override granting 'approve'.
  perm = await authService.checkPermission(202, 3, "Technician", "Finance", "approve");
  assert(perm === true, "User Override (Grant)", "User 202 (Technician) explicitly granted 'approve' on 'Finance' via user_overrides override.");

  // 8. Cache Performance Validation
  authService.invalidateCache();
  await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
  // The next call should be cached. We can assert this by mocking the DB to throw an error.
  // If it doesn't throw, it was cached.
  const badQueryMock = async () => ({
    query: async () => { throw new Error("Should not hit DB"); },
    release: () => {}
  } as any);
  pool.getConnection = badQueryMock;
  try {
    perm = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    assert(perm === true, "Performance Cache Validation", "Second identical permission check successfully resolved from in-memory cache without hitting DB.");
  } catch (e) {
    assert(false, "Performance Cache Validation", "Hit database despite cache.");
  }

  // 9. Cache Invalidation
  pool.getConnection = origQuery; // restore original mock
  authService.invalidateCache(101); // Invalidate cache for user 101
  pool.getConnection = badQueryMock;
  try {
    perm = await authService.checkPermission(101, 2, "Service Advisor", "Workshop", "create");
    assert(false, "Cache Invalidation", "Hit cache after it was supposed to be invalidated.");
  } catch (e) {
    assert(true, "Cache Invalidation", "Cache correctly invalidated for user 101, forcing DB query.");
  }
  pool.getConnection = origQuery; // restore original mock

  const fs = require('fs');
  fs.writeFileSync('scratch/ass2a_validation_results.json', JSON.stringify(results, null, 2));
  console.log("Validation complete! Results written to scratch/ass2a_validation_results.json");
}

runValidation();
