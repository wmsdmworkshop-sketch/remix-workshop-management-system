import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class CustomerLedgerEngine {
  constructor(private eventBus: IEventBus) {}

  public async postTransaction(
    customerId: string,
    referenceType: string,
    referenceId: string,
    debit: number,
    credit: number
  ): Promise<{ success: boolean; entryId?: string; error?: string }> {
    try {
      // 1. Get current balance
      const [lastEntry] = await db.execute(
        "SELECT running_balance FROM tbl_customer_ledger WHERE customer_id = ? ORDER BY transaction_date DESC LIMIT 1",
        [customerId]
      ) as any[];

      const currentBalance = lastEntry.length > 0 ? parseFloat(lastEntry[0].running_balance) : 0;
      
      // Debit increases receivable, Credit decreases receivable
      const newBalance = currentBalance + debit - credit;

      // 2. Insert Append-Only Ledger Entry
      const entryId = `CL-${randomUUID().substring(0, 8)}`;
      await db.execute(
        "INSERT INTO tbl_customer_ledger (ledger_entry_id, customer_id, reference_type, reference_id, debit, credit, running_balance) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [entryId, customerId, referenceType, referenceId, debit, credit, newBalance]
      );

      // 3. Publish Event
      const context = makeSystemContext(`CL-POST-${entryId}`);
      await this.eventBus.publish("LEDGER_UPDATED", {
        ledger: "CUSTOMER",
        customerId,
        entryId,
        newBalance
      }, context);

      return { success: true, entryId };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
