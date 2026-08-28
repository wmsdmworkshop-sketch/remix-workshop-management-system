/**
 * =============================================================================
 * WOS Core Architecture: Transactional Repositories
 * Bounded Context: Core System / Persistence
 * Description: Data access repositories for job card lifecycle aggregates.
 *              Each method accepts an optional transaction connection to
 *              participate in a shared ACID transaction boundary.
 *              No business logic is permitted in this layer.
 * =============================================================================
 */

import { pool as defaultPool } from "../db/index";

// Helper — use transaction connection if provided, otherwise the pool
function conn(txConn?: any): any {
  return txConn || defaultPool;
}

// Helper to safely format a date value for MySQL datetime format
function safeMysqlDatetime(dateVal: any, defaultVal: string | null = null): string | null {
  if (!dateVal) return defaultVal;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return defaultVal;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return defaultVal;
  }
}

// Helper to normalize status values to MySQL ENUM values
function normalizeStatus(val: any): string {
  const valStr = String(val || '');
  const validStatuses = [
    'Scheduled', 'In Progress', 'Awaiting Estimate', 'Estimate Approved',
    'Estimate Rejected', 'QC Pending', 'QC Passed', 'QC Failed',
    'Labour Pending', 'Parts Pending', 'Manager Review', 'Pre-Invoice Sent',
    'Invoiced', 'Awaiting Gate Out', 'Completed', 'Cancelled'
  ];
  if (validStatuses.includes(valStr)) {
    return valStr;
  }
  if (valStr === 'Waiting') {
    return 'Scheduled';
  } else if (valStr === 'Active') {
    return 'In Progress';
  } else if (valStr === 'Completed') {
    return 'Completed';
  } else if (valStr === 'Invoiced') {
    return 'Invoiced';
  } else if (valStr === 'Cancelled') {
    return 'Cancelled';
  } else if (valStr === 'Carry Forward') {
    return 'Scheduled';
  } else if (valStr === 'Rework') {
    return 'In Progress';
  }
  return 'Scheduled';
}

// ─────────────────────────────────────────────────────────────────────────────
// JobCardRepository — writes to `job_cards` and `job_card_master`
// ─────────────────────────────────────────────────────────────────────────────

export class JobCardRepository {
  private validJobCardColumns: Set<string> | null = null;
  private validMasterColumns: Set<string> | null = null;

  private async getValidColumns(tableName: string, db: any): Promise<Set<string>> {
    if (tableName === 'job_cards' && this.validJobCardColumns) return this.validJobCardColumns;
    if (tableName === 'job_card_master' && this.validMasterColumns) return this.validMasterColumns;

    const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``) as [any[], any];
    const columns = new Set(rows.map(r => r.Field));

    if (tableName === 'job_cards') this.validJobCardColumns = columns;
    if (tableName === 'job_card_master') this.validMasterColumns = columns;
    return columns;
  }

  /**
   * Inserts a new job card into both `job_cards` and `job_card_master`.
   */
  public async create(jobCard: any, txConn?: any): Promise<void> {
    const db = conn(txConn);

    // Normalize status in jobCard payload
    const normalizedJob = {
      ...jobCard,
      status: normalizeStatus(jobCard.status)
    };

    const validCols = await this.getValidColumns('job_cards', db);

    // 1. Insert into job_cards
    const jcKeys = Object.keys(normalizedJob).filter(k => normalizedJob[k] !== undefined && validCols.has(k));
    const jcPlaceholders = jcKeys.map(() => "?").join(", ");
    const jcValues = jcKeys.map(k => {
      let val = normalizedJob[k];
      if (val === undefined) val = null;
      if (typeof val === "boolean") val = val ? 1 : 0;
      if (val !== null && typeof val === "object") val = JSON.stringify(val);
      return val;
    });

    await db.execute(
      `INSERT INTO \`job_cards\` (${jcKeys.map(k => `\`${k}\``).join(", ")}) VALUES (${jcPlaceholders})`,
      jcValues
    );

    // 2. Insert into job_card_master (projection)
    await this.upsertMaster(normalizedJob, db);
  }

  /**
   * Updates specific fields of an existing job card.
   */
  public async update(jobId: number, fields: Record<string, any>, txConn?: any): Promise<void> {
    const db = conn(txConn);

    const normalizedFields = { ...fields };
    if (normalizedFields.status !== undefined) {
      normalizedFields.status = normalizeStatus(normalizedFields.status);
    }

    const validCols = await this.getValidColumns('job_cards', db);

    const keys = Object.keys(normalizedFields).filter(k => k !== "job_id" && validCols.has(k));
    if (keys.length === 0) return;

    const setClauses = keys.map(k => `\`${k}\` = ?`).join(", ");
    const values = keys.map(k => {
      let val = normalizedFields[k];
      if (val === undefined) val = null;
      if (typeof val === "boolean") val = val ? 1 : 0;
      if (val !== null && typeof val === "object") val = JSON.stringify(val);
      return val;
    });
    values.push(jobId);

    await db.execute(`UPDATE \`job_cards\` SET ${setClauses} WHERE \`job_id\` = ?`, values);

    // Update job_card_master projection
    await this.upsertMaster({ job_id: jobId, ...normalizedFields }, db, true);
  }

  /**
   * Upserts the job_card_master projection for a job card.
   */
  private async upsertMaster(jobCard: any, db: any, isUpdate: boolean = false): Promise<void> {
    // Map status to job_status enum
    let jobStatus: string = 'Unassigned';
    const statusLower = String(jobCard.status || '').toLowerCase();
    if (statusLower === 'waiting' || statusLower === 'scheduled') {
      jobStatus = 'Unassigned';
    } else if (statusLower === 'active' || statusLower === 'in progress') {
      jobStatus = 'In Progress';
    } else if (statusLower === 'completed' || statusLower === 'qc passed') {
      jobStatus = 'Ready';
    } else if (statusLower === 'invoiced') {
      jobStatus = 'Delivered';
    } else if (statusLower === 'carry forward') {
      jobStatus = 'Carry Forward';
    } else if (statusLower === 'rework') {
      jobStatus = 'In Progress';
    } else if (statusLower === 'cancelled') {
      jobStatus = 'Unassigned';
    }

    // Map service_type enum
    let serviceType: string = 'General Repair';
    if (jobCard.sr_type_id === 4) {
      serviceType = 'Oil Change';
    } else if (jobCard.sr_type_id === 3) {
      serviceType = 'Electrical';
    } else if (jobCard.sr_type_id === 2) {
      serviceType = '2 Service';
    }

    const masterRow: Record<string, any> = {
      job_card_id: jobCard.job_id
    };
    
    if (!isUpdate || jobCard.job_card_no !== undefined) masterRow.job_card_no = jobCard.job_card_no;
    if (!isUpdate || jobCard.bay_id !== undefined) masterRow.bay_id = jobCard.bay_id || 1;
    // No truncation. This used to be .substring(0, 10) to fit
    // job_card_master.vehicle_reg VARCHAR(10), which silently cut every
    // hyphenated plate — KA-32-AB-1234 became 'KA-32-AB-1'. The column is now
    // VARCHAR(50), matching job_cards.vrn, so the full registration is stored.
    if (!isUpdate || jobCard.vrn !== undefined) masterRow.vehicle_reg = jobCard.vrn || '';
    if (!isUpdate || jobCard.vin !== undefined) {
      masterRow.vin = jobCard.vin ? jobCard.vin.substring(0, 50) : null;
      masterRow.chassis_no = jobCard.vin || null;
    }
    if (!isUpdate || jobCard.customer_name !== undefined) masterRow.customer_name = (jobCard.customer_name || 'Walk-in Customer').substring(0, 100);
    if (!isUpdate || jobCard.customer_mobile !== undefined) masterRow.driver_mobile = (jobCard.customer_mobile || '0000000000').substring(0, 15);
    if (!isUpdate || jobCard.sr_type_id !== undefined) masterRow.service_type = serviceType;
    if (!isUpdate || jobCard.status !== undefined) {
      masterRow.job_status = jobStatus;
      masterRow.billing_status = jobCard.status === 'Invoiced' ? 'Paid' : 'Pending';
    }
    if (!isUpdate || jobCard.created_by !== undefined) {
      masterRow.assigned_to = jobCard.created_by || 22;
      masterRow.created_by = jobCard.created_by || 22;
    }
    if (!isUpdate || jobCard.etd !== undefined) masterRow.etd = safeMysqlDatetime(jobCard.etd, safeMysqlDatetime(new Date())!);
    if (!isUpdate || jobCard.completed_at !== undefined) masterRow.actual_delivery = safeMysqlDatetime(jobCard.completed_at, null);
    if (!isUpdate || jobCard.workshop_stage !== undefined) masterRow.live_status = jobCard.workshop_stage || 'Waiting';
    if (!isUpdate || jobCard.labor_price !== undefined || jobCard.parts_price !== undefined) {
      masterRow.estimated_amount = Number(jobCard.labor_price || 0) + Number(jobCard.parts_price || 0);
    }
    if (!isUpdate || jobCard.last_service_date !== undefined || jobCard.completed_at !== undefined || jobCard.created_at !== undefined) {
      masterRow.last_service_date = jobCard.last_service_date || jobCard.completed_at || jobCard.created_at || null;
    }
    if (!isUpdate || jobCard.odometer_reading !== undefined || jobCard.km_reading !== undefined) {
      masterRow.odometer_reading = jobCard.odometer_reading || jobCard.km_reading || null;
    }
    if (!isUpdate || jobCard.gate_out_time !== undefined) masterRow.gate_out_time = safeMysqlDatetime(jobCard.gate_out_time, null);

    const validCols = await this.getValidColumns('job_card_master', db);

    const keys = Object.keys(masterRow).filter(k => validCols.has(k) && masterRow[k] !== undefined);
    if (keys.length === 0) return;

    if (isUpdate) {
      const updateKeys = keys.filter(k => k !== "job_card_id");
      if (updateKeys.length === 0) return;
      const updateClauses = updateKeys.map(k => `\`${k}\` = ?`).join(", ");
      const values = updateKeys.map(k => masterRow[k]);
      values.push(masterRow.job_card_id);
      await db.execute(`UPDATE \`job_card_master\` SET ${updateClauses} WHERE \`job_card_id\` = ?`, values);
    } else {
      const placeholders = keys.map(() => "?").join(", ");
      await db.execute(`INSERT INTO \`job_card_master\` (${keys.map(k => `\`${k}\``).join(", ")}) VALUES (${placeholders})`, keys.map(k => masterRow[k]));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JobTechnicianMapRepository — writes to `job_technician_maps`
// ─────────────────────────────────────────────────────────────────────────────

export class JobTechnicianMapRepository {
  /**
   * Removes all technician mappings for a job.
   */
  public async removeByJobId(jobId: number, txConn?: any): Promise<void> {
    await conn(txConn).execute("DELETE FROM `job_technician_maps` WHERE `job_id` = ?", [jobId]);
  }

  /**
   * Inserts a batch of technician mappings.
   */
  public async insertBatch(maps: Array<{
    map_id: number;
    job_id: number;
    employee_id: number;
    tech_role: string;
    assigned_at: string;
  }>, txConn?: any): Promise<void> {
    const db = conn(txConn);
    for (const m of maps) {
      await db.execute(
        "INSERT INTO `job_technician_maps` (`map_id`, `job_id`, `employee_id`, `tech_role`, `assigned_at`) VALUES (?, ?, ?, ?, ?)",
        [m.map_id, m.job_id, m.employee_id, m.tech_role, m.assigned_at]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertLogRepository — writes to `alert_logs`
// ─────────────────────────────────────────────────────────────────────────────

export class AlertLogRepository {
  /**
   * Creates an alert log entry.
   */
  public async create(alert: {
    alert_id: number;
    alert_config_id: number;
    entity_type: string;
    entity_id: number;
    alert_message: string;
    severity: string;
    status: string;
    created_at: string;
  }, txConn?: any): Promise<void> {
    await conn(txConn).execute(
      `INSERT INTO \`alert_logs\` (\`alert_id\`, \`alert_config_id\`, \`entity_type\`, \`entity_id\`, \`alert_message\`, \`severity\`, \`status\`, \`created_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [alert.alert_id, alert.alert_config_id, alert.entity_type, alert.entity_id,
       alert.alert_message, alert.severity, alert.status, alert.created_at]
    );
  }

  /**
   * Resolves alerts matching given criteria.
   */
  public async resolve(entityType: string, entityId: number, messageLike: string, txConn?: any): Promise<void> {
    await conn(txConn).execute(
      `UPDATE \`alert_logs\` SET \`status\` = 'Resolved', \`resolved_at\` = ? WHERE \`entity_type\` = ? AND \`entity_id\` = ? AND \`alert_message\` LIKE ? AND \`status\` = 'Active'`,
      [new Date().toISOString(), entityType, entityId, `%${messageLike}%`]
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BayRepository — writes to `bays` and `bay_master`
// ─────────────────────────────────────────────────────────────────────────────

export class BayRepository {
  /**
   * Updates the status of a bay.
   */
  public async updateStatus(bayId: number, status: string, txConn?: any): Promise<void> {
    const db = conn(txConn);
    await db.execute("UPDATE `bays` SET `status` = ? WHERE `bay_id` = ?", [status, bayId]);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RevenueRepository — writes to `job_revenues` and `job_revenue_split_details`
// ─────────────────────────────────────────────────────────────────────────────

export class RevenueRepository {
  /**
   * Removes existing revenue records for a job.
   */
  public async removeByJobId(jobId: number, txConn?: any): Promise<void> {
    const db = conn(txConn);
    // Delete split details first (FK), then revenue
    await db.execute(
      "DELETE FROM `job_revenue_split_details` WHERE `revenue_id` IN (SELECT `revenue_id` FROM `job_revenues` WHERE `job_id` = ?)",
      [jobId]
    );
    await db.execute("DELETE FROM `job_revenues` WHERE `job_id` = ?", [jobId]);
  }

  /**
   * Inserts a new revenue record.
   */
  public async createRevenue(revenue: {
    revenue_id: number;
    job_id: number;
    labour_amount: number;
    parts_amount: number;
    total_amount: number;
    split_id: number;
    calculated_at: string;
  }, txConn?: any): Promise<void> {
    const db = conn(txConn);
    await db.execute(
      `INSERT INTO \`job_revenues\` (\`revenue_id\`, \`job_id\`, \`labour_amount\`, \`parts_amount\`, \`total_amount\`, \`split_id\`, \`calculated_at\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [revenue.revenue_id, revenue.job_id, revenue.labour_amount, revenue.parts_amount,
       revenue.total_amount, revenue.split_id, revenue.calculated_at]
    );
  }

  /**
   * Inserts a batch of revenue split detail records.
   */
  public async createSplitDetails(details: Array<{
    detail_id: number;
    revenue_id: number;
    employee_id: number;
    tech_role: string;
    split_pct: number;
    split_amount: number;
  }>, txConn?: any): Promise<void> {
    const db = conn(txConn);
    for (const d of details) {
      await db.execute(
        `INSERT INTO \`job_revenue_split_details\` (\`detail_id\`, \`revenue_id\`, \`employee_id\`, \`tech_role\`, \`split_pct\`, \`split_amount\`)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [d.detail_id, d.revenue_id, d.employee_id, d.tech_role, d.split_pct, d.split_amount]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BreakdownRepository — writes to `breakdowns`
// ─────────────────────────────────────────────────────────────────────────────

export class BreakdownRepository {
  /**
   * Updates a breakdown record after conversion to a job card.
   */
  public async markConverted(breakdownId: number | string, jobCardNo: string, txConn?: any): Promise<void> {
    const db = conn(txConn);
    await db.execute(
      `UPDATE \`breakdowns\` SET job_card_number = ?, current_status = 'Gate Entry Created' WHERE breakdown_id = ?`,
      [jobCardNo, breakdownId]
    );
  }
}
