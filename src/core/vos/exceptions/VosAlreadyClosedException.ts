/**
 * DWIP Enterprise WOS - VosAlreadyClosedException
 */

import { VosDomainException } from './VosDomainException';

export class VosAlreadyClosedException extends VosDomainException {
  constructor(vosId: string, context?: Record<string, any>) {
    super(
      `VOS ${vosId} is already closed and read-only. Further mutations are forbidden.`,
      'VOS_ALREADY_CLOSED',
      { vosId, ...context }
    );
  }
}
