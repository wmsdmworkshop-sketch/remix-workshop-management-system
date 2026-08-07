import { ProgramDefinition } from "../common/program-definition";

export interface AmcContract extends ProgramDefinition {
  contract_number: string;
  customer_id: string;
  vehicle_vin: string;
  vehicle_registration: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  validity_months: number;
  kilometer_limit: number;
  engine_hours_limit?: number;
  coverage_type: string;
  contract_value: number;
  remaining_value: number;
  remaining_services: number;
  auto_renewal: boolean;
  contract_status: string;
}
