/**
 * DWIP Enterprise WOS - VosTimelineException
 * Task 1.4 Timeline Engine Domain Exception
 */

import { VosDomainException } from '../exceptions';

export class VosTimelineException extends VosDomainException {
  constructor(message: string, code = 'VOS_TIMELINE_ERROR', context?: Record<string, any>) {
    super(message, code, context);
  }
}
