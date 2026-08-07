import { pool as db } from "../../db/index";
import { randomUUID } from "crypto";
import { InvoiceLine } from "./finance-types";
import { NumberingEngine } from "./numbering-engine";
import { GSTEngine } from "./gst-engine";
import { CustomerLedgerEngine } from "./customer-ledger-engine";
import { JournalEngine } from "./journal-engine";
import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class InvoiceEngine {
  constructor(
    private numberingEngine: NumberingEngine,
    private gstEngine: GSTEngine,
    private customerLedger: CustomerLedgerEngine,
    private journalEngine: JournalEngine,
    private eventBus: IEventBus
  ) {}

  public async generateInvoice(
    customerId: string,
    branchId: string,
    invoiceType: string,
    lines: InvoiceLine[],
    intraState: boolean = true,
    gstPercent: number = 18
  ): Promise<{ success: boolean; invoiceId?: string; invoiceNumber?: string; error?: string }> {
    try {
      const financialYear = "FY26-27"; // This would normally come from PeriodEngine
      const invoiceNumber = await this.numberingEngine.generateInvoiceNumber(financialYear, branchId, invoiceType);
      const invoiceId = `INV-${randomUUID().substring(0, 8)}`;

      let totalLabour = 0;
      let totalParts = 0;
      let totalDiscount = 0;
      let totalTaxable = 0;
      let totalGst = 0;

      // Calculate totals
      for (const line of lines) {
        if (line.itemType === 'LABOUR') totalLabour += line.rate * line.quantity;
        if (line.itemType === 'PART') totalParts += line.rate * line.quantity;
        totalDiscount += line.discount;
        totalTaxable += line.taxableAmount;
      }

      // Calculate Tax at Invoice Level (simplified for demonstration, typically it's line level)
      const taxRes = await this.gstEngine.calculateTaxes(totalTaxable, { intraState, gstPercent }, "INVOICE", invoiceId);
      totalGst = taxRes.taxAmount;

      const grandTotal = totalTaxable + totalGst;
      const netAmount = Math.round(grandTotal);
      const roundOff = netAmount - grandTotal;

      // 1. Save Invoice Header
      await db.execute(
        `INSERT INTO tbl_invoice 
        (invoice_id, invoice_number, invoice_type, customer_id, branch_id, status, total_labour, total_parts, discount, taxable_amount, gst_amount, grand_total, round_off, net_amount) 
        VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceId, invoiceNumber, invoiceType, customerId, branchId, totalLabour, totalParts, totalDiscount, totalTaxable, totalGst, grandTotal, roundOff, netAmount]
      );

      // 2. Save Invoice Lines
      let ln = 1;
      for (const line of lines) {
        const lineId = `INVL-${randomUUID().substring(0, 8)}`;
        await db.execute(
          `INSERT INTO tbl_invoice_line 
          (invoice_line_id, invoice_id, line_number, item_type, description, quantity, rate, discount, taxable_amount, tax_amount, net_amount) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [lineId, invoiceId, ln++, line.itemType, line.description, line.quantity, line.rate, line.discount, line.taxableAmount, line.taxAmount, line.netAmount]
        );
      }

      const context = makeSystemContext(`INV-CREATE-${invoiceId}`);
      await this.eventBus.publish("INVOICE_CREATED", { invoiceId, invoiceNumber }, context);

      return { success: true, invoiceId, invoiceNumber };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  public async postInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const [invoices] = await db.execute("SELECT * FROM tbl_invoice WHERE invoice_id = ?", [invoiceId]) as any[];
      if (invoices.length === 0) throw new Error("Invoice not found");
      const invoice = invoices[0];

      if (invoice.status === 'POSTED') throw new Error("Invoice already posted");

      // 1. Post to Customer Ledger
      await this.customerLedger.postTransaction(
        invoice.customer_id,
        "INVOICE",
        invoice.invoice_id,
        parseFloat(invoice.net_amount), // Debit Customer
        0
      );

      // 2. Post Journal Entry (Double-Entry)
      // For simplicity in the test, we mock account IDs
      await this.journalEngine.postJournal("JV", "INVOICE", invoice.invoice_id, [
        { accountId: "ACC-AR", debit: parseFloat(invoice.net_amount), credit: 0 },
        { accountId: "ACC-REVENUE", debit: 0, credit: parseFloat(invoice.taxable_amount) },
        { accountId: "ACC-GST", debit: 0, credit: parseFloat(invoice.gst_amount) }
      ], `Sales Invoice ${invoice.invoice_number}`);

      // 3. Mark as POSTED
      await db.execute("UPDATE tbl_invoice SET status = 'POSTED' WHERE invoice_id = ?", [invoiceId]);

      const context = makeSystemContext(`INV-POST-${invoiceId}`);
      await this.eventBus.publish("INVOICE_POSTED", { invoiceId }, context);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
