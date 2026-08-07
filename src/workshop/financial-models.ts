export interface WorkshopFinancials {
  job_card_id: string;
  
  labour_revenue: number;
  parts_revenue: number;
  sublet_revenue: number;
  
  total_discount: number;
  total_tax: number;
  net_revenue: number;
  
  payment_status: string; // PENDING, PARTIAL, COMPLETED
  payment_method?: string; // CASH, CARD, UPI, BANK_TRANSFER
}
