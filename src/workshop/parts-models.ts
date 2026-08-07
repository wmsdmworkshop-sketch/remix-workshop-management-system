export interface PartRequisition {
  requisition_id: string;
  job_card_id: string;
  part_number: string;
  quantity: number;
  
  status: string; // REQUESTED, ISSUED, BACKORDER, SUBSTITUTED, RETURNED, RESERVED
  
  substitution_part_number?: string;
  core_return_required: boolean;
  warranty_part: boolean;
  
  issue_time?: string;
  return_time?: string;
}
