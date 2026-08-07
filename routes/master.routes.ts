import { Router } from "express";
import { pool as db } from "../src/db/index.ts";

const router = Router();

// Helper to handle async express routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==========================================
// 1. DEALER MASTER CRUD
// ==========================================
router.get("/dealers", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT * FROM dealers") as any[];
  res.json(rows);
}));

router.post("/dealers", asyncHandler(async (req: any, res: any) => {
  const { dealer_code, dealer_name, is_active = 1 } = req.body;
  if (!dealer_code || !dealer_name) {
    return res.status(400).json({ error: "dealer_code and dealer_name are required" });
  }
  const [result] = await db.execute(
    "INSERT INTO dealers (dealer_code, dealer_name, is_active) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE dealer_name=VALUES(dealer_name), is_active=VALUES(is_active)",
    [dealer_code, dealer_name, is_active]
  ) as any[];
  res.json({ success: true, dealer_id: result.insertId || null });
}));

router.put("/dealers/:id", asyncHandler(async (req: any, res: any) => {
  const { dealer_code, dealer_name, is_active } = req.body;
  await db.execute(
    "UPDATE dealers SET dealer_code=?, dealer_name=?, is_active=? WHERE dealer_id=?",
    [dealer_code, dealer_name, is_active, req.params.id]
  );
  res.json({ success: true });
}));

router.delete("/dealers/:id", asyncHandler(async (req: any, res: any) => {
  await db.execute("DELETE FROM dealers WHERE dealer_id=?", [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// 2. BRANCH MASTER CRUD
// ==========================================
router.get("/branches", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT b.*, d.dealer_name FROM branches b JOIN dealers d ON b.dealer_id = d.dealer_id") as any[];
  res.json(rows);
}));

router.post("/branches", asyncHandler(async (req: any, res: any) => {
  const { branch_code, branch_name, dealer_id, is_active = 1 } = req.body;
  if (!branch_code || !branch_name || !dealer_id) {
    return res.status(400).json({ error: "branch_code, branch_name, and dealer_id are required" });
  }
  const [result] = await db.execute(
    "INSERT INTO branches (branch_code, branch_name, dealer_id, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE branch_name=VALUES(branch_name), dealer_id=VALUES(dealer_id), is_active=VALUES(is_active)",
    [branch_code, branch_name, dealer_id, is_active]
  ) as any[];
  res.json({ success: true, branch_id: result.insertId || null });
}));

router.put("/branches/:id", asyncHandler(async (req: any, res: any) => {
  const { branch_code, branch_name, dealer_id, is_active } = req.body;
  await db.execute(
    "UPDATE branches SET branch_code=?, branch_name=?, dealer_id=?, is_active=? WHERE branch_id=?",
    [branch_code, branch_name, dealer_id, is_active, req.params.id]
  );
  res.json({ success: true });
}));

router.delete("/branches/:id", asyncHandler(async (req: any, res: any) => {
  await db.execute("DELETE FROM branches WHERE branch_id=?", [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// 3. PARTS MASTER CRUD
// ==========================================
router.get("/parts", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT * FROM parts") as any[];
  res.json(rows);
}));

router.post("/parts", asyncHandler(async (req: any, res: any) => {
  const { part_number, part_name, price = 0.0, stock_qty = 0, is_active = 1 } = req.body;
  if (!part_number || !part_name) {
    return res.status(400).json({ error: "part_number and part_name are required" });
  }
  const [result] = await db.execute(
    "INSERT INTO parts (part_number, part_name, price, stock_qty, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE part_name=VALUES(part_name), price=VALUES(price), stock_qty=VALUES(stock_qty), is_active=VALUES(is_active)",
    [part_number, part_name, price, stock_qty, is_active]
  ) as any[];
  res.json({ success: true, part_id: result.insertId || null });
}));

router.put("/parts/:id", asyncHandler(async (req: any, res: any) => {
  const { part_number, part_name, price, stock_qty, is_active } = req.body;
  await db.execute(
    "UPDATE parts SET part_number=?, part_name=?, price=?, stock_qty=?, is_active=? WHERE part_id=?",
    [part_number, part_name, price, stock_qty, is_active, req.params.id]
  );
  res.json({ success: true });
}));

router.delete("/parts/:id", asyncHandler(async (req: any, res: any) => {
  await db.execute("DELETE FROM parts WHERE part_id=?", [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// 4. LABOUR OPERATIONS CRUD
// ==========================================
router.get("/labour", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT * FROM labour_operations") as any[];
  res.json(rows);
}));

router.post("/labour", asyncHandler(async (req: any, res: any) => {
  const { labour_code, description, std_hours = 1.0, rate_per_hour = 0.0, is_active = 1 } = req.body;
  if (!labour_code || !description) {
    return res.status(400).json({ error: "labour_code and description are required" });
  }
  const [result] = await db.execute(
    "INSERT INTO labour_operations (labour_code, description, std_hours, rate_per_hour, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description), std_hours=VALUES(std_hours), rate_per_hour=VALUES(rate_per_hour), is_active=VALUES(is_active)",
    [labour_code, description, std_hours, rate_per_hour, is_active]
  ) as any[];
  res.json({ success: true, labour_id: result.insertId || null });
}));

router.put("/labour/:id", asyncHandler(async (req: any, res: any) => {
  const { labour_code, description, std_hours, rate_per_hour, is_active } = req.body;
  await db.execute(
    "UPDATE labour_operations SET labour_code=?, description=?, std_hours=?, rate_per_hour=?, is_active=? WHERE labour_id=?",
    [labour_code, description, std_hours, rate_per_hour, is_active, req.params.id]
  );
  res.json({ success: true });
}));

router.delete("/labour/:id", asyncHandler(async (req: any, res: any) => {
  await db.execute("DELETE FROM labour_operations WHERE labour_id=?", [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// 5. COMPLAINT CODES CRUD
// ==========================================
router.get("/complaints", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT * FROM complaint_codes") as any[];
  res.json(rows);
}));

router.post("/complaints", asyncHandler(async (req: any, res: any) => {
  const { complaint_code, description, category = "General", is_active = 1 } = req.body;
  if (!complaint_code || !description) {
    return res.status(400).json({ error: "complaint_code and description are required" });
  }
  const [result] = await db.execute(
    "INSERT INTO complaint_codes (complaint_code, description, category, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description), category=VALUES(category), is_active=VALUES(is_active)",
    [complaint_code, description, category, is_active]
  ) as any[];
  res.json({ success: true, complaint_id: result.insertId || null });
}));

router.put("/complaints/:id", asyncHandler(async (req: any, res: any) => {
  const { complaint_code, description, category, is_active } = req.body;
  await db.execute(
    "UPDATE complaint_codes SET complaint_code=?, description=?, category=?, is_active=? WHERE complaint_id=?",
    [complaint_code, description, category, is_active, req.params.id]
  );
  res.json({ success: true });
}));

router.delete("/complaints/:id", asyncHandler(async (req: any, res: any) => {
  await db.execute("DELETE FROM complaint_codes WHERE complaint_id=?", [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// 6. WARRANTY CODES CRUD
// ==========================================
router.get("/warranty-codes", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT * FROM warranty_codes") as any[];
  res.json(rows);
}));

router.post("/warranty-codes", asyncHandler(async (req: any, res: any) => {
  const { warranty_code, description, coverage_months = 12, is_active = 1 } = req.body;
  if (!warranty_code || !description) {
    return res.status(400).json({ error: "warranty_code and description are required" });
  }
  const [result] = await db.execute(
    "INSERT INTO warranty_codes (warranty_code, description, coverage_months, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE description=VALUES(description), coverage_months=VALUES(coverage_months), is_active=VALUES(is_active)",
    [warranty_code, description, coverage_months, is_active]
  ) as any[];
  res.json({ success: true, warranty_code_id: result.insertId || null });
}));

router.put("/warranty-codes/:id", asyncHandler(async (req: any, res: any) => {
  const { warranty_code, description, coverage_months, is_active } = req.body;
  await db.execute(
    "UPDATE warranty_codes SET warranty_code=?, description=?, coverage_months=?, is_active=? WHERE warranty_code_id=?",
    [warranty_code, description, coverage_months, is_active, req.params.id]
  );
  res.json({ success: true });
}));

router.delete("/warranty-codes/:id", asyncHandler(async (req: any, res: any) => {
  await db.execute("DELETE FROM warranty_codes WHERE warranty_code_id=?", [req.params.id]);
  res.json({ success: true });
}));

// ==========================================
// 7. IMPORT PROFILES CRUD
// ==========================================
router.get("/import-profiles", asyncHandler(async (req: any, res: any) => {
  const [rows] = await db.query("SELECT * FROM import_profiles") as any[];
  res.json(rows.map((r: any) => ({
    ...r,
    mapping_json: JSON.parse(r.mapping_json),
    mandatory_fields_json: JSON.parse(r.mandatory_fields_json),
    optional_fields_json: JSON.parse(r.optional_fields_json),
    validation_rules_json: JSON.parse(r.validation_rules_json)
  })));
}));

router.post("/import-profiles", asyncHandler(async (req: any, res: any) => {
  const {
    profile_name,
    profile_version = "v1",
    mapping_json = {},
    mandatory_fields_json = [],
    optional_fields_json = [],
    validation_rules_json = {},
    is_active = 1
  } = req.body;

  if (!profile_name) {
    return res.status(400).json({ error: "profile_name is required" });
  }

  const [result] = await db.execute(
    "INSERT INTO import_profiles (profile_name, profile_version, mapping_json, mandatory_fields_json, optional_fields_json, validation_rules_json, is_active) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mapping_json=VALUES(mapping_json), mandatory_fields_json=VALUES(mandatory_fields_json), optional_fields_json=VALUES(optional_fields_json), validation_rules_json=VALUES(validation_rules_json), is_active=VALUES(is_active)",
    [
      profile_name,
      profile_version,
      JSON.stringify(mapping_json),
      JSON.stringify(mandatory_fields_json),
      JSON.stringify(optional_fields_json),
      JSON.stringify(validation_rules_json),
      is_active
    ]
  ) as any[];

  res.json({ success: true, profile_id: result.insertId || null });
}));

// ==========================================
// 8. DYNAMIC BULK IMPORT PIPELINE
// ==========================================
router.post("/bulk-import", asyncHandler(async (req: any, res: any) => {
  const { profileName, profileVersion = "v1", rows = [], dryRun = false } = req.body;

  if (!profileName || !rows || rows.length === 0) {
    return res.status(400).json({ error: "profileName and rows (non-empty array) are required" });
  }

  // 1. Fetch profile mapping and rules
  const [profileRows] = await db.query(
    "SELECT * FROM import_profiles WHERE profile_name = ? AND profile_version = ? AND is_active = 1",
    [profileName, profileVersion]
  ) as any[];

  if (profileRows.length === 0) {
    return res.status(404).json({ error: `Active import profile '${profileName}' (${profileVersion}) not found.` });
  }

  const profile = profileRows[0];
  const mapping = JSON.parse(profile.mapping_json);
  const mandatoryFields = JSON.parse(profile.mandatory_fields_json);
  const rules = JSON.parse(profile.validation_rules_json);

  const imported: any[] = [];
  const errors: any[] = [];
  let skippedDuplicates = 0;

  // 2. Determine target table based on profile name
  let targetTable = "";
  let pkCol = "";
  if (profileName.includes("Dealer")) { targetTable = "dealers"; pkCol = "dealer_code"; }
  else if (profileName.includes("Branch")) { targetTable = "branches"; pkCol = "branch_code"; }
  else if (profileName.includes("Part")) { targetTable = "parts"; pkCol = "part_number"; }
  else if (profileName.includes("Labour")) { targetTable = "labour_operations"; pkCol = "labour_code"; }
  else if (profileName.includes("Complaint")) { targetTable = "complaint_codes"; pkCol = "complaint_code"; }
  else if (profileName.includes("Warranty")) { targetTable = "warranty_codes"; pkCol = "warranty_code"; }
  else if (profileName.includes("Customer")) { targetTable = "customer_passports"; pkCol = "contact_phone"; }
  else if (profileName.includes("Vehicle")) { targetTable = "vehicle_passports"; pkCol = "vin"; }
  else if (profileName.includes("Employee")) { targetTable = "employees"; pkCol = "employee_code"; }
  else if (profileName.includes("Authorized Service")) { targetTable = "service_history"; pkCol = "sh_no"; }
  else if (profileName.includes("External Service")) { targetTable = "invoices"; pkCol = "invoice_no"; }

  if (!targetTable) {
    return res.status(400).json({ error: `Unsupported master target table mapping for profile '${profileName}'.` });
  }

  // 3. Process each row
  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const mappedRow: any = {};
    const rowErrors: string[] = [];

    // Map headers based on profile
    Object.keys(rawRow).forEach(key => {
      const dbCol = mapping[key] || mapping[key.toLowerCase().trim()];
      if (dbCol) {
        mappedRow[dbCol] = rawRow[key];
      } else {
        mappedRow[key] = rawRow[key];
      }
    });

    // P0 Auto-populate required vehicle passport fields
    if (targetTable === "vehicle_passports" && mappedRow.vin) {
      if (!mappedRow.passport_id) {
        mappedRow.passport_id = `VP-${mappedRow.vin}`;
      }
      if (!mappedRow.vehicle_id) {
        mappedRow.vehicle_id = `V-${mappedRow.vin}`;
      }
    }

    // P1 Auto-populate required customer passport fields
    if (targetTable === "customer_passports" && mappedRow.contact_phone) {
      if (!mappedRow.customer_passport_id) {
        mappedRow.customer_passport_id = `CUST-${mappedRow.contact_phone}`;
      }
    }

    // P2 Map adjustment for service history / invoices: copy vin to chassis_no
    if ((targetTable === "service_history" || targetTable === "invoices") && mappedRow.vin && !mappedRow.chassis_no) {
      mappedRow.chassis_no = mappedRow.vin;
    }

    // Check mandatory fields
    mandatoryFields.forEach((field: string) => {
      if (mappedRow[field] === undefined || mappedRow[field] === null || mappedRow[field] === "") {
        rowErrors.push(`Missing mandatory field: ${field}`);
      }
    });

    // Apply regex/custom rules
    Object.keys(rules).forEach(field => {
      const pattern = rules[field];
      const val = String(mappedRow[field] || "");
      if (pattern && val) {
        const regex = new RegExp(pattern);
        if (!regex.test(val)) {
          rowErrors.push(`Field '${field}' value '${val}' fails validation pattern.`);
        }
      }
    });

    if (rowErrors.length > 0) {
      errors.push({ rowNumber: i + 1, rawData: rawRow, messages: rowErrors });
    } else {
      imported.push(mappedRow);
    }
  }

  // If dry run or validation errors exist, abort database writes
  if (dryRun || errors.length > 0) {
    return res.json({
      success: errors.length === 0,
      totalProcessed: rows.length,
      importedCount: 0,
      skippedDuplicates: 0,
      errors
    });
  }

  // 4. Perform actual database updates
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch actual columns in the target table to dynamic schema compatibility filtering
    const [columnsInfo] = await connection.query(`DESCRIBE \`${targetTable}\``) as any[];
    const validColumns = new Set(columnsInfo.map((c: any) => c.Field));

    for (const item of imported) {
      // Filter out mapped fields that do not physically exist in the target table (e.g. original_sale_date)
      const keys = Object.keys(item).filter(k => validColumns.has(k));
      if (keys.length === 0) continue;

      const placeholders = keys.map(() => "?").join(", ");
      const updateClauses = keys
        .filter(k => k !== pkCol)
        .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
        .join(", ");

      const sql = `
        INSERT INTO \`${targetTable}\` (${keys.map(k => `\`${k}\``).join(", ")})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClauses || `\`${pkCol}\` = \`${pkCol}\``}
      `;
      const values = keys.map(k => {
        let val = item[k];
        if (typeof val === "boolean") return val ? 1 : 0;
        return val;
      });

      await connection.execute(sql, values);
    }

    await connection.commit();
  } catch (err: any) {
    await connection.rollback();
    console.error("Bulk import transaction failed, rolled back:", err);
    return res.status(500).json({ error: "Database transaction failed: " + err.message });
  } finally {
    connection.release();
  }

  res.json({
    success: true,
    totalProcessed: rows.length,
    importedCount: imported.length,
    skippedDuplicates,
    errors: []
  });
}));

export default router;
