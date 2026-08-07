export interface FsbEligibilityCheck {
  campaign_id: string;
  vin: string;
  status: string; // ELIGIBLE, ALREADY_COMPLETED, EXPIRED, REJECTED, PENDING
  reason?: string;
  checked_date: string;
}
