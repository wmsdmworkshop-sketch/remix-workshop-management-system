import { IEventBus } from "../../core/event-bus";
import { WorkflowEngine } from "./engine";

export class ReceptionWorkflowIntegration {
  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Publishes vehicle reception events.
   */
  public async registerVehicle(vehicleData: { vrn: string; make: string; model: string; customerId: number }, correlationId: string): Promise<void> {
    await this.eventBus.publish("VEHICLE_RECEIVED", vehicleData, correlationId);
  }

  /**
   * Orchestrates the Job Card creation lifecycle integrated with the Workflow Engine.
   */
  public async createJobCard(
    jobCardData: { 
      job_id: number; 
      job_card_no: string; 
      created_by: number; 
      vrn: string; 
      customer_name: string;
      customer_mobile: string;
    }, 
    correlationId: string
  ): Promise<void> {
    // 1. Publish JOB_CARD_CREATED event
    await this.eventBus.publish("JOB_CARD_CREATED", jobCardData, correlationId);

    // 2. Call Workflow Engine to transition to INTAKE_PENDING state
    const transitionResult = await WorkflowEngine.transition({
      jobId: jobCardData.job_id,
      newState: "INTAKE_PENDING",
      actorId: jobCardData.created_by,
      actorRole: "Service Advisor",
      reason: "Reception initialization."
    });

    if (!transitionResult.success) {
      throw new Error(`Workflow initialization failed: ${transitionResult.error}`);
    }

    // 3. Publish QUEUE_UPDATED event
    await this.eventBus.publish("QUEUE_UPDATED", {
      jobId: jobCardData.job_id,
      queue: "INTAKE_QUEUE",
      state: "INTAKE_PENDING"
    }, correlationId);

    // 4. Publish TIMELINE_APPENDED event
    await this.eventBus.publish("TIMELINE_APPENDED", {
      jobId: jobCardData.job_id,
      sourceEngine: "Reception",
      eventType: "INITIALIZE",
      eventName: "VEHICLE_CHECK_IN"
    }, correlationId);

    // 5. Publish AUDIT_LOGGED event
    await this.eventBus.publish("AUDIT_LOGGED", {
      jobId: jobCardData.job_id,
      actionCode: "STATUS_CHANGE",
      oldState: "GATE_IN",
      newState: "INTAKE_PENDING"
    }, correlationId);


    // 6. Publish NOTIFICATION_CREATED event
    await this.eventBus.publish("NOTIFICATION_CREATED", {
      userId: jobCardData.created_by,
      notificationType: "INITIALIZED",
      message: `Job card ${jobCardData.job_card_no} created successfully.`,
      priority: "LOW"
    }, correlationId);
  }
}
