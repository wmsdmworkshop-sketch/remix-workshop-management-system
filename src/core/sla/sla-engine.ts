import { IEventBus } from "../event-bus";
import { SLATimerManager } from "./sla-timer-manager";
import { makeSystemContext } from "../business-context";

export class SLAEngine {
  constructor(private eventBus: IEventBus) {}

  /**
   * Initializes subscriptions to domain events that trigger SLA actions.
   */
  public subscribeToDomainEvents(): void {
    // Start Triggers
    this.eventBus.subscribe("GATE_ENTRY_COMPLETED", async (envelope: any) => {
      await SLATimerManager.startTimer("GATE_ENTRY", envelope.payload.gateId, "GATE_ENTRY_SLA", {
        workshop_id: envelope.payload.workshopId
      });
    });

    this.eventBus.subscribe("JOB_CARD_CREATED", async (envelope: any) => {
      await SLATimerManager.startTimer("JOB_CARD", envelope.payload.jobId, "ESTIMATE_CREATION", {
        workshop_id: envelope.payload.workshopId,
        service_type: envelope.payload.serviceType,
        customer_category: envelope.payload.customerCategory
      });
    });
    
    this.eventBus.subscribe("ESTIMATE_PENDING", async (envelope: any) => {
      await SLATimerManager.startTimer("JOB_CARD", envelope.payload.jobId, "CUSTOMER_APPROVAL_DELAY", {
        workshop_id: envelope.payload.workshopId
      });
    });

    this.eventBus.subscribe("QC_STARTED", async (envelope: any) => {
      await SLATimerManager.startTimer("JOB_CARD", envelope.payload.jobId, "QC_DELAY", {
        workshop_id: envelope.payload.workshopId
      });
    });

    this.eventBus.subscribe("QC_FAILED", async (envelope: any) => {
      await SLATimerManager.startTimer("JOB_CARD", envelope.payload.jobId, "REWORK_DELAY", {
        workshop_id: envelope.payload.workshopId
      });
    });

    // Resolve Triggers
    this.eventBus.subscribe("ESTIMATE_APPROVED", async (envelope: any) => {
      await SLATimerManager.resolveTimer("JOB_CARD", envelope.payload.jobId, "ESTIMATE_CREATION", "Estimate Approved");
      await SLATimerManager.resolveTimer("JOB_CARD", envelope.payload.jobId, "CUSTOMER_APPROVAL_DELAY", "Estimate Approved");
    });
    
    this.eventBus.subscribe("QC_PASSED", async (envelope: any) => {
      await SLATimerManager.resolveTimer("JOB_CARD", envelope.payload.jobId, "QC_DELAY", "QC Passed");
    });

    this.eventBus.subscribe("REPAIR_STARTED", async (envelope: any) => {
      await SLATimerManager.resolveTimer("JOB_CARD", envelope.payload.jobId, "REWORK_DELAY", "Rework Started");
    });

    this.eventBus.subscribe("VEHICLE_DELIVERED", async (envelope: any) => {
      // Resolve any outstanding billing/delivery SLAs
      await SLATimerManager.resolveTimer("JOB_CARD", envelope.payload.jobId, "VEHICLE_NOT_DELIVERED", "Delivered");
    });

    // Pause / Resume Triggers (e.g. Parts Backorder)
    this.eventBus.subscribe("PARTS_PENDING", async (envelope: any) => {
      await SLATimerManager.pauseTimer(`SLA-INST-JOB_CARD-${envelope.payload.jobId}-REPAIR_SLA`, "Waiting for parts");
    });

    this.eventBus.subscribe("PARTS_ISSUED", async (envelope: any) => {
      await SLATimerManager.resumeTimer(`SLA-INST-JOB_CARD-${envelope.payload.jobId}-REPAIR_SLA`, "Parts arrived");
    });
  }
}
