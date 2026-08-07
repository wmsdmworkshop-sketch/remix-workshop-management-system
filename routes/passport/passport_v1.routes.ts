import { Router } from "express";
import { vehiclePassportFacade, ensureVehiclePassportSchema } from "../../src/engines/vehicle-passport/index.ts";
import type { CertificateType, EventType } from "../../src/engines/vehicle-passport/types.ts";

const router = Router();

// Ensure database tables exist dynamically on route initialization
let schemaEnsured = false;
async function initSchema() {
  if (!schemaEnsured) {
    try {
      await ensureVehiclePassportSchema();
      schemaEnsured = true;
    } catch (err: any) {
      console.error("[API-PASSPORT] Failed to initialize passport tables:", err.message);
    }
  }
}

// ─── 1. Create Passport ──────────────────────────────────────────────────────
router.post("/create", async (req, res) => {
  await initSchema();
  const {
    vehicleId, vin, engineNo, registrationNo, make, model,
    yearOfManufacture, fuelType, bodyType, dealerId = "DEALER-DEFAULT", branchId = "BRANCH-DEFAULT"
  } = req.body;

  try {
    if (!vehicleId || !vin) {
      return res.status(400).json({ success: false, error: "vehicleId and vin are required" });
    }

    const passport = await vehiclePassportFacade.initPassport({
      vehicleId, vin, engineNo, registrationNo, make, model,
      yearOfManufacture: Number(yearOfManufacture), fuelType, bodyType, dealerId, branchId
    });

    res.json({ success: true, passport });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 2. Fetch Full Passport ──────────────────────────────────────────────────
router.get("/:passportId", async (req, res) => {
  await initSchema();
  const { passportId } = req.params;

  try {
    const passport = await vehiclePassportFacade.getPassport(passportId);
    if (!passport) {
      return res.status(404).json({ success: false, error: "Passport not found" });
    }

    res.json({ success: true, passport });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 3. Add Event ────────────────────────────────────────────────────────────
router.post("/:passportId/event", async (req, res) => {
  await initSchema();
  const { passportId } = req.params;
  const {
    eventType, eventSource, eventDate = new Date().toISOString(), odometerKm, description, verifiedBy = "System",
    isDealerAgent = false, dealerId, branchId, evidence, repair, accident, part, modification
  } = req.body;

  try {
    if (!eventType || !eventSource) {
      return res.status(400).json({ success: false, error: "eventType and eventSource are required" });
    }

    const event = await vehiclePassportFacade.registerEvent({
      passportId,
      eventType: eventType as EventType,
      eventSource,
      eventDate,
      odometerKm: Number(odometerKm || 0),
      description,
      verifiedBy,
      isDealerAgent,
      dealerId,
      branchId,
      evidence,
      repair,
      accident,
      part,
      modification
    });

    res.json({ success: true, event });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 4. Get Timeline ─────────────────────────────────────────────────────────
router.get("/:passportId/timeline", async (req, res) => {
  await initSchema();
  const { passportId } = req.params;

  try {
    const events = await vehiclePassportFacade.getEvents(passportId);
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 5. Generate Passport Certificate (Premium Check) ────────────────────────
router.post("/:passportId/certificate", async (req, res) => {
  await initSchema();
  const { passportId } = req.params;
  const { certificateType = "VERIFIED_RESALE" as CertificateType, generatedBy = "System", tier = "FREE" } = req.body;

  try {
    const certificate = await vehiclePassportFacade.generatePassportCertificate(
      passportId,
      certificateType as CertificateType,
      generatedBy,
      tier as "FREE" | "PREMIUM"
    );

    res.json({ success: true, certificate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 6. Verify QR Code ────────────────────────────────────────────────────────
router.get("/qr/:qrCode", async (req, res) => {
  await initSchema();
  const { qrCode } = req.params;

  try {
    const certificate = await vehiclePassportFacade.verifyPassportCertificate(qrCode);
    if (!certificate) {
      return res.status(404).json({ success: false, error: "Invalid certificate/QR code" });
    }

    res.json({
      success: true,
      status: certificate.certificateStatus,
      certificate: {
        certificateId: certificate.certificateId,
        passportId: certificate.passportId,
        certificateType: certificate.certificateType,
        generatedAt: certificate.generatedAt,
        expiresAt: certificate.expiresAt,
        passportScoreAtGeneration: certificate.passportScoreAtGeneration,
        digitalSignature: certificate.digitalSignature,
        certificateHash: certificate.certificateHash,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 7. Search/Lookup Passport ───────────────────────────────────────────────
router.get("/lookup", async (req, res) => {
  await initSchema();
  const { vin, registrationNo, vehicleId } = req.query;

  try {
    const passport = await vehiclePassportFacade.lookupPassport({
      vin: vin as string,
      registrationNo: registrationNo as string,
      vehicleId: vehicleId as string
    });

    if (!passport) {
      return res.status(404).json({ success: false, error: "Vehicle passport not found" });
    }

    res.json({ success: true, passport });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
