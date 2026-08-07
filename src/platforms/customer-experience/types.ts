/**
 * =============================================================================
 * DWIP Customer Experience Platform — Types & DTOs
 * Module: platforms/customer-experience/types.ts
 * =============================================================================
 */

export type TimelineInteractionType =
  | "VEHICLE_PURCHASE" | "SERVICE" | "COMPLAINT" | "WARRANTY" | "AMC"
  | "GOODWILL" | "FSB" | "BREAKDOWN" | "INVOICE" | "PAYMENT"
  | "CALL" | "EMAIL" | "SMS" | "WHATSAPP" | "APPOINTMENT"
  | "CAMPAIGN" | "SURVEY";

export interface CustomerTimelineEvent {
  readonly eventId: string;
  readonly customerId: string;
  readonly interactionType: TimelineInteractionType;
  readonly timestamp: string;
  readonly description: string;
  readonly details?: Record<string, any>;
  readonly actorId?: string;
}

export interface Customer360 {
  readonly customerId: string;
  readonly fullName: string;
  readonly mobile: string;
  readonly email?: string;
  readonly customerSegment: "PREMIUM" | "STANDARD" | "FLEET" | "CORPORATE";
  readonly registeredDate: string;
  readonly totalVisitsCount: number;
  readonly totalInvoiceSpent: number;
  readonly loyaltyPoints: number;
  readonly timeline: ReadonlyArray<CustomerTimelineEvent>;
  readonly activeContracts: {
    readonly warranty?: boolean;
    readonly amc?: boolean;
  };
}

export interface Fleet360 {
  readonly fleetOwnerId: string;
  readonly organizationName: string;
  readonly contactName: string;
  readonly contactMobile: string;
  readonly totalVehiclesCount: number;
  readonly activeContractsCount: number;
  readonly vehiclesList: ReadonlyArray<string>; // VINs
  readonly totalOutstandingDues: number;
}

export interface CRMLead {
  readonly leadId: string;
  readonly customerName: string;
  readonly contactMobile: string;
  readonly interestSource: string; // e.g. "Web", "Referral", "Campaign"
  readonly interestCategory: "SERVICE_CONTRACT" | "AMC" | "WARRANTY_EXT" | "VEHICLE_UPGRADE";
  readonly currentStatus: "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "CONVERTED";
  readonly assignedTo: string; // User ID
  readonly remarks?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CRMAppointment {
  readonly appointmentId: string;
  readonly customerId: string;
  readonly vehicleVin: string;
  readonly scheduledTime: string;
  readonly serviceAdvisorId: string;
  readonly status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED" | "NOSHOW";
  readonly createdBy: string;
  readonly notes?: string;
}

export interface CRMCampaign {
  readonly campaignId: string;
  readonly title: string;
  readonly targetSegment: string;
  readonly channel: "SMS" | "EMAIL" | "WHATSAPP";
  readonly contentTemplate: string;
  readonly status: "DRAFT" | "ACTIVE" | "COMPLETED";
  readonly sentCount: number;
  readonly responseCount: number;
}
