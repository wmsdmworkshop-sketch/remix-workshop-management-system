export interface VehicleDelivery {
  delivery_id: string;
  job_card_id: string;
  
  invoice_linked: boolean;
  payment_status: string; // PENDING, PARTIAL, COMPLETED
  
  customer_signature_url?: string;
  photos: string[];
  
  delivery_checklist: {
    item: string;
    checked: boolean;
  }[];
  
  status: string; // READY_FOR_DELIVERY, DELIVERED
  delivery_time?: string;
}
