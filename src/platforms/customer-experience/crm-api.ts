/**
 * =============================================================================
 * DWIP Customer Experience — CRM API Router
 * Module: platforms/customer-experience/crm-api.ts
 * =============================================================================
 */

import { Router } from "express";
import { CRMService } from "./crm-service";

export function createCRMRouter(
  getCachedDB: () => any,
  saveDBLocal: (data: any) => void
): Router {
  const router = Router();
  const service = new CRMService(getCachedDB, saveDBLocal);

  // GET Customer 360 view
  router.get("/customer/:id/360", (req, res) => {
    const info = service.getCustomer360(req.params.id);
    if (!info) return res.status(404).json({ error: "Customer not found." });
    res.json(info);
  });

  // GET Fleet 360 view
  router.get("/fleet/:id/360", (req, res) => {
    const info = service.getFleet360(req.params.id);
    if (!info) return res.status(404).json({ error: "Fleet account not found." });
    res.json(info);
  });

  // POST Create Lead
  router.post("/leads", (req, res) => {
    try {
      const lead = service.createLead(req.body);
      res.json(lead);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST Schedule Appointment
  router.post("/appointments", (req, res) => {
    try {
      const appt = service.scheduleAppointment(req.body);
      res.json(appt);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
