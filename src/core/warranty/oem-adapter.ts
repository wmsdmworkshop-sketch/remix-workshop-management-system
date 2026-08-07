import { pool as db } from "../../db/index";
import { ClaimHeader, ClaimLine } from "./warranty-types";
import { randomUUID } from "crypto";

export interface OEMSubmissionPayload {
  dealerCode: string;
  claimReference: string;
  vin: string;
  claimType: string;
  totalAmount: number;
  lines: Array<{
    type: string;
    code: string;
    qty: number;
    amount: number;
  }>;
}

export interface OEMResponse {
  statusCode: string;
  approvedAmount: number;
  oemReferenceId?: string;
  rejectionReasons?: Record<string, string>; // mapping item_code to reason
}

/**
 * Adapter specifically for integrating with Tata Motors OEM Warranty systems.
 * Isolates the external HTTP calls and payload formatting from the core lifecycle.
 */
export class OEMAdapter {
  /**
   * Submits a claim to the Tata OEM API.
   */
  public async submitClaim(header: ClaimHeader, lines: ClaimLine[]): Promise<OEMResponse> {
    const payload: OEMSubmissionPayload = {
      dealerCode: "TML-DLR-001", // Should come from config
      claimReference: header.claim_id,
      vin: header.vin,
      claimType: header.operation_type,
      totalAmount: header.total_claimed_amount,
      lines: lines.map(l => ({
        type: l.line_type,
        code: l.item_code,
        qty: l.quantity,
        amount: l.claimed_amount
      }))
    };

    // Simulate external network call
    console.log(`[OEM Adapter] Submitting claim ${header.claim_id} to TML Warranty Portal`, JSON.stringify(payload));
    await new Promise(r => setTimeout(r, 50)); 
    
    // For prototype purposes, simulate a successful response
    const mockResponse: OEMResponse = {
      statusCode: "ACCEPTED",
      approvedAmount: header.total_claimed_amount,
      oemReferenceId: `TML-CLM-${randomUUID().substring(0, 8).toUpperCase()}`
    };

    // Log Response
    await this.logResponse(header.claim_id, mockResponse);

    return mockResponse;
  }

  private async logResponse(claimId: string, response: OEMResponse): Promise<void> {
    await db.execute(
      "INSERT INTO tbl_warranty_oem_responses (response_id, claim_id, status_code, raw_payload, received_at) VALUES (?, ?, ?, ?, ?)",
      [randomUUID(), claimId, response.statusCode, JSON.stringify(response), new Date()]
    );
  }
}
