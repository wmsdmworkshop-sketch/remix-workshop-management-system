/**
 * DWIP Enterprise WOS - OperationalPolicyException
 * Task 2.3 Operational Policy Engine Domain Exception
 */

import { VosDomainException } from '../vos/exceptions';

export class OperationalPolicyException extends VosDomainException {
  constructor(message: string, code = 'OPERATIONAL_POLICY_ERROR', context?: Record<string, any>) {
    super(message, code, context);
  }
}
