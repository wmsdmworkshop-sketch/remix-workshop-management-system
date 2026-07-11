/**
 * =============================================================================
 * WOS Core Architecture: Identity and RBAC Unit Tests
 * Bounded Context: Core System / Identity & RBAC
 * Description: Unit tests validating Repositories, Services, and Dependency Injection.
 * =============================================================================
 */

import {
  EmployeeRepository,
  RoleRepository,
  PermissionRepository,
  AuditRepository
} from "../core/repositories";
import {
  EmployeeIdentityService,
  RoleService,
  AuditService
} from "../core/identity";

// --- Simple Test Framework Setup ---
const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

// --- Mock Database Implementation ---
class MockDb {
  public queries: { sql: string; params: any[] }[] = [];
  public queryResults: any[] = [];
  public executeResults: any[] = [];

  public async query(sql: string, params: any[] = []): Promise<any[]> {
    this.queries.push({ sql, params });
    return [this.queryResults.shift() || []];
  }

  public async execute(sql: string, params: any[] = []): Promise<any[]> {
    this.queries.push({ sql, params });
    if (sql.toLowerCase().includes("create table")) {
      return [{ affectedRows: 0, insertId: 0 }];
    }
    return [this.executeResults.shift() || { affectedRows: 1, insertId: 1 }];
  }
}

// =============================================================================
// REPOSITORY LAYER TESTS
// =============================================================================

test("EmployeeRepository.findAll constructs correct query", async () => {
  const db = new MockDb();
  db.queryResults.push([
    { employee_id: 1, full_name: "John Doe", record_status: "CANONICAL" }
  ]);

  const repo = new EmployeeRepository(db);
  const result = await repo.findAll(false);

  assertEquals(db.queries.length, 1);
  assert(db.queries[0].sql.includes("WHERE record_status = 'CANONICAL' OR record_status IS NULL"));
  assertEquals(result.length, 1);
  assertEquals(result[0].full_name, "John Doe");
});

test("EmployeeRepository.findById constructs correct query", async () => {
  const db = new MockDb();
  db.queryResults.push([
    { employee_id: 12, full_name: "Mustafa" }
  ]);

  const repo = new EmployeeRepository(db);
  const result = await repo.findById(12);

  assertEquals(db.queries.length, 1);
  assertEquals(db.queries[0].sql, "SELECT * FROM employees WHERE employee_id = ?");
  assertEquals(db.queries[0].params[0], 12);
  assert(result !== null);
  assertEquals(result?.full_name, "Mustafa");
});

test("PermissionRepository.findByRoleAndModule constructs correct query", async () => {
  const db = new MockDb();
  db.queryResults.push([
    { permission_id: 1, role_name: "admin", module_name: "User Management", can_view: 1 }
  ]);

  const repo = new PermissionRepository(db);
  const result = await repo.findByRoleAndModule("admin", "User Management");

  assertEquals(db.queries.length, 1);
  assert(db.queries[0].sql.includes("WHERE role_name = ? AND module_name = ?"));
  assertEquals(db.queries[0].params[0], "admin");
  assertEquals(db.queries[0].params[1], "User Management");
  assert(result !== null);
  assertEquals(result?.can_view, 1);
});

test("AuditRepository.insert constructs correct query", async () => {
  const db = new MockDb();
  db.executeResults.push({ affectedRows: 1, insertId: 100 });

  const repo = new AuditRepository(db);
  const logId = await repo.insert({
    user_id: 1,
    username: "admin",
    action: "LOGIN",
    details: "User logged in",
    correlation_id: "CORR-123"
  });

  assertEquals(db.queries.length, 2); // Includes ensureTableExists + insert
  assertEquals(logId, 100);
});

// =============================================================================
// SERVICE LAYER TESTS (WITH INJECTED REPOSITORIES)
// =============================================================================

class MockEmployeeRepo implements IEmployeeRepository {
  public findByIdCalls: number[] = [];
  public findAllCalls = 0;

  public async findAll(includeLegacy: boolean): Promise<any[]> {
    this.findAllCalls++;
    return [{ employee_id: 1, full_name: "Mock Canonical" }];
  }

  public async findById(id: number): Promise<any | null> {
    this.findByIdCalls.push(id);
    return { employee_id: id, full_name: "Mocked Service Emp" };
  }

  public async findByCode(code: string): Promise<any | null> {
    return null;
  }

  public async update(id: number, data: any): Promise<boolean> {
    return true;
  }

  public async create(data: any): Promise<number> {
    return 1;
  }
}

class MockAuditRepo implements IAuditRepository {
  public logs: any[] = [];

  public async insert(log: any): Promise<number> {
    this.logs.push(log);
    return this.logs.length;
  }

  public async findLogs(limit: number): Promise<any[]> {
    return this.logs;
  }
}

test("EmployeeIdentityService.getEmployees delegates to repository", async () => {
  const mockEmpRepo = new MockEmployeeRepo();
  const mockAuditRepo = new MockAuditRepo();
  const service = new EmployeeIdentityService(mockEmpRepo, mockAuditRepo);

  const emps = await service.getEmployees(false);
  assertEquals(mockEmpRepo.findAllCalls, 1);
  assertEquals(emps.length, 1);
  assertEquals(emps[0].full_name, "Mock Canonical");
});

test("RoleService.hasPermission evaluates rules correctly", async () => {
  const mockPermRepo: IPermissionRepository = {
    async findByRole(role: string) { return []; },
    async findByRoleAndModule(role: string, module: string) {
      if (role === "admin" && module === "Dashboard") {
        return { role_name: "admin", module_name: "Dashboard", can_view: 1, can_edit: 0, can_comment: 0 };
      }
      return null;
    },
    async update(id: number, data: any) { return true; },
    async create(data: any) { return 1; }
  };
  const mockAuditRepo = new MockAuditRepo();
  const roleService = new RoleService(mockPermRepo, mockAuditRepo);

  const viewAllowed = await roleService.hasPermission("admin", "Dashboard", "view");
  const editAllowed = await roleService.hasPermission("admin", "Dashboard", "edit");
  const otherAllowed = await roleService.hasPermission("mechanic", "Dashboard", "view");

  assertEquals(viewAllowed, true);
  assertEquals(editAllowed, false);
  assertEquals(otherAllowed, false);
});

test("AuditService logs events through AuditRepository", async () => {
  const mockAuditRepo = new MockAuditRepo();
  const auditService = new AuditService(mockAuditRepo);

  await auditService.logAction(42, "mustafa", "ROLE_CHANGE", "Advisor -> Assistant");

  assertEquals(mockAuditRepo.logs.length, 1);
  assertEquals(mockAuditRepo.logs[0].user_id, 42);
  assertEquals(mockAuditRepo.logs[0].username, "mustafa");
  assertEquals(mockAuditRepo.logs[0].action, "ROLE_CHANGE");
});

// --- Run All Tests ---
async function runTests() {
  console.log("=============================================================");
  console.log("STARTING CR-001.5 IDENTITY & RBAC ARCHITECTURE UNIT TESTS");
  console.log("=============================================================");

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`[PASS] ${t.name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${t.name}`);
      console.error(`       Error: ${err.message}`);
      failed++;
    }
  }

  console.log("=============================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

// Check if run directly
if (process.argv[1] && process.argv[1].includes("identity-architecture.test.ts")) {
  runTests();
}

export { runTests };
