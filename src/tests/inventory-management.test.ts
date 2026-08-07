import { StockLedgerEngine } from "../core/inventory/stock-ledger-engine";
import { ValuationEngine } from "../core/inventory/valuation-engine";
import { GRNEngine } from "../core/inventory/grn-engine";
import { ReservationEngine } from "../core/inventory/reservation-engine";
import { GoodsIssueEngine } from "../core/inventory/goods-issue-engine";
import { StockTransferEngine } from "../core/inventory/stock-transfer-engine";
import { EventBus } from "../core/event-bus";
import { pool as db } from "../db/index";

let mockDbState: any = {
  tbl_inventory_stock: [],
  tbl_stock_transaction: [],
  tbl_goods_receipt: [
    { grn_number: "GRN-001", warehouse_id: "WH-01" }
  ],
  tbl_goods_receipt_line: [
    { grn_number: "GRN-001", part_number: "PART-A", accepted_quantity: 100, rate: 50.0 }
  ],
  tbl_stock_reservation: [],
  tbl_goods_issue: [],
  tbl_stock_transfer: []
};

db.execute = async (sql: string, params: any[] = []): Promise<any> => {
  const query = sql.trim().replace(/\s+/g, " ");

  if (query.includes("SELECT stock_id, current_quantity, available_quantity FROM tbl_inventory_stock")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === params[0] && s.warehouse_id === params[1]);
    return [stock ? [stock] : [], []];
  }
  
  if (query.includes("SELECT stock_id, current_quantity, reserved_quantity, average_cost FROM tbl_inventory_stock")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === params[0] && s.warehouse_id === params[1]);
    return [stock ? [stock] : [], []];
  }

  if (query.includes("SELECT current_quantity, average_cost FROM tbl_inventory_stock")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === params[0] && s.warehouse_id === params[1]);
    return [stock ? [stock] : [], []];
  }

  if (query.includes("SELECT current_quantity FROM tbl_inventory_stock")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === params[0] && s.warehouse_id === params[1]);
    return [stock ? [stock] : [], []];
  }

  if (query.includes("INSERT INTO tbl_inventory_stock (stock_id, part_number, warehouse_id, current_quantity, available_quantity)")) {
    mockDbState.tbl_inventory_stock.push({ 
      stock_id: params[0], 
      part_number: params[1], 
      warehouse_id: params[2], 
      current_quantity: params[3] !== undefined ? params[3] : 0, 
      available_quantity: params[4] !== undefined ? params[4] : 0,
      reserved_quantity: 0,
      average_cost: 0,
      inventory_value: 0
    });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_inventory_stock SET current_quantity = ?, available_quantity = ? WHERE stock_id = ?")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.stock_id === params[2]);
    if (stock) {
      stock.current_quantity = params[0];
      stock.available_quantity = params[1];
    }
    return [[], []];
  }
  
  if (query.includes("UPDATE tbl_inventory_stock SET current_quantity = ?, reserved_quantity = ? WHERE stock_id = ?")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.stock_id === params[2]);
    if (stock) {
      stock.current_quantity = params[0];
      stock.reserved_quantity = params[1];
    }
    return [[], []];
  }

  if (query.includes("UPDATE tbl_inventory_stock SET available_quantity = ?, reserved_quantity = ? WHERE stock_id = ?")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.stock_id === params[2]);
    if (stock) {
      stock.available_quantity = params[0];
      stock.reserved_quantity = params[1];
    }
    return [[], []];
  }

  if (query.includes("UPDATE tbl_inventory_stock SET average_cost = ?, inventory_value = ? WHERE part_number = ? AND warehouse_id = ?")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === params[2] && s.warehouse_id === params[3]);
    if (stock) {
      stock.average_cost = params[0];
      stock.inventory_value = params[1];
    }
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_stock_transaction")) {
    let qty = 0;
    if (query.includes("bin_id")) {
      qty = params[7];
    } else {
      qty = params[6];
    }
    mockDbState.tbl_stock_transaction.push({
      transaction_id: params[0],
      transaction_type: params[1],
      part_number: params[2],
      quantity: qty
    });
    return [[], []];
  }

  if (query.includes("SELECT part_number, accepted_quantity, rate FROM tbl_goods_receipt_line")) {
    const lines = mockDbState.tbl_goods_receipt_line.filter((l: any) => l.grn_number === params[0]);
    return [lines, []];
  }

  if (query.includes("SELECT warehouse_id FROM tbl_goods_receipt")) {
    const grn = mockDbState.tbl_goods_receipt.filter((g: any) => g.grn_number === params[0]);
    return [grn, []];
  }

  if (query.includes("UPDATE tbl_goods_receipt SET status = 'COMPLETED'")) {
    return [[], []];
  }

  if (query.includes("SELECT stock_id, available_quantity, reserved_quantity FROM tbl_inventory_stock")) {
    const stock = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === params[0] && s.warehouse_id === params[1]);
    return [stock ? [stock] : [], []];
  }

  if (query.includes("INSERT INTO tbl_stock_reservation")) {
    mockDbState.tbl_stock_reservation.push({
      reservation_number: params[0],
      job_card_id: params[1],
      part_number: params[2],
      reserved_quantity: params[3],
      issued_quantity: 0,
      status: 'OPEN'
    });
    return [[], []];
  }

  if (query.includes("SELECT job_card_id, part_number, reserved_quantity, issued_quantity FROM tbl_stock_reservation")) {
    const resv = mockDbState.tbl_stock_reservation.filter((r: any) => r.reservation_number === params[0] && r.status === 'OPEN');
    return [resv, []];
  }

  if (query.includes("INSERT INTO tbl_goods_issue")) {
    mockDbState.tbl_goods_issue.push({ issue_number: params[0] });
    return [[], []];
  }

  if (query.includes("UPDATE tbl_stock_reservation SET issued_quantity = ?")) {
    const r = mockDbState.tbl_stock_reservation.find((x: any) => x.reservation_number === params[1]);
    if (r) {
      r.issued_quantity = params[0];
      r.status = 'CLOSED';
    }
    return [[], []];
  }

  if (query.includes("INSERT INTO tbl_stock_transfer")) {
    mockDbState.tbl_stock_transfer.push({
      transfer_number: params[0],
      source: params[1],
      dest: params[2],
      part: params[3],
      qty: params[4],
      status: 'IN_TRANSIT'
    });
    return [[], []];
  }

  if (query.includes("SELECT part_number, destination_warehouse_id, quantity FROM tbl_stock_transfer")) {
    const trf = mockDbState.tbl_stock_transfer.filter((t: any) => t.transfer_number === params[0] && t.status === 'IN_TRANSIT');
    if(trf.length > 0) {
      return [[{ part_number: trf[0].part, destination_warehouse_id: trf[0].dest, quantity: trf[0].qty }], []];
    }
    return [[], []];
  }

  if (query.includes("UPDATE tbl_stock_transfer SET status = 'RECEIVED'")) {
    const t = mockDbState.tbl_stock_transfer.find((x: any) => x.transfer_number === params[0]);
    if (t) t.status = 'RECEIVED';
    return [[], []];
  }

  return [[], []];
};

async function runTests() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE INVENTORY MANAGEMENT TESTS (SPRINT 12)");
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
  const valuationEngine = new ValuationEngine();
  const ledgerEngine = new StockLedgerEngine(eventBus);
  const grnEngine = new GRNEngine(eventBus, ledgerEngine, valuationEngine);
  const reservationEngine = new ReservationEngine(eventBus);
  const issueEngine = new GoodsIssueEngine(eventBus, ledgerEngine);
  const transferEngine = new StockTransferEngine(eventBus);

  let dispatchedEvents: any[] = [];
  eventBus.subscribe("*", async (envelope) => {
    dispatchedEvents.push(envelope);
  });

  console.log("--- Goods Receipt Note (GRN) ---");
  await grnEngine.completeGRN("GRN-001", "SYS_USER");
  const stockA = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A");
  assert(stockA !== undefined, "Inventory stock record created automatically upon GRN");
  assert(stockA.current_quantity === 100, "Current quantity accurately reflects received goods");
  assert(stockA.available_quantity === 100, "Available quantity initially matches current quantity");
  assert(stockA.average_cost === 50.0, "Average cost calculated correctly");
  assert(stockA.inventory_value === 5000.0, "Total inventory value calculated correctly");
  assert(dispatchedEvents.some(e => e.topic === "GRN_COMPLETED"), "GRN_COMPLETED event dispatched");
  assert(mockDbState.tbl_stock_transaction.some((t: any) => t.transaction_type === "GRN" && t.quantity === 100), "GRN transaction recorded in append-only ledger");

  console.log("\n--- Moving Average Valuation ---");
  // Simulate another GRN line for same part
  mockDbState.tbl_goods_receipt.push({ grn_number: "GRN-002", warehouse_id: "WH-01" });
  mockDbState.tbl_goods_receipt_line.push({ grn_number: "GRN-002", part_number: "PART-A", accepted_quantity: 100, rate: 70.0 });
  
  await grnEngine.completeGRN("GRN-002", "SYS_USER");
  const stockA_after2nd = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A");
  assert(stockA_after2nd.current_quantity === 200, "Quantity updated after 2nd GRN");
  assert(stockA_after2nd.average_cost === 60.0, "Moving average cost correctly calculated ( (100*50 + 100*70)/200 )");
  assert(stockA_after2nd.inventory_value === 12000.0, "Total value updated (200 * 60)");

  console.log("\n--- Job Card Reservation ---");
  dispatchedEvents = [];
  const resv = await reservationEngine.reserveStock("JC-123", "PART-A", "WH-01", 10);
  assert(resv.success, "Stock reserved successfully");
  const stockA_resv = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A");
  assert(stockA_resv.available_quantity === 190, "Available quantity DECREASED upon reservation");
  assert(stockA_resv.current_quantity === 200, "Current physical quantity REMAINS UNCHANGED upon reservation");
  assert(stockA_resv.reserved_quantity === 10, "Reserved quantity bucket increased");
  assert(dispatchedEvents.some(e => e.topic === "STOCK_RESERVED"), "STOCK_RESERVED event dispatched");

  console.log("\n--- Goods Issue against Reservation ---");
  dispatchedEvents = [];
  const issue = await issueEngine.issueReservedStock(resv.reservationNumber!, "WH-01", "TECH-1", "SYS_USER");
  assert(issue.success, "Stock issued against reservation successfully");
  const stockA_issue = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A");
  assert(stockA_issue.current_quantity === 190, "Current physical quantity DECREASED upon issue");
  assert(stockA_issue.available_quantity === 190, "Available quantity remains unchanged (already deducted)");
  assert(stockA_issue.reserved_quantity === 0, "Reserved quantity bucket cleared");
  assert(mockDbState.tbl_stock_transaction.some((t: any) => t.transaction_type === "ISSUE" && t.quantity === -10), "ISSUE transaction recorded in ledger with negative qty");
  assert(dispatchedEvents.some(e => e.topic === "GOODS_ISSUED"), "GOODS_ISSUED event dispatched");

  console.log("\n--- Stock Adjustments (Physical Variance) ---");
  dispatchedEvents = [];
  await ledgerEngine.postTransaction("ADJUSTMENT", "PART-A", "WH-01", -5, stockA_issue.average_cost, "VERIFICATION_NO", "VER-99", "AUDITOR", "Damaged parts found");
  const stockA_adj = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A");
  assert(stockA_adj.current_quantity === 185, "Current physical quantity adjusted immediately");
  assert(stockA_adj.available_quantity === 185, "Available quantity adjusted immediately alongside physical");
  assert(mockDbState.tbl_stock_transaction.some((t: any) => t.transaction_type === "ADJUSTMENT" && t.quantity === -5), "ADJUSTMENT transaction recorded in ledger");
  assert(dispatchedEvents.some(e => e.topic === "STOCK_ADJUSTED"), "STOCK_ADJUSTED event dispatched for audit trails");

  console.log("\n--- Stock Transfers (Warehouse to Warehouse) ---");
  dispatchedEvents = [];
  const trf = await transferEngine.dispatchTransfer("PART-A", "WH-01", "WH-02", 50);
  assert(trf.success, "Transfer dispatched successfully");
  const stockA_dispatch = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A" && s.warehouse_id === "WH-01");
  assert(stockA_dispatch.current_quantity === 135, "Source current quantity decreased");
  assert(dispatchedEvents.some(e => e.topic === "TRANSFER_INITIATED"), "TRANSFER_INITIATED event dispatched");

  const trfRecv = await transferEngine.receiveTransfer(trf.transferNumber!);
  assert(trfRecv.success, "Transfer received successfully");
  const stockA_dest = mockDbState.tbl_inventory_stock.find((s: any) => s.part_number === "PART-A" && s.warehouse_id === "WH-02");
  assert(stockA_dest !== undefined, "Destination stock record created/found");
  assert(stockA_dest.current_quantity === 50, "Destination current quantity increased by transfer amount");
  assert(dispatchedEvents.some(e => e.topic === "TRANSFER_COMPLETED"), "TRANSFER_COMPLETED event dispatched");

  console.log("\n=============================================================================");
  console.log(`TEST SUITE RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
