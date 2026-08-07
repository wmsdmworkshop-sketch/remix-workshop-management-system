import { Router } from "express";
import { pool as dbPool } from "../src/db/index.ts";
import crypto from "crypto";
import { getState } from "../server/state.ts";

const router = Router();

// ---- Epic 1: Customer Passport 2.0 ----

// Create or update Customer Passport
router.post("/passports", async (req: any, res: any) => {
  const {
    customer_passport_id = crypto.randomUUID(),
    customer_name,
    customer_type = "Individual",
    contact_phone,
    contact_email = null,
    pan_number = null,
    gstin = null,
    billing_address = null,
    credit_limit = 0.00,
    outstanding_amount = 0.00,
    preferred_workshop_id = null,
    preferred_advisor_id = null,
    communication_preferences = "SMS,Email",
    digital_consent = true,
    loyalty_status = "BRONZE",
    complaint_history = "[]",
    warranty_history = "[]"
  } = req.body;

  if (!customer_name || !contact_phone) {
    return res.status(400).json({ error: "Please provide customer_name and contact_phone." });
  }

  try {
    const [existing] = await dbPool.query(
      "SELECT * FROM customer_passports WHERE contact_phone = ?",
      [contact_phone]
    ) as any[];

    if (existing.length > 0) {
      const id = existing[0].customer_passport_id;
      await dbPool.execute(
        `UPDATE customer_passports SET 
          customer_name = ?, customer_type = ?, contact_email = ?, pan_number = ?, gstin = ?, 
          billing_address = ?, credit_limit = ?, outstanding_amount = ?, preferred_workshop_id = ?, 
          preferred_advisor_id = ?, communication_preferences = ?, digital_consent = ?, 
          loyalty_status = ?, complaint_history = ?, warranty_history = ?
         WHERE customer_passport_id = ?`,
        [
          customer_name, customer_type, contact_email, pan_number, gstin,
          billing_address, credit_limit, outstanding_amount, preferred_workshop_id,
          preferred_advisor_id, communication_preferences, digital_consent ? 1 : 0,
          loyalty_status, complaint_history, warranty_history, id
        ]
      );
      res.json({ success: true, customer_passport_id: id });
    } else {
      await dbPool.execute(
        `INSERT INTO customer_passports (
          customer_passport_id, customer_name, customer_type, contact_phone, contact_email, 
          pan_number, gstin, billing_address, credit_limit, outstanding_amount, 
          preferred_workshop_id, preferred_advisor_id, communication_preferences, 
          digital_consent, loyalty_status, complaint_history, warranty_history
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_passport_id, customer_name, customer_type, contact_phone, contact_email,
          pan_number, gstin, billing_address, credit_limit, outstanding_amount,
          preferred_workshop_id, preferred_advisor_id, communication_preferences,
          digital_consent ? 1 : 0, loyalty_status, complaint_history, warranty_history
        ]
      );
      res.json({ success: true, customer_passport_id });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get detailed Customer Passport
router.get("/passports/:id", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT * FROM customer_passports WHERE customer_passport_id = ? OR contact_phone = ?",
      [req.params.id, req.params.id]
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: "Customer passport not found." });
    }

    const row = rows[0];
    res.json({
      passport: {
        ...row,
        digital_consent: !!row.digital_consent,
        complaint_history: JSON.parse(row.complaint_history || "[]"),
        warranty_history: JSON.parse(row.warranty_history || "[]")
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 2: Ownership Timeline ----

// Record Timeline Event
router.post("/timeline/event", async (req: any, res: any) => {
  const {
    event_id = crypto.randomUUID(),
    customer_passport_id,
    vehicle_vin,
    event_type,
    description,
    metadata_payload = {}
  } = req.body;

  if (!customer_passport_id || !vehicle_vin || !event_type || !description) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    await dbPool.execute(
      "INSERT INTO ownership_timeline (event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload) VALUES (?, ?, ?, ?, ?, ?)",
      [event_id, customer_passport_id, vehicle_vin, event_type, description, JSON.stringify(metadata_payload)]
    );
    res.json({ success: true, event_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve Timeline events
router.get("/timeline", async (req: any, res: any) => {
  const { customer_passport_id, vehicle_vin } = req.query;
  try {
    let query = "SELECT * FROM ownership_timeline WHERE 1=1";
    const params: any[] = [];
    if (customer_passport_id) {
      query += " AND customer_passport_id = ?";
      params.push(customer_passport_id);
    }
    if (vehicle_vin) {
      query += " AND vehicle_vin = ?";
      params.push(vehicle_vin);
    }
    query += " ORDER BY event_date DESC";

    const [rows] = await dbPool.query(query, params) as any[];
    const events = rows.map((r: any) => ({
      ...r,
      metadata_payload: JSON.parse(r.metadata_payload || "{}")
    }));

    res.json({ events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 3 & 8: Digital Approval Center ----
router.post("/approvals", async (req: any, res: any) => {
  const {
    approval_id = crypto.randomUUID(),
    job_id,
    customer_passport_id,
    approval_type,
    approved_items = [],
    signature_blob = null,
    ip_address = "127.0.0.1",
    user_agent = "Browser"
  } = req.body;

  if (!job_id || !customer_passport_id || !approval_type) {
    return res.status(400).json({ error: "Missing required approval params." });
  }

  try {
    await dbPool.execute(
      `INSERT INTO digital_approvals (
        approval_id, job_id, customer_passport_id, approval_type, approved_items, 
        signature_blob, status, ip_address, user_agent
       ) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?)`,
      [
        approval_id, job_id, customer_passport_id, approval_type, 
        JSON.stringify(approved_items), signature_blob, ip_address, user_agent
      ]
    );

    // Write audit event to ownership timeline
    await dbPool.execute(
      "INSERT INTO ownership_timeline (event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload) VALUES (?, ?, ?, 'DECISION_APPROVAL', ?, ?)",
      [
        crypto.randomUUID(),
        customer_passport_id,
        "UNKNOWN",
        `Digitally approved ${approval_type} with signature.`,
        JSON.stringify({ approval_id, job_id, approval_type })
      ]
    );

    res.json({ success: true, approval_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/approvals/:id", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query("SELECT * FROM digital_approvals WHERE approval_id = ? OR job_id = ?", [req.params.id, req.params.id]) as any[];
    if (rows.length === 0) {
      return res.status(404).json({ error: "Approval record not found." });
    }
    const row = rows[0];
    res.json({
      approval: {
        ...row,
        approved_items: JSON.parse(row.approved_items || "[]")
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 4 & 5: AI & Proactive Service Intelligence ----
router.post("/advisor/recommend", async (req: any, res: any) => {
  const { odometer, days_since_last_service, customer_passport_id } = req.body;

  if (odometer === undefined) {
    return res.status(400).json({ error: "Odometer reading is required." });
  }

  // AI Advisor rules evaluation (Epic 5)
  let recommendedWork = "Routine Checkup";
  let explanation = "";
  let serviceCircular = "SC/DEFAULT/00";
  let workshopTimeHours = 2;

  // Let's assert against the 140,000 ±3000 km rule (137,000 to 143,000 km policy)
  if (odometer >= 137000 && odometer <= 143000) {
    recommendedWork = "Complete Service B (140,000 Kms Scheduled Service)";
    explanation = `Your vehicle is due for 2nd Service. Odometer reading is ${odometer} km, which satisfies the 140,000 ±3000 km scheduled service threshold policy.`;
    serviceCircular = "SC/2023/133 - Cummins Engine Scheduled Maintenance";
    workshopTimeHours = 6;
  } else if (odometer >= 37000 && odometer <= 43000) {
    recommendedWork = "First Major Service (40,000 Kms Scheduled Service)";
    explanation = `Your vehicle is due for 1st Service. Odometer reading is ${odometer} km, which satisfies the 40,000 km Scheduled Service policy.`;
    serviceCircular = "SC/2023/133";
    workshopTimeHours = 4;
  } else {
    explanation = "Odometer reading does not match any scheduled preventive maintenance threshold. Recommended routine vehicle safety inspection.";
  }

  const recommendations = {
    recommendedWork,
    explanation,
    serviceCircular,
    workshopTimeHours,
    campaigns: [
      { id: "CAMP-992", name: "IAS steering column check campaign", urgency: "MEDIUM" }
    ],
    recalls: [],
    fitnessDue: "2027-10-15",
    pucDue: "2026-11-20",
    insuranceExpiry: "2026-09-01",
    amcExpiry: "2026-12-15"
  };

  res.json({ success: true, recommendations });
});

// ---- Epic 6: Live Vehicle Tracking ----
router.get("/tracking/:job_id", async (req: any, res: any) => {
  try {
    const [jobs] = await dbPool.query("SELECT status FROM job_cards WHERE job_id = ?", [req.params.job_id]) as any[];
    if (jobs.length === 0) {
      return res.status(404).json({ error: "Job card not found." });
    }

    const status = jobs[0].status;
    let stage = "Received";
    let progressPercent = 10;

    switch (status) {
      case "Waiting":
        stage = "Vehicle Received";
        progressPercent = 15;
        break;
      case "Diagnosis":
        stage = "Diagnosis";
        progressPercent = 30;
        break;
      case "Pending Approval":
        stage = "Waiting for Approval";
        progressPercent = 45;
        break;
      case "Waiting for Parts":
        stage = "Waiting for Parts";
        progressPercent = 60;
        break;
      case "Repair Started":
        stage = "Repair Started";
        progressPercent = 75;
        break;
      case "QC":
        stage = "QC";
        progressPercent = 85;
        break;
      case "Road Test":
        stage = "Road Test";
        progressPercent = 90;
        break;
      case "Ready":
        stage = "Ready for Delivery";
        progressPercent = 95;
        break;
      case "Delivered":
        stage = "Delivered";
        progressPercent = 100;
        break;
    }

    res.json({
      job_id: Number(req.params.job_id),
      stage,
      progressPercent,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 7: Fleet Customer Dashboard ----
router.get("/fleet/dashboard", async (req: any, res: any) => {
  try {
    res.json({
      fleetHealth: "94%",
      vehiclesDue: 4,
      breakdowns: 1,
      warrantyStatus: "3 Claims Pending",
      amcStatus: "Active",
      revenueContribution: 320000.00,
      downtimeHours: 42,
      openJobCards: 3,
      completedJobs: 18,
      vehicleHealthScore: 88.50
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 9: Communication Hub ----
router.post("/notifications", async (req: any, res: any) => {
  const { customer_passport_id, channel, subject, body_text } = req.body;

  if (!customer_passport_id || !channel || !body_text) {
    return res.status(400).json({ error: "Missing required notification fields." });
  }

  const log_id = crypto.randomUUID();
  try {
    await dbPool.execute(
      "INSERT INTO communication_logs (log_id, customer_passport_id, channel, subject, body_text) VALUES (?, ?, ?, ?, ?)",
      [log_id, customer_passport_id, channel, subject || null, body_text]
    );
    res.json({ success: true, log_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/notifications", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query("SELECT * FROM communication_logs ORDER BY created_at DESC") as any[];
    res.json({ logs: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 10: Customer Satisfaction Intelligence ----
router.post("/feedback", async (req: any, res: any) => {
  const {
    feedback_id = crypto.randomUUID(),
    customer_passport_id,
    job_id,
    csi_score,
    nps_score,
    workshop_rating,
    advisor_rating,
    technician_rating,
    comments = "",
    resolved_quality = "EXCELLENT"
  } = req.body;

  if (!customer_passport_id || !job_id || csi_score === undefined || nps_score === undefined) {
    return res.status(400).json({ error: "Missing required feedback fields." });
  }

  try {
    await dbPool.execute(
      `INSERT INTO customer_feedback (
        feedback_id, customer_passport_id, job_id, csi_score, nps_score, 
        workshop_rating, advisor_rating, technician_rating, comments, resolved_quality
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        feedback_id, customer_passport_id, job_id, csi_score, nps_score,
        workshop_rating || null, advisor_rating || null, technician_rating || null,
        comments, resolved_quality
      ]
    );

    // Compute dynamic loyalty / health score index
    const healthIndex = Math.round(((csi_score + nps_score) / 20) * 100);

    // Update customer passport loyalty status if health index is high
    let loyalty = "BRONZE";
    if (healthIndex >= 90) loyalty = "GOLD";
    else if (healthIndex >= 75) loyalty = "SILVER";

    await dbPool.execute(
      "UPDATE customer_passports SET loyalty_status = ? WHERE customer_passport_id = ?",
      [loyalty, customer_passport_id]
    );

    res.json({ success: true, feedback_id, healthIndex, loyalty });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Epic 14: Executive Customer Dashboard ----
router.get("/executive/dashboard", async (req: any, res: any) => {
  try {
    const [cCount] = await dbPool.query("SELECT COUNT(*) as count FROM customer_passports") as any[];
    const [fCount] = await dbPool.query("SELECT COUNT(*) as count FROM fleet_passports") as any[];

    res.json({
      metrics: {
        totalActiveCustomers: cCount[0]?.count || 0,
        fleetCustomers: fCount[0]?.count || 0,
        retailCustomers: Math.max(0, (cCount[0]?.count || 0) - (fCount[0]?.count || 0)),
        serviceRetentionRate: "92.4%",
        repeatBusinessRate: "78.2%",
        overallCSI: 9.2,
        overallNPS: 84,
        lostCustomersRate: "3.6%",
        revenuePerCustomer: 45000.00
      },
      topFleetAccounts: [
        { name: "National Logistics Corp", revenue: 154000.00, vehicles: 22 },
        { name: "Express Cargo India", revenue: 98000.00, vehicles: 12 }
      ],
      healthDistribution: [
        { status: "HEALTHY", count: 88 },
        { status: "AT_RISK", count: 12 }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
