import type { VerificationLevel } from "./types.ts";

export class VerificationEngine {
  /**
   * Deterministically resolves verification level based on the event inputs and document checks.
   */
  resolveLevel(params: {
    source: "MANUAL" | "SYSTEM" | "MOBILE" | "API" | "AI";
    isDealerAgent: boolean;
    hasDealerReview?: boolean;
    ocrScore?: number;
    tamperingScore?: number;
    authenticityScore?: number;
  }): VerificationLevel {
    // Level 5: Originated by an authorized dealer staff member directly
    if (params.isDealerAgent && params.source === "MANUAL") {
      return 5;
    }

    // Level 4: Reviewed by dealer but not created by them
    if (params.hasDealerReview) {
      return 4;
    }

    // Level 3: AI Verified - document uploaded, high OCR verification with no tampering markers
    if (
      params.ocrScore !== undefined && params.ocrScore >= 80 &&
      params.tamperingScore !== undefined && params.tamperingScore < 20 &&
      params.authenticityScore !== undefined && params.authenticityScore >= 75
    ) {
      return 3;
    }

    // Level 2: Customer submitted raw upload
    if (params.source === "MOBILE" || params.source === "MANUAL") {
      return 2;
    }

    // Level 1: Unverified or fallback state
    return 1;
  }
}
