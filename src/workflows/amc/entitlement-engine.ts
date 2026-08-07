import { AmcContract } from "./contract-models";
import { AmcCoverageRules } from "./coverage-models";
import { AmcContractStatus } from "./constants";

export class AmcEntitlementEngine {
  static isContractActive(contract: AmcContract): boolean {
    return contract.contract_status === AmcContractStatus.ACTIVE;
  }

  static validateVehicle(contract: AmcContract, vin: string): boolean {
    return contract.vehicle_vin === vin;
  }

  static validateMileage(contract: AmcContract, currentOdometer: number): boolean {
    return currentOdometer <= contract.kilometer_limit;
  }

  static validateDate(contract: AmcContract, currentDate: string): boolean {
    const start = new Date(contract.start_date).getTime();
    const end = new Date(contract.end_date).getTime();
    const current = new Date(currentDate).getTime();
    return current >= start && current <= end;
  }

  static hasRemainingServices(contract: AmcContract): boolean {
    return contract.remaining_services > 0;
  }

  static isLabourCovered(rules: AmcCoverageRules, labourCode: string): boolean {
    return rules.covered_labour_codes.includes(labourCode) && !rules.excluded_items.includes(labourCode);
  }

  static isPartCovered(rules: AmcCoverageRules, partCategory: string): boolean {
    return rules.covered_part_categories.includes(partCategory) && !rules.excluded_items.includes(partCategory);
  }
}
