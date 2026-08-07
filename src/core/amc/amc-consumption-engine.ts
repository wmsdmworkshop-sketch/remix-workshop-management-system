import { pool as db } from "../../db/index";
import { AmcValidator } from "./amc-validator";
import { randomUUID } from "crypto";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class AmcConsumptionEngine {
  constructor(private eventBus: IEventBus) {}

  /**
   * Appends a consumption record to the ledger.
   */
  public async consumeService(
    contractId: string,
    vin: string,
    jobId: number,
    kmReading: number,
    amount: number
  ): Promise<{ success: boolean; errors?: string[] }> {
    
    // 1. Validate
    const validation = await AmcValidator.validateConsumptionEligibility(contractId, vin, kmReading);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // 2. Append Ledger Entry
    const ledgerId = `LEDG-${randomUUID().substring(0, 8).toUpperCase()}`;
    
    await db.execute(
      "INSERT INTO tbl_amc_consumption_ledger (ledger_id, contract_id, vin, job_id, transaction_type, amount, service_count, km_reading, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [ledgerId, contractId, vin, jobId, 'DEBIT_SERVICE', amount, 1, kmReading, `Service consumption from Job ${jobId}`]
    );

    // 3. Check for Warnings (e.g. 90% utilized)
    await this.checkThresholdsAndWarn(contractId);

    const context = makeSystemContext(`AMC-CONS-${ledgerId}`);
    await this.eventBus.publish("AMC_SERVICE_CONSUMED", { contractId, vin, jobId, amount }, context);

    return { success: true };
  }

  private async checkThresholdsAndWarn(contractId: string) {
    const [stats] = await db.execute(`
      SELECT 
        SUM(CASE WHEN transaction_type = 'DEBIT_SERVICE' THEN service_count ELSE 0 END) as total_services,
        MAX(km_reading) as max_km
      FROM tbl_amc_consumption_ledger
      WHERE contract_id = ?
    `, [contractId]) as any[];

    const [contracts] = await db.execute(
      "SELECT c.*, p.km_limit, p.service_count_limit FROM tbl_amc_contract c JOIN tbl_amc_product p ON c.product_id = p.product_id WHERE c.contract_id = ?",
      [contractId]
    ) as any[];

    if (!contracts || contracts.length === 0) return;
    const contract = contracts[0];

    const svcCount = Number(stats[0]?.total_services || 0);
    const maxKm = Number(stats[0]?.max_km || 0);

    const limitRatio = svcCount / contract.service_count_limit;
    const kmRatio = maxKm / contract.km_limit;

    if (limitRatio >= 0.9 || kmRatio >= 0.9) {
      const context = makeSystemContext(`AMC-WARN-${contractId}`);
      await this.eventBus.publish("AMC_LIMIT_WARNING", { contractId, limitRatio, kmRatio }, context);
    }
  }
}
