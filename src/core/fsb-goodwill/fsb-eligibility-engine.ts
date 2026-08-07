import { pool as db } from "../../db/index";
import { FsbCampaign, FsbEligibilityStatus } from "./fsb-types";
import { randomUUID } from "crypto";

export class FsbEligibilityEngine {
  
  /**
   * Evaluates if a vehicle is eligible for a given campaign.
   */
  public static async evaluateEligibility(
    campaignId: string,
    vin: string
  ): Promise<{ status: FsbEligibilityStatus; reason?: string }> {
    
    // 1. Fetch Campaign
    const [campaigns] = await db.execute(
      "SELECT * FROM tbl_fsb_campaign WHERE campaign_id = ?",
      [campaignId]
    ) as any[];

    if (!campaigns || campaigns.length === 0) {
      return { status: "NOT_APPLICABLE", reason: "Campaign not found" };
    }
    const campaign = campaigns[0] as FsbCampaign;

    // 2. Validate Campaign Date Bounds
    const now = new Date();
    if (now < new Date(campaign.start_date)) {
      return { status: "NOT_APPLICABLE", reason: "Campaign has not started yet" };
    }
    if (campaign.end_date && now > new Date(campaign.end_date)) {
      return { status: "EXPIRED", reason: "Campaign expired" };
    }

    if (campaign.status !== "ACTIVE") {
       return { status: "NOT_APPLICABLE", reason: `Campaign status is ${campaign.status}` };
    }

    // 3. Check existing execution history
    const [executions] = await db.execute(
      "SELECT * FROM tbl_fsb_execution WHERE campaign_id = ? AND vin = ? AND execution_status IN ('COMPLETED', 'OEM_VERIFIED')",
      [campaignId, vin]
    ) as any[];

    if (executions && executions.length > 0) {
      return { status: "COMPLETED", reason: "Vehicle has already completed this campaign" };
    }

    // 4. Check explicit eligibility mapping (tbl_fsb_vehicle_eligibility)
    const [eligibilityRecords] = await db.execute(
      "SELECT * FROM tbl_fsb_vehicle_eligibility WHERE campaign_id = ? AND vin = ?",
      [campaignId, vin]
    ) as any[];

    if (!eligibilityRecords || eligibilityRecords.length === 0) {
      // In a real scenario, this might also check `applicable_vehicle_categories` if mapping isn't 1:1.
      return { status: "NOT_APPLICABLE", reason: "VIN is not mapped to this campaign" };
    }

    const record = eligibilityRecords[0];

    // Snapshot state if it changes during evaluation (simulate)
    if (record.eligibility_status !== "ELIGIBLE") {
      return { status: record.eligibility_status as FsbEligibilityStatus, reason: record.reason };
    }

    return { status: "ELIGIBLE", reason: "Vehicle is mapped and has not completed the campaign" };
  }

  /**
   * Captures an audit snapshot for eligibility changes.
   */
  public static async captureSnapshot(
    eligibilityId: string,
    previousStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<void> {
    await db.execute(
      "INSERT INTO tbl_fsb_eligibility_snapshot (snapshot_id, eligibility_id, previous_status, new_status, reason) VALUES (?, ?, ?, ?, ?)",
      [`SNAP-${randomUUID().substring(0,8)}`, eligibilityId, previousStatus, newStatus, reason || '']
    );
  }
}
