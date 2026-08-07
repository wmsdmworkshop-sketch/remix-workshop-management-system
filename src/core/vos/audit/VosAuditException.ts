/**
 * DWIP Enterprise WOS - VosAuditException
 * Task 1.5 Audit Engine Domain Exception
 */

import { VosDomainException } from '../exceptions';

export class VosAuditException extends VosDomainException {
  constructor(message: string, code = 'VOS_AUDIT_ERROR', context?: Record<string, any>) {
    super(message, code, context);
  }
}
