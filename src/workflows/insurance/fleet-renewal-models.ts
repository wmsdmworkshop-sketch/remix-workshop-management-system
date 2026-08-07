export interface FleetRenewal {
  contract_id: string;
  new_expiry_date: string;
  renewal_status: string; // PENDING, COMPLETED, EXPIRED
  auto_renewed: boolean;
}
