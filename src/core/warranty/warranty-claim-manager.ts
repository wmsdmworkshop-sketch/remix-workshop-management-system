import { pool as db } from "../../db/index";
import { IEventBus } from "../event-bus";
import { ClaimHeader, ClaimLine, WarrantyOperationType, WarrantyClaimState } from "./warranty-types";
import { WarrantyValidator } from "./warranty-validator";
import { VehicleDetails } from "./coverage-engine";
import { OEMAdapter } from "./oem-adapter";
import { makeSystemContext } from "../business-context";
import { randomUUID } from "crypto";

export class WarrantyClaimManager {
  constructor(private eventBus: IEventBus, private oemAdapter: OEMAdapter) {}

  public async createClaim(
    jobId: number,
    vin: string,
    operationType: WarrantyOperationType,
    vehicleDetails: VehicleDetails,
    lines: { type: string; code: string; qty: number; amount: number }[]
  ): Promise<{ success: boolean; claimId?: string; errors?: string[] }> {
    
    // 1. Header Validations
    const headerValidation = await WarrantyValidator.validateClaimCreation(vin, operationType, jobId, vehicleDetails);
    if (!headerValidation.valid) {
      return { success: false, errors: headerValidation.errors };
    }

    const claimId = `CLM-${randomUUID().substring(0, 8).toUpperCase()}`;
    let totalClaimed = 0;

    const claimLines: ClaimLine[] = lines.map(l => {
      const amt = l.amount * l.qty;
      totalClaimed += amt;
      return {
        line_id: `LN-${randomUUID().substring(0, 8).toUpperCase()}`,
        claim_id: claimId,
        line_type: l.type as any,
        item_code: l.code,
        quantity: l.qty,
        unit_price: l.amount,
        claimed_amount: amt,
      };
    });

    // 2. Line Validations
    const lineValidation = await WarrantyValidator.validateLines(operationType, claimLines);
    if (!lineValidation.valid) {
      const lineErrors = lineValidation.lineErrors.map(le => `Line ${le.line_id}: ${le.reason}`);
      return { success: false, errors: lineErrors };
    }

    // 3. Persist Header
    await db.execute(
      "INSERT INTO tbl_warranty_claims (claim_id, job_id, vin, operation_type, workflow_state, total_claimed_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [claimId, jobId, vin, operationType, "CLAIM_CREATED", totalClaimed, new Date()]
    );

    // 4. Persist Lines
    for (const line of claimLines) {
      await db.execute(
        "INSERT INTO tbl_warranty_claim_lines (line_id, claim_id, line_type, item_code, quantity, unit_price, claimed_amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [line.line_id, line.claim_id, line.line_type, line.item_code, line.quantity, line.unit_price, line.claimed_amount]
      );
    }

    await this.logHistory(claimId, "CREATED", "Warranty Claim Created successfully");

    const context = makeSystemContext(`WARRANTY-CREATE-${claimId}`);
    await this.eventBus.publish("WARRANTY_CLAIM_CREATED", { claimId, operationType, totalClaimed }, context);

    return { success: true, claimId };
  }

  public async progressState(claimId: string, newState: WarrantyClaimState, actorId: string, notes?: string): Promise<void> {
    const [claims] = await db.execute("SELECT * FROM tbl_warranty_claims WHERE claim_id = ?", [claimId]) as any[];
    if (!claims || claims.length === 0) throw new Error("Claim not found");
    
    await db.execute(
      "UPDATE tbl_warranty_claims SET workflow_state = ?, updated_at = ? WHERE claim_id = ?",
      [newState, new Date(), claimId]
    );

    await this.logHistory(claimId, "STATE_CHANGED", `Transitioned to ${newState} by ${actorId}. Notes: ${notes || 'None'}`);

    const context = makeSystemContext(`WARRANTY-STATE-${claimId}`);
    await this.eventBus.publish("WARRANTY_STATE_CHANGED", { claimId, newState }, context);
  }

  public async submitToOEM(claimId: string, actorId: string): Promise<void> {
    const [claims] = await db.execute("SELECT * FROM tbl_warranty_claims WHERE claim_id = ?", [claimId]) as any[];
    if (!claims || claims.length === 0) throw new Error("Claim not found");
    const header = claims[0] as ClaimHeader;

    if (header.workflow_state !== "OEM_SUBMISSION_READY") {
      throw new Error(`Cannot submit claim in state ${header.workflow_state}`);
    }

    const [lines] = await db.execute("SELECT * FROM tbl_warranty_claim_lines WHERE claim_id = ?", [claimId]) as any[];
    
    await this.progressState(claimId, "OEM_SUBMITTED", actorId, "Submitting to OEM via Adapter");

    // Call Adapter
    const response = await this.oemAdapter.submitClaim(header, lines as ClaimLine[]);

    if (response.statusCode === "ACCEPTED") {
      await db.execute(
        "UPDATE tbl_warranty_claims SET oem_claim_reference = ?, total_approved_amount = ? WHERE claim_id = ?",
        [response.oemReferenceId, response.approvedAmount, claimId]
      );
      await this.progressState(claimId, "OEM_APPROVED", "SYSTEM", "Auto-approved by OEM response");
    } else {
      await this.progressState(claimId, "OEM_REJECTED", "SYSTEM", "Rejected by OEM");
    }
  }

  private async logHistory(claimId: string, action: string, details: string): Promise<void> {
    await db.execute(
      "INSERT INTO tbl_warranty_history (history_id, claim_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?)",
      [`HIST-${randomUUID()}`, claimId, action, details, new Date()]
    );
  }
}
