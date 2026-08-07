import { Router } from "express";
import { pool as db } from "../../src/db/index.ts";
import { EkgEngine } from "../../src/engines/ekg-engine.ts";

const router = Router();

// Helper to compile a 360-degree node view (node + outgoing/incoming edges + neighbors)
async function compileNode360(nodeId: string) {
  const [nodes] = await db.query("SELECT * FROM graph_nodes WHERE node_id = ?", [nodeId]) as any[];
  if (nodes.length === 0) return null;

  const node = nodes[0];

  // Fetch all active connected edges
  const [edges] = await db.query(
    `SELECT ge.*, gn.node_name as target_node_name, gn.node_type as target_node_type 
     FROM graph_edges ge
     JOIN graph_nodes gn ON ge.target_node_id = gn.node_id
     WHERE ge.source_node_id = ? AND ge.is_active = 1`,
    [nodeId]
  ) as any[];

  const [incomingEdges] = await db.query(
    `SELECT ge.*, gn.node_name as source_node_name, gn.node_type as source_node_type 
     FROM graph_edges ge
     JOIN graph_nodes gn ON ge.source_node_id = gn.node_id
     WHERE ge.target_node_id = ? AND ge.is_active = 1`,
    [nodeId]
  ) as any[];

  return {
    success: true,
    node: {
      ...node,
      properties: JSON.parse(node.properties_json || "{}")
    },
    relationships: {
      outgoing: edges.map(e => ({
        edge_id: e.edge_id,
        relationship: e.relationship_type,
        target_id: e.target_node_id,
        target_name: e.target_node_name,
        target_type: e.target_node_type,
        properties: JSON.parse(e.properties_json || "{}")
      })),
      incoming: incomingEdges.map(e => ({
        edge_id: e.edge_id,
        relationship: e.relationship_type,
        source_id: e.source_node_id,
        source_name: e.source_node_name,
        source_type: e.source_node_type,
        properties: JSON.parse(e.properties_json || "{}")
      }))
    }
  };
}

// ---- GET Node Details ----
router.get("/node", async (req: any, res: any) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing node ID parameter." });

  try {
    const view = await compileNode360(id);
    if (!view) return res.status(404).json({ error: "Node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- GET Relationships (Edges) ----
router.get("/relationships", async (req: any, res: any) => {
  const { source, target, type } = req.query;

  try {
    let sql = "SELECT * FROM graph_edges WHERE is_active = 1";
    const params = [];

    if (source) {
      sql += " AND source_node_id = ?";
      params.push(source);
    }
    if (target) {
      sql += " AND target_node_id = ?";
      params.push(target);
    }
    if (type) {
      sql += " AND relationship_type = ?";
      params.push(type);
    }

    const [rows] = await db.query(sql, params) as any[];
    res.json({
      success: true,
      edges: rows.map(r => ({
        ...r,
        properties: JSON.parse(r.properties_json || "{}")
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- SEARCH Nodes ----
router.get("/search", async (req: any, res: any) => {
  const { q, type } = req.query;

  try {
    let sql = "SELECT * FROM graph_nodes WHERE 1=1";
    const params = [];

    if (q) {
      sql += " AND (node_name LIKE ? OR node_id LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
    if (type) {
      sql += " AND node_type = ?";
      params.push(type);
    }

    const [rows] = await db.query(sql, params) as any[];
    res.json({
      success: true,
      nodes: rows.map(r => ({
        ...r,
        properties: JSON.parse(r.properties_json || "{}")
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- CUSTOMER 360 ----
router.get("/customer/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const view = await compileNode360(id);
    if (!view) return res.status(404).json({ error: "Customer node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- VEHICLE 360 ----
router.get("/vehicle/:vin", async (req: any, res: any) => {
  const { vin } = req.params;
  try {
    const view = await compileNode360(vin);
    if (!view) return res.status(404).json({ error: "Vehicle node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FLEET 360 ----
router.get("/fleet/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const view = await compileNode360(id);
    if (!view) return res.status(404).json({ error: "Fleet node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- WARRANTY 360 ----
router.get("/warranty/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const view = await compileNode360(id);
    if (!view) return res.status(404).json({ error: "Warranty node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- REPAIR 360 ----
router.get("/repair/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const view = await compileNode360(id);
    if (!view) return res.status(404).json({ error: "Repair node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- TECHNICIAN 360 ----
router.get("/technician/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const view = await compileNode360(techIdFormatter(id));
    if (!view) return res.status(404).json({ error: "Technician node not found." });
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function techIdFormatter(id: string) {
  if (id.startsWith("TECH-")) return id;
  return `TECH-${id}`;
}

export default router;
