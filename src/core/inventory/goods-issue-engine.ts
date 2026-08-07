import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { StockLedgerEngine } from "./stock-ledger-engine";

export class GoodsIssueEngine {
  constructor(
    private eventBus: IEventBus,
    private ledgerEngine: StockLedgerEngine
  ) {}

  public async issueReservedStock(
    reservationNumber: string,
    warehouseId: string,
    technicianId: string,
    performedBy: string
  ): Promise<{ success: boolean; issueNumber?: string }> {
    const [resv] = await db.execute(
      "SELECT job_card_id, part_number, reserved_quantity, issued_quantity FROM tbl_stock_reservation WHERE reservation_number = ? AND status = 'OPEN'",
      [reservationNumber]
    ) as any[];

    if (resv.length === 0) {
      throw new Error("Invalid or already closed reservation");
    }

    const partNumber = resv[0].part_number;
    const jobCardId = resv[0].job_card_id;
    const qtyToIssue = parseFloat(resv[0].reserved_quantity) - parseFloat(resv[0].issued_quantity);

    if (qtyToIssue <= 0) throw new Error("No quantity left to issue");

    // We do NOT decrement availability again. It was decremented at reservation.
    // However, the ledger MUST deduct physical current_quantity. We pass -qtyToIssue
    // But since our Ledger Engine treats Adjustment specially, we must handle this carefully.
    // The LedgerEngine deducts both current & available. Since available was ALREADY deducted, 
    // we need to offset the available deduction during Issue.
    
    // 1. Log the Issue transaction
    const issueNumber = `GI-${randomUUID().substring(0,8).toUpperCase()}`;
    await db.execute(
      "INSERT INTO tbl_goods_issue (issue_number, job_card_id, part_number, issued_quantity, warehouse_id, technician_id) VALUES (?, ?, ?, ?, ?, ?)",
      [issueNumber, jobCardId, partNumber, qtyToIssue, warehouseId, technicianId]
    );

    // 2. Manually adjust physical current stock and reserved stock
    const [stocks] = await db.execute(
        "SELECT stock_id, current_quantity, reserved_quantity, average_cost FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?",
        [partNumber, warehouseId]
    ) as any[];

    const currentQty = parseFloat(stocks[0].current_quantity);
    const newCurrentQty = currentQty - qtyToIssue;
    const newReservedQty = parseFloat(stocks[0].reserved_quantity) - qtyToIssue;
    const unitCost = parseFloat(stocks[0].average_cost);

    await db.execute(
        "UPDATE tbl_inventory_stock SET current_quantity = ?, reserved_quantity = ? WHERE stock_id = ?",
        [newCurrentQty, newReservedQty, stocks[0].stock_id]
    );

    // 3. Append to Ledger
    const transactionId = `TXN-${randomUUID().substring(0, 8)}`;
    await db.execute(
      "INSERT INTO tbl_stock_transaction (transaction_id, transaction_type, part_number, warehouse_id, reference_type, reference_id, quantity, unit_cost, running_balance, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [transactionId, 'ISSUE', partNumber, warehouseId, 'ISSUE_NO', issueNumber, -qtyToIssue, unitCost, newCurrentQty, performedBy]
    );

    // 4. Close reservation
    await db.execute(
      "UPDATE tbl_stock_reservation SET issued_quantity = ?, status = 'CLOSED' WHERE reservation_number = ?",
      [qtyToIssue, reservationNumber]
    );

    const context = makeSystemContext(`GI-CREATE-${issueNumber}`);
    await this.eventBus.publish("GOODS_ISSUED", { issueNumber, jobCardId, partNumber, qty: qtyToIssue }, context);

    return { success: true, issueNumber };
  }
}
