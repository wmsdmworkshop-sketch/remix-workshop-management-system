import { vehiclePassportFacade, ensureVehiclePassportSchema } from "../engines/vehicle-passport/index.ts";
import type { VerificationLevel } from "../engines/vehicle-passport/types.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ ${message}`);
  }
}

async function testLifecycle() {
  console.log("\n=== Test Case 1: Vehicle Passport Lifecycle ===");

  await ensureVehiclePassportSchema();

  const vin = `VIN-${Date.now()}`;
  const passport = await vehiclePassportFacade.initPassport({
    vehicleId: `VEH-${Date.now()}`,
    vin,
    engineNo: "ENG-123",
    registrationNo: "MH-12-XX-9999",
    make: "TATA",
    model: "Prima 5530.S",
    yearOfManufacture: 2024,
    fuelType: "DIESEL",
    bodyType: "TRACTOR",
    dealerId: "DLR-1",
    branchId: "BR-1",
  });

  assert(passport.passportId.startsWith("VPASS-"), "Passport initialized with correct ID prefix");
  assert(passport.vin === vin, "VIN parameter is mapped properly");
  assert(passport.passportScore === 100, "Initial score starts at 100");

  console.log("\n=== Test Case 2: Registering Events & Detailed Data ===");

  const event = await vehiclePassportFacade.registerEvent({
    passportId: passport.passportId,
    eventType: "ENGINE_OVERHAUL",
    eventSource: "MANUAL",
    eventDate: new Date().toISOString(),
    odometerKm: 45000,
    description: "Major engine overhaul due to piston ring wear",
    verifiedBy: "Staff Advisor",
    isDealerAgent: true,
    repair: {
      repairType: "Engine Block Machining",
      severity: "CRITICAL",
      workshopName: "Devanand Prime Workshop",
      workshopType: "DEALER",
      labourCost: 15000,
      partsCost: 35000,
    },
    part: {
      partName: "Piston Rings Set",
      partNumber: "PR-99221",
      partType: "Engine",
      brand: "TATA Genuine Parts",
      cost: 12000,
      warrantyMonths: 12,
    }
  });

  assert(event.eventId.startsWith("EVT-"), "Event registration returns valid event ID");
  assert(event.verificationLevel === 5, "Manual event by dealer agent is verified at Level 5");

  // Fetch passport to verify updated scores
  const updatedPassport = await vehiclePassportFacade.getPassport(passport.passportId);
  assert(updatedPassport !== null, "Passport retrieved successfully");
  if (updatedPassport) {
    assert(updatedPassport.totalEvents === 2, "Timeline has 2 events (Ownership initialization + Engine overhaul)");
    assert(updatedPassport.verifiedEvents === 2, "Timeline has 2 verified events");
    assert(updatedPassport.healthScore < 100, "Health score deducted due to major engine repairs");
    assert(updatedPassport.trustScore === 100, "Trust score remains 100 (all events are verified)");
  }

  console.log("\n=== Test Case 3: Generating Certificates & Digital Signature ===");

  const resaleCert = await vehiclePassportFacade.generatePassportCertificate(
    passport.passportId,
    "VERIFIED_RESALE",
    "Advisor-100",
    "PREMIUM"
  );

  assert(resaleCert.certificateId.startsWith("CERT-"), "Resale certificate generated with correct ID prefix");
  assert(resaleCert.qrCode.startsWith("DWIP-RP-"), "QR Code has DWIP-RP- prefix");
  assert(resaleCert.digitalSignature !== "", "Digital signature is populated");
  assert(resaleCert.viewSpecificData.estimatedValuation !== undefined, "Premium resale certificate includes estimated valuation");

  console.log("\n=== Test Case 4: QR Code Verification Lookup ===");

  const lookupCert = await vehiclePassportFacade.verifyPassportCertificate(resaleCert.qrCode);
  assert(lookupCert !== null, "QR verification lookup succeeds");
  if (lookupCert) {
    assert(lookupCert.certificateId === resaleCert.certificateId, "Verification returns correct certificate ID");
    assert(lookupCert.certificateStatus === "VALID", "Certificate is active and valid");
  }

  console.log("\n=== Test Case 5: Warranty Certificate Views ===");

  const warrantyCert = await vehiclePassportFacade.generatePassportCertificate(
    passport.passportId,
    "WARRANTY_PASSPORT",
    "Advisor-100",
    "FREE"
  );
  assert(warrantyCert.certificateType === "WARRANTY_PASSPORT", "Generated view certificate for warranty");
}

async function main() {
  try {
    await testLifecycle();

    console.log(`\n=======================================================`);
    console.log(`  Tests completed: Passed: ${passed} | Failed: ${failed}`);
    console.log(`=======================================================`);

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log("All Vehicle Passport tests passed successfully.");
      process.exit(0);
    }
  } catch (err) {
    console.error("Test runner crashed:", err);
    process.exit(1);
  }
}

main();
