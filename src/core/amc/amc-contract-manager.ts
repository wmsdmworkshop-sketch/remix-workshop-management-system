import { pool as db } from "../../db/index";
import { AmcContract, AmcContractState, AmcProduct } from "./amc-types";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class AmcContractManager {
  constructor(private eventBus: IEventBus) {}

  public async createContract(
    productId: string,
    customerId: string,
    vins: string[],
    paymentStatus: "PENDING" | "PAID" = "PENDING"
  ): Promise<{ success: boolean; contractId?: string; errors?: string[] }> {
    
    // Fetch Product
    const [products] = await db.execute("SELECT * FROM tbl_amc_product WHERE product_id = ?", [productId]) as any[];
    if (!products || products.length === 0) return { success: false, errors: ["Product not found"] };
    const product = products[0] as AmcProduct;

    const contractId = `AMC-${randomUUID().substring(0, 8).toUpperCase()}`;
    const contractType = vins.length > 1 ? "Fleet" : "Individual";

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + product.duration_months);

    // Persist Contract
    await db.execute(
      "INSERT INTO tbl_amc_contract (contract_id, product_id, customer_id, contract_type, start_date, expiry_date, workflow_state, payment_status, total_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [contractId, productId, customerId, contractType, startDate, expiryDate, 'DRAFT', paymentStatus, product.base_price]
    );

    // Persist Fleet Mapping
    for (const vin of vins) {
      await db.execute(
        "INSERT INTO tbl_amc_contract_vehicles (mapping_id, contract_id, vin) VALUES (?, ?, ?)",
        [`MAP-${randomUUID().substring(0,8)}`, contractId, vin]
      );
    }

    await this.logHistory(contractId, "CREATED", "Contract Created in DRAFT state");

    const context = makeSystemContext(`AMC-CREATE-${contractId}`);
    await this.eventBus.publish("AMC_CREATED", { contractId, customerId }, context);

    return { success: true, contractId };
  }

  public async progressState(contractId: string, newState: AmcContractState, actorId: string, notes?: string): Promise<void> {
    await db.execute(
      "UPDATE tbl_amc_contract SET workflow_state = ?, updated_at = ? WHERE contract_id = ?",
      [newState, new Date(), contractId]
    );

    await this.logHistory(contractId, "STATE_CHANGED", `Transitioned to ${newState} by ${actorId}. Notes: ${notes || 'None'}`);

    const context = makeSystemContext(`AMC-STATE-${contractId}`);
    await this.eventBus.publish("AMC_STATE_CHANGED", { contractId, newState }, context);

    if (newState === 'ACTIVE') {
        await this.eventBus.publish("AMC_ACTIVATED", { contractId }, context);
    }
  }

  private async logHistory(contractId: string, action: string, details: string): Promise<void> {
    await db.execute(
      "INSERT INTO tbl_amc_history (history_id, contract_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?)",
      [`HIST-${randomUUID().substring(0,8)}`, contractId, action, details, new Date()]
    );
  }
}
