export interface Shift {
  shift_id: string;
  name: string; // MORNING, GENERAL, EVENING, NIGHT
  start_time: string;
  end_time: string;
  roster: { technician_id: string; date: string }[];
  overtime_allowed: boolean;
}
