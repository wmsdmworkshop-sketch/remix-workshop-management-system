export interface HolidayCalendar {
  calendar_id: string;
  branch_id: string;
  holidays: { date: string; name: string }[];
}
