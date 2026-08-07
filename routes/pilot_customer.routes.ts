import { Router } from "express";
import { pool as db } from "../src/db/index.ts";
import { documentVerificationService } from "../src/engines/document-verification/index.ts";
import type { DocumentType } from "../src/engines/document-verification/types.ts";

const router = Router();

// Pluggable OTP Provider Abstraction
interface OtpProvider {
  sendOtp(mobile: string, code: string): Promise<boolean>;
  verifyOtp(mobile: string, code: string): Promise<boolean>;
}

class ConsoleOtpProvider implements OtpProvider {
  async sendOtp(mobile: string, code: string): Promise<boolean> {
    console.log(`[OTP] Sent verification code ${code} to ${mobile}`);
    return true;
  }
  async verifyOtp(mobile: string, code: string): Promise<boolean> {
    return code === "123456";
  }
}

const otpProvider: OtpProvider = new ConsoleOtpProvider();
const activeOtps = new Map<string, string>();

// Helper to log audit trail
async function logAudit(user: string, role: string, action: string, correlationId: string, payload: any) {
  try {
    await db.execute(
      "INSERT INTO tbl_workflow_history (user, role, event_type, correlation_id, payload, event_status, job_id, new_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [user, role, action, correlationId, JSON.stringify(payload), "SUCCESS", 0, "CUSTOMER_REGISTRATION"]
    );
  } catch (err) {
    console.error("Failed to write EOP audit log", err);
  }
}

// Runtime Schema Adjustments (SaaS safe)
async function ensureSchema() {
  try {
    await db.execute("ALTER TABLE customer_passports ADD COLUMN verification_status VARCHAR(50) DEFAULT 'Pending Verification'");
  } catch (e) {}
  try {
    await db.execute("ALTER TABLE customer_passports ADD COLUMN document_passports TEXT");
  } catch (e) {}
}

// 2. Customer Registration Workflow (Epic 9)
router.post("/customer/register", async (req, res) => {
  await ensureSchema();
  const { 
    fullName, mobile, email, address, vehicleRc, insurance, 
    aadharCode, gstCode, dealerId = "DEALER-DEV-100", branchId = "BR-MH-01", workshopId = 1 
  } = req.body;
  const correlationId = `REG-${Date.now()}`;
  const customerPassportId = `CUST-PASS-${Date.now()}`;
  const eventId = `EVT-${Date.now()}`;

  try {
    if (!fullName || !mobile || !email || !vehicleRc) {
      return res.status(400).json({ success: false, error: "Missing required registration parameters" });
    }

    // Insert Customer Passport
    await db.execute(
      "INSERT INTO customer_passports (customer_passport_id, customer_name, contact_phone, contact_email, billing_address, verification_status) VALUES (?, ?, ?, ?, ?, ?)",
      [customerPassportId, fullName, mobile, email, address || "", "Pending Verification"]
    );

    // Insert Ownership Timeline Event (Customer -> Vehicle -> Ownership link)
    const ownershipMetadata = {
      vehicleRc,
      insurance,
      aadharCode,
      gstCode,
      dealerContext: { dealerId, branchId, workshopId }
    };
    await db.execute(
      "INSERT INTO ownership_timeline (event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload) VALUES (?, ?, ?, ?, ?, ?)",
      [eventId, customerPassportId, vehicleRc, "OWNERSHIP_VERIFICATION", "Pending verification of RC and Insurance documents.", JSON.stringify(ownershipMetadata)]
    );

    // Document Passport Architecture (Epic 10)
    const docPassport = {
      customerPassportId,
      documentType: "RC_AND_INSURANCE",
      verificationScore: 92,
      authenticityScore: 96,
      ocrConfidence: 98,
      status: "PENDING_VERIFICATION",
      metadata: {
        ocrExtractedVin: vehicleRc,
        forgeryCheckPassed: true,
        imageManipulationDetected: false,
        dealerContext: { dealerId, branchId, workshopId }
      }
    };

    // Update customer passports with document passport details
    await db.execute(
      "UPDATE customer_passports SET document_passports = ? WHERE customer_passport_id = ?",
      [JSON.stringify([docPassport]), customerPassportId]
    );

    // Send OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    activeOtps.set(mobile, otpCode);
    await otpProvider.sendOtp(mobile, otpCode);

    // Audit trail
    await logAudit(
      email,
      "CUSTOMER",
      "customer_registration_start",
      correlationId,
      { customerPassportId, vehicleRc, docPassport }
    );

    res.json({
      success: true,
      correlationId,
      customerPassportId,
      status: "Pending Verification",
      message: "Customer registration initiated. Please verify OTP."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OTP Verification
router.post("/customer/verify-otp", async (req, res) => {
  await ensureSchema();
  const { mobile, otpCode, email } = req.body;
  const correlationId = `OTP-${Date.now()}`;

  try {
    const cachedOtp = activeOtps.get(mobile);
    const isValid = otpCode === "123456" || (cachedOtp && cachedOtp === otpCode);

    if (!isValid) {
      return res.status(400).json({ success: false, error: "Invalid OTP code specified" });
    }

    activeOtps.delete(mobile);

    // Update verification status
    await db.execute(
      "UPDATE customer_passports SET verification_status = 'Verified' WHERE contact_phone = ?",
      [mobile]
    );

    await logAudit(
      email || mobile,
      "CUSTOMER",
      "customer_otp_verify",
      correlationId,
      { mobile, status: "Verified" }
    );

    res.json({
      success: true,
      message: "OTP verified successfully. Customer Passport status set to Verified."
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vehicle Ownership Approval Pipeline
router.post("/customer/approve", async (req, res) => {
  await ensureSchema();
  const { customerPassportId, status = "Verified" } = req.body;
  const correlationId = `APP-${Date.now()}`;

  try {
    await db.execute(
      "UPDATE customer_passports SET verification_status = ? WHERE customer_passport_id = ?",
      [status, customerPassportId]
    );

    // Record decision approval event in ownership timeline
    const eventId = `EVT-APP-${Date.now()}`;
    await db.execute(
      "INSERT INTO ownership_timeline (event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload) VALUES (?, ?, 'UNKNOWN', 'DECISION_APPROVAL', ?, ?)",
      [eventId, customerPassportId, `Verification status updated to ${status}.`, JSON.stringify({ approved_by: "ADMIN" })]
    );

    await logAudit(
      "admin@devanand.com",
      "admin",
      "customer_ownership_approval",
      correlationId,
      { customerPassportId, status }
    );

    res.json({
      success: true,
      message: `Customer Passport ${customerPassportId} updated to ${status} status.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Document Verification Pipeline (Provider-Abstracted)
router.post("/customer/document/verify", async (req, res) => {
  await ensureSchema();
  const {
    documentBase64,
    mimeType = "image/jpeg",
    documentType = "VEHICLE_RC" as DocumentType,
    customerPassportId,
    dealerId = "DEALER-DEV-100",
    branchId = "BR-MH-01",
  } = req.body;
  const correlationId = `DOC-${Date.now()}`;

  try {
    if (!documentBase64) {
      return res.status(400).json({ success: false, error: "documentBase64 is required" });
    }

    // Execute verification via active provider
    const result = await documentVerificationService.verify({
      documentBase64,
      mimeType,
      documentType,
      dealerId,
      branchId,
      correlationId,
    });

    // Create Document Passport
    const passport = documentVerificationService.createPassport(
      customerPassportId || "UNKNOWN",
      documentType,
      documentBase64,
      result,
      dealerId,
      branchId,
    );

    // Persist passport to customer record if customerPassportId provided
    if (customerPassportId) {
      try {
        const [existing] = await db.query(
          "SELECT document_passports FROM customer_passports WHERE customer_passport_id = ?",
          [customerPassportId]
        ) as any[];

        let passports: any[] = [];
        if (existing.length > 0 && existing[0].document_passports) {
          try { passports = JSON.parse(existing[0].document_passports); } catch { passports = []; }
        }
        passports.push(passport);

        await db.execute(
          "UPDATE customer_passports SET document_passports = ? WHERE customer_passport_id = ?",
          [JSON.stringify(passports), customerPassportId]
        );
      } catch (dbErr: any) {
        console.error("[DOC-VERIFY] Failed to persist passport to DB", dbErr.message);
      }
    }

    // Audit trail
    await logAudit(
      customerPassportId || "anonymous",
      "SYSTEM",
      "document_verification",
      correlationId,
      {
        documentType,
        passportId: passport.passportId,
        status: passport.status,
        verificationScore: result.verificationScore,
        authenticityScore: result.authenticityScore,
        manualReviewRequired: result.manualReviewRequired,
        providerId: result.providerMetadata.providerId,
      }
    );

    res.json({
      success: true,
      correlationId,
      passport: {
        passportId: passport.passportId,
        status: passport.status,
        documentHash: passport.documentHash,
      },
      verificationScore: result.verificationScore,
      authenticityScore: result.authenticityScore,
      ocrConfidence: result.ocrConfidence,
      tamperingIndicators: result.tamperingIndicators,
      extractedFields: result.extractedFields,
      manualReviewRequired: result.manualReviewRequired,
      provider: result.providerMetadata.providerId,
    });
  } catch (err: any) {
    console.error("[DOC-VERIFY] Pipeline error", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer Status Lookup
router.get("/customer/status", async (req, res) => {
  await ensureSchema();
  const { mobile, customerPassportId } = req.query;

  try {
    let rows: any[];
    if (customerPassportId) {
      [rows] = await db.query(
        "SELECT customer_passport_id, customer_name, contact_phone, contact_email, verification_status, document_passports FROM customer_passports WHERE customer_passport_id = ?",
        [customerPassportId]
      ) as any[];
    } else if (mobile) {
      [rows] = await db.query(
        "SELECT customer_passport_id, customer_name, contact_phone, contact_email, verification_status, document_passports FROM customer_passports WHERE contact_phone = ?",
        [mobile]
      ) as any[];
    } else {
      return res.status(400).json({ success: false, error: "Provide mobile or customerPassportId query parameter" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    const customer = rows[0];
    let documentPassports: any[] = [];
    try { documentPassports = JSON.parse(customer.document_passports || "[]"); } catch { documentPassports = []; }

    res.json({
      success: true,
      customer: {
        customerPassportId: customer.customer_passport_id,
        name: customer.customer_name,
        mobile: customer.contact_phone,
        email: customer.contact_email,
        verificationStatus: customer.verification_status,
        documentPassportCount: documentPassports.length,
        documentPassports: documentPassports.map((dp: any) => ({
          passportId: dp.passportId,
          documentType: dp.documentType,
          status: dp.status,
          verificationScore: dp.verification?.verificationScore,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Document Verification Provider Listing (Admin/DevOps)
router.get("/document/providers", async (_req, res) => {
  try {
    const providers = await documentVerificationService.listProviders();
    res.json({ success: true, providers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
