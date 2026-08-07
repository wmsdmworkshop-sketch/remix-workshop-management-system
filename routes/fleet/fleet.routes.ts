import { Router } from "express";
import { pool as db } from "../../src/db/index.ts";
import crypto from "crypto";
import {
  calculateFleetDashboardMetrics,
  calculateVehicleUtilization,
  evaluateFleetRelationshipAndRisk,
  calculateFleetProfitability,
  runPredictiveFleetEngine,
  scanExecutiveOpportunities,
  compileFleetDigitalTwin
} from "../../src/engines/fleet-intelligence-engine.ts";
import { evaluateFleetRules } from "../../src/engines/fleet-rules-evaluator.ts";

const router = Router();

// ---- FIP: List All Fleets ----
router.get("/", async (req: any, res: any) => {
  try {
    const [rows] = await db.query("SELECT * FROM fleet_passports") as any[];
    res.json({ success: true, fleets: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Create Fleet Passport ----
router.post("/", async (req: any, res: any) => {
  const {
    fleet_name,
    fleet_owner_passport_id,
    company,
    gst,
    industry = "Logistics",
    fleet_type = "Logistics",
    fleet_size = 0,
    primary_contact,
    fleet_manager,
    regional_manager,
    operational_region = "West India",
    preferred_workshop_id = null,
    preferred_service_advisor_id = null,
    warranty_agreements = null,
    communication_preferences = "EMAIL"
  } = req.body;

  if (!fleet_name || !fleet_owner_passport_id) {
    return res.status(400).json({ error: "Missing fleet_name or fleet_owner_passport_id." });
  }

  const fleetPassportId = crypto.randomUUID();

  try {
    await db.execute(
      `INSERT INTO fleet_passports (
        fleet_passport_id, fleet_name, fleet_owner_passport_id, operational_region, total_vehicles,
        company, gst, industry, fleet_type, fleet_size, primary_contact, fleet_manager, regional_manager,
        preferred_workshop_id, preferred_service_advisor_id, warranty_agreements, communication_preferences,
        relationship_health_score, fleet_health_score
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 100.00, 100.00)`,
      [
        fleetPassportId, fleet_name, fleet_owner_passport_id, operational_region, fleet_size,
        company, gst, industry, fleet_type, fleet_size, primary_contact, fleet_manager, regional_manager,
        preferred_workshop_id, preferred_service_advisor_id, JSON.stringify(warranty_agreements), communication_preferences
      ]
    );

    // Record initial timeline event
    await db.execute(
      `INSERT INTO ownership_timeline (event_id, customer_passport_id, vehicle_vin, event_type, description, metadata_payload)
       VALUES (?, ?, 'UNKNOWN', 'FLEET_REGISTERED', ?, ?)`,
      [
        crypto.randomUUID(),
        fleet_owner_passport_id,
        `Fleet "${fleet_name}" registered successfully under company: ${company || "Individual"}.`,
        JSON.stringify({ fleet_passport_id: fleetPassportId, fleet_size })
      ]
    );

    res.json({ success: true, fleet_passport_id: fleetPassportId, message: "Fleet Passport registered successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Get Fleet Passport details ----
router.get("/passports", async (req: any, res: any) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing fleet passport ID." });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM fleet_passports WHERE fleet_passport_id = ?",
      [id]
    ) as any[];

    if (rows.length === 0) {
      return res.status(404).json({ error: "Fleet Passport not found." });
    }

    const fleet = rows[0];
    res.json({
      success: true,
      passport: {
        ...fleet,
        warranty_agreements: JSON.parse(fleet.warranty_agreements || "[]"),
        fleet_timeline: JSON.parse(fleet.fleet_timeline || "[]"),
        knowledge_links: JSON.parse(fleet.knowledge_links || "[]"),
        dna_links: JSON.parse(fleet.dna_links || "[]"),
        linked_vehicles: JSON.parse(fleet.linked_vehicles || "[]"),
        linked_drivers: JSON.parse(fleet.linked_drivers || "[]"),
        linked_contracts: JSON.parse(fleet.linked_contracts || "[]"),
        linked_warranty: JSON.parse(fleet.linked_warranty || "[]"),
        telematics_config: JSON.parse(fleet.telematics_config || "{}")
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Fleet Health Score & Risk engine ----
router.get("/health", async (req: any, res: any) => {
  const { id } = req.query;
  if (!id) {
    // Return summary of healthiest/highest risk fleets across the entire system
    try {
      const [fleets] = await db.query("SELECT fleet_passport_id, fleet_name, fleet_health_score, relationship_health_score FROM fleet_passports") as any[];
      if (fleets.length === 0) {
        return res.json({ success: true, healthiest: null, highestRisk: null, list: [] });
      }

      // Sort
      const sortedByHealth = [...fleets].sort((a, b) => b.fleet_health_score - a.fleet_health_score);
      const healthiest = sortedByHealth[0];
      const highestRisk = sortedByHealth[sortedByHealth.length - 1];

      return res.json({
        success: true,
        healthiestFleet: healthiest.fleet_name,
        highestRiskFleet: highestRisk.fleet_name,
        healthScoreRanking: sortedByHealth.map(f => ({ name: f.fleet_name, health: f.fleet_health_score }))
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const analysis = await evaluateFleetRelationshipAndRisk(id);
    res.json({
      success: true,
      fleet_passport_id: id,
      relationshipHealthScore: analysis.relationship_score,
      riskLevel: analysis.risk_level,
      reasons: analysis.risk_reasons,
      recommendations: analysis.recommendations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Cost & Profitability Intelligence ----
router.get("/cost", async (req: any, res: any) => {
  const { id } = req.query;
  const userRole = req.headers["x-user-role"] || "Service Advisor";

  if (!id) {
    return res.status(400).json({ error: "Missing fleet passport ID." });
  }

  // Cost data visibility check: Only Dealer Principal and GM Service see margins/profitability
  const isAuthorizedExecutive = ["Dealer Principal", "GM Service"].includes(userRole);

  try {
    const profitability = await calculateFleetProfitability(id);
    if (!profitability) {
      return res.status(404).json({ error: "Fleet data not available." });
    }

    if (!isAuthorizedExecutive) {
      // Filter out margins & contributions for standard managers/advisors
      return res.json({
        success: true,
        costPerKm: profitability.costPerKm,
        costPerVehicle: profitability.costPerVehicle,
        labourCost: profitability.labourRevenue,
        partsCost: profitability.partsRevenue,
        lubricantsCost: profitability.lubricantsRevenue,
        warrantyRecovery: profitability.warrantyRecovery,
        goodwillRecovery: profitability.goodwillRecovery,
        amcRecovery: profitability.amcRevenue,
        message: "Executive margins and profitability contribution restricted for role: " + userRole
      });
    }

    res.json({
      success: true,
      ...profitability
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Downtime Intelligence & delays ----
router.get("/downtime", async (req: any, res: any) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing fleet ID." });
  }

  // In a real dealership FIP, downtime is composed of:
  res.json({
    success: true,
    fleet_passport_id: id,
    averageDowntimeHours: 35.4,
    downtimeBreakdown: {
      workshopWaitingHours: 4.2,
      partsDelayHours: 12.5,
      technicianDelayHours: 6.8,
      qcDelayHours: 2.1,
      customerApprovalDelayHours: 9.8
    },
    predominantDowntimeCause: "Parts Waiting (Steering column kits & booster plates)",
    aiRecommendations: [
      "Set auto-replenishment threshold for Prima AC clutch parts to 5 units.",
      "Pre-approve standard 140k service estimates online to cut down 9.8h approval latency."
    ]
  });
});

// ---- FIP: AMC & contract intelligence ----
router.get("/contracts", async (req: any, res: any) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing fleet ID." });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM fleet_amc_contracts WHERE fleet_passport_id = ?",
      [id]
    ) as any[];

    // Opportunities engine scans renewals
    const opps = await scanExecutiveOpportunities(id);

    res.json({
      success: true,
      amc_contracts: rows,
      aiRenewalOpportunityFound: opps.some(o => o.type === "AMC_RENEWAL"),
      actionableReminders: opps.filter(o => o.type === "AMC_RENEWAL").map(o => o.details)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Breakdown Intelligence & recovery logs ----
router.get("/breakdowns", async (req: any, res: any) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing fleet ID." });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM fleet_breakdowns WHERE fleet_passport_id = ?",
      [id]
    ) as any[];

    res.json({
      success: true,
      breakdowns: rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Command Center & Role-based Dashboard Views ----
router.get("/dashboard", async (req: any, res: any) => {
  const { id } = req.query;
  const userRole = req.headers["x-user-role"] || "Service Advisor";

  if (!id) {
    return res.status(400).json({ error: "Missing fleet ID." });
  }

  try {
    const metrics = await calculateFleetDashboardMetrics(id);
    const relationship = await evaluateFleetRelationshipAndRisk(id);

    // Apply Rules Engine threshold evaluation
    const rulesAlerts = await evaluateFleetRules({
      fleet_health_score: metrics.fleetHealthScore,
      average_downtime_hours: metrics.averageDowntimeHours,
      cost_per_km: 2.10,
      service_compliance_score: 92.5
    });

    const baseDashboard = {
      fleetName: "Devanand Fleet Prime",
      metrics,
      alerts: rulesAlerts,
      riskLevel: relationship.risk_level
    };

    // Filter view based on role specifications:
    switch (userRole) {
      case "Dealer Principal":
        return res.json({
          ...baseDashboard,
          view: "Dealer Principal Core Focus",
          financialOverview: {
            revenueGenerated: 145000.00,
            grossMargin: "35%",
            netContribution: 94250.00,
            profitabilityStatus: "HIGHLY PROFITABLE"
          }
        });
      case "GM Service":
        const [opps] = await db.query("SELECT * FROM fleet_opportunities WHERE fleet_passport_id = ?", [id]) as any[];
        return res.json({
          ...baseDashboard,
          view: "GM Service Followups",
          opportunities: opps,
          loadDistribution: { workshopLoading: "MODERATE", activeCampaignsCount: 1 }
        });
      case "Workshop Manager":
        return res.json({
          ...baseDashboard,
          view: "Workshop Operations",
          activeRepairs: [
            { jobId: 9011, stage: "QC Pending", elapsedHours: 4.5 }
          ],
          turnaroundStats: { avgHrs: metrics.averageTurnaroundTimeHours }
        });
      case "Fleet Manager":
        return res.json({
          ...baseDashboard,
          view: "Fleet Utilization Panel",
          utilization: {
            availability: "94.5%",
            usageRate: "82.3%",
            telematicsEdgeConfigured: true
          }
        });
      case "Service Advisor":
      default:
        return res.json({
          ...baseDashboard,
          view: "Advisor Client Hub",
          clientCheckups: [
            { vehicle: "Nexon MH12XY9011", action: "140k service due checklist" }
          ],
          csatAverage: "9.2/10"
        });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---- FIP: Fleet Digital Twin ----
router.get("/digital-twin/:id", async (req: any, res: any) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Missing fleet passport ID." });
  }

  try {
    const twin = await compileFleetDigitalTwin(id);
    res.json({
      success: true,
      digitalTwin: twin
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
