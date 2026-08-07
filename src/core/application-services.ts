/**
 * =============================================================================
 * WOS Core Architecture: Application Services
 * Bounded Context: Core System / Business Logic
 * Description: Encapsulates transactional business workflows using the
 *              Repository + TransactionManager patterns. Each public method
 *              represents one atomic business operation with a single
 *              transaction boundary.
 *
 *              Flow: Validate → Resolve Workflow → State Machine → Transaction → COMMIT
 *                    → Publish Event → Return Result
 * =============================================================================
 */

import { TransactionManager } from "./transaction-manager";
import {
  JobCardRepository,
  JobTechnicianMapRepository,
  AlertLogRepository,
  BayRepository,
  RevenueRepository,
  BreakdownRepository
} from "./repository";
import { randomUUID } from "crypto";
import { workflowRegistry } from "./workflow-registry";
import { WorkflowStateMachine } from "./workflow-state-machine";
import { makeSystemContext } from "./business-context";
import { globalEventBus } from "./event-bus";
import { OperationalEventService } from "./event-engine";
import { EvidenceManagementEngine } from "./evidence-engine";
import { BusinessContextFactory } from "./business-context";

// ─────────────────────────────────────────────────────────────────────────────
// JobCardService — Orchestrates job card lifecycle transitions
// ─────────────────────────────────────────────────────────────────────────────

export class JobCardService {
  constructor(
    private readonly txManager: TransactionManager,
    private readonly jobCardRepo: JobCardRepository,
    private readonly techMapRepo: JobTechnicianMapRepository,
    private readonly alertLogRepo: AlertLogRepository, // Retained for compatibility if needed elsewhere, but not used for direct alert creation
    private readonly bayRepo: BayRepository,
    private readonly revenueRepo: RevenueRepository,
    private readonly breakdownRepo: BreakdownRepository,
    private readonly eventService: OperationalEventService,
    private readonly evidenceEngine: EvidenceManagementEngine,
    private readonly getCachedDB: () => any,
    private readonly saveDBLocal: (data: any) => void
  ) {}

  private generateCorrelationId(): string {
    return `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  /**
   * Creates a new job card with GATE_IN and INTAKE events.
   */
  public async createJobCard(payload: any): Promise<any> {
    const cachedDB = this.getCachedDB();

    const maxId = cachedDB.jobCards.reduce((max: number, j: any) => Math.max(max, j.job_id), 0);
    const nextId = maxId + 1;
    const jobCardNo = `JC${String(nextId).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const correlationId = this.generateCorrelationId();

    const workflowDef = workflowRegistry.getWorkflow("Retail");

    const newJob: any = {
      ...payload,
      job_id: nextId,
      job_card_no: jobCardNo,
      status: workflowDef.state_machine.initial_state,
      workflow_type: "Retail", // Default to Retail
      started_at: null,
      completed_at: null,
      invoiced_at: null,
      created_by: Number(payload.created_by) || 1,
      created_at: now
    };

    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await this.jobCardRepo.create(newJob, tx.connection);

      this.txManager.onCommit(tx, () => {
        cachedDB.jobCards.push(newJob);
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    // Publish creation events
    await this.publishJobCreationEvents(newJob, correlationId);

    return newJob;
  }

  /**
   * Updates an existing job card and computes bay updates.
   * Direct alert creation removed; relies on state transitions and events.
   */
  public async updateJobCard(jobId: number, updates: any): Promise<any> {
    const cachedDB = this.getCachedDB();
    const index = cachedDB.jobCards.findIndex((j: any) => j.job_id === jobId);

    if (index === -1) {
      throw new JobCardNotFoundError(jobId);
    }

    const oldJob = cachedDB.jobCards[index];
    const correlationId = this.generateCorrelationId();
    
    // Resolve Workflow and state machine if status is being updated directly
    if (updates.status && updates.status !== oldJob.status) {
      const workflowType = oldJob.workflow_type || "Retail";
      const workflowDef = workflowRegistry.getWorkflow(workflowType);
      const sm = new WorkflowStateMachine(workflowDef.state_machine);
      
      const transitionResult = await sm.transition(
        makeSystemContext(correlationId),
        {
          current_state: oldJob.status,
          target_state: updates.status
        }
      );
      
      if (!transitionResult.success) {
        throw new ValidationError(`Invalid state transition: ${transitionResult.error}`);
      }
    }

    // Validate bay_id if supplied
    if (updates.bay_id !== undefined && updates.bay_id !== null) {
      const bayExists = cachedDB.bays.some((b: any) => b.bay_id === Number(updates.bay_id));
      if (!bayExists) {
        throw new ValidationError("Invalid bay_id: bay does not exist.");
      }
    }

    const updatedJob = { ...oldJob, ...updates, updated_at: new Date().toISOString() };
    const now = new Date().toISOString();
    const bayUpdates: Array<{ bayId: number; status: string }> = [];

    if (updatedJob.bay_id && updatedJob.status !== oldJob.status) {
      const bayIndex = cachedDB.bays.findIndex((b: any) => b.bay_id === updatedJob.bay_id);
      if (bayIndex !== -1) {
        updatedJob.bay_no = cachedDB.bays[bayIndex].bay_name;
        if (updatedJob.status === "Active" || updatedJob.status === "In Progress") {
          bayUpdates.push({ bayId: updatedJob.bay_id, status: "Active" });
          updatedJob.started_at = now;
        } else if (updatedJob.status === "Completed") {
          bayUpdates.push({ bayId: updatedJob.bay_id, status: "Idle" });
          updatedJob.completed_at = now;
          updatedJob.date_completed = now.split('T')[0];
        } else if (updatedJob.status === "Carry Forward") {
          bayUpdates.push({ bayId: updatedJob.bay_id, status: "Carry Forward" });
        } else if (updatedJob.status === "Rework") {
          bayUpdates.push({ bayId: updatedJob.bay_id, status: "Rework" });
        } else if (updatedJob.status === "Invoiced" || updatedJob.status === "Cancelled") {
          bayUpdates.push({ bayId: updatedJob.bay_id, status: "Idle" });
          if (updatedJob.status === "Invoiced") {
            updatedJob.invoiced_at = now;
          }
        }
      }
    }

    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await this.jobCardRepo.update(jobId, updatedJob, tx.connection);

      for (const bu of bayUpdates) {
        await this.bayRepo.updateStatus(bu.bayId, bu.status, tx.connection);
      }

      this.txManager.onCommit(tx, () => {
        cachedDB.jobCards[index] = updatedJob;
        for (const bu of bayUpdates) {
          const bi = cachedDB.bays.findIndex((b: any) => b.bay_id === bu.bayId);
          if (bi !== -1) cachedDB.bays[bi].status = bu.status;
        }
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    // Trigger event if SA was assigned
    if (updatedJob.service_advisor && updatedJob.service_advisor !== 'Unassigned' && (!oldJob.service_advisor || oldJob.service_advisor === 'Unassigned')) {
       await this.eventService.publish({
         event_type: "SERVICE_ADVISOR_ASSIGNED",
         job_id: jobId,
         job_card_no: updatedJob.job_card_no,
         user: "System",
         role: "System",
         workshop_id: 1,
         source: "SYSTEM",
         event_category: "Operational",
         correlation_id: correlationId,
         source_system: "WMS-Core",
         payload: { job_card_no: updatedJob.job_card_no, service_advisor: updatedJob.service_advisor }
       });
    }

    // Trigger state change events
    if (updatedJob.status !== oldJob.status) {
       await this.eventService.publish({
         event_type: "WorkflowTransitionOccurred",
         job_id: jobId,
         job_card_no: updatedJob.job_card_no,
         user: "System",
         role: "System",
         workshop_id: 1,
         source: "SYSTEM",
         event_category: "Operational",
         correlation_id: correlationId,
         source_system: "WMS-Core",
         payload: { job_card_no: updatedJob.job_card_no, current_state: updatedJob.status, previous_state: oldJob.status }
       });
    }

    return updatedJob;
  }


  /**
   * Assigns technicians to a job card.
   */
  public async assignTechnicians(jobId: number, rawAllocations: any[]): Promise<any[]> {
    const cachedDB = this.getCachedDB();

    if (!rawAllocations || !Array.isArray(rawAllocations)) {
      throw new ValidationError("Missing or invalid allocations/technicians array.");
    }

    const allocations = rawAllocations.map(a => ({
      employee_id: Number(a.employee_id || a.technician_id),
      tech_role: String(a.tech_role || a.role || 'Technician')
    }));

    for (const alloc of allocations) {
      const empExists = cachedDB.employees.some((e: any) => e.employee_id === alloc.employee_id);
      if (!empExists) {
        throw new ValidationError(`Invalid employee_id: ${alloc.employee_id} does not exist.`);
      }
    }

    let nextMapId = cachedDB.jobTechnicianMaps.reduce((max: number, m: any) => Math.max(max, m.map_id), 0) + 1;
    const newMaps = allocations.map((alloc) => ({
      map_id: nextMapId++,
      job_id: jobId,
      employee_id: alloc.employee_id,
      tech_role: alloc.tech_role,
      assigned_at: new Date().toISOString()
    }));

    const correlationId = this.generateCorrelationId();

    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await this.techMapRepo.removeByJobId(jobId, tx.connection);
      await this.techMapRepo.insertBatch(newMaps, tx.connection);

      this.txManager.onCommit(tx, () => {
        cachedDB.jobTechnicianMaps = cachedDB.jobTechnicianMaps.filter((m: any) => m.job_id !== jobId);
        cachedDB.jobTechnicianMaps.push(...newMaps);
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    return newMaps;
  }

  /**
   * Orchestrates workflow state transition, resolving the state machine dynamically.
   */
  public async transitionStatus(
    jobId: number,
    statusOrUpdates: string | Record<string, any>,
    eventData: any | null,
    alerts?: any[]
  ): Promise<any> {
    const statusUpdate = typeof statusOrUpdates === "string" ? { status: statusOrUpdates } : statusOrUpdates;
    const cachedDB = this.getCachedDB();
    const index = cachedDB.jobCards.findIndex((jc: any) => jc.job_id === jobId);

    if (index === -1) {
      throw new JobCardNotFoundError(jobId);
    }

    const jobCard = cachedDB.jobCards[index];
    const correlationId = this.generateCorrelationId();
    
    // Resolve workflow definition and initialize state machine
    const workflowType = jobCard.workflow_type || "Retail";
    const workflowDef = workflowRegistry.getWorkflow(workflowType);
    const sm = new WorkflowStateMachine(workflowDef.state_machine);

    // Enforce workflow validation
    if (statusUpdate.status && statusUpdate.status !== jobCard.status) {
      // 1. Create Immutable Business Context
      const businessContext = BusinessContextFactory.create(
        { entity_type: "JobCard", entity_id: String(jobId) },
        { user_id: eventData?.user || "System", role: eventData?.role || "System", workshop_id: String(jobCard.workshop_id || 1) },
        { correlation_id: correlationId }
      );

      // 2. Check Evidence Completeness
      const completeness = this.evidenceEngine.calculateCompleteness(businessContext, {
        workflow_type: workflowType,
        target_state: statusUpdate.status
      });
      if (completeness.missing.length > 0) {
        throw new ValidationError(`Transition to ${statusUpdate.status} blocked. Missing mandatory evidence: ${completeness.missing.join(", ")}`);
      }

      // 3. Run State Machine Transitions
      const transitionResult = await sm.transition(businessContext, {
        current_state: jobCard.status,
        target_state: statusUpdate.status,
        remarks: eventData?.remarks,
        payload: eventData?.payload
      });
      
      if (!transitionResult.success) {
        throw new ValidationError(`Workflow validation failed: ${transitionResult.error}`);
      }
    }

    const updatedFields = { ...statusUpdate };
    
    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await this.jobCardRepo.update(jobId, updatedFields, tx.connection);

      this.txManager.onCommit(tx, () => {
        cachedDB.jobCards[index] = { ...jobCard, ...updatedFields };
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    // Publish operational event to Event Bus (to be picked up by AlertService)
    if (eventData) {
      this.eventService.publish({
        job_id: jobId,
        job_card_no: jobCard.job_card_no,
        user: eventData.user,
        role: eventData.role,
        workshop_id: jobCard.workshop_id || 1,
        source: eventData.source,
        event_category: eventData.event_category,
        event_type: eventData.event_type,
        remarks: eventData.remarks,
        correlation_id: correlationId,
        source_system: "WMS-Core",
        payload: {
          ...eventData.payload,
          old_state: jobCard.status,
          new_state: statusUpdate.status || jobCard.status
        }
      }).catch(e => {
        console.error(`Failed to publish ${eventData.event_type} event:`, e);
      });
      
      // Update workflowHistory cache directly here for backward compatibility
      this.txManager.onCommit({} as any, () => { // Mock tx just to run safe synchronous update
          const historyEvent = {
            job_id: jobId,
            job_card_no: jobCard.job_card_no,
            user: eventData.user,
            role: eventData.role,
            workshop_id: jobCard.workshop_id || 1,
            source: eventData.source,
            event_category: eventData.event_category,
            event_type: eventData.event_type,
            remarks: eventData.remarks,
            correlation_id: correlationId,
            source_system: "WMS-Core",
            payload: eventData.payload
          };
          if (!cachedDB.workflowHistory) cachedDB.workflowHistory = [];
          cachedDB.workflowHistory.push(historyEvent);
          this.saveDBLocal(cachedDB);
      });
    }

    return { ...jobCard, ...updatedFields };
  }

  /**
   * Publishes VEHICLE_GATE_IN and INTAKE_INITIALIZED events after job creation.
   */
  private async publishJobCreationEvents(job: any, correlationId: string): Promise<void> {
    const cachedDB = this.getCachedDB();

    await this.eventService.publish({
      event_type: "VEHICLE_GATE_IN",
      job_id: job.job_id,
      job_card_no: job.job_card_no,
      user: job.service_advisor || "SYSTEM",
      role: "Service Advisor",
      workshop_id: job.workshop_id || 1,
      source: "MANUAL",
      event_category: "CCTV",
      correlation_id: correlationId,
      source_system: "WMS-Core",
      payload: { job_card_no: job.job_card_no, user: job.service_advisor || "SYSTEM", old_state: null, new_state: "GATE_IN" }
    });

    await this.eventService.publish({
      event_type: "INTAKE_INITIALIZED",
      job_id: job.job_id,
      job_card_no: job.job_card_no,
      user: job.service_advisor || "SYSTEM",
      role: "Service Advisor",
      workshop_id: job.workshop_id || 1,
      source: "MANUAL",
      event_category: "Operational",
      correlation_id: correlationId,
      source_system: "WMS-Core",
      payload: { job_card_no: job.job_card_no, user: job.service_advisor || "SYSTEM", old_state: "GATE_IN", new_state: "INTAKE_PENDING" }
    });
    
    const history1 = { job_id: job.job_id, event_type: "VEHICLE_GATE_IN", correlation_id: correlationId };
    const history2 = { job_id: job.job_id, event_type: "INTAKE_INITIALIZED", correlation_id: correlationId };
    if (!cachedDB.workflowHistory) cachedDB.workflowHistory = [];
    cachedDB.workflowHistory.push(history1, history2);
    this.saveDBLocal(cachedDB);
  }

  /**
   * Calculates revenue splits.
   */
  public async calculateRevenue(
    jobId: number,
    labourAmount: number,
    partsAmount: number,
    calculateRevenueAllocation: (jobId: number, techs: any[], labour: number) => any[]
  ): Promise<{ revenue: any; details: any[]; splitTemplate: any }> {
    const cachedDB = this.getCachedDB();
    const maps = cachedDB.jobTechnicianMaps.filter((m: any) => m.job_id === jobId);
    if (maps.length === 0) {
      throw new ValidationError("No technicians assigned to this job card.");
    }

    const totalAmount = labourAmount + partsAmount;
    const nextRevId = cachedDB.jobRevenues.reduce((max: number, r: any) => Math.max(max, r.revenue_id), 0) + 1;
    const newRevenue = {
      revenue_id: nextRevId,
      job_id: jobId,
      labour_amount: labourAmount,
      parts_amount: partsAmount,
      total_amount: totalAmount,
      split_id: 1,
      calculated_at: new Date().toISOString()
    };

    const techsList = maps.map((m: any) => {
      const emp = cachedDB.employees.find((e: any) => e.employee_id === m.employee_id);
      return {
        employee_id: m.employee_id,
        full_name: emp ? emp.full_name : "Unknown",
        role: emp ? emp.role : m.tech_role || "Technician",
        employee_grade: emp ? emp.employee_grade : "Junior",
        basic_salary: emp ? emp.basic_salary : 0
      };
    });

    const allocations = calculateRevenueAllocation(jobId, techsList, labourAmount);
    let nextDetailId = cachedDB.jobRevenueSplitDetails.reduce((max: number, d: any) => Math.max(max, d.detail_id), 0) + 1;
    const details = allocations.map((alloc: any) => ({
      detail_id: nextDetailId++,
      revenue_id: nextRevId,
      employee_id: alloc.employee_id,
      tech_role: alloc.allocated_role,
      split_pct: alloc.split_pct,
      split_amount: alloc.split_amount
    }));

    const correlationId = this.generateCorrelationId();

    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await this.revenueRepo.removeByJobId(jobId, tx.connection);
      await this.revenueRepo.createRevenue(newRevenue, tx.connection);
      await this.revenueRepo.createSplitDetails(details, tx.connection);

      this.txManager.onCommit(tx, () => {
        cachedDB.jobRevenues = cachedDB.jobRevenues.filter((r: any) => r.job_id !== jobId);
        cachedDB.jobRevenueSplitDetails = cachedDB.jobRevenueSplitDetails.filter((d: any) => {
          const rev = cachedDB.jobRevenues.find((r: any) => r.revenue_id === d.revenue_id);
          return rev?.job_id !== jobId;
        });
        cachedDB.jobRevenues.push(newRevenue);
        cachedDB.jobRevenueSplitDetails.push(...details);
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    return {
      revenue: newRevenue,
      details,
      splitTemplate: { combination_code: "ENGINE_CALCULATED", combination_label: "Engine Calculated Allocation" }
    };
  }

  /**
   * Marks a job card as billed. Orchestrated through Workflow State Machine implicitly or via events.
   */
  public async billJobCard(jobId: number, invoiceNo: string): Promise<any> {
    const cachedDB = this.getCachedDB();
    const index = cachedDB.jobCards.findIndex((jc: any) => jc.job_id === jobId);
    if (index === -1) {
      throw new JobCardNotFoundError(jobId);
    }

    const jobCard = cachedDB.jobCards[index];
    const correlationId = this.generateCorrelationId();

    const workflowType = jobCard.workflow_type || "Retail";
    const workflowDef = workflowRegistry.getWorkflow(workflowType);
    const sm = new WorkflowStateMachine(workflowDef.state_machine);
    
    const transitionResult = await sm.transition(
      makeSystemContext(correlationId),
      {
        current_state: jobCard.status,
        target_state: "Invoiced"
      }
    );
    
    if (!transitionResult.success) {
      throw new ValidationError(`Workflow validation failed for billing: ${transitionResult.error}`);
    }

    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await tx.connection.execute(
        "UPDATE `job_card_master` SET `billing_status` = 'Invoiced', `invoice_no` = ?, `status` = 'Invoiced' WHERE `job_card_id` = ?",
        [invoiceNo, jobId]
      );

      this.txManager.onCommit(tx, () => {
        cachedDB.jobCards[index] = { ...jobCard, billing_status: 'Invoiced', invoice_no: invoiceNo, status: "Invoiced" };
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    await this.eventService.publish({
      event_type: "INVOICE_GENERATED",
      job_id: jobId,
      job_card_no: jobCard.job_card_no,
      user: "Cashier",
      role: "Cashier",
      workshop_id: jobCard.workshop_id || 1,
      source: "MANUAL",
      event_category: "Integration",
      correlation_id: correlationId,
      source_system: "WMS-Core",
      payload: { invoice_no: invoiceNo, old_state: jobCard.status, new_state: "Invoiced" }
    });

    return { success: true, message: 'Job card marked as billed successfully.', job_id: jobId, invoice_no: invoiceNo };
  }

  /**
   * Converts a breakdown into a new job card.
   */
  public async convertBreakdownToJob(breakdownId: number | string, breakdown: any): Promise<{ jobCardNo: string }> {
    const cachedDB = this.getCachedDB();
    const nextJobId = cachedDB.jobCards.reduce((max: number, j: any) => Math.max(max, j.job_id), 0) + 1;
    const jobCardNo = `JC${String(nextJobId).padStart(3, "0")}`;
    const now = new Date().toISOString();
    const correlationId = this.generateCorrelationId();

    const workflowDef = workflowRegistry.getWorkflow("Retail");

    const newJob: any = {
      job_id: nextJobId,
      job_card_no: jobCardNo,
      vrn: breakdown.vehicle_number,
      customer_name: breakdown.fleet_owner || breakdown.driver_name || "Roadside Customer",
      customer_mobile: breakdown.fleet_manager_mobile || breakdown.driver_mobile || "0000000000",
      vehicle_make: "Tata",
      vehicle_model: "Commercial Truck",
      vehicle_year: 2024,
      km_reading: breakdown.odometer || 0,
      sr_type_id: 1,
      job_description: `[BREAKDOWN DISPATCH] ${breakdown.complaint}`,
      status: workflowDef.state_machine.initial_state,
      workflow_type: "Retail",
      started_at: null,
      completed_at: null,
      invoiced_at: null,
      created_by: 1,
      created_at: now,
      workshop_stage: "Waiting",
      bay_no: null,
      technician_name: null,
      no_of_laborers: 0
    };

    // ── TRANSACTION BOUNDARY ──
    await this.txManager.runInTransaction(async (tx) => {
      await this.jobCardRepo.create(newJob, tx.connection);
      await this.breakdownRepo.markConverted(breakdownId, jobCardNo, tx.connection);

      this.txManager.onCommit(tx, () => {
        cachedDB.jobCards.push(newJob);
        this.saveDBLocal(cachedDB);
      });
    }, correlationId);
    // ── END TRANSACTION ──

    return { jobCardNo };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────────

export class JobCardNotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(jobId: number) {
    super(`Job card not found: ${jobId}`);
    this.name = "JobCardNotFoundError";
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
