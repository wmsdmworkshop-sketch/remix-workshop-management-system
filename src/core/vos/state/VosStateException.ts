/**
 * DWIP Enterprise WOS - VosStateException
 * Task 1.3 State Engine Domain Exception
 */

import { VosDomainException } from '../exceptions';

export class VosStateException extends VosDomainException {
  constructor(message: string, code = 'VOS_STATE_ERROR', context?: Record<string, any>) {
    super(message, code, context);
  }
}
