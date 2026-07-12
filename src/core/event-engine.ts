/**
 * =============================================================================
 * DWIP Event Engine Implementation (CR-002 - Milestone M1)
 * Bounded Context: Operational Event Engine
 * =============================================================================
 */

import { IEventBus } from "./event-bus";

// Allowed event sources
export const ALLOWED_SOURCES = [
  "MANUAL",
  "ORACLE_IMPORT",
  "SYSTEM",
  "MOBILE",
  "QR",
  "CCTV",
  "AI",
  "API"
] as const;

export type EventSource = typeof ALLOWED_SOURCES[number];

// Event Categories
export type EventCategory = "Operational" | "Integration" | "System" | "AI" | "CCTV" | "Mobile";

export interface OperationalEvent {
  event_id: string;
  job_id: number;
  job_card_no: string;
  timestamp: string; // ISO-8601 UTC
  user: string;
  role: string;
  workshop_id: number;
  source: EventSource;
  event_category: EventCategory;
  event_type: string;
  remarks: string | null;
  correlation_id: string;
  parent_event_id: string | null;
  sequence_number: number;
  source_system: string;
  event_version: string;
  event_status: string;
  payload: any | null;
}

export class OperationalEventRepository {
  constructor(private readonly db: any) {}

  /**
   * Appends an operational event. Events are immutable (append-only).
   */
  public async append(event: OperationalEvent): Promise<void> {

    // Map old_state/new_state/queue for backward compatibility with workflow history
    let oldState: string | null = null;
    let newState: string = event.event_type;
    let queue: string | null = null;

    if (event.payload) {
      if (event.payload.old_state) oldState = event.payload.old_state;
      if (event.payload.new_state) newState = event.payload.new_state;
      if (event.payload.queue) queue = event.payload.queue;
    }

    const payloadObj = event.payload ? { ...event.payload, job_card_no: event.job_card_no } : { job_card_no: event.job_card_no };

    const values = [
      event.job_id,
      oldState,
      newState,
      queue,
      event.payload?.sla_status || "WITHIN_SLA",
      event.payload?.etd || null,
      event.payload?.transition_by || null,
      event.payload?.duration || 0,
      event.remarks || event.payload?.reason || "",
      event.event_id,
      event.correlation_id,
      event.parent_event_id,
      event.sequence_number,
      event.source_system,
      event.event_version,
      event.event_status,
      event.event_category,
      event.source,
      event.event_type,
      event.user,
      event.role,
      event.workshop_id,
      JSON.stringify(payloadObj),
      event.timestamp ? new Date(event.timestamp) : new Date()
    ];

    const sql = `
      INSERT INTO tbl_workflow_history (
        job_id, old_state, new_state, queue, sla_status, etd, transition_by, 
        duration, reason, event_id, correlation_id, parent_event_id, 
        sequence_number, source_system, event_version, event_status, 
        event_category, source, event_type, user, role, workshop_id, payload,
        transition_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.execute(sql, values);
  }

  /**
   * Queries chronological list of events for a job.
   */
  public async findByJobId(jobId: number): Promise<OperationalEvent[]> {
    const sql = `
      SELECT * FROM tbl_workflow_history 
      WHERE job_id = ? 
      ORDER BY transition_time ASC, history_id ASC
    `;
    const [rows] = await this.db.execute(sql, [jobId]);
    return (rows || []).map((row: any) => this.mapRowToEvent(row));
  }

  /**
   * Returns next sequence number for a job card.
   */
  public async getNextSequenceNumber(jobId: number): Promise<number> {
    const sql = "SELECT COUNT(*) as count FROM tbl_workflow_history WHERE job_id = ?";
    const [rows] = await this.db.execute(sql, [jobId]);
    return (rows[0]?.count || 0) + 1;
  }

  private mapRowToEvent(row: any): OperationalEvent {
    let payload: any = null;
    if (row.payload) {
      try {
        payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      } catch {
        payload = row.payload;
      }
    }

    return {
      event_id: row.event_id || `EV-LEGACY-${row.history_id}`,
      job_id: row.job_id,
      job_card_no: row.job_card_no || payload?.job_card_no || "",
      timestamp: row.transition_time ? new Date(row.transition_time).toISOString() : new Date().toISOString(),
      user: row.user || "SYSTEM",
      role: row.role || "System",
      workshop_id: row.workshop_id || 1,
      source: (row.source as EventSource) || "SYSTEM",
      event_category: (row.event_category as EventCategory) || "Operational",
      event_type: row.event_type || row.new_state,
      remarks: row.reason || row.remarks || null,
      correlation_id: row.correlation_id || "SYSTEM-LEGACY",
      parent_event_id: row.parent_event_id || null,
      sequence_number: row.sequence_number || row.history_id,
      source_system: row.source_system || "WMS-Core",
      event_version: row.event_version || "1.0",
      event_status: row.event_status || "PROCESSED",
      payload
    };
  }
}

export class OperationalEventService {
  constructor(
    private readonly repository: OperationalEventRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Publishes and persists an operational event.
   */
  public async publish(eventData: {
    job_id: number;
    job_card_no: string;
    user: string;
    role: string;
    workshop_id: number;
    source: EventSource;
    event_category: EventCategory;
    event_type: string;
    remarks?: string | null;
    correlation_id: string;
    parent_event_id?: string | null;
    source_system: string;
    payload?: any | null;
  }): Promise<OperationalEvent> {
    // 1. Validate Event Source
    if (!ALLOWED_SOURCES.includes(eventData.source)) {
      throw new Error(`Invalid event source: '${eventData.source}'. Allowed sources: ${ALLOWED_SOURCES.join(", ")}`);
    }

    // 2. Enforce internal UTC clock
    const utcTimestamp = new Date().toISOString();

    // 3. Get next sequence number
    const sequenceNumber = await this.repository.getNextSequenceNumber(eventData.job_id);

    // 4. Construct complete event envelope
    const event: OperationalEvent = {
      event_id: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      job_id: eventData.job_id,
      job_card_no: eventData.job_card_no,
      timestamp: utcTimestamp,
      user: eventData.user,
      role: eventData.role,
      workshop_id: eventData.workshop_id,
      source: eventData.source,
      event_category: eventData.event_category,
      event_type: eventData.event_type,
      remarks: eventData.remarks || null,
      correlation_id: eventData.correlation_id,
      parent_event_id: eventData.parent_event_id || null,
      sequence_number: sequenceNumber,
      source_system: eventData.source_system,
      event_version: "1.0",
      event_status: "PROCESSED",
      payload: eventData.payload || null
    };

    // 5. Persist to immutable store
    await this.repository.append(event);

    // 6. Publish to EventBus
    await this.eventBus.publish(event.event_type, event, event.correlation_id);

    return event;
  }
}

export class TimelineService {
  constructor(private readonly repository: OperationalEventRepository) {}

  /**
   * Retrieves chronological event timeline for a job.
   */
  public async getTimeline(jobId: number): Promise<OperationalEvent[]> {
    return this.repository.findByJobId(jobId);
  }
}

export class LiveTatService {
  /**
   * Calculates TAT metrics purely from event timestamps in UTC.
   */
  public static calculateTAT(events: OperationalEvent[]): {
    totalTatMs: number;
    diagnosticTimeMs: number;
    activeWipMs: number;
    reworkMs: number;
    billingLatencyMs: number;
  } {
    if (events.length === 0) {
      return { totalTatMs: 0, diagnosticTimeMs: 0, activeWipMs: 0, reworkMs: 0, billingLatencyMs: 0 };
    }

    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // 1. Total TAT
    const gateInEvent = sorted.find((e) => e.event_type === "VEHICLE_GATE_IN" || e.event_type === "GATE_IN");
    const gateOutEvent = sorted.find((e) => e.event_type === "VEHICLE_RELEASED" || e.event_type === "GATE_OUT");

    const startTime = gateInEvent ? new Date(gateInEvent.timestamp).getTime() : new Date(sorted[0].timestamp).getTime();
    const endTime = gateOutEvent ? new Date(gateOutEvent.timestamp).getTime() : Date.now();
    const totalTatMs = Math.max(0, endTime - startTime);

    // 2. Diagnostic Time
    const diagStart = sorted.find((e) => e.event_type === "DIAGNOSTIC_STARTED" || e.event_type === "DIAGNOSTIC_WIP");
    const estimatePrepared = sorted.find((e) => e.event_type === "ESTIMATE_PREPARED" || e.event_type === "ESTIMATE_PENDING");
    let diagnosticTimeMs = 0;
    if (diagStart && estimatePrepared) {
      diagnosticTimeMs = Math.max(0, new Date(estimatePrepared.timestamp).getTime() - new Date(diagStart.timestamp).getTime());
    }

    // 3. Active WIP Repair Time (Accumulates runs between WIP_STARTED and QC_SUBMITTED)
    let activeWipMs = 0;
    const wipStarts = sorted.filter((e) => e.event_type === "WIP_STARTED" || e.event_type === "WIP_START");
    const qcSubmits = sorted.filter((e) => e.event_type === "QC_SUBMITTED" || e.event_type === "QC_PENDING");

    for (let i = 0; i < wipStarts.length; i++) {
      const start = new Date(wipStarts[i].timestamp).getTime();
      // Find the first QC submit that happened after this WIP start
      const nextQc = qcSubmits.find((q) => new Date(q.timestamp).getTime() > start);
      if (nextQc) {
        activeWipMs += Math.max(0, new Date(nextQc.timestamp).getTime() - start);
      } else if (i === wipStarts.length - 1 && !gateOutEvent) {
        // If it is the last WIP start and there's no QC submit yet, measure up to current time
        activeWipMs += Math.max(0, Date.now() - start);
      }
    }

    // 4. Rework Duration (Accumulates runs between QC_FAILED and subsequent WIP_STARTED)
    let reworkMs = 0;
    const qcFails = sorted.filter((e) => e.event_type === "QC_FAILED");
    for (let i = 0; i < qcFails.length; i++) {
      const failTime = new Date(qcFails[i].timestamp).getTime();
      const nextWipStart = wipStarts.find((w) => new Date(w.timestamp).getTime() > failTime);
      if (nextWipStart) {
        reworkMs += Math.max(0, new Date(nextWipStart.timestamp).getTime() - failTime);
      } else if (!gateOutEvent) {
        reworkMs += Math.max(0, Date.now() - failTime);
      }
    }

    // 5. Billing Latency
    const finalReview = sorted.find((e) => e.event_type === "FINAL_REVIEW_STARTED" || e.event_type === "FINAL_REVIEW");
    const invoiceGenerated = sorted.find((e) => e.event_type === "INVOICE_GENERATED" || e.event_type === "INVOICED");
    let billingLatencyMs = 0;
    if (finalReview && invoiceGenerated) {
      billingLatencyMs = Math.max(0, new Date(invoiceGenerated.timestamp).getTime() - new Date(finalReview.timestamp).getTime());
    }

    return {
      totalTatMs,
      diagnosticTimeMs,
      activeWipMs,
      reworkMs,
      billingLatencyMs
    };
  }
}

export class ReplayEngine {
  /**
   * Strictly read-only simulation. Replays events for a job in-memory to reconstruct state.
   */
  public static replay(events: OperationalEvent[]): {
    job_id: number;
    job_card_no: string;
    workflowStatus: string;
    queue: string | null;
    tat: ReturnType<typeof LiveTatService.calculateTAT>;
    technicians: Array<{ employee_id: number; role_type: string }>;
    reworkCount: number;
  } {
    if (events.length === 0) {
      throw new Error("No events available for replay");
    }

    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let workflowStatus = "GATE_IN";
    let queue: string | null = "INTAKE_QUEUE";
    let technicians: Array<{ employee_id: number; role_type: string }> = [];
    let reworkCount = 0;

    for (const event of sorted) {
      // 1. Reconstruct workflow status & queue based on transitions
      if (event.event_type === "VEHICLE_GATE_IN" || event.event_type === "GATE_IN") {
        workflowStatus = "GATE_IN";
        queue = "INTAKE_QUEUE";
      } else if (event.event_type === "INTAKE_INITIALIZED" || event.event_type === "INTAKE_PEND") {
        workflowStatus = "INTAKE_PENDING";
        queue = "INTAKE_QUEUE";
      } else if (event.event_type === "DIAGNOSTIC_STARTED" || event.event_type === "DIAGNOSTIC_WIP") {
        workflowStatus = "DIAGNOSTIC_WIP";
        queue = "DIAGNOSTIC_QUEUE";
      } else if (event.event_type === "ESTIMATE_PREPARED" || event.event_type === "ESTIMATE_PENDING") {
        workflowStatus = "ESTIMATE_PENDING";
        queue = "WIP_QUEUE";
      } else if (event.event_type === "ESTIMATE_APPROVED") {
        workflowStatus = "ESTIMATE_APPROVED";
        queue = "WIP_QUEUE";
      } else if (event.event_type === "PARTS_REQUESTED" || event.event_type === "PARTS_PENDING") {
        workflowStatus = "PARTS_PENDING";
        queue = "WIP_QUEUE";
      } else if (event.event_type === "WIP_STARTED" || event.event_type === "WIP_START") {
        workflowStatus = "WIP_START";
        queue = "WIP_QUEUE";
      } else if (event.event_type === "QC_SUBMITTED" || event.event_type === "QC_PENDING") {
        workflowStatus = "QC_PENDING";
        queue = "QC_QUEUE";
      } else if (event.event_type === "QC_FAILED") {
        workflowStatus = "QC_FAILED";
        queue = "QC_QUEUE";
        reworkCount++;
      } else if (event.event_type === "FINAL_REVIEW_STARTED" || event.event_type === "FINAL_REVIEW") {
        workflowStatus = "FINAL_REVIEW";
        queue = "DELIVERY_QUEUE";
      } else if (event.event_type === "INVOICE_GENERATED" || event.event_type === "INVOICED") {
        workflowStatus = "INVOICED";
        queue = "DELIVERY_QUEUE";
      } else if (event.event_type === "VEHICLE_RELEASED" || event.event_type === "GATE_OUT") {
        workflowStatus = "GATE_OUT";
        queue = "DELIVERY_QUEUE";
      }

      // 2. Reconstruct technician allocation
      if (event.event_type === "TECHNICIAN_ASSIGNED") {
        const payload = event.payload || {};
        if (payload.employee_id) {
          technicians.push({
            employee_id: payload.employee_id,
            role_type: payload.role_type || "Technician"
          });
        }
      }
    }

    // Calculate TAT
    const tat = LiveTatService.calculateTAT(sorted);

    return {
      job_id: sorted[0].job_id,
      job_card_no: sorted[0].job_card_no,
      workflowStatus,
      queue,
      tat,
      technicians,
      reworkCount
    };
  }
}
