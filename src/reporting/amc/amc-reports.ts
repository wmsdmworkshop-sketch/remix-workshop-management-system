export interface AmcContractRegisterReport {
  contract_number: string;
  customer_name: string;
  vehicle_vin: string;
  plan_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface AmcContractAgingReport {
  contracts_expiring_30_days: number;
  contracts_expiring_60_days: number;
  contracts_expiring_90_days: number;
  expired_contracts: number;
}

export interface AmcRenewalReport {
  total_renewals_due: number;
  renewals_proposed: number;
  renewals_approved: number;
  renewals_lost: number;
  conversion_rate: number;
}

export interface AmcCoverageUtilizationReport {
  plan_type: string;
  total_contracts: number;
  total_services_availed: number;
  average_utilization: number; // percentage
}
