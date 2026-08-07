export interface Leave {
  leave_id: string;
  technician_id: string;
  start_date: string;
  end_date: string;
  status: string; // APPROVED, REJECTED, PENDING
  replacement_technician_id?: string;
}

export interface HolidayCalendar {
  calendar_id: string;
  holidays: { date: string; name: string }[];
}
