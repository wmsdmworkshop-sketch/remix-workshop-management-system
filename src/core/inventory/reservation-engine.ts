import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class ReservationEngine {
  constructor(private eventBus: IEventBus) {}

  public async reserveStock(
    jobCardId: string,
    partNumber: string,
    warehouseId: string,
    quantity: number
  ): Promise<{ success: boolean; reservationNumber?: string }> {
    // 1. Check if we have enough Available Stock
    const [stocks] = await db.execute(
      "SELECT stock_id, available_quantity, reserved_quantity FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?",
      [partNumber, warehouseId]
    ) as any[];

    if (stocks.length === 0 || parseFloat(stocks[0].available_quantity) < quantity) {
      throw new Error(`Insufficient available stock for ${partNumber} to fulfill reservation of ${quantity}.`);
    }

    const stockId = stocks[0].stock_id;
    const newAvailable = parseFloat(stocks[0].available_quantity) - quantity;
    const newReserved = parseFloat(stocks[0].reserved_quantity) + quantity;

    // 2. Create Reservation Entry
    const reservationNumber = `RSV-${randomUUID().substring(0,8).toUpperCase()}`;
    await db.execute(
      "INSERT INTO tbl_stock_reservation (reservation_number, job_card_id, part_number, reserved_quantity, status) VALUES (?, ?, ?, ?, 'OPEN')",
      [reservationNumber, jobCardId, partNumber, quantity]
    );

    // 3. Update cached availability
    await db.execute(
      "UPDATE tbl_inventory_stock SET available_quantity = ?, reserved_quantity = ? WHERE stock_id = ?",
      [newAvailable, newReserved, stockId]
    );

    const context = makeSystemContext(`RSV-CREATE-${reservationNumber}`);
    await this.eventBus.publish("STOCK_RESERVED", { reservationNumber, jobCardId, partNumber, quantity }, context);

    return { success: true, reservationNumber };
  }
}
