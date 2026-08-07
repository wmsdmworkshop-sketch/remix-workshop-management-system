import { pool as db } from "../db/index.ts";
import crypto from "crypto";

export interface FleetRule {
  rule_id: string;
  rule_name: string;
  rule_group: string;
  condition_json: string;
  action_json: string;
  is_active: boolean;
}

export interface RuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: any;
}

export async function seedDefaultFleetRules(): Promise<void> {
  const defaultRules = [
    {
      id: "fip-rule-health",
      name: "Fleet Health Score Alert",
      group: "FLEET",
      condition: JSON.stringify([{ field: "fleet_health_score", operator: "less_than", value: 85.00 }]),
      action: JSON.stringify({ alert_type: "HEALTH_ALERT", severity: "HIGH", message: "Fleet Health Score has dropped below 85%" })
    },
    {
      id: "fip-rule-downtime",
      name: "Fleet Downtime Breach Alert",
      group: "FLEET",
      condition: JSON.stringify([{ field: "average_downtime_hours", operator: "greater_than", value: 48.00 }]),
      action: JSON.stringify({ alert_type: "DOWNTIME_ALERT", severity: "CRITICAL", message: "Average Fleet Downtime exceeds 48 hours" })
    },
    {
      id: "fip-rule-cost",
      name: "Fleet Cost per KM Alert",
      group: "FLEET",
      condition: JSON.stringify([{ field: "cost_per_km", operator: "greater_than", value: 25.00 }]),
      action: JSON.stringify({ alert_type: "COST_ALERT", severity: "HIGH", message: "Fleet operating cost exceeds 25 INR per KM" })
    },
    {
      id: "fip-rule-compliance",
      name: "Service Compliance Drop Alert",
      group: "FLEET",
      condition: JSON.stringify([{ field: "service_compliance_score", operator: "less_than", value: 90.00 }]),
      action: JSON.stringify({ alert_type: "SERVICE_ALERT", severity: "MEDIUM", message: "Fleet Service Compliance has dropped below 90%" })
    },
    {
      id: "fip-rule-amc",
      name: "AMC Remaining Value Warning",
      group: "FLEET",
      condition: JSON.stringify([{ field: "remaining_value_percent", operator: "less_than", value: 15.00 }]),
      action: JSON.stringify({ alert_type: "CONTRACT_ALERT", severity: "MEDIUM", message: "Fleet AMC contract remaining value is below 15%" })
    }
  ];

  for (const r of defaultRules) {
    try {
      // Check if rule already exists by name
      const [existing] = await db.query(
        "SELECT rule_id FROM business_rules WHERE rule_name = ?",
        [r.name]
      ) as any[];

      if (existing.length === 0) {
        await db.execute(
          `INSERT INTO business_rules (rule_id, rule_name, rule_group, condition_json, action_json, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [r.id, r.name, r.group, r.condition, r.action]
        );
      }
    } catch (e: any) {
      console.warn(`[FIP Rules Seeder] Failed to seed rule "${r.name}":`, e.message);
    }
  }
}

export async function evaluateFleetRules(fleetMetrics: Record<string, any>): Promise<any[]> {
  const alerts: any[] = [];
  try {
    const [rules] = await db.query(
      "SELECT * FROM business_rules WHERE rule_group = 'FLEET' AND is_active = 1"
    ) as any[];

    for (const rule of rules) {
      let conditions: RuleCondition[] = [];
      try {
        conditions = JSON.parse(rule.condition_json);
      } catch (e) {
        continue;
      }

      const match = conditions.every(cond => {
        const val = fleetMetrics[cond.field];
        if (val === undefined) return false;
        
        const numVal = Number(val);
        const condNumVal = Number(cond.value);

        switch (cond.operator) {
          case "equals":
            return val === cond.value;
          case "not_equals":
            return val !== cond.value;
          case "greater_than":
            return isNaN(numVal) ? val > cond.value : numVal > condNumVal;
          case "less_than":
            return isNaN(numVal) ? val < cond.value : numVal < condNumVal;
          case "contains":
            return String(val).includes(cond.value);
          default:
            return false;
        }
      });

      if (match) {
        try {
          const action = JSON.parse(rule.action_json);
          alerts.push({
            rule_id: rule.rule_id,
            rule_name: rule.rule_name,
            ...action
          });
        } catch (e) {}
      }
    }
  } catch (err: any) {
    console.error("[FIP Rules Evaluator] Error:", err.message);
  }
  return alerts;
}
