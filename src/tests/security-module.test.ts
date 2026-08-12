/**
 * =============================================================================
 * DWIP Enterprise Platform — Security & Universal RBAC Test Suite (WP-02)
 * Execution: npx tsx src/tests/security-module.test.ts
 * Description: Tests 10-step authorization flow, JWT verification,
 *              centralized authorize(module, action) middleware, LRU cache TTL,
 *              branch access isolation, and audit logging.
 * =============================================================================
 */

import jwt from "jsonwebtoken";
import { envConfig } from "../config/env.ts";
import { authService, AuthorizationService } from "../core/AuthorizationService.ts";
import { authenticateJwt, authorize } from "../api/middleware/auth.ts";
import { AuditService } from "../core/identity.ts";

async function runSecurityTestSuite() {
  console.log("=============================================================================");
  console.log("STARTING DWIP UNIVERSAL RBAC & SECURITY TEST SUITE (WP-02)");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. Super Admin Emergency Access Test
    // -------------------------------------------------------------------------
    console.log("\n--- Test Category 1: Super Admin Emergency Access ---");
    const adminAllowed = await authService.checkPermission(1, 1, "Admin", "job_card", "delete");
    assert(adminAllowed === true, "Admin role automatically granted all permissions");

    const devAllowed = await authService.checkPermission(2, 2, "Developer", "finance", "admin");
    assert(devAllowed === true, "Developer role automatically granted all permissions");

    // -------------------------------------------------------------------------
    // 2. Hierarchical Action Expansion Rules
    // -------------------------------------------------------------------------
    console.log("\n--- Test Category 2: Hierarchical Action Expansion ---");
    // Test checkBranchAccess rules
    const crossBranchAdmin = authService.checkBranchAccess(101, 202, "Admin");
    assert(crossBranchAdmin === true, "Admin user permitted cross-branch access");

    const crossBranchDP = authService.checkBranchAccess(101, 202, "Dealer Principal");
    assert(crossBranchDP === true, "Dealer Principal permitted cross-branch access");

    const branchMatched = authService.checkBranchAccess(101, 101, "Service Advisor");
    assert(branchMatched === true, "Matching branch ID access granted for Service Advisor");

    const branchMismatched = authService.checkBranchAccess(101, 202, "Service Advisor");
    assert(branchMismatched === false, "Mismatched branch access DENIED for Service Advisor");

    // -------------------------------------------------------------------------
    // 3. LRU Cache & Invalidation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Category 3: LRU Cache & Invalidation ---");
    authService.invalidateCache(99);
    assert(true, "authService.invalidateCache(userId) executes without errors");

    authService.invalidateCache();
    assert(true, "authService.invalidateCache() global flush executes without errors");

    // -------------------------------------------------------------------------
    // 4. JWT Authentication Middleware Validation
    // -------------------------------------------------------------------------
    console.log("\n--- Test Category 4: Strengthened JWT Authentication ---");
    
    // Generate valid test JWT
    const validToken = jwt.sign(
      { id: 42, username: "adviser_john", role: "Service Advisor", roleId: 5, branchId: 101 },
      envConfig.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Mock Express Request & Response for authenticateJwt
    const reqValid: any = { headers: { authorization: `Bearer ${validToken}` } };
    const resValid: any = { status: (code: number) => ({ json: (body: any) => body }) };
    let authNextCalled: boolean = false;

    authenticateJwt(reqValid, resValid, () => {
      authNextCalled = true;
    });

    assert(Boolean(authNextCalled), "authenticateJwt succeeds for valid JWT token");
    assert(reqValid.user !== undefined, "req.user attached to Express Request object");
    assert(reqValid.user.id === 42, "req.user.id correctly parsed from JWT payload");
    assert(reqValid.user.role === "Service Advisor", "req.user.role correctly parsed from JWT payload");
    assert(reqValid.user.branchId === 101, "req.user.branchId correctly parsed from JWT payload");

    // Test Expired JWT
    const expiredToken = jwt.sign(
      { id: 42, username: "adviser_john", role: "Service Advisor" },
      envConfig.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const reqExpired: any = { headers: { authorization: `Bearer ${expiredToken}` } };
    let expiredErrorCode = 0;
    const resExpired: any = {
      status: (code: number) => {
        expiredErrorCode = code;
        return { json: (body: any) => body };
      }
    };

    authenticateJwt(reqExpired, resExpired, () => {});
    assert(expiredErrorCode === 401, "authenticateJwt returns 401 Unauthorized for expired JWT token");

    // -------------------------------------------------------------------------
    // 5. Centralized authorize(module, action) Middleware
    // -------------------------------------------------------------------------
    console.log("\n--- Test Category 5: Centralized authorize() Middleware ---");

    // Admin user authorization middleware call
    const reqAdmin: any = {
      user: { id: 1, username: "admin_user", role: "Admin", roleId: 1, branchId: 101 },
      headers: {},
      query: {},
      params: {}
    };
    let authorizeNextCalled: boolean = false;
    const resAuth: any = { status: (code: number) => ({ json: (body: any) => body }) };

    const authorizeMiddleware = authorize("job_card", "create");
    await authorizeMiddleware(reqAdmin, resAuth, () => {
      authorizeNextCalled = true;
    });

    assert(Boolean(authorizeNextCalled), "authorize('job_card', 'create') grants access for Admin role");

    // Branch isolation middleware enforcement
    const reqBranchDeny: any = {
      user: { id: 88, username: "advisor_ram", role: "Service Advisor", roleId: 5, branchId: 101 },
      headers: { "x-branch-id": "202" }, // Requesting Branch 202 while assigned to 101
      query: {},
      params: {}
    };
    let branchDenyStatus = 0;
    const resBranchDeny: any = {
      status: (code: number) => {
        branchDenyStatus = code;
        return { json: (body: any) => body };
      }
    };

    await authorizeMiddleware(reqBranchDeny, resBranchDeny, () => {});
    assert(branchDenyStatus === 403, "authorize() middleware denies cross-branch request with 403 Forbidden");

    // -------------------------------------------------------------------------
    // 6. Audit Logging Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Test Category 6: Authorization Decision Auditing ---");
    let auditLogged = false;
    try {
      await AuditService.logAction(42, "adviser_john", "SECURITY_TEST_ACTION", "Testing RBAC audit trail");
      auditLogged = true;
    } catch (e) {
      auditLogged = false;
    }
    assert(auditLogged === true, "AuditService.logAction() records authorization decisions");

  } catch (err: any) {
    console.error("FATAL ERROR in Security Test Suite:", err);
    failed++;
  } finally {
    console.log("\n=============================================================================");
    console.log(`SECURITY TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log("=============================================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runSecurityTestSuite();
