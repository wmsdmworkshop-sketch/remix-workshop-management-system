import { pool as db } from "../../db/index";
import { FsbCampaign, FsbCampaignPriority, FsbCampaignType } from "./fsb-types";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class FsbCampaignManager {
  constructor(private eventBus: IEventBus) {}

  public async createCampaign(
    name: string,
    type: FsbCampaignType,
    priority: FsbCampaignPriority,
    startDate: Date,
    vins: string[]
  ): Promise<{ success: boolean; campaignId?: string }> {
    const campaignId = `FSB-${randomUUID().substring(0, 8).toUpperCase()}`;

    // 1. Create Campaign
    await db.execute(
      "INSERT INTO tbl_fsb_campaign (campaign_id, campaign_name, campaign_type, priority, start_date) VALUES (?, ?, ?, ?, ?)",
      [campaignId, name, type, priority, startDate]
    );

    // 2. Create Initial Version
    await db.execute(
      "INSERT INTO tbl_fsb_campaign_version (version_id, campaign_id, version_number, description) VALUES (?, ?, ?, ?)",
      [`VER-${randomUUID().substring(0,8)}`, campaignId, 1, "Initial creation"]
    );

    // 3. Map Eligibility
    for (const vin of vins) {
      await db.execute(
        "INSERT INTO tbl_fsb_vehicle_eligibility (eligibility_id, campaign_id, vin, eligibility_status) VALUES (?, ?, ?, ?)",
        [`ELIG-${randomUUID().substring(0,8)}`, campaignId, vin, "ELIGIBLE"]
      );
    }

    // 4. Publish Event
    const context = makeSystemContext(`FSB-CREATE-${campaignId}`);
    await this.eventBus.publish("FSB_CREATED", { campaignId, name, type, vehicleCount: vins.length }, context);

    return { success: true, campaignId };
  }
}
