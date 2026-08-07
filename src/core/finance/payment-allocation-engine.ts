import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class PaymentAllocationEngine {
  constructor(private eventBus: IEventBus) {}

  public async allocatePayment(
    receiptId: string,
    invoiceId: string,
    amountToAllocate: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Basic validation (in a real system we'd check if receipt has unallocated amount, invoice has pending amount, etc.)
      const allocationId = `ALLOC-${randomUUID().substring(0, 8)}`;

      await db.execute(
        "INSERT INTO tbl_payment_allocation (allocation_id, receipt_id, invoice_id, allocated_amount) VALUES (?, ?, ?, ?)",
        [allocationId, receiptId, invoiceId, amountToAllocate]
      );

      const context = makeSystemContext(`ALLOC-${allocationId}`);
      await this.eventBus.publish("PAYMENT_ALLOCATED", {
        allocationId,
        receiptId,
        invoiceId,
        amountToAllocate
      }, context);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
