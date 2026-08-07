/**
 * DWIP Enterprise Platform - BreakdownCaseService
 * Sprint: DWIP-S2-001 Revision-9 (Tow-to-Workshop Operational Hardening)
 * Architecture: DWIP-INT-ARCH-001 v1.0
 */

import {
  BreakdownCase,
  NotificationOrigin,
  BreakdownCategory,
  SeverityLevel,
  GpsLocation,
  TowingDecision,
  TowingMilestoneEventType,
  TowingMilestoneEventPayload,
  IncomingBreakdownDashboardItem,
  MediaCategory,
  BreakdownMediaItem
} from './types';
import { QrtReachSlaEngine } from './QrtReachSlaEngine';
import { vosService } from '../../core/vos/services/VosService';
import { vosStateEngine } from '../../core/vos/state/VosStateEngine';
import { vosTimelineEngine } from '../../core/vos/timeline/VosTimelineEngine';
import { TimelineEventTypes } from '../../core/vos/timeline/types';
import { vosAuditEngine } from '../../core/vos/audit/VosAuditEngine';
import { workflowCapabilityEngine } from '../../core/workflow/capabilities/WorkflowCapabilityEngine';
import { WorkflowCapability } from '../../core/workflow/WorkflowCapability';
import { operationalPolicyEngine } from '../../core/policy/OperationalPolicyEngine';
import { integrationGatewayController } from '../../core/gateway/controller/IntegrationGatewayController';
import { StructuredLogger } from '../../core/vos/utils/StructuredLogger';
import { VosDomainException } from '../../core/vos/exceptions';

export class BreakdownCaseService {
  private cases: Map<string, BreakdownCase> = new Map();
  private milestoneListeners: Array<(event: TowingMilestoneEventPayload) => void> = [];

  public subscribeMilestone(listener: (event: TowingMilestoneEventPayload) => void): void {
    this.milestoneListeners.push(listener);
  }

  private publishMilestone(event: TowingMilestoneEventPayload): void {
    StructuredLogger.info(`Towing Milestone Event: ${event.eventType}`, {
      component: 'BreakdownCaseService',
      operation: 'publishMilestone',
      result: 'SUCCESS',
      eventType: event.eventType,
      breakdownId: event.breakdownId,
      vosId: event.vosId
    });

    for (const listener of this.milestoneListeners) {
      try {
        listener(event);
      } catch (err) {
        // Non-blocking listener guard
      }
    }
  }

  /**
   * Create Breakdown Case linked to VOS Session
   */
  public async createBreakdownCase(params: {
    companyId: string;
    dealerId: string;
    branchId: string;
    userId: string;
    registrationNumber: string;
    vin: string;
    customerCode: string;
    category: BreakdownCategory;
    severity: SeverityLevel;
    location: GpsLocation;
    complaintSummary: string;
    complaintRegisteredAt: string;
    origin?: NotificationOrigin;
  }): Promise<BreakdownCase> {
    // 1. Create or link VOS session
    const vos = await vosService.createVos({
      companyId: params.companyId,
      dealerId: params.dealerId,
      branchId: params.branchId,
      vehicleId: `VEH_${params.registrationNumber}`,
      customerId: `CUST_${params.customerCode}`,
      registrationNumber: params.registrationNumber,
      chassisNumber: params.vin,
      createdBy: params.userId,
      currentOwner: params.userId,
      visitType: 'BREAKDOWN' as any,
      commercialType: 'CUSTOMER_PAY' as any,
      isBreakdown: true
    });

    // 2. Validate Operational Policy
    const policyDecision = await operationalPolicyEngine.evaluate({
      vos,
      operation: 'CREATE_BREAKDOWN_CASE',
      userRole: 'TECHNICIAN'
    });
    if (!policyDecision.allowed) {
      throw new VosDomainException(
        `Operational Policy rejected Breakdown Case creation: ${policyDecision.reasons.join(', ')}`,
        'POLICY_REJECTED'
      );
    }

    // 3. Evaluate Workflow Capabilities
    const canDispatch = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.QRT_DISPATCH);
    const isFastTrack = workflowCapabilityEngine.hasCapability(vos, WorkflowCapability.FAST_TRACK);

    // 4. Calculate OEM Reach SLA
    const reachSla = QrtReachSlaEngine.calculateSla(params.complaintRegisteredAt);

    const now = new Date().toISOString();
    const breakdownId = `bkd_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const caseItem: BreakdownCase = {
      id: breakdownId,
      vosId: vos.id,
      companyId: params.companyId,
      dealerId: params.dealerId,
      branchId: params.branchId,
      registrationNumber: params.registrationNumber,
      vin: params.vin,
      customerCode: params.customerCode,
      origin: params.origin || 'QRT_APP',
      category: params.category,
      severity: params.severity,
      status: 'OPEN',
      location: params.location,
      complaintSummary: params.complaintSummary,
      timestamps: {
        complaintRegisteredAt: params.complaintRegisteredAt,
        notificationReceivedAt: now
      },
      reachSla,
      createdAt: now,
      updatedAt: now
    };

    this.cases.set(breakdownId, caseItem);

    // 5. Timeline & Audit Logging
    await vosTimelineEngine.recordOperationalEvent(
      vos.id,
      TimelineEventTypes.DIAGNOSTIC_LOG,
      'BREAKDOWN_CASE_CREATED',
      `Registered for vehicle ${params.registrationNumber}`,
      { category: params.category, severity: params.severity, canDispatch, isFastTrack }
    );

    await vosAuditEngine.recordChange(
      'BREAKDOWN_CASE',
      vos.id,
      {},
      { status: 'OPEN', category: params.category, severity: params.severity },
      params.userId,
      'TECHNICIAN',
      'Initial breakdown case registration'
    );

    // 6. Integration Gateway OEM Sync
    await integrationGatewayController.triggerSync('TMSA', 'INCREMENTAL', 'BREAKDOWN');

    return caseItem;
  }

  /**
   * Towing Lifecycle Step 1: Tow Requested
   */
  public async towRequested(breakdownId: string, towingProviderId: string, etaMinutes = 60, userId = 'usr_system'): Promise<TowingDecision> {
    const caseItem = this.getCase(breakdownId);
    const now = new Date().toISOString();
    const eta = new Date(Date.now() + etaMinutes * 60 * 1000).toISOString();

    const decision: TowingDecision = {
      towingId: `tow_${Date.now()}`,
      breakdownId,
      towingProviderId,
      towingVehicleId: 'TOW_VAN_01',
      driverName: 'Rajesh Sharma',
      driverPhone: '+919876500111',
      status: 'TOW_REQUESTED',
      gateSecurityStatus: 'EXPECTED',
      etaTracking: {
        originalEta: eta,
        currentEta: eta,
        lastUpdated: now
      },
      preparation: {
        managerNotified: true,
        workshopReady: false
      },
      requestedAt: now
    };

    caseItem.status = 'TOW_IN_PROGRESS';
    caseItem.towing = decision;
    caseItem.timestamps.towRequestedAt = now;
    caseItem.updatedAt = now;

    this.publishMilestone({
      eventType: 'TowRequested',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now,
      details: { towingProviderId, eta }
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'TOW_REQUESTED', `Tow requested from provider ${towingProviderId}`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { towingStatus: 'NONE' }, { towingStatus: 'TOW_REQUESTED' }, userId, 'OPERATOR', 'Towing requested');

    return decision;
  }

  /**
   * Towing Lifecycle Step 2: Tow Assigned
   */
  public async towAssigned(breakdownId: string, towingVehicleId: string, userId = 'usr_system'): Promise<TowingDecision> {
    const caseItem = this.getCase(breakdownId);
    const tow = caseItem.towing!;
    const now = new Date().toISOString();

    tow.status = 'TOW_ASSIGNED';
    tow.towingVehicleId = towingVehicleId;
    caseItem.timestamps.towAssignedAt = now;
    caseItem.updatedAt = now;

    this.publishMilestone({
      eventType: 'TowAssigned',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now,
      details: { towingVehicleId }
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'TOW_ASSIGNED', `Tow vehicle ${towingVehicleId} assigned`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { towingStatus: 'TOW_REQUESTED' }, { towingStatus: 'TOW_ASSIGNED' }, userId, 'OPERATOR', 'Towing assigned');

    return tow;
  }

  /**
   * Towing Lifecycle Step 3: Vehicle Loaded
   */
  public async vehicleLoaded(breakdownId: string, userId = 'usr_system'): Promise<TowingDecision> {
    const caseItem = this.getCase(breakdownId);
    const tow = caseItem.towing!;
    const now = new Date().toISOString();

    tow.status = 'VEHICLE_LOADED';
    caseItem.timestamps.vehicleLoadedAt = now;
    caseItem.updatedAt = now;

    this.publishMilestone({
      eventType: 'VehicleLoaded',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'VEHICLE_LOADED', `Breakdown vehicle ${caseItem.registrationNumber} loaded onto tow truck`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { towingStatus: 'TOW_ASSIGNED' }, { towingStatus: 'VEHICLE_LOADED' }, userId, 'OPERATOR', 'Vehicle loaded');

    return tow;
  }

  /**
   * Towing Lifecycle Step 4: Tow Started
   */
  public async towStarted(breakdownId: string, userId = 'usr_system'): Promise<TowingDecision> {
    const caseItem = this.getCase(breakdownId);
    const tow = caseItem.towing!;
    const now = new Date().toISOString();

    tow.status = 'TOW_STARTED';
    caseItem.timestamps.towStartedAt = now;
    caseItem.updatedAt = now;

    this.publishMilestone({
      eventType: 'TowStarted',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now,
      details: { eta: tow.etaTracking.currentEta }
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'TOW_STARTED', `Tow vehicle departed towards workshop. ETA: ${tow.etaTracking.currentEta}`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { towingStatus: 'VEHICLE_LOADED' }, { towingStatus: 'TOW_STARTED' }, userId, 'OPERATOR', 'Tow started');

    return tow;
  }

  /**
   * Towing Lifecycle Step 5: Workshop ETA Updated
   */
  public async updateWorkshopEta(breakdownId: string, newEta: string, delayReason?: string, userId = 'usr_system'): Promise<TowingDecision> {
    const caseItem = this.getCase(breakdownId);
    const tow = caseItem.towing!;
    const now = new Date().toISOString();

    tow.etaTracking.currentEta = newEta;
    tow.etaTracking.lastUpdated = now;
    if (delayReason) tow.etaTracking.delayReason = delayReason;

    caseItem.timestamps.workshopETAUpdatedAt = now;
    caseItem.updatedAt = now;

    this.publishMilestone({
      eventType: 'WorkshopETAUpdated',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now,
      details: { newEta, delayReason }
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'WORKSHOP_ETA_UPDATED', `ETA updated to ${newEta}. Reason: ${delayReason || 'Traffic'}`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { currentEta: tow.etaTracking.originalEta }, { currentEta: newEta }, userId, 'OPERATOR', 'ETA updated');

    return tow;
  }

  /**
   * Towing Lifecycle Step 6: Workshop Arrived
   * Automatically notifies Workshop Manager, Floor Supervisor, Service Advisor, and Assigned Technician
   */
  public async workshopArrived(breakdownId: string, userId = 'usr_system'): Promise<TowingDecision> {
    const caseItem = this.getCase(breakdownId);
    const tow = caseItem.towing!;
    const now = new Date().toISOString();

    tow.status = 'WORKSHOP_ARRIVED';
    tow.gateSecurityStatus = 'ARRIVED';
    tow.preparation.workshopReady = true;
    caseItem.timestamps.workshopArrivedAt = now;
    caseItem.updatedAt = now;

    this.publishMilestone({
      eventType: 'WorkshopArrived',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now,
      details: {
        notifiedRoles: ['WORKSHOP_MANAGER', 'FLOOR_SUPERVISOR', 'SERVICE_ADVISOR', 'ASSIGNED_TECHNICIAN']
      }
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'WORKSHOP_ARRIVED', `Towed vehicle ${caseItem.registrationNumber} arrived at workshop gate`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { towingStatus: 'TOW_STARTED' }, { towingStatus: 'WORKSHOP_ARRIVED' }, userId, 'OPERATOR', 'Workshop arrived');

    return tow;
  }

  /**
   * Towing Lifecycle Step 7: Create Gate Entry (Transitions VOS inside SAME session)
   */
  public async createGateEntry(breakdownId: string, userId = 'usr_gate_security'): Promise<BreakdownCase> {
    const caseItem = this.getCase(breakdownId);
    const tow = caseItem.towing!;
    const now = new Date().toISOString();

    tow.status = 'GATE_ENTRY_CREATED';
    tow.gateSecurityStatus = 'ENTERED';
    caseItem.status = 'TRANSFERRED_TO_WORKSHOP';
    caseItem.timestamps.gateEntryCreatedAt = now;
    caseItem.updatedAt = now;

    // Towed vehicle arrives at gate (VOS session remains in GATE_IN state until Job Card creation)

    this.publishMilestone({
      eventType: 'GateEntryCreated',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.GATE_IN_REGISTERED, 'GATE_ENTRY_CREATED', `Gate Entry created for towed vehicle ${caseItem.registrationNumber}`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { gateSecurityStatus: 'ARRIVED' }, { gateSecurityStatus: 'ENTERED' }, userId, 'SECURITY', 'Gate entry created');

    return caseItem;
  }

  /**
   * Towing Lifecycle Step 8: Create Job Card (Transitions VOS inside SAME session)
   */
  public async createJobCard(breakdownId: string, userId = 'usr_service_advisor'): Promise<BreakdownCase> {
    const caseItem = this.getCase(breakdownId);
    const now = new Date().toISOString();

    caseItem.timestamps.jobCardCreatedAt = now;
    caseItem.updatedAt = now;

    // Transition existing VOS session state to WORK_IN_PROGRESS
    await vosStateEngine.transitionState({
      vosId: caseItem.vosId,
      targetState: 'WORK_IN_PROGRESS',
      actorId: userId,
      actorRole: 'SERVICE_ADVISOR'
    });

    this.publishMilestone({
      eventType: 'JobCardCreated',
      breakdownId,
      vosId: caseItem.vosId,
      registrationNumber: caseItem.registrationNumber,
      timestamp: now
    });

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.WORK_STARTED, 'JOB_CARD_CREATED', `Job Card generated for towed breakdown vehicle`);
    await vosAuditEngine.recordChange('BREAKDOWN_CASE', caseItem.vosId, { vosState: 'INSPECTION' }, { vosState: 'WORK_IN_PROGRESS' }, userId, 'SERVICE_ADVISOR', 'Job card created');

    return caseItem;
  }

  /**
   * Attach Media categorized by MediaCategory via Integration Gateway
   */
  public async attachMedia(
    breakdownId: string,
    category: MediaCategory,
    fileName: string,
    mimeType: string,
    fileBuffer: Uint8Array
  ): Promise<BreakdownMediaItem> {
    const caseItem = this.getCase(breakdownId);

    const media = await integrationGatewayController.uploadMedia('TMSA', {
      entityType: 'JOB_CARD',
      entityId: caseItem.vosId,
      mediaType: mimeType.startsWith('video') ? 'VIDEO' : 'IMAGE',
      fileName,
      mimeType
    }, fileBuffer);

    const item: BreakdownMediaItem = {
      mediaId: media.id,
      category,
      fileName,
      mimeType,
      storageUrl: media.storageUrl,
      uploadedAt: new Date().toISOString()
    };

    await vosTimelineEngine.recordOperationalEvent(caseItem.vosId, TimelineEventTypes.DIAGNOSTIC_LOG, 'BREAKDOWN_MEDIA_UPLOADED', `Attached breakdown media [${category}]: ${fileName}`);

    return item;
  }

  /**
   * Workshop Manager Dashboard Query Feed
   */
  public getIncomingBreakdowns(): IncomingBreakdownDashboardItem[] {
    const results: IncomingBreakdownDashboardItem[] = [];

    for (const item of this.cases.values()) {
      if (item.towing && item.status === 'TOW_IN_PROGRESS') {
        results.push({
          breakdownId: item.id,
          vosId: item.vosId,
          registrationNumber: item.registrationNumber,
          complaintNumber: item.id,
          category: item.category,
          severity: item.severity,
          towingStatus: item.towing.status,
          gateSecurityStatus: item.towing.gateSecurityStatus,
          originalEta: item.towing.etaTracking.originalEta,
          currentEta: item.towing.etaTracking.currentEta,
          delayReason: item.towing.etaTracking.delayReason,
          assignedQrtId: 'QRT_VAN_01',
          assignedServiceAdvisorId: item.towing.preparation.serviceAdvisorAssigned,
          allocatedBayId: item.towing.preparation.bayAllocated,
          workshopReady: item.towing.preparation.workshopReady
        });
      }
    }

    return results;
  }

  public getCase(breakdownId: string): BreakdownCase {
    const item = this.cases.get(breakdownId);
    if (!item) {
      throw new VosDomainException(`BreakdownCase '${breakdownId}' not found.`, 'BREAKDOWN_NOT_FOUND');
    }
    return item;
  }

  public clear(): void {
    this.cases.clear();
    this.milestoneListeners = [];
  }
}

export const breakdownCaseService = new BreakdownCaseService();
