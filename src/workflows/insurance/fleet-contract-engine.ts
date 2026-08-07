import { FleetContract } from "./fleet-contract-models";
import { FleetRenewal } from "./fleet-renewal-models";
import { FleetRenewalRules } from "./renewal-rules";

export class FleetContractEngine {
  static activate(contract: FleetContract): FleetContract {
    return { ...contract, status: "ACTIVE" };
  }

  static suspend(contract: FleetContract): FleetContract {
    return { ...contract, status: "SUSPENDED" };
  }

  static processRenewal(contract: FleetContract): FleetRenewal {
    const originalExpiry = new Date(contract.expiry_date);
    const newExpiry = new Date(originalExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);
    
    return {
      contract_id: contract.contract_number,
      new_expiry_date: newExpiry.toISOString(),
      renewal_status: "PENDING",
      auto_renewed: FleetRenewalRules.AUTO_RENEW_ELIGIBLE
    };
  }
}
