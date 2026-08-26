import { describe, it, expect, vi, beforeEach } from "vitest";
import { OcrFallbackService } from "../services/ocr-fallback.service.ts";

describe("OcrFallbackService Unit Suite", () => {
  let service: OcrFallbackService;

  beforeEach(() => {
    service = OcrFallbackService.getInstance();
    vi.restoreAllMocks();
  });

  it("should return Gemini result when confidence is above threshold", async () => {
    vi.spyOn(service as any, "extractNumberplateWithGemini").mockResolvedValue({
      extractedFields: { vrn: "KA-32-AB-1234", odometer: 45000 },
      confidence: 0.95,
      raw: { vrn: "KA-32-AB-1234" },
      text: "KA-32-AB-1234",
    });

    const result = await service.processWithFallback("data:image/jpeg;base64,QUJD", "numberplate", { threshold: 0.7 });

    expect(result.provider).toBe("Gemini");
    expect(result.extractedFields.vrn).toBe("KA-32-AB-1234");
    expect(result.confidence).toBe(0.95);
  });

  it("should fall back to Azure when Gemini returns confidence below threshold", async () => {
    vi.spyOn(service as any, "extractNumberplateWithGemini").mockResolvedValue({
      extractedFields: { vrn: "KA-??-??-????" },
      confidence: 0.45,
      raw: {},
      text: "unclear text",
    });

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

  it("should fall back to Azure when Gemini throws an error", async () => {
    vi.spyOn(service as any, "extractManualJobcardWithGemini").mockRejectedValue(
      new Error("Gemini API Rate Limit Exceeded")
    );

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

  it("should throw error when both Gemini and Azure fail and no partial result exists", async () => {
    vi.spyOn(service as any, "extractPartNumbersWithGemini").mockRejectedValue(
      new Error("Gemini network error")
    );

    vi.spyOn(service as any, "extractPartNumbersWithAzure").mockRejectedValue(
      new Error("Azure network timeout")
    );

    await expect(
      service.processWithFallback("data:image/jpeg;base64,QUJD", "parts-photo", { threshold: 0.7 })
    ).rejects.toThrow(/OCR Processing failed on both primary and fallback providers/);
  });
});
