/**
 * DWIP Enterprise WOS - VosAuditEngine
 * Primary VOS Audit Engine Service Facade
 */

import { IAuditRecorder, AuditEvent, AuditQuery } from './types';
import { memoryAuditRecorder } from './MemoryAuditRecorder';
import { VosAuditEventMapper } from './VosAuditEventMapper';
import { VosAuditPolicy } from './VosAuditPolicy';
import { VosAuditValidator, vosAuditValidator } from './VosAuditValidator';
import { StructuredLogger } from '../utils/StructuredLogger';

export class VosAuditEngine {
  constructor(
    private recorder: IAuditRecorder = memoryAuditRecorder,
    private validator: VosAuditValidator = vosAuditValidator
  ) {}

  /**
   * Compare previous state vs updated state and record field-level changes
   */
  public async recordChange(
    entity: string,
    entityId: string,
    previousState: Record<string, any>,
    updatedState: Record<string, any>,
    changedBy: string,
    changedByRole: string,
    reason?: string,
    correlationId?: string
  ): Promise<AuditEvent[]> {
    const startTime = Date.now();

    // 1. Compute field diffs
    const rawDiffs = VosAuditEventMapper.computeDiffs(previousState, updatedState);

    // 2. Filter no-op changes (unchanged values)
    const validDiffs = VosAuditPolicy.filterNoOps(rawDiffs);

    if (validDiffs.length === 0) {
      return []; // Zero audit entries generated for no-op change
    }

    // 3. Validate actor credentials and payload
    this.validator.validate(entity, entityId, changedBy, changedByRole, validDiffs);

    // 4. Build audit events
    const eventBatch: Array<Omit<AuditEvent, 'id' | 'recordedAt'>> = validDiffs.map(d => ({
      entity,
      entityId,
      fieldName: d.fieldName,
      previousValue: d.previousValue,
      newValue: d.newValue,
      changedBy,
      changedByRole,
      reason,
      correlationId
    }));

    // 5. Record batch to audit storage
    const recordedEvents = await this.recorder.recordBatch(eventBatch);

    StructuredLogger.info(`Recorded ${recordedEvents.length} field-level audit entries for ${entity} ${entityId}`, {
      correlationId,
      vosId: entityId,
      component: 'VosAuditEngine',
      operation: 'recordChange',
      durationMs: Date.now() - startTime,
      result: 'SUCCESS',
      fieldCount: recordedEvents.length
    });

    return recordedEvents;
  }

  /**
   * Query Audit History
   */
  public async queryAuditHistory(query: AuditQuery): Promise<AuditEvent[]> {
    return this.recorder.query(query);
  }
}

export const vosAuditEngine = new VosAuditEngine();
