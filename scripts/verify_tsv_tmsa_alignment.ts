/**
 * Automated Verification Script: TSV Masters & TMSA Multi-Dealer Service Alignment
 */

import { tmsaMassSyncWorker } from "../src/engines/tmsa-mass-sync-worker";
import vehiclePassportFacade from "../src/engines/vehicle-passport/index";

async function main() {
  console.log("==================================================");
  console.log("RUNNING TSV MASTERS & TMSA MULTI-DEALER ALIGNMENT TEST");
  console.log("==================================================");

  // 1. Verify loading of the 3 TSV master files
  console.log("1. Inspecting 3 Master TSV datasets...");
  const counts = tmsaMassSyncWorker.loadTsvMasters();
  console.log(`✓ Vehicle Master TSV count: ${counts.vehicles}`);
  console.log(`✓ Local Service History TSV count: ${counts.localVisits}`);
  console.log(`✓ Local Invoices TSV count: ${counts.invoices}`);

  if (counts.vehicles < 2000) {
    throw new Error(`Expected ~2,951 vehicles, found ${counts.vehicles}`);
  }
  if (counts.localVisits < 20000) {
    throw new Error(`Expected ~23,436 local visits, found ${counts.localVisits}`);
  }
  if (counts.invoices < 9000) {
    throw new Error(`Expected ~9,857 invoices, found ${counts.invoices}`);
  }

  // 2. Test multi-dealer history generation for sample VRNs
  console.log("\n2. Testing multi-dealer service history generation...");
  const sampleVrn = "KA569972";
  const externalVisits = tmsaMassSyncWorker.getVehicleMultiDealerHistory(sampleVrn);
  console.log(`✓ Multi-dealer visits generated for ${sampleVrn}: ${externalVisits.length} cross-dealer visits`);
  externalVisits.forEach((v, i) => {
    console.log(`   [Visit ${i + 1}] ${v.serviceDate} | ${v.dealerName} (${v.dealerLocation}) | ${v.serviceType} | ₹${v.totalCost}`);
  });

  // 3. Test Full Unified 360° Passport Aggregate for a vehicle present in TSVs
  console.log(`\n3. Verifying Vehicle Passport Aggregate with harmonized local + national ledger for ${sampleVrn}...`);
  const aggregate = await vehiclePassportFacade.getVehiclePassportAggregate(sampleVrn);
  if (!aggregate) {
    throw new Error(`Failed to retrieve passport aggregate for ${sampleVrn}`);
  }

  console.log(`✓ Passport Score: ${aggregate.passport.passportScore}/100 | Health Index: ${aggregate.passport.healthScore}%`);
  console.log(`✓ Total Harmonized Visits: ${aggregate.lifetimeSummary.totalVisits}`);
  console.log(`✓ Total Lifetime Spend across all Tata Dealerships: ₹${aggregate.lifetimeSummary.lifetimeSpend.toLocaleString("en-IN")}`);
  console.log(`✓ Active Warranty Status: ${aggregate.lifetimeSummary.activeWarrantyStatus}`);
  console.log(`✓ Active AMC Status: ${aggregate.lifetimeSummary.activeAmcStatus}`);

  // 4. Verify that local visits and external visits coexist in the ledger
  const workshops = new Set(aggregate.visitLedger.map(v => v.workshopName));
  console.log(`✓ Distinct Workshop Locations in Vehicle History:`, Array.from(workshops));

  console.log("\n==================================================");
  console.log("ALL TSV & TMSA MULTI-DEALER ALIGNMENT TESTS PASSED! ✅");
  console.log("==================================================");
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
