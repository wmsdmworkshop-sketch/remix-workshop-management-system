import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { TransactionType } from "./inventory-types";

export class StockLedgerEngine {
  constructor(private eventBus: IEventBus) {}

  public async postTransaction(
    type: TransactionType,
    partNumber: string,
    warehouseId: string,
    quantity: number, // positive for in, negative for out
    unitCost: number,
    referenceType: string,
    referenceId: string,
    performedBy: string,
    reason?: string,
    binId?: string
  ): Promise<{ success: boolean; transactionId?: string }> {
    // 1. Get current physical balance from cache
    const [stocks] = await db.execute(
      "SELECT stock_id, current_quantity, available_quantity FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?",
      [partNumber, warehouseId]
    ) as any[];

    let currentStock = 0;
    let availableStock = 0;
    let stockId = null;

    if (stocks.length > 0) {
      currentStock = parseFloat(stocks[0].current_quantity);
      availableStock = parseFloat(stocks[0].available_quantity);
      stockId = stocks[0].stock_id;
    } else {
      stockId = `STK-${randomUUID().substring(0,8)}`;
      await db.execute(
        "INSERT INTO tbl_inventory_stock (stock_id, part_number, warehouse_id, current_quantity, available_quantity) VALUES (?, ?, ?, 0, 0)",
        [stockId, partNumber, warehouseId]
      );
    }

    const newRunningBalance = currentStock + quantity;
    // Note: Stock Adjustments immediately impact both current & available
    const newAvailableBalance = availableStock + quantity;

    if (newRunningBalance < 0) {
      throw new Error(`Insufficient physical stock for ${partNumber}. Current: ${currentStock}, Requested: ${Math.abs(quantity)}`);
    }

    // 2. Append to ledger
    const transactionId = `TXN-${randomUUID().substring(0, 8)}`;
    await db.execute(
      "INSERT INTO tbl_stock_transaction (transaction_id, transaction_type, part_number, warehouse_id, bin_id, reference_type, reference_id, quantity, unit_cost, running_balance, performed_by, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [transactionId, type, partNumber, warehouseId, binId || null, referenceType, referenceId, quantity, unitCost, newRunningBalance, performedBy, reason || null]
    );

    // 3. Update cache safely
    await db.execute(
      "UPDATE tbl_inventory_stock SET current_quantity = ?, available_quantity = ? WHERE stock_id = ?",
      [newRunningBalance, newAvailableBalance, stockId]
    );

    const context = makeSystemContext(`LEDGER-${transactionId}`);
    
    if (type === "ADJUSTMENT") {
      await this.eventBus.publish("STOCK_ADJUSTED", { transactionId, partNumber, warehouseId, quantity, reason }, context);
    }

    return { success: true, transactionId };
  }
}
