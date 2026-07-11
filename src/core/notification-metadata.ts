/**
 * =============================================================================
 * WOS Core Architecture: Notification Metadata Definition
 * Bounded Context: Core System / Notifications
 * Description: Defines structural types for Workshop Context and delivery envelopes.
 * =============================================================================
 */

export interface WorkshopContext {
  workshopId: number;
  branchId: number;
  jobCardId: number;
  vehicleId: number;
  customerId: number;
  serviceAdvisorId: number;
  supervisorId: number;
  technicianId: number;
  bayId: number;
  workflowState: string;
  queue: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  generatedTime: string;
  expiryTime: string;
  escalationLevel: number;
}

export interface HardenedEnvelope {
  notificationId: string;
  correlationId: string;
  validationRunId: string;
  idempotencyKey: string;
  status: "Queued" | "Processing" | "Delivered" | "Failed" | "Cancelled" | "Expired" | "DeadLetter";
  attempts: number;
  maxAttempts: number;
  lastAttemptedAt?: string;
  context: WorkshopContext;
  recipient: string;
  templateCode: string;
  variables: Record<string, string>;
  primaryChannel: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  escalationChannel?: "IN_APP" | "SMS" | "WHATSAPP" | "EMAIL" | "PUSH";
  dlqReason?: string;
  dlqException?: string;
  dlqProvider?: string;
}
