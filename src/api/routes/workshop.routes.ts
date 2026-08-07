import { Router, Request, Response } from "express";
import { pool } from "../../db/index.ts";
import { authorize } from "../middleware/auth.ts";

/**
 * =============================================================================
 * DWIP Enterprise Platform — Workshop & Job Card Routes (WP-01 Decomposition)
 * Bounded Context: Workshop Operations / Job Cards & Bay Queuing
 * =============================================================================
 */

export const workshopRouter = Router();

/**
 * Row-level Security Helper: Validates if a user persona can access a specific Job Card.
 * Service Advisors can ONLY access Job Cards assigned to them or created by them.
 * Administrators, Service Managers, Floor Supervisors, and Floor Incharges access all Job Cards.
 */
export function isAuthorizedForJobCard(jobCard: any, user: any): boolean {
  if (!user) return true;
  const role = (user.role || user.user_role || "").toLowerCase().trim().replace(/_/g, " ");
  if (role !== "service advisor") {
    return true; // Admin, Service Manager, Floor Supervisor, Floor Incharge, Receptionist see all
  }
  
  const username = (user.username || "").toLowerCase().trim();
  const fullName = (user.full_name || user.name || "").toLowerCase().trim();
  const userId = Number(user.user_id || user.id || 0);

  const saField = (jobCard.service_advisor || "").toLowerCase().trim();
  const createdBy = Number(jobCard.created_by || 0);

  if (saField && (saField === username || saField === fullName || (fullName && saField.includes(fullName)) || (username && saField.includes(username)))) {
    return true;
  }
  if (userId && createdBy === userId) {
    return true;
  }

  return false;
}

// GET /api/job-cards — List job cards with Service Advisor Row-Level Scoping
workshopRouter.get(
  "/job-cards",
  authorize("job_card", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const user = req.user;
      const role = (user?.role || user?.user_role || "").toLowerCase().trim().replace(/_/g, " ");
      let rows: any[] = [];

      if (role === "service advisor") {
        const username = (user?.username || "").toLowerCase().trim();
        const fullName = (user?.full_name || user?.name || "").toLowerCase().trim();
        const userId = Number(user?.user_id || user?.id || 0);

        const [dbRows] = await pool.query(
          `SELECT * FROM job_cards 
           WHERE LOWER(service_advisor) = LOWER(?) 
              OR LOWER(service_advisor) = LOWER(?)
              OR LOWER(service_advisor) LIKE CONCAT('%', LOWER(?), '%')
              OR created_by = ?
           ORDER BY job_id DESC LIMIT 100`,
          [username, fullName, fullName || username, userId]
        ) as any[];
        rows = dbRows;
      } else {
        const [dbRows] = await pool.query(
          "SELECT * FROM job_cards ORDER BY job_id DESC LIMIT 100"
        ) as any[];
        rows = dbRows;
      }

      return res.json({ success: true, count: rows.length, data: rows, jobCards: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/job-cards/:id — Get job card details with Row-Level 403 Enforcement
workshopRouter.get(
  "/job-cards/:id",
  authorize("job_card", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const jobId = Number(req.params.id);
      const [rows] = await pool.query(
        "SELECT * FROM job_cards WHERE job_id = ? LIMIT 1",
        [jobId]
      ) as any[];
      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, error: "Job card not found" });
      }

      const jobCard = rows[0];
      if (!isAuthorizedForJobCard(jobCard, req.user)) {
        return res.status(403).json({
          success: false,
          error: "ACCESS_DENIED",
          message: "Forbidden: You are only authorized to access Job Cards assigned to you."
        });
      }

      return res.json({ success: true, data: jobCard });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/job-cards — Create new job card
workshopRouter.post(
  "/job-cards",
  authorize("job_card", "create"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { 
        vrn, 
        customer_name, 
        customer_mobile, 
        vehicle_make, 
        vehicle_model, 
        priority, 
        km_reading, 
        odometer_reading, 
        remarks,
        job_card_no
      } = req.body;

      const jobCardNo = job_card_no || `JC-${Date.now().toString().slice(-6)}`;
      const odo = odometer_reading || km_reading || 0;
      
      const [result] = await pool.execute(
        `INSERT INTO job_cards (
          job_card_no, vrn, customer_name, customer_mobile, vehicle_make, vehicle_model, 
          km_reading, odometer_reading, remarks, priority, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW())`,
        [
          jobCardNo,
          vrn,
          customer_name,
          customer_mobile,
          vehicle_make || "TATA",
          vehicle_model || "Tata Commercial Heavy Vehicle",
          odo,
          odo,
          remarks || "",
          priority || "Normal"
        ]
      ) as any[];

      return res.status(201).json({
        success: true,
        message: "Job card created successfully",
        job_id: result.insertId,
        job_card_no: jobCardNo
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// GET /api/bays — List workshop service bays
workshopRouter.get(
  "/bays",
  authorize("job_card", "view"),
  async (req: Request, res: Response): Promise<any> => {
    try {
      const [rows] = await pool.query("SELECT * FROM bays ORDER BY bay_id ASC") as any[];
      return res.json({ success: true, data: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);
