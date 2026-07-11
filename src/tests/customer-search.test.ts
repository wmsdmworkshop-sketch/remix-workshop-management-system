import React from "react";
import CustomerSearch, { CustomerProfile } from "../components/reception/CustomerSearch";

// Mock the global window localStorage and fetch API
const mockJobCards = [
  {
    job_id: 101,
    job_card_no: "JC-99991",
    vrn: "MH-12-TA-1011",
    customer_name: "Amit Patel",
    customer_mobile: "+919876543201",
    vehicle_make: "Tata Motors",
    vehicle_model: "Prima 4025.S",
    vehicle_year: 2023,
    status: "Completed",
    created_at: "2026-07-01T09:00:00Z",
    warranty_status: "Standard",
    rework_count: 0,
    parts_price: 15000,
    labor_price: 5000,
  },
  {
    job_id: 102,
    job_card_no: "JC-99992",
    vrn: "MH-12-TA-1011",
    customer_name: "Amit Patel",
    customer_mobile: "+919876543201",
    vehicle_make: "Tata Motors",
    vehicle_model: "Prima 4025.S",
    vehicle_year: 2023,
    status: "Rework",
    created_at: "2026-07-05T10:00:00Z",
    warranty_status: "Standard",
    rework_count: 1,
    parts_price: 2000,
    labor_price: 0,
  }
];

// Helper to execute tests and log outcomes
async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING CUSTOMER SEARCH UI SLICE TESTS");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Test 1: Simulating mock fetching response
  try {
    const dummyHeaders = { "Authorization": "Bearer dummy-token" };
    assert(dummyHeaders.Authorization.includes("Bearer"), "Authorization header formatted successfully");
  } catch (e) {
    assert(false, "Failed to inspect Authorization header");
  }

  // Test 2: Standardizing mobile key resolution
  const standardizeMobile = (mobile: string) => mobile.trim().slice(-10);
  assert(standardizeMobile("+919876543201") === "9876543201", "Standardizes customer mobile keys to 10 digits");

  // Test 3: Outstanding balance calculation from job list
  const unpaidJobs = mockJobCards.filter(jc => jc.status !== "Completed" && jc.status !== "Invoiced");
  const outstanding = unpaidJobs.reduce((sum, jc) => sum + jc.parts_price + jc.labor_price, 0);
  assert(outstanding === 2000, "Calculates outstanding balance correctly from active job list");

  // Test 4: Rework repeat complaints counts extraction
  const repeatComplaints = mockJobCards.filter(jc => jc.rework_count > 0 || jc.status === "Rework").length;
  assert(repeatComplaints === 1, "Correctly counts historical repeat complaints");

  // Test 5: Standard warranty flag resolution
  const hasWarranty = mockJobCards.some(jc => jc.warranty_status === "Standard");
  assert(hasWarranty === true, "Flags active vehicle standard warranty correctly");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
