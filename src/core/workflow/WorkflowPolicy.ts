/**
 * DWIP Enterprise WOS - WorkflowPolicy
 * Evaluates Permitted States, Profile Transition Graph & Capabilities
 */

import { IWorkflowProfile } from './WorkflowProfile';
import { WorkflowCapability } from './WorkflowCapability';
import { VosStateName } from '../vos/state/types';
import { WorkflowProfileException } from './WorkflowProfileException';

export class WorkflowPolicy {
  public static validatePermittedState(profile: IWorkflowProfile, targetState: VosStateName): void {
    if (!profile.permittedStates.includes(targetState)) {
      throw new WorkflowProfileException(
        `State '${targetState}' is not permitted under workflow profile '${profile.code}' (${profile.name}).`,
        'UNPERMITTED_STATE',
        { profileCode: profile.code, targetState, permittedStates: profile.permittedStates }
      );
    }
  }

  public static isTransitionAllowed(
    profile: IWorkflowProfile,
    fromState: VosStateName,
    toState: VosStateName
  ): boolean {
    const allowedList = profile.transitionGraph[fromState];
    return Array.isArray(allowedList) && allowedList.includes(toState);
  }

  public static validateCapability(profile: IWorkflowProfile, requiredCapability: WorkflowCapability): void {
    if (!profile.capabilities.includes(requiredCapability)) {
      throw new WorkflowProfileException(
        `Workflow profile '${profile.code}' lacks required capability '${requiredCapability}'.`,
        'CAPABILITY_UNSUPPORTED',
        { profileCode: profile.code, requiredCapability }
      );
    }
  }
}
