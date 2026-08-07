import { pool as db } from "../../db/index";

export interface SLAPolicyConfig {
  policy_id: string;
  policy_name: string;
  sla_type: string;
  workshop_id: number | null;
  service_type: string | null;
  customer_category: string | null;
  vehicle_category: string | null;
  operation_type: string | null;
  base_minutes_limit: number;
  is_24x7: boolean;
}

export interface SLAEscalationConfig {
  escalation_id: string;
  policy_id: string;
  escalation_level: number;
  trigger_minutes_after_breach: number;
  target_role: string;
  severity: string;
}

export class SLAPolicyRegistry {
  /**
   * Resolves the most specific SLA policy for a given context.
   */
  public static async resolvePolicy(
    slaType: string,
    context: {
      workshop_id?: number;
      service_type?: string;
      customer_category?: string;
      vehicle_category?: string;
      operation_type?: string;
    }
  ): Promise<SLAPolicyConfig | null> {
    
    // In a real implementation, we would build a dynamic scoring query to find the best match.
    // For this prototype, we'll fetch all active policies for the sla_type and filter in memory.
    
    const [rows] = await db.execute(
      "SELECT * FROM tbl_sla_policy WHERE sla_type = ? AND is_active = 1",
      [slaType]
    ) as any[];

    if (!rows || rows.length === 0) return null;

    // Score matches
    let bestMatch: SLAPolicyConfig | null = null;
    let highestScore = -1;

    for (const row of rows) {
      let score = 0;
      let valid = true;

      // Workshop Match
      if (row.workshop_id !== null) {
        if (row.workshop_id === context.workshop_id) score += 10;
        else valid = false;
      }
      
      // Service Type Match
      if (row.service_type !== null) {
        if (row.service_type === context.service_type) score += 5;
        else valid = false;
      }

      // Customer Category Match
      if (row.customer_category !== null) {
        if (row.customer_category === context.customer_category) score += 5;
        else valid = false;
      }

      // Vehicle Category Match
      if (row.vehicle_category !== null) {
        if (row.vehicle_category === context.vehicle_category) score += 5;
        else valid = false;
      }

      // Operation Type Match
      if (row.operation_type !== null) {
        if (row.operation_type === context.operation_type) score += 5;
        else valid = false;
      }

      if (valid && score > highestScore) {
        highestScore = score;
        bestMatch = row;
      }
    }

    return bestMatch;
  }

  public static async getEscalationMatrix(policyId: string): Promise<SLAEscalationConfig[]> {
    const [rows] = await db.execute(
      "SELECT * FROM tbl_sla_escalation WHERE policy_id = ? ORDER BY escalation_level ASC",
      [policyId]
    ) as any[];

    return rows || [];
  }
}
