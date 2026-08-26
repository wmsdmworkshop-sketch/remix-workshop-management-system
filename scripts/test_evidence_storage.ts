import * as dotenv from "dotenv";
dotenv.config();

import { EvidenceStorageService, StoreEvidenceParams } from "../src/services/evidence-storage.service.ts";

(async () => {
  console.log("=== Testing EvidenceStorageService ===");
  const service = EvidenceStorageService.getInstance();

  const sampleBase64 = "data:image/jpeg;base64," + Buffer.from("test-ocr-image-payload-bytes-for-evidence-storage").toString("base64");
  const params: StoreEvidenceParams = {
    base64Image: sampleBase64,
    ocrType: "NUMBERPLATE",
    vrn: "KA32AB9999",
    jobCardNo: "JC-TEST-EVD",
    ocrProvider: "Azure",
    ocrResultJson: { extractedFields: { vrn: "KA32AB9999" } },
    ocrConfidence: 0.99,
    capturedBy: 1,
    branchId: "BR-SEDAM"
  };

  console.log("1. Storing evidence...");
  const record = await service.storeEvidence(params);
  console.log("Record created:", record);

  if (!record) {
    console.error("❌ Failed to create evidence record!");
    process.exit(1);
  }

  console.log("2. Querying by VRN KA32AB9999...");
  const records = await service.getEvidenceByVrn("KA32AB9999");
  console.log(`Found ${records.length} records for KA32AB9999`);
  if (records.length === 0) {
    console.error("❌ No records found by VRN!");
    process.exit(1);
  }

  console.log("3. Querying by Job Card JC-TEST-EVD...");
  const jcRecords = await service.getEvidenceByJobCard("JC-TEST-EVD");
  console.log(`Found ${jcRecords.length} records for JC-TEST-EVD`);

  console.log("4. Running retention worker test...");
  const retentionRes = await service.markExpiredAsDeleted();
  console.log("Retention worker result:", retentionRes);

  console.log("\n✅ EvidenceStorageService verification test PASSED successfully!");
  process.exit(0);
})();
