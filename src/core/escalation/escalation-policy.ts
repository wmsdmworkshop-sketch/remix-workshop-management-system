/**
 * =============================================================================
 * WOS Core Architecture: Escalation Policy Engine
 * Bounded Context: Core System / SLA Escalations
 * Description: Manages working hours, calendars, shift mappings, and SLA multipliers.
 * =============================================================================
 */

export interface WorkingHours {
  startHour: number;  // e.g. 9 for 09:00
  endHour: number;    // e.g. 18 for 18:00
}

export class EscalationPolicy {
  private holidays: Set<string> = new Set();
  private workingHours: WorkingHours = { startHour: 9, endHour: 18 };

  constructor() {
    // Add default test holidays (YYYY-MM-DD)
    this.holidays.add("2026-01-01");
    this.holidays.add("2026-12-25");
  }

  public registerHoliday(dateStr: string) {
    this.holidays.add(dateStr);
  }

  public isHoliday(date: Date): boolean {
    const formatted = date.toISOString().split("T")[0];
    return this.holidays.has(formatted);
  }

  public isWorkingHour(date: Date): boolean {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // weekend check

    const hour = date.getHours();
    return hour >= this.workingHours.startHour && hour < this.workingHours.endHour;
  }

  /**
   * Adjusts the base minutes limit of an escalation rule using multiplier priorities.
   */
  public calculateLimitMinutes(
    baseMinutes: number,
    multipliers: {
      isVip?: boolean;
      isEmergency?: boolean;
      isFleet?: boolean;
      priorityLevel?: "LOW" | "MEDIUM" | "HIGH";
    }
  ): number {
    let multiplier = 1.0;

    if (multipliers.isEmergency) {
      multiplier *= 0.3; // Emergency is urgent
    } else if (multipliers.isVip) {
      multiplier *= 0.5; // VIP priority
    } else if (multipliers.isFleet) {
      multiplier *= 0.7; // Fleet priority
    }

    if (multipliers.priorityLevel === "HIGH") {
      multiplier *= 0.8;
    } else if (multipliers.priorityLevel === "LOW") {
      multiplier *= 1.2;
    }

    return Math.max(1, Math.round(baseMinutes * multiplier));
  }
}
