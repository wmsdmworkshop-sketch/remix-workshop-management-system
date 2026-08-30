import { vehiclePassportFacade } from "../src/engines/vehicle-passport/index";

async function test() {
  console.log("=== Testing Real-Data-Only Enforcement ===");

  // 1. Genuine Vehicle: KA32AA4288
  console.log("\n[Test 1] Querying genuine vehicle from vehicle_master.tsv: KA32AA4288");
  const genuinePassport = await vehiclePassportFacade.getVehiclePassportAggregate("KA32AA4288");
  if (genuinePassport) {
    console.log("✓ Genuine Passport Found!");
    console.log(`  VRN: ${genuinePassport.passport.registrationNo}`);
    console.log(`  Chassis: ${genuinePassport.passport.vin}`);
    console.log(`  Customer: ${genuinePassport.customer.customerName}`);
    console.log(`  Model: ${genuinePassport.passport.model}`);
    console.log(`  Total Real Visits: ${genuinePassport.lifetimeSummary.totalVisits}`);
    console.log(`  Total Spend: ₹${genuinePassport.lifetimeSummary.lifetimeSpend.toLocaleString()}`);
  } else {
    console.log("✗ KA32AA4288 not found (unexpected)");
  }

  // 2. Non-Existent Vehicle: MH12UR7788
  console.log("\n[Test 2] Querying non-existent / unknown vehicle: MH12UR7788");
  const fakePassport = await vehiclePassportFacade.getVehiclePassportAggregate("MH12UR7788");
  if (fakePassport === null) {
    console.log("✓ Correct! Returned null (no fake data fabricated).");
  } else {
    console.log("✗ FAILED: Still returning fabricated data:", fakePassport.passport);
  }

  console.log("\n==========================================");
  process.exit(0);
}

test().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
