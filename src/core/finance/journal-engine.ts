import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { JournalLine, VoucherType } from "./finance-types";
import { PeriodEngine } from "./period-engine";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class JournalEngine {
  constructor(
    private periodEngine: PeriodEngine,
    private eventBus: IEventBus
  ) {}

  public async postJournal(
    voucherType: VoucherType,
    referenceType: string,
    referenceId: string,
    lines: JournalLine[],
    narration: string,
    postingDate: Date = new Date()
  ): Promise<{ success: boolean; journalId?: string; error?: string }> {
    try {
      // 1. Period Validation
      await this.periodEngine.validatePostingDate(postingDate);
      const periodId = await this.periodEngine.getActivePeriod(postingDate);

      // 2. Double-Entry Validation (Dr == Cr)
      const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

      // We use a small epsilon for floating point math safety
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Double-entry validation failed: Debit (${totalDebit}) != Credit (${totalCredit})`);
      }

      const journalId = `JV-${randomUUID().substring(0, 8)}`;
      const journalNumber = `${voucherType}-${Date.now()}`;

      // 3. Post Header
      await db.execute(
        "INSERT INTO tbl_financial_journal (journal_id, journal_number, voucher_type, reference_type, reference_id, posting_date, status, total_debit, total_credit, period_id, narration) VALUES (?, ?, ?, ?, ?, ?, 'POSTED', ?, ?, ?, ?)",
        [journalId, journalNumber, voucherType, referenceType, referenceId, postingDate, totalDebit, totalCredit, periodId, narration]
      );

      // 4. Post Lines with Cost Centers
      for (const line of lines) {
        const lineId = `JVL-${randomUUID().substring(0, 8)}`;
        await db.execute(
          "INSERT INTO tbl_financial_journal_line (journal_line_id, journal_id, account_id, debit, credit, cost_center_branch, cost_center_dept, cost_center_entity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [lineId, journalId, line.accountId, line.debit, line.credit, line.costCenterBranch || null, line.costCenterDept || null, line.costCenterEntity || null]
        );
      }

      // 5. Emit Event
      const context = makeSystemContext(`JV-POST-${journalId}`);
      await this.eventBus.publish("JOURNAL_POSTED", {
        journalId,
        journalNumber,
        referenceId
      }, context);

      return { success: true, journalId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
