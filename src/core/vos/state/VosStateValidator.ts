/**
 * DWIP Enterprise WOS - VosStateValidator
 * Validates State Transition Context against Graph, Closed Status, Duplicate & Policies
 */

import { TransitionContext, VosStateName } from './types';
import { IVos } from '../../../domain/vos/types';
import { VosStateMachine } from './VosStateMachine';
import { VosStateTransitionPolicy, vosStateTransitionPolicy } from './VosStateTransitionPolicy';
import { VosStateException } from './VosStateException';
import { WorkflowResolver } from '../../workflow/WorkflowResolver';
import { WorkflowPolicy } from '../../workflow/WorkflowPolicy';

export class VosStateValidator {
  constructor(private policy: VosStateTransitionPolicy = vosStateTransitionPolicy) {}

  public async validate(vos: IVos, context: TransitionContext): Promise<void> {
    const currentState = vos.currentState as VosStateName;
    const targetState = context.targetState;

    // 1. Closed session check
    if (vos.isClosed || currentState === 'CLOSED') {
      throw new VosStateException(
        `Cannot execute state transition on VOS ${vos.id} because the operational session is CLOSED.`,
        'VOS_CLOSED_SESSION_TRANSITION_FORBIDDEN'
      );
    }

    // 2. Duplicate transition check
    if (currentState === targetState) {
      throw new VosStateException(
        `VOS ${vos.id} is already in state '${targetState}'. Duplicate transition is forbidden.`,
        'VOS_DUPLICATE_STATE_TRANSITION'
      );
    }

    // 3. GM Override Path
    if (context.isGmOverride) {
      this.policy.evaluateGmOverride(context);
      return; // GM Override bypasses standard transition graph and prerequisite rules
    }

    // 4. Resolve Active Workflow Profile for VOS Session
    const activeProfile = WorkflowResolver.resolveForVos(vos);

    // 5. Validate Permitted State & Profile Transition Graph
    WorkflowPolicy.validatePermittedState(activeProfile, targetState);

    const isProfileAllowed = WorkflowPolicy.isTransitionAllowed(activeProfile, currentState, targetState);
    const isUniversalAllowed = VosStateMachine.isTransitionAllowed(currentState, targetState);

    if (!isProfileAllowed && !isUniversalAllowed) {
      throw new VosStateException(
        `Invalid state transition from '${currentState}' to '${targetState}' under workflow profile '${activeProfile.code}' (${activeProfile.name}).`,
        'VOS_INVALID_STATE_TRANSITION'
      );
    }

    // 6. Role authorization check
    this.policy.validateRolePermission(targetState, context.actorRole);

    // 7. Prerequisite rules check
    await this.policy.evaluatePrerequisites(vos, context);
  }
}

export const vosStateValidator = new VosStateValidator();

