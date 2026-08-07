/**
 * DWIP Enterprise WOS - OwnershipSyncHook
 * Hook to synchronize VOS currentOwner & owner history on state transitions
 */

import { TransitionContext } from '../types';
import { IVos, HandoverType } from '../../../../domain/vos/types';
import { drizzleVosOwnerHistoryRepository } from '../../repositories/DrizzleVosOwnerHistoryRepository';

export class OwnershipSyncHook {
  /**
   * Determine default owner role for state
   */
  public static getDefaultRoleForState(targetState: string): string {
    switch (targetState) {
      case 'GATE_IN':
        return 'security_agent';
      case 'INSPECTION':
      case 'ESTIMATION':
      case 'APPROVAL_PENDING':
        return 'service_advisor';
      case 'WORK_IN_PROGRESS':
        return 'floor_supervisor';
      case 'QUALITY_CHECK':
        return 'qc_inspector';
      case 'READY_FOR_DELIVERY':
        return 'customer_relationship_manager';
      case 'GATE_OUT':
      case 'CLOSED':
        return 'security_agent';
      default:
        return 'workshop_user';
    }
  }

  public async onStateTransition(
    vos: IVos,
    context: TransitionContext
  ): Promise<{ triggered: boolean; newOwner?: string; newOwnerRole?: string }> {
    const targetRole = OwnershipSyncHook.getDefaultRoleForState(context.targetState);

    // If current owner role already matches target role, no handover required
    if (vos.currentOwner === context.actorId && targetRole === 'service_advisor') {
      return { triggered: false };
    }

    const previousOwner = vos.currentOwner || 'SYSTEM';
    const previousRole = 'workshop_staff';
    const newOwner = context.actorId;
    const newOwnerRole = targetRole;

    await drizzleVosOwnerHistoryRepository.create({
      vosId: vos.id,
      previousOwner,
      previousOwnerRole: previousRole,
      newOwner,
      newOwnerRole,
      handoverType: context.isGmOverride ? HandoverType.GM_OVERRIDE : HandoverType.AUTOMATIC,
      transferredBy: context.actorId,
      handoverNotes: `Ownership synchronized on state transition to ${context.targetState}`
    });

    return {
      triggered: true,
      newOwner,
      newOwnerRole
    };
  }
}

export const ownershipSyncHook = new OwnershipSyncHook();
