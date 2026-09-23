import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("HR employees route extraction (server.ts -> hr.routes.ts)", () => {
  const serverPath = path.resolve(process.cwd(), "server.ts");
  const hrRoutesPath = path.resolve(process.cwd(), "src/api/routes/hr.routes.ts");

  it("1. server.ts must NOT define an inline unauthenticated GET /api/employees handler", () => {
    const code = fs.readFileSync(serverPath, "utf-8");
    assert.strictEqual(
      code.includes('app.get("/api/employees", async (req, res) => {'),
      false,
      "Found the old unauthenticated inline GET /api/employees handler still in server.ts — it must be deleted, not just shadowed"
    );
  });

  it("2. server.ts must mount hrRouter at /api/employees's parent path", () => {
    const code = fs.readFileSync(serverPath, "utf-8");
    assert.ok(
      /import\s*\{\s*hrRouter\s*\}\s*from\s*["']\.\/src\/api\/routes\/hr\.routes\.ts["']/.test(code),
      "server.ts must import hrRouter from src/api/routes/hr.routes.ts"
    );
    assert.ok(
      code.includes('app.use("/api", hrRouter)') || code.includes("app.use('/api', hrRouter)"),
      "server.ts must mount hrRouter at /api (hr.routes.ts defines the /employees sub-path itself)"
    );
  });

  it("3a. hr.routes.ts must run authenticateJwt so req.user has id/roleId (matches billing.routes.ts's documented fix for the same bug)", () => {
    const code = fs.readFileSync(hrRoutesPath, "utf-8");
    assert.ok(
      /import\s*\{[^}]*\bauthenticateJwt\b[^}]*\}\s*from\s*["']\.\.\/middleware\/auth\.ts["']/.test(code),
      "hr.routes.ts must import authenticateJwt from ../middleware/auth.ts"
    );
    assert.ok(
      code.includes("hrRouter.use(authenticateJwt)"),
      "hr.routes.ts must run hrRouter.use(authenticateJwt) — without it, authorize() runs on the global gate's req.user, " +
      "which has no id/roleId, making AuthorizationService.checkPermission cache a single shared '_undefined_' key for every " +
      "user (can both wrongly grant and wrongly deny). See src/api/routes/billing.routes.ts's own comment documenting this exact bug."
    );
  });

  it("3b. GET /employees must NOT be restricted to the user_management module — App.tsx's fetchAllData calls this endpoint for every logged-in staff role, and a narrow module 403s most of them", () => {
    const code = fs.readFileSync(hrRoutesPath, "utf-8");
    assert.strictEqual(
      code.includes('authorize("user_management"'),
      false,
      "GET /employees must not gate behind authorize(\"user_management\", ...) — that restricts the app-wide employee " +
      "load (src/App.tsx fetchAllData, used by ~16 role workspaces) to only admin/service_manager/workshop_manager/" +
      "dealer_principal/developer, a real regression versus the endpoint's actual prior audience (any authenticated staff " +
      "member, enforced only by the global authenticateToken gate in server.ts). Field-level redaction for sensitive " +
      "columns (basic_salary etc.) for non-manager roles is a separate, deliberate product decision, not bundled here."
    );
  });

  it("4. hr.routes.ts GET /employees must preserve the login-account merge the inline handler had", () => {
    const code = fs.readFileSync(hrRoutesPath, "utf-8");
    assert.ok(code.includes("user_access_master"), "Missing the user_access_master join that supplies has_login_account");
    assert.ok(code.includes("has_login_account"), "Missing has_login_account field in the response mapping");
    assert.ok(code.includes("linked_username"), "Missing linked_username field in the response mapping");
    assert.ok(code.includes("target_revenue"), "Missing target_revenue fallback (basic_salary * 3)");
  });

  it("5. hr.routes.ts GET /employees must return a bare array, not a {success, data} envelope, to match existing frontend callers", () => {
    const code = fs.readFileSync(hrRoutesPath, "utf-8");
    const handlerMatch = code.match(/hrRouter\.get\(\s*["']\/employees["'][\s\S]*?\n\);/);
    assert.ok(handlerMatch, "Could not locate the GET /employees handler in hr.routes.ts");
    assert.ok(
      !/success:\s*true[\s\S]*?data:\s*employees/.test(handlerMatch![0]),
      "GET /employees must not wrap the response in {success, data} — existing frontend code (EmployeeDirectory.tsx, UserManagement.tsx) expects a bare array"
    );
  });
});
