/**
 * DWIP Enterprise WOS - WorkflowCapabilityException
 * Task 2.2 Domain Exception for Workflow Capability Engine
 */

import { VosDomainException } from '../../vos/exceptions';

export class WorkflowCapabilityException extends VosDomainException {
  constructor(message: string, code = 'WORKFLOW_CAPABILITY_ERROR', context?: Record<string, any>) {
    super(message, code, context);
  }
}
