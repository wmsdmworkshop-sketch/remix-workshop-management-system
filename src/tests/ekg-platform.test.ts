// =============================================================================
// DWIP Enterprise Knowledge Graph (EKG) Unit Tests
// Execution: npx tsx src/tests/ekg-platform.test.ts
// =============================================================================

import { pool as db } from "../db/index.ts";
import crypto from "crypto";
import { EkgEngine } from "../engines/ekg-engine.ts";
import { globalEventBus } from "../core/event-bus.ts";
import { initializeEkgEventListeners } from "../core/ekg-event-listener.ts";

const tests: { name: string; fn: () => Promise<void> | void }[] = [];
function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}: expected ${expected}, got ${actual}`);
  }
}

// Ensure clean database state before running EKG tests
async function setupEkgTestDb() {
  await db.execute("DELETE FROM graph_edge_history");
  await db.execute("DELETE FROM graph_edges");
  await db.execute("DELETE FROM graph_nodes");
  await db.execute("DELETE FROM customer_passports");
}

// =============================================================================
// TESTS
// =============================================================================

test("EKG Nodes & Edges: Node and Edge addition and mirroring works", async () => {
  await setupEkgTestDb();

  const customerId = "CUST-9011";
  const vehicleId = "VIN-MH12XY9011";

  // Add Nodes
  await EkgEngine.addNode(customerId, "Customer", "Devanand Prime Customer", { contact_phone: "9876543210" });
  await EkgEngine.addNode(vehicleId, "Vehicle", "Nexon EV MH12XY9011", { vin: vehicleId });

  // Add Edge with Mirroring
  await EkgEngine.addEdge(customerId, vehicleId, "OWNS");

  // Assert Node Details
  const [nodes] = await db.query("SELECT * FROM graph_nodes WHERE node_id = ?", [customerId]) as any[];
  assertEquals(nodes.length, 1);
  assertEquals(nodes[0].node_name, "Devanand Prime Customer");
  assertEquals(JSON.parse(nodes[0].properties_json).contact_phone, "9876543210");

  // Assert Edge Details
  const [edges] = await db.query(
    "SELECT * FROM graph_edges WHERE source_node_id = ? AND target_node_id = ? AND relationship_type = 'OWNS'",
    [customerId, vehicleId]
  ) as any[];
  assertEquals(edges.length, 1);

  // Assert Mirror Edge Details (OWNS -> OWNED_BY)
  const [mirrorEdges] = await db.query(
    "SELECT * FROM graph_edges WHERE source_node_id = ? AND target_node_id = ? AND relationship_type = 'OWNED_BY'",
    [vehicleId, customerId]
  ) as any[];
  assertEquals(mirrorEdges.length, 1);
});

test("Node Merge Engine: duplicate node merging consolidates properties and edges", async () => {
  await setupEkgTestDb();

  const primaryId = "CUST-PRIMARY";
  const duplicateId = "CUST-DUPLICATE";
  const vehicleId = "VIN-MH12XY9011";

  // Create primary node
  await EkgEngine.addNode(primaryId, "Customer", "Primary Customer Name", { contact_phone: "9876543210" });
  // Create duplicate node
  await EkgEngine.addNode(duplicateId, "Customer", "Duplicate Customer Name", { gstin: "27AAACL1111A1Z1" });
  // Create vehicle node
  await EkgEngine.addNode(vehicleId, "Vehicle", "Nexon EV MH12XY9011", { vin: vehicleId });

  // Link duplicate node to vehicle
  await EkgEngine.addEdge(duplicateId, vehicleId, "OWNS");

  // Merge Duplicate into Primary
  await EkgEngine.mergeNodes(primaryId, duplicateId);

  // Assert Duplicate node is deleted
  const [dupRows] = await db.query("SELECT * FROM graph_nodes WHERE node_id = ?", [duplicateId]) as any[];
  assertEquals(dupRows.length, 0);

  // Assert Primary Node has consolidated properties
  const [primRows] = await db.query("SELECT * FROM graph_nodes WHERE node_id = ?", [primaryId]) as any[];
  assertEquals(primRows.length, 1);
  const props = JSON.parse(primRows[0].properties_json);
  assertEquals(props.contact_phone, "9876543210");
  assertEquals(props.gstin, "27AAACL1111A1Z1");

  // Assert Edge was remapped to Primary Node
  const [edges] = await db.query(
    "SELECT * FROM graph_edges WHERE source_node_id = ? AND target_node_id = ? AND relationship_type = 'OWNS'",
    [primaryId, vehicleId]
  ) as any[];
  assertEquals(edges.length, 1);
});

test("Relationship Versioning: tracks edge updates in history", async () => {
  await setupEkgTestDb();

  const sourceId = "CUST-1";
  const targetId = "VEH-1";
  await EkgEngine.addNode(sourceId, "Customer", "Customer 1");
  await EkgEngine.addNode(targetId, "Vehicle", "Vehicle 1");

  // Add Edge Version 1
  await EkgEngine.addEdge(sourceId, targetId, "OWNS", { status: "ACTIVE" });

  // Update Edge Version 2 (properties change)
  await EkgEngine.addEdge(sourceId, targetId, "OWNS", { status: "TRANSFERRED" });

  // Assert graph_edges has version 2
  const [edges] = await db.query(
    "SELECT * FROM graph_edges WHERE source_node_id = ? AND target_node_id = ?",
    [sourceId, targetId]
  ) as any[];
  assertEquals(edges[0].version, 2);
  assertEquals(JSON.parse(edges[0].properties_json).status, "TRANSFERRED");

  // Assert graph_edge_history has version 1 archive
  const [history] = await db.query(
    "SELECT * FROM graph_edge_history WHERE source_node_id = ? AND target_node_id = ?",
    [sourceId, targetId]
  ) as any[];
  assertEquals(history.length, 1);
  assertEquals(history[0].version, 1);
  assertEquals(JSON.parse(history[0].properties_json).status, "ACTIVE");
});

test("Shortest Path (BFS): finds connection paths between distant nodes", async () => {
  await setupEkgTestDb();

  const nodeA = "CUST-A";
  const nodeB = "VEH-B";
  const nodeC = "FLEET-C";
  const nodeD = "CONTRACT-D";

  // Create Nodes
  await EkgEngine.addNode(nodeA, "Customer", "Customer A");
  await EkgEngine.addNode(nodeB, "Vehicle", "Vehicle B");
  await EkgEngine.addNode(nodeC, "Fleet", "Fleet C");
  await EkgEngine.addNode(nodeD, "AMCContract", "Contract D");

  // Create chain
  await EkgEngine.addEdge(nodeA, nodeB, "OWNS");
  await EkgEngine.addEdge(nodeB, nodeC, "BELONGS_TO");
  await EkgEngine.addEdge(nodeC, nodeD, "CONTAINS");

  // Find Path from nodeA to nodeD
  const pathResult = await EkgEngine.traverseShortestPath(nodeA, nodeD);
  assertEquals(pathResult.pathExists, true);
  assertEquals(pathResult.length, 3);
  assertEquals(pathResult.path[0], nodeA);
  assertEquals(pathResult.path[3], nodeD);
  assertEquals(pathResult.relationshipDescriptions[0], "OWNS");
  assertEquals(pathResult.relationshipDescriptions[2], "CONTAINS");
});

test("AI Reasoning Engine: answers explainable queries", async () => {
  await setupEkgTestDb();

  const vin = "VIN-TATA-PRIM-100";
  const partNo = "PART-BOOSTER-2788";

  // Build some mock nodes
  await EkgEngine.addNode(vin, "Vehicle", `Vehicle ${vin}`);
  await EkgEngine.addNode(partNo, "Part", `Part ${partNo}`, { part_number: partNo });
  await EkgEngine.addEdge(vin, partNo, "USED_PART");

  // Query why vehicle failed
  const failResult = await EkgEngine.answerWhyVehicleFailed(vin);
  assertEquals(failResult.confidence, 0.95);
  assertEquals(failResult.evidence.failedComponents[0], `Part ${partNo}`);

  // Query shortest path Connection
  const connectionResult = await EkgEngine.answerShortestPathConnection(vin, partNo);
  assertEquals(connectionResult.confidence, 0.99);
  assertEquals(connectionResult.reasoningPath.length, 2);
});

test("Event integration: EventBus listener automatically enriches graph", async () => {
  await setupEkgTestDb();
  initializeEkgEventListeners();

  const customerId = crypto.randomUUID();
  await db.execute(
    `INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone)
     VALUES (?, ?, ?)`,
    [customerId, "Devanand Fleet Owner", "9876543210"]
  );

  const jobCardPayload = {
    job_id: 1209,
    vin: "VIN-TATA-NEX-01",
    vrn: "MH12XY0101",
    customer_name: "Devanand Fleet Owner",
    customer_mobile: "9876543210"
  };

  // Dispatch event on globalEventBus
  await globalEventBus.publish("JOB_CARD_CREATED", jobCardPayload, "CORR-TEST-EKG");

  // Allow async listener execution time
  await new Promise(resolve => setTimeout(resolve, 100));

  // Assert Nodes were auto-created
  const [nodes] = await db.query(
    "SELECT * FROM graph_nodes WHERE node_id IN (?, ?, ?)",
    ["9876543210", "VIN-TATA-NEX-01", "1209"]
  ) as any[];

  assertEquals(nodes.length, 3);
});

// =============================================================================
// RUNNER EXECUTION
// =============================================================================
async function run() {
  console.log("=============================================================================");
  console.log("STARTING ENTERPRISE KNOWLEDGE GRAPH (EKG) UNIT TESTS");
  console.log("=============================================================================");

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`[PASS] ${t.name}`);
      passed++;
    } catch (err: any) {
      console.log(`[FAIL] ${t.name}`);
      console.error(err.stack || err.message);
      failed++;
    }
  }

  // Cleanup test data
  try {
    await db.execute("DELETE FROM graph_edge_history");
    await db.execute("DELETE FROM graph_edges");
    await db.execute("DELETE FROM graph_nodes");
    await db.execute("DELETE FROM customer_passports");
  } catch (e) {}

  console.log("=============================================================================");
  console.log(`EKG UNIT TESTS RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=============================================================================");

  try {
    await db.end();
  } catch (e) {}

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(async (err) => {
  console.error(err);
  try {
    await db.end();
  } catch (e) {}
  process.exit(1);
});
