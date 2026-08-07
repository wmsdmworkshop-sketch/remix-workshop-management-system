import { pool as db } from "../../db/index";
import { CoverageEngine, VehicleDetails } from "./coverage-engine";
import { ClaimLine, WarrantyOperationType } from "./warranty-types";

export class WarrantyValidator {
  
  public static async validateClaimCreation(
    vin: string,
    operationType: WarrantyOperationType,
    jobId: number,
    vehicleDetails: VehicleDetails
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Coverage Rules
    const coverage = await CoverageEngine.isVehicleEligible(operationType, vehicleDetails);
    if (!coverage.eligible) {
      errors.push(`Vehicle ineligible for ${operationType}: ${coverage.reason}`);
    }

    // 2. Duplicate Claims
    const [existing] = await db.execute(
      "SELECT claim_id FROM tbl_warranty_claims WHERE job_id = ? AND operation_type = ?",
      [jobId, operationType]
    ) as any[];

    if (existing && existing.length > 0) {
      errors.push(`A ${operationType} claim already exists for Job Card ${jobId}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public static async validateLines(
    operationType: WarrantyOperationType,
    lines: ClaimLine[]
  ): Promise<{ valid: boolean; lineErrors: { line_id: string, reason: string }[] }> {
    const lineErrors: { line_id: string, reason: string }[] = [];

    for (const line of lines) {
      if (line.line_type === "PARTS") {
        const partEligibility = await CoverageEngine.isPartEligible(operationType, line.item_code);
        if (!partEligibility.eligible) {
          lineErrors.push({ line_id: line.line_id, reason: partEligibility.reason || "Part not covered." });
        }
      }
      
      // Additional validations like Labour rate caps, Sublet invoice requirements could go here.
    }

    return {
      valid: lineErrors.length === 0,
      lineErrors
    };
  }
}
