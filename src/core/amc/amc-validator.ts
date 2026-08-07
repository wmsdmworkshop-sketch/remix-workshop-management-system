import { pool as db } from "../../db/index";
import { AmcContract, AmcProduct } from "./amc-types";

export class AmcValidator {
  
  public static async validateConsumptionEligibility(
    contractId: string,
    vin: string,
    currentKm: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 1. Fetch Contract & Product
    const [contracts] = await db.execute(
      "SELECT c.*, p.km_limit, p.service_count_limit FROM tbl_amc_contract c JOIN tbl_amc_product p ON c.product_id = p.product_id WHERE c.contract_id = ?",
      [contractId]
    ) as any[];

    if (!contracts || contracts.length === 0) {
      return { valid: false, errors: ["Contract not found"] };
    }

    const contract = contracts[0];

    // 2. Validate State & Expiry
    if (contract.workflow_state !== 'ACTIVE') {
      errors.push(`Contract is not active. Current state: ${contract.workflow_state}`);
    }

    const now = new Date();
    if (now > new Date(contract.expiry_date)) {
      errors.push(`Contract expired on ${contract.expiry_date}`);
    }
    if (now < new Date(contract.start_date)) {
      errors.push(`Contract not yet valid. Starts on ${contract.start_date}`);
    }

    // 3. Validate VIN (Fleet mapping)
    const [vehicles] = await db.execute(
      "SELECT * FROM tbl_amc_contract_vehicles WHERE contract_id = ? AND vin = ? AND is_active = 1",
      [contractId, vin]
    ) as any[];

    if (!vehicles || vehicles.length === 0) {
      errors.push(`VIN ${vin} is not covered under this contract.`);
    }

    // 4. Validate Ledger Limits
    const [ledgerAgg] = await db.execute(`
      SELECT 
        SUM(CASE WHEN transaction_type = 'DEBIT_SERVICE' THEN service_count ELSE 0 END) as total_services,
        MAX(km_reading) as max_km
      FROM tbl_amc_consumption_ledger
      WHERE contract_id = ?
    `, [contractId]) as any[];

    const consumedServices = Number(ledgerAgg[0]?.total_services || 0);
    if (consumedServices >= contract.service_count_limit) {
      errors.push(`Service limit reached. Allowed: ${contract.service_count_limit}, Consumed: ${consumedServices}`);
    }

    if (currentKm > contract.km_limit) {
      errors.push(`KM limit exceeded. Contract limit: ${contract.km_limit}, Current: ${currentKm}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
