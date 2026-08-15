import { NumberingEngine } from "../core/finance/numbering-engine";
import { PeriodEngine } from "../core/finance/period-engine";
import { JournalEngine } from "../core/finance/journal-engine";
import { CustomerLedgerEngine } from "../core/finance/customer-ledger-engine";
import { GSTEngine } from "../core/finance/gst-engine";
import { InvoiceEngine } from "../core/finance/invoice-engine";
import { ReceiptEngine } from "../core/finance/receipt-engine";
import { PaymentAllocationEngine } from "../core/finance/payment-allocation-engine";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_invoice_sequence: [],
  tbl_financial_period: [
    { period_id: "P1", financial_year: "FY26-27", start_date: new Date('2026-04-01'), end_date: new Date('2027-03-31'), status: 'OPEN' },
    { period_id: "P2", financial_year: "FY25-26", start_date: new Date('2025-04-01'), end_date: new Date('2026-03-31'), status: 'CLOSED' },
    { period_id: "P3", financial_year: "FY27-28", start_date: new Date('2027-04-01'), end_date: new Date('2028-03-31'), status: 'LOCKED' }
  ],
  tbl_financial_journal: [],
  tbl_financial_journal_line: [],
  tbl_customer_ledger: [],
  tbl_tax_transaction: [],
  tbl_invoice: [],
  tbl_invoice_line: [],
  tbl_receipt: [],
  tbl_payment_allocation: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("SELECT current_sequence FROM tbl_invoice_sequence")) {
    const seq = mockDbState.tbl_invoice_sequence.find((s: any) => s.sequence_id === params[0]);
    return [seq ? [seq] : [], []];
  }
  
  if (query.includes("UPDATE tbl_invoice_sequence SET current_sequence")) {
    const seq = mockDbState.tbl_invoice_sequence.find((s: any) => s.sequence_id === params[0]);
    if (seq) seq.current_sequence += 1;
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_invoice_sequence")) {
    mockDbState.tbl_invoice_sequence.push({
      sequence_id: params[0],
      financial_year: params[1],
      branch_id: params[2],
      invoice_type: params[3],
      current_sequence: 1
    });
    return [[], []];
  }

  if (query.includes("SELECT status FROM tbl_financial_period WHERE start_date <=") || query.includes("SELECT period_id FROM tbl_financial_period WHERE start_date <=")) {
    const date = params[0] as Date;
    const periods = mockDbState.tbl_financial_period.filter((p: any) => date >= p.start_date && date <= p.end_date);
    return [periods, []];
  }

  if (query.includes("INSERT INTO tbl_financial_journal (journal_id, journal_number, voucher_type, reference_type, reference_id, posting_date, status, total_debit, total_credit, period_id, narration)")) {
    mockDbState.tbl_financial_journal.push({
      journal_id: params[0],
      voucher_type: params[2],
      reference_id: params[4],
      total_debit: params[7],
      total_credit: params[8]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_financial_journal_line")) {
    mockDbState.tbl_financial_journal_line.push({
      journal_line_id: params[0],
      journal_id: params[1],
      account_id: params[2],
      debit: params[3],
      credit: params[4]
    });
    return [[], []];
  }

  if (query.includes("SELECT running_balance FROM tbl_customer_ledger")) {
    const entries = mockDbState.tbl_customer_ledger.filter((e: any) => e.customer_id === params[0]);
    if (entries.length > 0) return [[entries[entries.length - 1]], []];
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_customer_ledger")) {
    mockDbState.tbl_customer_ledger.push({
      ledger_entry_id: params[0],
      customer_id: params[1],
      debit: params[4],
      credit: params[5],
      running_balance: params[6]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_tax_transaction")) {
    mockDbState.tbl_tax_transaction.push({
      tax_txn_id: params[0],
      tax_amount: params[9]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_invoice (invoice_id")) {
    mockDbState.tbl_invoice.push({
      invoice_id: params[0],
      invoice_number: params[1],
      customer_id: params[3],
      net_amount: params[12],
      taxable_amount: params[8],
      gst_amount: params[9],
      status: 'DRAFT'
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_invoice_line")) {
    mockDbState.tbl_invoice_line.push({
      invoice_line_id: params[0],
      invoice_id: params[1]
    });
    return [[], []];
  }

  if (query.includes("SELECT * FROM tbl_invoice WHERE invoice_id = ?")) {
    const inv = mockDbState.tbl_invoice.filter((i: any) => i.invoice_id === params[0]);
    return [inv, []];
  }

  if (query.includes("UPDATE tbl_invoice SET status = 'POSTED'")) {
    const inv = mockDbState.tbl_invoice.find((i: any) => i.invoice_id === params[0]);
    if (inv) inv.status = 'POSTED';
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_receipt")) {
    mockDbState.tbl_receipt.push({
      receipt_id: params[0],
      receipt_number: params[1],
      amount: params[3]
    });
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_payment_allocation")) {
    mockDbState.tbl_payment_allocation.push({
      allocation_id: params[0],
      receipt_id: params[1],
      invoice_id: params[2],
      allocated_amount: params[3]
    });
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE BILLING & FINANCE TESTS (SPRINT 13)");
  console.log("=============================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const eventBus = new EventBus();
  const numberingEngine = new NumberingEngine();
  const periodEngine = new PeriodEngine();
  const journalEngine = new JournalEngine(periodEngine, eventBus);
  const customerLedger = new CustomerLedgerEngine(eventBus);
  const gstEngine = new GSTEngine();
  const invoiceEngine = new InvoiceEngine(numberingEngine, gstEngine, customerLedger, journalEngine, eventBus);
  const receiptEngine = new ReceiptEngine(customerLedger, journalEngine, eventBus);
  const allocationEngine = new PaymentAllocationEngine(eventBus);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  console.log("--- Invoice Numbering Engine ---");
  const num1 = await numberingEngine.generateInvoiceNumber("FY26-27", "BR01", "WS");
  const num2 = await numberingEngine.generateInvoiceNumber("FY26-27", "BR01", "WS");
  assert(num1 === "INV/FY26-27/BR01/WS/00001", "Correct format and sequence (00001)");
  assert(num2 === "INV/FY26-27/BR01/WS/00002", "Sequence increments correctly (00002)");

  console.log("\n--- Financial Period Control ---");
  const validDate = new Date('2026-06-15'); // P1 (OPEN)
  const closedDate = new Date('2025-06-15'); // P2 (CLOSED)
  const lockedDate = new Date('2027-06-15'); // P3 (LOCKED)
  
  let validPost = await periodEngine.validatePostingDate(validDate).catch(() => false);
  assert(validPost === true, "Allowed posting in OPEN period");

  let closedPost = false;
  try { await periodEngine.validatePostingDate(closedDate); } catch(e) { closedPost = true; }
  assert(closedPost, "Blocked posting in CLOSED period");

  let lockedPost = false;
  try { await periodEngine.validatePostingDate(lockedDate); } catch(e) { lockedPost = true; }
  assert(lockedPost, "Blocked posting in LOCKED period");

  console.log("\n--- Double-Entry Journal Engine ---");
  dispatchedEvents = [];
  const jvSuccess = await journalEngine.postJournal("JV", "TEST", "REF-01", [
    { accountId: "ACC-01", debit: 100, credit: 0 },
    { accountId: "ACC-02", debit: 0, credit: 100 }
  ], "Test JV", validDate);
  assert(jvSuccess.success, "Balanced Journal Entry posts successfully");
  assert(dispatchedEvents.some(e => e.topic === "JOURNAL_POSTED"), "JOURNAL_POSTED event dispatched");

  const jvFail = await journalEngine.postJournal("JV", "TEST", "REF-02", [
    { accountId: "ACC-01", debit: 100, credit: 0 },
    { accountId: "ACC-02", debit: 0, credit: 90 }
  ], "Test JV Unbalanced", validDate);
  assert(jvFail.success === false, "Unbalanced Journal Entry (Dr != Cr) is blocked");

  console.log("\n--- Invoice Generation & Tax ---");
  dispatchedEvents = [];
  const invRes = await invoiceEngine.generateInvoice("CUST-01", "BR01", "WS", [
    { itemType: "LABOUR", description: "Service", quantity: 1, rate: 1000, discount: 0, taxableAmount: 1000, taxAmount: 180, netAmount: 1180 }
  ], true, 18);
  assert(invRes.success, "Invoice generated successfully");
  const invoiceId = invRes.invoiceId!;
  assert(mockDbState.tbl_tax_transaction.length > 0, "GST tax transaction generated");
  assert(dispatchedEvents.some(e => e.topic === "INVOICE_CREATED"), "INVOICE_CREATED event dispatched");

  console.log("\n--- Invoice Posting & Customer Ledger ---");
  dispatchedEvents = [];
  const postRes = await invoiceEngine.postInvoice(invoiceId);
  assert(postRes.success, "Invoice posted successfully");
  
  const ledgerEntries = mockDbState.tbl_customer_ledger.filter((e: any) => e.customer_id === "CUST-01");
  assert(ledgerEntries.length === 1, "Customer ledger entry created");
  assert(ledgerEntries[0].debit === 1180, "Customer debited with Invoice net amount");
  assert(ledgerEntries[0].running_balance === 1180, "Running balance accurately reflects debit");
  assert(mockDbState.tbl_financial_journal.some((j: any) => j.reference_id === invoiceId), "Double-entry journal posted for Invoice");
  assert(dispatchedEvents.some(e => e.topic === "INVOICE_POSTED"), "INVOICE_POSTED event dispatched");

  console.log("\n--- Receipts & Allocations ---");
  dispatchedEvents = [];
  const receiptRes = await receiptEngine.createReceipt("CUST-01", 1000, "UPI");
  assert(receiptRes.success, "Receipt created successfully");
  const receiptId = receiptRes.receiptId!;
  
  const ledgerEntries2 = mockDbState.tbl_customer_ledger.filter((e: any) => e.customer_id === "CUST-01");
  assert(ledgerEntries2.length === 2, "Second ledger entry created for receipt");
  assert(ledgerEntries2[1].credit === 1000, "Customer credited with receipt amount");
  assert(ledgerEntries2[1].running_balance === 180, "Running balance decremented correctly (1180 - 1000)");

  const allocRes = await allocationEngine.allocatePayment(receiptId, invoiceId, 1000);
  assert(allocRes.success, "Payment allocated to invoice successfully");
  assert(mockDbState.tbl_payment_allocation.some((a: any) => a.receipt_id === receiptId && a.invoice_id === invoiceId), "Allocation record created");
  assert(dispatchedEvents.some(e => e.topic === "PAYMENT_ALLOCATED"), "PAYMENT_ALLOCATED event dispatched");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    // Exit explicitly: the harness leaves async handles (timers/mock listeners)
    // open, so without this Node waits on the event loop and the legacy test
    // runner's per-file timeout kills it before it's counted as passed.
    process.exit(0);
  }
}

runTests().catch(console.error);
