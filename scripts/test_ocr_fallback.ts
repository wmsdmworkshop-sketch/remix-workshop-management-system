import * as dotenv from "dotenv";
dotenv.config();

import { OcrFallbackService } from "../src/services/ocr-fallback.service.ts";

(async () => {
  console.log("=== Testing OcrFallbackService (Gemini 3.1 -> Azure) ===");
  const service = OcrFallbackService.getInstance();

  // Test 1: Numberplate OCR with sample image
  console.log("\n[Test 1] Numberplate OCR Processing...");
  const samplePlateBase64 = "data:image/jpeg;base64," + Buffer.from("SAMPLE_INDIAN_PLATE_KA32AB1234").toString("base64");

  try {
    const res1 = await service.processWithFallback(samplePlateBase64, "numberplate", { threshold: 0.7 });
    console.log("Result 1 (Numberplate):", {
      provider: res1.provider,
      vrn: res1.extractedFields?.vrn,
      confidence: res1.confidence,
      hasRaw: !!res1.raw
    });
  } catch (e: any) {
    console.log("Test 1 error (expected if mock credentials offline):", e.message);
  }

  // Test 2: Invoices OCR Processing
  console.log("\n[Test 2] Invoice OCR Processing (with text fallback input)...");
  try {
    const res2 = await service.processWithFallback("", "invoice", {
      textInput: "TATA MOTORS WORKSHOP INVOICE\nInvoice No: INV-98765\nJob Card: JC4432\nVehicle: KA-32-AB-9999\nLabour: 2500\nParts: 4500\nDate: 2026-06-15\nTechnicians: Ramesh, Suresh",
      threshold: 0.7
    });
    console.log("Result 2 (Invoice):", {
      provider: res2.provider,
      invoice_no: res2.extractedFields?.invoice_no,
      vrn: res2.extractedFields?.vrn,
      confidence: res2.confidence
    });
  } catch (e: any) {
    console.log("Test 2 error:", e.message);
  }

  // Test 3: Forced Fallback Test (High threshold 0.999 to trigger Azure fallback)
  console.log("\n[Test 3] Forced Fallback with threshold 0.999...");
  try {
    const res3 = await service.processWithFallback(samplePlateBase64, "numberplate", { threshold: 0.999 });
    console.log("Result 3 (Forced fallback):", {
      provider: res3.provider,
      confidence: res3.confidence
    });
  } catch (e: any) {
    console.log("Test 3 error:", e.message);
  }

  console.log("\n✅ OcrFallbackService suite completed.");
  process.exit(0);
})();
