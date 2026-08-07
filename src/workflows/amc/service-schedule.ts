export interface AmcServiceSchedule {
  schedule_id: string;
  contract_type: string;
  services: AmcServiceDefinition[];
}

export interface AmcServiceDefinition {
  service_number: number;
  service_name: string;
  trigger_type: string; // DATE, ODOMETER, ENGINE_HOURS
  trigger_value_months?: number;
  trigger_value_odometer?: number;
  trigger_value_hours?: number;
  grace_period_days: number;
  grace_period_odometer: number;
  covered_labour_codes: string[];
  covered_parts: string[];
}
