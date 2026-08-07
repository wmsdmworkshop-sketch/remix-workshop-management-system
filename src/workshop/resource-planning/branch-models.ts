export interface Branch {
  branch_id: string;
  name: string; // Kalaburagi, Bidar, Shahapur, Yadgir
  region: string;
  working_hours: { start: string; end: string };
  capacity: number;
  holiday_calendar_id: string;
  weekly_off: string; // e.g., SUNDAY
  operational_status: string; // OPEN, CLOSED, MAINTENANCE
}
