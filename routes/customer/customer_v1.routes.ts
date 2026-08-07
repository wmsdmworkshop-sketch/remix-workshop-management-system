import { Router } from "express";
import { pool as dbPool } from "../../src/db/index.ts";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  authenticateCustomerToken,
  issueCustomerToken,
  generateOtp,
  verifyOtp as verifyCustomerOtp,
} from "../../src/customer-portal/api/middleware.ts";

const router = Router();

// ---- Auth: Request OTP ----
router.post("/auth/request-otp", async (req: any, res: any) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: "Please provide mobile number." });
  }
  const otp = generateOtp(mobile);
  res.json({ success: true, message: `OTP sent to mobile: ${otp}` });
});

// ---- Auth: Login / OTP Verify ----
router.post("/auth/login", async (req: any, res: any) => {
  const { mobile, otp, deviceId = "UNKNOWN", deviceName = "Browser", pushToken = null } = req.body;

  if (!mobile || !otp) {
    return res.status(400).json({ error: "Please provide mobile and otp." });
  }

  const otpRes = verifyCustomerOtp(mobile, otp);
  if (!otpRes.valid) {
    return res.status(401).json({ error: otpRes.error });
  }

  try {
    // Check if customer passport exists, if not create one
    let [existing] = await dbPool.query(
      "SELECT * FROM customer_passports WHERE contact_phone = ?",
      [mobile]
    ) as any[];

    let passportId = existing[0]?.customer_passport_id;

    const lastLogin = new Date();
    const currentDevice = { deviceId, deviceName, pushToken, lastActive: lastLogin.toISOString() };
    let registeredDevices = [currentDevice];
    let trustedDevices = [deviceId];
    let securityAudit = [{ event: "LOGIN", timestamp: lastLogin.toISOString(), deviceId, ip: req.ip }];

    if (existing.length > 0) {
      const dbDevices = JSON.parse(existing[0].registered_devices || "[]");
      const dbTrusted = JSON.parse(existing[0].trusted_devices || "[]");
      const dbAudit = JSON.parse(existing[0].security_audit_trail || "[]");

      // Merge devices
      const deviceIndex = dbDevices.findIndex((d: any) => d.deviceId === deviceId);
      if (deviceIndex > -1) {
        dbDevices[deviceIndex] = { ...dbDevices[deviceIndex], ...currentDevice };
      } else {
        dbDevices.push(currentDevice);
      }
      registeredDevices = dbDevices;

      if (!dbTrusted.includes(deviceId)) {
        dbTrusted.push(deviceId);
      }
      trustedDevices = dbTrusted;

      dbAudit.push({ event: "LOGIN", timestamp: lastLogin.toISOString(), deviceId, ip: req.ip });
      securityAudit = dbAudit;

      // Update passport
      await dbPool.execute(
        `UPDATE customer_passports SET 
          last_login = ?, 
          registered_devices = ?, 
          trusted_devices = ?, 
          security_audit_trail = ?,
          push_notification_tokens = ?
         WHERE customer_passport_id = ?`,
        [
          lastLogin, 
          JSON.stringify(registeredDevices), 
          JSON.stringify(trustedDevices), 
          JSON.stringify(securityAudit),
          JSON.stringify(registeredDevices.map((d: any) => d.pushToken).filter(Boolean)),
          passportId
        ]
      );
    } else {
      passportId = crypto.randomUUID();
      await dbPool.execute(
        `INSERT INTO customer_passports (
          customer_passport_id, customer_name, contact_phone, loyalty_status, digital_consent,
          last_login, registered_devices, trusted_devices, security_audit_trail, push_notification_tokens
         ) VALUES (?, ?, ?, 'BRONZE', 1, ?, ?, ?, ?, ?)`,
        [
          passportId,
          "New Customer",
          mobile,
          lastLogin,
          JSON.stringify(registeredDevices),
          JSON.stringify(trustedDevices),
          JSON.stringify(securityAudit),
          JSON.stringify([pushToken].filter(Boolean))
        ]
      );
    }

    const token = issueCustomerToken(mobile, existing[0]?.customer_name || "New Customer");

    res.json({
      success: true,
      token,
      customer_passport_id: passportId,
      message: "Authentication successful."
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Profile: Get Digital Identity Passport ----
router.get("/profile", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT * FROM customer_passports WHERE contact_phone = ?",
      [req.customer.mobile]
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const profile = rows[0];
    
    // Ensure no sensitive authentication passwords or secrets are returned
    const passport = {
      customer_passport_id: profile.customer_passport_id,
      customer_name: profile.customer_name,
      customer_type: profile.customer_type,
      contact_phone: profile.contact_phone,
      contact_email: profile.contact_email,
      pan_number: profile.pan_number,
      gstin: profile.gstin,
      billing_address: profile.billing_address,
      loyalty_status: profile.loyalty_status,
      preferred_workshop_id: profile.preferred_workshop_id,
      preferred_advisor_id: profile.preferred_advisor_id,
      preferred_language: profile.preferred_language || "en",
      notification_preferences: profile.notification_preferences || "PUSH,SMS,EMAIL",
      communication_preferences: profile.communication_preferences || "SMS,Email",
      digital_consent: !!profile.digital_consent,
      linked_user: profile.linked_user,
      linked_vehicles: JSON.parse(profile.linked_vehicles || "[]"),
      linked_fleet: profile.linked_fleet,
      registered_devices: JSON.parse(profile.registered_devices || "[]"),
      trusted_devices: JSON.parse(profile.trusted_devices || "[]"),
      last_login: profile.last_login,
      security_audit_trail: JSON.parse(profile.security_audit_trail || "[]")
    };

    res.json({ success: true, passport });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Profile: Update Preferences & Audit Trail ----
router.post("/profile", authenticateCustomerToken, async (req: any, res: any) => {
  const { preferred_language, notification_preferences, communication_preferences, consent_given } = req.body;

  try {
    const [rows] = await dbPool.query(
      "SELECT * FROM customer_passports WHERE contact_phone = ?",
      [req.customer.mobile]
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const profile = rows[0];
    const auditTrail = JSON.parse(profile.security_audit_trail || "[]");
    const consentHistory = JSON.parse(profile.consent_history || "[]");

    if (preferred_language) {
      auditTrail.push({ event: "LANGUAGE_CHANGE", from: profile.preferred_language, to: preferred_language, timestamp: new Date().toISOString() });
    }
    if (notification_preferences) {
      auditTrail.push({ event: "NOTIF_PREF_CHANGE", from: profile.notification_preferences, to: notification_preferences, timestamp: new Date().toISOString() });
    }
    if (consent_given !== undefined) {
      consentHistory.push({ consent: consent_given, timestamp: new Date().toISOString() });
      auditTrail.push({ event: "CONSENT_UPDATE", state: consent_given, timestamp: new Date().toISOString() });
    }

    await dbPool.execute(
      `UPDATE customer_passports SET 
        preferred_language = COALESCE(?, preferred_language),
        notification_preferences = COALESCE(?, notification_preferences),
        communication_preferences = COALESCE(?, communication_preferences),
        digital_consent = COALESCE(?, digital_consent),
        consent_history = ?,
        security_audit_trail = ?
       WHERE customer_passport_id = ?`,
      [
        preferred_language || null,
        notification_preferences || null,
        communication_preferences || null,
        consent_given !== undefined ? (consent_given ? 1 : 0) : null,
        JSON.stringify(consentHistory),
        JSON.stringify(auditTrail),
        profile.customer_passport_id
      ]
    );

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Vehicles: List linked customer vehicles ----
router.get("/vehicles", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [passports] = await dbPool.query(
      "SELECT linked_vehicles FROM customer_passports WHERE contact_phone = ?",
      [req.customer.mobile]
    ) as any[];

    let vehicles = [];
    if (passports.length > 0 && passports[0].linked_vehicles) {
      vehicles = JSON.parse(passports[0].linked_vehicles);
    }

    // fallback / populate from job_cards table
    if (vehicles.length === 0) {
      const [jobs] = await dbPool.query(
        "SELECT DISTINCT vrn, vehicle_model FROM job_cards WHERE customer_mobile = ?",
        [req.customer.mobile]
      ) as any[];
      vehicles = jobs.map((j: any) => ({ vin: j.vrn, model: j.vehicle_model, make: "TATA" }));
    }

    res.json({ success: true, vehicles });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Service Status: Live repair tracking mapped from Timeline ----
router.get("/service-status", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    // Get latest job card for this customer
    const [jobs] = await dbPool.query(
      "SELECT job_id, status FROM job_cards WHERE customer_mobile = ? ORDER BY created_at DESC LIMIT 1",
      [req.customer.mobile]
    ) as any[];

    if (jobs.length === 0) {
      return res.json({ success: true, stage: "No active service job cards.", progressPercent: 0 });
    }

    const job = jobs[0];
    let stage = "Vehicle Received";
    let progressPercent = 10;

    switch (job.status) {
      case "Waiting":
        stage = "Vehicle Received";
        progressPercent = 10;
        break;
      case "Diagnosis":
        stage = "Diagnosis";
        progressPercent = 25;
        break;
      case "Pending Approval":
        stage = "Estimate Waiting";
        progressPercent = 40;
        break;
      case "Waiting for Parts":
        stage = "Parts Reserved";
        progressPercent = 55;
        break;
      case "Repair Started":
        stage = "Repair Started";
        progressPercent = 70;
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
        stage = "Ready For Delivery";
        progressPercent = 95;
        break;
      case "Delivered":
        stage = "Delivered";
        progressPercent = 100;
        break;
    }

    res.json({
      success: true,
      jobId: job.job_id,
      stage,
      progressPercent,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Job Cards: Past repair invoices list ----
router.get("/jobcards", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      "SELECT job_id, job_card_no, vrn, vehicle_model, status, pre_invoice_no as invoice_no, (COALESCE(labor_price, 0) + COALESCE(parts_price, 0)) as total_revenue_est, created_at FROM job_cards WHERE customer_mobile = ? ORDER BY created_at DESC",
      [req.customer.mobile]
    ) as any[];

    res.json({ success: true, jobcards: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Warranty: Claims, Extensions & DNA ----
router.get("/warranty", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT wd.* FROM warranty_dna wd
       JOIN job_cards jc ON wd.claim_no = CAST(jc.job_id AS CHAR)
       WHERE jc.customer_mobile = ?`,
      [req.customer.mobile]
    ) as any[];

    res.json({
      success: true,
      policy: {
        status: "ACTIVE",
        expiryDate: "2028-12-15",
        extendedWarrantyCovered: true
      },
      claims: rows.map((r: any) => ({
        ...r,
        evidence_used: JSON.parse(r.evidence_used || "[]"),
        oem_questions: JSON.parse(r.oem_questions || "[]")
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Campaigns: Outstanding recall/campaign alerts ----
router.get("/campaigns", authenticateCustomerToken, async (req: any, res: any) => {
  res.json({
    success: true,
    campaigns: [
      { id: "CAMP-992", name: "IAS steering column check campaign", urgency: "MEDIUM", type: "CAMPAIGN" }
    ],
    recalls: [
      { id: "REC-108", name: "Brake Booster inspection recall notice", urgency: "HIGH", type: "RECALL" }
    ]
  });
});

// ---- Notifications: In-App notification logs ----
router.get("/notifications", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT cl.* FROM communication_logs cl
       JOIN customer_passports cp ON cl.customer_passport_id = cp.customer_passport_id
       WHERE cp.contact_phone = ? ORDER BY cl.created_at DESC`,
      [req.customer.mobile]
    ) as any[];

    res.json({ success: true, notifications: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Appointments: List and schedule appointments ----
router.get("/appointments", authenticateCustomerToken, async (req: any, res: any) => {
  res.json({
    success: true,
    appointments: [
      { appointment_id: "APT-2033", date: "2026-08-10", time: "10:30 AM", type: "Preventive Maintenance", status: "CONFIRMED" }
    ]
  });
});

router.post("/appointments", authenticateCustomerToken, async (req: any, res: any) => {
  const { date, time, type } = req.body;
  if (!date || !time) {
    return res.status(400).json({ error: "Missing date or time." });
  }
  res.json({
    success: true,
    appointment_id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "CONFIRMED"
  });
});

// ---- Approvals: Digital Signature Estimate consents ----
router.post("/approvals", authenticateCustomerToken, async (req: any, res: any) => {
  const { job_id, approval_type, approved_items = [], signature_blob = null } = req.body;

  if (!job_id || !approval_type) {
    return res.status(400).json({ error: "Missing required approval params." });
  }

  try {
    const [passports] = await dbPool.query(
      "SELECT customer_passport_id FROM customer_passports WHERE contact_phone = ?",
      [req.customer.mobile]
    ) as any[];

    if (passports.length === 0) {
      return res.status(404).json({ error: "Customer passport not found." });
    }

    const passportId = passports[0].customer_passport_id;
    const approvalId = crypto.randomUUID();

    await dbPool.execute(
      `INSERT INTO digital_approvals (
        approval_id, job_id, customer_passport_id, approval_type, approved_items, 
        signature_blob, status, ip_address, user_agent
       ) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?)`,
      [
        approvalId, job_id, passportId, approval_type, 
        JSON.stringify(approved_items), signature_blob, req.ip, req.headers["user-agent"] || "Browser"
      ]
    );

    // Timeline event
    await dbPool.execute(
      `INSERT INTO ownership_timeline (event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload) VALUES (?, ?, 'UNKNOWN', 'DECISION_APPROVAL', ?, ?)`,
      [
        crypto.randomUUID(),
        passportId,
        `Digitally approved ${approval_type} with signature.`,
        JSON.stringify({ approval_id: approvalId, job_id, approved_items })
      ]
    );

    res.json({ success: true, approval_id: approvalId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/approvals", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT da.* FROM digital_approvals da
       JOIN customer_passports cp ON da.customer_passport_id = cp.customer_passport_id
       WHERE cp.contact_phone = ?`,
      [req.customer.mobile]
    ) as any[];

    res.json({
      success: true,
      approvals: rows.map((r: any) => ({
        ...r,
        approved_items: JSON.parse(r.approved_items || "[]")
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Timeline: Immutable ownership logs ----
router.get("/timeline", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT ot.* FROM ownership_timeline ot
       JOIN customer_passports cp ON ot.customer_passport_id = cp.customer_passport_id
       WHERE cp.contact_phone = ? ORDER BY ot.event_date DESC`,
      [req.customer.mobile]
    ) as any[];

    res.json({
      success: true,
      events: rows.map((r: any) => ({
        ...r,
        metadata_payload: JSON.parse(r.metadata_payload || "{}")
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Vehicle Health Card ----
router.get("/vehicle-health", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    // Get latest odometer reading
    const [jobs] = await dbPool.query(
      "SELECT km_reading, vrn FROM job_cards WHERE customer_mobile = ? ORDER BY created_at DESC LIMIT 1",
      [req.customer.mobile]
    ) as any[];

    const odometer = jobs[0]?.km_reading || 0;
    const vin = jobs[0]?.vrn || "MH12XY9011";

    // AI advisor mileage rules check
    let recWork = "Routine Safety Checkup";
    let reason = "Odometer reading is in normal ranges.";
    let circular = "SC/DEFAULT/00";
    let rule = "Routine inspection threshold";
    let estCost = 2500.00;
    let confidence = 0.95;

    if (odometer >= 137000 && odometer <= 143000) {
      recWork = "Complete Service B (140,000 Kms Scheduled Service)";
      reason = `Odometer reading is ${odometer} km, which is within the 140,000 ±3000 km Scheduled Service policy window.`;
      circular = "SC/2023/133 - Scheduled Maintenance Instructions";
      rule = "140k scheduled mileage rule";
      estCost = 14500.00;
      confidence = 0.98;
    }

    res.json({
      success: true,
      vin,
      healthScore: 92.5,
      components: {
        engine: "95% (Excellent)",
        transmission: "90% (Good)",
        brakes: "88% (Good)",
        battery: "96% (Excellent)",
        tyres: "85% (Good)"
      },
      warrantyStatus: "ACTIVE",
      amcStatus: "ACTIVE",
      campaignStatus: "1 Campaign Available",
      recallStatus: "0 Active recalls",
      breakdownTrend: "Low risk of breakdown",
      serviceCompliance: "94% compliant with service schedule",
      nextService: "140,000 Kms or 2026-10-15",
      recommendedActions: [recWork],
      aiExplanation: {
        recommendation: recWork,
        reason,
        applicableRule: rule,
        applicableServicePolicy: "Preventive scheduled maintenance guidelines",
        applicableCircular: circular,
        applicableCampaign: "CAMP-992",
        evidence: ["Odometer reading: " + odometer + " km"],
        estimatedTimeHours: 6,
        expectedCost: estCost,
        confidence
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Feedback: NPS / CSI ratings ----
router.post("/feedback", authenticateCustomerToken, async (req: any, res: any) => {
  const { job_id, csi_score, nps_score, comments = "" } = req.body;

  if (!job_id || csi_score === undefined || nps_score === undefined) {
    return res.status(400).json({ error: "Missing job_id, csi_score, or nps_score." });
  }

  try {
    const [passports] = await dbPool.query(
      "SELECT customer_passport_id FROM customer_passports WHERE contact_phone = ?",
      [req.customer.mobile]
    ) as any[];

    if (passports.length === 0) {
      return res.status(404).json({ error: "Customer passport not found." });
    }

    const passportId = passports[0].customer_passport_id;
    const feedbackId = crypto.randomUUID();

    await dbPool.execute(
      `INSERT INTO customer_feedback (
        feedback_id, customer_passport_id, job_id, csi_score, nps_score, comments
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [feedbackId, passportId, job_id, csi_score, nps_score, comments]
    );

    // dynamic promotion of loyalty tier based on health index
    const healthIndex = Math.round(((csi_score + nps_score) / 20) * 100);
    let loyalty = "BRONZE";
    if (healthIndex >= 90) loyalty = "GOLD";
    else if (healthIndex >= 75) loyalty = "SILVER";

    await dbPool.execute(
      "UPDATE customer_passports SET loyalty_status = ? WHERE customer_passport_id = ?",
      [loyalty, passportId]
    );

    res.json({ success: true, feedback_id: feedbackId, loyaltyTier: loyalty });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
