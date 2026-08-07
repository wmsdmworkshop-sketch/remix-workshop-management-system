import { pool as db } from "../../db/index";
import { CoverageEvaluationResult, CoverageItemType, AmcCoverageRule } from "./amc-types";

export class AmcCoverageEngine {
  
  /**
   * Evaluates coverage with graded decisions for enterprise fleet scalability.
   */
  public static async evaluateItemCoverage(
    productId: string,
    itemType: CoverageItemType,
    itemCode?: string
  ): Promise<CoverageEvaluationResult> {
    
    // First check for specific part exclusions/inclusions
    if (itemCode) {
      const [specificRules] = await db.execute(
        "SELECT * FROM tbl_amc_coverage WHERE product_id = ? AND item_type = 'SPECIFIC_PART' AND item_code = ? AND is_active = 1",
        [productId, itemCode]
      ) as any[];

      if (specificRules && specificRules.length > 0) {
        const rule = specificRules[0] as AmcCoverageRule;
        return this.mapRuleToDecision(rule);
      }
    }

    // Fallback to category level rules (e.g., all LABOUR)
    const [categoryRules] = await db.execute(
      "SELECT * FROM tbl_amc_coverage WHERE product_id = ? AND item_type = ? AND item_code IS NULL AND is_active = 1",
      [productId, itemType]
    ) as any[];

    if (categoryRules && categoryRules.length > 0) {
      const rule = categoryRules[0] as AmcCoverageRule;
      return this.mapRuleToDecision(rule);
    }

    // Default: Not covered
    return {
      decision: "REJECTED",
      percentage_covered: 0,
      reason: `No coverage rule found for product ${productId} on ${itemType}`
    };
  }

  private static mapRuleToDecision(rule: AmcCoverageRule): CoverageEvaluationResult {
    const percentage = Number(rule.coverage_percentage);
    
    if (percentage === 100) {
      return { decision: "FULL_COVERAGE", percentage_covered: 100 };
    } 
    
    if (percentage > 0) {
      // If partial, flag for approval depending on business policy. We'll default to PARTIAL.
      // If it's something sensitive (e.g. 99%), we could return APPROVAL_REQUIRED.
      if (percentage < 50) {
          return { decision: "APPROVAL_REQUIRED", percentage_covered: percentage, reason: "Coverage is below 50%, requires manager approval" };
      }
      return { decision: "PARTIAL_COVERAGE", percentage_covered: percentage };
    }

    return { decision: "REJECTED", percentage_covered: 0, reason: "Explicitly excluded (0% coverage)" };
  }
}
