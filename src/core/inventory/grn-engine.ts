import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";
import { StockLedgerEngine } from "./stock-ledger-engine";
import { ValuationEngine } from "./valuation-engine";

export class GRNEngine {
  constructor(
    private eventBus: IEventBus,
    private ledgerEngine: StockLedgerEngine,
    private valuationEngine: ValuationEngine
  ) {}

  public async completeGRN(
    grnNumber: string,
    performedBy: string
  ): Promise<{ success: boolean }> {
    const [lines] = await db.execute(
      "SELECT part_number, accepted_quantity, rate FROM tbl_goods_receipt_line WHERE grn_number = ?",
      [grnNumber]
    ) as any[];

    const [grn] = await db.execute(
      "SELECT warehouse_id FROM tbl_goods_receipt WHERE grn_number = ?",
      [grnNumber]
    ) as any[];

    if (grn.length === 0) throw new Error("GRN not found");
    const warehouseId = grn[0].warehouse_id;

    for (const line of lines) {
      const partNumber = line.part_number;
      const qty = parseFloat(line.accepted_quantity);
      const rate = parseFloat(line.rate);

      if (qty > 0) {
        // 1. Post to ledger (updates current and available)
        await this.ledgerEngine.postTransaction(
          "GRN",
          partNumber,
          warehouseId,
          qty,
          rate,
          "GRN_NO",
          grnNumber,
          performedBy
        );

        // 2. Re-evaluate Unit Cost (Moving Average by default)
        const newCost = await this.valuationEngine.calculateNewUnitCost(partNumber, warehouseId, qty, rate, "MOVING_AVERAGE");
        
        // Find new inventory value
        const [stocks] = await db.execute("SELECT current_quantity FROM tbl_inventory_stock WHERE part_number = ? AND warehouse_id = ?", [partNumber, warehouseId]) as any[];
        const totalValue = parseFloat(stocks[0].current_quantity) * newCost;

        await this.valuationEngine.updateInventoryValue(partNumber, warehouseId, newCost, totalValue);
      }
    }

    await db.execute(
      "UPDATE tbl_goods_receipt SET status = 'COMPLETED' WHERE grn_number = ?",
      [grnNumber]
    );

    const context = makeSystemContext(`GRN-COMP-${grnNumber}`);
    await this.eventBus.publish("GRN_COMPLETED", { grnNumber, warehouseId }, context);

    return { success: true };
  }
}
