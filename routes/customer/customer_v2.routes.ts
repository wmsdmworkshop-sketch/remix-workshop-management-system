import { Router } from "express";
import { pool as dbPool } from "../../src/db/index.ts";
import { authenticateCustomerToken } from "../../src/customer-portal/api/middleware.ts";
import { processCustomerChat } from "../../src/customer-portal/api/agent.ts";
import { getState } from "../../server/state.ts";

const getDB = getState;
const router = Router();

// ---- AI: Chat endpoint ----
router.post("/ai/chat", authenticateCustomerToken, async (req: any, res: any) => {
  const { message } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Please provide a message." });
  }

  try {
    const response = await processCustomerChat(
      message.trim(),
      req.customer.mobile,
      req.customer.name,
      getDB
    );

    res.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("[Customer v2 AI Chat] Error:", err);
    res.status(500).json({ error: "AI Assistant is temporarily offline. Please try again." });
  }
});

// ---- Fleet: Multi-vehicle management dashboards ----
router.get("/fleet", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    // Check if the customer owns a fleet passport
    const [passport] = await dbPool.query(
      `SELECT fp.* FROM fleet_passports fp
       JOIN customer_passports cp ON fp.fleet_owner_passport_id = cp.customer_passport_id
       WHERE cp.contact_phone = ?`,
      [req.customer.mobile]
    ) as any[];

    if (passport.length === 0) {
      return res.status(403).json({ error: "No fleet account found for this customer profile." });
    }

    const fleet = passport[0];

    // Fetch vehicles belonging to this fleet customer
    const [vehicles] = await dbPool.query(
      "SELECT vrn, vehicle_model, status, km_reading FROM job_cards WHERE customer_mobile = ?",
      [req.customer.mobile]
    ) as any[];

    res.json({
      success: true,
      fleetDetails: {
        fleet_name: fleet.fleet_name,
        operational_region: fleet.operational_region,
        amc_contract_reference: fleet.amc_contract_reference,
        sla_priority_level: fleet.sla_priority_level
      },
      metrics: {
        fleetHealth: "94.5%",
        vehiclesDue: vehicles.filter((v: any) => v.status !== "Delivered" && v.status !== "Completed").length,
        breakdowns: 1,
        totalFleetCount: vehicles.length,
        averageDowntimeHours: 42.0
      },
      vehicles: vehicles.map((v: any) => ({
        vin: v.vrn,
        model: v.vehicle_model,
        odometer: v.km_reading,
        status: v.status
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Driver: Driver mappings ----
router.get("/driver", authenticateCustomerToken, async (req: any, res: any) => {
  try {
    const [rows] = await dbPool.query(
      `SELECT dp.* FROM driver_passports dp
       JOIN customer_passports cp ON cp.contact_phone = dp.contact_phone
       WHERE cp.contact_phone = ?`,
      [req.customer.mobile]
    ) as any[];

    res.json({ success: true, drivers: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
