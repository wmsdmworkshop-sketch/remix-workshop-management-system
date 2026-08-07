import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { GoodwillCategory, GoodwillWorkflowState } from "./goodwill-types";
import { GoodwillEligibilityEngine } from "./goodwill-eligibility-engine";
import { CostSharingEngine } from "./cost-sharing-engine";

export class GoodwillRequestManager {
  constructor(private eventBus: IEventBus) {}

  public async createRequest(
    vin: string,
    category: GoodwillCategory,
    requestedAmount: number,
    dealerPct: number,
    oemPct: number,
    customerPct: number,
    dealerLimit?: number,
    oemLimit?: number,
    reason?: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    
    const requestId = `GW-${randomUUID().substring(0, 8).toUpperCase()}`;

    // 1. Pre-evaluate request
    const recommendation = GoodwillEligibilityEngine.evaluateRequest(vin, requestedAmount, category);
    
    // 2. Validate Cost Sharing Percentages sum to 100
    try {
      CostSharingEngine.calculateSplit(requestedAmount, dealerPct, dealerLimit, oemPct, oemLimit, customerPct);
    } catch (e: any) {
      return { success: false, error: e.message };
    }

    // 3. Create Request
    await db.execute(
      "INSERT INTO tbl_goodwill_request (request_id, vin, category, requested_amount, dealer_share_pct, dealer_share_limit, oem_share_pct, oem_share_limit, customer_share_pct, reason, workflow_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [requestId, vin, category, requestedAmount, dealerPct, dealerLimit || null, oemPct, oemLimit || null, customerPct, reason || "", "DRAFT"]
    );

    // 4. Publish Event
    const context = makeSystemContext(`GW-CREATE-${requestId}`);
    await this.eventBus.publish("GOODWILL_REQUESTED", { 
      requestId, vin, category, requestedAmount, recommendation 
    }, context);

    return { success: true, requestId };
  }

  public async updateState(
    requestId: string,
    newState: GoodwillWorkflowState,
    remarks?: string
  ): Promise<void> {
    
    await db.execute(
      "UPDATE tbl_goodwill_request SET workflow_state = ? WHERE request_id = ?",
      [newState, requestId]
    );

    const context = makeSystemContext(`GW-STATE-${requestId}`);
    
    let eventName = "GOODWILL_UPDATED";
    if (newState === "OEM_APPROVAL" || newState === "SETTLEMENT") {
      eventName = "GOODWILL_APPROVED";
    } else if (newState === "REJECTED") {
      eventName = "GOODWILL_REJECTED";
    }

    await this.eventBus.publish(eventName, { requestId, state: newState, remarks }, context);
  }
}
