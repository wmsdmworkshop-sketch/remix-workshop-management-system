import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class StockTransferEngine {
  constructor(private eventBus: IEventBus) {}

  public async dispatchTransfer(
    partNumber: string,
    sourceWarehouse: string,
    destWarehouse: string,
    quantity: number
  ): Promise<{ success: boolean; transferNumber?: string }> {
    const transferNumber = `TRF-${randomUUID().substring(0,8).toUpperCase()}`;

    // Decrease from source
    const [stocks] = await db.execute(
      "SELECT stock_id, current_quantity, available_quantity FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?",
      [partNumber, sourceWarehouse]
    ) as any[];

    if (stocks.length === 0 || parseFloat(stocks[0].available_quantity) < quantity) {
      throw new Error(`Insufficient stock for transfer at source ${sourceWarehouse}`);
    }

    const newCurrent = parseFloat(stocks[0].current_quantity) - quantity;
    const newAvailable = parseFloat(stocks[0].available_quantity) - quantity;

    await db.execute(
      "UPDATE tbl_inventory_stock SET current_quantity = ?, available_quantity = ? WHERE stock_id = ?",
      [newCurrent, newAvailable, stocks[0].stock_id]
    );

    // Create Transfer Record
    await db.execute(
      "INSERT INTO tbl_stock_transfer (transfer_number, source_warehouse_id, destination_warehouse_id, part_number, quantity, status, dispatch_time) VALUES (?, ?, ?, ?, ?, 'IN_TRANSIT', NOW())",
      [transferNumber, sourceWarehouse, destWarehouse, partNumber, quantity]
    );

    const context = makeSystemContext(`TRF-DISP-${transferNumber}`);
    await this.eventBus.publish("TRANSFER_INITIATED", { transferNumber, sourceWarehouse, destWarehouse }, context);

    return { success: true, transferNumber };
  }

  public async receiveTransfer(
    transferNumber: string
  ): Promise<{ success: boolean }> {
    const [trfs] = await db.execute(
      "SELECT part_number, destination_warehouse_id, quantity FROM tbl_stock_transfer WHERE transfer_number = ? AND status = 'IN_TRANSIT'",
      [transferNumber]
    ) as any[];

    if (trfs.length === 0) throw new Error("Transfer not found or not in transit");

    const { part_number, destination_warehouse_id, quantity } = trfs[0];
    const qty = parseFloat(quantity);

    // Increase at destination
    const [stocks] = await db.execute(
      "SELECT stock_id, current_quantity, available_quantity FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?",
      [part_number, destination_warehouse_id]
    ) as any[];

    if (stocks.length > 0) {
      const newCurrent = parseFloat(stocks[0].current_quantity) + qty;
      const newAvailable = parseFloat(stocks[0].available_quantity) + qty;
      await db.execute(
        "UPDATE tbl_inventory_stock SET current_quantity = ?, available_quantity = ? WHERE stock_id = ?",
        [newCurrent, newAvailable, stocks[0].stock_id]
      );
    } else {
      await db.execute(
        "INSERT INTO tbl_inventory_stock (stock_id, part_number, warehouse_id, current_quantity, available_quantity) VALUES (?, ?, ?, ?, ?)",
        [`STK-${randomUUID().substring(0,8)}`, part_number, destination_warehouse_id, qty, qty]
      );
    }

    await db.execute(
      "UPDATE tbl_stock_transfer SET status = 'RECEIVED', receipt_time = NOW() WHERE transfer_number = ?",
      [transferNumber]
    );

    const context = makeSystemContext(`TRF-RECV-${transferNumber}`);
    await this.eventBus.publish("TRANSFER_COMPLETED", { transferNumber, destination_warehouse_id }, context);

    return { success: true };
  }
}
