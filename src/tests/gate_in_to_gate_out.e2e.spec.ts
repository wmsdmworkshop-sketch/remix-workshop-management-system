/**
 * Gate-In -> Gate-Out, driven by ONE super user.
 *
 * ── Why one account ─────────────────────────────────────────────────────────
 * Every stage of this journey is role-gated: gate-in is JOB_CARD_CREATE_ROLES,
 * QC is the QC inspector set, billing is `authorize("billing","edit")`, the gate
 * pass is GATE_PASS_ISSUE_ROLES, and the exit is GATE_OUT_SECURITY_ROLES. A
 * suite that switched accounts at each stage would be exercising the RBAC table,
 * not the workflow.
 *
 * `AuthorizationService.checkPermission` short-circuits `admin` and `developer`
 * before any role lookup, and every one of those route lists names "admin". So a
 * single admin-role account can legitimately walk the entire journey, which is
 * what this suite does. Role separation is covered separately by
 * `smoke_rbac_all_roles_e2e.spec.ts` — this suite exists to prove the WORKFLOW
 * reaches gate-out intact.
 *
 * ── The account ─────────────────────────────────────────────────────────────
 * `sbx_admin`, seeded by `test-infra/seed_test_superuser.ts`. It is not created
 * here: seeding a login is a provisioning step, not an assertion.
 *
 * ── Isolation ───────────────────────────────────────────────────────────────
 * This suite WRITES: it creates a job card and drives it to gate-out. It
 * therefore refuses to run unless NODE_ENV=test, and it re-asserts at run time
 * that the server it is talking to is backed by `wms_test` — not the production
 * schema.
 *
 * ── Verified extent (2026-09-14) ────────────────────────────────────────────
 * Drives one vehicle through the whole journey as a single admin account and
 * asserts the persisted state at every stage:
 *   auth -> gate-in -> floor visibility -> technician allocation -> SA estimate
 *   -> floor QC handoff -> QC acknowledge -> QC PASS -> SA acknowledge
 *   -> PRE_INVOICE_READY -> billing chain -> BILLING_COMPLETED -> payment
 *   -> gate pass -> gate-out
 *
 *   npm run db:setup:test                                        # once
 *   npx dotenv -e .env.test -- npx tsx test-infra/seed_test_superuser.ts
 *   $env:NODE_ENV='test'; $env:PORT='3001'; npx tsx server.ts     # separate terminal
 *   npm run test:e2e -- src/tests/gate_in_to_gate_out.e2e.spec.ts
 */
import { test, expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import mysql from "mysql2/promise";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001";

const SUPERUSER_USERNAME = process.env.E2E_SUPERUSER_USERNAME || "sbx_admin";
const SUPERUSER_PASSWORD = process.env.E2E_SUPERUSER_PASSWORD || "sbx_super_pw";

/**
 * Fail closed. `npm run test:e2e` loads `.env.test`, so NODE_ENV is `test` for a
 * legitimate run. Without it this suite would be creating real job cards in the
 * live workshop, so refuse rather than guess.
 */
const IS_TEST_ENV = process.env.NODE_ENV === "test";

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
};

/** A plate unique to this run, so the duplicate-gate-entry guard never blocks a re-run. */
function freshVrn(): string {
  const n = String(Date.now()).slice(-6);
  return `KA01TN${n}`;
}

async function connectTestDb(): Promise<mysql.Connection> {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows]: any = await conn.query("SELECT DATABASE() AS d");
  if (rows[0]?.d !== "wms_test") {
    await conn.end();
    throw new Error(
      `Refusing to run: connected to '${rows[0]?.d}', expected 'wms_test'. This suite writes data.`
    );
  }
  return conn;
}

test.describe("Gate-In to Gate-Out — single super user", () => {
  test.skip(!IS_TEST_ENV, "Refusing to run: NODE_ENV is not 'test' (this suite writes a job card).");

  let api: APIRequestContext;
  let token = "";
  let vrn = "";
  let jobId = 0;
  let jobCardNo = "";
  let preInvoiceId = 0;
  let superuserId = 0;

  /** Thin wrapper: attaches the bearer token and returns status + parsed body. */
  async function call(method: "get" | "post" | "put", path: string, data?: any) {
    const res = await api[method](path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      data,
    });
    let body: any = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status(), body };
  }

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: BASE_URL, timeout: 30000 });

    // Prove the server is the isolated one before we write anything to it.
    const health = await api.get("/api/health");
    expect(
      health.status(),
      `No server on ${BASE_URL}. Start it with: $env:NODE_ENV='test'; $env:PORT='3001'; npx tsx server.ts`
    ).toBeLessThan(400);

    const login = await api.post("/api/auth/login", {
      data: { username: SUPERUSER_USERNAME, password: SUPERUSER_PASSWORD },
    });
    const body: any = await login.json().catch(() => null);
    expect(
      login.status(),
      `Login as '${SUPERUSER_USERNAME}' failed. Seed it with: npx dotenv -e .env.test -- npx tsx test-infra/seed_test_superuser.ts`
    ).toBe(200);
    expect(body?.user?.role, "The super user must carry the admin role").toBe("admin");
    token = body.token;
    superuserId = Number(body.user.user_id);
    vrn = freshVrn();
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  // One journey, not nine independent tests.
  //
  // As nine separate `test()` blocks each stage depended on `jobId` and
  // `preInvoiceId` set by an earlier one. Playwright does not guarantee that
  // different tests in a file share a worker, and when they did not, stages 7-9
  // sent an empty jobId and the server correctly answered 400 "Missing required
  // payment fields" / "Missing jobId" — a state-plumbing failure masquerading as
  // a workflow failure. `test.step` keeps the whole journey in one test, so the
  // shared state is genuine and a late failure cannot be misread as a stage bug.
  test("a vehicle travels gate-in to gate-out under one super user", async () => {
    await test.step("1. the super user authenticates and carries admin", async () => {
    const me = await call("get", "/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body?.user?.username).toBe(SUPERUSER_USERNAME);
    expect(me.body?.user?.role).toBe("admin");
  });

    await test.step("2. GATE-IN — a vehicle enters the workshop", async () => {
    const res = await call("post", "/api/job-cards", {
      vrn,
      customer_name: "E2E Superuser Customer",
      customer_mobile: "9000000001",
      driver_name: "E2E Driver",
      driver_mobile: "9000000002",
      vehicle_make: "Tata",
      vehicle_model: "LPT 1613",
      vehicle_year: 2024,
      km_reading: 41000,
      odometer_reading: 41000,
      job_description: "Gate-in to gate-out E2E",
      priority: "Normal",
      service_type: "General Repair",
    });

    expect([200, 201], `Gate-in failed: ${JSON.stringify(res.body)}`).toContain(res.status);
    const jc = res.body?.jobCard ?? res.body;
    jobId = Number(jc?.job_id ?? jc?.jobId ?? 0);
    jobCardNo = String(jc?.job_card_no ?? "");
    expect(jobId, "Gate-in must return a job id").toBeGreaterThan(0);

    // It must be a real persisted row, not just a response body.
    const conn = await connectTestDb();
    const [rows]: any = await conn.query(
      "SELECT job_card_no, vehicle_reg, job_status FROM job_card_master WHERE job_card_id = ?", [jobId]);
    await conn.end();
    expect(rows.length, "Gate-in must persist a job_card_master row").toBe(1);
    expect(rows[0].vehicle_reg).toBe(vrn);
  });

    await test.step("3. the vehicle is visible on the workshop floor", async () => {
    const res = await call("get", "/api/job-cards");
    expect(res.status).toBe(200);
    const list = res.body?.jobCards ?? [];
    const mine = list.find((j: any) => Number(j.job_id) === jobId);
    expect(mine, "The new job card must appear in the job-card list").toBeTruthy();
  });

    await test.step("4. ALLOCATION — technician assigned, work started", async () => {
    // A technician must exist to allocate to; the sandbox ships two.
    const conn = await connectTestDb();
    const [techs]: any = await conn.query(
      "SELECT employee_id FROM employees WHERE role = 'Technician' AND is_active = 1 ORDER BY employee_id LIMIT 1");
    await conn.end();
    expect(techs.length, "The sandbox must have an active Technician").toBeGreaterThan(0);

    const assign = await call("post", `/api/job-cards/${jobId}/assign`, {
      allocations: [{ employee_id: techs[0].employee_id, tech_role: "TECHNICIAN" }],
    });
    expect(assign.status, `Assign failed: ${JSON.stringify(assign.body)}`).toBe(200);

    const startedBy = techs[0].employee_id;
    const start = await call("post", `/api/job-cards/${jobId}/start-repair`, { started_by: startedBy });
    expect(start.status, `Start repair failed: ${JSON.stringify(start.body)}`).toBe(200);
    expect(start.body?.success).toBe(true);

    // The SA estimate. `checkPhase8Readiness` blocks compile with
    // P8_NO_SERVICE_ITEMS unless `job_card_master.estimated_amount` is non-zero,
    // and that column is folded from labor_price + parts_price on master upsert.
    // Without this the billing stage fails on a missing estimate, not on billing.
    const estimate = await call("put", `/api/job-cards/${jobId}`, {
      labor_price: 4000,
      labour_amount: 4000,
      parts_price: 0,
      parts_amount: 0,
    });
    expect(estimate.status, `Estimate update failed: ${JSON.stringify(estimate.body)}`).toBeLessThan(400);

    // The labour line item. `billingValidate` runs BV_LABOUR_PRESENT against
    // `job_card_service_item` and independently recomputes the grand total from
    // it, so an estimate alone is not enough: without a line item the recomputed
    // total is 0 and CRM capture is refused with BV_COMMERCIAL_TAMPERING even
    // though the stored total is correct.
    //
    // In the running app these rows come from the SA/technician service flow.
    // That flow is not exercised here, so the row is written directly as a
    // fixture — deliberately labour-only and equal to the estimate above, so the
    // engine's recomputation and the estimate cannot disagree.
    const itemConn = await connectTestDb();
    await itemConn.query(
      `INSERT INTO job_card_service_item (job_card_id, job_card_no, service_code, service_desc, labour_amount, created_by)
       VALUES (?, ?, 'GEN-REPAIR', 'General repair labour (E2E)', 4000.00, ?)`,
      [jobId, jobCardNo, superuserId]);
    await itemConn.end();
  });

    await test.step("5. QC — handoff, acknowledge, then the SA signs it off", async () => {
    // Ordering matters and is enforced by the engines, not by the UI:
    //   floor hands the vehicle over  -> tbl_qc_handoff PENDING_QC
    //   QC inspector acknowledges     -> live_status QC_IN_PROGRESS
    //   QC decision PASS              -> live_status QC_PASSED   (blocked otherwise)
    //   SA acknowledges               -> live_status PRE_INVOICE_READY
    // Calling the decision first fails with
    // "QC_PASS_BLOCKED: Job is in state 'null'. Must be QC_IN_PROGRESS."
    // `jobCardId` here must be the job card NUMBER ("JC-…"), not the numeric
    // primary key. qc-execution-engine joins `job_card_master.job_card_no =
    // tbl_qc_handoff.job_card_id`, so handing over the numeric id writes a
    // handoff row that no later step can find — the acknowledgement then fails
    // with "QC_INVALID_TRANSITION: ... no open QC handoff."
    const handoff = await call("post", "/api/floor-execution/qc-handoff", {
      jobCardId: jobCardNo,
      vrn,
      qcInchargeId: "QC-01",
    });
    expect(handoff.status, `Floor QC handoff failed: ${JSON.stringify(handoff.body)}`).toBe(200);

    const ack = await call("post", `/api/qc/acknowledge/${jobId}`);
    expect(ack.status, `QC acknowledgement failed: ${JSON.stringify(ack.body)}`).toBe(200);

    const res = await call("post", `/api/qc/decision/${jobId}`, {
      decision: "PASS",
      checklist: [],
      roadTestKm: 0,
      notes: "Gate-in to gate-out E2E",
    });
    expect(res.status, `QC decision failed: ${JSON.stringify(res.body)}`).toBe(200);

    // A QC pass lands the job in QC_PASSED and opens SLA_QC_TO_SA. It only becomes
    // PRE_INVOICE_READY once the Service Advisor acknowledges — nothing in the UI
    // called this until recently, and billing is unreachable without it.
    const saAck = await call("post", `/api/qc/sa-acknowledge/${jobId}`);
    expect(saAck.status, `SA acknowledgement failed: ${JSON.stringify(saAck.body)}`).toBe(200);

    const conn = await connectTestDb();
    const [rows]: any = await conn.query(
      "SELECT live_status FROM job_card_master WHERE job_card_id = ?", [jobId]);
    await conn.end();
    expect(rows[0]?.live_status, "The job must reach PRE_INVOICE_READY").toBe("PRE_INVOICE_READY");
  });

    // Steps 6-9 continue the SAME test on purpose — they need `jobId` and
    // `preInvoiceId` from above, and separate test() blocks do not reliably share
    // a worker.
    //
    // Getting here required clearing four readiness gates, each of which only
    // revealed the next:
    //   1. P8_NOT_READY        — the legacy /api/job-cards/:id/qc-check sets only
    //                            in-memory `status`; the gate reads
    //                            job_card_master.live_status. Fixed by driving the
    //                            QC engine (handoff -> acknowledge -> decision ->
    //                            SA acknowledge).
    //   2. P8_NO_SERVICE_ITEMS — needs estimated_amount. Fixed by the SA estimate PUT.
    //   3. BV_LABOUR_PRESENT   — needs a job_card_service_item row; the engine also
    //                            recomputes the grand total from it and refuses on
    //                            mismatch (BV_COMMERCIAL_TAMPERING), so the line
    //                            item and the estimate must agree.
    //   4. P8_PARTS_PENDING    — reported "2 parts requests" for every job
    //                            regardless of job card. That turned out NOT to be
    //                            a code bug: a fresh process binds the job number
    //                            and counts 0. It came from the long-lived server
    //                            whose pool had been through repeated
    //                            connect-ETIMEDOUT / OFFLINE churn. Hardened anyway
    //                            in billing-engine.ts (CAST(? AS CHAR)) because
    //                            `varchar_col = 0` matches EVERY non-numeric row —
    //                            one bad bind would block billing workshop-wide.
    await test.step("6. BILLING — the pre-invoice is compiled and walked to BILLING_COMPLETED", async () => {
    const compile = await call("post", `/api/billing/pre-invoice/compile/${jobId}`, { requestedDiscount: 0 });
    expect(compile.status, `Compile failed: ${JSON.stringify(compile.body)}`).toBe(200);
    preInvoiceId = Number(
      compile.body?.data?.preInvoiceId ?? compile.body?.data?.pre_invoice_id ?? 0);
    expect(preInvoiceId, "Compile must return a pre-invoice id").toBeGreaterThan(0);

    const steps: Array<[string, string, any]> = [
      ["review", `/api/billing/pre-invoice/review/${preInvoiceId}`, undefined],
      ["send-to-customer", `/api/billing/pre-invoice/send-to-customer/${preInvoiceId}`, undefined],
    ];
    for (const [label, path, data] of steps) {
      const r = await call("post", path, data);
      expect(r.status, `Billing step '${label}' failed: ${JSON.stringify(r.body)}`).toBe(200);
    }

    // Customer confirmation has to match the compiled grand total to the paisa.
    const conn = await connectTestDb();
    const [pi]: any = await conn.query(
      `SELECT piv.grand_total FROM tbl_pre_invoice pi
         JOIN tbl_pre_invoice_version piv
           ON piv.pre_invoice_id = pi.pre_invoice_id AND piv.version = pi.current_version
        WHERE pi.pre_invoice_id = ?`, [preInvoiceId]);
    await conn.end();
    const grandTotal = parseFloat(pi[0].grand_total);

    // `confirmation_type` is an ENUM — an unlisted value is rejected by MySQL as
    // "Data truncated for column 'confirmation_type'", which surfaces as a 500
    // rather than a validation error.
    const confirm = await call("post", `/api/billing/pre-invoice/capture-confirmation/${preInvoiceId}`, {
      confirmation_type: "VERBAL_SA_RECORDED",
      confirmed_by_name: "E2E Superuser Customer",
      confirmed_by_contact: "9000000001",
      grand_total_confirmed: grandTotal,
      remarks: "Confirmed in gate-in to gate-out E2E",
    });
    expect(confirm.status, `Capture confirmation failed: ${JSON.stringify(confirm.body)}`).toBe(200);

    for (const [label, path] of [
      ["handoff", `/api/billing/handoff/${preInvoiceId}`],
      ["acknowledge", `/api/billing/acknowledge/${preInvoiceId}`],
    ] as Array<[string, string]>) {
      const r = await call("post", path);
      expect(r.status, `Billing step '${label}' failed: ${JSON.stringify(r.body)}`).toBe(200);
    }

    const validate = await call("post", `/api/billing/validate/${preInvoiceId}`);
    expect(validate.status, `Validate failed: ${JSON.stringify(validate.body)}`).toBe(200);

    // CRM capture requires an ACTIVE evidence record — a genuine precondition of
    // the engine, so it is arranged here rather than bypassed. `evidence_id` is a
    // varchar primary key with no default, so it must be supplied explicitly.
    const evidenceId = `EV-E2E-${Date.now()}`;
    const evConn = await connectTestDb();
    await evConn.query(
      `INSERT INTO tbl_evidence (evidence_id, entity_type, entity_id, evidence_type, lifecycle_status, created_at)
       VALUES (?, 'JobCard', ?, 'INVOICE_PDF', 'ACTIVE', NOW())`,
      [evidenceId, jobId]);
    await evConn.end();

    const crm = await call("post", `/api/billing/crm-invoice/${preInvoiceId}`, {
      human_confirmed: true,
      crm_invoice_number: `E2E-${jobId}`,
      // Required: tbl_crm_billing_evidence.crm_invoice_date is NOT NULL and the
      // engine binds it directly.
      crm_invoice_date: new Date().toISOString().slice(0, 10),
      invoice_pdf_evidence_id: evidenceId,
      crm_invoice_amount: grandTotal,
      variance_acknowledged: true,
    });
    expect(crm.status, `CRM invoice capture failed: ${JSON.stringify(crm.body)}`).toBe(200);

    // The whole point of the billing chain: the job reaches BILLING_COMPLETED.
    const check = await connectTestDb();
    const [status]: any = await check.query(
      "SELECT status FROM tbl_pre_invoice WHERE pre_invoice_id = ?", [preInvoiceId]);
    await check.end();
    expect(status[0]?.status, "Pre-invoice must reach BILLING_COMPLETED").toBe("BILLING_COMPLETED");
  });

    await test.step("7. PAYMENT — the cashier records a completed payment", async () => {
    const res = await call("post", "/api/gate-out/record-payment", {
      jobId,
      amount: 1,
      paymentMode: "CASH",
    });
    // A duplicate on re-run is a legitimate 409, not a failure of the workflow.
    expect([201, 409], `Record payment failed: ${JSON.stringify(res.body)}`).toContain(res.status);
    if (res.status === 409) expect(res.body?.error).toBe("PAYMENT_ALREADY_RECORDED");
  });

    await test.step("8. GATE PASS — issued against the completed billing", async () => {
    const res = await call("post", "/api/gate-out/create-gate-pass", {
      jobId,
      paymentMode: "CASH",
      amount: 1,
    });
    expect(res.status, `Create gate pass failed: ${JSON.stringify(res.body)}`).toBe(201);
    expect(res.body?.gatePassId, "Gate pass must return an id").toBeTruthy();
    expect(res.body?.vrn).toBe(vrn);
    (globalThis as any).__gatePassId = res.body.gatePassId;
  });

    await test.step("9. GATE-OUT — the vehicle leaves and the job closes", async () => {
    const gatePassId = (globalThis as any).__gatePassId;
    expect(gatePassId, "Stage 8 must have issued a gate pass").toBeTruthy();

    // Security must register a rear-plate capture before the pass may be used —
    // gate-out refuses with REAR_EVIDENCE_REQUIRED otherwise.
    const evidence = await call("post", "/api/gate-out/evidence", {
      jobId,
      gatePassId,
      type: "REAR_PLATE",
      imageUrl: "e2e://rear-plate.jpg",
    });
    expect(evidence.status, `Rear-plate evidence failed: ${JSON.stringify(evidence.body)}`).toBe(201);
    const evidenceId = evidence.body?.evidenceId;
    expect(evidenceId, "Evidence capture must return an id").toBeTruthy();

    const res = await call("post", "/api/gate-out/gate-out", {
      gatePassId,
      expectedVrn: vrn,
      detectedVrn: vrn,
      evidenceId,
      captureSource: "MANUAL_CAMERA",
    });
    expect(res.status, `Gate-out failed: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body?.gateOutId).toBeTruthy();

    // The journey is only complete if the persisted records agree.
    // Assert on expected_vrn / detected_vrn: `tbl_gate_out` ALSO carries a legacy
    // `vrn` column from an earlier schema lineage that recordGateOut() never
    // populates, so asserting on `vrn` would fail on a correct gate-out.
    const conn = await connectTestDb();
    const [go]: any = await conn.query(
      "SELECT gate_out_id, expected_vrn, detected_vrn, evidence_id, verification_result FROM tbl_gate_out WHERE gate_pass_id = ?", [gatePassId]);
    const [pass]: any = await conn.query(
      "SELECT status FROM tbl_gate_pass WHERE gate_pass_id = ?", [gatePassId]);
    await conn.end();

    expect(go.length, "A gate-out row must be recorded").toBe(1);
    expect(go[0].detected_vrn, "The vehicle that left must be the one that entered").toBe(vrn);
    expect(go[0].expected_vrn, "The expected plate must match the gate pass").toBe(vrn);
    expect(go[0].evidence_id, "The rear-plate capture must be linked to the exit").toBe(evidenceId);
    expect(go[0].verification_result).toBe("VERIFIED");
    // The pass's terminal status after a successful gate-out is 'VERIFIED'
    // (recordGateOut: UPDATE tbl_gate_pass SET status = 'VERIFIED'). It is not
    // renamed to USED/CLOSED, so assert the value the code really writes.
    expect(pass[0]?.status, "The pass must be consumed by the gate-out").toBe("VERIFIED");
    });
  });
});
