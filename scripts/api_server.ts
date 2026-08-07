import { app } from "../server/app.ts";
import { pool as dbPool } from "../src/db/index.ts";
import { EmployeeIdentityService, RoleService, AuditService } from "../src/core/identity.ts";
import { EmployeeRepository, PermissionRepository, AuditRepository } from "../src/core/repositories.ts";

const auditRepo = new AuditRepository(dbPool);
const employeeRepo = new EmployeeRepository(dbPool);
const permissionRepo = new PermissionRepository(dbPool);

AuditService.init(auditRepo);
EmployeeIdentityService.init(employeeRepo, auditRepo);
RoleService.init(permissionRepo, auditRepo);

app.get("/api/employees", async (req: any, res: any) => {
    const [rows] = await dbPool.query("SELECT * FROM employees");
    res.json(rows);
});

app.get("/api/master/vehicles", async (req: any, res: any) => {
    const [rows] = await dbPool.query("SELECT * FROM vehicle_passports");
    res.json(rows);
});

app.listen(3001, "0.0.0.0", () => {
    console.log("Mock API Server running on port 3001");
});
