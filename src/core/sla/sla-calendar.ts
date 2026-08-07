import { pool as db } from "../../db/index";

export class SLACalendar {
  /**
   * Retrieves whether a given date is a working day for a specific workshop.
   * If workshop_id is null, it checks global calendar rules.
   */
  public static async isWorkingDay(date: Date, workshopId: number | null): Promise<boolean> {
    const formattedDate = date.toISOString().split("T")[0];
    
    // Check specific workshop first
    if (workshopId) {
      const [rows] = await db.execute(
        "SELECT is_working_day FROM tbl_business_calendar WHERE date = ? AND workshop_id = ?",
        [formattedDate, workshopId]
      ) as any[];
      if (rows && rows.length > 0) return rows[0].is_working_day === 1;
    }

    // Check global calendar
    const [globalRows] = await db.execute(
      "SELECT is_working_day FROM tbl_business_calendar WHERE date = ? AND workshop_id IS NULL",
      [formattedDate]
    ) as any[];
    
    if (globalRows && globalRows.length > 0) return globalRows[0].is_working_day === 1;

    // Default fallback (Mon-Fri are working, Sat-Sun are not)
    const day = date.getDay();
    return day !== 0 && day !== 6; 
  }

  /**
   * Adjusts the end time by adding business minutes.
   * This is a simplified implementation that skips non-working days.
   * In a real enterprise system, it would accurately skip non-working hours too.
   */
  public static async addBusinessMinutes(startTime: Date, minutesToAdd: number, workshopId: number | null, is24x7: boolean): Promise<Date> {
    if (is24x7) {
      return new Date(startTime.getTime() + minutesToAdd * 60000);
    }

    let current = new Date(startTime);
    let remainingMinutes = minutesToAdd;

    while (remainingMinutes > 0) {
      // Very basic business hours simulation (assuming 9 AM to 6 PM, 9 hours = 540 mins/day)
      const isWorking = await this.isWorkingDay(current, workshopId);
      if (isWorking) {
        // Just adding time directly for simplicity in this prototype.
        // A full implementation would check shift_start_time and shift_end_time bounds per day.
        current = new Date(current.getTime() + remainingMinutes * 60000);
        remainingMinutes = 0;
      } else {
        // Skip to next day at 09:00 AM
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
      }
    }
    
    return current;
  }
}
