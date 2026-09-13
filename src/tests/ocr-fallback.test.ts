import { describe, it, expect, vi, beforeEach } from "vitest";
import { OcrFallbackService } from "../services/ocr-fallback.service.ts";

/**
 * Azure is the OCR provider for this service.
 *
 * THESE TESTS USED TO ASSERT A GEMINI-FIRST PIPELINE. That branch was gated on
 * GEMINI_API_KEY, which is unset on this service, so the tests passed while
 * exercising a path that never ran in production — mocking the gate open made
 * them green without making them true. They now assert what the code actually
 * does: Azure reads the image, and a failure is surfaced rather than filled in.
 */
describe("OcrFallbackService Unit Suite", () => {
  let service: OcrFallbackService;

  beforeEach(() => {
    service = OcrFallbackService.getInstance();
    vi.restoreAllMocks();
  });

  it("returns the Azure result for a numberplate read", async () => {
    vi.spyOn(service as any, "extractNumberplateWithAzure").mockResolvedValue({
      extractedFields: { vrn: "KA-32-AB-1234", odometer: 45000 },
      confidence: 0.88,
      raw: { text: "KA-32-AB-1234" },
      text: "KA-32-AB-1234",
    });

    const result = await service.processWithFallback("data:image/jpeg;base64,QUJD", "numberplate", { threshold: 0.7 });

    expect(result.provider).toBe("Azure");
    expect(result.extractedFields.vrn).toBe("KA-32-AB-1234");
    expect(result.confidence).toBe(0.88);
  });

  it("returns the Azure result for a manual job card", async () => {
    vi.spyOn(service as any, "extractManualJobcardWithAzure").mockResolvedValue({
      extractedFields: {
        vrn: "MH-12-CD-5678",
        customer_name: "Ramesh Patil",
        customer_mobile: "9876543210",
        vehicle_model: "Tata Prima",
        km_reading: 32000,
        job_description: "Brake overhaul",
        remarks: "Urgent",
        service_advisor: "Advisor A",
      },
      confidence: 0.85,
      raw: {},
      text: "raw text",
    });

    const result = await service.processWithFallback("data:image/jpeg;base64,QUJD", "manual-jobcard", { threshold: 0.7 });

    expect(result.provider).toBe("Azure");
    expect(result.extractedFields.vrn).toBe("MH-12-CD-5678");
    expect(result.extractedFields.customer_name).toBe("Ramesh Patil");
    expect(result.confidence).toBe(0.85);
  });

  it("throws rather than returning a fabricated read when Azure fails", async () => {
    vi.spyOn(service as any, "extractPartNumbersWithAzure").mockRejectedValue(
      new Error("Azure network timeout")
    );

    // The important property: no object comes back. An unread plate or part
    // number must never reach a real record as though it had been read.
    await expect(
      service.processWithFallback("data:image/jpeg;base64,QUJD", "parts-photo", { threshold: 0.7 })
    ).rejects.toThrow(/OCR processing failed/);
  });
});
