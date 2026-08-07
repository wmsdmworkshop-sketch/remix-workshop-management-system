/**
 * DWIP Enterprise WOS - VosStateHistoryRecorder
 * Records state transition audit history and calculates timeSpentSeconds
 */

import { IVosStateHistoryRepository } from '../../../domain/vos/repositories';
import { IVos, IVosStateHistory } from '../../../domain/vos/types';
import { TransitionContext } from './types';
import { drizzleVosStateHistoryRepository } from '../repositories/DrizzleVosStateHistoryRepository';

export class VosStateHistoryRecorder {
  constructor(private historyRepository: IVosStateHistoryRepository = drizzleVosStateHistoryRepository) {}

  public async recordTransition(
    vos: IVos,
    context: TransitionContext
  ): Promise<IVosStateHistory> {
    const existingHistory = await this.historyRepository.findByVosId(vos.id);
    let previousTimestamp = new Date(vos.gateInTime || vos.createdAt).getTime();

    if (existingHistory.length > 0) {
      const lastEntry = existingHistory[0]; // Ordered descending or by latest
      previousTimestamp = new Date(lastEntry.createdAt).getTime();
    }

    const now = Date.now();
    const timeSpentSeconds = Math.max(0, Math.floor((now - previousTimestamp) / 1000));

    const reason = context.isGmOverride
      ? `[GM OVERRIDE] ${context.gmOverrideJustification || context.reason}`
      : context.reason || `Transition to ${context.targetState}`;

    const record = await this.historyRepository.create({
      vosId: vos.id,
      fromState: vos.currentState,
      toState: context.targetState,
      timeSpentSeconds,
      changedBy: context.actorId,
      changedByRole: context.actorRole,
      transitionReason: reason
    });

    return record;
  }
}

export const vosStateHistoryRecorder = new VosStateHistoryRecorder();
