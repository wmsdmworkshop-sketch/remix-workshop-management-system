import { pool as db } from "../../db/index";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class ReorderEngine {
  constructor(private eventBus: IEventBus) {}

  public async evaluateReorderLevels(partNumber?: string): Promise<void> {
    const query = partNumber 
        ? "SELECT part_number, reorder_level, reorder_quantity, preferred_vendor_id FROM tbl_parts_master WHERE part_number = ?"
        : "SELECT part_number, reorder_level, reorder_quantity, preferred_vendor_id FROM tbl_parts_master";

    const params = partNumber ? [partNumber] : [];
    
    const [parts] = await db.execute(query, params) as any[];

    for (const part of parts) {
      if (part.reorder_level > 0) {
        // Find total available stock across warehouses (simplified for now)
        const [stocks] = await db.execute(
          "SELECT SUM(available_quantity) as total_available FROM tbl_inventory_stock WHERE part_number = ?",
          [part.part_number]
        ) as any[];

        const totalAvailable = stocks[0].total_available ? parseFloat(stocks[0].total_available) : 0;

        if (totalAvailable <= part.reorder_level) {
          const context = makeSystemContext(`REORDER-EVAL-${part.part_number}`);
          await this.eventBus.publish("REORDER_RECOMMENDED", {
            partNumber: part.part_number,
            currentAvailable: totalAvailable,
            reorderLevel: part.reorder_level,
            recommendedQuantity: part.reorder_quantity,
            vendorId: part.preferred_vendor_id
          }, context);
        }
      }
    }
  }
}
