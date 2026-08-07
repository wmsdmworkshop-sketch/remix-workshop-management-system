export interface AmcCoverageRules {
  rule_id: string;
  plan_type: string;
  covered_labour_codes: string[];
  covered_part_categories: string[];
  covered_consumables: boolean;
  covered_lubricants: boolean;
  covered_fluids: boolean;
  covered_filters: boolean;
  excluded_items: string[];
  excludes_wear_and_tear: boolean;
  excludes_accident_damage: boolean;
  excludes_misuse: boolean;
  excludes_abuse: boolean;
}
