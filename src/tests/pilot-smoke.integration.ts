import { pool as db } from "../db/index.ts";

async function runPilotSmokeTests() {
  console.log("=============================================================================");
  console.log("RUNNING PILOT SMOKE TEST SUITE");
  console.log("=============================================================================");

  const testMobile = `98765${Math.floor(10000 + Math.random() * 90000)}`;
  const testEmail = "pilot_test@devanand.com";
  let correlationId = "";
  let custPassportId = 0;

  try {
    // 1. Test Customer Registration (SaaS Multi-Dealer Ready)
    console.log("Test: POST /customer/register");
    const regPayload = {
      fullName: "Shashi Patil",
      mobile: testMobile,
      email: testEmail,
      address: "Pune, Maharashtra, India",
      vehicleRc: "MH-12-AB-9988",
      insurance: "INS-TATA-7788",
      dealerId: "DEALER-DEV-100",
      branchId: "BR-MH-01",
      workshopId: 1
    };

    const regRes = await fetch("http://localhost:3001/api/v1/pilot/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regPayload)
    });

    const regData = await regRes.json();
    if (!regData.success) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }

    correlationId = regData.correlationId;
    custPassportId = regData.customerPassportId;
    console.log(`[OK] Customer registration successful. Correlation ID: ${correlationId}, Customer Passport ID: ${custPassportId}`);

    // 2. Test OTP Verification
    console.log("Test: POST /customer/verify-otp");
    const otpPayload = {
      mobile: testMobile,
      otpCode: "123456",
      email: testEmail
    };

    const otpRes = await fetch("http://localhost:3001/api/v1/pilot/customer/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(otpPayload)
    });

    const otpData = await otpRes.json();
    if (!otpData.success) {
      throw new Error(`OTP Verification failed: ${JSON.stringify(otpData)}`);
    }
    console.log(`[OK] OTP verified successfully: ${otpData.message}`);

    // 3. Test Ownership Approval
    console.log("Test: POST /customer/approve");
    const approvePayload = {
      customerPassportId: custPassportId,
      status: "Verified"
    };

    const appRes = await fetch("http://localhost:3001/api/v1/pilot/customer/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approvePayload)
    });

    const appData = await appRes.json();
    if (!appData.success) {
      throw new Error(`Approval failed: ${JSON.stringify(appData)}`);
    }
    console.log(`[OK] Approval successful: ${appData.message}`);

    // 4. Verify Immutable Audit Logs in Database
    console.log("Test: Database check for EOP audit logs");
    const [auditRows] = await db.execute(
      "SELECT * FROM tbl_workflow_history WHERE correlation_id = ? OR payload LIKE ?",
      [correlationId, `%${testEmail}%`]
    ) as any[];

    if (auditRows.length === 0) {
      throw new Error("EOP audit log was not successfully written to database!");
    }
    console.log(`[OK] Verified ${auditRows.length} audit trail records matching correlation ID / email.`);

    console.log("=============================================================================");
    console.log("PILOT SMOKE TESTS PASSED PERFECTLY!");
    console.log("=============================================================================");
    process.exit(0);
  } catch (err: any) {
    console.error("PILOT SMOKE SUITE FAILED:", err.message);
    throw err;
  }
}

runPilotSmokeTests();
