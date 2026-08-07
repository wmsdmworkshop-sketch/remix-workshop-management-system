export class DateHelper {
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  static isExpired(targetDate: string): boolean {
    return new Date().getTime() > new Date(targetDate).getTime();
  }

  static addDays(date: string, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }
}
