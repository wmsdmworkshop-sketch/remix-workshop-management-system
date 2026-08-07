import { FsbCampaign } from "./campaign-models";
import { FsbClosureRules } from "./closure-rules";

export class FsbClosureEngine {
  static evaluateClosureReadiness(campaign: FsbCampaign, coveragePercent: number): boolean {
    if (FsbClosureRules.AUTO_CLOSE_ON_EXPIRY) {
      if (new Date() > new Date(campaign.expiry_date)) {
        return true;
      }
    }
    
    if (coveragePercent >= FsbClosureRules.MIN_COMPLETION_PERCENTAGE_FOR_CLOSURE) {
      return true;
    }
    
    return false;
  }
}
