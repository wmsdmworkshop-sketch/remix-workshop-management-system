# Security Specification for Workshop Management System Firestore Rules

## 1. Data Invariants

1.  **Identity Protection**: No user or client can spoof their ID (`created_by`, `employee_id`, etc.) or assign arbitrary privileges/roles.
2.  **Referential Integrity**: An assigned job map, revenue record, or log cannot exist without a reference to a valid `job_id`.
3.  **Temporal Integrity**: Timestamps like `created_at` or `updated_at` must use the server's request time rather than untrusted client-provided values.
4.  **State Integrity (Status Rules)**: Job card state flow can only move sequentially; terminal states like "Invoiced" cannot be uncompleted or updated.
5.  **PII Restriction**: Users can only read public employee directory profiles; private financial properties like `basic_salary` are locked.

---

## 2. The "Dirty Dozen" Malicious Payloads

We simulate 12 unauthorized payloads designed to attack authentication, data integrity, and state transitions.

### Payload 1: Spoofing Job Creator ID (Identity Spoofing)
An attacker attempts to write a new JobCard setting `created_by` to someone else's employee ID.
```json
{
  "job_id": 999,
  "job_card_no": "JC999",
  "vrn": "MH-12-XX-9999",
  "customer_name": "Fake Cust",
  "customer_mobile": "+919999999999",
  "vehicle_make": "TATA MOTORS",
  "vehicle_model": "Fake Model",
  "vehicle_year": 2022,
  "km_reading": 100,
  "sr_type_id": 1,
  "job_description": "Attempting to spoof created_by",
  "priority": "Normal",
  "status": "Queue",
  "etd": "2026-06-27T10:00:00Z",
  "created_by": 100,
  "created_at": "2026-06-27T10:00:00Z"
}
```
*Expected Result: PERMISSION_DENIED (Must match request.auth.uid or service advisor profile)*

### Payload 2: Overriding CreatedAt Timestamp with Client Clock
An attacker attempts to set an arbitrary past or future `created_at` time.
```json
{
  "job_id": 999,
  "job_card_no": "JC999",
  "vrn": "MH-12-XX-9999",
  "customer_name": "Fake Cust",
  "customer_mobile": "+919999999999",
  "vehicle_make": "TATA MOTORS",
  "vehicle_model": "Fake Model",
  "vehicle_year": 2022,
  "km_reading": 100,
  "sr_type_id": 1,
  "job_description": "Attempting to manipulate created_at",
  "priority": "Normal",
  "status": "Queue",
  "etd": "2026-06-27T10:00:00Z",
  "created_by": 1,
  "created_at": "2000-01-01T00:00:00Z"
}
```
*Expected Result: PERMISSION_DENIED (Must equal request.time)*

### Payload 3: Direct Salary Access by Non-Manager (PII Leak)
An unauthenticated or non-manager user attempts to query an employee's salary directly.
```json
// Path: /employees/1
// Operation: GET
```
*Expected Result: PERMISSION_DENIED (Strictly restricted field or private read access only)*

### Payload 4: Arbitrary Self-Promotion of Employee grade
An employee tries to update their own `employee_grade` from "Junior" to "Senior".
```json
{
  "employee_grade": "Senior"
}
```
*Expected Result: PERMISSION_DENIED (Only Manager/Admin role can modify fields)*

### Payload 5: Job Card Status Bypass (Skipping queue status directly to Invoiced)
An attacker attempts to write a brand new JobCard with the terminal state `Invoiced` without going through the queue or work phases.
```json
{
  "job_id": 999,
  "job_card_no": "JC999",
  "vrn": "MH-12-XX-9999",
  "customer_name": "Fake Cust",
  "customer_mobile": "+919999999999",
  "vehicle_make": "TATA MOTORS",
  "vehicle_model": "Fake Model",
  "vehicle_year": 2022,
  "km_reading": 100,
  "sr_type_id": 1,
  "job_description": "Status bypass",
  "priority": "Normal",
  "status": "Invoiced",
  "etd": "2026-06-27T10:00:00Z",
  "created_by": 1,
  "created_at": "request.time"
}
```
*Expected Result: PERMISSION_DENIED (Initial status must be Queue)*

### Payload 6: Modifying Closed/Invoiced Job Card (Terminal State Bypass)
An advisor attempts to edit the description or KM reading on a job card that has already reached the terminal `Invoiced` status.
```json
{
  "job_description": "Malicious modification on completed card"
}
```
*Expected Result: PERMISSION_DENIED (Terminal state is locked)*

### Payload 7: Self-Assigning Technicians to Jobs
A technician attempts to write a custom technician map assigning themselves as a primary technician on a high-paying job.
```json
{
  "map_id": 55,
  "job_id": 1,
  "employee_id": 5,
  "tech_role": "Tech"
}
```
*Expected Result: PERMISSION_DENIED (Only service advisor or supervisor can write maps)*

### Payload 8: Altering Revenue Split Figures Directly (Financial Fraud)
A technician attempts to edit a `jobRevenue` record directly to change their incentive amounts.
```json
{
  "labour_amount": 90000,
  "parts_amount": 1000,
  "total_amount": 91000,
  "split_id": 1
}
```
*Expected Result: PERMISSION_DENIED (Only verified supervisors or backend automation can write revenues)*

### Payload 9: Self-Approving Carry Forward Request
A service advisor attempts to self-approve a carry forward request log.
```json
{
  "cf_status": "Approved",
  "approved_by": 1
}
```
*Expected Result: PERMISSION_DENIED (Requires Supervisor auth or explicit manager role)*

### Payload 10: Injecting Giant SQL/Script String into ID Fields (Value Poisoning)
An attacker tries to create a JobCard with a `job_id` containing SQL injection code or a giant 1MB string to exploit resource parsing.
```json
{
  "job_id": "999 UNION SELECT * FROM users;"
}
```
*Expected Result: PERMISSION_DENIED (IDs must match numeric and size limits)*

### Payload 11: Non-Authenticated Read Query (No Blanket Read)
An unauthenticated guest client attempts to list all vehicle registration numbers (VRNs) in active jobs.
```json
// Path: /jobCards
// Operation: LIST
```
*Expected Result: PERMISSION_DENIED (Must be authenticated and verified)*

### Payload 12: Bypassing Rework Approval Log Flow
A junior mechanic attempts to log a reworked job and approve it immediately.
```json
{
  "rework_id": 44,
  "original_job_id": 1,
  "rework_reason": "Redo paint",
  "original_tech_id": 3,
  "raised_by": 3,
  "rework_status": "Approved"
}
```
*Expected Result: PERMISSION_DENIED (Creating rework log must default status to Pending)*

---

## 3. The Test Runner Script

To automate testing, we create `firestore.rules.test.ts` using the Firebase rules-unit-testing package.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("Firestore Rules Verification", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "giga-course-dp497",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: "localhost",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test("Should deny identity spoofing", async () => {
    const context = testEnv.authenticatedContext("user_id_1");
    const db = context.firestore();
    const maliciousDoc = doc(db, "jobCards", "JC999");
    await assertFails(
      setDoc(maliciousDoc, {
        job_id: 999,
        created_by: 100, // Spoofed creator ID
        created_at: new Date().toISOString()
      })
    );
  });
});
```
