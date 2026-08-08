/**
 * DWIP Enterprise Platform - QrtDispatchService
 * Sprint: DWIP-S2-001 Revision-9
 */

import { QrtDispatchRecord, QrtVehicle, QrtTeamMember, EquipmentKit } from './types';
import { GpsLocation } from '../breakdown/types';
import { breakdownCaseService } from '../breakdown/BreakdownCaseService';
import { vosTimelineEngine } from '../../core/vos/timeline/VosTimelineEngine';
import { TimelineEventTypes } from '../../core/vos/timeline/types';
import { vosAuditEngine } from '../../core/vos/audit/VosAuditEngine';
import { StructuredLogger } from '../../core/vos/utils/StructuredLogger';
import { VosDomainException } from '../../core/vos/exceptions';
import { integrationRegistry } from '../../integrations';

export class QrtDispatchService {
  private dispatches: Map<string, QrtDispatchRecord> = new Map();

  public async dispatchQrt(params: {
    breakdownId: string;
    vehicle: QrtVehicle;
    teamMembers: QrtTeamMember[];
    equipmentKit: EquipmentKit;
    dispatchedBy: string;
  }): Promise<QrtDispatchRecord> {
    const caseItem = breakdownCaseService.getCase(params.breakdownId);
    const now = new Date().toISOString();
    const dispatchId = `qrt_disp_${Date.now()}`;

    const record: QrtDispatchRecord = {
      dispatchId,
      breakdownId: params.breakdownId,
      vosId: caseItem.vosId,
      vehicle: params.vehicle,
      teamMembers: params.teamMembers,
      equipmentKit: params.equipmentKit,
      status: 'DISPATCHED',
      dispatchedAt: now
    };

    this.dispatches.set(dispatchId, record);
    caseItem.status = 'QRT_DISPATCHED';
    caseItem.timestamps.dispatchAt = now;
    caseItem.updatedAt = now;

    await vosTimelineEngine.recordOperationalEvent(
      caseItem.vosId,
      TimelineEventTypes.DIAGNOSTIC_LOG,
      'QRT_DISPATCHED',
      `QRT Van ${params.vehicle.registrationNumber} dispatched`
    );
    await vosAuditEngine.recordChange(
      'QRT_DISPATCH',
      caseItem.vosId,
      { status: 'OPEN' },
      { status: 'QRT_DISPATCHED' },
      params.dispatchedBy,
      'DISPATCHER',
      'QRT dispatched'
    );

    // Call external Tata Motors QRT API
    try {
      if (integrationRegistry.hasConnector('QRT_EXTERNAL')) {
        const qrtConnector = integrationRegistry.getConnector('QRT_EXTERNAL');
        if (qrtConnector.qrtService) {
          // Send internal breakdownId to external QRT system (this may need to map to an external ID later)
          await qrtConnector.qrtService.startServiceRequest(params.breakdownId, params.teamMembers[0]?.id || 'UNKNOWN_TECH');
          console.log(`[QrtDispatchService] Successfully synced startServiceRequest with external QRT API for ${params.breakdownId}`);
        }
      }
    } catch (apiError) {
      console.error(`[QrtDispatchService] Failed to sync startServiceRequest with external QRT API for ${params.breakdownId}`, apiError);
      // We don't block local dispatch on external failure, would typically queue for retry
    }

    return record;
  }

  public async markArrived(dispatchId: string, arrivalLocation: GpsLocation, userId = 'usr_qrt_leader'): Promise<QrtDispatchRecord> {
    const record = this.getDispatch(dispatchId);
    const caseItem = breakdownCaseService.getCase(record.breakdownId);
    const now = new Date().toISOString();

    record.status = 'ARRIVED';
    record.arrivedAt = now;
    record.currentGps = arrivalLocation;

    caseItem.status = 'QRT_ARRIVED';
    caseItem.timestamps.reachedLocationAt = now;
    caseItem.reachSla = {
      ...caseItem.reachSla,
      reachedLocationAt: now
    };
    caseItem.updatedAt = now;

    await vosTimelineEngine.recordOperationalEvent(
      caseItem.vosId,
      TimelineEventTypes.DIAGNOSTIC_LOG,
      'QRT_ARRIVED',
      `QRT arrived at location: ${arrivalLocation.latitude}, ${arrivalLocation.longitude}`
    );
    await vosAuditEngine.recordChange(
      'QRT_DISPATCH',
      caseItem.vosId,
      { status: 'QRT_DISPATCHED' },
      { status: 'QRT_ARRIVED' },
      userId,
      'TECHNICIAN',
      'QRT arrived'
    );

    // Call external Tata Motors QRT API
    try {
      if (integrationRegistry.hasConnector('QRT_EXTERNAL')) {
        const qrtConnector = integrationRegistry.getConnector('QRT_EXTERNAL');
        if (qrtConnector.qrtService) {
          await qrtConnector.qrtService.markReached(record.breakdownId, arrivalLocation.latitude, arrivalLocation.longitude);
          console.log(`[QrtDispatchService] Successfully synced markReached with external QRT API for ${record.breakdownId}`);
        }
      }
    } catch (apiError) {
      console.error(`[QrtDispatchService] Failed to sync markReached with external QRT API for ${record.breakdownId}`, apiError);
    }

    return record;
  }

  public getDispatch(dispatchId: string): QrtDispatchRecord {
    const record = this.dispatches.get(dispatchId);
    if (!record) {
      throw new VosDomainException(`QRT Dispatch '${dispatchId}' not found.`, 'QRT_DISPATCH_NOT_FOUND');
    }
    return record;
  }

  public clear(): void {
    this.dispatches.clear();
  }
}

export const qrtDispatchService = new QrtDispatchService();
