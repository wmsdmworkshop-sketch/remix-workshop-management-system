import assert from "node:assert";
import {
  TMSA_PRODUCTION_BASE_URL,
  TMSA_MICROSERVICE_ENDPOINTS,
  TMSA_ENDPOINT_CATALOG,
} from "../src/integrations/tmsa/endpoints.ts";
import { TmsaClient } from "../src/integrations/tmsa/client.ts";
import {
  TmsaConnector,
  TmsaHealthService,
} from "../src/integrations/tmsa/index.ts";
import { integrationRegistry } from "../src/integrations/index.ts";

console.log("==================================================");
console.log("RUNNING TMSA INTEGRATION VERIFICATION SUITE");
console.log("==================================================");

// 1. Verify Catalog
console.log("1. Checking TMSA Production Base URL and 8 endpoints catalog...");
assert.strictEqual(TMSA_PRODUCTION_BASE_URL, "https://mobility-cv-prod-microservices.api.tatamotors");
assert.strictEqual(TMSA_ENDPOINT_CATALOG.length, 8);

const catalogMap = new Map(TMSA_ENDPOINT_CATALOG.map(e => [e.key, e]));

assert.strictEqual(
  catalogMap.get("BILLING_TYPE_MASTER")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/billing-type-master/"
);
assert.strictEqual(catalogMap.get("BILLING_TYPE_MASTER")?.method, "GET");

assert.strictEqual(
  catalogMap.get("COMPLAINT_CODE_MASTER")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/complaint-code-master/"
);
assert.strictEqual(catalogMap.get("COMPLAINT_CODE_MASTER")?.method, "GET");

assert.strictEqual(
  catalogMap.get("FAULT_CODE_MASTER")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/fault-code-master/"
);
assert.strictEqual(catalogMap.get("FAULT_CODE_MASTER")?.method, "GET");

assert.strictEqual(
  catalogMap.get("VEHICLE_INVENTORY")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/vehicle-inventory/"
);
assert.strictEqual(catalogMap.get("VEHICLE_INVENTORY")?.method, "GET");

assert.strictEqual(
  catalogMap.get("FENCE_IN_UPLOAD")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/upload-image/"
);
assert.strictEqual(catalogMap.get("FENCE_IN_UPLOAD")?.method, "POST");

assert.strictEqual(
  catalogMap.get("CRM_IMAGE_UPLOAD")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/image-upload-in-crm/"
);
assert.strictEqual(catalogMap.get("CRM_IMAGE_UPLOAD")?.method, "POST");

assert.strictEqual(
  catalogMap.get("MEDIA_UPLOAD_SA")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/sa/media-upload/"
);
assert.strictEqual(catalogMap.get("MEDIA_UPLOAD_SA")?.method, "POST");

assert.strictEqual(
  catalogMap.get("MEDIA_UPLOAD_TA")?.fullUrl,
  "https://mobility-cv-prod-microservices.api.tatamotors/api/tmsa-cv/ta/media-upload/"
);
assert.strictEqual(catalogMap.get("MEDIA_UPLOAD_TA")?.method, "POST");

console.log("✓ Catalog URLs, paths, and HTTP methods verified 100% correctly.");

// 2. Test TmsaClient request dispatching
console.log("2. Testing TmsaClient method routing...");
const recordedCalls: any[] = [];
const mockCallProvider = async (opts: any) => {
  recordedCalls.push(opts);
  return { success: true, mockData: true, path: opts.path };
};

const client = new TmsaClient({ callProviderFn: mockCallProvider });

async function testClient() {
  await client.getBillingTypes({ workshop_code: "WS_01" });
  assert.strictEqual(recordedCalls[0].path, "/api/tmsa-cv/sa/billing-type-master/");
  assert.strictEqual(recordedCalls[0].query.workshop_code, "WS_01");

  await client.getComplaintCodes({ search: "clutch" });
  assert.strictEqual(recordedCalls[1].path, "/api/tmsa-cv/sa/complaint-code-master/");
  assert.strictEqual(recordedCalls[1].query.search, "clutch");

  await client.getFaultCodes({ dtc: "P0101" });
  assert.strictEqual(recordedCalls[2].path, "/api/tmsa-cv/sa/fault-code-master/");

  await client.getVehicleInventory({ vrn: "KA32AA1111" });
  assert.strictEqual(recordedCalls[3].path, "/api/tmsa-cv/sa/vehicle-inventory/");

  await client.uploadFenceInImage({ vrn: "KA32AA1111", image_type: "FRONT" });
  assert.strictEqual(recordedCalls[4].path, "/api/tmsa-cv/sa/upload-image/");
  assert.strictEqual(recordedCalls[4].method, "POST");

  await client.uploadCrmImage({ job_card_number: "JC-101" });
  assert.strictEqual(recordedCalls[5].path, "/api/tmsa-cv/sa/image-upload-in-crm/");
  assert.strictEqual(recordedCalls[5].method, "POST");

  await client.uploadSaMedia({ entity_id: "JC-101", entity_type: "JOB_CARD", media_type: "IMAGE", file_name: "doc.jpg" });
  assert.strictEqual(recordedCalls[6].path, "/api/tmsa-cv/sa/media-upload/");
  assert.strictEqual(recordedCalls[6].method, "POST");

  await client.uploadTrailerMedia({ trailer_id: "TR-01", inspection_point: "AXLE", media_type: "IMAGE", file_name: "axle.jpg" });
  assert.strictEqual(recordedCalls[7].path, "/api/tmsa-cv/ta/media-upload/");
  assert.strictEqual(recordedCalls[7].method, "POST");
}

await testClient();
console.log("✓ TmsaClient method routing verified 100% correctly.");

// 3. Test Integration Registry & Connector
console.log("3. Testing Integration Registry & Connector...");
const connector = integrationRegistry.getConnector("TMSA");
assert.strictEqual(connector.systemCode, "TMSA");
assert(connector.name.includes("TMSA"));

// 4. Test Health Service
const healthService = new TmsaHealthService();
const healthReport = await healthService.checkHealth();
assert.strictEqual(healthReport.status, "HEALTHY");
assert.strictEqual(healthReport.details?.baseUrl, "https://mobility-cv-prod-microservices.api.tatamotors");
console.log("✓ Integration Registry and Health Service verified.");

console.log("==================================================");
console.log("ALL TMSA INTEGRATION TESTS PASSED SUCCESSFULLY! ✅");
console.log("==================================================");
