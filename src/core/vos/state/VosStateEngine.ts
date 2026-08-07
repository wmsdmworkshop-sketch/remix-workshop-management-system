/**
 * DWIP Enterprise WOS - VosStateEngine
 * Primary VOS State Transition Engine
 */

import { TransitionContext, TransitionResult, VosStateName } from './types';
import { IVosRepository } from '../../../domain/vos/repositories';
import { drizzleVosRepository } from '../repositories/DrizzleVosRepository';
import { VosStateValidator, vosStateValidator } from './VosStateValidator';
import { VosStateHistoryRecorder, vosStateHistoryRecorder } from './VosStateHistoryRecorder';
import { VosStateMachine } from './VosStateMachine';
import { ownershipSyncHook, OwnershipSyncHook } from './hooks/OwnershipSyncHook';
import { eventHook, EventHook } from './hooks/EventHook';
import { VosTransactionService, vosTransactionService } from '../services/VosTransactionService';
import { StructuredLogger } from '../utils/StructuredLogger';
import { VosNotFoundException } from '../exceptions';

export class VosStateEngine {
  constructor(
    private vosRepository: IVosRepository = drizzleVosRepository,
    private validator: VosStateValidator = vosStateValidator,
    private historyRecorder: VosStateHistoryRecorder = vosStateHistoryRecorder,
    private ownershipHook: OwnershipSyncHook = ownershipSyncHook,
    private eventsHook: EventHook = eventHook,
    private transactionService: VosTransactionService = vosTransactionService
  ) {}

  public async transitionState(context: TransitionContext): Promise<TransitionResult> {
    const startTime = Date.now();

    return this.transactionService.executeTransaction(
      `transitionState_${context.targetState}`,
      async () => {
        const vos = await this.vosRepository.findById(context.vosId);
        if (!vos) {
          throw new VosNotFoundException(context.vosId);
        }

        const previousState = vos.currentState as VosStateName;

        // 1. Validate State Transition
        await this.validator.validate(vos, context);

        // 2. Determine State Code & Closure Status
        const targetStateCode = VosStateMachine.getStateCode(context.targetState);
        const isClosingState = context.targetState === 'CLOSED';
        const now = new Date().toISOString();

        // 3. Ownership Sync Hook
        const ownershipRes = await this.ownershipHook.onStateTransition(vos, context);

        // 4. Update VOS Entity Atomically
        const updatedVos = await this.vosRepository.update(vos.id, {
          currentState: context.targetState,
          currentStateCode: targetStateCode,
          currentStateVersion: (vos.currentStateVersion || 1) + 1,
          currentOwner: ownershipRes.newOwner || vos.currentOwner,
          operationalStatus: isClosingState ? 'CLOSED' : vos.operationalStatus,
          isClosed: isClosingState ? true : vos.isClosed,
          closedAt: isClosingState ? now : vos.closedAt,
          gateOutTime: isClosingState ? now : vos.gateOutTime,
          version: vos.version + 1,
          updatedBy: context.actorId,
          updatedAt: now
        });

        // 5. Record State History Audit Entry
        const historyRecord = await this.historyRecorder.recordTransition(vos, context);

        const result: TransitionResult = {
          success: true,
          vosId: updatedVos.id,
          previousState,
          currentState: context.targetState,
          stateCode: targetStateCode,
          version: updatedVos.version,
          timeSpentSeconds: historyRecord.timeSpentSeconds || 0,
          historyRecord,
          ownershipHandoverTriggered: ownershipRes.triggered,
          newOwner: ownershipRes.newOwner,
          newOwnerRole: ownershipRes.newOwnerRole,
          timestamp: now
        };

        // 6. Invoke Event Hook
        await this.eventsHook.onTransitionCompleted(result);

        StructuredLogger.info(`Transitioned VOS ${vos.id} state from ${previousState} to ${context.targetState}`, {
          correlationId: context.correlationId,
          vosId: updatedVos.id,
          publicId: updatedVos.publicId,
          companyId: updatedVos.companyId,
          dealerId: updatedVos.dealerId,
          branchId: updatedVos.branchId,
          userId: context.actorId,
          component: 'VosStateEngine',
          operation: 'transitionState',
          durationMs: Date.now() - startTime,
          result: 'SUCCESS',
          previousState,
          currentState: context.targetState,
          isGmOverride: Boolean(context.isGmOverride)
        });

        return result;
      },
      context.correlationId
    );
  }
}

export const vosStateEngine = new VosStateEngine();
