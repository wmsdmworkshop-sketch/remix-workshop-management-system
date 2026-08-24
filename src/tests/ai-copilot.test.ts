import { describe, it, expect } from "vitest";
import { verifyJobCard, extractJobCardFields } from "../engines/ocr-processor.ts";
import { AiCopilotOrchestrator } from "../engines/ai-copilot-orchestrator.ts";

describe("DWIP AI Enablement & OCR Test Suite (WP-08)", () => {
  it("extracts commercial vehicle OCR fields correctly", async () => {
    const rawOcrText = "Devanand Workshop Entry. Job Card: JC002. Vehicle VRN: KA-51-MM-4321. Odometer: 18500 km. Chassis: MST987654321.";
    const extracted = extractJobCardFields(rawOcrText);

    expect(extracted.vrn).toBe("KA-51-MM-4321");
    expect(extracted.jobCardNo).toBe("JC002");
    expect(extracted.odometer).toBe(18500);
    expect(extracted.chassisNo).toBe("MST987654321");

    // No live OCR provider credentials are configured in the test environment
    // (by design — a unit test must not depend on real third-party secrets).
    // verifyJobCard must fail closed rather than fabricate a result.
    await expect(verifyJobCard("base64_sample_image_data")).rejects.toThrow(
      "OCR could not extract text from the captured image."
    );
  });

  it("generates Tata Motors BS-VI diagnostic troubleshooting", () => {
    const diagAdBlue = AiCopilotOrchestrator.getCommercialVehicleDiagnostic("P204F AdBlue dosing malfunction");
    expect(diagAdBlue.faultCode).toBe("P204F");
    expect(diagAdBlue.severity).toBe("HIGH");
    expect(diagAdBlue.recommendation).toContain("AdBlue Dosing Pressure Low");

    const diagDPF = AiCopilotOrchestrator.getCommercialVehicleDiagnostic("P2463 DPF soot accumulation high");
    expect(diagDPF.faultCode).toBe("P2463");
    expect(diagDPF.severity).toBe("CRITICAL");

    const diagTurbo = AiCopilotOrchestrator.getCommercialVehicleDiagnostic("P0299 turbo underboost");
    expect(diagTurbo.faultCode).toBe("P0299");
  });

  it("dispatches queries and falls back gracefully", async () => {
    const dispatchResponse = await AiCopilotOrchestrator.dispatch("AdBlue warning light active", "service_advisor", {});
    expect(dispatchResponse.status).toBe("EXECUTED");
    expect(dispatchResponse.diagnostic).toBeDefined();

    const fallbackResponse = await AiCopilotOrchestrator.dispatch("General engine checkup", "service_advisor", {});
    expect(fallbackResponse.status).toBe("FALLBACK_MODE");
  });
});
