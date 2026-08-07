import { Router } from "express";
import { pool as dbPool } from "../src/db/index.ts";
import crypto from "crypto";
import { getState } from "../server/state.ts";

const router = Router();

// ---- 1. Warranty Passports (Epic 1) ----

// Create Warranty Passport
router.post("/passports", async (req: any, res: any) => {
  const {
    claim_id,
    passport_id = crypto.randomUUID(),
    identity = {},
    dna = {},
    timeline = [],
    relationships = {},
    knowledge_links = [],
    evidence_links = []
  } = req.body;

  if (!claim_id) {
    return res.status(400).json({ error: "Please provide a valid claim_id." });
  }

  try {
    // Check if claim exists
    const [claims] = await dbPool.query("SELECT * FROM warranty_claims WHERE claim_id = ?", [claim_id]) as any[];
    if (claims.length === 0) {
      // Auto-create standard claim placeholder if not present
      await dbPool.execute(
        "INSERT INTO warranty_claims (claim_id, job_id, claim_type, part_number, claim_amount, status) VALUES (?, ?, ?, ?, ?, ?)",
        [claim_id, identity.job_id || 1, identity.claim_type || "STANDARD", identity.part_number || "UNKNOWN", identity.claim_amount || 0.00, "PENDING"]
      );
    }

    const [existing] = await dbPool.query("SELECT * FROM warranty_passports WHERE claim_id = ?", [claim_id]) as any[];
    if (existing.length > 0) {
      await dbPool.execute(
        "UPDATE warranty_passports SET identity_payload = ?, dna_payload = ?, timeline_payload = ?, relationships = ?, knowledge_links = ?, evidence_links = ? WHERE claim_id = ?",
        [
          JSON.stringify(identity),
          JSON.stringify(dna),
          JSON.stringify(timeline),
          JSON.stringify(relationships),
          JSON.stringify(knowledge_links),
          JSON.stringify(evidence_links),
          claim_id
        ]
      );
    } else {
      await dbPool.execute(
        "INSERT INTO warranty_passports (passport_id, claim_id, identity_payload, dna_payload, timeline_payload, relationships, knowledge_links, evidence_links) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          passport_id,
          claim_id,
          JSON.stringify(identity),
          JSON.stringify(dna),
          JSON.stringify(timeline),
          JSON.stringify(relationships),
          JSON.stringify(knowledge_links),
          JSON.stringify(evidence_links)
        ]
      );
    }

    res.json({ success: true, passport_id, claim_id });
  } catch (err: any) {
    console.error("Error saving warranty passport:", err);
    res.status(500).json({ error: err.message || "Failed to save passport." });
  }
});

// List all Passports
router.get("/passports", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT p.*, c.claim_type, c.part_number, c.claim_amount, c.status
      FROM warranty_passports p
      JOIN warranty_claims c ON p.claim_id = c.claim_id
    `) as any[];

    const passports = rows.map((row: any) => ({
      passport_id: row.passport_id,
      claim_id: row.claim_id,
      claim_type: row.claim_type,
      part_number: row.part_number,
      claim_amount: row.claim_amount,
      status: row.status,
      identity: JSON.parse(row.identity_payload || "{}"),
      dna: JSON.parse(row.dna_payload || "{}"),
      timeline: JSON.parse(row.timeline_payload || "[]"),
      relationships: JSON.parse(row.relationships || "{}"),
      knowledge_links: JSON.parse(row.knowledge_links || "[]"),
      evidence_links: JSON.parse(row.evidence_links || "[]")
    }));

    res.json({ passports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Passport detail
router.get("/passports/:id", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(`
      SELECT p.*, c.claim_type, c.part_number, c.claim_amount, c.status
      FROM warranty_passports p
      JOIN warranty_claims c ON p.claim_id = c.claim_id
      WHERE p.passport_id = ? OR p.claim_id = ?
    `, [req.params.id, req.params.id]) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: "Warranty Passport not found." });
    }

    const row = rows[0];
    res.json({
      passport: {
        passport_id: row.passport_id,
        claim_id: row.claim_id,
        claim_type: row.claim_type,
        part_number: row.part_number,
        claim_amount: row.claim_amount,
        status: row.status,
        identity: JSON.parse(row.identity_payload || "{}"),
        dna: JSON.parse(row.dna_payload || "{}"),
        timeline: JSON.parse(row.timeline_payload || "[]"),
        relationships: JSON.parse(row.relationships || "{}"),
        knowledge_links: JSON.parse(row.knowledge_links || "[]"),
        evidence_links: JSON.parse(row.evidence_links || "[]")
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- 2. Pre-Submission Validation & Scoring (Epic 3 & 9) ----
router.post("/validate", async (req: any, res: any) => {
  const {
    odometer,
    days_since_sale,
    has_torque_log = false,
    has_calibration = false,
    has_measurements = false,
    has_images = false,
    service_history_complete = false
  } = req.body;

  if (odometer === undefined || days_since_sale === undefined) {
    return res.status(400).json({ error: "Please provide odometer reading and days_since_sale." });
  }

  // Verification checks (Epic 3)
  const checklist = {
    odometerCheck: odometer <= 300000, // Tata Signa 3L km limit
    ageCheck: days_since_sale <= 1095, // 3 years limit
    torqueLogged: !!has_torque_log,
    calibrated: !!has_calibration,
    measured: !!has_measurements,
    imagesUploaded: !!has_images,
    serviceHistoryComplete: !!service_history_complete
  };

  // Readiness Score & Claim Health Score calculation (Epic 9)
  let passedChecks = 0;
  if (checklist.odometerCheck) passedChecks++;
  if (checklist.ageCheck) passedChecks++;
  if (checklist.torqueLogged) passedChecks++;
  if (checklist.calibrated) passedChecks++;
  if (checklist.measured) passedChecks++;
  if (checklist.imagesUploaded) passedChecks++;
  if (checklist.serviceHistoryComplete) passedChecks++;

  const readinessScore = Math.round((passedChecks / 7) * 100);
  const claimHealthScore = readinessScore; // Parity mapping
  const approvalProbability = Math.round(claimHealthScore * 0.95);

  const missingEvidence: string[] = [];
  if (!checklist.torqueLogged) missingEvidence.push("Torque logs are missing.");
  if (!checklist.calibrated) missingEvidence.push("System calibration certificate missing.");
  if (!checklist.measured) missingEvidence.push("Physical micrometer measurements missing.");
  if (!checklist.imagesUploaded) missingEvidence.push("Component failure images missing.");

  res.json({
    success: true,
    readinessScore,
    claimHealthScore,
    approvalProbability,
    checklist,
    missingEvidence,
    shouldSubmit: readinessScore >= 70,
    willLikelyBeApproved: approvalProbability >= 65
  });
});

// ---- 3. AI Claim Assistant (Epic 4 & 7) ----
router.post("/assistant", async (req: any, res: any) => {
  const { complaint, odometer, days_since_sale, service_history_complete } = req.body;

  if (!complaint) {
    return res.status(400).json({ error: "Please provide the complaint text." });
  }

  // Suggest claim type (Goodwill engine logic)
  let claimType = "STANDARD";
  let explanation = "";

  const standardWarrantyExpired = odometer > 300000 || days_since_sale > 1095;
  if (standardWarrantyExpired) {
    if (service_history_complete && days_since_sale <= 1200) {
      claimType = "GOODWILL";
      explanation = "Recommended Goodwill Claim Type because Standard Warranty has recently expired but the customer demonstrates high loyalty with a complete dealership service history.";
    } else {
      claimType = "POLICY_EXTENSION";
      explanation = "Recommended Policy Extension Type due to expired standard warranty thresholds.";
    }
  } else {
    claimType = "STANDARD";
    explanation = "Recommended Standard Warranty Type since odometer and vehicle age are within the standard 3-year / 300,000 km limits.";
  }

  // Match complaint to causal part and circulars
  let causalPart = "C Cummins B6.7 Engine Cylinder";
  let labourOperation = "Engine Cylinder Gasket Replacement";
  let serviceCircular = "SC/2023/133 - Cummins Engine Warranty Guidelines";

  if (complaint.toLowerCase().includes("wheel") || complaint.toLowerCase().includes("alignment")) {
    causalPart = "Front Steer Axle Shaft Assembly";
    labourOperation = "IAS Front Wheel Alignment Adjustment";
    serviceCircular = "SC/2026/76 - IAS Wheel Alignment Procedure";
  }

  res.json({
    recommendations: {
      claimType,
      failureCode: "F-ENG-0822",
      causalPart,
      labourOperation,
      serviceCircular,
      supportingEvidence: ["Torque calibration log", "IAS alignment check-sheet"]
    },
    explanation
  });
});

// ---- 4. Repeat Failure Intelligence (Epic 5) ----
router.get("/repeat-failures", async (req: any, res: any) => {
  const { vehicle_id, part_number } = req.query;

  // Emulate checking historical service logs
  const repeatIssues = {
    isRepeatComplaint: true,
    repeatRepairCount: 2,
    causalPartPattern: "Cummins B6.7 engine cylinder head gasket failure noted in previous 2 repair cards",
    recommendation: "Flagged repeat failure. Inspect engine block surface planeness before installing replacement gasket."
  };

  res.json(repeatIssues);
});

// ---- 5. OEM Query Intelligence (Epic 8) ----
router.post("/oem-queries", async (req: any, res: any) => {
  const { claim_id, query_text, evidence_requested } = req.body;

  if (!claim_id || !query_text) {
    return res.status(400).json({ error: "Please provide claim_id and query_text." });
  }

  const query_id = crypto.randomUUID();
  try {
    await dbPool.execute(
      "INSERT INTO oem_queries (query_id, claim_id, query_text, evidence_requested, status) VALUES (?, ?, ?, ?, ?)",
      [query_id, claim_id, query_text, evidence_requested || null, "PENDING"]
    );
    res.json({ success: true, query_id, claim_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/oem-queries", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query("SELECT * FROM oem_queries ORDER BY created_at DESC") as any[];
    res.json({ queries: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- 6. Executive Warranty Dashboard (Epic 10) ----
router.get("/dashboard", async (req: any, res: any) => {
  try {
    // Query aggregations from warranty tables
    const [claims] = await dbPool.query("SELECT status, COUNT(*) as count, SUM(claim_amount) as total FROM warranty_claims GROUP BY status") as any[];
    
    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;
    let totalRevenue = 0.00;

    claims.forEach((c: any) => {
      if (c.status === "APPROVED") {
        approvedCount = c.count;
        totalRevenue = Number(c.total);
      } else if (c.status === "REJECTED") {
        rejectedCount = c.count;
      } else {
        pendingCount = c.count;
      }
    });

    const totalClaims = approvedCount + rejectedCount + pendingCount;
    const approvalRate = totalClaims > 0 ? Math.round((approvedCount / totalClaims) * 100) : 0;
    const rejectionRate = totalClaims > 0 ? Math.round((rejectedCount / totalClaims) * 100) : 0;

    res.json({
      metrics: {
        approvalRate: `${approvalRate}%`,
        rejectionRate: `${rejectionRate}%`,
        pendingClaims: pendingCount,
        goodwillCost: 24500.00,
        campaignCost: 154000.00,
        warrantyRevenue: totalRevenue,
        warrantyLeakage: "2.4%"
      },
      topFailedParts: [
        { part_number: "252512100101", name: "Cummins Cylinder Gasket", count: 8 },
        { part_number: "312019441121", name: "Front Steer Axle Pin", count: 3 }
      ],
      repeatFailureTrend: [
        { month: "May", rate: "1.2%" },
        { month: "June", rate: "1.8%" },
        { month: "July", rate: "1.4%" }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- 7. Warranty DNA (Epic 2, 13 & 14) ----

// Create or update Warranty DNA
router.post("/dna", async (req: any, res: any) => {
  const {
    dna_id = crypto.randomUUID(),
    claim_no,
    status,
    approved = false,
    evidence_used = [],
    circular_applied = "",
    failure_pattern = "",
    technician = "",
    vehicle = "",
    part = "",
    oem_questions = "",
    time_to_approval_sec = 0,
    lessons_learned = "",
    ai_confidence = 0.00,
    golden_claim = false
  } = req.body;

  if (!claim_no || !status) {
    return res.status(400).json({ error: "Please provide claim_no and status." });
  }

  try {
    const [existing] = await dbPool.query("SELECT * FROM warranty_dna WHERE claim_no = ?", [claim_no]) as any[];
    if (existing.length > 0) {
      await dbPool.execute(
        `UPDATE warranty_dna SET 
          status = ?, approved = ?, evidence_used = ?, circular_applied = ?, failure_pattern = ?, 
          technician = ?, vehicle = ?, part = ?, oem_questions = ?, time_to_approval_sec = ?, 
          lessons_learned = ?, ai_confidence = ?, golden_claim = ? 
         WHERE claim_no = ?`,
        [
          status,
          approved ? 1 : 0,
          JSON.stringify(evidence_used),
          circular_applied,
          failure_pattern,
          technician,
          vehicle,
          part,
          oem_questions,
          time_to_approval_sec,
          lessons_learned,
          ai_confidence,
          golden_claim ? 1 : 0,
          claim_no
        ]
      );
    } else {
      await dbPool.execute(
        `INSERT INTO warranty_dna (
          dna_id, claim_no, status, approved, evidence_used, circular_applied, failure_pattern, 
          technician, vehicle, part, oem_questions, time_to_approval_sec, lessons_learned, 
          ai_confidence, golden_claim
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dna_id,
          claim_no,
          status,
          approved ? 1 : 0,
          JSON.stringify(evidence_used),
          circular_applied,
          failure_pattern,
          technician,
          vehicle,
          part,
          oem_questions,
          time_to_approval_sec,
          lessons_learned,
          ai_confidence,
          golden_claim ? 1 : 0
        ]
      );
    }
    res.json({ success: true, dna_id, claim_no });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List all Warranty DNA learning objects
router.get("/dna", async (req: any, res: any) => {
  const { golden_claim } = req.query;
  try {
    let query = "SELECT * FROM warranty_dna";
    const params: any[] = [];
    if (golden_claim !== undefined) {
      query += " WHERE golden_claim = ?";
      params.push(golden_claim === "true" || golden_claim === "1" ? 1 : 0);
    }
    query += " ORDER BY created_at DESC";

    const [rows] = await dbPool.query(query, params) as any[];
    const dnaList = rows.map((row: any) => ({
      dna_id: row.dna_id,
      claim_no: row.claim_no,
      status: row.status,
      approved: !!row.approved,
      evidence_used: JSON.parse(row.evidence_used || "[]"),
      circular_applied: row.circular_applied,
      failure_pattern: row.failure_pattern,
      technician: row.technician,
      vehicle: row.vehicle,
      part: row.part,
      oem_questions: row.oem_questions,
      time_to_approval_sec: row.time_to_approval_sec,
      lessons_learned: row.lessons_learned,
      ai_confidence: Number(row.ai_confidence),
      golden_claim: !!row.golden_claim,
      created_at: row.created_at
    }));
    res.json({ dnaList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed Warranty DNA
router.get("/dna/:id", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query("SELECT * FROM warranty_dna WHERE dna_id = ? OR claim_no = ?", [req.params.id, req.params.id]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ error: "Warranty DNA not found." });
    }
    const row = rows[0];
    res.json({
      dna: {
        dna_id: row.dna_id,
        claim_no: row.claim_no,
        status: row.status,
        approved: !!row.approved,
        evidence_used: JSON.parse(row.evidence_used || "[]"),
        circular_applied: row.circular_applied,
        failure_pattern: row.failure_pattern,
        technician: row.technician,
        vehicle: row.vehicle,
        part: row.part,
        oem_questions: row.oem_questions,
        time_to_approval_sec: row.time_to_approval_sec,
        lessons_learned: row.lessons_learned,
        ai_confidence: Number(row.ai_confidence),
        golden_claim: !!row.golden_claim,
        created_at: row.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
