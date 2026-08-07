export interface Wash {
  wash_id: string;
  job_card_id: string;
  status: string; // PENDING, IN_PROGRESS, COMPLETED
  start_time?: string;
  end_time?: string;
}
