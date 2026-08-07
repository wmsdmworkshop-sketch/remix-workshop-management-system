/**
 * DWIP Enterprise WOS - WorkflowResolver
 * Resolves Active Workflow Profile dynamically from VOS session attributes
 */

import { IWorkflowProfile } from './WorkflowProfile';
import { WorkflowProfileRegistry } from './WorkflowProfileRegistry';
import { WorkflowProfileException } from './WorkflowProfileException';
import { IVos, VisitType, CommercialType } from '../vos/types';

export class WorkflowResolver {
  public static resolveByCode(code: string): IWorkflowProfile {
    const profile = WorkflowProfileRegistry.getProfile(code);
    if (!profile) {
      throw new WorkflowProfileException(
        `Unsupported workflow profile code '${code}'. No matching profile registered.`,
        'WORKFLOW_PROFILE_NOT_FOUND'
      );
    }
    return profile;
  }

  public static resolveForVos(vos: IVos): IWorkflowProfile {
    // 1. Check breakdown flag or visitType
    if (vos.isBreakdown || vos.visitType === VisitType.BREAKDOWN) {
      return WorkflowResolver.resolveByCode('BREAKDOWN');
    }

    if (vos.visitType === VisitType.CAMPAIGN || vos.visitType === VisitType.FSB) {
      return WorkflowResolver.resolveByCode('FSB_CAMPAIGN');
    }

    if (vos.visitType === VisitType.INTERNAL) {
      return WorkflowResolver.resolveByCode('INTERNAL');
    }

    // 2. Check commercialType
    if (vos.commercialType === CommercialType.WARRANTY) {
      return WorkflowResolver.resolveByCode('WARRANTY');
    }

    if (vos.commercialType === CommercialType.AMC) {
      return WorkflowResolver.resolveByCode('AMC');
    }

    if (vos.commercialType === CommercialType.GOODWILL) {
      return WorkflowResolver.resolveByCode('GOODWILL');
    }

    // 3. Fallback to Standard Service
    return WorkflowResolver.resolveByCode('STANDARD_SERVICE');
  }
}
