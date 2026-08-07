import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";

export class NumberingEngine {
  public async generateInvoiceNumber(
    financialYear: string,
    branchId: string,
    invoiceType: string
  ): Promise<string> {
    const sequenceId = `${financialYear}-${branchId}-${invoiceType}`;
    
    // In production, we'd use a robust lock or atomic update
    const [rows] = await db.execute(
      "SELECT current_sequence FROM tbl_invoice_sequence WHERE sequence_id = ?",
      [sequenceId]
    ) as any[];

    let current = 0;
    if (rows.length > 0) {
      current = rows[0].current_sequence;
      await db.execute(
        "UPDATE tbl_invoice_sequence SET current_sequence = current_sequence + 1 WHERE sequence_id = ?",
        [sequenceId]
      );
    } else {
      await db.execute(
        "INSERT INTO tbl_invoice_sequence (sequence_id, financial_year, branch_id, invoice_type, current_sequence) VALUES (?, ?, ?, ?, 1)",
        [sequenceId, financialYear, branchId, invoiceType]
      );
    }

    const nextSeq = current + 1;
    const formattedSeq = nextSeq.toString().padStart(5, '0');
    return `INV/${financialYear}/${branchId}/${invoiceType}/${formattedSeq}`;
  }
}
