/**
 * DWIP Document Verification Framework — Unit Tests
 * Tests provider abstraction, console provider, passport creation, and factory registry.
 */

import { documentVerificationService } from "../engines/document-verification/index.ts";
import { ConsoleDocumentProvider } from "../engines/document-verification/providers/console-provider.ts";
import type {
  DocumentVerificationProvider,
  DocumentVerificationRequest,
  DocumentVerificationResult,
} from "../engines/document-verification/types.ts";

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

async function testConsoleProvider() {
  console.log("\n=== Console Provider Tests ===");

  const provider = new ConsoleDocumentProvider();

  assert(provider.providerId === "console-pilot", "Provider ID is 'console-pilot'");
  assert(await provider.isAvailable() === true, "Console provider is always available");

  // Test with valid document (create a fake JPEG header)
  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const fakeDoc = Buffer.concat([jpegHeader, Buffer.alloc(5000, 0x42)]);
  const base64Doc = fakeDoc.toString("base64");

  const result = await provider.verify({
    documentBase64: base64Doc,
    mimeType: "image/jpeg",
    documentType: "VEHICLE_RC",
    dealerId: "DEALER-TEST-001",
    branchId: "BR-TEST-01",
    correlationId: "TEST-001",
  });

  assert(typeof result.verificationScore === "number", "Returns numeric verificationScore");
  assert(result.verificationScore >= 0 && result.verificationScore <= 100, "verificationScore in 0-100 range");
  assert(typeof result.authenticityScore === "number", "Returns numeric authenticityScore");
  assert(result.authenticityScore >= 0 && result.authenticityScore <= 100, "authenticityScore in 0-100 range");
  assert(typeof result.ocrConfidence === "number", "Returns numeric ocrConfidence");
  assert(result.ocrConfidence >= 0 && result.ocrConfidence <= 100, "ocrConfidence in 0-100 range");
  assert(typeof result.manualReviewRequired === "boolean", "Returns boolean manualReviewRequired");
  assert(typeof result.tamperingIndicators === "object", "Returns tamperingIndicators object");
  assert(typeof result.tamperingIndicators.imageManipulationDetected === "boolean", "Has imageManipulationDetected");
  assert(typeof result.tamperingIndicators.fontConsistencyPassed === "boolean", "Has fontConsistencyPassed");
  assert(typeof result.tamperingIndicators.logoAuthentic === "boolean", "Has logoAuthentic");
  assert(typeof result.tamperingIndicators.metadataConsistent === "boolean", "Has metadataConsistent");
  assert(Array.isArray(result.tamperingIndicators.notes), "tamperingIndicators.notes is array");
  assert(typeof result.extractedFields === "object", "Returns extractedFields object");
  assert(Object.keys(result.extractedFields).length > 0, "Extracted fields are populated for VEHICLE_RC");
  assert(typeof result.providerMetadata === "object", "Returns providerMetadata");
  assert(result.providerMetadata.providerId === "console-pilot", "providerMetadata contains correct providerId");
}

async function testInvalidDocument() {
  console.log("\n=== Invalid Document Tests ===");

  const provider = new ConsoleDocumentProvider();

  // Empty document
  const result = await provider.verify({
    documentBase64: "dG9v", // "too" in base64 — too short
    mimeType: "image/jpeg",
    documentType: "VEHICLE_RC",
    dealerId: "DEALER-TEST-001",
    branchId: "BR-TEST-01",
  });

  assert(result.verificationScore === 0, "Empty/tiny doc gets score 0");
  assert(result.manualReviewRequired === true, "Invalid doc requires manual review");
}

async function testPassportCreation() {
  console.log("\n=== Document Passport Tests ===");

  const fakeDoc = Buffer.alloc(5000, 0x42).toString("base64");

  const mockResult: DocumentVerificationResult = {
    verificationScore: 88,
    authenticityScore: 92,
    ocrConfidence: 95,
    tamperingIndicators: {
      imageManipulationDetected: false,
      fontConsistencyPassed: true,
      logoAuthentic: true,
      metadataConsistent: true,
      notes: [],
    },
    extractedFields: { registration_number: "MH-12-AB-1234" },
    manualReviewRequired: false,
    providerMetadata: { providerId: "console-pilot" },
  };

  const passport = documentVerificationService.createPassport(
    "CUST-PASS-TEST",
    "VEHICLE_RC",
    fakeDoc,
    mockResult,
    "DEALER-TEST-001",
    "BR-TEST-01"
  );

  assert(passport.passportId.startsWith("DPASS-"), "Passport ID has correct prefix");
  assert(passport.customerPassportId === "CUST-PASS-TEST", "Links to customer passport");
  assert(passport.documentType === "VEHICLE_RC", "Correct document type");
  assert(passport.documentHash.length === 64, "SHA-256 hash is 64 hex characters");
  assert(passport.status === "VERIFIED", "High-score doc gets VERIFIED status");
  assert(passport.versionHistory.length === 1, "Initial version history entry created");
  assert(passport.dealerId === "DEALER-TEST-001", "Multi-tenant dealerId preserved");
  assert(passport.branchId === "BR-TEST-01", "Multi-tenant branchId preserved");

  // Test manual review status
  const lowScoreResult = { ...mockResult, verificationScore: 60, manualReviewRequired: true };
  const reviewPassport = documentVerificationService.createPassport(
    "CUST-PASS-TEST-2", "INSURANCE_CERTIFICATE", fakeDoc, lowScoreResult, "D1", "B1"
  );
  assert(reviewPassport.status === "MANUAL_REVIEW", "Low-score doc gets MANUAL_REVIEW status");
}

async function testProviderRegistry() {
  console.log("\n=== Provider Registry Tests ===");

  const providers = await documentVerificationService.listProviders();
  assert(providers.length >= 1, "At least one provider registered");
  assert(providers.some(p => p.id === "console-pilot"), "Console provider is registered");
  assert(providers.some(p => p.active === true), "One provider is marked active");

  // Register a mock provider
  const mockProvider: DocumentVerificationProvider = {
    providerId: "mock-test",
    providerName: "Mock Test Provider",
    isAvailable: async () => true,
    verify: async () => ({
      verificationScore: 100,
      authenticityScore: 100,
      ocrConfidence: 100,
      tamperingIndicators: {
        imageManipulationDetected: false,
        fontConsistencyPassed: true,
        logoAuthentic: true,
        metadataConsistent: true,
        notes: [],
      },
      extractedFields: {},
      manualReviewRequired: false,
      providerMetadata: { providerId: "mock-test" },
    }),
  };

  documentVerificationService.registerProvider(mockProvider);
  const updatedProviders = await documentVerificationService.listProviders();
  assert(updatedProviders.length >= 2, "Mock provider added to registry");
  assert(updatedProviders.some(p => p.id === "mock-test"), "Mock provider is listed");

  // Switch to mock provider
  const switched = await documentVerificationService.setActiveProvider("mock-test");
  assert(switched === true, "Successfully switched to mock provider");

  // Verify it's active
  const active = documentVerificationService.getActiveProvider();
  assert(active.providerId === "mock-test", "Active provider is mock-test");

  // Switch back to console for other tests
  await documentVerificationService.setActiveProvider("console-pilot");
}

async function testServiceVerify() {
  console.log("\n=== Service-Level Verify Tests ===");

  // Ensure console-pilot is active
  await documentVerificationService.setActiveProvider("console-pilot");

  const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const fakeDoc = Buffer.concat([jpegHeader, Buffer.alloc(3000, 0x55)]);

  const result = await documentVerificationService.verify({
    documentBase64: fakeDoc.toString("base64"),
    mimeType: "image/jpeg",
    documentType: "INSURANCE_CERTIFICATE",
    dealerId: "DEALER-SVC-001",
    branchId: "BR-SVC-01",
    correlationId: "SVC-TEST-001",
  });

  assert(result.verificationScore > 0, "Service-level verify returns non-zero score");
  assert(result.extractedFields !== undefined, "Service-level verify returns extractedFields");
}

// ── Run all tests ──────────────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  DWIP Document Verification Framework — Test Suite   ║");
  console.log("╚═══════════════════════════════════════════════════════╝");

  await testConsoleProvider();
  await testInvalidDocument();
  await testPassportCreation();
  await testProviderRegistry();
  await testServiceVerify();

  console.log(`\n${"═".repeat(55)}`);
  console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`${"═".repeat(55)}`);

  if (failed > 0) {
    console.error("\n❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("\n✅ ALL TESTS PASSED");
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
