import { IEventBus } from "../event-bus";
import { makeSystemContext } from "../business-context";

export class AmcEventManager {
  constructor(private eventBus: IEventBus) {}

  /**
   * Simulates scheduling a renewal reminder based on configuration.
   * In a real system, this would register a cron job or deferred task.
   */
  public async scheduleRenewalReminder(contractId: string, daysBeforeExpiry: number): Promise<void> {
    const context = makeSystemContext(`AMC-REMINDER-${contractId}`);
    
    // Abstracted logic for demonstration: 
    // This immediately publishes the event for testing, but represents 
    // a deferred execution that the Notification Engine would pick up later.
    console.log(`[AMC Event Manager] Scheduled reminder for ${contractId} at T-${daysBeforeExpiry} days`);
    
    await this.eventBus.publish("AMC_RENEWAL_REMINDER_SCHEDULED", { 
      contractId, 
      daysBeforeExpiry,
      scheduledTime: new Date() 
    }, context);
  }
}
