/**
 * DWIP Enterprise WOS - ValidationException
 */

import { VosDomainException } from './VosDomainException';

export class ValidationException extends VosDomainException {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_FAILED', context);
  }
}
