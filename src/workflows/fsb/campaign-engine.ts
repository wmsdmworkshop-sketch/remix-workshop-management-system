import { FsbCampaign } from "./campaign-models";
import { FsbCampaignStatus } from "./constants";

export class FsbCampaignEngine {
  static activate(campaign: FsbCampaign): FsbCampaign {
    if (campaign.status !== FsbCampaignStatus.DRAFT && campaign.status !== FsbCampaignStatus.SUSPENDED) {
      throw new Error(`Cannot activate campaign from status: ${campaign.status}`);
    }
    return { ...campaign, status: FsbCampaignStatus.ACTIVE };
  }

  static suspend(campaign: FsbCampaign): FsbCampaign {
    if (campaign.status !== FsbCampaignStatus.ACTIVE) {
      throw new Error(`Cannot suspend campaign from status: ${campaign.status}`);
    }
    return { ...campaign, status: FsbCampaignStatus.SUSPENDED };
  }

  static close(campaign: FsbCampaign): FsbCampaign {
    return { ...campaign, status: FsbCampaignStatus.CLOSED };
  }

  static cancel(campaign: FsbCampaign): FsbCampaign {
    return { ...campaign, status: FsbCampaignStatus.CANCELLED };
  }
}
