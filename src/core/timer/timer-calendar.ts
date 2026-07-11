/**
 * =============================================================================
 * WOS Core Architecture: Enterprise Timer Calendar
 * Bounded Context: Core System / Timer Platform
 * Description: Manages calendars, shifts, holidays, and multipliers.
 * =============================================================================
 */

export class TimerCalendar {
  private holidays: Set<string> = new Set();
  private startHour = 9; // 09:00
  private endHour = 18;  // 18:00

  constructor() {
    this.holidays.add("2026-01-01");
    this.holidays.add("2026-12-25");
  }

  public registerHoliday(dateStr: string): void {
    this.holidays.add(dateStr);
  }

  public isHoliday(date: Date): boolean {
    const formatted = date.toISOString().split("T")[0];
    return this.holidays.has(formatted);
  }

  public isWorkingTime(date: Date): boolean {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // weekends

    const hour = date.getHours();
    return hour >= this.startHour && hour < this.endHour;
  }

  /**
   * Calculates SLA limits by applying priority and context multipliers.
   */
  public calculateLimitMinutes(
    baseMinutes: number,
    multipliers: {
      isVip?: boolean;
      isEmergency?: boolean;
      isFleet?: boolean;
    }
  ): number {
    let multiplier = 1.0;
    if (multipliers.isEmergency) {
      multiplier *= 0.3;
    } else if (multipliers.isVip) {
      multiplier *= 0.5;
    } else if (multipliers.isFleet) {
      multiplier *= 0.7;
    }
    return Math.max(1, Math.round(baseMinutes * multiplier));
  }
}
