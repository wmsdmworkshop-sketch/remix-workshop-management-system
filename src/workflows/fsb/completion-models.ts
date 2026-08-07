export interface FsbCompletionRecord {
  campaign_id: string;
  vin: string;
  job_card_id: string;
  technician_id: string;
  service_advisor_id: string;
  repair_date: string;
  parts_used: any[];
  labour_hours: number;
  invoice_id?: string;
  warranty_claim_id?: string;
  goodwill_case_id?: string;
  completion_status: string; // IN_PROGRESS, COMPLETED, INSPECTED_OK
}
