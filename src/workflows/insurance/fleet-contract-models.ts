/**
 * FleetContract DTO — standalone (does not extend ProgramDefinition to avoid incompatibility).
 * Fleet contract domain-specific data.
 */
export interface FleetContract {
  contract_number: string;
  fleet_customer_id: string;
  contract_type: string;
  effective_date: string;
  expiry_date: string;
  vehicle_list: string[]; // VINs
  status: string; // ACTIVE, EXPIRED, SUSPENDED
  
  service_limits?: number;
  km_limits?: number;
}
