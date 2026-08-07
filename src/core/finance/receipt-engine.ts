import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { CustomerLedgerEngine } from "./customer-ledger-engine";
import { JournalEngine } from "./journal-engine";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class ReceiptEngine {
  constructor(
    private customerLedger: CustomerLedgerEngine,
    private journalEngine: JournalEngine,
    private eventBus: IEventBus
  ) {}

  public async createReceipt(
    customerId: string,
    amount: number,
    mode: string,
    referenceNumber?: string,
    bank?: string
  ): Promise<{ success: boolean; receiptId?: string; receiptNumber?: string; error?: string }> {
    try {
      const receiptId = `RCPT-${randomUUID().substring(0, 8)}`;
      const receiptNumber = `RC/${Date.now()}`;

      // 1. Save Receipt
      await db.execute(
        "INSERT INTO tbl_receipt (receipt_id, receipt_number, customer_id, amount, mode, reference_number, bank, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'POSTED')",
        [receiptId, receiptNumber, customerId, amount, mode, referenceNumber || null, bank || null]
      );

      // 2. Post to Customer Ledger (Credit decreases receivable)
      await this.customerLedger.postTransaction(
        customerId,
        "RECEIPT",
        receiptId,
        0, // Debit
        amount // Credit
      );

      // 3. Post Journal (Dr Bank/Cash, Cr AR)
      await this.journalEngine.postJournal("RV", "RECEIPT", receiptId, [
        { accountId: "ACC-BANK", debit: amount, credit: 0 },
        { accountId: "ACC-AR", debit: 0, credit: amount }
      ], `Receipt from Customer`);

      const context = makeSystemContext(`RCPT-CREATE-${receiptId}`);
      await this.eventBus.publish("RECEIPT_CREATED", { receiptId, receiptNumber }, context);

      return { success: true, receiptId, receiptNumber };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
