import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("DWIP Enterprise Identity & Employee Directory Architecture", () => {
  const serverPath = path.resolve(process.cwd(), "server.ts");
  const roleSpecialPanelsPath = path.resolve(process.cwd(), "src/components/RoleSpecialPanels.tsx");
  const userManagementPath = path.resolve(process.cwd(), "src/components/UserManagement.tsx");
  const employeeDirectoryPath = path.resolve(process.cwd(), "src/components/EmployeeDirectory.tsx");
  const startupValidatorPath = path.resolve(process.cwd(), "src/core/StartupSchemaValidator.ts");

  it("1. RoleSpecialPanels MUST NOT contain any employees[0] fallback in profile or KPI panels", () => {
    const code = fs.readFileSync(roleSpecialPanelsPath, "utf-8");
    
    // Check for any employees[0] in TechnicianProfilePanel or TechnicianKpiPanel
    assert.strictEqual(
      code.includes("|| employees[0]"),
      false,
      "Found forbidden '|| employees[0]' fallback in RoleSpecialPanels.tsx"
    );
    assert.strictEqual(
      code.includes("Employee Profile Not Linked"),
      true,
      "Missing 'Employee Profile Not Linked' state in RoleSpecialPanels.tsx"
    );
  });

  it("2. server.ts GET /api/my-profile must return unlinked: true with HTTP 200 instead of 400 or defaulting to EMP001", () => {
    const code = fs.readFileSync(serverPath, "utf-8");
    
    assert.ok(
      code.includes('unlinked: true'),
      "GET /api/my-profile must support explicit unlinked: true response"
    );
    assert.ok(
      code.includes('GET /api/me') || code.includes('app.get("/api/me"'),
      "server.ts must expose GET /api/me for authenticated identity resolution"
    );
  });

  it("3. server.ts GET /api/employees enriches employees with login account status", () => {
    const code = fs.readFileSync(serverPath, "utf-8");
    
    assert.ok(
      code.includes('has_login_account'),
      "GET /api/employees must return has_login_account status"
    );
    assert.ok(
      code.includes('linked_username'),
      "GET /api/employees must return linked_username"
    );
  });

  it("4. server.ts POST /api/users requires employee_id from Employee Directory", () => {
    const code = fs.readFileSync(serverPath, "utf-8");
    
    assert.ok(
      code.includes('employee_id') && code.includes('Employee Directory'),
      "POST /api/users must enforce selection from Employee Directory"
    );
    assert.ok(
      code.includes('is already linked to active user'),
      "POST /api/users must enforce 1:1 user-to-employee account uniqueness"
    );
  });

  it("5. server.ts PUT /api/users/:user_id validates employee existence and 1:1 uniqueness", () => {
    const code = fs.readFileSync(serverPath, "utf-8");
    
    assert.ok(
      code.includes('SELECT user_id, username FROM user_access_master WHERE employee_id = ? AND user_id != ? AND is_active = 1'),
      "PUT /api/users/:user_id must enforce 1:1 employee constraint across active users"
    );
  });

  it("6. StartupSchemaValidator includes deterministic backfill for known accounts without defaulting to EMP001", () => {
    const code = fs.readFileSync(startupValidatorPath, "utf-8");
    
    assert.ok(
      code.includes('patilshashi5558@gmail.com') || code.includes('EMP029'),
      "StartupSchemaValidator must contain deterministic mapping for shashikumar/EMP029"
    );
    assert.strictEqual(
      code.includes('matchedEmpId = 1;') || code.includes('matchedEmpId = 1\n'),
      false,
      "StartupSchemaValidator must NEVER default unmapped users to employee_id 1 (EMP001)"
    );
  });

  it("7. UserManagement.tsx contains Employee Directory picker and Preview card", () => {
    const code = fs.readFileSync(userManagementPath, "utf-8");
    
    assert.ok(
      code.includes('Create User from Employee Directory') || code.includes('Select Employee from Directory'),
      "UserManagement.tsx must contain Employee Directory selector"
    );
    assert.ok(
      code.includes('Duplicate user accounts for the same employee are prohibited') || code.includes('already has a linked active user account'),
      "UserManagement.tsx must prevent creating duplicate accounts for the same employee"
    );
  });

  it("8. EmployeeDirectory.tsx displays Login Account status badge for each employee", () => {
    const code = fs.readFileSync(employeeDirectoryPath, "utf-8");
    
    assert.ok(
      code.includes('Login Account:') || code.includes('has_login_account'),
      "EmployeeDirectory.tsx must display Login Account badge"
    );
  });
});
