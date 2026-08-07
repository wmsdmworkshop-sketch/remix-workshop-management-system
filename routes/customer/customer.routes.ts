import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool as dbPool } from "../../src/db/index.ts";
import {
  authenticateCustomerToken,
  issueCustomerToken,
  generateOtp,
  verifyOtp as verifyCustomerOtp,
  rateLimiter,
  initRedis,
  CUSTOMER_JWT_SECRET,
} from "../../src/customer-portal/api/middleware.ts";
import { sanitizeJobCard, buildVehicleView, verifyJobOwnership } from "../../src/customer-portal/api/sanitizer.ts";
import { initCacheRedis, swrFetch } from "../../src/customer-portal/api/cache.ts";
import { processCustomerChat } from "../../src/customer-portal/api/agent.ts";
import { getState, setState, saveState } from "../../server/state.ts";

const getDB = getState;
const setDB = (db: any) => {
  setState(db);
  saveState();
};

const router = Router();

// Initialize Redis for rate limiting and caching
try {
  const redisInstance = initRedis();
  initCacheRedis(redisInstance);
  if (redisInstance) {
    console.log("[CustomerPortal] Redis initialized for rate limiting & cache.");
  } else {
    console.log("[CustomerPortal] No Redis URL — using in-memory rate limiter & cache.");
  }
} catch (err) {
  console.warn("[CustomerPortal] Redis init failed, using in-memory fallback.");
  initCacheRedis(null);
}

// ---- Customer Auth: Request OTP ----
router.post("/auth/request-otp", async (req: any, res: any) => {
  const { mobile } = req.body;
  if (!mobile || typeof mobile !== "string" || mobile.length < 10) {
    return res.status(400).json({ error: "Please provide a valid mobile number." });
  }

  const normalizedMobile = mobile.replace(/\s+/g, "");

  // Verify this mobile number exists in job_cards
  const db = getDB();
  const hasJobs = (db.jobCards || []).some((j: any) => {
    const jobMobile = (j.customer_mobile || "").replace(/\s+/g, "");
    return (
      jobMobile === normalizedMobile ||
      jobMobile.endsWith(normalizedMobile.slice(-10)) ||
      normalizedMobile.endsWith(jobMobile.slice(-10))
    );
  });

  if (!hasJobs) {
    // Anti-enumeration: return success even if no match, but don't issue OTP
    return res.json({ success: true, message: "If this number is registered, you will receive an OTP." });
  }

  const otp = generateOtp(normalizedMobile);
  console.log(`[CustomerPortal] OTP for ${normalizedMobile}: ${otp}`);

  res.json({ success: true, message: "OTP sent to your mobile number.", expiresInMinutes: 15 });
});

// ---- Customer Auth: Verify OTP ----
router.post("/auth/verify-otp", async (req: any, res: any) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ error: "Please provide mobile number and OTP." });
  }

  const normalizedMobile = mobile.replace(/\s+/g, "");
  const result = verifyCustomerOtp(normalizedMobile, otp);

  if (!result.valid) {
    return res.status(401).json({ error: result.error });
  }

  // Find customer name from their most recent job card
  const db = getDB();
  const customerJob = (db.jobCards || [])
    .filter((j: any) => verifyJobOwnership(j, normalizedMobile))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const customerName = customerJob?.customer_name || "Customer";

  const token = issueCustomerToken(normalizedMobile, customerName);

  res.json({
    success: true,
    token,
    customer: {
      mobile: normalizedMobile,
      name: customerName,
    },
  });
});

// ---- Customer Auth: Signup / Register ----
router.post("/auth/signup", async (req: any, res: any) => {
  const { name, mobile, authProvider } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Please provide a valid name (at least 2 characters)." });
  }
  if (!mobile || typeof mobile !== "string" || mobile.length < 10) {
    return res.status(400).json({ error: "Please provide a valid mobile number." });
  }

  const normalizedMobile = mobile.replace(/\s+/g, "");

  const db = getDB();
  const existingJob = (db.jobCards || []).find((j: any) => {
    const jobMobile = (j.customer_mobile || "").replace(/\s+/g, "");
    return (
      jobMobile === normalizedMobile ||
      jobMobile.endsWith(normalizedMobile.slice(-10)) ||
      normalizedMobile.endsWith(jobMobile.slice(-10))
    );
  });

  let customerName = name.trim();
  if (existingJob) {
    customerName = existingJob.customer_name || customerName;
  } else {
    const nextId = (db.jobCards || []).reduce((max: number, j: any) => Math.max(max, j.job_id), 0) + 1;
    const newJobNo = `JC${String(nextId).padStart(3, "0")}`;

    const newJob = {
      job_id: nextId,
      job_card_no: newJobNo,
      vrn: "NEW-USER",
      customer_name: customerName,
      customer_mobile: normalizedMobile,
      vehicle_make: "TATA",
      vehicle_model: "Nexon",
      vehicle_year: 2026,
      km_reading: 0,
      sr_type_id: 1,
      job_description: `Customer signup via ${authProvider || "Mobile"}`,
      priority: "Normal",
      status: "Waiting",
      progress_pct: 0,
      created_by: 1,
      created_at: new Date().toISOString(),
      remarks: `Registered on Portal via ${authProvider || "Mobile"}. Profile setup pending.`
    };

    db.jobCards.push(newJob);
    setDB(db);
  }

  const token = issueCustomerToken(normalizedMobile, customerName);

  res.json({
    success: true,
    token,
    customer: {
      mobile: normalizedMobile,
      name: customerName,
    },
  });
});

// ---- Customer: List Vehicles ----
router.get("/vehicles", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const mobile = req.customer.mobile;
    const cacheKey = `vehicles:${mobile}`;

    const vehicles = await swrFetch(cacheKey, async () => {
      let allJobs: any[] = [];

      try {
        const [rows] = await dbPool.query(
          "SELECT * FROM customer_job_cards_view WHERE customer_mobile = ? OR customer_mobile LIKE ?",
          [mobile, `%${mobile.slice(-10)}`]
        ) as any[];
        if (rows && rows.length > 0) {
          allJobs = rows;
        }
      } catch (dbErr) {
        console.warn("[CustomerPortal] View query failed for vehicles, using memory:", dbErr);
      }

      if (allJobs.length === 0) {
        const db = getDB();
        allJobs = (db.jobCards || []).filter((j: any) => verifyJobOwnership(j, mobile));
      }

      const vrnMap = new Map<string, any[]>();
      allJobs.forEach((j: any) => {
        const vrn = j.vrn || "UNKNOWN";
        if (!vrnMap.has(vrn)) vrnMap.set(vrn, []);
        vrnMap.get(vrn)!.push(j);
      });

      return Array.from(vrnMap.entries()).map(([vrn, jobs]) =>
        buildVehicleView(vrn, jobs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      );
    });

    res.json({ vehicles });
  } catch (err: any) {
    console.error("[CustomerPortal] Vehicles error:", err);
    res.status(500).json({ error: "Failed to retrieve vehicles." });
  }
});

// ---- Customer: List Job Cards ----
router.get("/jobs", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const mobile = req.customer.mobile;
    const cacheKey = `jobs:${mobile}`;

    const jobs = await swrFetch(cacheKey, async () => {
      let allJobs: any[] = [];

      try {
        const [rows] = await dbPool.query(
          "SELECT * FROM customer_job_cards_view WHERE customer_mobile = ? OR customer_mobile LIKE ? ORDER BY completed_at DESC, date_in DESC",
          [mobile, `%${mobile.slice(-10)}`]
        ) as any[];
        if (rows && rows.length > 0) {
          allJobs = rows;
        }
      } catch (dbErr) {
        console.warn("[CustomerPortal] View query failed for jobs, using memory:", dbErr);
      }

      if (allJobs.length === 0) {
        const db = getDB();
        allJobs = (db.jobCards || [])
          .filter((j: any) => verifyJobOwnership(j, mobile))
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const db = getDB();
      return allJobs.map((j: any) => sanitizeJobCard(j, db.srTypes));
    });

    res.json({ jobs });
  } catch (err: any) {
    console.error("[CustomerPortal] Jobs error:", err);
    res.status(500).json({ error: "Failed to retrieve job cards." });
  }
});

// ---- Customer: Single Job Detail ----
router.get("/jobs/:job_card_no", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const mobile = req.customer.mobile;
    const jobCardNo = req.params.job_card_no;
    let rawJob: any = null;

    try {
      const [rows] = await dbPool.query(
        "SELECT * FROM customer_job_cards_view WHERE job_card_no = ? AND (customer_mobile = ? OR customer_mobile LIKE ?)",
        [jobCardNo, mobile, `%${mobile.slice(-10)}`]
      ) as any[];
      if (rows && rows.length > 0) {
        rawJob = rows[0];
      }
    } catch (dbErr) {
      console.warn("[CustomerPortal] View query failed for single job, using memory:", dbErr);
    }

    if (!rawJob) {
      const db = getDB();
      const found = (db.jobCards || []).find(
        (j: any) => j.job_card_no === jobCardNo
      );

      if (!found || !verifyJobOwnership(found, mobile)) {
        return res.status(404).json({ error: "Job card not found." });
      }
      rawJob = found;
    }

    const db = getDB();
    const job = sanitizeJobCard(rawJob, db.srTypes);
    res.json({ job });
  } catch (err: any) {
    console.error("[CustomerPortal] Job detail error:", err);
    res.status(500).json({ error: "Failed to retrieve job details." });
  }
});

// ---- Document Vault: Secure S3 Link Generator ----
router.get("/vault/link/:invoice_no", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const mobile = req.customer.mobile;
    const invoiceNo = req.params.invoice_no;

    const db = getDB();
    const hasAccess = (db.jobCards || []).some(
      (j: any) => j.invoice_no === invoiceNo && verifyJobOwnership(j, mobile)
    );

    if (!hasAccess) {
      return res.status(404).json({ error: "Document not found." });
    }

    const downloadToken = jwt.sign(
      { customer_id: mobile, invoice_no: invoiceNo },
      CUSTOMER_JWT_SECRET,
      { expiresIn: "15m" }
    );

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const secureUrl = `${protocol}://${host}/api/customer/vault/download?token=${downloadToken}`;

    res.json({ url: secureUrl, expires_in: "15 minutes" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to generate download link." });
  }
});

// ---- Document Vault: Secure S3 Download Handler ----
router.get("/vault/download", async (req: any, res: any) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).send("Access Denied: Missing secure token.");
  }

  try {
    const decoded = jwt.verify(token, CUSTOMER_JWT_SECRET) as any;
    if (!decoded.customer_id || !decoded.invoice_no) {
      return res.status(401).send("Access Denied: Invalid secure token.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Invoice-${decoded.invoice_no}.pdf"`);

    const pdfBuffer = Buffer.from(
      `%PDF-1.4\n%     \n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>\nendobj\n4 0 obj\n<< /Length 75 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Devanand Motors Secure Invoice Document: ${decoded.invoice_no}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000015 00000 n\n0000000062 00000 n\n0000000119 00000 n\n0000000219 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n343\n%%EOF`
    );

    res.send(pdfBuffer);
  } catch (err) {
    res.status(403).send("Access Denied: Link has expired or is invalid.");
  }
});

// ---- Customer Alerts & Push Notifications Endpoint ----
router.get("/alerts", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const mobile = req.customer.mobile;
    const db = getDB();
    const myJobs = (db.jobCards || []).filter((j: any) => verifyJobOwnership(j, mobile));

    const alerts: any[] = [];
    myJobs.forEach((j: any) => {
      if (j.status === "Completed") {
        alerts.push({
          id: `pickup:${j.job_card_no}`,
          type: "action_needed",
          title: "Ready for Pickup",
          message: `Your vehicle ${j.vrn} (${j.vehicle_model}) is completed and ready for pickup!`,
          job_card_no: j.job_card_no,
          severity: "success",
        });
      }
      if (j.status === "Waiting") {
        alerts.push({
          id: `approve:${j.job_card_no}`,
          type: "approval_needed",
          title: "Approval Needed",
          message: `A service estimate for vehicle ${j.vrn} requires your approval to begin repairs.`,
          job_card_no: j.job_card_no,
          severity: "warning",
        });
      }
    });

    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: "Failed to load alerts." });
  }
});

// ---- Customer: AI Chat ----
router.post("/chat", authenticateCustomerToken, rateLimiter, async (req: any, res: any) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Please provide a message." });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: "Message too long. Please keep it under 500 characters." });
    }

    const response = await processCustomerChat(
      message.trim(),
      req.customer.mobile,
      req.customer.name,
      getDB
    );

    res.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[CustomerPortal] Chat error:", err);
    res.status(500).json({ error: "Assistant is temporarily unavailable. Please try again." });
  }
});

// ---- Customer: Get Passports (Master Data Lookup) ----
router.get("/passports", async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query("SELECT * FROM customer_passports") as any[];
    res.json({ passports: rows });
  } catch (err: any) {
    console.error("[CustomerPortal] Failed to retrieve customer passports:", err);
    res.status(500).json({ error: "Failed to retrieve passports." });
  }
});

export default router;

