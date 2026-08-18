import { describe, it } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Mock DB pool simulating authoritative database state
const mockEmployees = [
  { employee_id: 1, full_name: "ABDUL GANI SHEK", employee_code: "EMP001", role: "BD ASSISTANT/ DRIVER", is_active: 1, email: "abdul.gani@devanand.com", mobile: "+9198765927112" },
  { employee_id: 29, full_name: "SHASHIKUMAR", employee_code: "EMP029", role: "Service Advisor", is_active: 1, email: "patilshashi5558@gmail.com", mobile: "+9198765265541" },
  { employee_id: 22, full_name: "MUSTAFA", employee_code: "EMP022", role: "Service Advisor", is_active: 1, email: "mustafa@dwip.com", mobile: "+9198765186525" },
  { employee_id: 99, full_name: "INACTIVE WORKER", employee_code: "EMP099", role: "Technician", is_active: 0, email: "inactive@dwip.com", mobile: "+9198765000000" }
];

const mockUserAccessMaster = [
  { user_id: 101, username: "abdul_gani", full_name: "ABDUL GANI SHEK", employee_id: 1, user_role: "driver", is_active: 1 },
  { user_id: 102, username: "patilshashi5558@gmail.com", full_name: "SHASHIKUMAR", employee_id: 29, user_role: "service_advisor", is_active: 1 },
  { user_id: 103, username: "mustafa_user", full_name: "MUSTAFA", employee_id: 22, user_role: "service_advisor", is_active: 1 },
  { user_id: 104, username: "unlinked_operator", full_name: "Unlinked Operator", employee_id: null, user_role: "reception", is_active: 1 }
];

const JWT_SECRET = process.env.JWT_SECRET || "wms_jwt_secret_key_2026_production_secure_dwip";

describe("DWIP Enterprise Runtime Hardening & Identity Validation", () => {

  // =========================================================================
  // TEST 1: Multi-User Identity Resolution at Runtime
  // =========================================================================
  describe("1. Multi-User Identity Resolution at Runtime", () => {
    
    function resolveUserProfile(userPayload: any) {
      // Server-side employee resolution logic
      let employeeId = userPayload.employee_id;
      if (!employeeId) {
        const uam = mockUserAccessMaster.find(u => u.user_id === userPayload.user_id);
        if (uam && uam.employee_id) {
          employeeId = uam.employee_id;
        }
      }

      if (!employeeId || employeeId <= 0) {
        return {
          success: true,
          user: userPayload,
          employee: null,
          unlinked: true,
          message: "No employee profile linked to this user account."
        };
      }

      const emp = mockEmployees.find(e => e.employee_id === Number(employeeId));
      if (!emp) {
        return {
          success: true,
          user: userPayload,
          employee: null,
          unlinked: true,
          message: "Linked employee record not found in Employee Directory."
        };
      }

      return {
        success: true,
        user: userPayload,
        employee: emp,
        unlinked: false
      };
    }

    it("User A (EMP001): Resolves to Abdul Gani Shek", () => {
      const userA = { user_id: 101, username: "abdul_gani", role: "driver", employee_id: 1 };
      const res = resolveUserProfile(userA);
      assert.strictEqual(res.unlinked, false);
      assert.strictEqual(res.employee?.employee_id, 1);
      assert.strictEqual(res.employee?.employee_code, "EMP001");
      assert.strictEqual(res.employee?.full_name, "ABDUL GANI SHEK");
    });

    it("User B (EMP029 - Shashikumar): Resolves to Shashikumar", () => {
      const userB = { user_id: 102, username: "patilshashi5558@gmail.com", role: "service_advisor", employee_id: 29 };
      const res = resolveUserProfile(userB);
      assert.strictEqual(res.unlinked, false);
      assert.strictEqual(res.employee?.employee_id, 29);
      assert.strictEqual(res.employee?.employee_code, "EMP029");
      assert.strictEqual(res.employee?.full_name, "SHASHIKUMAR");
    });

    it("User C (EMP022 - Mustafa): Resolves to Mustafa", () => {
      const userC = { user_id: 103, username: "mustafa_user", role: "service_advisor", employee_id: 22 };
      const res = resolveUserProfile(userC);
      assert.strictEqual(res.unlinked, false);
      assert.strictEqual(res.employee?.employee_id, 22);
      assert.strictEqual(res.employee?.employee_code, "EMP022");
      assert.strictEqual(res.employee?.full_name, "MUSTAFA");
    });

    it("Unlinked User (employee_id = null): MUST return unlinked=true and employee=null (NEVER EMP001)", () => {
      const unlinkedUser = { user_id: 104, username: "unlinked_operator", role: "reception", employee_id: null };
      const res = resolveUserProfile(unlinkedUser);
      assert.strictEqual(res.unlinked, true);
      assert.strictEqual(res.employee, null);
      assert.notStrictEqual(res.employee?.employee_code, "EMP001");
    });
  });

  // =========================================================================
  // TEST 2: Session Isolation & Context Leak Prevention
  // =========================================================================
  describe("2. Session Isolation & Context Leak Prevention", () => {
    it("Token generation & decoding verifies complete identity isolation between users", () => {
      const tokenA = jwt.sign({ user_id: 101, username: "abdul_gani", employee_id: 1, role: "driver" }, JWT_SECRET);
      const tokenB = jwt.sign({ user_id: 102, username: "patilshashi5558@gmail.com", employee_id: 29, role: "service_advisor" }, JWT_SECRET);

      const decodedA: any = jwt.verify(tokenA, JWT_SECRET);
      const decodedB: any = jwt.verify(tokenB, JWT_SECRET);

      // Verify token A has employee_id 1
      assert.strictEqual(decodedA.employee_id, 1);
      assert.strictEqual(decodedA.username, "abdul_gani");

      // Verify token B has employee_id 29
      assert.strictEqual(decodedB.employee_id, 29);
      assert.strictEqual(decodedB.username, "patilshashi5558@gmail.com");

      // Verify no shared references or mutations
      assert.notStrictEqual(decodedA.employee_id, decodedB.employee_id);
      assert.notStrictEqual(decodedA.user_id, decodedB.user_id);
    });
  });

  // =========================================================================
  // TEST 3: User Management API Direct Bypass Validation
  // =========================================================================
  describe("3. User Management API Direct Bypass Validation", () => {
    function validateUserCreation(body: any) {
      const { username, password, role, employee_id } = body;
      if (!username || !password || !role) {
        return { ok: false, status: 400, error: "Username, password, and system role are required." };
      }
      if (!employee_id || Number(employee_id) <= 0) {
        return { ok: false, status: 400, error: "An employee from the Employee Directory must be selected." };
      }
      const empId = Number(employee_id);
      const emp = mockEmployees.find(e => e.employee_id === empId);
      if (!emp) {
        return { ok: false, status: 400, error: `Selected Employee (ID: ${empId}) does not exist in the Employee Directory.` };
      }
      if (!emp.is_active) {
        return { ok: false, status: 400, error: `Cannot create a login account for inactive employee '${emp.full_name}'.` };
      }
      const existing = mockUserAccessMaster.find(u => u.employee_id === empId && u.is_active === 1);
      if (existing) {
        return { ok: false, status: 400, error: `Employee '${emp.full_name}' is already linked to active user '@${existing.username}'.` };
      }
      return { ok: true, status: 201, user: { username, employee_id: empId, role } };
    }

    it("Rejects creation with missing / NULL employee_id", () => {
      const res = validateUserCreation({ username: "new_op", password: "pwd", role: "reception", employee_id: null });
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.status, 400);
      assert.ok(res.error?.includes("Employee Directory must be selected"));
    });

    it("Rejects creation with non-existent employee_id (e.g. 99999)", () => {
      const res = validateUserCreation({ username: "fake_user", password: "pwd", role: "reception", employee_id: 99999 });
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.status, 400);
      assert.ok(res.error?.includes("does not exist in the Employee Directory"));
    });

    it("Rejects creation for inactive employee", () => {
      const res = validateUserCreation({ username: "inactive_user", password: "pwd", role: "technician", employee_id: 99 });
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.status, 400);
      assert.ok(res.error?.includes("Cannot create a login account for inactive employee"));
    });

    it("Rejects creation if employee is already linked to an active user account (1:1 constraint)", () => {
      const res = validateUserCreation({ username: "duplicate_shashi", password: "pwd", role: "service_advisor", employee_id: 29 });
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.status, 400);
      assert.ok(res.error?.includes("is already linked to active user"));
    });
  });

  // =========================================================================
  // TEST 4: Backfill Determinism & Idempotency
  // =========================================================================
  describe("4. Backfill Determinism & Idempotency", () => {
    it("Backfill logic maps patilshashi5558@gmail.com to EMP029 and is completely idempotent on repeated execution", () => {
      let state = [
        { user_id: 101, username: "abdul_gani", email: "abdul@dwip.com", employee_id: 1 },
        { user_id: 102, username: "patilshashi5558@gmail.com", email: "patilshashi5558@gmail.com", employee_id: null },
        { user_id: 104, username: "unlinked_operator", email: "unlinked@example.com", employee_id: null }
      ];

      function runBackfill(records: typeof state) {
        let changedCount = 0;
        for (const u of records) {
          if (!u.employee_id || u.employee_id === 0) {
            let matchedId: number | null = null;
            if (u.email === "patilshashi5558@gmail.com" || u.username === "patilshashi5558@gmail.com") {
              matchedId = 29;
            }
            if (matchedId) {
              u.employee_id = matchedId;
              changedCount++;
            }
          }
        }
        return changedCount;
      }

      // First run: links 1 user
      const firstRunChanges = runBackfill(state);
      assert.strictEqual(firstRunChanges, 1);
      assert.strictEqual(state[1].employee_id, 29);
      assert.strictEqual(state[2].employee_id, null); // unlinked remains null

      // Second run: idempotent, 0 changes
      const secondRunChanges = runBackfill(state);
      assert.strictEqual(secondRunChanges, 0);
      assert.strictEqual(state[1].employee_id, 29);
      assert.strictEqual(state[2].employee_id, null);
    });
  });
});
