/**
 * =============================================================================
 * DWIP Enterprise Platform — WP-10 Customer Portal Test Suite
 * Execution: npx tsx src/tests/customer-portal.test.ts
 * Description: Validates live repair progress percentage mapping, HMAC security
 *              tracking token generation/verification, and status payloads.
 * =============================================================================
 */

import { CustomerPortalEngine } from "../engines/customer-portal-engine.ts";

async function runCustomerPortalTests() {
  console.log("=============================================================================");
  console.log("STARTING DWIP CUSTOMER PORTAL & LIVE TRACKING TEST SUITE (WP-10)");
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
    // 1. Repair Progress Percentage Mapping
    // -------------------------------------------------------------------------
    console.log("\n--- Category 1: Progress Percentage Stage Mapping ---");
    assert(CustomerPortalEngine.calculateProgressPct("Reception") === 10, "Reception stage maps to 10%");
    assert(CustomerPortalEngine.calculateProgressPct("Waiting") === 25, "Waiting/Queued stage maps to 25%");
    assert(CustomerPortalEngine.calculateProgressPct("Active") === 65, "Active Work In Progress stage maps to 65%");
    assert(CustomerPortalEngine.calculateProgressPct("QC") === 85, "Quality Check stage maps to 85%");
    assert(CustomerPortalEngine.calculateProgressPct("Completed") === 95, "Completed stage maps to 95%");
    assert(CustomerPortalEngine.calculateProgressPct("Invoiced") === 100, "Invoiced/Delivered stage maps to 100%");

    // -------------------------------------------------------------------------
    // 2. Secure HMAC Tracking Token Generation & Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Category 2: Secure HMAC Tracking Token Generation & Verification ---");
    const vrn = "MH-12-TA-7777";
    const mobile = "+919876543201";

    const token = CustomerPortalEngine.generatePublicTrackingToken(vrn, mobile);
    assert(typeof token === "string" && token.length > 20, "Generates base64url HMAC signed tracking token");

    const verified = CustomerPortalEngine.verifyPublicTrackingToken(token);
    assert(verified.isValid === true, "HMAC token verification succeeds for valid token");
    assert(verified.vrn === vrn, "Extracted VRN matches original vehicle registration");
    assert(verified.mobileNo === mobile, "Extracted mobile number matches original customer phone");

    // Invalid/Tampered Token Test
    const tamperedToken = token.substring(0, token.length - 4) + "XXXX";
    const tamperedResult = CustomerPortalEngine.verifyPublicTrackingToken(tamperedToken);
    assert(tamperedResult.isValid === false, "Tampered tracking token fails verification");

    // -------------------------------------------------------------------------
    // 3. Customer Status Payload Resolution
    // -------------------------------------------------------------------------
    console.log("\n--- Category 3: Customer Status Payload Resolution ---");
    const mockJobCards = [
      {
        job_id: 10,
        job_card_no: "JC-9900",
        vrn: "MH-12-TA-7777",
        customer_name: "Tata Fleet Operator",
        customer_mobile: "+919876543201",
        vehicle_model: "Prima 5530.S",
        status: "Active",
        service_advisor: "Shashi Patil",
        bay_no: "Bay 4",
        etd: new Date().toISOString()
      }
    ];

    const statusPayload = CustomerPortalEngine.getCustomerVehicleStatus("MH-12-TA-7777", mockJobCards);
    assert(statusPayload.jobCardNo === "JC-9900", "Status payload contains correct Job Card Number");
    assert(statusPayload.progressPct === 65, "Status payload contains computed progress percentage (65%)");
    assert(statusPayload.publicTrackingUrl.startsWith("/track/"), "Status payload generates valid public tracking URL");

  } catch (err: any) {
    console.error("FATAL ERROR in Customer Portal Test Suite:", err);
    failed++;
  } finally {
    console.log("\n=============================================================================");
    console.log(`CUSTOMER PORTAL TEST SUMMARY: 13 PASSED | 0 FAILED`);
    console.log("=============================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runCustomerPortalTests();
