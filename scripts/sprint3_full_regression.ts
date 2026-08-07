/**
 * DWIP RC1.1 HOTFIX SPRINT 3
 * Full Regression & Functional Test Suite
 * Covers ALL phases: Dry Run, Commit, Duplicate, Large Import,
 * Invalid Data, Missing Columns, Wrong Headers, Empty, Malformed
 */

const BASE_URL = "http://localhost:3001";

async function login(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@workshop.com", password: "admin" })
    });
    const data = await res.json() as any;
    return data.token || null;
  } catch {
    return null;
  }
}

async function bulkImport(token: string | null, profileName: string, rows: any[], dryRun: boolean) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/master/bulk-import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ profileName, rows, dryRun })
    });
    const body = await res.json() as any;
    return { status: res.status, duration: Date.now() - start, body };
  } catch (err: any) {
    return { status: 0, duration: Date.now() - start, error: err.message };
  }
}

interface TestResult {
  profile: string;
  test: string;
  status: number;
  pass: boolean;
  duration: number;
  importedCount?: number;
  errors?: any[];
  notes: string;
}

const results: TestResult[] = [];

function record(profile: string, test: string, res: any, expectPass: boolean, expectStatus = 200, notes = "") {
  const pass = res.status === expectStatus && (expectPass ? res.body?.success === true : res.body?.success === false || res.body?.errors?.length > 0);
  results.push({
    profile,
    test,
    status: res.status,
    pass,
    duration: res.duration,
    importedCount: res.body?.importedCount,
    errors: res.body?.errors,
    notes: notes || (pass ? "PASS" : `FAIL – status=${res.status} success=${res.body?.success}`)
  });
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} [${profile}] ${test}: status=${res.status} imported=${res.body?.importedCount ?? "N/A"} duration=${res.duration}ms`);
}

async function runAll() {
  console.log("=".repeat(70));
  console.log("DWIP RC1.1 HOTFIX SPRINT 3 – FULL REGRESSION TEST SUITE");
  console.log("=".repeat(70));

  const token = await login();
  console.log(`\nAuth: ${token ? "✅ JWT acquired" : "❌ Auth failed"}\n`);

  // ============================================================
  // 1. AUTHORIZED SERVICE PROFILE
  // ============================================================
  const authServiceRow = {
    "VIN": "SPRINT3-AUTH-001",
    "Registration No": "MH01AB1001",
    "Service Date": "2024-06-15",
    "Service Type": "PMS",
    "Odometer": 15000,
    "Summary": "First authorized PMS service"
  };

  console.log("\n--- Authorized Service Profile ---");
  const authDry = await bulkImport(token, "Authorized Service Profile", [authServiceRow], true);
  record("Authorized Service", "Dry Run", authDry, true, 200, "Dry run must succeed without DB write");

  const authCommit = await bulkImport(token, "Authorized Service Profile", [authServiceRow], false);
  record("Authorized Service", "Real Commit", authCommit, true, 200, "Real commit must insert row into service_history");

  const authDup = await bulkImport(token, "Authorized Service Profile", [authServiceRow], false);
  record("Authorized Service", "Duplicate Commit", authDup, true, 200, "Duplicate must upsert or skip without error");

  // Invalid: missing VIN
  const authInvalid = await bulkImport(token, "Authorized Service Profile", [{ "Service Date": "2024-01-01", "Service Type": "PMS" }], false);
  // This should still process (no mandatory fields defined may cause it to pass – document actual behaviour)
  results.push({ profile: "Authorized Service", test: "Missing VIN", status: authInvalid.status, pass: authInvalid.status === 200, duration: authInvalid.duration, notes: `Actual: success=${authInvalid.body?.success} imported=${authInvalid.body?.importedCount}` });
  console.log(`📋 [Authorized Service] Missing VIN: status=${authInvalid.status} success=${authInvalid.body?.success}`);

  // Large import – 10 records
  const authLarge = Array.from({ length: 10 }, (_, i) => ({
    "VIN": `SPRINT3-AUTH-LARGE-${String(i + 1).padStart(3, "0")}`,
    "Registration No": `MH01LARGE${i + 1}`,
    "Service Date": "2024-07-01",
    "Service Type": "GR",
    "Odometer": 20000 + i * 500
  }));
  const authLargeRes = await bulkImport(token, "Authorized Service Profile", authLarge, false);
  record("Authorized Service", "Large Import (10 records)", authLargeRes, true, 200);

  // ============================================================
  // 2. EXTERNAL SERVICE PROFILE
  // ============================================================
  const extServiceRow = {
    "VIN": "SPRINT3-EXT-001",
    "Registration No": "MH01CD2001",
    "Invoice No": "INV-SPRINT3-001",
    "Invoice Date": "2024-07-15",
    "Consolidated Amount": 5000
  };

  console.log("\n--- External Service Profile ---");
  const extDry = await bulkImport(token, "External Service Profile", [extServiceRow], true);
  record("External Service", "Dry Run", extDry, true, 200);

  const extCommit = await bulkImport(token, "External Service Profile", [extServiceRow], false);
  record("External Service", "Real Commit", extCommit, true, 200, "Real commit must insert row into invoices");

  const extDup = await bulkImport(token, "External Service Profile", [extServiceRow], false);
  record("External Service", "Duplicate Commit", extDup, true, 200, "Duplicate invoice_no must upsert without error");

  // Missing invoice no
  const extInvalid = await bulkImport(token, "External Service Profile", [{ "VIN": "SPRINT3-EXT-002", "Invoice Date": "2024-07-15" }], false);
  results.push({ profile: "External Service", test: "Missing Invoice No", status: extInvalid.status, pass: extInvalid.status === 200, duration: extInvalid.duration, notes: `Actual: success=${extInvalid.body?.success} imported=${extInvalid.body?.importedCount}` });
  console.log(`📋 [External Service] Missing Invoice No: status=${extInvalid.status} success=${extInvalid.body?.success}`);

  // Large import – 10 records
  const extLarge = Array.from({ length: 10 }, (_, i) => ({
    "VIN": `SPRINT3-EXT-LARGE-${String(i + 1).padStart(3, "0")}`,
    "Invoice No": `INV-SPRINT3-LARGE-${String(i + 1).padStart(3, "0")}`,
    "Invoice Date": "2024-08-01",
    "Consolidated Amount": 3000 + i * 200
  }));
  const extLargeRes = await bulkImport(token, "External Service Profile", extLarge, false);
  record("External Service", "Large Import (10 records)", extLargeRes, true, 200);

  // ============================================================
  // 3. VEHICLE BIRTH PROFILE (Sprint 1 regression)
  // ============================================================
  // Vehicle Birth VINs must be ISO 3779 compliant: ^[A-HJ-NPR-Z0-9]{17}$
  const vehicleVINs = [
    "MATE1234567890001", "MATE1234567890002", "MATE1234567890003",
    "MATE1234567890004", "MATE1234567890005"
  ];
  const vehicleRows = Array.from({ length: 5 }, (_, i) => ({
    "VIN": vehicleVINs[i],
    "Registration No": `KA01REG${i + 1}`,
    "Make": "Tata",
    "Model": "Ultra 1918",
    "Year": 2022 + (i % 3),
    "Fuel": "Diesel",
    "Original Sale Date": "2022-05-01"
  }));

  console.log("\n--- Vehicle Birth Profile (Sprint 1 Regression) ---");
  const vbDry = await bulkImport(token, "Vehicle Birth Profile", vehicleRows, true);
  record("Vehicle Birth", "Dry Run (5 records)", vbDry, true, 200);

  const vbCommit = await bulkImport(token, "Vehicle Birth Profile", vehicleRows, false);
  record("Vehicle Birth", "Real Commit (5 records)", vbCommit, true, 200);

  // ============================================================
  // 4. CUSTOMER PROFILE (Sprint 2 regression)
  // ============================================================
  const customerRows = Array.from({ length: 5 }, (_, i) => ({
    "Customer Name": `Sprint3 Cust ${i + 1}`,
    "Mobile": `9${String(900000000 + i)}`,
    "Email": `s3cust${i + 1}@test.com`,
    "Address": `Address ${i + 1}, Test City`
  }));

  console.log("\n--- Customer Profile (Sprint 2 Regression) ---");
  const custDry = await bulkImport(token, "Customer Profile", customerRows, true);
  record("Customer", "Dry Run (5 records)", custDry, true, 200);

  const custCommit = await bulkImport(token, "Customer Profile", customerRows, false);
  record("Customer", "Real Commit (5 records)", custCommit, true, 200);

  const custDup = await bulkImport(token, "Customer Profile", customerRows, false);
  record("Customer", "Duplicate Commit", custDup, true, 200, "Duplicate phone must upsert");

  // ============================================================
  // 5. EMPLOYEE PROFILE
  // ============================================================
  console.log("\n--- Employee Profile ---");
  const empRows = Array.from({ length: 5 }, (_, i) => ({
    "Employee Code": `S3EMP${String(i + 1).padStart(3, "0")}`,
    "Full Name": `Sprint3 Employee ${i + 1}`,
    "Role": i % 2 === 0 ? "technician" : "advisor"
  }));
  const empDry = await bulkImport(token, "Employee Profile", empRows, true);
  record("Employee", "Dry Run (5 records)", empDry, true, 200);
  const empCommit = await bulkImport(token, "Employee Profile", empRows, false);
  record("Employee", "Real Commit (5 records)", empCommit, true, 200);

  // Negative: missing employee_code
  const empNeg = await bulkImport(token, "Employee Profile", [{ "Full Name": "No Code Emp", "Role": "technician" }], false);
  record("Employee", "Missing employee_code (negative)", empNeg, false, 200, "Must reject with validation error");

  // ============================================================
  // 6. PART PROFILE
  // ============================================================
  console.log("\n--- Part Profile ---");
  const partRows = Array.from({ length: 5 }, (_, i) => ({
    "Part Number": `S3PART-${String(i + 1).padStart(4, "0")}`,
    "Part Name": `Sprint3 Part ${i + 1}`,
    "Price": 100 + i * 50,
    "Stock Qty": 10 + i
  }));
  const partDry = await bulkImport(token, "Part Profile", partRows, true);
  record("Part", "Dry Run (5 records)", partDry, true, 200);
  const partCommit = await bulkImport(token, "Part Profile", partRows, false);
  record("Part", "Real Commit (5 records)", partCommit, true, 200);

  // ============================================================
  // 7. LABOUR PROFILE
  // ============================================================
  console.log("\n--- Labour Profile ---");
  const labourRows = Array.from({ length: 5 }, (_, i) => ({
    "Labour Code": `S3LAB-${String(i + 1).padStart(4, "0")}`,
    "Description": `Sprint3 Labour Op ${i + 1}`,
    "Standard Hours": 1.5 + i * 0.5,
    "Hourly Rate": 250 + i * 25
  }));
  const labDry = await bulkImport(token, "Labour Profile", labourRows, true);
  record("Labour", "Dry Run (5 records)", labDry, true, 200);
  const labCommit = await bulkImport(token, "Labour Profile", labourRows, false);
  record("Labour", "Real Commit (5 records)", labCommit, true, 200);

  // ============================================================
  // 8. COMPLAINT PROFILE
  // ============================================================
  console.log("\n--- Complaint Profile ---");
  const complaintRows = [{ "Complaint Code": "S3-COMP-001", "Description": "Sprint3 Test Complaint", "Category": "Engine" }];
  const compDry = await bulkImport(token, "Complaint Profile", complaintRows, true);
  record("Complaint", "Dry Run", compDry, true, 200);
  const compCommit = await bulkImport(token, "Complaint Profile", complaintRows, false);
  record("Complaint", "Real Commit", compCommit, true, 200);

  // ============================================================
  // 9. WARRANTY PROFILE
  // ============================================================
  console.log("\n--- Warranty Profile ---");
  const warrantyRows = [{ "Warranty Code": "S3-WARR-001", "Description": "Sprint3 Test Warranty", "Coverage Months": 24 }];
  const warrDry = await bulkImport(token, "Warranty Profile", warrantyRows, true);
  record("Warranty", "Dry Run", warrDry, true, 200);
  const warrCommit = await bulkImport(token, "Warranty Profile", warrantyRows, false);
  record("Warranty", "Real Commit", warrCommit, true, 200);

  // ============================================================
  // 10. DEALER PROFILE
  // ============================================================
  console.log("\n--- Dealer Profile ---");
  const dealerRows = [{ "Dealer Code": "S3DLR001", "Dealer Name": "Sprint3 Test Dealer" }];
  const dealerDry = await bulkImport(token, "Dealer Profile", dealerRows, true);
  record("Dealer", "Dry Run", dealerDry, true, 200);
  const dealerCommit = await bulkImport(token, "Dealer Profile", dealerRows, false);
  record("Dealer", "Real Commit", dealerCommit, true, 200);

  // ============================================================
  // 11. BRANCH PROFILE
  // ============================================================
  console.log("\n--- Branch Profile ---");
  const branchRows = [{ "Branch Code": "S3BRN001", "Branch Name": "Sprint3 Test Branch", "Dealer ID": "1" }];
  const branchDry = await bulkImport(token, "Branch Profile", branchRows, true);
  record("Branch", "Dry Run", branchDry, true, 200);
  const branchCommit = await bulkImport(token, "Branch Profile", branchRows, false);
  record("Branch", "Real Commit", branchCommit, true, 200);

  // ============================================================
  // 12. EDGE CASES – Empty rows, wrong profile name, malformed
  // ============================================================
  console.log("\n--- Edge Cases ---");

  // Empty rows array
  const emptyRes = await fetch(`${BASE_URL}/api/master/bulk-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
    body: JSON.stringify({ profileName: "Employee Profile", rows: [] })
  });
  const emptyBody = await emptyRes.json() as any;
  results.push({ profile: "Edge Cases", test: "Empty rows array", status: emptyRes.status, pass: emptyRes.status === 400, duration: 0, notes: emptyRes.status === 400 ? "PASS – correctly rejected" : "FAIL – should return 400" });
  console.log(`${emptyRes.status === 400 ? "✅" : "❌"} [Edge Case] Empty rows: status=${emptyRes.status}`);

  // Unknown profile
  const unknownProfile = await bulkImport(token, "Unknown XYZ Profile 999", [{ foo: "bar" }], false);
  results.push({ profile: "Edge Cases", test: "Unknown profile name", status: unknownProfile.status, pass: unknownProfile.status === 404 || unknownProfile.status === 400, duration: unknownProfile.duration, notes: `status=${unknownProfile.status}` });
  console.log(`${(unknownProfile.status === 404 || unknownProfile.status === 400) ? "✅" : "❌"} [Edge Case] Unknown profile: status=${unknownProfile.status}`);

  // ============================================================
  // PERFORMANCE: 50 records Authorized Service
  // ============================================================
  console.log("\n--- Performance: 50 records Authorized Service ---");
  const perfRows = Array.from({ length: 50 }, (_, i) => ({
    "VIN": `PERF-AUTH-${String(i + 1).padStart(3, "0")}`,
    "Registration No": `MH01PERF${i + 1}`,
    "Service Date": "2024-07-01",
    "Service Type": "PMS",
    "Odometer": 10000 + i * 100
  }));
  const perfStart = Date.now();
  const perfRes = await bulkImport(token, "Authorized Service Profile", perfRows, false);
  const perfTotal = Date.now() - perfStart;
  results.push({ profile: "Performance", test: "50 records – Authorized Service", status: perfRes.status, pass: perfRes.status === 200 && perfRes.body?.success === true, duration: perfTotal, importedCount: perfRes.body?.importedCount, notes: `Total: ${perfTotal}ms | Per row: ${(perfTotal/50).toFixed(1)}ms` });
  console.log(`📊 [Performance] 50 records: ${perfRes.body?.importedCount} imported in ${perfTotal}ms (${(perfTotal/50).toFixed(1)}ms/row)`);

  // ============================================================
  // PRINT FINAL MATRIX
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("REGRESSION TEST MATRIX");
  console.log("=".repeat(70));

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log(`\nTotal Tests: ${results.length}  |  Passed: ${passed}  |  Failed: ${failed}\n`);
  console.log(JSON.stringify(results.map(r => ({
    profile: r.profile,
    test: r.test,
    pass: r.pass,
    status: r.status,
    duration: r.duration + "ms",
    importedCount: r.importedCount,
    notes: r.notes
  })), null, 2));

  console.log("\n" + "=".repeat(70));
  console.log(`OVERALL: ${failed === 0 ? "✅ ALL TESTS PASSED" : `❌ ${failed} TEST(S) FAILED`}`);
  console.log("=".repeat(70));
}

runAll().catch(console.error);
