/**
 * DWIP Enterprise WOS - WorkflowProfileException
 * Task 2.1 Workflow Profile Framework Domain Exception
 */

import { VosDomainException } from '../vos/exceptions';

export class WorkflowProfileException extends VosDomainException {
  constructor(message: string, code = 'WORKFLOW_PROFILE_ERROR', context?: Record<string, any>) {
    super(message, code, context);
  }
}
