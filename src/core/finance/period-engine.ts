import { pool as db } from "../../db/index";
import { PeriodStatus } from "./finance-types";

export class PeriodEngine {
  public async validatePostingDate(postingDate: Date): Promise<boolean> {
    const [periods] = await db.execute(
      "SELECT status FROM tbl_financial_period WHERE start_date <= ? AND end_date >= ?",
      [postingDate, postingDate]
    ) as any[];

    if (periods.length === 0) {
      throw new Error(`No financial period found for date: ${postingDate.toISOString()}`);
    }

    const status = periods[0].status as PeriodStatus;
    
    if (status === 'CLOSED') {
      throw new Error(`Financial period is CLOSED for date: ${postingDate.toISOString()}`);
    }
    
    if (status === 'LOCKED') {
      throw new Error(`Financial period is LOCKED for date: ${postingDate.toISOString()}`);
    }

    return true; // OPEN
  }

  public async getActivePeriod(postingDate: Date): Promise<string> {
    const [periods] = await db.execute(
      "SELECT period_id FROM tbl_financial_period WHERE start_date <= ? AND end_date >= ?",
      [postingDate, postingDate]
    ) as any[];

    if (periods.length === 0) {
      throw new Error("No active financial period found");
    }

    return periods[0].period_id;
  }
}
