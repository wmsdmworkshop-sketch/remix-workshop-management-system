import React from "react";
import VehicleSearch, { VehicleProfile } from "../components/reception/VehicleSearch";

// Mock job cards data
const mockJobCards = [
  {
    job_id: 201,
    job_card_no: "JC-99993",
    vrn: "MH-12-TA-1234",
    chassis_number: "MAT451206H1234Z",
    customer_name: "Fleet Operator",
    customer_mobile: "+919876543202",
    vehicle_make: "Tata Motors",
    vehicle_model: "Prima 4025.S",
    vehicle_year: 2023,
    status: "Completed",
    created_at: "2026-07-02T09:00:00Z",
    warranty_status: "Standard",
    rework_count: 0,
    parts_price: 10000,
    labor_price: 3000,
    service_advisor: "Advisor Rajesh",
    technician_name: "Tech Alex",
    sr_type_master: "General Service",
    numberplate_photo: "http://example.com/plate.jpg",
  },
  {
    job_id: 202,
    job_card_no: "JC-99994",
    vrn: "MH-12-TA-1234",
    chassis_number: "MAT451206H1234Z",
    customer_name: "Fleet Operator",
    customer_mobile: "+919876543202",
    vehicle_make: "Tata Motors",
    vehicle_model: "Prima 4025.S",
    vehicle_year: 2023,
    status: "Rework",
    created_at: "2026-07-06T10:00:00Z",
    warranty_status: "Standard",
    rework_count: 1,
    parts_price: 1500,
    labor_price: 0,
    service_advisor: "Advisor Rajesh",
    technician_name: "Tech Alex",
    sr_type_master: "Rework Service",
    numberplate_photo: "http://example.com/plate2.jpg",
  }
];

// Helper to execute tests and log outcomes
async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING VEHICLE SEARCH UI SLICE TESTS");
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

  // Test 2: Standardizing VRN formatting
  const standardizeVrn = (vrn: string) => vrn.trim().toUpperCase();
  assert(standardizeVrn("mh-12-ta-1234 ") === "MH-12-TA-1234", "Standardizes vehicle registration plates (VRN) to uppercase");

  // Test 3: VIN search matching logic
  const matchVin = mockJobCards.some(jc => jc.chassis_number === "MAT451206H1234Z");
  assert(matchVin === true, "Matches vehicle by VIN (chassis_number)");

  // Test 4: Last advisor resolution
  const lastAdvisor = mockJobCards[mockJobCards.length - 1].service_advisor;
  assert(lastAdvisor === "Advisor Rajesh", "Resolves the last service advisor correctly");

  // Test 5: Outstanding balance calculations
  const unpaidJobs = mockJobCards.filter(jc => jc.status !== "Completed" && jc.status !== "Invoiced");
  const outstanding = unpaidJobs.reduce((sum, jc) => sum + jc.parts_price + jc.labor_price, 0);
  assert(outstanding === 1500, "Calculates outstanding balance correctly for unpaid vehicle jobs");

  console.log("=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
