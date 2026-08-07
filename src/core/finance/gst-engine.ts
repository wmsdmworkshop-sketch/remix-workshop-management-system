import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";

export interface TaxConfig {
  intraState: boolean;
  gstPercent: number;
}

export class GSTEngine {
  public async calculateTaxes(
    taxableAmount: number,
    config: TaxConfig,
    referenceType: string,
    referenceId: string
  ): Promise<{ taxAmount: number }> {
    const taxTxnId = `TAX-${randomUUID().substring(0, 8)}`;
    const taxAmount = (taxableAmount * config.gstPercent) / 100;
    
    let cgst = 0, sgst = 0, igst = 0;

    if (config.intraState) {
      cgst = taxAmount / 2;
      sgst = taxAmount / 2;
    } else {
      igst = taxAmount;
    }

    await db.execute(
      "INSERT INTO tbl_tax_transaction (tax_txn_id, reference_type, reference_id, tax_type, gst_percent, cgst, sgst, igst, taxable_amount, tax_amount) VALUES (?, ?, ?, 'OUTPUT_GST', ?, ?, ?, ?, ?, ?)",
      [taxTxnId, referenceType, referenceId, config.gstPercent, cgst, sgst, igst, taxableAmount, taxAmount]
    );

    return { taxAmount };
  }
}
