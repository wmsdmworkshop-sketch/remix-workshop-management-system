import { pool as db } from "../../db/index";
import { ValuationMethod } from "./inventory-types";

export class ValuationEngine {
  public async calculateNewUnitCost(
    partNumber: string,
    warehouseId: string,
    receivedQuantity: number,
    receivedUnitCost: number,
    method: ValuationMethod = "MOVING_AVERAGE"
  ): Promise<number> {
    const [stocks] = await db.execute(
      "SELECT current_quantity, average_cost FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?",
      [partNumber, warehouseId]
    ) as any[];

    if (stocks.length === 0) return receivedUnitCost;

    const currentQty = parseFloat(stocks[0].current_quantity);
    const currentAvgCost = parseFloat(stocks[0].average_cost) || 0;

    if (method === "MOVING_AVERAGE") {
      // Because ledger posts first, currentQty already includes receivedQuantity
      const previousQty = currentQty - receivedQuantity;
      
      if (previousQty <= 0) return receivedUnitCost;
      
      const totalPreviousValue = previousQty * currentAvgCost;
      const totalReceivedValue = receivedQuantity * receivedUnitCost;

      return parseFloat(((totalPreviousValue + totalReceivedValue) / currentQty).toFixed(2));
    }
    
    if (method === "FIFO") {
        return receivedUnitCost; // Simplified FIFO pointer logic
    }

    return receivedUnitCost;
  }

  public async updateInventoryValue(
    partNumber: string,
    warehouseId: string,
    newUnitCost: number,
    newInventoryValue: number
  ): Promise<void> {
    await db.execute(
      "UPDATE tbl_inventory_stock SET average_cost = ?, inventory_value = ? WHERE part_number = ? AND warehouse_id = ?",
      [newUnitCost, newInventoryValue, partNumber, warehouseId]
    );
  }
}
